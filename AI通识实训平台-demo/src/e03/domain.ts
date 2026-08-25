import type { GroupRole } from '../types'

export type E03Route =
  | 'overview'
  | 'source'
  | 'findings'
  | 'measures'
  | 'peer-review'
  | 'revision'
  | 'confirmation'
  | 'result'

export type E03FindingId = 'F01' | 'F02' | 'F03'
export type E03MeasureId = 'A01' | 'A02'

export interface E03SourceExcerpt {
  referenceId: string
  locator: string
  content: string
}

export interface E03ClassroomSource {
  sourceId: string
  sourceKind: '平台已审核虚构课堂记录' | '教师确认已匿名化本地记录'
  sourceName: string
  version: string
  reviewedFictional: boolean
  teachingGoal: string
  classroomActivities: string
  assessmentResults: string
  excerpts: E03SourceExcerpt[]
  anonymizationConfirmed: boolean
  sourceOnlyConfirmed: boolean
  noRealIdentityConfirmed: boolean
}

export interface E03Finding {
  findingId: E03FindingId
  observedFact: string
  sourceReference: string
  sourceExcerpt: string
  interpretationToConfirm: string
  teacherReviewed: boolean
}

export interface E03FindingDraft {
  draftId: string
  participantId: string
  inputFingerprint: string
  generatedAt: string
  engineLabel: '本地确定性课堂证据引擎（Demo）'
  findings: E03Finding[]
}

export interface E03ImprovementMeasure {
  measureId: E03MeasureId
  linkedFindingIds: E03FindingId[]
  implementationPhase: string
  teacherAction: string
  observableStudentBehavior: string
  checkMethod: string
  teacherReviewed: boolean
}

export interface E03MeasureSet {
  artifactId: string
  participantId: string
  basedOnFindingsFingerprint: string
  measures: E03ImprovementMeasure[]
}

export type E03SpecificReview = '' | '具体' | '需调整' | '不具体'
export type E03ExecutableReview = '' | '可执行' | '需调整' | '不可执行'
export type E03ObservableReview = '' | '可观察' | '需调整' | '不可观察'

export interface E03MeasurePeerJudgement {
  measureId: E03MeasureId
  specific: E03SpecificReview
  executable: E03ExecutableReview
  observable: E03ObservableReview
  suggestion: string
}

export interface E03PeerReview {
  recordId: string
  templateVersion: '1.0'
  targetScope: 'member'
  reviewerId: string
  reviewerGroupId: string
  reviewerRole?: GroupRole
  artifactKind: 'e03-improvement-measures'
  artifactId: string
  reviewedMeasureFingerprint: string
  judgements: E03MeasurePeerJudgement[]
  simulated: true
  disclosure: string
  submitted: boolean
  submittedAt?: string
}

export interface E03MeasureRevision {
  revisionId: string
  participantId: string
  measureId: E03MeasureId
  before: E03ImprovementMeasure
  after: E03ImprovementMeasure
  sourcePeerReviewId: string
  reviewedMeasureFingerprint: string
  sourceSuggestion: string
  authorTreatment: '已采纳并修正' | '不采纳并说明'
  authorBasis: string
  revisedAt: string
}

export interface E03TeacherConfirmation {
  sourceBoundaryConfirmed: boolean
  findingsReviewedConfirmed: boolean
  noRealIdentityConfirmed: boolean
  noFixedLabelsConfirmed: boolean
  finalArtifactsConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface E03ArtifactRef {
  artifactId: string
  kind: 'e03-reflection-record' | 'e03-improvement-measures'
  name: '教学反思或评课记录' | '下一次课改进清单'
  version: '1.0'
}

export interface E03ConfirmedPackage {
  packageId: string
  participantId: string
  participantName: string
  groupId: string
  groupName: string
  confirmedAt: string
  confirmationFingerprint: string
  sourceId: string
  sourceName: string
  sourceVersion: string
  teachingGoal: string
  classroomActivities: string
  assessmentResults: string
  findingsFingerprint: string
  measuresFingerprint: string
  artifactVersion: '1.0'
  findingIds: [E03FindingId, E03FindingId, E03FindingId]
  measureIds: [E03MeasureId, E03MeasureId]
  findings: E03Finding[]
  measures: E03ImprovementMeasure[]
  peerReview: E03PeerReview
  revisions: E03MeasureRevision[]
  teacherConfirmation: E03TeacherConfirmation
  artifacts: [E03ArtifactRef, E03ArtifactRef]
}

export type E03ScoreDimensionId = 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'

export interface E03AssessmentDimensionSnapshot {
  id: E03ScoreDimensionId
  score: 0 | 1 | 2
  evidence: string
}

export interface E03AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  hardGatesPassed: boolean
  coreRequirementsPassed: boolean
  dimensions: E03AssessmentDimensionSnapshot[]
  contentFingerprint: string
  modificationSummary: string
}

export interface E03AttemptHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  aiDraft?: E03FindingDraft
  workingFindings: E03Finding[]
  measureDraft?: E03MeasureSet
  workingMeasures?: E03MeasureSet
  peerReview: E03PeerReview
  revisions: E03MeasureRevision[]
  confirmedPackage?: E03ConfirmedPackage
}

export interface E03Progress {
  version: 1
  route: E03Route
  source: E03ClassroomSource
  aiDraft?: E03FindingDraft
  workingFindings: E03Finding[]
  measureDraft?: E03MeasureSet
  workingMeasures?: E03MeasureSet
  peerReview: E03PeerReview
  revisions: E03MeasureRevision[]
  teacherConfirmation: E03TeacherConfirmation
  confirmedPackage?: E03ConfirmedPackage
  attemptHistory: E03AttemptHistory[]
  assessments: E03AssessmentRecord[]
  updatedAt: string
}
