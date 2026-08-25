import { describe, expect, it } from 'vitest'
import { createInitialE01Progress, e01AnswerIds } from '../src/e01/data'
import type { E01Progress } from '../src/e01/domain'
import {
  applyE01Correction,
  archiveE01Attempt,
  confirmAllE01TeacherReviews,
  createE01TeacherReviews,
  invalidateE01DerivedWork,
  LocalE01GradingRunner,
  simulateE01PeerReview,
} from '../src/e01/runner'
import { calculateE01Score, createE01Assessment } from '../src/e01/scoring'
import {
  clearParticipantE01Progress,
  createConfirmedE01Package,
  e01ProgressForParticipant,
  updateParticipantE01Progress,
  type E01ProgressStore,
} from '../src/e01/storage'
import {
  confirmedE01PackageIsCurrent,
  latestE01AssessmentIsCurrent,
  progressForE01,
  validateE01AiReview,
  validateE01Confirmation,
  validateE01Input,
  validateE01PeerReview,
  validateE01Rubric,
  validateE01TeacherReview,
} from '../src/e01/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function throughAiReview() {
  const directory = createInitialPortalProgress().participantDirectory
  const progress = createInitialE01Progress()
  progress.aiReviews = new LocalE01GradingRunner().run(progress, directory.currentParticipantId)
  progress.teacherReviews = createE01TeacherReviews(progress.aiReviews)
  return { progress, directory }
}

