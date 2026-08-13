import type { M06AvatarConfig, M06DeckAudit, M06Input, M06NarrationReview, M06PeerReview, M06Progress, M06TeacherConfirmation } from './domain'

export const m06AvatarPresets = [
  { id: 'avatar-teacher-neutral', name: '教学讲解员（中性）' },
  { id: 'avatar-teacher-friendly', name: '教学讲解员（亲和）' },
] as const

export const m06VoicePresets = [
  { id: 'voice-clear-female', name: '清晰女声' },
  { id: 'voice-steady-male', name: '沉稳男声' },
] as const

export const m06SubtitlePresets = [
  { id: 'subtitle-high-contrast', name: '高对比底栏' },
  { id: 'subtitle-clean-white', name: '简洁白字' },
] as const

export const m06DefaultInput: M06Input = {
  sourceKind: 'task-baseline',
  sourceAssessmentId: 'M06-STANDALONE-DEMO',
  sourcePlanId: 'M06-INPUT-V1',
  sourceSummary: '使用任务内置的已核验课程情境独立制作，不依赖上游任务。',
  courseName: '智能制造基础',
  lessonName: '设备点检中的异常识别',
  audience: '高职一年级学生',
  studentFoundation: '已了解设备点检表基本字段，但容易混淆正常波动与异常信号。',
  teachingObjectives: ['说出异常识别的三个观察维度', '根据点检记录判断是否需要复核'],
  teachingStage: '概念解释',
  verifiedMaterial: '课程讲义第 3 章：异常信号需结合阈值、连续变化与现场状态综合判断；无法确认时先复核，不直接下结论。',
  sourceConfirmed: false,
  rightsConfirmed: false,
  privacyConfirmed: false,
}

export const emptyM06DeckAudit: M06DeckAudit = {
  checkedSlideIds: [],
  structureChecked: false,
  professionalContentChecked: false,
  textChecked: false,
  visualChecked: false,
  modifiedSlideId: '',
  modifiedField: '',
  originalContent: '',
  revisedContent: '',
  modificationBasis: '',
}

export const emptyM06NarrationReview: M06NarrationReview = {
  revisedNarration: '',
  mappingConfirmed: false,
  terminologyChecked: false,
  teacherConfirmed: false,
}

export const emptyM06AvatarConfig: M06AvatarConfig = {
  avatarPresetId: 'avatar-teacher-neutral',
  voicePresetId: 'voice-clear-female',
  subtitleStyleId: 'subtitle-high-contrast',
  speechRate: '1.0x',
  pauseSetting: '每页核心结论后停顿 0.6 秒',
  pronunciationNotes: '“点检”读作 diǎn jiǎn；“阈值”读作 yù zhí。',
  presetOnlyConfirmed: false,
  subtitleChecked: false,
  authorizedMaterialConfirmed: false,
}

export const emptyM06PeerReview: M06PeerReview = {
  reviewerId: '',
  artifactId: '',
  teachingAdaptation: '',
  avatarCompliance: '',
  videoPlayable: '',
  suggestion: '',
  submitted: false,
}

export const emptyM06TeacherConfirmation: M06TeacherConfirmation = {
  peerDisposition: '',
  peerResponse: '',
  deckScriptConsistent: false,
  professionalAccuracyConfirmed: false,
  subtitleVisualConfirmed: false,
  finalResponsibilityConfirmed: false,
}

export function createInitialM06Progress(): M06Progress {
  return {
    version: 1,
    route: 'overview',
    input: structuredClone(m06DefaultInput),
    deckAudit: structuredClone(emptyM06DeckAudit),
    narrationReview: structuredClone(emptyM06NarrationReview),
    avatarConfig: structuredClone(emptyM06AvatarConfig),
    peerReview: structuredClone(emptyM06PeerReview),
    teacherConfirmation: structuredClone(emptyM06TeacherConfirmation),
    assessmentModificationSummary: '',
    assessmentHistory: [],
    updatedAt: new Date().toISOString(),
  }
}
