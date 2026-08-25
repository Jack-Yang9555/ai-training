import { describe, expect, it } from 'vitest'
import { createInitialE06Progress } from '../src/e06/data'
import type { E06Progress } from '../src/e06/domain'
import { applyE06ReferenceRevision, archiveE06Attempt, createE06Comparisons, eligibleE06Reviewers, invalidateE06DerivedWork, invalidateE06ReviewContext, LocalE06LiteratureRunner, simulateE06PeerReview } from '../src/e06/runner'
import { calculateE06Score, createE06Assessment } from '../src/e06/scoring'
import { clearAllE06Progress, clearParticipantE06Progress, createConfirmedE06Package, e06ProgressForParticipant, updateParticipantE06Progress, type E06ProgressStore } from '../src/e06/storage'
import { confirmedE06PackageIsCurrent, detectE06InitialDefects, latestE06AssessmentIsCurrent, progressForE06, validateE06Comparisons, validateE06InitialReview, validateE06PeerReview, validateE06Revision, validateE06Source } from '../src/e06/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function throughDraft() {
  const directory = createInitialPortalProgress().participantDirectory
  const progress = createInitialE06Progress()
  progress.source.exactlyThreeConfirmed = true; progress.source.authorizationConfirmed = true; progress.source.noOpenWebConfirmed = true; progress.source.privacyConfirmed = true
  progress.draft = new LocalE06LiteratureRunner().run(progress, directory.currentParticipantId)
  progress.workingRecords = structuredClone(progress.draft.records).map((item) => ({ ...item, teacherReviewed: true }))
  return { progress, directory }
}
function throughReview() {
  const { progress, directory } = throughDraft(); progress.comparisons = createE06Comparisons(progress).map((item) => ({ ...item, teacherReviewed: true }))
  const reviewer = eligibleE06Reviewers(directory)[0]; progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }; progress.peerReview = { ...simulateE06PeerReview(progress, directory), submitted: true, submittedAt: '2026-08-25T08:00:00.000Z' }
  return { progress, directory }
}
function complete() {
  const { progress: reviewed, directory } = throughReview(); const progress = applyE06ReferenceRevision(reviewed, directory.currentParticipantId)
  progress.teacherConfirmation = { metadataConfirmed: true, conclusionsConfirmed: true, comparisonConfirmed: true, zeroFalseCitationConfirmed: true, complianceConfirmed: true, finalResponsibilityConfirmed: true }
  progress.confirmedPackage = createConfirmedE06Package(progress, directory)
  return { progress, directory }
}

