import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  FileStack,
  FileText,
  GraduationCap,
  Layers3,
  ListChecks,
  Network,
  Play,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { KnowledgeBaseView, KnowledgeGraphView } from "./capabilities";
import { useDemoState } from "./demoState";
import { useEvidenceCenter } from "./evidenceCenter";
import { aiDemoService } from "./services/aiDemoService";
import type { CourseResource, TeachingContext } from "./types";
import { WorkspaceHeader } from "./ui";
import type { TeacherClassSummary } from "./workspaceData";

type Toast = (message: string) => void;

const resourceKindIcon = {
  课程标准: BookOpenCheck,
  课程大纲: FileText,
  课程讲义: FileText,
  教学课件: Layers3,
  案例集: FileStack,
  习题集: ListChecks,
  评分量规: CheckCircle2,
  情境化教案: WandSparkles,
  课堂活动包: Layers3,
  配套题目集: ListChecks,
  教学进度方案: Clock3,
} as const;

function findLesson(state: ReturnType<typeof useDemoState>["state"]) {
  return (
    state.standardCourse.units
      .flatMap((unit) => unit.lessons)
      .find((lesson) => lesson.id === state.selectedStandardLessonId) ??
    state.standardCourse.units[0].lessons[0]
  );
}

export function SmartPrepareView({
  onAccepted,
  onToast,
}: {
  onAccepted: () => void;
  onToast: Toast;
}) {
  const { state, dispatch } = useDemoState();
  const { openEvidence } = useEvidenceCenter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const lesson = findLesson(state);
  const generated = state.generatedPlan;

  const updateContext = <K extends keyof TeachingContext>(
    key: K,
    value: TeachingContext[K],
  ) => {
    dispatch({
      type: "SET_TEACHING_CONTEXT",
      value: { ...state.teachingContext, [key]: value },
    });
  };

  const generate = async () => {
    setBusy(true);
    const value = await aiDemoService.adaptStandardLesson(
      lesson,
      state.teachingContext,
    );
    dispatch({ type: "SET_GENERATED_PLAN", value });
    setBusy(false);
    setStep(3);
    onToast("AI 已生成情境化方案，并标注 5 项调整依据");
  };

  const accept = () => {
    dispatch({ type: "ACCEPT_ADAPTED_PLAN" });
    onToast("方案已采纳，4 类 AI 资源已作为草稿回流课程资源");
    onAccepted();
  };

  return (
    <div className="page prepare-page">
      <WorkspaceHeader
        className="prepare-hero"
        tone="teach"
        variant="overview"
        eyebrow={
          <>
            <Sparkles size={15} /> 基于标准课生成适配方案
          </>
        }
        title="智能备课"
        description="选择标准课并配置教学对象、时长和重点；AI 会生成有来源、有差异依据的本次教学方案。"
        summary={
          <div className="prepare-source-summary">
            <span>
              <Database size={16} /> 标准课程基线
            </span>
            <strong>{state.standardCourse.title}</strong>
            <small>{state.standardCourse.version} · 4 个单元 · 8 个课次</small>
          </div>
        }
      />

      <nav className="prepare-stepper" aria-label="智能备课步骤">
        {[
          { id: 1, title: "选择标准课", note: "确定教学基线" },
          { id: 2, title: "设置教学情境", note: "说明本次怎么教" },
          { id: 3, title: "生成适配方案", note: "对比、采纳并回流" },
        ].map((item) => (
          <button
            type="button"
            className={
              step === item.id ? "active" : step > item.id ? "done" : ""
            }
            onClick={() =>
              item.id < 3 || generated
                ? setStep(item.id as 1 | 2 | 3)
                : undefined
            }
            key={item.id}
          >
            <span>{step > item.id ? <Check size={15} /> : item.id}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.note}</small>
            </div>
          </button>
        ))}
      </nav>

      {step === 1 && (
        <section className="prepare-workspace course-picker-layout">
          <aside className="course-outline card">
            <div className="workspace-title">
              <div>
                <span className="section-kicker">标准课程目录</span>
                <h2>{state.standardCourse.title}</h2>
              </div>
              <span>{state.standardCourse.version}</span>
            </div>
            {state.standardCourse.units.map((unit) => (
              <div className="course-unit" key={unit.id}>
                <strong>{unit.title}</strong>
                {unit.lessons.map((item) => (
                  <button
                    type="button"
                    className={lesson.id === item.id ? "active" : ""}
                    onClick={() =>
                      dispatch({ type: "SELECT_STANDARD_LESSON", id: item.id })
                    }
                    key={item.id}
                  >
                    <span>第 {item.sequence} 课</span>
                    {item.title}
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            ))}
          </aside>
          <div className="standard-lesson-card card">
            <div className="lesson-baseline-head">
              <div>
                <span className="section-kicker">当前教学基线</span>
                <h2>{lesson.title}</h2>
                <p>
                  {
                    state.standardCourse.units.find((unit) =>
                      unit.lessons.some((item) => item.id === lesson.id),
                    )?.title
                  }
                </p>
              </div>
              <div className="baseline-score">
                <strong>L{lesson.difficulty}</strong>
                <small>标准难度</small>
              </div>
            </div>
            <div className="baseline-metrics">
              <div>
                <Clock3 size={17} />
                <span>
                  <strong>{lesson.duration} 分钟</strong>
                  <small>建议课时</small>
                </span>
              </div>
              <div>
                <Target size={17} />
                <span>
                  <strong>{lesson.objectives.length} 项</strong>
                  <small>标准目标</small>
                </span>
              </div>
              <div>
                <Database size={17} />
                <span>
                  <strong>{lesson.resourceIds.length} 份</strong>
                  <small>配套资源</small>
                </span>
              </div>
            </div>
            <div className="baseline-section">
              <strong>标准教学目标</strong>
              <ol>
                {lesson.objectives.map((objective) => (
                  <li key={objective}>
                    <Check size={14} /> {objective}
                  </li>
                ))}
              </ol>
            </div>
            <div className="baseline-section">
              <strong>核心知识点</strong>
              <div className="knowledge-tags">
                {lesson.knowledgePoints.map((point) => (
                  <span key={point}>{point}</span>
                ))}
              </div>
            </div>
            <button
              className="primary-button prepare-next"
              type="button"
              onClick={() => setStep(2)}
            >
              以此课为基线设置情境 <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="prepare-workspace context-config card">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">本次教学情境</span>
              <h2>AI 应该怎样调整“{lesson.title}”？</h2>
              <p>这些信息只影响适配版本，不会修改标准课程。</p>
            </div>
            <button
              className="text-button"
              type="button"
              onClick={() => setStep(1)}
            >
              更换标准课
            </button>
          </div>
          <div className="mode-selector" aria-label="教学场景">
            {(["院校教学", "企业培训"] as const).map((mode) => (
              <button
                type="button"
                className={state.teachingContext.mode === mode ? "active" : ""}
                onClick={() => updateContext("mode", mode)}
                key={mode}
              >
                {mode === "院校教学" ? (
                  <GraduationCap size={19} />
                ) : (
                  <UsersRound size={19} />
                )}
                <span>
                  <strong>{mode}</strong>
                  <small>
                    {mode === "院校教学"
                      ? "按班级、学情与课时组织"
                      : "按岗位、人员与培训周期组织"}
                  </small>
                </span>
                {state.teachingContext.mode === mode && <Check size={16} />}
              </button>
            ))}
          </div>
          <div className="context-form">
            <label>
              <span>教学对象</span>
              <input
                aria-label="教学对象"
                value={state.teachingContext.audience}
                onChange={(event) =>
                  updateContext("audience", event.target.value)
                }
              />
            </label>
            <label>
              <span>基础水平</span>
              <select
                aria-label="基础水平"
                value={state.teachingContext.learnerLevel}
                onChange={(event) =>
                  updateContext(
                    "learnerLevel",
                    event.target.value as TeachingContext["learnerLevel"],
                  )
                }
              >
                <option>基础薄弱</option>
                <option>基础一般</option>
                <option>基础较好</option>
              </select>
            </label>
            <label>
              <span>人数</span>
              <input
                aria-label="学习人数"
                type="number"
                min="1"
                max="200"
                value={state.teachingContext.learnerCount}
                onChange={(event) =>
                  updateContext("learnerCount", Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>授课方式</span>
              <select
                aria-label="授课方式"
                value={state.teachingContext.deliveryMode}
                onChange={(event) =>
                  updateContext(
                    "deliveryMode",
                    event.target.value as TeachingContext["deliveryMode"],
                  )
                }
              >
                <option>线下课堂</option>
                <option>线上直播</option>
                <option>混合式教学</option>
              </select>
            </label>
            <label>
              <span>本次时长</span>
              <select
                aria-label="本次时长"
                value={state.teachingContext.duration}
                onChange={(event) =>
                  updateContext("duration", Number(event.target.value))
                }
              >
                <option value="30">30 分钟</option>
                <option value="45">45 分钟</option>
                <option value="60">60 分钟</option>
                <option value="90">90 分钟</option>
              </select>
            </label>
            <label>
              <span>目标难度</span>
              <select
                aria-label="目标难度"
                value={state.teachingContext.targetDifficulty}
                onChange={(event) =>
                  updateContext(
                    "targetDifficulty",
                    Number(
                      event.target.value,
                    ) as TeachingContext["targetDifficulty"],
                  )
                }
              >
                <option value="1">L1 · 基础</option>
                <option value="2">L2 · 入门</option>
                <option value="3">L3 · 进阶</option>
                <option value="4">L4 · 挑战</option>
                <option value="5">L5 · 拓展</option>
              </select>
            </label>
            <label className="wide">
              <span>本次教学重点</span>
              <input
                aria-label="本次教学重点"
                value={state.teachingContext.focus}
                onChange={(event) => updateContext("focus", event.target.value)}
              />
            </label>
          </div>
          <div className="context-generate-bar">
            <div>
              <Sparkles size={20} />
              <span>
                <strong>AI 将联动调整 5 个维度</strong>
                <small>目标、难度、节奏、活动与配套题目</small>
              </span>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => void generate()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" /> 正在生成适配方案
                </>
              ) : (
                <>
                  <WandSparkles size={16} /> 生成情境化方案
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {step === 3 && generated && (
        <section className="prepare-result">
          <div className="result-hero card">
            <div>
              <span className="eyebrow">
                <CheckCircle2 size={15} /> 情境化方案已生成
              </span>
              <h2>{generated.title}</h2>
              <p>
                {generated.context.mode} · {generated.context.audience} ·{" "}
                {generated.duration} 分钟 · L
                {generated.context.targetDifficulty}
              </p>
            </div>
            <div className="result-score">
              <strong>94%</strong>
              <small>目标与情境匹配度</small>
            </div>
          </div>
          <div className="adjustment-grid">
            {generated.adjustments.map((item) => (
              <article className="card adjustment-card" key={item.dimension}>
                <span>{item.dimension}</span>
                <div>
                  <small>标准方案</small>
                  <p>{item.before}</p>
                </div>
                <ArrowRight size={16} />
                <div className="adjusted">
                  <small>本次方案</small>
                  <p>{item.after}</p>
                </div>
                <footer>
                  <Sparkles size={13} /> {item.reason}
                </footer>
              </article>
            ))}
          </div>
          <div className="result-detail-grid">
            <section className="card result-flow">
              <div className="workspace-title">
                <div>
                  <span className="section-kicker">教学流程</span>
                  <h3>
                    {generated.steps.length} 个环节 · {generated.duration} 分钟
                  </h3>
                </div>
              </div>
              {generated.steps.map((item, index) => (
                <div className="result-flow-row" key={item.id}>
                  <span>0{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </div>
                  <em>{item.duration} 分钟</em>
                </div>
              ))}
            </section>
            <section className="card result-support">
              <span className="section-kicker">配套产出</span>
              <h3>采纳后自动回流课程资源</h3>
              <ul>
                <li>
                  <FileText size={15} /> 情境化教案
                </li>
                <li>
                  <Layers3 size={15} /> 课堂活动包
                </li>
                <li>
                  <ListChecks size={15} />{" "}
                  {generated.supportingQuestions.length} 道配套题目
                </li>
                <li>
                  <Clock3 size={15} /> {generated.progress.milestones.length}{" "}
                  阶段教学进度
                </li>
              </ul>
            </section>
          </div>
          <div className="result-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => openEvidence("evidence-prepare-visual")}
            >
              <BookOpenCheck size={15} /> 查看适配依据
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setStep(2);
                void generate();
              }}
            >
              <RefreshCw size={15} /> 重新生成
            </button>
            <button className="primary-button" type="button" onClick={accept}>
              <Check size={16} /> 采纳方案并进入教学实施
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export function TeachingDeliveryView({
  onBackPrepare,
  onMoveNext,
  onToast,
  classroom,
}: {
  onBackPrepare: () => void;
  onMoveNext: () => void;
  onToast: Toast;
  classroom?: TeacherClassSummary;
}) {
  const { state, dispatch } = useDemoState();
  const plan = state.acceptedPlan;
  const standardLesson = findLesson(state);
  const [standardSteps, setStandardSteps] = useState(() =>
    structuredClone(standardLesson.steps),
  );
  const [standardPublished, setStandardPublished] = useState(false);
  const standardDuration = standardSteps.reduce(
    (sum, step) => sum + step.duration,
    0,
  );
  if (!plan)
    if (classroom)
      return (
        <div className="page delivery-page">
          <WorkspaceHeader
            className="delivery-head card"
            tone="teach"
            eyebrow={
              <>
                <Play size={15} /> {classroom.statusLabel} · 标准教学方案
              </>
            }
            title="教学实施"
            description={`${classroom.name} · ${classroom.lesson} · ${classroom.schedule}`}
            actions={
              <button
                className="secondary-button"
                type="button"
                onClick={onBackPrepare}
              >
                生成适配方案
              </button>
            }
            summary={
              <div className="delivery-status published">
                <strong>
                  {standardPublished
                    ? "已发布"
                    : classroom.status === "live"
                      ? "进行中"
                      : "已就绪"}
                </strong>
                <small>
                  {classroom.students} 名学生 · {standardPublished ? "课堂任务已同步" : "标准方案可直接实施"}
                </small>
              </div>
            }
          />
          <div className="delivery-tags delivery-tags-row">
            <span>L{standardLesson.difficulty} 目标难度</span>
            <span>{classroom.courseName}</span>
            <span>{state.standardCourse.version}</span>
          </div>
          <section className="readiness-strip" aria-label="课堂准备度">
            <div>
              <CheckCircle2 size={18} />
              <span>
                <strong>教学目标</strong>
                <small>{standardLesson.objectives.length} 项已就绪</small>
              </span>
            </div>
            <div>
              <CheckCircle2 size={18} />
              <span>
                <strong>课堂资源</strong>
                <small>{standardLesson.resourceIds.length} 份已关联</small>
              </span>
            </div>
            <div>
              <CheckCircle2 size={18} />
              <span>
                <strong>课堂参与</strong>
                <small>{classroom.participation}% 当前参与度</small>
              </span>
            </div>
            <div>
              <CheckCircle2 size={18} />
              <span>
                <strong>教学时长</strong>
                <small>{standardLesson.duration} 分钟</small>
              </span>
            </div>
          </section>
          <div className="delivery-layout">
            <section className="card delivery-flow">
              <div className="workspace-title">
                <div>
                  <span className="section-kicker">标准教学流程</span>
                  <h2>
                    {standardDuration} 分钟，{standardSteps.length} 个关键环节
                  </h2>
                </div>
                <span className="time-ok">课堂可用</span>
              </div>
              {standardSteps.map((item, index) => (
                <article className="delivery-step" key={item.id}>
                  <span className="step-order">0{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <button
                      type="button"
                      onClick={() =>
                        onToast(`已打开“${item.resource}”课堂资源`)
                      }
                    >
                      {item.resource} <ArrowRight size={13} />
                    </button>
                  </div>
                  <div className="delivery-duration">
                    <button
                      aria-label={`减少${item.title}一分钟`}
                      type="button"
                      onClick={() =>
                        setStandardSteps((current) =>
                          current.map((step) =>
                            step.id === item.id
                              ? { ...step, duration: Math.max(3, step.duration - 1) }
                              : step,
                          ),
                        )
                      }
                    >
                      −
                    </button>
                    <span>
                      {item.duration}
                      <small>min</small>
                    </span>
                    <button
                      aria-label={`增加${item.title}一分钟`}
                      type="button"
                      onClick={() =>
                        setStandardSteps((current) =>
                          current.map((step) =>
                            step.id === item.id
                              ? { ...step, duration: step.duration + 1 }
                              : step,
                          ),
                        )
                      }
                    >
                      ＋
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <aside className="delivery-side">
              <section className="card">
                <span className="card-label">
                  <Target size={15} /> 本次目标
                </span>
                <ol className="delivery-objectives">
                  {standardLesson.objectives.map((item, index) => (
                    <li key={item}>
                      <span>0{index + 1}</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </section>
              <section className="card delivery-standard-next">
                <span className="card-label">
                  <UsersRound size={15} /> 课堂实时信号
                </span>
                <h3>{classroom.alerts} 名学生需要关注</h3>
                <p>进入学习促进，查看参与度、知识掌握和异常信号。</p>
                {standardPublished ? (
                  <button className="primary-button" type="button" onClick={onMoveNext}>
                    查看班级态势 <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      setStandardPublished(true);
                      onToast(`课堂任务已发布给 ${classroom.students} 名学生`);
                    }}
                  >
                    发布课堂任务 <Rocket size={16} />
                  </button>
                )}
              </section>
            </aside>
          </div>
        </div>
      );

  if (!plan)
    return (
      <section className="delivery-empty card">
        <span>
          <WandSparkles size={28} />
        </span>
        <h1>还没有可实施的教学方案</h1>
        <p>先选择一节标准课，设置本次教学情境并采纳 AI 适配方案。</p>
        <button
          className="primary-button"
          type="button"
          onClick={onBackPrepare}
        >
          开始智能备课 <ArrowRight size={16} />
        </button>
      </section>
    );

  const total = plan.steps.reduce((sum, item) => sum + item.duration, 0);
  const published = plan.status === "published";
  const linkedResourceCount =
    plan.resourceIds.length +
    state.courseResources.filter(
      (resource) =>
        resource.origin === "ai-generated" &&
        resource.lessonId === plan.standardLessonId,
    ).length;
  const publish = () => {
    dispatch({ type: "PUBLISH_ADAPTED_PLAN" });
    onToast(
      `教学任务已发布给 ${plan.context.learnerCount} 名学习者，AI 资源已转为正式版本`,
    );
  };
  return (
    <div className="page delivery-page">
      <WorkspaceHeader
        className="delivery-head card"
        tone="teach"
        eyebrow={
          <>
            <Play size={15} /> {published ? "教学任务已发布" : "教学方案待发布"}
          </>
        }
        title="教学实施"
        description={`${plan.title} · ${plan.context.mode} · ${plan.context.audience} · ${plan.context.deliveryMode}`}
        summary={
          <div className={`delivery-status ${published ? "published" : ""}`}>
            <strong>{published ? "正式" : "草稿"}</strong>
            <small>{published ? "学生端已可见" : "仅教师可见"}</small>
          </div>
        }
      />
      <div className="delivery-tags delivery-tags-row">
        <span>L{plan.context.targetDifficulty} 目标难度</span>
        <span>{plan.context.focus}</span>
        <span>{plan.version}</span>
      </div>
      <section className="readiness-strip" aria-label="方案准备度">
        <div>
          <CheckCircle2 size={18} />
          <span>
            <strong>目标覆盖</strong>
            <small>{plan.objectives.length} 项可衡量目标</small>
          </span>
        </div>
        <div>
          <CheckCircle2 size={18} />
          <span>
            <strong>资源齐备</strong>
            <small>{linkedResourceCount} 份关联资源</small>
          </span>
        </div>
        <div>
          <CheckCircle2 size={18} />
          <span>
            <strong>难度匹配</strong>
            <small>
              L{plan.context.targetDifficulty} · {plan.context.learnerLevel}
            </small>
          </span>
        </div>
        <div className={total === plan.context.duration ? "" : "warning"}>
          {total === plan.context.duration ? (
            <CheckCircle2 size={18} />
          ) : (
            <CircleAlert size={18} />
          )}
          <span>
            <strong>时间合理</strong>
            <small>
              {total} / {plan.context.duration} 分钟
            </small>
          </span>
        </div>
      </section>
      <div className="delivery-layout">
        <section className="card delivery-flow">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">教学流程</span>
              <h2>
                {total} 分钟，{plan.steps.length} 个关键环节
              </h2>
            </div>
            <span
              className={
                total === plan.context.duration ? "time-ok" : "time-warn"
              }
            >
              {total} / {plan.context.duration} 分钟
            </span>
          </div>
          {plan.steps.map((item, index) => (
            <article className="delivery-step" key={item.id}>
              <span className="step-order">0{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: "REPLACE_ADAPTED_STEP_RESOURCE",
                      id: item.id,
                    });
                    onToast(`“${item.title}”已切换资源版本`);
                  }}
                >
                  {item.resource} <Settings2 size={13} />
                </button>
              </div>
              <div className="delivery-duration">
                <button
                  aria-label={`减少${item.title}一分钟`}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_ADAPTED_STEP_DURATION",
                      id: item.id,
                      delta: -1,
                    })
                  }
                >
                  −
                </button>
                <span>
                  {item.duration}
                  <small>min</small>
                </span>
                <button
                  aria-label={`增加${item.title}一分钟`}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_ADAPTED_STEP_DURATION",
                      id: item.id,
                      delta: 1,
                    })
                  }
                >
                  ＋
                </button>
              </div>
            </article>
          ))}
        </section>
        <aside className="delivery-side">
          <section className="card">
            <span className="card-label">
              <Target size={15} /> 本次目标
            </span>
            <ol className="delivery-objectives">
              {plan.objectives.map((item, index) => (
                <li key={item}>
                  <span>0{index + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
            <div className="delivery-knowledge">
              <strong>适配知识点</strong>
              <div>
                {plan.knowledgePoints.map((point) => (
                  <span key={point.id}>
                    {point.name} · L{point.difficulty.level}
                  </span>
                ))}
              </div>
            </div>
          </section>
          <section className="card">
            <div className="workspace-title compact">
              <div>
                <span className="card-label">
                  <ListChecks size={15} /> 配套题目
                </span>
                <h3>{plan.supportingQuestions.length} 道分层题</h3>
              </div>
              {!published && (
                <button
                  className="add-question-button"
                  type="button"
                  onClick={() => dispatch({ type: "ADD_ADAPTED_QUESTION" })}
                >
                  ＋ AI 补充
                </button>
              )}
            </div>
            <div className="delivery-questions">
              {plan.supportingQuestions.map((question) => (
                <div key={question.id}>
                  <span>
                    {question.type} · L{question.difficulty}
                  </span>
                  <strong>{question.stem}</strong>
                  {!published && (
                    <button
                      type="button"
                      aria-label={`移除题目：${question.stem}`}
                      onClick={() =>
                        dispatch({
                          type: "REMOVE_ADAPTED_QUESTION",
                          id: question.id,
                        })
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <div className="delivery-publish-bar">
        <div>
          <Rocket size={20} />
          <span>
            <strong>
              {published
                ? "任务已发布，学习过程开始回传"
                : "方案检查通过，可以发布"}
            </strong>
            <small>
              {published
                ? `${plan.context.learnerCount} 名学习者已收到任务`
                : "发布后 AI 草稿资源将转为正式资源"}
            </small>
          </span>
        </div>
        {published ? (
          <button className="primary-button" type="button" onClick={onMoveNext}>
            查看学生学习 <ArrowRight size={16} />
          </button>
        ) : (
          <button className="primary-button" type="button" onClick={publish}>
            <Rocket size={16} /> 发布教学任务
          </button>
        )}
      </div>
    </div>
  );
}

function ResourceCard({
  resource,
  onToast,
}: {
  resource: CourseResource;
  onToast: Toast;
}) {
  const Icon = resourceKindIcon[resource.kind];
  return (
    <article className="course-resource-card">
      <div className={`resource-kind-icon ${resource.origin}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="resource-card-meta">
          <span>{resource.kind}</span>
          <em className={`resource-status status-${resource.status}`}>
            {resource.status === "standard"
              ? "标准"
              : resource.status === "draft"
                ? "草稿"
                : resource.status === "published"
                  ? "正式"
                  : "归档"}
          </em>
        </div>
        <h3>{resource.title}</h3>
        <p>{resource.description}</p>
        <footer>
          <span>{resource.version}</span>
          {resource.scenario && <span>{resource.scenario}</span>}
          <span>{resource.updatedAt}</span>
        </footer>
      </div>
      <button
        type="button"
        aria-label={`查看资源：${resource.title}`}
        onClick={() =>
          onToast(
            `${resource.title} · 来源 ${resource.parentVersion ?? "标准课程"} · ${resource.knowledgePoints.join("、")}`,
          )
        }
      >
        <ChevronRight size={16} />
      </button>
    </article>
  );
}

export function CourseResourceCenter({ onToast }: { onToast: Toast }) {
  const { state } = useDemoState();
  const [view, setView] = useState<
    "overview" | "standard" | "ai" | "structure"
  >("overview");
  const [lessonFilter, setLessonFilter] = useState("all");
  const [query, setQuery] = useState("");
  const resources = useMemo(
    () =>
      state.courseResources.filter(
        (resource) =>
          (lessonFilter === "all" || resource.lessonId === lessonFilter) &&
          (!query ||
            `${resource.title}${resource.kind}${resource.description}`.includes(
              query,
            )),
      ),
    [lessonFilter, query, state.courseResources],
  );
  const standard = resources.filter(
    (resource) => resource.origin === "standard",
  );
  const ai = resources.filter((resource) => resource.origin === "ai-generated");
  if (view === "structure")
    return (
      <div className="page resource-center-page">
        <ResourceViewTabs value={view} onChange={setView} />
        <WorkspaceHeader
          className="resource-structure-intro"
          tone="teach"
          eyebrow={
            <>
              <Network size={15} /> 课程资源 · 知识结构
            </>
          }
          title="课程资源"
          description="在同一工作区检查知识质量、检索效果和课程知识图谱，所有依据均可复核。"
        />
        <KnowledgeBaseView embedded onToast={onToast} />
        <div className="structure-divider">
          <Network size={17} /> 课程知识图谱
        </div>
        <KnowledgeGraphView embedded onToast={onToast} />
      </div>
    );

  return (
    <div className="page resource-center-page">
      <ResourceViewTabs value={view} onChange={setView} />
      <WorkspaceHeader
        className="resource-center-head"
        tone="teach"
        eyebrow={
          <>
            <Database size={15} /> 标准资源与 AI 产出统一管理
          </>
        }
        title="课程资源"
        description={`查看“${state.standardCourse.title}”的标准资源，以及情境化备课采纳后形成的 AI 版本。`}
        summary={
          <div className="resource-head-stats">
            <div>
              <strong>{state.courseResources.length}</strong>
              <small>全部资源</small>
            </div>
            <div>
              <strong>
                {
                  state.courseResources.filter(
                    (item) => item.origin === "standard",
                  ).length
                }
              </strong>
              <small>标准资源</small>
            </div>
            <div>
              <strong>
                {
                  state.courseResources.filter(
                    (item) => item.origin === "ai-generated",
                  ).length
                }
              </strong>
              <small>AI 生成</small>
            </div>
          </div>
        }
      />
      <div className="resource-center-layout">
        <aside className="resource-course-tree card">
          <div className="tree-head">
            <span className="section-kicker">课程目录</span>
            <strong>4 单元 · 8 课次</strong>
          </div>
          <button
            type="button"
            className={lessonFilter === "all" ? "active" : ""}
            onClick={() => setLessonFilter("all")}
          >
            <FileStack size={15} /> 整门课程{" "}
            <span>{state.courseResources.length}</span>
          </button>
          {state.standardCourse.units.map((unit) => (
            <div className="tree-unit" key={unit.id}>
              <strong>{unit.title}</strong>
              {unit.lessons.map((lesson) => (
                <button
                  type="button"
                  className={lessonFilter === lesson.id ? "active" : ""}
                  onClick={() => setLessonFilter(lesson.id)}
                  key={lesson.id}
                >
                  {lesson.title}
                  <span>
                    {
                      state.courseResources.filter(
                        (resource) => resource.lessonId === lesson.id,
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
          ))}
        </aside>
        <section className="resource-main">
          <div className="resource-toolbar">
            <div className="resource-search">
              <Search size={16} />
              <input
                aria-label="搜索课程资源"
                placeholder="搜索资源名称、类型或内容"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <span>
              {view === "overview"
                ? resources.length
                : view === "standard"
                  ? standard.length
                  : ai.length}{" "}
              项资源
            </span>
          </div>
          {view === "overview" && (
            <>
              <div className="resource-overview-grid">
                <div className="card">
                  <Database size={20} />
                  <strong>标准课程基线</strong>
                  <span>{standard.length} 份资源覆盖全部 8 个课次</span>
                </div>
                <div className="card">
                  <WandSparkles size={20} />
                  <strong>AI 情境化产出</strong>
                  <span>
                    {ai.length
                      ? `${ai.length} 份资源已建立版本链`
                      : "采纳备课方案后自动生成"}
                  </span>
                </div>
                <div className="card">
                  <Network size={20} />
                  <strong>知识来源关联</strong>
                  <span>{state.knowledgeBase.coverage}% 知识覆盖率</span>
                </div>
              </div>
              <div className="resource-section-head">
                <div>
                  <span className="section-kicker">最近资源</span>
                  <h2>整门课程资源一览</h2>
                </div>
              </div>
              <div className="resource-list">
                {resources.map((resource) => (
                  <ResourceCard
                    resource={resource}
                    onToast={onToast}
                    key={resource.id}
                  />
                ))}
              </div>
            </>
          )}
          {view === "standard" && (
            <div className="resource-list">
              {standard.map((resource) => (
                <ResourceCard
                  resource={resource}
                  onToast={onToast}
                  key={resource.id}
                />
              ))}
            </div>
          )}
          {view === "ai" &&
            (ai.length ? (
              <div className="resource-list">
                {ai.map((resource) => (
                  <ResourceCard
                    resource={resource}
                    onToast={onToast}
                    key={resource.id}
                  />
                ))}
              </div>
            ) : (
              <div className="resource-empty">
                <WandSparkles size={28} />
                <h2>还没有已采纳的 AI 资源</h2>
                <p>
                  在“智能备课”中采纳情境化方案后，教案、活动、题目和进度会自动出现在这里。
                </p>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}

function ResourceViewTabs({
  value,
  onChange,
}: {
  value: "overview" | "standard" | "ai" | "structure";
  onChange: (value: "overview" | "standard" | "ai" | "structure") => void;
}) {
  const items = [
    { id: "overview", label: "资源总览" },
    { id: "standard", label: "标准资源" },
    { id: "ai", label: "AI 生成" },
    { id: "structure", label: "知识结构" },
  ] as const;
  return (
    <div
      className="resource-view-tabs"
      role="tablist"
      aria-label="课程资源视图"
    >
      {items.map((item) => (
        <button
          role="tab"
          aria-selected={value === item.id}
          type="button"
          className={value === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
          key={item.id}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
