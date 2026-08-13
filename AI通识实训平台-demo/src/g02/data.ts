import { groupRoles } from '../data/trainingParticipants'
import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import type { G02Contribution, G02CrossGroupFeedback, G02CurrentEvidence, G02EvidenceItem, G02GroupContext, G02MemberEvidence } from './types'

export const g02OutputNames = ['小组多模态教学成果展示页', '同伴反馈与修改记录', '成员贡献清单'] as const

function hashText(value: string): string { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619) } return (hash >>> 0).toString(36) }
function currentGroup(directory: ParticipantDirectory): TrainingParticipant[] { const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId); return current ? directory.participants.filter((item) => item.groupId === current.groupId) : [] }
export function g02RosterFingerprint(directory: ParticipantDirectory) { return `roster-${hashText(currentGroup(directory).map((item) => `${item.participantId}:${item.name}:${item.groupId}`).sort().join('|'))}` }

function evidenceFor(member: TrainingParticipant, isCurrent: boolean, current: G02CurrentEvidence): G02EvidenceItem[] {
  const elective = current.firstElectiveId ?? 'E01'
  const item = (type: G02EvidenceItem['type'], name: string, actualId: string | undefined, suffix: string, extras: Pick<G02EvidenceItem, 'playable' | 'interactive'> = {}): G02EvidenceItem => {
    if (isCurrent && actualId) return { artifactId: actualId, type, name, source: '真实本地成果', ...extras }
    if (isCurrent) return { artifactId: `${member.participantId}:demo:G02:${suffix}`, type, name, source: '任务内演示成果', ...extras }
    return { artifactId: `${member.participantId}:sim:G02:${suffix}`, type, name, source: '模拟组员摘要', ...extras }
  }
  return [
    item('M06 课件', `${member.name} · AI 辅助课件`, current.m06DeckArtifactId, 'M06-deck'),
    item('M06 可播放视频', `${member.name} · 数字人微课视频`, current.m06VideoArtifactId, 'M06-video', { playable: true }),
    item('M08 互动网页', `${member.name} · 交互式教学网页`, current.m08WebArtifactId, 'M08-web', { interactive: true }),
    item('首个选修成果', `${member.name} · ${elective} 首个选修成果`, current.firstElectiveArtifactId, `${elective}-elective`),
  ]
}

function feedbackSeeds(directory: ParticipantDirectory, groupId: string): G02CrossGroupFeedback[] {
  const others = [...new Map(directory.participants.filter((item) => item.groupId !== groupId).map((item) => [item.groupId, item.groupName])).entries()]
  const first = others[0] ?? ['demo-other-a', '任务内演示反馈组 A']
  const second = others[1] ?? others[0] ?? ['demo-other-b', '任务内演示反馈组 B']
  return [
    { feedbackId: 'g02-feedback-1', sourceGroupId: first[0], sourceGroupName: first[1], feedback: '建议在展示页首屏增加四类成果的学习路径，避免演示时只看到文件名称。', source: '跨组反馈模拟', received: true },
    { feedbackId: 'g02-feedback-2', sourceGroupId: second[0], sourceGroupName: second[1], feedback: '建议在线演示时明确由哪位成员操作哪一个互动，并记录成功反馈。', source: '跨组反馈模拟', received: true },
  ]
}

export function buildG02GroupContext(directory: ParticipantDirectory, currentEvidence: G02CurrentEvidence): G02GroupContext {
  const members = currentGroup(directory), current = members.find((item) => item.participantId === currentEvidence.participantId)
  const groupId = current?.groupId ?? 'unassigned', groupName = current?.groupName ?? '未分组'
  const memberEvidence: G02MemberEvidence[] = members.map((member) => ({ participantId: member.participantId, participantName: member.name, groupId: member.groupId, groupName: member.groupName, isCurrentParticipant: member.participantId === currentEvidence.participantId, evidence: evidenceFor(member, member.participantId === currentEvidence.participantId, currentEvidence) }))
  const seedContributions: G02Contribution[] = memberEvidence.map((member, index) => ({ participantId: member.participantId, participantName: member.participantName, role: groupRoles[index % groupRoles.length], kind: index % 3 === 0 ? '实质修改' : '作品贡献', contribution: index % 3 === 0 ? '根据展示或反馈完成一处实质内容修改，并核对修改前后。' : '提供至少 1 项作品并参与展示页内容核验。', artifactId: member.evidence[index % member.evidence.length].artifactId, source: member.evidence[index % member.evidence.length].source }))
  const evidenceFingerprint = `evidence-${hashText(JSON.stringify(memberEvidence.map((member) => member.evidence.map((item) => [item.artifactId, item.source]))))}`
  return { groupId, groupName, rosterFingerprint: g02RosterFingerprint(directory), evidenceFingerprint, memberEvidence, seedFeedback: feedbackSeeds(directory, groupId), seedContributions, directory }
}
