import type { Judgment, OverallJudgment, TextAnnotation } from '../types'

export function summarizeJudgments(annotations: TextAnnotation[]): OverallJudgment[] {
  const judgments = new Set(annotations.map((annotation) => annotation.judgment).filter(Boolean) as Judgment[])
  const result: OverallJudgment[] = []

  if (judgments.has('revise')) result.push('含错误')
  if (judgments.has('delete')) result.push('含编造')
  if (judgments.has('limit')) result.push('含过度推断')
  if (result.length === 0 && annotations.length > 0 && judgments.size === 1 && judgments.has('adopt')) {
    result.push('可采用')
  }

  return result
}
