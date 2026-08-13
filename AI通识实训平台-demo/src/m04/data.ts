import type { M04Audit, M04CorrectionType, M04InputSnapshot, M04LessonPlan, M04PlanSection } from './types'

export const m04CorrectionLabels: Record<M04CorrectionType, string> = {
  difficulty: '难度调整',
  activity: '课堂活动调整',
  professional: '专业表述修正',
}

export const m04DefaultInput: M04InputSnapshot = {
  sourceM03AssessmentId: 'M04-STANDALONE-DEMO',
  sourceM03RunId: 'M04-INPUT-V1',
  sourcePromptSummary: '角色/任务：教师编制可实施教案；背景：高职二年级零基础学生；输入：提示词基础课程讲义；约束：45 分钟普通机房；输出格式：目标、活动、评价与分层支持；质量标准：专业准确、证据可查、教师最终确认。',
  courseName: '生成式视觉设计——文生图创意实践',
  lessonName: '第 2 课：提示词基础',
  audience: '高职二年级学生',
  studentFoundation: '零基础，只了解 AI 可以根据文字生成图片',
  teachingObjective: '理解主体、风格、细节三个基本要素，并能写出一条结构完整的文生图提示词',
  duration: 45,
  realWorkTask: '为校园文化活动设计一张主题海报的文生图提示词',
  equipmentConstraints: '普通计算机教室，学生两人一组，共用浏览器版文生图工具',
  resourceConstraints: '使用课程讲义和平台预置案例，不使用外部付费素材或真实学生照片',
  materialName: '提示词基础课程讲义（演示节选）',
  materialContent: '提示词是用自然语言告诉 AI 想生成什么画面的一段话。主体决定画什么，风格决定怎么画，细节决定画成什么样。三要素齐全，可以减少生成结果偏离。',
  materialScope: '仅使用主体、风格、细节三个要素及讲义中的定义，不扩展模型原理或软件操作',
  sourceConfirmed: false,
  rightsConfirmed: false,
  privacyConfirmed: false,
}

export function createInitialM04Audit(): M04Audit {
  const correction = (type: M04CorrectionType) => ({ type, sectionId: '', originalContent: '', revisedContent: '', basis: '' })
  return {
    objectiveChecks: {}, activityChecks: {}, durationChecked: false, equipmentChecked: false,
    resourcesChecked: false, materialVerified: false, safetyVerified: false,
    corrections: {
      difficulty: correction('difficulty'), activity: correction('activity'), professional: correction('professional'),
    },
  }
}

export function lessonPlanSections(plan: Pick<M04LessonPlan, 'learnerAnalysis' | 'objectives' | 'activities' | 'assessments' | 'supports' | 'professionalNote'>): M04PlanSection[] {
  return [
    { id: 'learner-analysis', title: '学情分析', kind: 'learner-analysis', content: plan.learnerAnalysis },
    ...plan.objectives.map((item, index) => ({ id: item.id, title: `学习目标 ${index + 1}`, kind: 'objective' as const, content: `${item.content}；观察证据：${item.observableEvidence}` })),
    ...plan.activities.map((item) => ({ id: item.id, title: item.title, kind: 'activity' as const, content: `${item.minutes} 分钟｜教师：${item.teacherAction}｜学生：${item.studentTask}｜检查：${item.checkMethod}` })),
    ...plan.assessments.map((item, index) => ({ id: item.id, title: `评价 ${index + 1}`, kind: 'assessment' as const, content: `${item.method}；证据：${item.evidence}` })),
    ...plan.supports.map((item) => ({ id: item.id, title: `${item.learnerLevel}支持`, kind: 'support' as const, content: item.strategy })),
    { id: 'professional-note', title: '专业与安全说明', kind: 'professional', content: plan.professionalNote },
  ]
}

export function sectionsForCorrection(plan: M04LessonPlan, type: M04CorrectionType): M04PlanSection[] {
  if (type === 'difficulty') return plan.sections.filter((item) => item.kind === 'learner-analysis' || item.kind === 'support' || item.kind === 'objective')
  if (type === 'activity') return plan.sections.filter((item) => item.kind === 'activity')
  return plan.sections.filter((item) => item.kind === 'professional' || item.kind === 'objective' || item.kind === 'assessment')
}
