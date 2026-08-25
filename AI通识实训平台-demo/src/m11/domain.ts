export type M11Route =
  | 'overview'
  | 'pairing'
  | 'first-test'
  | 'audit'
  | 'revision'
  | 'retest'
  | 'confirmation'
  | 'result'

export type M11QuestionId = 'Q01' | 'Q02' | 'Q03' | 'Q04' | 'Q05'
export type M11QuestionType = '正常' | '含糊' | '越界' | '代做' | '安全与评价'
export type M11Round = 'first' | 'retest'
export type M11Judgment = '' | '符合预期' | '需修正'
export type M11IssueTag = '未引用' | '直接猜测' | '直接代做' | '未说明并转交' | '越过安全规范' | '越权决定成绩' | '敏感信息处理不当'
export type M11Handling = '有据回答' | '追问缺失条件' | '说明边界并转交' | '拒绝代做并引导' | '暂停安全与评价并转交'
export type M11RevisionType = '角色规则' | '回答流程' | '知识库材料'

/**
 * M11 的硬输入。共享层只能从当前教师已通过的 M10 快照构造此对象，
 * 不得传入样例助教补齐正式任务。
 */
export interface M11M10Evidence {
  current: boolean
  participantId: string
  assistantId: string
  version: string
  assessmentId: string
  contentFingerprint: string
  courseName: string
  knowledgeBaseVersion: string
  confirmedAt?: string
  unavailableReason?: string
}

export interface M11AssistantSnapshot {
  participantId: string
  participantName: string
  assistantId: string
  version: string
  assessmentId: string
  contentFingerprint: string
  courseName: string
  knowledgeBaseVersion: string
  source: 'current-m10' | 'simulated-peer-m10'
}

export interface M11Pairing {
  pairingId: string
  groupId: string
  testerParticipantId: string
  testedParticipantId: string
  incomingTesterParticipantId: string
  testedAssistant: M11AssistantSnapshot
  currentAssistant: M11AssistantSnapshot
  outgoingCovered: boolean
  incomingCovered: boolean
  rosterFingerprint: string
  m10Fingerprint: string
  disclosure: string
  pairedAt: string
}

export interface M11Question {
  questionId: M11QuestionId
  type: M11QuestionType
  studentQuestion: string
  expectedHandling: M11Handling
  expectedEvidence: string
}

export interface M11QuestionAudit {
  judgment: M11Judgment
  issueTags: M11IssueTag[]
  note: string
  reviewedAt?: string
}

export interface M11TestRecord {
  recordId: string
  questionId: M11QuestionId
  type: M11QuestionType
  round: M11Round
  studentQuestion: string
  assistantId: string
  assistantVersion: string
  rawAnswer: string
  handling: M11Handling
  sourceLabel?: string
  sourceExcerpt?: string
  triggeredRule: string
  teacherHandoff: boolean
  simulatedServiceVersion: 'M11-LOCAL-QA-v1'
  audit: M11QuestionAudit
}

export interface M11Revision {
  revisionId: string
  participantId: string
  relatedQuestionIds: M11QuestionId[]
  type: M11RevisionType
  beforeValue: string
  afterValue: string
  basis: string
  ownerParticipantId: string
  firstTestFingerprint: string
  revisedAt: string
}

export interface M11TeacherConfirmation {
  sameQuestionsConfirmed: boolean
  bidirectionalPairingConfirmed: boolean
  evidenceAndBoundaryConfirmed: boolean
  safetyAndPrivacyConfirmed: boolean
  teacherHandoffResponsibilityConfirmed: boolean
  confirmedAt?: string
}

export interface M11ArtifactRef {
  artifactId: string
  kind: 'm11-five-type-test-chain' | 'm11-assistant-change-note'
  name: '5 类问题的首轮答疑测试、规则修改说明与复测记录' | '课程助教修改说明'
}

export interface M11PortfolioArtifactRef {
  artifactId: string
  name: '学生答疑问题测试、规则修改说明与复测记录'
  mergedFromArtifactIds: [string, string]
}

export interface M11CoverageRef {
  coverageId: string
  direction: 'outgoing' | 'incoming'
  testerParticipantId: string
  testedParticipantId: string
  evidenceRecordIds: string[]
  source: '真实本地复测记录' | '确定性模拟回传记录'
  disclosure: string
}

export interface M11ConfirmedPackage {
  packageId: string
  participantId: string
  groupId: string
  confirmedAt: string
  confirmationFingerprint: string
  m10Fingerprint: string
  pairingFingerprint: string
  firstTestFingerprint: string
  retestFingerprint: string
  artifacts: [M11ArtifactRef, M11ArtifactRef]
  portfolioArtifact: M11PortfolioArtifactRef
  coverageRefs: {
    outgoing: M11CoverageRef
    incoming: M11CoverageRef
  }
}

export type M11ScoreDimensionId = 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'

export interface M11AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  hardGatesPassed: boolean
  coreRequirementsPassed: boolean
  contentFingerprint: string
  modificationSummary: string
}

export interface M11AttemptHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  pairing?: M11Pairing
  firstTest: M11TestRecord[]
  revisions: M11Revision[]
  retest: M11TestRecord[]
  confirmedPackage?: M11ConfirmedPackage
}

export interface M11Progress {
  version: 1
  route: M11Route
  pairing?: M11Pairing
  questions: M11Question[]
  firstTest: M11TestRecord[]
  revisions: M11Revision[]
  retest: M11TestRecord[]
  teacherConfirmation: M11TeacherConfirmation
  confirmedPackage?: M11ConfirmedPackage
  attemptHistory: M11AttemptHistory[]
  assessments: M11AssessmentRecord[]
  updatedAt: string
}
