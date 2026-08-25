import type { ParticipantDirectory } from '../training/types'
import type {
  E05CoverageStatus,
  E05Mapping,
  E05Progress,
  E05Route,
  E05Suggestion,
} from './domain'
import {
  e05Hash,
  e05JobTaskFingerprint,
  e05MappingFingerprint,
  e05SourceFingerprint,
  e05SuggestionFingerprint,
  e05WebContentFingerprint,
  effectiveE05Mappings,
  effectiveE05Suggestions,
  eligibleE05Reviewers,
} from './runner'

export interface E05ValidationResult { valid: boolean; messages: string[] }
export type E05InitialDefect = 'incorrect-map-12-status' | 'vague-suggestion-03'

function unique(values: string[]) { return [...new Set(values)] }
function nonEmpty(value: string) { return Boolean(value.trim()) }
function exactSet<T>(actual: T[], expected: T[]) {
  return actual.length === expected.length
    && new Set(actual).size === expected.length
    && expected.every((item) => actual.includes(item))
}

export function e05UnsafeFindings(progress: Pick<E05Progress, 'source'>) {
  const { jobMaterial, course } = progress.source
  const text = [
    jobMaterial.documentName,
    jobMaterial.sourceOrganization,
    jobMaterial.authorization,
    jobMaterial.scopeNote,
    ...jobMaterial.excerpts.flatMap((item) => [item.heading, item.content]),
    course.courseName,
    course.documentName,
    course.ownerStatement,
    course.authorization,
    ...course.objectives.flatMap((item) => [item.title, item.description]),
  ].join('\n')
  const findings: string[] = []
  if (/(?:1[3-9]\d{9})/u.test(text)) findings.push('手机号')
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) findings.push('电子邮箱')
  if (/(?:\d{17}[\dXx])|(?:身份证(?:号|号码)?\s*[:：]?\s*\d{6,})/u.test(text)) findings.push('身份信息')
  if (/(?:sk-[a-z0-9_-]{12,}|api[_ -]?key\s*[:=：]|secret\s*[:=：]|password\s*[:=：])/iu.test(text)) findings.push('密钥或口令')
  return unique(findings)
}

export function validateE05Source(progress: E05Progress): E05ValidationResult {
  const messages: string[] = []
  const { jobMaterial, course } = progress.source
  if (![jobMaterial.sourceId, jobMaterial.documentName, jobMaterial.version, jobMaterial.sourceOrganization, jobMaterial.authorization, jobMaterial.scopeNote].every(nonEmpty)) {
    messages.push('岗位材料名称、版本、来源机构、授权和适用范围须完整')
  }
  if (jobMaterial.auditStatus !== '已审核' || !jobMaterial.anonymized || !jobMaterial.reviewedFictional) {
    messages.push('当前 Demo 只能使用明确已审核、已脱敏的虚构岗位材料')
  }
  if (jobMaterial.excerpts.length < 5 || new Set(jobMaterial.excerpts.map((item) => item.excerptId)).size !== jobMaterial.excerpts.length) {
    messages.push('岗位材料须包含不少于 5 条编号唯一的可定位片段')
  }
  if (jobMaterial.excerpts.some((item) => ![item.excerptId, item.heading, item.content].every(nonEmpty))) messages.push('每条岗位材料片段须有编号、标题和内容')
  if (![course.courseId, course.courseName, course.documentName, course.version, course.ownerStatement, course.authorization].every(nonEmpty)) {
    messages.push('本人课程名称、文件、版本、所有权说明和授权须完整')
  }
  if (course.objectives.length < 3 || new Set(course.objectives.map((item) => item.objectiveId)).size !== course.objectives.length) {
    messages.push('本人课程须登记不少于 3 项编号唯一的课程目标')
  }
  if (course.objectives.some((item) => ![item.objectiveId, item.title, item.description, item.evidenceId].every(nonEmpty))) messages.push('每项课程目标须有编号、名称、内容和课程证据编号')
  const unsafe = e05UnsafeFindings(progress)
  if (unsafe.length) messages.push(`材料中检测到${unsafe.join('、')}，不得录入真实个人信息或密钥`)
  if (!progress.source.jobMaterialAuthorizationConfirmed
    || !progress.source.privacyConfirmed
    || !progress.source.courseOwnershipConfirmed
    || !progress.source.teacherVerifiedConfirmed) messages.push('须分别确认岗位材料授权、脱敏隐私、本人课程目标和教师已核验')
  return { valid: messages.length === 0, messages: unique(messages) }
}

