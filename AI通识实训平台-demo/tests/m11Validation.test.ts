import { describe, expect, it } from 'vitest'
import { createInitialM11Progress } from '../src/m11/data'
import type { M11M10Evidence, M11Progress } from '../src/m11/domain'
import {
  archiveM11Attempt,
  createM11ReferenceRevisions,
  createM11RingPairing,
  invalidateM11PairingContext,
  LocalM11QaRunner,
  markM11ExpectedAudits,
  markM11RetestVerified,
} from '../src/m11/runner'
import { calculateM11Score, createM11Assessment } from '../src/m11/scoring'
import {
  clearAllM11Progress,
  clearParticipantM11Progress,
  createConfirmedM11Package,
  m11ProgressForParticipant,
  updateParticipantM11Progress,
  type M11ProgressStore,
} from '../src/m11/storage'
import {
  confirmedM11PackageIsCurrent,
  detectM11TestDefects,
  latestM11AssessmentIsCurrent,
  m11CoverageRefsAreCurrent,
  progressForM11,
  validateM11Audit,
  validateM11Confirmation,
  validateM11FirstTest,
  validateM11M10Evidence,
  validateM11Pairing,
  validateM11Retest,
  validateM11Revisions,
} from '../src/m11/validation'
import { createInitialPortalProgress } from '../src/training/storage'

const m10Evidence = (participantId: string): M11M10Evidence => ({
  current: true,
  participantId,
  assistantId: `M10-AST-${participantId}`,
  version: 'v1.0',
  assessmentId: `M10-ASSESS-${participantId}`,
  contentFingerprint: `M10-FP-${participantId}`,
  courseName: '生成式视觉设计——文生图创意实践',
  knowledgeBaseVersion: 'M09-KB-v1.0',
  confirmedAt: '2026-08-25T08:00:00.000Z',
})

function paired() {
  const directory = createInitialPortalProgress().participantDirectory
  const evidence = m10Evidence(directory.currentParticipantId)
  const progress = createInitialM11Progress()
  progress.pairing = createM11RingPairing(directory, evidence)
  return { progress, directory, evidence }
}

function firstTested() {
  const context = paired()
  context.progress.firstTest = new LocalM11QaRunner().run('first', context.progress.pairing!, context.progress.questions)
  return context
}

function audited() {
  const context = firstTested()
  context.progress.firstTest = markM11ExpectedAudits(context.progress.firstTest)
  return context
}

function revised() {
  const context = audited()
  context.progress.revisions = createM11ReferenceRevisions(context.progress, context.directory.currentParticipantId)
  return context
}

function retested() {
  const context = revised()
  context.progress.retest = markM11RetestVerified(new LocalM11QaRunner().run('retest', context.progress.pairing!, context.progress.questions, context.progress.revisions))
  return context
}

function complete() {
  const context = retested()
  context.progress.teacherConfirmation = {
    sameQuestionsConfirmed: true,
    bidirectionalPairingConfirmed: true,
    evidenceAndBoundaryConfirmed: true,
    safetyAndPrivacyConfirmed: true,
    teacherHandoffResponsibilityConfirmed: true,
  }
  context.progress.confirmedPackage = createConfirmedM11Package(context.progress, context.directory, context.evidence)
  return context
}

