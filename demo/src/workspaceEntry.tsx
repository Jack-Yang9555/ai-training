import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  FlaskConical,
  GraduationCap,
  ListChecks,
  Play,
  SearchCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { EmptyState, WorkspaceHeader } from "./ui";
import {
  getStudentCourse,
  getTeacherClass,
  studentAssessments,
  studentCourses,
  studentGrowthReports,
  studentLearningTasks,
  teacherAssessments,
  teacherClasses,
  teacherReports,
  type AssessmentWorkspaceSummary,
  type StudentCourseSummary,
  type TeacherClassSummary,
  type WorkspaceSelection,
} from "./workspaceData";
import type { UserRole } from "./types";

type TeacherClassIntent = "teach" | "prepare" | "learn" | "report";

const statusTone = (status: string) => `status-${status}`;

function StageTaskCard({
  icon: Icon,
  label,
  title,
  description,
  meta,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  tone,
}: {
  icon: typeof BookOpen;
  label: string;
  title: string;
  description: string;
  meta: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tone: "teach" | "learn" | "assess" | "report" | "research" | "training";
}) {
  return (
    <article className={`task-entry-card tone-${tone}`}>
      <div className="task-entry-card-heading">
        <span className="task-entry-icon">
          <Icon size={19} />
        </span>
        <div>
          <span>{label}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <p>{description}</p>
      <div className="task-entry-meta">{meta}</div>
      <div className="task-entry-actions">
        <button className="primary-button" type="button" onClick={onAction}>
          {actionLabel} <ArrowRight size={15} />
        </button>
        {secondaryLabel && onSecondary && (
          <button
            className="secondary-button"
            type="button"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </article>
  );
}

export function TeacherRoleHome({
  onClassAction,
  onAssessmentAction,
  onResearch,
  onTraining,
  onGrowth,
}: {
  onClassAction: (classId: string, intent: TeacherClassIntent) => void;
  onAssessmentAction: (assessmentId: string) => void;
  onResearch: () => void;
  onTraining: () => void;
  onGrowth: () => void;
}) {
  const liveClass =
    teacherClasses.find((item) => item.status === "live") ?? teacherClasses[0];
  const attentionClass = [...teacherClasses].sort(
    (left, right) => right.alerts - left.alerts,
  )[0];
  const assessmentPriority = {
    grading: 0,
    "in-progress": 1,
    draft: 2,
    completed: 3,
    scheduled: 4,
  } as const;
  const priorityAssessment = [...teacherAssessments].sort(
    (left, right) =>
      assessmentPriority[left.status] - assessmentPriority[right.status],
  )[0];
  const latestReport =
    teacherReports.find((item) => item.classId === liveClass.id) ??
    teacherReports[0];

  return (
    <section className="role-home">
      <WorkspaceHeader
        title="教师工作台"
        description="从正在发生的课堂、需要关注的班级和待处理测评开始，直接进入今天最重要的教学工作。"
        eyebrow="今日工作 · 6 类核心任务"
        variant="overview"
        summary={
          <div className="home-summary">
            <strong>3</strong>
            <span>项优先待办</span>
          </div>
        }
        actions={
          <button className="primary-button" type="button" onClick={onGrowth}>
            <Sparkles size={16} /> 进入我的成长
          </button>
        }
      />
      <div className="task-home-grid">
        <StageTaskCard
          icon={BookOpen}
          label="教 · 智能教学"
          title={`${liveClass.name}正在上课`}
          description={`${liveClass.courseName} · ${liveClass.lesson}`}
          meta={`${liveClass.schedule} · ${liveClass.students} 名学生`}
          actionLabel="进入课堂"
          onAction={() => onClassAction(liveClass.id, "teach")}
          secondaryLabel="智能备课"
          onSecondary={() => onClassAction(liveClass.id, "prepare")}
          tone="teach"
        />
        <StageTaskCard
          icon={BrainCircuit}
          label="学 · 学习促进"
          title={`${attentionClass.alerts} 名学生需要关注`}
          description={`${attentionClass.name}参与度 ${attentionClass.participation}%，当前重点是${attentionClass.learningFocus}。`}
          meta={`本课进度 ${attentionClass.progress}% · 过程证据持续更新`}
          actionLabel="查看班级态势"
          onAction={() => onClassAction(attentionClass.id, "learn")}
          tone="learn"
        />
        <StageTaskCard
          icon={ListChecks}
          label="测 · 测评管理"
          title={priorityAssessment.title}
          description={`${priorityAssessment.progress}，按当前状态直接进入核心处理工作区。`}
          meta={`${priorityAssessment.statusLabel} · ${priorityAssessment.schedule}`}
          actionLabel={priorityAssessment.primaryAction}
          onAction={() => onAssessmentAction(priorityAssessment.id)}
          tone="assess"
        />
        <StageTaskCard
          icon={BarChart3}
          label="评 · 教学诊断"
          title={latestReport.title}
          description="最新课堂报告已生成，包含知识掌握、共性误区和下一步教学建议。"
          meta={`提交率 ${latestReport.completionRate}% · 平均分 ${latestReport.averageScore} · ${liveClass.alerts} 项行动信号`}
          actionLabel="查看教学报告"
          onAction={() => onClassAction(liveClass.id, "report")}
          tone="report"
        />
        <StageTaskCard
          icon={SearchCheck}
          label="研 · AI 研究"
          title="教学反馈行动研究待补充证据"
          description="围绕真实教学问题组合检索、文献、数据分析和 AI 应用工具，形成可复核研究成果。"
          meta="进行中 1 项 · 已整理 18 / 30 条证据"
          actionLabel="进入研究工作台"
          onAction={onResearch}
          tone="research"
        />
        <StageTaskCard
          icon={FlaskConical}
          label="练 · 自由实训"
          title="继续创建课程知识库"
          description="完成上游知识底座后，可继续解锁知识图谱、AI 助教和智能命题任务。"
          meta="已完成 1 / 11 项 · 建议用时 20 分钟"
          actionLabel="继续培训任务"
          onAction={onTraining}
          tone="training"
        />
      </div>
    </section>
  );
}

export function StudentRoleHome({
  activeCourseId,
  onCourseAction,
  onAssessmentAction,
  onReport,
  onTraining,
}: {
  activeCourseId?: string | null;
  onCourseAction: (courseId: string, intent: "teach" | "learn") => void;
  onAssessmentAction: (assessmentId: string) => void;
  onReport: (courseId: string) => void;
  onTraining: () => void;
}) {
  const activeCourse =
    getStudentCourse(activeCourseId ?? null) ??
    studentCourses.find((item) => item.status === "active") ??
    studentCourses[0];
  const priorityTask = [...studentLearningTasks]
    .filter((item) => item.status !== "completed")
    .sort((left, right) => left.priority - right.priority)[0];
  const readyAssessment =
    studentAssessments.find((item) => item.status === "in-progress") ??
    studentAssessments.find((item) => item.status === "scheduled") ??
    studentAssessments[0];
  const latestReport = studentGrowthReports[0];

  return (
    <section className="role-home student-role-home">
      <WorkspaceHeader
        title="我的学习台"
        description="先完成今天最重要的课程、学习任务和测评，再查看成长反馈或进入自由实训。"
        eyebrow="林一诺 · 今日学习"
        variant="overview"
        tone="learn"
        summary={
          <div className="home-summary learn-summary">
            <strong>2</strong>
            <span>项待完成</span>
          </div>
        }
      />
      <div className="task-home-grid">
        <StageTaskCard
          icon={BookOpen}
          label="教 · 课程导学"
          title={activeCourse.nextLesson}
          description={`${activeCourse.name} · ${activeCourse.teacher}`}
          meta={activeCourse.schedule}
          actionLabel="查看课程导学"
          onAction={() => onCourseAction(activeCourse.id, "teach")}
          tone="teach"
        />
        <StageTaskCard
          icon={BrainCircuit}
          label="学 · 个性化学习"
          title={priorityTask.title}
          description={priorityTask.description}
          meta={`${priorityTask.dueAt} · 当前进度 ${priorityTask.progress}%`}
          actionLabel="继续学习"
          onAction={() => onCourseAction(activeCourse.id, "learn")}
          tone="learn"
        />
        <StageTaskCard
          icon={ListChecks}
          label="测 · 我的测评"
          title={readyAssessment.title}
          description="完成客观题与作品题后，可立即查看评分证据和学习反馈。"
          meta={`${readyAssessment.schedule} · ${readyAssessment.progress}`}
          actionLabel={readyAssessment.primaryAction}
          onAction={() => onAssessmentAction(readyAssessment.id)}
          tone="assess"
        />
        <StageTaskCard
          icon={BarChart3}
          label="评 · 成长报告"
          title={latestReport.title}
          description="查看能力变化、作品迭代证据和下一步补强建议。"
          meta={`综合成绩 ${latestReport.score} · ${latestReport.progressLabel}`}
          actionLabel="查看成长报告"
          onAction={() => onReport(activeCourse.id)}
          tone="report"
        />
        <StageTaskCard
          icon={FlaskConical}
          label="练 · 自由实训"
          title="继续提示词实验室"
          description="独立练习不会影响课程成绩，过程与作品会进入个人作品集。"
          meta="上次练习 12 分钟 · 已保存 3 个模板"
          actionLabel="继续自由实训"
          onAction={onTraining}
          tone="training"
        />
      </div>
    </section>
  );
}

function ClassCard({
  classroom,
  intent,
  onSelect,
}: {
  classroom: TeacherClassSummary;
  intent: "teach" | "learn" | "report";
  onSelect: (classId: string, intent: TeacherClassIntent) => void;
}) {
  const action =
    intent === "learn"
      ? "查看班级态势"
      : intent === "report"
        ? "查看教学报告"
        : classroom.status === "preparing"
          ? "开始备课"
          : "进入课堂";
  const nextIntent: TeacherClassIntent =
    intent === "teach" && classroom.status === "preparing" ? "prepare" : intent;

  return (
    <article className="workspace-object-card">
      <div className="workspace-object-heading">
        <span className={`object-status ${statusTone(classroom.status)}`}>
          {classroom.statusLabel}
        </span>
        <span>{classroom.schedule}</span>
      </div>
      <h2>{classroom.name}</h2>
      <p>{classroom.courseName}</p>
      <strong>{classroom.lesson}</strong>
      <div className="workspace-object-metrics">
        <span>
          <Users size={14} /> {classroom.students} 人
        </span>
        <span>
          <Sparkles size={14} /> 进度 {classroom.progress}%
        </span>
        <span>
          <AlertTriangle size={14} /> {classroom.alerts} 项关注
        </span>
      </div>
      <div className="workspace-object-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => onSelect(classroom.id, nextIntent)}
        >
          {action} <ArrowRight size={15} />
        </button>
        {intent === "teach" && classroom.status !== "preparing" && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSelect(classroom.id, "prepare")}
          >
            智能备课
          </button>
        )}
      </div>
    </article>
  );
}

