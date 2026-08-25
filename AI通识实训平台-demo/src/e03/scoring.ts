import type { ParticipantDirectory } from '../training/types'
import type { E03AssessmentRecord, E03Progress } from './domain'
import { e03Hash } from './runner'
import {
  confirmedE03PackageIsCurrent,
  e03ContentFingerprint,
  e03FixedLabelFindings,
  e03UnsafeIdentityFindings,
  validateE03Confirmation,
  validateE03Findings,
  validateE03Measures,
  validateE03PeerReview,
  validateE03Revision,
  validateE03Source,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateE03Score(progress: E03Progress, directory: ParticipantDirectory) {
  const source = validateE03Source(progress)
  const findings = validateE03Findings(progress, directory.currentParticipantId)
  const measures = validateE03Measures(progress, directory.currentParticipantId)
  const peer = validateE03PeerReview(progress, directory)
  const revision = validateE03Revision(progress, directory)
  const confirmation = validateE03Confirmation(progress, directory)
  const currentPackage = confirmedE03PackageIsCurrent(progress, directory)
  const exactFindings = progress.workingFindings.length === 3
    && new Set(progress.workingFindings.map((item) => item.findingId)).size === 3
  const exactMeasures = progress.workingMeasures?.measures.length === 2
    && new Set(progress.workingMeasures.measures.map((item) => item.measureId)).size === 2
  const measuresLinked = Boolean(progress.workingMeasures?.measures.every((item) => item.linkedFindingIds.length > 0))
  const adapted = source.valid && measures.valid && exactMeasures && measuresLinked
  const evidenceValid = source.valid && findings.valid && exactFindings
  const iterationValid = peer.valid && revision.valid && progress.revisions.length >= 1
  const finalLabelText = [
    ...progress.workingFindings.map((item) => item.observedFact),
    ...(progress.workingMeasures?.measures ?? []).flatMap((item) => [item.teacherAction, item.observableStudentBehavior, item.checkMethod]),
  ].join('\n')
  const unsafe = e03UnsafeIdentityFindings(progress)
  const fixedLabels = e03FixedLabelFindings(finalLabelText)
  const safe = source.valid
    && unsafe.length === 0
    && fixedLabels.length === 0
    && progress.teacherConfirmation.noRealIdentityConfirmed
    && progress.teacherConfirmation.noFixedLabelsConfirmed
    && progress.teacherConfirmation.finalResponsibilityConfirmed

  const dimensions = [
    {
      id: 'completion' as const,
      label: '操作完成与核心步骤',
      score: scored(confirmation.valid && currentPackage, Boolean(progress.aiDraft || progress.measureDraft || progress.workingMeasures)),
      evidence: `课堂发现 ${progress.workingFindings.length}/3；改进措施 ${progress.workingMeasures?.measures.length ?? 0}/2；固定成果 ${progress.confirmedPackage?.artifacts.length ?? 0}/2`,
    },
    {
      id: 'adaptation' as const,
      label: '教学场景适配',
      score: scored(adapted, Boolean(progress.source.teachingGoal.trim() || progress.measureDraft)),
      evidence: adapted ? '两条措施均关联当前课堂发现，包含实施阶段、教师动作、学生可观察行为和检查方法' : '两条措施与当前教学目标、课堂发现或下一课执行字段仍未闭合',
    },
    {
      id: 'evidence' as const,
      label: '专业准确与证据',
      score: scored(evidenceValid, Boolean(progress.aiDraft || progress.workingFindings.length)),
      evidence: evidenceValid ? 'F01–F03 均可打开当前记录片段，观察事实与待确认解释边界清楚' : '三条发现的来源定位、事实边界或逐条教师核验仍有缺项',
    },
    {
      id: 'iteration' as const,
      label: '人工核验与迭代',
      score: scored(iterationValid, Boolean(progress.peerReview.recordId || progress.revisions.length)),
      evidence: iterationValid ? `两条措施已逐项同组复核，保存 ${progress.revisions.length} 条措施修改前后与反馈来源` : '须由当前同组其他成员逐项复核，并依据反馈实质修改至少一条措施',
    },
    {
      id: 'safety' as const,
      label: '隐私、版权、伦理与安全',
      score: safe ? 2 as const : unsafe.length > 0 || fixedLabels.length > 0 ? 0 as const : 1 as const,
      evidence: safe ? '记录不含真实身份，观察事实和改进措施不把一次表现固化为态度、能力、动机或长期标签' : unsafe.length || fixedLabels.length ? `仍检测到：${[...unsafe, ...fixedLabels].join('、')}` : '匿名化、无固定标签或教师最终责任仍有确认缺项',
    },
  ]
  const coreRequirements = [
    { id: 'three-traceable-findings', label: '恰好 3 条发现均分离观察事实、原记录位置与待确认解释', passed: evidenceValid, route: 'findings' as const },
    { id: 'two-actionable-measures', label: '恰好 2 条下一次课措施均具体、可执行、可观察并关联发现', passed: adapted, route: 'revision' as const },
    { id: 'peer-revision-loop', label: '同组他人逐项复核，作者保存至少 1 条措施修改前后与反馈来源', passed: iterationValid, route: 'revision' as const },
    { id: 'exact-two-artifacts', label: '教师逐项确认后形成恰好 2 项固定成果', passed: currentPackage, route: 'confirmation' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions
    .filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id))
    .every((item) => item.score === 2)
  const coreRequirementsPassed = coreRequirements.every((item) => item.passed)
  return {
    dimensions,
    total,
    coreRequirements,
    hardGatesPassed,
    coreRequirementsPassed,
    passed: total >= 8 && hardGatesPassed && coreRequirementsPassed,
  }
}

export function createE03Assessment(
  progress: E03Progress,
  directory: ParticipantDirectory,
  modificationSummary = '',
): E03AssessmentRecord {
  const result = calculateE03Score(progress, directory)
  const assessedAt = new Date().toISOString()
  const defaultSummary = progress.revisions
    .map((item) => `${item.measureId}：${item.before.teacherAction} → ${item.after.teacherAction}`)
    .join('；')
  return {
    assessmentId: `E03-ASSESS-${e03Hash([directory.currentParticipantId, assessedAt, progress.assessments.length])}`,
    assessedAt,
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    total: result.total,
    passed: result.passed,
    hardGatesPassed: result.hardGatesPassed,
    coreRequirementsPassed: result.coreRequirementsPassed,
    dimensions: structuredClone(result.dimensions),
    contentFingerprint: e03ContentFingerprint(progress, directory),
    modificationSummary: modificationSummary || defaultSummary,
  }
}
