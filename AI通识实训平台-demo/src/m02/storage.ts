import type { M02Progress, M02RatingDimension } from './types'

export const M02_STORAGE_KEY = 'qijing-training-demo:m02:v3'
export const LEGACY_M02_STORAGE_KEY = 'qijing-training-demo:m02:v2'
export const EARLIEST_M02_STORAGE_KEY = 'qijing-training-demo:m02:v1'

export interface M02ProgressStore {
  version: 3
  participants: Record<string, M02Progress>
}

interface LegacyM02SelectionReason {
  dimension?: M02RatingDimension
  comparedModelId?: M02Progress['selectedModelId']
  reason?: string
}

type LegacyM02Progress = Omit<M02Progress, 'version' | 'selectionDecision' | 'route'> & {
  version?: 1 | 2
  route: M02Progress['route'] | 'selection'
  selectionReasons?: LegacyM02SelectionReason[]
  selectionDecision?: M02Progress['selectionDecision']
}

function normalizeProgress(progress: LegacyM02Progress): M02Progress {
  const { selectionReasons: legacySelectionReasons, ...currentProgress } = progress
  const legacyReasons = Array.isArray(legacySelectionReasons) ? legacySelectionReasons : []
  const evidenceDimensions = progress.selectionDecision?.evidenceDimensions ?? legacyReasons
    .map((item) => item.dimension)
    .filter((item, index, values): item is M02RatingDimension => Boolean(item) && values.indexOf(item) === index)
    .slice(0, 2)
  const selectedModelId = currentProgress.selectedModelId === 'A' || currentProgress.selectedModelId === 'B' ? currentProgress.selectedModelId : undefined
  const run = currentProgress.run ? {
    ...currentProgress.run,
    results: { A: currentProgress.run.results.A, B: currentProgress.run.results.B },
  } : undefined
  return {
    ...currentProgress,
    version: 3,
    route: currentProgress.route === 'selection' ? 'rating' : currentProgress.route,
    run,
    compliance: { A: currentProgress.compliance?.A, B: currentProgress.compliance?.B },
    ratings: { A: currentProgress.ratings?.A, B: currentProgress.ratings?.B },
    revealedModelNames: { A: currentProgress.revealedModelNames?.A, B: currentProgress.revealedModelNames?.B },
    selectedModelId,
    selectionDecision: {
      evidenceDimensions: selectedModelId ? evidenceDimensions : [],
      comparedModelId: selectedModelId === 'A' ? 'B' : selectedModelId === 'B' ? 'A' : undefined,
      conclusion: selectedModelId ? progress.selectionDecision?.conclusion ?? legacyReasons.map((item) => item.reason?.trim()).filter(Boolean).join('；') : '',
    },
    correction: selectedModelId ? currentProgress.correction : { paragraphId: '', revisedContent: '', reason: '' },
    peerReview: { ...currentProgress.peerReview, submitted: selectedModelId ? currentProgress.peerReview.submitted : false },
    groupConclusion: {
      ...currentProgress.groupConclusion,
      selectedModelId: currentProgress.groupConclusion.selectedModelId === 'A' || currentProgress.groupConclusion.selectedModelId === 'B'
        ? currentProgress.groupConclusion.selectedModelId
        : undefined,
    },
  }
}

function normalizeStore(value: unknown): M02ProgressStore | undefined {
  if (!value || typeof value !== 'object') return undefined
  const parsed = value as { participants?: Record<string, LegacyM02Progress> }
  if (!parsed.participants) return undefined
  return { version: 3, participants: Object.fromEntries(Object.entries(parsed.participants).map(([participantId, progress]) => [participantId, normalizeProgress(progress)])) }
}

export function createInitialM02Progress(): M02Progress {
  return {
    version: 3,
    route: 'overview',
    compliance: {},
    ratings: {},
    blindReviewSubmitted: false,
    revealedModelNames: {},
    selectionDecision: { evidenceDimensions: [], conclusion: '' },
    correction: { paragraphId: '', revisedContent: '', reason: '' },
    peerReview: {
      targetParticipantId: '', targetArtifactId: '', scoringConsistent: '',
      reasonEvidenceSufficient: '', modelChoiceReasonable: '',
      scoreDifferenceReason: '', suggestion: '', submitted: false,
    },
    groupConclusion: { selectionReason: '', differenceExplanation: '', correctionConsensus: '' },
    updatedAt: new Date().toISOString(),
  }
}

export function loadM02Store(): M02ProgressStore {
  if (typeof window === 'undefined') return { version: 3, participants: {} }
  try {
    const current = window.localStorage.getItem(M02_STORAGE_KEY)
    if (current) return normalizeStore(JSON.parse(current)) ?? { version: 3, participants: {} }
    const legacy = window.localStorage.getItem(LEGACY_M02_STORAGE_KEY)
    if (legacy) return normalizeStore(JSON.parse(legacy)) ?? { version: 3, participants: {} }
    const earliest = window.localStorage.getItem(EARLIEST_M02_STORAGE_KEY)
    return earliest ? normalizeStore(JSON.parse(earliest)) ?? { version: 3, participants: {} } : { version: 3, participants: {} }
  } catch {
    return { version: 3, participants: {} }
  }
}

export function progressForParticipant(store: M02ProgressStore, participantId: string): M02Progress {
  return store.participants[participantId] ?? createInitialM02Progress()
}

export function saveM02Store(store: M02ProgressStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(M02_STORAGE_KEY, JSON.stringify(store))
  window.localStorage.removeItem(LEGACY_M02_STORAGE_KEY)
  window.localStorage.removeItem(EARLIEST_M02_STORAGE_KEY)
}

export function updateParticipantM02Progress(
  store: M02ProgressStore,
  participantId: string,
  updater: (current: M02Progress) => M02Progress,
): M02ProgressStore {
  const updated = { ...updater(progressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantM02Progress(store: M02ProgressStore, participantId: string): M02ProgressStore {
  const participants = { ...store.participants }
  delete participants[participantId]
  const updated = { ...store, participants }
  saveM02Store(updated)
  return updated
}

export function clearAllM02Progress(): M02ProgressStore {
  const store: M02ProgressStore = { version: 3, participants: {} }
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(M02_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_M02_STORAGE_KEY)
    window.localStorage.removeItem(EARLIEST_M02_STORAGE_KEY)
  }
  return store
}
