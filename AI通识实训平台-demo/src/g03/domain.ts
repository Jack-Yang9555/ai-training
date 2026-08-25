import type { GroupRole } from '../types'

export type G03Route = 'overview' | 'matrix' | 'issues' | 'scenarios' | 'showcase' | 'contributions' | 'assessment'
export type G03StageStatus = '待验收' | '未通过' | '已通过' | '需补验'
export type G03SourceTask = 'M09' | 'M10' | 'M11'
export type G03EvidenceSource = '真实本地证据' | '确定性模拟组员证据' | '缺少当前真实证据'
export type G03ScenarioKind = '有来源回答' | '缺失条件追问' | '超范围说明与转交'
export type G03Participation = '测试他人' | '接受测试' | '操作' | '讲解' | '在线答问' | '报告修改'

export interface G03TaskEvidenceInput {
  taskId: G03SourceTask
  artifactId: string
  version: string
  assessmentId: string
  current: boolean
  issueId?: string
  issue?: string
  correction?: string
  correctionEvidenceId?: string
  retestResult?: '已通过' | '仍需修改'
  retestEvidenceId?: string
}

export interface G03M11CoverageInput {
  testedParticipantId: string
  testedRecordId: string
  acceptedTestFromParticipantId: string
  acceptedRecordId: string
  submitted: boolean
}

export interface G03ScenarioEvidenceInput {
  scenarioId: string
  kind: G03ScenarioKind
  sourceTaskId: 'M10' | 'M11'
  question: string
  answer: string
  evidenceId: string
  sourceId?: string
  sourceLocation?: string
  sourceExcerpt?: string
  missingCondition?: string
  boundaryStatement?: string
  handoffTarget?: string
  noFalseCitation: boolean
}

export interface G03CurrentEvidenceInput {
  participantId: string
  tasks: Partial<Record<G03SourceTask, G03TaskEvidenceInput>>
  m11Coverage?: G03M11CoverageInput
  scenarios?: G03ScenarioEvidenceInput[]
}

export interface G03MemberTaskEvidence extends G03TaskEvidenceInput {
  participantId: string
  participantName: string
  source: G03EvidenceSource
}

export interface G03MemberEvidence {
  participantId: string
  participantName: string
  isCurrentParticipant: boolean
  taskEvidence: G03MemberTaskEvidence[]
}

export interface G03TestCoverage {
  participantId: string
  participantName: string
  testedParticipantId: string
  testedParticipantName: string
  testedRecordId: string
  acceptedTestFromParticipantId: string
  acceptedTestFromParticipantName: string
  acceptedRecordId: string
  submitted: boolean
  source: G03EvidenceSource
}

export interface G03IssueRecord {
  issueId: string
  sourceTask: G03SourceTask
  sourceEvidenceId: string
  problem: string
  correction: string
  correctionEvidenceId: string
  responsibleParticipantId: string
  retestResult: '已通过' | '仍需修改'
  retestEvidenceId: string
  source: G03EvidenceSource
}

export interface G03ScenarioCard extends G03ScenarioEvidenceInput {
  source: G03EvidenceSource
  confirmed: boolean
}

export interface G03BatchAssignment {
  groupId: string
  groupName: string
  batch: 'A' | 'B'
}

export interface G03RoundRecord {
  round: 1 | 2
  displayBatch: 'A' | 'B'
  experienceBatch: 'A' | 'B'
  currentGroupRole: '展示' | '体验'
  completed: boolean
  coreDemoSeconds: number
  qaSeconds: number
  qaCompleted: boolean
  experienceFeedback: string
  feedbackSource: '确定性模拟跨组反馈'
}

export interface G03ShowcasePlan {
  preparationMinutes: 5
  roundMinutes: 10
  summaryMinutes: 5
  currentBatch: 'A' | 'B'
  batchAssignments: G03BatchAssignment[]
  oddGroupNotice: string
  planConfirmed: boolean
  rounds: [G03RoundRecord, G03RoundRecord]
}

export interface G03Contribution {
  participantId: string
  participantName: string
  role: GroupRole
  participation: G03Participation[]
  contribution: string
  evidenceId: string
  source: '当前教师操作预填' | '确定性模拟组员预填'
  confirmed: boolean
}

export type G03ConditionId = 'bilateral-coverage' | 'three-scenarios' | 'two-round-showcase' | 'traceable-report'

export interface G03AcceptanceCondition {
  id: G03ConditionId
  label: string
  passed: boolean
  evidence: string
}

export type G03OutputName =
  | '课程知识库与 AI 助教综合测试报告'
  | '3 分钟核心演示和 2 分钟在线答问记录'
  | '成员角色与贡献清单'

export interface G03ArtifactSnapshot {
  artifactId: string
  name: G03OutputName
  capturedAt: string
  fingerprint: string
  summary: string
}

export interface G03AssessmentRecord {
  assessmentId: string
  phase: '初验' | '补验'
  outcome: '未通过' | '已通过'
  submittedAt: string
  assessor: string
  method: '本地规则引擎（Demo）'
  fingerprint: string
  failedConditionIds: G03ConditionId[]
  conditions: G03AcceptanceCondition[]
  modificationSummary: string
  artifacts: G03ArtifactSnapshot[]
}

export interface G03Progress {
  version: 1
  groupId: string
  groupName: string
  currentParticipantId: string
  rosterFingerprint: string
  evidenceFingerprint: string
  scheduleFingerprint: string
  route: G03Route
  memberEvidence: G03MemberEvidence[]
  testMatrix: G03TestCoverage[]
  matrixConfirmed: boolean
  issues: G03IssueRecord[]
  reportConfirmed: boolean
  scenarios: G03ScenarioCard[]
  showcase: G03ShowcasePlan
  contributions: G03Contribution[]
  assessmentModificationSummary: string
  assessments: G03AssessmentRecord[]
  artifacts: G03ArtifactSnapshot[]
  currentStatus: G03StageStatus
  updatedAt: string
}

export interface G03GroupContext {
  groupId: string
  groupName: string
  currentParticipantId: string
  rosterFingerprint: string
  evidenceFingerprint: string
  scheduleFingerprint: string
  memberEvidence: G03MemberEvidence[]
  testMatrix: G03TestCoverage[]
  issues: G03IssueRecord[]
  scenarios: G03ScenarioCard[]
  showcase: G03ShowcasePlan
  contributions: G03Contribution[]
}

export interface G03Store {
  version: 1
  groups: Record<string, G03Progress>
}
