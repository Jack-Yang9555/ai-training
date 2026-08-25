import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type {
  AdaptedLessonPlan,
  AiTutor,
  AssessmentPaper,
  CourseKnowledgeGraph,
  KnowledgeBase,
  PracticalAssessment,
  QuestionItem,
  TeacherAbilityReport,
  TrainingPlan,
  TrainingTaskProgress,
  CourseResource,
  TeachingContext,
  ObservationScope,
  LearningDiagnosis,
  LearnerGroup,
  InterventionPlan,
  InterventionAssignment,
  StudentLearningTask,
  LearningObservationSnapshot,
  TeacherGrowthState,
  ResearchAgentDraft,
  SchoolTeacherDevelopmentGoal,
  TeacherDevelopmentPlanSummary,
  TeacherDevelopmentScopeId,
} from './types'
import {
  initialKnowledgeBase,
  initialKnowledgeGraph,
  initialPaper,
  initialPracticalAssessment,
  initialQuestionBank,
  initialTaskProgress,
  initialTeacherReport,
  initialTrainingPlan,
  initialTutor,
  trainingTasks,
} from './trainingData'
import { currentStandardLesson, initialTeachingContext, standardCourse, standardResources } from './teachingData'
import { createLearnerGroupsForClass, createLearningSnapshotsForClass, initialLearnerGroups, initialLearningSnapshots, knowledgePointNames } from './learningData'
import { completedTeacherAssessment, createInitialTeacherGrowthState, createTeacherTrainingPlan } from './teacherGrowthData'
import {
  teacherAssessmentQuestions,
  teacherRetestQuestions,
  teacherTrustGateQuestions,
  type TeacherTrustGateId,
} from './teacherAssessmentQuestions'
import {
  ABILITY_DIMENSIONS,
  EVIDENCE_CHANNELS,
  createInitialTeacherGrowthCycle,
  type AbilityLevel,
  type AbilitySnapshot,
  type GrowthEvidenceRecord,
  type GrowthEvidenceQualifier,
  type TeacherGrowthCycle,
} from './teacherGrowthModel'
import {
  calculateAbilitySnapshot,
  checkRetestEligibility,
  deriveGrowthStageStatuses,
  determineCalculatedLevel,
} from './teacherGrowthScoring'

export const ACTIVE_GROWTH_TEACHER_ID = 'teacher-zhou'
export const ACTIVE_GROWTH_TEACHER_NAME = '周岚老师'
export const ACTIVE_GROWTH_ORGANIZATION_ID: TeacherDevelopmentScopeId = 'ai-college'

export const initialSchoolTeacherDevelopmentGoals: SchoolTeacherDevelopmentGoal[] = [
  {
    id: 'TD-SCH-L3-TEA',
    scopeId: 'school',
    scopeLabel: '全校',
    targetLevel: 'L3',
    focusDimension: '教学融合',
    deadline: '2026-12-18',
    eligibleCount: 64,
    groupCount: 6,
    groupSizeSummary: '每组 10—11 人',
    sourceSegment: '待通关 / L1 / L2',
    requiredModules: ['课堂应用设计', '学情诊断与干预'],
    gateRequirement: '事实核验、数据版权、人工责任三项门槛全部通过',
    cadence: '8 周·每周 4 学时',
    status: 'published',
    publishedAt: '2026-08-01 09:00',
  },
]

export function selectApplicableSchoolDevelopmentGoal(
  goals: readonly SchoolTeacherDevelopmentGoal[],
  organizationId: TeacherDevelopmentScopeId = ACTIVE_GROWTH_ORGANIZATION_ID,
) {
  return goals.find((goal) => goal.scopeId === organizationId || goal.scopeId === 'school') ?? null
}

interface ClassWorkspaceState {
  generatedPlan: AdaptedLessonPlan | null
  acceptedPlan: AdaptedLessonPlan | null
  learningSnapshots: Record<ObservationScope, LearningObservationSnapshot>
  learningDiagnosis: LearningDiagnosis | null
  learnerGroups: LearnerGroup[]
  interventionPlans: InterventionPlan[]
  interventionAssignments: InterventionAssignment[]
}

export interface DemoState {
  activeClassId: string
  classWorkspaceById: Record<string, ClassWorkspaceState>
  standardCourse: typeof standardCourse
  selectedStandardLessonId: string
  teachingContext: TeachingContext
  generatedPlan: AdaptedLessonPlan | null
  acceptedPlan: AdaptedLessonPlan | null
  courseResources: CourseResource[]
  knowledgeBase: KnowledgeBase
  graph: CourseKnowledgeGraph
  tutor: AiTutor
  generatedQuestions: QuestionItem[]
  questionBank: QuestionItem[]
  trainingPlan: TrainingPlan | null
  practicalAssessment: PracticalAssessment | null
  paper: AssessmentPaper | null
  paperPublished: boolean
  gradedAssignments: Array<{ student: string; score: number; confidence: number; status: string }>
  taskProgress: TrainingTaskProgress[]
  teacherReport: TeacherAbilityReport
  profileUpdated: boolean
  observationScope: ObservationScope
  learningSnapshots: Record<ObservationScope, LearningObservationSnapshot>
  learningDiagnosis: LearningDiagnosis | null
  learnerGroups: LearnerGroup[]
  interventionPlans: InterventionPlan[]
  interventionAssignments: InterventionAssignment[]
  studentLearningTasks: StudentLearningTask[]
  teacherGrowth: TeacherGrowthState
  growthCycle: TeacherGrowthCycle
  growthEvidence: GrowthEvidenceRecord[]
  growthSnapshots: AbilitySnapshot[]
  schoolTeacherDevelopmentGoals: SchoolTeacherDevelopmentGoal[]
}