const referenceStatuses: Record<string, E05CoverageStatus> = {
  'MAP-01': '已覆盖',
  'MAP-02': '已覆盖',
  'MAP-03': '覆盖不足',
  'MAP-04': '覆盖不足',
  'MAP-05': '已覆盖',
  'MAP-06': '覆盖不足',
  'MAP-07': '暂未覆盖',
  'MAP-08': '已覆盖',
  'MAP-09': '覆盖不足',
  'MAP-10': '覆盖不足',
  'MAP-11': '已覆盖',
  'MAP-12': '暂未覆盖',
}

export function expectedE05CoverageStatus(mappingId: string) {
  return referenceStatuses[mappingId]
}

function mappingStructureMessages(progress: E05Progress, mappings: E05Mapping[], participantId?: string, allowInitialDefect = false) {
  const messages: string[] = []
  const taskDraft = progress.jobTaskDraft
  const mappingDraft = progress.mappingDraft
  if (!taskDraft || !mappingDraft) return ['尚未提取岗位任务并建立映射初稿']
  if (!taskDraft.participantId || (participantId && taskDraft.participantId !== participantId) || mappingDraft.participantId !== taskDraft.participantId) messages.push('岗位任务或映射初稿不属于当前 participantId')
  if (taskDraft.inputFingerprint !== e05SourceFingerprint(progress)) messages.push('岗位任务所用来源版本已失效')
  if (mappingDraft.jobTaskFingerprint !== e05JobTaskFingerprint(taskDraft)) messages.push('映射初稿所用岗位任务版本已失效')
  const jobExcerptIds = new Set(progress.source.jobMaterial.excerpts.map((item) => item.excerptId))
  if (taskDraft.tasks.length < 5) messages.push(`须提取不少于 5 项岗位任务，当前 ${taskDraft.tasks.length} 项`)
  if (new Set(taskDraft.tasks.map((item) => item.taskId)).size !== taskDraft.tasks.length) messages.push('岗位任务编号须唯一')
  for (const item of taskDraft.tasks) {
    if (![item.taskId, item.name, item.description, item.jobEvidenceExcerptId].every(nonEmpty)) messages.push(`${item.taskId || '未编号任务'}：名称、描述和岗位依据须完整`)
    if (!jobExcerptIds.has(item.jobEvidenceExcerptId)) messages.push(`${item.taskId}：岗位来源片段不存在`)
  }
  if (mappings.length < 10) messages.push(`须建立不少于 10 条映射，当前 ${mappings.length} 条`)
  if (new Set(mappings.map((item) => item.mappingId)).size !== mappings.length) messages.push('映射编号须唯一')
  const pairs = mappings.map((item) => `${item.courseObjectiveId}|${item.jobTaskId}`)
  if (new Set(pairs).size !== pairs.length) messages.push('同一课程目标与岗位任务组合不得重复')
  const allowedStatuses = new Set<E05CoverageStatus>(['已覆盖', '覆盖不足', '暂未覆盖'])
  if (!['已覆盖', '覆盖不足', '暂未覆盖'].every((status) => mappings.some((item) => item.status === status))) messages.push('映射列表须如实覆盖已覆盖、覆盖不足、暂未覆盖三类互斥状态')
  const objectives = new Map(progress.source.course.objectives.map((item) => [item.objectiveId, item]))
  const tasks = new Map(taskDraft.tasks.map((item) => [item.taskId, item]))
  for (const item of mappings) {
    const objective = objectives.get(item.courseObjectiveId)
    const task = tasks.get(item.jobTaskId)
    if (![item.mappingId, item.courseObjectiveId, item.jobTaskId, item.courseEvidenceId, item.courseEvidenceSummary, item.jobEvidenceExcerptId, item.jobEvidenceSummary, item.judgementBasis].every(nonEmpty)) messages.push(`${item.mappingId || '未编号映射'}：目标、任务、双侧依据和判断依据须完整`)
    if (!allowedStatuses.has(item.status)) messages.push(`${item.mappingId}：只能选择一种互斥覆盖状态`)
    if (!objective || objective.evidenceId !== item.courseEvidenceId) messages.push(`${item.mappingId}：课程目标或课程依据不匹配`)
    if (!task || task.jobEvidenceExcerptId !== item.jobEvidenceExcerptId) messages.push(`${item.mappingId}：岗位任务或岗位依据不匹配`)
    const expected = expectedE05CoverageStatus(item.mappingId)
    const expectedInitialGap = allowInitialDefect && item.mappingId === 'MAP-12' && item.status === '覆盖不足'
    if (expected && item.status !== expected && !expectedInitialGap) messages.push(`${item.mappingId}：覆盖状态与当前双侧证据不符`)
  }
  return unique(messages)
}

