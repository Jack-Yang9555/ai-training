import type { ParticipantDirectory } from '../training/types'
import { createInitialM08Progress } from './data'
import { currentM08Version, type M08ConfirmedWebpage, type M08Progress } from './domain'
import { renderConfirmedM08Html } from './runner'
import { m08ConfirmationFingerprint } from './validation'

export const M08_STORAGE_KEY = 'qijing-training-demo:m08:v1'
export interface M08ProgressStore { version: 1; participants: Record<string, M08Progress> }
export function loadM08Store(): M08ProgressStore { if (typeof window === 'undefined') return { version: 1, participants: {} }; try { const parsed = JSON.parse(window.localStorage.getItem(M08_STORAGE_KEY) ?? '') as M08ProgressStore; return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} } } catch { return { version: 1, participants: {} } } }
export function m08ProgressForParticipant(store: M08ProgressStore, participantId: string) { return store.participants[participantId] ?? createInitialM08Progress() }
export function saveM08Store(store: M08ProgressStore) { if (typeof window !== 'undefined') window.localStorage.setItem(M08_STORAGE_KEY, JSON.stringify(store)) }
export function updateParticipantM08Progress(store: M08ProgressStore, participantId: string, updater: (current: M08Progress) => M08Progress): M08ProgressStore { const updated = { ...updater(m08ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }; return { ...store, participants: { ...store.participants, [participantId]: updated } } }
export function clearParticipantM08Progress(store: M08ProgressStore, participantId: string) { const participants = { ...store.participants }; delete participants[participantId]; const next = { ...store, participants }; saveM08Store(next); return next }
export function clearAllM08Progress(): M08ProgressStore { if (typeof window !== 'undefined') window.localStorage.removeItem(M08_STORAGE_KEY); return { version: 1, participants: {} } }

export function createConfirmedM08Webpage(progress: M08Progress, directory: ParticipantDirectory): M08ConfirmedWebpage | undefined {
  const version = currentM08Version(progress)
  if (!version) return undefined
  return {
    webpageId: `${version.versionId}-teacher-confirmed`, confirmedAt: new Date().toISOString(), sourceVersionId: version.versionId,
    html: renderConfirmedM08Html(progress.input, version, progress.peerTest.correctionAfter), title: version.title,
    iterationRecords: structuredClone(progress.iterationRecords), browserTest: structuredClone(progress.browserTest), peerTest: structuredClone(progress.peerTest),
    confirmationFingerprint: m08ConfirmationFingerprint(progress, directory),
  }
}
