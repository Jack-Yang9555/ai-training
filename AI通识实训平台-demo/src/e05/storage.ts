import type { ParticipantDirectory } from '../training/types'
import { createInitialE05Progress } from './data'
import type { E05ConfirmedPackage, E05CoverageStatus, E05Progress } from './domain'
import {
  e05Hash,
  e05SourceFingerprint,
  effectiveE05Mappings,
  effectiveE05Suggestions,
} from './runner'
import { e05ConfirmationFingerprint, validateE05Confirmation } from './validation'

export const E05_STORAGE_KEY = 'ai-literacy-training:e05:v1'
export interface E05ProgressStore { version: 1; participants: Record<string, E05Progress> }

export function loadE05Store(): E05ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(E05_STORAGE_KEY) ?? '') as E05ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function e05ProgressForParticipant(store: E05ProgressStore, participantId: string) {
  return store.participants[participantId] ?? createInitialE05Progress()
}

export function saveE05Store(store: E05ProgressStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(E05_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantE05Progress(
  store: E05ProgressStore,
  participantId: string,
  updater: (current: E05Progress) => E05Progress,
): E05ProgressStore {
  const updated = { ...updater(e05ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantE05Progress(store: E05ProgressStore, participantId: string) {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveE05Store(next)
  return next
}

export function clearAllE05Progress(): E05ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(E05_STORAGE_KEY)
  return { version: 1, participants: {} }
}

const statusOrder: E05CoverageStatus[] = ['已覆盖', '覆盖不足', '暂未覆盖']

export function createConfirmedE05Package(progress: E05Progress, directory: ParticipantDirectory): E05ConfirmedPackage | undefined {
  const page = progress.webPage
  const tasks = progress.jobTaskDraft?.tasks ?? []
  const mappings = effectiveE05Mappings(progress)
  const suggestions = effectiveE05Suggestions(progress)
  if (!page?.offlineTest?.passed || !validateE05Confirmation(progress, directory).valid || suggestions.length !== 3) return undefined
  const confirmationFingerprint = e05ConfirmationFingerprint(progress, directory)
  const packageId = `E05-PKG-${e05Hash([directory.currentParticipantId, confirmationFingerprint])}`
  return {
    packageId,
    packageVersion: 1,
    participantId: directory.currentParticipantId,
    confirmedAt: new Date().toISOString(),
    confirmationFingerprint,
    sourceFingerprint: e05SourceFingerprint(progress),
    jobSourceId: progress.source.jobMaterial.sourceId,
    jobSourceVersion: progress.source.jobMaterial.version,
    courseId: progress.source.course.courseId,
    courseVersion: progress.source.course.version,
    webPageId: page.webPageId,
    webPageVersion: page.version,
    webPageContentFingerprint: page.contentFingerprint,
    offlineTestId: page.offlineTest.testId,
    jobTaskCount: tasks.length,
    mappingCount: mappings.length,
    suggestionCount: 3,
    coverageStatuses: statusOrder.filter((status) => mappings.some((item) => item.status === status)),
    reviewRecordId: progress.peerReview.recordId,
    revisionCount: progress.revisions.length,
    artifacts: [
      { artifactId: `${packageId}:mapping-webpage`, kind: 'e05-mapping-webpage', name: '课程—岗位能力映射网页', filename: page.filename },
      { artifactId: `${packageId}:gap-suggestion-list`, kind: 'e05-gap-suggestion-list', name: '差距与改进建议清单' },
    ],
  }
}
