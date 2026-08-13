import type { ParticipantDirectory } from '../training/types'
import { createInitialM06Progress } from './data'
import { applyM06DeckModification, type M06ConfirmedPackage, type M06Progress } from './domain'
import { m06ConfirmationFingerprint } from './validation'

export const M06_STORAGE_KEY = 'qijing-training-demo:m06:v1'
export interface M06ProgressStore { version: 1; participants: Record<string, M06Progress> }

export function loadM06Store(): M06ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(M06_STORAGE_KEY) ?? '') as M06ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function m06ProgressForParticipant(store: M06ProgressStore, participantId: string) {
  return store.participants[participantId] ?? createInitialM06Progress()
}

export function saveM06Store(store: M06ProgressStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(M06_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantM06Progress(store: M06ProgressStore, participantId: string, updater: (current: M06Progress) => M06Progress): M06ProgressStore {
  const updated = { ...updater(m06ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantM06Progress(store: M06ProgressStore, participantId: string) {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveM06Store(next)
  return next
}

export function clearAllM06Progress(): M06ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(M06_STORAGE_KEY)
  return { version: 1, participants: {} }
}

export function createConfirmedM06Package(progress: M06Progress, directory: ParticipantDirectory): M06ConfirmedPackage | undefined {
  if (!progress.draft || !progress.videoPreview || !progress.teacherConfirmation.peerDisposition) return undefined
  return {
    packageId: `${progress.draft.draftId}-teacher-confirmed`,
    confirmedAt: new Date().toISOString(),
    sourceDraftId: progress.draft.draftId,
    finalDeck: applyM06DeckModification(progress.draft, progress.deckAudit),
    finalNarration: progress.narrationReview.revisedNarration.trim(),
    avatarConfig: structuredClone(progress.avatarConfig),
    video: structuredClone(progress.videoPreview),
    modificationRecord: {
      slideId: progress.deckAudit.modifiedSlideId,
      field: progress.deckAudit.modifiedField,
      before: progress.deckAudit.originalContent,
      after: progress.deckAudit.revisedContent.trim(),
      basis: progress.deckAudit.modificationBasis.trim(),
    },
    confirmationFingerprint: m06ConfirmationFingerprint(progress, directory),
  }
}
