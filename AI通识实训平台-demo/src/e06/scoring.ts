import type { ParticipantDirectory } from '../training/types'
import type { E06AssessmentRecord, E06Progress, E06ScoreDimensionId } from './domain'
import { e06Hash } from './runner'
import { confirmedE06PackageIsCurrent, e06ContentFingerprint, e06UnsafeFindings, validateE06Comparisons, validateE06Revision, validateE06Source } from './validation'

const score = (valid: boolean, partial: boolean): 0 | 1 | 2 => valid ? 2 : partial ? 1 : 0
export function calculateE06Score(progress: E06Progress, directory: ParticipantDirectory) {
  const source = validateE06Source(progress); const comparisons = validateE06Comparisons(progress, directory.currentParticipantId); const final = validateE06Revision(progress, directory); const pkg = confirmedE06PackageIsCurrent(progress, directory)
  const complete = final.valid && progress.workingRecords.length === 3 && progress.comparisons.length >= 2
  const adapted = source.valid && progress.workingRecords.every((item) => [item.researchObject, item.method, item.finding, item.boundary].every((value) => value.trim())) && progress.comparisons.every((item) => item.intendedUse === progress.source.intendedUse)
  const evidence = final.valid && progress.workingRecords.every((item) => [item.objectReference, item.methodReference, item.findingReference, item.boundaryReference].every(Boolean))
  const iteration = final.valid && progress.peerReview.submitted && progress.revisions.length >= 1
  const safe = source.valid && e06UnsafeFindings(progress).length === 0 && progress.teacherConfirmation.zeroFalseCitationConfirmed && progress.teacherConfirmation.complianceConfirmed && progress.teacherConfirmation.finalResponsibilityConfirmed
  const dimensions: Array<{ id: E06ScoreDimensionId; label: string; score: 0 | 1 | 2; evidence: string }> = [
    { id: 'completion', label: '操作完成与核心步骤', score: score(complete && pkg, Boolean(progress.draft || progress.comparisons.length)), evidence: `材料 ${progress.workingRecords.length}/3；观点比较 ${progress.comparisons.length}/2；固定成果 ${progress.confirmedPackage?.artifacts.length ?? 0}/3` },
    { id: 'adaptation', label: '教学场景适配', score: score(adapted, Boolean(progress.source.teachingQuestion.trim() || progress.draft)), evidence: adapted ? '三份梳理和两条比较均围绕明确教学问题与教研用途' : '教学问题、文献证据或教研用途尚未闭环' },
    { id: 'evidence', label: '专业准确与证据', score: score(evidence, comparisons.valid), evidence: evidence ? '三份元数据、四项提取与比较引用均可点查，虚假引用为 0' : '结论越界、元数据或引用位置仍有缺项' },
    { id: 'iteration', label: '人工核验与迭代', score: score(iteration, Boolean(progress.peerReview.recordId || progress.revisions.length)), evidence: iteration ? `同组逐份核验已提交，保留 ${progress.revisions.length} 条有据修正` : '须完成同组核验并保留至少 1 处修改前后、依据和引用位置' },
    { id: 'safety', label: '隐私、版权、伦理与安全', score: safe ? 2 : e06UnsafeFindings(progress).length ? 0 : 1, evidence: safe ? '只使用 D01—D03 获准材料，无开放网络伪装、无敏感信息，教师承担最终责任' : '材料授权、零虚假引用、隐私或教师责任尚未全部确认' },
  ]
  const coreRequirements = [
    { id: 'three-sources', label: '只使用 D01—D03 三份获准且可点查材料', passed: source.valid, route: 'question' as const },
    { id: 'four-fields', label: '三份材料均完成对象、方法、发现与边界及位置', passed: complete, route: 'revision' as const },
    { id: 'two-comparisons', label: '至少两条互斥关系比较，每条引用两份材料并说明边界', passed: comparisons.valid && progress.comparisons.every((item) => item.teacherReviewed), route: 'comparison' as const },
    { id: 'review-revision', label: '同组逐份核验并完成至少一处实质修正', passed: iteration, route: 'revision' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0); const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2); const coreRequirementsPassed = coreRequirements.every((item) => item.passed)
  return { dimensions, coreRequirements, total, hardGatesPassed, coreRequirementsPassed, passed: total >= 8 && hardGatesPassed && coreRequirementsPassed }
}
export function createE06Assessment(progress: E06Progress, directory: ParticipantDirectory, modificationSummary = ''): E06AssessmentRecord { const result = calculateE06Score(progress, directory); const assessedAt = new Date().toISOString(); return { assessmentId: `E06-ASSESS-${e06Hash([directory.currentParticipantId, assessedAt, progress.assessments.length])}`, assessedAt, attempt: progress.assessments.length ? 'retest' : 'initial', total: result.total, passed: result.passed, hardGatesPassed: result.hardGatesPassed, coreRequirementsPassed: result.coreRequirementsPassed, contentFingerprint: e06ContentFingerprint(progress, directory), modificationSummary: modificationSummary || progress.revisions.map((item) => `${item.documentId}.${item.field}：${item.beforeValue}→${item.afterValue}`).join('；') } }
