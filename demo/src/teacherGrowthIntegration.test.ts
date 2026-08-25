import { describe, expect, it } from "vitest"
import {
  demoReducer,
  initialDemoState,
  selectApplicableSchoolDevelopmentGoal,
  type DemoAction,
  type DemoState,
} from "./demoState"
import {
  teacherAssessmentQuestions,
  teacherRetestQuestions,
  teacherTrustGateQuestions,
  type TeacherTrustGateId,
} from "./teacherAssessmentQuestions"
import { checkRetestEligibility } from "./teacherGrowthScoring"
import { currentStandardLesson, initialTeachingContext } from "./teachingData"
import type {
  AdaptedLessonPlan,
  InterventionPlan,
  ResearchAgentDraft,
} from "./types"

const correctGateAnswers = Object.fromEntries(
  teacherTrustGateQuestions.map((gate) => [gate.id, gate.answer]),
) as Record<TeacherTrustGateId, string>

const correctBaselineAnswers = Object.fromEntries(
  teacherAssessmentQuestions.map((question) => [question.id, question.answer]),
)

const correctRetestAnswers = Object.fromEntries(
  teacherRetestQuestions.map((question) => [question.id, question.answer]),
)

const baselineAction: DemoAction = {
  type: "COMPLETE_TEACHER_ASSESSMENT",
  answers: correctBaselineAnswers,
  gateAnswers: correctGateAnswers,
  practicalCount: 5,
  manualConfirmed: true,
}

const retestAction: DemoAction = {
  type: "COMPLETE_TEACHER_RETEST",
  answers: correctRetestAnswers,
  gateAnswers: correctGateAnswers,
  practicalCount: 5,
  manualConfirmed: true,
}

function reduce(state: DemoState, ...actions: DemoAction[]) {
  return actions.reduce(demoReducer, state)
}

const sampleGrades: DemoState["gradedAssignments"] = [
  { student: "匿名学生 A-018", score: 86, confidence: 91, status: "待复核" },
]

function createAdaptedPlan(): AdaptedLessonPlan {
  return {
    id: "adapted-plan-integration",
    courseId: "course-visual-design",
    unitId: "unit-3",
    standardLessonId: currentStandardLesson.id,
    title: currentStandardLesson.title,
    subtitle: "回归测试情境版",
    duration: initialTeachingContext.duration,
    objectives: [...currentStandardLesson.objectives],
    steps: structuredClone(currentStandardLesson.steps),
    knowledgePoints: currentStandardLesson.knowledgePoints.map((name, index) => ({
      id: `integration-kp-${index + 1}`,
      name,
      mastery: 70,
      difficulty: {
        level: 3,
        label: "进阶",
        reason: "回归测试固定夹具",
      },
    })),
    version: "AI v1.0",
    status: "draft",
    context: structuredClone(initialTeachingContext),
    adjustments: [],
    progress: {
      totalSessions: 1,
      currentSession: 1,
      milestones: [],
    },
    supportingQuestions: [],
    resourceIds: [...currentStandardLesson.resourceIds],
  }
}

const interventionPlan: InterventionPlan = {
  id: "integration-intervention",
  source: "learning-promotion",
  groupId: "support",
  targetKnowledgePointId: "negative",
  title: "负向提示词补强任务",
  objective: "能将画面偏差映射为针对性排除词",
  activity: "完成正反案例对比并提交修改记录",
  resource: "负向提示词案例卡",
  questionCount: 3,
  difficulty: 2,
  duration: 15,
  dueAt: "2026-08-28",
  recipients: ["AI24018"],
  version: "AI v1.0",
  status: "draft",
}

function completeBaselineAndPlan() {
  return reduce(
    structuredClone(initialDemoState),
    baselineAction,
    { type: "ACCEPT_TEACHER_PLAN" },
  )
}

