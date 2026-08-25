import type { ParticipantDirectory } from '../training/types'
import type { M10BoundaryAction, M10BoundaryType, M10Progress, M10Route } from './domain'
import { m10ConfigurationFingerprint, m10Hash, m10KnowledgeSourceFingerprint } from './runner'

export interface M10ValidationResult { valid: boolean; messages: string[] }

const expectedFlow = [
  ['understand', 1, '先了解问题'],
  ['retrieve', 2, '检索材料'],
  ['explain', 3, '引用解释'],
  ['check', 4, '检查理解'],
] as const

const expectedBoundaryActions: Record<M10BoundaryType, M10BoundaryAction> = {
  'out-of-scope': '说明边界并转交',
  'do-work': '拒绝并引导',
  safety: '暂停并转交',
  'final-grade': '说明边界并转交',
  'sensitive-data': '暂停并转交',
}

const allowedActions = new Set<M10BoundaryAction>(['追问', '拒绝并引导', '说明边界并转交', '暂停并转交'])

function unique(messages: string[]) { return [...new Set(messages)] }
function normalized(value: string) { return value.trim().replace(/\s+/gu, ' ') }

export function validateM10Source(progress: M10Progress, participantId: string): M10ValidationResult {
  const source = progress.knowledgeSource
  const messages: string[] = []
  if (!source) return { valid: false, messages: ['M10 必须读取当前教师 M09 已通过的真实知识库；不使用演示知识库补位'] }
  if (!source.current || !source.passed || source.version !== 'v1.0') messages.push('M09 知识库必须是当前已通过的 v1.0')
  if (source.participantId !== participantId) messages.push('M09 知识库必须属于当前教师本人')
  if (source.sourceCount < 2 || source.sourceCount > 5 || source.segmentCount < 1) messages.push('M09 来源须为 2—5 份，且至少存在 1 个可定位片段')
  if (![source.knowledgeBaseId, source.courseName, source.audience, source.scope, source.sourceFingerprint, source.confirmationFingerprint, source.m09AssessmentId, source.m09AssessmentFingerprint, source.previewSegment.segmentId, source.previewSegment.excerpt].every((value) => value.trim())) messages.push('M09 知识库编号、范围、指纹、验收号或预览片段不完整')
  return { valid: messages.length === 0, messages }
}

