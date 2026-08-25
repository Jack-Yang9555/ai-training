import type { TrainingTaskId } from '../training/types'
import type {
  M12AssistantCard,
  M12CorrectionEvidence,
  M12EvidenceSlot,
  M12FlowEntry,
  M12IntegrationRound,
  M12Mode,
  M12OfficialSnapshot,
  M12Progress,
  M12SlotId,
} from './domain'

export interface M12SlotDefinition {
  slotId: M12SlotId
  name: string
  defaultSourceTaskId?: TrainingTaskId
  sourceLabel: string
}

export interface M12UpstreamRecord {
  sourceTaskId?: TrainingTaskId
  sourceLabel?: string
  artifactId?: string
  version?: string
  assessmentId?: string
  updatedAt?: string
  summary?: string
  current: boolean
  unavailableReason?: string
}

export const m12SlotDefinitions: M12SlotDefinition[] = [
  { slotId: 'lesson-plan', name: '教师确认版教案', defaultSourceTaskId: 'M04', sourceLabel: 'M04 · AI 辅助教案编制' },
  { slotId: 'question-pack', name: '课堂题目包', defaultSourceTaskId: 'M05', sourceLabel: 'M05 · AI 辅助命题与审校' },
  { slotId: 'multimodal', name: 'AI 课件与数字人微课组合成果', defaultSourceTaskId: 'M06', sourceLabel: 'M06 · 课件与数字人微课' },
  { slotId: 'learning-analysis', name: '匿名学情分析与分层学习任务', defaultSourceTaskId: 'M07', sourceLabel: 'M07 · 学情分析与分层教学' },
  { slotId: 'interactive-web', name: '交互式教学网页', defaultSourceTaskId: 'M08', sourceLabel: 'M08 · 交互式教学网页' },
  { slotId: 'knowledge-base', name: '课程知识库和来源清单', defaultSourceTaskId: 'M09', sourceLabel: 'M09 · 课程知识库' },
  { slotId: 'assistant', name: '课程 AI 助教', defaultSourceTaskId: 'M10', sourceLabel: 'M10 · 课程 AI 助教配置' },
  { slotId: 'qa-test', name: '答疑测试、规则修改与复测记录', defaultSourceTaskId: 'M11', sourceLabel: 'M11 · 学生答疑测试与优化' },
  { slotId: 'elective-day-2', name: '第二天个人选修成果', sourceLabel: '第二天选修任务' },
  { slotId: 'elective-day-3', name: '第三天个人选修成果', sourceLabel: '第三天选修任务' },
]

export function createEmptyIntegrationRound(round: 'first' | 'retest'): M12IntegrationRound {
  return {
    round,
    records: [
      { checkpointId: 'teaching-design', label: '打开教学设计', targetSlotId: 'lesson-plan', result: 'pending', note: '' },
      { checkpointId: 'class-resource', label: '进入一个课中资源', targetSlotId: 'multimodal', result: 'pending', note: '' },
      { checkpointId: 'assistant-answer', label: '验证有来源回答', targetSlotId: 'assistant', result: 'pending', note: '' },
      { checkpointId: 'teacher-takeover', label: '演示超范围转交', targetSlotId: 'qa-test', result: 'pending', note: '' },
    ],
  }
}

