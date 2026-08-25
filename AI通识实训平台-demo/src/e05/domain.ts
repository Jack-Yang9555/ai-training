import type { GroupRole } from '../types'

export type E05Route =
  | 'overview'
  | 'source'
  | 'mapping'
  | 'suggestions'
  | 'peer-review'
  | 'revision'
  | 'confirmation'
  | 'result'

export type E05CoverageStatus = '已覆盖' | '覆盖不足' | '暂未覆盖'

export interface E05SourceExcerpt {
  excerptId: string
  heading: string
  content: string
}

export interface E05JobMaterial {
  sourceId: string
  documentName: string
  version: string
  sourceOrganization: string
  authorization: string
  scopeNote: string
  auditStatus: '已审核' | '待审核' | '未审核'
  anonymized: boolean
  reviewedFictional: boolean
  excerpts: E05SourceExcerpt[]
}

export interface E05CourseObjective {
  objectiveId: string
  title: string
  description: string
  evidenceId: string
}

export interface E05CourseProfile {
  courseId: string
  courseName: string
  documentName: string
  version: string
  ownerStatement: string
  authorization: string
  objectives: E05CourseObjective[]
}

export interface E05SourceBundle {
  jobMaterial: E05JobMaterial
  course: E05CourseProfile
  jobMaterialAuthorizationConfirmed: boolean
  privacyConfirmed: boolean
  courseOwnershipConfirmed: boolean
  teacherVerifiedConfirmed: boolean
}

export interface E05JobTask {
  taskId: string
  name: string
  description: string
  jobEvidenceExcerptId: string
  teacherReviewed: boolean
}

export interface E05JobTaskDraft {
  draftId: string
  participantId: string
  inputFingerprint: string
  generatedAt: string
  tasks: E05JobTask[]
}

export interface E05Mapping {
  mappingId: string
  courseObjectiveId: string
  jobTaskId: string
  status: E05CoverageStatus
  courseEvidenceId: string
  courseEvidenceSummary: string
  jobEvidenceExcerptId: string
  jobEvidenceSummary: string
  judgementBasis: string
  teacherReviewed: boolean
}

export interface E05MappingDraft {
  draftId: string
  participantId: string
  jobTaskFingerprint: string
  generatedAt: string
  mappings: E05Mapping[]
}

export interface E05Suggestion {
  suggestionId: string
  linkedMappingId: string
  gap: string
  courseAdjustment: string
  expectedEvidence: string
  courseEvidenceId: string
  jobEvidenceExcerptId: string
  teacherReviewed: boolean
}

export interface E05SuggestionDraft {
  draftId: string
  participantId: string
  mappingFingerprint: string
  generatedAt: string
  suggestions: [E05Suggestion, E05Suggestion, E05Suggestion]
}

export interface E05OfflineChecks {
  singleFile: boolean
  noExternalDependencies: boolean
  coverageFilterAvailable: boolean
  clickableRelationshipDetails: boolean
  taskThresholdMet: boolean
  mappingThresholdMet: boolean
  exactSuggestionCount: boolean
  currentContentFingerprint: boolean
}

export interface E05OfflineTestRecord {
  testId: string
  webPageId: string
  testedAt: string
  passed: boolean
  checks: E05OfflineChecks
  disclosure: string
}

export interface E05WebPageArtifact {
  webPageId: string
  participantId: string
  version: number
  filename: string
  generatedAt: string
  contentFingerprint: string
  html: string
  exportDisclosure: string
  offlineTest?: E05OfflineTestRecord
}

export type E05MappingReview = '' | '准确' | '需调整' | '不准确'
export type E05SuggestionReview = '' | '可执行' | '需调整' | '不可执行'

export interface E05PeerReview {
  recordId: string
  reviewerId: string
  reviewerGroupId: string
  reviewerRole?: GroupRole
  reviewedMappingFingerprint: string
  reviewedSuggestionFingerprint: string
  reviewedWebPageId: string
  mappingJudgement: E05MappingReview
  suggestionJudgement: E05SuggestionReview
  targetRecordIds: string[]
  suggestion: string
  authorTreatment: '' | '已采纳并修正' | '部分采纳' | '不采纳'
  authorBasis: string
  simulated: boolean
  disclosure: string
  submitted: boolean
  submittedAt?: string
}

export type E05RevisionTargetKind = 'mapping' | 'suggestion'
export type E05RevisionField = 'status' | 'courseAdjustment' | 'expectedEvidence' | 'judgementBasis'

export interface E05RevisionRecord {
  revisionId: string
  participantId: string
  sourceReviewId: string
  reviewedMappingFingerprint: string
  reviewedSuggestionFingerprint: string
  targetKind: E05RevisionTargetKind
  targetId: string
  field: E05RevisionField
  beforeValue: string
  afterValue: string
  basis: string
  courseEvidenceId: string
  jobEvidenceExcerptId: string
  revisedAt: string
}

export interface E05TeacherConfirmation {
  sourceAndEvidenceConfirmed: boolean
  mappingAndSuggestionsConfirmed: boolean
  offlineArtifactConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface E05ArtifactRef {
  artifactId: string
  kind: 'e05-mapping-webpage' | 'e05-gap-suggestion-list'
  name: '课程—岗位能力映射网页' | '差距与改进建议清单'
  filename?: string
}

export interface E05ConfirmedPackage {
  packageId: string
  packageVersion: 1
  participantId: string
  confirmedAt: string
  confirmationFingerprint: string
  sourceFingerprint: string
  jobSourceId: string
  jobSourceVersion: string
  courseId: string
  courseVersion: string
  webPageId: string
  webPageVersion: number
  webPageContentFingerprint: string
  offlineTestId: string
  jobTaskCount: number
  mappingCount: number
  suggestionCount: 3
  coverageStatuses: E05CoverageStatus[]
  reviewRecordId: string
  revisionCount: number
  artifacts: [E05ArtifactRef, E05ArtifactRef]
}

export type E05ScoreDimensionId = 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'

export interface E05AssessmentDimensionSnapshot {
  id: E05ScoreDimensionId
  label: string
  score: 0 | 1 | 2
  evidence: string
}

export interface E05AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  packageId?: string
  total: number
  passed: boolean
  hardGatesPassed: boolean
  coreRequirementsPassed: boolean
  dimensions: E05AssessmentDimensionSnapshot[]
  contentFingerprint: string
  modificationSummary: string
}

export interface E05AttemptHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  route: E05Route
  source: E05SourceBundle
  jobTaskDraft?: E05JobTaskDraft
  mappingDraft?: E05MappingDraft
  aiSuggestionDraft?: E05SuggestionDraft
  workingMappings?: E05Mapping[]
  workingSuggestions?: E05Suggestion[]
  webPage?: E05WebPageArtifact
  peerReview: E05PeerReview
  revisions: E05RevisionRecord[]
  teacherConfirmation: E05TeacherConfirmation
  confirmedPackage?: E05ConfirmedPackage
}

export interface E05Progress {
  version: 1
  route: E05Route
  source: E05SourceBundle
  jobTaskDraft?: E05JobTaskDraft
  mappingDraft?: E05MappingDraft
  aiSuggestionDraft?: E05SuggestionDraft
  workingMappings?: E05Mapping[]
  workingSuggestions?: E05Suggestion[]
  webPage?: E05WebPageArtifact
  peerReview: E05PeerReview
  revisions: E05RevisionRecord[]
  teacherConfirmation: E05TeacherConfirmation
  confirmedPackage?: E05ConfirmedPackage
  attemptHistory: E05AttemptHistory[]
  assessments: E05AssessmentRecord[]
  updatedAt: string
}
