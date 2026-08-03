import { lazy, Suspense, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Database,
  FlaskConical,
  Image as ImageIcon,
  Layers3,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Mic2,
  MoreHorizontal,
  Play,
  RefreshCw,
  Rocket,
  ScanSearch,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  UsersRound,
  Video,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import { aiToolCategories, aiTools, type AiToolCategory } from "./aiTools";
import {
  classStudents,
  initialPracticeSet,
  initialSubmission,
  knowledgePoints,
  learningRecords,
  lessonPlan,
  report,
  scoreDistribution,
} from "./data";
import { aiDemoService } from "./services/aiDemoService";
import { useDemoState } from "./demoState";
import {
  AssessmentStudio,
  KnowledgeGraphView,
  StudentProfileView,
  StudentTutorView,
  TeacherAbilityView,
  TrainingTaskMap,
  TutorBuilderView,
  TutorInsightsView,
  type AssessmentStudioTab,
} from "./capabilities";
import {
  CourseResourceCenter,
  SmartPrepareView,
  TeachingDeliveryView,
} from "./teachingWorkspace";
import {
  StudentAssignedTasks,
  TeacherLearningPromotion,
  type TeacherLearnTab,
} from "./learningWorkspace";
import { EmptyState, WorkspaceHeader } from "./ui";
import { RoleSwitcher, WorkspaceLoading } from "./appShell";
import {
  createInitialCourseRuntimes,
  getCourseRuntimeDefinition,
} from "./courseRuntimeData";
import { useEvidenceCenter } from "./evidenceCenter";
import { useTeachingOperations } from "./teachingOperations";
import { canNavigateStage } from "./permissionPolicy";
import { LearnerWorkspaceHeader } from "./learnerWorkspace";
import {
  ActiveContextBar,
  AssessmentProgressWorkspace,
  GlobalContextSwitcher,
  StudentAssessmentSelector,
  StudentCourseSelector,
  StudentReportSelector,
  StudentRoleHome,
  TeacherAssessmentSelector,
  TeacherClassSelector,
  TeacherReportLanding,
  TeacherRoleHome,
  UpcomingCourseWorkspace,
} from "./workspaceEntry";
import {
  emptyWorkspaceSelection,
  getStudentAssessment,
  getStudentCourse,
  getStudentGrowthReport,
  getStudentLearningTask,
  getTeacherAssessment,
  getTeacherClass,
  getTeacherReport,
  studentLearningTasks,
  studentCourses,
  teacherClasses,
  type StudentGrowthReportSummary,
  type StudentCourseSummary,
  type StudentLearningTaskSummary,
  type AssessmentWorkspaceSummary,
  type WorkspaceReportData,
  type WorkspaceSelection,
} from "./workspaceData";
import type {
  DifficultyLabel,
  LearningStage,
  LessonStep,
  PracticeSet,
  TeacherWorkspaceMode,
  UserRole,
} from "./types";
import futureLibrary from "./assets/future-library.png";
import paperCityTram from "./assets/paper-city-tram.png";

const TeacherResearchWorkspace = lazy(() =>
  import("./researchWorkspace").then((module) => ({
    default: module.TeacherResearchWorkspace,
  })),
);

const TeacherGrowthWorkspace = lazy(() =>
  import("./teacherGrowthWorkspace").then((module) => ({
    default: module.TeacherGrowthWorkspace,
  })),
);

const ManagerWorkspace = lazy(() =>
  import("./managerWorkspace").then((module) => ({
    default: module.ManagerWorkspace,
  })),
);

const EthicsTeacherWorkspace = lazy(() =>
  import("./courseRuntimeWorkspace").then((module) => ({
    default: module.EthicsTeacherWorkspace,
  })),
);

const EthicsStudentLearning = lazy(() =>
  import("./courseRuntimeWorkspace").then((module) => ({
    default: module.EthicsStudentLearning,
  })),
);

const EthicsAssessmentWorkspace = lazy(() =>
  import("./courseRuntimeWorkspace").then((module) => ({
    default: module.EthicsAssessmentWorkspace,
  })),
);

const stageDefinitions: Array<{
  id: LearningStage;
  short: string;
  teacherTitle: string;
  teacherSubtitle: string;
  studentTitle: string;
  studentSubtitle: string;
  icon: typeof BookOpen;
}> = [
  {
    id: "teach",
    short: "教",
    teacherTitle: "智能教学",
    teacherSubtitle: "设计与组织课堂",
    studentTitle: "课程导学",
    studentSubtitle: "理解目标与课堂",
    icon: BookOpen,
  },
  {
    id: "learn",
    short: "学",
    teacherTitle: "学习促进",
    teacherSubtitle: "过程洞察与分层支持",
    studentTitle: "个性化学习",
    studentSubtitle: "伴学与分层练习",
    icon: BrainCircuit,
  },
  {
    id: "assess",
    short: "测",
    teacherTitle: "测评管理",
    teacherSubtitle: "命题、评分与复核",
    studentTitle: "我的测评",
    studentSubtitle: "随堂测与考试",
    icon: ListChecks,
  },
  {
    id: "report",
    short: "评",
    teacherTitle: "教学诊断",
    teacherSubtitle: "班级与个人报告",
    studentTitle: "成长报告",
    studentSubtitle: "反馈与下一步",
    icon: BarChart3,
  },
  {
    id: "research",
    short: "研",
    teacherTitle: "AI 研究",
    teacherSubtitle: "课题、证据与成果",
    studentTitle: "",
    studentSubtitle: "",
    icon: Search,
  },
];

const difficultyClass: Record<DifficultyLabel["label"], string> = {
  基础: "level-basic",
  入门: "level-entry",
  进阶: "level-advanced",
  挑战: "level-challenge",
  拓展: "level-expand",
};

const stepIcons = {
  warmup: Sparkles,
  concept: BookOpen,
  compare: Layers3,
  practice: ImageIcon,
  quiz: ListChecks,
};

const trainingTools = aiTools;

const createInitialStudentPracticeState = (): Record<string, PracticeSet> => ({
  "task-visual-revision": structuredClone(initialPracticeSet),
  "task-negative-practice": {
    ...structuredClone(initialPracticeSet),
    title: "负向提示词补强练习",
    reason: "根据课堂诊断生成，只记录到当前补强任务。",
    questions: initialPracticeSet.questions.map((question) => ({
      ...question,
      completed: false,
    })),
  },
});

function DifficultyBadge({ difficulty }: { difficulty: DifficultyLabel }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="difficulty-wrap">
      <button
        className={`difficulty ${difficultyClass[difficulty.label]}`}
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        L{difficulty.level} · {difficulty.label}
      </button>
      {open && (
        <span className="difficulty-popover" role="tooltip">
          <strong>难度依据</strong>
          {difficulty.reason}
        </span>
      )}
    </span>
  );
}

function ContextTabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Array<{ id: T; label: string; note?: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="context-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={value === item.id ? "active" : ""}
          key={item.id}
          onClick={() => onChange(item.id)}
        >
          <strong>{item.label}</strong>
          {item.note && <small>{item.note}</small>}
        </button>
      ))}
    </div>
  );
}

