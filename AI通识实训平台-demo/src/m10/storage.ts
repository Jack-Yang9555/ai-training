import type { ParticipantDirectory } from '../training/types'
import { createInitialM10Progress } from './data'
import type { M10ConfirmedAssistant, M10Progress } from './domain'
import { m10Hash } from './runner'
import { m10ConfirmationFingerprint, validateM10Confirmation } from './validation'

export const M10_STORAGE_KEY = 'ai-literacy-training:m10:v1'
export interface M10ProgressStore { version: 1; participants: Record<string, M10Progress> }

export function loadM10Store(): M10ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(M10_STORAGE_KEY) ?? '') as M10ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function m10ProgressForParticipant(store: M10ProgressStore, participantId: string) {
  return store.participants[participantId] ?? createInitialM10Progress()
}

export function saveM10Store(store: M10ProgressStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(M10_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantM10Progress(store: M10ProgressStore, participantId: string, updater: (current: M10Progress) => M10Progress): M10ProgressStore {
  const updated = { ...updater(m10ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantM10Progress(store: M10ProgressStore, participantId: string) {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveM10Store(next)
  return next
}

export function clearAllM10Progress(): M10ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(M10_STORAGE_KEY)
  return { version: 1, participants: {} }
}

export function createConfirmedM10Assistant(progress: M10Progress, directory: ParticipantDirectory): M10ConfirmedAssistant | undefined {
  if (!progress.knowledgeSource || !validateM10Confirmation(progress, directory).valid) return undefined
  const confirmationFingerprint = m10ConfirmationFingerprint(progress, directory)
  if (progress.confirmedAssistant?.confirmationFingerprint === confirmationFingerprint) return progress.confirmedAssistant
  const confirmedAt = new Date().toISOString()
  const assistantId = `M10-A-${directory.currentParticipantId}-${m10Hash([progress.knowledgeSource.knowledgeBaseId, confirmationFingerprint])}`
  return {
    assistantId,
    participantId: directory.currentParticipantId,
    version: 'v1.0',
    source: structuredClone(progress.knowledgeSource),
    sixElements: structuredClone(progress.sixElements),
    flowSteps: structuredClone(progress.flowSteps),
    boundaryRules: structuredClone(progress.boundaryRules),
    previews: structuredClone(progress.previews),
    peerReviewId: progress.peerReview.reviewId,
    revisionIds: progress.revisions.map((item) => item.revisionId),
    teacherConfirmed: true,
    confirmedAt,
    confirmationFingerprint,
    artifacts: [
      { artifactId: `${assistantId}:assistant-v1`, kind: 'course-assistant-v1', name: '课程 AI 助教 v1.0', version: 'v1.0' },
      { artifactId: `${assistantId}:configuration-evidence`, kind: 'configuration-evidence', name: '六要素配置表、边界规则清单和配置修改记录', version: 'v1.0' },
    ],
    personalPortfolioSlot: '课程 AI 助教',
  }
}
