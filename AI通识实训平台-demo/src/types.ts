export type AnswerId = 'A' | 'B' | 'C' | 'D'

export type AnnotationType =
  | 'number'
  | 'rule'
  | 'citation'
  | 'safety-step'
  | 'absolute-conclusion'

export type Judgment = 'adopt' | 'revise' | 'delete' | 'limit'

export type OverallJudgment = '可采用' | '含错误' | '含编造' | '含过度推断'

export type ProblemType = '错误步骤' | '编造内容' | '无依据引用' | '过度推断'

export type GroupRole =
  | '协调员'
  | '操作员'
  | '核验员'
  | '记录员'
  | '展示员'
  | '学生体验员'

export type DemoRoute =
  | 'day1'
  | 'overview'
  | 'answers'
  | 'verification'
  | 'corrections'
  | 'group-review'
  | 'result'

export interface SessionIdentity {
  participantId: string
  name: string
  groupId: string
  groupName: string
}

export interface ReferenceAnnotation {
  text: string
  type: AnnotationType
  judgment: Judgment
  evidenceSource: string
  revisedContent?: string
  reason?: string
  problemType?: ProblemType
}

export interface M01Answer {
  id: AnswerId
  scene: string
  question: string
  answer: string
  referenceAnnotations: ReferenceAnnotation[]
}

export interface TextAnnotation {
  id: string
  answerId: AnswerId
  start: number
  end: number
  text: string
  type: AnnotationType
  judgment?: Judgment
  evidenceSource: string
}

export interface CorrectionRecord {
  annotationId: string
  problemType: ProblemType
  revisedContent: string
  reason: string
}

export interface GroupReviewRecord {
  reviewerRole?: GroupRole
  targetUserId: string
  correctionAnnotationId: string
  evidenceAccurate: '' | '准确' | '需补充' | '不准确'
  correctionReasonable: '' | '合理' | '部分合理' | '不合理'
  omissions: string
  suggestion: string
  submitted: boolean
}

export interface ChecklistItem {
  id: string
  checkItem: string
  keyPoint: string
  typicalHallucination: string
  response: string
  preset: boolean
}

export interface M01Progress {
  version: 1
  route: DemoRoute
  askedAnswerIds: AnswerId[]
  annotations: TextAnnotation[]
  corrections: Record<string, CorrectionRecord>
  groupReview: GroupReviewRecord
  checklist: ChecklistItem[]
  updatedAt: string
}

export interface ValidationResult {
  valid: boolean
  messages: string[]
}

export interface ScoreDimension {
  id: 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'
  label: string
  score: 0 | 1 | 2
  evidence: string
}

export interface CoreRequirement {
  id: string
  label: string
  passed: boolean
  route: DemoRoute
}

export interface M01ScoreResult {
  dimensions: ScoreDimension[]
  total: number
  coreRequirements: CoreRequirement[]
  passed: boolean
}
