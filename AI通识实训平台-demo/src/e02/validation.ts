import type { ParticipantDirectory } from '../training/types'
import type {
  E02DraftPackage,
  E02ModificationRecord,
  E02Progress,
  E02Route,
  E02StepId,
} from './domain'
import {
  e02DraftFingerprint,
  e02Hash,
  e02InputFingerprint,
  eligibleE02Reviewers,
  rubricScoreTotal,
} from './runner'

export interface E02ValidationResult { valid: boolean; messages: string[] }
export type E02InitialDefect = 'operation-sequence' | 'vague-safety' | 'rubric-total-95'

function unique(values: string[]) { return [...new Set(values)] }
function nonEmpty(value: string) { return Boolean(value.trim()) }
function exactIdSet(actual: string[], expected: string[]) {
  return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((id) => actual.includes(id))
}

const stepIds: E02StepId[] = ['S01', 'S02', 'S03', 'S04']
const safetyIds = ['SAFE-01', 'SAFE-02', 'SAFE-03']
const rubricItemIds = ['R01', 'R02', 'R03', 'R04', 'R05']

export function e02UnsafeFindings(progress: Pick<E02Progress, 'scenario' | 'specification'>) {
  const text = [
    progress.scenario.courseName,
    progress.scenario.vocationalTask,
    progress.scenario.learningObjective,
    progress.scenario.equipment,
    ...progress.scenario.materials,
    progress.scenario.trainingConditions,
    progress.specification.name,
    progress.specification.sourceOrganization,
    ...progress.specification.clauses.flatMap((item) => [item.title, item.requirement]),
  ].join('\n')
  const findings: string[] = []
  if (/(?:1[3-9]\d{9})/u.test(text)) findings.push('手机号')
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) findings.push('电子邮箱')
  if (/(?:\d{17}[\dXx])|(?:身份证(?:号|号码)?\s*[:：]?\s*\d{6,})/u.test(text)) findings.push('身份信息')
  if (/(?:sk-[a-z0-9_-]{12,}|api[_ -]?key\s*[:=：]|secret\s*[:=：]|password\s*[:=：])/iu.test(text)) findings.push('密钥或口令')
  return unique(findings)
}

