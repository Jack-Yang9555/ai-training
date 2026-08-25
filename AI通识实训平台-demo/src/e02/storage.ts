import type { ParticipantDirectory } from '../training/types'
import { createInitialE02Progress } from './data'
import type { E02ConfirmedPackage, E02Progress } from './domain'
import { e02Hash, rubricScoreTotal } from './runner'
import { e02ConfirmationFingerprint, validateE02Confirmation } from './validation'

export const E02_STORAGE_KEY = 'ai-literacy-training:e02:v1'
export interface E02ProgressStore { version: 1; participants: Record<string, E02Progress> }

export function loadE02Store(): E02ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(E02_STORAGE_KEY) ?? '') as E02ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function e02ProgressForParticipant(store: E02ProgressStore, participantId: string) {
  return store.participants[participantId] ?? createInitialE02Progress()
}

export function saveE02Store(store: E02ProgressStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(E02_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantE02Progress(
  store: E02ProgressStore,
  participantId: string,
  updater: (current: E02Progress) => E02Progress,
): E02ProgressStore {
  const updated = { ...updater(e02ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantE02Progress(store: E02ProgressStore, participantId: string) {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveE02Store(next)
  return next
}

export function clearAllE02Progress(): E02ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(E02_STORAGE_KEY)
  return { version: 1, participants: {} }
}

export function createConfirmedE02Package(progress: E02Progress, directory: ParticipantDirectory): E02ConfirmedPackage | undefined {
  const draft = progress.workingDraft
  if (!draft || !validateE02Confirmation(progress, directory).valid || rubricScoreTotal(draft) !== 100) return undefined
  const confirmationFingerprint = e02ConfirmationFingerprint(progress, directory)
  const packageId = `E02-PKG-${e02Hash([directory.currentParticipantId, confirmationFingerprint])}`
  return {
    packageId,
    participantId: directory.currentParticipantId,
    confirmedAt: new Date().toISOString(),
    confirmationFingerprint,
    specificationName: progress.specification.name,
    specificationVersion: progress.specification.version,
    taskBookId: draft.taskBook.taskBookId,
    rubricTotal: 100,
    artifacts: [
      { artifactId: `${packageId}:task-book`, kind: 'e02-task-book', name: '实训任务书' },
      { artifactId: `${packageId}:safety-checklist`, kind: 'e02-safety-checklist', name: '安全检查单' },
      { artifactId: `${packageId}:rubric`, kind: 'e02-rubric', name: '100 分评分量规' },
    ],
  }
}
