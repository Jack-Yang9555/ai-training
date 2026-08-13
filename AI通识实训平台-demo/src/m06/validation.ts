import type { ParticipantDirectory } from '../training/types'
import { m06AvatarPresets, m06SubtitlePresets, m06VoicePresets } from './data'
import { m06CharacterCount, m06ConfirmationFingerprint as baseConfirmationFingerprint, m06ContentFingerprint, type M06Progress } from './domain'
import { buildM06PeerArtifacts } from './peerArtifacts'

export interface M06ValidationResult { valid: boolean; messages: string[] }

export function containsM06UnsafeContent(values: string[]) {
  const text = values.join('\n')
  return /(?:1[3-9]\d{9})|(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})|(?:\d{17}[\dXx])|(?:身份证号|手机号|联系电话|真实学生姓名|仿制.{0,6}(?:同事|学生|教师).{0,4}(?:声音|形象))/u.test(text)
}

export function validateM06Input(progress: M06Progress): M06ValidationResult {
  const input = progress.input
  const fields: Array<[string, string]> = [
    [input.sourceAssessmentId, '输入来源编号'], [input.sourcePlanId, '输入版本编号'], [input.sourceSummary, '来源说明'], [input.courseName, '课程名称'],
    [input.lessonName, '课次主题'], [input.audience, '授课对象'], [input.studentFoundation, '学生基础'], [input.verifiedMaterial, '已核验课程材料'],
  ]
  const missing = fields.filter(([value]) => !value.trim()).map(([, label]) => label)
  const messages: string[] = []
  if (missing.length) messages.push(`课件输入尚缺：${missing.join('、')}`)
  if (input.teachingObjectives.length < 2 || input.teachingObjectives.some((item) => !item.trim())) messages.push('请提供至少 2 个有效教学目标')
  if (!input.sourceConfirmed) messages.push('请确认当前制作输入；可选复用 M04，但不要求先完成 M04')
  if (!input.rightsConfirmed) messages.push('请确认课程材料和视觉素材的使用权限')
  if (!input.privacyConfirmed) messages.push('请确认未输入真实学生、同事或其他未授权人员的信息与形象声音')
  if (containsM06UnsafeContent([input.sourceSummary, input.courseName, input.lessonName, input.audience, input.studentFoundation, input.verifiedMaterial, ...input.teachingObjectives])) messages.push('输入包含真实身份信息或未授权仿制要求，请移除后继续')
  return { valid: messages.length === 0, messages }
}

export function validateM06Draft(progress: M06Progress): M06ValidationResult {
  const slides = progress.draft?.slides
  const messages = [...validateM06Input(progress).messages]
  if (!slides) return { valid: false, messages: [...messages, '请先生成 AI 课件与讲解稿原始草稿'] }
  if (slides.length < 6 || slides.length > 8) messages.push('课件必须包含 6—8 页')
  if (slides.some((slide) => !slide.title.trim() || !slide.coreMessage.trim() || !slide.body.trim() || !slide.visualNote.trim() || !slide.evidenceSource.trim())) messages.push('每页必须包含标题、核心信息、正文、画面说明和课程材料依据')
  if (new Set(slides.map((slide) => slide.id)).size !== slides.length) messages.push('课件页编号必须唯一')
  return { valid: messages.length === 0, messages }
}

export function m06DeckModificationIsComplete(progress: M06Progress) {
  const { draft, deckAudit: audit } = progress
  const slide = draft?.slides.find((item) => item.id === audit.modifiedSlideId)
  return Boolean(slide && audit.modifiedField && audit.originalContent === slide[audit.modifiedField] && audit.revisedContent.trim() && audit.revisedContent.trim() !== audit.originalContent.trim() && audit.modificationBasis.trim())
}

export function validateM06DeckAudit(progress: M06Progress): M06ValidationResult {
  const messages = [...validateM06Draft(progress).messages]
  const slides = progress.draft?.slides ?? []
  if (slides.some((slide) => !progress.deckAudit.checkedSlideIds.includes(slide.id))) messages.push('请逐页核验全部课件页')
  if (!progress.deckAudit.structureChecked || !progress.deckAudit.professionalContentChecked || !progress.deckAudit.textChecked || !progress.deckAudit.visualChecked) messages.push('请完成结构、专业内容、文字和画面四项人工核验')
  if (!m06DeckModificationIsComplete(progress)) messages.push('请至少完成 1 处实质修改，并保存修改前、修改后和修改依据')
  return { valid: messages.length === 0, messages }
}

