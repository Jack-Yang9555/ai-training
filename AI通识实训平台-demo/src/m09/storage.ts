import type { ParticipantDirectory } from '../training/types'
import { createInitialM09Progress } from './data'
import type { M09ConfirmedKnowledgeBase, M09Progress } from './domain'
import { m09ConfirmationFingerprint, validateM09Confirmation } from './validation'

export const M09_STORAGE_KEY = 'ai-literacy-training:m09:v1'
export interface M09ProgressStore { version: 1; participants: Record<string, M09Progress> }

export function loadM09Store(): M09ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(M09_STORAGE_KEY) ?? '') as M09ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function m09ProgressForParticipant(store: M09ProgressStore, participantId: string) { return store.participants[participantId] ?? createInitialM09Progress() }
export function saveM09Store(store: M09ProgressStore) { if (typeof window !== 'undefined') window.localStorage.setItem(M09_STORAGE_KEY, JSON.stringify(store)) }
export function updateParticipantM09Progress(store: M09ProgressStore, participantId: string, updater: (current: M09Progress) => M09Progress): M09ProgressStore {
  const updated = { ...updater(m09ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}
export function clearParticipantM09Progress(store: M09ProgressStore, participantId: string) { const participants = { ...store.participants }; delete participants[participantId]; const next = { ...store, participants }; saveM09Store(next); return next }
export function clearAllM09Progress(): M09ProgressStore { if (typeof window !== 'undefined') window.localStorage.removeItem(M09_STORAGE_KEY); return { version: 1, participants: {} } }

export function createConfirmedM09KnowledgeBase(progress: M09Progress, directory: ParticipantDirectory): M09ConfirmedKnowledgeBase | undefined {
  if (!progress.knowledgeBase || !validateM09Confirmation(progress, directory).valid) return undefined
  const confirmationFingerprint = m09ConfirmationFingerprint(progress, directory)
  const confirmedAt = new Date().toISOString()
  const knowledgeBaseId = `${progress.knowledgeBase.knowledgeBaseId}-v1`
  return {
    ...structuredClone(progress.knowledgeBase),
    knowledgeBaseId,
    version: 'v1.0',
    teacherConfirmed: true,
    confirmedAt,
    confirmationFingerprint,
    sourceListArtifactId: `${knowledgeBaseId}:source-list`,
    testReportArtifactId: `${knowledgeBaseId}:nine-test-report`,
  }
}
