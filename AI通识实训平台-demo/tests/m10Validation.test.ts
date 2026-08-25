import { describe, expect, it } from 'vitest'
import { createInitialM09Progress } from '../src/m09/data'
import { createInitialM10Progress } from '../src/m10/data'
import type { M10BoundaryAction } from '../src/m10/domain'
import {
  eligibleM10Reviewers,
  LocalM10AssistantRunner,
  m10KnowledgeSourceFromM09,
  synchronizeM10Source,
} from '../src/m10/runner'
import { calculateM10Score } from '../src/m10/scoring'
import {
  clearParticipantM10Progress,
  createConfirmedM10Assistant,
  m10ProgressForParticipant,
  updateParticipantM10Progress,
  type M10ProgressStore,
} from '../src/m10/storage'
import {
  confirmedM10AssistantIsCurrent,
  latestM10AssessmentIsCurrent,
  validateM10Boundaries,
  validateM10Confirmation,
  validateM10Flow,
  validateM10Previews,
  validateM10Revision,
  validateM10Source,
} from '../src/m10/validation'
import { createInitialPortalProgress } from '../src/training/storage'
import { buildPassedM09, buildPassedM10 } from './m10Fixtures'

describe('M10 课程 AI 助教配置确定性验收', () => {
  it('M09 当前通过知识库是硬输入，不用演示证据补位', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const empty = createInitialM10Progress()
    expect(validateM10Source(empty, directory.currentParticipantId).valid).toBe(false)
    expect(validateM10Source(empty, directory.currentParticipantId).messages.join('')).toContain('不使用演示知识库')
    expect(m10KnowledgeSourceFromM09(createInitialM09Progress(), directory)).toBeUndefined()

    const m09 = buildPassedM09(directory)
    const source = m10KnowledgeSourceFromM09(m09, directory)
    expect(source).toMatchObject({ participantId: directory.currentParticipantId, version: 'v1.0', sourceCount: 4, current: true, passed: true })
    const bound = synchronizeM10Source(empty, source)
    expect(validateM10Source(bound, directory.currentParticipantId).valid).toBe(true)

    m09.teacherConfirmation.boundaryConfirmed = false
    expect(m10KnowledgeSourceFromM09(m09, directory)).toBeUndefined()
  })

  it('六要素、固定四步和五类合法边界可独立校验', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const source = m10KnowledgeSourceFromM09(buildPassedM09(directory), directory)!
    let progress = synchronizeM10Source(createInitialM10Progress(), source)
    const configured = new LocalM10AssistantRunner().configure(source)
    progress = { ...progress, ...configured }
    expect(Object.values(progress.sixElements).every((value) => value.trim())).toBe(true)
    expect(progress.flowSteps.map((item) => [item.order, item.label])).toEqual([[1, '先了解问题'], [2, '检索材料'], [3, '引用解释'], [4, '检查理解']])
    expect(validateM10Flow(progress, directory.currentParticipantId).valid).toBe(true)
    expect(progress.boundaryRules.map((item) => item.type)).toEqual(['out-of-scope', 'do-work', 'safety', 'final-grade', 'sensitive-data'])
    expect(validateM10Boundaries(progress, directory.currentParticipantId).valid).toBe(true)

    const unsafe = structuredClone(progress)
    unsafe.boundaryRules[3].action = '自动决定成绩' as M10BoundaryAction
    expect(validateM10Boundaries(unsafe, directory.currentParticipantId).valid).toBe(false)
    expect(validateM10Boundaries(unsafe, directory.currentParticipantId).messages.join('')).toContain('要求决定最终成绩')
  })

  it('正常与边界预览均走四步，且来源与无伪引用边界可区分', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const source = m10KnowledgeSourceFromM09(buildPassedM09(directory), directory)!
    let progress = synchronizeM10Source(createInitialM10Progress(), source)
    progress = { ...progress, ...new LocalM10AssistantRunner().configure(source) }
    progress.previews = new LocalM10AssistantRunner().preview(progress)
    expect(validateM10Previews(progress, directory.currentParticipantId).valid).toBe(true)
    const normal = progress.previews.find((item) => item.kind === 'normal')!
    const boundary = progress.previews.find((item) => item.kind === 'boundary')!
    expect(normal.trace).toHaveLength(4)
    expect(normal.source?.segmentId).toBe(source.previewSegment.segmentId)
    expect(boundary.trace).toHaveLength(4)
    expect(boundary.source).toBeUndefined()
    expect(boundary.triggeredRuleId).toBe('BR-01')
    expect(boundary.rawAnswer).not.toMatch(/\[\d+\]/u)
  })

  it('同组其他成员互评、实质修改和五项确认共同决定通过', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!
    const reviewers = eligibleM10Reviewers(directory)
    expect(reviewers.every((item) => item.groupId === current.groupId && item.participantId !== current.participantId)).toBe(true)
    expect(reviewers.map((item) => item.name)).toContain('李老师')
    expect(reviewers.map((item) => item.name)).not.toContain('周老师')

    const progress = buildPassedM10(directory)
    expect(progress.peerReview.checks.find((item) => item.checkId === 'role')?.conclusion).toBe('需调整')
    expect(validateM10Revision(progress, directory).valid).toBe(true)
    expect(progress.revisions).toHaveLength(1)
    expect(progress.revisions[0].beforeValue).not.toBe(progress.revisions[0].afterValue)
    expect(progress.revisions[0].afterValue).toContain('教师接管')
    expect(validateM10Confirmation(progress, directory).valid).toBe(true)
    expect(progress.confirmedAssistant?.artifacts).toHaveLength(2)
    expect(progress.confirmedAssistant?.personalPortfolioSlot).toBe('课程 AI 助教')
    expect(createConfirmedM10Assistant(progress, directory)).toBe(progress.confirmedAssistant)
    expect(confirmedM10AssistantIsCurrent(progress, directory)).toBe(true)
    const result = calculateM10Score(progress, directory)
    expect(result.total).toBe(10)
    expect(result.hardGatesPassed).toBe(true)
    expect(result.passed).toBe(true)
    expect(latestM10AssessmentIsCurrent(progress, directory)).toBe(true)
  })

  it('participantId 隔离、任务内重置、上游换版和小组指纹失效均保留历史', () => {
    let store: M10ProgressStore = { version: 1, participants: {} }
    store = updateParticipantM10Progress(store, 'T001', (current) => ({ ...current, sixElements: { ...current.sixElements, role: 'T001 独立配置' } }))
    store = updateParticipantM10Progress(store, 'T002', (current) => ({ ...current, sixElements: { ...current.sixElements, role: 'T002 独立配置' } }))
    expect(m10ProgressForParticipant(store, 'T001').sixElements.role).toBe('T001 独立配置')
    expect(m10ProgressForParticipant(store, 'T002').sixElements.role).toBe('T002 独立配置')
    store = clearParticipantM10Progress(store, 'T001')
    expect(m10ProgressForParticipant(store, 'T001').sixElements.role).toBe('')
    expect(m10ProgressForParticipant(store, 'T002').sixElements.role).toBe('T002 独立配置')

    const directory = createInitialPortalProgress().participantDirectory
    const passed = buildPassedM10(directory)
    const assessmentCount = passed.assessments.length
    const invalidated = synchronizeM10Source(passed, undefined)
    expect(invalidated.knowledgeSource).toBeUndefined()
    expect(invalidated.confirmedAssistant).toBeUndefined()
    expect(invalidated.assessments).toHaveLength(assessmentCount)
    expect(invalidated.attemptHistory.length).toBeGreaterThan(0)

    const changedRoster = structuredClone(directory)
    changedRoster.participants.find((item) => item.participantId === eligibleM10Reviewers(directory)[0].participantId)!.name += '·更新'
    expect(latestM10AssessmentIsCurrent(passed, changedRoster)).toBe(false)
    expect(passed.assessments).toHaveLength(assessmentCount)
  })
})