export function validateM06Narration(progress: M06Progress): M06ValidationResult {
  const messages = [...validateM06DeckAudit(progress).messages]
  const narration = progress.narrationReview.revisedNarration
  const count = m06CharacterCount(narration)
  if (count < 150 || count > 180) messages.push(`教师确认讲解稿必须为 150—180 字，当前 ${count} 字`)
  const slideIds = progress.draft?.slides.map((slide) => slide.id) ?? []
  const mappingIds = progress.draft?.slideMappings.map((item) => item.slideId) ?? []
  if (slideIds.some((id) => !mappingIds.includes(id))) messages.push('讲解稿必须与全部课件页建立对应关系')
  if (!progress.narrationReview.mappingConfirmed || !progress.narrationReview.terminologyChecked || !progress.narrationReview.teacherConfirmed) messages.push('请确认讲解映射、术语读音和教师审定稿')
  if (containsM06UnsafeContent([narration])) messages.push('讲解稿包含真实身份信息或未授权仿制要求')
  return { valid: messages.length === 0, messages }
}

export function validateM06Video(progress: M06Progress): M06ValidationResult {
  const messages = [...validateM06Narration(progress).messages]
  const config = progress.avatarConfig
  if (!m06AvatarPresets.some((item) => item.id === config.avatarPresetId) || !m06VoicePresets.some((item) => item.id === config.voicePresetId) || !m06SubtitlePresets.some((item) => item.id === config.subtitleStyleId)) messages.push('只能选择平台预设数字人、音色和字幕样式')
  if (!config.pauseSetting.trim() || !config.pronunciationNotes.trim()) messages.push('请配置语速、停顿和术语读音')
  if (!config.presetOnlyConfirmed || !config.subtitleChecked || !config.authorizedMaterialConfirmed) messages.push('请确认仅使用预设形象音色、字幕完整和素材已授权')
  const video = progress.videoPreview
  if (!video?.playable || video.durationSeconds < 45 || video.durationSeconds > 60 || !video.subtitleSynchronized) messages.push('请生成 45—60 秒、可播放且字幕同步的本地模拟视频')
  return { valid: messages.length === 0, messages }
}

export function validateM06PeerReview(progress: M06Progress, directory: ParticipantDirectory): M06ValidationResult {
  const review = progress.peerReview
  const artifact = buildM06PeerArtifacts(directory).find((item) => item.participantId === review.reviewerId && item.artifactId === review.artifactId)
  const messages: string[] = []
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  if (!artifact) messages.push('请选择当前同组其他成员的有效微课成果')
  if (!review.teachingAdaptation || !review.avatarCompliance || !review.videoPlayable) messages.push('请完成教学适配、数字人合规和视频可播放三项互评')
  if (!review.suggestion.trim()) messages.push('请填写一条可执行互评建议')
  if (!review.submitted) messages.push('请提交小组互评记录')
  return { valid: messages.length === 0, messages }
}

function currentGroupId(directory: ParticipantDirectory) {
  return directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? ''
}

export function m06ConfirmationFingerprint(progress: M06Progress, directory: ParticipantDirectory) {
  return JSON.stringify({ content: baseConfirmationFingerprint(progress), groupId: currentGroupId(directory) })
}

export function validateM06Confirmation(progress: M06Progress, directory: ParticipantDirectory): M06ValidationResult {
  const messages = [...validateM06Video(progress).messages, ...validateM06PeerReview(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.peerDisposition || !confirmation.peerResponse.trim()) messages.push('请记录互评建议处理方式与依据')
  if (!confirmation.deckScriptConsistent || !confirmation.professionalAccuracyConfirmed || !confirmation.subtitleVisualConfirmed || !confirmation.finalResponsibilityConfirmed) messages.push('请完成课件讲稿一致、专业准确、字幕画面和最终责任四项教师确认')
  return { valid: messages.length === 0, messages }
}

export function confirmedM06PackageIsCurrent(progress: M06Progress, directory: ParticipantDirectory) {
  return Boolean(progress.confirmedPackage && progress.confirmedPackage.confirmationFingerprint === m06ConfirmationFingerprint(progress, directory))
}

export function m06CurrentFingerprint(progress: M06Progress, directory: ParticipantDirectory) {
  return m06ContentFingerprint(progress, currentGroupId(directory))
}

export function latestM06AssessmentIsCurrent(progress: M06Progress, directory: ParticipantDirectory) {
  const latest = progress.assessmentHistory.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === m06CurrentFingerprint(progress, directory))
}

export function validateM06AssessmentSubmission(progress: M06Progress, directory: ParticipantDirectory): M06ValidationResult {
  const messages = [...validateM06Confirmation(progress, directory).messages]
  if (!confirmedM06PackageIsCurrent(progress, directory)) messages.push('请先形成与当前课件、讲稿、配置和互评一致的教师确认成果包')
  return { valid: messages.length === 0, messages }
}

export function progressForM06(progress: M06Progress, directory: ParticipantDirectory) {
  const stages = [validateM06Input(progress).valid, validateM06Draft(progress).valid, validateM06DeckAudit(progress).valid, validateM06Narration(progress).valid, validateM06Video(progress).valid, confirmedM06PackageIsCurrent(progress, directory), latestM06AssessmentIsCurrent(progress, directory)]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}
