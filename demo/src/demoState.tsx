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
  TeacherGrowthEvidence,
  ResearchAgentDraft,
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
  | { type: 'COMPLETE_TEACHER_ASSESSMENT' }
  | { type: 'SET_TEACHER_PLAN_WEEKLY_HOURS'; value: number }
  | { type: 'MOVE_TEACHER_PLAN_MODULE'; id: string; direction: -1 | 1 }
  | { type: 'TOGGLE_TEACHER_PLAN_MODULE'; id: string }
  | { type: 'ACCEPT_TEACHER_PLAN' }
  | { type: 'UPDATE_TEACHER_RESOURCE_PROGRESS'; id: string; progress: number }
  | { type: 'TOGGLE_TEACHER_RESOURCE_FAVORITE'; id: string }
  | { type: 'SAVE_TEACHER_RESOURCE_NOTE'; id: string; note: string }
  | { type: 'TOGGLE_CUSTOM_PATH_RESOURCE'; id: string }
  | { type: 'MOVE_CUSTOM_PATH_RESOURCE'; id: string; direction: -1 | 1 }
  | { type: 'SAVE_CUSTOM_PATH' }
  | { type: 'ADD_TEACHER_PRACTICE_RECORD'; toolId: string; toolName: string; task: string }
  | { type: 'COMPLETE_TEACHER_RETEST' }
  | { type: 'UPDATE_RESEARCH_AGENT'; patch: Partial<ResearchAgentDraft> }
  | { type: 'TEST_RESEARCH_AGENT' }
  | { type: 'SAVE_RESEARCH_AGENT' }
  | { type: 'LINK_RESEARCH_AGENT_OUTPUT' }
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

function withGrowthEvidence(
  state: DemoState,
  evidence: TeacherGrowthEvidence,
): DemoState {
  return {
    ...state,
    teacherGrowth: {
      ...state.teacherGrowth,
      evidenceLedger: [
        evidence,
        ...state.teacherGrowth.evidenceLedger.filter(
          (item) => item.id !== evidence.id,
        ),
      ],
    },
  }
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
  const completed = progress.filter((item) => item.status === 'completed').length
  const ratio = completed / trainingTasks.length
  const teacherReport: TeacherAbilityReport = {
    level: ratio >= .9 ? 'L3 AI创新者' : ratio >= .45 ? 'L2 AI实践者' : 'L1 AI入门者',
    completed,
    total: trainingTasks.length,
    dimensions: initialTeacherReport.dimensions.map((item, index) => ({ ...item, value: Math.min(96, item.value + completed * (index < 3 ? 6 : 5)) })),
    nextTask: trainingTasks.find((task) => progress.find((item) => item.taskId === task.id)?.status === 'available')?.title ?? '完成综合创新项目',
  }
  return { ...state, taskProgress: progress, teacherReport }
}

