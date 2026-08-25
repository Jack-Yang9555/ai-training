import { describe, expect, it } from 'vitest'
import { buildTrainingSnapshot } from '../src/training/progress'
import {
  confirmCurrentMemberElectiveSelection,
  createInitialPortalProgress,
  currentElectiveSelection,
  currentMemberElectiveConfirmed,
  loadPortalProgress,
  PORTAL_STORAGE_KEY,
  selectedElectiveIds,
  updateElectiveAssignments,
  updateParticipantDirectory,
} from '../src/training/storage'
import type { M01ScoreResult } from '../src/types'

const incompleteScore: M01ScoreResult = { dimensions: [], total: 0, coreRequirements: [], passed: false }
const passedScore: M01ScoreResult = { dimensions: [], total: 10, coreRequirements: [], passed: true }

describe('三日实训全局进度', () => {
  it('旧 v1—v3 两项选修迁移到当前组，并要求当前成员重新确认', () => {
    for (const version of [1, 2, 3]) {
      const initial = createInitialPortalProgress()
      const legacy = version === 1
        ? { version, route: { page: 'tasks', groupId: 'elective-pool', focusElectiveSlot: 2 }, selectedElectiveIds: ['E03', 'E04'], updatedAt: '2026-08-24T01:00:00.000Z' }
        : { version, route: { page: 'tasks', groupId: 'elective-pool', focusElectiveSlot: 2 }, electiveAssignments: { 'day-2': ['E03', 'E05'], 'day-3': ['E04'] }, participantDirectory: version === 3 ? initial.participantDirectory : undefined, updatedAt: '2026-08-24T01:00:00.000Z' }
      window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(legacy))
      const progress = loadPortalProgress()
      const current = progress.participantDirectory.participants.find((item) => item.participantId === progress.participantDirectory.currentParticipantId)!
      expect(progress.version).toBe(4)
      expect(progress.electiveAssignments).toEqual({ 'day-2': ['E03'], 'day-3': ['E04'] })
      expect(progress.electiveSelectionsByGroup[current.groupId]).toMatchObject({ firstTaskId: 'E03', secondTaskId: 'E04', selectedByParticipantId: current.participantId, memberConfirmedAt: {} })
      expect(currentMemberElectiveConfirmed(progress)).toBe(false)
      expect(progress.route).toEqual({ page: 'tasks', groupId: 'elective-pool', focusElectiveBucketId: 'day-3' })
    }
  })

  it('按 groupId 保存两项顺序、选择人与确认时间，选择变化才清空成员确认', () => {
    let progress = createInitialPortalProgress()
    progress = updateElectiveAssignments(progress, { 'day-2': ['E01'], 'day-3': ['E02'] }, '2026-08-25T01:00:00.000Z')
    expect(currentElectiveSelection(progress)).toMatchObject({
      groupId: 'group-3',
      firstTaskId: 'E01',
      secondTaskId: 'E02',
      selectedByParticipantId: 'T001',
      confirmedAt: '2026-08-25T01:00:00.000Z',
      memberConfirmedAt: {},
    })
    expect(currentMemberElectiveConfirmed(progress)).toBe(false)

    progress = confirmCurrentMemberElectiveSelection(progress, '2026-08-25T01:05:00.000Z')
    expect(currentMemberElectiveConfirmed(progress)).toBe(true)
    expect(currentElectiveSelection(progress)?.memberConfirmedAt.T001).toBe('2026-08-25T01:05:00.000Z')

    progress = updateElectiveAssignments(progress, { 'day-2': ['E01'], 'day-3': ['E02'] }, '2026-08-25T01:10:00.000Z')
    expect(currentMemberElectiveConfirmed(progress)).toBe(true)
    progress = updateElectiveAssignments(progress, { 'day-2': ['E01'], 'day-3': ['E03'] }, '2026-08-25T01:15:00.000Z')
    expect(currentElectiveSelection(progress)?.memberConfirmedAt).toEqual({})
    expect(currentMemberElectiveConfirmed(progress)).toBe(false)
  })

  it('切换当前人员时自动投影所在组选择，成员确认不跨组继承', () => {
    let progress = createInitialPortalProgress()
    progress = updateElectiveAssignments(progress, { 'day-2': ['E01'], 'day-3': ['E02'] }, '2026-08-25T02:00:00.000Z')
    progress = confirmCurrentMemberElectiveSelection(progress, '2026-08-25T02:05:00.000Z')

    progress = updateParticipantDirectory(progress, { ...progress.participantDirectory, currentParticipantId: 'T007' })
    expect(progress.electiveAssignments).toEqual({ 'day-2': [], 'day-3': [] })
    expect(currentElectiveSelection(progress)).toBeUndefined()
    progress = updateElectiveAssignments(progress, { 'day-2': ['E03'], 'day-3': ['E04'] }, '2026-08-25T02:10:00.000Z')
    progress = confirmCurrentMemberElectiveSelection(progress, '2026-08-25T02:15:00.000Z')

    progress = updateParticipantDirectory(progress, { ...progress.participantDirectory, currentParticipantId: 'T002' })
    expect(progress.electiveAssignments).toEqual({ 'day-2': ['E01'], 'day-3': ['E02'] })
    expect(currentMemberElectiveConfirmed(progress)).toBe(false)
    progress = confirmCurrentMemberElectiveSelection(progress, '2026-08-25T02:20:00.000Z')
    expect(currentMemberElectiveConfirmed(progress)).toBe(true)

    progress = updateParticipantDirectory(progress, { ...progress.participantDirectory, currentParticipantId: 'T001' })
    expect(progress.electiveAssignments).toEqual({ 'day-2': ['E01'], 'day-3': ['E02'] })
    expect(currentMemberElectiveConfirmed(progress)).toBe(true)
  })

  it('M01 过程进度只产生分数进度，其他任务仍可独立开始', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M01: { progressPercent: 60, passed: incompleteScore.passed, score: incompleteScore.total } }, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M01.status).toBe('in-progress')
    expect(snapshot.taskStates.M02.status).toBe('ready')
    expect(snapshot.taskStates.M03.status).toBe('ready')
    expect(snapshot.taskStates.M02.blockingReasons).toEqual([])
    expect(snapshot.completedRequired).toBe(0)
    expect(snapshot.overallPercent).toBe(4)
  })

  it('M01 通过后独立计入完成数，不改变其他任务的可进入状态', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M01: { progressPercent: 100, passed: passedScore.passed, score: passedScore.total } }, selectedElectiveIds: ['E03', 'E04'] })
    expect(snapshot.taskStates.M01.status).toBe('completed')
    expect(snapshot.taskStates.M02.status).toBe('ready')
    expect(snapshot.taskStates.M02.blockingReasons).toEqual([])
    expect(snapshot.taskStates.E03.blockingReasons).not.toContain('该任务尚未加入本组第一项或第二项选修')
    expect(snapshot.taskStates.E01.blockingReasons).toContain('该任务尚未加入本组第一项或第二项选修')
    expect(snapshot.completedRequired).toBe(1)
    expect(snapshot.requiredTotal).toBe(14)
  })

  it('快照最多接受两项不同选修，不再把增选任务扩成第三项计分任务', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M01: { progressPercent: 0, passed: incompleteScore.passed, score: incompleteScore.total } }, selectedElectiveIds: ['E03', 'E05', 'E04'] })
    expect(snapshot.requiredTotal).toBe(14)
    expect(snapshot.taskStates.E04.blockingReasons).toContain('该任务尚未加入本组第一项或第二项选修')
  })

  it('M02 可在 M01 未完成时独立通过并计入完成数', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {
      M02: { progressPercent: 100, passed: true, score: 10 },
    }, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M02.status).toBe('completed')
    expect(snapshot.taskStates.M03.status).toBe('ready')
    expect(snapshot.completedRequired).toBe(1)
  })

  it('M04 无需 M03 通过即可独立开始和完成', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M04.status).toBe('ready')
    expect(snapshot.taskStates.M04.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.M04.blockingReasons).toEqual([])

    const completed = buildTrainingSnapshot({ taskProgress: { M04: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: [] })
    expect(completed.taskStates.M04.status).toBe('completed')
    expect(completed.completedRequired).toBe(1)
  })

  it('M05 无需 M04 通过即可独立开始和完成', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M05.status).toBe('ready')
    expect(snapshot.taskStates.M05.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.M05.blockingReasons).toEqual([])
    const completed = buildTrainingSnapshot({ taskProgress: { M05: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: [] })
    expect(completed.taskStates.M05.status).toBe('completed')
  })

  it('M06 无需 M04、M05 或 G01 通过即可独立开始和完成', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M06.status).toBe('ready')
    expect(snapshot.taskStates.M06.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.M06.blockingReasons).toEqual([])
    const completed = buildTrainingSnapshot({ taskProgress: { M06: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: [] })
    expect(completed.taskStates.M06.status).toBe('completed')
  })

  it('M07 无需 M06 通过即可独立开始和完成', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M07.status).toBe('ready')
    expect(snapshot.taskStates.M07.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.M07.blockingReasons).toEqual([])
    const completed = buildTrainingSnapshot({ taskProgress: { M07: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: [] })
    expect(completed.taskStates.M07.status).toBe('completed')
  })

  it('M08 与 G02 在全新状态下都可独立开始', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M08.status).toBe('ready')
    expect(snapshot.taskStates.M08.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.M08.blockingReasons).toEqual([])
    expect(snapshot.taskStates.G02.status).toBe('ready')
    expect(snapshot.taskStates.G02.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.G02.blockingReasons).toEqual([])
  })

  it('E01 只有加入执行日后才可开始，并以真实进度完成', () => {
    const unselected = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(unselected.taskStates.E01.status).toBe('blocked')
    expect(unselected.taskStates.E01.blockingReasons).toContain('该任务尚未加入本组第一项或第二项选修')

    const selectedButUnconfirmed = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: ['E01', 'E02'], currentMemberElectiveConfirmed: false })
    expect(selectedButUnconfirmed.taskStates.E01.status).toBe('blocked')
    expect(selectedButUnconfirmed.taskStates.E01.blockingReasons).toContain('当前成员尚未确认本组两项选修及执行顺序')

    const selected = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: ['E01', 'E02'], currentMemberElectiveConfirmed: true })
    expect(selected.taskStates.E01.status).toBe('ready')
    expect(selected.taskStates.E01.blockingReasons).toEqual([])

    const completed = buildTrainingSnapshot({ taskProgress: { E01: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: ['E01', 'E02'], currentMemberElectiveConfirmed: true })
    expect(completed.taskStates.E01.status).toBe('completed')
    expect(completed.completedRequired).toBe(1)

    const removedAgain = buildTrainingSnapshot({ taskProgress: { E01: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: [] })
    expect(removedAgain.taskStates.E01.status).toBe('blocked')
    expect(removedAgain.completedRequired).toBe(0)
  })

  it('存储 helper 与 snapshot 对当前成员确认状态使用同一事实', () => {
    let progress = createInitialPortalProgress()
    progress = updateElectiveAssignments(progress, { 'day-2': ['E01'], 'day-3': ['E02'] }, '2026-08-25T03:00:00.000Z')
    const before = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: selectedElectiveIds(progress.electiveAssignments), currentMemberElectiveConfirmed: currentMemberElectiveConfirmed(progress) })
    expect(before.taskStates.E01.status).toBe('blocked')
    progress = confirmCurrentMemberElectiveSelection(progress, '2026-08-25T03:05:00.000Z')
    const after = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: selectedElectiveIds(progress.electiveAssignments), currentMemberElectiveConfirmed: currentMemberElectiveConfirmed(progress) })
    expect(after.taskStates.E01.status).toBe('ready')
  })

  it('M09 已实现且无需 G02 通过即可独立开始和完成', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(snapshot.taskStates.M09.status).toBe('ready')
    expect(snapshot.taskStates.M09.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.M09.blockingReasons).toEqual([])
    const completed = buildTrainingSnapshot({ taskProgress: { M09: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: [] })
    expect(completed.taskStates.M09.status).toBe('completed')
    expect(completed.completedRequired).toBe(1)
  })

  it('G01 无需 M01—M05 通过即可独立开始和完成', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {}, selectedElectiveIds: [] })
    expect(snapshot.taskStates.G01.status).toBe('ready')
    expect(snapshot.taskStates.G01.pendingPrerequisites).toEqual([])
    expect(snapshot.taskStates.G01.blockingReasons).toEqual([])
  })

  it('G01 通过只增加阶段验收完成数，不进入普通计分任务完成数', () => {
    const prerequisites = { M01: { progressPercent: 100, passed: true, score: 10 }, M02: { progressPercent: 100, passed: true, score: 10 }, M03: { progressPercent: 100, passed: true, score: 10 }, M04: { progressPercent: 100, passed: true, score: 10 }, M05: { progressPercent: 100, passed: true, score: 10 } }
    const before = buildTrainingSnapshot({ taskProgress: prerequisites, selectedElectiveIds: [] })
    const after = buildTrainingSnapshot({ taskProgress: { ...prerequisites, G01: { progressPercent: 100, passed: true } }, selectedElectiveIds: [] })
    expect(after.completedRequired).toBe(before.completedRequired)
    expect(after.requiredTotal).toBe(before.requiredTotal)
    expect(after.passedMilestones).toBe(before.passedMilestones + 1)
    expect(after.taskStates.G01.score).toBeUndefined()
  })
})
