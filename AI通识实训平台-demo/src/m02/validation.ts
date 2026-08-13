import type { ParticipantDirectory } from '../training/types'
import { buildM02PeerArtifacts } from './peerArtifacts'
import {
  m02ComplianceLabels,
  m02ModelIds,
  m02RatingLabels,
} from './data'
import type {
  M02ComplianceDimension,
  M02ModelId,
  M02Progress,
  M02RatingDimension,
} from './types'

export interface M02ValidationResult { valid: boolean; messages: string[] }

export const m02ComplianceDimensions = Object.keys(m02ComplianceLabels) as M02ComplianceDimension[]
export const m02RatingDimensions = Object.keys(m02RatingLabels) as M02RatingDimension[]

export function isM02RunSucceeded(progress: M02Progress): boolean {
  return Boolean(progress.run && progress.run.status === 'succeeded' && m02ModelIds.every((id) => progress.run?.results[id]?.status === 'succeeded'))
}

export function paragraphBelongsToModel(progress: M02Progress, modelId: M02ModelId, paragraphId: string): boolean {
  return Boolean(progress.run?.results[modelId]?.paragraphs.some((item) => item.id === paragraphId))
}

export function validateM02Compliance(progress: M02Progress): M02ValidationResult {
  const messages: string[] = []
  if (!isM02RunSucceeded(progress)) messages.push('请先成功运行同一批次的两个模型')
  m02ModelIds.forEach((modelId) => {
    const missing = m02ComplianceDimensions.filter((dimension) => !progress.compliance[modelId]?.[dimension])
    if (missing.length > 0) messages.push(`模型 ${modelId} 尚缺：${missing.map((item) => m02ComplianceLabels[item]).join('、')}`)
  })
  return { valid: messages.length === 0, messages }
}

export function validateM02Ratings(progress: M02Progress): M02ValidationResult {
  const messages: string[] = []
  m02ModelIds.forEach((modelId) => {
    const incomplete = m02RatingDimensions.filter((dimension) => {
      const rating = progress.ratings[modelId]?.[dimension]
      return !rating || !rating.score || rating.score < 1 || rating.score > 5 || !paragraphBelongsToModel(progress, modelId, rating.paragraphId) || rating.reason.trim().length < 10
    })
    if (incomplete.length > 0) messages.push(`模型 ${modelId} 尚缺完整评分证据：${incomplete.map((item) => m02RatingLabels[item]).join('、')}`)
  })
  return { valid: messages.length === 0, messages }
}

export function validateM02BlindReview(progress: M02Progress): M02ValidationResult {
  const compliance = validateM02Compliance(progress)
  const ratings = validateM02Ratings(progress)
  return { valid: compliance.valid && ratings.valid, messages: [...compliance.messages, ...ratings.messages] }
}

export function validateM02Selection(progress: M02Progress): M02ValidationResult {
  const messages: string[] = []
  const selected = progress.selectedModelId
  const decision = progress.selectionDecision
  if (!progress.blindReviewSubmitted) messages.push('请先提交盲评并揭晓模型')
  if (!selected) messages.push('请选择最适合当前教学任务的模型')
  const uniqueDimensions = [...new Set(decision.evidenceDimensions)]
  if (decision.evidenceDimensions.length !== 2 || uniqueDimensions.length !== 2) messages.push('请从所选模型的五维盲评中勾选两条不同证据')
  if (selected && uniqueDimensions.some((dimension) => {
    const rating = progress.ratings[selected]?.[dimension]
    return !rating?.score || !paragraphBelongsToModel(progress, selected, rating.paragraphId) || rating.reason.trim().length < 10
  })) messages.push('所选盲评证据已失效，请重新勾选')
  if (!decision.comparedModelId || decision.comparedModelId === selected) messages.push('请选择一个未选模型作为对比对象')
  if (decision.conclusion.trim().length < 10) messages.push('综合选择结论不少于 10 个字')
  if (containsM02Overgeneralization([decision.conclusion])) messages.push('综合选择结论不能把单次结果泛化为适合所有任务')
  if (selected && (progress.ratings[selected]?.accuracy?.score ?? 0) < 4) messages.push('所选模型的准确性评分不得低于 4 分')
  return { valid: messages.length === 0, messages }
}

