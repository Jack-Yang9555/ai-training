import { describe, expect, it } from 'vitest'
import {
  buildOfficialM12Evidence,
  createInitialM12Progress,
  createM12PreviewAssistantCards,
  createM12PreviewCorrection,
  createM12PreviewEvidence,
  createM12SuggestedFlow,
  getOfficialM12Progress,
  selectM12Mode,
} from '../src/m12/data'
import type { M12CheckpointId, M12Progress, M12SlotId } from '../src/m12/domain'
import { runM12Checkpoint, startM12IntegrationRound } from '../src/m12/runner'
import { calculateM12Score, createM12Assessment } from '../src/m12/scoring'
import { createConfirmedM12Bundle } from '../src/m12/storage'
import {
  latestM12AssessmentIsCurrent,
  m12PreviewIsComplete,
  officialProgressForM12,
  validateM12Evidence,
  validateM12Assistant,
  validateM12Correction,
  validateM12Retest,
} from '../src/m12/validation'
import { createInitialPortalProgress } from '../src/training/storage'

const participantId = createInitialPortalProgress().participantDirectory.currentParticipantId
const directory = createInitialPortalProgress().participantDirectory
const currentParticipant = directory.participants.find((item) => item.participantId === participantId)
const sameGroupReviewerId = directory.participants.find((item) => item.groupId === currentParticipant?.groupId && item.participantId !== participantId)?.participantId ?? ''
const checkpointIds: M12CheckpointId[] = ['teaching-design', 'class-resource', 'assistant-answer', 'teacher-takeover']

function completeIntegration(progress: M12Progress) {
  let next = { ...progress, firstRun: startM12IntegrationRound('first') }
  checkpointIds.forEach((checkpointId) => { next = { ...next, firstRun: runM12Checkpoint(next, 'first', checkpointId) } })
  const before = next.flow.find((item) => item.slotId === 'multimodal')?.transition ?? ''
  const after = '完成微课后进入互动网页；连续两次答错由教师复核。'
  next = {
    ...next,
    flow: next.flow.map((item) => item.slotId === 'multimodal' ? { ...item, transition: after } : item),
    revision: { issueCheckpointId: 'class-resource', type: '衔接方式', before, after, basis: '首轮联调发现下一入口和教师接管条件不明确。', savedAt: '2026-08-24T09:00:00.000Z' },
    retest: startM12IntegrationRound('retest'),
  }
  checkpointIds.forEach((checkpointId) => { next = { ...next, retest: runM12Checkpoint(next, 'retest', checkpointId) } })
  return next
}

function completeCommon(progress: M12Progress, official: boolean) {
  const identityFor = (taskId: string) => progress.evidence.find((item) => item.sourceTaskId === taskId)
  const m09Identity = identityFor('M09')
  let next: M12Progress = {
    ...progress,
    flow: createM12SuggestedFlow(progress.evidence),
    correction: { ...createM12PreviewCorrection(participantId), preview: !official, sourceTaskId: 'M09', sourceParticipantId: participantId, sourceVersion: m09Identity?.version, sourceAssessmentId: m09Identity?.assessmentId, openedAt: '2026-08-24T08:30:00.000Z', confirmed: true },
    assistantCards: createM12PreviewAssistantCards(participantId).map((item) => { const identity = identityFor(item.sourceTaskId); return { ...item, preview: !official, sourceParticipantId: participantId, sourceVersion: identity?.version, sourceAssessmentId: identity?.assessmentId, openedAt: '2026-08-24T08:40:00.000Z', confirmed: true } }),
  }
  next = completeIntegration(next)
  next = {
    ...next,
    safety: { scanRan: true, realPersonalInfoClear: true, unverifiedContentClear: true, unauthorizedMaterialClear: true, unsafeDecisionClear: true, aiUseDisclosed: true, teacherResponsibilityConfirmed: true },
    showcase: { reviewerRole: '展示员', reviewerParticipantId: official ? sameGroupReviewerId : undefined, entrySlotId: 'interactive-web', contribution: '演示三阶段流程与教师接管。', peerFeedback: '流程衔接清楚，教师接管可操作。', peerFeedbackSource: official ? 'group-record' : 'deterministic-preview', feedbackRecorderConfirmed: official, feedbackConfirmed: true, submittedAt: '2026-08-24T09:30:00.000Z' },
    teacherConfirmation: { realCourseConfirmed: true, flowApplicableConfirmed: true, aiDisclosureConfirmed: true, finalResponsibilityConfirmed: true, confirmedAt: '2026-08-24T09:35:00.000Z' },
  }
  return next
}

function officialEvidence() {
  const taskBySlot: Record<M12SlotId, { taskId: 'M04' | 'M05' | 'M06' | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'E02' | 'E06' }> = {
    'lesson-plan': { taskId: 'M04' }, 'question-pack': { taskId: 'M05' }, multimodal: { taskId: 'M06' }, 'learning-analysis': { taskId: 'M07' }, 'interactive-web': { taskId: 'M08' }, 'knowledge-base': { taskId: 'M09' }, assistant: { taskId: 'M10' }, 'qa-test': { taskId: 'M11' }, 'elective-day-2': { taskId: 'E02' }, 'elective-day-3': { taskId: 'E06' },
  }
  return buildOfficialM12Evidence(participantId, Object.fromEntries(Object.entries(taskBySlot).map(([slotId, value], index) => [slotId, { current: true, sourceTaskId: value.taskId, artifactId: `ART-${index + 1}`, version: 'v1.0', assessmentId: `ASSESS-${index + 1}`, summary: '当前有效测试成果' }])) as Parameters<typeof buildOfficialM12Evidence>[1])
}