export type DemoAction =
  | { type: 'SET_ACTIVE_CLASS'; classId: string; lessonId: string; className: string; learnerCount: number }
  | { type: 'SELECT_STANDARD_LESSON'; id: string }
  | { type: 'SET_TEACHING_CONTEXT'; value: TeachingContext }
  | { type: 'SET_GENERATED_PLAN'; value: AdaptedLessonPlan }
  | { type: 'ACCEPT_ADAPTED_PLAN' }
  | { type: 'UPDATE_ADAPTED_STEP_DURATION'; id: string; delta: number }
  | { type: 'REPLACE_ADAPTED_STEP_RESOURCE'; id: string }
  | { type: 'ADD_ADAPTED_QUESTION' }
  | { type: 'REMOVE_ADAPTED_QUESTION'; id: string }
  | { type: 'PUBLISH_ADAPTED_PLAN' }
  | { type: 'SET_KNOWLEDGE_BASE'; value: KnowledgeBase }
  | { type: 'SET_GRAPH'; value: CourseKnowledgeGraph }
  | { type: 'CONFIGURE_TUTOR' }
  | { type: 'PUBLISH_TUTOR'; version: string; link: string }
  | { type: 'ADD_TUTOR_MESSAGE'; value: AiTutor['messages'][number] }
  | { type: 'SET_GENERATED_QUESTIONS'; value: QuestionItem[] }
  | { type: 'SAVE_QUESTIONS' }
  | { type: 'REMOVE_GENERATED_QUESTION'; id: string }
  | { type: 'SET_TRAINING_PLAN'; plan: TrainingPlan; assessment: PracticalAssessment }
  | { type: 'SET_PAPER'; value: AssessmentPaper }
  | { type: 'PUBLISH_PAPER' }
  | { type: 'SET_GRADED_ASSIGNMENTS'; value: DemoState['gradedAssignments'] }
  | { type: 'CONFIRM_GRADED_ASSIGNMENTS' }
  | { type: 'COMPLETE_TASK'; id: string }
  | { type: 'UPDATE_PROFILE' }
  | { type: 'SET_OBSERVATION_SCOPE'; value: ObservationScope }
  | { type: 'SET_LEARNING_DIAGNOSIS'; value: LearningDiagnosis }
  | { type: 'SET_INTERVENTION_PLAN'; value: InterventionPlan }
  | { type: 'UPDATE_INTERVENTION_PLAN'; id: string; patch: Partial<InterventionPlan> }
  | { type: 'TOGGLE_INTERVENTION_RECIPIENT'; id: string; studentId: string }
  | { type: 'PUBLISH_INTERVENTION'; id: string }
  | { type: 'COMPLETE_STUDENT_TASK'; id: string }
  | { type: 'ADD_REPORT_REMEDIATION' }
  | { type: 'COMPLETE_TEACHER_ASSESSMENT'; answers: Record<string, string>; gateAnswers: Record<TeacherTrustGateId, string>; practicalCount: number; manualConfirmed: boolean }
  | { type: 'SET_GROWTH_TARGET_LEVEL'; value: AbilityLevel }
  | { type: 'SET_TEACHER_PLAN_WEEKLY_HOURS'; value: number }
  | { type: 'MOVE_TEACHER_PLAN_MODULE'; id: string; direction: -1 | 1 }
  | { type: 'TOGGLE_TEACHER_PLAN_MODULE'; id: string }
  | { type: 'ACCEPT_TEACHER_PLAN' }
  | { type: 'UPDATE_TEACHER_RESOURCE_PROGRESS'; id: string; progress: number; mode: 'course' | 'self' }
  | { type: 'TOGGLE_TEACHER_RESOURCE_FAVORITE'; id: string }
  | { type: 'SAVE_TEACHER_RESOURCE_NOTE'; id: string; note: string }
  | { type: 'TOGGLE_CUSTOM_PATH_RESOURCE'; id: string }
  | { type: 'MOVE_CUSTOM_PATH_RESOURCE'; id: string; direction: -1 | 1 }
  | { type: 'SAVE_CUSTOM_PATH' }
  | { type: 'ADD_TEACHER_PRACTICE_RECORD'; toolId: string; toolName: string; task: string }
  | { type: 'CONFIRM_TEACHER_PRACTICE_ARTIFACT'; id: string }
  | { type: 'COMPLETE_TEACHER_RETEST'; answers: Record<string, string>; gateAnswers: Record<TeacherTrustGateId, string>; practicalCount: number; manualConfirmed: boolean }
  | { type: 'UPDATE_RESEARCH_AGENT'; patch: Partial<ResearchAgentDraft> }
  | { type: 'TEST_RESEARCH_AGENT' }
  | { type: 'SAVE_RESEARCH_AGENT' }
  | { type: 'LINK_RESEARCH_AGENT_OUTPUT' }
  | { type: 'SHARE_RESEARCH_AGENT_OUTPUT' }
  | { type: 'PUBLISH_SCHOOL_DEVELOPMENT_GOAL'; plan: TeacherDevelopmentPlanSummary }
  | { type: 'RESET' }

const cloneInitialState = (): DemoState => ({
  activeClassId: 'class-ai-2401',
  classWorkspaceById: {},
  standardCourse: structuredClone(standardCourse),
  selectedStandardLessonId: currentStandardLesson.id,
  teachingContext: structuredClone(initialTeachingContext),
  generatedPlan: null,
  acceptedPlan: null,
  courseResources: structuredClone(standardResources),
  knowledgeBase: structuredClone(initialKnowledgeBase),
  graph: structuredClone(initialKnowledgeGraph),
  tutor: structuredClone(initialTutor),
  generatedQuestions: [],
  questionBank: structuredClone(initialQuestionBank.items),
  trainingPlan: initialTrainingPlan,
  practicalAssessment: initialPracticalAssessment,
  paper: initialPaper,
  paperPublished: false,
  gradedAssignments: [],
  taskProgress: structuredClone(initialTaskProgress),
  teacherReport: structuredClone(initialTeacherReport),
  profileUpdated: false,
  observationScope: 'unit',
  learningSnapshots: structuredClone(initialLearningSnapshots),
  learningDiagnosis: null,
  learnerGroups: structuredClone(initialLearnerGroups),
  interventionPlans: [],
  interventionAssignments: [],
  studentLearningTasks: [],
  teacherGrowth: createInitialTeacherGrowthState(),
  growthCycle: createInitialTeacherGrowthCycle({
    id: 'teacher-growth-cycle-2026',
    teacherId: ACTIVE_GROWTH_TEACHER_ID,
    targetLevel: 'L3',
  }),
  growthEvidence: [],
  growthSnapshots: [],
  schoolTeacherDevelopmentGoals: structuredClone(initialSchoolTeacherDevelopmentGoals),
})

function createAiResources(plan: AdaptedLessonPlan): CourseResource[] {
  const shared = {
    origin: 'ai-generated' as const,
    status: 'draft' as const,
    courseId: plan.courseId,
    unitId: plan.unitId,
    lessonId: plan.standardLessonId,
    version: plan.version,
    updatedAt: '今天 · 刚刚',
    knowledgePoints: plan.context.focus.split('与'),
    scenario: plan.context.mode,
    parentVersion: '标准版 v2.1',
  }
  return [
    { ...shared, id: `ai-plan-${plan.standardLessonId}`, title: `${plan.title} · 情境化教案`, kind: '情境化教案', description: `${plan.context.audience} · ${plan.duration} 分钟 · L${plan.context.targetDifficulty}` },
    { ...shared, id: `ai-activity-${plan.standardLessonId}`, title: `${plan.context.focus} · 课堂活动包`, kind: '课堂活动包', description: `${plan.steps.length} 个教学环节及其资源引用` },
    { ...shared, id: `ai-questions-${plan.standardLessonId}`, title: `${plan.title} · 配套题目集`, kind: '配套题目集', description: `${plan.supportingQuestions.length} 道分层题目，覆盖理解、应用与分析` },
    { ...shared, id: `ai-progress-${plan.standardLessonId}`, title: `${plan.title} · 教学进度方案`, kind: '教学进度方案', description: `${plan.progress.totalSessions} 个课次 · ${plan.progress.milestones.length} 个里程碑` },
  ]
}

export const initialDemoState = cloneInitialState()

const levelLabels: Record<AbilityLevel, TeacherAbilityReport['level']> = {
  L1: 'L1 AI入门者',
  L2: 'L2 AI实践者',
  L3: 'L3 AI创新者',
  L4: 'L4 AI引领者',
}

function growthEvidenceTime(state: DemoState) {
  const sequence = state.growthEvidence.length + 1
  const hour = 10 + Math.floor(sequence / 50)
  const minute = sequence % 50
  return `2026-08-20T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`
}

function baselineDimensionScores(state: DemoState) {
  const baseline = state.growthSnapshots.find((snapshot) => snapshot.kind === 'baseline')
  if (baseline) return baseline.dimensionScores
  return Object.fromEntries(
    ABILITY_DIMENSIONS.map((dimension) => [
      dimension,
      state.teacherGrowth.assessment.dimensions.find((item) => item.label === dimension)?.score ?? 0,
    ]),
  ) as AbilitySnapshot['dimensionScores']
}

