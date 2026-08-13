import type { ParticipantDirectory } from '../training/types'
import { buildM03PeerArtifacts } from './peerArtifacts'
import { m03VariableLabels } from './data'
import { m03PromptTopics, recognizedM03MessageTopics } from './promptMessage'
import type {
  M03IterationVariable,
  M03Progress,
  M03PromptSnapshot,
  M03RunResult,
  M03Version,
} from './types'

export interface M03ValidationResult { valid: boolean; messages: string[] }

const comparableFields: M03IterationVariable[] = ['studentFoundation', 'questionCount', 'difficulty', 'duration', 'outputFormat']
const requiredTextFields: Array<[keyof M03PromptSnapshot, string]> = [
  ['role', '角色'],
  ['courseName', '课程名称'], ['lessonName', '课次'], ['teachingPhase', '使用环节'],
  ['audience', '授课对象'], ['studentFoundation', '学生基础'], ['objective', '教学目标'],
  ['task', '教学任务'], ['materialName', '材料名称'], ['materialContent', '课程材料正文'],
  ['materialScope', '允许使用的材料范围'], ['requiredSections', '必备输出部分'], ['qualityStandards', '质量标准'],
]

export function containsM03SensitiveInformation(values: string[]): boolean {
  const text = values.join('\n')
  return /(?:1[3-9]\d{9})|(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})|(?:\d{17}[\dXx])|(?:学号|身份证号|手机号|联系电话)\s*[：:]?\s*[A-Za-z0-9-]{5,}/u.test(text)
}

export function m03SnapshotTextValues(snapshot: M03PromptSnapshot): string[] {
  return requiredTextFields.map(([field]) => String(snapshot[field] ?? ''))
}

export function validateM03Design(snapshot: M03PromptSnapshot): M03ValidationResult {
  const messages: string[] = []
  const missing = requiredTextFields.filter(([field]) => !String(snapshot[field] ?? '').trim()).map(([, label]) => label)
  if (missing.length > 0) messages.push(`六格提示词尚缺：${missing.join('、')}`)
  if (!Number.isInteger(snapshot.duration) || snapshot.duration <= 0) messages.push('课堂时长必须为正整数')
  if (!Number.isInteger(snapshot.questionCount) || snapshot.questionCount <= 0) messages.push('题量必须为正整数')
  if (!snapshot.rightsConfirmed) messages.push('请确认课程材料来源和使用权限')
  if (!snapshot.privacyConfirmed) messages.push('请确认未输入真实学生个人信息或其他敏感信息')
  if (containsM03SensitiveInformation(m03SnapshotTextValues(snapshot))) messages.push('输入内容包含可能的手机号、邮箱、身份证号或学号，请去标识化后再生成')
  return { valid: messages.length === 0, messages }
}

export function validateM03PromptMessage(message: string, snapshot: M03PromptSnapshot): M03ValidationResult {
  const messages: string[] = []
  const recognized = recognizedM03MessageTopics(message)
  const missing = m03PromptTopics.filter(({ id }) => !recognized[id]).map(({ label }) => label)
  if (missing.length > 0) messages.push('请在消息中自行写出并填写：' + missing.join('、'))
  if (!snapshot.rightsConfirmed) messages.push('请确认课程材料来源和使用权限')
  if (!snapshot.privacyConfirmed) messages.push('请确认未输入真实学生个人信息或其他敏感信息')
  if (containsM03SensitiveInformation([message])) messages.push('输入内容包含可能的手机号、邮箱、身份证号或学号，请去标识化后再发送')
  return { valid: messages.length === 0, messages }
}

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value)
}

export function changedM03Fields(v1: M03PromptSnapshot, v2: M03PromptSnapshot): Array<keyof M03PromptSnapshot> {
  return (Object.keys(v1) as Array<keyof M03PromptSnapshot>).filter((key) => normalized(v1[key]) !== normalized(v2[key]))
}

export function validateM03Iteration(progress: M03Progress): M03ValidationResult {
  const messages: string[] = []
  if (!progress.v1) messages.push('请先生成并锁定 V1')
  if (!progress.iterationVariable) messages.push('请选择本轮唯一调整变量')
  if (!progress.iterationDraft) messages.push('尚未建立 V2 输入快照')
  if (progress.v1 && progress.iterationDraft && progress.iterationVariable) {
    const changed = changedM03Fields(progress.v1.snapshot, progress.iterationDraft)
    if (changed.length === 0) messages.push(`请修改${m03VariableLabels[progress.iterationVariable]}，新值必须与 V1 不同`)
    if (changed.length > 1) messages.push(`检测到 ${changed.length} 项变化，只允许调整一个变量`)
    if (changed.length === 1 && changed[0] !== progress.iterationVariable) messages.push(`本轮选择调整${m03VariableLabels[progress.iterationVariable]}，但实际变化字段不一致`)
    const design = validateM03Design(progress.iterationDraft)
    messages.push(...design.messages)
  }
  return { valid: messages.length === 0, messages }
}

