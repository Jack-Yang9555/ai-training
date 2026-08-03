import type { CourseResource, LessonStep, StandardCourse, TeachingContext } from './types'

const buildSteps = (topic: string): LessonStep[] => [
  { id: `${topic}-warmup`, title: '情境导入', description: `通过真实案例识别“${topic}”的学习价值`, duration: 5, type: 'warmup', resource: '导入案例' },
  { id: `${topic}-concept`, title: '核心讲解', description: `拆解“${topic}”的关键概念与方法`, duration: 10, type: 'concept', resource: '标准讲义' },
  { id: `${topic}-compare`, title: '案例对比', description: '比较有效做法与常见误区，形成判断标准', duration: 7, type: 'compare', resource: '正反案例集' },
  { id: `${topic}-practice`, title: '任务实践', description: `完成一次“${topic}”情境任务并记录过程`, duration: 18, type: 'practice', resource: '实训任务单' },
  { id: `${topic}-quiz`, title: '即时检测', description: '完成知识检测与作品自评，确认本课达成度', duration: 5, type: 'quiz', resource: '随堂题目' },
]

export const standardCourse: StandardCourse = {
  id: 'course-visual-design',
  title: '生成式视觉设计',
  version: '标准版 v2.1',
  description: '从生成式图像基础、提示词表达、视觉控制到综合创作评价的完整标准课程。',
  units: [
    {
      id: 'unit-1', title: '单元一 · 生成式视觉基础', sequence: 1, lessons: [
        { id: 'lesson-1-1', title: '认识生成式视觉', sequence: 1, duration: 45, difficulty: 1, objectives: ['理解生成式视觉的基本工作方式', '识别适合使用生成式图像的任务'], knowledgePoints: ['生成式AI基础', '应用边界'], resourceIds: ['res-standard', 'res-intro-slides'], steps: buildSteps('生成式视觉') },
        { id: 'lesson-1-2', title: '从需求到视觉意图', sequence: 2, duration: 45, difficulty: 2, objectives: ['将模糊需求转化为视觉目标', '建立主体、受众和媒介意识'], knowledgePoints: ['视觉需求', '创作意图'], resourceIds: ['res-outline', 'res-intent-case'], steps: buildSteps('视觉意图') },
      ],
    },
    {
      id: 'unit-2', title: '单元二 · 提示词结构与表达', sequence: 2, lessons: [
        { id: 'lesson-2-1', title: '提示词六要素', sequence: 1, duration: 45, difficulty: 2, objectives: ['掌握提示词六要素', '能够完成结构化表达'], knowledgePoints: ['提示词结构', '主体描述'], resourceIds: ['res-prompt-handout'], steps: buildSteps('提示词六要素') },
        { id: 'lesson-2-2', title: '场景、媒介与风格', sequence: 2, duration: 45, difficulty: 3, objectives: ['使用场景和媒介词限定表达', '辨别风格词的适用边界'], knowledgePoints: ['环境描述', '媒介与风格'], resourceIds: ['res-style-cases'], steps: buildSteps('场景与风格') },
      ],
    },
    {
      id: 'unit-3', title: '单元三 · 视觉控制与迭代', sequence: 3, lessons: [
        { id: 'lesson-3-1', title: '从自然语言描述到高质量视觉作品', sequence: 1, duration: 45, difficulty: 3, objectives: ['掌握结构化提示词的六个关键要素', '能够使用构图与光线词控制画面', '能够诊断生成偏差并完成有效迭代'], knowledgePoints: ['提示词结构', '画面与构图控制', '负向提示词', '迭代与评估'], resourceIds: ['res-visual-cases', 'res-rubric'], steps: buildSteps('视觉控制与迭代') },
        { id: 'lesson-3-2', title: '负向提示词与偏差诊断', sequence: 2, duration: 45, difficulty: 4, objectives: ['根据画面偏差选择排除策略', '建立修改项与生成结果的证据关系'], knowledgePoints: ['负向提示词', '生成偏差诊断'], resourceIds: ['res-negative-workbook'], steps: buildSteps('偏差诊断') },
      ],
    },
    {
      id: 'unit-4', title: '单元四 · 综合创作与评价', sequence: 4, lessons: [
        { id: 'lesson-4-1', title: '多轮创作与版本管理', sequence: 1, duration: 60, difficulty: 4, objectives: ['规划多轮创作策略', '记录并解释版本变化'], knowledgePoints: ['提示词迭代', '版本管理'], resourceIds: ['res-iteration-template'], steps: buildSteps('多轮创作').map((step, index) => ({ ...step, duration: [5, 12, 8, 28, 7][index] })) },
        { id: 'lesson-4-2', title: '作品评价与综合展示', sequence: 2, duration: 60, difficulty: 5, objectives: ['使用量规评价视觉作品', '完成有证据的创作展示与反思'], knowledgePoints: ['作品评价', '创作反思'], resourceIds: ['res-rubric', 'res-showcase'], steps: buildSteps('作品评价').map((step, index) => ({ ...step, duration: [8, 12, 10, 22, 8][index] })) },
      ],
    },
  ],
}

