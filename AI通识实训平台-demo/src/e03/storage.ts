import type { ParticipantDirectory } from '../training/types'
import { createInitialE03Progress } from './data'
import type { E03ConfirmedPackage, E03Progress } from './domain'
import { e03FindingsFingerprint, e03Hash, e03MeasureFingerprint } from './runner'
import { e03ConfirmationFingerprint, validateE03Confirmation } from './validation'

export const E03_STORAGE_KEY = 'ai-literacy-training:e03:v1'
export interface E03ProgressStore { version: 1; participants: Record<string, E03Progress> }

export function loadE03Store(): E03ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(E03_STORAGE_KEY) ?? '') as E03ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function e03ProgressForParticipant(store: E03ProgressStore, participantId: string) {
  return store.participants[participantId] ?? createInitialE03Progress()
}

export function saveE03Store(store: E03ProgressStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(E03_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantE03Progress(
  store: E03ProgressStore,
  participantId: string,
  updater: (current: E03Progress) => E03Progress,
): E03ProgressStore {
  const updated = { ...updater(e03ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantE03Progress(store: E03ProgressStore, participantId: string) {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveE03Store(next)
  return next
}

export function clearAllE03Progress(): E03ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(E03_STORAGE_KEY)
  return { version: 1, participants: {} }
}

export function createConfirmedE03Package(
  progress: E03Progress,
  directory: ParticipantDirectory,
): E03ConfirmedPackage | undefined {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!current || !progress.workingMeasures || !validateE03Confirmation(progress, directory).valid) return undefined
  const confirmationFingerprint = e03ConfirmationFingerprint(progress, directory)
  const packageId = `E03-PKG-${e03Hash([directory.currentParticipantId, confirmationFingerprint])}`
  return {
    packageId,
    participantId: directory.currentParticipantId,
    participantName: current.name,
    groupId: current.groupId,
    groupName: current.groupName,
    confirmedAt: new Date().toISOString(),
    confirmationFingerprint,
    sourceId: progress.source.sourceId,
    sourceName: progress.source.sourceName,
    sourceVersion: progress.source.version,
    teachingGoal: progress.source.teachingGoal,
    classroomActivities: progress.source.classroomActivities,
    assessmentResults: progress.source.assessmentResults,
    findingsFingerprint: e03FindingsFingerprint(progress.workingFindings),
    measuresFingerprint: e03MeasureFingerprint(progress, true),
    artifactVersion: '1.0',
    findingIds: ['F01', 'F02', 'F03'],
    measureIds: ['A01', 'A02'],
    findings: structuredClone(progress.workingFindings),
    measures: structuredClone(progress.workingMeasures.measures),
    peerReview: structuredClone(progress.peerReview),
    revisions: structuredClone(progress.revisions),
    teacherConfirmation: structuredClone(progress.teacherConfirmation),
    artifacts: [
      {
        artifactId: `${packageId}:reflection-record`,
        kind: 'e03-reflection-record',
        name: '教学反思或评课记录',
        version: '1.0',
      },
      {
        artifactId: `${packageId}:improvement-measures`,
        kind: 'e03-improvement-measures',
        name: '下一次课改进清单',
        version: '1.0',
      },
    ],
  }
}