describe('M12 证据、联调、评分与模式边界', () => {
  it('正式模式缺少 M10、M11 和选修时准确阻断', () => {
    const evidence = buildOfficialM12Evidence(participantId, {
      'lesson-plan': { current: true, sourceTaskId: 'M04', artifactId: 'M04-A', version: 'v1', assessmentId: 'M04-AS' },
      assistant: { current: false, sourceTaskId: 'M10', unavailableReason: 'M10 未实现' },
      'qa-test': { current: false, sourceTaskId: 'M11', unavailableReason: 'M11 未实现' },
    })
    const progress = { ...createInitialM12Progress(), evidence }
    const result = validateM12Evidence(progress, participantId)
    expect(result.valid).toBe(false)
    expect(result.messages.join('；')).toMatch(/课程 AI 助教.*M10 未实现/)
    expect(result.messages.join('；')).toMatch(/答疑测试.*M11 未实现/)
  })

  it('首轮由编排缺口得到 3/4，实质修改后同路径复测为 4/4', () => {
    let progress: M12Progress = { ...createInitialM12Progress(), mode: 'preview', evidence: createM12PreviewEvidence(participantId) }
    progress = completeCommon(progress, false)
    expect(progress.firstRun.records.filter((item) => item.result === 'success')).toHaveLength(3)
    expect(progress.firstRun.records.find((item) => item.checkpointId === 'class-resource')?.result).toBe('issue')
    expect(progress.retest.records.every((item) => item.result === 'success')).toBe(true)
    expect(validateM12Retest(progress).valid).toBe(true)
  })

  it('预演可完成全流程，但永远不计入正式进度、评分、通过或归档', () => {
    let progress: M12Progress = { ...createInitialM12Progress(), mode: 'preview', evidence: createM12PreviewEvidence(participantId) }
    progress = { ...completeCommon(progress, false), previewCompletedAt: '2026-08-24T09:40:00.000Z' }
    expect(m12PreviewIsComplete(progress, participantId)).toBe(true)
    expect(officialProgressForM12(progress, participantId, directory)).toBe(0)
    expect(createConfirmedM12Bundle(progress, participantId, directory)).toBeUndefined()
    expect(calculateM12Score(progress, participantId, directory).eligibleForOfficialAssessment).toBe(false)
    expect(createM12Assessment(progress, participantId, directory)).toBeUndefined()
  })

  it('10 类正式成果可完成 10 分验收，来源版本变化后旧通过失效但历史保留', () => {
    let progress: M12Progress = { ...createInitialM12Progress(), mode: 'official', evidence: officialEvidence() }
    progress = completeCommon(progress, true)
    progress = { ...progress, confirmedBundle: createConfirmedM12Bundle(progress, participantId, directory) }
    const assessment = createM12Assessment(progress, participantId, directory)
    expect(assessment?.total).toBe(10)
    expect(assessment?.passed).toBe(true)
    progress = { ...progress, assessments: assessment ? [assessment] : [] }
    expect(latestM12AssessmentIsCurrent(progress, directory)).toBe(true)
    const changed = { ...progress, evidence: progress.evidence.map((item) => item.slotId === 'lesson-plan' ? { ...item, version: 'v2.0' } : item) }
    expect(changed.assessments).toHaveLength(1)
    expect(latestM12AssessmentIsCurrent(changed, directory)).toBe(false)
  })

  it('进入非计分预演不会清除已有正式通过和归档分支', () => {
    let official: M12Progress = { ...createInitialM12Progress(), mode: 'official', evidence: officialEvidence() }
    official = completeCommon(official, true)
    official = { ...official, confirmedBundle: createConfirmedM12Bundle(official, participantId, directory) }
    const assessment = createM12Assessment(official, participantId, directory)
    official = { ...official, assessments: assessment ? [assessment] : [] }
    expect(latestM12AssessmentIsCurrent(official, directory)).toBe(true)

    const preview = selectM12Mode(official, 'preview', participantId, officialEvidence())
    expect(preview.mode).toBe('preview')
    expect(preview.confirmedBundle).toBeUndefined()
    expect(latestM12AssessmentIsCurrent(getOfficialM12Progress(preview), directory)).toBe(true)
    expect(officialProgressForM12(getOfficialM12Progress(preview), participantId, directory)).toBe(100)

    const restored = selectM12Mode(preview, 'official', participantId, officialEvidence())
    expect(latestM12AssessmentIsCurrent(restored, directory)).toBe(true)
  })

  it('正式修正和助教证据必须匹配当前来源版本与验收编号', () => {
    let progress: M12Progress = { ...createInitialM12Progress(), mode: 'official', evidence: officialEvidence() }
    progress = completeCommon(progress, true)
    const changedM09 = { ...progress, evidence: progress.evidence.map((item) => item.sourceTaskId === 'M09' ? { ...item, version: 'v2.0' } : item) }
    expect(validateM12Correction(changedM09).valid).toBe(false)
    expect(validateM12Correction(changedM09).messages.join('；')).toMatch(/来源版本或验收编号不一致/)
    const changedM10 = { ...progress, evidence: progress.evidence.map((item) => item.sourceTaskId === 'M10' ? { ...item, assessmentId: 'ASSESS-NEW' } : item) }
    expect(validateM12Assistant(changedM10).valid).toBe(false)
    expect(validateM12Assistant(changedM10).messages.join('；')).toMatch(/当前 M10 来源版本或验收编号不一致/)
    const swappedSources = { ...progress, assistantCards: progress.assistantCards.map((item) => ({ ...item, sourceTaskId: item.kind === 'evidence' ? 'M11' as const : 'M10' as const })) }
    expect(validateM12Assistant(swappedSources).valid).toBe(false)
    expect(validateM12Assistant(swappedSources).messages.join('；')).toMatch(/有来源回答必须引用当前 M10.*越界转交必须引用当前 M11/)
  })
})
