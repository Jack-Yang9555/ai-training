import { groupRoles } from '../data/trainingParticipants'
import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import type {
  G03BatchAssignment,
  G03Contribution,
  G03CurrentEvidenceInput,
  G03EvidenceSource,
  G03GroupContext,
  G03IssueRecord,
  G03MemberEvidence,
  G03MemberTaskEvidence,
  G03ScenarioCard,
  G03ShowcasePlan,
  G03SourceTask,
  G03TaskEvidenceInput,
  G03TestCoverage,
} from './domain'

export const g03OutputNames = [
  '课程知识库与 AI 助教综合测试报告',
  '3 分钟核心演示和 2 分钟在线答问记录',
  '成员角色与贡献清单',
] as const

const taskIds: G03SourceTask[] = ['M09', 'M10', 'M11']

export function g03Hash(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function currentGroup(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const members = current ? directory.participants.filter((item) => item.groupId === current.groupId) : []
  return { current, members }
}

function missingEvidence(member: TrainingParticipant, taskId: G03SourceTask): G03MemberTaskEvidence {
  return {
    participantId: member.participantId,
    participantName: member.name,
    taskId,
    artifactId: '',
    version: '',
    assessmentId: '',
    current: false,
    source: '缺少当前真实证据',
  }
}

function actualEvidence(member: TrainingParticipant, input: G03TaskEvidenceInput | undefined, taskId: G03SourceTask): G03MemberTaskEvidence {
  if (!input || input.taskId !== taskId) return missingEvidence(member, taskId)
  return { ...input, participantId: member.participantId, participantName: member.name, source: '真实本地证据' }
}

function simulatedEvidence(member: TrainingParticipant, taskId: G03SourceTask): G03MemberTaskEvidence {
  const suffix = taskId.toLowerCase()
  return {
    participantId: member.participantId,
    participantName: member.name,
    taskId,
    artifactId: `${member.participantId}:sim:${suffix}:artifact`,
    version: taskId === 'M09' || taskId === 'M10' ? 'v1.0' : 'retest-v1',
    assessmentId: `${member.participantId}:sim:${taskId}:assessment`,
    current: true,
    source: '确定性模拟组员证据',
    ...(taskId === 'M11' ? {
      issueId: `${member.participantId}:sim:M11:issue`,
      issue: '含糊问题首测未明确追问学习阶段。',
      correction: '在回答流程中增加“先追问学习阶段和已完成步骤”。',
      correctionEvidenceId: `${member.participantId}:sim:M11:correction`,
      retestResult: '已通过' as const,
      retestEvidenceId: `${member.participantId}:sim:M11:retest`,
    } : {}),
  }
}

function buildMemberEvidence(members: TrainingParticipant[], input: G03CurrentEvidenceInput): G03MemberEvidence[] {
  return members.map((member) => {
    const isCurrentParticipant = member.participantId === input.participantId
    return {
      participantId: member.participantId,
      participantName: member.name,
      isCurrentParticipant,
      taskEvidence: taskIds.map((taskId) => isCurrentParticipant
        ? actualEvidence(member, input.tasks[taskId], taskId)
        : simulatedEvidence(member, taskId)),
    }
  })
}

function memberName(members: TrainingParticipant[], participantId: string) {
  return members.find((item) => item.participantId === participantId)?.name ?? '未找到成员'
}

function buildTestMatrix(members: TrainingParticipant[], input: G03CurrentEvidenceInput, currentHasM11: boolean): G03TestCoverage[] {
  const ids = members.map((member) => member.participantId)
  const coverage = input.m11Coverage
  const hasActualCoverage = Boolean(currentHasM11 && coverage)
  const coverageCanClose = Boolean(coverage
    && coverage.testedParticipantId !== input.participantId
    && coverage.acceptedTestFromParticipantId !== input.participantId
    && ids.includes(coverage.testedParticipantId)
    && ids.includes(coverage.acceptedTestFromParticipantId))
  const targetByTester = new Map<string, string>()

  if (coverage && coverageCanClose && coverage.testedParticipantId !== coverage.acceptedTestFromParticipantId) {
    // 以“接受测试者 → 当前教师 → 被当前教师测试者”为固定相邻关系，
    // 把剩余成员插入同一环，确保每条测试记录在双方行中各出现一次。
    const middle = ids.filter((id) => ![input.participantId, coverage.testedParticipantId, coverage.acceptedTestFromParticipantId].includes(id))
    const cycle = [input.participantId, coverage.testedParticipantId, ...middle, coverage.acceptedTestFromParticipantId]
    cycle.forEach((testerId, index) => targetByTester.set(testerId, cycle[(index + 1) % cycle.length]))
  } else if (coverage && coverageCanClose) {
    // 同一位组员与当前教师互测时形成二元环，其余成员另成一环。
    const peerId = coverage.testedParticipantId
    targetByTester.set(input.participantId, peerId)
    targetByTester.set(peerId, input.participantId)
    const remaining = ids.filter((id) => id !== input.participantId && id !== peerId)
    remaining.forEach((testerId, index) => targetByTester.set(testerId, remaining[(index + 1) % remaining.length] ?? testerId))
  } else {
    ids.forEach((testerId, index) => targetByTester.set(testerId, ids[(index + 1) % ids.length] ?? testerId))
  }

  const sourceForTarget = (targetId: string) => ids.find((testerId) => targetByTester.get(testerId) === targetId) ?? ''
  const recordForEdge = (testerId: string, targetId: string) => {
    if (coverage && testerId === input.participantId && targetId === coverage.testedParticipantId) return coverage.testedRecordId
    if (coverage && testerId === coverage.acceptedTestFromParticipantId && targetId === input.participantId) return coverage.acceptedRecordId
    return `${testerId}:sim:M11:test:${targetId || 'none'}`
  }

  const rows = members.map((member): G03TestCoverage => {
    const testedParticipantId = targetByTester.get(member.participantId) ?? ''
    const acceptedTestFromParticipantId = sourceForTarget(member.participantId)
    const isCurrent = member.participantId === input.participantId
    const source: G03EvidenceSource = isCurrent
      ? hasActualCoverage ? '真实本地证据' : '缺少当前真实证据'
      : '确定性模拟组员证据'
    const row: G03TestCoverage = {
      participantId: member.participantId,
      participantName: member.name,
      testedParticipantId,
      testedParticipantName: memberName(members, testedParticipantId),
      testedRecordId: recordForEdge(member.participantId, testedParticipantId),
      acceptedTestFromParticipantId,
      acceptedTestFromParticipantName: memberName(members, acceptedTestFromParticipantId),
      acceptedRecordId: recordForEdge(acceptedTestFromParticipantId, member.participantId),
      submitted: isCurrent ? coverage?.submitted ?? false : members.length > 1,
      source,
    }
    if (isCurrent && !coverageCanClose) return {
      ...row,
      testedParticipantId: coverage?.testedParticipantId ?? '',
      testedParticipantName: memberName(members, coverage?.testedParticipantId ?? ''),
      testedRecordId: coverage?.testedRecordId ?? '',
      acceptedTestFromParticipantId: coverage?.acceptedTestFromParticipantId ?? '',
      acceptedTestFromParticipantName: memberName(members, coverage?.acceptedTestFromParticipantId ?? ''),
      acceptedRecordId: coverage?.acceptedRecordId ?? '',
    }
    return row
  })
  return rows
}

function issueFromEvidence(evidence: G03MemberTaskEvidence): G03IssueRecord | undefined {
  if (!evidence.issueId || !evidence.issue || !evidence.correction || !evidence.correctionEvidenceId || !evidence.retestResult || !evidence.retestEvidenceId) return undefined
  return {
    issueId: evidence.issueId,
    sourceTask: evidence.taskId,
    sourceEvidenceId: evidence.artifactId,
    problem: evidence.issue,
    correction: evidence.correction,
    correctionEvidenceId: evidence.correctionEvidenceId,
    responsibleParticipantId: evidence.participantId,
    retestResult: evidence.retestResult,
    retestEvidenceId: evidence.retestEvidenceId,
    source: evidence.source,
  }
}

function buildIssues(memberEvidence: G03MemberEvidence[]): G03IssueRecord[] {
  const actual = memberEvidence.find((item) => item.isCurrentParticipant)?.taskEvidence.map(issueFromEvidence).filter((item): item is G03IssueRecord => Boolean(item)) ?? []
  const simulated = memberEvidence.filter((item) => !item.isCurrentParticipant).flatMap((item) => item.taskEvidence.map(issueFromEvidence).filter((issue): issue is G03IssueRecord => Boolean(issue)))
  return [...actual, ...simulated.slice(0, actual.length ? 1 : 2)]
}

function buildScenarios(input: G03CurrentEvidenceInput): G03ScenarioCard[] {
  const scenarios = input.scenarios ?? []
  return (['有来源回答', '缺失条件追问', '超范围说明与转交'] as const).map((kind) => {
    const item = scenarios.find((scenario) => scenario.kind === kind)
    const sourceTask = item ? input.tasks[item.sourceTaskId] : undefined
    const sourceIsCurrent = Boolean(sourceTask?.current && sourceTask.artifactId && sourceTask.assessmentId)
    return item ? { ...item, source: sourceIsCurrent ? '真实本地证据' : '缺少当前真实证据', confirmed: false } : {
      scenarioId: `missing-${kind}`,
      kind,
      sourceTaskId: kind === '有来源回答' ? 'M10' : 'M11',
      question: '',
      answer: '',
      evidenceId: '',
      noFalseCitation: false,
      source: '缺少当前真实证据',
      confirmed: false,
    }
  })
}

function batchAssignments(directory: ParticipantDirectory, groupId: string, groupName: string): G03BatchAssignment[] {
  const unique = [...new Map(directory.participants.map((item) => [item.groupId, item.groupName])).entries()]
    .map(([id, name]) => ({ groupId: id, groupName: name }))
    .sort((a, b) => a.groupId.localeCompare(b.groupId, 'zh-CN'))
  if (!unique.some((item) => item.groupId === groupId)) unique.push({ groupId, groupName })
  return unique.map((item, index) => ({ ...item, batch: index % 2 === 0 ? 'A' : 'B' }))
}

function buildShowcase(directory: ParticipantDirectory, groupId: string, groupName: string): G03ShowcasePlan {
  const assignments = batchAssignments(directory, groupId, groupName)
  const currentBatch = assignments.find((item) => item.groupId === groupId)?.batch ?? 'A'
  const aCount = assignments.filter((item) => item.batch === 'A').length
  const bCount = assignments.length - aCount
  const oddGroupNotice = assignments.length % 2
    ? `${aCount < bCount ? 'A' : 'B'} 批体验组依次体验两个展示组，以覆盖奇数组并行安排。`
    : '当前小组数为偶数，A/B 两批数量相同。'
  const round = (roundNumber: 1 | 2, displayBatch: 'A' | 'B', experienceBatch: 'A' | 'B') => ({
    round: roundNumber,
    displayBatch,
    experienceBatch,
    currentGroupRole: currentBatch === displayBatch ? '展示' as const : '体验' as const,
    completed: false,
    coreDemoSeconds: currentBatch === displayBatch ? 175 : 0,
    qaSeconds: currentBatch === displayBatch ? 120 : 0,
    qaCompleted: false,
    experienceFeedback: currentBatch === displayBatch ? '体验组建议在越界演示时先显示知识范围，再显示教师接管入口。' : '已体验另一批的来源回答、条件追问和越界转交三张演示卡。',
    feedbackSource: '确定性模拟跨组反馈' as const,
  })
  return {
    preparationMinutes: 5,
    roundMinutes: 10,
    summaryMinutes: 5,
    currentBatch,
    batchAssignments: assignments,
    oddGroupNotice,
    planConfirmed: false,
    rounds: [round(1, 'A', 'B'), round(2, 'B', 'A')],
  }
}

function buildContributions(members: TrainingParticipant[], input: G03CurrentEvidenceInput, evidence: G03MemberEvidence[]): G03Contribution[] {
  const presentationKinds = ['操作', '讲解', '在线答问'] as const
  return members.map((member, index) => {
    const isCurrent = member.participantId === input.participantId
    const m11 = evidence.find((item) => item.participantId === member.participantId)?.taskEvidence.find((item) => item.taskId === 'M11')
    return {
      participantId: member.participantId,
      participantName: member.name,
      role: groupRoles[index % groupRoles.length],
      participation: ['测试他人', '接受测试', presentationKinds[index % presentationKinds.length]],
      contribution: `${presentationKinds[index % presentationKinds.length]}三场景证据，并核对一条问题修改与复测结果。`,
      evidenceId: m11?.artifactId ?? '',
      source: isCurrent ? '当前教师操作预填' : '确定性模拟组员预填',
      confirmed: false,
    }
  })
}

export function buildG03GroupContext(directory: ParticipantDirectory, input: G03CurrentEvidenceInput): G03GroupContext {
  const { current, members } = currentGroup(directory)
  const groupId = current?.groupId ?? 'unassigned'
  const groupName = current?.groupName ?? '未分组'
  const normalizedInput = { ...input, participantId: directory.currentParticipantId }
  const memberEvidence = buildMemberEvidence(members, normalizedInput)
  const currentM11 = memberEvidence.find((item) => item.isCurrentParticipant)?.taskEvidence.find((item) => item.taskId === 'M11')
  const currentHasM11 = Boolean(currentM11?.current && currentM11.artifactId && currentM11.assessmentId)
  const testMatrix = buildTestMatrix(members, normalizedInput, currentHasM11)
  const issues = buildIssues(memberEvidence)
  const scenarios = buildScenarios(normalizedInput)
  const showcase = buildShowcase(directory, groupId, groupName)
  const contributions = buildContributions(members, normalizedInput, memberEvidence)
  const rosterFingerprint = `g03-roster-${g03Hash(members.map((item) => [item.participantId, item.name, item.groupId]))}`
  const evidenceFingerprint = `g03-evidence-${g03Hash({ memberEvidence, testMatrix, issues, scenarios: scenarios.map(({ confirmed: _confirmed, ...item }) => item) })}`
  const scheduleFingerprint = `g03-schedule-${g03Hash(showcase.batchAssignments)}`
  return { groupId, groupName, currentParticipantId: directory.currentParticipantId, rosterFingerprint, evidenceFingerprint, scheduleFingerprint, memberEvidence, testMatrix, issues, scenarios, showcase, contributions }
}
