import { describe, expect, it } from 'vitest'
import { createInitialE05Progress } from '../src/e05/data'
import type { E05Progress } from '../src/e05/domain'
import {
  applyE05ReferenceRevision,
  archiveE05Attempt,
  buildE05SingleFileHtml,
  createE05WebPage,
  e05MappingFingerprint,
  effectiveE05Mappings,
  effectiveE05Suggestions,
  eligibleE05Reviewers,
  evaluateE05OfflineHtml,
  invalidateE05Confirmation,
  invalidateE05DerivedWork,
  invalidateE05ReviewContext,
  LocalE05MappingRunner,
  runE05OfflineTest,
  simulateE05PeerReview,
} from '../src/e05/runner'
import { calculateE05Score, createE05Assessment } from '../src/e05/scoring'
import {
  clearAllE05Progress,
  clearParticipantE05Progress,
  createConfirmedE05Package,
  e05ProgressForParticipant,
  updateParticipantE05Progress,
  type E05ProgressStore,
} from '../src/e05/storage'
import {
  confirmedE05PackageIsCurrent,
  detectE05InitialDefects,
  latestE05AssessmentIsCurrent,
  progressForE05,
  validateE05Confirmation,
  validateE05Mapping,
  validateE05PeerReview,
  validateE05Revision,
  validateE05Source,
  validateE05Suggestions,
  validateE05WebPage,
} from '../src/e05/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function throughMapping() {
  const directory = createInitialPortalProgress().participantDirectory
  const progress = createInitialE05Progress()
  Object.assign(progress, new LocalE05MappingRunner().run(progress, directory.currentParticipantId))
  return { progress, directory }
}

function throughInitialWebPage() {
  const { progress, directory } = throughMapping()
  progress.aiSuggestionDraft = new LocalE05MappingRunner().suggest(progress, directory.currentParticipantId)
  progress.webPage = createE05WebPage(progress, directory.currentParticipantId)
  return { progress: runE05OfflineTest(progress), directory }
}

function throughPeerReview() {
  const { progress, directory } = throughInitialWebPage()
  const reviewer = eligibleE05Reviewers(directory)[0]
  progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.peerReview = {
    ...simulateE05PeerReview(progress, directory),
    submitted: true,
    submittedAt: '2026-08-25T07:00:00.000Z',
  }
  return { progress, directory }
}

function throughRevision() {
  const { progress: reviewed, directory } = throughPeerReview()
  let progress = applyE05ReferenceRevision(reviewed, directory.currentParticipantId)
  progress.webPage = createE05WebPage(progress, directory.currentParticipantId)
  progress = runE05OfflineTest(progress)
  return { progress, directory }
}

