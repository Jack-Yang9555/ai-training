import { groupRoles } from '../data/trainingParticipants'
import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import type {
  G01ChecklistItem,
  G01CurrentMemberEvidence,
  G01ErrorCorrection,
  G01GroupContext,
  G01MemberPrerequisite,
  G01PrerequisiteTaskId,
  G01CrossCheck,
  G01Contribution,
} from './types'

export const g01PrerequisiteTaskIds: G01PrerequisiteTaskId[] = ['M01', 'M02', 'M03', 'M04', 'M05']

export const g01PrerequisiteLabels: Record<G01PrerequisiteTaskId, string> = {
  M01: 'AI 生成内容核验记录',
  M02: '多模型评分',
  M03: '提示词双版本',
  M04: '教师确认版教案',
  M05: '课堂题目包',
}

export const g01OutputNames = ['教学设计与命题成果目录', 'AI 教学内容核验清单', '个人贡献记录'] as const

export const g01ChecklistSeed: G01ChecklistItem[] = [
  { id: 'g01-check-1', category: '事实', checkItem: '专业概念、数值与操作顺序是否和课程材料一致', evidence: '逐项对照 M01 核验记录及 M04 教案、M05 题目依据', handling: '发现差异时回到原材料核对并由教师修正' },
  { id: 'g01-check-2', category: '引用', checkItem: '引用、规范和数据来源是否真实可追溯', evidence: '检查来源名称、章节和允许使用范围', handling: '删除无法定位的引用，补充可核查来源' },
  { id: 'g01-check-3', category: '安全', checkItem: '实训步骤是否包含必要的安全前置条件', evidence: '对照安全规程检查断电、防护和风险提示', handling: '把安全条件写入步骤，不以 AI 建议替代教师判断' },
  { id: 'g01-check-4', category: '目标', checkItem: '教案目标、活动、评价与题目是否相互对齐', evidence: '沿 M04 目标编号核对 M05 题目 objectiveIds', handling: '移除无目标支撑内容，调整活动或题目映射' },
  { id: 'g01-check-5', category: '答案', checkItem: '题目答案、解析、材料依据与评分要点是否一致', evidence: '逐题复算答案并检查综合任务评分点', handling: '教师确认答案和评分要点后再归档' },
  { id: 'g01-check-6', category: '事实', checkItem: '是否存在绝对化结论、过度推断或边界缺失', evidence: '复看 M01 判断与教师修正理由', handling: '补充适用条件、例外和不确定性说明' },
  { id: 'g01-check-7', category: '引用', checkItem: '生成内容是否超出已授权课程材料范围', evidence: '对照 M04 输入中的材料范围和权限确认', handling: '超范围内容删除或改为待教师核验' },
  { id: 'g01-check-8', category: '安全', checkItem: '是否包含隐私、版权、公平或不当替代教师决策风险', evidence: '检查匿名化、版权权限与教师最终确认记录', handling: '去除敏感信息并保留教师审校责任说明' },
]

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function currentGroup(directory: ParticipantDirectory): TrainingParticipant[] {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!current) return []
  return directory.participants.filter((item) => item.groupId === current.groupId)
}

export function g01RosterFingerprint(directory: ParticipantDirectory): string {
  const members = currentGroup(directory)
  const identity = members.map((item) => `${item.participantId}:${item.name}:${item.groupId}`).sort().join('|')
  return `roster-${hashText(identity)}`
}

function simulatedArtifacts(taskId: G01PrerequisiteTaskId, participantId: string): string[] {
  if (taskId === 'M03') return [`${participantId}:sim:M03:v1`, `${participantId}:sim:M03:v2`]
  return [`${participantId}:sim:${taskId}`]
}

function standaloneArtifacts(taskId: G01PrerequisiteTaskId, participantId: string): string[] {
  if (taskId === 'M03') return [`${participantId}:demo:G01:M03:v1`, `${participantId}:demo:G01:M03:v2`]
  return [`${participantId}:demo:G01:${taskId}`]
}

function currentEvidenceIsComplete(taskId: G01PrerequisiteTaskId, evidence: { complete: boolean; artifactIds: string[] }): boolean {
  return evidence.complete && evidence.artifactIds.length >= (taskId === 'M03' ? 2 : 1)
}

function simulatedError(member: TrainingParticipant): G01ErrorCorrection {
  const suffix = Number.parseInt(member.participantId.replace(/\D/g, ''), 10) || 0
  const variants = [
    ['设备接线可在通电状态下检查。', '检查接线前必须切断电源并完成验电。', '课程安全规程要求断电、验电后才能接触线路。'],
    ['所有学生都能在一次练习后独立完成任务。', '学生达成情况需依据观察记录判断，并提供分层支持。', '原结论属于无证据的绝对化推断。'],
    ['未给出材料出处的行业数据可直接写入教案。', '无法追溯来源的数据不得作为教学事实使用。', '引用必须能定位到已授权课程材料。'],
  ][suffix % 3]
  return { participantId: member.participantId, participantName: member.name, source: '模拟组员摘要', sourceTaskId: 'M01', sourceArtifactId: `${member.participantId}:sim:M01:error`, aiError: variants[0], teacherCorrection: variants[1], correctionBasis: variants[2] }
}

