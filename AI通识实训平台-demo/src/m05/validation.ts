import type { ParticipantDirectory } from '../training/types'
import { m05RequiredDistribution } from './data'
import { buildM05PeerArtifacts } from './peerArtifacts'
import type { M05Progress, M05Question, M05QuestionType, M05RevisionRecord } from './types'

export interface M05ValidationResult { valid: boolean; messages: string[] }

export function containsM05UnsafeContent(values: string[]): boolean {
  const text = values.join('\n')
  return /(?:1[3-9]\d{9})|(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})|(?:\d{17}[\dXx])|(?:学号|身份证号|手机号|联系电话)\s*[：:]?\s*[A-Za-z0-9-]{5,}|(?:所有男生|所有女生|某地区学生都|危险操作无需防护)/u.test(text)
}

export function m05SourceIsCurrent(progress: M05Progress, assessmentId: string | undefined, planId: string | undefined): boolean {
  return Boolean(assessmentId && planId && progress.input.sourceConfirmed && progress.input.sourceM04AssessmentId === assessmentId && progress.input.sourceM04PlanId === planId)
}

export function validateM05Input(progress: M05Progress, _legacyUpstreamAvailable = true): M05ValidationResult {
  const input = progress.input
  const messages: string[] = []
  const fields: Array<[string, string]> = [
    [input.sourceM04AssessmentId, '命题输入来源编号'], [input.sourceM04PlanId, '命题输入版本编号'], [input.courseName, '课程名称'], [input.lessonName, '课次'],
    [input.audience, '授课对象'], [input.studentFoundation, '学生基础'], [input.materialName, '课程材料名称'], [input.materialContent, '课程材料正文'],
    [input.materialScope, '课程材料允许范围'], [input.assessmentScenario, '评价场景'], [input.difficultyRequirement, '难度要求'], [input.outputFormat, '输出格式'],
  ]
  const missing = fields.filter(([value]) => !value.trim()).map(([, label]) => label)
  if (missing.length) messages.push(`命题输入尚缺：${missing.join('、')}`)
  if (input.objectives.length < 3 || input.objectives.some((item) => !item.id || !item.content.trim())) messages.push('必须读取至少 3 个有效学习目标')
  if (!input.sourceConfirmed) messages.push('请确认当前命题输入；可选复用 M04 教师确认版，但不要求先完成 M04')
  if (!input.rightsConfirmed) messages.push('请确认课程材料来源和使用权限')
  if (!input.privacyConfirmed) messages.push('请确认未输入真实学生个人信息')
  if (containsM05UnsafeContent([input.courseName, input.lessonName, input.audience, input.studentFoundation, ...input.objectives.map((item) => item.content), input.materialName, input.materialContent, input.materialScope, input.assessmentScenario, input.difficultyRequirement, input.outputFormat])) messages.push('命题输入包含真实身份、歧视或不安全内容，请修正后再生成')
  return { valid: messages.length === 0, messages }
}

export function m05Distribution(questions: M05Question[]): Record<M05QuestionType, number> {
  return questions.reduce((result, item) => ({ ...result, [item.type]: result[item.type] + 1 }), { single: 0, multiple: 0, judgment: 0, scenario: 0, comprehensive: 0 } as Record<M05QuestionType, number>)
}

export function validateM05Draft(progress: M05Progress): M05ValidationResult {
  const questions = progress.draft?.questions
  if (!questions) return { valid: false, messages: ['请先生成 AI 题目包草稿'] }
  const messages: string[] = []
  if (questions.length !== 8) messages.push('题目包必须恰好包含 8 道题')
  const distribution = m05Distribution(questions)
  ;(Object.keys(m05RequiredDistribution) as M05QuestionType[]).forEach((type) => { if (distribution[type] !== m05RequiredDistribution[type]) messages.push('题型结构必须为 3 单选、1 多选、1 判断、2 情境、1 综合任务') })
  if (questions.some((item) => !item.stem.trim() || !item.answer.trim() || !item.explanation.trim() || !item.materialEvidence.trim() || !item.difficulty || item.objectiveIds.length === 0)) messages.push('每题必须包含目标、难度、答案、解析和材料依据')
  if (questions.filter((item) => ['single', 'multiple', 'judgment'].includes(item.type)).some((item) => item.options.length < 2)) messages.push('客观题必须包含可判断的候选项')
  const comprehensive = questions.find((item) => item.type === 'comprehensive')
  if (!comprehensive || comprehensive.scoringPoints.length === 0 || comprehensive.scoringPoints.some((item) => !item.criterion.trim() || item.points <= 0)) messages.push('综合任务题必须包含可执行评分要点')
  const covered = new Set(questions.flatMap((item) => item.objectiveIds))
  if (covered.size < 3) messages.push('题目必须覆盖不少于 3 个学习目标或知识点')
  return { valid: messages.length === 0, messages: [...new Set(messages)] }
}

export function validateM05Audits(progress: M05Progress): M05ValidationResult {
  const messages = [...validateM05Draft(progress).messages]
  progress.draft?.questions.forEach((question, index) => {
    const audit = progress.audits[question.id]
    if (!audit?.stemClarity || !audit.answerClarity || !audit.objectiveAligned || !audit.difficultySuitable || !audit.evidenceVerified || !audit.safeAndFair) messages.push(`请完成第 ${index + 1} 题的题干、答案、目标、难度、依据和安全检查`)
    if (['single', 'multiple'].includes(question.type) && !audit?.distractorsReasonable) messages.push(`请完成第 ${index + 1} 题干扰项检查`)
    if (question.type === 'comprehensive' && !audit?.rubricExecutable) messages.push('请确认综合任务题评分要点可执行')
  })
  return { valid: messages.length === 0, messages }
}

