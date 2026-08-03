import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileSearch,
  Filter,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import { useDemoState } from "./demoState";
import { useEvidenceCenter } from "./evidenceCenter";
import { knowledgePointNames, learningStudents } from "./learningData";
import { aiDemoService } from "./services/aiDemoService";
import type { InterventionPlan, LearnerGroup, ObservationScope } from "./types";
import { EmptyState, WorkspaceHeader } from "./ui";
import type { TeacherClassSummary } from "./workspaceData";

type Toast = (message: string) => void;
export type TeacherLearnTab = "overview" | "diagnosis" | "intervention";

const scopeLabels: Record<ObservationScope, string> = {
  lesson: "当前课次",
  week: "本周",
  unit: "本单元",
};
const sourceIcons = {
  学习任务: ListChecks,
  课堂练习: CheckCircle2,
  作品迭代: Sparkles,
  测评过程: BarChart3,
  AI助教: MessageSquareText,
};

function LearningOverview({
  onMoveDiagnosis,
  onToast,
  classroom,
}: {
  onMoveDiagnosis: () => void;
  onToast: Toast;
  classroom?: TeacherClassSummary;
}) {
  const { state, dispatch } = useDemoState();
  const snapshot = state.learningSnapshots[state.observationScope];
  const [studentId, setStudentId] = useState<string | null>(null);
  const selectedStudent = learningStudents.find(
    (student) => student.id === studentId,
  );
  const selectedEvidence = snapshot.evidence.filter(
    (item) => item.studentId === studentId,
  );
  const signalStudents = useMemo(
    () =>
      Array.from(new Set(snapshot.signals.map((signal) => signal.studentId)))
        .map((id) => learningStudents.find((student) => student.id === id))
        .filter(Boolean),
    [snapshot.signals],
  );
  const learnerCount = classroom?.students ?? snapshot.learnerCount;
  const participationRate =
    classroom?.participation ?? snapshot.metrics.participationRate;
  const completionRate = classroom?.progress ?? snapshot.metrics.completionRate;
  const attentionCount = classroom?.alerts ?? snapshot.metrics.attentionCount;
  const onTrackCount = Math.max(0, learnerCount - attentionCount);

  return (
    <div className="page learning-promotion-page">
      <WorkspaceHeader
        className="promotion-hero"
        tone="learn"
        variant="overview"
        eyebrow={
          <>
            <BrainCircuit size={15} /> 持续收集证据，及时调整支持
          </>
        }
        title="班级态势"
        description={`${snapshot.unitTitle} · ${classroom?.name ?? snapshot.className}。聚合参与、完成、作品迭代与需要行动的过程信号。`}
        summary={
          <div className="observation-context">
            <span>
              <Clock3 size={14} /> {snapshot.updatedAt}
            </span>
            <div role="group" aria-label="观察周期">
              {(Object.keys(scopeLabels) as ObservationScope[]).map((scope) => (
                <button
                  type="button"
                  key={scope}
                  className={state.observationScope === scope ? "active" : ""}
                  onClick={() => {
                    dispatch({ type: "SET_OBSERVATION_SCOPE", value: scope });
                    onToast(`已切换为${scopeLabels[scope]}过程数据`);
                  }}
                >
                  {scopeLabels[scope]}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="promotion-metrics">
        <div>
          <span className="metric-icon green">
            <UsersRound size={17} />
          </span>
          <small>学习参与度</small>
          <strong>{participationRate}%</strong>
          <em>
            {Math.round((learnerCount * participationRate) / 100)} /{" "}
            {learnerCount} 人留下过程证据
          </em>
        </div>
        <div>
          <span className="metric-icon blue">
            <CheckCircle2 size={17} />
          </span>
          <small>任务完成进度</small>
          <strong>{completionRate}%</strong>
          <em>不计入正式成绩</em>
        </div>
        <div>
          <span className="metric-icon teal">
            <Rocket size={17} />
          </span>
          <small>按计划推进</small>
          <strong>
            {onTrackCount}
            <b>人</b>
          </strong>
          <em>节奏与目标匹配</em>
        </div>
        <div>
          <span className="metric-icon coral">
            <CircleAlert size={17} />
          </span>
          <small>需要教师关注</small>
          <strong>
            {attentionCount}
            <b>人</b>
          </strong>
          <em>来自多源过程信号</em>
        </div>
      </div>

      <div className="promotion-overview-grid">
        <section className="card learning-trend-card">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">过程趋势</span>
              <h2>学习投入正在转化为作品迭代</h2>
            </div>
            <span className="evidence-note">
              <FileSearch size={14} /> 四类过程证据
            </span>
          </div>
          <div className="trend-legend">
            <span className="participation">参与</span>
            <span className="completion">完成</span>
            <span className="practice">练习</span>
            <span className="iteration">迭代</span>
          </div>
          <div className="learning-trend-chart">
            {snapshot.trends.map((point) => (
              <div className="trend-column" key={point.label}>
                <div className="trend-bars">
                  <i
                    className="participation"
                    style={{ height: `${point.participation}%` }}
                    title={`参与 ${point.participation}%`}
                  />
                  <i
                    className="completion"
                    style={{ height: `${point.completion}%` }}
                    title={`完成 ${point.completion}%`}
                  />
                  <i
                    className="practice"
                    style={{ height: `${point.practice}%` }}
                    title={`练习 ${point.practice}%`}
                  />
                  <i
                    className="iteration"
                    style={{ height: `${point.iteration}%` }}
                    title={`迭代 ${point.iteration}%`}
                  />
                </div>
                <strong>{point.label}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="card learning-stage-card">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">当前分布</span>
              <h2>不是排名，而是下一步支持</h2>
            </div>
          </div>
          <div className="stage-distribution">
            {snapshot.stages.map((stage) => (
              <div key={stage.label}>
                <span className={`stage-dot ${stage.tone}`} />
                <div>
                  <strong>{stage.label}</strong>
                  <small>
                    {Math.round((stage.count / snapshot.learnerCount) * 100)}%
                    的学习者
                  </small>
                </div>
                <b>
                  {Math.round(
                    (stage.count / snapshot.learnerCount) * learnerCount,
                  )}
                  <small>人</small>
                </b>
              </div>
            ))}
          </div>
          <p className="distribution-note">
            分布随任务目标和新证据动态变化，不形成永久标签。
          </p>
        </section>
      </div>

      <section className="card learning-signals-card">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">需要行动的信号</span>
            <h2>先看证据，再决定是否干预</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={onMoveDiagnosis}
          >
            进入掌握诊断 <ArrowRight size={15} />
          </button>
        </div>
        <div className="signal-layout">
          <div className="signal-list">
            {snapshot.signals.map((signal) => (
              <button
                type="button"
                key={signal.id}
                className={`signal-row ${signal.level}`}
                onClick={() => setStudentId(signal.studentId)}
              >
                <span>
                  <CircleAlert size={16} />
                </span>
                <div>
                  <strong>{signal.title}</strong>
                  <p>{signal.detail}</p>
                  <small>
                    {signal.studentName} ·{" "}
                    {knowledgePointNames[signal.knowledgePointId]}
                  </small>
                </div>
                <em>{signal.type}</em>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
          <aside className="signal-students">
            <strong>涉及学习者</strong>
            <p>点击姓名查看当前单元证据，不进入长期画像。</p>
            <div>
              {signalStudents.map(
                (student) =>
                  student && (
                    <button
                      type="button"
                      key={student.id}
                      className={studentId === student.id ? "active" : ""}
                      onClick={() => setStudentId(student.id)}
                    >
                      <span>{student.name.slice(-1)}</span>
                      <div>
                        <strong>{student.name}</strong>
                        <small>{student.id}</small>
                      </div>
                      <FileSearch size={14} />
                    </button>
                  ),
              )}
            </div>
          </aside>
        </div>
      </section>

      {selectedStudent && (
        <div
          className="evidence-drawer-backdrop"
          role="presentation"
          onMouseDown={() => setStudentId(null)}
        >
          <aside
            className="student-evidence-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedStudent.name}的学习证据`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>{selectedStudent.name.slice(-1)}</span>
                <div>
                  <h2>{selectedStudent.name}</h2>
                  <p>{selectedStudent.id} · 当前单元过程证据</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="关闭学习证据"
                onClick={() => setStudentId(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="drawer-boundary">
              <FileSearch size={16} />
              <p>
                这里只呈现支持本次教学决策的过程证据；长期画像与正式结论请在“教学诊断”查看。
              </p>
            </div>
            <div className="student-evidence-list">
              {selectedEvidence.length ? (
                selectedEvidence.map((item) => {
                  const Icon = sourceIcons[item.source];
                  return (
                    <article key={item.id}>
                      <span>
                        <Icon size={16} />
                      </span>
                      <div>
                        <small>
                          {item.source} · {item.observedAt}
                        </small>
                        <strong>{item.summary}</strong>
                        <p>{item.artifact}</p>
                        <em>证据可信度 {item.confidence}%</em>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="insufficient-evidence">
                  <CircleAlert size={22} />
                  <strong>当前证据不足</strong>
                  <p>
                    没有足够过程记录支持具体判断，建议先收集一次学习任务或作品证据。
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MasteryDiagnosis({
  onMoveIntervention,
  onToast,
}: {
  onMoveIntervention: () => void;
  onToast: Toast;
}) {
  const { state, dispatch } = useDemoState();
  const { openEvidence } = useEvidenceCenter();
  const snapshot = state.learningSnapshots[state.observationScope];
  const diagnosis =
    state.learningDiagnosis?.scope === state.observationScope
      ? state.learningDiagnosis
      : null;
  const [busy, setBusy] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState("negative");

  const refresh = async () => {
    setBusy(true);
    const value = await aiDemoService.analyzeLearningEvidence(snapshot);
    dispatch({ type: "SET_LEARNING_DIAGNOSIS", value });
    setBusy(false);
  };
  useEffect(() => {
    if (!diagnosis && !busy) void refresh();
  }, [state.observationScope]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (!diagnosis) return;
    setBusy(true);
    const plans = await Promise.all(
      state.learnerGroups.map((group) =>
        aiDemoService.generateGroupIntervention(diagnosis, group),
      ),
    );
    plans.forEach((value) =>
      dispatch({ type: "SET_INTERVENTION_PLAN", value }),
    );
    setBusy(false);
    onToast("已基于当前证据生成补强、巩固和拓展三组建议");
    onMoveIntervention();
  };

  if (!diagnosis)
    return (
      <div className="page learning-promotion-page diagnosis-page">
        <WorkspaceHeader
          className="diagnosis-hero card"
          tone="learn"
          eyebrow="目标—证据—差距"
          title="掌握诊断"
          description="正在汇总当前班级的学习任务、课堂练习、作品迭代、测评过程和 AI 助教证据。"
        />
        <section className="card diagnosis-loading">
          <span className="spinner dark" />
          <h2>正在聚合{scopeLabels[state.observationScope]}学习证据</h2>
          <p>练习、作品、任务、测评过程与AI助教对话正在互相校验。</p>
        </section>
      </div>
    );
  const evidence = snapshot.evidence.filter((item) =>
    diagnosis.mastery
      .find((point) => point.knowledgePointId === selectedPoint)
      ?.evidenceIds.includes(item.id),
  );
  return (
    <div className="page learning-promotion-page diagnosis-page">
      <WorkspaceHeader
        className="diagnosis-hero card"
        tone="learn"
        eyebrow={
          <>
            <Target size={15} /> 目标—证据—差距
          </>
        }
        title="掌握诊断"
        description={diagnosis.summary}
        summary={
          <div>
            <span>{scopeLabels[diagnosis.scope]}诊断</span>
            <strong>{diagnosis.generatedAt}</strong>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy}
            >
              <RefreshCw size={14} /> 刷新证据
            </button>
          </div>
        }
      />
      <section className="mastery-section">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">单元目标达成</span>
            <h2>掌握结论必须能回到证据</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => void generate()}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="spinner" /> 正在生成建议
              </>
            ) : (
              <>
                <WandSparkles size={15} /> 生成分层建议
              </>
            )}
          </button>
        </div>
        <div className="mastery-grid">
          {diagnosis.mastery.map((point) => (
            <button
              type="button"
              key={point.knowledgePointId}
              className={
                selectedPoint === point.knowledgePointId ? "active" : ""
              }
              onClick={() => setSelectedPoint(point.knowledgePointId)}
            >
              <div>
                <span>{point.status}</span>
                <em>证据 {point.confidence}%</em>
              </div>
              <h3>{point.name}</h3>
              <div className="mastery-target">
                <i>
                  <b style={{ width: `${point.current ?? 0}%` }} />
                </i>
                <strong>
                  {point.current === null ? "—" : `${point.current}%`}
                </strong>
              </div>
              <footer>
                <span>目标 {point.target}%</span>
                <span>
                  {point.current === null
                    ? "需要继续采集"
                    : `较前序 +${point.change}`}
                </span>
              </footer>
            </button>
          ))}
        </div>
      </section>
      <div className="diagnosis-grid">
        <section className="card evidence-chain-card">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">证据链</span>
              <h2>{knowledgePointNames[selectedPoint]}</h2>
            </div>
            <span className="evidence-note">{evidence.length} 项来源</span>
          </div>
          <div className="diagnosis-evidence-list">
            {evidence.map((item) => {
              const Icon = sourceIcons[item.source];
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openEvidence("evidence-diagnosis")}
                >
                  <span>
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{item.summary}</strong>
                    <small>
                      {item.studentName} · {item.source} · {item.observedAt}
                    </small>
                  </div>
                  <em>{item.confidence}%</em>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
        </section>
        <section className="card misconception-card">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">典型困难模式</span>
              <h2>不是错题数量，而是思考卡在哪里</h2>
            </div>
          </div>
          {diagnosis.misconceptions.map((item) => (
            <button
              type="button"
              key={item.title}
              className={
                selectedPoint === item.knowledgePointId ? "active" : ""
              }
              onClick={() => setSelectedPoint(item.knowledgePointId)}
            >
              <span>
                {item.count}
                <small>人</small>
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </button>
          ))}
        </section>
      </div>
      <div className="diagnosis-grid compact">
        <section className="card tutor-evidence-card">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">AI助教学习证据</span>
              <h2>学生正在反复追问什么</h2>
            </div>
            <span className="boundary-link">运营指标留在“评”</span>
          </div>
          {diagnosis.tutorInsights.map((item) => (
            <div key={item.question}>
              <MessageSquareText size={16} />
              <span>
                <strong>{item.question}</strong>
                <small>
                  {item.count} 次 · {knowledgePointNames[item.knowledgePointId]}
                </small>
              </span>
              {item.unresolved && <em>尚未解决</em>}
            </div>
          ))}
        </section>
        <section className="card difficulty-fit-card">
          <div className="workspace-title">
            <div>
              <span className="section-kicker">挑战适配</span>
              <h2>同一目标，不同支持</h2>
            </div>
          </div>
          {diagnosis.difficultyFit.map((item) => (
            <div key={item.label}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </span>
              <b>
                {item.count}
                <small>人</small>
              </b>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function InterventionWorkspace({
  onMoveDiagnosis,
  onToast,
}: {
  onMoveDiagnosis: () => void;
  onToast: Toast;
}) {
  const { state, dispatch } = useDemoState();
  const [selectedGroupId, setSelectedGroupId] =
    useState<LearnerGroup["id"]>("support");
  const [busy, setBusy] = useState(false);
  const group = state.learnerGroups.find(
    (item) => item.id === selectedGroupId,
  )!;
  const plan = state.interventionPlans.find(
    (item) => item.groupId === selectedGroupId,
  );
  const generate = async () => {
    setBusy(true);
    const diagnosis =
      state.learningDiagnosis ??
      (await aiDemoService.analyzeLearningEvidence(
        state.learningSnapshots[state.observationScope],
      ));
    if (!state.learningDiagnosis)
      dispatch({ type: "SET_LEARNING_DIAGNOSIS", value: diagnosis });
    const plans = await Promise.all(
      state.learnerGroups.map((item) =>
        aiDemoService.generateGroupIntervention(diagnosis, item),
      ),
    );
    plans.forEach((value) =>
      dispatch({ type: "SET_INTERVENTION_PLAN", value }),
    );
    setBusy(false);
    onToast("三组干预草稿已生成，发布前可继续调整");
  };
  const update = (patch: Partial<InterventionPlan>) =>
    plan && dispatch({ type: "UPDATE_INTERVENTION_PLAN", id: plan.id, patch });
  const publish = () => {
    if (!plan) return;
    dispatch({ type: "PUBLISH_INTERVENTION", id: plan.id });
    onToast(`${group.name}任务已发布给 ${plan.recipients.length} 名学习者`);
  };

  if (!state.interventionPlans.length)
    return (
      <div className="page learning-promotion-page intervention-page">
        <WorkspaceHeader
          className="intervention-hero"
          tone="learn"
          eyebrow={
            <>
              <Rocket size={15} /> 动态分组，不给学生贴标签
            </>
          }
          title="分层干预"
          description="依据当前目标与学习证据，为补强、巩固和拓展三组配置不同支持。"
        />
        <EmptyState
          className="card intervention-empty"
          icon={<WandSparkles size={28} />}
          title="尚未生成分层建议"
          description="AI 将生成三组可编辑草稿，只有经过教师确认后才会发布给学生。"
          action={
            <div>
              <button
                className="secondary-button"
                type="button"
                onClick={onMoveDiagnosis}
              >
                返回查看诊断
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void generate()}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <span className="spinner" /> 正在生成
                  </>
                ) : (
                  <>
                    <WandSparkles size={15} /> 生成三组干预建议
                  </>
                )}
              </button>
            </div>
          }
        />
      </div>
    );

  return (
    <div className="page learning-promotion-page intervention-page">
      <WorkspaceHeader
        className="intervention-hero"
        tone="learn"
        eyebrow={
          <>
            <Rocket size={15} /> 动态分组，不给学生贴标签
          </>
        }
        title="分层干预"
        description={`分组仅对“${state.learningSnapshots.unit.unitTitle}”有效，新证据会推动下一轮调整。`}
        summary={
          <span className="header-summary-pill">
            <UsersRound size={17} /> 36 名学习者全部纳入
          </span>
        }
      />
      <div className="intervention-layout">
        <aside className="group-list">
          {state.learnerGroups.map((item) => {
            const itemPlan = state.interventionPlans.find(
              (candidate) => candidate.groupId === item.id,
            );
            return (
              <button
                type="button"
                key={item.id}
                className={`${selectedGroupId === item.id ? "active" : ""} group-${item.id}`}
                onClick={() => setSelectedGroupId(item.id)}
              >
                <div>
                  <span>{item.memberIds.length}</span>
                  <small>人</small>
                </div>
                <section>
                  <em>
                    {itemPlan?.status === "published" ? "已发布" : "AI 草稿"}
                  </em>
                  <h3>{item.name}</h3>
                  <p>{item.purpose}</p>
                </section>
                <ChevronRight size={16} />
              </button>
            );
          })}
          <div className="group-principle">
            <BrainCircuit size={16} />
            <p>分组依据是当前目标与学习证据，不是固定能力等级。</p>
          </div>
        </aside>
        {plan && (
          <section className="card intervention-editor">
            <header>
              <div>
                <span className="section-kicker">
                  {group.name} · {plan.version}
                </span>
                <h2>{plan.title}</h2>
                <p>{group.reason}</p>
              </div>
              <span className={`plan-status ${plan.status}`}>
                {plan.status === "published" ? "已发布" : "待教师确认"}
              </span>
            </header>
            <div className="intervention-form">
              <label className="wide">
                <span>本组学习目标</span>
                <textarea
                  rows={2}
                  value={plan.objective}
                  disabled={plan.status === "published"}
                  onChange={(event) =>
                    update({ objective: event.target.value })
                  }
                />
              </label>
              <label className="wide">
                <span>推荐活动</span>
                <textarea
                  rows={2}
                  value={plan.activity}
                  disabled={plan.status === "published"}
                  onChange={(event) => update({ activity: event.target.value })}
                />
              </label>
              <label>
                <span>配套资源</span>
                <input
                  value={plan.resource}
                  disabled={plan.status === "published"}
                  onChange={(event) => update({ resource: event.target.value })}
                />
              </label>
              <label>
                <span>目标难度</span>
                <select
                  value={plan.difficulty}
                  disabled={plan.status === "published"}
                  onChange={(event) =>
                    update({
                      difficulty: Number(
                        event.target.value,
                      ) as InterventionPlan["difficulty"],
                    })
                  }
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option value={level} key={level}>
                      L{level}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>题目数量</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={plan.questionCount}
                  disabled={plan.status === "published"}
                  onChange={(event) =>
                    update({ questionCount: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>预计用时</span>
                <select
                  value={plan.duration}
                  disabled={plan.status === "published"}
                  onChange={(event) =>
                    update({ duration: Number(event.target.value) })
                  }
                >
                  {[10, 15, 20, 30, 45].map((minutes) => (
                    <option value={minutes} key={minutes}>
                      {minutes} 分钟
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>截止日期</span>
                <input
                  type="date"
                  value={plan.dueAt}
                  disabled={plan.status === "published"}
                  onChange={(event) => update({ dueAt: event.target.value })}
                />
              </label>
            </div>
            <div className="recipient-editor">
              <div className="workspace-title compact">
                <div>
                  <span className="section-kicker">接收对象</span>
                  <h3>
                    {plan.recipients.length} / {group.memberIds.length} 人
                  </h3>
                </div>
                <span>可按证据增减具体学生</span>
              </div>
              <div>
                {group.memberIds.map((id) => {
                  const student = learningStudents.find(
                    (item) => item.id === id,
                  )!;
                  return (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={plan.recipients.includes(id)}
                        disabled={plan.status === "published"}
                        onChange={() =>
                          dispatch({
                            type: "TOGGLE_INTERVENTION_RECIPIENT",
                            id: plan.id,
                            studentId: id,
                          })
                        }
                      />
                      <span>{student.name}</span>
                      <small>{student.id}</small>
                    </label>
                  );
                })}
              </div>
            </div>
            <footer>
              <div>
                <FileSearch size={17} />
                <span>
                  <strong>发布前检查</strong>
                  <small>
                    {plan.objective.trim() &&
                    plan.activity.trim() &&
                    plan.recipients.length
                      ? "目标、活动和接收对象已齐备"
                      : "请补全目标、活动和接收对象"}
                  </small>
                </span>
              </div>
              {plan.status === "published" ? (
                <span className="published-confirm">
                  <Check size={16} /> 学生课后学习已可见
                </span>
              ) : (
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    !plan.objective.trim() ||
                    !plan.activity.trim() ||
                    !plan.recipients.length
                  }
                  onClick={publish}
                >
                  <Rocket size={15} /> 预览并发布给 {plan.recipients.length} 人
                </button>
              )}
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}

export function TeacherLearningPromotion({
  tab,
  onTabChange,
  onToast,
  classroom,
}: {
  tab: TeacherLearnTab;
  onTabChange: (tab: TeacherLearnTab) => void;
  onToast: Toast;
  classroom?: TeacherClassSummary;
}) {
  if (tab === "overview")
    return (
      <LearningOverview
        onMoveDiagnosis={() => onTabChange("diagnosis")}
        onToast={onToast}
        classroom={classroom}
      />
    );
  if (tab === "diagnosis")
    return (
      <MasteryDiagnosis
        onMoveIntervention={() => onTabChange("intervention")}
        onToast={onToast}
      />
    );
  return (
    <InterventionWorkspace
      onMoveDiagnosis={() => onTabChange("diagnosis")}
      onToast={onToast}
    />
  );
}

export function StudentAssignedTasks({
  courseId,
  onToast,
}: {
  courseId: string;
  onToast: Toast;
}) {
  const { state, dispatch } = useDemoState();
  const tasks = state.studentLearningTasks.filter(
    (task) => task.studentId === "AI24018" && task.courseId === courseId,
  );
  if (!tasks.length) return null;
  return (
    <section className="student-assigned-tasks">
      <div className="workspace-title">
        <div>
          <span className="section-kicker">教师分层任务</span>
          <h2>根据你最近的学习证据推荐</h2>
        </div>
        <span>
          {tasks.filter((task) => task.status === "completed").length}/
          {tasks.length} 已完成
        </span>
      </div>
      <div>
        {tasks.map((task) => (
          <article key={task.id} className={task.status}>
            <span>
              <Target size={17} />
            </span>
            <div>
              <small>
                {task.source === "learning-promotion"
                  ? "来自学习促进"
                  : "来自教学诊断"}{" "}
                · {task.knowledgePoint}
              </small>
              <strong>{task.title}</strong>
              <p>{task.description}</p>
              <em>
                L{task.difficulty} · {task.duration} 分钟 · {task.dueAt} 前
              </em>
            </div>
            {task.status === "completed" ? (
              <span className="task-completed">
                <Check size={15} /> 已完成
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "COMPLETE_STUDENT_TASK", id: task.id });
                  onToast("任务已完成，新的学习证据已回流给教师");
                }}
              >
                完成并回传 <ArrowRight size={14} />
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
