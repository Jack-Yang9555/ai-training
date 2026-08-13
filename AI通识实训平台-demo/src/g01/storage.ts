import { g01ChecklistSeed } from './data'
import type { G01GroupContext, G01Progress, G01Store } from './types'
import { g01CurrentStatus } from './validation'

export const G01_STORAGE_KEY = 'qijing-training-demo:g01:v2'
export const LEGACY_G01_STORAGE_KEY = 'qijing-training-demo:g01:v1'

export function createEmptyG01Store(): G01Store { return { version: 2, groups: {} } }

function cloneChecklist() { return g01ChecklistSeed.map((item) => ({ ...item })) }

export function createInitialG01Progress(context: G01GroupContext): G01Progress {
  return {
    version: 2,
    groupId: context.groupId,
    groupName: context.groupName,
    rosterFingerprint: context.rosterFingerprint,
    route: 'overview',
    memberPrerequisites: context.memberPrerequisites,
    errorCorrections: context.seedErrorCorrections,
    crossChecks: context.seedCrossChecks,
    checklist: cloneChecklist(),
    contributions: context.seedContributions,
    artifacts: [],
    assessmentModificationSummary: '',
    assessments: [],
    currentStatus: '待验收',
    updatedAt: new Date().toISOString(),
  }
}

export function synchronizeG01Progress(progress: G01Progress, context: G01GroupContext): G01Progress {
  if (progress.groupId !== context.groupId || progress.rosterFingerprint !== context.rosterFingerprint) {
    const next = { ...createInitialG01Progress(context), checklist: progress.checklist.length ? progress.checklist : cloneChecklist(), assessments: progress.assessments, currentStatus: progress.assessments.length ? '需补验' as const : '待验收' as const }
    return next
  }
  const next: G01Progress = {
    ...progress,
    groupName: context.groupName,
    memberPrerequisites: context.memberPrerequisites,
    errorCorrections: context.seedErrorCorrections.map((seed) => {
      const existing = progress.errorCorrections.find((item) => item.participantId === seed.participantId)
      return existing && existing.source === seed.source && (existing.aiError.trim() || existing.teacherCorrection.trim() || existing.correctionBasis.trim()) ? existing : seed
    }),
    crossChecks: context.seedCrossChecks.map((seed) => {
      const existing = progress.crossChecks.find((item) => item.reviewerParticipantId === seed.reviewerParticipantId)
      return existing && existing.source === seed.source && (existing.targetArtifactId.trim() || existing.finding.trim()) ? existing : seed
    }),
    contributions: context.seedContributions.map((seed) => {
      const existing = progress.contributions.find((item) => item.participantId === seed.participantId)
      return existing && existing.source === seed.source && (existing.role || existing.contribution.trim()) ? existing : seed
    }),
  }
  return { ...next, currentStatus: g01CurrentStatus(next) }
}

export function g01ProgressForGroup(store: G01Store, context: G01GroupContext): G01Progress {
  const existing = store.groups[context.groupId]
  return existing ? synchronizeG01Progress(existing, context) : createInitialG01Progress(context)
}

export function updateGroupG01Progress(store: G01Store, context: G01GroupContext, updater: (progress: G01Progress) => G01Progress): G01Store {
  const current = g01ProgressForGroup(store, context)
  const next = updater(current)
  return { ...store, groups: { ...store.groups, [context.groupId]: { ...next, currentStatus: g01CurrentStatus(next), updatedAt: new Date().toISOString() } } }
}

export function clearGroupG01Progress(store: G01Store, groupId: string): G01Store {
  const groups = { ...store.groups }; delete groups[groupId]
  return { ...store, groups }
}

export function clearAllG01Progress(): G01Store {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(G01_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_G01_STORAGE_KEY)
  }
  return createEmptyG01Store()
}

export function invalidateAllG01Progress(store: G01Store, now = new Date().toISOString()): G01Store {
  return { ...store, groups: Object.fromEntries(Object.entries(store.groups).map(([groupId, progress]) => [groupId, { ...progress, rosterFingerprint: `invalidated:${now}`, memberPrerequisites: [], errorCorrections: [], crossChecks: [], contributions: [], artifacts: [], currentStatus: progress.assessments.length ? '需补验' : '待验收', updatedAt: now }])) }
}

export function loadG01Store(storage: Pick<Storage, 'getItem'> = window.localStorage): G01Store {
  try {
    const raw = JSON.parse(storage.getItem(G01_STORAGE_KEY) ?? 'null') as Partial<G01Store> | null
    if (raw?.version === 2 && raw.groups && typeof raw.groups === 'object') return raw as G01Store
    const legacy = JSON.parse(storage.getItem(LEGACY_G01_STORAGE_KEY) ?? 'null') as { version?: number; groups?: Record<string, Omit<G01Progress, 'version'>> } | null
    if (legacy?.version === 1 && legacy.groups && typeof legacy.groups === 'object') {
      return {
        version: 2,
        groups: Object.fromEntries(Object.entries(legacy.groups).map(([groupId, progress]) => [groupId, {
          ...progress,
          version: 2,
          rosterFingerprint: 'invalidated:legacy-v1-migration',
          memberPrerequisites: [],
          errorCorrections: [],
          crossChecks: [],
          contributions: [],
          artifacts: [],
          currentStatus: progress.assessments?.length ? '需补验' : '待验收',
        }])) as Record<string, G01Progress>,
      }
    }
    return createEmptyG01Store()
  } catch { return createEmptyG01Store() }
}

export function saveG01Store(store: G01Store, storage: Pick<Storage, 'setItem'> = window.localStorage): void { storage.setItem(G01_STORAGE_KEY, JSON.stringify(store)) }
