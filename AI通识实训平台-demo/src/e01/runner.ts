import type { ParticipantDirectory } from '../training/types'
import {
  e01AiScoreMatrix,
  e01EvidenceExcerpts,
  e01InitialFeedback,
} from './data'
import type {
  E01AiReview,
  E01CorrectionRecord,
  E01DimensionScore,
  E01PeerReview,
  E01Progress,
  E01TeacherReview,
} from './domain'

export function e01Hash(value: unknown) {
  const text = JSON.stringify(value)
  let result = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

export function e01RubricFingerprint(progress: Pick<E01Progress, 'rubric' | 'scenario'>) {
  return e01Hash({
    version: progress.rubric.version,
    dimensions: progress.rubric.dimensions,
    learningObjective: progress.scenario.learningObjective,
    gradingRequirement: progress.scenario.gradingRequirement,
  })
}

export function e01InputFingerprint(progress: Pick<E01Progress, 'scenario' | 'answers' | 'rubric'>) {
  return e01Hash({
    scenario: progress.scenario,
    answers: progress.answers,
    rubric: { version: progress.rubric.version, dimensions: progress.rubric.dimensions },
  })
}

function scoreRationale(answerId: E01AiReview['answerId'], score: E01DimensionScore['score'], dimensionName: string) {
  if (answerId === 'A04' && dimensionName === '证据使用') return '作答给出了一条明确结论，初评将其误当为充分证据，该判定需教师复核。'
  if (score === 3) return `作答中的可观察表述完整支撑“${dimensionName}”标准。`
  if (score === 2) return `作答主体达到“${dimensionName}”要求，但仍有一处可执行补充项。`
  return `作答仅提到“${dimensionName}”的局部意图，缺少可核验细节。`
}

export class LocalE01GradingRunner {
  run(progress: E01Progress, participantId: string): E01AiReview[] {
    const rubricFingerprint = e01RubricFingerprint(progress)
    const inputFingerprint = e01InputFingerprint(progress)
    return progress.answers.map((answer) => {
      const scores = e01AiScoreMatrix[answer.answerId]
      const dimensionScores = progress.rubric.dimensions.map<E01DimensionScore>((dimension) => ({
        dimensionId: dimension.dimensionId,
        score: scores[dimension.dimensionId],
        evidenceExcerpt: e01EvidenceExcerpts[answer.answerId],
        rationale: scoreRationale(answer.answerId, scores[dimension.dimensionId], dimension.name),
      }))
      return {
        reviewId: `E01-AI-${answer.answerId}-${e01Hash([participantId, inputFingerprint])}`,
        participantId,
        answerId: answer.answerId,
        answerVersion: answer.version,
        rubricVersion: progress.rubric.version,
        rubricFingerprint,
        inputFingerprint,
        dimensionScores,
        feedback: structuredClone(e01InitialFeedback[answer.answerId]),
        generatedAt: '2026-08-24T00:00:00.000Z',
        engineLabel: '本地确定性批改引擎（Demo）',
      }
    })
  }
}

export function createE01TeacherReviews(aiReviews: E01AiReview[]): E01TeacherReview[] {
  return aiReviews.map((review) => ({
    answerId: review.answerId,
    aiReviewId: review.reviewId,
    rubricVersion: review.rubricVersion,
    finalDimensionScores: structuredClone(review.dimensionScores),
    finalFeedback: structuredClone(review.feedback),
    status: '待复核',
    reviewed: false,
  }))
}

export function confirmAllE01TeacherReviews(progress: E01Progress): E01TeacherReview[] {
  const corrected = new Set(progress.corrections.map((item) => item.answerId))
  const reviewedAt = new Date().toISOString()
  return progress.teacherReviews.map((review) => ({
    ...review,
    reviewed: true,
    reviewedAt,
    status: corrected.has(review.answerId) ? '已修正' : '确认',
  }))
}

export function createE01Correction(progress: E01Progress): E01CorrectionRecord {
  const draft = progress.correctionDraft
  const aiReview = progress.aiReviews.find((item) => item.answerId === draft.answerId)
  return {
    ...structuredClone(draft),
    correctionId: `E01-C-${e01Hash([draft, aiReview?.reviewId])}`,
    correctedAt: new Date().toISOString(),
    aiReviewId: aiReview?.reviewId ?? '',
    rubricVersion: progress.rubric.version,
  }
}

export function applyE01Correction(progress: E01Progress, correction = createE01Correction(progress)): E01Progress {
  const existing = progress.corrections.some((item) => item.correctionId === correction.correctionId)
  const teacherReviews = progress.teacherReviews.map((review) => {
    if (review.answerId !== correction.answerId) return review
    return {
      ...review,
      finalDimensionScores: review.finalDimensionScores.map((item) => item.dimensionId === correction.dimensionId
        ? { ...item, score: correction.afterScore, rationale: correction.reason }
        : item),
      finalFeedback: { ...review.finalFeedback, nextStep: correction.afterNextStep },
      status: '已修正' as const,
      reviewed: true,
      reviewedAt: correction.correctedAt,
    }
  })
  return {
    ...progress,
    teacherReviews,
    corrections: existing ? progress.corrections : [...progress.corrections, correction],
    peerReview: { ...progress.peerReview, submitted: false, submittedAt: undefined },
    teacherConfirmation: {
      rubricAndObjectiveConfirmed: false,
      fiveFinalReviewsConfirmed: false,
      privacyConfirmed: false,
      aiNotFinalConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
  }
}

export function archiveE01Attempt(progress: E01Progress, reason: string) {
  if (!progress.aiReviews.length && !progress.teacherReviews.length) return progress.attemptHistory
  const signature = e01Hash({
    aiReviews: progress.aiReviews,
    teacherReviews: progress.teacherReviews,
    corrections: progress.corrections,
    peerReview: progress.peerReview,
  })
  const historyId = `E01-H-${signature}`
  if (progress.attemptHistory.some((item) => item.historyId === historyId)) return progress.attemptHistory
  return [...progress.attemptHistory, {
    historyId,
    invalidatedAt: new Date().toISOString(),
    reason,
    aiReviews: structuredClone(progress.aiReviews),
    teacherReviews: structuredClone(progress.teacherReviews),
    corrections: structuredClone(progress.corrections),
    peerReview: structuredClone(progress.peerReview),
  }]
}

export function invalidateE01DerivedWork(progress: E01Progress, reason: string): E01Progress {
  return {
    ...progress,
    aiReviews: [],
    teacherReviews: [],
    corrections: [],
    peerReview: {
      ...progress.peerReview,
      recordId: '',
      rubricConsistency: undefined,
      evidenceAlignment: undefined,
      actionability: undefined,
      suggestion: '',
      authorTreatment: '',
      authorBasis: '',
      submitted: false,
      submittedAt: undefined,
    },
    teacherConfirmation: {
      rubricAndObjectiveConfirmed: false,
      fiveFinalReviewsConfirmed: false,
      privacyConfirmed: false,
      aiNotFinalConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    attemptHistory: archiveE01Attempt(progress, reason),
    updatedAt: new Date().toISOString(),
  }
}

export function simulateE01PeerReview(progress: E01Progress, directory: ParticipantDirectory): E01PeerReview {
  const reviewer = directory.participants.find((item) => item.participantId === progress.peerReview.reviewerId)
  const targetReview = progress.teacherReviews.find((item) => item.answerId === progress.peerReview.targetAnswerId)
  const actionability = targetReview?.finalFeedback.nextStep.includes('补写') || targetReview?.finalFeedback.nextStep.includes('改为') ? '可执行' : '需澄清'
  return {
    ...progress.peerReview,
    recordId: `E01-PEER-${e01Hash([reviewer?.participantId, targetReview?.aiReviewId, e01InputFingerprint(progress)])}`,
    reviewerGroupId: reviewer?.groupId ?? '',
    rubricConsistency: '一致',
    evidenceAlignment: '对应',
    actionability,
    suggestion: actionability === '可执行'
      ? '量规维度、作答证据和修改后建议能一一对应；建议保留 A04 证据分数下调的理由。'
      : '建议把“继续优化”改为学生可直接执行和教师可观察的下一步。',
    authorTreatment: '',
    authorBasis: '',
    simulated: true,
    disclosure: '当前无多人后端；测试摘要由本地确定性规则生成，不代表真实组员提交。',
    submitted: false,
    submittedAt: undefined,
  }
}
