import type { ParticipantDirectory } from '../training/types'
import {
  createE01AnonymousAnswers,
  e01AiScoreMatrix,
  e01AnswerIds,
  e01ExpectedFinalScoreMatrix,
  e01InitialFeedback,
} from './data'
import type {
  E01AiReview,
  E01Progress,
  E01Route,
  E01RubricDimensionId,
  E01TeacherReview,
} from './domain'
import { e01Hash, e01InputFingerprint, e01RubricFingerprint } from './runner'

export interface E01ValidationResult { valid: boolean; messages: string[] }

const dimensionIds: E01RubricDimensionId[] = [
  'goal-alignment',
  'professional-quality',
  'evidence-use',
  'actionable-expression',
]

function unique(values: string[]) { return [...new Set(values)] }
function normalized(value: string) { return value.trim().replace(/\s+/gu, ' ') }
function exactIdSet(actual: string[], expected: string[]) {
  return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((id) => actual.includes(id))
}

export function e01UnsafeFindings(progress: Pick<E01Progress, 'scenario' | 'answers'>) {
  const text = [
    progress.scenario.courseName,
    progress.scenario.learningObjective,
    progress.scenario.gradingRequirement,
    progress.scenario.assignmentPrompt,
    ...progress.answers.map((item) => item.text),
  ].join('\n')
  const findings: string[] = []
  if (/(?:1[3-9]\d{9})/u.test(text)) findings.push('手机号')
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) findings.push('电子邮箱')
  if (/(?:\d{17}[\dXx])|(?:身份证(?:号|号码)?\s*[:：]?\s*\d{6,})/u.test(text)) findings.push('身份信息')
  if (/(?:sk-[a-z0-9_-]{12,}|api[_ -]?key\s*[:=：]|secret\s*[:=：]|password\s*[:=：])/iu.test(text)) findings.push('密钥或口令')
  return unique(findings)
}

