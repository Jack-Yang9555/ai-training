import { beforeEach, describe, expect, it } from 'vitest'
import { buildG02GroupContext, g02OutputNames } from '../src/g02/data'
import { clearAllG02Progress, clearGroupG02Progress, createEmptyG02Store, createInitialG02Progress, g02ProgressForGroup, loadG02Store, G02_STORAGE_KEY, saveG02Store, updateGroupG02Progress } from '../src/g02/storage'
import { createG02Assessment, g02Conditions, latestG02AssessmentIsCurrent } from '../src/g02/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function completeG02() {
  const directory = createInitialPortalProgress().participantDirectory
  const context = buildG02GroupContext(directory, { participantId: directory.currentParticipantId })
  const progress = createInitialG02Progress(context)
  progress.directoryConfirmed = true
  progress.showcase.confirmed = true
  progress.showcase.onlineInteractionTested = true
  progress.feedbackConfirmed = true
  progress.revision.applied = true
  progress.contributionsConfirmed = true
  return { directory, context, progress }
}

describe('G02 小组里程碑验收和存储', () => {
  beforeEach(() => window.localStorage.removeItem(G02_STORAGE_KEY))
  it('独立状态用明确标注的演示成果补齐四类目录且不要求 M07', () => { const { progress } = completeG02(); const current = progress.memberEvidence.find((item) => item.isCurrentParticipant)!; expect(current.evidence).toHaveLength(4); expect(current.evidence.every((item) => item.source === '任务内演示成果')).toBe(true); expect(current.evidence.map((item) => item.type)).not.toContain('M07 学情分析') })
  it('四项明示验收条件全部满足才通过', () => { const { progress } = completeG02(); expect(g02Conditions(progress).every((item) => item.passed)).toBe(true); progress.showcase.onlineInteractionTested = false; expect(g02Conditions(progress).find((item) => item.id === 'online-interaction')?.passed).toBe(false) })
  it('跨组反馈不少于两条，并必须完成一处前后有差异且标明贡献者的修改', () => { const { progress } = completeG02(); expect(g02Conditions(progress).find((item) => item.id === 'feedback-revision')?.passed).toBe(true); progress.revision.after = progress.revision.before; expect(g02Conditions(progress).find((item) => item.id === 'feedback-revision')?.passed).toBe(false) })
  it('每位成员都必须具有作品或实质修改贡献记录', () => { const { progress } = completeG02(); expect(g02Conditions(progress).find((item) => item.id === 'member-contribution')?.passed).toBe(true); progress.contributions[0].contribution = ''; expect(g02Conditions(progress).find((item) => item.id === 'member-contribution')?.passed).toBe(false) })
  it('通过后恰好生成三份固定名称成果且只生成一次当前快照', () => { const { progress } = completeG02(); const result = createG02Assessment(progress); progress.assessments.push(result.assessment); progress.artifacts = result.artifacts; expect(progress.artifacts).toHaveLength(3); expect(progress.artifacts.map((item) => item.name)).toEqual([...g02OutputNames]); expect(latestG02AssessmentIsCurrent(progress)).toBe(true) })
  it('实质内容变化保留历史，但当前通过和三份旧成果失效', () => { const { progress } = completeG02(); const result = createG02Assessment(progress); progress.assessments.push(result.assessment); progress.artifacts = result.artifacts; progress.showcase.teachingScenario += '并加入课堂总结。'; expect(progress.assessments).toHaveLength(1); expect(latestG02AssessmentIsCurrent(progress)).toBe(false) })
  it('按 groupId 隔离并支持当前小组和全局重置', () => { const firstPortal = createInitialPortalProgress(), firstContext = buildG02GroupContext(firstPortal.participantDirectory, { participantId: firstPortal.participantDirectory.currentParticipantId }); const secondDirectory = { ...firstPortal.participantDirectory, currentParticipantId: 'T007' }, secondContext = buildG02GroupContext(secondDirectory, { participantId: 'T007' }); let store = createEmptyG02Store(); store = updateGroupG02Progress(store, firstContext, (progress) => ({ ...progress, route: 'showcase' })); store = updateGroupG02Progress(store, secondContext, (progress) => ({ ...progress, route: 'feedback' })); saveG02Store(store); expect(g02ProgressForGroup(loadG02Store(), firstContext).route).toBe('showcase'); store = clearGroupG02Progress(store, firstContext.groupId); expect(g02ProgressForGroup(store, firstContext).route).toBe('overview'); expect(g02ProgressForGroup(store, secondContext).route).toBe('feedback'); expect(clearAllG02Progress().groups).toEqual({}) })
})
