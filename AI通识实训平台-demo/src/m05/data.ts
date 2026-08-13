import type { M05InputSnapshot, M05QuestionAudit, M05QuestionType } from './types'

export const m05QuestionTypeLabels: Record<M05QuestionType, string> = {
  single: '单选题', multiple: '多选题', judgment: '判断题', scenario: '情境题', comprehensive: '综合任务题',
}

export const m05RequiredDistribution: Record<M05QuestionType, number> = { single: 3, multiple: 1, judgment: 1, scenario: 2, comprehensive: 1 }

export const m05DefaultInput: M05InputSnapshot = {
  sourceM04AssessmentId: 'M05-STANDALONE-DEMO', sourceM04PlanId: 'M05-INPUT-V1', courseName: '生成式视觉设计——文生图创意实践', lessonName: '第 2 课：提示词基础',
  audience: '高职二年级学生', studentFoundation: '零基础，只了解 AI 可以根据文字生成图片',
  objectives: [
    { id: 'objective-1', content: '能识别主体、风格、细节三个基本要素' },
    { id: 'objective-2', content: '能独立编写结构完整的文生图提示词' },
    { id: 'objective-3', content: '能依据生成偏差修正提示词并说明理由' },
  ],
  materialName: '提示词基础课程讲义（演示节选）',
  materialContent: '提示词是用自然语言告诉 AI 想生成什么画面的一段话。主体决定画什么，风格决定怎么画，细节决定画成什么样。三要素齐全，可以减少生成结果偏离。',
  materialScope: '仅使用主体、风格、细节三个要素及讲义中的定义，不扩展模型原理或软件操作',
  assessmentScenario: '随堂练习与形成性评价', difficultyRequirement: '由基础识记逐步过渡到情境应用与综合任务，适合当前零基础学生',
  outputFormat: '按题号展示题型、目标、难度、题干、答案、解析、材料依据；综合题另列评分要点',
  sourceConfirmed: false, rightsConfirmed: false, privacyConfirmed: false,
}

export function createInitialM05Audit(): M05QuestionAudit {
  return { stemClarity: '', answerClarity: '', objectiveAligned: false, difficultySuitable: false, evidenceVerified: false, distractorsReasonable: false, rubricExecutable: false, safeAndFair: false }
}
