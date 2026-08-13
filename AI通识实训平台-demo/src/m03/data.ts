import type { M03IterationVariable, M03PromptSnapshot } from './types'

export const m03DefaultSnapshot: M03PromptSnapshot = {
  role: '你是一名熟悉高职课堂教学与生成式视觉设计的教学设计助手',
  courseName: '生成式视觉设计——文生图创意实践',
  lessonName: '第 2 课：提示词基础',
  teachingPhase: '课堂导入与随堂练习',
  audience: '高职二年级学生',
  studentFoundation: '零基础，只了解 AI 可以根据文字生成图片',
  objective: '理解主体、风格、细节三个基本要素，并能写出一条结构完整的文生图提示词',
  task: '生成一份课堂活动练习包，帮助学生从识别三要素过渡到独立编写提示词',
  materialName: '提示词基础课程讲义（演示节选）',
  materialContent: '提示词是用自然语言告诉 AI 想生成什么画面的一段话。主体决定画什么，风格决定怎么画，细节决定画成什么样。三要素齐全，可以减少生成结果偏离。',
  materialScope: '仅使用主体、风格、细节三个要素及讲义中的定义，不扩展模型原理或软件操作',
  duration: 45,
  questionCount: 3,
  difficulty: '入门',
  outputFormat: '分节文本',
  requiredSections: '课堂导入、活动步骤、练习题、答案解析、核验清单',
  qualityStandards: '专业内容只能依据输入材料；活动须对应教学目标；题目与答案逐一匹配；题量、难度和总时长须符合约束；不得编造材料外知识',
  rightsConfirmed: false,
  privacyConfirmed: false,
}

export const m03VariableLabels: Record<M03IterationVariable, string> = {
  studentFoundation: '学生基础',
  questionCount: '题量',
  difficulty: '难度',
  duration: '课堂时长',
  outputFormat: '输出格式',
}

export const m03VariableHints: Record<M03IterationVariable, string> = {
  studentFoundation: '改变讲解脚手架与示例密度',
  questionCount: '改变生成练习题的数量',
  difficulty: '改变题目的认知层级与挑战程度',
  duration: '改变课堂活动节奏与时间分配',
  outputFormat: '改变结果的组织和呈现方式',
}

export function compileM03Prompt(snapshot: M03PromptSnapshot): string {
  return [
    `【角色/任务】角色：${snapshot.role}；任务：${snapshot.task}。`,
    `【背景】课程：${snapshot.courseName}；课次：${snapshot.lessonName}；使用环节：${snapshot.teachingPhase}；授课对象：${snapshot.audience}；学生基础：${snapshot.studentFoundation}；教学目标：${snapshot.objective}。`,
    `【输入】材料名称：${snapshot.materialName}；材料正文：${snapshot.materialContent}；允许使用范围：${snapshot.materialScope}。`,
    `【约束】课堂时长：${snapshot.duration} 分钟；题量：${snapshot.questionCount} 道；难度：${snapshot.difficulty}。`,
    `【输出格式】${snapshot.outputFormat}；必须包含：${snapshot.requiredSections}。`,
    `【质量标准】${snapshot.qualityStandards}。`,
  ].join('\n')
}