export const standardResources: CourseResource[] = [
  { id: 'res-standard', title: '《生成式视觉设计》课程标准', kind: '课程标准', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-1', lessonId: 'lesson-1-1', version: 'v2.1', updatedAt: '2026-07-10', knowledgePoints: ['生成式AI基础'], description: '课程定位、能力目标、内容结构与评价要求。' },
  { id: 'res-outline', title: '课程大纲与教学进度表', kind: '课程大纲', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-1', lessonId: 'lesson-1-2', version: 'v2.1', updatedAt: '2026-07-10', knowledgePoints: ['视觉需求'], description: '4 个单元、8 个课次的标准教学进度。' },
  { id: 'res-intro-slides', title: '生成式视觉基础课件', kind: '教学课件', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-1', lessonId: 'lesson-1-1', version: 'v1.3', updatedAt: '2026-07-11', knowledgePoints: ['生成式AI基础'], description: '基础概念、能力边界与典型应用案例。' },
  { id: 'res-intent-case', title: '视觉需求转译案例集', kind: '案例集', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-1', lessonId: 'lesson-1-2', version: 'v1.2', updatedAt: '2026-07-11', knowledgePoints: ['视觉需求', '创作意图'], description: '从业务需求到视觉意图的正反案例。' },
  { id: 'res-prompt-handout', title: '提示词六要素与案例讲义', kind: '课程讲义', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-2', lessonId: 'lesson-2-1', version: 'v1.4', updatedAt: '2026-07-12', knowledgePoints: ['提示词结构', '主体描述'], description: '主体、环境、媒介、构图、光线与细节的结构化方法。' },
  { id: 'res-style-cases', title: '媒介与视觉风格案例集', kind: '案例集', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-2', lessonId: 'lesson-2-2', version: 'v1.1', updatedAt: '2026-07-12', knowledgePoints: ['环境描述', '媒介与风格'], description: '不同媒介和风格词对画面结果的影响。' },
  { id: 'res-visual-cases', title: '视觉控制正反案例集', kind: '案例集', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-3', lessonId: 'lesson-3-1', version: 'v1.2', updatedAt: '2026-07-12', knowledgePoints: ['画面与构图控制'], description: '构图、镜头和光线控制的对比案例。' },
  { id: 'res-negative-workbook', title: '负向提示词练习册', kind: '习题集', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-3', lessonId: 'lesson-3-2', version: 'v1.0', updatedAt: '2026-07-12', knowledgePoints: ['负向提示词', '生成偏差诊断'], description: '水印、畸变、焦点分散等偏差诊断练习。' },
  { id: 'res-iteration-template', title: '创作版本记录模板', kind: '课程讲义', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-4', lessonId: 'lesson-4-1', version: 'v1.0', updatedAt: '2026-07-12', knowledgePoints: ['提示词迭代', '版本管理'], description: '记录每轮修改、结果变化与反思依据。' },
  { id: 'res-rubric', title: '课程习题与作品评分量规', kind: '评分量规', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-4', lessonId: 'lesson-4-2', version: 'v3.0', updatedAt: '2026-07-13', knowledgePoints: ['作品评价'], description: '任务符合度、视觉表达、创意表现与迭代证据。' },
  { id: 'res-showcase', title: '综合作品展示指南', kind: '课程讲义', origin: 'standard', status: 'standard', courseId: standardCourse.id, unitId: 'unit-4', lessonId: 'lesson-4-2', version: 'v1.0', updatedAt: '2026-07-13', knowledgePoints: ['作品评价', '创作反思'], description: '作品陈述、同伴反馈与复盘方法。' },
]

export const initialTeachingContext: TeachingContext = {
  mode: '院校教学',
  audience: '人工智能 2401 班',
  learnerLevel: '基础一般',
  learnerCount: 36,
  deliveryMode: '线下课堂',
  duration: 45,
  targetDifficulty: 3,
  focus: '强化负向提示词与生成偏差诊断',
}

export const currentStandardLesson = standardCourse.units[2].lessons[0]

