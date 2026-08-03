import type {
  AssessmentReport,
  AssessmentSubmission,
  KnowledgePoint,
  LearningRecord,
  LessonPlan,
  PracticeSet,
} from './types'

export const knowledgePoints: KnowledgePoint[] = [
  {
    id: 'structure',
    name: '提示词结构',
    mastery: 82,
    difficulty: {
      level: 2,
      label: '入门',
      reason: '结构清晰且前置知识少，主要考查理解与套用',
    },
  },
  {
    id: 'composition',
    name: '画面与构图控制',
    mastery: 68,
    difficulty: {
      level: 3,
      label: '进阶',
      reason: '需要将镜头、构图和光线概念组合应用',
    },
    prerequisite: '提示词结构',
  },
  {
    id: 'negative',
    name: '负向提示词',
    mastery: 54,
    difficulty: {
      level: 4,
      label: '挑战',
      reason: '班级历史错误率46%，且需要根据生成偏差反向诊断',
    },
    prerequisite: '画面与构图控制',
  },
  {
    id: 'iteration',
    name: '迭代与评估',
    mastery: 61,
    difficulty: {
      level: 4,
      label: '挑战',
      reason: '涉及分析、评价和多轮决策，认知负荷较高',
    },
    prerequisite: '负向提示词',
  },
]

export const lessonPlan: LessonPlan = {
  title: '从自然语言描述到高质量视觉作品',
  subtitle: '生成式视觉设计 · 第 3 课',
  duration: 45,
  objectives: [
    '掌握结构化提示词的六个关键要素',
    '能够使用构图与光线词控制画面',
    '能够诊断生成偏差并完成有效迭代',
  ],
  knowledgePoints,
  steps: [
    {
      id: 's1',
      title: '视觉猜想',
      description: '观察两张作品，反推可能的提示词差异',
      duration: 5,
      type: 'warmup',
      resource: 'AI 导入活动',
    },
    {
      id: 's2',
      title: '结构化提示词',
      description: '主体、环境、媒介、构图、光线与细节',
      duration: 10,
      type: 'concept',
      resource: '概念微课',
    },
    {
      id: 's3',
      title: '好坏案例对比',
      description: '定位模糊描述与画面偏差的对应关系',
      duration: 7,
      type: 'compare',
      resource: '对比画布',
    },
    {
      id: 's4',
      title: '未来学习空间',
      description: '完成提示词编写、生成与一次迭代',
      duration: 18,
      type: 'practice',
      resource: '文生图任务',
    },
    {
      id: 's5',
      title: '即时检测',
      description: '3 道概念题 + 作品自评卡',
      duration: 5,
      type: 'quiz',
      resource: '随堂测',
    },
  ],
}

export const learningRecords: LearningRecord[] = [
  { label: '今日学习', value: '32 分钟', delta: '+8 分钟' },
  { label: '练习正确率', value: '76%', delta: '+12%' },
  { label: '作品迭代', value: '3 版', delta: '新增 1 版' },
  { label: '能力变化', value: '+6', delta: '视觉控制' },
]

export const initialPracticeSet: PracticeSet = {
  title: '今日随堂练习',
  reason: '跟随当前教学环节，覆盖提示词结构与构图控制',
  questions: [
    {
      id: 'q1',
      title: '找出这段提示词中的主体与环境',
      hint: '用不同颜色标记两个要素',
      difficulty: { level: 1, label: '基础', reason: '直接识别已讲授概念，单步骤完成' },
      knowledgePoint: '提示词结构',
      completed: true,
    },
    {
      id: 'q2',
      title: '补全未来图书馆的光线与镜头描述',
      hint: '思考时间、方向和景别',
      difficulty: { level: 3, label: '进阶', reason: '需要组合两个视觉控制维度' },
      knowledgePoint: '画面与构图控制',
      completed: false,
    },
  ],
}

export const initialSubmission: AssessmentSubmission = {
  student: '林一诺',
  studentId: 'AI24018',
  status: '待复核',
  submittedAt: '今天 10:26',
  machine: { value: 27, max: 30, correct: 9, total: 10 },
  ai: {
    value: 43,
    originalValue: 43,
    max: 50,
    confidence: 92,
    evidence: [
      { label: '任务符合度', value: 9, max: 10, note: '主体、场景和风格均与任务要求一致' },
      { label: '提示词结构', value: 9, max: 10, note: '六要素完整，媒介与细节描述清晰' },
      { label: '视觉表达', value: 8, max: 10, note: '景深与光线统一，局部层级仍可加强' },
      { label: '创意表现', value: 8, max: 10, note: '玻璃温室与知识流动的隐喻有辨识度' },
      { label: '内容安全', value: 9, max: 10, note: '未检测到敏感、侵权或不适宜元素' },
    ],
  },
  manual: {
    value: 18,
    max: 20,
    note: '迭代记录完整，能解释每次修改与画面变化。',
  },
}

export const report: AssessmentReport = {
  completionRate: 94,
  averageScore: 84.6,
  aiReviewRate: 22,
  difficultyFit: 87,
  recommendations: [
    {
      priority: '立即补强',
      title: '负向提示词诊断',
      description: '14 名学生无法根据画面偏差选择有效的排除词，建议先完成对比案例。',
      action: '生成补学任务',
    },
    {
      priority: '继续巩固',
      title: '构图控制迁移',
      description: '将对称构图迁移到引导线构图，建议增加一个限制条件练习。',
      action: '加入课后练习',
    },
    {
      priority: '拓展挑战',
      title: '建立个人视觉风格',
      description: '8 名学生已稳定完成基础控制，可尝试形成可复用的风格词库。',
      action: '发布挑战任务',
    },
  ],
}

export const scoreDistribution = [
  { range: '<60', count: 2 },
  { range: '60–69', count: 3 },
  { range: '70–79', count: 7 },
  { range: '80–89', count: 14 },
  { range: '90–100', count: 10 },
]

export const classStudents = [
  { name: '林一诺', score: 88, status: '待复核', point: '负向提示词' },
  { name: '周子墨', score: 93, status: '已完成', point: '迭代与评估' },
  { name: '陈予安', score: 76, status: '异常', point: '画面控制' },
  { name: '许知夏', score: 91, status: '已完成', point: '提示词结构' },
]
