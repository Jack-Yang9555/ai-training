import type { GroupRole } from '../types'

export type M07Route = 'overview' | 'input' | 'data-check' | 'statistics' | 'analysis' | 'layering-review' | 'result'
export type M07SourceKind = 'task-baseline' | 'm06'
export type M07Judgment = '' | '结论有据' | '结论需限定' | '结论无据'

export interface M07Input {
  sourceKind: M07SourceKind
  sourceAssessmentId: string
  sourcePackageId: string
  sourceSummary: string
  courseName: string
  lessonName: string
  audience: string
  teachingObjectives: string[]
  teachingStage: string
  datasetId: 'M07-VIRTUAL-A01-A20-V1'
  sourceConfirmed: boolean
  anonymousConfirmed: boolean
  virtualDataConfirmed: boolean
  noRankingConfirmed: boolean
}

export interface M07StudentRecord {
  studentId: string
  quiz1: number
  quiz2: number | null
  kp1: boolean
  kp2: boolean
  kp3: boolean
  kp4: boolean
  practicalScore: number
  homeworkCompleted: boolean
}

export interface M07DataCheck {
  checkedFields: string[]
  missingRecordIds: string[]
  missingHandling: string
  anomalyRecordIds: string[]
  anomalyHandling: string
  teacherConfirmed: boolean
}

export interface M07Metric {
  id: string
  label: string
  value: number
  unit: '分' | '%' | '人'
  sampleSize: number
  calculation: string
}

export interface M07AiConclusion {
  id: string
  aiText: string
  evidenceMetricIds: string[]
  requiredJudgment: Exclude<M07Judgment, ''>
}

export interface M07AnalysisDraft {
  draftId: string
  generatedAt: string
  metrics: M07Metric[]
  aiConclusions: M07AiConclusion[]
  aiDisclosure: string
}

export interface M07ManualCheck {
  metricId: string
  aiValue: number
  teacherCalculatedValue: number | null
  status: '' | '一致' | '已纠正'
  note: string
}

export interface M07ConclusionReview {
  conclusionId: string
  judgment: M07Judgment
  finalText: string
  removed: boolean
  basis: string
}

export interface M07LayerTask {
  groupId: 'support' | 'consolidate' | 'extend'
  groupName: '补强组' | '巩固组' | '拓展组'
  memberIds: string[]
  temporaryCriteria: string
  evidence: string
  taskName: string
  taskInstruction: string
  supportResource: string
  checkMethod: string
}

export interface M07PeerReview {
  reviewerId: string
  reviewerRole?: GroupRole
  artifactId: string
  metricId: string
  peerCalculatedValue: number | null
  status: '' | '一致' | '不一致'
  comment: string
  submitted: boolean
}

export interface M07TeacherConfirmation {
  peerDisposition: '' | '已采纳' | '部分采纳' | '不采纳'
  peerResponse: string
  allNumbersConfirmed: boolean
  conclusionsDataSupported: boolean
  temporaryGroupingConfirmed: boolean
  noFixedLabelsConfirmed: boolean
  noRankingConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface M07ConfirmedDeliverable {
  deliverableId: string
  confirmedAt: string
  sourceDraftId: string
  classAnalysisTitle: string
  verifiedMetrics: M07Metric[]
  finalConclusions: M07ConclusionReview[]
  layerTasks: M07LayerTask[]
  manualChecks: M07ManualCheck[]
  peerReview: M07PeerReview
  confirmationFingerprint: string
}

export interface M07AssessmentHistory {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  contentFingerprint: string
}

export interface M07Progress {
  version: 1
  route: M07Route
  input: M07Input
  dataCheck: M07DataCheck
  draft?: M07AnalysisDraft
  manualChecks: M07ManualCheck[]
  conclusionReviews: M07ConclusionReview[]
  layerTasks: M07LayerTask[]
  peerReview: M07PeerReview
  teacherConfirmation: M07TeacherConfirmation
  confirmedDeliverable?: M07ConfirmedDeliverable
  assessmentHistory: M07AssessmentHistory[]
  updatedAt: string
}

export const m07Routes: M07Route[] = ['overview', 'input', 'data-check', 'statistics', 'analysis', 'layering-review', 'result']

export function m07ConfirmationFingerprint(progress: Pick<M07Progress, 'input' | 'dataCheck' | 'draft' | 'manualChecks' | 'conclusionReviews' | 'layerTasks' | 'peerReview' | 'teacherConfirmation'>, groupId: string) {
  return JSON.stringify({ groupId, input: progress.input, dataCheck: progress.dataCheck, draft: progress.draft, manualChecks: progress.manualChecks, conclusionReviews: progress.conclusionReviews, layerTasks: progress.layerTasks, peerReview: progress.peerReview, teacherConfirmation: progress.teacherConfirmation })
}

export function m07ContentFingerprint(progress: M07Progress, groupId: string) {
  return JSON.stringify({ confirmation: m07ConfirmationFingerprint(progress, groupId), confirmedDeliverable: progress.confirmedDeliverable })
}
