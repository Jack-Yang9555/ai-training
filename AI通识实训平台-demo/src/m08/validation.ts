import type { ParticipantDirectory } from '../training/types'
import { currentM08Version, type M08Progress } from './domain'
import { buildM08PeerArtifacts } from './peerArtifacts'

export interface M08ValidationResult { valid: boolean; messages: string[] }

function hash(value: unknown) {
  const text = JSON.stringify(value)
  let result = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

function currentGroupId(directory: ParticipantDirectory) {
  return directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? ''
}

export function containsM08UnsafeContent(values: string[]) {
  const text = values.join('\n')
  return /(?:sk-[a-z0-9_-]{12,}|api[_ -]?key\s*[:=]|(?:1[3-9]\d{9})|[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|<script\s+src|<link\s+[^>]*href|fetch\s*\(|websocket)/iu.test(text)
}

export function validateM08Input(progress: M08Progress): M08ValidationResult {
  const input = progress.input
  const fields: Array<[string, string]> = [
    [input.teachingUse, '教学用途'], [input.courseTitle, '课程名称'], [input.lessonTitle, '课次主题'],
    [input.audience, '授课对象'], [input.studentFoundation, '学情基础'], [input.learningObjective, '学习目标'], [input.verifiedMaterial, '已核验材料'],
  ]
  const missing = fields.filter(([value]) => !value.trim()).map(([, label]) => label)
  const messages: string[] = []
  if (missing.length) messages.push(`网页输入尚缺：${missing.join('、')}`)
  if (!input.sourceConfirmed) messages.push('请确认当前使用的是已核验材料；可使用任务内基线或可选复用 M04、M06')
  if (!input.rightsConfirmed || !input.privacyConfirmed || !input.noExternalResourceConfirmed || !input.noSecretConfirmed) messages.push('请完成版权、隐私、离线资源和无密钥四项安全确认')
  if (containsM08UnsafeContent(fields.map(([value]) => value))) messages.push('输入不得包含真实联系方式、密钥、外部网址或外部脚本资源')
  return { valid: messages.length === 0, messages }
}

export function validateM08Draft(progress: M08Progress): M08ValidationResult {
  const messages = [...validateM08Input(progress).messages]
  const version = currentM08Version(progress)
  if (!version) return { valid: false, messages: [...messages, '请先运行确定性本地生成器形成 AI 原始网页'] }
  if (!version.title.trim() || !version.objective.trim()) messages.push('网页必须包含标题和学习目标')
  if (version.knowledgeCards.length < 3 || version.knowledgeCards.length > 5 || version.knowledgeCards.some((item) => !item.title.trim() || !item.content.trim() || !item.evidenceSource.trim())) messages.push('网页必须包含 3—5 张有内容依据的知识卡')
  if (version.questions.length !== 5 || version.questions.some((item) => item.options.length < 2 || item.correctIndex < 0 || item.correctIndex >= item.options.length || !item.prompt.trim() || !item.explanation.trim() || !item.evidenceSource.trim())) messages.push('网页必须恰好包含 5 道有正确答案、解析和依据的即时反馈题')
  if (!version.interactionLabel.trim() || !version.html.toLowerCase().startsWith('<!doctype html>')) messages.push('网页必须包含至少 1 个可操作互动并生成完整单文件 HTML')
  if (/(?:https?:\/\/|<script\s+src|<link\s+[^>]*href|\ssrc\s*=|\shref\s*=|fetch\s*\(|websocket)/iu.test(version.html)) messages.push('最终网页不得依赖外部网址、脚本、样式或网络请求')
  return { valid: messages.length === 0, messages: [...new Set(messages)] }
}

export function validateM08Iterations(progress: M08Progress): M08ValidationResult {
  const messages = [...validateM08Draft(progress).messages]
  const rounds = progress.iterationRecords.map((item) => item.round)
  if (progress.versions.length !== 3 || progress.iterationRecords.length !== 2 || rounds[0] !== 1 || rounds[1] !== 2) messages.push('必须在 AI 原始 V0 基础上完成恰好 2 轮自然语言迭代，形成 V1、V2')
  if (progress.iterationRecords.some((item) => !item.instruction.trim() || !item.beforeSummary.trim() || !item.afterSummary.trim() || item.beforeSummary === item.afterSummary)) messages.push('每轮迭代须保留教师指令以及可辨认的修改前后记录')
  return { valid: messages.length === 0, messages: [...new Set(messages)] }
}

export function validateM08BrowserTest(progress: M08Progress): M08ValidationResult {
  const messages = [...validateM08Iterations(progress).messages]
  const test = progress.browserTest
  if (!test.downloaded || !test.offlineOpened || !test.desktopChecked || !test.mobileChecked || !test.singleFileChecked || !test.fiveQuestionsChecked || !test.instantFeedbackChecked || !test.interactionChecked) messages.push('请下载单文件 HTML，并完成离线、桌面、手机、5 题、即时反馈和互动测试')
  return { valid: messages.length === 0, messages: [...new Set(messages)] }
}

export function validateM08PeerTest(progress: M08Progress, directory: ParticipantDirectory): M08ValidationResult {
  const review = progress.peerTest
  const artifact = buildM08PeerArtifacts(directory).find((item) => item.participantId === review.reviewerId && item.artifactId === review.artifactId)
  const messages: string[] = []
  if (!artifact) messages.push('请选择当前同组其他成员，以学生身份测试网页')
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  if (!review.studentOperation.trim() || !review.issueFound.trim()) messages.push('请记录学生操作过程和发现的至少 1 个问题')
  if (!review.correctionBefore.trim() || !review.correctionAfter.trim() || review.correctionBefore.trim() === review.correctionAfter.trim() || !review.correctionBasis.trim()) messages.push('请依据同伴测试完成至少 1 处有前后差异和依据的修正')
  if (!review.submitted) messages.push('请提交同组学生测试记录')
  return { valid: messages.length === 0, messages }
}

export function m08ConfirmationFingerprint(progress: M08Progress, directory: ParticipantDirectory) {
  return hash({ input: progress.input, versions: progress.versions, iterations: progress.iterationRecords, browser: progress.browserTest, peer: progress.peerTest, confirmation: progress.teacherConfirmation, groupId: currentGroupId(directory) })
}

export function confirmedM08WebpageIsCurrent(progress: M08Progress, directory: ParticipantDirectory) {
  return Boolean(progress.confirmedWebpage && progress.confirmedWebpage.confirmationFingerprint === m08ConfirmationFingerprint(progress, directory))
}

export function validateM08Confirmation(progress: M08Progress, directory: ParticipantDirectory): M08ValidationResult {
  const messages = [...validateM08BrowserTest(progress).messages, ...validateM08PeerTest(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.answersExplanationsConfirmed || !confirmation.materialAlignmentConfirmed || !confirmation.responsiveConfirmed || !confirmation.offlineSafetyConfirmed || !confirmation.finalResponsibilityConfirmed) messages.push('请完成答案解析、材料一致、响应式、离线安全和最终责任五项教师确认')
  return { valid: messages.length === 0, messages: [...new Set(messages)] }
}

export function m08ContentFingerprint(progress: M08Progress, directory: ParticipantDirectory) {
  return hash({ confirmation: m08ConfirmationFingerprint(progress, directory), confirmed: progress.confirmedWebpage ? { webpageId: progress.confirmedWebpage.webpageId, sourceVersionId: progress.confirmedWebpage.sourceVersionId, html: progress.confirmedWebpage.html, confirmedAt: progress.confirmedWebpage.confirmedAt } : null })
}

export function latestM08AssessmentIsCurrent(progress: M08Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === m08ContentFingerprint(progress, directory))
}

export function validateM08AssessmentSubmission(progress: M08Progress, directory: ParticipantDirectory): M08ValidationResult {
  const messages = [...validateM08Confirmation(progress, directory).messages]
  if (!confirmedM08WebpageIsCurrent(progress, directory)) messages.push('请先形成与当前迭代、测试和人工确认一致的最终网页')
  return { valid: messages.length === 0, messages }
}

export function progressForM08(progress: M08Progress, directory: ParticipantDirectory) {
  if (progress.route === 'overview' && progress.versions.length === 0 && progress.assessments.length === 0) return 0
  const stages = [validateM08Input(progress).valid, validateM08Draft(progress).valid, validateM08Iterations(progress).valid, validateM08BrowserTest(progress).valid, validateM08PeerTest(progress, directory).valid, confirmedM08WebpageIsCurrent(progress, directory), latestM08AssessmentIsCurrent(progress, directory)]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}