function simulatedCrossCheck(member: TrainingParticipant, target: TrainingParticipant, _index: number): G01CrossCheck {
  const artifactType = '题目包' as const
  return {
    reviewerParticipantId: member.participantId,
    reviewerName: member.name,
    targetParticipantId: target?.participantId ?? '',
    targetParticipantName: target?.name ?? '',
    source: '模拟组员摘要',
    artifactType,
    targetArtifactId: target ? `${target.participantId}:sim:M05` : '',
    finding: '已核对题目答案、解析、材料依据、目标难度和评分要点，建议保留教师确认边界。',
    conclusion: target ? '通过' : '',
  }
}

function simulatedContribution(member: TrainingParticipant, index: number): G01Contribution {
  const role = groupRoles[index % groupRoles.length]
  return { participantId: member.participantId, participantName: member.name, source: '模拟组员摘要', role, contribution: `以${role}身份展示 1 处 AI 错误与教师修正，并交叉检查同组成果、汇总核验发现。` }
}

export function buildG01GroupContext(directory: ParticipantDirectory, currentEvidence: G01CurrentMemberEvidence): G01GroupContext {
  const members = currentGroup(directory)
  const current = members.find((item) => item.participantId === currentEvidence.participantId)
  const groupId = current?.groupId ?? 'unassigned'
  const groupName = current?.groupName ?? '未分组'
  const memberPrerequisites: G01MemberPrerequisite[] = members.map((member) => {
    const isCurrentParticipant = member.participantId === currentEvidence.participantId
    const hasCompleteActualEvidence = g01PrerequisiteTaskIds.every((taskId) => currentEvidenceIsComplete(taskId, currentEvidence.prerequisites[taskId]))
    const source = isCurrentParticipant ? (hasCompleteActualEvidence ? '真实本地成果' as const : '任务内演示成果' as const) : '模拟组员摘要' as const
    return {
      participantId: member.participantId,
      participantName: member.name,
      groupId: member.groupId,
      groupName: member.groupName,
      isCurrentParticipant,
      source,
      evidence: g01PrerequisiteTaskIds.map((taskId) => {
        const actual = currentEvidence.prerequisites[taskId]
        if (isCurrentParticipant && currentEvidenceIsComplete(taskId, actual)) return { taskId, label: g01PrerequisiteLabels[taskId], complete: true, artifactIds: actual.artifactIds, source: '真实本地成果' as const }
        if (isCurrentParticipant) return { taskId, label: g01PrerequisiteLabels[taskId], complete: true, artifactIds: standaloneArtifacts(taskId, member.participantId), source: '任务内演示成果' as const }
        const artifactIds = simulatedArtifacts(taskId, member.participantId)
        return { taskId, label: g01PrerequisiteLabels[taskId], complete: artifactIds.length >= (taskId === 'M03' ? 2 : 1), artifactIds, source: '模拟组员摘要' as const }
      }),
    }
  })

  const seedErrorCorrections = members.map((member) => {
    if (member.participantId !== currentEvidence.participantId) return simulatedError(member)
    const record = currentEvidence.errorCorrection
    if (record) return { participantId: member.participantId, participantName: member.name, source: '真实本地成果' as const, ...record }
    return { participantId: member.participantId, participantName: member.name, source: '任务内演示成果' as const, sourceTaskId: 'M01' as const, sourceArtifactId: `${member.participantId}:demo:G01:M01:error`, aiError: '设备接线可在通电状态下检查。', teacherCorrection: '检查接线前必须切断电源并完成验电。', correctionBasis: '课程安全规程要求断电、验电后才能接触线路。' }
  })

  const seedCrossChecks = members.map((member, index) => {
    if (member.participantId !== currentEvidence.participantId) {
      const target = members.find((candidate) => candidate.participantId !== member.participantId)!
      return simulatedCrossCheck(member, target, index)
    }
    const record = currentEvidence.crossCheck
    if (record) return { reviewerParticipantId: member.participantId, reviewerName: member.name, source: '真实本地成果' as const, ...record }
    const target = members.find((candidate) => candidate.participantId !== member.participantId)
    return { reviewerParticipantId: member.participantId, reviewerName: member.name, source: '任务内演示成果' as const, targetParticipantId: target?.participantId ?? '', targetParticipantName: target?.name ?? '', artifactType: '题目包' as const, targetArtifactId: target ? `${target.participantId}:sim:M05` : '', finding: target ? '已核对题目答案、依据、目标和难度，建议保留教师最终确认边界。' : '', conclusion: target ? '通过' as const : '' as const }
  })

  const seedContributions = members.map((member, index) => {
    if (member.participantId !== currentEvidence.participantId) return simulatedContribution(member, index)
    const record = currentEvidence.contribution
    return record ? { participantId: member.participantId, participantName: member.name, source: '真实本地成果' as const, ...record } : { participantId: member.participantId, participantName: member.name, source: '任务内演示成果' as const, role: groupRoles[index % groupRoles.length], contribution: '在 G01 内核对五类验收材料，记录 1 处 AI 错误与教师修正，并完成同组成果交叉检查。' }
  })

  return { groupId, groupName, rosterFingerprint: g01RosterFingerprint(directory), memberPrerequisites, seedErrorCorrections, seedCrossChecks, seedContributions }
}
