import { describe, expect, it } from 'vitest'
import { createInitialE03Progress } from '../src/e03/data'
import type { E03Progress } from '../src/e03/domain'
import {
  applyE03FindingCorrections,
  applyE03ReferenceRevision,
  archiveE03Attempt,
  createE03MeasureDraft,
  eligibleE03Reviewers,
  invalidateE03Confirmation,
  invalidateE03DerivedWork,
  LocalE03FindingRunner,
  simulateE03PeerReview,
} from '../src/e03/runner'
import { calculateE03Score, createE03Assessment } from '../src/e03/scoring'
import {
  clearAllE03Progress,
  clearParticipantE03Progress,
  createConfirmedE03Package,
  e03ProgressForParticipant,
  updateParticipantE03Progress,
  type E03ProgressStore,
} from '../src/e03/storage'
import {
  confirmedE03PackageIsCurrent,
  detectE03InitialDefects,
  latestE03AssessmentIsCurrent,
  progressForE03,
  validateE03Confirmation,
  validateE03Findings,
  validateE03InitialFindings,
  validateE03InitialMeasures,
  validateE03PeerReview,
  validateE03Revision,
  validateE03Source,
} from '../src/e03/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function throughFindings() {
  const directory = createInitialPortalProgress().participantDirectory
  let progress = createInitialE03Progress()
  progress.aiDraft = new LocalE03FindingRunner().run(progress, directory.currentParticipantId)
  progress = applyE03FindingCorrections(progress, directory.currentParticipantId)
  progress.workingFindings.forEach((item) => { item.teacherReviewed = true })
  return { progress, directory }
}

function throughPeerReview() {
  const { progress: findingsProgress, directory } = throughFindings()
  let progress = createE03MeasureDraft(findingsProgress, directory.currentParticipantId)
  const reviewer = eligibleE03Reviewers(directory)[0]
  if (!reviewer) throw new Error('E03 测试需要至少一名当前同组其他成员')
  progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.peerReview = {
    ...simulateE03PeerReview(progress, directory),
    submitted: true,
    submittedAt: '2026-08-25T01:00:00.000Z',
  }
  return { progress, directory }
}

