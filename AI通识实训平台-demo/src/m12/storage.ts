import type { ParticipantDirectory } from '../training/types'
import { createInitialM12Progress } from './data'
import type { M12ConfirmedBundle, M12Progress } from './domain'
import { m12ContentFingerprint, validateM12TeacherConfirmation } from './validation'

export const M12_STORAGE_KEY = 'ai-literacy-training:m12:v1'
export interface M12ProgressStore { version: 1; participants: Record<string, M12Progress> }

export function loadM12Store(): M12ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(M12_STORAGE_KEY) ?? '') as M12ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function m12ProgressForParticipant(store: M12ProgressStore, participantId: string) { return store.participants[participantId] ?? createInitialM12Progress() }
export function saveM12Store(store: M12ProgressStore) { if (typeof window !== 'undefined') window.localStorage.setItem(M12_STORAGE_KEY, JSON.stringify(store)) }
export function updateParticipantM12Progress(store: M12ProgressStore, participantId: string, updater: (current: M12Progress) => M12Progress): M12ProgressStore {
  const updated = { ...updater(m12ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}
export function clearParticipantM12Progress(store: M12ProgressStore, participantId: string) { const participants = { ...store.participants }; delete participants[participantId]; const next = { ...store, participants }; saveM12Store(next); return next }
export function clearAllM12Progress(): M12ProgressStore { if (typeof window !== 'undefined') window.localStorage.removeItem(M12_STORAGE_KEY); return { version: 1, participants: {} } }

export function createConfirmedM12Bundle(progress: M12Progress, participantId: string, directory: ParticipantDirectory): M12ConfirmedBundle | undefined {
  if (progress.mode !== 'official' || !validateM12TeacherConfirmation(progress, participantId, directory).valid) return undefined
  const confirmedAt = new Date().toISOString()
  const bundleId = `M12-BUNDLE-${participantId}-${Date.now()}`
  return {
    bundleId,
    participantId,
    contentFingerprint: m12ContentFingerprint(progress, directory),
    confirmedAt,
    evidenceSnapshotArtifactId: `${bundleId}:ten-evidence-snapshot`,
    directoryArtifactId: `${bundleId}:directory`,
    usageArtifactId: `${bundleId}:usage`,
    revisionArtifactId: `${bundleId}:revision`,
  }
}
