import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import { createE02DeterministicDraft } from './data'
import type {
  E02DraftPackage,
  E02ModificationRecord,
  E02PeerReview,
  E02Progress,
} from './domain'

export function e02Hash(value: unknown) {
  const text = JSON.stringify(value)
  let result = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

export function e02InputFingerprint(progress: Pick<E02Progress, 'scenario' | 'specification'>) {
  return e02Hash({ scenario: progress.scenario, specification: progress.specification })
}

export function e02DraftFingerprint(draft: E02DraftPackage | undefined) {
  if (!draft) return ''
  return e02Hash({
    participantId: draft.participantId,
    inputFingerprint: draft.inputFingerprint,
    taskBook: draft.taskBook,
    safetyChecklist: draft.safetyChecklist,
    rubric: draft.rubric,
  })
}

export function rubricScoreTotal(draft: E02DraftPackage | undefined) {
  return draft?.rubric.items.reduce((sum, item) => sum + item.score, 0) ?? 0
}

export class LocalE02DraftRunner {
  run(progress: Pick<E02Progress, 'scenario' | 'specification'>, participantId: string) {
    return createE02DeterministicDraft(participantId, e02InputFingerprint(progress), progress.scenario)
  }
}

export function eligibleE02Reviewers(directory: ParticipantDirectory): TrainingParticipant[] {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!current) return []
  return directory.participants.filter((item) => item.groupId === current.groupId && item.participantId !== current.participantId)
}

export function simulateE02PeerReview(progress: E02Progress, directory: ParticipantDirectory): E02PeerReview {
  const draft = progress.aiDraft
  const reviewer = eligibleE02Reviewers(directory).find((item) => item.participantId === progress.peerReview.reviewerId)
  const total = rubricScoreTotal(draft)
  return {
    ...progress.peerReview,
    recordId: `E02-PEER-${e02Hash([reviewer?.participantId, e02DraftFingerprint(draft)])}`,
    reviewerGroupId: reviewer?.groupId ?? '',
    taskBookId: draft?.taskBook.taskBookId ?? '',
    reviewedDraftFingerprint: e02DraftFingerprint(draft),
    sequence: '需调整',
    safety: '需调整',
    scoreTotal: total === 100 ? '准确为 100 分' : '不是 100 分',
    suggestion: '条款 4.2 的端子核对应先于条款 4.3 的接线；SAFE-02 不能只写“注意安全”；当前量规合计为 95 分，应闭合为 100 分。',
    authorTreatment: '',
    authorBasis: '',
    simulated: true,
    disclosure: '当前无多人后端；复核由当前教师依据同组成员身份在本机代录，属于非实时提交，不代表真实组员在线提交。',
    submitted: false,
    submittedAt: undefined,
  }
}

function makeModification(
  progress: E02Progress,
  participantId: string,
  input: Omit<E02ModificationRecord, 'modificationId' | 'participantId' | 'sourcePeerReviewId' | 'reviewedDraftFingerprint' | 'modifiedAt'>,
  modifiedAt: string,
): E02ModificationRecord {
  const base = {
    ...input,
    participantId,
    sourcePeerReviewId: progress.peerReview.recordId,
    reviewedDraftFingerprint: progress.peerReview.reviewedDraftFingerprint,
    modifiedAt,
  }
  return { ...base, modificationId: `E02-MOD-${e02Hash(base)}` }
}

