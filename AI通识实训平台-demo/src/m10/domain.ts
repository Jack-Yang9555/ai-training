import type { GroupRole } from '../types'

export type M10Route =
  | 'overview'
  | 'source'
  | 'configuration'
  | 'flow'
  | 'boundaries'
  | 'preview'
  | 'review-confirm'
  | 'result'

export interface M10KnowledgeSource {
  participantId: string
  knowledgeBaseId: string
  version: 'v1.0'
  courseName: string
  audience: string
  scope: string
  sourceCount: number
  segmentCount: number
  sourceFingerprint: string
  confirmationFingerprint: string
  m09AssessmentId: string
  m09AssessmentFingerprint: string
  m09ConfirmedAt: string
  previewSegment: {
    segmentId: string
    sourceId: string
    sourceLabel: string
    excerpt: string
  }
  current: true
  passed: true
}

export type M10ElementId = 'role' | 'audience' | 'task' | 'knowledge' | 'process' | 'boundary'

export interface M10SixElements {
  role: string
  audience: string
  task: string
  knowledge: string
  process: string
  boundary: string
}

export type M10FlowStepId = 'understand' | 'retrieve' | 'explain' | 'check'

export interface M10FlowStep {
  stepId: M10FlowStepId
  order: 1 | 2 | 3 | 4
  label: '先了解问题' | '检索材料' | '引用解释' | '检查理解'
  action: string
  failureHandling: string
}

export type M10BoundaryType = 'out-of-scope' | 'do-work' | 'safety' | 'final-grade' | 'sensitive-data'
export type M10BoundaryAction = '追问' | '拒绝并引导' | '说明边界并转交' | '暂停并转交'

export interface M10BoundaryRule {
  ruleId: string
  type: M10BoundaryType
  label: '超出资料范围' | '要求代做' | '涉及安全' | '要求决定最终成绩' | '处理敏感数据'
  trigger: string
  action: M10BoundaryAction
  response: string
  handoff: string
}

export interface M10PreviewTrace {
  stepId: M10FlowStepId
  order: 1 | 2 | 3 | 4
  label: string
  detail: string
  status: 'completed' | 'boundary'
}

export interface M10PreviewRecord {
  previewId: string
  kind: 'normal' | 'boundary'
  question: string
  rawAnswer: string
  trace: M10PreviewTrace[]
  source?: M10KnowledgeSource['previewSegment']
  triggeredRuleId?: string
  triggeredRuleLabel?: string
  handoff?: string
  configurationFingerprint: string
  generatedAt: string
  readOnly: true
}

export type M10ReviewConclusion = '通过' | '需调整'

export interface M10PeerCheck {
  checkId: 'role' | 'flow' | 'boundaries'
  label: string
  conclusion: M10ReviewConclusion
  note: string
}

export interface M10PeerReview {
  reviewId: string
  templateVersion: '1.0'
  reviewerId: string
  reviewerGroupId: string
  reviewerRole?: GroupRole
  configurationFingerprint: string
  checks: M10PeerCheck[]
  suggestion: string
  disclosure: string
  submitted: boolean
  submittedAt?: string
}

export type M10RevisionTreatment = '采纳' | '部分采纳' | '说明后不采纳'

export interface M10RevisionRecord {
  revisionId: string
  field: string
  beforeValue: string
  afterValue: string
  basis: string
  treatment: M10RevisionTreatment
  reviewId: string
  beforeConfigurationFingerprint: string
  afterConfigurationFingerprint: string
  revisedAt: string
}

export interface M10TeacherConfirmation {
  knowledgeSourceConfirmed: boolean
  roleBoundaryConfirmed: boolean
  fourStepFlowConfirmed: boolean
  fiveRulesConfirmed: boolean
  humanTakeoverResponsibilityConfirmed: boolean
}

export type M10ArtifactKind = 'course-assistant-v1' | 'configuration-evidence'

export interface M10Artifact {
  artifactId: string
  kind: M10ArtifactKind
  name: '课程 AI 助教 v1.0' | '六要素配置表、边界规则清单和配置修改记录'
  version: 'v1.0'
}

export interface M10ConfirmedAssistant {
  assistantId: string
  participantId: string
  version: 'v1.0'
  source: M10KnowledgeSource
  sixElements: M10SixElements
  flowSteps: M10FlowStep[]
  boundaryRules: M10BoundaryRule[]
  previews: M10PreviewRecord[]
  peerReviewId: string
  revisionIds: string[]
  teacherConfirmed: true
  confirmedAt: string
  confirmationFingerprint: string
  artifacts: [M10Artifact, M10Artifact]
  personalPortfolioSlot: '课程 AI 助教'
}

export interface M10AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  contentFingerprint: string
}

export interface M10AttemptHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  source?: M10KnowledgeSource
  sixElements: M10SixElements
  flowSteps: M10FlowStep[]
  boundaryRules: M10BoundaryRule[]
  previews: M10PreviewRecord[]
  peerReview: M10PeerReview
  revisions: M10RevisionRecord[]
  confirmedAssistant?: M10ConfirmedAssistant
}

export interface M10Progress {
  version: 1
  route: M10Route
  knowledgeSource?: M10KnowledgeSource
  sixElements: M10SixElements
  flowSteps: M10FlowStep[]
  boundaryRules: M10BoundaryRule[]
  previews: M10PreviewRecord[]
  peerReview: M10PeerReview
  revisions: M10RevisionRecord[]
  teacherConfirmation: M10TeacherConfirmation
  confirmedAssistant?: M10ConfirmedAssistant
  attemptHistory: M10AttemptHistory[]
  assessments: M10AssessmentRecord[]
  updatedAt: string
}
