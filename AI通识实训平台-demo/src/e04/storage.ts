import type { ParticipantDirectory } from '../training/types'
import { createInitialE04Progress } from './data'
import type { E04ConfirmedPackage, E04Progress, E04RelationType } from './domain'
import { e04GraphFingerprint, e04Hash } from './runner'
import { e04ConfirmationFingerprint, validateE04Confirmation } from './validation'

export const E04_STORAGE_KEY = 'ai-literacy-training:e04:v1'
export interface E04ProgressStore { version: 1; participants: Record<string, E04Progress> }

export function loadE04Store(): E04ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(E04_STORAGE_KEY) ?? '') as E04ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function e04ProgressForParticipant(store: E04ProgressStore, participantId: string) {
  return store.participants[participantId] ?? createInitialE04Progress()
}

export function saveE04Store(store: E04ProgressStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(E04_STORAGE_KEY, JSON.stringify(store))
}

export function updateParticipantE04Progress(
  store: E04ProgressStore,
  participantId: string,
  updater: (current: E04Progress) => E04Progress,
): E04ProgressStore {
  const updated = { ...updater(e04ProgressForParticipant(store, participantId)), updatedAt: new Date().toISOString() }
  return { ...store, participants: { ...store.participants, [participantId]: updated } }
}

export function clearParticipantE04Progress(store: E04ProgressStore, participantId: string) {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveE04Store(next)
  return next
}

export function clearAllE04Progress(): E04ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(E04_STORAGE_KEY)
  return { version: 1, participants: {} }
}

const relationTypeOrder: E04RelationType[] = ['先修', '组成', '应用', '易错']

export function createConfirmedE04Package(progress: E04Progress, directory: ParticipantDirectory): E04ConfirmedPackage | undefined {
  const graph = progress.workingGraph
  if (!graph || !validateE04Confirmation(progress, directory).valid) return undefined
  const confirmationFingerprint = e04ConfirmationFingerprint(progress, directory)
  const graphFingerprint = e04GraphFingerprint(graph)
  const packageId = `E04-PKG-${e04Hash([directory.currentParticipantId, confirmationFingerprint])}`
  const relationTypes = relationTypeOrder.filter((type) => graph.relations.some((item) => item.type === type))
  return {
    packageId,
    packageVersion: 1,
    participantId: directory.currentParticipantId,
    confirmedAt: new Date().toISOString(),
    confirmationFingerprint,
    graphFingerprint,
    sourceId: progress.source.sourceId,
    sourceName: progress.source.documentName,
    sourceVersion: progress.source.version,
    graphId: graph.graphId,
    graphVersion: graph.version,
    nodeCount: graph.nodes.length,
    relationCount: graph.relations.length,
    relationTypes,
    reviewRecordId: progress.graphReview.recordId,
    revisionCount: progress.revisions.length,
    artifacts: [
      { artifactId: `${packageId}:knowledge-graph`, kind: 'e04-knowledge-graph', name: '课程知识图谱' },
      { artifactId: `${packageId}:node-relation-list`, kind: 'e04-node-relation-list', name: '节点与关系列表' },
      { artifactId: `${packageId}:revision-log`, kind: 'e04-revision-log', name: '人工修正记录' },
    ],
  }
}