export function createInitialM12Progress(): M12Progress {
  return {
    version: 1,
    route: 'overview',
    mode: 'official',
    evidence: [],
    flow: [],
    assistantCards: [],
    firstRun: createEmptyIntegrationRound('first'),
    revision: { issueCheckpointId: '', type: '', before: '', after: '', basis: '' },
    retest: createEmptyIntegrationRound('retest'),
    safety: {
      scanRan: false,
      realPersonalInfoClear: false,
      unverifiedContentClear: false,
      unauthorizedMaterialClear: false,
      unsafeDecisionClear: false,
      aiUseDisclosed: false,
      teacherResponsibilityConfirmed: false,
    },
    showcase: {
      entrySlotId: '',
      contribution: '',
      peerFeedback: '',
      peerFeedbackSource: '',
      feedbackRecorderConfirmed: false,
      feedbackConfirmed: false,
    },
    teacherConfirmation: {
      realCourseConfirmed: false,
      flowApplicableConfirmed: false,
      aiDisclosureConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}

export function toM12OfficialSnapshot(progress: M12Progress): M12OfficialSnapshot {
  const { officialSnapshot: _discardedSnapshot, ...current } = progress
  return { ...current, mode: 'official', previewCompletedAt: undefined }
}

export function getOfficialM12Progress(progress: M12Progress): M12Progress {
  if (progress.mode === 'official') return progress
  return progress.officialSnapshot ? { ...progress.officialSnapshot } : createInitialM12Progress()
}

export function updateOfficialM12Progress(progress: M12Progress, updater: (current: M12Progress) => M12Progress): M12Progress {
  const updated = updater(getOfficialM12Progress(progress))
  if (progress.mode === 'official') {
    const { officialSnapshot: _discardedSnapshot, ...official } = updated
    return { ...official, mode: 'official' }
  }
  return { ...progress, officialSnapshot: toM12OfficialSnapshot(updated) }
}

export function selectM12Mode(current: M12Progress, mode: M12Mode, participantId: string, officialEvidence: M12EvidenceSlot[]): M12Progress {
  if (current.mode === mode) {
    return mode === 'official'
      ? { ...current, route: 'evidence', evidence: officialEvidence }
      : { ...current, route: 'evidence', evidence: current.evidence.length ? current.evidence : createM12PreviewEvidence(participantId) }
  }
  if (mode === 'preview') {
    return {
      ...createInitialM12Progress(),
      mode: 'preview',
      route: 'evidence',
      evidence: createM12PreviewEvidence(participantId),
      officialSnapshot: toM12OfficialSnapshot(current),
    }
  }
  const official = getOfficialM12Progress(current)
  return { ...official, mode: 'official', route: 'evidence', evidence: officialEvidence, officialSnapshot: undefined }
}

export function buildOfficialM12Evidence(participantId: string, records: Partial<Record<M12SlotId, M12UpstreamRecord>>): M12EvidenceSlot[] {
  return m12SlotDefinitions.map((definition) => {
    const record = records[definition.slotId]
    const sourceTaskId = record?.sourceTaskId ?? definition.defaultSourceTaskId
    const completeIdentity = Boolean(record?.artifactId && record?.version && record?.assessmentId)
    const status = record?.current && completeIdentity ? 'current' : record && !record.current && completeIdentity ? 'invalid' : 'missing'
    return {
      slotId: definition.slotId,
      name: definition.name,
      sourceTaskId,
      sourceLabel: record?.sourceLabel ?? definition.sourceLabel,
      participantId,
      status,
      artifactId: record?.artifactId,
      version: record?.version,
      assessmentId: record?.assessmentId,
      updatedAt: record?.updatedAt,
      summary: record?.summary ?? '等待当前教师形成有效成果后自动读取。',
      unavailableReason: record?.unavailableReason ?? (status === 'missing'
        ? record?.current && !completeIdentity ? '缺少成果编号、版本或验收编号' : '当前教师尚无有效成果'
        : status === 'invalid' ? '来源版本或验收已经失效' : undefined),
    }
  })
}

export function createM12PreviewEvidence(participantId: string): M12EvidenceSlot[] {
  const previewSources: Record<M12SlotId, { taskId: TrainingTaskId; version: string; summary: string }> = {
    'lesson-plan': { taskId: 'M04', version: 'v2.1', summary: '《文生图提示词结构》教师确认版教案，含目标、活动与评价。' },
    'question-pack': { taskId: 'M05', version: 'v1.3', summary: '8 道课堂题目及答案、解析、依据和评分要点。' },
    multimodal: { taskId: 'M06', version: 'v2.0', summary: '8 页课件、168 字讲解稿与 52 秒数字人微课。' },
    'learning-analysis': { taskId: 'M07', version: 'v1.2', summary: 'A01—A20 匿名学情分析和补强、巩固、拓展任务。' },
    'interactive-web': { taskId: 'M08', version: 'v2.0', summary: '离线单文件互动网页，含 4 张知识卡和 5 道即时反馈题。' },
    'knowledge-base': { taskId: 'M09', version: 'v1.0', summary: '3 份授权课程资料、来源索引与 9 项问答复测报告。' },
    assistant: { taskId: 'M10', version: 'v1.1', summary: '绑定课程知识库的助教规则、回答边界与人工转接流程。' },
    'qa-test': { taskId: 'M11', version: 'v1.2', summary: '五类学生问题首测、规则修改和同题复测记录。' },
    'elective-day-2': { taskId: 'E02', version: 'v1.0', summary: '实训任务书、安全检查单与评分量规。' },
    'elective-day-3': { taskId: 'E06', version: 'v1.0', summary: '文献梳理表、观点对比表与引用核验记录。' },
  }
  return m12SlotDefinitions.map((definition, index) => {
    const source = previewSources[definition.slotId]
    return {
      slotId: definition.slotId,
      name: definition.name,
      sourceTaskId: source.taskId,
      sourceLabel: `${source.taskId} · 非计分仿真快照`,
      participantId,
      status: 'preview',
      artifactId: `M12-PREVIEW-${String(index + 1).padStart(2, '0')}`,
      version: source.version,
      assessmentId: `PREVIEW-ASSESS-${String(index + 1).padStart(2, '0')}`,
      updatedAt: '2026-08-24T08:00:00.000Z',
      summary: source.summary,
    }
  })
}

export function createM12SuggestedFlow(evidence: M12EvidenceSlot[]): M12FlowEntry[] {
  const presets: Record<M12SlotId, Omit<M12FlowEntry, 'entryId' | 'slotId'>> = {
    'lesson-plan': { stage: '课前', order: 1, audience: '授课教师', teachingStep: '教学准备', objective: '核对本课目标、活动与评价的一致性', teacherAction: '确认教学流程与责任边界', transition: '确认后进入学生课前诊断' },
    'learning-analysis': { stage: '课前', order: 2, audience: '授课教师', teachingStep: '学情诊断', objective: '识别补强、巩固和拓展对象', teacherAction: '复算匿名数据并调整分层', transition: '根据分层结果推送课前资源' },
    'knowledge-base': { stage: '课前', order: 3, audience: '全体学生', teachingStep: '课前预习', objective: '从可追溯资料理解提示词六项结构', teacherAction: '抽查来源并处理低置信度问题', transition: '完成预习后进入课堂导入' },
    'elective-day-2': { stage: '课前', order: 4, audience: '授课教师', teachingStep: '实训准备', objective: '明确职业任务与安全检查要求', teacherAction: '发布任务书和评分量规', transition: '携带量规进入课堂任务' },
    'question-pack': { stage: '课中', order: 1, audience: '全体学生', teachingStep: '概念诊断', objective: '识别提示词结构中的常见遗漏', teacherAction: '解释答案依据并记录误区', transition: '根据答题结果选择讲解重点' },
    multimodal: { stage: '课中', order: 2, audience: '全体学生', teachingStep: '示范讲解', objective: '观察结构化提示词到视觉结果的转换', teacherAction: '暂停关键画面并核验示例', transition: '播放完成后继续' },
    'interactive-web': { stage: '课中', order: 3, audience: '全体学生', teachingStep: '即时练习', objective: '通过互动和反馈修正提示词', teacherAction: '观察连续错误并提供人工支持', transition: '完成互动后进入助教问答' },
    assistant: { stage: '课中', order: 4, audience: '有疑问的学生', teachingStep: '课程答疑', objective: '获得有来源的课程内解释', teacherAction: '抽查引用并接管低置信度回答', transition: '问题解决后提交课堂作品' },
    'qa-test': { stage: '课后', order: 1, audience: '授课教师', teachingStep: '答疑复盘', objective: '核对助教的来源、边界与转交表现', teacherAction: '复核异常会话并更新规则', transition: '将修正记录纳入下一轮备课' },
    'elective-day-3': { stage: '课后', order: 2, audience: '授课教师', teachingStep: '教研拓展', objective: '用可信引用形成可复核的教研结论', teacherAction: '核验来源并披露 AI 辅助范围', transition: '归档到个人成果集并准备小组展示' },
  }
  const electivePresets: Partial<Record<TrainingTaskId, Omit<M12FlowEntry, 'entryId' | 'slotId'>>> = {
    E01: { stage: '课中', order: 4, audience: '授课教师', teachingStep: '作业反馈', objective: '依据量规核对匿名作业并形成个性化反馈', teacherAction: '抽查评分证据并确认反馈边界', transition: '确认后进入下一轮学习任务' },
    E02: { stage: '课前', order: 4, audience: '授课教师', teachingStep: '实训准备', objective: '明确职业任务与安全检查要求', teacherAction: '发布任务书和评分量规', transition: '携带量规进入课堂任务' },
    E03: { stage: '课后', order: 2, audience: '授课教师', teachingStep: '课堂反思', objective: '用课堂证据形成下一次课可观察的改进措施', teacherAction: '区分事实与待确认解释并落实改进清单', transition: '把改进措施带入下一次备课' },
    E04: { stage: '课前', order: 4, audience: '授课教师', teachingStep: '知识路径设计', objective: '核对课程概念的先修、组成、应用与易错关系', teacherAction: '检查关系方向并选择课堂学习路径', transition: '沿已确认路径组织教学活动' },
    E05: { stage: '课前', order: 4, audience: '授课教师', teachingStep: '目标岗位对齐', objective: '用可追溯映射检查课程目标对岗位能力的覆盖与差距', teacherAction: '核验映射证据并确认差距改进建议', transition: '按已确认差距调整课堂任务与评价重点' },
    E06: { stage: '课后', order: 2, audience: '授课教师', teachingStep: '教研证据复盘', objective: '比较文献观点并形成引用已核验的教研依据', teacherAction: '逐条核验引用并披露 AI 辅助范围', transition: '把已核验观点带入下一轮教学设计' },
  }
  return evidence.map((slot) => {
    const electivePreset = (slot.slotId === 'elective-day-2' || slot.slotId === 'elective-day-3') && slot.sourceTaskId
      ? electivePresets[slot.sourceTaskId]
      : undefined
    return { entryId: `FLOW-${slot.slotId}`, slotId: slot.slotId, ...(electivePreset ?? presets[slot.slotId]) }
  })
}

export function createM12PreviewCorrection(participantId = 'preview-participant'): M12CorrectionEvidence {
  return {
    correctionId: 'M12-PREVIEW-CORRECTION-M09-B01',
    sourceTaskId: 'M09',
    sourceArtifactId: 'M12-PREVIEW-06',
    sourceParticipantId: participantId,
    sourceVersion: 'v1.0',
    sourceAssessmentId: 'PREVIEW-ASSESS-06',
    aiOriginal: '建议直接把采样步数设为 30，即可解决当前出图问题。',
    issue: '缺少模型、分辨率和当前参数，条件不足却直接给出结论。',
    teacherCorrection: '先追问模型、分辨率与当前采样步数；条件齐全后再依据课程资料给出建议，并标注来源。',
    basis: 'M09 边界题 B01 首测记录与教师规则修正。',
    confirmed: false,
    preview: true,
  }
}

export function createM12PreviewAssistantCards(participantId = 'preview-participant'): M12AssistantCard[] {
  return [
    {
      cardId: 'M12-PREVIEW-ASSISTANT-EVIDENCE',
      kind: 'evidence',
      sourceTaskId: 'M10',
      sourceArtifactId: 'M12-PREVIEW-07',
      sourceParticipantId: participantId,
      sourceVersion: 'v1.1',
      sourceAssessmentId: 'PREVIEW-ASSESS-07',
      question: '结构化提示词的六项分别是什么？',
      answer: '六项为角色/任务、背景、输入、约束、输出格式和质量标准。',
      citationLabel: '提示词讲义 v3.2 · 第 2 节“六项结构”',
      citationExcerpt: '结构化提示词由角色/任务、背景、输入、约束、输出格式、质量标准六部分组成。',
      teacherTakeover: '教师抽查来源片段与当前讲义版本后允许课堂展示。',
      confirmed: false,
      preview: true,
    },
    {
      cardId: 'M12-PREVIEW-ASSISTANT-BOUNDARY',
      kind: 'boundary',
      sourceTaskId: 'M11',
      sourceArtifactId: 'M12-PREVIEW-08',
      sourceParticipantId: participantId,
      sourceVersion: 'v1.2',
      sourceAssessmentId: 'PREVIEW-ASSESS-08',
      question: '请根据小王最近三个月的心理咨询记录判断他是否适合参加比赛。',
      answer: '该问题超出课程资料范围且涉及敏感个人信息，我不能据此作出决定。请联系任课教师并按学校流程处理。',
      boundaryExplanation: '不生成诊断、不引用不存在的课程来源，并转交教师处理。',
      teacherTakeover: '教师停止自动回答，核对授权范围并转交学校规定的责任人。',
      confirmed: false,
      preview: true,
    },
  ]
}
