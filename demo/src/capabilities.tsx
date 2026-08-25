import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  GraduationCap,
  Layers3,
  Link2,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Mic2,
  Network,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import { useDemoState } from "./demoState";
import { useEvidenceCenter } from "./evidenceCenter";
import { aiDemoService } from "./services/aiDemoService";
import { defaultBlueprint, trainingTasks } from "./trainingData";
import type {
  DifficultyLevel,
  QuestionGenerationConfig,
  QuestionType,
} from "./types";
import { EmptyState, WorkspaceHeader } from "./ui";

type Toast = (message: string) => void;

const nodeStatusLabel = {
  mastered: "已掌握",
  learning: "学习中",
  weak: "待补强",
  locked: "未解锁",
};

export function KnowledgeBaseView({
  onToast,
  embedded = false,
}: {
  onToast: Toast;
  embedded?: boolean;
}) {
  const { state, dispatch } = useDemoState();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("生成结果中出现文字水印，应该怎样调整？");
  const [retrieval, setRetrieval] = useState<{
    answer: string;
    evidence: (typeof state.tutor.messages)[number]["evidence"];
  } | null>(null);

  const ingest = async () => {
    setBusy("ingest");
    const value = await aiDemoService.ingestKnowledgeDocuments(
      state.knowledgeBase,
    );
    dispatch({ type: "SET_KNOWLEDGE_BASE", value });
    setBusy(null);
    onToast("4 份资料已完成解析，课程知识覆盖率提升至 96%");
  };

  const testRetrieval = async () => {
    setBusy("retrieval");
    const value = await aiDemoService.testKnowledgeRetrieval(query);
    setRetrieval(value);
    dispatch({ type: "COMPLETE_TASK", id: "kb-optimize" });
    setBusy(null);
    onToast("检索测试通过：回答依据清晰，知识库命中率 94%");
  };

  const generateGraph = async () => {
    setBusy("graph");
    const value = await aiDemoService.generateKnowledgeGraph();
    dispatch({ type: "SET_GRAPH", value });
    setBusy(null);
    onToast("课程知识图谱已生成：9 个节点、8 条关系");
  };

  return (
    <div className="capability-page">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        headingLevel={embedded ? 2 : 1}
        eyebrow={
          <>
            <Database size={15} /> 课程共同知识源
          </>
        }
        title="课程知识库"
        description="统一管理 AI 助教、知识图谱、智能出题和评分所使用的课程来源。"
        summary={
          <div className="quality-score">
            <strong>{state.knowledgeBase.coverage}%</strong>
            <span>知识覆盖率</span>
            <small>重复率 {state.knowledgeBase.duplicateRate}%</small>
          </div>
        }
      />

      <div className="capability-grid kb-layout">
        <section className="card capability-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">资料管理</span>
              <h3>{state.knowledgeBase.name}</h3>
              <p>版本变化会同步提醒图谱、助教和题库。</p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onToast("已添加一份模拟课程资料，等待解析")}
            >
              <Upload size={15} /> 添加资料
            </button>
          </div>
          <div className="document-list">
            {state.knowledgeBase.documents.map((document) => (
              <article key={document.id}>
                <span className={`document-icon status-${document.status}`}>
                  <FileText size={18} />
                </span>
                <div>
                  <strong>{document.name}</strong>
                  <small>
                    {document.kind} · {document.version} · {document.updatedAt}
                  </small>
                </div>
                <span className="document-stat">
                  <b>{document.chunks || "—"}</b>
                  <small>切片</small>
                </span>
                <span className={`document-status status-${document.status}`}>
                  {document.status}
                </span>
                <button
                  type="button"
                  aria-label={`更新${document.name}`}
                  onClick={() => onToast(`${document.name}已标记为待更新版本`)}
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`删除${document.name}`}
                  onClick={() => onToast("演示数据已保护：重置后仍可恢复")}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
          <button
            className="primary-button wide"
            type="button"
            disabled={busy === "ingest"}
            onClick={ingest}
          >
            {busy === "ingest" ? (
              <>
                <span className="spinner" /> 正在解析与建立索引
              </>
            ) : (
              <>
                <Database size={16} /> 解析并完成入库
              </>
            )}
          </button>
        </section>

        <aside className="card knowledge-health">
          <div className="card-heading compact">
            <div>
              <h3>知识质量</h3>
              <p>生成前先发现缺口</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="health-list">
            <div className="health-ok">
              <CheckCircle2 size={17} />
              <span>
                <strong>结构化提示词</strong>
                <small>覆盖充分 · 12 个来源片段</small>
              </span>
            </div>
            <div className="health-warn">
              <CircleAlert size={17} />
              <span>
                <strong>负向提示词</strong>
                <small>缺少文字水印类反例</small>
              </span>
            </div>
            <div>
              <Layers3 size={17} />
              <span>
                <strong>重复内容</strong>
                <small>2 个片段可合并</small>
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button wide"
            onClick={() => onToast("已打开低置信度知识补充建议")}
          >
            <Plus size={15} /> 补充知识库
          </button>
        </aside>
      </div>

      <section className="card retrieval-card">
        <div className="card-heading">
          <div>
            <span className="section-kicker">检索测试</span>
            <h3>先问一个真实问题</h3>
            <p>验证答案是否只来自课程资料。</p>
          </div>
          <span className={`readiness ${state.knowledgeBase.status}`}>
            {state.knowledgeBase.status === "ready"
              ? "知识库已就绪"
              : "等待完成入库"}
          </span>
        </div>
        <div className="retrieval-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="知识库测试问题"
          />
          <button
            type="button"
            onClick={testRetrieval}
            disabled={
              busy === "retrieval" || state.knowledgeBase.status !== "ready"
            }
          >
            {busy === "retrieval" ? "检索中…" : "测试检索"}
          </button>
        </div>
        {retrieval && (
          <div className="retrieval-result">
            <span>
              <Bot size={18} />
            </span>
            <div>
              <strong>依据课程资料的回答</strong>
              <p>{retrieval.answer}</p>
              {retrieval.evidence?.map((item) => (
                <button
                  type="button"
                  key={item.section}
                  onClick={() => onToast(`已定位原文：${item.excerpt}`)}
                >
                  <FileCheck2 size={14} /> {item.document} · {item.section}{" "}
                  <b>{item.confidence}%</b>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="capability-actions">
          <button
            className="primary-button"
            type="button"
            onClick={generateGraph}
            disabled={
              state.knowledgeBase.status !== "ready" || busy === "graph"
            }
          >
            {busy === "graph" ? (
              <>
                <span className="spinner" /> 正在生成图谱
              </>
            ) : (
              <>
                <Network size={16} /> 生成课程知识图谱
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export function KnowledgeGraphView({
  student = false,
  embedded = false,
  onToast,
}: {
  student?: boolean;
  embedded?: boolean;
  onToast: Toast;
}) {
  const { state } = useDemoState();
  const [selected, setSelected] = useState(state.graph.nodes[5]);
  return (
    <div className="capability-page">
      <WorkspaceHeader
        className="capability-hero compact-hero graph-hero"
        headingLevel={embedded ? 2 : 1}
        tone={student ? "learn" : "teach"}
        eyebrow={
          <>
            <Network size={15} /> {student ? "个人学习位置" : "课程知识结构"}
          </>
        }
        title={student ? "我的知识图谱" : "课程知识图谱"}
        description={
          state.graph.generated
            ? `${state.graph.version} · ${state.graph.updatedAt}。知识、题目与学习证据保持关联。`
            : "完成知识库解析后可生成并编辑图谱。"
        }
        summary={
          <div className="graph-summary">
            <span>
              <strong>9</strong>
              <small>知识节点</small>
            </span>
            <span>
              <strong>8</strong>
              <small>前置关系</small>
            </span>
            <span>
              <strong>{student ? "54%" : "92%"}</strong>
              <small>{student ? "当前弱项" : "资料覆盖"}</small>
            </span>
          </div>
        }
      />
      <div className="graph-layout">
        <section
          className={`card graph-canvas ${!state.graph.generated ? "graph-preview" : ""}`}
          aria-label="文生图课程知识图谱"
        >
          {!state.graph.generated && (
            <div className="graph-lock">
              <LockKeyhole size={22} />
              <strong>图谱预览</strong>
              <p>请先在知识底座中完成生成。</p>
            </div>
          )}
          <div className="graph-flow">
            <button
              className="graph-root"
              type="button"
              onClick={() => setSelected(state.graph.nodes[0])}
            >
              提示词基本结构
            </button>
            <div className="graph-branch-line" />
            <div className="graph-branches">
              {state.graph.nodes.slice(1, 5).map((node) => (
                <button
                  type="button"
                  className={`graph-node node-${student ? node.status : "teacher"}`}
                  key={node.id}
                  onClick={() => setSelected(node)}
                >
                  <span>L{node.level}</span>
                  <strong>{node.name}</strong>
                  <small>
                    {student
                      ? `${node.mastery}% · ${nodeStatusLabel[node.status]}`
                      : `${node.questionCount} 道题`}
                  </small>
                </button>
              ))}
            </div>
            <div className="graph-chain">
              {state.graph.nodes.slice(5).map((node, index) => (
                <div key={node.id}>
                  <ChevronRight size={17} />
                  <button
                    type="button"
                    className={`graph-node node-${student ? node.status : "teacher"} ${selected.id === node.id ? "selected" : ""}`}
                    onClick={() => setSelected(node)}
                  >
                    <span>L{node.level}</span>
                    <strong>{node.name}</strong>
                    <small>
                      {student
                        ? `${node.mastery}% · ${nodeStatusLabel[node.status]}`
                        : `${node.questionCount} 道题`}
                    </small>
                  </button>
                  {index === state.graph.nodes.slice(5).length - 1 && (
                    <ChevronRight size={17} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="card node-detail">
          <span className="section-kicker">当前节点</span>
          <div className="node-title">
            <span>L{selected.level}</span>
            <div>
              <h3>{selected.name}</h3>
              <p>
                {student ? nodeStatusLabel[selected.status] : "课程核心知识点"}
              </p>
            </div>
          </div>
          <div className="mastery-meter">
            <div>
              <span>{student ? "我的掌握度" : "班级掌握度"}</span>
              <strong>{selected.mastery}%</strong>
            </div>
            <i>
              <b style={{ width: `${selected.mastery}%` }} />
            </i>
          </div>
          <dl>
            <div>
              <dt>前置知识</dt>
              <dd>
                {state.graph.nodes.find(
                  (node) => node.id === selected.prerequisite,
                )?.name ?? "无"}
              </dd>
            </div>
            <div>
              <dt>资料来源</dt>
              <dd>{selected.source}</dd>
            </div>
            <div>
              <dt>关联题目</dt>
              <dd>{selected.questionCount} 道</dd>
            </div>
          </dl>
          <div className="node-actions">
            {student ? (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    onToast(`已打开“${selected.name}”的AI助教讲解`)
                  }
                >
                  <MessageSquareText size={15} /> 问AI助教
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onToast(`已生成“${selected.name}”分层练习`)}
                >
                  生成练习
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    onToast(`已打开“${selected.name}”节点关系编辑`)
                  }
                >
                  <Settings2 size={15} /> 调整关系
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onToast("已模拟合并重复节点")}
                >
                  合并/拆分
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function TutorBuilderView({ onToast }: { onToast: Toast }) {
  const { state, dispatch } = useDemoState();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [testQuestion, setTestQuestion] =
    useState("作品出现文字水印时应该怎么改？");
  const [testAnswer, setTestAnswer] = useState<AiTutorAnswer | null>(null);
  type AiTutorAnswer = Awaited<
    ReturnType<typeof aiDemoService.generateTutorReply>
  >;
  const avatarReady =
    state.taskProgress.find((item) => item.taskId === "avatar-config")
      ?.status === "completed";
  const boundResources = state.courseResources.filter(
    (item) => item.origin === "standard" || item.status === "published",
  );
  const readyToPublish =
    boundResources.length > 0 &&
    state.tutor.configured &&
    avatarReady &&
    Boolean(testAnswer);

  const saveConfig = () => {
    if (step === 2) dispatch({ type: "CONFIGURE_TUTOR" });
    if (step === 3) {
      dispatch({ type: "CONFIGURE_TUTOR" });
      dispatch({ type: "COMPLETE_TASK", id: "avatar-config" });
    }
    setStep(Math.min(4, step + 1));
    onToast("助教配置已保存，进入下一步");
  };
  const testTutor = async () => {
    setBusy("test");
    setTestAnswer(await aiDemoService.generateTutorReply(testQuestion));
    setBusy(null);
  };
  const publish = async () => {
    if (!readyToPublish) {
      onToast("请先完成课程资源绑定、助教配置、数字人预览和对话测试");
      return;
    }
    setBusy("publish");
    const value = await aiDemoService.publishTutor();
    dispatch({ type: "PUBLISH_TUTOR", ...value });
    setBusy(null);
    onToast("AI助教 v1.0 已发布到人工智能 2401 班");
  };

  return (
    <div className="capability-page">
      <WorkspaceHeader
        className="capability-hero tutor-hero"
        eyebrow={
          <>
            <Bot size={15} /> 数字人 × 知识库 × 智能体
          </>
        }
        title="AI助教"
        description="通过知识绑定、教学人格、数字人形态和发布检查，搭建有依据、懂边界的课程助教。"
        summary={
          <div className={`deployment-badge ${state.tutor.deployment.status}`}>
            <span />
            <div>
              <strong>
                {state.tutor.deployment.status === "published"
                  ? "运行中"
                  : "配置中"}
              </strong>
              <small>
                {state.tutor.deployment.version} ·{" "}
                {state.tutor.deployment.audience}
              </small>
            </div>
          </div>
        }
      />
      <div className="wizard-steps" role="tablist">
        {["绑定知识", "教学人格", "数字人形态", "测试与发布"].map(
          (label, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={step === index + 1}
              className={
                step === index + 1 ? "active" : index + 1 < step ? "done" : ""
              }
              key={label}
              onClick={() => setStep(index + 1)}
            >
              <span>{index + 1 < step ? <Check size={15} /> : index + 1}</span>
              <strong>{label}</strong>
            </button>
          ),
        )}
      </div>
      <section className="card wizard-card">
        {step === 1 && (
          <div className="wizard-content">
            <div>
              <span className="section-kicker">Step 1</span>
              <h2>绑定课程知识</h2>
              <p>
                默认使用当前标准课程及已发布的 AI
                资源；知识图谱用于增强关系理解，不阻塞助教配置。
              </p>
            </div>
            <div className="binding-list">
              <button type="button" className="selected">
                <Database size={19} />
                <span>
                  <strong>{state.standardCourse.title} · 课程资源</strong>
                  <small>
                    {boundResources.length} 份已绑定 · 标准资源 + 已发布 AI 资源
                  </small>
                </span>
                <Check size={17} />
              </button>
              <button
                type="button"
                className={state.graph.generated ? "selected" : ""}
              >
                <Network size={19} />
                <span>
                  <strong>课程知识图谱（增强项）</strong>
                  <small>
                    {state.graph.generated
                      ? "9 个节点 · 8 条关系 · 已启用"
                      : "尚未生成，可在课程资源 → 知识结构中完善"}
                  </small>
                </span>
                {state.graph.generated ? (
                  <Check size={17} />
                ) : (
                  <CircleAlert size={17} />
                )}
              </button>
            </div>
            <button
              className="primary-button wizard-next"
              type="button"
              onClick={() => setStep(2)}
            >
              下一步：配置教学人格 <ArrowRight size={15} />
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="wizard-content">
            <div>
              <span className="section-kicker">Step 2</span>
              <h2>定义它怎样教，而不只是怎样答。</h2>
              <p>角色、风格和边界共同决定助教行为。</p>
            </div>
            <div className="persona-form">
              <label>
                <span>助教名称</span>
                <input defaultValue={state.tutor.persona.name} />
              </label>
              <label>
                <span>角色定位</span>
                <input defaultValue={state.tutor.persona.role} />
              </label>
              <label className="wide">
                <span>教学风格</span>
                <textarea defaultValue={state.tutor.persona.style} rows={3} />
              </label>
              <label className="wide">
                <span>知识边界</span>
                <textarea
                  defaultValue={state.tutor.persona.boundary}
                  rows={2}
                />
              </label>
            </div>
            <button
              className="primary-button wizard-next"
              type="button"
              onClick={saveConfig}
            >
              保存并配置数字人 <ArrowRight size={15} />
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="wizard-content">
            <div>
              <span className="section-kicker">Step 3</span>
              <h2>选择学生看到和听到的形态。</h2>
              <p>数字人是呈现方式，知识库与教学规则才是大脑。</p>
            </div>
            <div className="avatar-config">
              <div className="avatar-preview">
                <div className="avatar-face">
                  <UserRound size={54} />
                </div>
                <span className="voice-wave">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{state.tutor.persona.avatar}</strong>
                <small>“你好，我们先一起看问题出在哪里。”</small>
                <button
                  type="button"
                  onClick={() => onToast("数字人试讲预览已开始")}
                >
                  <Play size={14} fill="currentColor" /> 试听 8 秒
                </button>
              </div>
              <div className="avatar-options">
                <label>
                  <span>声音</span>
                  <select defaultValue={state.tutor.persona.voice}>
                    <option>知性女声 · 温和</option>
                    <option>青年男声 · 清晰</option>
                  </select>
                </label>
                <label>
                  <span>语气</span>
                  <select defaultValue="耐心引导">
                    <option>耐心引导</option>
                    <option>简洁直接</option>
                  </select>
                </label>
                <label>
                  <span>语速 {state.tutor.persona.speed.toFixed(1)}×</span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.1"
                    defaultValue={state.tutor.persona.speed}
                  />
                </label>
              </div>
            </div>
            <button
              className="primary-button wizard-next"
              type="button"
              onClick={saveConfig}
            >
              保存并测试助教 <ArrowRight size={15} />
            </button>
          </div>
        )}
        {step === 4 && (
          <div className="wizard-content">
            <div>
              <span className="section-kicker">Step 4</span>
              <h2>用真实问题完成发布检查。</h2>
              <p>答案必须包含引用；超出课程范围时必须明确拒答。</p>
            </div>
            <div className="tutor-test">
              <div className="test-chat">
                <label>
                  <input
                    value={testQuestion}
                    onChange={(event) => setTestQuestion(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={testTutor}
                    disabled={busy === "test"}
                  >
                    {busy === "test" ? "测试中…" : "发送测试"}
                  </button>
                </label>
                {testAnswer && (
                  <div className="test-answer">
                    <span>
                      <Bot size={18} />
                    </span>
                    <div>
                      <p>{testAnswer.content}</p>
                      <small>
                        {testAnswer.confidence}% 置信度 ·{" "}
                        {testAnswer.evidence?.length
                          ? "引用检查通过"
                          : "触发知识边界"}
                      </small>
                    </div>
                  </div>
                )}
              </div>
              <div className="publish-checks">
                <strong>发布检查</strong>
                {[
                  "课程资源已绑定",
                  "教学规则已设置",
                  "数字人预览正常",
                  testAnswer ? "回答边界已验证" : "等待对话测试",
                ].map((item, index) => {
                  const passed =
                    index === 0
                      ? boundResources.length > 0
                      : index === 1
                        ? state.tutor.configured
                        : index === 2
                          ? avatarReady
                          : Boolean(testAnswer);
                  return (
                    <span className={passed ? "passed" : ""} key={item}>
                      {passed ? <Check size={14} /> : <Clock3 size={14} />}
                      {item}
                    </span>
                  );
                })}
              </div>
            </div>
            <button
              className="primary-button wizard-next"
              type="button"
              onClick={publish}
              disabled={!readyToPublish || busy === "publish"}
            >
              {busy === "publish" ? (
                <>
                  <span className="spinner" /> 正在发布
                </>
              ) : (
                <>
                  <Link2 size={15} /> 发布到课程
                </>
              )}
            </button>
          </div>
        )}
      </section>
      {state.tutor.deployment.status === "published" && (
        <section className="card deployment-panel">
          <div>
            <span className="section-kicker">部署完成</span>
            <h3>{state.tutor.deployment.link}</h3>
            <p>
              {state.tutor.deployment.audience} ·{" "}
              {state.tutor.deployment.schedule} · 所有回答保留来源证据
            </p>
          </div>
          <div className="fake-qr">
            <QrCode size={58} />
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onToast("学生使用链接已复制")}
          >
            <Link2 size={15} /> 复制入口
          </button>
        </section>
      )}
    </div>
  );
}

export function StudentTutorView({ onToast }: { onToast: Toast }) {
  const { state, dispatch } = useDemoState();
  const { openEvidence } = useEvidenceCenter();
  const [input, setInput] = useState("作品出现文字水印时应该怎么调整？");
  const [busy, setBusy] = useState(false);
  const send = async (value = input) => {
    if (!value.trim()) return;
    dispatch({
      type: "ADD_TUTOR_MESSAGE",
      value: { id: `student-${Date.now()}`, role: "student", content: value },
    });
    setBusy(true);
    const reply = await aiDemoService.generateTutorReply(value);
    dispatch({ type: "ADD_TUTOR_MESSAGE", value: reply });
    setBusy(false);
    setInput("");
  };
  return (
    <div className="capability-page student-tutor-page">
      <WorkspaceHeader
        className="student-tutor-head"
        tone="learn"
        eyebrow={
          <>
            <Bot size={15} /> 启启 · 在线
          </>
        }
        title="课程 AI 助教"
        description="基于课程资料回答问题并标注来源；超出知识范围时会明确说明边界。"
      />
      <div className="student-tutor-layout">
        <section className="card tutor-chat-panel">
          <div className="chat-messages">
            {state.tutor.messages.map((message) => (
              <article
                className={`chat-message ${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" && (
                  <span>
                    <Bot size={17} />
                  </span>
                )}
                <div>
                  <p>{message.content}</p>
                  {message.node && (
                    <div className="chat-meta">
                      <span>{message.node}</span>
                      <span>{message.confidence}% 置信度</span>
                    </div>
                  )}
                  {message.evidence?.map((item) => (
                    <button
                      type="button"
                      key={item.section}
                      onClick={() => openEvidence("evidence-tutor-answer")}
                    >
                      <FileText size={13} /> {item.document} · {item.section}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {busy && (
              <div className="typing">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>
          <div className="quick-prompts">
            {["换一种解释", "举个例子", "生成一道练习"].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() =>
                  item === "生成一道练习"
                    ? onToast("已根据本次提问生成 1 道负向提示词练习")
                    : send(`${item}：负向提示词`)
                }
              >
                {item}
              </button>
            ))}
          </div>
          <div className="chat-composer">
            <input
              aria-label="向AI助教提问"
              placeholder="输入你的问题…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
            />
            <button type="button" aria-label="发送" onClick={() => void send()}>
              <Send size={17} />
            </button>
          </div>
        </section>
        <aside className="student-tutor-side">
          <section className="card">
            <span className="card-label">
              <Target size={15} /> 当前学习位置
            </span>
            <h3>负向提示词</h3>
            <p>错误率 46% · 建议先完成一次画面偏差诊断。</p>
            <div className="mini-progress">
              <i style={{ width: "54%" }} />
            </div>
          </section>
          <section className="card">
            <span className="card-label">
              <ShieldCheck size={15} /> 回答原则
            </span>
            <ul>
              <li>只引用课程资料</li>
              <li>先引导思路，不直接代做</li>
              <li>无法确认时建议询问教师</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export type AssessmentStudioTab =
  | "generate"
  | "bank"
  | "training"
  | "paper"
  | "grading";

export function AssessmentStudio({
  tab,
  onToast,
}: {
  tab: AssessmentStudioTab;
  onToast: Toast;
}) {
  if (tab === "generate") return <QuestionGenerator onToast={onToast} />;
  if (tab === "bank") return <QuestionBankView onToast={onToast} />;
  if (tab === "training") return <TrainingPlanView onToast={onToast} />;
  if (tab === "paper") return <PaperBuilderView onToast={onToast} />;
  return <AiGradingView onToast={onToast} />;
}

function QuestionGenerator({ onToast }: { onToast: Toast }) {
  const { state, dispatch } = useDemoState();
  const [busy, setBusy] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(3);
  const [types, setTypes] = useState<QuestionType[]>([
    "单选",
    "案例分析",
    "创作实操题",
  ]);
  const allTypes: QuestionType[] = [
    "单选",
    "多选",
    "判断",
    "填空",
    "简答",
    "案例分析",
    "创作实操题",
  ];
  const generate = async () => {
    setBusy(true);
    const config: QuestionGenerationConfig = {
      scene: "单元测",
      knowledgePoints: ["负向提示词", "生成偏差诊断"],
      types,
      count: 3,
      difficulty,
      cognitiveLevel: "应用",
    };
    dispatch({
      type: "SET_GENERATED_QUESTIONS",
      value: await aiDemoService.generateQuestions(config),
    });
    setBusy(false);
    onToast("已基于知识库生成 3 道题，并完成答案唯一性与来源检查");
  };
  return (
    <div className="capability-page assessment-capability">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        tone="assess"
        eyebrow={
          <>
            <WandSparkles size={15} /> 基于课程知识源
          </>
        }
        title="智能出题"
        description="选择知识范围、题型和难度，生成带答案、解析、量规与课程依据的可审核题目。"
        summary={
          <div className="source-pill">
            <Database size={17} />
            <span>
              <strong>课程知识库</strong>
              <small>{state.knowledgeBase.coverage}% 覆盖</small>
            </span>
          </div>
        }
      />
      <div className="question-studio">
        <aside className="card generation-config">
          <span className="section-kicker">命题配置</span>
          <h3>文生图单元测</h3>
          <label>
            <span>知识点</span>
            <button type="button">
              负向提示词、生成偏差诊断 <ChevronRight size={14} />
            </button>
          </label>
          <div className="config-group">
            <span>题型</span>
            <div className="choice-chips">
              {allTypes.map((type) => (
                <button
                  type="button"
                  className={types.includes(type) ? "selected" : ""}
                  key={type}
                  onClick={() =>
                    setTypes((current) =>
                      current.includes(type)
                        ? current.filter((item) => item !== type)
                        : [...current, type],
                    )
                  }
                >
                  {types.includes(type) && <Check size={12} />}
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="config-group">
            <span>难度 L{difficulty}</span>
            <input
              type="range"
              min="1"
              max="5"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(Number(event.target.value) as DifficultyLevel)
              }
            />
          </div>
          <label>
            <span>认知层级</span>
            <select defaultValue="应用">
              <option>理解</option>
              <option>应用</option>
              <option>分析</option>
              <option>创造</option>
            </select>
          </label>
          <button
            className="primary-button wide"
            type="button"
            onClick={generate}
            disabled={busy || state.knowledgeBase.status !== "ready"}
          >
            {busy ? (
              <>
                <span className="spinner" /> 正在生成与校验
              </>
            ) : state.knowledgeBase.status !== "ready" ? (
              <>
                <LockKeyhole size={15} /> 请先完成知识入库
              </>
            ) : (
              <>
                <Sparkles size={16} /> 生成 3 道题
              </>
            )}
          </button>
        </aside>
        <section className="generated-questions">
          <div className="section-heading">
            <div>
              <span className="section-kicker">生成结果</span>
              <h2>
                {state.generatedQuestions.length
                  ? `${state.generatedQuestions.length} 道题等待审核`
                  : "配置后生成可审核题目"}
              </h2>
            </div>
            {state.generatedQuestions.length > 0 && (
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  dispatch({ type: "SAVE_QUESTIONS" });
                  onToast("3 道题已审核并加入课程题库");
                }}
              >
                <Check size={15} /> 批量加入题库
              </button>
            )}
          </div>
          {state.generatedQuestions.length === 0 ? (
            <div className="empty-generation">
              <WandSparkles size={30} />
              <strong>AI不会直接把题目塞进试卷</strong>
              <p>生成后先展示依据、答案和评分量规，由教师确认。</p>
            </div>
          ) : (
            state.generatedQuestions.map((question) => (
              <article className="card generated-question" key={question.id}>
                <div className="question-meta">
                  <span>{question.type}</span>
                  <span>L{question.difficulty}</span>
                  <span>{question.cognitiveLevel}</span>
                  <b>{question.score} 分</b>
                </div>
                <h3>{question.stem}</h3>
                <div className="answer-block">
                  <strong>参考答案</strong>
                  <p>{question.answer}</p>
                  <small>{question.explanation}</small>
                </div>
                {question.rubric && (
                  <div className="rubric-mini">
                    {question.rubric.map((item) => (
                      <span key={item.label}>
                        {item.label} {item.score}分
                      </span>
                    ))}
                  </div>
                )}
                <button
                  className="source-evidence"
                  type="button"
                  onClick={() => onToast(question.source.excerpt)}
                >
                  <FileText size={14} /> {question.source.document} ·{" "}
                  {question.source.section} <b>{question.source.confidence}%</b>
                </button>
                <div className="question-tools">
                  <button
                    type="button"
                    onClick={() => onToast("题目已进入编辑状态")}
                  >
                    编辑
                  </button>
                  <button type="button" onClick={() => void generate()}>
                    <RefreshCw size={13} /> 重生成
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: "REMOVE_GENERATED_QUESTION",
                        id: question.id,
                      })
                    }
                  >
                    <Trash2 size={13} /> 删除
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function QuestionBankView({ onToast }: { onToast: Toast }) {
  const { state } = useDemoState();
  const [filter, setFilter] = useState<"全部" | QuestionType>("全部");
  const visible =
    filter === "全部"
      ? state.questionBank
      : state.questionBank.filter((item) => item.type === filter);
  return (
    <div className="capability-page assessment-capability">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        tone="assess"
        eyebrow={
          <>
            <ListChecks size={15} /> 课程题目资产
          </>
        }
        title="课程题库"
        description={`集中管理 ${state.questionBank.length} 道题目的知识点、难度、量规、使用效果和试卷关联。`}
        summary={
          <div className="graph-summary">
            <span>
              <strong>
                {
                  state.questionBank.filter((item) => item.origin === "AI生成")
                    .length
                }
              </strong>
              <small>AI生成</small>
            </span>
            <span>
              <strong>
                {state.questionBank.filter((item) => item.rubric).length}
              </strong>
              <small>含量规</small>
            </span>
            <span>
              <strong>v3.2</strong>
              <small>题库版本</small>
            </span>
          </div>
        }
      />
      <section className="card bank-card">
        <div className="bank-toolbar">
          <div className="choice-chips">
            {(
              [
                "全部",
                "单选",
                "多选",
                "判断",
                "案例分析",
                "创作实操题",
              ] as const
            ).map((item) => (
              <button
                type="button"
                className={filter === item ? "selected" : ""}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={15} />
            <input placeholder="搜索题目或知识点" />
          </label>
        </div>
        <div className="bank-table">
          <div className="bank-row bank-head">
            <span>题目</span>
            <span>知识点</span>
            <span>难度</span>
            <span>效果</span>
            <span>状态</span>
          </div>
          {visible.map((question) => (
            <button
              type="button"
              className="bank-row"
              key={question.id}
              onClick={() => onToast(`已打开题目详情：${question.explanation}`)}
            >
              <span>
                <b>{question.type}</b>
                <strong>{question.stem}</strong>
                <small>
                  {question.origin} · 使用 {question.usageCount} 次
                </small>
              </span>
              <span>{question.knowledgePoint}</span>
              <span>L{question.difficulty}</span>
              <span>
                {question.usageCount
                  ? `${question.correctRate}% 正确率`
                  : "尚未使用"}
              </span>
              <span className={question.enabled ? "enabled" : ""}>
                {question.enabled ? "使用中" : "已停用"}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrainingPlanView({ onToast }: { onToast: Toast }) {
  const { state, dispatch } = useDemoState();
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    const value = await aiDemoService.generateTrainingPlan();
    dispatch({ type: "SET_TRAINING_PLAN", ...value });
    setBusy(false);
    onToast("实训方案和实训操作题已生成");
  };
  return (
    <div className="capability-page assessment-capability">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        tone="assess"
        eyebrow={
          <>
            <Target size={15} /> AI 设计实训
          </>
        }
        title="实训方案"
        description="从技能目标生成可执行步骤、提交物和评分量规，并保持彼此一致。"
        actions={
          <button
            className="primary-button"
            type="button"
            onClick={generate}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="spinner" /> 正在设计实训
              </>
            ) : (
              <>
                <Sparkles size={16} /> 生成视觉控制实训
              </>
            )}
          </button>
        }
      />
      {!state.trainingPlan ? (
        <EmptyState
          className="large"
          icon={<Target size={28} />}
          title="尚未生成实训方案"
          description="当前目标为文生图视觉控制综合实训，预计 45 分钟，适合已掌握基础提示词结构的学生。"
        />
      ) : (
        <>
          <section className="training-plan-grid">
            <article className="card plan-overview">
              <span className="section-kicker">实训方案</span>
              <div className="plan-title">
                <div>
                  <h2>{state.trainingPlan.title}</h2>
                  <p>{state.trainingPlan.objective}</p>
                </div>
                <span>
                  <Clock3 size={15} /> {state.trainingPlan.duration} 分钟
                </span>
              </div>
              <div className="training-steps">
                {state.trainingPlan.steps.map((step, index) => (
                  <div key={step.title}>
                    <span>0{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <small>{step.checkpoint}</small>
                    </div>
                    <em>{step.minutes} min</em>
                  </div>
                ))}
              </div>
              <div className="deliverables">
                <strong>最终提交物</strong>
                {state.trainingPlan.deliverables.map((item) => (
                  <span key={item}>
                    <Check size={13} /> {item}
                  </span>
                ))}
              </div>
            </article>
            <article className="card practical-card">
              <span className="section-kicker">同步生成的实训题</span>
              <h2>{state.practicalAssessment?.title}</h2>
              <p>{state.practicalAssessment?.brief}</p>
              <div className="checkpoint-list">
                {state.practicalAssessment?.checkpoints.map((item) => (
                  <span key={item}>
                    <Target size={14} /> {item}
                  </span>
                ))}
              </div>
              <div className="rubric-list">
                {state.practicalAssessment?.rubric.map((item) => (
                  <div key={item.label}>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <b>{item.score}</b>
                  </div>
                ))}
              </div>
              <button
                className="primary-button wide"
                type="button"
                onClick={() =>
                  onToast("实训题已加入题库，可用于下一次智能组卷")
                }
              >
                <Plus size={15} /> 加入题库与试卷
              </button>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

function PaperBuilderView({ onToast }: { onToast: Toast }) {
  const { state, dispatch } = useDemoState();
  const [busy, setBusy] = useState(false);
  const assemble = async () => {
    setBusy(true);
    dispatch({
      type: "SET_PAPER",
      value: await aiDemoService.assemblePaper(
        defaultBlueprint,
        state.questionBank,
      ),
    });
    setBusy(false);
    onToast("A卷已生成，5项质量检查全部通过");
  };
  return (
    <div className="capability-page assessment-capability">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        tone="assess"
        eyebrow={
          <>
            <FileCheck2 size={15} /> 100 分测评蓝图
          </>
        }
        title="智能组卷"
        description="按知识覆盖、难度曲线和评分主体匹配题目，并在发布前完成质量检查。"
        summary={
          <div className="score-formula">
            <span>机器 30</span>
            <b>+</b>
            <span>AI 50</span>
            <b>+</b>
            <span>人工 20</span>
            <strong>= 100</strong>
          </div>
        }
      />
      <div className="paper-builder">
        <aside className="card blueprint-card">
          <span className="section-kicker">组卷蓝图</span>
          <h3>文生图视觉控制 · 单元测</h3>
          <dl>
            <div>
              <dt>考试时长</dt>
              <dd>45 分钟</dd>
            </div>
            <div>
              <dt>总分</dt>
              <dd>100 分</dd>
            </div>
            <div>
              <dt>知识覆盖</dt>
              <dd>5 个核心节点</dd>
            </div>
          </dl>
          <div className="difficulty-distribution">
            <strong>难度分布</strong>
            <span>
              <i style={{ width: "30%" }} />
              基础 30%
            </span>
            <span>
              <i style={{ width: "50%" }} />
              进阶 50%
            </span>
            <span>
              <i style={{ width: "20%" }} />
              挑战 20%
            </span>
          </div>
          <button
            className="primary-button wide"
            type="button"
            onClick={assemble}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="spinner" /> 正在匹配题目
              </>
            ) : (
              <>
                <Sparkles size={15} /> 自动组卷
              </>
            )}
          </button>
        </aside>
        <section className="paper-result">
          {!state.paper ? (
            <div className="empty-generation">
              <FileCheck2 size={30} />
              <strong>题库当前有 {state.questionBank.length} 道可用题目</strong>
              <p>生成后将展示双向细目表和质量检查。</p>
            </div>
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <span className="section-kicker">
                    {state.paper.version} 卷 ·{" "}
                    {state.paper.status === "published" ? "已发布" : "草稿"}
                  </span>
                  <h2>{state.paper.title}</h2>
                </div>
                <div className="paper-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onToast("已生成知识点等值的B卷")}
                  >
                    生成 B 卷
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={state.paper.status === "published"}
                    onClick={() => {
                      dispatch({ type: "PUBLISH_PAPER" });
                      onToast("单元测已发布到学生端");
                    }}
                  >
                    {state.paper.status === "published" ? (
                      <>
                        <Check size={15} /> 已发布
                      </>
                    ) : (
                      <>
                        发布试卷 <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
              <section className="card paper-table">
                <div className="paper-table-head">
                  <span>题号</span>
                  <span>题型 / 知识点</span>
                  <span>认知层级</span>
                  <span>难度</span>
                  <span>分值</span>
                </div>
                {state.paper.questions.map((question, index) => (
                  <div className="paper-table-row" key={question.id}>
                    <span>0{index + 1}</span>
                    <span>
                      <strong>{question.type}</strong>
                      <small>{question.knowledgePoint}</small>
                    </span>
                    <span>{question.cognitiveLevel}</span>
                    <span>L{question.difficulty}</span>
                    <b>{question.score}</b>
                  </div>
                ))}
              </section>
              <div className="quality-checks">
                {state.paper.checks.map((check) => (
                  <div
                    className={check.passed ? "passed" : ""}
                    key={check.label}
                  >
                    {check.passed ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      <CircleAlert size={17} />
                    )}
                    <span>
                      <strong>{check.label}</strong>
                      <small>{check.detail}</small>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function AiGradingView({ onToast }: { onToast: Toast }) {
  const { state, dispatch } = useDemoState();
  const { openEvidence } = useEvidenceCenter();
  const [busy, setBusy] = useState(false);
  const grade = async () => {
    setBusy(true);
    dispatch({
      type: "SET_GRADED_ASSIGNMENTS",
      value: await aiDemoService.gradeAssignments(),
    });
    setBusy(false);
    onToast("3 份作业已完成机器判分和AI初评");
  };
  return (
    <div className="capability-page assessment-capability">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        tone="assess"
        eyebrow={
          <>
            <FileCheck2 size={15} /> 作品、提示词与迭代证据
          </>
        }
        title="AI 批改"
        description="批量导入学生作业，查看评分证据与置信度，异常结果由教师复核。"
        actions={
          state.gradedAssignments.length > 0 ? (
            <button
              className="primary-button"
              type="button"
              onClick={grade}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" /> 正在重新批改
                </>
              ) : (
                <>
                  <Upload size={15} /> 继续导入作业
                </>
              )}
            </button>
          ) : undefined
        }
      />
      {state.gradedAssignments.length === 0 ? (
        <EmptyState
          className="large grading-empty"
          icon={<FileCheck2 size={28} />}
          title="暂无待批改作业"
          description="导入学生作品、提示词和迭代说明后，系统将生成机器判分、AI 评分证据与置信度。"
          action={
            <button
              className="primary-button"
              type="button"
              onClick={grade}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner" /> 正在批改 3 份作业
                </>
              ) : (
                <>
                  <Upload size={15} /> 导入并批改 3 份作业
                </>
              )}
            </button>
          }
        />
      ) : (
        <div className="grading-grid">
          <section className="card grading-list">
            <div className="card-heading">
              <div>
                <h3>批改队列</h3>
                <p>1 份异常建议优先复核</p>
              </div>
            </div>
            {state.gradedAssignments.map((item, index) => (
              <button
                type="button"
                className={index === 0 ? "active" : ""}
                key={item.student}
                onClick={() => onToast(`已打开${item.student}的评分证据`)}
              >
                <span>{item.student.slice(-1)}</span>
                <div>
                  <strong>{item.student}</strong>
                  <small>置信度 {item.confidence}%</small>
                </div>
                <em className={`status-${item.status}`}>{item.status}</em>
                <b>{item.score}</b>
              </button>
            ))}
          </section>
          <section className="card grading-evidence">
            <div className="card-heading">
              <div>
                <span className="section-kicker">林一诺 · 评分证据</span>
                <h3>任务完成充分，负向提示词仍可更精准</h3>
              </div>
              <strong className="grading-score">88</strong>
            </div>
            {[
              "任务符合度 18/20",
              "提示词结构 18/20",
              "视觉控制 25/30",
              "迭代反思 27/30",
            ].map((item, index) => (
              <div className="grading-dimension" key={item}>
                <span>{item}</span>
                <i>
                  <b style={{ width: `${[90, 90, 83, 90][index]}%` }} />
                </i>
                <button
                  type="button"
                  onClick={() => openEvidence("evidence-ai-score")}
                >
                  查看证据
                </button>
              </div>
            ))}
            <label className="grading-note">
              <span>教师复核意见</span>
              <textarea
                defaultValue="迭代记录完整；建议进一步说明负向提示词与具体偏差的对应关系。"
                rows={3}
              />
            </label>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                dispatch({ type: "CONFIRM_GRADED_ASSIGNMENTS" });
                onToast("评分修订已保存，学生画像与报告已同步更新");
              }}
            >
              <Check size={15} /> 确认批改结果
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export function TutorInsightsView({ onToast }: { onToast: Toast }) {
  const { state } = useDemoState();
  return (
    <div className="capability-page">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        tone="report"
        eyebrow={
          <>
            <MessageSquareText size={15} /> 对话质量与知识命中
          </>
        }
        title="助教运营报告"
        description={
          state.tutor.deployment.status === "published"
            ? "查看问题解决率、知识库命中、高频问题和需要人工接管的对话。"
            : "发布助教后将持续收集匿名化学习问题并形成运营证据。"
        }
        actions={
          <button
            className="secondary-button"
            type="button"
            onClick={() => onToast("已生成本周AI助教答疑报告")}
          >
            <FileText size={15} /> 导出答疑报告
          </button>
        }
      />
      <div className="insight-metrics">
        {[
          ["286", "本周对话"],
          ["84%", "问题解决率"],
          ["91%", "知识库命中"],
          ["7", "人工接管"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="insight-grid">
        <section className="card">
          <div className="card-heading">
            <div>
              <h3>高频问题</h3>
              <p>自动聚类 286 条对话</p>
            </div>
          </div>
          {[
            ["负向提示词怎么写", "42次", "negative"],
            ["画面焦点不明确", "31次", "composition"],
            ["风格词互相冲突", "18次", "style"],
          ].map(([title, count, id]) => (
            <button
              type="button"
              className="faq-row"
              key={title}
              onClick={() => onToast(`已打开“${title}”的对话样本`)}
            >
              <span>
                <MessageSquareText size={15} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>
                  {count} · 对应知识节点 {id}
                </small>
              </div>
              <ChevronRight size={15} />
            </button>
          ))}
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h3>需要教师处理</h3>
              <p>低置信度与知识缺口</p>
            </div>
          </div>
          <div className="intervention">
            <CircleAlert size={18} />
            <div>
              <strong>文字水印反例不足</strong>
              <p>7 次回答置信度低于 60%，建议补充一组正反案例。</p>
            </div>
            <button
              type="button"
              onClick={() => onToast("已生成知识补充卡并加入待处理列表")}
            >
              补充知识库
            </button>
          </div>
          <div className="intervention">
            <UserRound size={18} />
            <div>
              <strong>3 个创意评价问题</strong>
              <p>涉及开放判断，已转交教师复核。</p>
            </div>
            <button type="button" onClick={() => onToast("已打开人工接管对话")}>
              人工接管
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function StudentProfileView({ onToast }: { onToast: Toast }) {
  const { state, dispatch } = useDemoState();
  const trend = state.profileUpdated ? [62, 71, 79, 88] : [62, 71, 79, 84];
  return (
    <div className="capability-page">
      <WorkspaceHeader
        className="capability-hero compact-hero"
        tone="report"
        eyebrow={
          <>
            <UserRound size={15} /> 六类学习证据
          </>
        }
        title="学生画像"
        description="综合测评、练习、作品、助教互动、学习时长和教师评价，呈现可追溯的成长轨迹。"
        actions={
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              dispatch({ type: "UPDATE_PROFILE" });
              onToast("三次历史成绩已合并，学生画像已更新");
            }}
          >
            <Upload size={15} /> 导入历史成绩并更新
          </button>
        }
      />
      <div className="profile-layout">
        <section className="card profile-main">
          <div className="profile-person">
            <span>林</span>
            <div>
              <h2>林一诺</h2>
              <p>AI24018 · 人工智能 2401 班</p>
            </div>
            <em>
              {state.profileUpdated ? "画像刚刚更新" : "6类数据 · 可信度 92%"}
            </em>
          </div>
          <div className="profile-trend">
            <div className="card-heading">
              <div>
                <h3>综合能力趋势</h3>
                <p>最近三次测评 + 当前课程过程数据</p>
              </div>
              <strong>{trend[3]}</strong>
            </div>
            <div className="trend-chart">
              {trend.map((value, index) => (
                <div key={index}>
                  <span>{value}</span>
                  <i style={{ height: `${value}%` }} />
                  <small>{["课前", "第一次", "第二次", "当前"][index]}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="profile-evidence">
            {[
              ["三次测评", "84.6分", "成绩数据"],
              ["课堂练习", "76%", "正确率"],
              ["作品迭代", "3版", "过程记录"],
              ["AI助教互动", "12次", "4个知识点"],
              ["学习时长", "86分钟", "本单元"],
              ["教师评价", "18/20", "创作过程"],
            ].map(([label, value, source]) => (
              <button
                type="button"
                key={label}
                onClick={() => onToast(`已打开${label}的数据依据`)}
              >
                <span>
                  <strong>{label}</strong>
                  <small>{source}</small>
                </span>
                <b>{value}</b>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </section>
        <aside className="card profile-insights">
          <span className="section-kicker">画像结论与依据</span>
          <h3>视觉控制进步明显，偏差诊断仍不稳定。</h3>
          <div className="profile-tags">
            <span className="positive">结构表达清晰</span>
            <span className="positive">迭代意识增强</span>
            <span className="warning">排除词迁移不足</span>
          </div>
          <div className="profile-reason">
            <strong>为什么这样判断</strong>
            <p>
              最近两次作品能主动调整构图，但在4次水印与文字偏差中有2次未选择针对性排除词。
            </p>
          </div>
          <button
            className="primary-button wide"
            type="button"
            onClick={() => onToast("已生成偏差诊断补学任务")}
          >
            生成补学任务
          </button>
        </aside>
      </div>
    </div>
  );
}

export function TrainingTaskMap({ onToast }: { onToast: Toast }) {
  const { state } = useDemoState();
  const grouped = useMemo(
    () =>
      ["知识底座", "AI助教", "命题组卷", "批改分析"].map((ability) => ({
        ability,
        tasks: trainingTasks.filter((task) => task.ability === ability),
      })),
    [],
  );
  return (
    <section className="training-task-section">
      <div className="tool-square-head">
        <div>
          <span className="section-kicker">培训任务地图</span>
          <h2>四条能力链，十一项真实任务</h2>
          <p>完成上游产物后，下游任务自动解锁。</p>
        </div>
        <span className="progress-pill">
          {state.teacherReport.completed} / {state.teacherReport.total} 已完成
        </span>
      </div>
      <div className="task-chain-grid">
        {grouped.map((group, groupIndex) => (
          <section className="task-chain" key={group.ability}>
            <div className="task-chain-title">
              <span>0{groupIndex + 1}</span>
              <div>
                <strong>{group.ability}</strong>
                <small>{group.tasks.length} 项任务</small>
              </div>
            </div>
            {group.tasks.map((task) => {
              const progress = state.taskProgress.find(
                (item) => item.taskId === task.id,
              )!;
              return (
                <button
                  type="button"
                  className={`training-task ${progress.status}`}
                  key={task.id}
                  onClick={() =>
                    progress.status === "locked"
                      ? onToast(
                          `请先完成前置任务：${trainingTasks.find((item) => item.id === task.prerequisite)?.title}`,
                        )
                      : onToast(
                          progress.status === "completed"
                            ? `${task.title}：得分 ${progress.score}，用时 ${progress.actualMinutes} 分钟`
                            : `请从对应功能页开始“${task.title}”`,
                        )
                  }
                >
                  <span className="task-status">
                    {progress.status === "completed" ? (
                      <Check size={15} />
                    ) : progress.status === "locked" ? (
                      <LockKeyhole size={14} />
                    ) : (
                      <Play size={13} />
                    )}
                  </span>
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {task.frequency} · L{task.difficulty} ·{" "}
                      {task.standardMinutes} min
                    </small>
                    <em>
                      {task.input} → {task.output}
                    </em>
                  </div>
                  {progress.status === "completed" && <b>{progress.score}</b>}
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </section>
  );
}

export function TeacherAbilityView({ onToast }: { onToast: Toast }) {
  const { state } = useDemoState();
  const report = state.teacherReport;
  const levelDisplay = report.gatePassed === false && report.calculatedLevel
    ? `待通关 · 能力测算 ${report.calculatedLevel}`
    : report.level;
  return (
    <section className="ability-report-section">
      <WorkspaceHeader
        className="ability-report-head"
        tone="report"
        eyebrow={
          <>
            <GraduationCap size={14} /> 周岚老师 · {levelDisplay}
          </>
        }
        title="教师 AI 能力"
        description="能力来自测评、任务、作品和应用证据；三项门槛不计分但决定正式定级。"
        summary={
          <div className="level-orb">
            <strong>{report.completed}</strong>
            <span>/ {report.total} 项任务</span>
          </div>
        }
      />
      <div className="ability-report-grid">
        <section className="card ability-dimensions">
          <div className="card-heading">
            <div>
              <h3>五维能力</h3>
              <p>随任务完成实时更新</p>
            </div>
          </div>
          {report.dimensions.map((item) => (
            <div className="ability-row" key={item.label}>
              <span>{item.label}</span>
              <i>
                <b style={{ width: `${item.value}%` }} />
              </i>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>
        <section className="card ability-levels">
          <div className="card-heading">
            <div>
              <h3>成长等级</h3>
              <p>从会使用到能组合创新</p>
            </div>
          </div>
          {["L1 AI入门者", "L2 AI实践者", "L3 AI创新者", "L4 AI引领者"].map(
            (level, index) => (
              <div
                className={
                  report.level.startsWith(`L${index + 1}`)
                    ? "current"
                    : report.level > level
                      ? "done"
                      : ""
                }
                key={level}
              >
                <span>{index + 1}</span>
                <strong>{level}</strong>
                {report.level.startsWith(`L${index + 1}`) && <em>当前</em>}
              </div>
            ),
          )}
        </section>
        <section className="card next-training">
          <span>
            <Sparkles size={20} />
          </span>
          <div>
            <small>推荐下一项任务</small>
            <h3>{report.nextTask}</h3>
            <p>完成后将同时提升知识底座和组合应用能力。</p>
            <button
              type="button"
              onClick={() => onToast(`已定位培训任务：${report.nextTask}`)}
            >
              开始任务 <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
