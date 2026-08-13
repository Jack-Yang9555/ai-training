import { m02RatingLabels } from './data'
import type { M02ModelId, M02PeerArtifact, M02RatingDimension } from './types'
import type { ParticipantDirectory } from '../training/types'
import { reviewableParticipants } from '../training/participants'

const dimensions = Object.keys(m02RatingLabels) as M02RatingDimension[]

function hash(value: string): number {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7)
}

export function buildM02PeerArtifacts(directory: ParticipantDirectory): M02PeerArtifact[] {
  return reviewableParticipants(directory).map((participant) => {
    const seed = hash(participant.participantId)
    const selectedModelId: M02ModelId = seed % 4 === 0 ? 'B' : 'A'
    const scores = Object.fromEntries(dimensions.map((dimension, index) => [dimension, Math.max(2, 5 - ((seed + index) % 3))])) as Record<M02RatingDimension, number>
    return {
      artifactId: `M02:peer:${participant.participantId}:rating-v1`,
      participantId: participant.participantId,
      participantName: participant.name,
      selectedModelId,
      scores,
      summary: selectedModelId === 'A'
        ? '认为模型 A 的题型递进与材料范围控制最适合零基础课堂。'
        : '认为模型 B 的技术信息更丰富，但需要降低难度并收回课程材料范围后再用于课堂。',
    }
  })
}
