import type { ParticipantDirectory } from '../training/types'
import { reviewableParticipants } from '../training/participants'
import type { M04PeerArtifact } from './types'

const durations = [45, 60, 90]

export function buildM04PeerArtifacts(directory: ParticipantDirectory): M04PeerArtifact[] {
  return reviewableParticipants(directory).map((participant, index) => ({
    artifactId: `M04:peer:${participant.participantId}:integrated-plan-v2`,
    participantId: participant.participantId,
    participantName: participant.name,
    courseName: participant.specialty ? `${participant.specialty}课程` : '高职专业课程',
    lessonName: '任务导向课堂设计',
    duration: durations[index % durations.length],
    objectiveSummary: '3 个可观察目标：识别要求、完成任务、依据反馈修正。',
    activitySummary: '情境导入—教师示范—分组实操—同伴检查。',
    assessmentSummary: '目标分别对应观察表、作品检查和修改记录。',
    supportSummary: '基础组使用步骤卡，进阶组完成约束变化挑战。',
  }))
}