function syncUnifiedGrowthReport(
  state: DemoState,
  kind: AbilitySnapshot['kind'] = 'current',
): DemoState {
  const completedTasks = state.taskProgress.filter((item) => item.status === 'completed').length
  if (state.teacherGrowth.assessment.status !== 'completed') {
    return {
      ...state,
      teacherReport: {
        ...state.teacherReport,
        completed: completedTasks,
        total: trainingTasks.length,
        nextTask: trainingTasks.find((task) => state.taskProgress.find((item) => item.taskId === task.id)?.status === 'available')?.title ?? state.teacherReport.nextTask,
      },
    }
  }

  const snapshotSequence = state.growthSnapshots.length + 1
  const snapshot = calculateAbilitySnapshot({
    id: `${state.growthCycle.id}-${kind}-${snapshotSequence}`,
    cycleId: state.growthCycle.id,
    kind,
    baselineScores: baselineDimensionScores(state),
    evidence: state.growthEvidence,
    generatedAt: growthEvidenceTime(state),
    baselineCompleted: true,
  })
  const snapshots = [...state.growthSnapshots, snapshot]
  const stageStatus = deriveGrowthStageStatuses({
    cycle: state.growthCycle,
    evidence: state.growthEvidence,
    snapshots,
    gateResults: snapshot.gateResults,
    evidenceCoverage: snapshot.evidenceCoverage,
  })
  const retest = checkRetestEligibility({
    cycle: { ...state.growthCycle, stageStatus },
    evidence: state.growthEvidence,
    gateResults: snapshot.gateResults,
    evidenceCoverage: snapshot.evidenceCoverage,
  })
  const cycleStatus: TeacherGrowthCycle['status'] = kind === 'final'
    ? 'completed'
    : retest.eligible
      ? 'retest-ready'
      : state.growthCycle.planConfirmed
        ? 'developing'
        : 'plan'
  const nextRequirement = retest.requirements.find((item) => !item.met)
  return {
    ...state,
    growthSnapshots: snapshots,
    growthCycle: {
      ...state.growthCycle,
      status: cycleStatus,
      stageStatus,
      snapshotIds: [...state.growthCycle.snapshotIds, snapshot.id],
    },
    teacherReport: {
      level: levelLabels[snapshot.certifiedLevel ?? snapshot.calculatedLevel],
      completed: completedTasks,
      total: trainingTasks.length,
      dimensions: ABILITY_DIMENSIONS.map((label) => ({ label, value: Math.round(snapshot.dimensionScores[label]) })),
      nextTask: nextRequirement?.reason ?? (kind === 'final' ? '开启下一轮教师 AI 能力发展计划' : '参加结业复测'),
      calculatedLevel: snapshot.calculatedLevel,
      certifiedLevel: snapshot.certifiedLevel,
      gatePassed: snapshot.certifiedLevel !== null,
    },
  }
}

function appendStructuredGrowthEvidence(
  state: DemoState,
  records: GrowthEvidenceRecord | GrowthEvidenceRecord[],
  kind: AbilitySnapshot['kind'] = 'current',
) {
  const additions = (Array.isArray(records) ? records : [records]).map((record) => {
    const revision = state.growthEvidence.filter((item) => item.id === record.id || item.id.startsWith(`${record.id}-r`)).length
    return revision ? { ...record, id: `${record.id}-r${revision + 1}` } : record
  })
  return syncUnifiedGrowthReport({
    ...state,
    growthEvidence: [...state.growthEvidence, ...additions],
  }, kind)
}

function trainingTaskDimensions(taskId: string): GrowthEvidenceRecord['dimensions'] {
  if (['kb-create', 'kb-optimize', 'graph-generate', 'agent-config', 'avatar-config', 'tutor-publish'].includes(taskId)) {
    return [{ dimension: '知识库与智能体', score: 86 }]
  }
  if (['question-generate', 'training-design', 'paper-assemble'].includes(taskId)) {
    return [
      { dimension: '提示词与多模态', score: 84 },
      { dimension: '教学融合', score: 82 },
    ]
  }
  return [{ dimension: '教学融合', score: 88 }]
}

function practiceDimensions(toolName: string, score: number): GrowthEvidenceRecord['dimensions'] {
  if (/研究|文献|数据分析/.test(toolName)) {
    return [{ dimension: '研究创新', score }]
  }
  if (/知识库|RAG|智能体|Dify|MCP/.test(toolName)) {
    return [
      { dimension: '知识库与智能体', score },
      { dimension: '提示词与多模态', score: Math.max(0, score - 3) },
    ]
  }
  return [
    { dimension: '提示词与多模态', score },
    { dimension: 'AI 基础认知', score: Math.max(0, score - 5) },
  ]
}

function isRequiredCourseResource(state: DemoState, resourceId: string) {
  return state.teacherGrowth.trainingPlan?.modules.some(
    (module) => module.required && module.enabled && module.resourceIds.includes(resourceId),
  ) ?? false
}

function withCompletedTask(state: DemoState, taskId: string): DemoState {
  const completedIds = new Set(
    state.taskProgress.filter((item) => item.status === 'completed').map((item) => item.taskId),
  )
  completedIds.add(taskId)
  const now = '今天 · 刚刚'
  const progress = trainingTasks.map((task) => {
    const current = state.taskProgress.find((item) => item.taskId === task.id)
    if (completedIds.has(task.id)) {
      return current?.status === 'completed'
        ? current
        : { taskId: task.id, status: 'completed' as const, score: 88 + (completedIds.size % 6), actualMinutes: Math.max(5, task.standardMinutes - 3), completedAt: now }
    }
    return {
      taskId: task.id,
      status: !task.prerequisite || completedIds.has(task.prerequisite) ? 'available' as const : 'locked' as const,
    }
  })
  const nextState = { ...state, taskProgress: progress }
  const task = trainingTasks.find((item) => item.id === taskId)
  if (!task) return syncUnifiedGrowthReport(nextState)
  const time = growthEvidenceTime(nextState)
  return appendStructuredGrowthEvidence(nextState, {
      id: `growth-task-${taskId}`,
      sourceEventId: `training-task-${taskId}`,
      cycleId: state.growthCycle.id,
      teacherId: ACTIVE_GROWTH_TEACHER_ID,
      channel: 'task',
      source: '培训任务',
      task: task.title,
      artifactVersion: task.output,
      dimensions: trainingTaskDimensions(taskId),
      gateAssertions: [],
      rubric: ['输入完整', '产出可追溯', '人工确认'],
      reviewStatus: state.growthCycle.planConfirmed ? 'confirmed' : 'pending',
      anonymous: true,
      confidence: 0.9,
      occurredAt: time,
    })
}

function reducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'SET_ACTIVE_CLASS': {
      if (state.activeClassId === action.classId) {
        return {
          ...state,
          selectedStandardLessonId: action.lessonId,
          teachingContext: {
            ...state.teachingContext,
            audience: action.className,
            learnerCount: action.learnerCount,
          },
        }
      }
      const classWorkspaceById = {
        ...state.classWorkspaceById,
        [state.activeClassId]: {
          generatedPlan: state.generatedPlan,
          acceptedPlan: state.acceptedPlan,
          learningSnapshots: state.learningSnapshots,
          learningDiagnosis: state.learningDiagnosis,
          learnerGroups: state.learnerGroups,
          interventionPlans: state.interventionPlans,
          interventionAssignments: state.interventionAssignments,
        },
      }
      const target = classWorkspaceById[action.classId]
      return {
        ...state,
        activeClassId: action.classId,
        classWorkspaceById,
        selectedStandardLessonId: action.lessonId,
        teachingContext: {
          ...state.teachingContext,
          audience: action.className,
          learnerCount: action.learnerCount,
        },
        generatedPlan: target?.generatedPlan ?? null,
        acceptedPlan: target?.acceptedPlan ?? null,
        learningSnapshots: target?.learningSnapshots ?? createLearningSnapshotsForClass(action.classId),
        learningDiagnosis: target?.learningDiagnosis ?? null,
        learnerGroups: target?.learnerGroups ?? createLearnerGroupsForClass(action.classId, action.learnerCount),
        interventionPlans: target?.interventionPlans ?? [],
        interventionAssignments: target?.interventionAssignments ?? [],
      }
    }
    case 'SELECT_STANDARD_LESSON':
      return { ...state, selectedStandardLessonId: action.id, generatedPlan: null }
    case 'SET_TEACHING_CONTEXT':
      return { ...state, teachingContext: action.value, generatedPlan: null }
    case 'SET_GENERATED_PLAN':
      return { ...state, generatedPlan: action.value }
    case 'ACCEPT_ADAPTED_PLAN': {
      if (!state.generatedPlan) return state
      const acceptedPlan = { ...state.generatedPlan, status: 'draft' as const }
      const resources = createAiResources(acceptedPlan)
      const otherResources = state.courseResources.filter((resource) => resource.origin === 'standard' || resource.lessonId !== acceptedPlan.standardLessonId)
      const otherQuestions = state.questionBank.filter((question) => !question.id.startsWith('adapt-q-'))
      return {
        ...state,
        generatedPlan: acceptedPlan,
        acceptedPlan,
        courseResources: [...otherResources, ...resources],
        questionBank: [...otherQuestions, ...acceptedPlan.supportingQuestions],
      }
    }
    case 'UPDATE_ADAPTED_STEP_DURATION': {
      if (!state.acceptedPlan) return state
      const steps = state.acceptedPlan.steps.map((step) => step.id === action.id ? { ...step, duration: Math.max(3, step.duration + action.delta) } : step)
      const acceptedPlan = { ...state.acceptedPlan, steps, duration: steps.reduce((sum, step) => sum + step.duration, 0) }
      return { ...state, acceptedPlan }
    }
    case 'REPLACE_ADAPTED_STEP_RESOURCE': {
      if (!state.acceptedPlan) return state
      const steps = state.acceptedPlan.steps.map((step) => step.id === action.id ? { ...step, resource: step.resource.includes('AI适配') ? step.resource.replace(' · AI适配版', '') : `${step.resource} · AI适配版` } : step)
      return { ...state, acceptedPlan: { ...state.acceptedPlan, steps } }
    }
    case 'ADD_ADAPTED_QUESTION': {
      if (!state.acceptedPlan) return state
      const base = state.acceptedPlan.supportingQuestions[0]
      if (!base) return state
      const count = state.acceptedPlan.supportingQuestions.length + 1
      const question = { ...base, id: `adapt-extra-${count}`, type: '简答' as const, stem: `结合本次教学重点，说明一次有效调整应保留哪些证据？（补充题 ${count}）`, answer: '说明调整前问题、修改项与结果变化之间的对应关系。', score: 10, enabled: false }
      const supportingQuestions = [...state.acceptedPlan.supportingQuestions, question]
      return { ...state, acceptedPlan: { ...state.acceptedPlan, supportingQuestions }, questionBank: [...state.questionBank, question], courseResources: state.courseResources.map((resource) => resource.id === `ai-questions-${state.acceptedPlan?.standardLessonId}` ? { ...resource, description: `${supportingQuestions.length} 道分层题目，覆盖理解、应用与分析` } : resource) }
    }
    case 'REMOVE_ADAPTED_QUESTION': {
      if (!state.acceptedPlan) return state
      const supportingQuestions = state.acceptedPlan.supportingQuestions.filter((question) => question.id !== action.id)
      return { ...state, acceptedPlan: { ...state.acceptedPlan, supportingQuestions }, questionBank: state.questionBank.filter((question) => question.id !== action.id), courseResources: state.courseResources.map((resource) => resource.id === `ai-questions-${state.acceptedPlan?.standardLessonId}` ? { ...resource, description: `${supportingQuestions.length} 道分层题目，覆盖理解、应用与分析` } : resource) }
    }
    case 'PUBLISH_ADAPTED_PLAN': {
      if (!state.acceptedPlan || state.acceptedPlan.status === 'published') return state
      const acceptedPlan = { ...state.acceptedPlan, status: 'published' as const }
      const nextState = {
        ...state,
        acceptedPlan,
        generatedPlan: acceptedPlan,
        courseResources: state.courseResources.map((resource) => resource.origin === 'ai-generated' && resource.lessonId === acceptedPlan.standardLessonId ? { ...resource, status: 'published' as const } : resource),
        questionBank: state.questionBank.map((question) => question.id.startsWith('adapt-q-') ? { ...question, enabled: true } : question),
      }
      return appendStructuredGrowthEvidence(nextState, {
        id: `growth-artifact-plan-${acceptedPlan.standardLessonId}`,
        sourceEventId: `published-plan-${acceptedPlan.standardLessonId}-${acceptedPlan.version}`,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'artifact',
        source: '智能备课与教学实施',
        task: `发布${acceptedPlan.title}`,
        artifactVersion: acceptedPlan.version,
        dimensions: [
          { dimension: '教学融合', score: 88 },
          { dimension: '提示词与多模态', score: 84 },
        ],
        gateAssertions: [],
        rubric: ['目标与学情对齐', '资源版本可追溯', '教师发布确认'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 0.92,
        occurredAt: growthEvidenceTime(nextState),
      })
    }
    case 'SET_KNOWLEDGE_BASE':
      return withCompletedTask({ ...state, knowledgeBase: action.value }, 'kb-create')
    case 'SET_GRAPH':
      return withCompletedTask({ ...state, graph: action.value }, 'graph-generate')
    case 'CONFIGURE_TUTOR':
      return withCompletedTask({ ...state, tutor: { ...state.tutor, configured: true } }, 'agent-config')
    case 'PUBLISH_TUTOR':
      return withCompletedTask({ ...state, tutor: { ...state.tutor, deployment: { ...state.tutor.deployment, status: 'published', version: action.version, link: action.link } } }, 'tutor-publish')
    case 'ADD_TUTOR_MESSAGE':
      return { ...state, tutor: { ...state.tutor, messages: [...state.tutor.messages, action.value] } }
    case 'SET_GENERATED_QUESTIONS':
      return { ...state, generatedQuestions: action.value }
    case 'SAVE_QUESTIONS':
      return withCompletedTask({ ...state, questionBank: [...state.questionBank, ...state.generatedQuestions], generatedQuestions: [] }, 'question-generate')
    case 'REMOVE_GENERATED_QUESTION':
      return { ...state, generatedQuestions: state.generatedQuestions.filter((item) => item.id !== action.id) }
    case 'SET_TRAINING_PLAN':
      return withCompletedTask({ ...state, trainingPlan: action.plan, practicalAssessment: action.assessment }, 'training-design')
    case 'SET_PAPER':
      return withCompletedTask({ ...state, paper: action.value }, 'paper-assemble')
    case 'PUBLISH_PAPER':
      return { ...state, paperPublished: true, paper: state.paper ? { ...state.paper, status: 'published' } : null }
    case 'SET_GRADED_ASSIGNMENTS':
      return withCompletedTask({ ...state, gradedAssignments: action.value }, 'assignment-grade')
    case 'CONFIRM_GRADED_ASSIGNMENTS':
      if (!state.gradedAssignments.length) return state
      return appendStructuredGrowthEvidence(state, {
        id: 'growth-application-grading-latest',
        sourceEventId: 'grading-review-latest',
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'application',
        source: 'AI批改和人工复核',
        task: '完成 AI 原值、教师修改与最终成绩确认',
        artifactVersion: '评分复核 v2',
        dimensions: [{ dimension: '教学融合', score: 92 }],
        gateAssertions: [{ gateId: 'human-responsibility', status: 'passed', reason: '已保留 AI 原值、最终值和教师确认' }],
        rubric: ['AI 原值保留', '异常结果复核', '最终责任人确认'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 0.94,
        qualifiers: ['teaching-application-loop'],
        occurredAt: growthEvidenceTime(state),
      })
    case 'COMPLETE_TASK':
      return withCompletedTask(state, action.id)
    case 'UPDATE_PROFILE':
      return withCompletedTask({ ...state, profileUpdated: true }, 'learning-analyze')
    case 'SET_OBSERVATION_SCOPE':
      return { ...state, observationScope: action.value, learningDiagnosis: null }
    case 'SET_LEARNING_DIAGNOSIS':
      return { ...state, learningDiagnosis: action.value }
    case 'SET_INTERVENTION_PLAN': {
      const plans = state.interventionPlans.filter((plan) => plan.id !== action.value.id)
      return { ...state, interventionPlans: [...plans, action.value] }
    }
    case 'UPDATE_INTERVENTION_PLAN':
      return { ...state, interventionPlans: state.interventionPlans.map((plan) => plan.id === action.id && plan.status === 'draft' ? { ...plan, ...action.patch } : plan) }
    case 'TOGGLE_INTERVENTION_RECIPIENT':
      return {
        ...state,
        interventionPlans: state.interventionPlans.map((plan) => {
          if (plan.id !== action.id || plan.status === 'published') return plan
          const recipients = plan.recipients.includes(action.studentId)
            ? plan.recipients.filter((id) => id !== action.studentId)
            : [...plan.recipients, action.studentId]
          return { ...plan, recipients }
        }),
      }
    case 'PUBLISH_INTERVENTION': {
      const plan = state.interventionPlans.find((item) => item.id === action.id)
      if (!plan || plan.status === 'published' || !plan.recipients.length || !plan.objective.trim() || !plan.activity.trim()) return state
      const published = { ...plan, status: 'published' as const }
      const assignments: InterventionAssignment[] = plan.recipients.map((studentId) => ({
        id: `${plan.id}-${studentId}`,
        planId: plan.id,
        studentId,
        assignedAt: '今天 10:35',
        status: 'assigned',
      }))
      const tasks: StudentLearningTask[] = plan.recipients.map((studentId) => ({
        id: `task-${plan.id}-${studentId}`,
        planId: plan.id,
        studentId,
        classId: state.activeClassId,
        courseId: 'course-visual-design',
        source: plan.source,
        title: plan.title,
        description: `${plan.activity} · ${plan.questionCount} 道练习`,
        knowledgePoint: knowledgePointNames[plan.targetKnowledgePointId] ?? plan.targetKnowledgePointId,
        difficulty: plan.difficulty,
        duration: plan.duration,
        dueAt: plan.dueAt,
        status: 'assigned',
      }))
      const nextState = {
        ...state,
        interventionPlans: state.interventionPlans.map((item) => item.id === plan.id ? published : item),
        interventionAssignments: [...state.interventionAssignments.filter((item) => item.planId !== plan.id), ...assignments],
        studentLearningTasks: [...state.studentLearningTasks.filter((item) => item.planId !== plan.id), ...tasks],
      }
      return appendStructuredGrowthEvidence(nextState, {
        id: `growth-task-intervention-${action.id}`,
        sourceEventId: `intervention-${action.id}`,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'task',
        source: '分层干预',
        task: `发布${plan.title}`,
        artifactVersion: plan.version,
        dimensions: [{ dimension: '教学融合', score: 86 }],
        gateAssertions: [],
        rubric: ['对象范围已确认', '学习目标可衡量', '干预任务已发布'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 0.9,
        occurredAt: growthEvidenceTime(nextState),
      })
    }
    case 'COMPLETE_STUDENT_TASK': {
      const task = state.studentLearningTasks.find((item) => item.id === action.id)
      if (!task || task.status === 'completed') return state
      const learningSnapshots = Object.fromEntries(Object.entries(state.learningSnapshots).map(([scope, snapshot]) => [scope, {
        ...snapshot,
        metrics: { ...snapshot.metrics, completionRate: Math.min(100, snapshot.metrics.completionRate + 1) },
        updatedAt: '刚刚 · 学生任务完成已回流',
      }])) as Record<ObservationScope, LearningObservationSnapshot>
      const nextState = {
        ...state,
        learningSnapshots,
        studentLearningTasks: state.studentLearningTasks.map((item) => item.id === action.id ? { ...item, status: 'completed' as const } : item),
        interventionAssignments: state.interventionAssignments.map((item) => item.planId === task.planId && item.studentId === task.studentId ? { ...item, status: 'completed' as const } : item),
        learningDiagnosis: null,
      }
      return appendStructuredGrowthEvidence(nextState, {
        id: `growth-application-intervention-${task.planId}`,
        sourceEventId: `intervention-loop-${task.planId}`,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'application',
        source: '分层干预结果回流',
        task: `${task.title}已完成并回流学习结果`,
        artifactVersion: `干预回流 ${task.planId}`,
        dimensions: [{ dimension: '教学融合', score: 91 }],
        gateAssertions: [{ gateId: 'human-responsibility', status: 'passed', reason: '教师确认干预对象与结果回流' }],
        rubric: ['已发布教学行动', '学生已完成', '前后同口径指标已回流'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 0.93,
        qualifiers: ['teaching-application-loop'],
        occurredAt: growthEvidenceTime(nextState),
      })
    }
    case 'ADD_REPORT_REMEDIATION': {
      const plan: InterventionPlan = {
        id: 'report-remediation-negative', source: 'teaching-diagnosis', groupId: 'support', targetKnowledgePointId: 'negative',
        title: '画面控制与负向提示词补学包', objective: '根据画面偏差选择针对性排除词',
        activity: '8 分钟知识卡 + 2 个对比案例 + 3 道自适应练习', resource: '负向提示词补学包',
        questionCount: 3, difficulty: 3, duration: 15, dueAt: '2026-07-18', recipients: ['AI24018'], version: '报告 v1.0', status: 'published',
      }
      const assignment: InterventionAssignment = { id: `${plan.id}-AI24018`, planId: plan.id, studentId: 'AI24018', assignedAt: '刚刚', status: 'assigned' }
      const task: StudentLearningTask = { id: `task-${plan.id}-AI24018`, planId: plan.id, studentId: 'AI24018', classId: 'class-ai-2401', courseId: 'course-visual-design', source: plan.source, title: plan.title, description: plan.activity, knowledgePoint: '负向提示词', difficulty: plan.difficulty, duration: plan.duration, dueAt: plan.dueAt, status: 'assigned' }
      return {
        ...state,
        interventionPlans: [...state.interventionPlans.filter((item) => item.id !== plan.id), plan],
        interventionAssignments: [...state.interventionAssignments.filter((item) => item.id !== assignment.id), assignment],
        studentLearningTasks: [...state.studentLearningTasks.filter((item) => item.id !== task.id), task],
      }
    }
    case 'COMPLETE_TEACHER_ASSESSMENT': {
      const hasAllAnswers = teacherAssessmentQuestions.every((question) => Boolean(action.answers[question.id]))
      const hasAllGates = teacherTrustGateQuestions.every((gate) => Boolean(action.gateAnswers[gate.id]))
      if (!hasAllAnswers || !hasAllGates || action.practicalCount < 5 || !action.manualConfirmed) return state
      const dimensions = completedTeacherAssessment.dimensions.map((dimension) => {
        const question = teacherAssessmentQuestions.find((item) => item.dimension === dimension.label)
        const correct = question ? action.answers[question.id] === question.answer : false
        return {
          ...dimension,
          score: correct ? dimension.score : Math.max(28, dimension.score - 34),
          evidence: correct
            ? dimension.evidence
            : `${question?.id ?? '本维度'} 未达标；已生成对应补强任务。`,
        }
      })
      const dimensionRecord = Object.fromEntries(dimensions.map((item) => [item.label, item.score])) as AbilitySnapshot['dimensionScores']
      const numericLevel = determineCalculatedLevel(
        Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length),
        dimensionRecord,
      )
      const allCorrect = teacherAssessmentQuestions.every((question) => action.answers[question.id] === question.answer)
      const assessment = {
        ...structuredClone(completedTeacherAssessment),
        score: allCorrect ? completedTeacherAssessment.score : Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length),
        level: levelLabels[numericLevel],
        dimensions,
        completedAt: '刚刚 · 首次摸底',
      }
      const plan = createTeacherTrainingPlan()
      const next: DemoState = {
        ...state,
        teacherGrowth: {
          ...state.teacherGrowth,
          assessment,
          trainingPlan: plan,
          recommendedPath: {
            resourceIds: [
              'resource-foundation-video',
              'resource-rag-video',
              'resource-agent-lab',
              'resource-research-guide',
              'resource-prompt-guide',
              'resource-teaching-case',
            ],
            saved: true,
            updatedAt: '刚刚 · 由摸底差距与校级目标生成',
          },
        },
        growthCycle: {
          ...state.growthCycle,
          status: 'plan',
          activePlanId: plan.id,
          stageStatus: {
            ...state.growthCycle.stageStatus,
            'baseline-assessment': 'completed',
            'baseline-report': 'completed',
            'training-plan': 'available',
          },
        },
      }
      const evidence: GrowthEvidenceRecord = {
        id: 'growth-assessment-baseline-v1',
        sourceEventId: 'baseline-assessment-v1',
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'assessment',
        assessmentKind: 'baseline',
        source: '教师 AI 能力摸底包',
        task: '完成五维摸底、综合实操与三项门槛诊断',
        artifactVersion: '题库 v2.3 · 基线快照 v1',
        dimensions: dimensions.map((item) => ({ dimension: item.label, score: item.score })),
        gateAssertions: teacherTrustGateQuestions.map((gate) => ({
          gateId: gate.id,
          status: action.gateAnswers[gate.id] === gate.answer ? 'passed' : 'failed',
          reason: action.gateAnswers[gate.id] === gate.answer ? gate.evidence : `未通过：${gate.evidence}`,
        })),
        rubric: ['5 个维度真实作答', '5 项实操证据', '教师人工确认'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 1,
        critical: true,
        occurredAt: '2026-08-20T10:00:00+08:00',
      }
      return appendStructuredGrowthEvidence(next, evidence, 'baseline')
    }
    case 'SET_GROWTH_TARGET_LEVEL':
      return { ...state, growthCycle: { ...state.growthCycle, targetLevel: action.value } }
    case 'SET_TEACHER_PLAN_WEEKLY_HOURS': {
      if (!state.teacherGrowth.trainingPlan) return state
      return {
        ...state,
        teacherGrowth: {
          ...state.teacherGrowth,
          trainingPlan: {
            ...state.teacherGrowth.trainingPlan,
            weeklyHours: action.value,
            durationWeeks: Math.max(2, Math.ceil(state.teacherGrowth.trainingPlan.modules.filter((module) => module.enabled).reduce((sum, module) => sum + module.duration, 0) / 60 / action.value)),
            updatedAt: '刚刚 · 已重新排期',
          },
        },
      }
    }
    case 'MOVE_TEACHER_PLAN_MODULE': {
      const plan = state.teacherGrowth.trainingPlan
      if (!plan) return state
      const index = plan.modules.findIndex((module) => module.id === action.id)
      const target = index + action.direction
      if (index < 0 || target < 0 || target >= plan.modules.length) return state
      const modules = [...plan.modules]
      ;[modules[index], modules[target]] = [modules[target], modules[index]]
      return { ...state, teacherGrowth: { ...state.teacherGrowth, trainingPlan: { ...plan, modules, updatedAt: '刚刚 · 顺序已调整' } } }
    }
    case 'TOGGLE_TEACHER_PLAN_MODULE': {
      const plan = state.teacherGrowth.trainingPlan
      if (!plan) return state
      const modules = plan.modules.map((module) => module.id === action.id && !module.required ? { ...module, enabled: !module.enabled } : module)
      return { ...state, teacherGrowth: { ...state.teacherGrowth, trainingPlan: { ...plan, modules, updatedAt: '刚刚 · 选修项已更新' } } }
    }
    case 'ACCEPT_TEACHER_PLAN': {
      const plan = state.teacherGrowth.trainingPlan
      if (!plan) return state
      return syncUnifiedGrowthReport({
        ...state,
        teacherGrowth: { ...state.teacherGrowth, trainingPlan: { ...plan, status: 'accepted', updatedAt: '刚刚 · 计划已确认' } },
        growthCycle: {
          ...state.growthCycle,
          status: 'developing',
          activePlanId: plan.id,
          planConfirmed: true,
          stageStatus: { ...state.growthCycle.stageStatus, 'training-plan': 'completed', 'course-learning': 'available', 'self-learning': 'available', 'ai-practice': 'available' },
        },
      })
    }
    case 'UPDATE_TEACHER_RESOURCE_PROGRESS': {
      const progress = Math.max(0, Math.min(100, action.progress))
      const resource = state.teacherGrowth.resources.find((item) => item.id === action.id)
      if (!resource) return state
      if (action.mode === 'self') {
        if (isRequiredCourseResource(state, action.id)) return state
        const previousProgress = state.teacherGrowth.selfLearningProgress[action.id] ?? 0
        const nextState: DemoState = {
          ...state,
          teacherGrowth: {
            ...state.teacherGrowth,
            selfLearningProgress: { ...state.teacherGrowth.selfLearningProgress, [action.id]: progress },
          },
        }
        if (progress !== 100 || previousProgress === 100 || !state.teacherGrowth.customPath.saved || !state.teacherGrowth.customPath.resourceIds.includes(action.id)) return nextState
        return appendStructuredGrowthEvidence(nextState, {
          id: `growth-self-resource-${resource.id}`,
          sourceEventId: `self-resource-${resource.id}`,
          cycleId: state.growthCycle.id,
          teacherId: ACTIVE_GROWTH_TEACHER_ID,
          channel: 'task',
          source: '自主学习',
          task: `完成自主路径任务：${resource.title}`,
          artifactVersion: `${resource.version} · 自主路径`,
          dimensions: [{ dimension: resource.ability, score: 90 }],
          gateAssertions: [],
          rubric: ['自主路径已保存', '自主任务进度 100%', '与必修课程分开记录'],
          reviewStatus: state.growthCycle.planConfirmed ? 'confirmed' : 'pending',
          anonymous: true,
          confidence: 0.92,
          qualifiers: ['self-learning-resource'],
          occurredAt: growthEvidenceTime(nextState),
        })
      }
      const previousResource = resource
      const resources = state.teacherGrowth.resources.map((item) => item.id === action.id ? { ...item, progress, completed: progress === 100 } : item)
      const completedIds = new Set(resources.filter((resource) => resource.completed).map((resource) => resource.id))
      const trainingPlan = state.teacherGrowth.trainingPlan ? {
        ...state.teacherGrowth.trainingPlan,
        modules: state.teacherGrowth.trainingPlan.modules.map((module) => {
          const completedCount = module.resourceIds.filter((id) => completedIds.has(id)).length
          return { ...module, status: completedCount === module.resourceIds.length ? 'completed' as const : completedCount > 0 ? 'in-progress' as const : module.status }
        }),
        updatedAt: '刚刚 · 学习进度已回流',
      } : null
      const nextState = { ...state, teacherGrowth: { ...state.teacherGrowth, resources, trainingPlan } }
      if (progress !== 100 || previousResource.completed) return nextState
      const time = growthEvidenceTime(nextState)
      const required = trainingPlan?.modules.some((module) => module.required && module.enabled && module.status === 'completed' && module.resourceIds.includes(resource.id)) ?? false
      const records: GrowthEvidenceRecord[] = []
      if (required) {
        records.push({
          id: `growth-course-resource-${resource.id}`,
          sourceEventId: `course-resource-${resource.id}`,
          cycleId: state.growthCycle.id,
          teacherId: ACTIVE_GROWTH_TEACHER_ID,
          channel: 'task',
          source: '课程学习',
          task: `完成必修资源：${resource.title}`,
          artifactVersion: resource.version,
          dimensions: [{ dimension: resource.ability, score: 88 }],
          gateAssertions: [],
          rubric: ['学习进度 100%', '必修模块回流', '检查题已完成'],
          reviewStatus: state.growthCycle.planConfirmed ? 'confirmed' : 'pending',
          anonymous: true,
          confidence: 0.92,
          qualifiers: ['required-course-module'],
          occurredAt: time,
        })
      }
      return records.length ? appendStructuredGrowthEvidence(nextState, records) : syncUnifiedGrowthReport(nextState)
    }
    case 'TOGGLE_TEACHER_RESOURCE_FAVORITE':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, resources: state.teacherGrowth.resources.map((resource) => resource.id === action.id ? { ...resource, favorite: !resource.favorite } : resource) } }
    case 'SAVE_TEACHER_RESOURCE_NOTE':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, resources: state.teacherGrowth.resources.map((resource) => resource.id === action.id ? { ...resource, note: action.note } : resource) } }
    case 'TOGGLE_CUSTOM_PATH_RESOURCE': {
      if (isRequiredCourseResource(state, action.id)) return state
      const current = state.teacherGrowth.customPath.resourceIds
      const resourceIds = current.includes(action.id) ? current.filter((id) => id !== action.id) : [...current, action.id]
      return { ...state, teacherGrowth: { ...state.teacherGrowth, customPath: { resourceIds, saved: false, updatedAt: '有未保存更改' } } }
    }
    case 'MOVE_CUSTOM_PATH_RESOURCE': {
      const current = [...state.teacherGrowth.customPath.resourceIds]
      const index = current.indexOf(action.id)
      const target = index + action.direction
      if (index < 0 || target < 0 || target >= current.length) return state
      ;[current[index], current[target]] = [current[target], current[index]]
      return { ...state, teacherGrowth: { ...state.teacherGrowth, customPath: { resourceIds: current, saved: false, updatedAt: '有未保存更改' } } }
    }
    case 'SAVE_CUSTOM_PATH': {
      const resourceIds = state.teacherGrowth.customPath.resourceIds.filter(
        (id) => !isRequiredCourseResource(state, id),
      )
      if (!resourceIds.length) return state
      const nextState: DemoState = {
        ...state,
        teacherGrowth: { ...state.teacherGrowth, customPath: { ...state.teacherGrowth.customPath, resourceIds, saved: true, updatedAt: '刚刚 · 已保存' } },
        growthCycle: { ...state.growthCycle, selfLearningPathSaved: true },
      }
      const completed = state.teacherGrowth.resources.filter((resource) => (state.teacherGrowth.selfLearningProgress[resource.id] ?? 0) === 100 && resourceIds.includes(resource.id))
      if (!completed.length) return syncUnifiedGrowthReport(nextState)
      const time = growthEvidenceTime(nextState)
      return appendStructuredGrowthEvidence(nextState, completed.map((resource) => ({
        id: `growth-self-resource-${resource.id}`,
        sourceEventId: `self-resource-${resource.id}`,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'task' as const,
        source: '自主学习',
        task: `完成自主路径资源：${resource.title}`,
        artifactVersion: resource.version,
        dimensions: [{ dimension: resource.ability, score: 90 }],
        gateAssertions: [],
        rubric: ['自主路径已保存', '学习进度 100%', '学习笔记可回溯'],
        reviewStatus: state.growthCycle.planConfirmed ? 'confirmed' as const : 'pending' as const,
        anonymous: true,
        confidence: 0.92,
        qualifiers: ['self-learning-resource'] as GrowthEvidenceQualifier[],
        occurredAt: time,
      })))
    }
    case 'ADD_TEACHER_PRACTICE_RECORD': {
      const sequence = state.teacherGrowth.practiceRecords.length + 1
      const record = {
        id: `teacher-practice-${sequence}`,
        toolId: action.toolId,
        toolName: action.toolName,
        task: action.task,
        duration: 18 + sequence * 3,
        score: Math.min(96, 84 + sequence * 2),
        artifact: `${action.toolName} · 实训作品 ${sequence}`,
        artifactConfirmed: false,
        completedAt: '刚刚',
      }
      const nextState = { ...state, teacherGrowth: { ...state.teacherGrowth, practiceRecords: [record, ...state.teacherGrowth.practiceRecords] } }
      return appendStructuredGrowthEvidence(nextState, {
        id: `growth-task-${record.id}`,
        sourceEventId: record.id,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'task',
        source: '自由实训',
        task: action.task,
        artifactVersion: record.artifact,
        dimensions: practiceDimensions(action.toolName, record.score),
        gateAssertions: [],
        rubric: ['任务已完成', '过程时长已记录', '作品待人工确认'],
        reviewStatus: state.growthCycle.planConfirmed ? 'confirmed' : 'pending',
        anonymous: true,
        confidence: 0.9,
        qualifiers: state.growthCycle.planConfirmed ? ['ai-practice'] : [],
        occurredAt: growthEvidenceTime(nextState),
      })
    }
    case 'CONFIRM_TEACHER_PRACTICE_ARTIFACT': {
      const record = state.teacherGrowth.practiceRecords.find((item) => item.id === action.id)
      if (!record || record.artifactConfirmed || !state.growthCycle.planConfirmed) return state
      const nextState: DemoState = {
        ...state,
        teacherGrowth: {
          ...state.teacherGrowth,
          practiceRecords: state.teacherGrowth.practiceRecords.map((item) => item.id === action.id ? { ...item, artifactConfirmed: true } : item),
        },
      }
      return appendStructuredGrowthEvidence(nextState, {
        id: `growth-artifact-${record.id}`,
        sourceEventId: record.id,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'artifact',
        source: '自由实训作品',
        task: `按量规复核：${record.task}`,
        artifactVersion: record.artifact,
        dimensions: practiceDimensions(record.toolName, Math.min(98, record.score + 3)),
        gateAssertions: [{ gateId: 'human-responsibility', status: 'passed', reason: '教师已对作品量规结果作最终确认' }],
        rubric: ['任务符合度', '过程留痕', '人工修改与确认'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 0.95,
        qualifiers: ['ai-practice'],
        occurredAt: growthEvidenceTime(nextState),
      })
    }
    case 'COMPLETE_TEACHER_RETEST': {
      if (state.teacherGrowth.assessment.status !== 'completed' || state.growthSnapshots.some((snapshot) => snapshot.kind === 'final')) return state
      const latestSnapshot = [...state.growthSnapshots].reverse().find((snapshot) => snapshot.kind === 'current' || snapshot.kind === 'baseline')
      const eligibility = checkRetestEligibility({
        cycle: state.growthCycle,
        evidence: state.growthEvidence,
        gateResults: latestSnapshot?.gateResults,
        evidenceCoverage: latestSnapshot?.evidenceCoverage,
      })
      const hasAllAnswers = teacherRetestQuestions.every((question) => Boolean(action.answers[question.id]))
      const hasAllGates = teacherTrustGateQuestions.every((gate) => Boolean(action.gateAnswers[gate.id]))
      if (!eligibility.eligible || !hasAllAnswers || !hasAllGates || action.practicalCount < 5 || !action.manualConfirmed) return state
      const dimensions = state.teacherGrowth.assessment.dimensions.map((dimension) => {
        const question = teacherRetestQuestions.find((item) => item.dimension === dimension.label)
        const correct = question ? action.answers[question.id] === question.answer : false
        return {
          ...dimension,
          score: correct ? 96 : 48,
          evidence: correct
            ? `${question?.id} 等值迁移题通过，综合实操与人工确认完整。`
            : `${question?.id} 等值迁移题未达标，已进入下一周期补强建议。`,
        }
      })
      const overall = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length)
      const numericLevel = determineCalculatedLevel(overall, Object.fromEntries(dimensions.map((item) => [item.label, item.score])) as AbilitySnapshot['dimensionScores'])
      const assessment = {
        ...state.teacherGrowth.assessment,
        stage: 'final' as const,
        score: overall,
        level: levelLabels[numericLevel],
        dimensions,
        completedAt: '刚刚 · 结业复测',
      }
      const nextState = { ...state, teacherGrowth: { ...state.teacherGrowth, assessment } }
      return appendStructuredGrowthEvidence(nextState, {
        id: 'growth-assessment-final-v1',
        sourceEventId: 'final-retest-v1',
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'assessment',
        assessmentKind: 'final',
        source: '教师 AI 能力结业复测包',
        task: '完成五维等值新题、综合实操与三门槛复核',
        artifactVersion: '复测报告 v1',
        dimensions: dimensions.map((item) => ({ dimension: item.label, score: item.score })),
        gateAssertions: teacherTrustGateQuestions.map((gate) => ({
          gateId: gate.id,
          status: action.gateAnswers[gate.id] === gate.answer ? 'passed' : 'failed',
          reason: action.gateAnswers[gate.id] === gate.answer ? `复测已通过：${gate.evidence}` : `复测未通过：${gate.evidence}`,
        })),
        rubric: ['5 道等值新题', '5 项综合实操证据', '人工责任确认'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 1,
        critical: true,
        occurredAt: growthEvidenceTime(nextState),
      }, 'final')
    }
    case 'UPDATE_RESEARCH_AGENT':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...state.teacherGrowth.researchAgent, ...action.patch, status: 'draft' } } }
    case 'TEST_RESEARCH_AGENT':
      if (!state.teacherGrowth.researchAgent.sourceIds.length || !state.teacherGrowth.researchAgent.toolIds.length) return state
      return { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...state.teacherGrowth.researchAgent, status: 'tested', testResult: '已基于匿名资料生成研究备忘录；5 条观点均附来源，等待教师人工确认。' } } }
    case 'SAVE_RESEARCH_AGENT':
      if (state.teacherGrowth.researchAgent.status !== 'tested') return state
      return { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...state.teacherGrowth.researchAgent, status: 'saved', version: state.teacherGrowth.researchAgent.version + 1 } } }
    case 'LINK_RESEARCH_AGENT_OUTPUT': {
      const agent = state.teacherGrowth.researchAgent
      if (agent.status !== 'saved' || agent.linkedOutput || !Object.values(agent.checks).every(Boolean)) return state
      const nextState = { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...agent, linkedOutput: `阶段成果：课堂互动证据分析备忘录 v${agent.version}.0` } } }
      const sourceEventId = `research-output-${agent.projectId}-v${agent.version}`
      const time = growthEvidenceTime(nextState)
      const shared = {
        sourceEventId,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        source: 'AI研究和科研智能体',
        artifactVersion: `研究备忘录 v${agent.version}.0`,
        dimensions: [
          { dimension: '研究创新' as const, score: 94 },
          { dimension: '知识库与智能体' as const, score: 90 },
        ],
        gateAssertions: [
          { gateId: 'fact-verification' as const, status: 'passed' as const, reason: '5 条观点均可回到原始引用' },
          { gateId: 'data-copyright' as const, status: 'passed' as const, reason: '仅使用已授权文献与匿名教学证据' },
          { gateId: 'human-responsibility' as const, status: 'passed' as const, reason: '研究结论已由教师人工复核并披露 AI 使用' },
        ],
        rubric: ['引用可回溯', '数据已匿名', 'AI 使用已披露', '模型与提示参数已归档', '教师已复核'],
        reviewStatus: 'confirmed' as const,
        anonymous: true,
        confidence: 0.96,
        qualifiers: ['reviewed-research-output'] as GrowthEvidenceQualifier[],
        occurredAt: time,
      }
      return appendStructuredGrowthEvidence(nextState, [
        { ...shared, id: `growth-task-research-${agent.version}`, channel: 'task', task: '完成可复核研究备忘录' },
        { ...shared, id: `growth-artifact-research-${agent.version}`, channel: 'artifact', task: '关联课堂互动证据分析成果' },
      ])
    }
    case 'SHARE_RESEARCH_AGENT_OUTPUT': {
      const agent = state.teacherGrowth.researchAgent
      if (!agent.linkedOutput || agent.sharedOutput) return state
      const nextState: DemoState = {
        ...state,
        teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...agent, sharedOutput: '校内教师 AI 教学示范案例 G-03' } },
      }
      return appendStructuredGrowthEvidence(nextState, {
        id: `growth-application-sharing-${agent.version}`,
        sourceEventId: `research-sharing-${agent.projectId}-v${agent.version}`,
        cycleId: state.growthCycle.id,
        teacherId: ACTIVE_GROWTH_TEACHER_ID,
        channel: 'application',
        source: '校内成果共享',
        task: '将已复核研究成果转化为匿名教学示范案例',
        artifactVersion: `示范案例 v${agent.version}.0`,
        dimensions: [{ dimension: '研究创新', score: 96 }, { dimension: '教学融合', score: 92 }],
        gateAssertions: [],
        rubric: ['研究成果已复核', '共享材料已匿名', '适用边界已标注'],
        reviewStatus: 'confirmed',
        anonymous: true,
        confidence: 0.96,
        qualifiers: ['reviewed-research-output', 'school-sharing', 'teaching-application-loop'],
        occurredAt: growthEvidenceTime(nextState),
      })
    }
    case 'PUBLISH_SCHOOL_DEVELOPMENT_GOAL': {
      if (action.plan.groupCount < 1 || action.plan.eligibleCount < 5) return state
      const publishedAt = `2026-08-20 14:${String(30 + state.schoolTeacherDevelopmentGoals.length).padStart(2, '0')}`
      const goal: SchoolTeacherDevelopmentGoal = {
        ...action.plan,
        requiredModules: [...action.plan.requiredModules],
        status: 'published',
        publishedAt,
      }
      const appliesToActiveTeacher = goal.scopeId === 'school' || goal.scopeId === ACTIVE_GROWTH_ORGANIZATION_ID
      return {
        ...state,
        schoolTeacherDevelopmentGoals: [
          goal,
          ...state.schoolTeacherDevelopmentGoals.filter((item) => !(item.scopeId === goal.scopeId && item.id === goal.id)),
        ],
        growthCycle: appliesToActiveTeacher && !state.growthCycle.planConfirmed
          ? { ...state.growthCycle, targetLevel: goal.targetLevel }
          : state.growthCycle,
      }
    }
    case 'RESET':
      return cloneInitialState()
    default:
      return state
  }
}

export const demoReducer = reducer

const DemoStateContext = createContext<{ state: DemoState; dispatch: Dispatch<DemoAction> } | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, cloneInitialState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>
}

export function useDemoState() {
  const context = useContext(DemoStateContext)
  if (!context) throw new Error('useDemoState must be used inside DemoProvider')
  return context
}
