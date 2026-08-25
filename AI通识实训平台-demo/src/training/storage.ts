import { electiveTaskIds, taskGroups } from './catalog'
import type {
  ElectiveAssignments,
  ElectiveSelectionsByGroup,
  ElectiveTaskId,
  GroupElectiveSelection,
  ParticipantDirectory,
  PortalRoute,
  TrainingPortalProgress,
  TrainingTaskId,
} from './types'
import { sampleCurrentParticipantId, sampleParticipants } from '../data/trainingParticipants'
import { createParticipantDirectory } from './participants'

export const PORTAL_STORAGE_KEY = 'qijing-training-demo:portal:v1'

const selectionRule = taskGroups.find((group) => group.kind === 'selection')?.selectionRule
const validElectiveIds = new Set<ElectiveTaskId>(electiveTaskIds)

function createEmptyAssignments(): ElectiveAssignments {
  return Object.fromEntries((selectionRule?.buckets ?? []).map((bucket) => [bucket.id, []]))
}

function validElectiveId(value: unknown): value is ElectiveTaskId {
  return typeof value === 'string' && validElectiveIds.has(value as ElectiveTaskId)
}

function normalizeAssignments(value: unknown): ElectiveAssignments {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const assignments = createEmptyAssignments()
  const first = Array.isArray(source['day-2']) ? source['day-2'].find(validElectiveId) : undefined
  const secondCandidate = Array.isArray(source['day-3']) ? source['day-3'].find(validElectiveId) : undefined
  const second = secondCandidate && secondCandidate !== first ? secondCandidate : undefined
  if (first) assignments['day-2'] = [first]
  if (second) assignments['day-3'] = [second]
  return assignments
}

function migrateLegacySelection(ids: ElectiveTaskId[] = []): ElectiveAssignments {
  return normalizeAssignments({ 'day-2': ids[0] ? [ids[0]] : [], 'day-3': ids[1] ? [ids[1]] : [] })
}

function currentParticipant(directory: ParticipantDirectory) {
  return directory.participants.find((item) => item.participantId === directory.currentParticipantId)
}

export function electiveSelectionIsComplete(selection: GroupElectiveSelection | undefined): selection is GroupElectiveSelection & { firstTaskId: ElectiveTaskId; secondTaskId: ElectiveTaskId } {
  return Boolean(selection
    && validElectiveId(selection.firstTaskId)
    && validElectiveId(selection.secondTaskId)
    && selection.firstTaskId !== selection.secondTaskId)
}

export function electiveAssignmentsForSelection(selection: GroupElectiveSelection | undefined): ElectiveAssignments {
  return normalizeAssignments({
    'day-2': selection?.firstTaskId ? [selection.firstTaskId] : [],
    'day-3': selection?.secondTaskId ? [selection.secondTaskId] : [],
  })
}

export function selectedElectiveIds(assignments: ElectiveAssignments): ElectiveTaskId[] {
  const normalized = normalizeAssignments(assignments)
  return [normalized['day-2']?.[0], normalized['day-3']?.[0]].filter((item): item is ElectiveTaskId => Boolean(item))
}

export function currentElectiveSelection(progress: TrainingPortalProgress): GroupElectiveSelection | undefined {
  const participant = currentParticipant(progress.participantDirectory)
  return participant ? progress.electiveSelectionsByGroup[participant.groupId] : undefined
}

export function currentMemberElectiveConfirmed(progress: TrainingPortalProgress): boolean {
  const participant = currentParticipant(progress.participantDirectory)
  const selection = currentElectiveSelection(progress)
  return Boolean(participant
    && electiveSelectionIsComplete(selection)
    && selection.selectedByParticipantId
    && selection.confirmedAt
    && selection.memberConfirmedAt[participant.participantId])
}

function normalizedMemberConfirmations(value: unknown, groupId: string, directory: ParticipantDirectory): Record<string, string> {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const members = new Set(directory.participants.filter((item) => item.groupId === groupId).map((item) => item.participantId))
  return Object.fromEntries(Object.entries(source).flatMap(([participantId, confirmedAt]) => members.has(participantId) && typeof confirmedAt === 'string' && confirmedAt.trim()
    ? [[participantId, confirmedAt] as const]
    : []))
}

