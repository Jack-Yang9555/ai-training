import { g03Hash, g03OutputNames } from './data'
import type {
  G03AcceptanceCondition,
  G03ArtifactSnapshot,
  G03ConditionId,
  G03Progress,
  G03Route,
  G03SourceTask,
  G03StageStatus,
} from './domain'

export interface G03ValidationResult { valid: boolean; messages: string[] }

const unique = (messages: string[]) => [...new Set(messages)]
const normalized = (value: string) => value.trim().replace(/\s+/g, '')

export function g03ContentFingerprint(progress: G03Progress) {
  return `g03-${g03Hash({
    groupId: progress.groupId,
    rosterFingerprint: progress.rosterFingerprint,
    evidenceFingerprint: progress.evidenceFingerprint,
    scheduleFingerprint: progress.scheduleFingerprint,
    memberEvidence: progress.memberEvidence,
    testMatrix: progress.testMatrix,
    matrixConfirmed: progress.matrixConfirmed,
    issues: progress.issues,
    reportConfirmed: progress.reportConfirmed,
    scenarios: progress.scenarios,
    showcase: progress.showcase,
    contributions: progress.contributions,
  })}`
}

export function g03CurrentTeacherEvidenceComplete(progress: G03Progress) {
  const current = progress.memberEvidence.find((item) => item.participantId === progress.currentParticipantId && item.isCurrentParticipant)
  if (!current || current.taskEvidence.length !== 3) return false
  return (['M09', 'M10', 'M11'] as G03SourceTask[]).every((taskId) => current.taskEvidence.some((item) => item.taskId === taskId
    && item.source === '真实本地证据'
    && item.current
    && item.artifactId.trim()
    && item.version.trim()
    && item.assessmentId.trim()))
}

