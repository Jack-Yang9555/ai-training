export type TaskGroupId = string
export type TaskKind = 'mandatory' | 'elective' | 'milestone'
export type TaskContentStatus = 'implemented' | 'story-ready' | 'planned'
export type TaskRunStatus = 'ready' | 'in-progress' | 'completed' | 'blocked' | 'framework'

export type MandatoryTaskId =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06'
  | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'M12'
export type ElectiveTaskId = 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06'
export type MilestoneTaskId = 'G01' | 'G02' | 'G03'
export type TrainingTaskId = MandatoryTaskId | ElectiveTaskId | MilestoneTaskId
export type ElectiveAssignments = Record<string, ElectiveTaskId[]>

export interface GroupElectiveSelection {
  groupId: string
  firstTaskId?: ElectiveTaskId
  secondTaskId?: ElectiveTaskId
  selectedByParticipantId?: string
  selectedAt?: string
  confirmedAt?: string
  memberConfirmedAt: Record<string, string>
}

export type ElectiveSelectionsByGroup = Record<string, GroupElectiveSelection>

export interface TrainingParticipant {
  participantId: string
  name: string
  organization: string
  department: string
  specialty: string
  contact: string
  groupId: string
  groupName: string
}

export interface ParticipantDirectory {
  participants: TrainingParticipant[]
  currentParticipantId: string
  sourceName: string
  importedAt: string
}

export interface TaskStepDefinition {
  id: string
  label: string
  number: string
}

export interface TrainingTaskDefinition {
  id: TrainingTaskId
  title: string
  kind: TaskKind
  duration: number
  difficulty: '入门' | '应用' | '综合' | '验收'
  collaboration: string
  description: string
  outputs: string[]
  capability: string
  recommendedAfter: TrainingTaskId[]
  prerequisites?: TrainingTaskId[]
  contentStatus: TaskContentStatus
  steps?: TaskStepDefinition[]
}

export interface TaskListEntry {
  id: string
  scheduleLabel: string
  duration: number
  taskId?: TrainingTaskId
  electiveBucketId?: string
}

export interface TaskGroupDefinition {
  id: TaskGroupId
  label: string
  code: string
  kind: 'sequence' | 'selection'
  focus: string
  items: TaskListEntry[]
  summary: string
  selectionRule?: {
    minimumPerBucket: number
    buckets: Array<{ id: string; label: string }>
    recommendations: Array<{ label: string; taskIds: ElectiveTaskId[] }>
  }
}

export interface PortfolioDefinition {
  id: string
  name: string
  source: TrainingTaskId | 'elective-day-2' | 'elective-day-3'
  quantity: string
}

export interface TaskArtifact {
  artifactId: string
  name: string
  uri?: string
  updatedAt?: string
}

export interface TaskArtifactSubmission {
  taskId: TrainingTaskId
  artifacts: TaskArtifact[]
  submittedAt?: string
}

export interface TaskArchiveEntry {
  taskId: TrainingTaskId
  title: string
  kind: TaskKind
  status: 'waiting' | 'in-progress' | 'archived'
  progressPercent: number
  artifacts: TaskArtifact[]
  submittedAt?: string
  source: 'task-contract' | 'submission'
}

export interface PortfolioSlotState extends PortfolioDefinition {
  sourceTaskIds: TrainingTaskId[]
  status: 'unconfigured' | 'waiting' | 'archived'
}

export interface TrainingPortfolioSnapshot {
  taskArchives: TaskArchiveEntry[]
  personalDeliverables: PortfolioSlotState[]
  archivedTaskCount: number
  eligibleTaskCount: number
  completedDeliverableCount: number
}

export type PortalRoute =
  | { page: 'dashboard' }
  | { page: 'tasks'; groupId?: TaskGroupId; focusElectiveBucketId?: string }
  | { page: 'participants' }
  | { page: 'portfolio' }
  | { page: 'task'; taskId: TrainingTaskId }

export interface TrainingPortalProgress {
  version: 4
  route: PortalRoute
  /** 当前参与者所在组的兼容投影；权威状态为 electiveSelectionsByGroup。 */
  electiveAssignments: ElectiveAssignments
  electiveSelectionsByGroup: ElectiveSelectionsByGroup
  participantDirectory: ParticipantDirectory
  updatedAt: string
}

export interface TaskRuntimeState {
  taskId: TrainingTaskId
  status: TaskRunStatus
  progressPercent: number
  score?: number
  pendingPrerequisites: TrainingTaskId[]
  blockingReasons: string[]
}

export interface TrainingSnapshot {
  taskStates: Record<TrainingTaskId, TaskRuntimeState>
  completedRequired: number
  requiredTotal: number
  passedMilestones: number
  milestoneTotal: number
  overallPercent: number
}

export interface TaskProgressSummary {
  progressPercent: number
  passed: boolean
  score?: number
}
