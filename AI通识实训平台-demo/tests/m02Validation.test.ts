import { beforeEach, describe, expect, it } from 'vitest'
import { m02ComplianceReference, m02ModelIds, m02ModelResults, m02RatingReference } from '../src/m02/data'
import { buildM02PeerArtifacts } from '../src/m02/peerArtifacts'
import { calculateM02Score } from '../src/m02/scoring'
import { createInitialM02Progress, EARLIEST_M02_STORAGE_KEY, LEGACY_M02_STORAGE_KEY, loadM02Store, M02_STORAGE_KEY, progressForParticipant, saveM02Store, updateParticipantM02Progress } from '../src/m02/storage'
import type { M02Progress, M02RatingDimension } from '../src/m02/types'
import { containsM02RiskText, m02RatingDimensions, progressForM02, validateM02BlindReview, validateM02PeerReview, validateM02Selection } from '../src/m02/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function completeProgress(): { progress: M02Progress; directory: ReturnType<typeof createInitialPortalProgress>['participantDirectory'] } {
  const directory = createInitialPortalProgress().participantDirectory
  const progress = createInitialM02Progress()
  progress.run = {
    runId: 'run-test', status: 'succeeded', startedAt: '2026-08-12T00:00:00.000Z', completedAt: '2026-08-12T00:00:01.000Z',
    results: Object.fromEntries(m02ModelIds.map((id) => [id, m02ModelResults[id]])),
  }
  progress.compliance = Object.fromEntries(m02ModelIds.map((id) => [id, { ...m02ComplianceReference[id] }]))
  progress.ratings = Object.fromEntries(m02ModelIds.map((id) => [id, Object.fromEntries(m02RatingDimensions.map((dimension) => [dimension, {
    score: m02RatingReference[id][dimension], paragraphId: m02ModelResults[id].paragraphs[0].id, reason: `引用该模型课堂导入的具体内容评价${dimension}表现。`,
  }]))]))
  progress.blindReviewSubmitted = true
  progress.revealedModelNames = { A: '智谱清言 GLM-4', B: '某开源模型' }
  progress.selectedModelId = 'A'
  progress.selectionDecision = {
    evidenceDimensions: ['teachingFit', 'instructionFollowing'], comparedModelId: 'B',
    conclusion: '课堂导入联系生活经验且任务范围清晰，比模型 B 更适合本次零基础课堂。',
  }
  progress.correction = { paragraphId: 'A-a3', type: '解析不清', revisedContent: '修改后补充主体、风格和细节，并提示答案不是唯一形式。', reason: '原解析未说明开放题答案可以多样，需要避免学生误认为只有一种答案。' }
  const peer = buildM02PeerArtifacts(directory)[0]
  progress.peerReview = {
    reviewerRole: '核验员', targetParticipantId: peer.participantId, targetArtifactId: peer.artifactId,
    scoringConsistent: '一致', reasonEvidenceSufficient: '充分', modelChoiceReasonable: '合理',
    scoreDifference: 'clarity', scoreDifferenceReason: '对导入语清晰度的评价标准略有不同。', suggestion: '建议补充题型递进证据并说明适用对象。', submitted: true,
  }
  progress.groupConclusion = {
    selectedModelId: 'A', selectionReason: '材料范围、题型递进和表达均适合当前零基础课堂。',
    largestDifferenceDimension: 'clarity', differenceExplanation: '组员对课堂导入语言清晰度的评分相差一分。',
    correctionConsensus: '需要说明开放题答案不唯一，并保留教师人工审校。',
  }
  return { progress, directory }
}

