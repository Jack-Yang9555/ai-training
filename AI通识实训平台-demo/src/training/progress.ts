import { milestoneTaskIds, requiredTaskIds, taskGroups, trainingTasks } from './catalog'
import type { ElectiveTaskId, TaskProgressSummary, TaskRuntimeState, TrainingSnapshot, TrainingTaskId } from './types'

interface BuildTrainingSnapshotInput {
  taskProgress: Partial<Record<TrainingTaskId, TaskProgressSummary>>
  selectedElectiveIds: ElectiveTaskId[]
}

export function buildTrainingSnapshot({ taskProgress, selectedElectiveIds }: BuildTrainingSnapshotInput): TrainingSnapshot {
  const taskStates = {} as Record<TrainingTaskId, TaskRuntimeState>
  ;(Object.keys(trainingTasks) as TrainingTaskId[]).forEach((taskId) => {
    const task = trainingTasks[taskId]
    const notSelected = task.kind === 'elective' && !selectedElectiveIds.includes(task.id as ElectiveTaskId)

    let status: TaskRuntimeState['status'] = 'framework'
    let progressPercent = 0
    const blockingReasons: string[] = []
    const progress = taskProgress[taskId]
    const pendingPrerequisites = (task.prerequisites ?? []).filter((id) => !taskProgress[id]?.passed)
    if (pendingPrerequisites.length > 0) blockingReasons.push(`前置任务待完成：${pendingPrerequisites.join('、')}`)
    if (task.contentStatus === 'implemented') {
      progressPercent = progress?.progressPercent ?? 0
      if (notSelected) blockingReasons.push('该任务尚未加入第二天或第三天的选修清单')
      if (notSelected || pendingPrerequisites.length > 0) status = 'blocked'
      else if (progress?.passed) status = 'completed'
      else status = progressPercent > 0 ? 'in-progress' : 'ready'
    } else {
      if (notSelected) blockingReasons.push('该任务尚未加入第二天或第三天的选修清单')
      blockingReasons.push(task.contentStatus === 'story-ready' ? '用户故事已具备，交互工作台待实现' : '一级框架已建立，详细用户故事与交互待实现')
      status = 'framework'
    }

    taskStates[taskId] = {
      taskId,
      status,
      progressPercent,
      score: progressPercent > 0 ? progress?.score : undefined,
      pendingPrerequisites,
      blockingReasons,
    }
  })

  const requiredIds = [...requiredTaskIds, ...selectedElectiveIds]
  const completedRequired = requiredIds.filter((id) => taskStates[id].status === 'completed').length
  const passedMilestones = milestoneTaskIds.filter((id) => taskStates[id].status === 'completed').length
  const selectionRule = taskGroups.find((group) => group.kind === 'selection')?.selectionRule
  const minimumElectives = (selectionRule?.buckets.length ?? 0) * (selectionRule?.minimumPerBucket ?? 0)
  const requiredTotal = requiredTaskIds.length + Math.max(minimumElectives, selectedElectiveIds.length)
  const fractionalCompleted = requiredIds.reduce((total, id) => {
    const state = taskStates[id]
    if (state.status === 'completed') return total + 1
    if (state.status === 'in-progress') return total + state.progressPercent / 100
    return total
  }, 0)

  return {
    taskStates,
    completedRequired,
    requiredTotal,
    passedMilestones,
    milestoneTotal: milestoneTaskIds.length,
    overallPercent: Math.round((fractionalCompleted / requiredTotal) * 100),
  }
}
