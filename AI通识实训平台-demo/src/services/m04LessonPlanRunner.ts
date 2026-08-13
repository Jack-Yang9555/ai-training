import { lessonPlanSections } from '../m04/data'
import type { M04InputSnapshot, M04LessonPlan, M04PlanActivity, M04PlanAssessment, M04PlanObjective, M04PlanSupport } from '../m04/types'

export interface M04LessonPlanRunInput { participantId: string; input: M04InputSnapshot }
export interface M04LessonPlanRunner { run(input: M04LessonPlanRunInput): Promise<M04LessonPlan> }

function distributeMinutes(duration: number): number[] {
  const intro = Math.max(5, Math.round(duration * .14))
  const demonstration = Math.max(8, Math.round(duration * .24))
  const practice = Math.max(12, Math.round(duration * .4))
  return [intro, demonstration, practice, duration - intro - demonstration - practice]
}

function buildPlan(input: M04InputSnapshot, participantId: string): M04LessonPlan {
  const [intro, demonstration, practice, review] = distributeMinutes(input.duration)
  const objectives: M04PlanObjective[] = [
    { id: 'objective-1', content: `能用课程材料中的关键要求解释“${input.realWorkTask}”的完成标准`, observableEvidence: '在任务要求标注卡上正确圈出关键知识和限制条件' },
    { id: 'objective-2', content: `能依据课堂示范独立完成“${input.realWorkTask}”`, observableEvidence: '提交一份符合任务情境、材料范围和设备条件的课堂作品' },
    { id: 'objective-3', content: '能依据评价证据修正一处作品问题并说明理由', observableEvidence: '保留修改前后版本并口头或书面说明调整依据' },
  ]
  const activities: M04PlanActivity[] = [
    { id: 'activity-1', title: '任务情境与目标确认', minutes: intro, teacherAction: `展示“${input.realWorkTask}”情境并说明三项学习目标`, studentTask: '圈出任务中的画面主体和使用场景', checkMethod: '随机抽取两组口头复述任务要求', objectiveIds: ['objective-1'] },
    { id: 'activity-2', title: '课程材料示范拆解', minutes: demonstration, teacherAction: `依据“${input.materialName}”示范任务关键要求和操作步骤`, studentTask: '在示例任务上标注关键知识与限制条件', checkMethod: '展示标准标注并让学生自查', objectiveIds: ['objective-1'] },
    { id: 'activity-3', title: '分组编写与生成验证', minutes: practice, teacherAction: '巡视并用问题提示学生补齐缺失要素', studentTask: '两人一组编写提示词、生成结果并记录一处偏差', checkMethod: '提交提示词和生成偏差记录', objectiveIds: ['objective-2', 'objective-3'] },
    { id: 'activity-4', title: '同伴检查与教师总结', minutes: review, teacherAction: '组织互换检查并归纳可复用的修改方法', studentTask: '依据三要素检查同伴提示词并完成一次修改', checkMethod: '离堂卡提交修改前后版本和理由', objectiveIds: ['objective-2', 'objective-3'] },
  ]
  const assessments: M04PlanAssessment[] = [
    { id: 'assessment-1', method: '任务要求标注检查', evidence: '关键知识与限制条件标注卡', objectiveIds: ['objective-1'], activityIds: ['activity-2'] },
    { id: 'assessment-2', method: '课堂作品检查', evidence: '完整提示词和生成结果', objectiveIds: ['objective-2'], activityIds: ['activity-3'] },
    { id: 'assessment-3', method: '离堂卡', evidence: '提示词修改前后版本及修改理由', objectiveIds: ['objective-3'], activityIds: ['activity-4'] },
  ]
  const supports: M04PlanSupport[] = [
    { id: 'support-basic', learnerLevel: '基础薄弱学生', strategy: '提供分步骤任务卡和一个已拆解示例，先模仿补全再独立完成。', objectiveIds: ['objective-1', 'objective-2'], activityIds: ['activity-2', 'activity-3'] },
    { id: 'support-advanced', learnerLevel: '进阶学生', strategy: '要求比较两种风格表达造成的差异，并只改变一个要素完成第二轮验证。', objectiveIds: ['objective-2', 'objective-3'], activityIds: ['activity-3', 'activity-4'] },
  ]
  const base = {
    planId: `m04-${participantId}-${Date.now()}`,
    generatedAt: new Date().toISOString(), input: structuredClone(input),
    learnerAnalysis: `${input.audience}；${input.studentFoundation}。课堂设备与资源边界：${input.equipmentConstraints}；${input.resourceConstraints}。`,
    objectives, activities, assessments, supports,
    professionalNote: `教学内容以“${input.materialName}”为依据，只使用${input.materialScope}。生成结果仅作为课堂练习证据，教师需核验专业表述、素材权限和安全边界。`,
  }
  return { ...base, sections: lessonPlanSections(base) }
}

export const localM04LessonPlanRunner: M04LessonPlanRunner = {
  async run({ participantId, input }) {
    await new Promise((resolve) => setTimeout(resolve, 320))
    return buildPlan(structuredClone(input), participantId)
  },
}

// 正式接入时由业务服务端实现同一接口；浏览器端不保存模型密钥，也不直连 Dify 或模型供应商。