function normalizeGroupSelection(value: unknown, groupId: string, directory: ParticipantDirectory): GroupElectiveSelection | undefined {
  if (!value || typeof value !== 'object') return undefined
  const source = value as Partial<GroupElectiveSelection>
  const firstTaskId = validElectiveId(source.firstTaskId) ? source.firstTaskId : undefined
  const secondTaskId = validElectiveId(source.secondTaskId) && source.secondTaskId !== firstTaskId ? source.secondTaskId : undefined
  if (!firstTaskId && !secondTaskId) return undefined
  const groupMembers = new Set(directory.participants.filter((item) => item.groupId === groupId).map((item) => item.participantId))
  const selectedByParticipantId = typeof source.selectedByParticipantId === 'string' && groupMembers.has(source.selectedByParticipantId)
    ? source.selectedByParticipantId
    : undefined
  const complete = Boolean(firstTaskId && secondTaskId && selectedByParticipantId)
  return {
    groupId,
    firstTaskId,
    secondTaskId,
    selectedByParticipantId,
    selectedAt: typeof source.selectedAt === 'string' ? source.selectedAt : undefined,
    confirmedAt: complete && typeof source.confirmedAt === 'string' ? source.confirmedAt : undefined,
    memberConfirmedAt: complete ? normalizedMemberConfirmations(source.memberConfirmedAt, groupId, directory) : {},
  }
}

function normalizeSelectionsByGroup(value: unknown, directory: ParticipantDirectory): ElectiveSelectionsByGroup {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const groupIds = new Set(directory.participants.map((item) => item.groupId))
  return Object.fromEntries([...groupIds].flatMap((groupId) => {
    const selection = normalizeGroupSelection(source[groupId], groupId, directory)
    return selection ? [[groupId, selection]] : []
  }))
}

function legacySelectionForCurrentGroup(assignments: ElectiveAssignments, directory: ParticipantDirectory, updatedAt?: string): ElectiveSelectionsByGroup {
  const participant = currentParticipant(directory)
  if (!participant) return {}
  const firstTaskId = assignments['day-2']?.[0]
  const secondTaskId = assignments['day-3']?.[0]
  if (!firstTaskId && !secondTaskId) return {}
  const complete = Boolean(firstTaskId && secondTaskId && firstTaskId !== secondTaskId)
  const timestamp = updatedAt || new Date().toISOString()
  return {
    [participant.groupId]: {
      groupId: participant.groupId,
      firstTaskId,
      secondTaskId,
      selectedByParticipantId: participant.participantId,
      selectedAt: timestamp,
      confirmedAt: complete ? timestamp : undefined,
      // 旧版没有成员确认事实，必须由每位成员重新确认。
      memberConfirmedAt: {},
    },
  }
}

function projectCurrentGroup(progress: Omit<TrainingPortalProgress, 'electiveAssignments'>): TrainingPortalProgress {
  const participant = currentParticipant(progress.participantDirectory)
  const selection = participant ? progress.electiveSelectionsByGroup[participant.groupId] : undefined
  return { ...progress, electiveAssignments: electiveAssignmentsForSelection(selection) }
}

export function createInitialPortalProgress(): TrainingPortalProgress {
  const participantDirectory = createParticipantDirectory(sampleParticipants, '内置示例名单.csv')
  participantDirectory.currentParticipantId = sampleCurrentParticipantId
  return {
    version: 4,
    route: { page: 'dashboard' },
    electiveAssignments: createEmptyAssignments(),
    electiveSelectionsByGroup: {},
    participantDirectory,
    updatedAt: new Date().toISOString(),
  }
}

function normalizeRoute(rawRoute: { page?: string; dayId?: number; groupId?: string; focusElectiveSlot?: number; focusElectiveBucketId?: string; taskId?: TrainingTaskId }): PortalRoute {
  if (rawRoute.page === 'day') return { page: 'tasks', groupId: rawRoute.dayId ? `day-${rawRoute.dayId}` : undefined }
  if (rawRoute.page === 'electives') return { page: 'tasks', groupId: 'elective-pool' }
  if (rawRoute.page === 'tasks') return {
    page: 'tasks',
    groupId: rawRoute.groupId,
    focusElectiveBucketId: rawRoute.focusElectiveBucketId ?? (rawRoute.focusElectiveSlot ? `day-${rawRoute.focusElectiveSlot + 1}` : undefined),
  }
  if (rawRoute.page === 'task' && rawRoute.taskId) return { page: 'task', taskId: rawRoute.taskId }
  if (rawRoute.page === 'portfolio') return { page: 'portfolio' }
  if (rawRoute.page === 'participants') return { page: 'participants' }
  return { page: 'dashboard' }
}

