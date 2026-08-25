import type { ParticipantDirectory } from '../training/types'
import { createInitialM11Progress } from './data'
import type { M11ConfirmedPackage, M11CoverageRef, M11M10Evidence, M11Progress } from './domain'
import { m11Hash, m11M10Fingerprint, m11PairingFingerprint, m11TestFingerprint } from './runner'
import { confirmedM11PackageIsCurrent, m11ConfirmationFingerprint, validateM11Confirmation } from './validation'

export const M11_STORAGE_KEY = 'ai-literacy-training:m11:v1'

export interface M11ProgressStore {
  version: 1
  participants: Record<string, M11Progress>
}

export function loadM11Store(): M11ProgressStore {
  if (typeof window === 'undefined') return { version: 1, participants: {} }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(M11_STORAGE_KEY) ?? '') as M11ProgressStore
    return parsed?.version === 1 && parsed.participants ? parsed : { version: 1, participants: {} }
  } catch {
    return { version: 1, participants: {} }
  }
}

export function saveM11Store(store: M11ProgressStore): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(M11_STORAGE_KEY, JSON.stringify(store))
}

export function m11ProgressForParticipant(store: M11ProgressStore, participantId: string): M11Progress {
  return store.participants[participantId] ?? createInitialM11Progress()
}

export function updateParticipantM11Progress(store: M11ProgressStore, participantId: string, updater: (current: M11Progress) => M11Progress): M11ProgressStore {
  return {
    ...store,
    participants: {
      ...store.participants,
      [participantId]: {
        ...updater(m11ProgressForParticipant(store, participantId)),
        updatedAt: new Date().toISOString(),
      },
    },
  }
}

export function clearParticipantM11Progress(store: M11ProgressStore, participantId: string): M11ProgressStore {
  const participants = { ...store.participants }
  delete participants[participantId]
  const next = { ...store, participants }
  saveM11Store(next)
  return next
}

export function clearAllM11Progress(): M11ProgressStore {
  if (typeof window !== 'undefined') window.localStorage.removeItem(M11_STORAGE_KEY)
  return { version: 1, participants: {} }
}

export function createConfirmedM11Package(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence): M11ConfirmedPackage | undefined {
  const participant = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!participant || !progress.pairing || !validateM11Confirmation(progress, directory, evidence).valid) return undefined
  const confirmationFingerprint = m11ConfirmationFingerprint(progress, directory, evidence)
  if (confirmedM11PackageIsCurrent(progress, directory, evidence)) return progress.confirmedPackage
  const packageId = `M11-PKG-${m11Hash([participant.participantId, confirmationFingerprint])}`
  const firstArtifactId = `${packageId}:five-type-test-chain`
  const secondArtifactId = `${packageId}:assistant-change-note`
  const outgoing: M11CoverageRef = {
    coverageId: `M11-COVERAGE-${progress.pairing.pairingId}-OUT`,
    direction: 'outgoing',
    testerParticipantId: progress.pairing.testerParticipantId,
    testedParticipantId: progress.pairing.testedParticipantId,
    evidenceRecordIds: progress.retest.map((item) => item.recordId),
    source: '真实本地复测记录',
    disclosure: '当前教师实际运行的 Q01—Q05 同题复测记录。',
  }
  const incoming: M11CoverageRef = {
    coverageId: `M11-COVERAGE-${progress.pairing.pairingId}-IN`,
    direction: 'incoming',
    testerParticipantId: progress.pairing.incomingTesterParticipantId,
    testedParticipantId: progress.pairing.testerParticipantId,
    evidenceRecordIds: [`M11-SIM-INCOMING-${progress.pairing.pairingId}`],
    source: '确定性模拟回传记录',
    disclosure: '无多人后端：该接受测试记录由当前配对确定性模拟回传，非同组成员实时提交。',
  }
  return {
    packageId,
    participantId: participant.participantId,
    groupId: participant.groupId,
    confirmedAt: new Date().toISOString(),
    confirmationFingerprint,
    m10Fingerprint: m11M10Fingerprint(evidence),
    pairingFingerprint: m11PairingFingerprint(progress.pairing),
    firstTestFingerprint: m11TestFingerprint(progress.firstTest),
    retestFingerprint: m11TestFingerprint(progress.retest),
    artifacts: [
      { artifactId: firstArtifactId, kind: 'm11-five-type-test-chain', name: '5 类问题的首轮答疑测试、规则修改说明与复测记录' },
      { artifactId: secondArtifactId, kind: 'm11-assistant-change-note', name: '课程助教修改说明' },
    ],
    portfolioArtifact: {
      artifactId: `${packageId}:portfolio-merged`,
      name: '学生答疑问题测试、规则修改说明与复测记录',
      mergedFromArtifactIds: [firstArtifactId, secondArtifactId],
    },
    coverageRefs: { outgoing, incoming },
  }
}
