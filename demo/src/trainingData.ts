import type {
  AiTutor,
  AssessmentPaper,
  CourseKnowledgeGraph,
  KnowledgeBase,
  PaperBlueprint,
  PracticalAssessment,
  QuestionBank,
  QuestionItem,
  TeacherAbilityReport,
  TrainingPlan,
  TrainingTask,
  TrainingTaskProgress,
} from './types'

export const initialKnowledgeBase: KnowledgeBase = {
  id: 'kb-visual-design',
  name: '文生图创意实践 · 课程知识库',
  status: 'draft',
  coverage: 78,
  duplicateRate: 3.2,
  documents: [
    { id: 'doc-1', name: '《生成式视觉设计》课程大纲.pdf', kind: '课程大纲', version: 'v2.1', chunks: 38, coverage: 92, status: '已就绪', updatedAt: '今天 09:12' },
    { id: 'doc-2', name: '提示词六要素与案例讲义.pdf', kind: '课程讲义', version: 'v1.4', chunks: 64, coverage: 96, status: '已就绪', updatedAt: '今天 09:18' },
    { id: 'doc-3', name: '视觉控制正反案例集.pptx', kind: '案例集', version: 'v1.2', chunks: 51, coverage: 84, status: '需关注', updatedAt: '昨天 16:40' },
    { id: 'doc-4', name: '课程习题与作品评分量规.docx', kind: '评分量规', version: 'v3.0', chunks: 0, coverage: 0, status: '待处理', updatedAt: '刚刚添加' },
  ],
}

export const initialKnowledgeGraph: CourseKnowledgeGraph = {
  generated: false,
  version: 'v1.0',
  updatedAt: '尚未生成',
  nodes: [
    { id: 'structure', name: '提示词基本结构', level: 1, mastery: 88, status: 'mastered', source: '提示词六要素与案例讲义', questionCount: 12 },
    { id: 'subject', name: '主体描述', level: 2, mastery: 82, status: 'mastered', source: '提示词六要素与案例讲义', questionCount: 8, prerequisite: 'structure' },
    { id: 'environment', name: '环境描述', level: 2, mastery: 76, status: 'learning', source: '视觉控制正反案例集', questionCount: 7, prerequisite: 'structure' },
    { id: 'composition', name: '构图与镜头', level: 3, mastery: 68, status: 'learning', source: '视觉控制正反案例集', questionCount: 10, prerequisite: 'structure' },
    { id: 'light', name: '光线与风格', level: 3, mastery: 71, status: 'learning', source: '视觉控制正反案例集', questionCount: 9, prerequisite: 'structure' },
    { id: 'negative', name: '负向提示词', level: 4, mastery: 54, status: 'weak', source: '课程习题与作品评分量规', questionCount: 6, prerequisite: 'composition' },
    { id: 'diagnosis', name: '生成偏差诊断', level: 4, mastery: 58, status: 'weak', source: '视觉控制正反案例集', questionCount: 5, prerequisite: 'negative' },
    { id: 'iteration', name: '提示词迭代', level: 4, mastery: 61, status: 'locked', source: '课程大纲', questionCount: 4, prerequisite: 'diagnosis' },
    { id: 'evaluation', name: '作品评价', level: 5, mastery: 46, status: 'locked', source: '课程习题与作品评分量规', questionCount: 3, prerequisite: 'iteration' },
  ],
  edges: [
    { from: 'structure', to: 'subject', relation: '包含' },
    { from: 'structure', to: 'environment', relation: '包含' },
    { from: 'structure', to: 'composition', relation: '包含' },
    { from: 'structure', to: 'light', relation: '包含' },
    { from: 'composition', to: 'negative', relation: '前置' },
    { from: 'negative', to: 'diagnosis', relation: '前置' },
    { from: 'diagnosis', to: 'iteration', relation: '前置' },
    { from: 'iteration', to: 'evaluation', relation: '前置' },
  ],
}

export const initialTutor: AiTutor = {
  configured: false,
  persona: {
    name: '启启助教',
    role: '《生成式视觉设计》课程助教',
    style: '先追问思路，再用对比案例引导，不直接替学生完成作品',
    boundary: '只基于课程知识库回答；缺少依据时明确建议咨询教师',
    avatar: '清爽青年教师',
    voice: '知性女声 · 温和',
    speed: 1,
  },
  deployment: {
    status: 'draft',
    version: 'v1.0',
    audience: '人工智能 2401 班',
    schedule: '全天开放',
    link: 'qijing.ai/tutor/visual-2401',
  },
  messages: [
    { id: 'm0', role: 'assistant', content: '你好，我是启启助教。我们可以从提示词结构、构图控制或生成偏差开始。' },
  ],
}

const source = {
  document: '提示词六要素与案例讲义.pdf',
  section: '3.2 画面控制与排除词',
  excerpt: '负向提示词应针对已经观察到的画面偏差，而不是堆叠通用质量词。',
  confidence: 94,
}

