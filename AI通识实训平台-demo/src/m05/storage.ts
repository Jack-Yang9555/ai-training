import { m05DefaultInput } from './data'
import type { ParticipantDirectory } from '../training/types'
import type { M05ConfirmedPackage, M05Progress } from './types'
import { m05ConfirmationFingerprint } from './validation'

export const M05_STORAGE_KEY = 'qijing-training-demo:m05:v1'
export interface M05ProgressStore { version: 1; participants: Record<string, M05Progress> }

export function createInitialM05Progress(): M05Progress {
  return {
    version: 1, route: 'overview', input: structuredClone(m05DefaultInput), audits: {}, revisions: [],
    peerReview: { targetParticipantId: '', targetArtifactId: '', targetQuestionId: '', answerCorrectness: '', materialEvidence: '', objectiveAlignment: '', difficultySuitability: '', suggestion: '', submitted: false },
    confirmation: { peerDisposition: '', peerResponse: '', answerConfirmed: false, rubricConfirmed: false, safetyConfirmed: false },
    assessmentModificationSummary: '', assessments: [], updatedAt: new Date().toISOString(),
  }
}

export function loadM05Store(): M05ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try { const parsed = JSON.parse(window.localStorage.getItem(M05_STORAGE_KEY) ?? '') as M05ProgressStore; return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} } } catch { return { version: 1, participants: {} } }
}
export function m05ProgressForParticipant(store: M05ProgressStore, participantId: string): M05Progress { return store.participants[participantId] ?? createInitialM05Progress() }
export function saveM05Store(store: M05ProgressStore): void { if (typeof window !== 'undefined') window.localStorage.setItem(M05_STORAGE_KEY, JSON.stringify(store)) }
export function updateParticipantM05Progress(store: M05ProgressStore, participantId: string, updater: (current: M05Progress) => M05Progress): M05ProgressStore {
  const updated = { ...updater(m05ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}
export function clearParticipantM05Progress(store: M05ProgressStore, participantId: string): M05ProgressStore { const participants = { ...store.participants }; delete participants[participantId]; const next = { ...store, participants }; saveM05Store(next); return next }
export function clearAllM05Progress(): M05ProgressStore { if (typeof window !== 'undefined') window.localStorage.removeItem(M05_STORAGE_KEY); return { version: 1, participants: {} } }

export function createConfirmedM05Package(progress: M05Progress, directory: ParticipantDirectory): M05ConfirmedPackage | undefined {
  if (!progress.draft || !progress.confirmation.peerDisposition) return undefined
  const questions = progress.draft.questions.map((question) => {
    const revision = progress.revisions.find((item) => item.questionId === question.id)
    return revision ? { ...question, stem: revision.revisedContent.trim() } : question
  })
  return { ...structuredClone(progress.draft), packageId: `${progress.draft.packageId}-teacher-confirmed`, questions, sourceDraftId: progress.draft.packageId, confirmedAt: new Date().toISOString(), confirmationFingerprint: m05ConfirmationFingerprint(progress, directory), appliedRevisions: structuredClone(progress.revisions), peerDisposition: progress.confirmation.peerDisposition, peerResponse: progress.confirmation.peerResponse.trim() }
}