export function validateM10Configuration(progress: M10Progress, participantId: string): M10ValidationResult {
  const messages = [...validateM10Source(progress, participantId).messages]
  const entries = Object.entries(progress.sixElements) as Array<[keyof typeof progress.sixElements, string]>
  const labels: Record<keyof typeof progress.sixElements, string> = { role: '角色', audience: '对象', task: '任务', knowledge: '知识', process: '流程', boundary: '边界' }
  for (const [key, value] of entries) if (!normalized(value)) messages.push(`六要素·${labels[key]}不能为空`)
  if (progress.sixElements.role && !/(教师).*(审核|最终|责任)|(审核|最终|责任).*(教师)/u.test(progress.sixElements.role)) messages.push('角色要素须明确教师审核或最终判断责任')
  if (progress.sixElements.task && !/(答疑|导学|练习反馈|实训提示|学习支持)/u.test(progress.sixElements.task)) messages.push('任务要素须限定为答疑与学习支持')
  if (progress.knowledgeSource && progress.sixElements.knowledge && (!progress.sixElements.knowledge.includes(progress.knowledgeSource.knowledgeBaseId) || !progress.sixElements.knowledge.includes('v1.0'))) messages.push('知识要素须指向当前 M09 知识库编号与 v1.0')
  if (progress.sixElements.process && !['了解问题', '检索材料', '引用解释', '检查理解'].every((label) => progress.sixElements.process.includes(label))) messages.push('流程要素须引用固定四步')
  if (progress.sixElements.boundary && !['超范围', '代做', '安全', '最终成绩', '敏感数据'].every((label) => progress.sixElements.boundary.includes(label))) messages.push('边界要素须引用五类异常规则')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM10Flow(progress: M10Progress, participantId: string): M10ValidationResult {
  const messages = [...validateM10Configuration(progress, participantId).messages]
  if (progress.flowSteps.length !== 4) messages.push('回答流程必须恰好为四步')
  for (const [stepId, order, label] of expectedFlow) {
    const step = progress.flowSteps.find((item) => item.stepId === stepId)
    if (!step || step.order !== order || step.label !== label) messages.push(`第 ${order} 步必须固定为“${label}”，不能删除或调序`)
    else if (!normalized(step.action) || !normalized(step.failureHandling)) messages.push(`“${label}”须同时填写助教动作和失败处理`)
  }
  const retrieve = progress.flowSteps.find((item) => item.stepId === 'retrieve')
  if (retrieve?.failureHandling && !/(边界|停止|转交)/u.test(retrieve.failureHandling)) messages.push('检索失败必须进入边界处理，不得继续猜测')
  const check = progress.flowSteps.find((item) => item.stepId === 'check')
  if (check?.action && !/(复述|自检|小步骤|理解)/u.test(check.action)) messages.push('检查理解须让学生复述、自检或完成小步骤')
  if (check && /(直接生成完整|替学生完成|给出可提交答案)/u.test(check.action)) messages.push('检查理解不得变成替学生完成作业')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM10Boundaries(progress: M10Progress, participantId: string): M10ValidationResult {
  const messages = [...validateM10Flow(progress, participantId).messages]
  const types: M10BoundaryType[] = ['out-of-scope', 'do-work', 'safety', 'final-grade', 'sensitive-data']
  if (progress.boundaryRules.length !== 5 || new Set(progress.boundaryRules.map((item) => item.type)).size !== 5) messages.push('边界规则必须恰好为五类且类型唯一')
  for (const type of types) {
    const rule = progress.boundaryRules.find((item) => item.type === type)
    if (!rule) { messages.push(`缺少 ${type} 边界规则`); continue }
    if (![rule.trigger, rule.response, rule.handoff].every((value) => normalized(value))) messages.push(`${rule.label}：触发条件、规范回应和转交对象须完整`)
    if (!allowedActions.has(rule.action) || rule.action !== expectedBoundaryActions[type]) messages.push(`${rule.label}：回应动作必须为“${expectedBoundaryActions[type]}”`)
  }
  const out = progress.boundaryRules.find((item) => item.type === 'out-of-scope')
  if (out?.response && !/(不猜测|不支持|资料范围|不生成引用)/u.test(out.response)) messages.push('超范围回应须明确不猜测或不伪造引用')
  const work = progress.boundaryRules.find((item) => item.type === 'do-work')
  if (work?.response && !/(不代替|不代做|自主完成|拆分思路)/u.test(work.response)) messages.push('代做规则须拒绝完整代做并引导学生完成')
  const safety = progress.boundaryRules.find((item) => item.type === 'safety')
  if (safety?.response && !/(暂停|停止).*(安全|核验|教师)/u.test(safety.response)) messages.push('安全规则须暂停未核验操作并转交')
  const grade = progress.boundaryRules.find((item) => item.type === 'final-grade')
  if (grade?.response && !/(AI).*(不决定|不能决定).*(成绩|分数)/u.test(grade.response)) messages.push('最终成绩规则须明确 AI 不作最终决定')
  const sensitive = progress.boundaryRules.find((item) => item.type === 'sensitive-data')
  if (sensitive?.response && !/(不收集|不存储|脱敏)/u.test(sensitive.response)) messages.push('敏感数据规则须明确不收集、不存储或先脱敏')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function traceIsFixed(record: M10Progress['previews'][number]) {
  return record.trace.length === 4 && expectedFlow.every(([stepId, order, label], index) => {
    const step = record.trace[index]
    return step?.stepId === stepId && step.order === order && step.label === label && Boolean(step.detail.trim())
  })
}

export function validateM10Previews(progress: M10Progress, participantId: string): M10ValidationResult {
  const messages = [...validateM10Boundaries(progress, participantId).messages]
  const normal = progress.previews.find((item) => item.kind === 'normal')
  const boundary = progress.previews.find((item) => item.kind === 'boundary')
  const currentFingerprint = m10ConfigurationFingerprint(progress)
  if (progress.previews.length !== 2 || !normal || !boundary) messages.push('须恰好生成 1 道正常问题和 1 道边界问题预览')
  for (const record of progress.previews) {
    if (!record.readOnly || record.configurationFingerprint !== currentFingerprint) messages.push(`${record.kind === 'normal' ? '正常' : '边界'}预览不是当前配置的只读结果，请重新运行`)
    if (!traceIsFixed(record)) messages.push(`${record.kind === 'normal' ? '正常' : '边界'}预览须展示完整四步路径`)
  }
  if (normal && (!normal.source || normal.source.segmentId !== progress.knowledgeSource?.previewSegment.segmentId || !normal.rawAnswer.includes(normal.source.sourceLabel))) messages.push('正常预览须命中 M09 当前原文片段并显示准确来源')
  if (boundary && (boundary.source || boundary.triggeredRuleId !== 'BR-01' || !boundary.handoff || /\[\d+\]/u.test(boundary.rawAnswer))) messages.push('边界预览须命中 BR-01、无伪造引用并明确转交')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function groupContext(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const peers = directory.participants.filter((item) => item.groupId === current?.groupId && item.participantId !== current?.participantId)
  return { current, peers }
}

export function validateM10PeerReview(progress: M10Progress, directory: ParticipantDirectory): M10ValidationResult {
  const { current, peers } = groupContext(directory)
  const review = progress.peerReview
  const reviewer = peers.find((item) => item.participantId === review.reviewerId)
  const messages: string[] = []
  if (!current || !reviewer || review.reviewerGroupId !== current.groupId) messages.push('互评人必须是当前同组其他真实参训成员')
  if (!review.reviewerRole) messages.push('请记录本次互评的任务临时角色')
  if (!review.reviewId || !review.configurationFingerprint) messages.push('请先生成与当前配置关联的互评记录')
  if (review.checks.length !== 3 || !['role', 'flow', 'boundaries'].every((id) => review.checks.some((item) => item.checkId === id && item.note.trim()))) messages.push('须分别检查角色、四步流程和五类边界')
  if (!review.checks.some((item) => item.conclusion === '需调整')) messages.push('本地确定性互评须如实保留至少 1 项“需调整”')
  if (!review.suggestion.trim()) messages.push('互评须给出可执行的具体建议')
  if (!review.disclosure.includes('无多人后端') || !review.disclosure.includes('不冒充')) messages.push('页面须披露无多人后端的确定性模拟边界')
  if (!review.submitted || !review.submittedAt) messages.push('请提交当前互评记录并保留提交时间')
  const expectedReviewFingerprint = progress.revisions[0]?.beforeConfigurationFingerprint ?? m10ConfigurationFingerprint(progress)
  if (review.configurationFingerprint && review.configurationFingerprint !== expectedReviewFingerprint) messages.push('互评指纹与修改前配置不一致，请重新互评')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM10Revision(progress: M10Progress, directory: ParticipantDirectory): M10ValidationResult {
  const messages = [...validateM10PeerReview(progress, directory).messages]
  if (progress.revisions.length < 1) messages.push('作者须根据同组互评至少保存 1 处实质修改')
  for (const revision of progress.revisions) {
    if (!normalized(revision.beforeValue) || !normalized(revision.afterValue) || normalized(revision.beforeValue) === normalized(revision.afterValue)) messages.push(`${revision.field || '配置'}：修改前后须存在实质差异`)
    if (!revision.basis.trim() || !revision.treatment || revision.reviewId !== progress.peerReview.reviewId) messages.push(`${revision.field || '配置'}：须保留互评依据、处理方式和评审记录关联`)
  }
  const latest = progress.revisions.at(-1)
  if (latest && latest.afterConfigurationFingerprint !== m10ConfigurationFingerprint(progress)) messages.push('当前配置已脱离最后一条修改记录，需重新互评或修改')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function groupRosterFingerprint(directory: ParticipantDirectory) {
  const { current } = groupContext(directory)
  return m10Hash(directory.participants.filter((item) => item.groupId === current?.groupId).map((item) => ({ id: item.participantId, name: item.name, groupId: item.groupId })))
}

export function m10ConfirmationFingerprint(progress: M10Progress, directory: ParticipantDirectory) {
  return m10Hash({
    source: m10KnowledgeSourceFingerprint(progress.knowledgeSource),
    configuration: m10ConfigurationFingerprint(progress),
    previews: progress.previews,
    peerReview: progress.peerReview,
    revisions: progress.revisions,
    teacherConfirmation: progress.teacherConfirmation,
    groupRoster: groupRosterFingerprint(directory),
  })
}

export function validateM10Confirmation(progress: M10Progress, directory: ParticipantDirectory): M10ValidationResult {
  const participantId = directory.currentParticipantId
  const messages = [
    ...validateM10Previews(progress, participantId).messages,
    ...validateM10Revision(progress, directory).messages,
  ]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.knowledgeSourceConfirmed || !confirmation.roleBoundaryConfirmed || !confirmation.fourStepFlowConfirmed || !confirmation.fiveRulesConfirmed || !confirmation.humanTakeoverResponsibilityConfirmed) messages.push('请完成知识来源、角色边界、四步流程、五类规则和最终人工接管责任五项教师确认')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function confirmedM10AssistantIsCurrent(progress: M10Progress, directory: ParticipantDirectory) {
  return Boolean(progress.confirmedAssistant
    && progress.confirmedAssistant.participantId === directory.currentParticipantId
    && progress.confirmedAssistant.artifacts.length === 2
    && progress.confirmedAssistant.artifacts.map((item) => item.kind).join('|') === 'course-assistant-v1|configuration-evidence'
    && progress.confirmedAssistant.personalPortfolioSlot === '课程 AI 助教'
    && progress.confirmedAssistant.confirmationFingerprint === m10ConfirmationFingerprint(progress, directory))
}

export function m10ContentFingerprint(progress: M10Progress, directory: ParticipantDirectory) {
  return m10Hash({
    confirmation: m10ConfirmationFingerprint(progress, directory),
    confirmed: progress.confirmedAssistant ? {
      assistantId: progress.confirmedAssistant.assistantId,
      confirmedAt: progress.confirmedAssistant.confirmedAt,
      artifactIds: progress.confirmedAssistant.artifacts.map((item) => item.artifactId),
    } : null,
  })
}

export function latestM10AssessmentIsCurrent(progress: M10Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === m10ContentFingerprint(progress, directory))
}

export function validateM10AssessmentSubmission(progress: M10Progress, directory: ParticipantDirectory): M10ValidationResult {
  const messages = [...validateM10Confirmation(progress, directory).messages]
  if (!confirmedM10AssistantIsCurrent(progress, directory)) messages.push('请先形成与当前 M09 来源、配置、互评、修改和五项确认一致的课程 AI 助教 v1.0')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function progressForM10(progress: M10Progress, directory: ParticipantDirectory) {
  if (progress.route === 'overview' && !progress.knowledgeSource && progress.assessments.length === 0) return 0
  const participantId = directory.currentParticipantId
  const stages = [
    validateM10Source(progress, participantId).valid,
    validateM10Configuration(progress, participantId).valid,
    validateM10Flow(progress, participantId).valid,
    validateM10Boundaries(progress, participantId).valid,
    validateM10Previews(progress, participantId).valid,
    validateM10PeerReview(progress, directory).valid,
    confirmedM10AssistantIsCurrent(progress, directory),
    latestM10AssessmentIsCurrent(progress, directory),
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}

export function routeForM10CoreRequirement(id: string): M10Route {
  if (id === 'm09-source') return 'source'
  if (id === 'six-and-flow') return 'flow'
  if (id === 'five-boundaries') return 'boundaries'
  if (id === 'normal-boundary-preview') return 'preview'
  return 'review-confirm'
}