function completeE01() {
  const { progress: initial, directory } = throughAiReview()
  let progress = applyE01Correction(initial)
  progress.teacherReviews = confirmAllE01TeacherReviews(progress)
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!
  const peer = directory.participants.find((item) => item.groupId === current.groupId && item.participantId !== current.participantId)!
  progress.peerReview = { ...progress.peerReview, reviewerId: peer.participantId, reviewerRole: '核验员', targetAnswerId: 'A04' }
  progress.peerReview = {
    ...simulateE01PeerReview(progress, directory),
    authorTreatment: '已采纳并修正',
    authorBasis: '保留 A04 证据分数 3→2 的修正，并采用可执行下一步。',
    submitted: true,
    submittedAt: '2026-08-24T01:00:00.000Z',
  }
  progress.rubric.teacherConfirmed = true
  progress.teacherConfirmation = {
    rubricAndObjectiveConfirmed: true,
    fiveFinalReviewsConfirmed: true,
    privacyConfirmed: true,
    aiNotFinalConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE01Package(progress, directory)
  return { progress, directory }
}

describe('E01 AI 辅助批改与个性化反馈确定性验收', () => {
  it('固定 A01—A05 匿名作答，并只允许同版本四维量规', () => {
    const progress = createInitialE01Progress()
    expect(progress.answers.map((item) => item.answerId)).toEqual(e01AnswerIds)
    expect(progress.answers.every((item) => item.fictional && item.anonymous)).toBe(true)
    expect(validateE01Input(progress).valid).toBe(true)
    expect(validateE01Rubric(progress).valid).toBe(true)
    expect(progress.rubric.dimensions).toHaveLength(4)

    progress.rubric.dimensions.push(structuredClone(progress.rubric.dimensions[0]))
    expect(validateE01Rubric(progress).valid).toBe(false)
  })

  it('确定性初评可重复，稳定暴露 A04 证据 3 分和不可执行建议', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const progress = createInitialE01Progress()
    const runner = new LocalE01GradingRunner()
    const first = runner.run(progress, directory.currentParticipantId)
    const second = runner.run(progress, directory.currentParticipantId)
    expect(second).toEqual(first)
    progress.aiReviews = first
    const a04 = first.find((item) => item.answerId === 'A04')!
    expect(a04.dimensionScores.find((item) => item.dimensionId === 'evidence-use')?.score).toBe(3)
    expect(a04.feedback.nextStep).toBe('继续优化，使内容更好。')
    expect(validateE01AiReview(progress, directory.currentParticipantId).valid).toBe(true)
  })

  it('五份须逐项复核，只有关联 A04 与证据维度的实质修正才能通过', () => {
    const { progress, directory } = throughAiReview()
    expect(validateE01TeacherReview(progress, directory.currentParticipantId).valid).toBe(false)
    progress.teacherReviews = confirmAllE01TeacherReviews(progress)
    expect(validateE01TeacherReview(progress, directory.currentParticipantId).valid).toBe(false)

    const irrelevant: E01Progress = structuredClone(progress)
    irrelevant.correctionDraft = { ...irrelevant.correctionDraft, answerId: 'A03', dimensionId: 'goal-alignment', beforeScore: 2, afterScore: 1 }
    const irrelevantApplied = applyE01Correction(irrelevant)
    irrelevantApplied.teacherReviews = confirmAllE01TeacherReviews(irrelevantApplied)
    expect(validateE01TeacherReview(irrelevantApplied, directory.currentParticipantId).valid).toBe(false)

    const corrected = applyE01Correction(progress)
    corrected.teacherReviews = confirmAllE01TeacherReviews(corrected)
    expect(corrected.teacherReviews).toHaveLength(5)
    expect(corrected.teacherReviews.every((item) => item.reviewed)).toBe(true)
    const a04 = corrected.teacherReviews.find((item) => item.answerId === 'A04')!
    expect(a04.finalDimensionScores.find((item) => item.dimensionId === 'evidence-use')?.score).toBe(2)
    expect(a04.finalFeedback.nextStep).toContain('只调整一个关键变量')
    expect(validateE01TeacherReview(corrected, directory.currentParticipantId).valid).toBe(true)
  })

  it('同组其他成员、模拟披露、教师确认和两类固定成果共同决定通过', () => {
    const { progress, directory } = completeE01()
    expect(validateE01PeerReview(progress, directory).valid).toBe(true)
    expect(progress.peerReview.disclosure).toContain('不代表真实组员提交')
    expect(validateE01Confirmation(progress, directory).valid).toBe(true)
    expect(progress.confirmedPackage?.artifacts.map((item) => item.name)).toEqual(['评分量规', '5 份批改结果与个性化反馈'])
    expect(confirmedE01PackageIsCurrent(progress, directory)).toBe(true)
    const score = calculateE01Score(progress, directory)
    expect(score.dimensions.map((item) => item.score)).toEqual([2, 2, 2, 2, 2])
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)
  })

  it('五维硬门槛、内容指纹、初复验历史和失效归档均生效', () => {
    const { progress, directory } = completeE01()
    progress.assessments.push(createE01Assessment(progress, directory))
    expect(progress.assessments[0].attempt).toBe('initial')
    expect(latestE01AssessmentIsCurrent(progress, directory)).toBe(true)
    expect(progressForE01(progress, directory)).toBe(100)

    const unsafe: E01Progress = structuredClone(progress)
    unsafe.teacherConfirmation.privacyConfirmed = false
    const unsafeScore = calculateE01Score(unsafe, directory)
    expect(unsafeScore.total).toBeGreaterThanOrEqual(8)
    expect(unsafeScore.dimensions.find((item) => item.id === 'safety')?.score).not.toBe(2)
    expect(unsafeScore.hardGatesPassed).toBe(false)
    expect(unsafeScore.passed).toBe(false)
    expect(latestE01AssessmentIsCurrent(unsafe, directory)).toBe(false)
    expect(unsafe.assessments).toHaveLength(1)

    progress.assessments.push(createE01Assessment(progress, directory, '复验确认：保留 A04 修正依据'))
    expect(progress.assessments[1].attempt).toBe('retest')
    expect(progress.assessments[1].modificationSummary).toContain('A04')
    const history = archiveE01Attempt(progress, '量规版本更新')
    expect(history).toHaveLength(1)
    const invalidated = invalidateE01DerivedWork(progress, '量规版本更新')
    expect(invalidated.attemptHistory).toHaveLength(1)
    expect(invalidated.aiReviews).toHaveLength(0)
    expect(invalidated.assessments).toHaveLength(2)
    expect(invalidated.confirmedPackage).toBeUndefined()
  })

  it('按 participantId 隔离，本任务重置不影响其他教师', () => {
    let store: E01ProgressStore = { version: 1, participants: {} }
    store = updateParticipantE01Progress(store, 'T001', (current) => ({ ...current, route: 'rubric' }))
    store = updateParticipantE01Progress(store, 'T002', (current) => ({ ...current, route: 'ai-review' }))
    expect(e01ProgressForParticipant(store, 'T001').route).toBe('rubric')
    expect(e01ProgressForParticipant(store, 'T002').route).toBe('ai-review')
    store = clearParticipantE01Progress(store, 'T001')
    expect(e01ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(e01ProgressForParticipant(store, 'T002').route).toBe('ai-review')
  })
})
