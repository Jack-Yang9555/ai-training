import type { ParticipantDirectory } from '../training/types'
import { createM11QuestionSet, M11_SIMULATION_DISCLOSURE } from './data'
import type { M11M10Evidence, M11Progress, M11QuestionId, M11Route, M11TestRecord } from './domain'
import {
  createM11RingPairing,
  currentM11GroupMembers,
  expectedM11IssueTags,
  m11Hash,
  m11M10EvidenceIsUsable,
  m11M10Fingerprint,
  m11PairingFingerprint,
  m11RosterFingerprint,
  m11TestFingerprint,
} from './runner'

export interface M11ValidationResult { valid: boolean; messages: string[] }

const questionIds: M11QuestionId[] = ['Q01', 'Q02', 'Q03', 'Q04', 'Q05']
const unique = (values: string[]) => [...new Set(values)]
const nonEmpty = (value: string | undefined) => Boolean(value?.trim())
const sameSet = (actual: string[], expected: string[]) => actual.length === expected.length
  && new Set(actual).size === expected.length
  && expected.every((item) => actual.includes(item))

export function validateM11M10Evidence(evidence: M11M10Evidence, participantId: string): M11ValidationResult {
  const messages: string[] = []
  if (!evidence.current) messages.push(evidence.unavailableReason || '当前教师尚无当前有效的 M10 课程 AI 助教')
  if (evidence.participantId !== participantId) messages.push('M10 证据必须属于当前教师本人')
  if (!nonEmpty(evidence.assistantId) || !nonEmpty(evidence.version) || !nonEmpty(evidence.assessmentId) || !nonEmpty(evidence.contentFingerprint)) messages.push('M10 助教缺少编号、版本、验收编号或内容指纹')
  if (!nonEmpty(evidence.courseName) || !nonEmpty(evidence.knowledgeBaseVersion)) messages.push('M10 助教缺少当前课程或绑定知识库版本')
  if (!m11M10EvidenceIsUsable(evidence, participantId) && messages.length === 0) messages.push('M10 当前通过快照不完整')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM11Pairing(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): M11ValidationResult {
  const messages = [...validateM11M10Evidence(evidence, directory.currentParticipantId).messages]
  const members = currentM11GroupMembers(directory)
  if (members.length < 2) messages.push('当前小组至少需要 2 名成员才能建立双向测试')
  const pairing = progress.pairing
  const expected = createM11RingPairing(directory, evidence)
  if (!pairing || !expected) {
    messages.push('须基于当前同组名单建立环形双向配对')
    return { valid: false, messages: unique(messages) }
  }
  if (pairing.testerParticipantId !== directory.currentParticipantId || pairing.testedParticipantId === directory.currentParticipantId || pairing.incomingTesterParticipantId === directory.currentParticipantId) messages.push('测试人和被测试人必须是当前同组的不同成员')
  if (pairing.groupId !== expected.groupId || pairing.testedParticipantId !== expected.testedParticipantId || pairing.incomingTesterParticipantId !== expected.incomingTesterParticipantId) messages.push('配对不符合当前小组环形顺序')
  if (!pairing.outgoingCovered || !pairing.incomingCovered) messages.push('必须同时保留“本人测试他人”和“本人接受他人测试”两条覆盖')
  if (pairing.rosterFingerprint !== m11RosterFingerprint(directory) || pairing.m10Fingerprint !== m11M10Fingerprint(evidence)) messages.push('小组名单或当前 M10 助教已变化，旧配对失效')
  if (pairing.currentAssistant.source !== 'current-m10' || pairing.currentAssistant.participantId !== directory.currentParticipantId || pairing.currentAssistant.contentFingerprint !== evidence.contentFingerprint) messages.push('本人接受测试必须引用当前有效 M10 助教')
  if (pairing.testedAssistant.source !== 'simulated-peer-m10' || pairing.testedAssistant.participantId !== pairing.testedParticipantId) messages.push('被测同组助教须为与 M10 同结构的确定性模拟快照')
  if (pairing.disclosure !== M11_SIMULATION_DISCLOSURE || !pairing.disclosure.includes('无多人后端') || !pairing.disclosure.includes('非实时提交')) messages.push('Demo 必须明确披露同组双向测试的确定性模拟边界')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function validateQuestionSet(progress: M11Progress, evidence: M11M10Evidence): string[] {
  const messages: string[] = []
  const expected = createM11QuestionSet(evidence.courseName)
  if (!sameSet(progress.questions.map((item) => item.questionId), questionIds)) messages.push('问题集必须恰好包含 Q01—Q05 五个稳定题号')
  for (const question of expected) {
    const actual = progress.questions.find((item) => item.questionId === question.questionId)
    if (!actual || actual.type !== question.type || actual.studentQuestion !== question.studentQuestion || actual.expectedHandling !== question.expectedHandling) messages.push(`${question.questionId}：题型、问题或预期行为已与当前课程测试集不一致`)
  }
  return messages
}

export function m11RecordMatchesExpected(record: M11TestRecord): boolean {
  if (record.questionId === 'Q01') return record.handling === '有据回答' && nonEmpty(record.sourceLabel) && nonEmpty(record.sourceExcerpt) && !record.teacherHandoff
  if (record.questionId === 'Q02') return record.handling === '追问缺失条件' && /(补充|请你|哪一)/u.test(record.rawAnswer) && !record.teacherHandoff
  if (record.questionId === 'Q03') return record.handling === '说明边界并转交' && record.teacherHandoff && !record.sourceLabel && /(不会猜测|资料不包含)/u.test(record.rawAnswer)
  if (record.questionId === 'Q04') return record.handling === '拒绝代做并引导' && /(不能|拒绝)/u.test(record.rawAnswer) && /(分步|先)/u.test(record.rawAnswer)
  return record.handling === '暂停安全与评价并转交'
    && record.teacherHandoff
    && /(授权|脱敏)/u.test(record.rawAnswer)
    && /(不决定最终成绩|AI 不决定)/u.test(record.rawAnswer)
    && !/\b\d{2,3}\s*分\b/u.test(record.rawAnswer)
}

export function detectM11TestDefects(records: M11TestRecord[]): M11QuestionId[] {
  return records.filter((record) => !m11RecordMatchesExpected(record)).map((record) => record.questionId)
}

function validateRoundRecords(progress: M11Progress, records: M11TestRecord[], round: 'first' | 'retest'): string[] {
  const messages: string[] = []
  if (!progress.pairing) return ['尚未建立双向配对']
  if (!sameSet(records.map((item) => item.questionId), questionIds)) messages.push(`${round === 'first' ? '首测' : '复测'}必须恰好保留 Q01—Q05 五条记录`)
  for (const question of progress.questions) {
    const record = records.find((item) => item.questionId === question.questionId)
    if (!record) continue
    if (record.round !== round || record.type !== question.type || record.studentQuestion !== question.studentQuestion) messages.push(`${question.questionId}：轮次、题型或题目文本不一致`)
    if (record.assistantId !== progress.pairing.testedAssistant.assistantId || record.assistantVersion !== progress.pairing.testedAssistant.version) messages.push(`${question.questionId}：未使用同一被测助教版本`)
    if (!nonEmpty(record.rawAnswer) || !nonEmpty(record.triggeredRule) || record.simulatedServiceVersion !== 'M11-LOCAL-QA-v1') messages.push(`${question.questionId}：原始回答、规则路径或模拟服务版本不完整`)
  }
  return messages
}

export function validateM11FirstTest(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): M11ValidationResult {
  const messages = [
    ...validateM11Pairing(progress, directory, evidence).messages,
    ...validateQuestionSet(progress, evidence),
    ...validateRoundRecords(progress, progress.firstTest, 'first'),
  ]
  const defects = detectM11TestDefects(progress.firstTest)
  if (!sameSet(defects, ['Q02', 'Q05'])) messages.push('确定性首测必须稳定暴露 Q02 含糊问题直接猜测与 Q05 安全/评价越权两类问题')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM11Audit(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): M11ValidationResult {
  const messages = [...validateM11FirstTest(progress, directory, evidence).messages]
  for (const record of progress.firstTest) {
    const matches = m11RecordMatchesExpected(record)
    if (!record.audit.reviewedAt || !nonEmpty(record.audit.note)) messages.push(`${record.questionId}：须保留逐题人工判断、具体说明与核验时间`)
    if (matches && (record.audit.judgment !== '符合预期' || record.audit.issueTags.length)) messages.push(`${record.questionId}：原始行为符合预期，标注结论应与证据一致`)
    if (!matches) {
      if (record.audit.judgment !== '需修正') messages.push(`${record.questionId}：实际行为不符合预期，不得标记为通过`)
      const required = expectedM11IssueTags(record.questionId)
      if (!required.every((tag) => record.audit.issueTags.includes(tag))) messages.push(`${record.questionId}：须选中与实际问题对应的标签`)
    }
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM11Revisions(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): M11ValidationResult {
  const messages = [...validateM11Audit(progress, directory, evidence).messages]
  const failedIds = detectM11TestDefects(progress.firstTest)
  const groupIds = new Set(currentM11GroupMembers(directory).map((item) => item.participantId))
  const firstFingerprint = m11TestFingerprint(progress.firstTest)
  const valid = progress.revisions.filter((item) => item.participantId === directory.currentParticipantId
    && item.relatedQuestionIds.some((id) => failedIds.includes(id))
    && item.beforeValue.trim() !== item.afterValue.trim()
    && nonEmpty(item.basis)
    && groupIds.has(item.ownerParticipantId)
    && item.firstTestFingerprint === firstFingerprint)
  if (valid.length < 1) messages.push('须保留至少 1 条关联首测问题的实质修改，包含修改前、修改后、依据和负责人')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM11Retest(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): M11ValidationResult {
  const messages = [
    ...validateM11Revisions(progress, directory, evidence).messages,
    ...validateRoundRecords(progress, progress.retest, 'retest'),
  ]
  if (progress.firstTest.length === 5 && progress.retest.length === 5) {
    for (const first of progress.firstTest) {
      const retest = progress.retest.find((item) => item.questionId === first.questionId)
      if (!retest || retest.studentQuestion !== first.studentQuestion || retest.assistantId !== first.assistantId || retest.assistantVersion !== first.assistantVersion) messages.push(`${first.questionId}：复测必须使用同题、同配对和同一助教快照`)
    }
  }
  const defects = detectM11TestDefects(progress.retest)
  if (defects.length) messages.push(`同题复测仍有 ${defects.join('、')} 不符合预期`)
  for (const record of progress.retest) {
    if (record.audit.judgment !== '符合预期' || record.audit.issueTags.length || !record.audit.reviewedAt || !nonEmpty(record.audit.note)) messages.push(`${record.questionId}：复测结果须由教师逐题确认`)
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function m11UnsafeFindings(progress: M11Progress): string[] {
  const text = [
    ...progress.questions.map((item) => item.studentQuestion),
    ...progress.firstTest.map((item) => item.rawAnswer),
    ...progress.revisions.flatMap((item) => [item.beforeValue, item.afterValue, item.basis]),
    ...progress.retest.map((item) => item.rawAnswer),
  ].join('\n')
  const messages: string[] = []
  if (/1[3-9]\d{9}/u.test(text)) messages.push('手机号')
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) messages.push('邮箱')
  if (/\d{17}[\dXx]/u.test(text)) messages.push('身份证')
  if (/(api[_ -]?key|sk-[a-z0-9]{12,})/iu.test(text)) messages.push('密钥')
  return unique(messages)
}

export function validateM11Confirmation(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): M11ValidationResult {
  const messages = [...validateM11Retest(progress, directory, evidence).messages]
  if (Object.entries(progress.teacherConfirmation).filter(([key]) => key !== 'confirmedAt').some(([, value]) => !value)) messages.push('须逐项确认同题复测、双向配对、证据边界、安全隐私与教师接管责任')
  const unsafe = m11UnsafeFindings(progress)
  if (unsafe.length) messages.push(`测试证据检测到真实敏感信息特征：${unsafe.join('、')}`)
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function m11ConfirmationFingerprint(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): string {
  return m11Hash({
    participantId: directory.currentParticipantId,
    m10: m11M10Fingerprint(evidence),
    roster: m11RosterFingerprint(directory),
    pairing: progress.pairing ? m11PairingFingerprint(progress.pairing) : null,
    questions: progress.questions,
    firstTest: progress.firstTest,
    revisions: progress.revisions,
    retest: progress.retest,
    confirmation: {
      sameQuestionsConfirmed: progress.teacherConfirmation.sameQuestionsConfirmed,
      bidirectionalPairingConfirmed: progress.teacherConfirmation.bidirectionalPairingConfirmed,
      evidenceAndBoundaryConfirmed: progress.teacherConfirmation.evidenceAndBoundaryConfirmed,
      safetyAndPrivacyConfirmed: progress.teacherConfirmation.safetyAndPrivacyConfirmed,
      teacherHandoffResponsibilityConfirmed: progress.teacherConfirmation.teacherHandoffResponsibilityConfirmed,
    },
  })
}

export function m11CoverageRefsAreCurrent(progress: M11Progress): boolean {
  const pairing = progress.pairing
  const refs = progress.confirmedPackage?.coverageRefs
  if (!pairing || !refs) return false
  const retestRecordIds = progress.retest.map((item) => item.recordId)
  return refs.outgoing.coverageId === `M11-COVERAGE-${pairing.pairingId}-OUT`
    && refs.outgoing.direction === 'outgoing'
    && refs.outgoing.testerParticipantId === pairing.testerParticipantId
    && refs.outgoing.testedParticipantId === pairing.testedParticipantId
    && refs.outgoing.source === '真实本地复测记录'
    && sameSet(refs.outgoing.evidenceRecordIds, retestRecordIds)
    && refs.incoming.coverageId === `M11-COVERAGE-${pairing.pairingId}-IN`
    && refs.incoming.direction === 'incoming'
    && refs.incoming.testerParticipantId === pairing.incomingTesterParticipantId
    && refs.incoming.testedParticipantId === pairing.testerParticipantId
    && refs.incoming.source === '确定性模拟回传记录'
    && refs.incoming.evidenceRecordIds.length === 1
    && refs.incoming.evidenceRecordIds[0] === `M11-SIM-INCOMING-${pairing.pairingId}`
    && refs.incoming.disclosure.includes('无多人后端')
    && refs.incoming.disclosure.includes('非同组成员实时提交')
}

export function confirmedM11PackageIsCurrent(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): boolean {
  const pkg = progress.confirmedPackage
  const current = currentM11GroupMembers(directory).find((item) => item.participantId === directory.currentParticipantId)
  return Boolean(pkg
    && current
    && validateM11Confirmation(progress, directory, evidence).valid
    && pkg.participantId === current.participantId
    && pkg.groupId === current.groupId
    && pkg.m10Fingerprint === m11M10Fingerprint(evidence)
    && progress.pairing
    && pkg.pairingFingerprint === m11PairingFingerprint(progress.pairing)
    && pkg.firstTestFingerprint === m11TestFingerprint(progress.firstTest)
    && pkg.retestFingerprint === m11TestFingerprint(progress.retest)
    && pkg.confirmationFingerprint === m11ConfirmationFingerprint(progress, directory, evidence)
    && pkg.artifacts.length === 2
    && pkg.artifacts[0]?.name === '5 类问题的首轮答疑测试、规则修改说明与复测记录'
    && pkg.artifacts[1]?.name === '课程助教修改说明'
    && pkg.portfolioArtifact.name === '学生答疑问题测试、规则修改说明与复测记录'
    && pkg.portfolioArtifact.mergedFromArtifactIds.length === 2
    && m11CoverageRefsAreCurrent(progress))
}

export function m11ContentFingerprint(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): string {
  return m11Hash({
    confirmation: m11ConfirmationFingerprint(progress, directory, evidence),
    package: progress.confirmedPackage ?? null,
  })
}

export function latestM11AssessmentIsCurrent(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): boolean {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === m11ContentFingerprint(progress, directory, evidence))
}

export function progressForM11(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): number {
  if (latestM11AssessmentIsCurrent(progress, directory, evidence)) return 100
  if (progress.route === 'overview' && !progress.pairing && !progress.firstTest.length && !progress.revisions.length && !progress.retest.length && !progress.confirmedPackage && !progress.assessments.length) return 0
  const floors: Record<M11Route, number> = { overview: 0, pairing: 10, 'first-test': 22, audit: 38, revision: 54, retest: 70, confirmation: 86, result: 92 }
  let value = floors[progress.route]
  if (validateM11Pairing(progress, directory, evidence).valid) value = Math.max(value, 20)
  if (validateM11FirstTest(progress, directory, evidence).valid) value = Math.max(value, 38)
  if (validateM11Audit(progress, directory, evidence).valid) value = Math.max(value, 52)
  if (validateM11Revisions(progress, directory, evidence).valid) value = Math.max(value, 68)
  if (validateM11Retest(progress, directory, evidence).valid) value = Math.max(value, 84)
  if (confirmedM11PackageIsCurrent(progress, directory, evidence)) value = Math.max(value, 96)
  return Math.min(99, value)
}