describe('M02 校验、评分与存储', () => {
  beforeEach(() => {
    window.localStorage.removeItem(M02_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_M02_STORAGE_KEY)
    window.localStorage.removeItem(EARLIEST_M02_STORAGE_KEY)
  })

  it('完整盲评包含 8 项检查和 10 项带段落证据评分', () => {
    const { progress } = completeProgress()
    expect(validateM02BlindReview(progress)).toEqual({ valid: true, messages: [] })
  })

  it('参考判断和合理评分、修正、共评全部完成时得 10 分并通过', () => {
    const { progress, directory } = completeProgress()
    const score = calculateM02Score(progress, directory)
    expect(score.total).toBe(10)
    expect(score.passed).toBe(true)
    expect(progressForM02(progress, directory)).toBe(100)
  })

  it('泛化断言和敏感信息会触发风险识别', () => {
    expect(containsM02RiskText(['这个模型适合所有任务'])).toBe(true)
    expect(containsM02RiskText(['联系邮箱 teacher@example.com'])).toBe(true)
    expect(containsM02RiskText(['只适用于本次零基础课堂任务'])).toBe(false)
  })

  it('综合选择结论出现适合所有任务式泛化时禁止继续', () => {
    const { progress } = completeProgress()
    progress.selectionDecision.conclusion = '这个模型最适合所有任务，可以直接固定选择。'
    expect(validateM02Selection(progress).messages).toContain('综合选择结论不能把单次结果泛化为适合所有任务')
  })

  it('人员分组变化后原共评对象失效', () => {
    const { progress, directory } = completeProgress()
    expect(validateM02PeerReview(progress, directory).valid).toBe(true)
    const changed = { ...directory, participants: directory.participants.map((item) => item.participantId === progress.peerReview.targetParticipantId ? { ...item, groupId: 'group-other', groupName: '其他组' } : item) }
    expect(validateM02PeerReview(progress, changed).valid).toBe(false)
  })

  it('按 participantId 隔离保存教师个人进度', () => {
    let store = loadM02Store()
    store = updateParticipantM02Progress(store, 'T001', (current) => ({ ...current, route: 'rating' }))
    saveM02Store(store)
    const loaded = loadM02Store()
    expect(progressForParticipant(loaded, 'T001').route).toBe('rating')
    expect(progressForParticipant(loaded, 'T002').route).toBe('overview')
  })

  it('读取 v1 进度时把两条旧理由迁移为证据选择与综合结论', () => {
    const legacyProgress = createInitialM02Progress() as unknown as Record<string, unknown>
    legacyProgress.version = 1
    delete legacyProgress.selectionDecision
    legacyProgress.selectedModelId = 'A'
    legacyProgress.selectionReasons = [
      { dimension: 'teachingFit', paragraphId: 'A-intro', reason: '课堂导入适合零基础学生理解。' },
      { dimension: 'instructionFollowing', paragraphId: 'A-q2', comparedModelId: 'B', reason: '任务范围比模型 B 更清晰。' },
    ]
    window.localStorage.setItem(EARLIEST_M02_STORAGE_KEY, JSON.stringify({ version: 1, participants: { T001: legacyProgress } }))
    const migrated = progressForParticipant(loadM02Store(), 'T001')
    expect(migrated.version).toBe(3)
    expect(migrated.selectionDecision.evidenceDimensions).toEqual(['teachingFit', 'instructionFollowing'])
    expect(migrated.selectionDecision.comparedModelId).toBe('B')
    expect(migrated.selectionDecision.conclusion).toContain('课堂导入适合零基础学生理解')
  })

  it('读取原独立选择步骤时迁移到合并后的盲评与选择修正页', () => {
    const legacyProgress = createInitialM02Progress() as unknown as Record<string, unknown>
    legacyProgress.route = 'selection'
    window.localStorage.setItem(M02_STORAGE_KEY, JSON.stringify({ version: 3, participants: { T001: legacyProgress } }))

    expect(progressForParticipant(loadM02Store(), 'T001').route).toBe('rating')
  })

  it('读取三模型 v2 进度时保留 A/B 并使依赖模型 C 的选择失效', () => {
    const legacyProgress = createInitialM02Progress() as unknown as Record<string, unknown>
    legacyProgress.version = 2
    legacyProgress.run = { runId: 'legacy-three-models', status: 'succeeded', startedAt: '2026-08-12T00:00:00.000Z', results: { A: m02ModelResults.A, B: m02ModelResults.B, C: { blindId: 'C', status: 'succeeded', paragraphs: [] } } }
    legacyProgress.compliance = { A: m02ComplianceReference.A, B: m02ComplianceReference.B, C: { questionCount: '符合' } }
    legacyProgress.ratings = { A: {}, B: {}, C: {} }
    legacyProgress.revealedModelNames = { A: '智谱清言 GLM-4', B: '某开源模型', C: '某商用模型' }
    legacyProgress.selectedModelId = 'C'
    legacyProgress.selectionDecision = { evidenceDimensions: ['accuracy', 'clarity'], comparedModelId: 'A', conclusion: '旧版选择了模型 C。' }
    legacyProgress.peerReview = { ...(legacyProgress.peerReview as object), submitted: true }
    legacyProgress.groupConclusion = { ...(legacyProgress.groupConclusion as object), selectedModelId: 'C' }
    window.localStorage.setItem(LEGACY_M02_STORAGE_KEY, JSON.stringify({ version: 2, participants: { T001: legacyProgress } }))

    const migrated = progressForParticipant(loadM02Store(), 'T001')
    expect(migrated.version).toBe(3)
    expect(migrated.run?.results).toEqual({ A: m02ModelResults.A, B: m02ModelResults.B })
    expect(migrated.selectedModelId).toBeUndefined()
    expect(migrated.selectionDecision).toEqual({ evidenceDimensions: [], comparedModelId: undefined, conclusion: '' })
    expect(migrated.peerReview.submitted).toBe(false)
    expect(migrated.groupConclusion.selectedModelId).toBeUndefined()
  })

  it('五维评分参考顺序保持稳定', () => {
    const expected: M02RatingDimension[] = ['accuracy', 'instructionFollowing', 'teachingFit', 'clarity', 'safety']
    expect(m02RatingDimensions).toEqual(expected)
  })

  it('两个输出均按导入、题目、答案和解析拆分为稳定段落', () => {
    m02ModelIds.forEach((modelId) => {
      const kinds = new Set(m02ModelResults[modelId].paragraphs.map((item) => item.kind))
      expect(kinds).toEqual(new Set(['introduction', 'question', 'answer', 'analysis']))
      expect(new Set(m02ModelResults[modelId].paragraphs.map((item) => item.id)).size).toBe(m02ModelResults[modelId].paragraphs.length)
    })
  })
})
