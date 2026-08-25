import type { ParticipantDirectory } from '../training/types'
import type {
  E04GraphDraft,
  E04Progress,
  E04RelationType,
  E04Route,
} from './domain'
import {
  e04GraphFingerprint,
  e04Hash,
  e04InputFingerprint,
  eligibleE04Reviewers,
} from './runner'

export interface E04ValidationResult { valid: boolean; messages: string[] }
export type E04InitialDefect = 'duplicate-node' | 'reversed-prerequisite' | 'unsupported-relation'

export interface E04GraphDiagnostics {
  duplicateNodeGroups: string[][]
  duplicateRelationIds: string[]
  selfLoopRelationIds: string[]
  orphanNodeIds: string[]
  unsupportedRelationIds: string[]
}

function unique(values: string[]) { return [...new Set(values)] }
function nonEmpty(value: string) { return Boolean(value.trim()) }
function normalizedLabel(value: string) { return value.trim().replace(/[\s　]/gu, '').toLocaleLowerCase('zh-CN') }
function exactSet<T>(actual: T[], expected: T[]) {
  return actual.length === expected.length
    && new Set(actual).size === expected.length
    && expected.every((item) => actual.includes(item))
}

export function e04UnsafeFindings(progress: Pick<E04Progress, 'source'>) {
  const text = [
    progress.source.courseName,
    progress.source.documentName,
    progress.source.sourceOrganization,
    progress.source.authorization,
    progress.source.scopeNote,
    ...progress.source.excerpts.flatMap((item) => [item.heading, item.content]),
  ].join('\n')
  const findings: string[] = []
  if (/(?:1[3-9]\d{9})/u.test(text)) findings.push('手机号')
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) findings.push('电子邮箱')
  if (/(?:\d{17}[\dXx])|(?:身份证(?:号|号码)?\s*[:：]?\s*\d{6,})/u.test(text)) findings.push('身份信息')
  if (/(?:sk-[a-z0-9_-]{12,}|api[_ -]?key\s*[:=：]|secret\s*[:=：]|password\s*[:=：])/iu.test(text)) findings.push('密钥或口令')
  return unique(findings)
}

