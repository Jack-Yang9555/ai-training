import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialM08Progress } from '../src/m08/data'
import type { M08Progress } from '../src/m08/domain'
import { buildM08PeerArtifacts } from '../src/m08/peerArtifacts'
import { LocalM08WebRunner } from '../src/m08/runner'
import { calculateM08Score, createM08Assessment } from '../src/m08/scoring'
import { clearAllM08Progress, clearParticipantM08Progress, createConfirmedM08Webpage, loadM08Store, M08_STORAGE_KEY, m08ProgressForParticipant, saveM08Store, updateParticipantM08Progress } from '../src/m08/storage'
import { latestM08AssessmentIsCurrent, progressForM08, validateM08BrowserTest, validateM08Draft, validateM08Iterations, validateM08PeerTest } from '../src/m08/validation'
import { createInitialPortalProgress } from '../src/training/storage'

async function completeM08(): Promise<{ progress: M08Progress; directory: ReturnType<typeof createInitialPortalProgress>['participantDirectory'] }> {
  const progress = createInitialM08Progress(), directory = createInitialPortalProgress().participantDirectory, runner = new LocalM08WebRunner()
  const v0 = await runner.generate(progress.input), v1 = await runner.iterate(progress.input, v0, progress.iterationDrafts[0], 1), v2 = await runner.iterate(progress.input, v1, progress.iterationDrafts[1], 2)
  progress.versions = [v0, v1, v2]
  progress.iterationRecords = [
    { round: 1, instruction: progress.iterationDrafts[0], beforeSummary: v0.interactionLabel, afterSummary: `${v1.interactionLabel}；${v1.knowledgeCards[0].content}`, versionId: v1.versionId, createdAt: v1.generatedAt },
    { round: 2, instruction: progress.iterationDrafts[1], beforeSummary: v1.interactionLabel, afterSummary: `${v2.interactionLabel}；${v2.knowledgeCards[1].content}`, versionId: v2.versionId, createdAt: v2.generatedAt },
  ]
  progress.browserTest = { downloaded: true, offlineOpened: true, desktopChecked: true, mobileChecked: true, singleFileChecked: true, fiveQuestionsChecked: true, instantFeedbackChecked: true, interactionChecked: true, notes: '' }
  const artifact = buildM08PeerArtifacts(directory)[0]
  progress.peerTest = { reviewerId: artifact.participantId, reviewerRole: '学生体验员', artifactId: artifact.artifactId, studentOperation: '展开四张知识卡，连续完成五道题并查看反馈。', issueFound: '错误反馈缺少返回哪张知识卡的明确提示。', correctionBefore: '回答错误，请复查。', correctionAfter: '回答错误，请返回对应知识卡复查依据后重试。', correctionBasis: '同组成员按学生路径测试后无法快速定位复习内容。', submitted: true }
  progress.teacherConfirmation = { answersExplanationsConfirmed: true, materialAlignmentConfirmed: true, responsiveConfirmed: true, offlineSafetyConfirmed: true, finalResponsibilityConfirmed: true }
  progress.confirmedWebpage = createConfirmedM08Webpage(progress, directory)
  return { progress, directory }
}

describe('M08 网页生成、测试、评分和存储', () => {
  beforeEach(() => window.localStorage.removeItem(M08_STORAGE_KEY))
  it('全新任务虽提供可用基线，任务卡仍显示为尚未开始', () => { const progress = createInitialM08Progress(), directory = createInitialPortalProgress().participantDirectory; expect(progressForM08(progress, directory)).toBe(0); progress.route = 'input'; expect(progressForM08(progress, directory)).toBeGreaterThan(0) })
  it('确定性生成恰好 4 张知识卡、5 道题并且 HTML 不依赖外部资源', async () => { const { progress } = await completeM08(); expect(validateM08Draft(progress).valid).toBe(true); expect(progress.versions[0].knowledgeCards).toHaveLength(4); expect(progress.versions[0].questions).toHaveLength(5); expect(progress.versions[0].html).toMatch(/^<!doctype html>/); expect(progress.versions[0].html).not.toMatch(/https?:\/\//) })
  it('必须完成恰好两轮自然语言迭代并保留 V0、V1、V2', async () => { const { progress } = await completeM08(); expect(validateM08Iterations(progress).valid).toBe(true); progress.iterationRecords.pop(); expect(validateM08Iterations(progress).valid).toBe(false) })
  it('下载、离线、桌面、手机、5题反馈和互动测试缺一不可', async () => { const { progress } = await completeM08(); expect(validateM08BrowserTest(progress).valid).toBe(true); progress.browserTest.mobileChecked = false; expect(validateM08BrowserTest(progress).valid).toBe(false) })
  it('只能选择当前同组其他成员，并据测试完成前后有差异的修正', async () => { const { progress, directory } = await completeM08(); expect(validateM08PeerTest(progress, directory).valid).toBe(true); progress.peerTest.reviewerId = 'T007'; expect(validateM08PeerTest(progress, directory).valid).toBe(false); progress.peerTest.reviewerId = directory.currentParticipantId; expect(validateM08PeerTest(progress, directory).valid).toBe(false) })
  it('完整闭环得 10 分且只归档一份任务成果', async () => { const { progress, directory } = await completeM08(); const result = calculateM08Score(progress, directory); expect(result.total).toBe(10); expect(result.passed).toBe(true); progress.assessments.push(createM08Assessment(progress, directory)); expect(latestM08AssessmentIsCurrent(progress, directory)).toBe(true); expect(progress.confirmedWebpage).toBeDefined() })
  it('实质内容修改保留旧验收历史但当前通过失效', async () => { const { progress, directory } = await completeM08(); progress.assessments.push(createM08Assessment(progress, directory)); progress.peerTest.correctionAfter += '并再次作答。'; expect(progress.assessments).toHaveLength(1); expect(latestM08AssessmentIsCurrent(progress, directory)).toBe(false) })
  it('内容改回原值并重新形成教师确认网页后仍须复验', async () => { const { progress, directory } = await completeM08(); progress.assessments.push(createM08Assessment(progress, directory)); progress.confirmedWebpage = { ...progress.confirmedWebpage!, confirmedAt: '2099-01-01T00:00:00.000Z' }; expect(progress.assessments).toHaveLength(1); expect(latestM08AssessmentIsCurrent(progress, directory)).toBe(false) })
  it('按 participantId 隔离并支持任务内和全局重置', () => { let store = loadM08Store(); store = updateParticipantM08Progress(store, 'T001', (current) => ({ ...current, route: 'iterations' })); store = updateParticipantM08Progress(store, 'T002', (current) => ({ ...current, route: 'browser-test' })); saveM08Store(store); expect(m08ProgressForParticipant(loadM08Store(), 'T001').route).toBe('iterations'); store = clearParticipantM08Progress(store, 'T001'); expect(m08ProgressForParticipant(store, 'T001').route).toBe('overview'); expect(m08ProgressForParticipant(store, 'T002').route).toBe('browser-test'); expect(clearAllM08Progress().participants).toEqual({}) })
})
