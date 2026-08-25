import type { ParticipantDirectory } from '../training/types'
import type {
  E04AssessmentRecord,
  E04GraphDraft,
  E04Progress,
  E04RelationType,
} from './domain'
import { e04Hash } from './runner'
import {
  confirmedE04PackageIsCurrent,
  diagnoseE04Graph,
  e04ContentFingerprint,
  e04UnsafeFindings,
  validateE04GraphReview,
  validateE04Revision,
  validateE04Source,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

function hasPathOfLength(graph: E04GraphDraft | undefined, type: E04RelationType, minimumEdges: number) {
  if (!graph) return false
  const edges = graph.relations.filter((item) => item.type === type)
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) adjacency.set(edge.sourceNodeId, [...(adjacency.get(edge.sourceNodeId) ?? []), edge.targetNodeId])
  function visit(nodeId: string, depth: number, seen: Set<string>): boolean {
    if (depth >= minimumEdges) return true
    return (adjacency.get(nodeId) ?? []).some((target) => !seen.has(target) && visit(target, depth + 1, new Set([...seen, target])))
  }
  return graph.nodes.some((item) => visit(item.nodeId, 0, new Set([item.nodeId])))
}

export function calculateE04Score(progress: E04Progress, directory: ParticipantDirectory) {
  const source = validateE04Source(progress)
  const review = validateE04GraphReview(progress, directory)
  const finalGraph = validateE04Revision(progress, directory)
  const graph = progress.workingGraph
  const diagnostics = diagnoseE04Graph(graph, progress)
  const currentPackage = confirmedE04PackageIsCurrent(progress, directory)
  const relationTypes = new Set(graph?.relations.map((item) => item.type) ?? [])
  const graphComplete = Boolean(graph
    && graph.nodes.length >= 15
    && graph.relations.length >= 20
    && relationTypes.size >= 3)
  const graphClean = Boolean(graph
    && diagnostics.duplicateNodeGroups.length === 0
    && diagnostics.duplicateRelationIds.length === 0
    && diagnostics.selfLoopRelationIds.length === 0
    && diagnostics.orphanNodeIds.length === 0
    && diagnostics.unsupportedRelationIds.length === 0)
  const focusAvailable = Boolean(graph
    && graph.focusNodeIds.length > 0
    && graph.focusNodeIds.every((id) => graph.nodes.some((item) => item.nodeId === id)))
  const learningPathsAvailable = hasPathOfLength(graph, '先修', 2)
    && hasPathOfLength(graph, '应用', 2)
  const evidenceValid = Boolean(source.valid
    && graph
    && graph.nodes.every((item) => item.sourceExcerptId && item.teacherReviewed)
    && graph.relations.every((item) => item.sourceExcerptId && item.rationale.trim() && item.teacherReviewed)
    && graphClean)
  const substantiveRevisions = progress.revisions.filter((item) => item.participantId === directory.currentParticipantId
    && item.sourceReviewId === progress.graphReview.recordId
    && item.beforeValue.trim() !== item.afterValue.trim()
    && item.basis.trim())
  const distinctRevisionTargets = new Set(substantiveRevisions.map((item) => `${item.targetKind}:${item.targetId}`))
  const iterationValid = review.valid && finalGraph.valid && substantiveRevisions.length >= 2 && distinctRevisionTargets.size >= 2
  const safe = source.valid
    && e04UnsafeFindings(progress).length === 0
    && progress.teacherConfirmation.sourceAndEvidenceConfirmed
    && progress.teacherConfirmation.finalResponsibilityConfirmed

  const dimensions = [
    {
      id: 'completion' as const,
      label: '操作完成与核心步骤',
      score: scored(finalGraph.valid && currentPackage, Boolean(progress.aiDraft || graph)),
      evidence: `节点 ${graph?.nodes.length ?? 0}/15；关系 ${graph?.relations.length ?? 0}/20；关系类型 ${relationTypes.size}/3；固定成果 ${progress.confirmedPackage?.artifacts.length ?? 0}/3`,
    },
    {
      id: 'adaptation' as const,
      label: '教学场景适配',
      score: scored(source.valid && focusAvailable && learningPathsAvailable, Boolean(graph?.focusNodeIds.length || graph?.relations.length)),
      evidence: focusAvailable && learningPathsAvailable
        ? `课程重点 ${graph?.focusNodeIds.join('、')}、两段先修链与应用路径均可从当前数据打开`
        : '课程重点、先修链或应用路径仍需补齐',
    },
    {
      id: 'evidence' as const,
      label: '专业准确与证据',
      score: scored(evidenceValid, Boolean(graph?.nodes.some((item) => item.sourceExcerptId) || graph?.relations.some((item) => item.sourceExcerptId))),
      evidence: evidenceValid
        ? '所有节点和关系均定位到当前课程片段，且无重复、自环、孤立或无依据项'
        : '节点或关系的来源、方向或图质量检查仍有缺项',
    },
    {
      id: 'iteration' as const,
      label: '人工核验与迭代',
      score: scored(iterationValid, Boolean(progress.graphReview.recordId || progress.revisions.length)),
      evidence: iterationValid
        ? `同组方向及遗漏复核已提交，保存 ${substantiveRevisions.length} 条可核对实质修正`
        : '须完成同组复核，并保留至少 2 条修改前后与来源依据',
    },
    {
      id: 'safety' as const,
      label: '隐私、版权、伦理与安全',
      score: safe ? 2 as const : e04UnsafeFindings(progress).length || !progress.source.reviewedFictional ? 0 as const : 1 as const,
      evidence: safe
        ? '来源已审核，材料授权与隐私边界已确认，教师承担最终判断责任'
        : '来源审核、授权隐私或教师最终责任仍有缺项',
    },
  ]
  const coreRequirements = [
    { id: 'traceable-source', label: '课程来源、版本、授权和可定位片段完整', passed: source.valid, route: 'source' as const },
    { id: 'graph-thresholds', label: '最终图谱不少于 15 个节点、20 条有向关系和 3 类关系', passed: graphComplete, route: 'revision' as const },
    { id: 'graph-quality', label: '节点与关系同源驱动，无重复、自环、孤立或无依据项', passed: graphClean && evidenceValid, route: 'revision' as const },
    { id: 'review-and-revision', label: '已完成同组方向及遗漏复核并保存至少 2 处人工修正', passed: iterationValid, route: 'graph-review' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions
    .filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id))
    .every((item) => item.score === 2)
  const coreRequirementsPassed = coreRequirements.every((item) => item.passed)
  return { dimensions, total, coreRequirements, hardGatesPassed, coreRequirementsPassed, passed: total >= 8 && hardGatesPassed && coreRequirementsPassed }
}

export function createE04Assessment(progress: E04Progress, directory: ParticipantDirectory, modificationSummary = ''): E04AssessmentRecord {
  const result = calculateE04Score(progress, directory)
  const assessedAt = new Date().toISOString()
  return {
    assessmentId: `E04-ASSESS-${e04Hash([directory.currentParticipantId, assessedAt, progress.assessments.length])}`,
    assessedAt,
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    packageId: progress.confirmedPackage?.packageId,
    total: result.total,
    passed: result.passed,
    hardGatesPassed: result.hardGatesPassed,
    coreRequirementsPassed: result.coreRequirementsPassed,
    dimensions: structuredClone(result.dimensions),
    contentFingerprint: e04ContentFingerprint(progress, directory),
    modificationSummary: modificationSummary || progress.revisions.map((item) => `${item.targetId} ${item.beforeValue}→${item.afterValue}`).join('；'),
  }
}
