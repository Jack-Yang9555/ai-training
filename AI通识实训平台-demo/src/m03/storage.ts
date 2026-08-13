import { m03DefaultSnapshot } from './data'
import type { M03Progress } from './types'

export const M03_STORAGE_KEY = 'qijing-training-demo:m03:v2'
export const LEGACY_M03_STORAGE_KEY = 'qijing-training-demo:m03:v1'

export interface M03ProgressStore {
  version: 2
  participants: Record<string, M03Progress>
}

export function createInitialM03Progress(): M03Progress {
  return {
    version: 2,
    route: 'overview',
    designMessage: '',
    design: structuredClone(m03DefaultSnapshot),
    comparison: { changeExplanation: '', suitabilityConclusion: '' },
    verification: {
      v1: { paragraphId: '', materialEvidence: '', materialScope: '', objectiveAlignment: '', conclusion: '' },
      v2: { paragraphId: '', materialEvidence: '', materialScope: '', objectiveAlignment: '', conclusion: '' },
    },
    peerReview: {
      targetParticipantId: '', targetArtifactId: '', inputScopeClear: '', outputFormatClear: '', qualityStandardClear: '', suggestion: '', submitted: false,
    },
    assessmentModificationSummary: '',
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}

export function loadM03Store(): M03ProgressStore {
  if (typeof window === 'undefined') return { version: 2, participants: {} }
  try {
    const raw = window.localStorage.getItem(M03_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_M03_STORAGE_KEY)
    if (!raw) return { version: 2, participants: {} }
    const parsed = JSON.parse(raw) as { version?: number; participants?: Record<string, Partial<M03Progress>> }
    if (!parsed.participants) return { version: 2, participants: {} }
    if (parsed.version === 2) {
      const participants = Object.fromEntries(Object.entries(parsed.participants).map(([participantId, current]) => {
        const initial = createInitialM03Progress()
        return [participantId, {
          ...initial,
          ...current,
          designMessage: current.designMessage ?? current.v1?.compiledPrompt ?? '',
          design: { ...initial.design, ...current.design },
        } satisfies M03Progress]
      }))
      return { version: 2, participants }
    }
    const participants = Object.fromEntries(Object.entries(parsed.participants).map(([participantId, legacy]) => {
      const initial = createInitialM03Progress()
      const { qualityChecks: _legacyQualityChecks, ...legacyDesign } = (legacy.design ?? {}) as Partial<M03Progress['design']> & { qualityChecks?: string }
      return [participantId, {
        ...initial,
        design: { ...initial.design, ...legacyDesign, role: initial.design.role, qualityStandards: initial.design.qualityStandards },
        assessments: legacy.assessments ?? [],
        updatedAt: new Date().toISOString(),
      } satisfies M03Progress]
    }))
    return { version: 2, participants }
  } catch {
    return { version: 2, participants: {} }
  }
}

export function m03ProgressForParticipant(store: M03ProgressStore, participantId: string): M03Progress {
  return store.participants[participantId] ?? createInitialM03Progress()
}

export function saveM03Store(store: M03ProgressStore): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(M03_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantM03Progress(store: M03ProgressStore, participantId: string, updater: (current: M03Progress) => M03Progress): M03ProgressStore {
  const updated = { ...updater(m03ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantM03Progress(store: M03ProgressStore, participantId: string): M03ProgressStore {
  const participants = { ...store.participants }
  delete participants[participantId]
  const updated = { ...store, participants }
  saveM03Store(updated)
  return updated
}

export function clearAllM03Progress(): M03ProgressStore {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(M03_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_M03_STORAGE_KEY)
  }
  return { version: 2, participants: {} }
}
