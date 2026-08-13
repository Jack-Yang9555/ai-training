import type { ParticipantDirectory } from '../training/types'
import { containsM03SensitiveInformation, m03CurrentFingerprint, m03SnapshotTextValues, validateM03Comparison, validateM03Design, validateM03Iteration, validateM03PeerReview, validateM03ProfessionalEvidence, validateM03Verification } from './validation'
import { m03VariableLabels } from './data'
import type { M03AssessmentSnapshot, M03Progress, M03ScoreResult } from './types'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 {
  if (valid) return 2
  return partial ? 1 : 0
}

function allFreeText(progress: M03Progress): string[] {
  return [
    ...m03SnapshotTextValues(progress.design),
    ...(progress.iterationDraft ? m03SnapshotTextValues(progress.iterationDraft) : []),
    progress.comparison.changeExplanation, progress.comparison.suitabilityConclusion,
    ...Object.values(progress.verification).flatMap((item) => [item.materialEvidence, item.conclusion]),
    progress.peerReview.suggestion,
  ]
}

export function calculateM03Score(progress: M03Progress, directory: ParticipantDirectory): M03ScoreResult {
  const design = validateM03Design(progress.design)
  const iteration = validateM03Iteration(progress)
  const comparison = validateM03Comparison(progress)
  const professional = validateM03ProfessionalEvidence(progress)
  const peer = validateM03PeerReview(progress, directory)
  const verificationComplete = (['v1', 'v2'] as const).filter((version) => validateM03Verification(progress, version).valid).length
  const noSensitiveInformation = !containsM03SensitiveInformation(allFreeText(progress))
  const safetyConfirmed = progress.v1?.snapshot.rightsConfirmed && progress.v1.snapshot.privacyConfirmed && progress.v2?.snapshot.rightsConfirmed && progress.v2.snapshot.privacyConfirmed

  const dimensions: M03ScoreResult['dimensions'] = [
    {
      id: 'completion', label: '操作完成与核心步骤',
      score: scored(design.valid && Boolean(progress.v1 && progress.v2) && comparison.valid, Boolean(progress.v1 || progress.v2)),
      evidence: `六格${design.valid ? '完整' : '待补'}，已生成 ${Number(Boolean(progress.v1)) + Number(Boolean(progress.v2))}/2 个版本`,
    },
    {
      id: 'adaptation', label: '教学场景适配',
      score: scored(Boolean(progress.v1 && progress.v2 && progress.v1.snapshot.audience.trim() && progress.v1.snapshot.studentFoundation.trim() && progress.v1.snapshot.objective.trim() && progress.v1.snapshot.duration && progress.v1.snapshot.outputFormat), design.valid),
      evidence: progress.v1 ? `已明确对象、基础、目标、${progress.v1.snapshot.duration} 分钟和${progress.v1.snapshot.outputFormat}` : '尚未形成可核验的 V1 场景快照',
    },
    {
      id: 'evidence', label: '专业准确与证据',
      score: scored(professional.valid, verificationComplete >= 1),
      evidence: `完成 ${verificationComplete}/2 个版本的段落—材料—目标核验${professional.valid ? '，结果均一致' : ''}`,
    },
    {
      id: 'iteration', label: '人工核验与迭代',
      score: scored(iteration.valid && comparison.valid && Boolean(progress.v2), Boolean(progress.iterationVariable || progress.comparison.changeExplanation.trim())),
      evidence: progress.iterationVariable ? `仅调整${m03VariableLabels[progress.iterationVariable]}，版本与变化说明${comparison.valid ? '齐全' : '待补'}` : '尚未建立单变量迭代',
    },
    {
      id: 'safety', label: '隐私、版权、伦理与安全',
      score: safetyConfirmed && noSensitiveInformation && peer.valid ? 2 : noSensitiveInformation ? 1 : 0,
      evidence: noSensitiveInformation ? (safetyConfirmed ? '两版均保留材料权属与隐私确认，未发现敏感信息' : '未发现敏感信息，材料确认仍需补齐') : '发现可能的真实个人敏感信息',
    },
  ]

  const coreRequirements: M03ScoreResult['coreRequirements'] = [
    { id: 'two-versions', label: '六格完整并生成 V1、V2 两个锁定版本', passed: design.valid && Boolean(progress.v1 && progress.v2), route: 'v1' },
    { id: 'single-variable', label: 'V2 只调整一个指定变量', passed: iteration.valid && Boolean(progress.v2), route: 'iteration' },
    { id: 'evidence', label: '两版均完成材料范围与教学目标核验', passed: professional.valid, route: 'compare' },
    { id: 'peer-review', label: '提交有效的同组成员互评', passed: peer.valid, route: 'peer-review' },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGateIds = new Set(['evidence', 'iteration', 'safety'])
  const hardGatesPassed = dimensions.filter((item) => hardGateIds.has(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createM03Assessment(progress: M03Progress, directory: ParticipantDirectory): M03AssessmentSnapshot {
  const result = calculateM03Score(progress, directory)
  return {
    assessmentId: `m03-assessment-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    engine: '本地规则引擎（Demo）',
    fingerprint: m03CurrentFingerprint(progress, directory),
    modificationSummary: progress.assessmentModificationSummary.trim(),
    total: result.total,
    dimensionScores: Object.fromEntries(result.dimensions.map((item) => [item.id, item.score])) as M03AssessmentSnapshot['dimensionScores'],
    coreRequirementPasses: Object.fromEntries(result.coreRequirements.map((item) => [item.id, item.passed])),
    passed: result.passed,
  }
}
