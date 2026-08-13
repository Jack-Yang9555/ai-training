import { m01Answers } from '../data/m01Data'
import type { TrainingParticipant } from '../training/types'
import type { CorrectionRecord, TextAnnotation } from '../types'

export interface ReviewArtifact {
  id: string
  targetUserId: string
  title: string
  original: string
  revised: string
  evidence: string
  reason: string
}

export function buildReviewArtifacts(
  annotations: TextAnnotation[],
  corrections: Record<string, CorrectionRecord>,
  reviewableMembers: TrainingParticipant[],
): ReviewArtifact[] {
  if (reviewableMembers.length === 0) return []
  return annotations.flatMap((annotation) => {
    if (annotation.judgment !== 'revise' && annotation.judgment !== 'limit') return []
    const correction = corrections[annotation.id]
    if (!correction || correction.revisedContent.trim().length < 6 || correction.reason.trim().length < 6) return []
    const answer = m01Answers.find((item) => item.id === annotation.answerId)
    const answerIndex = m01Answers.findIndex((item) => item.id === annotation.answerId)
    const simulatedContributor = reviewableMembers[answerIndex % reviewableMembers.length]
    return [{
      id: annotation.id,
      targetUserId: simulatedContributor.participantId,
      title: `回答 ${annotation.answerId} · ${answer?.scene ?? '教学场景'} · ${correction.problemType}`,
      original: annotation.text,
      revised: correction.revisedContent,
      evidence: annotation.evidenceSource,
      reason: correction.reason,
    }]
  })
}
