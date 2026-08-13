import type { GroupRole } from '../types'

export type G01Route = 'overview' | 'directory' | 'errors' | 'cross-checks' | 'checklist' | 'assessment'
export type G01StageStatus = '待验收' | '未通过' | '已通过' | '需补验'
export type G01PrerequisiteTaskId = 'M01' | 'M02' | 'M03' | 'M04' | 'M05'
// G01 独立入口的缺项材料；仅在本任务内有效，不反写 M01—M05，也不冒充真实提交。
export type G01EvidenceSource = '真实本地成果' | '模拟组员摘要' | '任务内演示成果'
export type G01ChecklistCategory = '事实' | '引用' | '安全' | '目标' | '答案'
export type G01CrossCheckArtifactType = '教案' | '题目包'

export interface G01PrerequisiteEvidence {
  taskId: G01PrerequisiteTaskId
  label: string
  complete: boolean
  artifactIds: string[]
  source: G01EvidenceSource
}

export interface G01MemberPrerequisite {
  participantId: string
  participantName: string
  groupId: string
  groupName: string
  isCurrentParticipant: boolean
  source: G01EvidenceSource
  evidence: G01PrerequisiteEvidence[]
}

export interface G01ErrorCorrection {
  participantId: string
  participantName: string
  source: G01EvidenceSource
  sourceTaskId: G01PrerequisiteTaskId
  sourceArtifactId: string
  aiError: string
  teacherCorrection: string
  correctionBasis: string
}

export interface G01CrossCheck {
  reviewerParticipantId: string
  reviewerName: string
  targetParticipantId: string
  targetParticipantName: string
  source: G01EvidenceSource
  artifactType: G01CrossCheckArtifactType
  targetArtifactId: string
  finding: string
  conclusion: '' | '通过' | '需修改'
}

export interface G01ChecklistItem {
  id: string
  category: G01ChecklistCategory
  checkItem: string
  evidence: string
  handling: string
}

export interface G01Contribution {
  participantId: string
  participantName: string
  source: G01EvidenceSource
  role?: GroupRole
  contribution: string
}

export interface G01ArtifactSnapshot {
  artifactId: string
  name: '教学设计与命题成果目录' | 'AI 教学内容核验清单' | '个人贡献记录'
  capturedAt: string
  fingerprint: string
  summary: string
}

export type G01ConditionId = 'prerequisite-completeness' | 'error-corrections' | 'checklist-coverage' | 'cross-checks' | 'artifact-completeness'

export interface G01AcceptanceCondition {
  id: G01ConditionId
  source: '三日方案验收条件' | '三日方案小组操作与成果契约'
  label: string
  passed: boolean
  evidence: string
}

export interface G01AssessmentRecord {
  assessmentId: string
  phase: '初验' | '补验'
  outcome: '未通过' | '已通过'
  submittedAt: string
  assessor: string
  method: '本地规则引擎（Demo）'
  fingerprint: string
  failedConditionIds: G01ConditionId[]
  conditions: G01AcceptanceCondition[]
  modificationSummary: string
  artifacts: G01ArtifactSnapshot[]
}

export interface G01Progress {
  version: 2
  groupId: string
  groupName: string
  rosterFingerprint: string
  route: G01Route
  memberPrerequisites: G01MemberPrerequisite[]
  errorCorrections: G01ErrorCorrection[]
  crossChecks: G01CrossCheck[]
  checklist: G01ChecklistItem[]
  contributions: G01Contribution[]
  artifacts: G01ArtifactSnapshot[]
  assessmentModificationSummary: string
  assessments: G01AssessmentRecord[]
  currentStatus: G01StageStatus
  updatedAt: string
}

export interface G01Store {
  version: 2
  groups: Record<string, G01Progress>
}

export interface G01CurrentMemberEvidence {
  participantId: string
  prerequisites: Record<G01PrerequisiteTaskId, { complete: boolean; artifactIds: string[] }>
  errorCorrection?: Omit<G01ErrorCorrection, 'participantId' | 'participantName' | 'source'>
  crossCheck?: Omit<G01CrossCheck, 'reviewerParticipantId' | 'reviewerName' | 'source'>
  contribution?: Omit<G01Contribution, 'participantId' | 'participantName' | 'source'>
}

export interface G01GroupContext {
  groupId: string
  groupName: string
  rosterFingerprint: string
  memberPrerequisites: G01MemberPrerequisite[]
  seedErrorCorrections: G01ErrorCorrection[]
  seedCrossChecks: G01CrossCheck[]
  seedContributions: G01Contribution[]
}