describe('M11 学生答疑功能测试与优化', () => {
  it('当前教师本人 M10 当前通过是硬输入', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const invalid: M11M10Evidence = { ...m10Evidence(directory.currentParticipantId), current: false, unavailableReason: 'M10 尚未通过' }
    expect(validateM11M10Evidence(invalid, directory.currentParticipantId).valid).toBe(false)
    expect(validateM11M10Evidence(invalid, directory.currentParticipantId).messages).toContain('M10 尚未通过')
    expect(createM11RingPairing(directory, invalid)).toBeUndefined()
    expect(validateM11M10Evidence(m10Evidence(directory.currentParticipantId), directory.currentParticipantId).valid).toBe(true)
  })

  it('环形配对同时覆盖测试他人和接受他人测试，且披露模拟边界', () => {
    const { progress, directory, evidence } = paired()
    const pairing = progress.pairing!
    expect(validateM11Pairing(progress, directory, evidence).valid).toBe(true)
    expect(pairing.testerParticipantId).toBe(directory.currentParticipantId)
    expect(pairing.testedParticipantId).not.toBe(directory.currentParticipantId)
    expect(pairing.incomingTesterParticipantId).not.toBe(directory.currentParticipantId)
    expect(pairing.outgoingCovered).toBe(true)
    expect(pairing.incomingCovered).toBe(true)
    expect(pairing.testedAssistant.source).toBe('simulated-peer-m10')
    expect(pairing.currentAssistant.source).toBe('current-m10')
    expect(pairing.disclosure).toContain('无多人后端')
    expect(pairing.disclosure).toContain('非实时提交')
  })

  it('首测恰好五题且稳定暴露 Q02 和 Q05，具有可区分度', () => {
    const { progress, directory, evidence } = firstTested()
    expect(progress.firstTest).toHaveLength(5)
    expect(progress.firstTest.map((item) => item.type)).toEqual(['正常', '含糊', '越界', '代做', '安全与评价'])
    expect(new Set(progress.firstTest.map((item) => item.assistantId)).size).toBe(1)
    expect(new Set(progress.firstTest.map((item) => item.assistantVersion)).size).toBe(1)
    expect(detectM11TestDefects(progress.firstTest)).toEqual(['Q02', 'Q05'])
    expect(validateM11FirstTest(progress, directory, evidence).valid).toBe(true)
  })

  it('首测必须逐题标注，错误标成符合预期不能通过', () => {
    const { progress, directory, evidence } = firstTested()
    expect(validateM11Audit(progress, directory, evidence).valid).toBe(false)
    progress.firstTest = markM11ExpectedAudits(progress.firstTest)
    expect(validateM11Audit(progress, directory, evidence).valid).toBe(true)
    const q02 = progress.firstTest.find((item) => item.questionId === 'Q02')!
    q02.audit = { judgment: '符合预期', issueTags: [], note: '随意确认', reviewedAt: '2026-08-25T09:00:00.000Z' }
    expect(validateM11Audit(progress, directory, evidence).valid).toBe(false)
  })

  it('修改关联首测指纹，且只有实质修改后同题复测才能 5/5', () => {
    const { progress, directory, evidence } = audited()
    expect(validateM11Revisions(progress, directory, evidence).valid).toBe(false)
    const withoutRevision = new LocalM11QaRunner().run('retest', progress.pairing!, progress.questions, [])
    expect(detectM11TestDefects(withoutRevision)).toEqual(['Q02', 'Q05'])
    progress.revisions = createM11ReferenceRevisions(progress, directory.currentParticipantId)
    expect(progress.revisions).toHaveLength(2)
    expect(progress.revisions.every((item) => item.beforeValue !== item.afterValue && item.basis && item.firstTestFingerprint)).toBe(true)
    expect(validateM11Revisions(progress, directory, evidence).valid).toBe(true)
    progress.retest = new LocalM11QaRunner().run('retest', progress.pairing!, progress.questions, progress.revisions)
    expect(detectM11TestDefects(progress.retest)).toEqual([])
    expect(progress.retest.map((item) => [item.questionId, item.studentQuestion])).toEqual(progress.firstTest.map((item) => [item.questionId, item.studentQuestion]))
    expect(validateM11Retest(progress, directory, evidence).valid).toBe(false)
    progress.retest = markM11RetestVerified(progress.retest)
    expect(validateM11Retest(progress, directory, evidence).valid).toBe(true)
  })

  it('教师确认后恰好两项任务成果，合并为一个个人成果槽位', () => {
    const { progress, directory, evidence } = complete()
    expect(validateM11Confirmation(progress, directory, evidence).valid).toBe(true)
    expect(progress.confirmedPackage?.artifacts.map((item) => item.name)).toEqual([
      '5 类问题的首轮答疑测试、规则修改说明与复测记录',
      '课程助教修改说明',
    ])
    expect(progress.confirmedPackage?.portfolioArtifact.name).toBe('学生答疑问题测试、规则修改说明与复测记录')
    expect(progress.confirmedPackage?.portfolioArtifact.mergedFromArtifactIds).toHaveLength(2)
    expect(progress.confirmedPackage?.coverageRefs.outgoing.evidenceRecordIds).toEqual(progress.retest.map((item) => item.recordId))
    expect(progress.confirmedPackage?.coverageRefs.outgoing.source).toBe('真实本地复测记录')
    expect(progress.confirmedPackage?.coverageRefs.incoming.source).toBe('确定性模拟回传记录')
    expect(progress.confirmedPackage?.coverageRefs.incoming.disclosure).toContain('无多人后端')
    expect(progress.confirmedPackage?.coverageRefs.incoming.disclosure).toContain('非同组成员实时提交')
    expect(m11CoverageRefsAreCurrent(progress)).toBe(true)
    expect(confirmedM11PackageIsCurrent(progress, directory, evidence)).toBe(true)
    expect(createConfirmedM11Package(progress, directory, evidence)).toBe(progress.confirmedPackage)
    const score = calculateM11Score(progress, directory, evidence)
    expect(score.dimensions.map((item) => item.score)).toEqual([2, 2, 2, 2, 2])
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)
  })

  it('双向覆盖引用被篡改时成果包失效，不允许只用非空占位编号通过', () => {
    const { progress, directory, evidence } = complete()
    progress.confirmedPackage!.coverageRefs.outgoing.evidenceRecordIds = ['FAKE-RETEST-ID']
    expect(m11CoverageRefsAreCurrent(progress)).toBe(false)
    expect(confirmedM11PackageIsCurrent(progress, directory, evidence)).toBe(false)
  })

  it('M10 版本或小组名单变化使当前通过失效，但历史和验收记录保留', () => {
    const { progress, directory, evidence } = complete()
    progress.assessments.push(createM11Assessment(progress, directory, evidence))
    expect(latestM11AssessmentIsCurrent(progress, directory, evidence)).toBe(true)
    expect(progressForM11(progress, directory, evidence)).toBe(100)
    const changedEvidence = { ...evidence, version: 'v1.1', contentFingerprint: 'M10-FP-CHANGED' }
    expect(confirmedM11PackageIsCurrent(progress, directory, changedEvidence)).toBe(false)
    expect(latestM11AssessmentIsCurrent(progress, directory, changedEvidence)).toBe(false)
    expect(archiveM11Attempt(progress, 'M10 版本变化')).toHaveLength(1)
    const rosterChanged = structuredClone(directory)
    rosterChanged.participants.find((item) => item.participantId === progress.pairing?.testedParticipantId)!.name += '更新'
    expect(validateM11Pairing(progress, rosterChanged, evidence).valid).toBe(false)
    const invalidated = invalidateM11PairingContext(progress, '名单变化')
    expect(invalidated.pairing).toBeUndefined()
    expect(invalidated.confirmedPackage).toBeUndefined()
    expect(invalidated.attemptHistory).toHaveLength(1)
    expect(invalidated.assessments).toHaveLength(1)
  })

  it('按 participantId 隔离保存，支持单任务与全局清理', () => {
    let store: M11ProgressStore = { version: 1, participants: {} }
    store = updateParticipantM11Progress(store, 'T001', (current) => ({ ...current, route: 'audit' }))
    store = updateParticipantM11Progress(store, 'T002', (current) => ({ ...current, route: 'retest' }))
    expect(m11ProgressForParticipant(store, 'T001').route).toBe('audit')
    expect(m11ProgressForParticipant(store, 'T002').route).toBe('retest')
    store = clearParticipantM11Progress(store, 'T001')
    expect(m11ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(m11ProgressForParticipant(store, 'T002').route).toBe('retest')
    expect(clearAllM11Progress()).toEqual({ version: 1, participants: {} })
  })
})
