import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import { createE06Draft } from './data'
import type { E06Comparison, E06PeerReview, E06Progress, E06Revision } from './domain'

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
  return value
}
export function e06Hash(value: unknown) { const input = JSON.stringify(canonical(value)); let hash = 2166136261; for (let i = 0; i < input.length; i += 1) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619) } return (hash >>> 0).toString(36).toUpperCase() }
export function e06InputFingerprint(progress: Pick<E06Progress, 'source'>) { return e06Hash(progress.source) }
export function e06LiteratureFingerprint(progress: Pick<E06Progress, 'workingRecords'>) { return e06Hash(progress.workingRecords) }
export function e06ComparisonFingerprint(progress: Pick<E06Progress, 'comparisons'>) { return e06Hash(progress.comparisons) }
export function e06PackageFingerprint(progress: Pick<E06Progress, 'source' | 'workingRecords' | 'comparisons' | 'peerReview' | 'revisions' | 'teacherConfirmation'>) { return e06Hash(progress) }

export class LocalE06LiteratureRunner { run(progress: Pick<E06Progress, 'source'>, participantId: string) { return createE06Draft(participantId, e06InputFingerprint(progress)) } }
export function eligibleE06Reviewers(directory: ParticipantDirectory): TrainingParticipant[] { const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId); return current ? directory.participants.filter((item) => item.groupId === current.groupId && item.participantId !== current.participantId) : [] }

export function createE06Comparisons(progress: E06Progress): E06Comparison[] {
  if (progress.workingRecords.length !== 3) return []
  return [
    { comparisonId: 'C01', kind: '一致', references: [{ documentId: 'D01', excerptId: 'D01-P5-S1', point: '使用课堂证据后，任务完整率与解释次数同期改变' }, { documentId: 'D02', excerptId: 'D02-P4-S1', point: '退出卡全对比例提高，高频错误类型减少' }], comparison: '两份材料均支持持续收集可观察学习证据，用于调整后续教学。', boundary: 'D01 是两班连续观察，D02 是单班无对照的四周设计；一致只指证据使用方向，不等于相同因果效应。', intendedUse: progress.source.intendedUse, teacherReviewed: false },
    { comparisonId: 'C02', kind: '相互补充', references: [{ documentId: 'D02', excerptId: 'D02-P2-S3', point: '用课末退出卡定位错误并调整下次课补教' }, { documentId: 'D03', excerptId: 'D03-P4-S2', point: '用双层量规分开过程合规性和最终作品质量' }], comparison: 'D02 补充了课次间的快速诊断证据，D03 补充了项目过程与最终作品的分层证据。', boundary: '两者研究对象、时间尺度和数据形态不同，只能用于设计互补的证据链，不能直接比较效果大小。', intendedUse: progress.source.intendedUse, teacherReviewed: false },
  ]
}

export function simulateE06PeerReview(progress: E06Progress, directory: ParticipantDirectory): E06PeerReview {
  const reviewer = eligibleE06Reviewers(directory).find((item) => item.participantId === progress.peerReview.reviewerId)
  if (!reviewer || !progress.peerReview.reviewerRole || !progress.draft) return { ...progress.peerReview, recordId: '', submitted: false }
  return { ...progress.peerReview, recordId: `E06-PEER-${e06Hash([reviewer.participantId, e06PackageFingerprint(progress)])}`, reviewerGroupId: reviewer.groupId, artifactId: progress.draft.draftId, reviewedFingerprint: e06Hash({ records: progress.workingRecords, comparisons: progress.comparisons }), documentChecks: [
    { documentId: 'D01', metadataAccurate: true, conclusionAccurate: true, note: '题名、作者、年份与 D01 相符；结论未越出 D01-P5-S1 / D01-P6-S2。' },
    { documentId: 'D02', metadataAccurate: true, conclusionAccurate: false, note: 'D02-P5-S2 明确不支持必然因果和普遍推广，当前发现越界。' },
    { documentId: 'D03', metadataAccurate: true, conclusionAccurate: true, note: '题名、作者、年份与小样本边界均与 D03 相符。' },
  ], suggestion: '将 D02 修正为“本班四周内同期变化”，并恢复“无对照组，不能证明因果”的边界。', simulated: true, disclosure: '当前 Demo 无多人后端；核验由作者依据同组成员身份在本机触发确定性模拟，非实时提交，不代表真实组员在线提交。', submitted: false, submittedAt: undefined }
}

