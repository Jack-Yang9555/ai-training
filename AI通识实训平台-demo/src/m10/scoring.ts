import type { ParticipantDirectory } from '../training/types'
import type { M10AssessmentRecord, M10Progress } from './domain'
import {
  confirmedM10AssistantIsCurrent,
  m10ContentFingerprint,
  validateM10Boundaries,
  validateM10Configuration,
  validateM10Confirmation,
  validateM10Flow,
  validateM10PeerReview,
  validateM10Previews,
  validateM10Revision,
  validateM10Source,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateM10Score(progress: M10Progress, directory: ParticipantDirectory) {
  const participantId = directory.currentParticipantId
  const source = validateM10Source(progress, participantId)
  const configuration = validateM10Configuration(progress, participantId)
  const flow = validateM10Flow(progress, participantId)
  const boundaries = validateM10Boundaries(progress, participantId)
  const previews = validateM10Previews(progress, participantId)
  const peer = validateM10PeerReview(progress, directory)
  const revision = validateM10Revision(progress, directory)
  const confirmation = validateM10Confirmation(progress, directory)
  const current = confirmedM10AssistantIsCurrent(progress, directory)
  const normal = progress.previews.find((item) => item.kind === 'normal')
  const boundary = progress.previews.find((item) => item.kind === 'boundary')
  const evidenceValid = previews.valid && Boolean(normal?.source && normal.rawAnswer.includes(normal.source.sourceLabel))
    && Boolean(boundary?.triggeredRuleId && !boundary.source && boundary.handoff)
  const iterationValid = peer.valid && revision.valid && progress.revisions.some((item) => item.beforeValue.trim() !== item.afterValue.trim() && item.basis.trim() && item.treatment)
  const safe = boundaries.valid
    && progress.teacherConfirmation.fiveRulesConfirmed
    && progress.teacherConfirmation.humanTakeoverResponsibilityConfirmed
  const sixComplete = Object.values(progress.sixElements).filter((value) => value.trim()).length
  const flowComplete = progress.flowSteps.filter((item) => item.action.trim() && item.failureHandling.trim()).length
  const ruleComplete = progress.boundaryRules.filter((item) => item.trigger.trim() && item.response.trim() && item.handoff.trim()).length
  const adaptationValid = configuration.valid && Boolean(progress.knowledgeSource
    && progress.sixElements.audience.includes(progress.knowledgeSource.audience)
    && progress.sixElements.role.includes(progress.knowledgeSource.courseName)
    && /(答疑|导学|练习反馈|实训提示)/u.test(progress.sixElements.task))

  const dimensions = [
    {
      id: 'completion' as const,
      label: '操作完成与核心步骤',
      score: scored(source.valid && configuration.valid && flow.valid && boundaries.valid && previews.valid && confirmation.valid && current, sixComplete > 0 || flowComplete > 0 || ruleComplete > 0),
      evidence: `M09 v1.0 ${source.valid ? '已绑定' : '待绑定'}；六要素 ${sixComplete}/6；流程 ${flowComplete}/4；边界 ${ruleComplete}/5；预览 ${progress.previews.length}/2；助教 v1.0 ${current ? '当前有效' : '待确认'}`,
    },
    {
      id: 'adaptation' as const,
      label: '教学场景适配',
      score: scored(adaptationValid, configuration.valid),
      evidence: adaptationValid ? `${progress.knowledgeSource?.courseName} · ${progress.knowledgeSource?.audience}，任务限定为答疑与学习支持` : '课程、对象、任务或六要素之间尚未形成一致引用',
    },
    {
      id: 'evidence' as const,
      label: '专业准确与证据',
      score: scored(evidenceValid, progress.previews.length > 0),
      evidence: evidenceValid ? '正常问题命中 M09 原文片段；边界问题命中规则、无伪造引用并转交' : '需用当前配置完成正常/边界双预览，并核对来源与规则路径',
    },
    {
      id: 'iteration' as const,
      label: '人工核验与迭代',
      score: scored(iterationValid, Boolean(progress.peerReview.reviewId || progress.revisions.length)),
      evidence: iterationValid ? `当前同组其他成员已互评；${progress.revisions.length} 条实质修改保留前后、依据与处理方式` : '须保留同组“需调整”事实，并完成至少 1 处有据的实质修改',
    },
    {
      id: 'safety' as const,
      label: '隐私、版权、伦理与安全',
      score: safe ? 2 as const : progress.boundaryRules.some((item) => item.trigger.trim() || item.response.trim()) ? 1 as const : 0 as const,
      evidence: safe ? '超范围、代做、安全、最终成绩、敏感数据五类规则均可执行，教师确认最终人工接管' : '五类规则、合法动作、转交对象或教师最终责任仍有缺项',
    },
  ]
  const coreRequirements = [
    { id: 'm09-source', label: '绑定当前教师 M09 已通过知识库 v1.0', passed: source.valid, route: 'source' as const },
    { id: 'six-and-flow', label: '六要素完整，固定四步动作与失败处理可执行', passed: configuration.valid && flow.valid, route: 'flow' as const },
    { id: 'five-boundaries', label: '五类边界规则完整且无越权动作', passed: boundaries.valid, route: 'boundaries' as const },
    { id: 'normal-boundary-preview', label: '正常/边界双预览显示四步、来源和规则', passed: previews.valid, route: 'preview' as const },
    { id: 'review-revision-confirm', label: '同组互评、至少 1 处实质修改和五项教师确认', passed: peer.valid && revision.valid && confirmation.valid && current, route: 'review-confirm' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createM10Assessment(progress: M10Progress, directory: ParticipantDirectory): M10AssessmentRecord {
  const result = calculateM10Score(progress, directory)
  return {
    assessmentId: `M10-ASSESS-${Date.now()}`,
    assessedAt: new Date().toISOString(),
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    total: result.total,
    passed: result.passed,
    contentFingerprint: m10ContentFingerprint(progress, directory),
  }
}
