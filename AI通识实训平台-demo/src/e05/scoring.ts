import type { ParticipantDirectory } from '../training/types'
import type { E05AssessmentRecord, E05Progress } from './domain'
import {
  e05Hash,
  effectiveE05Mappings,
  effectiveE05Suggestions,
} from './runner'
import {
  confirmedE05PackageIsCurrent,
  e05ContentFingerprint,
  e05SuggestionIsExecutable,
  e05UnsafeFindings,
  validateE05PeerReview,
  validateE05Revision,
  validateE05Source,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateE05Score(progress: E05Progress, directory: ParticipantDirectory) {
  const source = validateE05Source(progress)
  const review = validateE05PeerReview(progress, directory)
  const final = validateE05Revision(progress, directory)
  const tasks = progress.jobTaskDraft?.tasks ?? []
  const mappings = effectiveE05Mappings(progress)
  const suggestions = effectiveE05Suggestions(progress)
  const statuses = new Set(mappings.map((item) => item.status))
  const currentPackage = confirmedE05PackageIsCurrent(progress, directory)
  const offlineReady = Boolean(progress.webPage?.offlineTest?.passed
    && Object.values(progress.webPage.offlineTest.checks).every(Boolean))
  const structureComplete = tasks.length >= 5
    && mappings.length >= 10
    && new Set(mappings.map((item) => `${item.courseObjectiveId}|${item.jobTaskId}`)).size === mappings.length
    && statuses.size === 3
    && suggestions.length === 3
  const adapted = structureComplete
    && suggestions.every((item) => {
      const mapping = mappings.find((candidate) => candidate.mappingId === item.linkedMappingId)
      return Boolean(mapping && mapping.status !== '已覆盖' && e05SuggestionIsExecutable(item))
    })
  const evidenceValid = source.valid
    && tasks.every((item) => item.jobEvidenceExcerptId && item.teacherReviewed)
    && mappings.every((item) => item.courseEvidenceId && item.jobEvidenceExcerptId && item.courseEvidenceSummary.trim() && item.jobEvidenceSummary.trim() && item.teacherReviewed)
    && suggestions.every((item) => item.courseEvidenceId && item.jobEvidenceExcerptId && item.teacherReviewed)
  const substantive = progress.revisions.filter((item) => item.participantId === directory.currentParticipantId
    && item.sourceReviewId === progress.peerReview.recordId
    && item.beforeValue.trim() !== item.afterValue.trim()
    && item.basis.trim())
  const iterationValid = review.valid && final.valid && substantive.length >= 1 && offlineReady && (progress.webPage?.version ?? 0) >= 2
  const safe = source.valid
    && e05UnsafeFindings(progress).length === 0
    && Boolean(progress.webPage?.offlineTest?.checks.noExternalDependencies)
    && progress.teacherConfirmation.sourceAndEvidenceConfirmed
    && progress.teacherConfirmation.finalResponsibilityConfirmed

  const dimensions = [
    {
      id: 'completion' as const,
      label: '操作完成与核心步骤',
      score: scored(final.valid && currentPackage && offlineReady, Boolean(progress.mappingDraft || progress.webPage)),
      evidence: `岗位任务 ${tasks.length}/5；映射 ${mappings.length}/10；建议 ${suggestions.length}/3；离线测试${offlineReady ? '已通过' : '待完成'}`,
    },
    {
      id: 'adaptation' as const,
      label: '教学场景适配',
      score: scored(adapted, Boolean(mappings.length || suggestions.length)),
      evidence: adapted
        ? `${progress.source.course.courseName}的课程目标已与 ${tasks.length} 项岗位任务建立三类覆盖判断，恰好 3 项建议均回应已记录差距`
        : '目标—任务关系、三类状态或恰好 3 项建议仍有缺项',
    },
    {
      id: 'evidence' as const,
      label: '专业准确与证据',
      score: scored(evidenceValid && final.valid, Boolean(tasks.some((item) => item.jobEvidenceExcerptId) || mappings.some((item) => item.courseEvidenceId))),
      evidence: evidenceValid
        ? '岗位任务、每条映射与 3 项建议均有经审核的课程与岗位双侧依据'
        : '岗位任务、映射或建议仍缺已审核双侧依据与教师核验',
    },
    {
      id: 'iteration' as const,
      label: '人工核验与迭代',
      score: scored(iterationValid, Boolean(progress.peerReview.recordId || progress.revisions.length)),
      evidence: iterationValid
        ? `同组复核已提交，保存 ${substantive.length} 条实质修正，修正后单文件网页已离线复测`
        : '须完成同组复核、至少 1 条有据实质修正与修正后离线复测',
    },
    {
      id: 'safety' as const,
      label: '隐私、版权、伦理与安全',
      score: safe ? 2 as const : e05UnsafeFindings(progress).length || progress.source.jobMaterial.auditStatus !== '已审核' || !progress.source.jobMaterial.anonymized ? 0 as const : 1 as const,
      evidence: safe
        ? '岗位材料已审核、授权与脱敏，网页无外链或密钥，教师承担最终判断责任'
        : '岗位材料审核、授权脱敏、网页外部依赖或教师最终责任仍有缺项',
    },
  ]
  const coreRequirements = [
    { id: 'reviewed-sources', label: '岗位材料已审核、授权、脱敏，本人课程目标与版本完整', passed: source.valid, route: 'source' as const },
    { id: 'tasks-and-mappings', label: '不少于 5 项岗位任务和 10 条不重复、双侧有据映射', passed: structureComplete && evidenceValid, route: 'mapping' as const },
    { id: 'three-suggestions-and-html', label: '恰好 3 项建议与可筛选、可点击、可离线的单文件 HTML', passed: adapted && offlineReady, route: 'suggestions' as const },
    { id: 'review-revision-retest', label: '同组复核后至少 1 处实质修正并完成离线复测', passed: iterationValid, route: 'revision' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions
    .filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id))
    .every((item) => item.score === 2)
  const coreRequirementsPassed = coreRequirements.every((item) => item.passed)
  return { dimensions, total, coreRequirements, hardGatesPassed, coreRequirementsPassed, passed: total >= 8 && hardGatesPassed && coreRequirementsPassed }
}

export function createE05Assessment(progress: E05Progress, directory: ParticipantDirectory, modificationSummary = ''): E05AssessmentRecord {
  const result = calculateE05Score(progress, directory)
  const assessedAt = new Date().toISOString()
  return {
    assessmentId: `E05-ASSESS-${e05Hash([directory.currentParticipantId, assessedAt, progress.assessments.length])}`,
    assessedAt,
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    packageId: progress.confirmedPackage?.packageId,
    total: result.total,
    passed: result.passed,
    hardGatesPassed: result.hardGatesPassed,
    coreRequirementsPassed: result.coreRequirementsPassed,
    dimensions: structuredClone(result.dimensions),
    contentFingerprint: e05ContentFingerprint(progress, directory),
    modificationSummary: modificationSummary || progress.revisions.map((item) => `${item.targetId}.${item.field} ${item.beforeValue}→${item.afterValue}`).join('；'),
  }
}
