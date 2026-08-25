import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import { createE03DeterministicFindingDraft, createInitialE03MeasureSet } from './data'
import type {
  E03Finding,
  E03MeasurePeerJudgement,
  E03PeerReview,
  E03Progress,
} from './domain'

export function e03Hash(value: unknown) {
  const serialized = JSON.stringify(value)
  let result = 2166136261
  for (let index = 0; index < serialized.length; index += 1) {
    result ^= serialized.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

export function e03InputFingerprint(progress: Pick<E03Progress, 'source'>) {
  return e03Hash(progress.source)
}

export function e03FindingsFingerprint(findings: E03Finding[] | undefined) {
  if (!findings) return ''
  return e03Hash(findings.map((finding) => ({
    findingId: finding.findingId,
    observedFact: finding.observedFact,
    sourceReference: finding.sourceReference,
    sourceExcerpt: finding.sourceExcerpt,
    interpretationToConfirm: finding.interpretationToConfirm,
    teacherReviewed: finding.teacherReviewed,
  })))
}

export function e03MeasureFingerprint(progress: Pick<E03Progress, 'measureDraft' | 'workingMeasures'>, useWorking = false) {
  const measureSet = useWorking ? progress.workingMeasures : progress.measureDraft
  if (!measureSet) return ''
  return e03Hash({
    artifactId: measureSet.artifactId,
    participantId: measureSet.participantId,
    basedOnFindingsFingerprint: measureSet.basedOnFindingsFingerprint,
    measures: measureSet.measures,
  })
}

export class LocalE03FindingRunner {
  run(progress: Pick<E03Progress, 'source'>, participantId: string) {
    return createE03DeterministicFindingDraft(participantId, e03InputFingerprint(progress), progress.source)
  }
}

export function eligibleE03Reviewers(directory: ParticipantDirectory): TrainingParticipant[] {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!current) return []
  return directory.participants.filter((item) => item.groupId === current.groupId && item.participantId !== current.participantId)
}

function emptyPeerReview(previous: E03PeerReview): E03PeerReview {
  return {
    ...previous,
    recordId: '',
    reviewerId: '',
    reviewerGroupId: '',
    reviewerRole: undefined,
    artifactId: '',
    reviewedMeasureFingerprint: '',
    judgements: [
      { measureId: 'A01', specific: '', executable: '', observable: '', suggestion: '' },
      { measureId: 'A02', specific: '', executable: '', observable: '', suggestion: '' },
    ],
    submitted: false,
    submittedAt: undefined,
  }
}

export function applyE03FindingCorrections(progress: E03Progress, participantId: string): E03Progress {
  if (!progress.aiDraft || progress.aiDraft.participantId !== participantId) return progress
  const workingFindings = structuredClone(progress.aiDraft.findings)
  const f02 = workingFindings.find((item) => item.findingId === 'F02')
  if (f02) {
    f02.observedFact = '任务发布 2 分钟后，6 个小组中有 2 组尚未打开任务单；教师提醒后，这 2 组均打开任务单并开始操作。'
    f02.interpretationToConfirm = '2 组延迟启动可能与未理解任务单第一步有关，需在下一次课通过口述首步与启动记录进一步确认。'
  }
  return {
    ...progress,
    workingFindings,
    measureDraft: undefined,
    workingMeasures: undefined,
    peerReview: emptyPeerReview(progress.peerReview),
    revisions: [],
    teacherConfirmation: {
      sourceBoundaryConfirmed: false,
      findingsReviewedConfirmed: false,
      noRealIdentityConfirmed: false,
      noFixedLabelsConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    updatedAt: new Date().toISOString(),
  }
}

export function createE03MeasureDraft(progress: E03Progress, participantId: string): E03Progress {
  if (progress.workingFindings.length !== 3) return progress
  const findingsFingerprint = e03FindingsFingerprint(progress.workingFindings)
  return {
    ...progress,
    measureDraft: createInitialE03MeasureSet(participantId, findingsFingerprint),
    workingMeasures: undefined,
    peerReview: emptyPeerReview(progress.peerReview),
    revisions: [],
    teacherConfirmation: {
      sourceBoundaryConfirmed: false,
      findingsReviewedConfirmed: false,
      noRealIdentityConfirmed: false,
      noFixedLabelsConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    updatedAt: new Date().toISOString(),
  }
}

export function simulateE03PeerReview(progress: E03Progress, directory: ParticipantDirectory): E03PeerReview {
  const reviewer = eligibleE03Reviewers(directory).find((item) => item.participantId === progress.peerReview.reviewerId)
  const measureSet = progress.measureDraft
  const judgements: E03MeasurePeerJudgement[] = [
    {
      measureId: 'A01',
      specific: '具体',
      executable: '可执行',
      observable: '可观察',
      suggestion: '保留排序卡的时间点、全员提交要求和首次正确人数统计，能够在下一次课直接执行并检查。',
    },
    {
      measureId: 'A02',
      specific: '需调整',
      executable: '需调整',
      observable: '需调整',
      suggestion: '不要写“主动性不足”或“更积极”；请写明任务发布后的检查时点、教师逐组追问动作、6 组启动行为和启动记录表。',
    },
  ]
  return {
    ...progress.peerReview,
    recordId: `E03-PEER-${e03Hash([reviewer?.participantId, e03MeasureFingerprint(progress)])}`,
    reviewerGroupId: reviewer?.groupId ?? '',
    artifactId: measureSet?.artifactId ?? '',
    reviewedMeasureFingerprint: e03MeasureFingerprint(progress),
    judgements,
    simulated: true,
    disclosure: '当前无多人后端；复核由当前教师依据同组成员身份在本机代录，属于非实时提交，不代表真实组员在线提交。',
    submitted: false,
    submittedAt: undefined,
  }
}

export function applyE03ReferenceRevision(progress: E03Progress, participantId: string): E03Progress {
  if (!progress.measureDraft || !progress.peerReview.submitted) return progress
  const workingMeasures = structuredClone(progress.measureDraft)
  const before = progress.measureDraft.measures.find((item) => item.measureId === 'A02')
  const after = workingMeasures.measures.find((item) => item.measureId === 'A02')
  const judgement = progress.peerReview.judgements.find((item) => item.measureId === 'A02')
  if (!before || !after || !judgement) return progress
  after.implementationPhase = '下一次课任务单发布后的第 1–3 分钟'
  after.teacherAction = '任务发布 1 分钟后逐组核对任务单；对尚未启动的小组追问“第一步是什么”，并请其口述后开始操作。'
  after.observableStudentBehavior = '6 个小组均在任务发布后 2 分钟内打开任务单，并由 1 名组员口述第一步后开始操作。'
  after.checkMethod = '教师在六组启动记录表逐组勾选打开时间与口述结果；目标为 6/6 组在 2 分钟内完成启动。'
  const revisedAt = new Date().toISOString()
  const revisionBase = {
    participantId,
    measureId: 'A02' as const,
    before: structuredClone(before),
    after: structuredClone(after),
    sourcePeerReviewId: progress.peerReview.recordId,
    reviewedMeasureFingerprint: progress.peerReview.reviewedMeasureFingerprint,
    sourceSuggestion: judgement.suggestion,
    authorTreatment: '已采纳并修正' as const,
    authorBasis: '依据同组意见移除能力与态度标签，并补齐时点、教师动作、学生可观察行为和量化检查方法。',
    revisedAt,
  }
  const revision = { ...revisionBase, revisionId: `E03-REV-${e03Hash(revisionBase)}` }
  const revisions = progress.revisions.some((item) => item.revisionId === revision.revisionId)
    ? progress.revisions
    : [...progress.revisions, revision]
  return {
    ...progress,
    workingMeasures,
    revisions,
    teacherConfirmation: {
      sourceBoundaryConfirmed: false,
      findingsReviewedConfirmed: false,
      noRealIdentityConfirmed: false,
      noFixedLabelsConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    updatedAt: revisedAt,
  }
}

export function archiveE03Attempt(progress: E03Progress, reason: string) {
  if (!progress.aiDraft && !progress.measureDraft && !progress.workingMeasures && !progress.confirmedPackage) return progress.attemptHistory
  const snapshot = {
    aiDraft: progress.aiDraft,
    workingFindings: progress.workingFindings,
    measureDraft: progress.measureDraft,
    workingMeasures: progress.workingMeasures,
    peerReview: progress.peerReview,
    revisions: progress.revisions,
    confirmedPackage: progress.confirmedPackage,
  }
  const historyId = `E03-H-${e03Hash(snapshot)}`
  if (progress.attemptHistory.some((item) => item.historyId === historyId)) return progress.attemptHistory
  return [...progress.attemptHistory, {
    historyId,
    invalidatedAt: new Date().toISOString(),
    reason,
    aiDraft: progress.aiDraft ? structuredClone(progress.aiDraft) : undefined,
    workingFindings: structuredClone(progress.workingFindings),
    measureDraft: progress.measureDraft ? structuredClone(progress.measureDraft) : undefined,
    workingMeasures: progress.workingMeasures ? structuredClone(progress.workingMeasures) : undefined,
    peerReview: structuredClone(progress.peerReview),
    revisions: structuredClone(progress.revisions),
    confirmedPackage: progress.confirmedPackage ? structuredClone(progress.confirmedPackage) : undefined,
  }]
}

export function invalidateE03Confirmation(progress: E03Progress, reason: string): E03Progress {
  return {
    ...progress,
    teacherConfirmation: {
      sourceBoundaryConfirmed: false,
      findingsReviewedConfirmed: false,
      noRealIdentityConfirmed: false,
      noFixedLabelsConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    attemptHistory: archiveE03Attempt(progress, reason),
    updatedAt: new Date().toISOString(),
  }
}

export function invalidateE03ReviewContext(progress: E03Progress, reason: string): E03Progress {
  const reset = invalidateE03Confirmation(progress, reason)
  return {
    ...reset,
    workingMeasures: undefined,
    peerReview: emptyPeerReview(reset.peerReview),
    revisions: [],
  }
}

export function invalidateE03DerivedWork(progress: E03Progress, reason: string): E03Progress {
  const reset = invalidateE03ReviewContext(progress, reason)
  return {
    ...reset,
    aiDraft: undefined,
    workingFindings: [],
    measureDraft: undefined,
  }
}
