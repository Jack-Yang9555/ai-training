import { describe, expect, it } from 'vitest'
import { correctedM09AnswerRule, createInitialM09Progress, createM09SampleSources } from '../src/m09/data'
import type { M09Progress } from '../src/m09/domain'
import { applyRecommendedM09Quality, createM09Correction, LocalM09KnowledgeRunner, m09SourceFingerprint, simulateM09PeerTest } from '../src/m09/runner'
import { calculateM09Score, createM09Assessment } from '../src/m09/scoring'
import { createConfirmedM09KnowledgeBase, clearParticipantM09Progress, m09ProgressForParticipant, updateParticipantM09Progress, type M09ProgressStore } from '../src/m09/storage'
import { confirmedM09KnowledgeBaseIsCurrent, latestM09AssessmentIsCurrent, m09UnsafeFindings, validateM09Build, validateM09Confirmation, validateM09CorrectionRetest, validateM09FirstTest, validateM09Quality, validateM09Sources } from '../src/m09/validation'
import { createInitialPortalProgress } from '../src/training/storage'

function progressThroughFirstTest() {
  let progress = createInitialM09Progress()
  progress.sources = applyRecommendedM09Quality(createM09SampleSources())
  progress.knowledgeBase = new LocalM09KnowledgeRunner().build(progress, 'T001')
  progress.firstTest = new LocalM09KnowledgeRunner().runTests(progress, 'first').map((item) => ({ ...item, teacherVerified: true }))
  progress.firstTestFrozen = true
  return progress
}

function progressThroughRetest() {
  const progress = progressThroughFirstTest()
  const correction = createM09Correction(progress)
  progress.corrections = [correction]
  progress.answerRule = { version: correction.ruleVersion, text: correction.after }
  progress.retest = new LocalM09KnowledgeRunner().runTests(progress, 'retest').map((item) => ({ ...item, teacherVerified: true }))
  return progress
}

