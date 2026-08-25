import type { ParticipantDirectory } from '../training/types'
import { createInitialE01Progress, e01AnswerIds } from './data'
import type { E01ConfirmedPackage, E01Progress } from './domain'
import { e01Hash } from './runner'
import { e01ConfirmationFingerprint, validateE01Confirmation } from './validation'

export const E01_STORAGE_KEY = 'ai-literacy-training:e01:v1'
export interface E01ProgressStore { version: 1; participants: Record<string, E01Progress> }

export function loadE01Store(): E01ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(E01_STORAGE_KEY) ?? '') as E01ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function e01ProgressForParticipant(store: E01ProgressStore, participantId: string) {
  return store.participants[participantId] ?? createInitialE01Progress()
}

export function saveE01Store(store: E01ProgressStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(E01_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantE01Progress(store: E01ProgressStore, participantId: string, updater: (current: E01Progress) => E01Progress): E01ProgressStore {
  const updated = { ...updater(e01ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantE01Progress(store: E01ProgressStore, participantId: string) {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveE01Store(next)
  return next
}

export function clearAllE01Progress(): E01ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(E01_STORAGE_KEY)
  return { version: 1, participants: {} }
}

export function createConfirmedE01Package(progress: E01Progress, directory: ParticipantDirectory): E01ConfirmedPackage | undefined {
  if (!validateE01Confirmation(progress, directory).valid) return undefined
  const confirmationFingerprint = e01ConfirmationFingerprint(progress, directory)
  const packageId = `E01-PKG-${e01Hash([directory.currentParticipantId, confirmationFingerprint])}`
  return {
    packageId,
    participantId: directory.currentParticipantId,
    confirmedAt: new Date().toISOString(),
    confirmationFingerprint,
    rubricVersion: progress.rubric.version,
    answerIds: [...e01AnswerIds],
    artifacts: [
      { artifactId: `${packageId}:rubric`, kind: 'e01-rubric', name: '评分量规' },
      { artifactId: `${packageId}:grading-feedback`, kind: 'e01-grading-feedback', name: '5 份批改结果与个性化反馈' },
    ],
  }
}