function withSyncedGrowthReport(state: DemoState): DemoState {
  const assessment = state.teacherGrowth.assessment
  if (assessment.status !== 'completed') return state
  const completedResources = state.teacherGrowth.resources.filter((resource) => resource.completed).length
  const practiceCount = state.teacherGrowth.practiceRecords.length
  const uplift = Math.min(18, completedResources * 2 + practiceCount * 3 + (assessment.stage === 'final' ? 8 : 0))
  const dimensions = assessment.dimensions.map((dimension, index) => ({
    label: dimension.label,
    value: Math.min(96, dimension.score + uplift + (practiceCount && (index === 1 || index === 2) ? 2 : 0)),
  }))
  const average = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.value, 0) / dimensions.length)
  const level: TeacherAbilityReport['level'] = average >= 85 ? 'L4 AI引领者' : average >= 72 ? 'L3 AI创新者' : average >= 55 ? 'L2 AI实践者' : 'L1 AI入门者'
  const nextResource = state.teacherGrowth.resources.find((resource) => !resource.completed)
  return {
    ...state,
    teacherReport: {
      level,
      completed: completedResources + practiceCount,
      total: state.teacherGrowth.resources.length + Math.max(2, practiceCount),
      dimensions,
      nextTask: nextResource?.title ?? '参加结业复测并沉淀科研智能体成果',
    },
  }
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
      if (!state.acceptedPlan) return state
      const acceptedPlan = { ...state.acceptedPlan, status: 'published' as const }
      const nextState = {
        ...state,
        acceptedPlan,
        generatedPlan: acceptedPlan,
        courseResources: state.courseResources.map((resource) => resource.origin === 'ai-generated' && resource.lessonId === acceptedPlan.standardLessonId ? { ...resource, status: 'published' as const } : resource),
        questionBank: state.questionBank.map((question) => question.id.startsWith('adapt-q-') ? { ...question, enabled: true } : question),
      }
      return withGrowthEvidence(nextState, {
        id: `growth-evidence-plan-${acceptedPlan.standardLessonId}`,
        teacherId: 'teacher-li',
        source: '智能备课与教学实施',
        task: `采纳并发布${acceptedPlan.title}`,
        course: state.standardCourse.title,
        artifactVersion: acceptedPlan.version,
        dimensions: ['教学融合', '提示词与多模态'],
        reviewStatus: '已确认',
        anonymous: true,
        abilityImpact: '教学融合 +4',
        completedAt: '刚刚',
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
      return withGrowthEvidence(
        withCompletedTask({ ...state, gradedAssignments: action.value }, 'assignment-grade'),
        {
          id: 'growth-evidence-grading-latest',
          teacherId: 'teacher-li',
          source: 'AI批改和人工复核',
          task: '复核 AI 作品评分与异常结果',
          course: state.standardCourse.title,
          artifactVersion: '评分复核 v2',
          dimensions: ['教学融合'],
          reviewStatus: '已确认',
          anonymous: true,
          abilityImpact: '教学融合 +2',
          completedAt: '刚刚',
        },
      )
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
      return withGrowthEvidence({
        ...state,
        interventionPlans: state.interventionPlans.map((item) => item.id === plan.id ? published : item),
        interventionAssignments: [...state.interventionAssignments.filter((item) => item.planId !== plan.id), ...assignments],
        studentLearningTasks: [...state.studentLearningTasks.filter((item) => item.planId !== plan.id), ...tasks],
      }, {
        id: `growth-evidence-intervention-${action.id}`,
        teacherId: 'teacher-li',
        source: '分层干预',
        task: `发布${plan.title}`,
        course: state.standardCourse.title,
        artifactVersion: plan.version,
        dimensions: ['教学融合'],
        reviewStatus: '已确认',
        anonymous: true,
        abilityImpact: '教学融合 +3',
        completedAt: '刚刚',
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
      return {
        ...state,
        learningSnapshots,
        studentLearningTasks: state.studentLearningTasks.map((item) => item.id === action.id ? { ...item, status: 'completed' as const } : item),
        interventionAssignments: state.interventionAssignments.map((item) => item.planId === task.planId && item.studentId === task.studentId ? { ...item, status: 'completed' as const } : item),
        learningDiagnosis: null,
      }
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
      const next = {
        ...state,
        teacherGrowth: {
          ...state.teacherGrowth,
          assessment: structuredClone(completedTeacherAssessment),
          trainingPlan: createTeacherTrainingPlan(),
        },
      }
      return withSyncedGrowthReport(next)
    }
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
      return { ...state, teacherGrowth: { ...state.teacherGrowth, trainingPlan: { ...plan, status: 'accepted', updatedAt: '刚刚 · 计划已确认' } } }
    }
    case 'UPDATE_TEACHER_RESOURCE_PROGRESS': {
      const progress = Math.max(0, Math.min(100, action.progress))
      const resources = state.teacherGrowth.resources.map((resource) => resource.id === action.id ? { ...resource, progress, completed: progress === 100 } : resource)
      const completedIds = new Set(resources.filter((resource) => resource.completed).map((resource) => resource.id))
      const trainingPlan = state.teacherGrowth.trainingPlan ? {
        ...state.teacherGrowth.trainingPlan,
        modules: state.teacherGrowth.trainingPlan.modules.map((module) => {
          const completedCount = module.resourceIds.filter((id) => completedIds.has(id)).length
          return { ...module, status: completedCount === module.resourceIds.length ? 'completed' as const : completedCount > 0 ? 'in-progress' as const : module.status }
        }),
        updatedAt: '刚刚 · 学习进度已回流',
      } : null
      return withSyncedGrowthReport({ ...state, teacherGrowth: { ...state.teacherGrowth, resources, trainingPlan } })
    }
    case 'TOGGLE_TEACHER_RESOURCE_FAVORITE':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, resources: state.teacherGrowth.resources.map((resource) => resource.id === action.id ? { ...resource, favorite: !resource.favorite } : resource) } }
    case 'SAVE_TEACHER_RESOURCE_NOTE':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, resources: state.teacherGrowth.resources.map((resource) => resource.id === action.id ? { ...resource, note: action.note } : resource) } }
    case 'TOGGLE_CUSTOM_PATH_RESOURCE': {
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
    case 'SAVE_CUSTOM_PATH':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, customPath: { ...state.teacherGrowth.customPath, saved: true, updatedAt: '刚刚 · 已保存' } } }
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
        completedAt: '刚刚',
      }
      return withGrowthEvidence(
        withSyncedGrowthReport({ ...state, teacherGrowth: { ...state.teacherGrowth, practiceRecords: [record, ...state.teacherGrowth.practiceRecords] } }),
        {
          id: `growth-evidence-${record.id}`,
          teacherId: 'teacher-li',
          source: '自由实训',
          task: action.task,
          course: '教师个人实训',
          artifactVersion: record.artifact,
          dimensions: ['提示词与多模态', '知识库与智能体'],
          reviewStatus: '已确认',
          anonymous: false,
          abilityImpact: '相关能力 +3',
          completedAt: '刚刚',
        },
      )
    }
    case 'COMPLETE_TEACHER_RETEST': {
      if (state.teacherGrowth.assessment.status !== 'completed') return state
      const assessment = {
        ...state.teacherGrowth.assessment,
        stage: 'final' as const,
        score: Math.min(92, state.teacherGrowth.assessment.score + 14),
        completedAt: '刚刚 · 结业复测',
      }
      return withGrowthEvidence(
        withSyncedGrowthReport({ ...state, teacherGrowth: { ...state.teacherGrowth, assessment } }),
        {
          id: 'growth-evidence-final-retest',
          teacherId: 'teacher-li',
          source: '结业复测',
          task: '完成教师 AI 能力结业复测',
          course: '教师个人成长',
          artifactVersion: '复测报告 v1',
          dimensions: ['AI 基础认知', '提示词与多模态', '知识库与智能体', '教学融合', '研究创新'],
          reviewStatus: '已确认',
          anonymous: false,
          abilityImpact: '综合能力 +14',
          completedAt: '刚刚',
        },
      )
    }
    case 'UPDATE_RESEARCH_AGENT':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...state.teacherGrowth.researchAgent, ...action.patch, status: 'draft' } } }
    case 'TEST_RESEARCH_AGENT':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...state.teacherGrowth.researchAgent, status: 'tested', testResult: '已基于 2 份匿名资料生成研究备忘录；5 条观点均附来源，等待教师人工确认。' } } }
    case 'SAVE_RESEARCH_AGENT':
      return { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...state.teacherGrowth.researchAgent, status: 'saved', version: state.teacherGrowth.researchAgent.version + 1 } } }
    case 'LINK_RESEARCH_AGENT_OUTPUT':
      return withGrowthEvidence(
        { ...state, teacherGrowth: { ...state.teacherGrowth, researchAgent: { ...state.teacherGrowth.researchAgent, linkedOutput: '阶段成果：课堂互动证据分析备忘录 v1.0' } } },
        {
          id: `growth-evidence-research-${state.teacherGrowth.researchAgent.version}`,
          teacherId: 'teacher-li',
          source: 'AI研究和科研智能体',
          task: '关联课堂互动证据分析成果',
          course: '匿名课堂行动研究',
          artifactVersion: `研究备忘录 v${state.teacherGrowth.researchAgent.version}.0`,
          dimensions: ['研究创新', '知识库与智能体'],
          reviewStatus: '已确认',
          anonymous: true,
          abilityImpact: '研究创新 +4',
          completedAt: '刚刚',
        },
      )
    case 'RESET':
      return cloneInitialState()
    default:
      return state
  }
}

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
