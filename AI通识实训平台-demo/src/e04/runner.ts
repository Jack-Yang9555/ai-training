import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import { createE04DeterministicGraph } from './data'
import type {
  E04GraphDraft,
  E04GraphReview,
  E04Progress,
  E04RevisionRecord,
} from './domain'

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]))
  }
  return value
}

export function e04Hash(value: unknown) {
  const input = JSON.stringify(canonical(value))
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase()
}

export function e04InputFingerprint(progress: Pick<E04Progress, 'source'>) {
  return e04Hash(progress.source)
}

export function e04GraphFingerprint(graph: E04GraphDraft | undefined) {
  if (!graph) return ''
  return e04Hash({
    graphId: graph.graphId,
    participantId: graph.participantId,
    inputFingerprint: graph.inputFingerprint,
    title: graph.title,
    version: graph.version,
    focusNodeIds: graph.focusNodeIds,
    nodes: graph.nodes,
    relations: graph.relations,
  })
}

export class LocalE04GraphRunner {
  run(progress: Pick<E04Progress, 'source'>, participantId: string) {
    return createE04DeterministicGraph(participantId, e04InputFingerprint(progress))
  }
}

export function eligibleE04Reviewers(directory: ParticipantDirectory): TrainingParticipant[] {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!current) return []
  return directory.participants.filter((item) => item.groupId === current.groupId && item.participantId !== current.participantId)
}

export function simulateE04GraphReview(progress: E04Progress, directory: ParticipantDirectory): E04GraphReview {
  const graph = progress.aiDraft
  const reviewer = eligibleE04Reviewers(directory).find((item) => item.participantId === progress.graphReview.reviewerId)
  const now = new Date().toISOString()
  if (!graph || !reviewer || !progress.graphReview.reviewerRole) {
    return { ...progress.graphReview, recordId: '', submitted: false, submittedAt: undefined }
  }
  return {
    ...progress.graphReview,
    recordId: `E04-REVIEW-${e04Hash([reviewer.participantId, e04GraphFingerprint(graph), now])}`,
    reviewerGroupId: reviewer.groupId,
    graphId: graph.graphId,
    reviewedGraphFingerprint: e04GraphFingerprint(graph),
    relationDirection: '需调整',
    omission: '存在遗漏',
    targetRecordId: 'R07 / N08·N16 / R18',
    suggestion: 'R07 先修方向需反转；N08 与 N16 同名应合并并保留别名；R18 无课程来源支持应删除。',
    authorTreatment: '',
    authorBasis: '',
    simulated: true,
    disclosure: '当前 Demo 无多人后端；本记录由作者在本机触发确定性模拟，非实时提交，不代表真实组员在线提交。',
    submitted: false,
    submittedAt: undefined,
  }
}

export const simulateE04PeerReview = simulateE04GraphReview

function revision(
  progress: E04Progress,
  participantId: string,
  targetKind: E04RevisionRecord['targetKind'],
  targetId: string,
  field: E04RevisionRecord['field'],
  beforeValue: string,
  afterValue: string,
  basis: string,
  basisExcerptId: string,
  sequence: number,
): E04RevisionRecord {
  const revisedAt = new Date().toISOString()
  return {
    revisionId: `E04-REV-${e04Hash([participantId, progress.graphReview.recordId, targetId, field, sequence])}`,
    participantId,
    sourceReviewId: progress.graphReview.recordId,
    reviewedGraphFingerprint: progress.graphReview.reviewedGraphFingerprint,
    targetKind,
    targetId,
    field,
    beforeValue,
    afterValue,
    basis,
    basisExcerptId,
    revisedAt,
  }
}