export function detectE05InitialDefects(progress: E05Progress): E05InitialDefect[] {
  const defects: E05InitialDefect[] = []
  if (progress.mappingDraft?.mappings.find((item) => item.mappingId === 'MAP-12')?.status === '覆盖不足') defects.push('incorrect-map-12-status')
  const sg03 = progress.aiSuggestionDraft?.suggestions.find((item) => item.suggestionId === 'SG-03')
  if (sg03?.courseAdjustment === '加强版本交付训练。' && sg03.expectedEvidence === '保留相关证据。') defects.push('vague-suggestion-03')
  return defects
}

export function validateE05Mapping(progress: E05Progress, participantId?: string): E05ValidationResult {
  const messages = [
    ...validateE05Source(progress).messages,
    ...mappingStructureMessages(progress, progress.mappingDraft?.mappings ?? [], participantId, true),
  ]
  const mapDefects = detectE05InitialDefects(progress).filter((item) => item === 'incorrect-map-12-status')
  if (!exactSet(mapDefects, ['incorrect-map-12-status'])) messages.push('确定性映射初稿须稳定暴露 MAP-12 覆盖状态误判')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export const validateE05Mappings = validateE05Mapping

export function e05SuggestionIsExecutable(item: E05Suggestion) {
  const vagueActions = ['加强版本交付训练。', '加强训练。', '进一步改进。']
  const vagueEvidence = ['保留相关证据。', '查看证据。', '达到要求。']
  return [item.gap, item.courseAdjustment, item.expectedEvidence].every(nonEmpty)
    && !vagueActions.includes(item.courseAdjustment.trim())
    && !vagueEvidence.includes(item.expectedEvidence.trim())
}

function suggestionStructureMessages(progress: E05Progress, suggestions: E05Suggestion[], final = false) {
  const messages: string[] = []
  if (!progress.aiSuggestionDraft) return ['尚未生成恰好 3 项差距与改进建议']
  if (suggestions.length !== 3 || new Set(suggestions.map((item) => item.suggestionId)).size !== 3) messages.push('须形成恰好 3 项编号唯一的改进建议')
  const mappings = new Map(effectiveE05Mappings(progress).map((item) => [item.mappingId, item]))
  for (const item of suggestions) {
    const mapping = mappings.get(item.linkedMappingId)
    if (![item.suggestionId, item.linkedMappingId, item.gap, item.courseAdjustment, item.expectedEvidence, item.courseEvidenceId, item.jobEvidenceExcerptId].every(nonEmpty)) messages.push(`${item.suggestionId || '未编号建议'}：差距、课程调整、预期证据和双侧依据须完整`)
    if (!mapping || mapping.status === '已覆盖') messages.push(`${item.suggestionId}：只能回应已记录的覆盖不足或暂未覆盖映射`)
    if (mapping && (mapping.courseEvidenceId !== item.courseEvidenceId || mapping.jobEvidenceExcerptId !== item.jobEvidenceExcerptId)) messages.push(`${item.suggestionId}：建议的课程与岗位依据须与关联映射一致`)
    if (final && !e05SuggestionIsExecutable(item)) messages.push(`${item.suggestionId}：课程调整动作与预期证据须具体、可执行、可检查`)
  }
  return unique(messages)
}

export function validateE05Suggestions(progress: E05Progress, participantId?: string): E05ValidationResult {
  const messages = [...validateE05Mapping(progress, participantId).messages]
  if (progress.aiSuggestionDraft?.participantId !== participantId && participantId) messages.push('建议初稿不属于当前 participantId')
  if (progress.aiSuggestionDraft?.mappingFingerprint !== e05MappingFingerprint(progress.mappingDraft)) messages.push('建议所用映射版本已失效')
  messages.push(...suggestionStructureMessages(progress, progress.aiSuggestionDraft?.suggestions ?? []))
  if (!exactSet(detectE05InitialDefects(progress), ['incorrect-map-12-status', 'vague-suggestion-03'])) messages.push('确定性初稿须稳定暴露 MAP-12 状态误判和 SG-03 笼统建议两类缺陷')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function e05WebPageIsCurrent(progress: E05Progress, participantId: string) {
  const page = progress.webPage
  return Boolean(page
    && page.participantId === participantId
    && page.contentFingerprint === e05WebContentFingerprint(progress, participantId)
    && page.html.startsWith('<!doctype html>'))
}

export function validateE05WebPage(progress: E05Progress, participantId: string): E05ValidationResult {
  const messages = [...validateE05Suggestions(progress, participantId).messages]
  const page = progress.webPage
  if (!e05WebPageIsCurrent(progress, participantId)) messages.push('须生成与当前映射和恰好 3 项建议指纹一致的单文件 HTML')
  if (!page?.offlineTest?.passed || page.offlineTest.webPageId !== page.webPageId || !Object.values(page.offlineTest.checks).every(Boolean)) messages.push('当前单文件 HTML 须通过无外部依赖、覆盖筛选和关系详情的离线测试')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE05PeerReview(progress: E05Progress, directory: ParticipantDirectory): E05ValidationResult {
  const messages = [...validateE05WebPage(progress, directory.currentParticipantId).messages]
  const review = progress.peerReview
  const reviewer = eligibleE05Reviewers(directory).find((item) => item.participantId === review.reviewerId)
  if (!reviewer || review.reviewerGroupId !== reviewer.groupId) messages.push('复核人必须是当前同组的其他真实参训成员')
  if (!review.reviewerRole) messages.push('须记录复核人的任务内临时角色')
  if (review.reviewedMappingFingerprint !== e05MappingFingerprint(progress.mappingDraft)
    || review.reviewedSuggestionFingerprint !== e05SuggestionFingerprint(progress.aiSuggestionDraft)
    || !review.reviewedWebPageId
    || (!progress.revisions.length && review.reviewedWebPageId !== progress.webPage?.webPageId)) messages.push('小组复核须关联当前映射、AI 原建议与复核时的单文件网页')
  if (review.mappingJudgement !== '需调整' || review.suggestionJudgement !== '需调整') messages.push('复核须如实记录 MAP-12 映射与 SG-03 建议均需调整')
  if (!exactSet(review.targetRecordIds, ['MAP-12', 'SG-03']) || !review.suggestion.trim()) messages.push('复核须定位 MAP-12 与 SG-03 并保存具体建议')
  if (!review.simulated
    || !review.disclosure.includes('无多人后端')
    || !review.disclosure.includes('非实时提交')
    || !review.disclosure.includes('不代表真实组员在线提交')) messages.push('Demo 复核须公开无多人后端、非实时代录边界')
  if (!review.recordId || !review.submitted || !review.submittedAt) messages.push('须提交完整的小组复核记录')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE05Revision(progress: E05Progress, directory: ParticipantDirectory): E05ValidationResult {
  const messages = [...validateE05PeerReview(progress, directory).messages]
  if (!progress.workingMappings || !progress.workingSuggestions) return { valid: false, messages: unique([...messages, '尚未根据复核形成教师确认版映射与建议']) }
  messages.push(...mappingStructureMessages(progress, progress.workingMappings, directory.currentParticipantId))
  messages.push(...suggestionStructureMessages(progress, progress.workingSuggestions, true))
  if (progress.workingMappings.some((item) => !item.teacherReviewed) || progress.workingSuggestions.some((item) => !item.teacherReviewed)) messages.push('教师须逐项核验所有映射与恰好 3 项建议')
  const finalMap12 = progress.workingMappings.find((item) => item.mappingId === 'MAP-12')
  const finalSg03 = progress.workingSuggestions.find((item) => item.suggestionId === 'SG-03')
  if (finalMap12?.status !== '暂未覆盖') messages.push('MAP-12 须根据双侧证据修正为“暂未覆盖”')
  if (!finalSg03 || !e05SuggestionIsExecutable(finalSg03)) messages.push('SG-03 须根据复核补齐具体课程动作和可检查证据')
  const courseEvidenceIds = new Set(progress.source.course.objectives.map((item) => item.evidenceId))
  const jobEvidenceIds = new Set(progress.source.jobMaterial.excerpts.map((item) => item.excerptId))
  const substantive = progress.revisions.filter((item) => item.participantId === directory.currentParticipantId
    && item.sourceReviewId === progress.peerReview.recordId
    && item.reviewedMappingFingerprint === progress.peerReview.reviewedMappingFingerprint
    && item.reviewedSuggestionFingerprint === progress.peerReview.reviewedSuggestionFingerprint
    && item.beforeValue.trim() !== item.afterValue.trim()
    && item.basis.trim()
    && courseEvidenceIds.has(item.courseEvidenceId)
    && jobEvidenceIds.has(item.jobEvidenceExcerptId))
  if (substantive.length < 1) messages.push('作者须保存至少 1 条映射或建议的实质修正、前后值与双侧依据')
  if (progress.peerReview.authorTreatment !== '已采纳并修正' || !progress.peerReview.authorBasis.trim()) messages.push('作者须记录对同组意见的处理方式与依据')
  const page = progress.webPage
  if (!page
    || page.version < 2
    || !e05WebPageIsCurrent(progress, directory.currentParticipantId)
    || !page.offlineTest?.passed
    || !page.offlineTest.checks.currentContentFingerprint) messages.push('修正后须重新生成单文件 HTML 并通过当前内容指纹的离线复测')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export const validateE05Final = validateE05Revision

export function validateE05Confirmation(progress: E05Progress, directory: ParticipantDirectory): E05ValidationResult {
  const messages = [...validateE05Revision(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.sourceAndEvidenceConfirmed
    || !confirmation.mappingAndSuggestionsConfirmed
    || !confirmation.offlineArtifactConfirmed
    || !confirmation.finalResponsibilityConfirmed) messages.push('须分别确认来源证据、映射与建议、离线单文件成果和教师最终责任')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function e05GroupRosterFingerprint(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  return e05Hash(directory.participants
    .filter((item) => item.groupId === current?.groupId)
    .map((item) => ({ participantId: item.participantId, name: item.name, groupId: item.groupId }))
    .sort((left, right) => left.participantId.localeCompare(right.participantId)))
}

export function e05ConfirmationFingerprint(progress: E05Progress, directory: ParticipantDirectory) {
  return e05Hash({
    participantId: directory.currentParticipantId,
    source: progress.source,
    jobTaskDraft: progress.jobTaskDraft,
    mappingDraft: progress.mappingDraft,
    aiSuggestionDraft: progress.aiSuggestionDraft,
    workingMappings: progress.workingMappings,
    workingSuggestions: progress.workingSuggestions,
    webPage: progress.webPage,
    peerReview: progress.peerReview,
    revisions: progress.revisions,
    teacherConfirmation: progress.teacherConfirmation,
    groupRoster: e05GroupRosterFingerprint(directory),
  })
}

export function confirmedE05PackageIsCurrent(progress: E05Progress, directory: ParticipantDirectory) {
  const pkg = progress.confirmedPackage
  const page = progress.webPage
  const mappings = effectiveE05Mappings(progress)
  const suggestions = effectiveE05Suggestions(progress)
  if (!pkg || !page || pkg.participantId !== directory.currentParticipantId || !validateE05Confirmation(progress, directory).valid) return false
  const exactArtifacts = pkg.artifacts.length === 2
    && pkg.artifacts[0]?.kind === 'e05-mapping-webpage' && pkg.artifacts[0]?.name === '课程—岗位能力映射网页'
    && pkg.artifacts[1]?.kind === 'e05-gap-suggestion-list' && pkg.artifacts[1]?.name === '差距与改进建议清单'
  return exactArtifacts
    && pkg.packageVersion === 1
    && pkg.sourceFingerprint === e05SourceFingerprint(progress)
    && pkg.jobSourceId === progress.source.jobMaterial.sourceId
    && pkg.jobSourceVersion === progress.source.jobMaterial.version
    && pkg.courseId === progress.source.course.courseId
    && pkg.courseVersion === progress.source.course.version
    && pkg.webPageId === page.webPageId
    && pkg.webPageVersion === page.version
    && pkg.webPageContentFingerprint === page.contentFingerprint
    && pkg.offlineTestId === page.offlineTest?.testId
    && pkg.jobTaskCount === progress.jobTaskDraft?.tasks.length
    && pkg.mappingCount === mappings.length
    && pkg.suggestionCount === suggestions.length
    && pkg.reviewRecordId === progress.peerReview.recordId
    && pkg.revisionCount === progress.revisions.length
    && pkg.confirmationFingerprint === e05ConfirmationFingerprint(progress, directory)
}

export function e05ContentFingerprint(progress: E05Progress, directory: ParticipantDirectory) {
  return e05Hash({
    confirmation: e05ConfirmationFingerprint(progress, directory),
    package: progress.confirmedPackage ? {
      packageId: progress.confirmedPackage.packageId,
      packageVersion: progress.confirmedPackage.packageVersion,
      participantId: progress.confirmedPackage.participantId,
      confirmationFingerprint: progress.confirmedPackage.confirmationFingerprint,
      sourceFingerprint: progress.confirmedPackage.sourceFingerprint,
      jobSourceId: progress.confirmedPackage.jobSourceId,
      jobSourceVersion: progress.confirmedPackage.jobSourceVersion,
      courseId: progress.confirmedPackage.courseId,
      courseVersion: progress.confirmedPackage.courseVersion,
      webPageId: progress.confirmedPackage.webPageId,
      webPageVersion: progress.confirmedPackage.webPageVersion,
      webPageContentFingerprint: progress.confirmedPackage.webPageContentFingerprint,
      offlineTestId: progress.confirmedPackage.offlineTestId,
      jobTaskCount: progress.confirmedPackage.jobTaskCount,
      mappingCount: progress.confirmedPackage.mappingCount,
      suggestionCount: progress.confirmedPackage.suggestionCount,
      coverageStatuses: progress.confirmedPackage.coverageStatuses,
      reviewRecordId: progress.confirmedPackage.reviewRecordId,
      revisionCount: progress.confirmedPackage.revisionCount,
      artifacts: progress.confirmedPackage.artifacts,
    } : null,
  })
}

export function latestE05AssessmentIsCurrent(progress: E05Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed
    && latest.packageId === progress.confirmedPackage?.packageId
    && latest.contentFingerprint === e05ContentFingerprint(progress, directory))
}

export function validateE05AssessmentSubmission(progress: E05Progress, directory: ParticipantDirectory): E05ValidationResult {
  const messages = [...validateE05Confirmation(progress, directory).messages]
  if (!confirmedE05PackageIsCurrent(progress, directory)) messages.push('须先形成当前教师确认的两项固定成果包')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function progressForE05(progress: E05Progress, directory: ParticipantDirectory) {
  if (latestE05AssessmentIsCurrent(progress, directory)) return 100
  if (progress.route === 'overview'
    && !progress.jobTaskDraft
    && !progress.mappingDraft
    && !progress.aiSuggestionDraft
    && !progress.confirmedPackage
    && progress.assessments.length === 0) return 0
  const routeFloor: Record<E05Route, number> = {
    overview: 0,
    source: 10,
    mapping: 25,
    suggestions: 40,
    'peer-review': 55,
    revision: 70,
    confirmation: 85,
    result: 90,
  }
  let value = routeFloor[progress.route]
  if (validateE05Source(progress).valid) value = Math.max(value, 20)
  if (validateE05Mapping(progress, directory.currentParticipantId).valid) value = Math.max(value, 40)
  if (validateE05WebPage(progress, directory.currentParticipantId).valid) value = Math.max(value, 60)
  if (validateE05PeerReview(progress, directory).valid) value = Math.max(value, 70)
  if (validateE05Revision(progress, directory).valid) value = Math.max(value, 85)
  if (confirmedE05PackageIsCurrent(progress, directory)) value = Math.max(value, 95)
  return Math.min(99, value)
}
