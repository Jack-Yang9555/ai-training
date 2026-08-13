import { electiveTaskIds, taskGroups } from './catalog'
import type { ElectiveAssignments, ElectiveTaskId, PortalRoute, TrainingPortalProgress, TrainingTaskId } from './types'
import { sampleCurrentParticipantId, sampleParticipants } from '../data/trainingParticipants'
import { createParticipantDirectory } from './participants'

export const PORTAL_STORAGE_KEY = 'qijing-training-demo:portal:v1'

const selectionRule = taskGroups.find((group) => group.kind === 'selection')?.selectionRule

function createEmptyAssignments(): ElectiveAssignments {
  return Object.fromEntries((selectionRule?.buckets ?? []).map((bucket) => [bucket.id, []]))
}

function normalizeAssignments(value: unknown): ElectiveAssignments {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const validIds = new Set<ElectiveTaskId>(electiveTaskIds)
  const seen = new Set<ElectiveTaskId>()
  const assignments = createEmptyAssignments()
  for (const bucket of selectionRule?.buckets ?? []) {
    const ids: unknown[] = Array.isArray(source[bucket.id]) ? source[bucket.id] as unknown[] : []
    assignments[bucket.id] = ids.filter((id): id is ElectiveTaskId => {
      if (!validIds.has(id as ElectiveTaskId) || seen.has(id as ElectiveTaskId)) return false
      seen.add(id as ElectiveTaskId)
      return true
    })
  }
  return assignments
}

function migrateLegacySelection(ids: ElectiveTaskId[] = []): ElectiveAssignments {
  const assignments = createEmptyAssignments()
  ;(selectionRule?.buckets ?? []).forEach((bucket, index) => {
    if (ids[index]) assignments[bucket.id] = [ids[index]]
  })
  return assignments
}

export function selectedElectiveIds(assignments: ElectiveAssignments): ElectiveTaskId[] {
  return (selectionRule?.buckets ?? []).flatMap((bucket) => assignments[bucket.id] ?? [])
}

export function createInitialPortalProgress(): TrainingPortalProgress {
  const participantDirectory = createParticipantDirectory(sampleParticipants, '内置示例名单.csv')
  participantDirectory.currentParticipantId = sampleCurrentParticipantId
  return { version: 3, route: { page: 'dashboard' }, electiveAssignments: createEmptyAssignments(), participantDirectory, updatedAt: new Date().toISOString() }
}

export function loadPortalProgress(): TrainingPortalProgress {
  if (typeof window === 'undefined') return createInitialPortalProgress()
  try {
    const raw = JSON.parse(window.localStorage.getItem(PORTAL_STORAGE_KEY) ?? '') as {
      version?: number
      route?: { page?: string; dayId?: number; groupId?: string; focusElectiveSlot?: number; focusElectiveBucketId?: string; taskId?: TrainingTaskId }
      selectedElectiveIds?: ElectiveTaskId[]
      electiveAssignments?: ElectiveAssignments
      participantDirectory?: TrainingPortalProgress['participantDirectory']
      updatedAt?: string
    }
    if (!raw.route?.page) return createInitialPortalProgress()
    const electiveAssignments = raw.version === 2 || raw.version === 3
      ? normalizeAssignments(raw.electiveAssignments)
      : migrateLegacySelection(raw.selectedElectiveIds)
    const participantDirectory = raw.version === 3 && raw.participantDirectory?.participants?.length
      ? raw.participantDirectory
      : createInitialPortalProgress().participantDirectory
    let route: PortalRoute
    if (raw.route.page === 'day') route = { page: 'tasks', groupId: raw.route.dayId ? `day-${raw.route.dayId}` : undefined }
    else if (raw.route.page === 'electives') route = { page: 'tasks', groupId: 'elective-pool' }
    else if (raw.route.page === 'tasks') route = {
      page: 'tasks',
      groupId: raw.route.groupId,
      focusElectiveBucketId: raw.route.focusElectiveBucketId ?? (raw.route.focusElectiveSlot ? `day-${raw.route.focusElectiveSlot + 1}` : undefined),
    }
    else if (raw.route.page === 'task' && raw.route.taskId) route = { page: 'task', taskId: raw.route.taskId }
    else if (raw.route.page === 'portfolio') route = { page: 'portfolio' }
    else if (raw.route.page === 'participants') route = { page: 'participants' }
    else route = { page: 'dashboard' }
    return { version: 3, electiveAssignments, participantDirectory, updatedAt: raw.updatedAt ?? new Date().toISOString(), route }
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

export function updateElectiveAssignments(progress: TrainingPortalProgress, assignments: ElectiveAssignments): TrainingPortalProgress {
  return { ...progress, electiveAssignments: normalizeAssignments(assignments), updatedAt: new Date().toISOString() }
}

export function updateParticipantDirectory(progress: TrainingPortalProgress, participantDirectory: TrainingPortalProgress['participantDirectory']): TrainingPortalProgress {
  return { ...progress, participantDirectory, updatedAt: new Date().toISOString() }
}

export function clearPortalProgress(): TrainingPortalProgress {
  if (typeof window !== 'undefined') window.localStorage.removeItem(PORTAL_STORAGE_KEY)
  return createInitialPortalProgress()
}
