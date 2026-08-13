import { reviewableParticipants } from '../training/participants'
import type { ParticipantDirectory } from '../training/types'

export interface M08PeerArtifact {
  artifactId: string
  participantId: string
  participantName: string
  pageTitle: string
  studentTask: string
  simulated: true
}

export function buildM08PeerArtifacts(directory: ParticipantDirectory): M08PeerArtifact[] {
  return reviewableParticipants(directory).map((participant) => ({
    artifactId: `M08:peer:${participant.participantId}:student-test-v1`,
    participantId: participant.participantId,
    participantName: participant.name,
    pageTitle: `${participant.specialty || '专业课程'}互动学习页`,
    studentTask: '按学生视角展开知识卡，完成 5 道题并检查即时反馈。',
    simulated: true,
  }))
}