export function paragraphBelongsToM03Run(run: M03RunResult | undefined, paragraphId: string): boolean {
  return Boolean(run?.paragraphs.some((item) => item.id === paragraphId))
}

export function validateM03Verification(progress: M03Progress, version: M03Version): M03ValidationResult {
  const record = progress.verification[version]
  const run = version === 'v1' ? progress.v1 : progress.v2
  const messages: string[] = []
  if (!paragraphBelongsToM03Run(run, record.paragraphId)) messages.push(`${version.toUpperCase()} 尚未关联有效的输出段落`)
  if (!record.materialEvidence.trim()) messages.push(`${version.toUpperCase()} 尚未填写课程材料依据`)
  if (!record.materialScope) messages.push(`${version.toUpperCase()} 尚未判断材料范围`)
  if (!record.objectiveAlignment) messages.push(`${version.toUpperCase()} 尚未判断目标一致性`)
  if (!record.conclusion.trim()) messages.push(`${version.toUpperCase()} 尚未填写核验结论`)
  return { valid: messages.length === 0, messages }
}

export function validateM03Comparison(progress: M03Progress): M03ValidationResult {
  const messages: string[] = []
  if (!progress.v1 || !progress.v2) messages.push('请先生成 V1 和 V2')
  if (!progress.comparison.changeExplanation.trim()) messages.push('请说明唯一变量如何改变了生成结果')
  if (!progress.comparison.suitabilityConclusion.trim()) messages.push('请填写两个版本的教学适用性结论')
  return { valid: messages.length === 0, messages }
}

export function validateM03ProfessionalEvidence(progress: M03Progress): M03ValidationResult {
  const v1 = validateM03Verification(progress, 'v1')
  const v2 = validateM03Verification(progress, 'v2')
  const messages = [...v1.messages, ...v2.messages]
  ;(['v1', 'v2'] as M03Version[]).forEach((version) => {
    const record = progress.verification[version]
    if (record.materialScope && record.materialScope !== '一致') messages.push(`${version.toUpperCase()} 结果仍超出材料范围`)
    if (record.objectiveAlignment && record.objectiveAlignment !== '一致') messages.push(`${version.toUpperCase()} 结果仍未与教学目标一致`)
  })
  return { valid: messages.length === 0, messages }
}

export function validateM03PeerReview(progress: M03Progress, directory: ParticipantDirectory): M03ValidationResult {
  const review = progress.peerReview
  const messages: string[] = []
  const artifacts = buildM03PeerArtifacts(directory)
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  if (!review.targetParticipantId) messages.push('请选择同组内的被互评成员')
  if (!artifacts.some((item) => item.participantId === review.targetParticipantId && item.artifactId === review.targetArtifactId)) messages.push('被互评成果已失效，请根据当前人员分组重新选择')
  if (!review.inputScopeClear || !review.outputFormatClear || !review.qualityStandardClear) messages.push('请完成输入范围、输出格式和质量标准三项清晰度检查')
  if (!review.suggestion.trim()) messages.push('请填写可执行的互评建议')
  if (!review.submitted) messages.push('请提交小组互评记录')
  return { valid: messages.length === 0, messages }
}

export function validateM03AssessmentSubmission(progress: M03Progress, directory: ParticipantDirectory): M03ValidationResult {
  const messages = [
    ...validateM03Comparison(progress).messages,
    ...validateM03Verification(progress, 'v1').messages,
    ...validateM03Verification(progress, 'v2').messages,
    ...validateM03PeerReview(progress, directory).messages,
  ]
  if (progress.assessments.length > 0 && !progress.assessmentModificationSummary.trim()) messages.push('再次验收前请填写本轮修改摘要')
  return { valid: messages.length === 0, messages }
}

export function m03CurrentFingerprint(progress: M03Progress, directory: ParticipantDirectory): string {
  const currentGroup = directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? ''
  return JSON.stringify({
    v1: progress.v1, v2: progress.v2, variable: progress.iterationVariable,
    comparison: progress.comparison, verification: progress.verification,
    peerReview: progress.peerReview, currentGroup,
  })
}

export function latestM03AssessmentIsCurrent(progress: M03Progress, directory: ParticipantDirectory): boolean {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.fingerprint === m03CurrentFingerprint(progress, directory))
}

export function progressForM03(progress: M03Progress, directory: ParticipantDirectory): number {
  const stages = [
    validateM03PromptMessage(progress.designMessage, progress.design).valid,
    Boolean(progress.v1),
    Boolean(progress.v2) && validateM03Iteration(progress).valid,
    validateM03Comparison(progress).valid && validateM03ProfessionalEvidence(progress).valid,
    validateM03PeerReview(progress, directory).valid,
    latestM03AssessmentIsCurrent(progress, directory),
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}

export { comparableFields }
