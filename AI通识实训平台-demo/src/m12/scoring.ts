import type { ParticipantDirectory } from '../training/types'
import type { M12AssessmentRecord, M12Progress } from './domain'
import {
  confirmedM12BundleIsCurrent,
  m12ContentFingerprint,
  validateM12Assistant,
  validateM12Correction,
  validateM12Evidence,
  validateM12FirstRun,
  validateM12Flow,
  validateM12Retest,
  validateM12Revision,
  validateM12SafetyShowcase,
  validateM12TeacherConfirmation,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateM12Score(progress: M12Progress, participantId: string, directory: ParticipantDirectory) {
  const evidence = validateM12Evidence(progress, participantId)
  const flow = validateM12Flow(progress, participantId)
  const correction = validateM12Correction(progress)
  const assistant = validateM12Assistant(progress)
  const first = validateM12FirstRun(progress)
  const revision = validateM12Revision(progress)
  const retest = validateM12Retest(progress)
  const safety = validateM12SafetyShowcase(progress, directory, participantId)
  const confirmation = validateM12TeacherConfirmation(progress, participantId, directory)
  const currentBundle = confirmedM12BundleIsCurrent(progress, directory)
  const stageCount = new Set(progress.flow.map((item) => item.stage)).size
  const completeFlowFields = progress.flow.filter((item) => item.audience.trim() && item.teachingStep.trim() && item.objective.trim() && item.teacherAction.trim() && item.transition.trim()).length
  const firstPassed = progress.firstRun.records.filter((item) => item.result === 'success').length
  const retestPassed = progress.retest.records.filter((item) => item.result === 'success').length

  const dimensions = [
    {
      id: 'completion' as const,
      label: '操作完成与核心步骤',
      score: scored(evidence.valid && flow.valid && first.valid && retest.valid && currentBundle, progress.evidence.length === 10 && progress.flow.length > 0),
      evidence: `${progress.evidence.filter((item) => item.status === (progress.mode === 'official' ? 'current' : 'preview')).length}/10 类成果；${stageCount}/3 阶段；首轮 ${firstPassed}/4；复测 ${retestPassed}/4；确认版 ${currentBundle ? '当前有效' : '待形成'}`,
    },
    {
      id: 'adaptation' as const,
      label: '教学场景适配',
      score: scored(flow.valid, completeFlowFields > 0),
      evidence: flow.valid ? '10 个入口均说明对象、环节、目标、教师动作和阶段衔接' : `已完整说明 ${completeFlowFields}/10 个入口`,
    },
    {
      id: 'evidence' as const,
      label: '专业准确与证据',
      score: scored(correction.valid && assistant.valid, Boolean(progress.correction || progress.assistantCards.length)),
      evidence: correction.valid && assistant.valid ? 'AI 错误修正可追溯；有据回答可打开来源；越界回答无伪造引用并转交教师' : '修正案例或助教双场景证据仍有缺项',
    },
    {
      id: 'iteration' as const,
      label: '人工核验与迭代',
      score: scored(first.valid && revision.valid && retest.valid, Boolean(progress.firstRun.startedAt || progress.revision.savedAt)),
      evidence: retest.valid ? `首轮发现问题，保存 1 条实质修改并以同路径复测 ${retestPassed}/4` : '须保留首轮问题、修改前后、依据和同路径复测记录',
    },
    {
      id: 'safety' as const,
      label: '隐私、版权、伦理与安全',
      score: scored(safety.valid && confirmation.valid, progress.safety.scanRan),
      evidence: safety.valid && confirmation.valid ? '四项安全检查、AI 使用披露、小组展示和教师最终责任均已确认' : '安全检查、展示记录或最终责任确认仍有缺项',
    },
  ]
  const coreRequirements = [
    { id: 'evidence-flow', label: '10 类当前成果各出现一次并覆盖课前、课中、课后', passed: evidence.valid && flow.valid, route: 'orchestration' as const },
    { id: 'traceable-proof', label: 'AI 错误修正及助教有据回答/越界转交可追溯', passed: correction.valid && assistant.valid, route: 'assistant' as const },
    { id: 'integration-retest', label: '首轮联调发现问题，实质修改后同路径复测 4 / 4', passed: first.valid && revision.valid && retest.valid, route: 'integration' as const },
    { id: 'safety-confirmation', label: '四项安全、小组展示和教师最终确认完整', passed: safety.valid && confirmation.valid && currentBundle, route: 'safety' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  const eligibleForOfficialAssessment = progress.mode === 'official' && confirmation.valid && currentBundle
  const passed = eligibleForOfficialAssessment && total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed)
  return { dimensions, coreRequirements, total, hardGatesPassed, eligibleForOfficialAssessment, passed }
}

export function createM12Assessment(progress: M12Progress, participantId: string, directory: ParticipantDirectory): M12AssessmentRecord | undefined {
  const result = calculateM12Score(progress, participantId, directory)
  if (!result.eligibleForOfficialAssessment) return undefined
  return {
    assessmentId: `M12-ASSESS-${Date.now()}`,
    assessedAt: new Date().toISOString(),
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    total: result.total,
    passed: result.passed,
    contentFingerprint: m12ContentFingerprint(progress, directory),
  }
}