export function validateE02Source(progress: E02Progress): E02ValidationResult {
  const messages: string[] = []
  const scenario = progress.scenario
  const specification = progress.specification
  if (![scenario.courseName, scenario.vocationalTask, scenario.learningObjective, scenario.equipment, scenario.trainingConditions].every(nonEmpty)) {
    messages.push('请完整填写课程、职业任务、目标、设备和实训条件')
  }
  if (!scenario.materials.length || scenario.materials.some((item) => !nonEmpty(item))) messages.push('实训材料须逐项登记且不能为空')
  if (specification.sourceKind !== '平台已审核虚构实训规范' || specification.reviewedFictional !== true) {
    messages.push('当前 Demo 只能使用明确标注“平台已审核虚构实训规范”的样例')
  }
  if (![specification.name, specification.version, specification.applicableEquipment, specification.sourceOrganization, specification.authorization, specification.scopeNote].every(nonEmpty)) {
    messages.push('规范名称、版本、适用设备、来源、授权和适用范围须完整')
  }
  if (scenario.equipment.trim() !== specification.applicableEquipment.trim()) messages.push('当前任务设备须与规范适用设备一致')
  if (specification.clauses.length < 3 || new Set(specification.clauses.map((item) => item.clauseId)).size !== specification.clauses.length) {
    messages.push('规范须包含不少于 3 条编号唯一的可引用条款')
  }
  if (specification.clauses.some((item) => !nonEmpty(item.clauseId) || !nonEmpty(item.title) || !nonEmpty(item.requirement) || !Number.isInteger(item.sequence) || item.sequence < 1)) {
    messages.push('每条规范条款须有编号、顺序、标题和完整要求')
  }
  const unsafe = e02UnsafeFindings(progress)
  if (unsafe.length) messages.push(`任务或规范检测到${unsafe.join('、')}，不得录入真实个人信息或密钥`)
  if (!scenario.materialAuthorizationConfirmed || !scenario.privacyConfirmed || !scenario.verifiedOperationOnlyConfirmed) {
    messages.push('须确认材料授权、隐私边界以及只使用已核验操作规范')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

function specificationClauseIds(progress: E02Progress) {
  return new Set(progress.specification.clauses.map((item) => item.clauseId))
}

function draftStructureMessages(progress: E02Progress, draft: E02DraftPackage | undefined, participantId?: string) {
  const messages: string[] = []
  if (!draft) return ['尚未生成确定性任务书草稿']
  if (!draft.participantId || (participantId && draft.participantId !== participantId)) messages.push('草稿不属于当前 participantId')
  if (draft.inputFingerprint !== e02InputFingerprint(progress)) messages.push('草稿所用任务或规范版本已失效')
  if (![draft.taskBook.taskBookId, draft.taskBook.title, draft.taskBook.background, draft.taskBook.objective].every(nonEmpty)) messages.push('任务书名称、背景、目标和编号须完整')
  if (!draft.taskBook.materials.length || draft.taskBook.materials.some((item) => !nonEmpty(item))) messages.push('任务书材料须完整')
  if (draft.taskBook.steps.length < 3) messages.push('任务书须包含不少于 3 个有序步骤')
  const orders = draft.taskBook.steps.map((item) => item.order)
  const sortedOrders = [...orders].sort((left, right) => left - right)
  if (new Set(orders).size !== orders.length || sortedOrders.some((order, index) => order !== index + 1)) messages.push('步骤序号须唯一且从 1 连续排列')
  const clauses = specificationClauseIds(progress)
  for (const step of draft.taskBook.steps) {
    if (![step.stepId, step.action, step.completionEvidence, step.clauseId].every(nonEmpty)) messages.push(`${step.stepId}：动作、完成证据和规范条款须完整`)
    if (!clauses.has(step.clauseId)) messages.push(`${step.stepId}：引用的规范条款不存在`)
  }
  if (draft.safetyChecklist.length < 3) messages.push('安全检查单须包含不少于 3 个检查点')
  for (const safety of draft.safetyChecklist) {
    if (![safety.safetyId, safety.description, safety.completionEvidence, safety.stepId, safety.clauseId].every(nonEmpty)) messages.push(`${safety.safetyId}：检查要求、完成证据、步骤和条款须完整`)
    if (!draft.taskBook.steps.some((item) => item.stepId === safety.stepId)) messages.push(`${safety.safetyId}：关联步骤不存在`)
    if (!clauses.has(safety.clauseId)) messages.push(`${safety.safetyId}：引用的规范条款不存在`)
  }
  if (!draft.rubric.rubricId.trim() || !draft.rubric.version.trim() || !draft.rubric.items.length) messages.push('评分量规须有编号、版本和评价项')
  for (const item of draft.rubric.items) {
    if (![item.rubricItemId, item.name, item.deductionConditions].every(nonEmpty) || !Number.isFinite(item.score) || item.score <= 0) messages.push(`${item.rubricItemId}：名称、正分值和扣分条件须完整`)
    if (!item.criticalStepIds.length || item.criticalStepIds.some((id) => !draft.taskBook.steps.some((step) => step.stepId === id))) messages.push(`${item.rubricItemId}：须关联存在的关键步骤`)
    if (!item.clauseIds.length || item.clauseIds.some((id) => !clauses.has(id))) messages.push(`${item.rubricItemId}：须关联存在的规范条款`)
  }
  return unique(messages)
}

export function detectE02InitialDefects(progress: E02Progress): E02InitialDefect[] {
  const draft = progress.aiDraft
  if (!draft) return []
  const clauseSequence = new Map(progress.specification.clauses.map((item) => [item.clauseId, item.sequence]))
  const orderedSteps = [...draft.taskBook.steps].sort((left, right) => left.order - right.order)
  const sequenceValues = orderedSteps.map((item) => clauseSequence.get(item.clauseId) ?? Number.MAX_SAFE_INTEGER)
  const defects: E02InitialDefect[] = []
  if (sequenceValues.some((value, index) => index > 0 && value < sequenceValues[index - 1])) defects.push('operation-sequence')
  const vagueSafety = draft.safetyChecklist.some((item) => ['注意安全', '确保安全', '规范操作'].includes(item.description.trim().replace(/[。！!]/gu, '')))
  if (vagueSafety) defects.push('vague-safety')
  if (rubricScoreTotal(draft) === 95) defects.push('rubric-total-95')
  return defects
}

export function validateE02InitialDraft(progress: E02Progress, participantId?: string): E02ValidationResult {
  const messages = [...validateE02Source(progress).messages, ...draftStructureMessages(progress, progress.aiDraft, participantId)]
  const defects = detectE02InitialDefects(progress)
  if (!exactIdSet(defects, ['operation-sequence', 'vague-safety', 'rubric-total-95'])) {
    messages.push('确定性初稿须稳定暴露操作顺序、安全表述和量规总分 95 分三类可区分缺陷')
  }
  if (progress.workingDraft && e02DraftFingerprint(progress.workingDraft) !== e02DraftFingerprint(progress.aiDraft)) {
    // 初稿校验只验证只读 aiDraft；workingDraft 允许在后续人工修改。
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE02PeerReview(progress: E02Progress, directory: ParticipantDirectory): E02ValidationResult {
  const messages = [...validateE02InitialDraft(progress, directory.currentParticipantId).messages]
  const review = progress.peerReview
  const reviewer = eligibleE02Reviewers(directory).find((item) => item.participantId === review.reviewerId)
  if (!reviewer || review.reviewerGroupId !== reviewer.groupId) messages.push('复核人必须是当前同组的其他真实参训成员')
  if (!review.reviewerRole) messages.push('须记录复核人的任务内临时角色')
  if (!progress.aiDraft || review.taskBookId !== progress.aiDraft.taskBook.taskBookId || review.reviewedDraftFingerprint !== e02DraftFingerprint(progress.aiDraft)) {
    messages.push('小组复核须关联当前只读初稿及其内容指纹')
  }
  if (review.sequence !== '需调整' || review.safety !== '需调整' || review.scoreTotal !== '不是 100 分') {
    messages.push('复核须如实记录顺序需调整、安全需调整和总分不是 100 分三项初稿事实')
  }
  if (!review.suggestion.trim()) messages.push('须填写具体复核问题与建议')
  if (!review.simulated || !review.disclosure.includes('无多人后端') || !review.disclosure.includes('非实时提交') || !review.disclosure.includes('不代表真实组员在线提交')) {
    messages.push('Demo 复核须公开无多人后端、非实时代录边界，不冒充组员在线提交')
  }
  if (!review.submitted || !review.submittedAt || !review.recordId) messages.push('须提交完整的小组复核记录')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function finalStepOrderIsCorrect(progress: E02Progress, draft: E02DraftPackage) {
  const sequence = new Map(progress.specification.clauses.map((item) => [item.clauseId, item.sequence]))
  const ordered = [...draft.taskBook.steps].sort((left, right) => left.order - right.order)
  return ordered.every((item, index) => index === 0 || (sequence.get(item.clauseId) ?? 0) >= (sequence.get(ordered[index - 1].clauseId) ?? 0))
}

export function e02SafetyDescriptionIsSpecific(value: string) {
  return nonEmpty(value) && !['注意安全', '确保安全', '规范操作'].includes(value.trim().replace(/[。！!]/gu, ''))
}

function fieldValue(draft: E02DraftPackage, modification: E02ModificationRecord) {
  if (modification.category === 'step') {
    const item = draft.taskBook.steps.find((step) => step.stepId === modification.targetId)
    return modification.field === 'order' ? String(item?.order ?? '') : ''
  }
  if (modification.category === 'safety') {
    const item = draft.safetyChecklist.find((safety) => safety.safetyId === modification.targetId)
    return modification.field === 'description' ? item?.description ?? '' : ''
  }
  const item = draft.rubric.items.find((rubric) => rubric.rubricItemId === modification.targetId)
  return modification.field === 'score' ? String(item?.score ?? '') : ''
}

export function validateE02FinalDraft(progress: E02Progress, directory: ParticipantDirectory): E02ValidationResult {
  const messages = [...validateE02PeerReview(progress, directory).messages]
  const draft = progress.workingDraft
  if (!draft) return { valid: false, messages: unique([...messages, '尚未应用复核意见形成教师工作稿']) }
  messages.push(...draftStructureMessages(progress, draft, directory.currentParticipantId))
  if (!finalStepOrderIsCorrect(progress, draft)) messages.push('最终任务书的操作顺序须与规范条款顺序一致')
  if (draft.safetyChecklist.some((item) => !e02SafetyDescriptionIsSpecific(item.description))) messages.push('安全检查点不得只写“注意安全”等泛化表述')
  if (rubricScoreTotal(draft) !== 100) messages.push(`评分量规总分必须准确为 100 分，当前为 ${rubricScoreTotal(draft)} 分`)
  if (draft.taskBook.steps.some((item) => !item.teacherReviewed)
    || draft.safetyChecklist.some((item) => !item.teacherReviewed)
    || draft.rubric.items.some((item) => !item.teacherReviewed)) messages.push('教师须逐项核验步骤、安全点和量规项')
  const clauseIds = specificationClauseIds(progress)
  const criticalSteps = draft.taskBook.steps.filter((item) => item.critical)
  if (!criticalSteps.length || criticalSteps.some((item) => !clauseIds.has(item.clauseId) || !item.completionEvidence.trim())) messages.push('全部关键步骤须有正式规范条款和可观察完成证据')
  if (draft.safetyChecklist.some((item) => !clauseIds.has(item.clauseId) || !draft.taskBook.steps.some((step) => step.stepId === item.stepId))) messages.push('全部安全点须同时关联有效步骤和规范条款')

  const substantive = progress.modifications.filter((item) => item.participantId === directory.currentParticipantId
    && item.sourcePeerReviewId === progress.peerReview.recordId
    && item.reviewedDraftFingerprint === progress.peerReview.reviewedDraftFingerprint
    && item.beforeValue.trim() !== item.afterValue.trim()
    && item.basis.trim()
    && clauseIds.has(item.basisClauseId)
    && progress.aiDraft && fieldValue(progress.aiDraft, item) === item.beforeValue
    && fieldValue(draft, item) === item.afterValue)
  if (!substantive.length) messages.push('作者须根据当前复核保存至少 1 条可核对的实质修改及规范依据')
  if (progress.peerReview.authorTreatment !== '已采纳并修正' || !progress.peerReview.authorBasis.trim()) messages.push('作者须记录对组员意见的处理方式和依据')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE02Confirmation(progress: E02Progress, directory: ParticipantDirectory): E02ValidationResult {
  const messages = [...validateE02FinalDraft(progress, directory).messages]
  const confirmation = progress.teacherConfirmation
  if (!confirmation.specificationReviewedConfirmed
    || !confirmation.authorizationAndPrivacyConfirmed
    || !confirmation.finalArtifactsConfirmed
    || !confirmation.finalResponsibilityConfirmed) {
    messages.push('须确认规范已审核、材料授权与隐私、三项最终成果以及教师最终责任')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

function groupRosterFingerprint(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const roster = directory.participants
    .filter((item) => item.groupId === current?.groupId)
    .map((item) => ({ participantId: item.participantId, name: item.name, groupId: item.groupId }))
    .sort((left, right) => left.participantId.localeCompare(right.participantId))
  return e02Hash(roster)
}

export function e02ConfirmationFingerprint(progress: E02Progress, directory: ParticipantDirectory) {
  return e02Hash({
    participantId: directory.currentParticipantId,
    scenario: progress.scenario,
    specification: progress.specification,
    aiDraft: progress.aiDraft,
    workingDraft: progress.workingDraft,
    peerReview: progress.peerReview,
    modifications: progress.modifications,
    teacherConfirmation: progress.teacherConfirmation,
    groupRoster: groupRosterFingerprint(directory),
  })
}

export function confirmedE02PackageIsCurrent(progress: E02Progress, directory: ParticipantDirectory) {
  const pkg = progress.confirmedPackage
  if (!pkg || !progress.workingDraft || pkg.participantId !== directory.currentParticipantId || !validateE02Confirmation(progress, directory).valid) return false
  const exactArtifacts = pkg.artifacts.length === 3
    && pkg.artifacts[0]?.kind === 'e02-task-book' && pkg.artifacts[0]?.name === '实训任务书'
    && pkg.artifacts[1]?.kind === 'e02-safety-checklist' && pkg.artifacts[1]?.name === '安全检查单'
    && pkg.artifacts[2]?.kind === 'e02-rubric' && pkg.artifacts[2]?.name === '100 分评分量规'
  return exactArtifacts
    && pkg.specificationName === progress.specification.name
    && pkg.specificationVersion === progress.specification.version
    && pkg.taskBookId === progress.workingDraft.taskBook.taskBookId
    && pkg.rubricTotal === 100
    && pkg.confirmationFingerprint === e02ConfirmationFingerprint(progress, directory)
}

export function e02ContentFingerprint(progress: E02Progress, directory: ParticipantDirectory) {
  return e02Hash({
    confirmation: e02ConfirmationFingerprint(progress, directory),
    package: progress.confirmedPackage ? {
      packageId: progress.confirmedPackage.packageId,
      participantId: progress.confirmedPackage.participantId,
      confirmationFingerprint: progress.confirmedPackage.confirmationFingerprint,
      specificationName: progress.confirmedPackage.specificationName,
      specificationVersion: progress.confirmedPackage.specificationVersion,
      taskBookId: progress.confirmedPackage.taskBookId,
      rubricTotal: progress.confirmedPackage.rubricTotal,
      artifacts: progress.confirmedPackage.artifacts,
    } : null,
  })
}

export function latestE02AssessmentIsCurrent(progress: E02Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === e02ContentFingerprint(progress, directory))
}

export function validateE02AssessmentSubmission(progress: E02Progress, directory: ParticipantDirectory): E02ValidationResult {
  const messages = [...validateE02Confirmation(progress, directory).messages]
  if (!confirmedE02PackageIsCurrent(progress, directory)) messages.push('须先形成当前教师的三项固定成果包')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function progressForE02(progress: E02Progress, directory: ParticipantDirectory) {
  if (latestE02AssessmentIsCurrent(progress, directory)) return 100
  if (progress.route === 'overview'
    && !progress.aiDraft
    && !progress.workingDraft
    && !progress.confirmedPackage
    && progress.assessments.length === 0) return 0
  const routeFloor: Record<E02Route, number> = {
    overview: 0,
    source: 10,
    draft: 25,
    'safety-rubric': 40,
    'peer-review': 55,
    'teacher-revision': 70,
    confirmation: 85,
    result: 90,
  }
  let value = routeFloor[progress.route]
  if (validateE02Source(progress).valid) value = Math.max(value, 20)
  if (validateE02InitialDraft(progress, directory.currentParticipantId).valid) value = Math.max(value, 40)
  if (validateE02PeerReview(progress, directory).valid) value = Math.max(value, 60)
  if (validateE02FinalDraft(progress, directory).valid) value = Math.max(value, 80)
  if (confirmedE02PackageIsCurrent(progress, directory)) value = Math.max(value, 90)
  return value
}