export function applyE06ReferenceRevision(progress: E06Progress, participantId: string): E06Progress {
  if (!progress.peerReview.submitted) return progress
  const before = progress.workingRecords.find((item) => item.documentId === 'D02')
  if (!before) return progress
  const afterFinding = '第 4 周三题全对比例高于第 1 周，高频错误类型从 5 类减少为 3 类'
  const afterBoundary = '单班、无对照组；只能说明本班四周内的共变，不能证明退出卡必然导致成绩提升'
  const now = new Date().toISOString()
  const make = (field: E06Revision['field'], beforeValue: string, afterValue: string, excerpt: string): E06Revision => ({ revisionId: `E06-REV-${e06Hash([participantId, progress.peerReview.recordId, field])}`, participantId, sourceReviewId: progress.peerReview.recordId, documentId: 'D02', field, beforeValue, afterValue, basis: `${progress.peerReview.suggestion}；教师回到 ${excerpt} 核对。`, sourceExcerptId: excerpt, revisedAt: now })
  return { ...progress, workingRecords: progress.workingRecords.map((item) => item.documentId === 'D02' ? { ...item, finding: afterFinding, boundary: afterBoundary, teacherReviewed: true } : item), revisions: [make('finding', before.finding, afterFinding, 'D02-P4-S1'), make('boundary', before.boundary, afterBoundary, 'D02-P5-S2')], teacherConfirmation: { metadataConfirmed: false, conclusionsConfirmed: false, comparisonConfirmed: false, zeroFalseCitationConfirmed: false, complianceConfirmed: false, finalResponsibilityConfirmed: false }, confirmedPackage: undefined, updatedAt: now }
}

function hasWork(progress: E06Progress) { return Boolean(progress.draft || progress.workingRecords.length || progress.comparisons.length || progress.peerReview.recordId || progress.confirmedPackage) }
export function archiveE06Attempt(progress: E06Progress, reason: string) { if (!hasWork(progress)) return progress.attemptHistory; const snapshot = { draft: progress.draft, workingRecords: progress.workingRecords, comparisons: progress.comparisons, peerReview: progress.peerReview, revisions: progress.revisions, confirmedPackage: progress.confirmedPackage }; const historyId = `E06-H-${e06Hash(snapshot)}`; return progress.attemptHistory.some((item) => item.historyId === historyId) ? progress.attemptHistory : [...progress.attemptHistory, { historyId, invalidatedAt: new Date().toISOString(), reason, ...structuredClone(snapshot) }] }
function emptyPeer(progress: E06Progress): E06PeerReview { return { ...progress.peerReview, recordId: '', reviewerId: '', reviewerGroupId: '', reviewerRole: undefined, artifactId: '', reviewedFingerprint: '', documentChecks: [], suggestion: '', submitted: false, submittedAt: undefined } }
export function invalidateE06Confirmation(progress: E06Progress, reason: string): E06Progress { return { ...progress, teacherConfirmation: { metadataConfirmed: false, conclusionsConfirmed: false, comparisonConfirmed: false, zeroFalseCitationConfirmed: false, complianceConfirmed: false, finalResponsibilityConfirmed: false }, confirmedPackage: undefined, attemptHistory: archiveE06Attempt(progress, reason) } }
export function invalidateE06ReviewContext(progress: E06Progress, reason: string): E06Progress { const base = invalidateE06Confirmation(progress, reason); return { ...base, peerReview: emptyPeer(base), revisions: [] } }
export function invalidateE06DerivedWork(progress: E06Progress, reason: string): E06Progress { const base = invalidateE06ReviewContext(progress, reason); return { ...base, draft: undefined, workingRecords: [], comparisons: [] } }
