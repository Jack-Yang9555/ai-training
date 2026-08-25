import type { ParticipantDirectory } from '../training/types'
import type { E02AssessmentRecord, E02Progress } from './domain'
import { e02Hash, rubricScoreTotal } from './runner'
import {
  confirmedE02PackageIsCurrent,
  e02ContentFingerprint,
  e02SafetyDescriptionIsSpecific,
  e02UnsafeFindings,
  validateE02Confirmation,
  validateE02FinalDraft,
  validateE02PeerReview,
  validateE02Source,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateE02Score(progress: E02Progress, directory: ParticipantDirectory) {
  const source = validateE02Source(progress)
  const peer = validateE02PeerReview(progress, directory)
  const finalDraft = validateE02FinalDraft(progress, directory)
  const confirmation = validateE02Confirmation(progress, directory)
  const draft = progress.workingDraft
  const currentPackage = confirmedE02PackageIsCurrent(progress, directory)
  const clauseIds = new Set(progress.specification.clauses.map((item) => item.clauseId))
  const stepsComplete = Boolean(draft
    && draft.taskBook.steps.length >= 3
    && draft.taskBook.steps.every((item) => item.action.trim() && item.completionEvidence.trim() && clauseIds.has(item.clauseId) && item.teacherReviewed))
  const safetyComplete = Boolean(draft
    && draft.safetyChecklist.length >= 3
    && draft.safetyChecklist.every((item) => e02SafetyDescriptionIsSpecific(item.description)
      && item.completionEvidence.trim()
      && clauseIds.has(item.clauseId)
      && draft.taskBook.steps.some((step) => step.stepId === item.stepId)
      && item.teacherReviewed))
  const rubricComplete = Boolean(draft
    && rubricScoreTotal(draft) === 100
    && draft.rubric.items.every((item) => item.score > 0
      && item.deductionConditions.trim()
      && item.criticalStepIds.length > 0
      && item.clauseIds.length > 0
      && item.teacherReviewed))
  const scenarioAdapted = Boolean(source.valid
    && draft
    && progress.scenario.equipment.trim() === progress.specification.applicableEquipment.trim()
    && draft.taskBook.objective.trim() === progress.scenario.learningObjective.trim()
    && draft.taskBook.materials.every((item) => progress.scenario.materials.includes(item)))
  const evidenceValid = Boolean(source.valid && draft
    && draft.taskBook.steps.filter((item) => item.critical).every((item) => clauseIds.has(item.clauseId) && item.completionEvidence.trim())
    && draft.safetyChecklist.every((item) => clauseIds.has(item.clauseId)))
  const substantiveModifications = progress.modifications.filter((item) => item.participantId === directory.currentParticipantId
    && item.sourcePeerReviewId === progress.peerReview.recordId
    && item.beforeValue.trim() !== item.afterValue.trim()
    && item.basis.trim())
  const iterationValid = peer.valid && finalDraft.valid && substantiveModifications.length >= 1
  const safe = source.valid
    && e02UnsafeFindings(progress).length === 0
    && progress.teacherConfirmation.specificationReviewedConfirmed
    && progress.teacherConfirmation.authorizationAndPrivacyConfirmed
    && progress.teacherConfirmation.finalResponsibilityConfirmed

  const dimensions = [
    {
      id: 'completion' as const,
      label: '操作完成与核心步骤',
      score: scored(finalDraft.valid && confirmation.valid && currentPackage, Boolean(progress.aiDraft || progress.workingDraft)),
      evidence: `任务步骤 ${draft?.taskBook.steps.length ?? 0} 项；安全检查 ${draft?.safetyChecklist.length ?? 0} 项；量规 ${rubricScoreTotal(draft)} 分；固定成果 ${progress.confirmedPackage?.artifacts.length ?? 0}/3`,
    },
    {
      id: 'adaptation' as const,
      label: '教学场景适配',
      score: scored(scenarioAdapted && stepsComplete && safetyComplete && rubricComplete, Boolean(progress.scenario.courseName.trim() || progress.scenario.vocationalTask.trim())),
      evidence: scenarioAdapted ? `${progress.scenario.courseName}、设备、材料、步骤和评价项已关联当前任务` : '课程、设备、材料或任务书引用关系仍需补齐',
    },
    {
      id: 'evidence' as const,
      label: '专业准确与证据',
      score: scored(evidenceValid && stepsComplete && safetyComplete, Boolean(progress.specification.clauses.length || draft?.taskBook.steps.some((item) => item.clauseId))),
      evidence: evidenceValid ? '全部关键步骤和不少于 3 个安全点均定位到当前已审核规范条款' : '关键步骤或安全点仍缺当前规范条款与可观察证据',
    },
    {
      id: 'iteration' as const,
      label: '人工核验与迭代',
      score: scored(iterationValid, Boolean(progress.peerReview.recordId || progress.modifications.length)),
      evidence: iterationValid ? `同组复核已提交，保存 ${substantiveModifications.length} 条可核对实质修改` : '须完成同组复核，并保留至少 1 条修改前、修改后和规范依据',
    },
    {
      id: 'safety' as const,
      label: '隐私、版权、伦理与安全',
      score: safe ? 2 as const : e02UnsafeFindings(progress).length > 0 || !progress.specification.reviewedFictional ? 0 as const : 1 as const,
      evidence: safe ? '规范已审核，材料授权与隐私边界已确认，教师承担最终安全责任' : '规范审核、授权隐私或教师最终责任仍有缺项',
    },
  ]
  const coreRequirements = [
    { id: 'verified-standard', label: '规范名称、版本、适用设备和可引用条款完整', passed: source.valid, route: 'source' as const },
    { id: 'ordered-task-steps', label: '不少于 3 个步骤且动作、证据、条款和规范顺序正确', passed: stepsComplete && finalDraft.valid, route: 'teacher-revision' as const },
    { id: 'linked-safety', label: '不少于 3 个具体安全点均关联步骤和规范条款', passed: safetyComplete, route: 'teacher-revision' as const },
    { id: 'closed-rubric', label: '量规分值、关键步骤和扣分条件完整且总分准确为 100 分', passed: rubricComplete, route: 'teacher-revision' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  const coreRequirementsPassed = coreRequirements.every((item) => item.passed)
  return { dimensions, total, coreRequirements, hardGatesPassed, coreRequirementsPassed, passed: total >= 8 && hardGatesPassed && coreRequirementsPassed }
}

export function createE02Assessment(progress: E02Progress, directory: ParticipantDirectory, modificationSummary = ''): E02AssessmentRecord {
  const result = calculateE02Score(progress, directory)
  const assessedAt = new Date().toISOString()
  const defaultSummary = progress.modifications.map((item) => `${item.targetId} ${item.beforeValue}→${item.afterValue}`).join('；')
  return {
    assessmentId: `E02-ASSESS-${e02Hash([directory.currentParticipantId, assessedAt, progress.assessments.length])}`,
    assessedAt,
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    total: result.total,
    passed: result.passed,
    hardGatesPassed: result.hardGatesPassed,
    coreRequirementsPassed: result.coreRequirementsPassed,
    dimensions: structuredClone(result.dimensions),
    contentFingerprint: e02ContentFingerprint(progress, directory),
    modificationSummary: modificationSummary || defaultSummary,
  }
}
