import { m01Answers } from '../data/m01Data'
import { reviewableParticipants } from '../training/participants'
import { buildReviewArtifacts } from './m01Review'
import type { ParticipantDirectory } from '../training/types'
import type {
  AnswerId,
  ChecklistItem,
  CorrectionRecord,
  GroupReviewRecord,
  M01Progress,
  TextAnnotation,
  ValidationResult,
} from '../types'

export function annotationsOverlap(
  existing: TextAnnotation[],
  candidate: Pick<TextAnnotation, 'answerId' | 'start' | 'end'>,
): boolean {
  return existing.some(
    (annotation) =>
      annotation.answerId === candidate.answerId &&
      candidate.start < annotation.end &&
      candidate.end > annotation.start,
  )
}

export function validateAskedAnswers(askedAnswerIds: AnswerId[]): ValidationResult {
  const missing = m01Answers.filter((answer) => !askedAnswerIds.includes(answer.id))
  return {
    valid: missing.length === 0,
    messages: missing.length === 0 ? [] : [`请先生成全部 4 份回答，尚缺：${missing.map((item) => item.id).join('、')}`],
  }
}

export function validateAnnotations(annotations: TextAnnotation[]): ValidationResult {
  const messages: string[] = []
  m01Answers.forEach((answer) => {
    const count = annotations.filter((annotation) => annotation.answerId === answer.id).length
    if (count < 3) messages.push(`回答 ${answer.id} 至少标注 3 处，当前 ${count} 处`)
  })
  return { valid: messages.length === 0, messages }
}

export function validateJudgments(annotations: TextAnnotation[]): ValidationResult {
  const messages: string[] = []
  if (annotations.length < 12) messages.push('请先完成四份回答的标注')
  const missingJudgmentCount = annotations.filter((annotation) => !annotation.judgment).length
  const missingEvidenceCount = annotations.filter((annotation) => annotation.evidenceSource.trim().length < 6).length
  if (missingJudgmentCount > 0) messages.push(`还有 ${missingJudgmentCount} 条标注尚未选择判断`)
  if (missingEvidenceCount > 0) messages.push(`还有 ${missingEvidenceCount} 条标注的依据来源不足 6 个字`)
  return { valid: messages.length === 0, messages }
}

export function getJudgmentProgress(annotations: TextAnnotation[]) {
  const judged = annotations.filter((annotation) => Boolean(annotation.judgment)).length
  const evidenced = annotations.filter((annotation) => annotation.evidenceSource.trim().length >= 6).length
  const completed = annotations.filter(
    (annotation) => Boolean(annotation.judgment) && annotation.evidenceSource.trim().length >= 6,
  ).length

  return { total: annotations.length, judged, evidenced, completed }
}

export function validateCorrections(
  annotations: TextAnnotation[],
  corrections: Record<string, CorrectionRecord>,
): ValidationResult {
  const identifiedIssues = annotations.filter((annotation) => annotation.judgment && annotation.judgment !== 'adopt')
  const actionable = annotations.filter(
    (annotation) => annotation.judgment === 'revise' || annotation.judgment === 'limit',
  )
  const complete = actionable.filter((annotation) => {
    const correction = corrections[annotation.id]
    return correction && correction.revisedContent.trim().length >= 6 && correction.reason.trim().length >= 6
  })
  const messages: string[] = []
  if (identifiedIssues.length < 3) messages.push('需识别不少于 3 处需要修正、删除或限定的内容')
  if (actionable.length < 1) messages.push('至少需要 1 条判断为“需修正”或“需限定”的内容')
  if (complete.length < 1) messages.push('至少完成 1 条教师修正记录')
  return { valid: messages.length === 0, messages }
}

export function getCorrectionProgress(
  annotations: TextAnnotation[],
  corrections: Record<string, CorrectionRecord>,
) {
  const identifiedIssues = annotations.filter((annotation) => annotation.judgment && annotation.judgment !== 'adopt')
  const actionable = annotations.filter(
    (annotation) => annotation.judgment === 'revise' || annotation.judgment === 'limit',
  )
  const complete = actionable.filter((annotation) => {
    const correction = corrections[annotation.id]
    return correction && correction.revisedContent.trim().length >= 6 && correction.reason.trim().length >= 6
  })
  const deleted = annotations.filter((annotation) => annotation.judgment === 'delete')
  return { identifiedIssues, actionable, complete, deleted }
}

export function validateGroupReview(
  review: GroupReviewRecord,
  checklist: ChecklistItem[],
  annotations: TextAnnotation[],
  corrections: Record<string, CorrectionRecord>,
  directory: ParticipantDirectory,
): ValidationResult {
  const messages: string[] = []
  const reviewMembers = reviewableParticipants(directory)
  const reviewArtifacts = buildReviewArtifacts(annotations, corrections, reviewMembers)
  if (reviewMembers.length === 0) messages.push('当前分组没有其他成员，无法完成交叉复核；请先在培训人员中调整分组')
  if (!review.reviewerRole) messages.push('请先确认本次复核承担的角色')
  if (!review.targetUserId) messages.push('请选择本组内的被复核成员')
  else if (!reviewMembers.some((member) => member.participantId === review.targetUserId)) messages.push('被复核成员已不在当前人员的同组名单中，请重新选择')
  if (reviewArtifacts.length === 0) {
    messages.push('请先在教师修正步骤完整完成至少 1 条可复核成果')
  } else if (!review.correctionAnnotationId) {
    messages.push('请选择一条由教师修正动态生成的成果')
  } else if (!reviewArtifacts.some((item) => item.id === review.correctionAnnotationId && item.targetUserId === review.targetUserId)) {
    messages.push('已关联成果已变更或不再完整，请重新选择')
  }
  if (!review.evidenceAccurate || !review.correctionReasonable) messages.push('请完成依据与修正合理性判断')
  if (!review.suggestion.trim()) messages.push('请填写复核建议')
  if (checklist.length < 8) messages.push(`小组核验清单至少 8 项，当前 ${checklist.length} 项`)
  const customItem = checklist.find((item) => !item.preset)
  if (
    !customItem ||
    [customItem.checkItem, customItem.keyPoint, customItem.typicalHallucination, customItem.response].some((value) => !value.trim())
  ) {
    messages.push('请完整填写第 8 项小组核验清单')
  }
  return { valid: messages.length === 0, messages }
}

export function progressForRoute(progress: M01Progress, directory: ParticipantDirectory): number {
  const stages = [
    progress.askedAnswerIds.length === 4,
    validateAnnotations(progress.annotations).valid,
    validateJudgments(progress.annotations).valid,
    validateCorrections(progress.annotations, progress.corrections).valid,
    validateGroupReview(progress.groupReview, progress.checklist, progress.annotations, progress.corrections, directory).valid && progress.groupReview.submitted,
  ]
  return Math.round((stages.filter(Boolean).length / stages.length) * 100)
}
