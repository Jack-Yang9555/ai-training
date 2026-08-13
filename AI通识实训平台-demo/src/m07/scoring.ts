import type { ParticipantDirectory } from '../training/types'
import type { M07AssessmentHistory, M07Progress } from './domain'
import { confirmedM07DeliverableIsCurrent, containsM07UnsafeJudgment, m07CurrentFingerprint, validateM07Conclusions, validateM07DataCheck, validateM07Draft, validateM07LayerTasks, validateM07ManualChecks, validateM07PeerReview } from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }
export function calculateM07Score(progress: M07Progress, directory: ParticipantDirectory) {
  const data = validateM07DataCheck(progress), draft = validateM07Draft(progress), checks = validateM07ManualChecks(progress), conclusions = validateM07Conclusions(progress), layers = validateM07LayerTasks(progress), peer = validateM07PeerReview(progress, directory), current = confirmedM07DeliverableIsCurrent(progress, directory)
  const completeChecks = progress.manualChecks.filter((item) => item.teacherCalculatedValue !== null && item.status && item.note.trim()).length
  const safe = progress.input.anonymousConfirmed && progress.input.virtualDataConfirmed && progress.input.noRankingConfirmed && progress.teacherConfirmation.noFixedLabelsConfirmed && progress.teacherConfirmation.noRankingConfirmed && progress.teacherConfirmation.finalResponsibilityConfirmed && !containsM07UnsafeJudgment([...progress.conclusionReviews.filter((item) => !item.removed).map((item) => item.finalText), ...progress.layerTasks.flatMap((item) => [item.temporaryCriteria, item.taskInstruction])])
  const dimensions = [
    { id: 'completion' as const, label: '操作完成与核心步骤', score: scored(data.valid && draft.valid && layers.valid && current, Boolean(progress.draft)), evidence: `匿名班级报告${progress.draft ? '已生成' : '待生成'}，3 个临时组任务${layers.valid ? '完整' : '待补'}，教师确认成果${current ? '有效' : '待形成'}` },
    { id: 'adaptation' as const, label: '教学场景适配', score: scored(layers.valid && progress.layerTasks.every((item) => item.evidence.trim() && item.checkMethod.trim()), progress.layerTasks.length > 0), evidence: layers.valid ? '薄弱点与 3 个临时任务均由当前数据支持，可直接用于下一教学阶段' : '分组任务的数据依据或课堂使用方式仍需补齐' },
    { id: 'evidence' as const, label: '专业准确与证据', score: scored(draft.valid && checks.valid && conclusions.valid && progress.teacherConfirmation.allNumbersConfirmed && progress.teacherConfirmation.conclusionsDataSupported, completeChecks > 0), evidence: `人工复核 ${completeChecks}/3 个关键数字，最终结论${conclusions.valid ? '均有数据支持或已删除' : '仍有证据边界问题'}` },
    { id: 'iteration' as const, label: '人工核验与迭代', score: scored(checks.valid && peer.valid && current, completeChecks > 0), evidence: `教师复核 ${completeChecks} 个数字，同组复算${peer.valid ? '有效' : '待提交'}，差异处理与最终确认${current ? '有效' : '待形成'}` },
    { id: 'safety' as const, label: '隐私、版权、伦理与安全', score: safe ? 2 as const : containsM07UnsafeJudgment(progress.conclusionReviews.map((item) => item.finalText)) ? 0 as const : 1 as const, evidence: safe ? '仅使用匿名虚拟数据，无排名、固定能力或歧视标签，临时分组边界明确' : '匿名虚拟、不排名、非固定标签或最终责任确认仍需补齐' },
  ]
  const coreRequirements = [
    { id: 'data-statistics', label: '检查 A01—A20 字段、缺失和异常，并完成确定性统计', passed: data.valid && draft.valid, route: 'statistics' as const },
    { id: 'three-checks', label: '教师人工复核至少 3 个关键数字且最终结果与确定性计算一致', passed: checks.valid, route: 'statistics' as const },
    { id: 'evidence-analysis', label: '按有据/需限定/无据审校结论并删除无支持判断', passed: conclusions.valid, route: 'analysis' as const },
    { id: 'layer-review', label: '形成 3 个临时组各 1 个任务，完成同组复算和教师确认', passed: layers.valid && peer.valid && current, route: 'layering-review' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0); const hardGatesPassed = dimensions.filter((item) => ['evidence','iteration','safety'].includes(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}
export function createM07Assessment(progress: M07Progress, directory: ParticipantDirectory): M07AssessmentHistory { const result = calculateM07Score(progress, directory); return { assessmentId: `m07-assessment-${Date.now()}`, assessedAt: new Date().toISOString(), attempt: progress.assessmentHistory.length === 0 ? 'initial' : 'retest', total: result.total, passed: result.passed, contentFingerprint: m07CurrentFingerprint(progress, directory) } }
