import { describe, expect, it } from 'vitest'
import { createInitialE04Progress } from '../src/e04/data'
import type { E04Progress } from '../src/e04/domain'
import {
  applyE04ReferenceCorrections,
  archiveE04Attempt,
  e04GraphFingerprint,
  eligibleE04Reviewers,
  invalidateE04Confirmation,
  invalidateE04DerivedWork,
  invalidateE04ReviewContext,
  LocalE04GraphRunner,
  simulateE04GraphReview,
} from '../src/e04/runner'
import { calculateE04Score, createE04Assessment } from '../src/e04/scoring'
import {
  clearAllE04Progress,
  clearParticipantE04Progress,
  createConfirmedE04Package,
  e04ProgressForParticipant,
  updateParticipantE04Progress,
  type E04ProgressStore,
} from '../src/e04/storage'
import {
  confirmedE04PackageIsCurrent,
  detectE04InitialDefects,
  diagnoseE04Graph,
  latestE04AssessmentIsCurrent,
  progressForE04,
  validateE04Confirmation,
  validateE04GraphReview,
  validateE04Nodes,
  validateE04Relations,
  validateE04Revision,
  validateE04Source,
} from '../src/e04/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function throughInitialGraph() {
  const directory = createInitialPortalProgress().participantDirectory
  const progress = createInitialE04Progress()
  progress.aiDraft = new LocalE04GraphRunner().run(progress, directory.currentParticipantId)
  return { progress, directory }
}

