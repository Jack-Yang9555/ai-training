import type { ParticipantDirectory } from '../training/types'
import { reviewableParticipants } from '../training/participants'
import { m03VariableLabels } from './data'
import type { M03IterationVariable, M03PeerArtifact } from './types'

const variables: M03IterationVariable[] = ['studentFoundation', 'questionCount', 'difficulty', 'duration', 'outputFormat']

function hash(value: string): number {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 11)
}

export function buildM03PeerArtifacts(directory: ParticipantDirectory): M03PeerArtifact[] {
  return reviewableParticipants(directory).map((participant) => {
    const variable = variables[hash(participant.participantId) % variables.length]
    const values: Record<M03IterationVariable, [string, string]> = {
      studentFoundation: ['零基础', '已能识别提示词三要素'],
      questionCount: ['3 道', '4 道'],
      difficulty: ['入门', '进阶'],
      duration: ['45 分钟', '60 分钟'],
      outputFormat: ['分节文本', 'Markdown 表格'],
    }
    return {
      artifactId: `M03:peer:${participant.participantId}:versions-v1`,
      participantId: participant.participantId,
      participantName: participant.name,
      variable,
      variableLabel: m03VariableLabels[variable],
      beforeValue: values[variable][0],
      afterValue: values[variable][1],
      summary: `仅调整${m03VariableLabels[variable]}，保留两版提示词、课堂活动练习包和变化说明。`,
    }
  })
}
