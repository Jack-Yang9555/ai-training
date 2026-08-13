import type { ParticipantDirectory } from '../training/types'
import { createInitialM07Progress } from './data'
import type { M07ConfirmedDeliverable, M07Progress } from './domain'
import { m07CurrentConfirmationFingerprint } from './validation'

export const M07_STORAGE_KEY = 'qijing-training-demo:m07:v1'
export interface M07ProgressStore { version: 1; participants: Record<string, M07Progress> }
export function loadM07Store(): M07ProgressStore { if (typeof window === 'undefined') return { version: 1, participants: {} }; try { const parsed = JSON.parse(window.localStorage.getItem(M07_STORAGE_KEY) ?? '') as M07ProgressStore; return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} } } catch { return { version: 1, participants: {} } } }
export function m07ProgressForParticipant(store: M07ProgressStore, participantId: string) { return store.participants[participantId] ?? createInitialM07Progress() }
export function saveM07Store(store: M07ProgressStore) { if (typeof window !== 'undefined') window.localStorage.setItem(M07_STORAGE_KEY, JSON.stringify(store)) }
export function updateParticipantM07Progress(store: M07ProgressStore, participantId: string, updater: (current: M07Progress) => M07Progress): M07ProgressStore { const updated = { ...updater(m07ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }; return { ...store, participants: { ...store.participants, [participantId]: updated } } }
export function clearParticipantM07Progress(store: M07ProgressStore, participantId: string) { const participants = { ...store.participants }; delete participants[participantId]; const next = { ...store, participants }; saveM07Store(next); return next }
export function clearAllM07Progress(): M07ProgressStore { if (typeof window !== 'undefined') window.localStorage.removeItem(M07_STORAGE_KEY); return { version: 1, participants: {} } }

export function createConfirmedM07Deliverable(progress: M07Progress, directory: ParticipantDirectory): M07ConfirmedDeliverable | undefined {
  if (!progress.draft || !progress.teacherConfirmation.peerDisposition) return undefined
  return {
    deliverableId: `${progress.draft.draftId}-teacher-confirmed`, confirmedAt: new Date().toISOString(), sourceDraftId: progress.draft.draftId,
    classAnalysisTitle: `${progress.input.courseName} · ${progress.input.lessonName}匿名班级学情分析`, verifiedMetrics: structuredClone(progress.draft.metrics),
    finalConclusions: structuredClone(progress.conclusionReviews), layerTasks: structuredClone(progress.layerTasks), manualChecks: structuredClone(progress.manualChecks), peerReview: structuredClone(progress.peerReview),
    confirmationFingerprint: m07CurrentConfirmationFingerprint(progress, directory),
  }
}
