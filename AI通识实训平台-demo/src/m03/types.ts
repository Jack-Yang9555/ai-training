import type { GroupRole } from '../types'

export type M03Route = 'overview' | 'design' | 'v1' | 'iteration' | 'compare' | 'peer-review' | 'result'
export type M03Version = 'v1' | 'v2'
export type M03Difficulty = '入门' | '进阶' | '挑战'
export type M03OutputFormat = '分节文本' | 'Markdown 表格' | 'JSON 结构'
export type M03IterationVariable = 'studentFoundation' | 'questionCount' | 'difficulty' | 'duration' | 'outputFormat'
export type M03ClarityValue = '' | '明确' | '部分明确' | '不明确'
export type M03EvidenceValue = '' | '一致' | '需调整'

export interface M03PromptSnapshot {
  role: string
  courseName: string
  lessonName: string
  teachingPhase: string
  audience: string
  studentFoundation: string
  objective: string
  task: string
  materialName: string
  materialContent: string
  materialScope: string
  duration: number
  questionCount: number
  difficulty: M03Difficulty
  outputFormat: M03OutputFormat
  requiredSections: string
  qualityStandards: string
  rightsConfirmed: boolean
  privacyConfirmed: boolean
}

export interface M03OutputParagraph {
  id: string
  label: string
  content: string
  kind: 'introduction' | 'activity' | 'question' | 'answer' | 'verification'
}

export interface M03RunResult {
  runId: string
  version: M03Version
  generatedAt: string
  snapshot: M03PromptSnapshot
  compiledPrompt: string
  paragraphs: M03OutputParagraph[]
}

export interface M03Comparison {
  changeExplanation: string
  suitabilityConclusion: string
}

export interface M03VerificationRecord {
  paragraphId: string
  materialEvidence: string
  materialScope: M03EvidenceValue
  objectiveAlignment: M03EvidenceValue
  conclusion: string
}

export interface M03PeerReview {
  reviewerRole?: GroupRole
  targetParticipantId: string
  targetArtifactId: string
  inputScopeClear: M03ClarityValue
  outputFormatClear: M03ClarityValue
  qualityStandardClear: M03ClarityValue
  suggestion: string
  submitted: boolean
}

export interface M03AssessmentSnapshot {
  assessmentId: string
  submittedAt: string
  engine: '本地规则引擎（Demo）'
  fingerprint: string
  modificationSummary: string
  total: number
  dimensionScores: Record<M03ScoreDimension['id'], 0 | 1 | 2>
  coreRequirementPasses: Record<string, boolean>
  passed: boolean
}

export interface M03Progress {
  version: 2
  route: M03Route
  designMessage: string
  design: M03PromptSnapshot
  v1?: M03RunResult
  iterationVariable?: M03IterationVariable
  iterationDraft?: M03PromptSnapshot
  v2?: M03RunResult
  comparison: M03Comparison
  verification: Record<M03Version, M03VerificationRecord>
  peerReview: M03PeerReview
  assessmentModificationSummary: string
  assessments: M03AssessmentSnapshot[]
  updatedAt: string
}

export interface M03PeerArtifact {
  artifactId: string
  participantId: string
  participantName: string
  variable: M03IterationVariable
  variableLabel: string
  beforeValue: string
  afterValue: string
  summary: string
}

export interface M03ScoreDimension {
  id: 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'
  label: string
  score: 0 | 1 | 2
  evidence: string
}

export interface M03CoreRequirement {
  id: string
  label: string
  passed: boolean
  route: M03Route
}

export interface M03ScoreResult {
  dimensions: M03ScoreDimension[]
  total: number
  coreRequirements: M03CoreRequirement[]
  hardGatesPassed: boolean
  passed: boolean
}