export function validateE04Source(progress: E04Progress): E04ValidationResult {
  const source = progress.source
  const messages: string[] = []
  if (![source.sourceId, source.courseName, source.documentName, source.version, source.sourceOrganization, source.authorization, source.scopeNote].every(nonEmpty)) {
    messages.push('课程名称、来源文档、版本、来源机构、授权和范围须完整')
  }
  if (!source.reviewedFictional) messages.push('当前 Demo 只能使用明确标注已审核虚构的课程样例')
  if (source.excerpts.length < 4 || new Set(source.excerpts.map((item) => item.excerptId)).size !== source.excerpts.length) {
    messages.push('课程来源须包含不少于 4 条编号唯一的可定位片段')
  }
  if (source.excerpts.some((item) => ![item.excerptId, item.heading, item.content].every(nonEmpty))) messages.push('每条来源片段须有编号、标题和内容')
  const unsafe = e04UnsafeFindings(progress)
  if (unsafe.length) messages.push(`来源中检测到${unsafe.join('、')}，不得录入真实个人信息或密钥`)
  if (!source.materialAuthorizationConfirmed || !source.privacyConfirmed || !source.teacherVerifiedConfirmed) {
    messages.push('须分别确认材料授权、隐私边界和教师已核验来源')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

function sourceExcerptIds(progress: Pick<E04Progress, 'source'>) {
  return new Set(progress.source.excerpts.map((item) => item.excerptId))
}

export function diagnoseE04Graph(graph: E04GraphDraft | undefined, progress: Pick<E04Progress, 'source'>): E04GraphDiagnostics {
  if (!graph) return { duplicateNodeGroups: [], duplicateRelationIds: [], selfLoopRelationIds: [], orphanNodeIds: [], unsupportedRelationIds: [] }
  const labels = new Map<string, string[]>()
  for (const item of graph.nodes) {
    const label = normalizedLabel(item.label)
    labels.set(label, [...(labels.get(label) ?? []), item.nodeId])
  }
  const duplicateNodeGroups = [...labels.values()].filter((ids) => ids.length > 1)
  const relationKeys = new Map<string, string[]>()
  for (const item of graph.relations) {
    const key = `${item.sourceNodeId}|${item.type}|${item.targetNodeId}`
    relationKeys.set(key, [...(relationKeys.get(key) ?? []), item.relationId])
  }
  const duplicateRelationIds = [...relationKeys.values()].filter((ids) => ids.length > 1).flat()
  const selfLoopRelationIds = graph.relations.filter((item) => item.sourceNodeId === item.targetNodeId).map((item) => item.relationId)
  const usedNodeIds = new Set(graph.relations.flatMap((item) => [item.sourceNodeId, item.targetNodeId]))
  const orphanNodeIds = graph.nodes.filter((item) => !usedNodeIds.has(item.nodeId)).map((item) => item.nodeId)
  const nodes = new Set(graph.nodes.map((item) => item.nodeId))
  const excerpts = sourceExcerptIds(progress)
  const unsupportedRelationIds = graph.relations
    .filter((item) => !nodes.has(item.sourceNodeId)
      || !nodes.has(item.targetNodeId)
      || !nonEmpty(item.rationale)
      || !excerpts.has(item.sourceExcerptId))
    .map((item) => item.relationId)
  return { duplicateNodeGroups, duplicateRelationIds, selfLoopRelationIds, orphanNodeIds, unsupportedRelationIds }
}

function baseGraphMessages(
  progress: E04Progress,
  graph: E04GraphDraft | undefined,
  participantId?: string,
  allowInitialDefects = false,
) {
  if (!graph) return ['尚未生成确定性知识图谱初稿']
  const messages: string[] = []
  const excerpts = sourceExcerptIds(progress)
  if (!graph.participantId || (participantId && graph.participantId !== participantId)) messages.push('图谱不属于当前 participantId')
  if (graph.inputFingerprint !== e04InputFingerprint(progress)) messages.push('图谱所用课程来源版本已失效')
  if (![graph.graphId, graph.title].every(nonEmpty)) messages.push('图谱编号与名称须完整')
  if (graph.nodes.length < 15) messages.push(`须包含不少于 15 个节点，当前 ${graph.nodes.length} 个`)
  if (new Set(graph.nodes.map((item) => item.nodeId)).size !== graph.nodes.length) messages.push('节点编号须唯一')
  for (const item of graph.nodes) {
    if (![item.nodeId, item.label, item.category, item.definition, item.sourceExcerptId].every(nonEmpty)) messages.push(`${item.nodeId || '未编号节点'}：名称、类别、定义和来源须完整`)
    if (!excerpts.has(item.sourceExcerptId)) messages.push(`${item.nodeId}：来源片段不存在`)
  }
  if (graph.relations.length < 20) messages.push(`须包含不少于 20 条有向关系，当前 ${graph.relations.length} 条`)
  if (new Set(graph.relations.map((item) => item.relationId)).size !== graph.relations.length) messages.push('关系编号须唯一')
  const relationTypes = new Set(graph.relations.map((item) => item.type))
  if (relationTypes.size < 3) messages.push(`须使用不少于 3 类关系，当前 ${relationTypes.size} 类`)
  const allowedTypes = new Set<E04RelationType>(['先修', '组成', '应用', '易错'])
  const nodeIds = new Set(graph.nodes.map((item) => item.nodeId))
  for (const item of graph.relations) {
    if (![item.relationId, item.sourceNodeId, item.targetNodeId, item.type, item.rationale].every(nonEmpty)) messages.push(`${item.relationId || '未编号关系'}：起点、终点、类型和依据须完整`)
    if (!allowedTypes.has(item.type)) messages.push(`${item.relationId}：只能使用先修、组成、应用或易错关系`)
    if (!nodeIds.has(item.sourceNodeId) || !nodeIds.has(item.targetNodeId)) messages.push(`${item.relationId}：起点或终点不存在`)
    const expectedInitialGap = allowInitialDefects && item.relationId === 'R18' && item.sourceExcerptId === ''
    if (!excerpts.has(item.sourceExcerptId) && !expectedInitialGap) messages.push(`${item.relationId}：关系缺少有效课程来源`)
  }
  return unique(messages)
}

export function detectE04InitialDefects(progress: E04Progress): E04InitialDefect[] {
  const graph = progress.aiDraft
  if (!graph) return []
  const diagnostics = diagnoseE04Graph(graph, progress)
  const defects: E04InitialDefect[] = []
  if (diagnostics.duplicateNodeGroups.some((ids) => exactSet(ids, ['N08', 'N16']))) defects.push('duplicate-node')
  const r07 = graph.relations.find((item) => item.relationId === 'R07')
  if (r07?.sourceNodeId === 'N08' && r07.targetNodeId === 'N04' && r07.type === '先修') defects.push('reversed-prerequisite')
  if (diagnostics.unsupportedRelationIds.includes('R18')) defects.push('unsupported-relation')
  return defects
}

export function validateE04Nodes(progress: E04Progress, participantId?: string): E04ValidationResult {
  const messages = [
    ...validateE04Source(progress).messages,
    ...baseGraphMessages(progress, progress.aiDraft, participantId, true),
  ]
  const defects = detectE04InitialDefects(progress)
  if (!exactSet(defects, ['duplicate-node', 'reversed-prerequisite', 'unsupported-relation'])) {
    messages.push('确定性初稿须稳定暴露同名节点、先修方向反转和无来源关系三类缺陷')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE04Relations(progress: E04Progress, participantId?: string): E04ValidationResult {
  const messages = [...validateE04Nodes(progress, participantId).messages]
  const graph = progress.aiDraft
  if (graph && new Set(graph.relations.map((item) => item.type)).size < 3) messages.push('关系表须覆盖至少 3 类关系')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE04GraphReview(progress: E04Progress, directory: ParticipantDirectory): E04ValidationResult {
  const messages = [...validateE04Relations(progress, directory.currentParticipantId).messages]
  const review = progress.graphReview
  const reviewer = eligibleE04Reviewers(directory).find((item) => item.participantId === review.reviewerId)
  if (!reviewer || review.reviewerGroupId !== reviewer.groupId) messages.push('复核人必须是当前同组的其他真实参训成员')
  if (!review.reviewerRole) messages.push('须记录复核人的任务内临时角色')
  if (!progress.aiDraft
    || review.graphId !== progress.aiDraft.graphId
    || review.reviewedGraphFingerprint !== e04GraphFingerprint(progress.aiDraft)) messages.push('小组复核须关联当前只读初稿及其内容指纹')
  if (review.relationDirection !== '需调整' || review.omission !== '存在遗漏') messages.push('复核须如实记录方向需调整与存在关键遗漏')
  if (!review.targetRecordId.trim() || !review.suggestion.trim()) messages.push('复核须定位具体节点或关系并填写建议')
  if (!review.simulated
    || !review.disclosure.includes('无多人后端')
    || !review.disclosure.includes('非实时提交')
    || !review.disclosure.includes('不代表真实组员在线提交')) messages.push('Demo 复核须公开无多人后端、非实时代录边界')
  if (!review.recordId || !review.submitted || !review.submittedAt) messages.push('须提交完整的小组复核记录')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export const validateE04PeerReview = validateE04GraphReview

function revisionMatchesFinalGraph(progress: E04Progress) {
  const graph = progress.workingGraph
  if (!graph) return false
  const n08 = graph.nodes.find((item) => item.nodeId === 'N08')
  const r07 = graph.relations.find((item) => item.relationId === 'R07')
  return !graph.nodes.some((item) => item.nodeId === 'N16')
    && Boolean(n08?.aliases.includes('负面提示词'))
    && r07?.sourceNodeId === 'N04'
    && r07.targetNodeId === 'N08'
    && r07.type === '先修'
    && !graph.relations.some((item) => item.relationId === 'R18')
}

export function validateE04Revision(progress: E04Progress, directory: ParticipantDirectory): E04ValidationResult {
  const messages = [...validateE04GraphReview(progress, directory).messages]
  const graph = progress.workingGraph
  if (!graph) return { valid: false, messages: unique([...messages, '尚未根据复核形成教师工作图谱']) }
  messages.push(...baseGraphMessages(progress, graph, directory.currentParticipantId))
  const diagnostics = diagnoseE04Graph(graph, progress)
  if (diagnostics.duplicateNodeGroups.length) messages.push('最终图谱不得保留同名重复节点')
  if (diagnostics.duplicateRelationIds.length) messages.push('最终图谱不得保留完全重复关系')
  if (diagnostics.selfLoopRelationIds.length) messages.push('最终图谱不得包含自环关系')
  if (diagnostics.orphanNodeIds.length) messages.push('最终图谱不得包含孤立节点')
  if (diagnostics.unsupportedRelationIds.length) messages.push('最终图谱所有关系须有有效来源与依据')
  if (graph.nodes.some((item) => !item.teacherReviewed) || graph.relations.some((item) => !item.teacherReviewed)) messages.push('教师须逐项核验所有节点与关系')
  if (!revisionMatchesFinalGraph(progress)) messages.push('必须合并 N16、反转 R07 并删除无依据的 R18')
  const excerpts = sourceExcerptIds(progress)
  const substantive = progress.revisions.filter((item) => item.participantId === directory.currentParticipantId
    && item.sourceReviewId === progress.graphReview.recordId
    && item.reviewedGraphFingerprint === progress.graphReview.reviewedGraphFingerprint
    && item.beforeValue.trim() !== item.afterValue.trim()
    && item.basis.trim()
    && excerpts.has(item.basisExcerptId))
  const distinctTargets = new Set(substantive.map((item) => `${item.targetKind}:${item.targetId}`))
  const distinctFields = new Set(substantive.map((item) => item.field))
  if (substantive.length < 2 || (distinctTargets.size < 2 && distinctFields.size < 2)) messages.push('须保存至少 2 条针对不同稳定记录或不同实质字段的修正')
  if (progress.graphReview.authorTreatment !== '已采纳并修正' || !progress.graphReview.authorBasis.trim()) messages.push('作者须记录对同组意见的处理方式与依据')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export const validateE04Final = validateE04Revision
export const validateE04FinalGraph = validateE04Revision

export function validateE04Confirmation(progress: E04Progress, directory: ParticipantDirectory): E04ValidationResult {
  const messages = [...validateE04Revision(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.sourceAndEvidenceConfirmed
    || !confirmation.graphQualityConfirmed
    || !confirmation.finalArtifactsConfirmed
    || !confirmation.finalResponsibilityConfirmed) messages.push('须分别确认来源证据、图谱质量、三项成果和教师最终责任')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function e04GroupRosterFingerprint(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  return e04Hash(directory.participants
    .filter((item) => item.groupId === current?.groupId)
    .map((item) => ({ participantId: item.participantId, name: item.name, groupId: item.groupId }))
    .sort((left, right) => left.participantId.localeCompare(right.participantId)))
}

export function e04ConfirmationFingerprint(progress: E04Progress, directory: ParticipantDirectory) {
  return e04Hash({
    participantId: directory.currentParticipantId,
    source: progress.source,
    aiDraft: progress.aiDraft,
    workingGraph: progress.workingGraph,
    graphReview: progress.graphReview,
    revisions: progress.revisions,
    teacherConfirmation: progress.teacherConfirmation,
    groupRoster: e04GroupRosterFingerprint(directory),
  })
}

export function confirmedE04PackageIsCurrent(progress: E04Progress, directory: ParticipantDirectory) {
  const pkg = progress.confirmedPackage
  const graph = progress.workingGraph
  if (!pkg || !graph || pkg.participantId !== directory.currentParticipantId || !validateE04Confirmation(progress, directory).valid) return false
  const exactArtifacts = pkg.artifacts.length === 3
    && pkg.artifacts[0]?.kind === 'e04-knowledge-graph' && pkg.artifacts[0]?.name === '课程知识图谱'
    && pkg.artifacts[1]?.kind === 'e04-node-relation-list' && pkg.artifacts[1]?.name === '节点与关系列表'
    && pkg.artifacts[2]?.kind === 'e04-revision-log' && pkg.artifacts[2]?.name === '人工修正记录'
  return exactArtifacts
    && pkg.packageVersion === 1
    && pkg.sourceId === progress.source.sourceId
    && pkg.sourceName === progress.source.documentName
    && pkg.sourceVersion === progress.source.version
    && pkg.graphId === graph.graphId
    && pkg.graphVersion === graph.version
    && pkg.graphFingerprint === e04GraphFingerprint(graph)
    && pkg.nodeCount === graph.nodes.length
    && pkg.relationCount === graph.relations.length
    && pkg.reviewRecordId === progress.graphReview.recordId
    && pkg.revisionCount === progress.revisions.length
    && pkg.confirmationFingerprint === e04ConfirmationFingerprint(progress, directory)
}

export function e04ContentFingerprint(progress: E04Progress, directory: ParticipantDirectory) {
  return e04Hash({
    confirmation: e04ConfirmationFingerprint(progress, directory),
    package: progress.confirmedPackage ? {
      packageId: progress.confirmedPackage.packageId,
      packageVersion: progress.confirmedPackage.packageVersion,
      participantId: progress.confirmedPackage.participantId,
      confirmationFingerprint: progress.confirmedPackage.confirmationFingerprint,
      graphFingerprint: progress.confirmedPackage.graphFingerprint,
      sourceId: progress.confirmedPackage.sourceId,
      sourceVersion: progress.confirmedPackage.sourceVersion,
      graphId: progress.confirmedPackage.graphId,
      graphVersion: progress.confirmedPackage.graphVersion,
      nodeCount: progress.confirmedPackage.nodeCount,
      relationCount: progress.confirmedPackage.relationCount,
      relationTypes: progress.confirmedPackage.relationTypes,
      reviewRecordId: progress.confirmedPackage.reviewRecordId,
      revisionCount: progress.confirmedPackage.revisionCount,
      artifacts: progress.confirmedPackage.artifacts,
    } : null,
  })
}

export function latestE04AssessmentIsCurrent(progress: E04Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed
    && latest.packageId === progress.confirmedPackage?.packageId
    && latest.contentFingerprint === e04ContentFingerprint(progress, directory))
}

export function validateE04AssessmentSubmission(progress: E04Progress, directory: ParticipantDirectory): E04ValidationResult {
  const messages = [...validateE04Confirmation(progress, directory).messages]
  if (!confirmedE04PackageIsCurrent(progress, directory)) messages.push('须先形成当前教师确认的三项固定成果包')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function progressForE04(progress: E04Progress, directory: ParticipantDirectory) {
  if (latestE04AssessmentIsCurrent(progress, directory)) return 100
  if (progress.route === 'overview'
    && !progress.aiDraft
    && !progress.workingGraph
    && !progress.confirmedPackage
    && progress.assessments.length === 0) return 0
  const routeFloor: Record<E04Route, number> = {
    overview: 0,
    source: 10,
    nodes: 25,
    relations: 40,
    'graph-review': 55,
    revision: 70,
    confirmation: 85,
    result: 90,
  }
  let value = routeFloor[progress.route]
  if (validateE04Source(progress).valid) value = Math.max(value, 20)
  if (validateE04Nodes(progress, directory.currentParticipantId).valid) value = Math.max(value, 35)
  if (validateE04Relations(progress, directory.currentParticipantId).valid) value = Math.max(value, 50)
  if (validateE04GraphReview(progress, directory).valid) value = Math.max(value, 65)
  if (validateE04Revision(progress, directory).valid) value = Math.max(value, 80)
  if (confirmedE04PackageIsCurrent(progress, directory)) value = Math.max(value, 95)
  return Math.min(99, value)
}
