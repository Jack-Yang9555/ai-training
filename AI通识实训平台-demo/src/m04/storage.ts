import { createInitialM04Audit, lessonPlanSections, m04DefaultInput } from './data'
import type { ParticipantDirectory } from '../training/types'
import type { M04ConfirmedPlan, M04Progress } from './types'
import { m04ConfirmationFingerprint } from './validation'

export const M04_STORAGE_KEY = 'qijing-training-demo:m04:v1'

export interface M04ProgressStore { version: 1; participants: Record<string, M04Progress> }

export function createInitialM04Progress(): M04Progress {
  return {
    version: 1, route: 'overview', input: structuredClone(m04DefaultInput), audit: createInitialM04Audit(),
    peerReview: { targetParticipantId: '', targetArtifactId: '', overallImplementability: '', objectiveActivityAssessment: '', objectiveObservable: '', activityFeasible: '', differentiatedSupport: '', suggestion: '', submitted: false },
    confirmation: { peerDisposition: '', peerResponse: '', professionalConfirmed: false, implementationConfirmed: false, safetyConfirmed: false },
    assessmentModificationSummary: '', assessments: [], updatedAt: new Date().toISOString(),
  }
}

export function loadM04Store(): M04ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(M04_STORAGE_KEY) ?? '') as M04ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch { return { version: 1, participants: {} } }
}

export function m04ProgressForParticipant(store: M04ProgressStore, participantId: string): M04Progress { return store.participants[participantId] ?? createInitialM04Progress() }
export function saveM04Store(store: M04ProgressStore): void { if (typeof window !== 'undefined') window.localStorage.setItem(M04_STORAGE_KEY, JSON.stringify(store)) }
export function updateParticipantM04Progress(store: M04ProgressStore, participantId: string, updater: (current: M04Progress) => M04Progress): M04ProgressStore {
  const updated = { ...updater(m04ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}
export function clearParticipantM04Progress(store: M04ProgressStore, participantId: string): M04ProgressStore {
  const participants = { ...store.participants }; delete participants[participantId]
  const updated = { ...store, participants }; saveM04Store(updated); return updated
}
export function clearAllM04Progress(): M04ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(M04_STORAGE_KEY)
  return { version: 1, participants: {} }
}

export function createConfirmedM04Plan(progress: M04Progress, directory: ParticipantDirectory): M04ConfirmedPlan | undefined {
  if (!progress.draft || !progress.confirmation.peerDisposition) return undefined
  const revisedSections = progress.draft.sections.map((section) => {
    const correction = Object.values(progress.audit.corrections).find((item) => item.sectionId === section.id)
    return correction ? { ...section, content: correction.revisedContent.trim() } : section
  })
  return {
    ...structuredClone(progress.draft), planId: `${progress.draft.planId}-teacher-confirmed`,
    sections: revisedSections.length > 0 ? revisedSections : lessonPlanSections(progress.draft),
    confirmedAt: new Date().toISOString(), sourceDraftId: progress.draft.planId,
    confirmationFingerprint: m04ConfirmationFingerprint(progress, directory),
    appliedCorrections: Object.values(progress.audit.corrections).map((item) => structuredClone(item)),
    peerDisposition: progress.confirmation.peerDisposition, peerResponse: progress.confirmation.peerResponse.trim(),
  }
}
