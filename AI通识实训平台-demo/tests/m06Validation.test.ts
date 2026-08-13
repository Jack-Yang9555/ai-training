import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialM06Progress } from '../src/m06/data'
import { m06CharacterCount, type M06Progress } from '../src/m06/domain'
import { buildM06PeerArtifacts } from '../src/m06/peerArtifacts'
import { LocalM06ContentRunner } from '../src/m06/runner'
import { calculateM06Score, createM06Assessment } from '../src/m06/scoring'
import { clearAllM06Progress, clearParticipantM06Progress, createConfirmedM06Package, loadM06Store, M06_STORAGE_KEY, m06ProgressForParticipant, saveM06Store, updateParticipantM06Progress } from '../src/m06/storage'
import { latestM06AssessmentIsCurrent, validateM06DeckAudit, validateM06Input, validateM06PeerReview, validateM06Video } from '../src/m06/validation'
import { createInitialPortalProgress } from '../src/training/storage'

async function completeM06(): Promise<{ progress: M06Progress; directory: ReturnType<typeof createInitialPortalProgress>['participantDirectory'] }> {
  const progress = createInitialM06Progress()
  const directory = createInitialPortalProgress().participantDirectory
  progress.input = { ...progress.input, sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true }
  const runner = new LocalM06ContentRunner()
  progress.draft = await runner.run(progress.input)
  progress.deckAudit = {
    checkedSlideIds: progress.draft.slides.map((slide) => slide.id),
    structureChecked: true, professionalContentChecked: true, textChecked: true, visualChecked: true,
    modifiedSlideId: progress.draft.slides[0].id, modifiedField: 'body', originalContent: progress.draft.slides[0].body,
    revisedContent: `${progress.draft.slides[0].body} 先说明证据边界。`, modificationBasis: '让导入内容与当前学生基础和课程材料中的复核要求更清楚地对应。',
  }
  progress.narrationReview = { revisedNarration: progress.draft.originalNarration, mappingConfirmed: true, terminologyChecked: true, teacherConfirmed: true }
  progress.avatarConfig = { ...progress.avatarConfig, presetOnlyConfirmed: true, subtitleChecked: true, authorizedMaterialConfirmed: true }
  progress.videoPreview = await runner.render(progress.draft)
  const artifact = buildM06PeerArtifacts(directory)[0]
  progress.peerReview = { reviewerId: artifact.participantId, reviewerRole: '核验员', artifactId: artifact.artifactId, teachingAdaptation: '适配', avatarCompliance: '合规', videoPlayable: '可播放', suggestion: '建议在最后一页明确复核结果的提交方式。', submitted: true }
  progress.teacherConfirmation = { peerDisposition: '已采纳', peerResponse: '已核对建议并确认最后一页行动路径清楚。', deckScriptConsistent: true, professionalAccuracyConfirmed: true, subtitleVisualConfirmed: true, finalResponsibilityConfirmed: true }
  progress.confirmedPackage = createConfirmedM06Package(progress, directory)
  return { progress, directory }
}

describe('M06 课件与数字人微课校验、评分和存储', () => {
  beforeEach(() => window.localStorage.removeItem(M06_STORAGE_KEY))

  it('任务内输入可独立通过，确定性生成 7 页和 150—180 字讲解稿', async () => {
    const { progress } = await completeM06()
    expect(validateM06Input(progress).valid).toBe(true)
    expect(progress.draft?.slides).toHaveLength(7)
    expect(m06CharacterCount(progress.draft?.originalNarration ?? '')).toBeGreaterThanOrEqual(150)
    expect(m06CharacterCount(progress.draft?.originalNarration ?? '')).toBeLessThanOrEqual(180)
    const second = await new LocalM06ContentRunner().run(progress.input)
    expect(second.slides).toEqual(progress.draft?.slides)
    expect(second.originalNarration).toBe(progress.draft?.originalNarration)
  })

  it('本地成果编号不参与内容隐私扫描，复用输入仍校验课程正文', () => {
    const progress = createInitialM06Progress()
    progress.input = { ...progress.input, sourceAssessmentId: 'm04-assessment-1786589746311', sourcePlanId: 'm04-plan-1786589744737', sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true }
    expect(validateM06Input(progress).valid).toBe(true)
    progress.input.verifiedMaterial = '联系电话：13800138000'
    expect(validateM06Input(progress).valid).toBe(false)
  })

  it('逐页核验和至少一处修改前后记录是硬门槛', async () => {
    const { progress } = await completeM06()
    expect(validateM06DeckAudit(progress).valid).toBe(true)
    progress.deckAudit.revisedContent = progress.deckAudit.originalContent
    expect(validateM06DeckAudit(progress).valid).toBe(false)
  })

  it('预设形象、45—60 秒、可播放与字幕同步同时满足', async () => {
    const { progress } = await completeM06()
    expect(validateM06Video(progress).valid).toBe(true)
    progress.videoPreview!.durationSeconds = 61
    expect(validateM06Video(progress).valid).toBe(false)
  })

  it('互评只接受当前同组其他成员', async () => {
    const { progress, directory } = await completeM06()
    expect(validateM06PeerReview(progress, directory).valid).toBe(true)
    progress.peerReview.reviewerId = directory.currentParticipantId
    expect(validateM06PeerReview(progress, directory).valid).toBe(false)
  })

  it('完整闭环得 10 分；实质内容变化保留旧历史但当前通过失效', async () => {
    const { progress, directory } = await completeM06()
    expect(calculateM06Score(progress, directory).total).toBe(10)
    expect(calculateM06Score(progress, directory).passed).toBe(true)
    progress.assessmentHistory.push(createM06Assessment(progress, directory))
    expect(latestM06AssessmentIsCurrent(progress, directory)).toBe(true)
    progress.narrationReview.revisedNarration = `${progress.narrationReview.revisedNarration.slice(0, -1)}！`
    expect(progress.assessmentHistory).toHaveLength(1)
    expect(latestM06AssessmentIsCurrent(progress, directory)).toBe(false)
  })

  it('按 participantId 隔离；任务内重置只删当前教师，全局重置删全部教师', () => {
    let store = loadM06Store()
    store = updateParticipantM06Progress(store, 'T001', (current) => ({ ...current, route: 'deck' }))
    store = updateParticipantM06Progress(store, 'T002', (current) => ({ ...current, route: 'narration' }))
    saveM06Store(store)
    expect(m06ProgressForParticipant(loadM06Store(), 'T001').route).toBe('deck')
    store = clearParticipantM06Progress(store, 'T001')
    expect(m06ProgressForParticipant(store, 'T001').route).toBe('overview')
    expect(m06ProgressForParticipant(store, 'T002').route).toBe('narration')
    expect(clearAllM06Progress().participants).toEqual({})
  })
})
