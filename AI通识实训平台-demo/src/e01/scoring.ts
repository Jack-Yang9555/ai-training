import type { ParticipantDirectory } from '../training/types'
import type { E01AssessmentRecord, E01Progress } from './domain'
import { e01Hash } from './runner'
import {
  confirmedE01PackageIsCurrent,
  e01ContentFingerprint,
  e01FeedbackIsActionable,
  e01UnsafeFindings,
  validateE01AiReview,
  validateE01Confirmation,
  validateE01Input,
  validateE01PeerReview,
  validateE01Rubric,
  validateE01TeacherReview,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateE01Score(progress: E01Progress, directory: ParticipantDirectory) {
  const input = validateE01Input(progress)
  const rubric = validateE01Rubric(progress)
  const ai = validateE01AiReview(progress, directory.currentParticipantId)
  const teacher = validateE01TeacherReview(progress, directory.currentParticipantId)
  const peer = validateE01PeerReview(progress, directory)
  const confirmation = validateE01Confirmation(progress, directory)
  const currentPackage = confirmedE01PackageIsCurrent(progress, directory)
  const reviewedCount = progress.teacherReviews.filter((item) => item.reviewed).length
  const a04Correction = progress.corrections.find((item) => item.answerId === 'A04' && item.dimensionId === 'evidence-use' && item.beforeScore === 3 && item.afterScore === 2 && e01FeedbackIsActionable(item.afterNextStep))
  const scenarioAdapted = Boolean(progress.scenario.courseName.trim()
    && progress.scenario.learningObjective.trim()
    && progress.scenario.gradingRequirement.trim()
    && progress.scenario.assignmentPrompt.trim()
    && progress.rubric.dimensions.every((item) => item.linkedObjective.trim() === progress.scenario.learningObjective.trim()))
  const evidenceValid = teacher.valid && Boolean(a04Correction)
  const iterationValid = teacher.valid && peer.valid && reviewedCount === 5 && Boolean(a04Correction)
  const safe = input.valid
    && e01UnsafeFindings(progress).length === 0
    && progress.teacherConfirmation.privacyConfirmed
    && progress.teacherConfirmation.aiNotFinalConfirmed
    && progress.teacherConfirmation.finalResponsibilityConfirmed

  const dimensions = [
    {
      id: 'completion' as const,
      label: '操作完成与核心步骤',
      score: scored(rubric.valid && ai.valid && teacher.valid && peer.valid && confirmation.valid && currentPackage, progress.aiReviews.length === 5 || reviewedCount > 0),
      evidence: `四维量规 ${rubric.valid ? '有效' : '待完善'}；初评 ${progress.aiReviews.length}/5；人工复核 ${reviewedCount}/5；固定成果 ${progress.confirmedPackage?.artifacts.length ?? 0}/2`,
    },
    {
      id: 'adaptation' as const,
      label: '教学场景适配',
      score: scored(scenarioAdapted && rubric.valid, Boolean(progress.scenario.courseName.trim() || progress.scenario.learningObjective.trim())),
      evidence: scenarioAdapted ? `${progress.scenario.courseName}：量规四维均关联当前学习目标与评分要求` : '课程目标、作业或量规关联仍需补齐',
    },
    {
      id: 'evidence' as const,
      label: '专业准确与证据',
      score: scored(evidenceValid, progress.teacherReviews.some((item) => item.finalDimensionScores.some((score) => score.evidenceExcerpt.trim()))),
      evidence: evidenceValid ? '五份最终结果均逐维引用作答证据；A04“证据使用”已由 3 分修正为 2 分' : '五份结果的证据定位或 A04 专业修正尚未通过',
    },
    {
      id: 'iteration' as const,
      label: '人工核验与迭代',
      score: scored(iterationValid, reviewedCount > 0 || progress.corrections.length > 0),
      evidence: iterationValid ? '五份结果已逐项人工复核，保留实质修正，并闭环处理同组意见' : `已复核 ${reviewedCount}/5；须完成关联作答与维度的实质修改及同组意见闭环`,
    },
    {
      id: 'safety' as const,
      label: '隐私、版权、伦理与安全',
      score: safe ? 2 as const : e01UnsafeFindings(progress).length > 0 || progress.answers.some((item) => !item.fictional || !item.anonymous) ? 0 as const : 1 as const,
      evidence: safe ? '仅使用固定虚构匿名作答；教师确认 AI 不替代最终评价并承担最终责任' : '匿名边界、隐私确认或教师最终责任仍有缺项',
    },
  ]
  const coreRequirements = [
    { id: 'four-dimension-five-results', label: '同一版本四维量规完成 A01—A05 五份确定性初评', passed: rubric.valid && ai.valid, route: 'ai-review' as const },
    { id: 'five-review-correction', label: '逐项复核五份结果并完成 A04“证据使用”3→2实质修正', passed: teacher.valid, route: 'teacher-review' as const },
    { id: 'same-group-review', label: '当前同组其他成员完成一份结果复核并由作者处理意见', passed: peer.valid, route: 'peer-confirm' as const },
    { id: 'teacher-confirmed-artifacts', label: '教师确认最终责任并形成恰好两类固定成果', passed: confirmation.valid && currentPackage, route: 'result' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createE01Assessment(progress: E01Progress, directory: ParticipantDirectory, modificationSummary = ''): E01AssessmentRecord {
  const result = calculateE01Score(progress, directory)
  const assessedAt = new Date().toISOString()
  return {
    assessmentId: `E01-ASSESS-${e01Hash([directory.currentParticipantId, assessedAt, progress.assessments.length])}`,
    assessedAt,
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    total: result.total,
    passed: result.passed,
    hardGatesPassed: result.hardGatesPassed,
    dimensions: structuredClone(result.dimensions),
    contentFingerprint: e01ContentFingerprint(progress, directory),
    modificationSummary,
  }
}
