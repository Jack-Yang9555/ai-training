import { beforeEach, describe, expect, it } from 'vitest'
import { buildM04PeerArtifacts } from '../src/m04/peerArtifacts'
import { calculateM04Score, createM04Assessment } from '../src/m04/scoring'
import { clearAllM04Progress, clearParticipantM04Progress, createConfirmedM04Plan, createInitialM04Progress, loadM04Store, M04_STORAGE_KEY, m04ProgressForParticipant, saveM04Store, updateParticipantM04Progress } from '../src/m04/storage'
import type { M04CorrectionType, M04Progress } from '../src/m04/types'
import { containsM04SensitiveInformation, latestM04AssessmentIsCurrent, lessonPlanDuration, lessonPlanMappingsComplete, m04SourceIsCurrent, validateM04Audit, validateM04Input, validateM04PeerReview } from '../src/m04/validation'
import { localM04LessonPlanRunner } from '../src/services/m04LessonPlanRunner'
import { createInitialPortalProgress } from '../src/training/storage'

async function completeM04(): Promise<{ progress: M04Progress; directory: ReturnType<typeof createInitialPortalProgress>['participantDirectory'] }> {
  const progress = createInitialM04Progress()
  const directory = createInitialPortalProgress().participantDirectory
  progress.input = {
    ...progress.input,
    sourceM03AssessmentId: 'm03-assessment-current', sourceM03RunId: 'm03-v2-current', sourcePromptSummary: '角色/任务、背景、输入、约束、输出格式、质量标准六格均已确认。',
    sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true,
  }
  progress.draft = await localM04LessonPlanRunner.run({ participantId: directory.currentParticipantId, input: progress.input })
  progress.draft.objectives.forEach((item) => { progress.audit.objectiveChecks[item.id] = true })
  progress.draft.activities.forEach((item) => { progress.audit.activityChecks[item.id] = '可实施' })
  Object.assign(progress.audit, { durationChecked: true, equipmentChecked: true, resourcesChecked: true, materialVerified: true, safetyVerified: true })
  const sectionIds: Record<M04CorrectionType, string> = { difficulty: 'learner-analysis', activity: 'activity-1', professional: 'professional-note' }
  ;(Object.keys(sectionIds) as M04CorrectionType[]).forEach((type) => {
    const section = progress.draft!.sections.find((item) => item.id === sectionIds[type])!
    progress.audit.corrections[type] = { type, sectionId: section.id, originalContent: section.content, revisedContent: `${section.content}（已按本班学情与现场条件调整）`, basis: type === 'professional' ? '课程讲义的三要素定义与材料允许范围' : '学生基础、45 分钟课时和普通机房设备条件' }
  })
  const peer = buildM04PeerArtifacts(directory)[0]
  progress.peerReview = {
    reviewerRole: '核验员', targetParticipantId: peer.participantId, targetArtifactId: peer.artifactId,
    overallImplementability: '可实施', objectiveActivityAssessment: '一致', objectiveObservable: '一致', activityFeasible: '一致', differentiatedSupport: '一致',
    suggestion: '建议在离堂卡中明确写出修改前后版本的对应目标。', submitted: true,
  }
  progress.confirmation = { peerDisposition: '采纳并已核对', peerResponse: '已在教师确认版保留修改前后证据，并核对目标对应。', professionalConfirmed: true, implementationConfirmed: true, safetyConfirmed: true }
  progress.confirmedPlan = createConfirmedM04Plan(progress, directory)
  return { progress, directory }
}

