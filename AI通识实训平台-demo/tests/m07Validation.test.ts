import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialM07Progress, m07Fields } from '../src/m07/data'
import type { M07Progress } from '../src/m07/domain'
import { buildM07PeerArtifacts } from '../src/m07/peerArtifacts'
import { LocalM07AnalysisRunner, calculateM07Metrics } from '../src/m07/runner'
import { calculateM07Score, createM07Assessment } from '../src/m07/scoring'
import { clearAllM07Progress, clearParticipantM07Progress, createConfirmedM07Deliverable, loadM07Store, M07_STORAGE_KEY, m07ProgressForParticipant, saveM07Store, updateParticipantM07Progress } from '../src/m07/storage'
import { latestM07AssessmentIsCurrent, validateM07Conclusions, validateM07DataCheck, validateM07ManualChecks, validateM07PeerReview } from '../src/m07/validation'
import { createInitialPortalProgress } from '../src/training/storage'

async function completeM07(): Promise<{ progress: M07Progress; directory: ReturnType<typeof createInitialPortalProgress>['participantDirectory'] }> {
  const progress = createInitialM07Progress(), directory = createInitialPortalProgress().participantDirectory
  progress.input = { ...progress.input, sourceConfirmed: true, anonymousConfirmed: true, virtualDataConfirmed: true, noRankingConfirmed: true }
  progress.dataCheck = { checkedFields: [...m07Fields], missingRecordIds: ['A20'], missingHandling: '测验二平均分排除缺失值，并明确有效样本量 n=19；不补写推测分数。', anomalyRecordIds: ['A17'], anomalyHandling: '保留原始分数并标注两次测验分差较大，正式教学中需复核原始记录。', teacherConfirmed: true }
  const result = await new LocalM07AnalysisRunner().run(progress.input); progress.draft = result.draft; progress.layerTasks = result.layerTasks
  progress.manualChecks = progress.draft.metrics.slice(0, 3).map((metric) => ({ metricId: metric.id, aiValue: metric.value, teacherCalculatedValue: metric.value, status: '一致', note: `按“${metric.calculation}”人工复算，与确定性结果一致。` }))
  progress.conclusionReviews = [
    { conclusionId: 'weak-kp3', judgment: '结论有据', finalText: '知识点 3 为本轮共同补强重点，其正确率在四个知识点中最低。', removed: false, basis: '对比四个知识点正确率后，知识点 3 最低。' },
    { conclusionId: 'attitude-claim', judgment: '结论无据', finalText: '', removed: true, basis: '作业完成情况不能证明学习态度，删除该判断。' },
    { conclusionId: 'extension-claim', judgment: '结论需限定', finalText: '本轮测验有效均分不低于 85 的学生，可在下一课次尝试拓展任务；分组随新证据调整。', removed: false, basis: '高分段只能支持本轮临时任务安排，不能推断长期能力。' },
  ]
  const artifact = buildM07PeerArtifacts(directory)[0], metric = progress.draft.metrics[0]
  progress.peerReview = { reviewerId: artifact.participantId, reviewerRole: '核验员', artifactId: artifact.artifactId, metricId: metric.id, peerCalculatedValue: metric.value, status: '一致', comment: '按 20 人测验一总分除以 20 复算，结果一致。', submitted: true }
  progress.teacherConfirmation = { peerDisposition: '已采纳', peerResponse: '已核对同伴复算过程和确定性公式，结果一致。', allNumbersConfirmed: true, conclusionsDataSupported: true, temporaryGroupingConfirmed: true, noFixedLabelsConfirmed: true, noRankingConfirmed: true, finalResponsibilityConfirmed: true }
  progress.confirmedDeliverable = createConfirmedM07Deliverable(progress, directory)
  return { progress, directory }
}

describe('M07 成绩分析、分层、评分和存储', () => {
  beforeEach(() => window.localStorage.removeItem(M07_STORAGE_KEY))
  it('确定性统计覆盖两次测验、分数段、四个知识点、实操和作业完成', () => { const metrics = calculateM07Metrics(); expect(metrics).toHaveLength(11); expect(metrics.find((item) => item.id === 'quiz2-average')?.sampleSize).toBe(19); expect(metrics.filter((item) => item.id.includes('kp')).length).toBe(4) })
  it('必须识别 A20 缺失和 A17 异常', async () => { const { progress } = await completeM07(); expect(validateM07DataCheck(progress).valid).toBe(true); progress.dataCheck.missingRecordIds = []; expect(validateM07DataCheck(progress).valid).toBe(false) })
  it('教师至少复核三个不同关键数字，最终值必须与确定性结果一致', async () => { const { progress } = await completeM07(); expect(validateM07ManualChecks(progress).valid).toBe(true); progress.manualChecks[2].teacherCalculatedValue! += 1; expect(validateM07ManualChecks(progress).valid).toBe(false) })
  it('无据态度判断必须删除，需限定结论必须收窄', async () => { const { progress } = await completeM07(); expect(validateM07Conclusions(progress).valid).toBe(true); progress.conclusionReviews.find((item) => item.conclusionId === 'attitude-claim')!.removed = false; expect(validateM07Conclusions(progress).valid).toBe(false) })
  it('同组其他成员复算一项数字后完整闭环得 10 分', async () => { const { progress, directory } = await completeM07(); expect(validateM07PeerReview(progress, directory).valid).toBe(true); expect(calculateM07Score(progress, directory).total).toBe(10); expect(calculateM07Score(progress, directory).passed).toBe(true) })
  it('内容变化保留旧验收但当前通过失效', async () => { const { progress, directory } = await completeM07(); progress.assessmentHistory.push(createM07Assessment(progress, directory)); expect(latestM07AssessmentIsCurrent(progress, directory)).toBe(true); progress.layerTasks[0].taskInstruction += '并口头说明。'; expect(progress.assessmentHistory).toHaveLength(1); expect(latestM07AssessmentIsCurrent(progress, directory)).toBe(false) })
  it('按 participantId 隔离并支持任务内和全局重置', () => { let store = loadM07Store(); store = updateParticipantM07Progress(store,'T001',(current) => ({ ...current, route:'statistics' })); store = updateParticipantM07Progress(store,'T002',(current) => ({ ...current, route:'analysis' })); saveM07Store(store); expect(m07ProgressForParticipant(loadM07Store(),'T001').route).toBe('statistics'); store = clearParticipantM07Progress(store,'T001'); expect(m07ProgressForParticipant(store,'T001').route).toBe('overview'); expect(m07ProgressForParticipant(store,'T002').route).toBe('analysis'); expect(clearAllM07Progress().participants).toEqual({}) })
})
