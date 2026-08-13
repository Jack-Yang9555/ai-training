import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

export type M04Route = 'overview' | 'input' | 'draft' | 'audit' | 'peer-review' | 'confirmation' | 'result'
export type M04CorrectionType = 'difficulty' | 'activity' | 'professional'
export type M04SectionKind = 'learner-analysis' | 'objective' | 'activity' | 'assessment' | 'support' | 'professional'
export type M04ImplementationValue = '' | '可实施' | '需调整' | '不可实施'
export type M04AlignmentValue = '' | '一致' | '部分一致' | '不一致'
export type M04PeerDisposition = '' | '采纳并已核对' | '部分采纳并已核对' | '说明后不采纳'

export interface M04InputSnapshot {
  sourceM03AssessmentId: string
  sourceM03RunId: string
  sourcePromptSummary: string
  courseName: string
  lessonName: string
  audience: string
  studentFoundation: string
  teachingObjective: string
  duration: number
  realWorkTask: string
  equipmentConstraints: string
  resourceConstraints: string
  materialName: string
  materialContent: string
  materialScope: string
  sourceConfirmed: boolean
  rightsConfirmed: boolean
  privacyConfirmed: boolean
}

export interface M04PlanObjective {
  id: string
  content: string
  observableEvidence: string
}

export interface M04PlanActivity {
  id: string
  title: string
  minutes: number
  teacherAction: string
  studentTask: string
  checkMethod: string
  objectiveIds: string[]
}

export interface M04PlanAssessment {
  id: string
  method: string
  evidence: string
  objectiveIds: string[]
  activityIds: string[]
}

export interface M04PlanSupport {
  id: string
  learnerLevel: string
  strategy: string
  objectiveIds: string[]
  activityIds: string[]
}

export interface M04PlanSection {
  id: string
  title: string
  kind: M04SectionKind
  content: string
}

export interface M04LessonPlan {
  planId: string
  generatedAt: string
  input: M04InputSnapshot
  learnerAnalysis: string
  objectives: M04PlanObjective[]
  activities: M04PlanActivity[]
  assessments: M04PlanAssessment[]
  supports: M04PlanSupport[]
  professionalNote: string
  sections: M04PlanSection[]
}

export interface M04CorrectionRecord {
  type: M04CorrectionType
  sectionId: string
  originalContent: string
  revisedContent: string
  basis: string
}

export interface M04Audit {
  objectiveChecks: Record<string, boolean>
  activityChecks: Record<string, M04ImplementationValue>
  durationChecked: boolean
  equipmentChecked: boolean
  resourcesChecked: boolean
  materialVerified: boolean
  safetyVerified: boolean
  corrections: Record<M04CorrectionType, M04CorrectionRecord>
}

export interface M04PeerReview {
  reviewerRole?: GroupRole
  targetParticipantId: string
  targetArtifactId: string
  overallImplementability: M04ImplementationValue
  objectiveActivityAssessment: M04AlignmentValue
  objectiveObservable: M04AlignmentValue
  activityFeasible: M04AlignmentValue
  differentiatedSupport: M04AlignmentValue
  suggestion: string
  submitted: boolean
}

export interface M04Confirmation {
  peerDisposition: M04PeerDisposition
  peerResponse: string
  professionalConfirmed: boolean
  implementationConfirmed: boolean
  safetyConfirmed: boolean
}

export interface M04ConfirmedPlan extends M04LessonPlan {
  confirmedAt: string
  sourceDraftId: string
  confirmationFingerprint: string
  appliedCorrections: M04CorrectionRecord[]
  peerDisposition: Exclude<M04PeerDisposition, ''>
  peerResponse: string
}

export interface M04AssessmentSnapshot {
  assessmentId: string
  submittedAt: string
  engine: '本地规则引擎（Demo）'
  fingerprint: string
  modificationSummary: string
  total: number
  dimensionScores: Record<M04ScoreDimension['id'], 0 | 1 | 2>
  coreRequirementPasses: Record<string, boolean>
  passed: boolean
}

export interface M04Progress {
  version: 1
  route: M04Route
  input: M04InputSnapshot
  draft?: M04LessonPlan
  audit: M04Audit
  peerReview: M04PeerReview
  confirmation: M04Confirmation
  confirmedPlan?: M04ConfirmedPlan
  assessmentModificationSummary: string
  assessments: M04AssessmentSnapshot[]
  updatedAt: string
}

export interface M04PeerArtifact {
  artifactId: string
  participantId: string
  participantName: string
  courseName: string
  lessonName: string
  duration: number
  objectiveSummary: string
  activitySummary: string
  assessmentSummary: string
  supportSummary: string
}

export interface M04ScoreDimension {
  id: 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'
  label: string
  score: 0 | 1 | 2
  evidence: string
}

export interface M04CoreRequirement {
  id: string
  label: string
  passed: boolean
  route: M04Route
}

export interface M04ScoreResult {
  dimensions: M04ScoreDimension[]
  total: number
  coreRequirements: M04CoreRequirement[]
  hardGatesPassed: boolean
  passed: boolean
}

export interface M04ValidationContext {
  directory: ParticipantDirectory
  m03Passed: boolean
}
