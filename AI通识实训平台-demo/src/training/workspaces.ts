import type { TrainingTaskId } from './types'

export interface TaskWorkspaceRegistration {
  taskId: TrainingTaskId
  workspaceId: 'm01' | 'm02' | 'm03' | 'm04' | 'm05' | 'm06' | 'm07' | 'm08' | 'm09' | 'm10' | 'm11' | 'm12' | 'e01' | 'e02' | 'e03' | 'e04' | 'e05' | 'e06' | 'g01' | 'g02' | 'g03'
  startLabel: string
  continueLabel: string
  completedLabel: string
}

export const taskWorkspaceRegistry: Partial<Record<TrainingTaskId, TaskWorkspaceRegistration>> = {
  M01: { taskId: 'M01', workspaceId: 'm01', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M02: { taskId: 'M02', workspaceId: 'm02', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M03: { taskId: 'M03', workspaceId: 'm03', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M04: { taskId: 'M04', workspaceId: 'm04', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M05: { taskId: 'M05', workspaceId: 'm05', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M06: { taskId: 'M06', workspaceId: 'm06', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M07: { taskId: 'M07', workspaceId: 'm07', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M08: { taskId: 'M08', workspaceId: 'm08', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M09: { taskId: 'M09', workspaceId: 'm09', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M10: { taskId: 'M10', workspaceId: 'm10', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M11: { taskId: 'M11', workspaceId: 'm11', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  M12: { taskId: 'M12', workspaceId: 'm12', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  E01: { taskId: 'E01', workspaceId: 'e01', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  E02: { taskId: 'E02', workspaceId: 'e02', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  E03: { taskId: 'E03', workspaceId: 'e03', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  E04: { taskId: 'E04', workspaceId: 'e04', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  E05: { taskId: 'E05', workspaceId: 'e05', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  E06: { taskId: 'E06', workspaceId: 'e06', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' },
  G01: { taskId: 'G01', workspaceId: 'g01', startLabel: '开始验收', continueLabel: '继续验收', completedLabel: '查看验收记录' },
  G02: { taskId: 'G02', workspaceId: 'g02', startLabel: '开始验收', continueLabel: '继续验收', completedLabel: '查看验收记录' },
  G03: { taskId: 'G03', workspaceId: 'g03', startLabel: '开始验收', continueLabel: '继续验收', completedLabel: '查看验收记录' },
}

export function taskActionLabel(taskId: TrainingTaskId, status: 'ready' | 'in-progress' | 'completed' | 'blocked' | 'framework'): string {
  const workspace = taskWorkspaceRegistry[taskId]
  if (!workspace) return '查看任务框架'
  if (status === 'completed') return workspace.completedLabel
  if (status === 'in-progress') return workspace.continueLabel
  if (status === 'blocked') return '查看任务'
  return workspace.startLabel
}