function throughGraphReview() {
  const { progress, directory } = throughInitialGraph()
  const reviewer = eligibleE04Reviewers(directory)[0]
  progress.graphReview = { ...progress.graphReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.graphReview = {
    ...simulateE04GraphReview(progress, directory),
    submitted: true,
    submittedAt: '2026-08-25T05:00:00.000Z',
  }
  return { progress, directory }
}

function completeE04() {
  const { progress: reviewed, directory } = throughGraphReview()
  const progress = applyE04ReferenceCorrections(reviewed, directory.currentParticipantId)
  progress.teacherConfirmation = {
    sourceAndEvidenceConfirmed: true,
    graphQualityConfirmed: true,
    finalArtifactsConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE04Package(progress, directory)
  return { progress, directory }
}

describe('E04 课程知识图谱领域验收', () => {
  it('登记已审核课程来源，并用确定性初稿暴露三类可区分缺陷', () => {
    const { progress, directory } = throughInitialGraph()
    const runner = new LocalE04GraphRunner()
    expect(validateE04Source(progress).valid).toBe(true)
    expect(runner.run(progress, directory.currentParticipantId)).toEqual(progress.aiDraft)
    expect(progress.aiDraft?.nodes).toHaveLength(16)
    expect(progress.aiDraft?.relations).toHaveLength(22)
    expect(new Set(progress.aiDraft?.relations.map((item) => item.type))).toEqual(new Set(['先修', '组成', '应用', '易错']))
    expect(detectE04InitialDefects(progress)).toEqual(['duplicate-node', 'reversed-prerequisite', 'unsupported-relation'])
    expect(validateE04Nodes(progress, directory.currentParticipantId).valid).toBe(true)
    expect(validateE04Relations(progress, directory.currentParticipantId).valid).toBe(true)
  })

  it('只允许当前同组其他成员复核，且负面判断是有效事实', () => {
    const { progress, directory } = throughGraphReview()
    const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!
    const reviewers = eligibleE04Reviewers(directory)
    expect(reviewers.length).toBeGreaterThan(0)
    expect(reviewers.every((item) => item.groupId === current.groupId && item.participantId !== current.participantId)).toBe(true)
    expect(progress.graphReview.relationDirection).toBe('需调整')
    expect(progress.graphReview.omission).toBe('存在遗漏')
    expect(progress.graphReview.targetRecordId).toContain('R07')
    expect(progress.graphReview.disclosure).toContain('无多人后端')
    expect(progress.graphReview.disclosure).toContain('非实时提交')
    expect(validateE04GraphReview(progress, directory).valid).toBe(true)

    const outsider = directory.participants.find((item) => item.groupId !== current.groupId)!
    progress.graphReview.reviewerId = outsider.participantId
    expect(validateE04GraphReview(progress, directory).valid).toBe(false)
  })

  it('合并节点、反转方向与删除无据关系后仍满足硬数量与质量门槛', () => {
    const { progress: reviewed, directory } = throughGraphReview()
    const initialFingerprint = e04GraphFingerprint(reviewed.aiDraft)
    const progress = applyE04ReferenceCorrections(reviewed, directory.currentParticipantId)
    const graph = progress.workingGraph!
    const diagnostics = diagnoseE04Graph(graph, progress)
    expect(graph.nodes).toHaveLength(15)
    expect(graph.relations).toHaveLength(21)
    expect(new Set(graph.relations.map((item) => item.type))).toEqual(new Set(['先修', '组成', '应用', '易错']))
    expect(graph.nodes.some((item) => item.nodeId === 'N16')).toBe(false)
    expect(graph.nodes.find((item) => item.nodeId === 'N08')?.aliases).toContain('负面提示词')
    expect(graph.relations.find((item) => item.relationId === 'R07')).toMatchObject({ sourceNodeId: 'N04', targetNodeId: 'N08', type: '先修' })
    expect(graph.relations.some((item) => item.relationId === 'R18')).toBe(false)
    expect(Object.values(diagnostics).every((items) => items.length === 0)).toBe(true)
    expect(progress.revisions).toHaveLength(3)
    expect(progress.revisions.every((item) => item.reviewedGraphFingerprint === initialFingerprint && item.beforeValue !== item.afterValue && item.basisExcerptId)).toBe(true)
    expect(validateE04Revision(progress, directory).valid).toBe(true)
  })

  it('恰好三项成果、四项核心要求与五维硬门槛共同决定通过', () => {
    const { progress, directory } = completeE04()
    expect(validateE04Confirmation(progress, directory).valid).toBe(true)
    expect(progress.confirmedPackage?.artifacts.map((item) => item.name)).toEqual(['课程知识图谱', '节点与关系列表', '人工修正记录'])
    expect(progress.confirmedPackage?.artifacts).toHaveLength(3)
    expect(progress.confirmedPackage).toMatchObject({ packageVersion: 1, nodeCount: 15, relationCount: 21, revisionCount: 3 })
    expect(confirmedE04PackageIsCurrent(progress, directory)).toBe(true)
    const score = calculateE04Score(progress, directory)
    expect(score.dimensions.map((item) => item.score)).toEqual([2, 2, 2, 2, 2])
    expect(score.coreRequirements).toHaveLength(4)
    expect(score.coreRequirements.every((item) => item.passed)).toBe(true)
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)

    const unsafe: E04Progress = structuredClone(progress)
    unsafe.teacherConfirmation.finalResponsibilityConfirmed = false
    const unsafeScore = calculateE04Score(unsafe, directory)
    expect(unsafeScore.total).toBeGreaterThanOrEqual(8)
    expect(unsafeScore.dimensions.find((item) => item.id === 'safety')?.score).not.toBe(2)
    expect(unsafeScore.hardGatesPassed).toBe(false)
    expect(unsafeScore.passed).toBe(false)
  })

  it('内容或同组名单变化使当前通过失效，但保留验收与尝试历史', () => {
    const { progress, directory } = completeE04()
    progress.assessments.push(createE04Assessment(progress, directory))
    expect(latestE04AssessmentIsCurrent(progress, directory)).toBe(true)
    expect(progressForE04(progress, directory)).toBe(100)

    const changed: E04Progress = structuredClone(progress)
    changed.workingGraph!.nodes[0].definition = '修改后的课程定义'
    expect(confirmedE04PackageIsCurrent(changed, directory)).toBe(false)
    expect(latestE04AssessmentIsCurrent(changed, directory)).toBe(false)
    expect(changed.assessments).toHaveLength(1)

    const renamedDirectory = structuredClone(directory)
    const reviewer = renamedDirectory.participants.find((item) => item.participantId === progress.graphReview.reviewerId)!
    reviewer.name = `${reviewer.name}更新`
    expect(confirmedE04PackageIsCurrent(progress, renamedDirectory)).toBe(false)

    expect(archiveE04Attempt(progress, '图谱内容更新')).toHaveLength(1)
    const invalidated = invalidateE04Confirmation(progress, '图谱内容更新')
    expect(invalidated.attemptHistory).toHaveLength(1)
    expect(invalidated.assessments).toHaveLength(1)
    expect(invalidated.confirmedPackage).toBeUndefined()
    expect(invalidated.workingGraph).toBeDefined()

    const rosterInvalidated = invalidateE04ReviewContext(progress, '同组名单变化')
    expect(rosterInvalidated.graphReview.reviewerId).toBe('')
    expect(rosterInvalidated.graphReview.reviewerGroupId).toBe('')
    expect(rosterInvalidated.graphReview.reviewerRole).toBeUndefined()
    expect(rosterInvalidated.workingGraph).toBeUndefined()
    expect(rosterInvalidated.revisions).toHaveLength(0)

    const regenerated = invalidateE04DerivedWork(progress, '课程来源版本更新')
    expect(regenerated.attemptHistory).toHaveLength(1)
    expect(regenerated.assessments).toHaveLength(1)
    expect(regenerated.aiDraft).toBeUndefined()
  })

  it('按 participantId 隔离，支持任务内单人重置和全局清空', () => {
    let store: E04ProgressStore = { version: 1, participants: {} }
    store = updateParticipantE04Progress(store, 'T001', (current) => ({ ...current, route: 'nodes' }))
    store = updateParticipantE04Progress(store, 'T002', (current) => ({ ...current, route: 'graph-review' }))
    expect(e04ProgressForParticipant(store, 'T001').route).toBe('nodes')
    expect(e04ProgressForParticipant(store, 'T002').route).toBe('graph-review')
    store = clearParticipantE04Progress(store, 'T001')
    expect(e04ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(e04ProgressForParticipant(store, 'T002').route).toBe('graph-review')
    expect(clearAllE04Progress()).toEqual({ version: 1, participants: {} })
  })
})
