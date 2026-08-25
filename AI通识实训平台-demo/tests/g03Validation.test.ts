import { beforeEach, describe, expect, it } from 'vitest'
import { buildG03GroupContext, g03OutputNames } from '../src/g03/data'
import {
  clearAllG03Progress,
  clearGroupG03Progress,
  createEmptyG03Store,
  createInitialG03Progress,
  G03_STORAGE_KEY,
  g03ProgressForGroup,
  loadG03Store,
  saveG03Store,
  updateGroupG03Progress,
} from '../src/g03/storage'
import { createG03Assessment, g03Conditions, latestG03AssessmentIsCurrent, validateG03Matrix, validateG03Scenarios, validateG03Showcase } from '../src/g03/validation'
import { completeG03Fixture } from './g03Fixtures'

describe('G03 小组阶段验收规则', () => {
  beforeEach(() => window.localStorage.removeItem(G03_STORAGE_KEY))

  it('当前教师读取真实 M09/M10/M11，其他成员只生成明确标注的确定性模拟证据', () => {
    const { progress } = completeG03Fixture()
    const current = progress.memberEvidence.find((item) => item.isCurrentParticipant)!
    expect(current.taskEvidence).toHaveLength(3)
    expect(current.taskEvidence.every((item) => item.source === '真实本地证据')).toBe(true)
    expect(progress.memberEvidence.filter((item) => !item.isCurrentParticipant).flatMap((item) => item.taskEvidence).every((item) => item.source === '确定性模拟组员证据')).toBe(true)
  })

  it('任意真实 M11 recordId 都会同步到对应组员行并闭合双向矩阵', () => {
    const { directory, input } = completeG03Fixture()
    input.m11Coverage = {
      testedParticipantId: 'T003',
      testedRecordId: 'real-m11/outbound#run-73',
      acceptedTestFromParticipantId: 'T005',
      acceptedRecordId: 'm11-real://inbound/run-19',
      submitted: true,
    }
    const context = buildG03GroupContext(directory, input)
    const progress = createInitialG03Progress(context)
    progress.matrixConfirmed = true
    const current = progress.testMatrix.find((item) => item.participantId === 'T001')!
    const testedMember = progress.testMatrix.find((item) => item.participantId === 'T003')!
    const tester = progress.testMatrix.find((item) => item.participantId === 'T005')!
    expect(current.testedRecordId).toBe('real-m11/outbound#run-73')
    expect(testedMember.acceptedTestFromParticipantId).toBe('T001')
    expect(testedMember.acceptedRecordId).toBe('real-m11/outbound#run-73')
    expect(current.acceptedRecordId).toBe('m11-real://inbound/run-19')
    expect(tester.testedParticipantId).toBe('T001')
    expect(tester.testedRecordId).toBe('m11-real://inbound/run-19')
    expect(validateG03Matrix(progress)).toEqual({ valid: true, messages: [] })
  })

  it('四项不计分验收条件全部满足才通过', () => {
    const { progress } = completeG03Fixture()
    expect(g03Conditions(progress).map((item) => [item.id, item.passed])).toEqual([
      ['bilateral-coverage', true],
      ['three-scenarios', true],
      ['two-round-showcase', true],
      ['traceable-report', true],
    ])
    const assessment = createG03Assessment(progress, '测试验收人', '2026-08-25T10:00:00.000Z').assessment
    expect(assessment).not.toHaveProperty('total')
    expect(assessment.outcome).toBe('已通过')
  })

  it('全员测试他人与接受测试逐人校验，本人模拟记录不能替代 M11', () => {
    const { progress } = completeG03Fixture()
    const current = progress.testMatrix.find((item) => item.participantId === progress.currentParticipantId)!
    current.source = '确定性模拟组员证据'
    expect(g03Conditions(progress).find((item) => item.id === 'bilateral-coverage')?.passed).toBe(false)
  })

  it('三场景分别校验来源定位、缺失条件和无虚假引用的人工转交', () => {
    const { progress } = completeG03Fixture()
    expect(validateG03Scenarios(progress).valid).toBe(true)
    const evidence = progress.scenarios.find((item) => item.kind === '有来源回答')!
    expect(evidence.sourceTaskId).toBe('M10')
    expect(evidence.evidenceId).toContain('M10')
    evidence.sourceTaskId = 'M11'
    expect(validateG03Scenarios(progress).messages).toContain('“有来源回答”的来源任务必须为 M10')
    evidence.sourceTaskId = 'M10'
    const boundary = progress.scenarios.find((item) => item.kind === '超范围说明与转交')!
    boundary.sourceId = 'FAKE-SOURCE'
    expect(validateG03Scenarios(progress).messages).toContain('越界卡必须说明知识范围、停止猜测、无虚假引用并指向人工转交对象')
  })

  it('三场景按各自 M10/M11 来源任务独立判定当前证据，不相互误标', () => {
    const { directory, input } = completeG03Fixture()
    input.tasks.M11 = { ...input.tasks.M11!, current: false }
    const withoutM11 = createInitialG03Progress(buildG03GroupContext(directory, input))
    expect(withoutM11.scenarios.find((item) => item.kind === '有来源回答')?.source).toBe('真实本地证据')
    expect(withoutM11.scenarios.filter((item) => item.sourceTaskId === 'M11').every((item) => item.source === '缺少当前真实证据')).toBe(true)

    input.tasks.M10 = { ...input.tasks.M10!, current: false }
    input.tasks.M11 = { ...input.tasks.M11!, current: true }
    const withoutM10 = createInitialG03Progress(buildG03GroupContext(directory, input))
    expect(withoutM10.scenarios.find((item) => item.kind === '有来源回答')?.source).toBe('缺少当前真实证据')
    expect(withoutM10.scenarios.filter((item) => item.sourceTaskId === 'M11').every((item) => item.source === '真实本地证据')).toBe(true)
  })

  it('A/B 两轮、3 分钟演示、2 分钟答问和逐人贡献均是硬条件', () => {
    const { progress } = completeG03Fixture()
    expect(validateG03Showcase(progress).valid).toBe(true)
    progress.showcase.rounds.find((item) => item.currentGroupRole === '展示')!.coreDemoSeconds = 181
    expect(g03Conditions(progress).find((item) => item.id === 'two-round-showcase')?.passed).toBe(false)
  })

  it('问题报告至少包含一条 M09—M11 可追溯修改、负责人和已通过复测', () => {
    const { progress } = completeG03Fixture()
    progress.issues.forEach((item) => { item.retestResult = '仍需修改' })
    expect(g03Conditions(progress).find((item) => item.id === 'traceable-report')?.passed).toBe(false)
  })

  it('通过后恰好归档三项固定成果，同一当前指纹只认可一次', () => {
    const { progress } = completeG03Fixture()
    const result = createG03Assessment(progress, '培训师', '2026-08-25T10:00:00.000Z')
    progress.assessments.push(result.assessment)
    progress.artifacts = result.artifacts
    expect(progress.artifacts.map((item) => item.name)).toEqual([...g03OutputNames])
    expect(progress.artifacts).toHaveLength(3)
    expect(latestG03AssessmentIsCurrent(progress)).toBe(true)
  })

  it('初验失败和补验分别留痕，内容变化保留历史但使当前通过失效', () => {
    const { progress } = completeG03Fixture()
    progress.showcase.rounds[0].completed = false
    const initial = createG03Assessment(progress, '培训师', '2026-08-25T10:00:00.000Z')
    progress.assessments.push(initial.assessment)
    expect(initial.assessment.phase).toBe('初验')
    expect(initial.assessment.outcome).toBe('未通过')
    progress.showcase.rounds[0].completed = true
    progress.assessmentModificationSummary = '补齐第一轮展示记录并复核演示时长。'
    const supplement = createG03Assessment(progress, '培训师', '2026-08-25T10:30:00.000Z')
    progress.assessments.push(supplement.assessment)
    progress.artifacts = supplement.artifacts
    expect(progress.assessments.map((item) => item.phase)).toEqual(['初验', '补验'])
    expect(latestG03AssessmentIsCurrent(progress)).toBe(true)
    progress.contributions[0].contribution += '并补充来源核验。'
    expect(progress.assessments).toHaveLength(2)
    expect(latestG03AssessmentIsCurrent(progress)).toBe(false)
  })

  it('按 groupId 隔离存储，并支持当前组重置、全局重置和来源指纹失效', () => {
    const { directory, input, context } = completeG03Fixture()
    const secondDirectory = { ...directory, currentParticipantId: 'T007' }
    const secondInput = { ...input, participantId: 'T007', m11Coverage: { testedParticipantId: 'T008', testedRecordId: 'M11:T007:test:T008', acceptedTestFromParticipantId: 'T010', acceptedRecordId: 'M11:T010:test:T007', submitted: true } }
    const secondContext = buildG03GroupContext(secondDirectory, secondInput)
    let store = createEmptyG03Store()
    store = updateGroupG03Progress(store, context, (progress) => ({ ...progress, route: 'issues' }))
    store = updateGroupG03Progress(store, secondContext, (progress) => ({ ...progress, route: 'showcase' }))
    saveG03Store(store)
    expect(g03ProgressForGroup(loadG03Store(), context).route).toBe('issues')
    expect(g03ProgressForGroup(loadG03Store(), secondContext).route).toBe('showcase')
    store = clearGroupG03Progress(store, context.groupId)
    expect(g03ProgressForGroup(store, context).route).toBe('overview')
    expect(g03ProgressForGroup(store, secondContext).route).toBe('showcase')
    expect(clearAllG03Progress().groups).toEqual({})
  })
})