export function applyE02ReferenceCorrections(progress: E02Progress, participantId: string): E02Progress {
  if (!progress.aiDraft) return progress
  const before = progress.workingDraft ?? progress.aiDraft
  const workingDraft = structuredClone(before)
  const s02 = workingDraft.taskBook.steps.find((item) => item.stepId === 'S02')
  const s03 = workingDraft.taskBook.steps.find((item) => item.stepId === 'S03')
  const safe02 = workingDraft.safetyChecklist.find((item) => item.safetyId === 'SAFE-02')
  const r05 = workingDraft.rubric.items.find((item) => item.rubricItemId === 'R05')
  if (s02) s02.order = 3
  if (s03) s03.order = 2
  if (safe02) {
    safe02.description = '接线必须保持设备断电；每完成一个端子立即核对线号和紧固状态，发现绝缘破损时停止操作并报告教师。'
    safe02.completionEvidence = '断电状态、线号、紧固和绝缘外观四项均有逐点勾选记录。'
  }
  if (r05) r05.score = 20
  workingDraft.taskBook.steps.forEach((item) => { item.teacherReviewed = true })
  workingDraft.safetyChecklist.forEach((item) => { item.teacherReviewed = true })
  workingDraft.rubric.items.forEach((item) => { item.teacherReviewed = true })

  const modifiedAt = new Date().toISOString()
  const changes: Array<Omit<E02ModificationRecord, 'modificationId' | 'participantId' | 'sourcePeerReviewId' | 'reviewedDraftFingerprint' | 'modifiedAt'>> = [
    { category: 'step', targetId: 'S02', field: 'order', beforeValue: String(before.taskBook.steps.find((item) => item.stepId === 'S02')?.order ?? ''), afterValue: '3', basisClauseId: '4.3', basis: '条款 4.2 的端子核对须先完成，条款 4.3 的接线随后进行。' },
    { category: 'step', targetId: 'S03', field: 'order', beforeValue: String(before.taskBook.steps.find((item) => item.stepId === 'S03')?.order ?? ''), afterValue: '2', basisClauseId: '4.2', basis: '先核对端子编号和导线标识，才能开始接线。' },
    { category: 'safety', targetId: 'SAFE-02', field: 'description', beforeValue: before.safetyChecklist.find((item) => item.safetyId === 'SAFE-02')?.description ?? '', afterValue: safe02?.description ?? '', basisClauseId: '4.3', basis: '把泛化安全提醒改成可执行、可观察并能停止操作的检查要求。' },
    { category: 'rubric', targetId: 'R05', field: 'score', beforeValue: String(before.rubric.items.find((item) => item.rubricItemId === 'R05')?.score ?? ''), afterValue: '20', basisClauseId: '4.1', basis: '补足过程记录评价项 5 分，使五项量规准确闭合为 100 分。' },
  ]
  const existing = new Set(progress.modifications.map((item) => item.modificationId))
  const modifications = changes.map((item) => makeModification(progress, participantId, item, modifiedAt))
  return {
    ...progress,
    workingDraft,
    modifications: [...progress.modifications, ...modifications.filter((item) => !existing.has(item.modificationId))],
    peerReview: {
      ...progress.peerReview,
      authorTreatment: '已采纳并修正',
      authorBasis: '已按复核意见调整操作顺序、细化安全检查，并将量规总分由 95 分修正为 100 分。',
    },
    teacherConfirmation: {
      specificationReviewedConfirmed: false,
      authorizationAndPrivacyConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    updatedAt: modifiedAt,
  }
}

export function archiveE02Attempt(progress: E02Progress, reason: string) {
  if (!progress.aiDraft && !progress.workingDraft && !progress.confirmedPackage) return progress.attemptHistory
  const snapshot = {
    aiDraft: progress.aiDraft,
    workingDraft: progress.workingDraft,
    peerReview: progress.peerReview,
    modifications: progress.modifications,
    confirmedPackage: progress.confirmedPackage,
  }
  const historyId = `E02-H-${e02Hash(snapshot)}`
  if (progress.attemptHistory.some((item) => item.historyId === historyId)) return progress.attemptHistory
  return [...progress.attemptHistory, {
    historyId,
    invalidatedAt: new Date().toISOString(),
    reason,
    aiDraft: progress.aiDraft ? structuredClone(progress.aiDraft) : undefined,
    workingDraft: progress.workingDraft ? structuredClone(progress.workingDraft) : undefined,
    peerReview: structuredClone(progress.peerReview),
    modifications: structuredClone(progress.modifications),
    confirmedPackage: progress.confirmedPackage ? structuredClone(progress.confirmedPackage) : undefined,
  }]
}

export function invalidateE02Confirmation(progress: E02Progress, reason: string): E02Progress {
  return {
    ...progress,
    teacherConfirmation: {
      specificationReviewedConfirmed: false,
      authorizationAndPrivacyConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    attemptHistory: archiveE02Attempt(progress, reason),
    updatedAt: new Date().toISOString(),
  }
}

export function invalidateE02DerivedWork(progress: E02Progress, reason: string): E02Progress {
  const reset = invalidateE02Confirmation(progress, reason)
  return {
    ...reset,
    aiDraft: undefined,
    workingDraft: undefined,
    peerReview: {
      ...reset.peerReview,
      recordId: '',
      reviewerGroupId: '',
      taskBookId: '',
      reviewedDraftFingerprint: '',
      sequence: '',
      safety: '',
      scoreTotal: '',
      suggestion: '',
      authorTreatment: '',
      authorBasis: '',
      submitted: false,
      submittedAt: undefined,
    },
    modifications: [],
  }
}
