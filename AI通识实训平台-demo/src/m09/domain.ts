import type { GroupRole } from '../types'

export type M09Route =
  | 'overview'
  | 'sources'
  | 'quality'
  | 'build'
  | 'first-test'
  | 'correction-retest'
  | 'peer-confirm'
  | 'result'

export type M09SourceKind = '课程样例' | '本地 TXT' | '本地 Markdown'
export type M09AuthorizationStatus = '已授权' | '待确认' | '未授权'
export type M09InclusionDecision = '待决定' | '纳入' | '排除'
export type M09SourceStatus = '待检查' | '可入库' | '已排除'
export type M09QualityIssueType = 'duplicate' | 'obsolete' | 'missing-page' | 'wrong-version'
export type M09QualityAction = '未处理' | '无需处理' | '保留并说明' | '替换版本' | '排除资料'

export const m09QualityIssueLabels: Record<M09QualityIssueType, string> = {
  duplicate: '重复内容',
  obsolete: '过期内容',
  'missing-page': '缺页/缺段',
  'wrong-version': '错误版本',
}

export interface M09QualityFinding {
  issueType: M09QualityIssueType
  detected: boolean
  checked: boolean
  action: M09QualityAction
  rationale: string
  replacementVersion?: string
  replacementContent?: string
}

export interface M09SourceRecord {
  sourceId: string
  kind: M09SourceKind
  name: string
  source: string
  version: string
  scope: string
  authorizationStatus: M09AuthorizationStatus
  authorizationConfirmed: boolean
  content: string
  summary: string
  localParseResult: string
  teacherDecision: M09InclusionDecision
  status: M09SourceStatus
  qualityFindings: M09QualityFinding[]
}

export interface M09Scenario {
  courseName: string
  audience: string
  useStage: '答疑' | '复习'
  teachingPurpose: string
}

export interface M09KnowledgeSegment {
  segmentId: string
  sourceId: string
  sourceName: string
  sourceVersion: string
  heading: string
  text: string
}

export interface M09KnowledgeBase {
  knowledgeBaseId: string
  participantId: string
  version: 'v0' | 'v1.0'
  builtAt: string
  courseName: string
  audience: string
  useStage: string
  scope: string
  sourceIds: string[]
  sourceFingerprint: string
  segmentCount: number
  segments: M09KnowledgeSegment[]
  healthNotes: string[]
  teacherConfirmed: boolean
  confirmedAt?: string
  confirmationFingerprint?: string
}

export type M09QuestionType = 'evidence' | 'condition-missing' | 'out-of-scope' | 'wrong-premise' | 'composite-boundary'
export type M09Handling = '有据回答' | '追问缺失条件' | '超范围说明并转交' | '指出错误前提'
export type M09TeacherResult = '符合预期' | '需修正'

export interface M09Question {
  questionId: string
  type: M09QuestionType
  question: string
  scenario: string
  expectedHandling: M09Handling
  expectedSourceId?: string
  expectedHeading?: string
}

export interface M09TestRecord {
  recordId: string
  questionId: string
  type: M09QuestionType
  round: 'first' | 'retest'
  question: string
  scenario: string
  rawAnswer: string
  actualHandling: M09Handling
  expectedHandling: M09Handling
  sourceId?: string
  segmentId?: string
  sourceLabel?: string
  excerpt?: string
  teacherResult: M09TeacherResult
  teacherVerified: boolean
  issueDescription: string
  correctionId?: string
}

export interface M09AnswerRule {
  version: number
  text: string
}

export interface M09CorrectionDraft {
  questionId: string
  target: '回答规则' | '课程资料'
  before: string
  after: string
  basis: string
}

export interface M09CorrectionRecord extends M09CorrectionDraft {
  correctionId: string
  correctedAt: string
  sourceFingerprint: string
  ruleVersion: number
}

export interface M09PeerTest {
  recordId: string
  templateVersion: '1.0'
  reviewerId: string
  reviewerRole?: GroupRole
  reviewerGroupId: string
  knowledgeBaseId: string
  boundaryQuestionId: string
  actualHandling?: M09Handling
  conclusion?: '符合预期' | '需调整'
  suggestion: string
  authorTreatment: '' | '已按建议修正' | '不采纳并记录依据'
  authorBasis: string
  submitted: boolean
  submittedAt?: string
}

export interface M09TeacherConfirmation {
  scopeConfirmed: boolean
  sourcesConfirmed: boolean
  boundaryConfirmed: boolean
  safetyConfirmed: boolean
  maintenanceResponsibilityConfirmed: boolean
}

export interface M09ConfirmedKnowledgeBase extends M09KnowledgeBase {
  version: 'v1.0'
  teacherConfirmed: true
  confirmedAt: string
  confirmationFingerprint: string
  sourceListArtifactId: string
  testReportArtifactId: string
}

export interface M09AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  contentFingerprint: string
}

export interface M09TestHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  firstTest: M09TestRecord[]
  retest: M09TestRecord[]
  corrections: M09CorrectionRecord[]
}

export interface M09Progress {
  version: 1
  route: M09Route
  scenario: M09Scenario
  sources: M09SourceRecord[]
  importNotice: string
  knowledgeBase?: M09KnowledgeBase
  questions: M09Question[]
  answerRule: M09AnswerRule
  firstTest: M09TestRecord[]
  firstTestFrozen: boolean
  correctionDraft: M09CorrectionDraft
  corrections: M09CorrectionRecord[]
  retest: M09TestRecord[]
  peerTest: M09PeerTest
  teacherConfirmation: M09TeacherConfirmation
  confirmedKnowledgeBase?: M09ConfirmedKnowledgeBase
  testHistory: M09TestHistory[]
  assessments: M09AssessmentRecord[]
  updatedAt: string
}
