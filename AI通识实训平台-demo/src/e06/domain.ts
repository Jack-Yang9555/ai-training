import type { GroupRole } from '../types'

export type E06Route = 'overview' | 'question' | 'review' | 'comparison' | 'peer-review' | 'revision' | 'confirmation' | 'result'
export type E06DocumentId = 'D01' | 'D02' | 'D03'
export type E06ComparisonKind = '一致' | '不同' | '相互补充'

export interface E06Excerpt { excerptId: string; locator: string; text: string }
export interface E06Document {
  documentId: E06DocumentId; title: string; author: string; year: number; authorization: string
  reviewedFictional: true; excerpts: E06Excerpt[]
}
export interface E06SourceState {
  teachingQuestion: string; intendedUse: string; documents: [E06Document, E06Document, E06Document]
  exactlyThreeConfirmed: boolean; authorizationConfirmed: boolean; noOpenWebConfirmed: boolean; privacyConfirmed: boolean
}
export interface E06LiteratureRecord {
  documentId: E06DocumentId; title: string; author: string; year: number
  researchObject: string; method: string; finding: string; boundary: string
  objectReference: string; methodReference: string; findingReference: string; boundaryReference: string
  teacherReviewed: boolean
}
export interface E06Draft { draftId: string; participantId: string; inputFingerprint: string; generatedAt: string; engineLabel: string; records: E06LiteratureRecord[] }
export interface E06ComparisonReference { documentId: E06DocumentId; excerptId: string; point: string }
export interface E06Comparison { comparisonId: 'C01' | 'C02'; kind: E06ComparisonKind; references: [E06ComparisonReference, E06ComparisonReference]; comparison: string; boundary: string; intendedUse: string; teacherReviewed: boolean }
export interface E06PeerDocumentCheck { documentId: E06DocumentId; metadataAccurate: boolean; conclusionAccurate: boolean; note: string }
export interface E06PeerReview {
  recordId: string; reviewerId: string; reviewerGroupId: string; reviewerRole?: GroupRole
  artifactKind: 'e06-literature-package'; artifactId: string; reviewedFingerprint: string
  documentChecks: E06PeerDocumentCheck[]; suggestion: string; simulated: true; disclosure: string
  submitted: boolean; submittedAt?: string
}
export interface E06Revision {
  revisionId: string; participantId: string; sourceReviewId: string; documentId: E06DocumentId; field: 'finding' | 'boundary' | 'citation'
  beforeValue: string; afterValue: string; basis: string; sourceExcerptId: string; revisedAt: string
}
export interface E06TeacherConfirmation {
  metadataConfirmed: boolean; conclusionsConfirmed: boolean; comparisonConfirmed: boolean
  zeroFalseCitationConfirmed: boolean; complianceConfirmed: boolean; finalResponsibilityConfirmed: boolean
}
export interface E06ArtifactRef { artifactId: string; kind: 'e06-literature-review' | 'e06-comparison-table' | 'e06-citation-audit'; name: '文献梳理表' | '观点对比表' | '引用核验记录' }
export interface E06ConfirmedPackage {
  packageId: string; participantId: string; groupId: string; confirmedAt: string; confirmationFingerprint: string
  question: string; sourceFingerprint: string; literatureFingerprint: string; comparisonFingerprint: string
  artifacts: [E06ArtifactRef, E06ArtifactRef, E06ArtifactRef]
}
export type E06ScoreDimensionId = 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'
export interface E06AssessmentRecord { assessmentId: string; assessedAt: string; attempt: 'initial' | 'retest'; total: number; passed: boolean; hardGatesPassed: boolean; coreRequirementsPassed: boolean; contentFingerprint: string; modificationSummary: string }
export interface E06AttemptHistory { historyId: string; invalidatedAt: string; reason: string; draft?: E06Draft; workingRecords: E06LiteratureRecord[]; comparisons: E06Comparison[]; peerReview: E06PeerReview; revisions: E06Revision[]; confirmedPackage?: E06ConfirmedPackage }
export interface E06Progress {
  version: 1; route: E06Route; source: E06SourceState; draft?: E06Draft; workingRecords: E06LiteratureRecord[]; comparisons: E06Comparison[]
  peerReview: E06PeerReview; revisions: E06Revision[]; teacherConfirmation: E06TeacherConfirmation
  confirmedPackage?: E06ConfirmedPackage; attemptHistory: E06AttemptHistory[]; assessments: E06AssessmentRecord[]; updatedAt: string
}