describe('E06 文献梳理与引用核验', () => {
  it('只使用 D01—D03，元数据和四项原文位置可点查', () => {
    const { progress } = throughDraft(); expect(validateE06Source(progress).valid).toBe(true); expect(progress.source.documents.map((item) => item.documentId)).toEqual(['D01', 'D02', 'D03']); expect(progress.source.documents.every((item) => item.reviewedFictional && item.authorization.includes('已授权') && item.excerpts.length === 4)).toBe(true); expect(new Set(progress.source.documents.flatMap((item) => item.excerpts.map((part) => part.excerptId))).size).toBe(12)
  })
  it('确定性初稿逐份提取四项并稳定暴露 D02 结论越界', () => {
    const { progress, directory } = throughDraft(); const rerun = new LocalE06LiteratureRunner().run(progress, directory.currentParticipantId); expect(rerun).toEqual(progress.draft); expect(progress.workingRecords).toHaveLength(3); expect(progress.workingRecords.every((item) => [item.researchObject, item.method, item.finding, item.boundary, item.objectReference, item.methodReference, item.findingReference, item.boundaryReference].every(Boolean))).toBe(true); expect(detectE06InitialDefects(progress)).toEqual(['conclusion-overreach'])
  })
  it('三份材料未逐份核验时阻断观点比较，全勾选后才通过初稿门禁', () => {
    const { progress, directory } = throughDraft(); progress.workingRecords = progress.workingRecords.map((item) => ({ ...item, teacherReviewed: false }))
    const blocked = validateE06InitialReview(progress, directory.currentParticipantId); expect(blocked.valid).toBe(false); expect(blocked.messages).toEqual(expect.arrayContaining(['D01：教师须逐份核验元数据、结论与边界', 'D02：教师须逐份核验元数据、结论与边界', 'D03：教师须逐份核验元数据、结论与边界']))
    progress.workingRecords = progress.workingRecords.map((item) => ({ ...item, teacherReviewed: true })); expect(validateE06InitialReview(progress, directory.currentParticipantId).valid).toBe(true)
  })
  it('两条互斥比较均引用两份材料并说明边界', () => {
    const { progress, directory } = throughDraft(); progress.comparisons = createE06Comparisons(progress); expect(progress.comparisons.map((item) => item.kind)).toEqual(['一致', '相互补充']); expect(progress.comparisons.every((item) => item.references.length === 2 && new Set(item.references.map((ref) => ref.documentId)).size === 2 && item.boundary.length > 10)).toBe(true); expect(validateE06Comparisons(progress, directory.currentParticipantId).valid).toBe(false); expect(validateE06Comparisons(progress, directory.currentParticipantId).messages).toContain('教师须逐条核验观点比较的关系类型、两份引用与适用边界'); progress.comparisons = progress.comparisons.map((item) => ({ ...item, teacherReviewed: true })); expect(validateE06Comparisons(progress, directory.currentParticipantId).valid).toBe(true)
  })
  it('同组其他成员分开核验元数据和结论，且公开模拟边界', () => {
    const { progress, directory } = throughReview(); expect(validateE06PeerReview(progress, directory).valid).toBe(true); expect(progress.peerReview.documentChecks.every((item) => item.metadataAccurate)).toBe(true); expect(progress.peerReview.documentChecks.find((item) => item.documentId === 'D02')?.conclusionAccurate).toBe(false); expect(progress.peerReview.disclosure).toContain('无多人后端'); expect(progress.peerReview.disclosure).toContain('非实时提交'); const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!; const outsider = directory.participants.find((item) => item.groupId !== current.groupId)!; progress.peerReview.reviewerId = outsider.participantId; expect(validateE06PeerReview(progress, directory).valid).toBe(false)
  })
  it('修正结论与边界后虚假引用为 0，三项成果和硬门槛共同决定通过', () => {
    const { progress, directory } = complete(); expect(validateE06Revision(progress, directory).valid).toBe(true); expect(progress.revisions.length).toBeGreaterThanOrEqual(1); expect(progress.revisions.every((item) => item.beforeValue !== item.afterValue && item.basis && item.sourceExcerptId)).toBe(true); expect(progress.confirmedPackage?.artifacts.map((item) => item.name)).toEqual(['文献梳理表', '观点对比表', '引用核验记录']); expect(confirmedE06PackageIsCurrent(progress, directory)).toBe(true); const score = calculateE06Score(progress, directory); expect(score.dimensions.map((item) => item.score)).toEqual([2, 2, 2, 2, 2]); expect(score.total).toBe(10); expect(score.hardGatesPassed).toBe(true); expect(score.passed).toBe(true)
  })
  it('内容或同组名单变化使当前通过失效，但历史保留', () => {
    const { progress, directory } = complete(); progress.assessments.push(createE06Assessment(progress, directory)); expect(latestE06AssessmentIsCurrent(progress, directory)).toBe(true); expect(progressForE06(progress, directory)).toBe(100); const changed: E06Progress = structuredClone(progress); changed.workingRecords[0].finding += '变化'; expect(confirmedE06PackageIsCurrent(changed, directory)).toBe(false); expect(latestE06AssessmentIsCurrent(changed, directory)).toBe(false); expect(archiveE06Attempt(progress, '问题变化')).toHaveLength(1); const rosterInvalid = invalidateE06ReviewContext(progress, '同组名单变化'); expect(rosterInvalid.peerReview.reviewerId).toBe(''); expect(rosterInvalid.confirmedPackage).toBeUndefined(); expect(rosterInvalid.attemptHistory).toHaveLength(1); expect(rosterInvalid.assessments).toHaveLength(1); const sourceInvalid = invalidateE06DerivedWork(progress, '教学问题变化'); expect(sourceInvalid.draft).toBeUndefined(); expect(sourceInvalid.workingRecords).toHaveLength(0); expect(sourceInvalid.comparisons).toHaveLength(0); expect(sourceInvalid.assessments).toHaveLength(1)
  })
  it('按 participantId 隔离，支持单任务与全局清理', () => {
    let store: E06ProgressStore = { version: 1, participants: {} }; store = updateParticipantE06Progress(store, 'T001', (current) => ({ ...current, route: 'review' })); store = updateParticipantE06Progress(store, 'T002', (current) => ({ ...current, route: 'comparison' })); expect(e06ProgressForParticipant(store, 'T001').route).toBe('review'); expect(e06ProgressForParticipant(store, 'T002').route).toBe('comparison'); store = clearParticipantE06Progress(store, 'T001'); expect(e06ProgressForParticipant(store, 'T001').route).toBe('overview'); expect(e06ProgressForParticipant(store, 'T002').route).toBe('comparison'); expect(clearAllE06Progress()).toEqual({ version: 1, participants: {} })
  })
})
