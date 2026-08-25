import type { GroupRole } from '../types'

export type E04Route =
  | 'overview'
  | 'source'
  | 'nodes'
  | 'relations'
  | 'graph-review'
  | 'revision'
  | 'confirmation'
  | 'result'

export type E04RelationType = '先修' | '组成' | '应用' | '易错'

export interface E04SourceExcerpt {
  excerptId: string
  heading: string
  content: string
}

export interface E04CourseSource {
  sourceId: string
  courseName: string
  documentName: string
  version: string
  sourceOrganization: string
  authorization: string
  scopeNote: string
  reviewedFictional: boolean
  excerpts: E04SourceExcerpt[]
  materialAuthorizationConfirmed: boolean
  privacyConfirmed: boolean
  teacherVerifiedConfirmed: boolean
}

export interface E04Node {
  nodeId: string
  label: string
  category: '基础概念' | '方法技能' | '参数工具' | '质量风险'
  definition: string
  sourceExcerptId: string
  aliases: string[]
  teacherReviewed: boolean
}

export interface E04Relation {
  relationId: string
  sourceNodeId: string
  targetNodeId: string
  type: E04RelationType
  rationale: string
  sourceExcerptId: string
  teacherReviewed: boolean
}

export interface E04GraphDraft {
  graphId: string
  participantId: string
  inputFingerprint: string
  generatedAt: string
  title: string
  version: number
  focusNodeIds: string[]
  nodes: E04Node[]
  relations: E04Relation[]
}

export type E04DirectionReview = '' | '正确' | '需调整' | '不正确'
export type E04OmissionReview = '' | '无关键遗漏' | '存在遗漏'

export interface E04GraphReview {
  recordId: string
  reviewerId: string
  reviewerGroupId: string
  reviewerRole?: GroupRole
  graphId: string
  reviewedGraphFingerprint: string
  relationDirection: E04DirectionReview
  omission: E04OmissionReview
  targetRecordId: string
  suggestion: string
  authorTreatment: '' | '已采纳并修正' | '部分采纳' | '不采纳'
  authorBasis: string
  simulated: boolean
  disclosure: string
  submitted: boolean
  submittedAt?: string
}

export type E04RevisionTargetKind = 'node' | 'relation'
export type E04RevisionField = 'merge' | 'direction' | 'delete' | 'label' | 'type' | 'rationale' | 'sourceExcerptId'

export interface E04RevisionRecord {
  revisionId: string
  participantId: string
  sourceReviewId: string
  reviewedGraphFingerprint: string
  targetKind: E04RevisionTargetKind
  targetId: string
  field: E04RevisionField
  beforeValue: string
  afterValue: string
  basis: string
  basisExcerptId: string
  revisedAt: string
}

export interface E04TeacherConfirmation {
  sourceAndEvidenceConfirmed: boolean
  graphQualityConfirmed: boolean
  finalArtifactsConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface E04ArtifactRef {
  artifactId: string
  kind: 'e04-knowledge-graph' | 'e04-node-relation-list' | 'e04-revision-log'
  name: '课程知识图谱' | '节点与关系列表' | '人工修正记录'
}

export interface E04ConfirmedPackage {
  packageId: string
  packageVersion: 1
  participantId: string
  confirmedAt: string
  confirmationFingerprint: string
  graphFingerprint: string
  sourceId: string
  sourceName: string
  sourceVersion: string
  graphId: string
  graphVersion: number
  nodeCount: number
  relationCount: number
  relationTypes: E04RelationType[]
  reviewRecordId: string
  revisionCount: number
  artifacts: [E04ArtifactRef, E04ArtifactRef, E04ArtifactRef]
}

export type E04ScoreDimensionId = 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'

export interface E04AssessmentDimensionSnapshot {
  id: E04ScoreDimensionId
  label: string
  score: 0 | 1 | 2
  evidence: string
}

export interface E04AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  packageId?: string
  total: number
  passed: boolean
  hardGatesPassed: boolean
  coreRequirementsPassed: boolean
  dimensions: E04AssessmentDimensionSnapshot[]
  contentFingerprint: string
  modificationSummary: string
}

export interface E04AttemptHistory {
  historyId: string
  invalidatedAt: string
  reason: string
  route: E04Route
  source: E04CourseSource
  aiDraft?: E04GraphDraft
  workingGraph?: E04GraphDraft
  graphReview: E04GraphReview
  revisions: E04RevisionRecord[]
  teacherConfirmation: E04TeacherConfirmation
  confirmedPackage?: E04ConfirmedPackage
}

export interface E04Progress {
  version: 1
  route: E04Route
  source: E04CourseSource
  aiDraft?: E04GraphDraft
  workingGraph?: E04GraphDraft
  graphReview: E04GraphReview
  revisions: E04RevisionRecord[]
  teacherConfirmation: E04TeacherConfirmation
  confirmedPackage?: E04ConfirmedPackage
  attemptHistory: E04AttemptHistory[]
  assessments: E04AssessmentRecord[]
  updatedAt: string
}
