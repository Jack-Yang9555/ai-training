import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialM05Audit, m05RequiredDistribution } from '../src/m05/data'
import { buildM05PeerArtifacts } from '../src/m05/peerArtifacts'
import { calculateM05Score, createM05Assessment } from '../src/m05/scoring'
import { clearAllM05Progress, clearParticipantM05Progress, createConfirmedM05Package, createInitialM05Progress, loadM05Store, M05_STORAGE_KEY, m05ProgressForParticipant, saveM05Store, updateParticipantM05Progress } from '../src/m05/storage'
import type { M05Progress } from '../src/m05/types'
import { latestM05AssessmentIsCurrent, m05Distribution, m05SourceIsCurrent, validateM05Draft, validateM05Input, validateM05PeerReview, validateM05Revisions } from '../src/m05/validation'
import { localM05QuestionRunner } from '../src/services/m05QuestionRunner'
import { createInitialPortalProgress } from '../src/training/storage'

async function completeM05(): Promise<{ progress: M05Progress; directory: ReturnType<typeof createInitialPortalProgress>['participantDirectory'] }> {
  const progress = createInitialM05Progress()
  const directory = createInitialPortalProgress().participantDirectory
  progress.input = { ...progress.input, sourceM04AssessmentId: 'm04-current', sourceM04PlanId: 'm04-plan-current', sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true }
  progress.draft = await localM05QuestionRunner.run({ participantId: 'T001', input: progress.input })
  progress.draft.questions.forEach((question) => { progress.audits[question.id] = { ...createInitialM05Audit(), stemClarity: '清楚', answerClarity: '明确', objectiveAligned: true, difficultySuitable: true, evidenceVerified: true, distractorsReasonable: true, rubricExecutable: true, safeAndFair: true } })
  progress.revisions = [progress.draft.questions[0], progress.draft.questions[5]].map((question) => ({ questionId: question.id, originalContent: question.stem, revisedContent: `${question.stem}（请依据课程材料作答）`, reason: '让题干与当前学生基础、学习目标和材料范围更清楚地对应。' }))
  const artifact = buildM05PeerArtifacts(directory)[0]
  progress.peerReview = { reviewerRole: '核验员', targetParticipantId: artifact.participantId, targetArtifactId: artifact.artifactId, targetQuestionId: artifact.questions[0].id, answerCorrectness: '一致', materialEvidence: '一致', objectiveAlignment: '一致', difficultySuitability: '一致', suggestion: '建议在解析中明确指出材料条目与目标的对应关系。', submitted: true }
  progress.confirmation = { peerDisposition: '采纳并已核对', peerResponse: '已逐题核对材料依据，并在确认题目包中保留修改说明。', answerConfirmed: true, rubricConfirmed: true, safetyConfirmed: true }
  progress.confirmedPackage = createConfirmedM05Package(progress, directory)
  return { progress, directory }
}

describe('M05 命题校验、评分与版本存储', () => {
  beforeEach(() => window.localStorage.removeItem(M05_STORAGE_KEY))

  it('确定性生成恰好 8 题并满足固定题型结构', async () => {
    const { progress } = await completeM05()
    expect(progress.draft?.questions).toHaveLength(8)
    expect(m05Distribution(progress.draft!.questions)).toEqual(m05RequiredDistribution)
    expect(validateM05Draft(progress).valid).toBe(true)
    const second = await localM05QuestionRunner.run({ participantId: 'T001', input: progress.input })
    expect(second.questions).toEqual(progress.draft?.questions)
  })

  it('每题有目标、难度、答案、解析和材料依据，综合题评分要点可执行', async () => {
    const { progress } = await completeM05()
    progress.draft!.questions.forEach((question) => expect(question).toEqual(expect.objectContaining({ objectiveIds: expect.any(Array), difficulty: expect.any(String), answer: expect.any(String), explanation: expect.any(String), materialEvidence: expect.any(String) })))
    expect(progress.draft?.questions.find((item) => item.type === 'comprehensive')?.scoringPoints).toHaveLength(4)
    progress.draft!.questions[0].materialEvidence = ''
    expect(validateM05Draft(progress).valid).toBe(false)
  })

  it('至少修改两道不同题目，且必须覆盖情境或综合题', async () => {
    const { progress } = await completeM05()
    expect(validateM05Revisions(progress).valid).toBe(true)
    progress.revisions[1] = { ...progress.revisions[0] }
    expect(validateM05Revisions(progress).messages).toContain('至少完整修改 2 道不同题目，并保存原题干、修改后题干和原因')
  })

  it('M04 重新验收后必须重新读取新的验收与教师确认版本', async () => {
    const { progress } = await completeM05()
    expect(m05SourceIsCurrent(progress, 'm04-current', 'm04-plan-current')).toBe(true)
    expect(m05SourceIsCurrent(progress, 'm04-new', 'm04-plan-new')).toBe(false)
  })

  it('完整核验得 10 分，实质修改后保留旧验收但当前通过失效', async () => {
    const { progress, directory } = await completeM05()
    expect(validateM05Input(progress, true).valid).toBe(true)
    expect(validateM05PeerReview(progress, directory).valid).toBe(true)
    const score = calculateM05Score(progress, directory, true)
    expect(score.dimensions).toHaveLength(5)
    expect(score.total).toBe(10)
    expect(score.passed).toBe(true)
    progress.assessments.push(createM05Assessment(progress, directory, true))
    expect(latestM05AssessmentIsCurrent(progress, directory)).toBe(true)
    progress.confirmation.peerResponse = '基于最新互评更新处理说明。'
    expect(progress.assessments).toHaveLength(1)
    expect(latestM05AssessmentIsCurrent(progress, directory)).toBe(false)
  })

  it('按 participantId 隔离；任务内重置只删当前教师，全局重置删全部教师', () => {
    let store = loadM05Store()
    store = updateParticipantM05Progress(store, 'T001', (current) => ({ ...current, route: 'audit' }))
    store = updateParticipantM05Progress(store, 'T002', (current) => ({ ...current, route: 'revision' }))
    saveM05Store(store)
    expect(m05ProgressForParticipant(loadM05Store(), 'T001').route).toBe('audit')
    store = clearParticipantM05Progress(store, 'T001')
    expect(m05ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(m05ProgressForParticipant(store, 'T002').route).toBe('revision')
    expect(clearAllM05Progress().participants).toEqual({})
  })
})
