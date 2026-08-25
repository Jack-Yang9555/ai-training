import { describe, expect, it } from 'vitest'
import { createInitialE02Progress } from '../src/e02/data'
import type { E02Progress } from '../src/e02/domain'
import {
  applyE02ReferenceCorrections,
  archiveE02Attempt,
  e02DraftFingerprint,
  eligibleE02Reviewers,
  invalidateE02Confirmation,
  invalidateE02DerivedWork,
  LocalE02DraftRunner,
  rubricScoreTotal,
  simulateE02PeerReview,
} from '../src/e02/runner'
import { calculateE02Score, createE02Assessment } from '../src/e02/scoring'
import {
  clearAllE02Progress,
  clearParticipantE02Progress,
  createConfirmedE02Package,
  e02ProgressForParticipant,
  updateParticipantE02Progress,
  type E02ProgressStore,
} from '../src/e02/storage'
import {
  confirmedE02PackageIsCurrent,
  detectE02InitialDefects,
  latestE02AssessmentIsCurrent,
  progressForE02,
  validateE02Confirmation,
  validateE02FinalDraft,
  validateE02InitialDraft,
  validateE02PeerReview,
  validateE02Source,
} from '../src/e02/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function throughInitialDraft() {
  const directory = createInitialPortalProgress().participantDirectory
  const progress = createInitialE02Progress()
  progress.aiDraft = new LocalE02DraftRunner().run(progress, directory.currentParticipantId)
  progress.workingDraft = structuredClone(progress.aiDraft)
  return { progress, directory }
}

function throughPeerReview() {
  const { progress, directory } = throughInitialDraft()
  const reviewer = eligibleE02Reviewers(directory)[0]
  progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.peerReview = {
    ...simulateE02PeerReview(progress, directory),
    submitted: true,
    submittedAt: '2026-08-25T01:00:00.000Z',
  }
  return { progress, directory }
}

