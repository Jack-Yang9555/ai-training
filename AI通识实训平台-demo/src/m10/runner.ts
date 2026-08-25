import type { M09Progress } from '../m09/domain'
import { confirmedM09KnowledgeBaseIsCurrent, latestM09AssessmentIsCurrent } from '../m09/validation'
import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import { createEmptyM10PeerReview, createEmptyM10TeacherConfirmation } from './data'
import type {
  M10AttemptHistory,
  M10BoundaryRule,
  M10FlowStep,
  M10KnowledgeSource,
  M10PeerReview,
  M10PreviewRecord,
  M10Progress,
  M10RevisionRecord,
  M10SixElements,
} from './domain'

export function m10Hash(value: unknown) {
  const text = JSON.stringify(value)
  let result = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

export function m10KnowledgeSourceFingerprint(source?: M10KnowledgeSource) {
  return source ? m10Hash({
    participantId: source.participantId,
    knowledgeBaseId: source.knowledgeBaseId,
    version: source.version,
    sourceFingerprint: source.sourceFingerprint,
    confirmationFingerprint: source.confirmationFingerprint,
    assessmentId: source.m09AssessmentId,
    assessmentFingerprint: source.m09AssessmentFingerprint,
  }) : ''
}

export function m10ConfigurationFingerprint(progress: Pick<M10Progress, 'knowledgeSource' | 'sixElements' | 'flowSteps' | 'boundaryRules'>) {
  return m10Hash({
    source: m10KnowledgeSourceFingerprint(progress.knowledgeSource),
    sixElements: progress.sixElements,
    flowSteps: progress.flowSteps,
    boundaryRules: progress.boundaryRules,
  })
}

export function m10KnowledgeSourceFromM09(progress: M09Progress, directory: ParticipantDirectory): M10KnowledgeSource | undefined {
  const knowledgeBase = progress.confirmedKnowledgeBase
  const assessment = progress.assessments.at(-1)
  if (!knowledgeBase || !assessment || !confirmedM09KnowledgeBaseIsCurrent(progress, directory) || !latestM09AssessmentIsCurrent(progress, directory)) return undefined
  if (knowledgeBase.participantId !== directory.currentParticipantId || knowledgeBase.sourceIds.length < 2 || knowledgeBase.sourceIds.length > 5) return undefined
  const previewSegment = knowledgeBase.segments[0]
  if (!previewSegment) return undefined
  return {
    participantId: knowledgeBase.participantId,
    knowledgeBaseId: knowledgeBase.knowledgeBaseId,
    version: 'v1.0',
    courseName: knowledgeBase.courseName,
    audience: knowledgeBase.audience,
    scope: knowledgeBase.scope,
    sourceCount: knowledgeBase.sourceIds.length,
    segmentCount: knowledgeBase.segmentCount,
    sourceFingerprint: knowledgeBase.sourceFingerprint,
    confirmationFingerprint: knowledgeBase.confirmationFingerprint,
    m09AssessmentId: assessment.assessmentId,
    m09AssessmentFingerprint: assessment.contentFingerprint,
    m09ConfirmedAt: knowledgeBase.confirmedAt,
    previewSegment: {
      segmentId: previewSegment.segmentId,
      sourceId: previewSegment.sourceId,
      sourceLabel: `${previewSegment.sourceName} ${previewSegment.sourceVersion} · ${previewSegment.heading}`,
      excerpt: previewSegment.text,
    },
    current: true,
    passed: true,
  }
}

function attemptHasEvidence(progress: M10Progress) {
  return Boolean(
    progress.confirmedAssistant
    || progress.previews.length
    || progress.peerReview.reviewId
    || progress.revisions.length,
  )
}

export function archiveM10Attempt(progress: M10Progress, reason: string): M10AttemptHistory[] {
  if (!attemptHasEvidence(progress)) return progress.attemptHistory
  const signature = m10Hash({
    source: progress.knowledgeSource,
    sixElements: progress.sixElements,
    flowSteps: progress.flowSteps,
    boundaryRules: progress.boundaryRules,
    previews: progress.previews,
    peerReview: progress.peerReview,
    revisions: progress.revisions,
    confirmedAssistant: progress.confirmedAssistant,
  })
  const historyId = `M10-H-${signature}`
  if (progress.attemptHistory.some((item) => item.historyId === historyId)) return progress.attemptHistory
  return [...progress.attemptHistory, {
    historyId,
    invalidatedAt: new Date().toISOString(),
    reason,
    source: progress.knowledgeSource ? structuredClone(progress.knowledgeSource) : undefined,
    sixElements: structuredClone(progress.sixElements),
    flowSteps: structuredClone(progress.flowSteps),
    boundaryRules: structuredClone(progress.boundaryRules),
    previews: structuredClone(progress.previews),
    peerReview: structuredClone(progress.peerReview),
    revisions: structuredClone(progress.revisions),
    confirmedAssistant: progress.confirmedAssistant ? structuredClone(progress.confirmedAssistant) : undefined,
  }]
}

export function invalidateM10DerivedWork(progress: M10Progress, reason: string): M10Progress {
  return {
    ...progress,
    previews: [],
    peerReview: createEmptyM10PeerReview(),
    revisions: [],
    teacherConfirmation: createEmptyM10TeacherConfirmation(),
    confirmedAssistant: undefined,
    attemptHistory: archiveM10Attempt(progress, reason),
  }
}

export function invalidateM10Confirmation(progress: M10Progress, reason: string): M10Progress {
  return {
    ...progress,
    confirmedAssistant: undefined,
    attemptHistory: progress.confirmedAssistant ? archiveM10Attempt(progress, reason) : progress.attemptHistory,
  }
}

export function invalidateM10ReviewContext(progress: M10Progress, reason: string): M10Progress {
  return {
    ...progress,
    peerReview: createEmptyM10PeerReview(),
    revisions: [],
    teacherConfirmation: createEmptyM10TeacherConfirmation(),
    confirmedAssistant: undefined,
    attemptHistory: archiveM10Attempt(progress, reason),
  }
}

export function synchronizeM10Source(progress: M10Progress, source?: M10KnowledgeSource): M10Progress {
  const previous = m10KnowledgeSourceFingerprint(progress.knowledgeSource)
  const next = m10KnowledgeSourceFingerprint(source)
  if (previous === next) return progress
  const invalidated = invalidateM10DerivedWork(progress, source ? 'M09 当前有效知识库版本发生变化' : 'M09 当前通过或知识库证据已失效')
  return {
    ...invalidated,
    knowledgeSource: source ? structuredClone(source) : undefined,
    sixElements: { role: '', audience: '', task: '', knowledge: '', process: '', boundary: '' },
    flowSteps: invalidated.flowSteps.map((step) => ({ ...step, action: '', failureHandling: '' })),
    boundaryRules: invalidated.boundaryRules.map((rule) => ({ ...rule, trigger: '', response: '', handoff: '' })),
  }
}

export function createRecommendedM10Configuration(source: M10KnowledgeSource): {
  sixElements: M10SixElements
  flowSteps: M10FlowStep[]
  boundaryRules: M10BoundaryRule[]
} {
  const sixElements: M10SixElements = {
    role: `作为“${source.courseName}”学习支持助教，只提供有据解释与学习引导，教师负责审核发布和最终判断。`,
    audience: `${source.audience}；默认已完成当前课次导学，用可执行的分步表达，不预设学生已掌握未学内容。`,
    task: '用于课前导学、课程答疑、练习反馈和实训提示；帮助学生找到依据、理解概念并自主完成任务。',
    knowledge: `只绑定 ${source.knowledgeBaseId}（${source.version}）的 ${source.sourceCount} 份已审核资料；范围：${source.scope}。`,
    process: '固定执行“先了解问题→检索材料→引用解释→检查理解”，不跳步。',
    boundary: '超范围、代做、安全、最终成绩和敏感数据分别进入五类规则；不猜测、不代替教师决策。',
  }
  const flowSteps: M10FlowStep[] = [
    { stepId: 'understand', order: 1, label: '先了解问题', action: '识别学生意图、当前任务和已给条件；条件不足时先追问。', failureHandling: '问题不完整时追问教学对象、任务目标或输出要求。' },
    { stepId: 'retrieve', order: 2, label: '检索材料', action: '仅检索当前绑定知识库，定位资料、版本和原文片段。', failureHandling: '未命中可支持片段时停止生成事实答案，进入五类边界规则。' },
    { stepId: 'explain', order: 3, label: '引用解释', action: '先给出可定位来源，再用当前学生可理解的语言解释关键点。', failureHandling: '来源版本或含义不能确认时，说明不确定性并转交课程教师。' },
    { stepId: 'check', order: 4, label: '检查理解', action: '请学生用自己的话复述依据，或完成一个小步骤后自检。', failureHandling: '理解仍有偏差时回到对应片段重新解释，不替学生生成可直接提交的作业。' },
  ]
  const boundaryRules: M10BoundaryRule[] = [
    { ruleId: 'BR-01', type: 'out-of-scope', label: '超出资料范围', trigger: '问题与当前课程范围无关，或知识库无可支持片段。', action: '说明边界并转交', response: '当前资料不支持该结论，我不猜测也不生成引用，请交由课程教师核验。', handoff: '课程教师' },
    { ruleId: 'BR-02', type: 'do-work', label: '要求代做', trigger: '学生要求直接生成可提交的完整作品、答案或报告。', action: '拒绝并引导', response: '我不代替你完成可提交成果；可以拆分思路、提供核对清单并反馈你的当前版本。', handoff: '学生自主完成，必要时请教师指导' },
    { ruleId: 'BR-03', type: 'safety', label: '涉及安全', trigger: '问题要求未核验的设备、实验、健康或其他高风险操作步骤。', action: '暂停并转交', response: '暂停执行；当前资料不足以核验安全步骤，须按学校规范并由教师现场确认。', handoff: '课程教师或实训安全负责人' },
    { ruleId: 'BR-04', type: 'final-grade', label: '要求决定最终成绩', trigger: '要求 AI 直接判定最终分数、及格或奖惩结果。', action: '说明边界并转交', response: 'AI 只能提供基于量规的证据参考，不决定最终成绩；请由任课教师审核。', handoff: '任课教师' },
    { ruleId: 'BR-05', type: 'sensitive-data', label: '处理敏感数据', trigger: '对话含有真实姓名、联系方式、身份号码、健康或成绩明细等敏感数据。', action: '暂停并转交', response: '我不收集、不复述、不存储该信息；请先脱敏，再由教师按学校数据规范处理。', handoff: '课程教师或数据负责人' },
  ]
  return { sixElements, flowSteps, boundaryRules }
}

function makeTrace(progress: M10Progress, boundary: boolean) {
  return progress.flowSteps.map((step) => ({
    stepId: step.stepId,
    order: step.order,
    label: step.label,
    detail: boundary && step.stepId === 'retrieve'
      ? '未在当前知识库命中可支持片段，转入 BR-01，不生成事实引用。'
      : boundary && step.stepId === 'explain'
        ? '说明当前资料范围，不猜测答案。'
        : boundary && step.stepId === 'check'
          ? '确认学生知道已转交教师，不继续追问敏感信息。'
          : step.action,
    status: boundary && ['retrieve', 'explain'].includes(step.stepId) ? 'boundary' as const : 'completed' as const,
  }))
}

export class LocalM10AssistantRunner {
  configure(source: M10KnowledgeSource) {
    return createRecommendedM10Configuration(source)
  }

  preview(progress: M10Progress): M10PreviewRecord[] {
    if (!progress.knowledgeSource) return []
    const source = progress.knowledgeSource
    const configurationFingerprint = m10ConfigurationFingerprint(progress)
    const generatedAt = new Date().toISOString()
    const boundaryRule = progress.boundaryRules.find((item) => item.type === 'out-of-scope')
    return [
      {
        previewId: `M10-P-N-${m10Hash([source.sourceFingerprint, configurationFingerprint])}`,
        kind: 'normal',
        question: `请根据《${source.courseName}》当前资料，说明这个学习要点的依据。`,
        rawAnswer: `${source.previewSegment.excerpt} [1] ${source.previewSegment.sourceLabel}。请用自己的话复述一个关键依据，我再帮你核对。`,
        trace: makeTrace(progress, false),
        source: structuredClone(source.previewSegment),
        configurationFingerprint,
        generatedAt,
        readOnly: true,
      },
      {
        previewId: `M10-P-B-${m10Hash([source.sourceFingerprint, configurationFingerprint])}`,
        kind: 'boundary',
        question: '汽车电池绝缘检测的国家标准是多少？',
        rawAnswer: boundaryRule?.response ?? '当前资料不支持该结论，请交由课程教师核验。',
        trace: makeTrace(progress, true),
        triggeredRuleId: boundaryRule?.ruleId,
        triggeredRuleLabel: boundaryRule?.label,
        handoff: boundaryRule?.handoff,
        configurationFingerprint,
        generatedAt,
        readOnly: true,
      },
    ]
  }
}

export function eligibleM10Reviewers(directory: ParticipantDirectory): TrainingParticipant[] {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!current) return []
  return directory.participants.filter((item) => item.groupId === current.groupId && item.participantId !== current.participantId)
}

