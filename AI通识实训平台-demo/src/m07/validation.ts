import type { ParticipantDirectory } from '../training/types'
import { m07Dataset, m07Fields } from './data'
import { m07ContentFingerprint, m07ConfirmationFingerprint, type M07Progress } from './domain'
import { buildM07PeerArtifacts } from './peerArtifacts'
import { calculateM07Metrics } from './runner'

export interface M07ValidationResult { valid: boolean; messages: string[] }

export function containsM07UnsafeJudgment(values: string[]) {
  return /(?:学习态度(?:消极|差)|能力(?:很差|低下|固定)|差生|笨|永久|长期能力|按成绩排名|第\s*\d+\s*名)/u.test(values.join('\n'))
}

export function validateM07Input(progress: M07Progress): M07ValidationResult {
  const input = progress.input
  const fields: Array<[string, string]> = [[input.sourceAssessmentId,'来源编号'],[input.sourcePackageId,'情境版本'],[input.sourceSummary,'来源说明'],[input.courseName,'课程名称'],[input.lessonName,'课次主题'],[input.audience,'授课对象'],[input.teachingStage,'教学使用阶段']]
  const missing = fields.filter(([value]) => !value.trim()).map(([,label]) => label)
  const messages: string[] = []
  if (missing.length) messages.push(`分析输入尚缺：${missing.join('、')}`)
  if (input.teachingObjectives.length < 2 || input.teachingObjectives.some((item) => !item.trim())) messages.push('请提供至少 2 个有效教学目标')
  if (input.datasetId !== 'M07-VIRTUAL-A01-A20-V1') messages.push('只能使用页面提供的 A01—A20 匿名虚拟成绩表')
  if (!input.sourceConfirmed) messages.push('请确认当前课程情境；可选复用 M06，但不要求先完成 M06')
  if (!input.anonymousConfirmed || !input.virtualDataConfirmed || !input.noRankingConfirmed) messages.push('请确认匿名虚拟数据、不用于真实排名且不导入真实学生信息')
  return { valid: messages.length === 0, messages }
}

export function validateM07DataCheck(progress: M07Progress): M07ValidationResult {
  const messages = [...validateM07Input(progress).messages]
  if (m07Fields.some((field) => !progress.dataCheck.checkedFields.includes(field))) messages.push('请检查成绩表全部 9 个字段')
  if (!progress.dataCheck.missingRecordIds.includes('A20') || !progress.dataCheck.missingHandling.trim()) messages.push('请识别 A20 测验二缺失，并记录按有效样本统计的处理方式')
  if (!progress.dataCheck.anomalyRecordIds.includes('A17') || !progress.dataCheck.anomalyHandling.trim()) messages.push('请识别 A17 两次测验分差异常，并记录保留与待核方式')
  if (!progress.dataCheck.teacherConfirmed) messages.push('请确认已完成人工数据质量检查')
  return { valid: messages.length === 0, messages }
}

export function validateM07Draft(progress: M07Progress): M07ValidationResult {
  const messages = [...validateM07DataCheck(progress).messages]
  if (!progress.draft) return { valid: false, messages: [...messages, '请先运行确定性统计并生成 AI 解释草稿'] }
  const expected = calculateM07Metrics(m07Dataset)
  if (expected.some((metric) => { const actual = progress.draft?.metrics.find((item) => item.id === metric.id); return !actual || actual.value !== metric.value || actual.sampleSize !== metric.sampleSize })) messages.push('平均分、分数段、知识点正确率、实操均分或作业完成率与确定性计算不一致')
  if (progress.draft.aiConclusions.length !== 3) messages.push('AI 解释草稿必须包含有据、需限定和无据三类待核结论')
  return { valid: messages.length === 0, messages }
}

export function validateM07ManualChecks(progress: M07Progress): M07ValidationResult {
  const messages = [...validateM07Draft(progress).messages]
  const complete = progress.manualChecks.filter((check) => {
    const metric = progress.draft?.metrics.find((item) => item.id === check.metricId)
    return metric && check.teacherCalculatedValue === metric.value && check.aiValue === metric.value && check.status && check.note.trim()
  })
  if (new Set(complete.map((item) => item.metricId)).size < 3) messages.push('请人工复核至少 3 个不同关键数字，并记录计算值、一致/纠正状态和说明')
  return { valid: messages.length === 0, messages }
}

export function validateM07Conclusions(progress: M07Progress): M07ValidationResult {
  const messages = [...validateM07ManualChecks(progress).messages]
  progress.draft?.aiConclusions.forEach((conclusion) => {
    const review = progress.conclusionReviews.find((item) => item.conclusionId === conclusion.id)
    if (!review || review.judgment !== conclusion.requiredJudgment || !review.basis.trim()) messages.push(`请正确判断并说明“${conclusion.aiText}”的证据边界`)
    if (conclusion.requiredJudgment === '结论无据' && (!review?.removed || review.finalText.trim())) messages.push('无据的态度或长期能力判断必须从最终报告删除')
    if (conclusion.requiredJudgment !== '结论无据' && !review?.finalText.trim()) messages.push('有据或需限定结论必须形成教师最终表述')
  })
  const retained = progress.conclusionReviews.filter((item) => !item.removed).map((item) => item.finalText)
  if (containsM07UnsafeJudgment(retained)) messages.push('最终报告不得保留态度、固定能力、排名或歧视性标签')
  return { valid: messages.length === 0, messages: [...new Set(messages)] }
}

