import type { ParticipantDirectory } from '../training/types'
import { buildM04PeerArtifacts } from './peerArtifacts'
import type { M04CorrectionRecord, M04CorrectionType, M04LessonPlan, M04Progress } from './types'

export interface M04ValidationResult { valid: boolean; messages: string[] }

const requiredInputFields: Array<[keyof M04Progress['input'], string]> = [
  ['sourceM03AssessmentId', '教案输入来源编号'], ['sourceM03RunId', '教案输入版本编号'], ['sourcePromptSummary', '结构化教学要求摘要'],
  ['courseName', '课程名称'], ['lessonName', '课次'], ['audience', '授课对象'], ['studentFoundation', '学生基础'],
  ['teachingObjective', 'M03 教学目标'],
  ['realWorkTask', '真实工作任务'], ['equipmentConstraints', '设备限制'], ['resourceConstraints', '资源限制'],
  ['materialName', '课程材料名称'], ['materialContent', '课程材料正文'], ['materialScope', '课程材料允许范围'],
]

export function containsM04SensitiveInformation(values: string[]): boolean {
  const text = values.join('\n')
  return /(?:1[3-9]\d{9})|(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})|(?:\d{17}[\dXx])|(?:学号|身份证号|手机号|联系电话)\s*[：:]?\s*[A-Za-z0-9-]{5,}/u.test(text)
}

export function m04InputTextValues(progress: M04Progress): string[] {
  return requiredInputFields
    .filter(([field]) => field !== 'sourceM03AssessmentId' && field !== 'sourceM03RunId')
    .map(([field]) => String(progress.input[field] ?? ''))
}

export function m04SourceIsCurrent(progress: M04Progress, assessmentId: string | undefined, runId: string | undefined): boolean {
  return Boolean(assessmentId && runId && progress.input.sourceConfirmed && progress.input.sourceM03AssessmentId === assessmentId && progress.input.sourceM03RunId === runId)
}

export function validateM04Input(progress: M04Progress, _legacyUpstreamAvailable = true): M04ValidationResult {
  const messages: string[] = []
  const missing = requiredInputFields.filter(([field]) => !String(progress.input[field] ?? '').trim()).map(([, label]) => label)
  if (missing.length > 0) messages.push(`教案输入尚缺：${missing.join('、')}`)
  if (!Number.isInteger(progress.input.duration) || progress.input.duration < 45 || progress.input.duration > 90) messages.push('课堂时长必须为 45—90 分钟的整数')
  if (!progress.input.sourceConfirmed) messages.push('请确认当前教案输入；可选复用 M03 成果，但不要求先完成 M03')
  if (!progress.input.rightsConfirmed) messages.push('请确认课程材料来源和使用权限')
  if (!progress.input.privacyConfirmed) messages.push('请确认未输入真实学生个人信息或其他敏感信息')
  if (containsM04SensitiveInformation(m04InputTextValues(progress))) messages.push('输入内容包含可能的手机号、邮箱、身份证号或学号，请去标识化后再生成')
  return { valid: messages.length === 0, messages }
}

export function lessonPlanDuration(plan: M04LessonPlan | undefined): number {
  return plan?.activities.reduce((total, item) => total + item.minutes, 0) ?? 0
}

export function lessonPlanMappingsComplete(plan: M04LessonPlan | undefined): boolean {
  if (!plan || plan.objectives.length !== 3 || plan.activities.length === 0 || plan.assessments.length === 0 || plan.supports.length === 0) return false
  const objectiveIds = new Set(plan.objectives.map((item) => item.id))
  const activityIds = new Set(plan.activities.map((item) => item.id))
  const allRefsValid = plan.activities.every((item) => item.objectiveIds.length > 0 && item.objectiveIds.every((id) => objectiveIds.has(id)))
    && plan.assessments.every((item) => item.objectiveIds.length > 0 && item.activityIds.length > 0 && item.objectiveIds.every((id) => objectiveIds.has(id)) && item.activityIds.every((id) => activityIds.has(id)))
    && plan.supports.every((item) => item.objectiveIds.length > 0 && item.activityIds.length > 0 && item.objectiveIds.every((id) => objectiveIds.has(id)) && item.activityIds.every((id) => activityIds.has(id)))
  const allObjectivesCovered = [...objectiveIds].every((id) => plan.activities.some((item) => item.objectiveIds.includes(id)) && plan.assessments.some((item) => item.objectiveIds.includes(id)) && plan.supports.some((item) => item.objectiveIds.includes(id)))
  return allRefsValid && allObjectivesCovered
}

export function validateM04Draft(progress: M04Progress): M04ValidationResult {
  const plan = progress.draft
  const messages: string[] = []
  if (!plan) return { valid: false, messages: ['请先生成 AI 教案草稿'] }
  if (plan.objectives.length !== 3) messages.push('教案必须包含恰好 3 个学习目标')
  if (plan.objectives.some((item) => !item.content.trim() || !item.observableEvidence.trim())) messages.push('每个学习目标必须写明可观察、可评价的证据')
  if (plan.activities.some((item) => item.minutes <= 0 || !item.teacherAction.trim() || !item.studentTask.trim() || !item.checkMethod.trim())) messages.push('每项活动必须包含时间、教师动作、学生任务和检查方式')
  if (lessonPlanDuration(plan) !== progress.input.duration) messages.push('全部课堂活动时间合计必须等于输入课时')
  if (!lessonPlanMappingsComplete(plan)) messages.push('学情、目标、活动、评价和分层支持之间的对应关系不完整')
  return { valid: messages.length === 0, messages }
}

