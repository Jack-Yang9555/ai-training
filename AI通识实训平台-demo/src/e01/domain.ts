import type { GroupRole } from '../types'

export type E01Route =
  | 'overview'
  | 'input'
  | 'rubric'
  | 'ai-review'
  | 'teacher-review'
  | 'peer-confirm'
  | 'result'

export type E01AnswerId = 'A01' | 'A02' | 'A03' | 'A04' | 'A05'
export type E01RubricDimensionId = 'goal-alignment' | 'professional-quality' | 'evidence-use' | 'actionable-expression'
export type E01RubricScore = 0 | 1 | 2 | 3
export type E01TeacherReviewStatus = '待复核' | '确认' | '需修正' | '已修正'

export interface E01Scenario {
  courseName: string
  learningObjective: string
  gradingRequirement: string
  assignmentPrompt: string
  sampleSource: '平台固定虚构匿名作答'
  anonymousSamplesConfirmed: boolean
}

export interface E01AnonymousAnswer {
  answerId: E01AnswerId
  version: '1.0'
  text: string
  fictional: true
  anonymous: true
}

export interface E01RubricDimension {
  dimensionId: E01RubricDimensionId
  name: string
  linkedObjective: string
  criteria: string
  evidenceRequirement: string
  maxScore: 3
}

export interface E01Rubric {
  version: string
  dimensions: E01RubricDimension[]
  teacherConfirmed: boolean
}

export interface E01Feedback {
  strength: string
  issue: string
  nextStep: string
}

export interface E01DimensionScore {
  dimensionId: E01RubricDimensionId
  score: E01RubricScore
  evidenceExcerpt: string
  rationale: string
}

export interface E01AiReview {
  reviewId: string
  participantId: string
  answerId: E01AnswerId
  answerVersion: '1.0'
  rubricVersion: string
  rubricFingerprint: string
  inputFingerprint: string
  dimensionScores: E01DimensionScore[]
  feedback: E01Feedback
  generatedAt: string
  engineLabel: '本地确定性批改引擎（Demo）'
}

export interface E01TeacherReview {
  answerId: E01AnswerId
  aiReviewId: string
  rubricVersion: string
  finalDimensionScores: E01DimensionScore[]
  finalFeedback: E01Feedback
  status: E01TeacherReviewStatus
  reviewed: boolean
  reviewedAt?: string
}

export interface E01CorrectionDraft {
  answerId: E01AnswerId
  dimensionId: E01RubricDimensionId
  beforeScore: E01RubricScore
  afterScore: E01RubricScore
  beforeNextStep: string
  afterNextStep: string
  reason: string
}

export interface E01CorrectionRecord extends E01CorrectionDraft {
  correctionId: string
  correctedAt: string
  aiReviewId: string
  rubricVersion: string
}

export interface E01PeerReview {
  recordId: string
  templateVersion: '1.0'
  reviewerId: string
  reviewerGroupId: string
  reviewerRole?: GroupRole
  targetAnswerId: E01AnswerId
  rubricConsistency?: '一致' | '需调整'
  evidenceAlignment?: '对应' | '需调整'
  actionability?: '可执行' | '需澄清'
  suggestion: string
  authorTreatment: '' | '已采纳并修正' | '不采纳并说明'
  authorBasis: string
  simulated: boolean
  disclosure: string
  submitted: boolean
  submittedAt?: string
}

export interface E01TeacherConfirmation {
  rubricAndObjectiveConfirmed: boolean
  fiveFinalReviewsConfirmed: boolean
  privacyConfirmed: boolean
  aiNotFinalConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface E01ArtifactRef {
  artifactId: string
  kind: 'e01-rubric' | 'e01-grading-feedback'
  name: '评分量规' | '5 份批改结果与个性化反馈'
}

export interface E01ConfirmedPackage {
  packageId: string
  participantId: string
  confirmedAt: string
  confirmationFingerprint: string
  rubricVersion: string
  answerIds: E01AnswerId[]
  artifacts: [E01ArtifactRef, E01ArtifactRef]
}

export type E01ScoreDimensionId = 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'

export interface E01AssessmentDimensionSnapshot {
  id: E01ScoreDimensionId
  score: 0 | 1 | 2
  evidence: string
}

export interface E01AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  hardGatesPassed: boolean
  dimensions: E01AssessmentDimensionSnapshot[]
  contentFingerprint: string
  modificationSummary: string
}

export interface E01AttemptHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  aiReviews: E01AiReview[]
  teacherReviews: E01TeacherReview[]
  corrections: E01CorrectionRecord[]
  peerReview: E01PeerReview
}

export interface E01Progress {
  version: 1
  route: E01Route
  scenario: E01Scenario
  answers: E01AnonymousAnswer[]
  rubric: E01Rubric
  aiReviews: E01AiReview[]
  teacherReviews: E01TeacherReview[]
  correctionDraft: E01CorrectionDraft
  corrections: E01CorrectionRecord[]
  peerReview: E01PeerReview
  teacherConfirmation: E01TeacherConfirmation
  confirmedPackage?: E01ConfirmedPackage
  attemptHistory: E01AttemptHistory[]
  assessments: E01AssessmentRecord[]
  updatedAt: string
}
