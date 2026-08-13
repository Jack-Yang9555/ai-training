import { reviewableParticipants } from '../training/participants'
import type { ParticipantDirectory } from '../training/types'

export interface M06PeerArtifact {
  artifactId: string
  participantId: string
  participantName: string
  lessonName: string
  deckSummary: string
  avatarPreset: string
  videoSummary: string
}

export function buildM06PeerArtifacts(directory: ParticipantDirectory): M06PeerArtifact[] {
  return reviewableParticipants(directory).map((participant) => ({
    artifactId: `M06:peer:${participant.participantId}:microcourse-v1`,
    participantId: participant.participantId,
    participantName: participant.name,
    lessonName: `${participant.specialty || '专业课程'}微课导入`,
    deckSummary: '7 页课件，包含情境、目标、核心概念、判断路径和练习。',
    avatarPreset: '平台预设教学讲解员与预设音色',
    videoSummary: '54 秒本地模拟预览，字幕完整并与讲解同步。',
  }))
}
