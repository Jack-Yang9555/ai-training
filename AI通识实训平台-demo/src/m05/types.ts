import type { GroupRole } from '../types'

export type M05Route = 'overview' | 'input' | 'draft' | 'audit' | 'revision' | 'peer-review' | 'result'
export type M05QuestionType = 'single' | 'multiple' | 'judgment' | 'scenario' | 'comprehensive'
export type M05Difficulty = '基础' | '进阶' | '综合'
export type M05AuditValue = '' | '清楚' | '需调整' | '不清楚'
export type M05CorrectnessValue = '' | '明确' | '需调整' | '不明确'
export type M05ReviewValue = '' | '一致' | '需调整' | '不一致'
export type M05PeerDisposition = '' | '采纳并已核对' | '部分采纳并已核对' | '说明后不采纳'

export interface M05InputSnapshot {
  sourceM04AssessmentId: string
  sourceM04PlanId: string
  courseName: string
  lessonName: string
  audience: string
  studentFoundation: string
  objectives: Array<{ id: string; content: string }>
  materialName: string
  materialContent: string
  materialScope: string
  assessmentScenario: string
  difficultyRequirement: string
  outputFormat: string
  sourceConfirmed: boolean
  rightsConfirmed: boolean
  privacyConfirmed: boolean
}

export interface M05QuestionOption { id: string; text: string }
export interface M05ScoringPoint { id: string; criterion: string; points: number }

export interface M05Question {
  id: string
  type: M05QuestionType
  stem: string
  options: M05QuestionOption[]
  answer: string
  explanation: string
  materialEvidence: string
  objectiveIds: string[]
  difficulty: M05Difficulty
  scoringPoints: M05ScoringPoint[]
}

export interface M05QuestionPackage {
  packageId: string
  generatedAt: string
  input: M05InputSnapshot
  questions: M05Question[]
}

export interface M05QuestionAudit {
  stemClarity: M05AuditValue
  answerClarity: M05CorrectnessValue
  objectiveAligned: boolean
  difficultySuitable: boolean
  evidenceVerified: boolean
  distractorsReasonable: boolean
  rubricExecutable: boolean
  safeAndFair: boolean
}

export interface M05RevisionRecord {
  questionId: string
  originalContent: string
  revisedContent: string
  reason: string
}

export interface M05PeerReview {
  reviewerRole?: GroupRole
  targetParticipantId: string
  targetArtifactId: string
  targetQuestionId: string
  answerCorrectness: M05ReviewValue
  materialEvidence: M05ReviewValue
  objectiveAlignment: M05ReviewValue
  difficultySuitability: M05ReviewValue
  suggestion: string
  submitted: boolean
}

export interface M05Confirmation {
  peerDisposition: M05PeerDisposition
  peerResponse: string
  answerConfirmed: boolean
  rubricConfirmed: boolean
  safetyConfirmed: boolean
}

export interface M05ConfirmedPackage extends M05QuestionPackage {
  sourceDraftId: string
  confirmedAt: string
  confirmationFingerprint: string
  appliedRevisions: M05RevisionRecord[]
  peerDisposition: Exclude<M05PeerDisposition, ''>
  peerResponse: string
}

export interface M05AssessmentSnapshot {
  assessmentId: string
  submittedAt: string
  engine: '本地规则引擎（Demo）'
  fingerprint: string
  modificationSummary: string
  total: number
  dimensionScores: Record<M05ScoreDimension['id'], 0 | 1 | 2>
  coreRequirementPasses: Record<string, boolean>
  passed: boolean
}

export interface M05Progress {
  version: 1
  route: M05Route
  input: M05InputSnapshot
  draft?: M05QuestionPackage
  audits: Record<string, M05QuestionAudit>
  revisions: M05RevisionRecord[]
  peerReview: M05PeerReview
  confirmation: M05Confirmation
  confirmedPackage?: M05ConfirmedPackage
  assessmentModificationSummary: string
  assessments: M05AssessmentSnapshot[]
  updatedAt: string
}

export interface M05PeerArtifact {
  artifactId: string
  participantId: string
  participantName: string
  courseName: string
  questions: Array<{ id: string; label: string; stem: string; answer: string; evidence: string }>
}

export interface M05ScoreDimension { id: 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'; label: string; score: 0 | 1 | 2; evidence: string }
export interface M05CoreRequirement { id: string; label: string; passed: boolean; route: M05Route }
export interface M05ScoreResult { dimensions: M05ScoreDimension[]; total: number; coreRequirements: M05CoreRequirement[]; hardGatesPassed: boolean; passed: boolean }