function completeE03() {
  const { progress: reviewed, directory } = throughPeerReview()
  const progress = applyE03ReferenceRevision(reviewed, directory.currentParticipantId)
  progress.workingMeasures?.measures.forEach((item) => { item.teacherReviewed = true })
  progress.teacherConfirmation = {
    sourceBoundaryConfirmed: true,
    findingsReviewedConfirmed: true,
    noRealIdentityConfirmed: true,
    noFixedLabelsConfirmed: true,
    finalArtifactsConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE03Package(progress, directory)
  return { progress, directory }
}

describe('E03 教学反思与下一次课改进闭环', () => {
  it('提供已审核虚构且不含真实身份的课堂记录，不设置隐藏字数门槛', () => {
    const progress = createInitialE03Progress()
    const directory = createInitialPortalProgress().participantDirectory
    expect(progress.source.sourceKind).toBe('平台已审核虚构课堂记录')
    expect(progress.source.reviewedFictional).toBe(true)
    expect(progress.source.excerpts).toHaveLength(3)
    expect(validateE03Source(progress).valid).toBe(true)
    expect(progressForE03(progress, directory)).toBe(0)

    progress.source.teachingGoal = '目标'
    expect(validateE03Source(progress).valid).toBe(true)
    progress.source.teachingGoal = ''
    expect(validateE03Source(progress).valid).toBe(false)
  })

  it('确定性初稿恰好生成三条发现，并暴露事实夹带态度/能力标签的缺陷', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const progress = createInitialE03Progress()
    const runner = new LocalE03FindingRunner()
    const first = runner.run(progress, directory.currentParticipantId)
    const second = runner.run(progress, directory.currentParticipantId)
    expect(second).toEqual(first)
    progress.aiDraft = first
    expect(first.findings.map((item) => item.findingId)).toEqual(['F01', 'F02', 'F03'])
    expect(detectE03InitialDefects(progress)).toEqual(['fact-label-overreach'])
    expect(validateE03InitialFindings(progress, directory.currentParticipantId).valid).toBe(true)

    const corrected = applyE03FindingCorrections(progress, directory.currentParticipantId)
    corrected.workingFindings.forEach((item) => { item.teacherReviewed = true })
    expect(corrected.workingFindings).toHaveLength(3)
    expect(corrected.workingFindings.find((item) => item.findingId === 'F02')?.observedFact).toContain('6 个小组中有 2 组')
    expect(validateE03Findings(corrected, directory.currentParticipantId).valid).toBe(true)
  })

  it('两条措施保留一个可区分的模糊缺陷，并由当前同组其他成员逐项复核', () => {
    const { progress: findingsProgress, directory } = throughFindings()
    const progress = createE03MeasureDraft(findingsProgress, directory.currentParticipantId)
    expect(progress.measureDraft?.measures.map((item) => item.measureId)).toEqual(['A01', 'A02'])
    expect(detectE03InitialDefects(progress)).toEqual(['fact-label-overreach', 'vague-unobservable-measure'])
    expect(validateE03InitialMeasures(progress, directory.currentParticipantId).valid).toBe(true)

    const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!
    const reviewers = eligibleE03Reviewers(directory)
    expect(reviewers.every((item) => item.groupId === current.groupId && item.participantId !== current.participantId)).toBe(true)
    progress.peerReview = { ...progress.peerReview, reviewerId: reviewers[0].participantId, reviewerRole: '核验员' }
    progress.peerReview = { ...simulateE03PeerReview(progress, directory), submitted: true, submittedAt: '2026-08-25T01:00:00.000Z' }
    expect(progress.peerReview.judgements).toHaveLength(2)
    expect(progress.peerReview.judgements.find((item) => item.measureId === 'A02')).toMatchObject({
      specific: '需调整',
      executable: '需调整',
      observable: '需调整',
    })
    expect(progress.peerReview.disclosure).toContain('无多人后端')
    expect(progress.peerReview.disclosure).toContain('非实时提交')
    expect(validateE03PeerReview(progress, directory).valid).toBe(true)
  })

  it('依据复核修改至少一条措施，并保留可核对的修改前后与反馈来源', () => {
    const { progress: reviewed, directory } = throughPeerReview()
    const progress = applyE03ReferenceRevision(reviewed, directory.currentParticipantId)
    progress.workingMeasures?.measures.forEach((item) => { item.teacherReviewed = true })
    expect(progress.revisions).toHaveLength(1)
    expect(progress.revisions[0]).toMatchObject({ measureId: 'A02', authorTreatment: '已采纳并修正' })
    expect(progress.revisions[0].before.teacherAction).not.toBe(progress.revisions[0].after.teacherAction)
    expect(progress.revisions[0].sourcePeerReviewId).toBe(progress.peerReview.recordId)
    expect(progress.workingMeasures?.measures.find((item) => item.measureId === 'A02')?.checkMethod).toContain('6/6')
    expect(validateE03Revision(progress, directory).valid).toBe(true)
  })

  it('五维硬门槛与恰好两项成果共同决定通过', () => {
    const { progress, directory } = completeE03()
    expect(validateE03Confirmation(progress, directory).valid).toBe(true)
    expect(progress.confirmedPackage?.artifacts.map((item) => item.name)).toEqual(['教学反思或评课记录', '下一次课改进清单'])
    expect(progress.confirmedPackage?.artifacts).toHaveLength(2)
    expect(progress.confirmedPackage?.findingIds).toEqual(['F01', 'F02', 'F03'])
    expect(progress.confirmedPackage?.measureIds).toEqual(['A01', 'A02'])
    expect(confirmedE03PackageIsCurrent(progress, directory)).toBe(true)
    const score = calculateE03Score(progress, directory)
    expect(score.dimensions.map((item) => item.score)).toEqual([2, 2, 2, 2, 2])
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.coreRequirementsPassed).toBe(true)
    expect(score.passed).toBe(true)

    const unsafe: E03Progress = structuredClone(progress)
    unsafe.teacherConfirmation.noFixedLabelsConfirmed = false
    const unsafeScore = calculateE03Score(unsafe, directory)
    expect(unsafeScore.total).toBeGreaterThanOrEqual(8)
    expect(unsafeScore.hardGatesPassed).toBe(false)
    expect(unsafeScore.passed).toBe(false)
  })

  it('实质内容或同组 roster 变化使当前通过失效，但保留验收与尝试历史', () => {
    const { progress, directory } = completeE03()
    progress.assessments.push(createE03Assessment(progress, directory))
    expect(latestE03AssessmentIsCurrent(progress, directory)).toBe(true)
    expect(progressForE03(progress, directory)).toBe(100)

    const changed = structuredClone(progress)
    changed.workingMeasures!.measures[0].teacherAction = '变更后的教师动作'
    expect(latestE03AssessmentIsCurrent(changed, directory)).toBe(false)
    expect(changed.assessments).toHaveLength(1)

    const changedDirectory = structuredClone(directory)
    const peer = changedDirectory.participants.find((item) => item.participantId === progress.peerReview.reviewerId)!
    peer.groupId = 'another-group'
    expect(confirmedE03PackageIsCurrent(progress, changedDirectory)).toBe(false)

    expect(archiveE03Attempt(progress, '措施内容更新')).toHaveLength(1)
    const invalidated = invalidateE03Confirmation(progress, '措施内容更新')
    expect(invalidated.attemptHistory).toHaveLength(1)
    expect(invalidated.assessments).toHaveLength(1)
    expect(invalidated.confirmedPackage).toBeUndefined()

    const regenerated = invalidateE03DerivedWork(progress, '课堂记录版本更新')
    expect(regenerated.attemptHistory).toHaveLength(1)
    expect(regenerated.assessments).toHaveLength(1)
    expect(regenerated.aiDraft).toBeUndefined()
    expect(regenerated.workingFindings).toHaveLength(0)
  })

  it('按 participantId 隔离，支持任务内单人重置和全局清空', () => {
    let store: E03ProgressStore = { version: 1, participants: {} }
    store = updateParticipantE03Progress(store, 'T001', (current) => ({ ...current, route: 'findings' }))
    store = updateParticipantE03Progress(store, 'T002', (current) => ({ ...current, route: 'peer-review' }))
    expect(e03ProgressForParticipant(store, 'T001').route).toBe('findings')
    expect(e03ProgressForParticipant(store, 'T002').route).toBe('peer-review')
    store = clearParticipantE03Progress(store, 'T001')
    expect(e03ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(e03ProgressForParticipant(store, 'T002').route).toBe('peer-review')
    expect(clearAllE03Progress()).toEqual({ version: 1, participants: {} })
  })
})
