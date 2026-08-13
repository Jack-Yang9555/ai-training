import type { GroupRole } from '../types'

export type M08Route = 'overview' | 'input' | 'draft' | 'iterations' | 'browser-test' | 'peer-confirm' | 'result'
export type M08PageType = '课堂互动' | '自主学习' | '闯关训练' | '课前预习'

export interface M08SourceReference {
  sourceTaskId: 'M04' | 'M06'
  assessmentId: string
  artifactId: string
  summary: string
}

export interface M08Input {
  pageType: M08PageType
  teachingUse: string
  courseTitle: string
  lessonTitle: string
  audience: string
  studentFoundation: string
  learningObjective: string
  verifiedMaterial: string
  sourceReferences: M08SourceReference[]
  sourceConfirmed: boolean
  rightsConfirmed: boolean
  privacyConfirmed: boolean
  noExternalResourceConfirmed: boolean
  noSecretConfirmed: boolean
}

export interface M08KnowledgeCard {
  id: string
  title: string
  content: string
  evidenceSource: string
}

export interface M08Question {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
  evidenceSource: string
}

export interface M08WebVersion {
  versionId: string
  versionLabel: 'AI 原始 V0' | '教师修改 V1' | '教师修改 V2'
  generatedAt: string
  title: string
  objective: string
  knowledgeCards: M08KnowledgeCard[]
  questions: M08Question[]
  interactionLabel: string
  html: string
  aiDisclosure: string
}

export interface M08IterationRecord {
  round: 1 | 2
  instruction: string
  beforeSummary: string
  afterSummary: string
  versionId: string
  createdAt: string
}

export interface M08BrowserTest {
  downloaded: boolean
  offlineOpened: boolean
  desktopChecked: boolean
  mobileChecked: boolean
  singleFileChecked: boolean
  fiveQuestionsChecked: boolean
  instantFeedbackChecked: boolean
  interactionChecked: boolean
  notes: string
}

export interface M08PeerTest {
  reviewerId: string
  reviewerRole?: GroupRole
  artifactId: string
  studentOperation: string
  issueFound: string
  correctionBefore: string
  correctionAfter: string
  correctionBasis: string
  submitted: boolean
}

export interface M08TeacherConfirmation {
  answersExplanationsConfirmed: boolean
  materialAlignmentConfirmed: boolean
  responsiveConfirmed: boolean
  offlineSafetyConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface M08ConfirmedWebpage {
  webpageId: string
  confirmedAt: string
  sourceVersionId: string
  html: string
  title: string
  iterationRecords: M08IterationRecord[]
  browserTest: M08BrowserTest
  peerTest: M08PeerTest
  confirmationFingerprint: string
}

export interface M08AssessmentRecord {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  contentFingerprint: string
}

export interface M08Progress {
  version: 1
  route: M08Route
  input: M08Input
  versions: M08WebVersion[]
  iterationRecords: M08IterationRecord[]
  iterationDrafts: [string, string]
  browserTest: M08BrowserTest
  peerTest: M08PeerTest
  teacherConfirmation: M08TeacherConfirmation
  confirmedWebpage?: M08ConfirmedWebpage
  assessments: M08AssessmentRecord[]
  updatedAt: string
}

export function currentM08Version(progress: M08Progress) {
  return progress.versions.at(-1)
}