export function validateM02Correction(progress: M02Progress): M02ValidationResult {
  const messages: string[] = []
  const selected = progress.selectedModelId
  const correction = progress.correction
  const original = selected ? progress.run?.results[selected]?.paragraphs.find((item) => item.id === correction.paragraphId)?.content : undefined
  if (!original) messages.push('请选择所选模型中的一段原始输出')
  if (!correction.type) messages.push('请选择修改类型')
  if (correction.revisedContent.trim().length < 6) messages.push('修改后内容不少于 6 个字')
  if (original && correction.revisedContent.trim() === original.trim()) messages.push('修改后内容必须与原内容不同')
  if (correction.reason.trim().length < 10) messages.push('修改依据不少于 10 个字')
  return { valid: messages.length === 0, messages }
}

export function validateM02PeerReview(progress: M02Progress, directory: ParticipantDirectory): M02ValidationResult {
  const messages: string[] = []
  const review = progress.peerReview
  const artifacts = buildM02PeerArtifacts(directory)
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  const artifact = artifacts.find((item) => item.participantId === review.targetParticipantId && item.artifactId === review.targetArtifactId)
  if (!review.targetParticipantId) messages.push('请选择同组内的被共评成员')
  if (!artifact) messages.push('被共评成果已失效，请根据当前人员分组重新选择')
  if (!review.scoringConsistent || !review.reasonEvidenceSufficient || !review.modelChoiceReasonable) messages.push('请完成评分一致性、证据充分度和模型选择合理性判断')
  if (!review.scoreDifference) messages.push('请选择与组员评分差异最大的维度')
  if (review.scoreDifference !== 'none' && review.scoreDifferenceReason.trim().length < 6) messages.push('请填写不少于 6 个字的评分差异说明')
  if (review.suggestion.trim().length < 6) messages.push('请填写不少于 6 个字的可执行建议')
  return { valid: messages.length === 0, messages }
}

export function validateM02GroupConclusion(progress: M02Progress): M02ValidationResult {
  const conclusion = progress.groupConclusion
  const messages: string[] = []
  if (!conclusion.selectedModelId) messages.push('请选择本组认为最适合的模型')
  if (conclusion.selectionReason.trim().length < 6) messages.push('请填写本组选择理由')
  if (!conclusion.largestDifferenceDimension) messages.push('请选择本组评分差异最大的维度')
  if (conclusion.differenceExplanation.trim().length < 6) messages.push('请填写评分差异说明')
  if (conclusion.correctionConsensus.trim().length < 6) messages.push('请填写人工修改共识')
  return { valid: messages.length === 0, messages }
}

export function validateM02ReviewStage(progress: M02Progress, directory: ParticipantDirectory): M02ValidationResult {
  const peer = validateM02PeerReview(progress, directory)
  const conclusion = validateM02GroupConclusion(progress)
  if (!progress.peerReview.submitted) peer.messages.push('请提交小组共评记录')
  return { valid: peer.messages.length === 0 && conclusion.valid, messages: [...peer.messages, ...conclusion.messages] }
}

export function containsM02RiskText(values: string[]): boolean {
  const text = values.join('\n')
  const sensitive = /(?:1[3-9]\d{9})|(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})|(?:\d{17}[\dXx])/u
  return sensitive.test(text) || containsM02Overgeneralization(values)
}

export function containsM02Overgeneralization(values: string[]): boolean {
  const text = values.join('\n')
  return /(?:所有|任何|全部|一切)任务.{0,8}(?:最适合|都适合|最好|最佳)|(?:最适合|都适合|适合|最好|最佳).{0,8}(?:所有|任何|全部|一切)任务|某模型适合所有任务/u.test(text)
}

export function m02FreeTextValues(progress: M02Progress): string[] {
  return [
    ...m02ModelIds.flatMap((modelId) => m02RatingDimensions.map((dimension) => progress.ratings[modelId]?.[dimension]?.reason ?? '')),
    progress.selectionDecision.conclusion,
    progress.correction.revisedContent, progress.correction.reason,
    progress.peerReview.scoreDifferenceReason, progress.peerReview.suggestion,
    progress.groupConclusion.selectionReason, progress.groupConclusion.differenceExplanation, progress.groupConclusion.correctionConsensus,
  ]
}

export function progressForM02(progress: M02Progress, directory: ParticipantDirectory): number {
  const stages = [
    isM02RunSucceeded(progress),
    validateM02Compliance(progress).valid,
    validateM02Ratings(progress).valid && progress.blindReviewSubmitted,
    validateM02Selection(progress).valid && validateM02Correction(progress).valid,
    validateM02ReviewStage(progress, directory).valid,
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}