export function simulateM10PeerReview(progress: M10Progress, directory: ParticipantDirectory): M10PeerReview {
  const reviewer = eligibleM10Reviewers(directory).find((item) => item.participantId === progress.peerReview.reviewerId)
  return {
    ...progress.peerReview,
    reviewId: `M10-REVIEW-${m10Hash([reviewer?.participantId, m10ConfigurationFingerprint(progress)])}`,
    reviewerGroupId: reviewer?.groupId ?? '',
    configurationFingerprint: m10ConfigurationFingerprint(progress),
    checks: [
      { checkId: 'role', label: '角色和教师责任是否清楚', conclusion: '需调整', note: '已写教师最终判断，但建议补充“低置信度和安全场景由教师接管”，让人工接管可执行。' },
      { checkId: 'flow', label: '四步流程是否可执行', conclusion: '通过', note: '顺序固定，检索失败会进入边界处理，检查理解不会变成代做。' },
      { checkId: 'boundaries', label: '五类边界是否完整', conclusion: '通过', note: '五类规则的触发、合法动作、规范回应和转交对象齐全。' },
    ],
    suggestion: '在角色要素中补充低置信度和安全场景的教师接管条件。',
    submitted: false,
    submittedAt: undefined,
  }
}

export function applyM10ReferenceRevision(progress: M10Progress): M10Progress {
  if (!progress.peerReview.reviewId || !progress.peerReview.submitted || progress.revisions.length > 0) return progress
  const beforeValue = progress.sixElements.role
  const afterValue = `${beforeValue}低置信度或安全场景必须暂停自动回答，由课程教师接管。`
  const beforeConfigurationFingerprint = m10ConfigurationFingerprint(progress)
  const revisedBase: M10Progress = { ...progress, sixElements: { ...progress.sixElements, role: afterValue } }
  const afterConfigurationFingerprint = m10ConfigurationFingerprint(revisedBase)
  const revision: M10RevisionRecord = {
    revisionId: `M10-REV-${m10Hash([progress.peerReview.reviewId, afterConfigurationFingerprint])}`,
    field: '六要素·角色',
    beforeValue,
    afterValue,
    basis: progress.peerReview.suggestion,
    treatment: '采纳',
    reviewId: progress.peerReview.reviewId,
    beforeConfigurationFingerprint,
    afterConfigurationFingerprint,
    revisedAt: new Date().toISOString(),
  }
  const withRevision = { ...revisedBase, revisions: [revision] }
  return { ...withRevision, previews: new LocalM10AssistantRunner().preview(withRevision) }
}