export function validateM07LayerTasks(progress: M07Progress): M07ValidationResult {
  const messages = [...validateM07Conclusions(progress).messages]
  const ids = ['support','consolidate','extend']
  if (progress.layerTasks.length !== 3 || ids.some((id) => !progress.layerTasks.some((item) => item.groupId === id))) messages.push('必须恰好形成补强、巩固、拓展 3 个临时组及各 1 个任务')
  if (progress.layerTasks.some((item) => !item.memberIds.length || !item.temporaryCriteria.trim() || !item.evidence.trim() || !item.taskName.trim() || !item.taskInstruction.trim() || !item.supportResource.trim() || !item.checkMethod.trim())) messages.push('每个临时组必须包含成员、数据依据、任务、支持资源和检查方式')
  const memberIds = progress.layerTasks.flatMap((item) => item.memberIds)
  if (new Set(memberIds).size !== m07Dataset.length || memberIds.length !== m07Dataset.length) messages.push('A01—A20 必须各归入一个且仅一个临时组')
  if (containsM07UnsafeJudgment(progress.layerTasks.flatMap((item) => [item.temporaryCriteria, item.evidence, item.taskInstruction]))) messages.push('临时分组不得使用排名、固定能力或歧视性标签')
  return { valid: messages.length === 0, messages: [...new Set(messages)] }
}

export function validateM07PeerReview(progress: M07Progress, directory: ParticipantDirectory): M07ValidationResult {
  const review = progress.peerReview
  const artifact = buildM07PeerArtifacts(directory).find((item) => item.participantId === review.reviewerId && item.artifactId === review.artifactId)
  const metric = progress.draft?.metrics.find((item) => item.id === review.metricId)
  const messages: string[] = []
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  if (!artifact) messages.push('请选择当前同组其他成员进行数字复核')
  if (!metric || review.peerCalculatedValue === null) messages.push('请选择并复算至少 1 个关键数字')
  if (metric && review.peerCalculatedValue !== null) {
    const expectedStatus = review.peerCalculatedValue === metric.value ? '一致' : '不一致'
    if (review.status !== expectedStatus) messages.push('同伴复算状态必须与复算值和当前确定性结果一致')
  }
  if (!review.comment.trim()) messages.push('请记录同伴复算过程或差异说明')
  if (!review.submitted) messages.push('请提交同组数字复核记录')
  return { valid: messages.length === 0, messages }
}

function currentGroupId(directory: ParticipantDirectory) { return directory.participants.find((item) => item.participantId === directory.currentParticipantId)?.groupId ?? '' }

export function validateM07Confirmation(progress: M07Progress, directory: ParticipantDirectory): M07ValidationResult {
  const messages = [...validateM07LayerTasks(progress).messages, ...validateM07PeerReview(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.peerDisposition || !confirmation.peerResponse.trim()) messages.push('请记录同伴复算意见的处理方式和依据')
  if (!confirmation.allNumbersConfirmed || !confirmation.conclusionsDataSupported || !confirmation.temporaryGroupingConfirmed || !confirmation.noFixedLabelsConfirmed || !confirmation.noRankingConfirmed || !confirmation.finalResponsibilityConfirmed) messages.push('请完成数字、证据结论、临时分组、非固定标签、不排名和最终责任六项教师确认')
  if (progress.peerReview.status === '不一致' && confirmation.peerDisposition === '不采纳' && !confirmation.peerResponse.includes('确定性')) messages.push('同伴复算不一致时，须记录纠正或基于确定性公式不采纳的依据')
  return { valid: messages.length === 0, messages }
}

export function m07CurrentConfirmationFingerprint(progress: M07Progress, directory: ParticipantDirectory) { return m07ConfirmationFingerprint(progress, currentGroupId(directory)) }
export function confirmedM07DeliverableIsCurrent(progress: M07Progress, directory: ParticipantDirectory) { return Boolean(progress.confirmedDeliverable && progress.confirmedDeliverable.confirmationFingerprint === m07CurrentConfirmationFingerprint(progress, directory)) }
export function m07CurrentFingerprint(progress: M07Progress, directory: ParticipantDirectory) { return m07ContentFingerprint(progress, currentGroupId(directory)) }
export function latestM07AssessmentIsCurrent(progress: M07Progress, directory: ParticipantDirectory) { const latest = progress.assessmentHistory.at(-1); return Boolean(latest?.passed && latest.contentFingerprint === m07CurrentFingerprint(progress, directory)) }
export function validateM07AssessmentSubmission(progress: M07Progress, directory: ParticipantDirectory): M07ValidationResult { const messages = [...validateM07Confirmation(progress, directory).messages]; if (!confirmedM07DeliverableIsCurrent(progress, directory)) messages.push('请先形成与当前统计、结论、分层任务和复核一致的教师确认成果'); return { valid: messages.length === 0, messages } }
export function progressForM07(progress: M07Progress, directory: ParticipantDirectory) { const stages = [validateM07Input(progress).valid, validateM07DataCheck(progress).valid, validateM07Draft(progress).valid, validateM07ManualChecks(progress).valid, validateM07Conclusions(progress).valid, confirmedM07DeliverableIsCurrent(progress, directory), latestM07AssessmentIsCurrent(progress, directory)]; return Math.round(stages.filter(Boolean).length / stages.length * 100) }
