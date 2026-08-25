import type { GroupRole } from '../types'

export type E02Route =
  | 'overview'
  | 'source'
  | 'draft'
  | 'safety-rubric'
  | 'peer-review'
  | 'teacher-revision'
  | 'confirmation'
  | 'result'

export type E02StepId = 'S01' | 'S02' | 'S03' | 'S04'
export type E02SafetyId = 'SAFE-01' | 'SAFE-02' | 'SAFE-03'
export type E02RubricItemId = 'R01' | 'R02' | 'R03' | 'R04' | 'R05'

export interface E02SpecificationClause {
  clauseId: string
  sequence: number
  title: string
  requirement: string
}

export interface E02Specification {
  sourceKind: '平台已审核虚构实训规范'
  reviewedFictional: true
  name: string
  version: string
  applicableEquipment: string
  sourceOrganization: string
  authorization: string
  scopeNote: string
  clauses: E02SpecificationClause[]
}

export interface E02Scenario {
  courseName: string
  vocationalTask: string
  learningObjective: string
  equipment: string
  materials: string[]
  trainingConditions: string
  materialAuthorizationConfirmed: boolean
  privacyConfirmed: boolean
  verifiedOperationOnlyConfirmed: boolean
}

export interface E02TaskStep {
  stepId: E02StepId
  order: number
  action: string
  completionEvidence: string
  clauseId: string
  critical: boolean
  teacherReviewed: boolean
}

export interface E02TaskBook {
  taskBookId: string
  title: string
  background: string
  objective: string
  materials: string[]
  steps: E02TaskStep[]
}

export interface E02SafetyCheck {
  safetyId: E02SafetyId
  description: string
  completionEvidence: string
  stepId: E02StepId
  clauseId: string
  teacherReviewed: boolean
}

export interface E02RubricItem {
  rubricItemId: E02RubricItemId
  name: string
  score: number
  criticalStepIds: E02StepId[]
  deductionConditions: string
  clauseIds: string[]
  teacherReviewed: boolean
}

export interface E02Rubric {
  rubricId: string
  version: string
  items: E02RubricItem[]
}

export interface E02DraftPackage {
  draftId: string
  participantId: string
  inputFingerprint: string
  generatedAt: string
  engineLabel: '本地确定性任务书引擎（Demo）'
  taskBook: E02TaskBook
  safetyChecklist: E02SafetyCheck[]
  rubric: E02Rubric
}

export type E02SequenceReview = '正确' | '需调整' | '不正确'
export type E02SafetyReview = '完整' | '需调整' | '不完整'
export type E02ScoreTotalReview = '准确为 100 分' | '不是 100 分'

export interface E02PeerReview {
  recordId: string
  templateVersion: '1.0'
  reviewerId: string
  reviewerGroupId: string
  reviewerRole?: GroupRole
  taskBookId: string
  reviewedDraftFingerprint: string
  sequence: E02SequenceReview | ''
  safety: E02SafetyReview | ''
  scoreTotal: E02ScoreTotalReview | ''
  suggestion: string
  authorTreatment: '' | '已采纳并修正' | '不采纳并说明'
  authorBasis: string
  simulated: true
  disclosure: string
  submitted: boolean
  submittedAt?: string
}

export type E02ModificationCategory = 'step' | 'safety' | 'rubric'
export type E02ModificationField = 'order' | 'description' | 'score'

export interface E02ModificationRecord {
  modificationId: string
  participantId: string
  category: E02ModificationCategory
  targetId: E02StepId | E02SafetyId | E02RubricItemId
  field: E02ModificationField
  beforeValue: string
  afterValue: string
  basisClauseId: string
  basis: string
  sourcePeerReviewId: string
  reviewedDraftFingerprint: string
  modifiedAt: string
}

export interface E02TeacherConfirmation {
  specificationReviewedConfirmed: boolean
  authorizationAndPrivacyConfirmed: boolean
  finalArtifactsConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface E02ArtifactRef {
  artifactId: string
  kind: 'e02-task-book' | 'e02-safety-checklist' | 'e02-rubric'
  name: '实训任务书' | '安全检查单' | '100 分评分量规'
}

export interface E02ConfirmedPackage {
  packageId: string
  participantId: string
  confirmedAt: string
  confirmationFingerprint: string
  specificationName: string
  specificationVersion: string
  taskBookId: string
  rubricTotal: 100
  artifacts: [E02ArtifactRef, E02ArtifactRef, E02ArtifactRef]
}

export type E02ScoreDimensionId = 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'

export interface E02AssessmentDimensionSnapshot {
  id: E02ScoreDimensionId
  score: 0 | 1 | 2
  evidence: string
}

export interface E02AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  hardGatesPassed: boolean
  coreRequirementsPassed: boolean
  dimensions: E02AssessmentDimensionSnapshot[]
  contentFingerprint: string
  modificationSummary: string
}

export interface E02AttemptHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  aiDraft?: E02DraftPackage
  workingDraft?: E02DraftPackage
  peerReview: E02PeerReview
  modifications: E02ModificationRecord[]
  confirmedPackage?: E02ConfirmedPackage
}

export interface E02Progress {
  version: 1
  route: E02Route
  scenario: E02Scenario
  specification: E02Specification
  aiDraft?: E02DraftPackage
  workingDraft?: E02DraftPackage
  peerReview: E02PeerReview
  modifications: E02ModificationRecord[]
  teacherConfirmation: E02TeacherConfirmation
  confirmedPackage?: E02ConfirmedPackage
  attemptHistory: E02AttemptHistory[]
  assessments: E02AssessmentRecord[]
  updatedAt: string
}
