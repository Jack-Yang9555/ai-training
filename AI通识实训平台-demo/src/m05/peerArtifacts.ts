import { reviewableParticipants } from '../training/participants'
import type { ParticipantDirectory } from '../training/types'
import type { M05PeerArtifact } from './types'

export function buildM05PeerArtifacts(directory: ParticipantDirectory): M05PeerArtifact[] {
  return reviewableParticipants(directory).map((participant) => ({
    artifactId: `M05:peer:${participant.participantId}:question-package-v1`, participantId: participant.participantId, participantName: participant.name,
    courseName: participant.specialty ? `${participant.specialty}课程` : '高职专业课程', questions: [
      { id: 'peer-q1', label: '单选题 1', stem: '根据课程材料选择最符合当前目标的关键概念。', answer: 'A', evidence: '对应组员课程材料第 1 条定义。' },
      { id: 'peer-q6', label: '情境题 1', stem: '学生提交的任务结果偏离目标，请指出问题并给出修正。', answer: '指出缺失要素并给出有依据的修正。', evidence: '对应组员课程目标 2、3 和材料操作要求。' },
      { id: 'peer-q8', label: '综合任务题', stem: '完成一项真实课堂任务，并依据评分要点说明成果质量。', answer: '按任务目标和四项评分要点作答。', evidence: '对应组员教师确认版教案的目标、活动与评价。' },
    ],
  }))
}
