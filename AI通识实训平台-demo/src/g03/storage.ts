import type { G03GroupContext, G03Progress, G03Store } from './domain'
import { g03CurrentStatus } from './validation'

export const G03_STORAGE_KEY = 'ai-literacy-training:g03:v1'

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

export function createEmptyG03Store(): G03Store { return { version: 1, groups: {} } }

export function createInitialG03Progress(context: G03GroupContext): G03Progress {
  return {
    version: 1,
    groupId: context.groupId,
    groupName: context.groupName,
    currentParticipantId: context.currentParticipantId,
    rosterFingerprint: context.rosterFingerprint,
    evidenceFingerprint: context.evidenceFingerprint,
    scheduleFingerprint: context.scheduleFingerprint,
    route: 'overview',
    memberEvidence: clone(context.memberEvidence),
    testMatrix: clone(context.testMatrix),
    matrixConfirmed: false,
    issues: clone(context.issues),
    reportConfirmed: false,
    scenarios: clone(context.scenarios),
    showcase: clone(context.showcase),
    contributions: clone(context.contributions),
    assessmentModificationSummary: '',
    assessments: [],
    artifacts: [],
    currentStatus: '待验收',
    updatedAt: new Date().toISOString(),
  }
}

export function synchronizeG03Progress(progress: G03Progress, context: G03GroupContext): G03Progress {
  const sourceChanged = progress.groupId !== context.groupId
    || progress.currentParticipantId !== context.currentParticipantId
    || progress.rosterFingerprint !== context.rosterFingerprint
    || progress.evidenceFingerprint !== context.evidenceFingerprint
    || progress.scheduleFingerprint !== context.scheduleFingerprint
  if (sourceChanged) {
    const fresh = createInitialG03Progress(context)
    return {
      ...fresh,
      assessments: progress.assessments,
      currentStatus: progress.assessments.length ? '需补验' : '待验收',
    }
  }
  return { ...progress, groupName: context.groupName, currentStatus: g03CurrentStatus(progress) }
}

export function g03ProgressForGroup(store: G03Store, context: G03GroupContext) {
  const existing = store.groups[context.groupId]
  return existing ? synchronizeG03Progress(existing, context) : createInitialG03Progress(context)
}

export function updateGroupG03Progress(store: G03Store, context: G03GroupContext, updater: (progress: G03Progress) => G03Progress): G03Store {
  const next = updater(g03ProgressForGroup(store, context))
  const updated = { ...next, currentStatus: g03CurrentStatus(next), updatedAt: new Date().toISOString() }
  return { ...store, groups: { ...store.groups, [context.groupId]: updated } }
}

export function clearGroupG03Progress(store: G03Store, groupId: string): G03Store {
  const groups = { ...store.groups }
  delete groups[groupId]
  return { ...store, groups }
}

export function invalidateAllG03Progress(store: G03Store, now = new Date().toISOString()): G03Store {
  return {
    ...store,
    groups: Object.fromEntries(Object.entries(store.groups).map(([groupId, progress]) => [groupId, {
      ...progress,
      rosterFingerprint: `invalidated:${now}`,
      evidenceFingerprint: `invalidated:${now}`,
      scheduleFingerprint: `invalidated:${now}`,
      memberEvidence: [],
      testMatrix: [],
      artifacts: [],
      currentStatus: progress.assessments.length ? '需补验' : '待验收',
      updatedAt: now,
    }])) as Record<string, G03Progress>,
  }
}

export function clearAllG03Progress(storage?: Pick<Storage, 'removeItem'>) {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  target?.removeItem(G03_STORAGE_KEY)
  return createEmptyG03Store()
}

export function loadG03Store(storage?: Pick<Storage, 'getItem'>): G03Store {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  if (!target) return createEmptyG03Store()
  try {
    const parsed = JSON.parse(target.getItem(G03_STORAGE_KEY) ?? 'null') as G03Store | null
    return parsed?.version === 1 && parsed.groups ? parsed : createEmptyG03Store()
  } catch {
    return createEmptyG03Store()
  }
}

export function saveG03Store(store: G03Store, storage?: Pick<Storage, 'setItem'>) {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  target?.setItem(G03_STORAGE_KEY, JSON.stringify(store))
}