function completeE02() {
  const { progress: reviewed, directory } = throughPeerReview()
  const progress = applyE02ReferenceCorrections(reviewed, directory.currentParticipantId)
  progress.teacherConfirmation = {
    specificationReviewedConfirmed: true,
    authorizationAndPrivacyConfirmed: true,
    finalArtifactsConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE02Package(progress, directory)
  return { progress, directory }
}

describe('E02 实训任务书与评分量规领域验收', () => {
  it('提供完整且明确标注已审核虚构的规范，不设置隐藏字数门槛', () => {
    const progress = createInitialE02Progress()
    const directory = createInitialPortalProgress().participantDirectory
    expect(progress.specification.sourceKind).toBe('平台已审核虚构实训规范')
    expect(progress.specification.reviewedFictional).toBe(true)
    expect(progress.specification.name).toContain('已审核虚构样例')
    expect(progress.specification.version).toBeTruthy()
    expect(progress.specification.applicableEquipment).toBeTruthy()
    expect(progress.specification.clauses.length).toBeGreaterThanOrEqual(3)
    expect(progress.specification.clauses.every((item) => item.clauseId && item.requirement)).toBe(true)
    expect(validateE02Source(progress).valid).toBe(true)
    expect(progressForE02(progress, directory)).toBe(0)

    progress.scenario.courseName = '课'
    expect(validateE02Source(progress).valid).toBe(true)
    progress.scenario.courseName = ''
    expect(validateE02Source(progress).valid).toBe(false)
  })

  it('确定性初稿可重复，并真实暴露顺序、安全表述和总分 95 三类缺陷', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const progress = createInitialE02Progress()
    const runner = new LocalE02DraftRunner()
    const first = runner.run(progress, directory.currentParticipantId)
    const second = runner.run(progress, directory.currentParticipantId)
    expect(second).toEqual(first)
    progress.aiDraft = first
    progress.workingDraft = structuredClone(first)
    expect(first.taskBook.background).toBeTruthy()
    expect(first.taskBook.objective).toBeTruthy()
    expect(first.taskBook.materials.length).toBeGreaterThan(0)
    expect(first.taskBook.steps).toHaveLength(4)
    expect(first.taskBook.steps.every((item) => item.action && item.completionEvidence && item.clauseId)).toBe(true)
    expect(first.safetyChecklist).toHaveLength(3)
    expect(first.safetyChecklist.every((item) => item.stepId && item.clauseId)).toBe(true)
    expect(rubricScoreTotal(first)).toBe(95)
    expect(detectE02InitialDefects(progress)).toEqual(['operation-sequence', 'vague-safety', 'rubric-total-95'])
    expect(validateE02InitialDraft(progress, directory.currentParticipantId).valid).toBe(true)
  })

  it('只允许当前同组其他成员复核，并把“需调整/不是 100 分”保留为有效事实', () => {
    const { progress, directory } = throughInitialDraft()
    const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!
    const reviewers = eligibleE02Reviewers(directory)
    expect(reviewers.length).toBeGreaterThan(0)
    expect(reviewers.every((item) => item.groupId === current.groupId && item.participantId !== current.participantId)).toBe(true)

    progress.peerReview = { ...progress.peerReview, reviewerId: reviewers[0].participantId, reviewerRole: '核验员' }
    progress.peerReview = { ...simulateE02PeerReview(progress, directory), submitted: true, submittedAt: '2026-08-25T01:00:00.000Z' }
    expect(progress.peerReview.sequence).toBe('需调整')
    expect(progress.peerReview.safety).toBe('需调整')
    expect(progress.peerReview.scoreTotal).toBe('不是 100 分')
    expect(progress.peerReview.disclosure).toContain('无多人后端')
    expect(progress.peerReview.disclosure).toContain('非实时提交')
    expect(validateE02PeerReview(progress, directory).valid).toBe(true)

    const outsider = directory.participants.find((item) => item.groupId !== current.groupId)!
    progress.peerReview.reviewerId = outsider.participantId
    expect(validateE02PeerReview(progress, directory).valid).toBe(false)
  })

  it('依据复核完成实质修改后，顺序、安全和量规均达到规范正确与 100 分', () => {
    const { progress: reviewed, directory } = throughPeerReview()
    const beforeFingerprint = e02DraftFingerprint(reviewed.aiDraft)
    const progress = applyE02ReferenceCorrections(reviewed, directory.currentParticipantId)
    const orderedClauseIds = [...progress.workingDraft!.taskBook.steps].sort((left, right) => left.order - right.order).map((item) => item.clauseId)
    expect(orderedClauseIds).toEqual(['4.1', '4.2', '4.3', '4.4'])
    expect(progress.workingDraft!.safetyChecklist.find((item) => item.safetyId === 'SAFE-02')?.description).not.toBe('注意安全。')
    expect(rubricScoreTotal(progress.workingDraft)).toBe(100)
    expect(progress.modifications.length).toBeGreaterThanOrEqual(1)
    expect(progress.modifications.every((item) => item.beforeValue !== item.afterValue && item.basis && item.reviewedDraftFingerprint === beforeFingerprint)).toBe(true)
    expect(new Set(progress.modifications.map((item) => item.category))).toEqual(new Set(['step', 'safety', 'rubric']))
    expect(validateE02FinalDraft(progress, directory).valid).toBe(true)
  })

  it('四项核心、五维硬门槛与三项固定成果共同决定通过', () => {
    const { progress, directory } = completeE02()
    expect(validateE02Confirmation(progress, directory).valid).toBe(true)
    expect(progress.confirmedPackage?.artifacts.map((item) => item.name)).toEqual(['实训任务书', '安全检查单', '100 分评分量规'])
    expect(progress.confirmedPackage?.artifacts).toHaveLength(3)
    expect(confirmedE02PackageIsCurrent(progress, directory)).toBe(true)
    const score = calculateE02Score(progress, directory)
    expect(score.dimensions.map((item) => item.score)).toEqual([2, 2, 2, 2, 2])
    expect(score.coreRequirements).toHaveLength(4)
    expect(score.coreRequirements.every((item) => item.passed)).toBe(true)
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)

    const unsafe: E02Progress = structuredClone(progress)
    unsafe.teacherConfirmation.finalResponsibilityConfirmed = false
    const unsafeScore = calculateE02Score(unsafe, directory)
    expect(unsafeScore.total).toBeGreaterThanOrEqual(8)
    expect(unsafeScore.dimensions.find((item) => item.id === 'safety')?.score).not.toBe(2)
    expect(unsafeScore.hardGatesPassed).toBe(false)
    expect(unsafeScore.passed).toBe(false)
  })

  it('内容指纹变化使当前通过失效，同时保留验收与失效历史', () => {
    const { progress, directory } = completeE02()
    progress.assessments.push(createE02Assessment(progress, directory))
    expect(progress.assessments[0].attempt).toBe('initial')
    expect(latestE02AssessmentIsCurrent(progress, directory)).toBe(true)
    expect(progressForE02(progress, directory)).toBe(100)

    const changed: E02Progress = structuredClone(progress)
    changed.workingDraft!.taskBook.background = '修改后的课堂背景'
    expect(latestE02AssessmentIsCurrent(changed, directory)).toBe(false)
    expect(changed.assessments).toHaveLength(1)

    const history = archiveE02Attempt(progress, '任务书内容更新')
    expect(history).toHaveLength(1)
    const invalidated = invalidateE02Confirmation(progress, '任务书内容更新')
    expect(invalidated.attemptHistory).toHaveLength(1)
    expect(invalidated.assessments).toHaveLength(1)
    expect(invalidated.confirmedPackage).toBeUndefined()
    expect(invalidated.workingDraft).toBeDefined()

    const regenerated = invalidateE02DerivedWork(progress, '规范版本更新')
    expect(regenerated.attemptHistory).toHaveLength(1)
    expect(regenerated.assessments).toHaveLength(1)
    expect(regenerated.aiDraft).toBeUndefined()
    expect(regenerated.modifications).toHaveLength(0)
  })

  it('按 participantId 隔离，支持任务内单人重置和全局清空', () => {
    let store: E02ProgressStore = { version: 1, participants: {} }
    store = updateParticipantE02Progress(store, 'T001', (current) => ({ ...current, route: 'draft' }))
    store = updateParticipantE02Progress(store, 'T002', (current) => ({ ...current, route: 'peer-review' }))
    expect(e02ProgressForParticipant(store, 'T001').route).toBe('draft')
    expect(e02ProgressForParticipant(store, 'T002').route).toBe('peer-review')
    store = clearParticipantE02Progress(store, 'T001')
    expect(e02ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(e02ProgressForParticipant(store, 'T002').route).toBe('peer-review')
    expect(clearAllE02Progress()).toEqual({ version: 1, participants: {} })
  })
})
