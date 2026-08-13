import type { M07DataCheck, M07Input, M07PeerReview, M07Progress, M07StudentRecord, M07TeacherConfirmation } from './domain'

export const m07Dataset: M07StudentRecord[] = [
  ['A01',92,90,1,1,1,1,94,1], ['A02',88,86,1,1,1,1,90,1], ['A03',85,84,1,1,0,1,88,1], ['A04',82,80,1,1,1,0,84,1],
  ['A05',79,78,1,1,0,1,82,1], ['A06',77,76,1,1,0,1,80,1], ['A07',75,74,1,0,1,1,78,1], ['A08',73,72,1,1,0,0,76,1],
  ['A09',71,70,1,0,0,1,74,1], ['A10',69,68,1,1,0,0,72,1], ['A11',67,66,1,0,0,1,70,1], ['A12',65,64,0,1,0,1,68,1],
  ['A13',63,62,1,0,0,0,66,1], ['A14',61,60,0,1,0,1,64,0], ['A15',59,58,1,0,0,0,62,1], ['A16',57,56,0,1,0,0,60,0],
  ['A17',98,42,1,0,0,1,70,1], ['A18',53,52,0,1,0,0,58,0], ['A19',51,50,0,0,0,1,56,1], ['A20',49,null,0,1,0,0,54,0],
].map(([studentId, quiz1, quiz2, kp1, kp2, kp3, kp4, practicalScore, homeworkCompleted]) => ({ studentId: String(studentId), quiz1: Number(quiz1), quiz2: quiz2 === null ? null : Number(quiz2), kp1: Boolean(kp1), kp2: Boolean(kp2), kp3: Boolean(kp3), kp4: Boolean(kp4), practicalScore: Number(practicalScore), homeworkCompleted: Boolean(homeworkCompleted) }))

export const m07Fields = ['studentId', 'quiz1', 'quiz2', 'kp1', 'kp2', 'kp3', 'kp4', 'practicalScore', 'homeworkCompleted']

export const m07DefaultInput: M07Input = {
  sourceKind: 'task-baseline',
  sourceAssessmentId: 'M07-STANDALONE-DEMO',
  sourcePackageId: 'M07-CONTEXT-V1',
  sourceSummary: '使用 M07 内置匿名虚拟成绩表和课程情境独立完成，不依赖 M06 或其他上游任务。',
  courseName: '智能制造基础',
  lessonName: '设备点检中的异常识别',
  audience: '高职一年级学生（匿名虚拟班级）',
  teachingObjectives: ['识别异常判断的证据维度', '根据证据边界选择复核行动'],
  teachingStage: '下一课次的分层练习',
  datasetId: 'M07-VIRTUAL-A01-A20-V1',
  sourceConfirmed: false,
  anonymousConfirmed: false,
  virtualDataConfirmed: false,
  noRankingConfirmed: false,
}

export const emptyM07DataCheck: M07DataCheck = { checkedFields: [], missingRecordIds: [], missingHandling: '', anomalyRecordIds: [], anomalyHandling: '', teacherConfirmed: false }
export const emptyM07PeerReview: M07PeerReview = { reviewerId: '', artifactId: '', metricId: '', peerCalculatedValue: null, status: '', comment: '', submitted: false }
export const emptyM07TeacherConfirmation: M07TeacherConfirmation = { peerDisposition: '', peerResponse: '', allNumbersConfirmed: false, conclusionsDataSupported: false, temporaryGroupingConfirmed: false, noFixedLabelsConfirmed: false, noRankingConfirmed: false, finalResponsibilityConfirmed: false }

export function createInitialM07Progress(): M07Progress {
  return { version: 1, route: 'overview', input: structuredClone(m07DefaultInput), dataCheck: structuredClone(emptyM07DataCheck), manualChecks: [], conclusionReviews: [], layerTasks: [], peerReview: structuredClone(emptyM07PeerReview), teacherConfirmation: structuredClone(emptyM07TeacherConfirmation), assessmentHistory: [], updatedAt: new Date().toISOString() }
}
