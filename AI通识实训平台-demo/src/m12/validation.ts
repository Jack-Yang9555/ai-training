import type { ParticipantDirectory } from '../training/types'
import { m12SlotDefinitions } from './data'
import type { M12EvidenceSlot, M12Progress, M12Route } from './domain'

export interface M12ValidationResult { valid: boolean; messages: string[] }

function normalize(value: string | undefined) { return (value ?? '').trim().replace(/\s+/g, ' ') }
function unique(messages: string[]) { return [...new Set(messages)] }

export function m12Hash(value: unknown) {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `m12-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function m12EvidenceFingerprint(evidence: M12EvidenceSlot[]) {
  return m12Hash([...evidence].sort((a, b) => a.slotId.localeCompare(b.slotId)).map((item) => ({
    slotId: item.slotId,
    participantId: item.participantId,
    sourceTaskId: item.sourceTaskId,
    status: item.status,
    artifactId: item.artifactId,
    version: item.version,
    assessmentId: item.assessmentId,
  })))
}

export function validateM12Evidence(progress: M12Progress, participantId: string): M12ValidationResult {
  const messages: string[] = []
  const expected = new Set(m12SlotDefinitions.map((item) => item.slotId))
  const actual = progress.evidence.map((item) => item.slotId)
  if (progress.evidence.length !== 10 || new Set(actual).size !== 10 || actual.some((id) => !expected.has(id))) messages.push('须恰好读取 10 类固定成果，不能遗漏、重复或新增第 11 类')
  const requiredStatus = progress.mode === 'official' ? 'current' : 'preview'
  for (const slot of progress.evidence) {
    if (slot.participantId !== participantId) messages.push(`${slot.name}：不是当前教师的成果`)
    if (slot.status !== requiredStatus) messages.push(`${slot.name}：${slot.unavailableReason ?? (progress.mode === 'official' ? '不是当前有效成果' : '不是预演快照')}`)
    if (slot.status === requiredStatus && (!slot.sourceTaskId || !slot.artifactId || !slot.version || !slot.assessmentId)) messages.push(`${slot.name}：缺少来源任务、成果编号、版本或验收编号`)
  }
  const electives = progress.evidence.filter((item) => item.slotId.startsWith('elective-'))
  if (electives.length === 2 && electives[0].sourceTaskId === electives[1].sourceTaskId) messages.push('第二天与第三天选修成果必须来自两个不同任务')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function sourceIdentityIsCurrent(progress: M12Progress, sourceTaskId: string, sourceParticipantId?: string, sourceVersion?: string, sourceAssessmentId?: string) {
  const expectedStatus = progress.mode === 'official' ? 'current' : 'preview'
  const slot = progress.evidence.find((item) => item.sourceTaskId === sourceTaskId && item.status === expectedStatus)
  return Boolean(slot
    && sourceParticipantId === slot.participantId
    && sourceVersion === slot.version
    && sourceAssessmentId === slot.assessmentId)
}

export function validateM12Flow(progress: M12Progress, participantId: string): M12ValidationResult {
  const messages = [...validateM12Evidence(progress, participantId).messages]
  const slotIds = progress.flow.map((item) => item.slotId)
  if (progress.flow.length !== 10 || new Set(slotIds).size !== 10) messages.push('10 类成果须各编排一次，不能遗漏或重复')
  for (const stage of ['课前', '课中', '课后'] as const) {
    const entries = progress.flow.filter((item) => item.stage === stage)
    if (entries.length === 0) messages.push(`${stage}至少需要 1 个成果入口`)
    const orders = entries.map((item) => item.order)
    if (new Set(orders).size !== orders.length || orders.some((order) => order < 1)) messages.push(`${stage}阶段内顺序必须唯一且从正整数开始`)
  }
  for (const entry of progress.flow) {
    if (!normalize(entry.audience) || !normalize(entry.teachingStep) || !normalize(entry.objective) || !normalize(entry.teacherAction) || !normalize(entry.transition)) messages.push(`${m12SlotDefinitions.find((item) => item.slotId === entry.slotId)?.name ?? entry.slotId}：使用对象、环节、目标、教师动作和衔接说明须完整`)
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM12Correction(progress: M12Progress): M12ValidationResult {
  const correction = progress.correction
  const messages: string[] = []
  if (!correction) messages.push('请选择 1 条可追溯的 AI 错误与教师修正记录')
  else {
    if (!correction.sourceTaskId || !normalize(correction.sourceArtifactId)) messages.push('修正案例缺少来源任务或成果编号')
    if (!normalize(correction.aiOriginal) || !normalize(correction.issue) || !normalize(correction.teacherCorrection) || !normalize(correction.basis)) messages.push('AI 原内容、问题、教师修改后和依据必须完整')
    if (normalize(correction.aiOriginal) === normalize(correction.teacherCorrection)) messages.push('AI 原内容与教师修改后须有实质差异')
    if (!correction.openedAt || !correction.confirmed) messages.push('请打开来源证据并确认用于演示')
    if (progress.mode === 'official' && (correction.preview || correction.sourceTaskId === 'M12-DEMO')) messages.push('正式模式不能使用 M12 演示修正替代当前来源记录')
    if (correction.sourceTaskId !== 'M12-DEMO' && !sourceIdentityIsCurrent(progress, correction.sourceTaskId, correction.sourceParticipantId, correction.sourceVersion, correction.sourceAssessmentId)) messages.push('修正案例与当前教师的来源版本或验收编号不一致，请重新选择')
  }
  return { valid: messages.length === 0, messages }
}

export function validateM12Assistant(progress: M12Progress): M12ValidationResult {
  const messages: string[] = []
  const evidence = progress.assistantCards.find((item) => item.kind === 'evidence')
  const boundary = progress.assistantCards.find((item) => item.kind === 'boundary')
  if (progress.assistantCards.length !== 2 || !evidence || !boundary) messages.push('须恰好准备 1 张有来源回答和 1 张超范围转交演示卡')
  if (evidence) {
    if (evidence.sourceTaskId !== 'M10') messages.push('有来源回答必须引用当前 M10 助教记录')
    if (!normalize(evidence.question) || !normalize(evidence.answer) || !normalize(evidence.citationLabel) || !normalize(evidence.citationExcerpt)) messages.push('有来源回答须包含问题、回答、来源标签和原文片段')
    if (!evidence.openedAt || !evidence.confirmed) messages.push('请实际打开有据回答来源并确认')
    if (!sourceIdentityIsCurrent(progress, evidence.sourceTaskId, evidence.sourceParticipantId, evidence.sourceVersion, evidence.sourceAssessmentId)) messages.push('有据回答与当前 M10 来源版本或验收编号不一致')
  }
  if (boundary) {
    if (boundary.sourceTaskId !== 'M11') messages.push('越界转交必须引用当前 M11 答疑复测记录')
    if (!normalize(boundary.question) || !normalize(boundary.answer) || !normalize(boundary.boundaryExplanation) || !normalize(boundary.teacherTakeover)) messages.push('越界演示须包含问题、规范说明和教师接管动作')
    if (boundary.citationLabel || boundary.citationExcerpt) messages.push('超范围回答不得伪造知识来源')
    if (!boundary.openedAt || !boundary.confirmed) messages.push('请打开越界记录并确认转交证据')
    if (!sourceIdentityIsCurrent(progress, boundary.sourceTaskId, boundary.sourceParticipantId, boundary.sourceVersion, boundary.sourceAssessmentId)) messages.push('越界转交与当前 M11 来源版本或验收编号不一致')
  }
  if (progress.mode === 'official' && progress.assistantCards.some((item) => item.preview)) messages.push('正式模式只能引用当前 M10/M11 证据')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM12FirstRun(progress: M12Progress): M12ValidationResult {
  const messages: string[] = []
  if (!progress.firstRun.startedAt || progress.firstRun.records.length !== 4) messages.push('请启动四个必经检查点的首轮联调')
  if (progress.firstRun.records.some((item) => !item.openedAt || item.result === 'pending' || !normalize(item.note))) messages.push('首轮联调须逐项真实打开并记录结果与说明')
  if (progress.firstRun.records.length === 4 && !progress.firstRun.records.some((item) => item.result === 'issue')) messages.push('首轮联调须基于实际流程发现并记录至少 1 个衔接问题')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM12Revision(progress: M12Progress): M12ValidationResult {
  const messages = [...validateM12FirstRun(progress).messages]
  const revision = progress.revision
  const issue = progress.firstRun.records.find((item) => item.checkpointId === revision.issueCheckpointId && item.result === 'issue')
  if (!issue) messages.push('实质修改必须关联首轮联调中的具体问题')
  if (!revision.type || !normalize(revision.before) || !normalize(revision.after) || !normalize(revision.basis) || !revision.savedAt) messages.push('修改类型、修改前、修改后、依据和保存记录必须完整')
  if (normalize(revision.before) === normalize(revision.after)) messages.push('修改前后须有实质差异')
  if (revision.issueCheckpointId === 'class-resource') {
    const transition = progress.flow.find((item) => item.slotId === 'multimodal')?.transition
    if (normalize(transition) !== normalize(revision.after)) messages.push('衔接修改尚未应用到课中微课入口')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM12Retest(progress: M12Progress): M12ValidationResult {
  const messages = [...validateM12Revision(progress).messages]
  if (!progress.retest.startedAt || progress.retest.records.length !== 4) messages.push('请按首轮相同四个检查点启动复测')
  const firstIds = progress.firstRun.records.map((item) => item.checkpointId).join('|')
  const retestIds = progress.retest.records.map((item) => item.checkpointId).join('|')
  if (firstIds !== retestIds) messages.push('复测必须沿用首轮完全相同的检查点和顺序')
  if (progress.retest.records.some((item) => !item.openedAt || item.result !== 'success' || !normalize(item.note))) messages.push('复测须逐项重新打开并达到 4 / 4 成功')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM12SafetyShowcase(progress: M12Progress, directory?: ParticipantDirectory, participantId?: string): M12ValidationResult {
  const messages: string[] = []
  const safety = progress.safety
  if (!safety.scanRan || !safety.realPersonalInfoClear || !safety.unverifiedContentClear || !safety.unauthorizedMaterialClear || !safety.unsafeDecisionClear) messages.push('须完成个人信息、事实核验、材料授权和安全决策四项检查')
  if (!safety.aiUseDisclosed || !safety.teacherResponsibilityConfirmed) messages.push('须披露 AI 使用并确认教师最终责任')
  const showcase = progress.showcase
  if (!showcase.reviewerRole || !showcase.entrySlotId || !normalize(showcase.contribution) || !normalize(showcase.peerFeedback) || !showcase.feedbackConfirmed || !showcase.submittedAt) messages.push('须记录小组展示角色、入口、本人贡献、流程反馈及提交时间')
  if (progress.mode === 'preview' && showcase.peerFeedbackSource !== 'deterministic-preview') messages.push('预演模式须明确披露同组反馈为确定性模拟')
  if (progress.mode === 'official') {
    if (showcase.peerFeedbackSource !== 'group-record') messages.push('正式模式须登记现场小组展示反馈记录')
    if (!showcase.reviewerParticipantId || !showcase.feedbackRecorderConfirmed) messages.push('正式模式须选择同组反馈人并确认由当前教师据实代录')
    const currentId = participantId ?? directory?.currentParticipantId
    const current = directory?.participants.find((item) => item.participantId === currentId)
    const reviewer = directory?.participants.find((item) => item.participantId === showcase.reviewerParticipantId)
    if (!directory || !current || !reviewer || reviewer.participantId === current.participantId || reviewer.groupId !== current.groupId) messages.push('正式小组反馈人必须是当前教师同组的其他成员')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateM12TeacherConfirmation(progress: M12Progress, participantId: string, directory?: ParticipantDirectory): M12ValidationResult {
  const messages = [
    ...validateM12Evidence(progress, participantId).messages,
    ...validateM12Flow(progress, participantId).messages,
    ...validateM12Correction(progress).messages,
    ...validateM12Assistant(progress).messages,
    ...validateM12Retest(progress).messages,
    ...validateM12SafetyShowcase(progress, directory, participantId).messages,
  ]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.realCourseConfirmed || !confirmation.flowApplicableConfirmed || !confirmation.aiDisclosureConfirmed || !confirmation.finalResponsibilityConfirmed) messages.push('须确认真实课程适用、流程可用、AI 使用披露和教师最终责任')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function groupRosterFingerprint(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  return m12Hash(directory.participants.filter((item) => item.groupId === current?.groupId).map((item) => ({ id: item.participantId, name: item.name, groupId: item.groupId })))
}

export function m12ContentFingerprint(progress: M12Progress, directory: ParticipantDirectory) {
  const roundFingerprint = (round: M12Progress['firstRun']) => ({
    round: round.round,
    started: Boolean(round.startedAt),
    records: round.records.map((record) => ({
      checkpointId: record.checkpointId,
      targetSlotId: record.targetSlotId,
      result: record.result,
      note: record.note,
      opened: Boolean(record.openedAt),
    })),
  })
  return m12Hash({
    mode: progress.mode,
    evidence: m12EvidenceFingerprint(progress.evidence),
    flow: progress.flow,
    correction: progress.correction ? {
      correctionId: progress.correction.correctionId,
      sourceTaskId: progress.correction.sourceTaskId,
      sourceArtifactId: progress.correction.sourceArtifactId,
      sourceParticipantId: progress.correction.sourceParticipantId,
      sourceVersion: progress.correction.sourceVersion,
      sourceAssessmentId: progress.correction.sourceAssessmentId,
      aiOriginal: progress.correction.aiOriginal,
      issue: progress.correction.issue,
      teacherCorrection: progress.correction.teacherCorrection,
      basis: progress.correction.basis,
      opened: Boolean(progress.correction.openedAt),
      confirmed: progress.correction.confirmed,
      preview: progress.correction.preview,
    } : undefined,
    assistantCards: progress.assistantCards.map((card) => ({
      cardId: card.cardId,
      kind: card.kind,
      sourceTaskId: card.sourceTaskId,
      sourceArtifactId: card.sourceArtifactId,
      sourceParticipantId: card.sourceParticipantId,
      sourceVersion: card.sourceVersion,
      sourceAssessmentId: card.sourceAssessmentId,
      question: card.question,
      answer: card.answer,
      citationLabel: card.citationLabel,
      citationExcerpt: card.citationExcerpt,
      boundaryExplanation: card.boundaryExplanation,
      teacherTakeover: card.teacherTakeover,
      opened: Boolean(card.openedAt),
      confirmed: card.confirmed,
      preview: card.preview,
    })),
    firstRun: roundFingerprint(progress.firstRun),
    revision: {
      issueCheckpointId: progress.revision.issueCheckpointId,
      type: progress.revision.type,
      before: progress.revision.before,
      after: progress.revision.after,
      basis: progress.revision.basis,
      saved: Boolean(progress.revision.savedAt),
    },
    retest: roundFingerprint(progress.retest),
    safety: progress.safety,
    showcase: {
      reviewerRole: progress.showcase.reviewerRole,
      reviewerParticipantId: progress.showcase.reviewerParticipantId,
      entrySlotId: progress.showcase.entrySlotId,
      contribution: progress.showcase.contribution,
      peerFeedback: progress.showcase.peerFeedback,
      peerFeedbackSource: progress.showcase.peerFeedbackSource,
      feedbackRecorderConfirmed: progress.showcase.feedbackRecorderConfirmed,
      feedbackConfirmed: progress.showcase.feedbackConfirmed,
      submitted: Boolean(progress.showcase.submittedAt),
    },
    teacherConfirmation: {
      realCourseConfirmed: progress.teacherConfirmation.realCourseConfirmed,
      flowApplicableConfirmed: progress.teacherConfirmation.flowApplicableConfirmed,
      aiDisclosureConfirmed: progress.teacherConfirmation.aiDisclosureConfirmed,
      finalResponsibilityConfirmed: progress.teacherConfirmation.finalResponsibilityConfirmed,
    },
    groupRoster: groupRosterFingerprint(directory),
  })
}

export function confirmedM12BundleIsCurrent(progress: M12Progress, directory: ParticipantDirectory) {
  return Boolean(progress.mode === 'official' && progress.confirmedBundle?.contentFingerprint === m12ContentFingerprint(progress, directory))
}

export function latestM12AssessmentIsCurrent(progress: M12Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && confirmedM12BundleIsCurrent(progress, directory) && latest.contentFingerprint === m12ContentFingerprint(progress, directory))
}

export function m12PreviewIsComplete(progress: M12Progress, participantId: string) {
  return Boolean(progress.mode === 'preview' && progress.previewCompletedAt && validateM12TeacherConfirmation(progress, participantId).valid)
}

export function progressForM12(progress: M12Progress, participantId: string, directory: ParticipantDirectory) {
  if (progress.route === 'overview' && progress.evidence.length === 0) return 0
  const stages = [
    validateM12Evidence(progress, participantId).valid,
    validateM12Flow(progress, participantId).valid,
    validateM12Correction(progress).valid,
    validateM12Assistant(progress).valid,
    validateM12Retest(progress).valid,
    validateM12SafetyShowcase(progress, directory, participantId).valid,
    validateM12TeacherConfirmation(progress, participantId, directory).valid,
    progress.mode === 'preview' ? m12PreviewIsComplete(progress, participantId) : latestM12AssessmentIsCurrent(progress, directory),
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}

export function officialProgressForM12(progress: M12Progress, participantId: string, directory: ParticipantDirectory) {
  return progress.mode === 'official' ? progressForM12(progress, participantId, directory) : 0
}

export function routeForM12Requirement(id: string): M12Route {
  if (id === 'evidence-flow') return 'orchestration'
  if (id === 'traceable-proof') return 'assistant'
  if (id === 'integration-retest') return 'integration'
  return 'safety'
}