export function loadPortalProgress(): TrainingPortalProgress {
  if (typeof window === 'undefined') return createInitialPortalProgress()
  try {
    const raw = JSON.parse(window.localStorage.getItem(PORTAL_STORAGE_KEY) ?? '') as {
      version?: number
      route?: { page?: string; dayId?: number; groupId?: string; focusElectiveSlot?: number; focusElectiveBucketId?: string; taskId?: TrainingTaskId }
      selectedElectiveIds?: ElectiveTaskId[]
      electiveAssignments?: ElectiveAssignments
      electiveSelectionsByGroup?: ElectiveSelectionsByGroup
      participantDirectory?: ParticipantDirectory
      updatedAt?: string
    }
    if (!raw.route?.page) return createInitialPortalProgress()
    const participantDirectory = raw.version && raw.version >= 3 && raw.participantDirectory?.participants?.length
      ? raw.participantDirectory
      : createInitialPortalProgress().participantDirectory
    const legacyAssignments = raw.version === 2 || raw.version === 3
      ? normalizeAssignments(raw.electiveAssignments)
      : migrateLegacySelection(raw.selectedElectiveIds)
    const electiveSelectionsByGroup = raw.version === 4
      ? normalizeSelectionsByGroup(raw.electiveSelectionsByGroup, participantDirectory)
      : legacySelectionForCurrentGroup(legacyAssignments, participantDirectory, raw.updatedAt)
    return projectCurrentGroup({
      version: 4,
      electiveSelectionsByGroup,
      participantDirectory,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      route: normalizeRoute(raw.route),
    })
  } catch {
    return createInitialPortalProgress()
  }
}

export function savePortalProgress(progress: TrainingPortalProgress): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }))
}

export function updatePortalRoute(progress: TrainingPortalProgress, route: PortalRoute): TrainingPortalProgress {
  return { ...progress, route, updatedAt: new Date().toISOString() }
}

export function updateElectiveAssignments(progress: TrainingPortalProgress, assignments: ElectiveAssignments, changedAt = new Date().toISOString()): TrainingPortalProgress {
  const participant = currentParticipant(progress.participantDirectory)
  if (!participant) return { ...progress, electiveAssignments: createEmptyAssignments(), updatedAt: changedAt }
  const normalized = normalizeAssignments(assignments)
  const firstTaskId = normalized['day-2']?.[0]
  const secondTaskId = normalized['day-3']?.[0]
  const previous = progress.electiveSelectionsByGroup[participant.groupId]
  const changed = previous?.firstTaskId !== firstTaskId || previous?.secondTaskId !== secondTaskId
  if (!changed) return { ...progress, electiveAssignments: electiveAssignmentsForSelection(previous), updatedAt: changedAt }
  const complete = Boolean(firstTaskId && secondTaskId && firstTaskId !== secondTaskId)
  const selection: GroupElectiveSelection = {
    groupId: participant.groupId,
    firstTaskId,
    secondTaskId,
    selectedByParticipantId: participant.participantId,
    selectedAt: changedAt,
    confirmedAt: complete ? changedAt : undefined,
    memberConfirmedAt: {},
  }
  const electiveSelectionsByGroup = { ...progress.electiveSelectionsByGroup, [participant.groupId]: selection }
  return { ...progress, electiveAssignments: electiveAssignmentsForSelection(selection), electiveSelectionsByGroup, updatedAt: changedAt }
}

export function confirmCurrentMemberElectiveSelection(progress: TrainingPortalProgress, confirmedAt = new Date().toISOString()): TrainingPortalProgress {
  const participant = currentParticipant(progress.participantDirectory)
  const selection = currentElectiveSelection(progress)
  if (!participant || !electiveSelectionIsComplete(selection) || !selection.selectedByParticipantId || !selection.confirmedAt) return progress
  const updatedSelection = {
    ...selection,
    memberConfirmedAt: { ...selection.memberConfirmedAt, [participant.participantId]: confirmedAt },
  }
  return {
    ...progress,
    electiveAssignments: electiveAssignmentsForSelection(updatedSelection),
    electiveSelectionsByGroup: { ...progress.electiveSelectionsByGroup, [participant.groupId]: updatedSelection },
    updatedAt: confirmedAt,
  }
}

export function updateParticipantDirectory(progress: TrainingPortalProgress, participantDirectory: TrainingPortalProgress['participantDirectory']): TrainingPortalProgress {
  const electiveSelectionsByGroup = normalizeSelectionsByGroup(progress.electiveSelectionsByGroup, participantDirectory)
  return projectCurrentGroup({
    ...progress,
    participantDirectory,
    electiveSelectionsByGroup,
    updatedAt: new Date().toISOString(),
  })
}

export function clearPortalProgress(): TrainingPortalProgress {
  if (typeof window !== 'undefined') window.localStorage.removeItem(PORTAL_STORAGE_KEY)
  return createInitialPortalProgress()
}