export function validateG03Matrix(progress: G03Progress): G03ValidationResult {
  const messages: string[] = []
  const roster = new Set(progress.memberEvidence.map((item) => item.participantId))
  if (roster.size < 2) messages.push('当前小组至少需要 2 名成员才能形成双向测试')
  if (progress.testMatrix.length !== roster.size) messages.push('双向矩阵必须逐人覆盖当前小组全部成员')
  for (const row of progress.testMatrix) {
    if (!roster.has(row.participantId)) messages.push(`测试矩阵存在非当前小组成员：${row.participantName}`)
    if (!roster.has(row.testedParticipantId) || row.testedParticipantId === row.participantId) messages.push(`${row.participantName} 尚未有效测试同组其他成员`)
    if (!roster.has(row.acceptedTestFromParticipantId) || row.acceptedTestFromParticipantId === row.participantId) messages.push(`${row.participantName} 尚未有效接受同组其他成员测试`)
    if (!row.testedRecordId.trim() || !row.acceptedRecordId.trim() || !row.submitted) messages.push(`${row.participantName} 的测试或被测试记录尚未提交`)
    const testedMember = progress.testMatrix.find((item) => item.participantId === row.testedParticipantId)
    if (testedMember && (testedMember.acceptedTestFromParticipantId !== row.participantId || testedMember.acceptedRecordId !== row.testedRecordId)) messages.push(`${row.participantName} 的测试记录与被测试成员接受记录不一致`)
    const tester = progress.testMatrix.find((item) => item.participantId === row.acceptedTestFromParticipantId)
    if (tester && (tester.testedParticipantId !== row.participantId || tester.testedRecordId !== row.acceptedRecordId)) messages.push(`${row.participantName} 的接受测试记录与测试成员提交记录不一致`)
    if (row.participantId === progress.currentParticipantId && row.source !== '真实本地证据') messages.push('当前教师必须读取本人 M11 已确认双向覆盖包，不能由 G03 临时生成记录替代')
    if (row.participantId !== progress.currentParticipantId && row.source !== '确定性模拟组员证据') messages.push(`${row.participantName} 的 Demo 记录来源标识不完整`)
  }
  if (!progress.matrixConfirmed) messages.push('请确认小组已逐人核对测试他人与接受测试两项覆盖')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function issueIsTraceable(progress: G03Progress, issue: G03Progress['issues'][number]) {
  const sourceExists = progress.memberEvidence.some((member) => member.taskEvidence.some((evidence) => evidence.taskId === issue.sourceTask && evidence.artifactId === issue.sourceEvidenceId && evidence.current))
  const responsibleExists = progress.memberEvidence.some((member) => member.participantId === issue.responsibleParticipantId)
  return sourceExists
    && responsibleExists
    && issue.issueId.trim()
    && issue.sourceEvidenceId.trim()
    && issue.problem.trim()
    && issue.correction.trim()
    && normalized(issue.problem) !== normalized(issue.correction)
    && issue.correctionEvidenceId.trim()
    && issue.retestEvidenceId.trim()
    && issue.retestResult === '已通过'
    && ['真实本地证据', '确定性模拟组员证据'].includes(issue.source)
}

export function validateG03Issues(progress: G03Progress): G03ValidationResult {
  const messages: string[] = []
  if (!g03CurrentTeacherEvidenceComplete(progress)) messages.push('当前教师的 M09、M10、M11 当前有效成果必须全部读取，缺项不能由组员模拟证据替代')
  const validIssues = progress.issues.filter((issue) => issueIsTraceable(progress, issue))
  if (!validIssues.length) messages.push('综合报告至少需要 1 条可追溯到 M09—M11 的问题、修改、负责人和已通过复测')
  if (!progress.reportConfirmed) messages.push('请确认综合报告只汇总原任务证据，不重新填写 M09—M11 完整表单')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateG03Scenarios(progress: G03Progress): G03ValidationResult {
  const messages: string[] = []
  const expected = [
    ['有来源回答', 'M10'],
    ['缺失条件追问', 'M11'],
    ['超范围说明与转交', 'M11'],
  ] as const
  if (progress.scenarios.length !== 3 || new Set(progress.scenarios.map((item) => item.kind)).size !== 3) messages.push('核心演示必须恰好包含三种不同场景卡')
  for (const [kind, sourceTaskId] of expected) {
    const card = progress.scenarios.find((item) => item.kind === kind)
    if (!card) { messages.push(`缺少“${kind}”演示卡`); continue }
    if (card.source !== '真实本地证据' || !card.evidenceId.trim()) messages.push(`“${kind}”必须读取当前教师真实 ${sourceTaskId} 证据`)
    if (card.sourceTaskId !== sourceTaskId) messages.push(`“${kind}”的来源任务必须为 ${sourceTaskId}`)
    if (!card.question.trim() || !card.answer.trim()) messages.push(`“${kind}”缺少学生问题或助教原始回答`)
    if (!card.confirmed) messages.push(`请逐卡确认“${kind}”的现场行为`)
    if (kind === '有来源回答' && (!card.sourceId?.trim() || !card.sourceLocation?.trim() || !card.sourceExcerpt?.trim() || !card.noFalseCitation)) messages.push('有来源回答必须能打开来源位置、显示原文片段且无虚假引用')
    if (kind === '缺失条件追问' && !card.missingCondition?.trim()) messages.push('条件追问卡必须明确至少一个决定回答所需的缺失条件')
    if (kind === '超范围说明与转交' && (!card.boundaryStatement?.trim() || !card.handoffTarget?.trim() || !card.noFalseCitation || card.sourceId?.trim())) messages.push('越界卡必须说明知识范围、停止猜测、无虚假引用并指向人工转交对象')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateG03Showcase(progress: G03Progress): G03ValidationResult {
  const messages: string[] = []
  const plan = progress.showcase
  const aCount = plan.batchAssignments.filter((item) => item.batch === 'A').length
  const bCount = plan.batchAssignments.filter((item) => item.batch === 'B').length
  if (!aCount || !bCount || Math.abs(aCount - bCount) > 1) messages.push('全班小组必须分为数量尽量相近的 A、B 两批')
  if (plan.rounds.length !== 2 || plan.rounds[0].displayBatch !== 'A' || plan.rounds[1].displayBatch !== 'B') messages.push('必须保留第一轮 A 展示/B 体验、第二轮 B 展示/A 体验的交换安排')
  if (plan.rounds.some((round) => round.currentGroupRole !== (round.displayBatch === plan.currentBatch ? '展示' : '体验'))) messages.push('当前小组在两轮中的展示/体验角色与 A/B 批次不一致')
  if (!plan.planConfirmed) messages.push('请确认 5 分钟准备、两轮各 10 分钟和最后 5 分钟汇总安排')
  if (plan.rounds.some((round) => !round.completed)) messages.push('A/B 两轮展示与体验状态必须全部完成')
  const ownPresentation = plan.rounds.find((round) => round.currentGroupRole === '展示')
  if (!ownPresentation) messages.push('当前小组缺少至少一次展示轮次')
  else {
    if (ownPresentation.coreDemoSeconds < 1 || ownPresentation.coreDemoSeconds > 180) messages.push('当前小组核心演示必须记录实际时长且不得超过 180 秒')
    if (!ownPresentation.qaCompleted || ownPresentation.qaSeconds < 120) messages.push('当前小组必须保存至少一次 2 分钟在线答问记录')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateG03Contributions(progress: G03Progress): G03ValidationResult {
  const messages: string[] = []
  const roster = new Set(progress.memberEvidence.map((item) => item.participantId))
  if (progress.contributions.length !== roster.size) messages.push('贡献清单必须逐人覆盖当前小组全部成员')
  for (const member of progress.memberEvidence) {
    const contribution = progress.contributions.find((item) => item.participantId === member.participantId)
    if (!contribution) { messages.push(`${member.participantName} 尚无贡献记录`); continue }
    if (!contribution.role) messages.push(`${member.participantName} 尚未确认任务角色`)
    if (!contribution.participation.some((kind) => ['操作', '讲解', '在线答问'].includes(kind))) messages.push(`${member.participantName} 至少须承担操作、讲解或在线答问中的一项`)
    if (!contribution.contribution.trim() || !contribution.evidenceId.trim()) messages.push(`${member.participantName} 缺少具体贡献或证据引用`)
    if (!contribution.confirmed) messages.push(`${member.participantName} 尚未逐项确认本人贡献`)
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function g03Conditions(progress: G03Progress): G03AcceptanceCondition[] {
  const matrix = validateG03Matrix(progress)
  const scenarios = validateG03Scenarios(progress)
  const showcase = validateG03Showcase(progress)
  const contributions = validateG03Contributions(progress)
  const issues = validateG03Issues(progress)
  return [
    { id: 'bilateral-coverage', label: '每位成员均完成一次测试他人和一次接受测试', passed: matrix.valid, evidence: matrix.valid ? `${progress.testMatrix.length}/${progress.memberEvidence.length} 名成员双向覆盖；本人出向为真实 M11 复测，入向为明确模拟回传` : matrix.messages[0] ?? '双向矩阵待核对' },
    { id: 'three-scenarios', label: '三场景演示包含有据回答、条件追问和超范围说明与转交', passed: scenarios.valid, evidence: scenarios.valid ? '当前教师 M10 有据预览与 M11 追问/越界复测卡已逐卡确认' : scenarios.messages[0] ?? '三场景证据待补齐' },
    { id: 'two-round-showcase', label: 'A/B 两批两轮完成，核心演示不超过 3 分钟，在线答问不少于 2 分钟且全员参与', passed: showcase.valid && contributions.valid, evidence: showcase.valid && contributions.valid ? `两轮已完成，${progress.contributions.length}/${progress.memberEvidence.length} 名成员逐项确认贡献` : [...showcase.messages, ...contributions.messages][0] ?? '两轮展示或贡献待完成' },
    { id: 'traceable-report', label: '综合报告记录可追溯问题、修改内容、负责人和复测结果', passed: issues.valid, evidence: issues.valid ? `${progress.issues.filter((item) => issueIsTraceable(progress, item)).length} 条可追溯问题已汇入，M09—M11 本人证据齐全` : issues.messages[0] ?? '综合报告待核对' },
  ]
}

export function validateG03Assessment(progress: G03Progress): G03ValidationResult {
  const messages = [
    ...validateG03Matrix(progress).messages,
    ...validateG03Scenarios(progress).messages,
    ...validateG03Showcase(progress).messages,
    ...validateG03Contributions(progress).messages,
    ...validateG03Issues(progress).messages,
  ]
  if (!g03Conditions(progress).every((item) => item.passed)) messages.push('G03 不计分，四项验收条件必须同时通过')
  return { valid: unique(messages).length === 0, messages: unique(messages) }
}

export function createG03Artifacts(progress: G03Progress, capturedAt = new Date().toISOString()): G03ArtifactSnapshot[] {
  const fingerprint = g03ContentFingerprint(progress)
  const validIssueCount = progress.issues.filter((item) => issueIsTraceable(progress, item)).length
  const ownPresentation = progress.showcase.rounds.find((item) => item.currentGroupRole === '展示')
  return g03OutputNames.map((name, index) => ({
    artifactId: `G03:${progress.groupId}:${index + 1}:${fingerprint}`,
    name,
    capturedAt,
    fingerprint,
    summary: index === 0
      ? `${progress.testMatrix.length} 名成员双向覆盖 · ${validIssueCount} 条问题修改复测`
      : index === 1
        ? `三场景 · ${ownPresentation?.coreDemoSeconds ?? 0} 秒核心演示 · ${ownPresentation?.qaSeconds ?? 0} 秒在线答问`
        : `${progress.contributions.length} 名成员角色、参与类型与证据引用`,
  }))
}

export function g03ArtifactsAreCurrent(progress: G03Progress) {
  const fingerprint = g03ContentFingerprint(progress)
  return progress.artifacts.length === 3 && g03OutputNames.every((name) => progress.artifacts.some((item) => item.name === name && item.fingerprint === fingerprint))
}

export function latestG03AssessmentIsCurrent(progress: G03Progress) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.outcome === '已通过' && latest.fingerprint === g03ContentFingerprint(progress) && g03ArtifactsAreCurrent(progress))
}

export function g03CurrentStatus(progress: G03Progress): G03StageStatus {
  if (latestG03AssessmentIsCurrent(progress)) return '已通过'
  const latest = progress.assessments.at(-1)
  if (latest?.outcome === '未通过' && latest.fingerprint === g03ContentFingerprint(progress)) return '未通过'
  if (latest) return '需补验'
  return '待验收'
}

export function createG03Assessment(progress: G03Progress, assessor = '培训师', submittedAt = new Date().toISOString()) {
  const conditions = g03Conditions(progress)
  const passed = conditions.every((item) => item.passed)
  const artifacts = passed ? createG03Artifacts(progress, submittedAt) : []
  return {
    assessment: {
      assessmentId: `g03-assessment-${submittedAt}-${progress.assessments.length + 1}`,
      phase: progress.assessments.length ? '补验' as const : '初验' as const,
      outcome: passed ? '已通过' as const : '未通过' as const,
      submittedAt,
      assessor,
      method: '本地规则引擎（Demo）' as const,
      fingerprint: g03ContentFingerprint(progress),
      failedConditionIds: conditions.filter((item) => !item.passed).map((item) => item.id),
      conditions,
      modificationSummary: progress.assessmentModificationSummary,
      artifacts,
    },
    artifacts,
  }
}

export function progressForG03(progress: G03Progress) {
  if (progress.route === 'overview' && progress.assessments.length === 0 && !progress.matrixConfirmed) return 0
  const stages = [
    validateG03Matrix(progress).valid,
    validateG03Issues(progress).valid,
    validateG03Scenarios(progress).valid,
    validateG03Showcase(progress).valid,
    validateG03Contributions(progress).valid,
    latestG03AssessmentIsCurrent(progress),
  ]
  return Math.round(stages.filter(Boolean).length / stages.length * 100)
}

export function routeForG03Condition(id: G03ConditionId): G03Route {
  if (id === 'bilateral-coverage') return 'matrix'
  if (id === 'three-scenarios') return 'scenarios'
  if (id === 'two-round-showcase') return 'showcase'
  return 'issues'
}
