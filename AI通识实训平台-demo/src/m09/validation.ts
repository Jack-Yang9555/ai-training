import type { ParticipantDirectory } from '../training/types'
import type { M09Progress, M09Route, M09SourceRecord } from './domain'
import { m09Hash, m09SourceFingerprint } from './runner'

export interface M09ValidationResult { valid: boolean; messages: string[] }

function unique(values: string[]) { return [...new Set(values)] }

function normalize(value: string) { return value.trim().replace(/\s+/gu, ' ') }

export function m09UnsafeFindings(source: M09SourceRecord) {
  const text = [source.name, source.source, source.summary, source.content].join('\n')
  const findings: string[] = []
  if (/(?:1[3-9]\d{9})/u.test(text)) findings.push('手机号')
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) findings.push('电子邮箱')
  if (/(?:\d{17}[\dXx])|(?:身份证(?:号|号码)?\s*[:：]?\s*\d{6,})/u.test(text)) findings.push('身份信息')
  if (/(?:sk-[a-z0-9_-]{12,}|api[_ -]?key\s*[:=：]|secret\s*[:=：]|password\s*[:=：])/iu.test(text)) findings.push('密钥或口令')
  if (/(?:未经授权|禁止用于教学|不可复制|未授权材料)/u.test(text)) findings.push('未授权声明')
  return unique(findings)
}

