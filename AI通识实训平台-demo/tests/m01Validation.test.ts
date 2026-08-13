import { describe, expect, it } from 'vitest'
import { summarizeJudgments } from '../src/logic/m01Summary'
import { annotationsOverlap, getCorrectionProgress, getJudgmentProgress, validateAnnotations, validateCorrections, validateJudgments } from '../src/logic/m01Validation'
import type { TextAnnotation } from '../src/types'

const baseAnnotation: TextAnnotation = {
  id: 'a1',
  answerId: 'A',
  start: 10,
  end: 20,
  text: '示例标注',
  type: 'rule',
  judgment: 'delete',
  evidenceSource: '教育部官网政策文件检索',
}

describe('M01 标注与汇总规则', () => {
  it('拒绝同一回答中的重叠标注，但允许相邻标注', () => {
    expect(annotationsOverlap([baseAnnotation], { answerId: 'A', start: 15, end: 25 })).toBe(true)
    expect(annotationsOverlap([baseAnnotation], { answerId: 'A', start: 20, end: 25 })).toBe(false)
    expect(annotationsOverlap([baseAnnotation], { answerId: 'B', start: 15, end: 25 })).toBe(false)
  })

  it('要求每份回答至少三处标注', () => {
    const annotations = (['A', 'B', 'C', 'D'] as const).flatMap((answerId) =>
      [0, 1, 2].map((index) => ({ ...baseAnnotation, id: `${answerId}-${index}`, answerId, start: index * 10, end: index * 10 + 5 })),
    )
    expect(validateAnnotations(annotations).valid).toBe(true)
    expect(validateAnnotations(annotations.slice(1)).messages).toContain('回答 A 至少标注 3 处，当前 2 处')
  })

  it('总体判断允许同时出现错误、编造和过度推断', () => {
    const annotations: TextAnnotation[] = [
      baseAnnotation,
      { ...baseAnnotation, id: 'a2', judgment: 'revise' },
      { ...baseAnnotation, id: 'a3', judgment: 'limit' },
    ]
    expect(summarizeJudgments(annotations)).toEqual(['含错误', '含编造', '含过度推断'])
  })

  it('分别反馈未选判断和依据不足，操作后计数实时变化', () => {
    const annotations: TextAnnotation[] = [
      { ...baseAnnotation, id: 'a1', judgment: undefined, evidenceSource: '' },
      { ...baseAnnotation, id: 'a2', judgment: 'delete', evidenceSource: '' },
      { ...baseAnnotation, id: 'a3', judgment: 'limit', evidenceSource: '教育部官方网站' },
    ]

    expect(validateJudgments(annotations).messages).toEqual([
      '请先完成四份回答的标注',
      '还有 1 条标注尚未选择判断',
      '还有 2 条标注的依据来源不足 6 个字',
    ])
    expect(getJudgmentProgress(annotations)).toEqual({ total: 3, judged: 2, evidenced: 1, completed: 1 })
  })

  it('需删除内容不进入教师修订，也不计入修订完成数', () => {
    const annotations: TextAnnotation[] = [
      { ...baseAnnotation, id: 'delete-1', judgment: 'delete' },
      { ...baseAnnotation, id: 'delete-2', judgment: 'delete' },
      { ...baseAnnotation, id: 'revise-1', judgment: 'revise' },
    ]
    const corrections = {
      'delete-1': { annotationId: 'delete-1', problemType: '编造内容' as const, revisedContent: '旧版错误数据仍有修订', reason: '该记录应当被忽略' },
      'revise-1': { annotationId: 'revise-1', problemType: '错误步骤' as const, revisedContent: '修改后的正确内容', reason: '依据权威规范完成修改' },
    }

    const progress = getCorrectionProgress(annotations, corrections)
    expect(progress.identifiedIssues).toHaveLength(3)
    expect(progress.deleted).toHaveLength(2)
    expect(progress.actionable.map((item) => item.id)).toEqual(['revise-1'])
    expect(progress.complete.map((item) => item.id)).toEqual(['revise-1'])
    expect(validateCorrections(annotations, corrections).valid).toBe(true)
  })
})