describe('M04 教案校验、评分与版本存储', () => {
  beforeEach(() => window.localStorage.removeItem(M04_STORAGE_KEY))

  it('确定性本地生成器形成 3 个目标，且活动时长与五类要素完整对应', async () => {
    const { progress } = await completeM04()
    const second = await localM04LessonPlanRunner.run({ participantId: 'T001', input: progress.input })
    expect(progress.draft?.objectives).toHaveLength(3)
    expect(lessonPlanDuration(progress.draft)).toBe(45)
    expect(lessonPlanMappingsComplete(progress.draft)).toBe(true)
    expect(second.activities).toEqual(progress.draft?.activities)
    expect(second.objectives).toEqual(progress.draft?.objectives)
    expect(validateM04Input(progress, true).valid).toBe(true)
  })

  it('只按规范校验 45—90 分钟，不增加隐藏字数门槛', () => {
    const progress = createInitialM04Progress()
    progress.input = { ...progress.input, sourceM03AssessmentId: 'a', sourceM03RunId: 'b', sourcePromptSummary: '六格', sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true, duration: 45 }
    expect(validateM04Input(progress, true).valid).toBe(true)
    progress.input.sourceM03RunId = 'm03-v2-T001-1786532400123'
    expect(validateM04Input(progress, true).valid).toBe(true)
    progress.input.duration = 91
    expect(validateM04Input(progress, true).messages).toContain('课堂时长必须为 45—90 分钟的整数')
    expect(containsM04SensitiveInformation(['学生手机号：13800138000'])).toBe(true)
  })

  it('完整保存三类原文、修改后内容、依据，并限制同组其他成员互评', async () => {
    const { progress, directory } = await completeM04()
    expect(validateM04Audit(progress).valid).toBe(true)
    expect(validateM04PeerReview(progress, directory).valid).toBe(true)
    expect(Object.values(progress.audit.corrections)).toHaveLength(3)
    Object.values(progress.audit.corrections).forEach((record) => expect(record).toEqual(expect.objectContaining({ originalContent: expect.any(String), revisedContent: expect.any(String), basis: expect.any(String) })))
    const changed = { ...directory, participants: directory.participants.map((item) => item.participantId === progress.peerReview.targetParticipantId ? { ...item, groupId: 'other', groupName: '其他组' } : item) }
    expect(validateM04PeerReview(progress, changed).valid).toBe(false)
  })

  it('M03 重新验收后必须重新读取新的验收与运行版本', async () => {
    const { progress } = await completeM04()
    expect(m04SourceIsCurrent(progress, 'm03-assessment-current', 'm03-v2-current')).toBe(true)
    expect(m04SourceIsCurrent(progress, 'm03-assessment-new', 'm03-v2-new')).toBe(false)
  })

  it('五项评分满分时通过；实质修改后保留旧记录但不再作为当前解锁依据', async () => {
    const { progress, directory } = await completeM04()
    const score = calculateM04Score(progress, directory, true)
    expect(score.dimensions).toHaveLength(5)
    expect(score.dimensions.every((item) => item.score === 2)).toBe(true)
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)
    progress.assessments.push(createM04Assessment(progress, directory, true))
    expect(latestM04AssessmentIsCurrent(progress, directory)).toBe(true)
    progress.confirmation.peerResponse = '基于最新互评又调整了处理说明。'
    expect(progress.assessments).toHaveLength(1)
    expect(latestM04AssessmentIsCurrent(progress, directory)).toBe(false)
  })

  it('按 participantId 隔离保存，任务内重置只删当前教师，全局重置删除全部教师', () => {
    let store = loadM04Store()
    store = updateParticipantM04Progress(store, 'T001', (current) => ({ ...current, route: 'audit' }))
    store = updateParticipantM04Progress(store, 'T002', (current) => ({ ...current, route: 'draft' }))
    saveM04Store(store)
    expect(m04ProgressForParticipant(loadM04Store(), 'T001').route).toBe('audit')
    expect(m04ProgressForParticipant(loadM04Store(), 'T002').route).toBe('draft')
    store = clearParticipantM04Progress(store, 'T001')
    expect(m04ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(m04ProgressForParticipant(store, 'T002').route).toBe('draft')
    expect(clearAllM04Progress().participants).toEqual({})
    expect(window.localStorage.getItem(M04_STORAGE_KEY)).toBeNull()
  })
})