export function validateE01Input(progress: E01Progress): E01ValidationResult {
  const messages: string[] = []
  const scenario = progress.scenario
  if (![scenario.courseName, scenario.learningObjective, scenario.gradingRequirement, scenario.assignmentPrompt].every((item) => item.trim())) {
    messages.push('请完整填写课程名称、学习目标、评分要求和作业题目')
  }
  if (scenario.sampleSource !== '平台固定虚构匿名作答' || !scenario.anonymousSamplesConfirmed) {
    messages.push('本任务只能使用平台固定的虚构匿名作答，并须确认匿名边界')
  }
  const fixed = createE01AnonymousAnswers()
  if (!exactIdSet(progress.answers.map((item) => item.answerId), e01AnswerIds)) messages.push('须保留 A01—A05 恰好 5 份固定作答')
  for (const expected of fixed) {
    const actual = progress.answers.find((item) => item.answerId === expected.answerId)
    if (!actual || actual.version !== expected.version || actual.text !== expected.text || !actual.fictional || !actual.anonymous) {
      messages.push(`${expected.answerId} 必须保持为平台固定的 1.0 版虚构匿名作答`)
    }
  }
  const unsafe = e01UnsafeFindings(progress)
  if (unsafe.length) messages.push(`作答或任务信息检测到${unsafe.join('、')}，请勿录入真实学生信息或密钥`)
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE01Rubric(progress: E01Progress): E01ValidationResult {
  const messages = [...validateE01Input(progress).messages]
  if (!progress.rubric.version.trim()) messages.push('评分量规须有明确版本号')
  if (!exactIdSet(progress.rubric.dimensions.map((item) => item.dimensionId), dimensionIds)) {
    messages.push('评分量规必须恰好包含目标达成、专业准确、证据使用、反馈可执行性 4 个维度')
  }
  for (const dimension of progress.rubric.dimensions) {
    if (!dimension.name.trim() || !dimension.criteria.trim() || !dimension.evidenceRequirement.trim()) messages.push(`${dimension.dimensionId}：名称、标准和证据要求须完整`)
    if (dimension.maxScore !== 3) messages.push(`${dimension.dimensionId}：本量规维度满分固定为 3 分`)
    if (normalized(dimension.linkedObjective) !== normalized(progress.scenario.learningObjective)) messages.push(`${dimension.dimensionId}：须关联当前学习目标`)
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function e01FeedbackIsActionable(nextStep: string) {
  const vagueOnly = /^(?:继续)?(?:优化|完善|改进)(?:一下|内容)?[，,。\s]*(?:使内容)?(?:更好|更完善)?[。！!]?$/u
  return normalized(nextStep).length >= 16 && !vagueOnly.test(normalized(nextStep))
}

function dimensionsAreComplete(review: E01AiReview | E01TeacherReview) {
  const scores = 'dimensionScores' in review ? review.dimensionScores : review.finalDimensionScores
  return exactIdSet(scores.map((item) => item.dimensionId), dimensionIds)
}

function reviewEvidenceIsGrounded(progress: E01Progress, review: E01AiReview | E01TeacherReview) {
  const answer = progress.answers.find((item) => item.answerId === review.answerId)
  const scores = 'dimensionScores' in review ? review.dimensionScores : review.finalDimensionScores
  return Boolean(answer && scores.every((item) => item.evidenceExcerpt.trim() && answer.text.includes(item.evidenceExcerpt) && item.rationale.trim()))
}

export function validateE01AiReview(progress: E01Progress, participantId?: string): E01ValidationResult {
  const messages = [...validateE01Rubric(progress).messages]
  const currentRubricFingerprint = e01RubricFingerprint(progress)
  const currentInputFingerprint = e01InputFingerprint(progress)
  if (!exactIdSet(progress.aiReviews.map((item) => item.answerId), e01AnswerIds)) messages.push('确定性初评须覆盖 A01—A05 恰好 5 份作答')
  for (const review of progress.aiReviews) {
    if (!review.participantId || (participantId && review.participantId !== participantId)) messages.push(`${review.answerId}：初评不属于当前 participantId`)
    if (review.rubricVersion !== progress.rubric.version || review.rubricFingerprint !== currentRubricFingerprint || review.inputFingerprint !== currentInputFingerprint) messages.push(`${review.answerId}：初评所用输入或量规版本已失效`)
    if (!dimensionsAreComplete(review)) messages.push(`${review.answerId}：须使用同版本四维量规逐维初评`)
    if (!reviewEvidenceIsGrounded(progress, review)) messages.push(`${review.answerId}：四维判断须引用当前作答原文并说明理由`)
    if (!review.feedback.strength.trim() || !review.feedback.issue.trim() || !review.feedback.nextStep.trim()) messages.push(`${review.answerId}：反馈须包含优点、具体问题和下一步`)
    for (const score of review.dimensionScores) {
      if (score.score !== e01AiScoreMatrix[review.answerId]?.[score.dimensionId]) messages.push(`${review.answerId}：本地初评结果不是当前确定性基线`)
    }
  }
  const a04 = progress.aiReviews.find((item) => item.answerId === 'A04')
  const a04Evidence = a04?.dimensionScores.find((item) => item.dimensionId === 'evidence-use')
  if (a04Evidence?.score !== 3) messages.push('A04 初评须稳定暴露“证据使用 3 分”的待复核问题')
  if (!a04 || a04.feedback.nextStep !== e01InitialFeedback.A04.nextStep || e01FeedbackIsActionable(a04.feedback.nextStep)) messages.push('A04 初评须保留不可执行的原始下一步，交由教师修正')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE01TeacherReview(progress: E01Progress, participantId?: string): E01ValidationResult {
  const messages = [...validateE01AiReview(progress, participantId).messages]
  if (!exactIdSet(progress.teacherReviews.map((item) => item.answerId), e01AnswerIds)) messages.push('教师须逐项复核 A01—A05 恰好 5 份结果')
  for (const review of progress.teacherReviews) {
    const ai = progress.aiReviews.find((item) => item.answerId === review.answerId)
    if (!ai || review.aiReviewId !== ai.reviewId || review.rubricVersion !== progress.rubric.version) messages.push(`${review.answerId}：人工复核未关联当前初评和量规版本`)
    if (!review.reviewed || !review.reviewedAt || !['确认', '已修正'].includes(review.status)) messages.push(`${review.answerId}：尚未完成逐项人工复核`)
    if (!dimensionsAreComplete(review) || !reviewEvidenceIsGrounded(progress, review)) messages.push(`${review.answerId}：最终结果须保留四维评分及作答证据`)
    if (!review.finalFeedback.strength.trim() || !review.finalFeedback.issue.trim() || !e01FeedbackIsActionable(review.finalFeedback.nextStep)) messages.push(`${review.answerId}：最终反馈须含优点、具体问题和可执行下一步`)
    for (const score of review.finalDimensionScores) {
      if (score.score !== e01ExpectedFinalScoreMatrix[review.answerId]?.[score.dimensionId]) messages.push(`${review.answerId}：最终四维分数未达到人工复核基线`)
    }
  }
  const aiA04 = progress.aiReviews.find((item) => item.answerId === 'A04')
  const finalA04 = progress.teacherReviews.find((item) => item.answerId === 'A04')
  const correctionValid = progress.corrections.some((item) => item.answerId === 'A04'
    && item.dimensionId === 'evidence-use'
    && item.beforeScore === 3
    && item.afterScore === 2
    && normalized(item.beforeNextStep) !== normalized(item.afterNextStep)
    && e01FeedbackIsActionable(item.afterNextStep)
    && item.reason.trim()
    && item.aiReviewId === aiA04?.reviewId
    && item.rubricVersion === progress.rubric.version
    && item.afterNextStep === finalA04?.finalFeedback.nextStep)
  if (!correctionValid) messages.push('须保存至少 1 条关联 A04 作答与“证据使用”维度的实质修正（3→2，并改成可执行建议）')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function currentAndPeers(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const peers = directory.participants.filter((item) => item.groupId === current?.groupId && item.participantId !== current?.participantId)
  return { current, peers }
}

export function validateE01PeerReview(progress: E01Progress, directory: ParticipantDirectory): E01ValidationResult {
  const messages = [...validateE01TeacherReview(progress, directory.currentParticipantId).messages]
  const review = progress.peerReview
  const { current, peers } = currentAndPeers(directory)
  const reviewer = peers.find((item) => item.participantId === review.reviewerId)
  if (!current || !reviewer || reviewer.groupId !== current.groupId || review.reviewerGroupId !== current.groupId) messages.push('复核人必须是当前同组的其他真实参训成员')
  if (!review.reviewerRole) messages.push('须记录同组复核人的小组角色')
  if (!progress.teacherReviews.some((item) => item.answerId === review.targetAnswerId && item.reviewed)) messages.push('小组复核须关联一份已完成人工复核的作答结果')
  if (!review.rubricConsistency || !review.evidenceAlignment || !review.actionability) messages.push('须逐项检查量规一致性、证据对应性和建议可执行性')
  if (!review.suggestion.trim()) messages.push('须填写具体小组复核建议')
  if (!review.authorTreatment || !review.authorBasis.trim()) messages.push('作者须记录对小组意见的处理方式及依据')
  if (!review.simulated || !review.disclosure.includes('无多人后端') || !review.disclosure.includes('不代表真实组员提交')) messages.push('Demo 模拟复核必须明确披露无多人后端，且不冒充真实组员提交')
  if (!review.submitted || !review.submittedAt || !review.recordId) messages.push('须提交完整的小组复核记录')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function groupRosterFingerprint(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const roster = directory.participants
    .filter((item) => item.groupId === current?.groupId)
    .map((item) => ({ id: item.participantId, name: item.name, groupId: item.groupId }))
    .sort((left, right) => left.id.localeCompare(right.id))
  return e01Hash(roster)
}

export function e01ConfirmationFingerprint(progress: E01Progress, directory: ParticipantDirectory) {
  return e01Hash({
    scenario: progress.scenario,
    answers: progress.answers,
    rubric: progress.rubric,
    aiReviews: progress.aiReviews,
    teacherReviews: progress.teacherReviews,
    corrections: progress.corrections,
    peerReview: progress.peerReview,
    teacherConfirmation: progress.teacherConfirmation,
    groupRoster: groupRosterFingerprint(directory),
  })
}

export function validateE01Confirmation(progress: E01Progress, directory: ParticipantDirectory): E01ValidationResult {
  const messages = [...validateE01PeerReview(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!progress.rubric.teacherConfirmed) messages.push('教师须确认当前评分量规版本')
  if (!confirmation.rubricAndObjectiveConfirmed || !confirmation.fiveFinalReviewsConfirmed || !confirmation.privacyConfirmed || !confirmation.aiNotFinalConfirmed || !confirmation.finalResponsibilityConfirmed) {
    messages.push('须完成量规目标、五份结果、隐私、AI 不替代最终评价和教师最终责任五项确认')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function confirmedE01PackageIsCurrent(progress: E01Progress, directory: ParticipantDirectory) {
  const pkg = progress.confirmedPackage
  if (!pkg || pkg.participantId !== directory.currentParticipantId || !validateE01Confirmation(progress, directory).valid) return false
  const exactArtifacts = pkg.artifacts.length === 2
    && pkg.artifacts[0]?.kind === 'e01-rubric' && pkg.artifacts[0]?.name === '评分量规'
    && pkg.artifacts[1]?.kind === 'e01-grading-feedback' && pkg.artifacts[1]?.name === '5 份批改结果与个性化反馈'
  return exactArtifacts
    && exactIdSet(pkg.answerIds, e01AnswerIds)
    && pkg.rubricVersion === progress.rubric.version
    && pkg.confirmationFingerprint === e01ConfirmationFingerprint(progress, directory)
}

export function e01ContentFingerprint(progress: E01Progress, directory: ParticipantDirectory) {
  return e01Hash({
    confirmation: e01ConfirmationFingerprint(progress, directory),
    confirmedPackage: progress.confirmedPackage ? {
      packageId: progress.confirmedPackage.packageId,
      confirmedAt: progress.confirmedPackage.confirmedAt,
      rubricVersion: progress.confirmedPackage.rubricVersion,
      answerIds: progress.confirmedPackage.answerIds,
      artifacts: progress.confirmedPackage.artifacts,
    } : null,
  })
}

export function latestE01AssessmentIsCurrent(progress: E01Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === e01ContentFingerprint(progress, directory))
}

export function validateE01AssessmentSubmission(progress: E01Progress, directory: ParticipantDirectory): E01ValidationResult {
  const messages = [...validateE01Confirmation(progress, directory).messages]
  if (!confirmedE01PackageIsCurrent(progress, directory)) messages.push('须先生成与当前复核、同组意见和教师确认一致的两类固定成果')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function progressForE01(progress: E01Progress, directory: ParticipantDirectory) {
  if (progress.route === 'overview' && progress.aiReviews.length === 0 && progress.assessments.length === 0) return 0
  const stages = [
    validateE01Input(progress).valid,
    validateE01Rubric(progress).valid,
    validateE01AiReview(progress, directory.currentParticipantId).valid,
    validateE01TeacherReview(progress, directory.currentParticipantId).valid,
    validateE01PeerReview(progress, directory).valid,
    confirmedE01PackageIsCurrent(progress, directory),
    latestE01AssessmentIsCurrent(progress, directory),
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}

export function routeForE01CoreRequirement(id: string): E01Route {
  if (id === 'four-dimension-five-results') return 'ai-review'
  if (id === 'five-review-correction') return 'teacher-review'
  if (id === 'same-group-review') return 'peer-confirm'
  return 'result'
}
