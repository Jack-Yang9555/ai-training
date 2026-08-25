import type {
  M10BoundaryRule,
  M10FlowStep,
  M10PeerReview,
  M10Progress,
  M10SixElements,
  M10TeacherConfirmation,
} from './domain'

export const m10ElementMeta: Array<{ id: keyof M10SixElements; label: string; meaning: string; example: string }> = [
  { id: 'role', label: '角色', meaning: '说明助教的教学身份和教师责任', example: '例：文生图课程学习支持助教，教师保留最终判断' },
  { id: 'audience', label: '对象', meaning: '界定学生基础、课程和表达深度', example: '例：完成提示词入门的高职一年级学生' },
  { id: 'task', label: '任务', meaning: '限定答疑、导学、练习反馈和实训提示', example: '例：帮助学生找到依据、理解概念并自主完成任务' },
  { id: 'knowledge', label: '知识', meaning: '只使用已绑定的 M09 当前有效资料', example: '例：课程知识库 v1.0 的可定位片段' },
  { id: 'process', label: '流程', meaning: '按固定四步组织回答', example: '例：了解问题→检索→引用解释→检查理解' },
  { id: 'boundary', label: '边界', meaning: '引用五类可执行的异常处理规则', example: '例：超范围、代做、安全、最终成绩、敏感数据' },
]

export function createEmptyM10SixElements(): M10SixElements {
  return { role: '', audience: '', task: '', knowledge: '', process: '', boundary: '' }
}

export function createEmptyM10Flow(): M10FlowStep[] {
  return [
    { stepId: 'understand', order: 1, label: '先了解问题', action: '', failureHandling: '' },
    { stepId: 'retrieve', order: 2, label: '检索材料', action: '', failureHandling: '' },
    { stepId: 'explain', order: 3, label: '引用解释', action: '', failureHandling: '' },
    { stepId: 'check', order: 4, label: '检查理解', action: '', failureHandling: '' },
  ]
}

export function createEmptyM10Boundaries(): M10BoundaryRule[] {
  return [
    { ruleId: 'BR-01', type: 'out-of-scope', label: '超出资料范围', trigger: '', action: '说明边界并转交', response: '', handoff: '' },
    { ruleId: 'BR-02', type: 'do-work', label: '要求代做', trigger: '', action: '拒绝并引导', response: '', handoff: '' },
    { ruleId: 'BR-03', type: 'safety', label: '涉及安全', trigger: '', action: '暂停并转交', response: '', handoff: '' },
    { ruleId: 'BR-04', type: 'final-grade', label: '要求决定最终成绩', trigger: '', action: '说明边界并转交', response: '', handoff: '' },
    { ruleId: 'BR-05', type: 'sensitive-data', label: '处理敏感数据', trigger: '', action: '暂停并转交', response: '', handoff: '' },
  ]
}

export function createEmptyM10PeerReview(): M10PeerReview {
  return {
    reviewId: '', templateVersion: '1.0', reviewerId: '', reviewerGroupId: '', configurationFingerprint: '', checks: [], suggestion: '',
    disclosure: '当前 Demo 无多人后端；参训人员和同组关系来自当前目录，复核摘要由所选成员与配置指纹确定性模拟，不冒充实时提交。',
    submitted: false,
  }
}

export function createEmptyM10TeacherConfirmation(): M10TeacherConfirmation {
  return {
    knowledgeSourceConfirmed: false,
    roleBoundaryConfirmed: false,
    fourStepFlowConfirmed: false,
    fiveRulesConfirmed: false,
    humanTakeoverResponsibilityConfirmed: false,
  }
}

export function createInitialM10Progress(): M10Progress {
  return {
    version: 1,
    route: 'overview',
    sixElements: createEmptyM10SixElements(),
    flowSteps: createEmptyM10Flow(),
    boundaryRules: createEmptyM10Boundaries(),
    previews: [],
    peerReview: createEmptyM10PeerReview(),
    revisions: [],
    teacherConfirmation: createEmptyM10TeacherConfirmation(),
    attemptHistory: [],
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}
