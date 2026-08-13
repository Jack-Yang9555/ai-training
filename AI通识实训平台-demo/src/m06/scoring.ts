import type { ParticipantDirectory } from '../training/types'
import { m06CharacterCount, type M06AssessmentHistory, type M06Progress } from './domain'
import { confirmedM06PackageIsCurrent, containsM06UnsafeContent, m06CurrentFingerprint, m06DeckModificationIsComplete, validateM06DeckAudit, validateM06Draft, validateM06Narration, validateM06PeerReview, validateM06Video } from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateM06Score(progress: M06Progress, directory: ParticipantDirectory) {
  const draft = validateM06Draft(progress)
  const deck = validateM06DeckAudit(progress)
  const narration = validateM06Narration(progress)
  const video = validateM06Video(progress)
  const peer = validateM06PeerReview(progress, directory)
  const currentConfirmed = confirmedM06PackageIsCurrent(progress, directory)
  const safe = progress.input.rightsConfirmed && progress.input.privacyConfirmed && progress.avatarConfig.presetOnlyConfirmed && progress.avatarConfig.authorizedMaterialConfirmed && progress.teacherConfirmation.finalResponsibilityConfirmed && !containsM06UnsafeContent([
    progress.input.courseName, progress.input.lessonName, progress.input.studentFoundation, progress.input.verifiedMaterial,
    ...(progress.draft?.slides.flatMap((slide) => [slide.title, slide.coreMessage, slide.body, slide.visualNote]) ?? []), progress.narrationReview.revisedNarration,
  ])
  const consistent = progress.narrationReview.mappingConfirmed && progress.narrationReview.terminologyChecked && progress.avatarConfig.subtitleChecked && progress.videoPreview?.subtitleSynchronized && progress.teacherConfirmation.deckScriptConsistent && progress.teacherConfirmation.professionalAccuracyConfirmed && progress.teacherConfirmation.subtitleVisualConfirmed
  const adaptation = progress.input.teachingObjectives.length >= 2 && Boolean(progress.input.studentFoundation.trim()) && Boolean(progress.input.teachingStage) && (progress.draft?.slides.every((slide) => slide.coreMessage.trim()) ?? false)
  const dimensions = [
    { id: 'completion' as const, label: '操作完成与核心步骤', score: scored(draft.valid && deck.valid && narration.valid && video.valid && currentConfirmed, Boolean(progress.draft)), evidence: `${progress.draft?.slides.length ?? 0} 页课件，${m06CharacterCount(progress.narrationReview.revisedNarration)} 字讲解稿，${progress.videoPreview?.durationSeconds ?? 0} 秒视频，教师确认成果${currentConfirmed ? '有效' : '待形成'}` },
    { id: 'adaptation' as const, label: '教学场景适配', score: scored(adaptation, Boolean(progress.input.lessonName.trim())), evidence: adaptation ? `已对齐${progress.input.teachingStage}、学生基础和 ${progress.input.teachingObjectives.length} 个目标` : '教学阶段、学生基础、目标或页面核心信息仍需补齐' },
    { id: 'evidence' as const, label: '专业准确与证据', score: scored(Boolean(consistent), Boolean(progress.deckAudit.professionalContentChecked)), evidence: consistent ? '课件、讲解、语音、字幕与画面一致，术语和专业内容已核验' : '跨媒体一致性或专业内容仍需教师确认' },
    { id: 'iteration' as const, label: '人工核验与迭代', score: scored(m06DeckModificationIsComplete(progress) && peer.valid && currentConfirmed, m06DeckModificationIsComplete(progress)), evidence: `实质修改${m06DeckModificationIsComplete(progress) ? '已留痕' : '待完成'}，同组互评${peer.valid ? '有效' : '待提交'}，教师确认${currentConfirmed ? '有效' : '待形成'}` },
    { id: 'safety' as const, label: '隐私、版权、伦理与安全', score: safe ? 2 as const : containsM06UnsafeContent([progress.input.verifiedMaterial, progress.narrationReview.revisedNarration]) ? 0 as const : 1 as const, evidence: safe ? '仅使用平台预设形象音色，素材权利、隐私和发布责任均已确认' : '预设使用、素材权利、隐私或最终责任确认仍需补齐' },
  ]
  const coreRequirements = [
    { id: 'deck', label: '生成并逐页核验 6—8 页课件，完成至少 1 处实质修改', passed: draft.valid && deck.valid, route: 'deck' as const },
    { id: 'narration', label: '形成 150—180 字且与课件逐页对应的教师确认讲解稿', passed: narration.valid, route: 'narration' as const },
    { id: 'video', label: '使用预设形象音色形成 45—60 秒可播放、字幕同步视频', passed: video.valid, route: 'avatar-video' as const },
    { id: 'review-confirm', label: '完成同组互评并形成当前教师确认组合成果', passed: peer.valid && currentConfirmed, route: 'review-confirm' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createM06Assessment(progress: M06Progress, directory: ParticipantDirectory): M06AssessmentHistory {
  const result = calculateM06Score(progress, directory)
  return {
    assessmentId: `m06-assessment-${Date.now()}`,
    assessedAt: new Date().toISOString(),
    attempt: progress.assessmentHistory.length === 0 ? 'initial' : 'retest',
    total: result.total,
    passed: result.passed,
    contentFingerprint: m06CurrentFingerprint(progress, directory),
  }
}