export function TeacherClassSelector({
  intent,
  onSelect,
}: {
  intent: "teach" | "learn" | "report";
  onSelect: (classId: string, intent: TeacherClassIntent) => void;
}) {
  const title =
    intent === "teach"
      ? "智能教学"
      : intent === "learn"
        ? "学习促进"
        : "教学诊断";
  const description =
    intent === "teach"
      ? "选择正在上课、即将开始或需要备课的班级，直接进入本次教学工作。"
      : intent === "learn"
        ? "选择班级查看当前课堂现状、学习证据和需要教师行动的信号。"
        : "选择班级查看最近测评报告、共性误区与可执行教学建议。";

  return (
    <section className="workspace-object-selector">
      <WorkspaceHeader
        title={title}
        description={description}
        eyebrow="先选择本次工作的班级"
        tone={
          intent === "learn"
            ? "learn"
            : intent === "report"
              ? "report"
              : "teach"
        }
      />
      <div className="workspace-object-grid">
        {teacherClasses.map((classroom) => (
          <ClassCard
            key={classroom.id}
            classroom={classroom}
            intent={intent}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function AssessmentCard({
  assessment,
  onSelect,
}: {
  assessment: AssessmentWorkspaceSummary;
  onSelect: (assessmentId: string) => void;
}) {
  const classroom = getTeacherClass(assessment.classId);
  return (
    <article className="workspace-object-card assessment-object-card">
      <div className="workspace-object-heading">
        <span className={`object-status ${statusTone(assessment.status)}`}>
          {assessment.statusLabel}
        </span>
        <span>{assessment.scene}</span>
      </div>
      <h2>{assessment.title}</h2>
      <p>{classroom?.name ?? "当前课程"}</p>
      <strong>{assessment.progress}</strong>
      <div className="workspace-object-metrics">
        <span>
          <Clock3 size={14} /> {assessment.schedule}
        </span>
      </div>
      <button
        className="primary-button"
        type="button"
        onClick={() => onSelect(assessment.id)}
      >
        {assessment.primaryAction} <ArrowRight size={15} />
      </button>
    </article>
  );
}

export function TeacherAssessmentSelector({
  classId,
  onSelect,
  onOpenTool,
}: {
  classId: string | null;
  onSelect: (assessmentId: string) => void;
  onOpenTool: (tool: "generate" | "bank" | "training") => void;
}) {
  const scoped = classId
    ? teacherAssessments.filter((item) => item.classId === classId)
    : teacherAssessments;

  return (
    <section className="workspace-object-selector">
      <WorkspaceHeader
        title="测评管理"
        description="按状态选择一套试卷或考试任务，直接进入组卷、考试进度、AI 批改或评分复核。"
        eyebrow={classId ? "当前班级的测评任务" : "全部班级 · 4 类测评状态"}
        tone="assess"
      />
      <section className="assessment-common-tools" aria-labelledby="common-assessment-tools">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">课程级能力</span>
            <h2 id="common-assessment-tools">常用创建工具</h2>
          </div>
          <p>不绑定具体试卷，创建后再选择适用班级。</p>
        </div>
        <div>
          <button type="button" onClick={() => onOpenTool("generate")}>
            <Sparkles size={18} />
            <span><strong>智能出题</strong><small>按目标与难度生成题目</small></span>
            <ArrowRight size={15} />
          </button>
          <button type="button" onClick={() => onOpenTool("bank")}>
            <ListChecks size={18} />
            <span><strong>课程题库</strong><small>检索、筛选与复用题目</small></span>
            <ArrowRight size={15} />
          </button>
          <button type="button" onClick={() => onOpenTool("training")}>
            <FlaskConical size={18} />
            <span><strong>实训方案</strong><small>设计作品型测评任务</small></span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
      <div className="workspace-title assessment-task-title">
        <div>
          <span className="section-kicker">按状态直达</span>
          <h2>测评任务列表</h2>
        </div>
      </div>
      {scoped.length ? (
        <div className="workspace-object-grid assessment-object-grid">
          {scoped.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListChecks size={24} />}
          title="当前班级暂无测评任务"
          description="可以切换班级，或进入智能组卷创建一套新的课程测评。"
        />
      )}
    </section>
  );
}

function CourseCard({
  course,
  intent,
  onSelect,
}: {
  course: StudentCourseSummary;
  intent: "teach" | "learn";
  onSelect: (courseId: string, intent: "teach" | "learn") => void;
}) {
  return (
    <article className="workspace-object-card course-object-card">
      <div className="workspace-object-heading">
        <span
          className={`object-status ${course.status === "active" ? "status-live" : "status-upcoming"}`}
        >
          {course.status === "active" ? "学习中" : "待开课"}
        </span>
        <span>{course.teacher}</span>
      </div>
      <h2>{course.name}</h2>
      <p>{course.nextLesson}</p>
      <strong>{course.taskLabel}</strong>
      <div className="workspace-object-metrics">
        <span>
          <Clock3 size={14} /> {course.schedule}
        </span>
        <span>
          <Sparkles size={14} /> 进度 {course.progress}%
        </span>
      </div>
      <button
        className="primary-button"
        type="button"
        onClick={() => onSelect(course.id, intent)}
      >
        {intent === "teach" ? "查看课程导学" : "进入个性化学习"}
        <ArrowRight size={15} />
      </button>
    </article>
  );
}

export function StudentCourseSelector({
  intent,
  onSelect,
}: {
  intent: "teach" | "learn";
  onSelect: (courseId: string, intent: "teach" | "learn") => void;
}) {
  return (
    <section className="workspace-object-selector">
      <WorkspaceHeader
        title={intent === "teach" ? "课程导学" : "个性化学习"}
        description={
          intent === "teach"
            ? "选择一门已加入课程，查看目标、课堂路线、教师导学和课前准备。"
            : "选择当前学习课程，继续教师任务、个性化路径和作品迭代。"
        }
        eyebrow="先选择本次学习的课程"
        tone={intent === "learn" ? "learn" : "teach"}
      />
      <div className="workspace-object-grid">
        {studentCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            intent={intent}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function StudentAssessmentSelector({
  courseId,
  onSelect,
}: {
  courseId: string | null;
  onSelect: (assessmentId: string) => void;
}) {
  const course = getStudentCourse(courseId);
  const scoped = courseId
    ? studentAssessments.filter((item) => item.classId === course?.classId)
    : studentAssessments;

  return (
    <section className="workspace-object-selector">
      <WorkspaceHeader
        title="我的测评"
        description="选择待完成或进行中的测评开始作答，已完成测评可直接查看结果与成长反馈。"
        eyebrow={course ? course.name : "全部课程 · 按优先级排列"}
        tone="assess"
      />
      {scoped.length ? (
        <div className="workspace-object-grid assessment-object-grid">
          {scoped.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircle2 size={24} />}
          title="当前课程暂无测评"
          description="课程开始或教师发布测评后，会在这里显示开始时间和作答入口。"
        />
      )}
    </section>
  );
}

export function StudentReportSelector({
  courseId,
  onSelect,
}: {
  courseId: string | null;
  onSelect: (reportId: string, courseId: string) => void;
}) {
  const course = getStudentCourse(courseId);
  const completed = studentAssessments.filter(
    (item) =>
      item.status === "completed" &&
      (!course || item.classId === course.classId),
  );

  return (
    <section className="workspace-object-selector">
      <WorkspaceHeader
        title="成长报告"
        description="按课程查看最近测评反馈、能力变化、作品证据和下一步学习建议。"
        eyebrow={course ? course.name : "选择一份已生成的学习报告"}
        tone="report"
      />
      {completed.length ? (
        <div className="workspace-object-grid">
          {completed.map((assessment) => (
            <article className="workspace-object-card" key={assessment.id}>
              <div className="workspace-object-heading">
                <span className="object-status status-completed">已生成</span>
                <span>{assessment.schedule}</span>
              </div>
              <h2>{assessment.title}</h2>
              <p>生成式视觉设计 · 阶段学习报告</p>
              <strong>{assessment.progress}</strong>
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  onSelect(
                    assessment.reportId ?? "report-student-visual",
                    "course-visual-design",
                  )
                }
              >
                查看成长报告 <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BarChart3 size={24} />}
          title="当前课程暂无成长报告"
          description="完成课程测评或作品任务后，系统会基于评分证据生成成长报告。"
        />
      )}
    </section>
  );
}

export function TeacherReportLanding({
  onSelectClass,
  onOpenOperations,
  onOpenProfile,
  onOpenAbility,
}: {
  onSelectClass: (classId: string, intent: TeacherClassIntent) => void;
  onOpenOperations: () => void;
  onOpenProfile: () => void;
  onOpenAbility: () => void;
}) {
  return (
    <section className="workspace-object-selector report-object-landing">
      <WorkspaceHeader
        title="教学诊断"
        description="先选择要处理的报告对象；班级报告、助教运营、学生画像和个人 AI 能力使用各自正确的数据范围。"
        eyebrow="报告按班级、课程、学生与个人作用域组织"
        tone="report"
      />
      <div className="workspace-object-grid report-object-grid">
        {teacherClasses.map((classroom) => {
          const report = teacherReports.find(
            (item) => item.classId === classroom.id,
          );
          return (
            <article className="workspace-object-card" key={classroom.id}>
              <div className="workspace-object-heading">
                <span className="object-status status-completed">已生成</span>
                <span>{report?.generatedAt}</span>
              </div>
              <h2>{report?.title ?? classroom.reportLabel}</h2>
              <p>{classroom.name}</p>
              <strong>
                提交率 {report?.completionRate}% · 平均分 {report?.averageScore}
              </strong>
              <button
                className="primary-button"
                type="button"
                onClick={() => onSelectClass(classroom.id, "report")}
              >
                查看教学报告 <ArrowRight size={15} />
              </button>
            </article>
          );
        })}
        <article className="workspace-object-card report-scope-card">
          <span className="object-status status-live">课程作用域</span>
          <h2>助教运营报告</h2>
          <p>生成式视觉设计 · 课程 AI 助教</p>
          <strong>解决率、知识库命中率与人工接管</strong>
          <button className="secondary-button" type="button" onClick={onOpenOperations}>
            查看运营报告
          </button>
        </article>
        <article className="workspace-object-card report-scope-card">
          <span className="object-status status-upcoming">学生作用域</span>
          <h2>学生画像</h2>
          <p>先进入默认教学班级，再选择学生</p>
          <strong>长期学习证据与干预记录</strong>
          <button className="secondary-button" type="button" onClick={onOpenProfile}>
            选择学生画像
          </button>
        </article>
        <article className="workspace-object-card report-scope-card">
          <span className="object-status status-completed">个人作用域</span>
          <h2>教师 AI 能力</h2>
          <p>周岚老师 · 不依赖班级选择</p>
          <strong>任务产物、能力维度与成长等级</strong>
          <button className="secondary-button" type="button" onClick={onOpenAbility}>
            查看能力报告
          </button>
        </article>
      </div>
    </section>
  );
}

export function ActiveContextBar({
  label,
  title,
  detail,
  onChange,
  changeLabel,
}: {
  label: string;
  title: string;
  detail: string;
  onChange: () => void;
  changeLabel: string;
}) {
  return (
    <div className="active-context-bar">
      <div>
        <span>{label}</span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <button className="secondary-button" type="button" onClick={onChange}>
        {changeLabel}
      </button>
    </div>
  );
}

export function GlobalContextSwitcher({
  role,
  selection,
  open,
  onToggle,
  onClose,
  onSelectClass,
  onSelectCourse,
}: {
  role: UserRole;
  selection: WorkspaceSelection;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectClass: (classId: string) => void;
  onSelectCourse: (courseId: string) => void;
}) {
  const teacherClass = getTeacherClass(selection.selectedClassId);
  const studentCourse = getStudentCourse(selection.selectedCourseId);
  const title =
    role === "teacher"
      ? (teacherClass?.courseName ?? "选择课程与班级")
      : (studentCourse?.name ?? "选择我的课程");
  const eyebrow =
    role === "teacher"
      ? (teacherClass?.name ?? "尚未选择工作对象")
      : studentCourse
        ? `${studentCourse.teacher} · ${studentCourse.taskLabel}`
        : "尚未选择学习课程";

  return (
    <div className="global-context-switcher">
      <button
        type="button"
        className="context-button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onToggle}
      >
        <span className="context-icon">
          {role === "teacher" ? (
            <GraduationCap size={16} />
          ) : (
            <BookOpen size={16} />
          )}
        </span>
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div
          className="context-switcher-panel"
          role="dialog"
          aria-label="切换工作对象"
        >
          <div className="context-switcher-heading">
            <div>
              <span>{role === "teacher" ? "教学班级" : "我的课程"}</span>
              <strong>切换后将同步更新当前工作上下文</strong>
            </div>
            <button
              type="button"
              aria-label="关闭工作对象选择"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
          <div className="context-switcher-list">
            {role === "teacher"
              ? teacherClasses.map((classroom) => (
                  <button
                    type="button"
                    key={classroom.id}
                    className={
                      selection.selectedClassId === classroom.id ? "active" : ""
                    }
                    onClick={() => onSelectClass(classroom.id)}
                  >
                    <span
                      className={`object-status ${statusTone(classroom.status)}`}
                    >
                      {classroom.statusLabel}
                    </span>
                    <span>
                      <strong>{classroom.name}</strong>
                      <small>{classroom.lesson}</small>
                    </span>
                  </button>
                ))
              : studentCourses.map((course) => (
                  <button
                    type="button"
                    key={course.id}
                    className={
                      selection.selectedCourseId === course.id ? "active" : ""
                    }
                    onClick={() => onSelectCourse(course.id)}
                  >
                    <span
                      className={`object-status ${course.status === "active" ? "status-live" : "status-upcoming"}`}
                    >
                      {course.status === "active" ? "学习中" : "待开课"}
                    </span>
                    <span>
                      <strong>{course.name}</strong>
                      <small>{course.nextLesson}</small>
                    </span>
                  </button>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AssessmentProgressWorkspace({
  assessment,
  onOpenReview,
}: {
  assessment: AssessmentWorkspaceSummary;
  onOpenReview: () => void;
}) {
  const classroom = getTeacherClass(assessment.classId);
  return (
    <section className="assessment-progress-workspace">
      <WorkspaceHeader
        title="考试进度"
        description={`${classroom?.name ?? "当前班级"} · ${assessment.title}。实时查看提交状态、异常行为与结束后的评分入口。`}
        eyebrow={`${assessment.statusLabel} · ${assessment.scene}`}
        tone="assess"
        actions={
          <button
            className="primary-button"
            type="button"
            onClick={onOpenReview}
          >
            提前查看评分规则
          </button>
        }
      />
      <div className="assessment-live-metrics">
        <article>
          <Users size={18} />
          <span>已提交</span>
          <strong>31 / 36</strong>
        </article>
        <article>
          <Play size={18} />
          <span>作答中</span>
          <strong>5 人</strong>
        </article>
        <article>
          <AlertTriangle size={18} />
          <span>异常信号</span>
          <strong>0 项</strong>
        </article>
        <article>
          <Clock3 size={18} />
          <span>距离结束</span>
          <strong>12 分钟</strong>
        </article>
      </div>
      <div className="assessment-progress-panel">
        <div>
          <span>当前完成率</span>
          <strong>86%</strong>
        </div>
        <div className="assessment-progress-track">
          <span style={{ width: "86%" }} />
        </div>
        <p>所有学生均已进入测评，5 人仍在完成创作实操题。</p>
      </div>
    </section>
  );
}

export function UpcomingCourseWorkspace({
  course,
  onChange,
  variant,
}: {
  course: StudentCourseSummary;
  onChange: () => void;
  variant: "guide" | "learning";
}) {
  const isGuide = variant === "guide";
  return (
    <section className="upcoming-course-workspace">
      <WorkspaceHeader
        title={isGuide ? "课程导学" : "个性化学习"}
        description={
          isGuide
            ? `${course.name} · ${course.teacher}。先了解课程目标、开课安排与可用课前资源。`
            : `${course.name}尚未开课，当前没有教师任务、个性化路径或作品练习。`
        }
        eyebrow="待开课课程"
        tone={isGuide ? "teach" : "learn"}
      />
      {isGuide ? (
        <div className="upcoming-guide-grid">
          <section className="card upcoming-guide-card">
            <span className="section-kicker">课程目标</span>
            <h2>{course.nextLesson}</h2>
            <ul>
              {course.objectives.map((objective) => (
                <li key={objective}><CheckCircle2 size={16} /> {objective}</li>
              ))}
            </ul>
          </section>
          <section className="card upcoming-guide-card">
            <span className="section-kicker">课前可用资源</span>
            <h2>{course.schedule}</h2>
            <div className="upcoming-resource-list">
              {course.resources.map((resource) => <span key={resource}>{resource}</span>)}
            </div>
            <button className="secondary-button" type="button" onClick={onChange}>
              切换其他课程
            </button>
          </section>
        </div>
      ) : (
        <EmptyState
          icon={<FileCheck2 size={24} />}
          title="课程尚未开始，暂无学习任务"
          description={`${course.schedule}。开课后，教师任务和个性化学习路径会在这里出现。`}
          action={
            <button className="secondary-button" type="button" onClick={onChange}>
              返回选择其他课程
            </button>
          }
        />
      )}
    </section>
  );
}