export function applyE04ReferenceCorrections(progress: E04Progress, participantId: string): E04Progress {
  if (!progress.aiDraft || !progress.graphReview.submitted || !progress.graphReview.recordId) return progress
  const graph = structuredClone(progress.aiDraft)
  graph.nodes = graph.nodes
    .filter((item) => item.nodeId !== 'N16')
    .map((item) => item.nodeId === 'N08'
      ? { ...item, aliases: [...new Set([...item.aliases, '负面提示词'])], teacherReviewed: true }
      : { ...item, teacherReviewed: true })
  graph.relations = graph.relations
    .filter((item) => item.relationId !== 'R18')
    .map((item) => {
      if (item.relationId === 'R07') return { ...item, sourceNodeId: 'N04', targetNodeId: 'N08', teacherReviewed: true }
      if (item.relationId === 'R22') return { ...item, sourceNodeId: 'N08', teacherReviewed: true }
      return { ...item, teacherReviewed: true }
    })
  graph.version = 2
  graph.generatedAt = new Date().toISOString()
  const revisions: E04RevisionRecord[] = [
    revision(progress, participantId, 'node', 'N16', 'merge', 'N16：负向提示词', '合并至 N08，保留别名“负面提示词”', '同名节点必须合并，避免一个概念被重复计数。', 'C02', 1),
    revision(progress, participantId, 'relation', 'R07', 'direction', 'N08 -先修-> N04', 'N04 -先修-> N08', '课程材料明确要求先理解提示词结构，再设定负向提示词。', 'C02', 2),
    revision(progress, participantId, 'relation', 'R18', 'delete', 'N15 -组成-> N10', '已删除', '课程材料不支持“版权与隐私组成参数控制”，不能伪造关系。', 'C06', 3),
  ]
  return {
    ...progress,
    workingGraph: graph,
    revisions,
    graphReview: {
      ...progress.graphReview,
      authorTreatment: '已采纳并修正',
      authorBasis: '已按 C02 的结构先修要求与 C06 的授权边界逐项核验。',
    },
    teacherConfirmation: {
      sourceAndEvidenceConfirmed: false,
      graphQualityConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    updatedAt: new Date().toISOString(),
  }
}

function hasDerivedWork(progress: E04Progress) {
  return Boolean(progress.aiDraft
    || progress.workingGraph
    || progress.graphReview.recordId
    || progress.revisions.length
    || progress.confirmedPackage)
}

export function archiveE04Attempt(progress: E04Progress, reason: string) {
  if (!hasDerivedWork(progress)) return progress.attemptHistory
  const snapshot = {
    route: progress.route,
    source: progress.source,
    aiDraft: progress.aiDraft,
    workingGraph: progress.workingGraph,
    graphReview: progress.graphReview,
    revisions: progress.revisions,
    teacherConfirmation: progress.teacherConfirmation,
    confirmedPackage: progress.confirmedPackage,
  }
  const historyId = `E04-H-${e04Hash(snapshot)}`
  if (progress.attemptHistory.some((item) => item.historyId === historyId)) return progress.attemptHistory
  return [...progress.attemptHistory, {
    historyId,
    invalidatedAt: new Date().toISOString(),
    reason,
    route: progress.route,
    source: structuredClone(progress.source),
    aiDraft: structuredClone(progress.aiDraft),
    workingGraph: structuredClone(progress.workingGraph),
    graphReview: structuredClone(progress.graphReview),
    revisions: structuredClone(progress.revisions),
    teacherConfirmation: structuredClone(progress.teacherConfirmation),
    confirmedPackage: structuredClone(progress.confirmedPackage),
  }]
}

function emptyReview(progress: E04Progress): E04GraphReview {
  return {
    ...progress.graphReview,
    recordId: '',
    reviewerId: '',
    reviewerGroupId: '',
    reviewerRole: undefined,
    graphId: '',
    reviewedGraphFingerprint: '',
    relationDirection: '',
    omission: '',
    targetRecordId: '',
    suggestion: '',
    authorTreatment: '',
    authorBasis: '',
    simulated: false,
    submitted: false,
    submittedAt: undefined,
  }
}

export function invalidateE04Confirmation(progress: E04Progress, reason: string): E04Progress {
  return {
    ...progress,
    teacherConfirmation: {
      sourceAndEvidenceConfirmed: false,
      graphQualityConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    attemptHistory: archiveE04Attempt(progress, reason),
    updatedAt: new Date().toISOString(),
  }
}

export function invalidateE04ReviewContext(progress: E04Progress, reason: string): E04Progress {
  const archived = invalidateE04Confirmation(progress, reason)
  return {
    ...archived,
    workingGraph: undefined,
    graphReview: emptyReview(archived),
    revisions: [],
    teacherConfirmation: {
      sourceAndEvidenceConfirmed: false,
      graphQualityConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
  }
}

export function invalidateE04DerivedWork(progress: E04Progress, reason: string): E04Progress {
  const archived = invalidateE04ReviewContext(progress, reason)
  return {
    ...archived,
    aiDraft: undefined,
    workingGraph: undefined,
    graphReview: emptyReview(archived),
    revisions: [],
    teacherConfirmation: {
      sourceAndEvidenceConfirmed: false,
      graphQualityConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
  }
}
