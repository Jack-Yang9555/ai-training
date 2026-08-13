import { describe, expect, it } from 'vitest'
import { presetChecklist } from '../src/data/checklistData'
import { m01Answers } from '../src/data/m01Data'
import { calculateM01Score } from '../src/logic/m01Scoring'
import { buildReviewArtifacts } from '../src/logic/m01Review'
import { sampleCurrentParticipantId, sampleParticipants } from '../src/data/trainingParticipants'
import { createParticipantDirectory, reviewableParticipants } from '../src/training/participants'
import { createInitialProgress } from '../src/storage/m01Storage'
import type { AnswerId, ChecklistItem, CorrectionRecord, TextAnnotation } from '../src/types'

function completedProgress() {
  const progress = createInitialProgress()
  const annotations: TextAnnotation[] = []
  const corrections: Record<string, CorrectionRecord> = {}
  m01Answers.forEach((answer) => {
    answer.referenceAnnotations.forEach((reference, index) => {
      const start = answer.answer.indexOf(reference.text)
      const id = `${answer.id}-${index}`
      annotations.push({ id, answerId: answer.id, start, end: start + reference.text.length, text: reference.text, type: reference.type, judgment: reference.judgment, evidenceSource: reference.evidenceSource })
      if ((reference.judgment === 'revise' || reference.judgment === 'limit') && reference.revisedContent && reference.reason) {
        corrections[id] = { annotationId: id, problemType: reference.problemType ?? '编造内容', revisedContent: reference.revisedContent, reason: reference.reason }
      }
    })
  })
  const custom: ChecklistItem = { id: 'custom-8', checkItem: '隐私信息', keyPoint: '检查个人标识', typicalHallucination: '输出真实学号', response: '匿名化处理', preset: false }
  const directory = createParticipantDirectory(sampleParticipants, 'test.csv')
  directory.currentParticipantId = sampleCurrentParticipantId
  const firstReviewArtifact = buildReviewArtifacts(annotations, corrections, reviewableParticipants(directory))[0]
  return {
    ...progress,
    askedAnswerIds: ['A', 'B', 'C', 'D'] as AnswerId[],
    annotations,
    corrections,
    checklist: [...presetChecklist, custom],
    groupReview: {
      reviewerRole: '核验员' as const,
      targetUserId: firstReviewArtifact.targetUserId,
      correctionAnnotationId: firstReviewArtifact.id,
      evidenceAccurate: '准确' as const,
      correctionReasonable: '合理' as const,
      omissions: '暂无其他遗漏',
      suggestion: '建议保留官网检索日期',
      submitted: true,
    },
  }
}

describe('M01 评分', () => {
  const directory = createParticipantDirectory(sampleParticipants, 'test.csv')
  directory.currentParticipantId = sampleCurrentParticipantId

  it('完整过程获得满分并通过核心要求', () => {
    const result = calculateM01Score(completedProgress(), directory)
    expect(result.total).toBe(10)
    expect(result.passed).toBe(true)
    expect(result.coreRequirements.every((item) => item.passed)).toBe(true)
  })

  it('初始状态不通过', () => {
    const result = calculateM01Score(createInitialProgress(), directory)
    expect(result.total).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('当前人员换组后旧复核关系失效，不能沿用原通过结果', () => {
    const changedDirectory = { ...directory, currentParticipantId: 'T007' }
    const result = calculateM01Score(completedProgress(), changedDirectory)
    expect(result.coreRequirements.find((item) => item.id === 'group-review')?.passed).toBe(false)
    expect(result.passed).toBe(false)
  })
})