export function revisionIsComplete(record: M05RevisionRecord, questions: M05Question[] | undefined): boolean {
  const question = questions?.find((item) => item.id === record.questionId)
  return Boolean(question && record.originalContent === question.stem && record.revisedContent.trim() && record.revisedContent.trim() !== record.originalContent.trim() && record.reason.trim())
}

export function validateM05Revisions(progress: M05Progress): M05ValidationResult {
  const messages = [...validateM05Audits(progress).messages]
  const complete = progress.revisions.filter((item) => revisionIsComplete(item, progress.draft?.questions))
  if (new Set(complete.map((item) => item.questionId)).size < 2) messages.push('至少完整修改 2 道不同题目，并保存原题干、修改后题干和原因')
  const advancedIds = new Set(progress.draft?.questions.filter((item) => item.type === 'scenario' || item.type === 'comprehensive').map((item) => item.id))
  if (!complete.some((item) => advancedIds.has(item.questionId))) messages.push('至少 1 道修改必须是情境题或综合任务题')
  const requiredRevisionIds = progress.draft?.questions.filter((item) => progress.audits[item.id]?.stemClarity !== '清楚' || progress.audits[item.id]?.answerClarity !== '明确').map((item) => item.id) ?? []
  if (requiredRevisionIds.some((id) => !complete.some((item) => item.questionId === id))) messages.push('题干或答案检查为需调整/不清楚的题目必须纳入人工修改')
  return { valid: messages.length === 0, messages }
}

export function validateM05PeerReview(progress: M05Progress, directory: ParticipantDirectory): M05ValidationResult {
  const review = progress.peerReview
  const artifact = buildM05PeerArtifacts(directory).find((item) => item.participantId === review.targetParticipantId && item.artifactId === review.targetArtifactId)
  const messages: string[] = []
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  if (!artifact) messages.push('请选择当前同组其他成员的有效题目包')
  if (!artifact?.questions.some((item) => item.id === review.targetQuestionId)) messages.push('请关联被互评题目包中的至少 1 道题')
  if (!review.answerCorrectness || !review.materialEvidence || !review.objectiveAlignment || !review.difficultySuitability) messages.push('请完成答案、材料依据、目标对齐和难度四项交叉核验')
  if (!review.suggestion.trim()) messages.push('请填写可执行的互评建议')
  if (!review.submitted) messages.push('请提交小组互评记录')
  return { valid: messages.length === 0, messages }
}

export function m05ConfirmationFingerprint(progress: M05Progress, directory: ParticipantDirectory): string {
  const groupId = directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? ''
  return JSON.stringify({ draft: progress.draft, audits: progress.audits, revisions: progress.revisions, peerReview: progress.peerReview, confirmation: progress.confirmation, groupId })
}

export function validateM05Confirmation(progress: M05Progress, directory: ParticipantDirectory): M05ValidationResult {
  const messages = [...validateM05Revisions(progress).messages, ...validateM05PeerReview(progress, directory).messages]
  if (!progress.confirmation.peerDisposition || !progress.confirmation.peerResponse.trim()) messages.push('请记录互评建议的处理方式与依据')
  if (!progress.confirmation.answerConfirmed || !progress.confirmation.rubricConfirmed || !progress.confirmation.safetyConfirmed) messages.push('请完成答案解析、评分量规和安全公平三项教师确认')
  return { valid: messages.length === 0, messages }
}

export function confirmedM05PackageIsCurrent(progress: M05Progress, directory: ParticipantDirectory): boolean {
  return Boolean(progress.confirmedPackage && progress.confirmedPackage.confirmationFingerprint === m05ConfirmationFingerprint(progress, directory))
}

export function m05CurrentFingerprint(progress: M05Progress, directory: ParticipantDirectory): string {
  const groupId = directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? ''
  return JSON.stringify({ input: progress.input, draft: progress.draft, audits: progress.audits, revisions: progress.revisions, peerReview: progress.peerReview, confirmation: progress.confirmation, confirmedPackage: progress.confirmedPackage, groupId })
}

export function latestM05AssessmentIsCurrent(progress: M05Progress, directory: ParticipantDirectory): boolean {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.fingerprint === m05CurrentFingerprint(progress, directory))
}

export function validateM05AssessmentSubmission(progress: M05Progress, directory: ParticipantDirectory): M05ValidationResult {
  const messages = [...validateM05Confirmation(progress, directory).messages]
  if (!confirmedM05PackageIsCurrent(progress, directory)) messages.push('请形成与当前审校和互评记录一致的教师确认题目包')
  if (progress.assessments.length > 0 && !progress.assessmentModificationSummary.trim()) messages.push('再次验收前请填写本轮修改摘要')
  return { valid: messages.length === 0, messages }
}

export function progressForM05(progress: M05Progress, directory: ParticipantDirectory, _legacyUpstreamAvailable = true): number {
  const stages = [validateM05Input(progress).valid, validateM05Draft(progress).valid, validateM05Audits(progress).valid, validateM05Revisions(progress).valid, confirmedM05PackageIsCurrent(progress, directory), latestM05AssessmentIsCurrent(progress, directory)]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}