function completeE05() {
  const { progress, directory } = throughRevision()
  progress.teacherConfirmation = {
    sourceAndEvidenceConfirmed: true,
    mappingAndSuggestionsConfirmed: true,
    offlineArtifactConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE05Package(progress, directory)
  return { progress, directory }
}

describe('E05 课程目标与岗位能力映射领域验收', () => {
  it('只接受已审核、授权、脱敏岗位材料与完整本人课程目标', () => {
    const progress = createInitialE05Progress()
    const directory = createInitialPortalProgress().participantDirectory
    expect(validateE05Source(progress).valid).toBe(true)
    expect(progress.source.jobMaterial.auditStatus).toBe('已审核')
    expect(progress.source.jobMaterial.anonymized).toBe(true)
    expect(progress.source.jobMaterial.reviewedFictional).toBe(true)
    expect(progress.source.course.objectives.length).toBeGreaterThanOrEqual(3)
    expect(progressForE05(progress, directory)).toBe(0)

    progress.source.jobMaterial.auditStatus = '待审核'
    expect(validateE05Source(progress).valid).toBe(false)
    progress.source.jobMaterial.auditStatus = '已审核'
    progress.source.course.objectives[0].description = ''
    expect(validateE05Source(progress).valid).toBe(false)
  })

  it('确定性生成 6 项岗位任务与 12 条不重复、双侧有据映射', () => {
    const { progress, directory } = throughMapping()
    const rerun = new LocalE05MappingRunner().run(createInitialE05Progress(), directory.currentParticipantId)
    expect(rerun).toEqual({ jobTaskDraft: progress.jobTaskDraft, mappingDraft: progress.mappingDraft })
    expect(progress.jobTaskDraft?.tasks).toHaveLength(6)
    expect(progress.mappingDraft?.mappings).toHaveLength(12)
    const pairs = progress.mappingDraft!.mappings.map((item) => `${item.courseObjectiveId}|${item.jobTaskId}`)
    expect(new Set(pairs).size).toBe(12)
    expect(new Set(progress.mappingDraft!.mappings.map((item) => item.status))).toEqual(new Set(['已覆盖', '覆盖不足', '暂未覆盖']))
    expect(progress.mappingDraft!.mappings.every((item) => item.courseEvidenceId && item.jobEvidenceExcerptId && item.courseEvidenceSummary && item.jobEvidenceSummary)).toBe(true)
    expect(detectE05InitialDefects(progress)).toEqual(['incorrect-map-12-status'])
    expect(validateE05Mapping(progress, directory.currentParticipantId).valid).toBe(true)
  })

  it('形成恰好 3 项只回应已记录差距的建议，并保留 SG-03 可区分缺陷', () => {
    const { progress, directory } = throughMapping()
    progress.aiSuggestionDraft = new LocalE05MappingRunner().suggest(progress, directory.currentParticipantId)
    expect(progress.aiSuggestionDraft?.suggestions).toHaveLength(3)
    expect(progress.aiSuggestionDraft?.suggestions.every((item) => {
      const mapping = progress.mappingDraft?.mappings.find((candidate) => candidate.mappingId === item.linkedMappingId)
      return mapping && mapping.status !== '已覆盖' && mapping.courseEvidenceId === item.courseEvidenceId && mapping.jobEvidenceExcerptId === item.jobEvidenceExcerptId
    })).toBe(true)
    expect(detectE05InitialDefects(progress)).toEqual(['incorrect-map-12-status', 'vague-suggestion-03'])
    expect(validateE05Suggestions(progress, directory.currentParticipantId).valid).toBe(true)
  })

  it('生成无外部依赖的单文件 HTML，包含覆盖筛选、可点击关系详情并通过离线测试', () => {
    const { progress, directory } = throughInitialWebPage()
    const html = buildE05SingleFileHtml(progress, directory.currentParticipantId)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('id="coverage-filter"')
    expect(html).toContain('data-mapping-id="MAP-12"')
    expect(html).toContain('id="relationship-detail"')
    expect(html).not.toMatch(/<script\b[^>]*\bsrc\s*=/iu)
    expect(html).not.toMatch(/<link\b[^>]*\bhref\s*=/iu)
    expect(progress.webPage?.offlineTest?.passed).toBe(true)
    expect(Object.values(evaluateE05OfflineHtml(progress, progress.webPage!).checks).every(Boolean)).toBe(true)
    expect(validateE05WebPage(progress, directory.currentParticipantId).valid).toBe(true)
  })

  it('只允许当前同组其他成员复核，且“需调整”是有效事实', () => {
    const { progress, directory } = throughPeerReview()
    const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!
    const reviewers = eligibleE05Reviewers(directory)
    expect(reviewers.length).toBeGreaterThan(0)
    expect(reviewers.every((item) => item.groupId === current.groupId && item.participantId !== current.participantId)).toBe(true)
    expect(progress.peerReview.mappingJudgement).toBe('需调整')
    expect(progress.peerReview.suggestionJudgement).toBe('需调整')
    expect(progress.peerReview.targetRecordIds).toEqual(['MAP-12', 'SG-03'])
    expect(progress.peerReview.disclosure).toContain('无多人后端')
    expect(validateE05PeerReview(progress, directory).valid).toBe(true)

    const outsider = directory.participants.find((item) => item.groupId !== current.groupId)!
    progress.peerReview.reviewerId = outsider.participantId
    expect(validateE05PeerReview(progress, directory).valid).toBe(false)
  })

  it('修正 MAP-12 与 SG-03 后保留 AI 原稿、修改前后与双侧依据，并完成 v2 离线复测', () => {
    const { progress, directory } = throughRevision()
    expect(progress.mappingDraft?.mappings.find((item) => item.mappingId === 'MAP-12')?.status).toBe('覆盖不足')
    expect(progress.aiSuggestionDraft?.suggestions.find((item) => item.suggestionId === 'SG-03')?.courseAdjustment).toBe('加强版本交付训练。')
    expect(progress.workingMappings?.find((item) => item.mappingId === 'MAP-12')?.status).toBe('暂未覆盖')
    expect(progress.workingSuggestions?.find((item) => item.suggestionId === 'SG-03')?.courseAdjustment).toContain('15 分钟')
    expect(progress.revisions.length).toBeGreaterThanOrEqual(1)
    expect(progress.revisions.every((item) => item.beforeValue !== item.afterValue && item.basis && item.courseEvidenceId && item.jobEvidenceExcerptId)).toBe(true)
    expect(progress.webPage?.version).toBe(2)
    expect(progress.webPage?.offlineTest?.passed).toBe(true)
    expect(validateE05Revision(progress, directory).valid).toBe(true)
  })

  it('两项固定成果、四项核心要求与五维硬门槛共同决定通过', () => {
    const { progress, directory } = completeE05()
    expect(validateE05Confirmation(progress, directory).valid).toBe(true)
    expect(progress.confirmedPackage?.artifacts.map((item) => item.name)).toEqual(['课程—岗位能力映射网页', '差距与改进建议清单'])
    expect(progress.confirmedPackage?.artifacts).toHaveLength(2)
    expect(progress.confirmedPackage).toMatchObject({ packageVersion: 1, jobTaskCount: 6, mappingCount: 12, suggestionCount: 3, revisionCount: 3 })
    expect(confirmedE05PackageIsCurrent(progress, directory)).toBe(true)
    const score = calculateE05Score(progress, directory)
    expect(score.dimensions.map((item) => item.score)).toEqual([2, 2, 2, 2, 2])
    expect(score.coreRequirements).toHaveLength(4)
    expect(score.coreRequirements.every((item) => item.passed)).toBe(true)
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)

    const unsafe: E05Progress = structuredClone(progress)
    unsafe.teacherConfirmation.finalResponsibilityConfirmed = false
    const unsafeScore = calculateE05Score(unsafe, directory)
    expect(unsafeScore.total).toBeGreaterThanOrEqual(8)
    expect(unsafeScore.dimensions.find((item) => item.id === 'safety')?.score).not.toBe(2)
    expect(unsafeScore.hardGatesPassed).toBe(false)
    expect(unsafeScore.passed).toBe(false)
  })

  it('指纹变化使当前通过失效，但历史保留；存储按 participantId 隔离并可分别清理', () => {
    const { progress, directory } = completeE05()
    progress.assessments.push(createE05Assessment(progress, directory))
    expect(latestE05AssessmentIsCurrent(progress, directory)).toBe(true)
    expect(progressForE05(progress, directory)).toBe(100)

    const changed: E05Progress = structuredClone(progress)
    changed.workingMappings![0].judgementBasis = '修改后的判断依据'
    expect(confirmedE05PackageIsCurrent(changed, directory)).toBe(false)
    expect(latestE05AssessmentIsCurrent(changed, directory)).toBe(false)
    expect(changed.assessments).toHaveLength(1)
    expect(archiveE05Attempt(progress, '映射内容更新')).toHaveLength(1)

    const invalidated = invalidateE05Confirmation(progress, '映射内容更新')
    expect(invalidated.attemptHistory).toHaveLength(1)
    expect(invalidated.assessments).toHaveLength(1)
    expect(invalidated.confirmedPackage).toBeUndefined()
    const rosterInvalidated = invalidateE05ReviewContext(progress, '同组名单变化')
    expect(rosterInvalidated.peerReview.reviewerId).toBe('')
    expect(rosterInvalidated.workingMappings).toBeUndefined()
    expect(rosterInvalidated.webPage).toBeUndefined()
    const sourceInvalidated = invalidateE05DerivedWork(progress, '来源版本变化')
    expect(sourceInvalidated.jobTaskDraft).toBeUndefined()
    expect(sourceInvalidated.assessments).toHaveLength(1)

    let store: E05ProgressStore = { version: 1, participants: {} }
    store = updateParticipantE05Progress(store, 'T001', (current) => ({ ...current, route: 'mapping' }))
    store = updateParticipantE05Progress(store, 'T002', (current) => ({ ...current, route: 'peer-review' }))
    expect(e05ProgressForParticipant(store, 'T001').route).toBe('mapping')
    expect(e05ProgressForParticipant(store, 'T002').route).toBe('peer-review')
    store = clearParticipantE05Progress(store, 'T001')
    expect(e05ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(e05ProgressForParticipant(store, 'T002').route).toBe('peer-review')
    expect(clearAllE05Progress()).toEqual({ version: 1, participants: {} })
    expect(e05MappingFingerprint(effectiveE05Mappings(progress))).toBeTruthy()
    expect(effectiveE05Suggestions(progress)).toHaveLength(3)
  })
})
