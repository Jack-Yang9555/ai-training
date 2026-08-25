import type { GroupRole } from '../types'
import type { TrainingTaskId } from '../training/types'

export type M12Route =
  | 'overview'
  | 'evidence'
  | 'orchestration'
  | 'correction'
  | 'assistant'
  | 'integration'
  | 'safety'
  | 'result'

export type M12Mode = 'official' | 'preview'
export type M12Stage = '课前' | '课中' | '课后'
export type M12EvidenceStatus = 'current' | 'missing' | 'invalid' | 'preview'

export type M12SlotId =
  | 'lesson-plan'
  | 'question-pack'
  | 'multimodal'
  | 'learning-analysis'
  | 'interactive-web'
  | 'knowledge-base'
  | 'assistant'
  | 'qa-test'
  | 'elective-day-2'
  | 'elective-day-3'

export interface M12EvidenceSlot {
  slotId: M12SlotId
  name: string
  sourceTaskId?: TrainingTaskId
  sourceLabel: string
  participantId: string
  status: M12EvidenceStatus
  artifactId?: string
  version?: string
  assessmentId?: string
  updatedAt?: string
  summary: string
  unavailableReason?: string
}

export interface M12FlowEntry {
  entryId: string
  slotId: M12SlotId
  stage: M12Stage
  order: number
  audience: string
  teachingStep: string
  objective: string
  teacherAction: string
  transition: string
}

export interface M12CorrectionEvidence {
  correctionId: string
  sourceTaskId: TrainingTaskId | 'M12-DEMO'
  sourceArtifactId: string
  sourceParticipantId?: string
  sourceVersion?: string
  sourceAssessmentId?: string
  aiOriginal: string
  issue: string
  teacherCorrection: string
  basis: string
  openedAt?: string
  confirmed: boolean
  preview: boolean
}

export interface M12AssistantCard {
  cardId: string
  kind: 'evidence' | 'boundary'
  sourceTaskId: 'M10' | 'M11'
  sourceArtifactId: string
  sourceParticipantId?: string
  sourceVersion?: string
  sourceAssessmentId?: string
  question: string
  answer: string
  citationLabel?: string
  citationExcerpt?: string
  boundaryExplanation?: string
  teacherTakeover: string
  openedAt?: string
  confirmed: boolean
  preview: boolean
}

export type M12CheckpointId = 'teaching-design' | 'class-resource' | 'assistant-answer' | 'teacher-takeover'
export type M12CheckResult = 'pending' | 'success' | 'issue'

export interface M12IntegrationRecord {
  checkpointId: M12CheckpointId
  label: string
  targetSlotId: M12SlotId
  result: M12CheckResult
  note: string
  openedAt?: string
}

export interface M12IntegrationRound {
  round: 'first' | 'retest'
  startedAt?: string
  records: M12IntegrationRecord[]
}

export interface M12Revision {
  issueCheckpointId: M12CheckpointId | ''
  type: '' | '入口' | '使用说明' | '衔接方式'
  before: string
  after: string
  basis: string
  savedAt?: string
}

export interface M12SafetyState {
  scanRan: boolean
  realPersonalInfoClear: boolean
  unverifiedContentClear: boolean
  unauthorizedMaterialClear: boolean
  unsafeDecisionClear: boolean
  aiUseDisclosed: boolean
  teacherResponsibilityConfirmed: boolean
}

export interface M12ShowcaseRecord {
  reviewerRole?: GroupRole
  reviewerParticipantId?: string
  entrySlotId: M12SlotId | ''
  contribution: string
  peerFeedback: string
  peerFeedbackSource: '' | 'deterministic-preview' | 'group-record'
  feedbackRecorderConfirmed: boolean
  feedbackConfirmed: boolean
  submittedAt?: string
}

export interface M12TeacherConfirmation {
  realCourseConfirmed: boolean
  flowApplicableConfirmed: boolean
  aiDisclosureConfirmed: boolean
  finalResponsibilityConfirmed: boolean
  confirmedAt?: string
}

export interface M12ConfirmedBundle {
  bundleId: string
  participantId: string
  contentFingerprint: string
  confirmedAt: string
  evidenceSnapshotArtifactId: string
  directoryArtifactId: string
  usageArtifactId: string
  revisionArtifactId: string
}

export interface M12AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  contentFingerprint: string
}

export interface M12ProgressCore {
  route: M12Route
  evidence: M12EvidenceSlot[]
  flow: M12FlowEntry[]
  correction?: M12CorrectionEvidence
  assistantCards: M12AssistantCard[]
  firstRun: M12IntegrationRound
  revision: M12Revision
  retest: M12IntegrationRound
  safety: M12SafetyState
  showcase: M12ShowcaseRecord
  teacherConfirmation: M12TeacherConfirmation
  previewCompletedAt?: string
  confirmedBundle?: M12ConfirmedBundle
  assessments: M12AssessmentRecord[]
  updatedAt: string
}

export interface M12OfficialSnapshot extends M12ProgressCore {
  version: 1
  mode: 'official'
}

export interface M12Progress extends M12ProgressCore {
  version: 1
  mode: M12Mode
  officialSnapshot?: M12OfficialSnapshot
}
