import { reviewableParticipants } from '../training/participants'
import type { ParticipantDirectory } from '../training/types'
import { calculateM07Metrics } from './runner'

export interface M07PeerArtifact {
  artifactId: string
  participantId: string
  participantName: string
  reportTitle: string
  metrics: Array<{ id: string; label: string; value: number; unit: string }>
}

export function buildM07PeerArtifacts(directory: ParticipantDirectory): M07PeerArtifact[] {
  const metrics = calculateM07Metrics().map(({ id, label, value, unit }) => ({ id, label, value, unit }))
  return reviewableParticipants(directory).map((participant) => ({ artifactId: `M07:peer:${participant.participantId}:analysis-v1`, participantId: participant.participantId, participantName: participant.name, reportTitle: `${participant.specialty || '专业课程'}匿名学情分析`, metrics }))
}