export function correctionIsComplete(record: M04CorrectionRecord, plan: M04LessonPlan | undefined): boolean {
  const section = plan?.sections.find((item) => item.id === record.sectionId)
  return Boolean(section && record.originalContent === section.content && record.revisedContent.trim() && record.revisedContent.trim() !== record.originalContent.trim() && record.basis.trim())
}

export function validateM04Audit(progress: M04Progress): M04ValidationResult {
  const messages: string[] = [...validateM04Draft(progress).messages]
  const plan = progress.draft
  if (!plan) return { valid: false, messages }
  if (plan.objectives.some((item) => !progress.audit.objectiveChecks[item.id])) messages.push('请逐项确认 3 个学习目标可在本次课内观察和评价')
  if (plan.activities.some((item) => !progress.audit.activityChecks[item.id])) messages.push('请逐项判断每项课堂活动是否可实施')
  if (plan.activities.some((item) => progress.audit.activityChecks[item.id] === '不可实施')) messages.push('仍有不可实施的课堂活动，请完成调整后再确认')
  if (!progress.audit.durationChecked || !progress.audit.equipmentChecked || !progress.audit.resourcesChecked) messages.push('请完成课时、设备和资源限制检查')
  if (!progress.audit.materialVerified || !progress.audit.safetyVerified) messages.push('请完成课程材料依据和专业安全检查')
  ;(['difficulty', 'activity', 'professional'] as M04CorrectionType[]).forEach((type) => {
    if (!correctionIsComplete(progress.audit.corrections[type], plan)) messages.push(`请完整保存${type === 'difficulty' ? '难度' : type === 'activity' ? '课堂活动' : '专业表述'}的原内容、修改后内容和修改依据`)
  })
  return { valid: messages.length === 0, messages }
}

export function validateM04PeerReview(progress: M04Progress, directory: ParticipantDirectory): M04ValidationResult {
  const review = progress.peerReview
  const artifacts = buildM04PeerArtifacts(directory)
  const messages: string[] = []
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  if (!review.targetParticipantId) messages.push('请选择同组内的被互评成员')
  if (!artifacts.some((item) => item.participantId === review.targetParticipantId && item.artifactId === review.targetArtifactId)) messages.push('被互评教案已失效，请根据当前人员分组重新选择')
  if (!review.overallImplementability) messages.push('请判断教案整体可实施性')
  if (!review.objectiveActivityAssessment || !review.objectiveObservable || !review.activityFeasible || !review.differentiatedSupport) messages.push('请完成目标—活动—评价、目标可观察性、活动可行性和分层支持四项互评')
  if (!review.suggestion.trim()) messages.push('请填写可执行的互评建议')
  if (!review.submitted) messages.push('请提交小组互评记录')
  return { valid: messages.length === 0, messages }
}

export function m04ConfirmationFingerprint(progress: M04Progress, directory: ParticipantDirectory): string {
  const currentGroup = directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? ''
  return JSON.stringify({ draft: progress.draft, audit: progress.audit, peerReview: progress.peerReview, confirmation: progress.confirmation, currentGroup })
}

export function validateM04Confirmation(progress: M04Progress, directory: ParticipantDirectory): M04ValidationResult {
  const messages = [...validateM04Audit(progress).messages, ...validateM04PeerReview(progress, directory).messages]
  if (!progress.confirmation.peerDisposition) messages.push('请说明如何处理组员互评建议')
  if (!progress.confirmation.peerResponse.trim()) messages.push('请记录互评建议的采纳、调整或不采纳依据')
  if (!progress.confirmation.professionalConfirmed || !progress.confirmation.implementationConfirmed || !progress.confirmation.safetyConfirmed) messages.push('请完成专业准确、课堂可实施和安全合规三项教师最终确认')
  return { valid: messages.length === 0, messages }
}

export function confirmedM04PlanIsCurrent(progress: M04Progress, directory: ParticipantDirectory): boolean {
  return Boolean(progress.confirmedPlan && progress.confirmedPlan.confirmationFingerprint === m04ConfirmationFingerprint(progress, directory))
}

export function m04CurrentFingerprint(progress: M04Progress, directory: ParticipantDirectory): string {
  return JSON.stringify({ input: progress.input, draft: progress.draft, audit: progress.audit, peerReview: progress.peerReview, confirmation: progress.confirmation, confirmedPlan: progress.confirmedPlan, groupId: directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? '' })
}

export function latestM04AssessmentIsCurrent(progress: M04Progress, directory: ParticipantDirectory): boolean {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.fingerprint === m04CurrentFingerprint(progress, directory))
}

export function validateM04AssessmentSubmission(progress: M04Progress, directory: ParticipantDirectory): M04ValidationResult {
  const messages = [...validateM04Confirmation(progress, directory).messages]
  if (!confirmedM04PlanIsCurrent(progress, directory)) messages.push('请基于当前审校与互评记录生成教师确认版教案')
  if (progress.assessments.length > 0 && !progress.assessmentModificationSummary.trim()) messages.push('再次验收前请填写本轮修改摘要')
  return { valid: messages.length === 0, messages }
}

export function progressForM04(progress: M04Progress, directory: ParticipantDirectory, _legacyUpstreamAvailable = true): number {
  const stages = [
    validateM04Input(progress).valid,
    Boolean(progress.draft),
    validateM04Audit(progress).valid,
    validateM04PeerReview(progress, directory).valid,
    confirmedM04PlanIsCurrent(progress, directory),
    latestM04AssessmentIsCurrent(progress, directory),
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}
