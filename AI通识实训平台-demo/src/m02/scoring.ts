import type { ParticipantDirectory } from '../training/types'
import { m02ComplianceReference, m02ModelIds, m02RatingReference } from './data'
import type { M02Progress, M02ScoreResult } from './types'
import {
  containsM02RiskText,
  m02ComplianceDimensions,
  m02FreeTextValues,
  m02RatingDimensions,
  validateM02BlindReview,
  validateM02Compliance,
  validateM02Correction,
  validateM02Ratings,
  validateM02ReviewStage,
  validateM02Selection,
  isM02RunSucceeded,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 {
  if (valid) return 2
  return partial ? 1 : 0
}

export function calculateM02Score(progress: M02Progress, directory: ParticipantDirectory): M02ScoreResult {
  const compliance = validateM02Compliance(progress)
  const ratings = validateM02Ratings(progress)
  const selection = validateM02Selection(progress)
  const correction = validateM02Correction(progress)
  const review = validateM02ReviewStage(progress, directory)
  const correctChecks = m02ModelIds.flatMap((modelId) => m02ComplianceDimensions.map((dimension) => progress.compliance[modelId]?.[dimension] === m02ComplianceReference[modelId][dimension])).filter(Boolean).length
  const completedChecks = m02ModelIds.flatMap((modelId) => m02ComplianceDimensions.map((dimension) => Boolean(progress.compliance[modelId]?.[dimension]))).filter(Boolean).length
  const reasonableRatings = m02ModelIds.flatMap((modelId) => m02RatingDimensions.map((dimension) => {
    const score = progress.ratings[modelId]?.[dimension]?.score
    return Boolean(score && Math.abs(score - m02RatingReference[modelId][dimension]) <= 1)
  })).filter(Boolean).length
  const completeModels = m02ModelIds.filter((modelId) => m02RatingDimensions.every((dimension) => {
    const rating = progress.ratings[modelId]?.[dimension]
    return rating?.score && rating.paragraphId && rating.reason.trim().length >= 10
  })).length
  const selected = progress.selectedModelId
  const freeTexts = m02FreeTextValues(progress)
  const hasRisk = containsM02RiskText(freeTexts)
  const allRequiredTextComplete = selection.valid && correction.valid && review.valid

  const dimensions: M02ScoreResult['dimensions'] = [
    {
      id: 'completion', label: '操作完成与核心步骤',
      score: scored(compliance.valid && ratings.valid && progress.blindReviewSubmitted, isM02RunSucceeded(progress) && completeModels >= 1),
      evidence: `遵循检查 ${completedChecks}/8，完整评价 ${completeModels}/2 个模型`,
    },
    {
      id: 'adaptation', label: '教学场景适配',
      score: selected === 'A' && selection.valid ? 2 : selected && selection.valid ? 1 : 0,
      evidence: selected ? `已选择模型 ${selected}，盲评证据复用与综合结论${selection.valid ? '完整' : '仍需补充'}` : '尚未完成模型选择',
    },
    {
      id: 'evidence', label: '专业准确与证据',
      score: scored(correctChecks === 8 && reasonableRatings >= 8, correctChecks >= 6 && reasonableRatings >= 7),
      evidence: `参照判断正确 ${correctChecks}/8，合理评分 ${reasonableRatings}/10`,
    },
    {
      id: 'iteration', label: '人工核验与迭代',
      score: scored(correction.valid, Boolean(progress.correction.paragraphId || progress.correction.revisedContent.trim())),
      evidence: correction.valid ? '已保留一处可追溯的人工修改前后记录' : '人工修改记录仍不完整',
    },
    {
      id: 'safety', label: '隐私、版权、伦理与安全',
      score: hasRisk ? 0 : allRequiredTextComplete ? 2 : 1,
      evidence: hasRisk ? '自由文本包含敏感信息或模型泛化断言' : '未发现敏感信息或“适合所有任务”式泛化',
    },
  ]

  const coreRequirements: M02ScoreResult['coreRequirements'] = [
    { id: 'blind-review', label: '完成 8 项检查和 10 项带证据评分', passed: validateM02BlindReview(progress).valid && progress.blindReviewSubmitted, route: 'rating' },
    { id: 'model-choice', label: '复用两条盲评证据完成模型选择，且准确性不低于 4 分', passed: selection.valid, route: 'rating' },
    { id: 'one-correction', label: '完成至少一处人工修正', passed: correction.valid, route: 'rating' },
    { id: 'peer-review', label: '提交有效组员共评和四项小组结论', passed: review.valid, route: 'peer-review' },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  return { dimensions, total, coreRequirements, passed: total >= 8 && coreRequirements.every((item) => item.passed) }
}