function App() {
  const { dispatch: demoDispatch } = useDemoState();
  const { openEvidence } = useEvidenceCenter();
  const {
    alerts: operationAlerts,
    interventionPublished,
    publishManagementIntervention,
    completeManagementRemediation,
    resetOperations,
  } = useTeachingOperations();
  const [role, setRole] = useState<UserRole>("teacher");
  const [teacherWorkspaceMode, setTeacherWorkspaceMode] =
    useState<TeacherWorkspaceMode>("teaching");
  const [stage, setStage] = useState<LearningStage>("home");
  const [selection, setSelection] = useState<WorkspaceSelection>(
    emptyWorkspaceSelection,
  );
  const [contextOpen, setContextOpen] = useState(false);
  const [lessonSteps, setLessonSteps] = useState<LessonStep[]>(
    lessonPlan.steps,
  );
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [studentPracticeByTaskId, setStudentPracticeByTaskId] = useState<
    Record<string, PracticeSet>
  >(createInitialStudentPracticeState);
  const [practiceMode, setPracticeMode] = useState<"class" | "after">("class");
  const [manualScore, setManualScore] = useState(
    initialSubmission.manual.value,
  );
  const [aiScore, setAiScore] = useState(initialSubmission.ai.value);
  const [reviewNote, setReviewNote] = useState(initialSubmission.manual.note);
  const [assessmentScene, setAssessmentScene] = useState<
    "随堂测" | "单元测" | "正式考试"
  >("随堂测");
  const [assessmentFilter, setAssessmentFilter] = useState<
    "全部" | "待复核" | "已完成" | "异常"
  >("全部");
  const [studentAssessmentAnswers, setStudentAssessmentAnswers] = useState<
    Record<string, string | null>
  >({});
  const [studentAssessmentSubmitted, setStudentAssessmentSubmitted] = useState<
    Record<string, boolean>
  >({});
  const [reportView, setReportView] = useState<"class" | "student">("class");
  const [remediation, setRemediation] = useState(false);
  const [teacherTeachTab, setTeacherTeachTab] = useState<
    "prepare" | "delivery" | "resources" | "tutor"
  >("prepare");
  const [studentTeachTab, setStudentTeachTab] = useState<
    "guide" | "graph" | "tutor"
  >("guide");
  const [teacherLearnTab, setTeacherLearnTab] =
    useState<TeacherLearnTab>("overview");
  const [studentLearnTab, setStudentLearnTab] = useState<"learning" | "tutor">(
    "learning",
  );
  const [assessmentToolMode, setAssessmentToolMode] =
    useState<AssessmentStudioTab | null>(null);
  const [reportTab, setReportTab] = useState<
    "report" | "operations" | "profile" | "ability"
  >("report");
  const [courseRuntimes, setCourseRuntimes] = useState(
    createInitialCourseRuntimes,
  );

  const stages = useMemo(
    () =>
      role === "manager"
        ? []
        : stageDefinitions
        .filter((item) => item.id !== "research" || role === "teacher")
        .map((item) => ({
          id: item.id,
          short: item.short,
          title: role === "teacher" ? item.teacherTitle : item.studentTitle,
          subtitle:
            role === "teacher" ? item.teacherSubtitle : item.studentSubtitle,
          icon: item.icon,
        })),
    [role],
  );

  const selectedTeacherClass = getTeacherClass(selection.selectedClassId);
  const selectedStudentCourse = getStudentCourse(selection.selectedCourseId);
  const selectedTeacherAssessment = getTeacherAssessment(
    selection.selectedAssessmentId,
  );
  const selectedStudentAssessment = getStudentAssessment(
    selection.selectedAssessmentId,
  );
  const selectedLearningTask = getStudentLearningTask(
    selection.selectedLearningTaskId,
  );
  const activePracticeSet =
    studentPracticeByTaskId[
      selectedLearningTask?.id ?? "task-visual-revision"
    ] ?? initialPracticeSet;
  const selectedTeacherReport = getTeacherReport(selection.selectedReportId);
  const selectedStudentReport = getStudentGrowthReport(
    selection.selectedReportId,
  );
  const managementAlert = operationAlerts.find(
    (item) => item.id === "alert-negative-mastery",
  );
  const totalScore = initialSubmission.machine.value + aiScore + manualScore;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const switchRole = (nextRole: UserRole) => {
    setRole(nextRole);
    setTeacherWorkspaceMode("teaching");
    setStage("home");
    setSelection(emptyWorkspaceSelection);
    setContextOpen(false);
    setTeacherLearnTab("overview");
    setStudentLearnTab("learning");
    setStudentTeachTab("guide");
    setTeacherTeachTab("prepare");
    showToast(
      nextRole === "teacher"
        ? "已进入教师工作台"
        : nextRole === "student"
          ? "已进入林一诺的学习台"
          : "已进入王主任的教学运行管理台",
    );
  };

  const navigateStage = (nextStage: LearningStage) => {
    if (!canNavigateStage(role, nextStage)) {
      setStage("home");
      showToast("当前角色无权进入该工作区");
      return;
    }
    if (role === "teacher") setTeacherWorkspaceMode("teaching");
    setContextOpen(false);
    if (nextStage === "report" && role === "teacher") {
      const classroom = getTeacherClass(selection.selectedClassId);
      if (classroom) {
        setSelection((current) => ({
          ...current,
          selectedReportId: classroom.reportId,
        }));
      }
    }
    setStage(nextStage);
  };

  const selectTeacherContext = (classId: string) => {
    const classroom = getTeacherClass(classId);
    if (!classroom) return;
    setSelection({
      selectedCourseId: classroom.courseId,
      selectedClassId: classroom.id,
      selectedLearningTaskId: null,
      selectedAssessmentId: null,
      selectedReportId: null,
    });
    demoDispatch({
      type: "SET_ACTIVE_CLASS",
      classId: classroom.id,
      lessonId: classroom.lessonId,
      className: classroom.name,
      learnerCount: classroom.students,
    });
    setContextOpen(false);
    showToast(`已切换至${classroom.name}`);
  };

  const selectStudentContext = (courseId: string) => {
    const course = getStudentCourse(courseId);
    if (!course) return;
    setSelection({
      selectedCourseId: course.id,
      selectedClassId: course.classId,
      selectedLearningTaskId:
        studentLearningTasks.find(
          (item) => item.courseId === course.id && item.status !== "completed",
        )?.id ?? null,
      selectedAssessmentId: null,
      selectedReportId: null,
    });
    setContextOpen(false);
    showToast(`已切换至《${course.name}》`);
  };

  const openTeacherClass = (
    classId: string,
    intent: "teach" | "prepare" | "learn" | "report",
  ) => {
    const classroom = getTeacherClass(classId);
    if (!classroom) return;
    setSelection({
      selectedCourseId: classroom.courseId,
      selectedClassId: classroom.id,
      selectedLearningTaskId: null,
      selectedAssessmentId: null,
      selectedReportId: intent === "report" ? classroom.reportId : null,
    });
    demoDispatch({
      type: "SET_ACTIVE_CLASS",
      classId: classroom.id,
      lessonId: classroom.lessonId,
      className: classroom.name,
      learnerCount: classroom.students,
    });
    setContextOpen(false);
    if (intent === "teach" || intent === "prepare") {
      setTeacherTeachTab(intent === "prepare" ? "prepare" : "delivery");
      setStage("teach");
    } else if (intent === "learn") {
      setTeacherLearnTab("overview");
      setStage("learn");
    } else {
      setReportTab("report");
      setReportView("class");
      setStage("report");
    }
  };

  const openTeacherAssessment = (assessmentId: string) => {
    const assessment = getTeacherAssessment(assessmentId);
    const classroom = assessment ? getTeacherClass(assessment.classId) : null;
    if (!assessment || !classroom) return;
    setAssessmentToolMode(null);
    setSelection({
      selectedCourseId: classroom.courseId,
      selectedClassId: classroom.id,
      selectedLearningTaskId: null,
      selectedAssessmentId: assessment.id,
      selectedReportId: assessment.reportId ?? null,
    });
    demoDispatch({
      type: "SET_ACTIVE_CLASS",
      classId: classroom.id,
      lessonId: classroom.lessonId,
      className: classroom.name,
      learnerCount: classroom.students,
    });
    setAssessmentScene(assessment.scene);
    setStage("assess");
  };

  const openStudentCourse = (courseId: string, intent: "teach" | "learn") => {
    const course = getStudentCourse(courseId);
    if (!course) return;
    setSelection({
      selectedCourseId: course.id,
      selectedClassId: course.classId,
      selectedLearningTaskId:
        studentLearningTasks.find(
          (item) => item.courseId === course.id && item.status !== "completed",
        )?.id ?? null,
      selectedAssessmentId: null,
      selectedReportId: null,
    });
    setStudentTeachTab("guide");
    setStudentLearnTab("learning");
    setStage(intent);
  };

  const openStudentAssessment = (assessmentId: string) => {
    const assessment = getStudentAssessment(assessmentId);
    if (!assessment) return;
    const course = studentCourses.find(
      (item) => item.classId === assessment.classId,
    );
    setSelection({
      selectedCourseId: course?.id ?? null,
      selectedClassId: assessment.classId,
      selectedLearningTaskId: null,
      selectedAssessmentId: assessment.id,
      selectedReportId: assessment.reportId ?? null,
    });
    if (assessment.status === "completed") {
      setReportView("student");
      setStage("report");
    } else {
      setStage("assess");
    }
  };

  const openStudentReport = (courseId: string, reportId?: string) => {
    const course = getStudentCourse(courseId);
    if (!course) return;
    setSelection({
      selectedCourseId: course.id,
      selectedClassId: course.classId,
      selectedLearningTaskId: null,
      selectedAssessmentId: null,
      selectedReportId: reportId ?? "report-student-visual",
    });
    setReportView("student");
    setStage("report");
  };

  const resetDemo = () => {
    setRole("teacher");
    setTeacherWorkspaceMode("teaching");
    setStage("home");
    setSelection(emptyWorkspaceSelection);
    setContextOpen(false);
    setLessonSteps(lessonPlan.steps);
    setPublished(false);
    setStudentPracticeByTaskId(createInitialStudentPracticeState());
    setPracticeMode("class");
    setManualScore(initialSubmission.manual.value);
    setAiScore(initialSubmission.ai.value);
    setReviewNote(initialSubmission.manual.note);
    setAssessmentScene("随堂测");
    setAssessmentFilter("全部");
    setStudentAssessmentAnswers({});
    setStudentAssessmentSubmitted({});
    setReportView("class");
    setRemediation(false);
    setTeacherTeachTab("prepare");
    setStudentTeachTab("guide");
    setTeacherLearnTab("overview");
    setStudentLearnTab("learning");
    setAssessmentToolMode(null);
    setReportTab("report");
    setCourseRuntimes(createInitialCourseRuntimes());
    demoDispatch({ type: "RESET" });
    resetOperations();
    showToast("演示已重置，可以重新体验完整教学闭环");
  };

  const publishLesson = async () => {
    setBusy("publish");
    const result = await aiDemoService.publishLesson();
    setPublished(true);
    setBusy(null);
    showToast(
      `随堂任务已发布给 ${result.students} 名学生，预计 ${result.estimatedMinutes} 分钟完成`,
    );
  };

  const generatePractice = async () => {
    setBusy("practice");
    const generated = await aiDemoService.generatePractice("负向提示词");
    const taskId = selectedLearningTask?.id ?? "task-visual-revision";
    setStudentPracticeByTaskId((current) => ({
      ...current,
      [taskId]: generated,
    }));
    setPracticeMode("after");
    setBusy(null);
    showToast("已生成 3 道分层练习，并写入学习记录");
  };

  const generateRemediation = async () => {
    setBusy("remediation");
    await aiDemoService.generateRemediation();
    demoDispatch({ type: "ADD_REPORT_REMEDIATION" });
    const courseId =
      selection.selectedCourseId ??
      selectedTeacherClass?.courseId ??
      "course-visual-design";
    const isEthics = courseId === "course-ai-ethics";
    setCourseRuntimes((current) => ({
      ...current,
      [courseId]: {
        ...current[courseId],
        remediation: {
          ...current[courseId].remediation,
          status: "assigned",
          completionRate: 0,
        },
        revision: current[courseId].revision + 1,
      },
    }));
    if (!isEthics) setRemediation(true);
    setPracticeMode("after");
    setRole("student");
    setSelection({
      selectedCourseId: courseId,
      selectedClassId: isEthics ? "class-ai-ethics-2401" : "class-ai-2401",
      selectedLearningTaskId: isEthics
        ? "task-ethics-remediation"
        : "task-negative-practice",
      selectedAssessmentId: null,
      selectedReportId: null,
    });
    setStage("learn");
    setBusy(null);
    showToast(
      `${courseRuntimes[courseId].remediation.title}已生成，已进入学生课后学习路径`,
    );
  };

  const changeDuration = (id: string, delta: number) => {
    setLessonSteps((current) =>
      current.map((step) =>
        step.id === id
          ? { ...step, duration: Math.max(3, step.duration + delta) }
          : step,
      ),
    );
  };

  const toggleQuestion = (id: string) => {
    const taskId = selectedLearningTask?.id ?? "task-visual-revision";
    setStudentPracticeByTaskId((current) => {
      const practice = current[taskId] ?? initialPracticeSet;
      return {
        ...current,
        [taskId]: {
          ...practice,
          questions: practice.questions.map((question) =>
            question.id === id
              ? { ...question, completed: !question.completed }
              : question,
          ),
        },
      };
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => navigateStage("home")}
          aria-label="返回角色任务首页"
        >
          <span className="brand-mark">
            <span>Q</span>
          </span>
          <span className="brand-copy">
            <strong>启境</strong>
            <small>AI LEARNING OS</small>
          </span>
        </button>

        <div className="context-selectors">
          {role !== "manager" &&
            !(role === "teacher" && teacherWorkspaceMode === "growth") && (
            <GlobalContextSwitcher
              role={role}
              selection={selection}
              open={contextOpen}
              onToggle={() => setContextOpen((current) => !current)}
              onClose={() => setContextOpen(false)}
              onSelectClass={selectTeacherContext}
              onSelectCourse={selectStudentContext}
            />
          )}
        </div>

        <div className="topbar-actions">
          <RoleSwitcher role={role} onSwitch={switchRole} />
          <button
            className="icon-button reset-label"
            type="button"
            onClick={resetDemo}
            title="重置演示"
          >
            <RefreshCw size={17} /> <span>重置演示</span>
          </button>
          <button
            className="avatar"
            type="button"
            onClick={() =>
              showToast(
                role === "teacher"
                  ? "你好，周老师"
                  : role === "student"
                    ? "你好，林一诺"
                    : "你好，王主任",
              )
            }
            aria-label="用户信息"
          >
            {role === "teacher" ? "周" : role === "student" ? "林" : "王"}
          </button>
        </div>
      </header>

      {role === "teacher" && (
        <div className="teacher-mode-bar">
          <div className="teacher-mode-switch" role="group" aria-label="教师工作模式">
            <button
              className={teacherWorkspaceMode === "teaching" ? "is-active" : ""}
              type="button"
              aria-pressed={teacherWorkspaceMode === "teaching"}
              onClick={() => {
                setTeacherWorkspaceMode("teaching");
                setStage("home");
                setContextOpen(false);
              }}
            >
              <BookOpen size={16} /> 教学工作
            </button>
            <button
              className={teacherWorkspaceMode === "growth" ? "is-active" : ""}
              type="button"
              aria-pressed={teacherWorkspaceMode === "growth"}
              onClick={() => {
                setTeacherWorkspaceMode("growth");
                setContextOpen(false);
              }}
            >
              <Sparkles size={16} /> 我的成长
            </button>
          </div>
          <span>{teacherWorkspaceMode === "growth" ? "个人课程与能力数据" : "班级与课程教学数据"}</span>
        </div>
      )}

      {role !== "manager" &&
        !(role === "teacher" && teacherWorkspaceMode === "growth") && <div className="journey-nav-wrap">
        <nav
          className={`stage-nav ${role === "teacher" ? "teacher-stage-nav" : "student-stage-nav"}`}
          aria-label={`${role === "teacher" ? "教师教、学、测、评、研功能" : "学生教、学、测、评功能"}`}
        >
          <div className="stage-line" />
          {stages.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`stage-item ${stage === item.id ? "active" : ""}`}
                onClick={() => navigateStage(item.id)}
              >
                <span className="stage-number">{item.short}</span>
                <span className="stage-icon">
                  <Icon size={17} />
                </span>
                <span className="stage-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
              </button>
            );
          })}
        </nav>
        <button
          className={`training-entry ${stage === "training" ? "active" : ""}`}
          type="button"
          onClick={() => navigateStage("training")}
        >
          <span>
            <FlaskConical size={18} />
          </span>
          <span>
            <strong>自由实训</strong>
            <small>脱离课程，随时练习</small>
          </span>
          <ChevronRight size={16} />
        </button>
      </div>}

      <main className="main-content">
        {role === "manager" ? (
          <Suspense fallback={<WorkspaceLoading />}>
            <ManagerWorkspace onToast={showToast} />
          </Suspense>
        ) : role === "teacher" && teacherWorkspaceMode === "growth" ? (
          <Suspense fallback={<WorkspaceLoading />}>
            <TeacherGrowthWorkspace
              onTraining={() => {
                setTeacherWorkspaceMode("teaching");
                setStage("training");
              }}
              onResearch={() => {
                setTeacherWorkspaceMode("teaching");
                setStage("research");
              }}
            />
          </Suspense>
        ) : <>
        {stage === "home" && role === "teacher" && (
          <>
            {managementAlert?.status === "已交办" && (
              <section className="management-attention-banner">
                <span><CircleAlert size={19} /></span>
                <div>
                  <small>教学管理关注 · 王主任已交办</small>
                  <strong>{managementAlert.title}</strong>
                  <p>{interventionPublished ? "补学干预已发布，等待学生完成并回流。" : "请查看匿名证据并发布负向提示词补学干预。"}</p>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    openTeacherClass("class-ai-2401", "learn");
                    setTeacherLearnTab("intervention");
                  }}
                >
                  处理管理关注 <ArrowRight size={15} />
                </button>
              </section>
            )}
            <TeacherRoleHome
              onClassAction={openTeacherClass}
              onAssessmentAction={openTeacherAssessment}
              onResearch={() => navigateStage("research")}
              onTraining={() => navigateStage("training")}
              onGrowth={() => setTeacherWorkspaceMode("growth")}
            />
          </>
        )}
        {stage === "home" && role === "student" && (
          <>
            {interventionPublished && managementAlert?.status === "已交办" && (
              <section className="management-attention-banner student-management-task">
                <span><Sparkles size={19} /></span>
                <div>
                  <small>教师发布的新补学任务</small>
                  <strong>负向提示词补强任务</strong>
                  <p>完成后将同步更新个人学习记录、教师班级态势和匿名管理预警。</p>
                </div>
                <button className="primary-button" type="button" onClick={() => {
                  setSelection({
                    selectedCourseId: "course-visual-design",
                    selectedClassId: "class-ai-2401",
                    selectedLearningTaskId: "task-negative-practice",
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  });
                  setPracticeMode("after");
                  setStage("learn");
                }}>进入补学 <ArrowRight size={15} /></button>
              </section>
            )}
            <StudentRoleHome
              activeCourseId={selection.selectedCourseId}
              onCourseAction={openStudentCourse}
              onAssessmentAction={openStudentAssessment}
              onReport={(courseId) => openStudentReport(courseId)}
              onTraining={() => navigateStage("training")}
            />
          </>
        )}
        {stage === "teach" &&
          role === "teacher" &&
          (!selectedTeacherClass ? (
            <TeacherClassSelector intent="teach" onSelect={openTeacherClass} />
          ) : (
            <>
              <ActiveContextBar
                label="当前教学班级"
                title={selectedTeacherClass.name}
                detail={`${selectedTeacherClass.courseName} · ${selectedTeacherClass.lesson}`}
                changeLabel="切换班级"
                onChange={() =>
                  setSelection((current) => ({
                    ...current,
                    selectedClassId: null,
                    selectedCourseId: null,
                    selectedLearningTaskId: null,
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  }))
                }
              />
              {selectedTeacherClass.courseId === "course-ai-ethics" ? (
                <Suspense fallback={<WorkspaceLoading />}>
                <EthicsTeacherWorkspace
                  classroom={selectedTeacherClass}
                  report={getTeacherReport(selectedTeacherClass.reportId)}
                  onMoveNext={() => {
                    setTeacherLearnTab("overview");
                    setStage("learn");
                  }}
                  onOpenReport={() => {
                    setSelection((current) => ({
                      ...current,
                      selectedReportId: selectedTeacherClass.reportId,
                    }));
                    setReportTab("report");
                    setReportView("class");
                    setStage("report");
                  }}
                  onToast={showToast}
                />
                </Suspense>
              ) : (
                <>
              {managementAlert?.status === "已交办" &&
                selectedTeacherClass.id === "class-ai-2401" && (
                  <section className="management-inline-action">
                    <div>
                      <span>管理关注任务</span>
                      <strong>{managementAlert.title}</strong>
                      <p>匿名证据已核对；发布后学生课后学习将出现补强任务。</p>
                    </div>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={interventionPublished}
                      onClick={() => {
                        publishManagementIntervention();
                        showToast("负向提示词补学干预已发布，学生端任务已同步");
                      }}
                    >
                      {interventionPublished ? "干预已发布" : "发布补学干预"}
                    </button>
                  </section>
                )}
              <ContextTabs
                label="教师教学功能"
                value={teacherTeachTab}
                onChange={setTeacherTeachTab}
                items={[
                  { id: "prepare", label: "智能备课", note: "选择标准课" },
                  { id: "delivery", label: "教学实施", note: "确认与发布" },
                  { id: "resources", label: "课程资源", note: "标准 + AI" },
                  { id: "tutor", label: "AI助教", note: "陪伴与答疑" },
                ]}
              />
              {teacherTeachTab === "prepare" && (
                <SmartPrepareView
                  onAccepted={() => setTeacherTeachTab("delivery")}
                  onToast={showToast}
                />
              )}
              {teacherTeachTab === "delivery" && (
                <TeachingDeliveryView
                  key={selectedTeacherClass.id}
                  classroom={selectedTeacherClass}
                  onBackPrepare={() => setTeacherTeachTab("prepare")}
                  onMoveNext={() => {
                    setTeacherLearnTab("overview");
                    setStage("learn");
                  }}
                  onToast={showToast}
                />
              )}
              {teacherTeachTab === "resources" && (
                <CourseResourceCenter onToast={showToast} />
              )}
              {teacherTeachTab === "tutor" && (
                <TutorBuilderView onToast={showToast} />
              )}
                </>
              )}
            </>
          ))}
        {stage === "teach" &&
          role === "student" &&
          (!selectedStudentCourse ? (
            <StudentCourseSelector
              intent="teach"
              onSelect={openStudentCourse}
            />
          ) : (
            <>
              <ActiveContextBar
                label="当前课程"
                title={selectedStudentCourse.name}
                detail={`${selectedStudentCourse.teacher} · ${selectedStudentCourse.nextLesson}`}
                changeLabel="切换课程"
                onChange={() =>
                  setSelection((current) => ({
                    ...current,
                    selectedCourseId: null,
                    selectedClassId: null,
                    selectedLearningTaskId: null,
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  }))
                }
              />
              <ContextTabs
                label="学生导学功能"
                value={studentTeachTab}
                onChange={setStudentTeachTab}
                items={[
                  { id: "guide", label: "课程导学" },
                  { id: "graph", label: "我的知识图谱" },
                  { id: "tutor", label: "课前AI助教" },
                ]}
              />
              {studentTeachTab === "guide" && (
                selectedStudentCourse.status === "upcoming" ? (
                  <UpcomingCourseWorkspace
                    course={selectedStudentCourse}
                    variant="guide"
                    onChange={() =>
                      setSelection((current) => ({
                        ...current,
                        selectedCourseId: null,
                        selectedClassId: null,
                        selectedLearningTaskId: null,
                      }))
                    }
                  />
                ) : (
                  <StudentTeachView
                    course={selectedStudentCourse}
                    onStart={() => setStage("learn")}
                    onToast={showToast}
                  />
                )
              )}
              {studentTeachTab === "graph" && (
                selectedStudentCourse.graphReady ? (
                  <KnowledgeGraphView student onToast={showToast} />
                ) : (
                  <UnavailableStudentCapability
                    title="我的知识图谱"
                    course={selectedStudentCourse}
                    description="课程开始并产生学习证据后，系统会按知识点生成个人掌握图谱。"
                    onBack={() => setStudentTeachTab("guide")}
                  />
                )
              )}
              {studentTeachTab === "tutor" && (
                selectedStudentCourse.tutorReady ? (
                  <StudentTutorView onToast={showToast} />
                ) : (
                  <UnavailableStudentCapability
                    title="课程 AI 助教"
                    course={selectedStudentCourse}
                    description="本课程助教尚未发布，当前可先查看课程目标与课前资源。"
                    onBack={() => setStudentTeachTab("guide")}
                  />
                )
              )}
            </>
          ))}
        {stage === "learn" &&
          role === "teacher" &&
          (!selectedTeacherClass ? (
            <TeacherClassSelector intent="learn" onSelect={openTeacherClass} />
          ) : (
            <>
              <ActiveContextBar
                label="当前观察班级"
                title={selectedTeacherClass.name}
                detail={`参与度 ${selectedTeacherClass.participation}% · ${selectedTeacherClass.alerts} 项需要关注`}
                changeLabel="切换班级"
                onChange={() =>
                  setSelection((current) => ({
                    ...current,
                    selectedClassId: null,
                    selectedCourseId: null,
                    selectedLearningTaskId: null,
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  }))
                }
              />
              {selectedTeacherClass.courseId === "course-ai-ethics" ? (
                <Suspense fallback={<WorkspaceLoading />}>
                <EthicsTeacherWorkspace
                  classroom={selectedTeacherClass}
                  report={getTeacherReport(selectedTeacherClass.reportId)}
                  primaryLabel="查看教学诊断"
                  onMoveNext={() => {
                    setSelection((current) => ({
                      ...current,
                      selectedReportId: selectedTeacherClass.reportId,
                    }));
                    setReportTab("report");
                    setReportView("class");
                    setStage("report");
                  }}
                  onOpenReport={() => {
                    setSelection((current) => ({
                      ...current,
                      selectedReportId: selectedTeacherClass.reportId,
                    }));
                    setReportTab("report");
                    setReportView("class");
                    setStage("report");
                  }}
                  onToast={showToast}
                />
                </Suspense>
              ) : (
                <>
              {managementAlert?.status === "已交办" &&
                selectedTeacherClass.id === "class-ai-2401" && (
                  <section className="management-inline-action">
                    <div>
                      <span>管理关注任务</span>
                      <strong>{managementAlert.title}</strong>
                      <p>匿名证据已核对；发布后学生课后学习将出现补强任务。</p>
                    </div>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={interventionPublished}
                      onClick={() => {
                        publishManagementIntervention();
                        showToast("负向提示词补学干预已发布，学生端任务已同步");
                      }}
                    >
                      {interventionPublished ? "干预已发布" : "发布补学干预"}
                    </button>
                  </section>
                )}
              <ContextTabs
                label="教师学习促进功能"
                value={teacherLearnTab}
                onChange={setTeacherLearnTab}
                items={[
                  { id: "overview", label: "班级态势", note: "过程趋势" },
                  { id: "diagnosis", label: "掌握诊断", note: "目标与证据" },
                  { id: "intervention", label: "分层干预", note: "支持与回流" },
                ]}
              />
              <TeacherLearningPromotion
                tab={teacherLearnTab}
                onTabChange={setTeacherLearnTab}
                onToast={showToast}
                classroom={selectedTeacherClass}
              />
                </>
              )}
            </>
          ))}
        {stage === "learn" &&
          role === "student" &&
          (!selectedStudentCourse ? (
            <StudentCourseSelector
              intent="learn"
              onSelect={openStudentCourse}
            />
          ) : (
            <>
              <ActiveContextBar
                label="当前学习课程"
                title={selectedStudentCourse.name}
                detail={`${selectedStudentCourse.taskLabel} · 进度 ${selectedStudentCourse.progress}%`}
                changeLabel="切换课程"
                onChange={() =>
                  setSelection((current) => ({
                    ...current,
                    selectedCourseId: null,
                    selectedClassId: null,
                    selectedLearningTaskId: null,
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  }))
                }
              />
              <ContextTabs
                label="学生学习功能"
                value={studentLearnTab}
                onChange={setStudentLearnTab}
                items={[
                  { id: "learning", label: "个性化学习" },
                  { id: "tutor", label: "AI助教" },
                ]}
              />
              {interventionPublished &&
                managementAlert?.status === "已交办" &&
                selectedStudentCourse.id === "course-visual-design" && (
                  <section className="management-inline-action student-inline-action">
                    <div>
                      <span>管理关注补学</span>
                      <strong>负向提示词补强任务</strong>
                      <p>完成本任务后，学习记录会以匿名汇总形式回流管理预警。</p>
                    </div>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => {
                        completeManagementRemediation();
                        showToast("补学任务已完成，管理预警已解决");
                      }}
                    >
                      完成补学并回流
                    </button>
                  </section>
                )}
              {studentLearnTab === "learning" && (
                selectedStudentCourse.id === "course-ai-ethics" ? (
                  <Suspense fallback={<WorkspaceLoading />}>
                  <EthicsStudentLearning
                    course={selectedStudentCourse}
                    task={selectedLearningTask}
                    remediation={
                      courseRuntimes["course-ai-ethics"].remediation.status !==
                      "available"
                    }
                    onAssessment={() => {
                      setSelection((current) => ({
                        ...current,
                        selectedAssessmentId: "student-assessment-ethics",
                        selectedReportId: null,
                      }));
                      setStage("assess");
                    }}
                    onCompleteRemediation={() => {
                      setCourseRuntimes((current) => ({
                        ...current,
                        "course-ai-ethics": {
                          ...current["course-ai-ethics"],
                          remediation: {
                            ...current["course-ai-ethics"].remediation,
                            status: "completed",
                            completionRate: 100,
                          },
                          revision: current["course-ai-ethics"].revision + 1,
                        },
                      }));
                      showToast("版权与隐私风险辨识补强包已完成，结果已回流教师");
                    }}
                    onToast={showToast}
                  />
                  </Suspense>
                ) : selectedStudentCourse.status === "upcoming" ? (
                  <UpcomingCourseWorkspace
                    course={selectedStudentCourse}
                    variant="learning"
                    onChange={() =>
                      setSelection((current) => ({
                        ...current,
                        selectedCourseId: null,
                        selectedClassId: null,
                        selectedLearningTaskId: null,
                      }))
                    }
                  />
                ) : (
                  <StudentLearnView
                    course={selectedStudentCourse}
                    task={selectedLearningTask}
                    mode={practiceMode}
                    setMode={setPracticeMode}
                    practiceSet={activePracticeSet}
                    onSelectTask={(taskId) =>
                      setSelection((current) => ({
                        ...current,
                        selectedLearningTaskId: taskId,
                      }))
                    }
                    busy={busy}
                    remediation={remediation}
                    onGenerate={generatePractice}
                    onToggleQuestion={toggleQuestion}
                    onMoveNext={() => setStage("assess")}
                    onToast={showToast}
                  />
                )
              )}
              {studentLearnTab === "tutor" && (
                selectedStudentCourse.tutorReady ? (
                  <StudentTutorView onToast={showToast} />
                ) : (
                  <UnavailableStudentCapability
                    title="课程 AI 助教"
                    course={selectedStudentCourse}
                    description="课程尚未开始，教师发布助教后可在这里获得课程内答疑。"
                    onBack={() => setStudentLearnTab("learning")}
                  />
                )
              )}
            </>
          ))}
        {stage === "assess" &&
          role === "teacher" &&
          (assessmentToolMode ? (
            <>
              <ActiveContextBar
                label="课程级测评工具"
                title="生成式视觉设计"
                detail="创建内容不绑定当前试卷，保存时再选择适用班级"
                changeLabel="返回测评任务"
                onChange={() => setAssessmentToolMode(null)}
              />
              <ContextTabs
                label="常用创建工具"
                value={assessmentToolMode}
                onChange={(tab) => setAssessmentToolMode(tab)}
                items={[
                  { id: "generate", label: "智能出题" },
                  { id: "bank", label: "课程题库" },
                  { id: "training", label: "实训方案" },
                ]}
              />
              <AssessmentStudio tab={assessmentToolMode} onToast={showToast} />
            </>
          ) : !selectedTeacherAssessment ? (
            <TeacherAssessmentSelector
              classId={selection.selectedClassId}
              onSelect={openTeacherAssessment}
              onOpenTool={(tool) => {
                setAssessmentToolMode(tool);
              }}
            />
          ) : selectedTeacherAssessment.status === "in-progress" ? (
            <>
              <ActiveContextBar
                label="当前测评"
                title={selectedTeacherAssessment.title}
                detail={`${selectedTeacherClass?.name ?? "当前班级"} · ${selectedTeacherAssessment.progress}`}
                changeLabel="切换试卷"
                onChange={() =>
                  setSelection((current) => ({
                    ...current,
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  }))
                }
              />
              <AssessmentProgressWorkspace
                assessment={selectedTeacherAssessment}
                onOpenReview={() =>
                  showToast("考试结束后将自动开放评分规则与复核入口")
                }
              />
            </>
          ) : (
            <>
              <ActiveContextBar
                label="当前测评"
                title={selectedTeacherAssessment.title}
                detail={`${selectedTeacherClass?.name ?? "当前班级"} · ${selectedTeacherAssessment.statusLabel}`}
                changeLabel="切换试卷"
                onChange={() =>
                  setSelection((current) => ({
                    ...current,
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  }))
                }
              />
              {selectedTeacherAssessment.status === "draft" ? (
                <AssessmentStudio tab="paper" onToast={showToast} />
              ) : selectedTeacherAssessment.status === "grading" ? (
                <AssessmentStudio tab="grading" onToast={showToast} />
              ) : selectedTeacherAssessment.id === "assessment-ethics-review" &&
                selectedTeacherClass ? (
                <Suspense fallback={<WorkspaceLoading />}>
                <EthicsTeacherWorkspace
                  classroom={selectedTeacherClass}
                  report={getTeacherReport(selectedTeacherClass.reportId)}
                  primaryLabel="查看班级报告"
                  onMoveNext={() => {
                    setSelection((current) => ({
                      ...current,
                      selectedReportId: selectedTeacherClass.reportId,
                    }));
                    setReportView("class");
                    setStage("report");
                  }}
                  onOpenReport={() => {
                    setSelection((current) => ({
                      ...current,
                      selectedReportId: selectedTeacherClass.reportId,
                    }));
                    setReportView("class");
                    setStage("report");
                  }}
                  onToast={showToast}
                />
                </Suspense>
              ) : (
                <AssessView
                  scene={assessmentScene}
                  setScene={setAssessmentScene}
                  filter={assessmentFilter}
                  setFilter={setAssessmentFilter}
                  aiScore={aiScore}
                  setAiScore={setAiScore}
                  manualScore={manualScore}
                  setManualScore={setManualScore}
                  reviewNote={reviewNote}
                  setReviewNote={setReviewNote}
                  totalScore={totalScore}
                  onComplete={() => {
                    showToast(`复核已保存，林一诺最终成绩为 ${totalScore} 分`);
                    setSelection((current) => ({
                      ...current,
                      selectedReportId:
                        selectedTeacherClass?.reportId ?? "report-ai-2401",
                    }));
                    setStage("report");
                    setReportView("student");
                    setReportTab("report");
                  }}
                  onToast={showToast}
                />
              )}
            </>
          ))}
        {stage === "assess" &&
          role === "student" &&
          (!selectedStudentAssessment ? (
            <StudentAssessmentSelector
              courseId={selection.selectedCourseId}
              onSelect={openStudentAssessment}
            />
          ) : (
            <>
              <ActiveContextBar
                label="当前测评"
                title={selectedStudentAssessment.title}
                detail={`${selectedStudentCourse?.name ?? "当前课程"} · ${selectedStudentAssessment.statusLabel}`}
                changeLabel="切换测评"
                onChange={() =>
                  setSelection((current) => ({
                    ...current,
                    selectedAssessmentId: null,
                    selectedReportId: null,
                  }))
                }
              />
              {selectedStudentAssessment.id === "student-assessment-ethics" ? (
                <Suspense fallback={<WorkspaceLoading />}>
                <EthicsAssessmentWorkspace
                  key={selectedStudentAssessment.id}
                  assessment={selectedStudentAssessment}
                  onComplete={() => {
                    setSelection((current) => ({
                      ...current,
                      selectedReportId: "report-student-ethics",
                    }));
                    setReportView("student");
                    setStage("report");
                  }}
                />
                </Suspense>
              ) : (
                <StudentAssessView
                key={selectedStudentAssessment.id}
                assessment={selectedStudentAssessment}
                answer={
                  studentAssessmentAnswers[selectedStudentAssessment.id] ?? null
                }
                submitted={
                  studentAssessmentSubmitted[selectedStudentAssessment.id] ??
                  false
                }
                onAnswer={(answer) =>
                  setStudentAssessmentAnswers((current) => ({
                    ...current,
                    [selectedStudentAssessment.id]: answer,
                  }))
                }
                onSubmit={() =>
                  setStudentAssessmentSubmitted((current) => ({
                    ...current,
                    [selectedStudentAssessment.id]: true,
                  }))
                }
                onComplete={() => {
                  setSelection((current) => ({
                    ...current,
                    selectedReportId: "report-student-visual",
                  }));
                  setReportView("student");
                  setStage("report");
                }}
                onToast={showToast}
              />
              )}
            </>
          ))}
        {stage === "report" &&
          (role === "teacher" &&
          reportTab !== "ability" &&
          (!selectedTeacherClass || !selection.selectedReportId) ? (
            <TeacherReportLanding
              onSelectClass={openTeacherClass}
              onOpenOperations={() => {
                openTeacherClass("class-ai-2401", "report");
                setReportTab("operations");
              }}
              onOpenProfile={() => {
                openTeacherClass("class-ai-2401", "report");
                setReportTab("profile");
              }}
              onOpenAbility={() => {
                setSelection({
                  selectedCourseId: null,
                  selectedClassId: null,
                  selectedLearningTaskId: null,
                  selectedAssessmentId: null,
                  selectedReportId: "teacher-ability",
                });
                setReportTab("ability");
              }}
            />
          ) : role === "student" &&
            (!selectedStudentCourse || !selection.selectedReportId) ? (
            <StudentReportSelector
              courseId={selection.selectedCourseId}
              onSelect={(reportId, courseId) =>
                openStudentReport(courseId, reportId)
              }
            />
          ) : (
            <>
              <ActiveContextBar
                label={
                  role === "teacher" && reportTab === "ability"
                    ? "个人能力报告"
                    : role === "teacher"
                      ? "当前诊断对象"
                      : "当前报告课程"
                }
                title={
                  role === "teacher" && reportTab === "ability"
                    ? "周岚老师"
                    : role === "teacher"
                    ? (selectedTeacherClass?.name ?? "当前班级")
                    : (selectedStudentCourse?.name ?? "当前课程")
                }
                detail={
                  role === "teacher" && reportTab === "ability"
                    ? "跨课程任务产物 · 不依赖班级"
                    : role === "teacher"
                    ? (selectedTeacherClass?.reportLabel ?? "教学报告")
                    : "最近一次阶段测评反馈"
                }
                changeLabel={role === "teacher" ? "返回报告入口" : "切换报告"}
                onChange={() => {
                  if (role === "teacher") setReportTab("report");
                  setSelection((current) => ({
                    ...current,
                    selectedReportId: null,
                    ...(role === "teacher"
                      ? {
                          selectedClassId: null,
                          selectedCourseId: null,
                          selectedLearningTaskId: null,
                        }
                      : {}),
                  }));
                }}
              />
              {role === "teacher" && (
                <ContextTabs
                  label="教师报告功能"
                  value={reportTab}
                  onChange={setReportTab}
                  items={[
                    { id: "report", label: "教学报告" },
                    { id: "operations", label: "助教运营报告" },
                    { id: "profile", label: "学生画像" },
                    { id: "ability", label: "教师AI能力" },
                  ]}
                />
              )}
              {(role === "student" || reportTab === "report") && (
                <ReportView
                  role={role}
                  view={reportView}
                  setView={setReportView}
                  totalScore={totalScore}
                  busy={busy}
                  onGenerate={generateRemediation}
                  onEvidence={() =>
                    openEvidence(
                      selectedStudentCourse?.id === "course-ai-ethics" ||
                        selectedTeacherClass?.courseId === "course-ai-ethics"
                        ? "evidence-ethics-report"
                        : "evidence-report-remediation",
                    )
                  }
                  onToast={showToast}
                  teacherReportData={selectedTeacherReport}
                  studentReportData={selectedStudentReport}
                  studentCourseData={selectedStudentCourse}
                />
              )}
              {role === "teacher" && reportTab === "operations" && (
                <TutorInsightsView onToast={showToast} />
              )}
              {role === "teacher" && reportTab === "profile" && (
                <StudentProfileView onToast={showToast} />
              )}
              {role === "teacher" && reportTab === "ability" && (
                <TeacherAbilityView onToast={showToast} />
              )}
            </>
          ))}
        {stage === "research" && role === "teacher" && (
          <Suspense fallback={<WorkspaceLoading />}>
            <TeacherResearchWorkspace onToast={showToast} />
          </Suspense>
        )}
        {stage === "training" && (
          <TrainingCenterView role={role} onToast={showToast} />
        )}
        </>}
      </main>

      {role !== "manager" &&
        !(role === "teacher" && teacherWorkspaceMode === "growth") && <nav
        className={`mobile-stage-nav ${role === "teacher" ? "teacher-nav" : "student-nav"}`}
        aria-label="移动端教学闭环阶段"
      >
        {stages.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={stage === item.id ? "active" : ""}
              onClick={() => navigateStage(item.id)}
            >
              <Icon size={19} />
              <span>{item.short}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={stage === "training" ? "active" : ""}
          onClick={() => navigateStage("training")}
        >
          <FlaskConical size={19} />
          <span>练</span>
        </button>
      </nav>}

      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="关闭提示"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

interface TeachViewProps {
  steps: LessonStep[];
  published: boolean;
  busy: string | null;
  onPublish: () => void;
  onDurationChange: (id: string, delta: number) => void;
  onMoveNext: () => void;
  onToast: (message: string) => void;
}

function TeachView({
  steps,
  published,
  busy,
  onPublish,
  onDurationChange,
  onMoveNext,
  onToast,
}: TeachViewProps) {
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  return (
    <div className="page page-teach">
      <section className="hero-panel teach-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="pulse-dot" /> 今日第 2 节 · 10:00 开始
          </span>
          <h1>让每一次教学，都有清晰的下一步。</h1>
          <p>
            {lessonPlan.subtitle}　/　{lessonPlan.title}
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                document
                  .getElementById("lesson-flow")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Play size={17} fill="currentColor" /> 继续今日教学
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() =>
                onToast("AI 已检查目标、活动与测评的一致性：匹配度 92%")
              }
            >
              <Sparkles size={17} /> 查看 AI 备课建议
            </button>
          </div>
        </div>
        <div className="hero-visual" aria-label="当前课程数据摘要">
          <div className="orb orb-main">
            <span>92%</span>
            <small>目标匹配度</small>
          </div>
          <div className="floating-metric metric-one">
            <UsersRound size={17} />
            <span>
              <strong>36</strong> 名学生
            </span>
          </div>
          <div className="floating-metric metric-two">
            <CircleAlert size={17} />
            <span>
              <strong>14</strong> 人需关注
            </span>
          </div>
          <div className="floating-metric metric-three">
            <Clock3 size={17} />
            <span>
              <strong>{totalDuration}</strong> 分钟
            </span>
          </div>
        </div>
      </section>

      <div className="section-heading" id="lesson-flow">
        <div>
          <span className="section-kicker">AI 教学编排</span>
          <h2>45 分钟，五个关键时刻</h2>
        </div>
        <div className="heading-meta">
          <Sparkles size={16} /> 已基于班级学情优化
        </div>
      </div>

      <div className="teach-layout">
        <section className="card lesson-flow-card">
          <div className="card-heading">
            <div>
              <h3>课堂流程</h3>
              <p>拖动不如直接调整，每一步都说明目的。</p>
            </div>
            <span
              className={`time-total ${totalDuration === 45 ? "valid" : ""}`}
            >
              <Clock3 size={15} /> {totalDuration} / 45 分钟
            </span>
          </div>
          <div className="timeline">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.type];
              return (
                <article className="timeline-item" key={step.id}>
                  <div className="timeline-marker">
                    <Icon size={17} />
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-index">0{index + 1}</span>
                    <div className="timeline-main">
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                      <span className="resource-chip">{step.resource}</span>
                    </div>
                    <div
                      className="duration-control"
                      aria-label={`${step.title}时长`}
                    >
                      <button
                        type="button"
                        onClick={() => onDurationChange(step.id, -1)}
                        aria-label="减少一分钟"
                      >
                        −
                      </button>
                      <span>
                        {step.duration}
                        <small>min</small>
                      </span>
                      <button
                        type="button"
                        onClick={() => onDurationChange(step.id, 1)}
                        aria-label="增加一分钟"
                      >
                        ＋
                      </button>
                    </div>
                    <button
                      className="more-button"
                      type="button"
                      onClick={() => onToast(`已打开“${step.title}”的内容设置`)}
                      aria-label={`设置${step.title}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="publish-bar">
            <div className="publish-status">
              <span className={published ? "status-icon done" : "status-icon"}>
                {published ? <Check size={17} /> : <Rocket size={17} />}
              </span>
              <span>
                <strong>{published ? "随堂任务已发布" : "准备就绪"}</strong>
                <small>
                  {published
                    ? "36 名学生已收到任务 · 预计 18 分钟"
                    : "覆盖 4 个知识点 · 1 个创作任务 · 3 道检测题"}
                </small>
              </span>
            </div>
            {published ? (
              <button
                className="primary-button"
                type="button"
                onClick={onMoveNext}
              >
                查看学生学习 <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                onClick={onPublish}
                disabled={busy === "publish"}
              >
                {busy === "publish" ? (
                  <>
                    <span className="spinner" /> 正在发布
                  </>
                ) : (
                  <>
                    <Rocket size={16} /> 发布随堂任务
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        <aside className="teach-sidebar">
          <section className="card objective-card">
            <span className="card-label">
              <Target size={15} /> 本课目标
            </span>
            <h3>不是“学会工具”，而是掌握可迁移的方法。</h3>
            <ol>
              {lessonPlan.objectives.map((objective, index) => (
                <li key={objective}>
                  <span>0{index + 1}</span>
                  {objective}
                </li>
              ))}
            </ol>
          </section>
          <section className="card knowledge-card">
            <div className="card-heading compact">
              <div>
                <h3>知识点与难度</h3>
                <p>点击标签查看判断依据</p>
              </div>
            </div>
            <div className="knowledge-list">
              {knowledgePoints.map((point, index) => (
                <div className="knowledge-row" key={point.id}>
                  <span className="knowledge-order">{index + 1}</span>
                  <div>
                    <strong>{point.name}</strong>
                    {point.prerequisite && (
                      <small>前置：{point.prerequisite}</small>
                    )}
                  </div>
                  <DifficultyBadge difficulty={point.difficulty} />
                </div>
              ))}
            </div>
          </section>
          <button
            className="ai-insight"
            type="button"
            onClick={() =>
              onToast("建议已采纳：负向提示词环节增加 2 分钟对比案例")
            }
          >
            <span>
              <WandSparkles size={19} />
            </span>
            <span>
              <strong>AI 发现一个可优化点</strong>
              <small>负向提示词错误率高于班级均值 18%</small>
            </span>
            <ArrowRight size={16} />
          </button>
        </aside>
      </div>
    </div>
  );
}

function StudentTeachView({
  course,
  onStart,
  onToast,
}: {
  course: StudentCourseSummary;
  onStart: () => void;
  onToast: (message: string) => void;
}) {
  const runtime = getCourseRuntimeDefinition(course.id);
  return (
    <div className="page student-teach-page">
      <WorkspaceHeader
        className="student-course-hero"
        tone="teach"
        variant="overview"
        eyebrow={
          <>
          <BookOpen size={15} /> {course.schedule}
          </>
        }
        title="课程导学"
        description={`${course.name} · ${course.nextLesson}。先了解学习目标和课堂路线，再进入本课任务。`}
        summary={
          <div className="teacher-line">
            <span>周</span>
            <div>
              <strong>{course.teacher}</strong>
              <small>已发布导学与课堂任务</small>
            </div>
          </div>
        }
        actions={
          <button className="primary-button" type="button" onClick={onStart}>
            <Play size={16} fill="currentColor" /> 进入本课学习
          </button>
        }
      />

      <div className="student-teach-grid">
        <section className="card student-agenda-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">本课路线</span>
              <h3>你将在 45 分钟内完成什么</h3>
              <p>课堂环节与学习产出一一对应。</p>
            </div>
            <span className="time-total valid">
              <Clock3 size={15} /> 45 分钟
            </span>
          </div>
          <div className="student-agenda">
              {runtime.guideSteps.map((step, index) => {
              const Icon = [Target, BookOpen, ScanSearch, WandSparkles, ListChecks][index] ?? BookOpen;
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => onToast(`已打开导学环节：${step.title}`)}
                >
                  <span>
                    <Icon size={16} />
                  </span>
                  <b>0{index + 1}</b>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                  <em>{step.duration} min</em>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
        </section>
        <aside className="student-guide-side">
          <section className="card student-goal-card">
            <span className="card-label">
              <Target size={15} /> 完成本课后，你可以
            </span>
            <div className="student-goals">
              {course.objectives.map((objective, index) => (
                <div key={objective}>
                  <span>
                    <Check size={14} />
                  </span>
                  <p>{objective}</p>
                  <small>目标 {index + 1}</small>
                </div>
              ))}
            </div>
          </section>
          <section className="card prepare-card">
            <span className="card-label">
              <Sparkles size={15} /> 课前准备
            </span>
            <h3>2 分钟快速诊断</h3>
            <p>回答 3 个问题，AI 会据此调整你的课堂练习难度。</p>
            <button
              type="button"
              onClick={() => onToast("课前诊断完成：建议从 L3 进阶难度开始")}
            >
              开始诊断 <ArrowRight size={14} />
            </button>
          </section>
        </aside>
      </div>

      <section className="course-resources">
        <div className="section-heading">
          <div>
            <span className="section-kicker">学习资源</span>
            <h2>需要时再打开，不必一次看完</h2>
          </div>
        </div>
        <div className="resource-grid">
          {runtime.resources.map((resource, index) => {
            const Icon = [BookOpen, Layers3, MessageSquareText][index] ?? BookOpen;
            const tone = ["green", "coral", "blue"][index] ?? "blue";
            return (
              <button
                type="button"
                className={`resource-tile tone-${tone}`}
                key={resource.title}
                onClick={() => onToast(`已打开${resource.title}`)}
              >
                <span>
                  <Icon size={19} />
                </span>
                <div>
                  <strong>{resource.title}</strong>
                  <small>{resource.description}</small>
                </div>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function UnavailableStudentCapability({
  title,
  course,
  description,
  onBack,
}: {
  title: "我的知识图谱" | "课程 AI 助教";
  course: StudentCourseSummary;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="page unavailable-capability-page">
      <WorkspaceHeader
        tone="learn"
        title={title}
        eyebrow={`${course.name} · ${course.teacher}`}
        description={description}
      />
      <EmptyState
        icon={title === "我的知识图谱" ? <Workflow size={24} /> : <Bot size={24} />}
        title={title === "我的知识图谱" ? "尚未生成知识图谱" : "助教尚未发布"}
        description="这里不会复用其他课程的数据。可返回课程导学查看当前已开放内容。"
        action={
          <button className="primary-button" type="button" onClick={onBack}>
            返回课程导学 <ArrowRight size={15} />
          </button>
        }
      />
    </div>
  );
}

interface StudentLearnViewProps {
  course: StudentCourseSummary;
  task: StudentLearningTaskSummary | null;
  mode: "class" | "after";
  setMode: (mode: "class" | "after") => void;
  practiceSet: PracticeSet;
  onSelectTask: (taskId: string) => void;
  busy: string | null;
  remediation: boolean;
  onGenerate: () => void;
  onToggleQuestion: (id: string) => void;
  onMoveNext: () => void;
  onToast: (message: string) => void;
}

function StudentLearnView({
  course,
  task,
  mode,
  setMode,
  practiceSet,
  onSelectTask,
  busy,
  remediation,
  onGenerate,
  onToggleQuestion,
  onMoveNext,
  onToast,
}: StudentLearnViewProps) {
  const completed = practiceSet.questions.filter(
    (question) => question.completed,
  ).length;
  return (
    <div className="page page-learn">
      <LearnerWorkspaceHeader
        learnerKind="student"
        learnerName="林一诺"
        className="learn-welcome"
        variant="overview"
        title="个性化学习"
        description={`${course.name} · 当前重点：${task?.knowledgePoint ?? "按课程目标完成学习准备"}。${task?.description ?? "学习路径会根据练习与作品证据持续调整。"}`}
        summary={
          <div className="learn-progress-ring">
            <strong>{task?.progress ?? course.progress}%</strong>
            <span>{task ? "当前任务" : "课程进度"}</span>
          </div>
        }
      />

      <div className="student-task-switcher" role="tablist" aria-label="学习任务">
        {studentLearningTasks
          .filter((item) => item.courseId === course.id)
          .map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={task?.id === item.id}
              className={task?.id === item.id ? "active" : ""}
              key={item.id}
              onClick={() => onSelectTask(item.id)}
            >
              <span>{item.status === "completed" ? "已完成" : item.status === "in-progress" ? "进行中" : "待完成"}</span>
              <strong>{item.title}</strong>
              <small>{item.dueAt} · 进度 {item.progress}%</small>
            </button>
          ))}
      </div>

      <div className="mode-switch" role="tablist" aria-label="学习模式">
        <button
          role="tab"
          aria-selected={mode === "class"}
          className={mode === "class" ? "active" : ""}
          type="button"
          onClick={() => setMode("class")}
        >
          <Play size={16} /> 随堂学 <span>跟随课堂</span>
        </button>
        <button
          role="tab"
          aria-selected={mode === "after"}
          className={mode === "after" ? "active" : ""}
          type="button"
          onClick={() => setMode("after")}
        >
          <Rocket size={16} /> 课后学 <span>自主提升</span>
        </button>
      </div>

      {remediation && (
        <div className="remediation-banner">
          <span>
            <WandSparkles size={18} />
          </span>
          <div>
            <strong>新补学任务：画面控制与负向提示词</strong>
            <p>由刚才的测评报告自动生成 · 8 分钟微课 + 2 个案例 + 3 道练习</p>
          </div>
          <button
            type="button"
            onClick={() => onToast("补学微课已开始，学习记录将自动保存")}
          >
            <Play size={15} fill="currentColor" /> 开始
          </button>
        </div>
      )}

      <StudentAssignedTasks courseId={course.id} onToast={onToast} />

      <div className="learning-stats">
        {learningRecords.map((record) => (
          <div className="stat-card" key={record.label}>
            <small>{record.label}</small>
            <strong>{record.value}</strong>
            <span>{record.delta}</span>
          </div>
        ))}
      </div>

      <div className="learn-grid">
        <section className="card current-task">
          <div className="artwork-wrap">
            <img
              src={futureLibrary}
              alt="学生生成作品：植物温室中的未来图书馆"
            />
            <span className="artwork-badge">
              <Sparkles size={14} /> 第 3 版
            </span>
            <button
              className="compare-button"
              type="button"
              onClick={() => onToast("已切换作品版本对比：第 2 版 → 第 3 版")}
            >
              <Layers3 size={15} /> 对比迭代
            </button>
          </div>
          <div className="task-body">
            <div className="task-head">
              <span className="section-kicker">当前创作任务</span>
              <DifficultyBadge difficulty={knowledgePoints[1].difficulty} />
            </div>
            <h2>为“未来学习空间”建立清晰的视觉叙事</h2>
            <p>
              你已经解决了主体不明确的问题。下一步，试着用镜头和光线让读者先看到最重要的部分。
            </p>
            <div className="prompt-box">
              <div>
                <MessageSquareText size={16} />
                <strong>当前提示词</strong>
                <button
                  type="button"
                  onClick={() =>
                    onToast(
                      "AI 已标注提示词中的主体、环境、构图、光线与风格要素",
                    )
                  }
                >
                  AI 拆解
                </button>
              </div>
              <p>
                一座生长在植物温室中的未来图书馆，圆形玻璃阅读舱，漂浮的书页像叶片一样连接，广角镜头，清晨暖光，安静而充满好奇……
              </p>
            </div>
            <button
              className="primary-button wide"
              type="button"
              onClick={() => onToast("已保存第 3 版作品，并记录本次提示词修改")}
            >
              <Check size={16} /> 保存本次迭代
            </button>
          </div>
        </section>

        <aside className="card path-card">
          <span className="card-label">
            <BrainCircuit size={15} /> 你的学习路径
          </span>
          <h3>AI 不替你做决定，只帮你看见下一步。</h3>
          <div className="path-list">
            <div className="path-item complete">
              <span>
                <Check size={15} />
              </span>
              <div>
                <strong>结构化提示词</strong>
                <small>已掌握 · 正确率 88%</small>
              </div>
            </div>
            <div className="path-connector active" />
            <div className="path-item active">
              <span>2</span>
              <div>
                <strong>画面与构图控制</strong>
                <small>学习中 · 建议再练 1 次</small>
              </div>
            </div>
            <div className="path-connector" />
            <div className="path-item">
              <span>3</span>
              <div>
                <strong>负向提示词</strong>
                <small>待补强 · 错误率 46%</small>
              </div>
            </div>
            <div className="path-connector" />
            <div className="path-item">
              <span>4</span>
              <div>
                <strong>迭代与评估</strong>
                <small>未开始</small>
              </div>
            </div>
          </div>
          <button
            className="secondary-button wide"
            type="button"
            onClick={onGenerate}
            disabled={busy === "practice"}
          >
            {busy === "practice" ? (
              <>
                <span className="spinner dark" /> AI 正在设计练习
              </>
            ) : (
              <>
                <WandSparkles size={16} /> 针对弱项生成练习
              </>
            )}
          </button>
        </aside>
      </div>

      <section className="card practice-section">
        <div className="card-heading">
          <div>
            <span className="section-kicker">自适应练习</span>
            <h3>{practiceSet.title}</h3>
            <p>{practiceSet.reason}</p>
          </div>
          <span className="practice-count">
            {completed}/{practiceSet.questions.length} 已完成
          </span>
        </div>
        <div className="question-list">
          {practiceSet.questions.map((question, index) => (
            <article
              className={`question-card ${question.completed ? "complete" : ""}`}
              key={question.id}
            >
              <button
                className="check-button"
                type="button"
                onClick={() => onToggleQuestion(question.id)}
                aria-label={question.completed ? "标记未完成" : "标记完成"}
              >
                {question.completed ? <Check size={17} /> : index + 1}
              </button>
              <div>
                <strong>{question.title}</strong>
                <p>{question.hint}</p>
                <span className="knowledge-chip">
                  {question.knowledgePoint}
                </span>
              </div>
              <DifficultyBadge difficulty={question.difficulty} />
              <button
                className="question-action"
                type="button"
                onClick={() => onToast(`已打开练习：${question.title}`)}
              >
                {question.completed ? "回顾" : "开始"} <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>
        <button
          className="primary-button next-stage"
          type="button"
          onClick={onMoveNext}
        >
          进入我的测评 <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}

interface AssessViewProps {
  scene: "随堂测" | "单元测" | "正式考试";
  setScene: (value: "随堂测" | "单元测" | "正式考试") => void;
  filter: "全部" | "待复核" | "已完成" | "异常";
  setFilter: (value: "全部" | "待复核" | "已完成" | "异常") => void;
  aiScore: number;
  setAiScore: (value: number) => void;
  manualScore: number;
  setManualScore: (value: number) => void;
  reviewNote: string;
  setReviewNote: (value: string) => void;
  totalScore: number;
  onComplete: () => void;
  onToast: (message: string) => void;
}

function AssessView({
  scene,
  setScene,
  filter,
  setFilter,
  aiScore,
  setAiScore,
  manualScore,
  setManualScore,
  reviewNote,
  setReviewNote,
  totalScore,
  onComplete,
  onToast,
}: AssessViewProps) {
  const filteredStudents = useMemo(
    () =>
      filter === "全部"
        ? classStudents
        : classStudents.filter((student) => student.status === filter),
    [filter],
  );
  return (
    <div className="page page-assess">
      <WorkspaceHeader
        className="page-title-row"
        tone="assess"
        eyebrow={
          <>
            <ShieldCheck size={15} /> 教师复核工作台
          </>
        }
        title="评分复核"
        description="集中查看机器判分、AI 多维证据和教师人工评分，并保留最终判断。"
        summary={
          <div className="score-formula">
            <span>
              <Bot size={15} /> 机器 30
            </span>
            <b>+</b>
            <span>
              <Sparkles size={15} /> AI 50
            </span>
            <b>+</b>
            <span>
              <UserRound size={15} /> 人工 20
            </span>
            <strong>= 100</strong>
          </div>
        }
      />

      <div className="assessment-toolbar">
        <div className="scene-tabs" role="tablist" aria-label="测评场景">
          {(["随堂测", "单元测", "正式考试"] as const).map((item) => (
            <button
              role="tab"
              aria-selected={scene === item}
              className={scene === item ? "active" : ""}
              type="button"
              key={item}
              onClick={() => {
                setScene(item);
                onToast(`已切换至${item}评分场景`);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() =>
            onToast("评分规则：机器30%、AI50%、人工20%；人工可复核AI维度")
          }
        >
          <SlidersHorizontal size={16} /> 评分规则
        </button>
      </div>

      <div className="assess-layout">
        <aside className="card student-list-panel">
          <div className="list-header">
            <div>
              <h3>{scene} · 作品任务</h3>
              <p>36 份提交 · 4 份待复核</p>
            </div>
            <button type="button" onClick={() => onToast("学生提交列表已刷新")}>
              <RefreshCw size={16} />
            </button>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input aria-label="搜索学生" placeholder="搜索学生" />
          </label>
          <div className="filter-row">
            {(["全部", "待复核", "已完成", "异常"] as const).map((item) => (
              <button
                type="button"
                className={filter === item ? "active" : ""}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="student-list">
            {filteredStudents.map((student, index) => (
              <button
                type="button"
                className={`student-row ${index === 0 ? "active" : ""}`}
                key={student.name}
                onClick={() => onToast(`已选择 ${student.name} 的提交`)}
              >
                <span className={`student-avatar color-${index + 1}`}>
                  {student.name.slice(-1)}
                </span>
                <span>
                  <strong>{student.name}</strong>
                  <small>{student.point}</small>
                </span>
                <span className={`submission-status status-${student.status}`}>
                  {student.status}
                </span>
                <b>{student.score}</b>
              </button>
            ))}
            {filteredStudents.length === 0 && (
              <div className="empty-state">当前筛选下没有学生</div>
            )}
          </div>
        </aside>

        <section className="card review-panel">
          <div className="review-head">
            <div className="review-student">
              <span>林</span>
              <div>
                <h3>
                  林一诺 <small>AI24018</small>
                </h3>
                <p>提交于今天 10:26 · 共迭代 3 次</p>
              </div>
            </div>
            <div className="final-score">
              <span>最终成绩</span>
              <strong>{totalScore}</strong>
              <small>/ 100</small>
            </div>
          </div>

          <div className="submission-grid">
            <div className="submission-art">
              <img src={futureLibrary} alt="林一诺提交的未来图书馆作品" />
              <button
                type="button"
                onClick={() => onToast("作品已进入沉浸查看模式")}
              >
                <ImageIcon size={15} /> 查看原图
              </button>
            </div>
            <div className="submission-prompt">
              <span className="card-label">
                <MessageSquareText size={15} /> 学生提示词
              </span>
              <p>
                未来图书馆生长在通透的植物温室中，圆形玻璃阅读舱作为视觉中心，漂浮书页以数据光点相连，广角镜头，清晨暖光，安静、开放、充满好奇……
              </p>
              <div>
                <span># 广角构图</span>
                <span># 暖色光线</span>
                <span># 3D 编辑插画</span>
              </div>
            </div>
          </div>

          <div className="score-sections">
            <section className="score-section machine-section">
              <div className="score-title">
                <span className="score-icon">
                  <Bot size={18} />
                </span>
                <div>
                  <strong>机器客观评分</strong>
                  <small>概念题 · 自动判定</small>
                </div>
                <b>
                  {initialSubmission.machine.value}
                  <small>/30</small>
                </b>
              </div>
              <div className="machine-detail">
                <span>
                  <Check size={15} /> 9 题正确
                </span>
                <span>
                  <X size={15} /> 1 题错误
                </span>
                <button
                  type="button"
                  onClick={() => onToast("已定位错题：负向提示词的适用场景")}
                >
                  查看错题 <ArrowRight size={14} />
                </button>
              </div>
            </section>

            <section className="score-section ai-section">
              <div className="score-title">
                <span className="score-icon">
                  <Sparkles size={18} />
                </span>
                <div>
                  <strong>AI 多维评分</strong>
                  <small>置信度 92% · 有证据可复核</small>
                </div>
                <b>
                  {aiScore}
                  <small>/50</small>
                </b>
              </div>
              <div className="evidence-list">
                {initialSubmission.ai.evidence.map((evidence) => (
                  <div className="evidence-row" key={evidence.label}>
                    <span>{evidence.label}</span>
                    <div>
                      <i style={{ width: `${evidence.value * 10}%` }} />
                    </div>
                    <strong>{evidence.value}</strong>
                    <button
                      type="button"
                      title={evidence.note}
                      onClick={() =>
                        onToast(`${evidence.label}：${evidence.note}`)
                      }
                    >
                      <Lightbulb size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="review-adjust">
                <div>
                  <label htmlFor="ai-score">教师复核 AI 分</label>
                  <span>AI 原评分 {initialSubmission.ai.originalValue}</span>
                </div>
                <input
                  id="ai-score"
                  type="range"
                  min="0"
                  max="50"
                  value={aiScore}
                  onChange={(event) => setAiScore(Number(event.target.value))}
                />
                <output>{aiScore}</output>
              </div>
            </section>

            <section className="score-section manual-section">
              <div className="score-title">
                <span className="score-icon">
                  <UserRound size={18} />
                </span>
                <div>
                  <strong>教师人工评分</strong>
                  <small>创意过程与反思表达</small>
                </div>
                <b>
                  {manualScore}
                  <small>/20</small>
                </b>
              </div>
              <div className="manual-controls">
                <div className="score-stepper">
                  <button
                    type="button"
                    onClick={() => setManualScore(Math.max(0, manualScore - 1))}
                  >
                    −
                  </button>
                  <strong>{manualScore}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setManualScore(Math.min(20, manualScore + 1))
                    }
                  >
                    ＋
                  </button>
                </div>
                <label>
                  <span>教师评语</span>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={2}
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="review-footer">
            <div>
              {aiScore !== initialSubmission.ai.originalValue && (
                <span className="changed-note">
                  <CircleAlert size={14} /> AI 分已由{" "}
                  {initialSubmission.ai.originalValue} 调整为 {aiScore}
                </span>
              )}
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={onComplete}
            >
              <Check size={16} /> 完成复核并查看报告
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StudentAssessView({
  assessment,
  answer,
  submitted,
  onAnswer,
  onSubmit,
  onComplete,
  onToast,
}: {
  assessment: AssessmentWorkspaceSummary;
  answer: string | null;
  submitted: boolean;
  onAnswer: (answer: string) => void;
  onSubmit: () => void;
  onComplete: () => void;
  onToast: (message: string) => void;
}) {
  const { state } = useDemoState();
  const question =
    assessment.id === "student-assessment-progress"
      ? {
          number: "05",
          point: "偏差诊断",
          title: "画面主体正确但背景过于杂乱，下一轮最优先调整哪一项？",
          options: [
            "继续增加主体细节词",
            "明确背景层级并加入需要排除的干扰元素",
            "只提高图像分辨率",
            "完全更换创作主题",
          ],
          position: "4 / 7",
        }
      : {
          number: "04",
          point: "负向提示词",
          title: "生成结果中出现了不需要的文字水印，哪一项调整最有效？",
          options: [
            "增加“高清、精细”等质量词",
            "在负向提示词中明确加入“文字、水印、Logo”",
            "把画面比例改为 16:9",
            "重复描述主要人物的外观",
          ],
          position: "3 / 5",
        };
  return (
    <div className="page student-assess-page">
      {state.paperPublished && (
        <div className="published-paper-banner">
          <span>
            <Sparkles size={17} />
          </span>
          <div>
            <strong>新测评已发布：{state.paper?.title}</strong>
            <p>
              {state.paper?.questions.length} 道题 · 100 分 ·{" "}
              {state.paper?.blueprint.duration} 分钟
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onToast("已进入刚刚发布的文生图单元测");
            }}
          >
            立即作答 <ArrowRight size={14} />
          </button>
        </div>
      )}
      <WorkspaceHeader
        className="page-title-row student-assess-title"
        tone="assess"
        eyebrow={
          <>
            <ListChecks size={15} /> 随堂测、单元测与正式考试
          </>
        }
        title="我的测评"
        description="完成教师发布的测评，提交后立即查看知识点反馈与下一步建议。"
        summary={
          <div className="student-test-summary">
            <span>
              <Trophy size={17} />
            </span>
            <div>
              <small>本课程综合表现</small>
              <strong>84.6</strong>
            </div>
            <em>较上次 +4.2</em>
          </div>
        }
      />

      <div className="student-assessment-object-summary">
        <span>{assessment.scene}</span>
        <strong>{assessment.title}</strong>
        <small>{assessment.schedule}</small>
      </div>

      <div className="student-assess-layout">
        <section className="card active-test-card">
          <div className="test-card-head">
            <div>
              <span className="live-test-dot" /> {assessment.scene} · 当前试卷
            </div>
            <span>
              <Clock3 size={14} /> 剩余 08:42
            </span>
          </div>
          <div className="test-progress">
            <i style={{ width: submitted ? "100%" : "60%" }} />
            <span>{submitted ? "已完成" : question.position}</span>
          </div>
          {!submitted ? (
            <>
              <div className="question-content">
                <span className="question-number">{question.number}</span>
                <div>
                  <span className="knowledge-chip">{question.point}</span>
                  <h2>{question.title}</h2>
                  <p>单选题 · 5 分</p>
                </div>
              </div>
              <div className="answer-options">
                {question.options.map((option, index) => (
                  <button
                    type="button"
                    className={answer === option ? "selected" : ""}
                    key={option}
                    onClick={() => onAnswer(option)}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    <p>{option}</p>
                    {answer === option && <Check size={16} />}
                  </button>
                ))}
              </div>
              <div className="test-actions">
                <button
                  className="text-button dark-text"
                  type="button"
                  onClick={() => onToast("本题已标记，提交前可以返回检查")}
                >
                  <CircleAlert size={15} /> 标记本题
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!answer}
                  onClick={() => {
                    onSubmit();
                    onToast("测评已提交，机器判分和 AI 反馈已生成");
                  }}
                >
                  提交测评 <ArrowRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="student-test-result">
              <span className="result-check">
                <Check size={28} />
              </span>
              <div>
                <span className="section-kicker">即时反馈</span>
                <h2>回答正确，本次得分 86。</h2>
                <p>
                  你已经能识别负向提示词的直接应用场景。下一步建议练习“根据画面偏差反推排除词”。
                </p>
              </div>
              <div className="result-breakdown">
                <span>
                  <Bot size={16} />
                  <b>27</b>
                  <small>机器评分 / 30</small>
                </span>
                <span>
                  <Sparkles size={16} />
                  <b>42</b>
                  <small>AI 作品评分 / 50</small>
                </span>
                <span>
                  <UserRound size={16} />
                  <b>17</b>
                  <small>教师评分 / 20</small>
                </span>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={onComplete}
              >
                查看我的成长报告 <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>

        <aside className="student-test-side">
          <section className="card upcoming-tests">
            <div className="card-heading">
              <div>
                <h3>待完成</h3>
                <p>按截止时间排序</p>
              </div>
            </div>
            <button type="button" onClick={() => onToast("已打开文生图单元测")}>
              <span className="test-date">
                <b>15</b>
                <small>JUL</small>
              </span>
              <div>
                <strong>文生图单元测</strong>
                <small>20 题 · 35 分钟</small>
              </div>
              <em>明天截止</em>
            </button>
            <button type="button" onClick={() => onToast("已打开作品自评任务")}>
              <span className="test-date muted">
                <b>18</b>
                <small>JUL</small>
              </span>
              <div>
                <strong>作品自评与互评</strong>
                <small>量规评价 · 10 分钟</small>
              </div>
              <em>4 天后</em>
            </button>
          </section>
          <section className="card test-tip">
            <span>
              <Lightbulb size={17} />
            </span>
            <div>
              <strong>作答建议</strong>
              <p>
                先判断问题属于主体、环境、构图还是排除控制，再选择最直接的调整。
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

interface ReportViewProps {
  role: UserRole;
  view: "class" | "student";
  setView: (view: "class" | "student") => void;
  totalScore: number;
  busy: string | null;
  onGenerate: () => void;
  onEvidence: () => void;
  onToast: (message: string) => void;
  teacherReportData?: WorkspaceReportData | null;
  studentReportData?: StudentGrowthReportSummary | null;
  studentCourseData?: StudentCourseSummary | null;
}

function ReportView({
  role,
  view,
  setView,
  totalScore,
  busy,
  onGenerate,
  onEvidence,
  onToast,
  teacherReportData,
  studentReportData,
  studentCourseData,
}: ReportViewProps) {
  const ethicsReport =
    studentCourseData?.id === "course-ai-ethics"
      ? getTeacherReport("report-ai-ethics-2401")
      : null;
  const reportData = teacherReportData ?? ethicsReport ?? {
    completionRate: report.completionRate,
    completedCount: 34,
    averageScore: report.averageScore,
    scoreDelta: 4.2,
    aiReviewRate: report.aiReviewRate,
    reviewCount: 8,
    difficultyFit: report.difficultyFit,
    commonError: "把负向提示词写成与目标无关的通用词，无法针对画面偏差进行控制。",
    distribution: scoreDistribution,
    mastery: knowledgePoints.map((point) => ({ name: point.name, value: point.mastery })),
    recommendations: report.recommendations,
    students: [
      { name: "林一诺", score: 88, status: "待复核", point: "负向提示词" },
      { name: "周子墨", score: 93, status: "已完成", point: "迭代与评估" },
      { name: "陈予安", score: 76, status: "异常", point: "画面控制" },
    ],
    generatedAt: "2026/07/13",
    title: "第 3 课课堂诊断",
  };
  const maxCount = Math.max(
    ...reportData.distribution.map((item) => item.count),
  );
  const activeView = role === "student" ? "student" : view;
  const displayScore = studentReportData?.score ?? totalScore;
  return (
    <div className="page page-report">
      <WorkspaceHeader
        className="report-hero"
        tone="report"
        eyebrow={
          <>
            <Sparkles size={15} /> {studentCourseData?.name ?? (teacherReportData?.classId === "class-ai-ethics-2401" ? "AI 创作伦理与安全" : "生成式视觉设计")} · {reportData.generatedAt}
          </>
        }
        title={role === "teacher" ? "教学报告" : "成长报告"}
        description={
          role === "teacher"
            ? "查看班级与学生的测评结论、证据和可执行教学建议。"
            : "查看个人能力、作品变化、评分证据和下一步学习建议。"
        }
        actions={
          role === "teacher" ? (
            <div className="report-header-actions">
              <button className="secondary-button" type="button" onClick={onEvidence}>
                <ScanSearch size={15} /> 查看报告证据
              </button>
              <div className="report-toggle">
              <button
                type="button"
                className={activeView === "class" ? "active" : ""}
                onClick={() => setView("class")}
              >
                <UsersRound size={16} /> 班级报告
              </button>
              <button
                type="button"
                className={activeView === "student" ? "active" : ""}
                onClick={() => setView("student")}
              >
                <UserRound size={16} /> 学生报告
              </button>
              </div>
            </div>
          ) : (
            <div className="report-header-actions">
              <button className="secondary-button" type="button" onClick={onEvidence}>
                <ScanSearch size={15} /> 查看评分证据
              </button>
              <span className="student-report-tag">
                <UserRound size={16} /> 我的成长报告
              </span>
            </div>
          )
        }
      />

      {activeView === "class" ? (
        <>
          <div className="report-metrics">
            <MetricCard
              label="提交完成率"
              value={`${reportData.completionRate}%`}
              note={`${reportData.completedCount} 人已完成`}
              tone="green"
            />
            <MetricCard
              label="班级平均分"
              value={reportData.averageScore.toFixed(1)}
              note={`较上次 +${reportData.scoreDelta}`}
              tone="coral"
            />
            <MetricCard
              label="需要人工复核"
              value={`${reportData.aiReviewRate}%`}
              note={`${reportData.reviewCount} 份边界作品`}
              tone="blue"
            />
            <MetricCard
              label="难度匹配度"
              value={`${reportData.difficultyFit}%`}
              note="挑战适中"
              tone="ink"
            />
          </div>
          <div className="report-grid">
            <section className="card chart-card">
              <div className="card-heading">
                <div>
                  <h3>成绩分布</h3>
                  <p>大多数学生已进入稳定应用阶段</p>
                </div>
                <span className="positive-chip">整体 +4.2</span>
              </div>
              <div className="bar-chart" aria-label="成绩分布柱状图">
                {reportData.distribution.map((item) => (
                  <div className="bar-column" key={item.range}>
                    <span>{item.count}</span>
                    <div>
                      <i
                        style={{ height: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <small>{item.range}</small>
                  </div>
                ))}
              </div>
            </section>
            <section className="card heatmap-card">
              <div className="card-heading">
                <div>
                  <h3>知识点掌握</h3>
                  <p>点击知识点查看诊断依据</p>
                </div>
              </div>
              <div className="mastery-list">
                {reportData.mastery.map((point) => (
                  <button
                    type="button"
                    key={point.name}
                    onClick={() =>
                      onToast(
                        `${point.name}：${point.value}% 掌握，已切换到当前班级报告证据`,
                      )
                    }
                  >
                    <span>
                      <strong>{point.name}</strong>
                      <small>
                        {point.value >= 75
                          ? "掌握良好"
                          : point.value >= 60
                            ? "需要巩固"
                            : "重点补强"}
                      </small>
                    </span>
                    <div>
                      <i style={{ width: `${point.value}%` }} />
                    </div>
                    <b>{point.value}%</b>
                  </button>
                ))}
              </div>
              <div className="common-error">
                <CircleAlert size={17} />
                <div>
                  <strong>最常见误区</strong>
                  <p>{reportData.commonError}</p>
                </div>
              </div>
            </section>
          </div>
          <section className="card report-student-evidence">
            <div className="card-heading">
              <div>
                <h3>学生证据与关注对象</h3>
                <p>名单、成绩和薄弱点随当前班级报告同步切换</p>
              </div>
            </div>
            <div>
              {reportData.students.map((student) => (
                <article key={student.name}>
                  <span>{student.name.slice(0, 1)}</span>
                  <div>
                    <strong>{student.name}</strong>
                    <small>{student.point} · {student.status}</small>
                  </div>
                  <b>{student.score}</b>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="student-report-head card">
            <div className="student-report-person">
              <span>林</span>
              <div>
                <small>AI24018 · {studentCourseData?.name ?? "生成式视觉设计"}</small>
                <h2>林一诺的能力成长报告</h2>
                <p>{studentReportData ? `${studentReportData.focus} · ${studentReportData.progressLabel}` : "已完成 3 次作品迭代，视觉控制能力提升最明显"}</p>
              </div>
            </div>
            <div className="student-total">
              <small>本次综合成绩</small>
              <strong>{displayScore}</strong>
              <span>仅比较本人前后变化 · 较课前提升 9%</span>
            </div>
          </section>
          <div className="student-report-grid">
            <section className="card radar-card">
              <div className="card-heading">
                <div>
                  <h3>五维能力画像</h3>
                  <p>相比课前诊断，综合提升 9%</p>
                </div>
              </div>
              {studentCourseData?.id === "course-ai-ethics" ? (
                <div className="personal-dimension-list">
                  {getCourseRuntimeDefinition(studentCourseData.id).reportDimensions.map((item) => (
                    <article key={item.label}>
                      <div><strong>{item.label}</strong><span>{item.before} → {item.current}</span></div>
                      <div><i style={{ width: `${item.current}%` }} /></div>
                    </article>
                  ))}
                </div>
              ) : (
              <div className="radar-wrap">
                <svg
                  viewBox="0 0 260 230"
                  role="img"
                  aria-label="五维能力雷达图"
                >
                  <g transform="translate(130 112)">
                    {[1, 0.75, 0.5, 0.25].map((scale) => (
                      <polygon
                        key={scale}
                        points={`0,${-92 * scale} ${87 * scale},${-28 * scale} ${54 * scale},${74 * scale} ${-54 * scale},${74 * scale} ${-87 * scale},${-28 * scale}`}
                        fill="none"
                        stroke="#d8ddd7"
                        strokeWidth="1"
                      />
                    ))}
                    <line x1="0" y1="0" x2="0" y2="-92" />
                    <line x1="0" y1="0" x2="87" y2="-28" />
                    <line x1="0" y1="0" x2="54" y2="74" />
                    <line x1="0" y1="0" x2="-54" y2="74" />
                    <line x1="0" y1="0" x2="-87" y2="-28" />
                    <polygon
                      className="radar-before"
                      points="0,-61 55,-18 32,44 -35,48 -61,-20"
                    />
                    <polygon
                      className="radar-after"
                      points="0,-80 75,-24 43,59 -46,64 -70,-23"
                    />
                  </g>
                  <text x="130" y="11">
                    任务理解
                  </text>
                  <text x="225" y="88">
                    提示词结构
                  </text>
                  <text x="183" y="220">
                    视觉表达
                  </text>
                  <text x="24" y="220">
                    创意表现
                  </text>
                  <text x="0" y="88">
                    迭代反思
                  </text>
                </svg>
                <div className="radar-legend">
                  <span>
                    <i className="before" />
                    课前
                  </span>
                  <span>
                    <i className="after" />
                    当前
                  </span>
                </div>
              </div>
              )}
            </section>
            {studentCourseData?.id === "course-ai-ethics" ? (
              <section className="card growth-card ethics-report-evidence">
                <div className="card-heading"><div><h3>风险修订证据</h3><p>只呈现你的方案版本与判断依据</p></div></div>
                <div className="ethics-version-flow">
                  <article><small>方案 v1</small><strong>发现 4 项风险</strong><p>授权缺失、人物隐私、误导内容、无人复核</p></article>
                  <ArrowRight size={18} />
                  <article><small>方案 v2</small><strong>完成 4 项修订</strong><p>补齐来源、脱敏处理、安全说明与人工确认</p></article>
                </div>
                <div className="growth-insight"><Sparkles size={18} /><div><strong>当前薄弱点</strong><p>能够识别风险，但证据核验记录仍不够完整。</p></div></div>
              </section>
            ) : (
            <section className="card growth-card">
              <div className="card-heading">
                <div>
                  <h3>作品迭代轨迹</h3>
                  <p>每次修改都有清晰证据</p>
                </div>
              </div>
              <div className="version-comparison">
                <div>
                  <img
                    src={paperCityTram}
                    alt="学生作品第2版：纸艺未来城市电车"
                  />
                  <span>第 2 版</span>
                </div>
                <ArrowRight size={18} />
                <div>
                  <img
                    src={futureLibrary}
                    alt="学生作品第3版：未来温室图书馆"
                  />
                  <span>第 3 版</span>
                </div>
              </div>
              <div className="growth-insight">
                <Sparkles size={18} />
                <div>
                  <strong>本次关键进步</strong>
                  <p>
                    从堆叠风格词转向控制视觉焦点，提示词更短但画面意图更清晰。
                  </p>
                </div>
              </div>
            </section>
            )}
          </div>
        </>
      )}

      <section className="recommendations-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">下一步行动</span>
            <h2>
              {activeView === "class"
                ? "让建议直接变成教学任务"
                : "为林一诺推荐的学习路径"}
            </h2>
          </div>
          <span className="heading-meta">
            <Sparkles size={16} /> AI 已按优先级排序
          </span>
        </div>
        <div className="recommendation-grid">
          {reportData.recommendations.map((item, index) => (
            <article
              className={`recommendation-card priority-${index + 1}`}
              key={item.title}
            >
              <span className="priority-label">{item.priority}</span>
              <div className="recommendation-icon">
                {index === 0 ? (
                  <CircleAlert size={20} />
                ) : index === 1 ? (
                  <Target size={20} />
                ) : (
                  <Rocket size={20} />
                )}
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <button
                type="button"
                onClick={
                  index === 0
                    ? onGenerate
                    : () => onToast(`已将“${item.title}”加入后续教学计划`)
                }
                disabled={busy === "remediation"}
              >
                {index === 0 && busy === "remediation" ? (
                  <>
                    <span className="spinner dark" /> 正在生成
                  </>
                ) : (
                  <>
                    {item.action} <ArrowRight size={15} />
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrainingCenterView({
  role,
  onToast,
}: {
  role: UserRole;
  onToast: (message: string) => void;
}) {
  const { dispatch: trainingDispatch } = useDemoState();
  const [category, setCategory] = useState<
    "全部" | AiToolCategory
  >("全部");
  const [selectedTool, setSelectedTool] = useState<
    (typeof trainingTools)[number] | null
  >(null);
  const [section, setSection] = useState<"tasks" | "tools" | "ability">(
    role === "teacher" ? "tasks" : "tools",
  );
  const visibleTools =
    category === "全部"
      ? trainingTools
      : trainingTools.filter((tool) => tool.category === category);
  return (
    <div className="page training-page">
      <WorkspaceHeader
        className="training-hero"
        tone="training"
        variant="overview"
        eyebrow={
          <>
            <FlaskConical size={15} /> 独立于课程与班级
          </>
        }
        title="自由实训中心"
        description="自由选择工具、任务和难度。练习成果进入个人作品集，但不会影响课程成绩。"
        summary={
          <div className="training-tool-count">
            <FlaskConical size={22} />
            <strong>{trainingTools.length}</strong>
            <span>类实训工具</span>
          </div>
        }
        actions={
          <>
            <button
              className="primary-button"
              type="button"
              onClick={() => setSelectedTool(trainingTools[1])}
            >
              <Play size={16} fill="currentColor" /> 继续上次实训
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                document
                  .getElementById("tool-square")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              浏览全部工具
            </button>
          </>
        }
      />

      <div className="training-summary">
        <div>
          <span>
            <Clock3 size={17} />
          </span>
          <small>累计实训</small>
          <strong>{role === "teacher" ? "18.6" : "12.4"} 小时</strong>
        </div>
        <div>
          <span>
            <Trophy size={17} />
          </span>
          <small>完成挑战</small>
          <strong>{role === "teacher" ? "21" : "16"} 个</strong>
        </div>
        <div>
          <span>
            <Layers3 size={17} />
          </span>
          <small>个人作品</small>
          <strong>{role === "teacher" ? "14" : "9"} 件</strong>
        </div>
        <div>
          <span>
            <Sparkles size={17} />
          </span>
          <small>能力成长</small>
          <strong>+{role === "teacher" ? "28" : "23"}%</strong>
        </div>
      </div>

      <ContextTabs
        label="自由实训功能"
        value={section}
        onChange={setSection}
        items={
          role === "teacher"
            ? [
                { id: "tasks", label: "培训任务地图", note: "11项任务" },
                { id: "tools", label: "工具广场", note: `${trainingTools.length}类工具` },
                { id: "ability", label: "AI能力报告", note: "L1—L4" },
              ]
            : [
                { id: "tools", label: "工具广场", note: `${trainingTools.length}类工具` },
                { id: "tasks", label: "推荐任务", note: "按能力进阶" },
              ]
        }
      />

      {section === "tasks" && <TrainingTaskMap onToast={onToast} />}
      {section === "ability" && role === "teacher" && (
        <TeacherAbilityView onToast={onToast} />
      )}

      {section === "tools" && (
        <>
          <section id="tool-square" className="tool-square">
            <div className="tool-square-head">
              <div>
                <span className="section-kicker">实训工具广场</span>
                <h2>{trainingTools.length} 种前沿工具，一个练习入口</h2>
                <p>无需加入课程，也无需等待教师发布任务。</p>
              </div>
              <div className="tool-filters">
                {(
                  ["全部", ...aiToolCategories] as const
                ).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? "active" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="tool-grid">
              {visibleTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <article className="tool-card" key={tool.id}>
                    <div className={`tool-icon tool-${tool.color}`}>
                      <Icon size={23} />
                    </div>
                    <div className="tool-card-top">
                      <span>{tool.category}</span>
                      <em>{tool.level}</em>
                    </div>
                    <h3>{tool.name}</h3>
                    <p>{tool.description}</p>
                    <div className="tool-tags">
                      {tool.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div className="tool-card-footer">
                      <small>
                        <UsersRound size={13} /> {tool.users} 人练过
                      </small>
                      <button
                        type="button"
                        onClick={() => setSelectedTool(tool)}
                      >
                        进入实训 <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="free-practice-strip">
            <div>
              <span>
                <Rocket size={20} />
              </span>
              <div>
                <strong>找不到合适的任务？</strong>
                <p>
                  输入你想练习的能力，AI 会组合工具并生成一条 15–30
                  分钟的实训路径。
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onToast("AI 已生成：文生图提示控制 · 20 分钟自由实训路径")
              }
            >
              <WandSparkles size={16} /> AI 帮我设计实训
            </button>
          </section>
        </>
      )}

      {selectedTool && (
        <div
          className="tool-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedTool(null);
          }}
        >
          <section
            className="tool-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedTool.name}实训启动`}
          >
            <button
              className="dialog-close"
              type="button"
              onClick={() => setSelectedTool(null)}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <div className={`dialog-tool-icon tool-${selectedTool.color}`}>
              {(() => {
                const Icon = selectedTool.icon;
                return <Icon size={25} />;
              })()}
            </div>
            <span className="section-kicker">自由实训 · 不计课程成绩</span>
            <h2>{selectedTool.name}</h2>
            <p>{selectedTool.description}</p>
            <div className="starter-task">
              <span>
                <Target size={17} />
              </span>
              <div>
                <strong>推荐起步任务</strong>
                <p>
                  {selectedTool.starterTask}
                </p>
              </div>
            </div>
            <div className="dialog-options">
              <button type="button" onClick={() => onToast("难度已设为入门")}>
                入门难度 <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => onToast("练习时长已设为20分钟")}
              >
                20 分钟 <ChevronDown size={14} />
              </button>
            </div>
            <button
              className="primary-button wide"
              type="button"
              onClick={() => {
                if (role === "teacher") {
                  trainingDispatch({
                    type: "ADD_TEACHER_PRACTICE_RECORD",
                    toolId: selectedTool.id,
                    toolName: selectedTool.name,
                    task: selectedTool.starterTask,
                  });
                }
                onToast(
                  role === "teacher"
                    ? `${selectedTool.name}模拟实训已完成，成果已回流“我的成长”`
                    : `${selectedTool.name}已启动，练习过程将保存到个人作品集`,
                );
                setSelectedTool(null);
              }}
            >
              <Play size={16} fill="currentColor" /> 开始自由实训
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <span className="metric-dot" />
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

export default App;