function buildRetestReadyState() {
  let state = completeBaselineAndPlan()
  state = reduce(
    state,
    {
      type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
      id: "resource-foundation-video",
      progress: 100,
      mode: "course",
    },
    { type: "TOGGLE_CUSTOM_PATH_RESOURCE", id: "resource-research-guide" },
    { type: "SAVE_CUSTOM_PATH" },
    {
      type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
      id: "resource-research-guide",
      progress: 100,
      mode: "self",
    },
    {
      type: "ADD_TEACHER_PRACTICE_RECORD",
      toolId: "prompt",
      toolName: "提示词实验室",
      task: "完成结构化提示词对比",
    },
    {
      type: "ADD_TEACHER_PRACTICE_RECORD",
      toolId: "rag",
      toolName: "知识库 RAG",
      task: "完成来源引用检索",
    },
    { type: "CONFIRM_TEACHER_PRACTICE_ARTIFACT", id: "teacher-practice-1" },
    { type: "SET_GRADED_ASSIGNMENTS", value: sampleGrades },
    { type: "CONFIRM_GRADED_ASSIGNMENTS" },
    {
      type: "UPDATE_RESEARCH_AGENT",
      patch: { sourceIds: ["source-001"], toolIds: ["rag"] },
    },
    { type: "TEST_RESEARCH_AGENT" },
    { type: "SAVE_RESEARCH_AGENT" },
    { type: "LINK_RESEARCH_AGENT_OUTPUT" },
  )
  return state
}

