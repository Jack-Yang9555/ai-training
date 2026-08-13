import type { ParticipantDirectory } from '../training/types'
import type { M04AssessmentSnapshot, M04CorrectionType, M04Progress, M04ScoreResult } from './types'
import { confirmedM04PlanIsCurrent, containsM04SensitiveInformation, correctionIsComplete, latestM04AssessmentIsCurrent, lessonPlanDuration, lessonPlanMappingsComplete, m04CurrentFingerprint, m04InputTextValues, validateM04Audit, validateM04Draft, validateM04PeerReview } from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

function correctionCount(progress: M04Progress): number {
  return (['difficulty', 'activity', 'professional'] as M04CorrectionType[]).filter((type) => correctionIsComplete(progress.audit.corrections[type], progress.draft)).length
}

export function calculateM04Score(progress: M04Progress, directory: ParticipantDirectory, _legacyUpstreamAvailable = true): M04ScoreResult {
  const draft = validateM04Draft(progress)
  const audit = validateM04Audit(progress)
  const peer = validateM04PeerReview(progress, directory)
  const currentConfirmed = confirmedM04PlanIsCurrent(progress, directory)
  const plan = progress.draft
  const corrections = correctionCount(progress)
  const mappingComplete = lessonPlanMappingsComplete(plan)
  const activitiesFeasible = Boolean(plan && plan.activities.every((item) => progress.audit.activityChecks[item.id] && progress.audit.activityChecks[item.id] !== '不可实施'))
  const objectiveChecks = plan?.objectives.filter((item) => progress.audit.objectiveChecks[item.id]).length ?? 0
  const evidenceComplete = Boolean(progress.audit.materialVerified && progress.audit.safetyVerified && correctionIsComplete(progress.audit.corrections.professional, plan) && progress.confirmation.professionalConfirmed)
  const allText = [...m04InputTextValues(progress), ...Object.values(progress.audit.corrections).flatMap((item) => [item.originalContent, item.revisedContent, item.basis]), progress.peerReview.suggestion, progress.confirmation.peerResponse]
  const safe = !containsM04SensitiveInformation(allText)
    && progress.input.rightsConfirmed && progress.input.privacyConfirmed
    && progress.audit.safetyVerified && progress.confirmation.safetyConfirmed

  const dimensions: M04ScoreResult['dimensions'] = [
    { id: 'completion', label: '操作完成与核心步骤', score: scored(Boolean(progress.draft && currentConfirmed && corrections === 3 && peer.valid && progress.input.duration >= 45 && progress.input.duration <= 90), Boolean(progress.draft || progress.confirmedPlan)), evidence: `AI 草稿${progress.draft ? '已生成' : '待生成'}，审校 ${corrections}/3 处，教师确认版${currentConfirmed ? '有效' : '待确认'}` },
    { id: 'adaptation', label: '教学场景适配', score: scored(Boolean(plan && plan.objectives.length === 3 && objectiveChecks === 3 && mappingComplete && activitiesFeasible && lessonPlanDuration(plan) === progress.input.duration), Boolean(plan && objectiveChecks > 0)), evidence: plan ? `3 个目标已核对 ${objectiveChecks}/3，活动合计 ${lessonPlanDuration(plan)} 分钟，目标—活动—评价—分层支持${mappingComplete ? '已对应' : '待补'}` : '尚未形成教案结构' },
    { id: 'evidence', label: '专业准确与证据', score: scored(evidenceComplete, Boolean(progress.audit.materialVerified || progress.audit.corrections.professional.basis.trim())), evidence: evidenceComplete ? `专业表述已回到“${progress.input.materialName}”核验并完成教师确认` : '课程材料依据、专业表述修正或教师确认仍需补齐' },
    { id: 'iteration', label: '人工核验与迭代', score: scored(corrections === 3 && peer.valid && currentConfirmed, corrections > 0 || peer.valid), evidence: `已保存 ${corrections}/3 类“原文—修改后—依据”记录，小组互评${peer.valid ? '有效' : '待提交'}，教师确认版${currentConfirmed ? '已形成' : '待形成'}` },
    { id: 'safety', label: '隐私、版权、伦理与安全', score: safe ? 2 : containsM04SensitiveInformation(allText) ? 0 : 1, evidence: safe ? '材料权属、去标识化、专业安全与教师最终责任均已确认' : '仍需完成材料权属、隐私或专业安全确认' },
  ]

  const coreRequirements: M04ScoreResult['coreRequirements'] = [
    { id: 'm03-draft', label: '确认教案输入并生成 AI 教案草稿（可选复用 M03）', passed: Boolean(progress.draft && progress.input.sourceConfirmed), route: 'draft' },
    { id: 'alignment', label: '核对 3 个目标及活动、评价、分层支持对应关系', passed: draft.valid && objectiveChecks === 3 && mappingComplete && activitiesFeasible, route: 'audit' },
    { id: 'three-corrections', label: '完成难度、课堂活动、专业表述三类实质审校', passed: audit.valid && corrections === 3, route: 'audit' },
    { id: 'peer-confirmation', label: '提交有效同组互评并形成当前教师确认版', passed: peer.valid && currentConfirmed, route: 'confirmation' },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGateIds = new Set(['evidence', 'iteration', 'safety'])
  const hardGatesPassed = dimensions.filter((item) => hardGateIds.has(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createM04Assessment(progress: M04Progress, directory: ParticipantDirectory, _legacyUpstreamAvailable = true): M04AssessmentSnapshot {
  const result = calculateM04Score(progress, directory)
  return { assessmentId: `m04-assessment-${Date.now()}`, submittedAt: new Date().toISOString(), engine: '本地规则引擎（Demo）', fingerprint: m04CurrentFingerprint(progress, directory), modificationSummary: progress.assessmentModificationSummary.trim(), total: result.total, dimensionScores: Object.fromEntries(result.dimensions.map((item) => [item.id, item.score])) as M04AssessmentSnapshot['dimensionScores'], coreRequirementPasses: Object.fromEntries(result.coreRequirements.map((item) => [item.id, item.passed])), passed: result.passed }
}

export { latestM04AssessmentIsCurrent }