export const seededQuestions: QuestionItem[] = [
  { id: 'bank-1', type: '单选', stem: '提示词中的“广角镜头”主要控制哪一项？', answer: '画面视野与空间关系', explanation: '镜头词影响视野范围和透视感。', knowledgePoint: '构图与镜头', difficulty: 2, cognitiveLevel: '理解', score: 5, source, origin: '历史试题', usageCount: 4, correctRate: 82, enabled: true, similar: false },
  { id: 'bank-2', type: '判断', stem: '负向提示词越多，生成结果一定越准确。', answer: '错误', explanation: '排除词应针对偏差，过多可能压制有效特征。', knowledgePoint: '负向提示词', difficulty: 2, cognitiveLevel: '理解', score: 5, source, origin: '教师创建', usageCount: 2, correctRate: 64, enabled: true, similar: false },
  { id: 'bank-3', type: '多选', stem: '哪些描述能够直接影响画面构图？', answer: '对称构图、引导线、俯视镜头', explanation: '三项都描述了视角或视觉组织方式。', knowledgePoint: '构图与镜头', difficulty: 3, cognitiveLevel: '应用', score: 10, source, origin: 'AI生成', usageCount: 1, correctRate: 71, enabled: true, similar: false },
  { id: 'bank-4', type: '案例分析', stem: '分析“未来图书馆”作品焦点分散的原因，并提出两项提示词修改。', answer: '应明确视觉主体，并用镜头、光线建立焦点。', explanation: '从主体、构图和光线三个维度诊断。', knowledgePoint: '生成偏差诊断', difficulty: 4, cognitiveLevel: '分析', score: 20, source, origin: 'AI生成', usageCount: 1, correctRate: 58, enabled: true, similar: false, rubric: [{ label: '问题定位', score: 8, description: '准确识别主体与焦点问题' }, { label: '调整策略', score: 12, description: '提出可执行且对应偏差的修改' }] },
  { id: 'bank-5', type: '创作实操题', stem: '完成“未来学习空间”三轮提示词迭代，并解释每轮调整依据。', answer: '提交提示词、三版作品与迭代说明。', explanation: '综合考查结构、视觉控制和迭代评价。', knowledgePoint: '提示词迭代', difficulty: 5, cognitiveLevel: '创造', score: 40, source, origin: '教师创建', usageCount: 0, correctRate: 0, enabled: true, similar: false, rubric: [{ label: '任务符合度', score: 10, description: '完整回应任务与提交要求' }, { label: '视觉控制', score: 15, description: '能够通过构图与光线建立焦点' }, { label: '迭代依据', score: 15, description: '修改与结果变化存在清晰对应' }] },
]

export const initialQuestionBank: QuestionBank = { items: seededQuestions, version: 'v3.2' }

export const initialTrainingPlan: TrainingPlan | null = null
export const initialPracticalAssessment: PracticalAssessment | null = null

export const defaultBlueprint: PaperBlueprint = {
  scene: '单元测', duration: 45, totalScore: 100, machineScore: 30, aiScore: 50, manualScore: 20,
  difficulty: { basic: 30, advanced: 50, challenge: 20 },
}

export const initialPaper: AssessmentPaper | null = null

export const trainingTasks: TrainingTask[] = [
  { id: 'kb-create', title: '创建课程知识库', frequency: '课程初建', difficulty: 2, standardMinutes: 20, input: '课程资料', output: '可检索知识库', ability: '知识底座' },
  { id: 'kb-optimize', title: '检索与优化知识库', frequency: '每周', difficulty: 2, standardMinutes: 15, prerequisite: 'kb-create', input: '测试问题', output: '质量诊断', ability: '知识底座' },
  { id: 'graph-generate', title: '生成课程知识图谱', frequency: '每学期', difficulty: 3, standardMinutes: 20, prerequisite: 'kb-optimize', input: '课程知识库', output: '知识图谱', ability: '知识底座' },
  { id: 'agent-config', title: '配置课程智能体', frequency: '课程初建', difficulty: 3, standardMinutes: 25, prerequisite: 'graph-generate', input: '知识库与图谱', output: '助教角色规则', ability: 'AI助教' },
  { id: 'avatar-config', title: '配置数字人', frequency: '按需', difficulty: 2, standardMinutes: 15, prerequisite: 'agent-config', input: '形象与声音', output: '数字人形态', ability: 'AI助教' },
  { id: 'tutor-publish', title: '发布AI助教', frequency: '课程初建', difficulty: 3, standardMinutes: 10, prerequisite: 'avatar-config', input: '测试记录', output: '课程助教入口', ability: 'AI助教' },
  { id: 'question-generate', title: '智能出题', frequency: '每周', difficulty: 2, standardMinutes: 10, prerequisite: 'kb-optimize', input: '知识点与题型', output: '课程题目', ability: '命题组卷' },
  { id: 'training-design', title: '设计实训方案与实训题', frequency: '每单元', difficulty: 3, standardMinutes: 20, prerequisite: 'question-generate', input: '技能目标', output: '实训方案', ability: '命题组卷' },
  { id: 'paper-assemble', title: '智能组卷', frequency: '每月', difficulty: 3, standardMinutes: 15, prerequisite: 'question-generate', input: '题库与蓝图', output: '完整试卷', ability: '命题组卷' },
  { id: 'assignment-grade', title: 'AI批改', frequency: '每周', difficulty: 2, standardMinutes: 15, prerequisite: 'paper-assemble', input: '学生提交', output: '批改报告', ability: '批改分析' },
  { id: 'learning-analyze', title: '学情分析', frequency: '测评后', difficulty: 3, standardMinutes: 15, prerequisite: 'assignment-grade', input: '成绩与过程数据', output: '学生画像', ability: '批改分析' },
]

export const initialTaskProgress: TrainingTaskProgress[] = trainingTasks.map((task, index) => ({
  taskId: task.id,
  status: index === 0 ? 'available' : 'locked',
}))

export const initialTeacherReport: TeacherAbilityReport = {
  level: 'L1 AI入门者', completed: 0, total: trainingTasks.length,
  dimensions: [
    { label: 'AI 基础认知', value: 35 },
    { label: '提示词与多模态', value: 32 },
    { label: '知识库与智能体', value: 28 },
    { label: '教学融合', value: 38 },
    { label: '研究创新', value: 24 },
  ],
  nextTask: '创建课程知识库',
}
