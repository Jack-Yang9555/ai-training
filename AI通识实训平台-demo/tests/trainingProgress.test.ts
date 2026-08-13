import { describe, expect, it } from 'vitest'
import { buildTrainingSnapshot } from '../src/training/progress'
import { loadPortalProgress, PORTAL_STORAGE_KEY } from '../src/training/storage'
import type { M01ScoreResult } from '../src/types'

const incompleteScore: M01ScoreResult = { dimensions: [], total: 0, coreRequirements: [], passed: false }
const passedScore: M01ScoreResult = { dimensions: [], total: 10, coreRequirements: [], passed: true }

describe('三日实训全局进度', () => {
  it('旧版两项选修数据迁移为第二天和第三天各一项', () => {
    window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify({ version: 1, route: { page: 'tasks', groupId: 'elective-pool', focusElectiveSlot: 2 }, selectedElectiveIds: ['E03', 'E04'] }))
    const progress = loadPortalProgress()
    expect(progress.version).toBe(3)
    expect(progress.electiveAssignments).toEqual({ 'day-2': ['E03'], 'day-3': ['E04'] })
    expect(progress.route).toEqual({ page: 'tasks', groupId: 'elective-pool', focusElectiveBucketId: 'day-3' })
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
    expect(snapshot.taskStates.E03.blockingReasons).not.toContain('该任务尚未加入第二天或第三天的选修清单')
    expect(snapshot.taskStates.E01.blockingReasons).toContain('该任务尚未加入第二天或第三天的选修清单')
    expect(snapshot.completedRequired).toBe(1)
    expect(snapshot.requiredTotal).toBe(14)
  })

  it('增选任务会动态计入计分任务总数', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M01: { progressPercent: 0, passed: incompleteScore.passed, score: incompleteScore.total } }, selectedElectiveIds: ['E03', 'E05', 'E04'] })
    expect(snapshot.requiredTotal).toBe(15)
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