export function validateM09Sources(progress: M09Progress): M09ValidationResult {
  const messages: string[] = []
  const scenario = progress.scenario
  if (!scenario.courseName.trim() || !scenario.audience.trim() || !scenario.teachingPurpose.trim() || !scenario.useStage) messages.push('请完整填写课程、教学对象、使用环节和教学用途')
  const enabled = progress.sources.filter((item) => item.teacherDecision === '纳入')
  if (enabled.length < 2 || enabled.length > 5) messages.push(`当前纳入 ${enabled.length} 份资料；须纳入 2—5 份`)
  for (const source of progress.sources) {
    if (source.teacherDecision === '待决定') messages.push(`${source.sourceId} ${source.name || '未命名资料'}：请完成教师纳入决定`)
    if (source.teacherDecision !== '纳入') continue
    const missing = [
      [source.name, '名称'], [source.source, '来源'], [source.version, '版本'], [source.scope, '适用范围'], [source.summary, '摘要'], [source.content, '正文'],
    ].filter(([value]) => !String(value).trim()).map(([, label]) => label)
    if (missing.length) messages.push(`${source.sourceId}：缺少${missing.join('、')}`)
    if (source.authorizationStatus !== '已授权' || !source.authorizationConfirmed) messages.push(`${source.sourceId} ${source.name || ''}：授权状态未确认，不能纳入`)
    const unsafe = m09UnsafeFindings(source)
    if (unsafe.length) messages.push(`${source.sourceId} ${source.name || ''}：检测到${unsafe.join('、')}，请脱敏或排除`)
  }
  const keys = new Map<string, string[]>()
  for (const source of enabled) {
    const key = `${normalize(source.name).toLocaleLowerCase()}::${normalize(source.version).toLocaleLowerCase()}`
    keys.set(key, [...(keys.get(key) ?? []), source.sourceId])
  }
  for (const ids of keys.values()) if (ids.length > 1) messages.push(`同名同版本重复：${ids.join('、')}`)
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM09Quality(progress: M09Progress): M09ValidationResult {
  const messages = [...validateM09Sources(progress).messages]
  const enabled = progress.sources.filter((item) => item.teacherDecision === '纳入')
  for (const source of enabled) {
    if (source.qualityFindings.length !== 4) messages.push(`${source.sourceId}：须逐项检查重复、过期、缺页和错误版本`)
    const unchecked = source.qualityFindings.filter((item) => !item.checked || item.action === '未处理')
    if (unchecked.length) messages.push(`${source.sourceId} ${source.name}：四类检查中还有 ${unchecked.length} 项待处理`)
    for (const finding of source.qualityFindings) {
      if (!finding.checked || finding.action === '未处理') continue
      if (finding.checked && !finding.rationale.trim()) messages.push(`${source.sourceId}：${finding.issueType} 缺少处理依据`)
      if (finding.detected && ['obsolete', 'missing-page', 'wrong-version'].includes(finding.issueType) && finding.action === '保留并说明') messages.push(`${source.sourceId}：过期、缺页或错误版本不能用“保留并说明”消除`)
      if (finding.detected && ['未处理', '无需处理'].includes(finding.action)) messages.push(`${source.sourceId}：已发现的 ${finding.issueType} 必须选择处置动作`)
      if (!finding.detected && finding.action !== '无需处理') messages.push(`${source.sourceId}：未发现的 ${finding.issueType} 应记录为“无需处理”`)
    }
    if (!unchecked.length && source.status !== '可入库') messages.push(`${source.sourceId} ${source.name}：四类检查尚未形成“可入库”状态`)
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function m09KnowledgeBaseIsCurrent(progress: M09Progress) {
  if (!progress.knowledgeBase || progress.knowledgeBase.version !== 'v0') return false
  const enabled = progress.sources.filter((item) => item.teacherDecision === '纳入' && item.status === '可入库')
  return progress.knowledgeBase.sourceFingerprint === m09SourceFingerprint(enabled)
    && progress.knowledgeBase.sourceIds.join('|') === enabled.map((item) => item.sourceId).join('|')
}

export function validateM09Build(progress: M09Progress): M09ValidationResult {
  const messages = [...validateM09Quality(progress).messages]
  if (!progress.knowledgeBase) messages.push('请先建立课程知识库 v0')
  else {
    if (!m09KnowledgeBaseIsCurrent(progress)) messages.push('资料内容或版本已变化，请重新建立 v0')
    if (progress.knowledgeBase.segmentCount < 1 || progress.knowledgeBase.segments.length !== progress.knowledgeBase.segmentCount) messages.push('v0 尚未形成可定位的来源片段')
    if (progress.knowledgeBase.teacherConfirmed || progress.knowledgeBase.version !== 'v0') messages.push('首测前只能形成未确认的 v0')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM09QuestionSet(progress: M09Progress): M09ValidationResult {
  const messages: string[] = []
  const ids = progress.questions.map((item) => item.questionId)
  const evidenceCount = progress.questions.filter((item) => item.type === 'evidence').length
  const boundary = progress.questions.filter((item) => item.type !== 'evidence')
  if (progress.questions.length !== 9 || new Set(ids).size !== 9) messages.push('测试题必须恰好 9 道且题号唯一')
  if (evidenceCount !== 5 || boundary.length !== 4) messages.push('测试题构成必须为 5 道有据题和 4 道边界题')
  for (const type of ['condition-missing', 'out-of-scope', 'wrong-premise'] as const) if (!boundary.some((item) => item.type === type)) messages.push(`边界题缺少 ${type} 类型`)
  if (!boundary.some((item) => item.type === 'composite-boundary')) messages.push('第 4 道边界题须为复合边界题')
  if (progress.questions.some((item) => !item.question.trim() || !item.scenario.trim())) messages.push('9 道题均须填写题目和教学场景')
  return { valid: messages.length === 0, messages }
}

function recordsMatchQuestions(progress: M09Progress, records: M09Progress['firstTest']) {
  return records.length === 9 && records.every((record) => {
    const question = progress.questions.find((item) => item.questionId === record.questionId)
    return question && question.question === record.question && question.type === record.type
  })
}

function boundaryCitationValid(record: M09Progress['firstTest'][number]) {
  if (record.type === 'wrong-premise') return Boolean(record.sourceId && record.segmentId && record.excerpt)
  if (record.type === 'evidence') return Boolean(record.sourceId && record.segmentId && record.excerpt)
  return !record.sourceId && !record.segmentId && !record.excerpt
}

export function validateM09FirstTest(progress: M09Progress): M09ValidationResult {
  const messages = [...validateM09Build(progress).messages, ...validateM09QuestionSet(progress).messages]
  if (!recordsMatchQuestions(progress, progress.firstTest) || progress.firstTest.some((item) => item.round !== 'first')) messages.push('首测必须冻结当前同一组 9 道题')
  if (!progress.firstTestFrozen) messages.push('首测尚未冻结')
  if (progress.firstTest.length === 9 && !progress.firstTest.some((item) => item.teacherResult === '需修正')) messages.push('首测须暴露至少 1 个可修正问题，不能全部预生成通过')
  if (progress.firstTest.some((item) => !boundaryCitationValid(item))) messages.push('有据题须定位来源；无依据边界处理不得伪造引用')
  if (progress.firstTest.some((item) => !item.teacherVerified)) messages.push('请逐题完成人工核验并确认 9 项首测结果')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM09CorrectionRetest(progress: M09Progress): M09ValidationResult {
  const messages = [...validateM09FirstTest(progress).messages]
  const correction = progress.corrections.at(-1)
  if (!correction) messages.push('请先选择首测问题并保存至少 1 条实质修正')
  else {
    const issue = progress.firstTest.find((item) => item.questionId === correction.questionId && item.teacherResult === '需修正')
    if (!issue) messages.push('修正记录必须关联首测中的“需修正”题目')
    if (!normalize(correction.before) || !normalize(correction.after) || normalize(correction.before) === normalize(correction.after)) messages.push('修改前后须有实质差异')
    if (!correction.basis.trim()) messages.push('修正记录须填写依据')
  }
  if (!recordsMatchQuestions(progress, progress.retest) || progress.retest.some((item) => item.round !== 'retest')) messages.push('复测必须沿用首测完全相同的 9 个题号和题目')
  const firstSignature = progress.firstTest.map((item) => `${item.questionId}:${item.question}`).join('|')
  const retestSignature = progress.retest.map((item) => `${item.questionId}:${item.question}`).join('|')
  if (progress.retest.length && firstSignature !== retestSignature) messages.push('禁止换题复测：首测与复测题目不一致')
  if (progress.retest.some((item) => item.teacherResult !== '符合预期')) messages.push('复测尚未达到 9 / 9 符合预期')
  if (progress.retest.some((item) => !item.teacherVerified)) messages.push('请逐题完成人工核验并确认 9 项复测结果')
  if (progress.retest.some((item) => !boundaryCitationValid(item))) messages.push('复测来源引用或边界处理仍不符合要求')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function currentGroup(progress: M09Progress, directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const peers = directory.participants.filter((item) => item.groupId === current?.groupId && item.participantId !== current?.participantId)
  return { current, peers }
}

export function validateM09PeerTest(progress: M09Progress, directory: ParticipantDirectory): M09ValidationResult {
  const review = progress.peerTest
  const { current, peers } = currentGroup(progress, directory)
  const reviewer = peers.find((item) => item.participantId === review.reviewerId)
  const boundaryQuestion = progress.questions.find((item) => item.questionId === review.boundaryQuestionId && item.type !== 'evidence')
  const messages: string[] = []
  if (!current || !reviewer || reviewer.groupId !== current.groupId || reviewer.participantId === current.participantId) messages.push('测试人只能从当前同组其他成员中选择')
  if (!review.reviewerRole) messages.push('请确认本次小组角色')
  if (!boundaryQuestion) messages.push('请选择至少 1 道边界题完成小组测试')
  if (!review.actualHandling || !review.conclusion || !review.suggestion.trim()) messages.push('请记录实际处理、测试结论和具体建议')
  if (review.conclusion === '需调整' && (!review.authorTreatment || !review.authorBasis.trim())) messages.push('“需调整”是有效事实；作者须记录修正或不采纳依据')
  if (!review.submitted) messages.push('请提交小组边界测试记录')
  return { valid: messages.length === 0, messages }
}

function groupRosterFingerprint(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  return m09Hash(directory.participants.filter((item) => item.groupId === current?.groupId).map((item) => ({ id: item.participantId, groupId: item.groupId, name: item.name })))
}

export function m09ConfirmationFingerprint(progress: M09Progress, directory: ParticipantDirectory) {
  return m09Hash({
    scenario: progress.scenario,
    sources: progress.sources,
    knowledgeBase: progress.knowledgeBase,
    questions: progress.questions,
    answerRule: progress.answerRule,
    firstTest: progress.firstTest,
    firstTestFrozen: progress.firstTestFrozen,
    corrections: progress.corrections,
    retest: progress.retest,
    peerTest: progress.peerTest,
    teacherConfirmation: progress.teacherConfirmation,
    groupRoster: groupRosterFingerprint(directory),
  })
}

export function confirmedM09KnowledgeBaseIsCurrent(progress: M09Progress, directory: ParticipantDirectory) {
  return Boolean(progress.confirmedKnowledgeBase && progress.confirmedKnowledgeBase.confirmationFingerprint === m09ConfirmationFingerprint(progress, directory))
}

export function validateM09Confirmation(progress: M09Progress, directory: ParticipantDirectory): M09ValidationResult {
  const messages = [...validateM09CorrectionRetest(progress).messages, ...validateM09PeerTest(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.scopeConfirmed || !confirmation.sourcesConfirmed || !confirmation.boundaryConfirmed || !confirmation.safetyConfirmed || !confirmation.maintenanceResponsibilityConfirmed) messages.push('请完成资料范围、来源、回答边界、安全和最终维护责任五项教师确认')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function m09ContentFingerprint(progress: M09Progress, directory: ParticipantDirectory) {
  return m09Hash({ confirmation: m09ConfirmationFingerprint(progress, directory), confirmed: progress.confirmedKnowledgeBase ? {
    knowledgeBaseId: progress.confirmedKnowledgeBase.knowledgeBaseId,
    sourceFingerprint: progress.confirmedKnowledgeBase.sourceFingerprint,
    confirmedAt: progress.confirmedKnowledgeBase.confirmedAt,
  } : null })
}

export function latestM09AssessmentIsCurrent(progress: M09Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === m09ContentFingerprint(progress, directory))
}

export function validateM09AssessmentSubmission(progress: M09Progress, directory: ParticipantDirectory): M09ValidationResult {
  const messages = [...validateM09Confirmation(progress, directory).messages]
  if (!confirmedM09KnowledgeBaseIsCurrent(progress, directory)) messages.push('请先形成与当前资料、同题复测、小组测试和教师确认一致的 v1.0')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function progressForM09(progress: M09Progress, directory: ParticipantDirectory) {
  if (progress.route === 'overview' && progress.sources.length === 0 && progress.assessments.length === 0) return 0
  const stages = [
    validateM09Sources(progress).valid,
    validateM09Quality(progress).valid,
    validateM09Build(progress).valid,
    validateM09FirstTest(progress).valid,
    validateM09CorrectionRetest(progress).valid,
    validateM09PeerTest(progress, directory).valid,
    confirmedM09KnowledgeBaseIsCurrent(progress, directory),
    latestM09AssessmentIsCurrent(progress, directory),
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}

export function routeForM09CoreRequirement(id: string): M09Route {
  if (id === 'sources-build') return 'build'
  if (id === 'same-question-retest') return 'correction-retest'
  if (id === 'peer-boundary') return 'peer-confirm'
  return 'peer-confirm'
}