describe("教师成长跨工作区状态闭环", () => {
  it("管理端发布的匿名学校目标可被适用教师读取，并随重置恢复默认值", () => {
    const published = demoReducer(structuredClone(initialDemoState), {
      type: "PUBLISH_SCHOOL_DEVELOPMENT_GOAL",
      plan: {
        id: "TD-AIC-L4-RES",
        scopeId: "ai-college",
        scopeLabel: "人工智能学院",
        targetLevel: "L4",
        focusDimension: "研究创新",
        deadline: "2027-01-15",
        eligibleCount: 35,
        groupCount: 3,
        groupSizeSummary: "每组 11—12 人",
        sourceSegment: "待通关 / L1 / L2 / L3",
        requiredModules: ["研究证据管理", "AI 成果人工复核"],
        gateRequirement: "事实核验、数据版权、人工责任三项门槛全部通过",
        cadence: "12 周·导师制 + 校内示范",
      },
    })

    const applicable = selectApplicableSchoolDevelopmentGoal(published.schoolTeacherDevelopmentGoals)
    expect(applicable?.id).toBe("TD-AIC-L4-RES")
    expect(applicable?.status).toBe("published")
    expect(applicable?.requiredModules).toEqual(["研究证据管理", "AI 成果人工复核"])
    expect(published.growthCycle.targetLevel).toBe("L4")

    const reset = demoReducer(published, { type: "RESET" })
    expect(selectApplicableSchoolDevelopmentGoal(reset.schoolTeacherDevelopmentGoals)?.id).toBe("TD-SCH-L3-TEA")
    expect(reset.growthCycle.targetLevel).toBe("L3")
  })

  it("全新周期没有个人证据，reducer 自身拒绝无资格复测", () => {
    const initial = structuredClone(initialDemoState)
    expect(initial.growthEvidence).toEqual([])
    expect(initial.growthSnapshots).toEqual([])
    expect(initial.teacherGrowth.recommendedPath.resourceIds).toEqual([])
    expect(initial.teacherGrowth.practiceRecords).toEqual([])

    const attempted = demoReducer(initial, retestAction)
    expect(attempted).toBe(initial)
    expect(attempted.growthSnapshots).toEqual([])
    expect(attempted.teacherGrowth.assessment.stage).toBe("baseline")
  })

  it("摸底生成独立 baseline 快照，门槛阻断不篡改能力测算分", () => {
    const passed = demoReducer(structuredClone(initialDemoState), baselineAction)
    const baseline = passed.growthSnapshots.at(-1)
    expect(baseline?.kind).toBe("baseline")
    expect(baseline?.calculatedLevel).toBe("L2")
    expect(baseline?.certifiedLevel).toBe("L1")
    expect(Object.values(baseline?.gateResults ?? {})).toEqual(["passed", "passed", "passed"])

    const failedGateAnswers = {
      ...correctGateAnswers,
      "fact-verification": teacherTrustGateQuestions[0].options[1],
    }
    const blocked = demoReducer(structuredClone(initialDemoState), {
      ...baselineAction,
      gateAnswers: failedGateAnswers,
    })
    const blockedSnapshot = blocked.growthSnapshots.at(-1)
    expect(blockedSnapshot?.overallScore).toBe(baseline?.overallScore)
    expect(blockedSnapshot?.calculatedLevel).toBe("L2")
    expect(blockedSnapshot?.certifiedLevel).toBeNull()
    expect(blockedSnapshot?.gateResults["fact-verification"]).toBe("failed")
  })

  it("课程、自主学习、两项实训、作品、教学应用与研究成果齐全后才允许复测", () => {
    let state = buildRetestReadyState()

    const latest = state.growthSnapshots.at(-1)
    const readiness = checkRetestEligibility({
      cycle: state.growthCycle,
      evidence: state.growthEvidence,
      gateResults: latest?.gateResults,
      evidenceCoverage: latest?.evidenceCoverage,
    })
    expect(readiness.eligible).toBe(true)
    expect(readiness.readinessPercent).toBe(100)
    expect(state.growthEvidence.some((item) => item.qualifiers?.includes("required-course-module"))).toBe(true)
    expect(state.growthEvidence.some((item) => item.qualifiers?.includes("self-learning-resource"))).toBe(true)
    expect(state.growthEvidence.filter((item) => item.qualifiers?.includes("ai-practice") && item.channel === "task")).toHaveLength(2)

    state = demoReducer(state, retestAction)
    expect(state.growthSnapshots.at(-1)?.kind).toBe("final")
    expect(state.teacherGrowth.assessment.stage).toBe("final")
    const snapshotCount = state.growthSnapshots.length
    const completed = state
    state = demoReducer(completed, retestAction)
    expect(state).toBe(completed)
    expect(state.growthSnapshots).toHaveLength(snapshotCount)
  })

  it("即使证据齐全，复测表单缺答案、实操或人工确认也不改变状态", () => {
    const ready = buildRetestReadyState()
    const incompleteActions: DemoAction[] = [
      { ...retestAction, answers: {} },
      { ...retestAction, gateAnswers: {} as Record<TeacherTrustGateId, string> },
      { ...retestAction, practicalCount: 4 },
      { ...retestAction, manualConfirmed: false },
    ]

    for (const action of incompleteActions) {
      expect(demoReducer(ready, action)).toBe(ready)
    }
  })

  it("必修与自主学习使用独立进度，同一必修资源不能重复满足自主资格", () => {
    let state = completeBaselineAndPlan()
    state = demoReducer(state, {
      type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
      id: "resource-foundation-video",
      progress: 100,
      mode: "course",
    })

    state = demoReducer(state, {
      type: "TOGGLE_CUSTOM_PATH_RESOURCE",
      id: "resource-foundation-video",
    })
    expect(state.teacherGrowth.customPath.resourceIds).not.toContain(
      "resource-foundation-video",
    )

    state = reduce(
      state,
      { type: "TOGGLE_CUSTOM_PATH_RESOURCE", id: "resource-research-guide" },
      { type: "SAVE_CUSTOM_PATH" },
      {
        type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
        id: "resource-research-guide",
        progress: 100,
        mode: "self",
      },
    )
    const evidenceCount = state.growthEvidence.length
    state = reduce(
      state,
      {
        type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
        id: "resource-foundation-video",
        progress: 100,
        mode: "course",
      },
      {
        type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
        id: "resource-research-guide",
        progress: 100,
        mode: "self",
      },
    )

    const requiredEvidence = state.growthEvidence.filter((item) =>
      item.qualifiers?.includes("required-course-module"),
    )
    const selfEvidence = state.growthEvidence.filter((item) =>
      item.qualifiers?.includes("self-learning-resource"),
    )
    expect(requiredEvidence).toHaveLength(1)
    expect(selfEvidence).toHaveLength(1)
    expect(requiredEvidence[0].sourceEventId).not.toBe(
      selfEvidence[0].sourceEventId,
    )
    expect(state.growthEvidence).toHaveLength(evidenceCount)

    const preselected = reduce(
      completeBaselineAndPlan(),
      { type: "TOGGLE_CUSTOM_PATH_RESOURCE", id: "resource-foundation-video" },
      { type: "SAVE_CUSTOM_PATH" },
      {
        type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
        id: "resource-foundation-video",
        progress: 100,
        mode: "course",
      },
    )
    const rejectedSelfCompletion = demoReducer(preselected, {
      type: "UPDATE_TEACHER_RESOURCE_PROGRESS",
      id: "resource-foundation-video",
      progress: 100,
      mode: "self",
    })
    expect(
      rejectedSelfCompletion.growthEvidence.some(
        (item) =>
          item.sourceEventId === "self-resource-resource-foundation-video",
      ),
    ).toBe(false)
    expect(
      rejectedSelfCompletion.teacherGrowth.selfLearningProgress[
        "resource-foundation-video"
      ],
    ).toBeUndefined()
  })

  it("发布教案仅形成作品，AI 初评仅形成任务，人工确认后才形成应用闭环", () => {
    const planState: DemoState = {
      ...structuredClone(initialDemoState),
      acceptedPlan: createAdaptedPlan(),
    }
    const published = demoReducer(planState, { type: "PUBLISH_ADAPTED_PLAN" })
    expect(
      published.growthEvidence.filter(
        (item) => item.source === "智能备课与教学实施",
      ),
    ).toEqual([
      expect.objectContaining({
        channel: "artifact",
      }),
    ])
    expect(
      published.growthEvidence.some((item) =>
        item.qualifiers?.includes("teaching-application-loop"),
      ),
    ).toBe(false)

    const noGrades = completeBaselineAndPlan()
    expect(
      demoReducer(noGrades, { type: "CONFIRM_GRADED_ASSIGNMENTS" }),
    ).toBe(noGrades)

    const initialGrading = demoReducer(noGrades, {
      type: "SET_GRADED_ASSIGNMENTS",
      value: sampleGrades,
    })
    expect(
      initialGrading.growthEvidence.some(
        (item) => item.channel === "application",
      ),
    ).toBe(false)

    const confirmed = demoReducer(initialGrading, {
      type: "CONFIRM_GRADED_ASSIGNMENTS",
    })
    expect(
      confirmed.growthEvidence.filter((item) =>
        item.qualifiers?.includes("teaching-application-loop"),
      ),
    ).toEqual([
      expect.objectContaining({
        channel: "application",
        source: "AI批改和人工复核",
        reviewStatus: "confirmed",
      }),
    ])
  })

  it("分层干预发布只形成任务，学生完成回流后才形成应用证据", () => {
    const drafted = demoReducer(structuredClone(initialDemoState), {
      type: "SET_INTERVENTION_PLAN",
      value: interventionPlan,
    })
    const published = demoReducer(drafted, {
      type: "PUBLISH_INTERVENTION",
      id: interventionPlan.id,
    })
    expect(
      published.growthEvidence.filter(
        (item) => item.source === "分层干预",
      ),
    ).toEqual([
      expect.objectContaining({
        channel: "task",
      }),
    ])
    expect(
      published.growthEvidence.some((item) =>
        item.qualifiers?.includes("teaching-application-loop"),
      ),
    ).toBe(false)

    const studentTask = published.studentLearningTasks[0]
    expect(studentTask).toBeDefined()
    const completed = demoReducer(published, {
      type: "COMPLETE_STUDENT_TASK",
      id: studentTask.id,
    })
    expect(
      completed.growthEvidence.filter((item) =>
        item.qualifiers?.includes("teaching-application-loop"),
      ),
    ).toEqual([
      expect.objectContaining({
        channel: "application",
        source: "分层干预结果回流",
      }),
    ])
    expect(
      demoReducer(completed, {
        type: "COMPLETE_STUDENT_TASK",
        id: studentTask.id,
      }),
    ).toBe(completed)
  })

  it("研究成果必须通过五项治理，校内共享只在已复核成果之后形成", () => {
    const checkKeys = Object.keys(
      initialDemoState.teacherGrowth.researchAgent.checks,
    ) as Array<keyof ResearchAgentDraft["checks"]>

    for (const missingCheck of checkKeys) {
      const checks = {
        ...initialDemoState.teacherGrowth.researchAgent.checks,
        [missingCheck]: false,
      }
      const saved = reduce(
        structuredClone(initialDemoState),
        {
          type: "UPDATE_RESEARCH_AGENT",
          patch: {
            sourceIds: ["source-001"],
            toolIds: ["rag"],
            checks,
          },
        },
        { type: "TEST_RESEARCH_AGENT" },
        { type: "SAVE_RESEARCH_AGENT" },
      )
      expect(saved.teacherGrowth.researchAgent.status).toBe("saved")
      expect(demoReducer(saved, { type: "LINK_RESEARCH_AGENT_OUTPUT" })).toBe(
        saved,
      )
    }

    const unlinked = structuredClone(initialDemoState)
    expect(
      demoReducer(unlinked, { type: "SHARE_RESEARCH_AGENT_OUTPUT" }),
    ).toBe(unlinked)

    const linked = reduce(
      structuredClone(initialDemoState),
      {
        type: "UPDATE_RESEARCH_AGENT",
        patch: { sourceIds: ["source-001"], toolIds: ["rag"] },
      },
      { type: "TEST_RESEARCH_AGENT" },
      { type: "SAVE_RESEARCH_AGENT" },
      { type: "LINK_RESEARCH_AGENT_OUTPUT" },
    )
    const reviewedOutputs = linked.growthEvidence.filter((item) =>
      item.qualifiers?.includes("reviewed-research-output"),
    )
    expect(reviewedOutputs).toHaveLength(2)
    expect(reviewedOutputs.map((item) => item.channel).sort()).toEqual([
      "artifact",
      "task",
    ])
    expect(
      reviewedOutputs.every(
        (item) =>
          item.rubric.length === 5 &&
          item.rubric.includes("模型与提示参数已归档"),
      ),
    ).toBe(true)
    expect(
      linked.growthEvidence.some((item) =>
        item.qualifiers?.includes("school-sharing"),
      ),
    ).toBe(false)

    const shared = demoReducer(linked, {
      type: "SHARE_RESEARCH_AGENT_OUTPUT",
    })
    expect(
      shared.growthEvidence.filter((item) =>
        item.qualifiers?.includes("school-sharing"),
      ),
    ).toEqual([
      expect.objectContaining({
        channel: "application",
        source: "校内成果共享",
      }),
    ])
    expect(
      demoReducer(shared, { type: "SHARE_RESEARCH_AGENT_OUTPUT" }),
    ).toBe(shared)
  })

  it("重置演示清空成长周期、证据、快照和全部个人进度", () => {
    const dirty = demoReducer(buildRetestReadyState(), {
      type: "SHARE_RESEARCH_AGENT_OUTPUT",
    })
    expect(dirty.growthEvidence.length).toBeGreaterThan(0)
    expect(dirty.growthSnapshots.length).toBeGreaterThan(0)

    const reset = demoReducer(dirty, { type: "RESET" })

    expect(reset).toEqual(initialDemoState)
    expect(reset).not.toBe(initialDemoState)
    expect(reset.growthCycle.status).toBe("not-started")
    expect(reset.growthCycle.snapshotIds).toEqual([])
    expect(reset.growthEvidence).toEqual([])
    expect(reset.growthSnapshots).toEqual([])
    expect(reset.teacherGrowth.selfLearningProgress).toEqual({})
    expect(reset.teacherGrowth.practiceRecords).toEqual([])
    expect(reset.teacherGrowth.researchAgent.linkedOutput).toBeUndefined()
    expect(reset.teacherGrowth.researchAgent.sharedOutput).toBeUndefined()
  })
})
