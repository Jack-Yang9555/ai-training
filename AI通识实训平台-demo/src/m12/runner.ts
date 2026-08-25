import { createEmptyIntegrationRound } from './data'
import type { M12CheckpointId, M12IntegrationRecord, M12IntegrationRound, M12Progress } from './domain'

function entryFor(progress: M12Progress, slotId: M12IntegrationRecord['targetSlotId']) {
  return progress.flow.find((item) => item.slotId === slotId)
}

function evaluateCheckpoint(progress: M12Progress, checkpointId: M12CheckpointId): Pick<M12IntegrationRecord, 'result' | 'note'> {
  if (checkpointId === 'teaching-design') {
    const entry = entryFor(progress, 'lesson-plan')
    return entry?.teacherAction.trim() && entry.objective.trim()
      ? { result: 'success', note: `已打开教师确认版教案；教师动作：${entry.teacherAction}` }
      : { result: 'issue', note: '教学设计入口缺少目标或教师动作，无法说明如何进入实际教学。' }
  }
  if (checkpointId === 'class-resource') {
    const entry = entryFor(progress, 'multimodal')
    const transitionReady = Boolean(entry?.transition.includes('进入互动网页') && entry.transition.includes('教师复核'))
    return transitionReady
      ? { result: 'success', note: `微课后衔接已明确：${entry?.transition}` }
      : { result: 'issue', note: '微课结束后的下一入口和连续错误时的教师动作不明确，流程在课中中断。' }
  }
  if (checkpointId === 'assistant-answer') {
    const evidence = progress.assistantCards.find((item) => item.kind === 'evidence')
    return evidence?.openedAt && evidence.confirmed && evidence.citationLabel && evidence.citationExcerpt
      ? { result: 'success', note: `有据回答可回到 ${evidence.citationLabel}` }
      : { result: 'issue', note: '有据回答尚未打开来源片段并确认。' }
  }
  const boundary = progress.assistantCards.find((item) => item.kind === 'boundary')
  return boundary?.confirmed && !boundary.citationLabel && Boolean(boundary.teacherTakeover.trim())
    ? { result: 'success', note: `超范围回答未伪造来源，并转交教师：${boundary.teacherTakeover}` }
    : { result: 'issue', note: '超范围回答仍缺少规范说明或教师接管动作。' }
}

export function startM12IntegrationRound(round: 'first' | 'retest'): M12IntegrationRound {
  return { ...createEmptyIntegrationRound(round), startedAt: new Date().toISOString() }
}

export function runM12Checkpoint(progress: M12Progress, round: 'first' | 'retest', checkpointId: M12CheckpointId): M12IntegrationRound {
  const currentRound = round === 'first' ? progress.firstRun : progress.retest
  const baseRound = currentRound.startedAt ? currentRound : startM12IntegrationRound(round)
  const outcome = evaluateCheckpoint(progress, checkpointId)
  return {
    ...baseRound,
    records: baseRound.records.map((record) => record.checkpointId === checkpointId
      ? { ...record, ...outcome, openedAt: new Date().toISOString() }
      : record),
  }
}

