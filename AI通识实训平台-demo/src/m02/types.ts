import type { GroupRole } from '../types'

export type M02ModelId = 'A' | 'B'
export type M02Route = 'overview' | 'run' | 'compliance' | 'rating' | 'peer-review' | 'result'
export type M02RunStatus = 'idle' | 'running' | 'succeeded' | 'failed'
export type M02ComplianceDimension = 'questionCount' | 'difficulty' | 'format' | 'materialScope'
export type M02RatingDimension = 'accuracy' | 'instructionFollowing' | 'teachingFit' | 'clarity' | 'safety'
export type M02CorrectionType = '答案错误' | '解析不清' | '题目超纲' | '表述不当' | '其他'

export interface M02OutputParagraph {
  id: string
  label: string
  content: string
  kind: 'introduction' | 'question' | 'answer' | 'analysis'
}

export interface M02ModelResult {
  blindId: M02ModelId
  status: Exclude<M02RunStatus, 'idle'>
  paragraphs: M02OutputParagraph[]
  error?: string
}

export interface M02RunBatch {
  runId: string
  status: M02RunStatus
  startedAt: string
  completedAt?: string
  results: Partial<Record<M02ModelId, M02ModelResult>>
  error?: string
}

export type M02ComplianceValue =
  | '符合' | '多出' | '缺少'
  | '偏难' | '偏易'
  | '完整' | '部分缺失'
  | '超出范围'

export interface M02RatingEvidence {
  score?: number
  paragraphId: string
  reason: string
}

export interface M02SelectionDecision {
  evidenceDimensions: M02RatingDimension[]
  comparedModelId?: M02ModelId
  conclusion: string
}

export interface M02CorrectionRecord {
  paragraphId: string
  type?: M02CorrectionType
  revisedContent: string
  reason: string
}

export interface M02PeerReview {
  reviewerRole?: GroupRole
  targetParticipantId: string
  targetArtifactId: string
  scoringConsistent: '' | '一致' | '部分一致' | '不一致'
  reasonEvidenceSufficient: '' | '充分' | '部分充分' | '不充分'
  modelChoiceReasonable: '' | '合理' | '部分合理' | '不合理'
  scoreDifference?: M02RatingDimension | 'none'
  scoreDifferenceReason: string
  suggestion: string
  submitted: boolean
}

export interface M02GroupConclusion {
  selectedModelId?: M02ModelId
  selectionReason: string
  largestDifferenceDimension?: M02RatingDimension
  differenceExplanation: string
  correctionConsensus: string
}

export interface M02Progress {
  version: 3
  route: M02Route
  run?: M02RunBatch
  compliance: Partial<Record<M02ModelId, Partial<Record<M02ComplianceDimension, M02ComplianceValue>>>>
  ratings: Partial<Record<M02ModelId, Partial<Record<M02RatingDimension, M02RatingEvidence>>>>
  blindReviewSubmitted: boolean
  revealedModelNames: Partial<Record<M02ModelId, string>>
  selectedModelId?: M02ModelId
  selectionDecision: M02SelectionDecision
  correction: M02CorrectionRecord
  peerReview: M02PeerReview
  groupConclusion: M02GroupConclusion
  updatedAt: string
}

export interface M02PeerArtifact {
  artifactId: string
  participantId: string
  participantName: string
  selectedModelId: M02ModelId
  scores: Record<M02RatingDimension, number>
  summary: string
}

export interface M02ScoreDimension {
  id: 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'
  label: string
  score: 0 | 1 | 2
  evidence: string
}

export interface M02CoreRequirement {
  id: string
  label: string
  passed: boolean
  route: M02Route
}

export interface M02ScoreResult {
  dimensions: M02ScoreDimension[]
  total: number
  coreRequirements: M02CoreRequirement[]
  passed: boolean
}
