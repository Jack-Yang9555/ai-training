import { portfolioDefinitions, trainingTasks } from './catalog'
import type {
  ElectiveAssignments,
  TaskArchiveEntry,
  TaskArtifactSubmission,
  TrainingPortfolioSnapshot,
  TrainingSnapshot,
  TrainingTaskId,
} from './types'

interface BuildTrainingPortfolioInput {
  snapshot: TrainingSnapshot
  electiveAssignments: ElectiveAssignments
  submissions?: Partial<Record<TrainingTaskId, TaskArtifactSubmission>>
}

function selectedElectiveIds(assignments: ElectiveAssignments) {
  return new Set<TrainingTaskId>(Object.values(assignments).flat())
}

function resolveSourceTaskIds(source: typeof portfolioDefinitions[number]['source'], assignments: ElectiveAssignments): TrainingTaskId[] {
  if (source === 'elective-day-2') return assignments['day-2'] ?? []
  if (source === 'elective-day-3') return assignments['day-3'] ?? []
  return [source]
}

export function buildTrainingPortfolio({ snapshot, electiveAssignments, submissions = {} }: BuildTrainingPortfolioInput): TrainingPortfolioSnapshot {
  const selectedElectives = selectedElectiveIds(electiveAssignments)
  const taskArchives = (Object.values(trainingTasks) as Array<(typeof trainingTasks)[TrainingTaskId]>)
    .filter((task) => task.kind !== 'elective' || selectedElectives.has(task.id))
    .map<TaskArchiveEntry>((task) => {
      const runtime = snapshot.taskStates[task.id]
      const submission = submissions[task.id]
      const status = runtime.status === 'completed' ? 'archived' : runtime.status === 'in-progress' ? 'in-progress' : 'waiting'
      return {
        taskId: task.id,
        title: task.title,
        kind: task.kind,
        status,
        progressPercent: runtime.progressPercent,
        artifacts: submission?.artifacts.length
          ? submission.artifacts
          : task.outputs.map((name, index) => ({ artifactId: `${task.id}:output:${index + 1}`, name })),
        submittedAt: submission?.submittedAt,
        source: submission?.artifacts.length ? 'submission' : 'task-contract',
      }
    })

  const personalDeliverables = portfolioDefinitions.map((definition) => {
    const sourceTaskIds = resolveSourceTaskIds(definition.source, electiveAssignments)
    const status = sourceTaskIds.length === 0
      ? 'unconfigured' as const
      : sourceTaskIds.every((taskId) => snapshot.taskStates[taskId].status === 'completed')
        ? 'archived' as const
        : 'waiting' as const
    return { ...definition, sourceTaskIds, status }
  })

  return {
    taskArchives,
    personalDeliverables,
    archivedTaskCount: taskArchives.filter((item) => item.status === 'archived').length,
    eligibleTaskCount: taskArchives.length,
    completedDeliverableCount: personalDeliverables.filter((item) => item.status === 'archived').length,
  }
}
