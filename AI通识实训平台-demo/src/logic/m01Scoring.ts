import { m01Answers } from '../data/m01Data'
import type { ParticipantDirectory } from '../training/types'
import type { M01Progress, M01ScoreResult, ScoreDimension } from '../types'
import {
  getCorrectionProgress,
  validateAnnotations,
  validateCorrections,
  validateGroupReview,
  validateJudgments,
} from './m01Validation'

function score(valid: boolean, partial: boolean): 0 | 1 | 2 {
  if (valid) return 2
  return partial ? 1 : 0
}

export function calculateM01Score(progress: M01Progress, directory: ParticipantDirectory): M01ScoreResult {
  const annotationValidation = validateAnnotations(progress.annotations)
  const judgmentValidation = validateJudgments(progress.annotations)
  const correctionValidation = validateCorrections(progress.annotations, progress.corrections)
  const groupValidation = validateGroupReview(progress.groupReview, progress.checklist, progress.annotations, progress.corrections, directory)
  const correctionProgress = getCorrectionProgress(progress.annotations, progress.corrections)

  const completedAnswerIds = new Set(progress.annotations.map((annotation) => annotation.answerId))
  const completeCorrections = correctionProgress.complete
  const allEvidence = progress.annotations.length >= 12 && progress.annotations.every(
    (annotation) => annotation.judgment && annotation.evidenceSource.trim().length >= 6,
  )
  const safetyAnswersReviewed = (['B', 'C'] as const).every((answerId) =>
    progress.annotations.some(
      (annotation) => annotation.answerId === answerId && annotation.judgment && annotation.evidenceSource.trim().length >= 6,
    ),
  )

  const dimensions: ScoreDimension[] = [
    {
      id: 'completion',
      label: '操作完成与核心步骤',
      score: score(annotationValidation.valid && judgmentValidation.valid, completedAnswerIds.size >= 2),
      evidence: `${completedAnswerIds.size}/4 份回答已开展核验，${progress.annotations.length} 条标注`,
    },
    {
      id: 'adaptation',
      label: '教学场景适配',
      score: score(completeCorrections.length >= 3, completeCorrections.length >= 1),
      evidence: `${completeCorrections.length} 条修正已写明修正内容与理由`,
    },
    {
      id: 'evidence',
      label: '专业准确与证据',
      score: score(allEvidence, progress.annotations.some((annotation) => annotation.evidenceSource.trim().length >= 6)),
      evidence: allEvidence ? '所有标注均已给出具体判断和依据' : '仍有标注缺少判断或具体依据',
    },
    {
      id: 'iteration',
      label: '人工核验与迭代',
      score: score(correctionValidation.valid && completeCorrections.length >= 1, completeCorrections.length > 0),
      evidence: `${completeCorrections.length} 条完整教师修正记录`,
    },
    {
      id: 'safety',
      label: '隐私、版权、伦理与安全',
      score: score(safetyAnswersReviewed && groupValidation.valid, safetyAnswersReviewed),
      evidence: safetyAnswersReviewed ? '安全步骤与科研引用均有核验记录' : '回答 B、C 尚未完成重点核验',
    },
  ]

  const coreRequirements = [
    {
      id: 'all-answers',
      label: '完成全部 4 份 AI 回答的标注和判断',
      passed: annotationValidation.valid && judgmentValidation.valid,
      route: 'verification' as const,
    },
    {
      id: 'three-issues',
      label: '识别不少于 3 处需修正、需删除或需限定内容',
      passed: progress.annotations.filter((item) => item.judgment && item.judgment !== 'adopt').length >= 3,
      route: 'verification' as const,
    },
    {
      id: 'one-correction',
      label: '至少完成 1 条教师修正',
      passed: completeCorrections.length >= 1,
      route: 'corrections' as const,
    },
    {
      id: 'group-review',
      label: '完成小组交叉复核和不少于 8 项核验清单',
      passed: groupValidation.valid && progress.groupReview.submitted,
      route: 'group-review' as const,
    },
  ]

  const total = dimensions.reduce((sum, dimension) => sum + dimension.score, 0)
  return {
    dimensions,
    total,
    coreRequirements,
    passed: total >= 8 && coreRequirements.every((requirement) => requirement.passed),
  }
}

export function expectedReferenceCount(): number {
  return m01Answers.reduce((sum, answer) => sum + answer.referenceAnnotations.length, 0)
}