describe('M09 课程知识库确定性验收', () => {
  it('只允许 2—5 份来源，并定位重复、授权和敏感内容', () => {
    const progress = createInitialM09Progress()
    progress.sources = createM09SampleSources().slice(0, 1)
    expect(validateM09Sources(progress).valid).toBe(false)
    progress.sources = createM09SampleSources()
    expect(validateM09Sources(progress).valid).toBe(true)
    progress.sources.push({ ...progress.sources[0], sourceId: 'S05' })
    expect(validateM09Sources(progress).messages.join('')).toContain('同名同版本重复')
    progress.sources = createM09SampleSources()
    progress.sources[0].content += '\n学生电话 13800138000，api_key: secret-demo-value'
    expect(m09UnsafeFindings(progress.sources[0])).toEqual(expect.arrayContaining(['手机号', '密钥或口令']))
    expect(validateM09Sources(progress).valid).toBe(false)
  })

  it('四类质量检查逐项生效，替换版本后才可建立当前 v0', () => {
    const progress = createInitialM09Progress()
    progress.sources = createM09SampleSources()
    expect(validateM09Quality(progress).valid).toBe(false)
    progress.sources = applyRecommendedM09Quality(progress.sources)
    expect(progress.sources.find((item) => item.sourceId === 'S02')?.version).toBe('2.1')
    expect(progress.sources.find((item) => item.sourceId === 'S04')?.version).toBe('3.0')
    expect(validateM09Quality(progress).valid).toBe(true)
    progress.knowledgeBase = new LocalM09KnowledgeRunner().build(progress, 'T001')
    expect(validateM09Build(progress).valid).toBe(true)
    const before = progress.knowledgeBase.sourceFingerprint
    progress.sources[0].version = '2026.2'
    expect(m09SourceFingerprint(progress.sources)).not.toBe(before)
    expect(validateM09Build(progress).valid).toBe(false)
  })

  it('首测稳定为 8/9，只有相关规则修正后同题复测才到 9/9', () => {
    const first = progressThroughFirstTest()
    expect(first.firstTest).toHaveLength(9)
    expect(first.firstTest.filter((item) => item.type === 'evidence')).toHaveLength(5)
    expect(first.firstTest.filter((item) => item.teacherResult === '符合预期')).toHaveLength(8)
    expect(first.firstTest.find((item) => item.questionId === 'B01')?.teacherResult).toBe('需修正')
    expect(validateM09FirstTest(first).valid).toBe(true)

    const irrelevant: M09Progress = structuredClone(first)
    irrelevant.correctionDraft.after = '所有回答都要写得更简洁。'
    const irrelevantCorrection = createM09Correction(irrelevant)
    irrelevant.corrections = [irrelevantCorrection]
    irrelevant.answerRule = { version: irrelevantCorrection.ruleVersion, text: irrelevantCorrection.after }
    irrelevant.retest = new LocalM09KnowledgeRunner().runTests(irrelevant, 'retest').map((item) => ({ ...item, teacherVerified: true }))
    expect(irrelevant.retest.find((item) => item.questionId === 'B01')?.teacherResult).toBe('需修正')
    expect(validateM09CorrectionRetest(irrelevant).valid).toBe(false)

    const corrected = progressThroughRetest()
    expect(corrected.answerRule.text).toBe(correctedM09AnswerRule)
    expect(corrected.retest.filter((item) => item.teacherResult === '符合预期')).toHaveLength(9)
    expect(corrected.retest.map((item) => item.questionId)).toEqual(corrected.firstTest.map((item) => item.questionId))
    expect(validateM09CorrectionRetest(corrected).valid).toBe(true)
  })

  it('同组测试、教师确认、五维硬门槛和当前指纹共同决定通过', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const progress = progressThroughRetest()
    const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)!
    const peer = directory.participants.find((item) => item.groupId === current.groupId && item.participantId !== current.participantId)!
    progress.peerTest = { ...progress.peerTest, reviewerId: peer.participantId, reviewerRole: '核验员', boundaryQuestionId: 'B01' }
    progress.peerTest = { ...simulateM09PeerTest(progress, directory), submitted: true, submittedAt: new Date().toISOString() }
    progress.teacherConfirmation = { scopeConfirmed: true, sourcesConfirmed: true, boundaryConfirmed: true, safetyConfirmed: true, maintenanceResponsibilityConfirmed: true }
    expect(validateM09Confirmation(progress, directory).valid).toBe(true)
    progress.confirmedKnowledgeBase = createConfirmedM09KnowledgeBase(progress, directory)
    expect(confirmedM09KnowledgeBaseIsCurrent(progress, directory)).toBe(true)
    const score = calculateM09Score(progress, directory)
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)
    expect(score.dimensions.find((item) => item.id === 'completion')?.evidence).toContain('首测答对 8/9（暴露 1 项问题）')
    expect(score.dimensions.find((item) => item.id === 'completion')?.evidence).toContain('复测答对 9/9')
    progress.assessments.push(createM09Assessment(progress, directory))
    expect(latestM09AssessmentIsCurrent(progress, directory)).toBe(true)
    progress.teacherConfirmation.boundaryConfirmed = false
    expect(latestM09AssessmentIsCurrent(progress, directory)).toBe(false)
    expect(progress.assessments).toHaveLength(1)
  })

  it('按 participantId 隔离，任务内重置只清当前教师', () => {
    let store: M09ProgressStore = { version: 1, participants: {} }
    store = updateParticipantM09Progress(store, 'T001', (current) => ({ ...current, sources: createM09SampleSources() }))
    store = updateParticipantM09Progress(store, 'T002', (current) => ({ ...current, importNotice: 'T002 独立进度' }))
    expect(m09ProgressForParticipant(store, 'T001').sources).toHaveLength(4)
    expect(m09ProgressForParticipant(store, 'T002').sources).toHaveLength(0)
    store = clearParticipantM09Progress(store, 'T001')
    expect(m09ProgressForParticipant(store, 'T001').sources).toHaveLength(0)
    expect(m09ProgressForParticipant(store, 'T002').importNotice).toBe('T002 独立进度')
  })
})
