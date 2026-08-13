import type { GroupRole } from '../types'

export type M06Route =
  | 'overview'
  | 'input'
  | 'deck'
  | 'narration'
  | 'avatar-video'
  | 'review-confirm'
  | 'result'

export type M06SourceKind = 'task-baseline' | 'm04'

export interface M06Input {
  sourceKind: M06SourceKind
  sourceAssessmentId: string
  sourcePlanId: string
  sourceSummary: string
  courseName: string
  lessonName: string
  audience: string
  studentFoundation: string
  teachingObjectives: string[]
  teachingStage: '课前导入' | '课堂讲授' | '概念解释' | '关键提醒' | '课后复习'
  verifiedMaterial: string
  sourceConfirmed: boolean
  rightsConfirmed: boolean
  privacyConfirmed: boolean
}

export interface M06Slide {
  id: string
  order: number
  title: string
  coreMessage: string
  body: string
  visualNote: string
  evidenceSource: string
}

export interface M06Draft {
  draftId: string
  generatedAt: string
  slides: M06Slide[]
  originalNarration: string
  slideMappings: Array<{ slideId: string; narrationCue: string }>
  aiDisclosure: string
}

export interface M06DeckAudit {
  checkedSlideIds: string[]
  structureChecked: boolean
  professionalContentChecked: boolean
  textChecked: boolean
  visualChecked: boolean
  modifiedSlideId: string
  modifiedField: 'coreMessage' | 'body' | 'visualNote' | ''
  originalContent: string
  revisedContent: string
  modificationBasis: string
}

export interface M06NarrationReview {
  revisedNarration: string
  mappingConfirmed: boolean
  terminologyChecked: boolean
  teacherConfirmed: boolean
}

export interface M06AvatarConfig {
  avatarPresetId: string
  voicePresetId: string
  subtitleStyleId: string
  speechRate: '0.9x' | '1.0x' | '1.1x'
  pauseSetting: string
  pronunciationNotes: string
  presetOnlyConfirmed: boolean
  subtitleChecked: boolean
  authorizedMaterialConfirmed: boolean
}

export interface M06VideoPreview {
  videoId: string
  generatedAt: string
  durationSeconds: number
  playable: boolean
  subtitleSynchronized: boolean
  resolution: '1280×720'
  renderingNote: string
}

export interface M06PeerReview {
  reviewerId: string
  reviewerRole?: GroupRole
  artifactId: string
  teachingAdaptation: '' | '适配' | '需调整'
  avatarCompliance: '' | '合规' | '需调整'
  videoPlayable: '' | '可播放' | '需调整'
  suggestion: string
  submitted: boolean
}

export interface M06TeacherConfirmation {
  peerDisposition: '' | '已采纳' | '部分采纳' | '不采纳'
  peerResponse: string
  deckScriptConsistent: boolean
  professionalAccuracyConfirmed: boolean
  subtitleVisualConfirmed: boolean
  finalResponsibilityConfirmed: boolean
}

export interface M06ConfirmedPackage {
  packageId: string
  confirmedAt: string
  sourceDraftId: string
  finalDeck: M06Slide[]
  finalNarration: string
  avatarConfig: M06AvatarConfig
  video: M06VideoPreview
  modificationRecord: {
    slideId: string
    field: M06DeckAudit['modifiedField']
    before: string
    after: string
    basis: string
  }
  confirmationFingerprint: string
}

export interface M06AssessmentHistory {
  assessmentId: string
  assessedAt: string
  attempt: 'initial' | 'retest'
  total: number
  passed: boolean
  contentFingerprint: string
}

export interface M06Progress {
  version: 1
  route: M06Route
  input: M06Input
  draft?: M06Draft
  deckAudit: M06DeckAudit
  narrationReview: M06NarrationReview
  avatarConfig: M06AvatarConfig
  videoPreview?: M06VideoPreview
  peerReview: M06PeerReview
  teacherConfirmation: M06TeacherConfirmation
  confirmedPackage?: M06ConfirmedPackage
  assessmentModificationSummary: string
  assessmentHistory: M06AssessmentHistory[]
  updatedAt: string
}

export interface M06ScoreResult {
  dimensions: Array<{ id: 'completion' | 'adaptation' | 'evidence' | 'iteration' | 'safety'; label: string; score: 0 | 1 | 2; evidence: string }>
  total: number
  coreRequirements: Array<{ id: string; label: string; passed: boolean; route: M06Route }>
  hardGatesPassed: boolean
  passed: boolean
}

export const m06Routes: M06Route[] = [
  'overview',
  'input',
  'deck',
  'narration',
  'avatar-video',
  'review-confirm',
  'result',
]

export function m06CharacterCount(value: string) {
  return Array.from(value.replace(/\s/g, '')).length
}

export function applyM06DeckModification(draft: M06Draft, audit: M06DeckAudit) {
  return draft.slides.map((slide) => {
    if (slide.id !== audit.modifiedSlideId || !audit.modifiedField || !audit.revisedContent.trim()) return slide
    return { ...slide, [audit.modifiedField]: audit.revisedContent.trim() }
  })
}

export function m06ConfirmationFingerprint(progress: Pick<M06Progress, 'input' | 'draft' | 'deckAudit' | 'narrationReview' | 'avatarConfig' | 'videoPreview' | 'peerReview' | 'teacherConfirmation'>) {
  return JSON.stringify({
    input: progress.input,
    draft: progress.draft,
    deckAudit: progress.deckAudit,
    narrationReview: progress.narrationReview,
    avatarConfig: progress.avatarConfig,
    videoPreview: progress.videoPreview,
    peerReview: progress.peerReview,
    teacherConfirmation: progress.teacherConfirmation,
  })
}

export function m06ContentFingerprint(progress: M06Progress, groupId: string) {
  return JSON.stringify({
    groupId,
    confirmation: m06ConfirmationFingerprint(progress),
    confirmedPackage: progress.confirmedPackage,
  })
}
