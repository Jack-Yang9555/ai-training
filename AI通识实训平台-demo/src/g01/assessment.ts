import { createG01Artifacts, g01ContentFingerprint, g01CurrentStatus, validateG01Assessment } from './validation'
import type { G01AssessmentRecord, G01Progress } from './types'

export function createG01Assessment(progress: G01Progress, assessor: string, now = new Date().toISOString()): G01Progress {
  const fingerprint = g01ContentFingerprint(progress)
  const conditions = validateG01Assessment(progress)
  const failedConditionIds = conditions.filter((item) => !item.passed).map((item) => item.id)
  const artifacts = failedConditionIds.length === 0 ? createG01Artifacts(progress, now, fingerprint) : []
  const record: G01AssessmentRecord = {
    assessmentId: `G01-${progress.groupId}-${Date.parse(now) || Date.now()}-${progress.assessments.length + 1}`,
    phase: progress.assessments.length === 0 ? '初验' : '补验',
    outcome: failedConditionIds.length === 0 ? '已通过' : '未通过',
    submittedAt: now,
    assessor: assessor || '当前小组',
    method: '本地规则引擎（Demo）',
    fingerprint,
    failedConditionIds,
    conditions,
    modificationSummary: progress.assessmentModificationSummary.trim(),
    artifacts,
  }
  const next = { ...progress, artifacts, assessments: [...progress.assessments, record], assessmentModificationSummary: '', updatedAt: now }
  return { ...next, currentStatus: g01CurrentStatus(next) }
}
