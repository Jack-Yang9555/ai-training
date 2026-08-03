import type {
  AdaptedLessonPlan,
  AiTutor,
  AssessmentPaper,
  CourseKnowledgeGraph,
  KnowledgeBase,
  LearnerGroup,
  LearningDiagnosis,
  LearningObservationSnapshot,
  PaperBlueprint,
  PracticalAssessment,
  PracticeSet,
  QuestionGenerationConfig,
  QuestionItem,
  RecommendationAction,
  RetrievalEvidence,
  TeacherAbilityReport,
  TrainingPlan,
  StandardLesson,
  TeachingContext,
  InterventionPlan,
} from '../types'
import { initialKnowledgeGraph, seededQuestions, trainingTasks } from '../trainingData'

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const difficultyNames = { 1: '基础', 2: '入门', 3: '进阶', 4: '挑战', 5: '拓展' } as const

const evidence: RetrievalEvidence = {
  document: '提示词六要素与案例讲义.pdf',
  section: '3.2 画面控制与排除词',
  excerpt: '负向提示词应针对已经观察到的画面偏差，而不是堆叠通用质量词。',
  confidence: 94,
}

export interface AiDemoService {
  adaptStandardLesson(lesson: StandardLesson, context: TeachingContext): Promise<AdaptedLessonPlan>
  analyzeLearningEvidence(snapshot: LearningObservationSnapshot): Promise<LearningDiagnosis>
  generateGroupIntervention(diagnosis: LearningDiagnosis, group: LearnerGroup): Promise<InterventionPlan>
  generatePractice(knowledgePoint: string): Promise<PracticeSet>
  generateRemediation(): Promise<RecommendationAction>
  publishLesson(): Promise<{ students: number; estimatedMinutes: number }>
  ingestKnowledgeDocuments(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase>
  testKnowledgeRetrieval(question: string): Promise<{ answer: string; evidence: RetrievalEvidence[] }>
  generateKnowledgeGraph(): Promise<CourseKnowledgeGraph>
  generateTutorReply(question: string): Promise<AiTutor['messages'][number]>
  publishTutor(): Promise<{ version: string; link: string }>
  generateQuestions(config: QuestionGenerationConfig): Promise<QuestionItem[]>
  generateTrainingPlan(): Promise<{ plan: TrainingPlan; assessment: PracticalAssessment }>
  assemblePaper(blueprint: PaperBlueprint, questions: QuestionItem[]): Promise<AssessmentPaper>
  gradeAssignments(): Promise<Array<{ student: string; score: number; confidence: number; status: string }>>
  generateTeacherAbilityReport(completed: number): Promise<TeacherAbilityReport>
}

export const aiDemoService: AiDemoService = {
  async adaptStandardLesson(lesson, context) {
    await wait(850)
    const originalTotal = lesson.steps.reduce((sum, step) => sum + step.duration, 0)
    let remaining = context.duration
    const steps = lesson.steps.map((step, index) => {
      const duration = index === lesson.steps.length - 1
        ? remaining
        : Math.max(3, Math.round((step.duration / originalTotal) * context.duration))
      remaining -= duration
      const training = context.mode === '企业培训'
      return {
        ...step,
        duration,
        title: training && step.type === 'practice' ? '岗位情境实操' : step.title,
        description: step.type === 'practice'
          ? `${context.focus}；面向${context.audience}完成可提交的情境任务`
          : step.description,
      }
    })
    const difficultyText = `L${context.targetDifficulty} · ${context.learnerLevel}`
    const questions: QuestionItem[] = [
      { ...seededQuestions[1], id: 'adapt-q-1', origin: 'AI生成', stem: '画面出现文字水印时，应优先调整哪类提示词？', difficulty: context.targetDifficulty, cognitiveLevel: '理解', score: 5, enabled: false },
      { ...seededQuestions[0], id: 'adapt-q-2', origin: 'AI生成', type: '多选', stem: '哪些调整能够帮助画面建立清晰视觉焦点？', answer: '明确主体、使用引导线、设置主光源', difficulty: context.targetDifficulty, cognitiveLevel: '应用', score: 10, enabled: false },
      { ...seededQuestions[3], id: 'adapt-q-3', origin: 'AI生成', stem: `结合${context.mode}情境，诊断作品偏差并提出两项可执行修改。`, difficulty: Math.min(5, context.targetDifficulty + 1) as QuestionItem['difficulty'], cognitiveLevel: '分析', score: 15, enabled: false },
    ]
    return {
      id: `adapt-${lesson.id}`,
      courseId: 'course-visual-design',
      unitId: lesson.id.split('-').slice(0, 2).join('-').replace('lesson', 'unit'),
      standardLessonId: lesson.id,
      title: lesson.title,
      subtitle: `${context.mode}情境版 · 基于标准课 ${lesson.sequence}`,
      duration: context.duration,
      objectives: lesson.objectives.map((objective, index) => index === lesson.objectives.length - 1 ? `${objective}，并能够迁移到${context.mode === '企业培训' ? '岗位任务' : '课堂创作任务'}` : objective),
      knowledgePoints: lesson.knowledgePoints.map((name, index) => ({
        id: `${lesson.id}-kp-${index + 1}`,
        name,
        mastery: Math.max(42, 78 - index * 8),
        difficulty: {
          level: context.targetDifficulty,
          label: difficultyNames[context.targetDifficulty],
          reason: `依据${context.learnerLevel}、${context.mode}任务复杂度与本次目标统一调整`,
        },
        prerequisite: index ? lesson.knowledgePoints[index - 1] : undefined,
      })),
      steps,
      version: 'AI v1.0',
      status: 'generated',
      context,
      adjustments: [
        { dimension: '教学目标', before: `${lesson.objectives.length} 项标准目标`, after: `${lesson.objectives.length} 项可迁移目标`, reason: `面向${context.audience}补充真实任务迁移要求` },
        { dimension: '教学难度', before: `标准难度 L${lesson.difficulty}`, after: difficultyText, reason: `依据学习者基础与目标难度进行分层` },
        { dimension: '教学节奏', before: `${lesson.duration} 分钟标准课`, after: `${context.duration} 分钟 · ${context.deliveryMode}`, reason: '按本次可用课时重新分配讲解、实践与检测时间' },
        { dimension: '教学活动', before: '通用创作练习', after: context.focus, reason: `使用${context.mode}情境提高任务相关性` },
        { dimension: '配套题目', before: '标准课后练习', after: '3 道分层随堂题', reason: '覆盖理解、应用与分析三个认知层级' },
      ],
      progress: {
        totalSessions: context.duration > 60 ? 2 : 1,
        currentSession: 1,
        milestones: [
          { label: '课前准备', timing: '课前 1 天', outcome: '完成导学与基础诊断' },
          { label: '课堂达成', timing: `${context.duration} 分钟`, outcome: `完成${context.focus}` },
          { label: '课后巩固', timing: '课后 3 天内', outcome: '提交改进版本与反思记录' },
        ],
      },
      supportingQuestions: questions,
      resourceIds: lesson.resourceIds,
    }
  },

  async analyzeLearningEvidence(snapshot) {
    await wait(520)
    const scopeOffset = snapshot.scope === 'lesson' ? -4 : snapshot.scope === 'week' ? -2 : 0
    const masteryBase = [
      { knowledgePointId: 'structure', name: '提示词结构', target: 80, current: 82 + scopeOffset, change: 7, confidence: 94, evidenceIds: ['ev-6', 'ev-7'] },
      { knowledgePointId: 'composition', name: '画面与构图控制', target: 75, current: 68 + scopeOffset, change: 5, confidence: 89, evidenceIds: ['ev-2', 'ev-3', 'ev-11'] },
      { knowledgePointId: 'negative', name: '负向提示词', target: 75, current: 54 + scopeOffset, change: 1, confidence: 92, evidenceIds: ['ev-1', 'ev-4', 'ev-9', 'ev-10'] },
      { knowledgePointId: 'iteration', name: '迭代与评估', target: 70, current: snapshot.scope === 'lesson' ? null : 61 + scopeOffset, change: 9, confidence: snapshot.scope === 'lesson' ? 46 : 86, evidenceIds: ['ev-5', 'ev-8', 'ev-12'] },
    ]
    return {
      scope: snapshot.scope,
      unitId: snapshot.unitId,
      summary: '提示词结构已稳定达标；负向提示词的偏差诊断是当前最需要优先处理的目标。',
      mastery: masteryBase.map((item) => ({
        ...item,
        status: item.current === null
          ? '证据不足' as const
          : item.current >= item.target
            ? '达成良好' as const
            : item.current >= item.target - 10
              ? '需要巩固' as const
              : '重点补强' as const,
        updatedAt: snapshot.updatedAt,
      })),
      misconceptions: [
        { title: '用通用质量词代替针对性排除词', detail: '学生能识别偏差，但无法把偏差映射为具体排除项。', count: 8, knowledgePointId: 'negative' },
        { title: '构图词堆叠但没有视觉主次', detail: '同时使用多个镜头和构图词，反而削弱了主体焦点。', count: 6, knowledgePointId: 'composition' },
        { title: '修改作品但不记录判断依据', detail: '结果发生变化，却无法解释是哪一项修改产生作用。', count: 5, knowledgePointId: 'iteration' },
      ],
      tutorInsights: [
        { question: '负向提示词怎么针对文字水印？', count: 42, knowledgePointId: 'negative', unresolved: true },
        { question: '如何让画面焦点更明确？', count: 31, knowledgePointId: 'composition', unresolved: false },
        { question: '风格词互相冲突怎么办？', count: 18, knowledgePointId: 'iteration', unresolved: false },
      ],
      difficultyFit: [
        { label: '需要更多支架', count: 8, note: '连续尝试后仍未形成有效策略' },
        { label: '挑战适中', count: 19, note: '能够完成任务，但迁移稳定性有波动' },
        { label: '可以增加挑战', count: 9, note: '已稳定达标，可增加开放约束' },
      ],
      generatedAt: '今天 10:33',
    }
  },

  async generateGroupIntervention(diagnosis, group) {
    await wait(420)
    const configs = {
      support: {
        title: '偏差诊断补强包', objective: '能从实际画面偏差中选择一项针对性排除词',
        activity: '先比较正反案例，再完成一次“偏差—修改—结果”三联记录', resource: '负向提示词正反案例卡',
        questionCount: 3, difficulty: 2 as const, duration: 15,
      },
      consolidate: {
        title: '构图控制迁移任务', objective: '能把视觉焦点策略迁移到新的创作主题',
        activity: '保持主体不变，分别使用引导线和对称构图完成两版对比', resource: '构图迁移活动包',
        questionCount: 4, difficulty: 3 as const, duration: 20,
      },
      extend: {
        title: '个人视觉策略挑战', objective: '能建立并验证一组可复用的个人视觉控制策略',
        activity: '自定一个限制条件，完成三版迭代并对策略有效性进行自评', resource: '视觉风格策略模板',
        questionCount: 2, difficulty: 5 as const, duration: 30,
      },
    }
    const config = configs[group.id]
    return {
      id: `intervention-${diagnosis.unitId}-${group.id}`,
      source: 'learning-promotion',
      groupId: group.id,
      targetKnowledgePointId: group.knowledgePointId,
      ...config,
      dueAt: '2026-07-18',
      recipients: [...group.memberIds],
      version: 'AI v1.0',
      status: 'draft',
    }
  },

  async generatePractice(knowledgePoint) {
    await wait(650)
    return {
      title: `${knowledgePoint} · 自适应练习组`,
      reason: '基于最近两次练习中的遗漏要素、修改次数与班级同层学生表现生成',
      questions: [
        { id: 'p1', title: '识别提示词中缺失的视觉控制要素', hint: '从主体、环境、构图、光线四个维度检查', difficulty: { level: 2, label: '入门', reason: '单一知识点识别；无需跨概念迁移' }, knowledgePoint, completed: false },
        { id: 'p2', title: '为“未来校园”补写两种构图方案', hint: '保持主体不变，分别使用引导线与对称构图', difficulty: { level: 3, label: '进阶', reason: '需要调用构图知识并迁移到新主题' }, knowledgePoint, completed: false },
        { id: 'p3', title: '诊断生成偏差并完成一次提示词迭代', hint: '记录偏差、修改项与生成结果之间的对应关系', difficulty: { level: 4, label: '挑战', reason: '包含分析、决策与结果验证三个认知步骤' }, knowledgePoint, completed: false },
      ],
    }
  },

  async generateRemediation() {
    await wait(700)
    return { priority: '立即补强', title: '画面控制与负向提示词补学包', description: '8分钟知识卡 + 2个对比案例 + 3道自适应练习，预计15分钟完成', action: '开始补学' }
  },

  async publishLesson() {
    await wait(550)
    return { students: 36, estimatedMinutes: 18 }
  },

  async ingestKnowledgeDocuments(knowledgeBase) {
    await wait(850)
    return {
      ...knowledgeBase,
      status: 'ready',
      coverage: 96,
      duplicateRate: 1.8,
      documents: knowledgeBase.documents.map((document) => ({
        ...document,
        status: '已就绪',
        chunks: document.chunks || 42,
        coverage: document.coverage || 91,
        updatedAt: '刚刚完成',
      })),
    }
  },

  async testKnowledgeRetrieval(question) {
    await wait(600)
    return {
      answer: question.includes('水印')
        ? '应在负向提示词中明确加入“文字、水印、Logo”等排除项，并保留主体与构图描述。'
        : '先定位画面偏差属于主体、环境、构图、光线还是排除控制，再修改对应提示词段落。',
      evidence: [evidence],
    }
  },

  async generateKnowledgeGraph() {
    await wait(850)
    return { ...initialKnowledgeGraph, generated: true, version: 'v1.1', updatedAt: '刚刚由 4 份资料生成' }
  },

  async generateTutorReply(question) {
    await wait(650)
    const outside = /会计|英语|编程/.test(question)
    return outside
      ? { id: `m-${Date.now()}`, role: 'assistant', content: '这个问题超出了当前课程知识库范围，我没有足够依据。建议询问任课教师，或切换到对应课程助教。', confidence: 38, evidence: [] }
      : { id: `m-${Date.now()}`, role: 'assistant', content: '可以先观察偏差：如果画面出现文字水印，就把“文字、水印、Logo”加入负向提示词。不要删除主体、构图和光线描述。你愿意先写一个修改版本吗？', node: '负向提示词', confidence: 94, evidence: [evidence] }
  },

  async publishTutor() {
    await wait(750)
    return { version: 'v1.0', link: 'qijing.ai/tutor/visual-2401' }
  },

  async generateQuestions(config) {
    await wait(850)
    const base: QuestionItem[] = [
      { ...seededQuestions[1], id: 'gen-1', origin: 'AI生成', stem: '画面出现文字水印时，应优先调整哪类提示词？', answer: '负向提示词', explanation: '对已出现的非目标元素使用针对性排除词。', score: 5 },
      { ...seededQuestions[0], id: 'gen-2', origin: 'AI生成', type: '多选', stem: '哪些词能够直接建立视觉焦点？', answer: '近景主体、引导线、聚光照明', explanation: '主体尺度、构图和光线共同影响视觉焦点。', score: 10 },
      { ...seededQuestions[3], id: 'gen-3', origin: 'AI生成', stem: '一幅未来教室画面元素完整但主次不清，请诊断并提出修改。', score: 15 },
    ]
    return base.slice(0, Math.min(config.count, base.length)).map((item) => ({ ...item, difficulty: config.difficulty, cognitiveLevel: config.cognitiveLevel }))
  },

  async generateTrainingPlan() {
    await wait(900)
    const rubric = [
      { label: '提示词结构', score: 20, description: '六要素完整且表达清晰' },
      { label: '视觉控制', score: 30, description: '构图与光线能够建立明确焦点' },
      { label: '偏差诊断', score: 20, description: '排除词与实际偏差对应' },
      { label: '迭代反思', score: 30, description: '三轮修改有证据、有解释' },
    ]
    return {
      plan: {
        id: 'tp-1', title: '文生图视觉控制综合实训', objective: '能够诊断画面偏差并完成三轮有依据的提示词迭代', duration: 45,
        environment: ['文生图工作台', '提示词版本记录', '作品对比画布'],
        steps: [
          { title: '明确主体与场景', checkpoint: '六要素结构完整', minutes: 8 },
          { title: '建立视觉焦点', checkpoint: '构图和光线有明确作用', minutes: 12 },
          { title: '诊断生成偏差', checkpoint: '负向提示词针对实际问题', minutes: 10 },
          { title: '完成三轮迭代', checkpoint: '记录修改与结果对应关系', minutes: 15 },
        ],
        deliverables: ['结构化提示词', '三版生成作品', '迭代说明与自评'], rubric,
      },
      assessment: { id: 'pa-1', title: '未来学习空间创作任务', brief: '设计一个兼具自然感与科技感的未来学习空间，并通过三轮迭代建立清晰视觉焦点。', deliverables: ['提示词', '三版作品', '迭代说明'], checkpoints: ['结构完整', '构图明确', '排除词有效', '迭代有依据'], rubric },
    }
  },

  async assemblePaper(blueprint, questions) {
    await wait(900)
    const sourceItems = questions.length >= 5 ? questions.slice(0, 5) : seededQuestions
    const scores = [5, 5, 10, 30, 50]
    const paperQuestions = sourceItems.slice(0, 5).map((item, index) => ({ ...item, id: `paper-${index + 1}`, score: scores[index] }))
    return {
      id: 'paper-unit-3', title: '文生图视觉控制 · 单元测', version: 'A', status: 'draft', blueprint, questions: paperQuestions,
      checks: [
        { label: '总分校验', passed: paperQuestions.reduce((sum, item) => sum + item.score, 0) === 100, detail: '5 道题 · 合计 100 分' },
        { label: '知识点覆盖', passed: true, detail: '覆盖 5 个核心知识点 · 92%' },
        { label: '难度曲线', passed: true, detail: '基础 30% · 进阶 50% · 挑战 20%' },
        { label: '相似题检测', passed: true, detail: '未发现重复或高度相似题目' },
        { label: '评分量规', passed: true, detail: '主观题与实训题均具备评分依据' },
      ],
    }
  },

  async gradeAssignments() {
    await wait(900)
    return [
      { student: '林一诺', score: 88, confidence: 92, status: '待复核' },
      { student: '周子墨', score: 93, confidence: 96, status: '已完成' },
      { student: '陈予安', score: 76, confidence: 68, status: '异常' },
    ]
  },

  async generateTeacherAbilityReport(completed) {
    await wait(500)
    const ratio = completed / trainingTasks.length
    return {
      level: ratio >= .9 ? 'L3 AI创新者' : ratio >= .45 ? 'L2 AI实践者' : 'L1 AI入门者',
      completed, total: trainingTasks.length,
      dimensions: [
        { label: '知识底座建设力', value: Math.min(95, 35 + completed * 6) },
        { label: 'AI助教搭建力', value: Math.min(92, 28 + completed * 5) },
        { label: '智能命题与组卷力', value: Math.min(94, 42 + completed * 5) },
        { label: '智能批改与分析力', value: Math.min(90, 38 + completed * 4) },
        { label: '组合应用与创新力', value: Math.min(88, 24 + completed * 4) },
      ],
      nextTask: trainingTasks[Math.min(completed, trainingTasks.length - 1)].title,
    }
  },
}
