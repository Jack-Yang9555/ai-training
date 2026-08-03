import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileCheck2,
  FlaskConical,
  FolderKanban,
  Lightbulb,
  LockKeyhole,
  Play,
  Save,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import {
  aiToolCategories,
  aiTools,
  getAiTool,
  type AiToolCategory,
  type AiToolDefinition,
} from "./aiTools";
import { WorkspaceHeader } from "./ui";
import { useDemoState } from "./demoState";

type ResearchSection = "projects" | "tools" | "agent" | "outputs";

const researchSteps = [
  {
    title: "明确问题与研究设计",
    description: "将教学观察转为可研究问题，明确对象、变量、方法和伦理边界。",
    toolIds: ["deep-research", "prompt"],
    output: "研究问题卡 · 行动研究方案",
  },
  {
    title: "汇集文献与过程证据",
    description: "检索并筛选可信来源，建立可回溯的文献、课堂观察和访谈证据库。",
    toolIds: ["literature", "rag"],
    output: "证据矩阵 · 资料知识库",
  },
  {
    title: "分析数据与验证干预",
    description: "分析匿名数据，搭建轻量研究工具或工作流，并记录模型与人工判断差异。",
    toolIds: ["data-analysis", "dify", "vibe-coding"],
    output: "分析报告 · 干预原型",
  },
  {
    title: "形成成果并完成复核",
    description: "整理结论、局限与证据链，检查引用、隐私、AI 使用披露和可复现性。",
    toolIds: ["multimodal-create", "evaluate"],
    output: "研究简报 · 复核清单",
  },
] as const;

const projectOutputs = [
  {
    name: "研究问题与方法卡",
    status: "已完成",
    detail: "问题、对象、周期、观察指标和伦理说明已确认",
  },
  {
    name: "文献证据矩阵",
    status: "进行中",
    detail: "已整理 18 / 30 条来源，3 条结论需要交叉核验",
  },
  {
    name: "课堂观察数据集",
    status: "待开始",
    detail: "仅允许匿名数据，导入前需完成字段脱敏检查",
  },
  {
    name: "阶段研究简报",
    status: "待开始",
    detail: "必须披露 AI 辅助范围、人工复核方式与研究局限",
  },
] as const;

function ToolDialog({
  tool,
  onClose,
  onToast,
}: {
  tool: AiToolDefinition;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const Icon = tool.icon;
  return (
    <div
      className="tool-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="tool-dialog research-tool-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${tool.name}研究使用配置`}
      >
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} />
        </button>
        <div className={`dialog-tool-icon tool-${tool.color}`}>
          <Icon size={25} />
        </div>
        <span className="section-kicker">教师研究 · 项目过程留痕</span>
        <h2>{tool.name}</h2>
        <p>{tool.description}</p>
        <div className="starter-task">
          <span>
            <Target size={17} />
          </span>
          <div>
            <strong>当前研究建议任务</strong>
            <p>{tool.starterTask}</p>
          </div>
        </div>
        <div className="research-tool-boundary">
          <ShieldCheck size={17} />
          <span>只使用匿名模拟数据；AI 结果需由教师核验后才能进入研究成果。</span>
        </div>
        <div className="dialog-options">
          <button type="button" onClick={() => onToast("已关联当前研究项目") }>
            当前研究项目 <ChevronDown size={14} />
          </button>
          <button type="button" onClick={() => onToast("过程记录已开启") }>
            保留过程记录 <Check size={14} />
          </button>
        </div>
        <button
          className="primary-button wide"
          type="button"
          onClick={() => {
            onToast(`${tool.name}已加入研究项目，模拟工作区已启动`);
            onClose();
          }}
        >
          <Play size={16} fill="currentColor" /> 开始研究任务
        </button>
      </section>
    </div>
  );
}

function ResearchToolGrid({
  onSelect,
  onToast,
}: {
  onSelect: (tool: AiToolDefinition) => void;
  onToast: (message: string) => void;
}) {
  const [category, setCategory] = useState<"全部" | AiToolCategory>("全部");
  const visibleTools = useMemo(
    () =>
      category === "全部"
        ? aiTools
        : aiTools.filter((tool) => tool.category === category),
    [category],
  );

  return (
    <>
      <section className="tool-square research-tool-square">
        <div className="tool-square-head">
          <div>
            <span className="section-kicker">与自由实训共用工具目录</span>
            <h2>{aiTools.length} 类 AI 工具，按研究任务调用</h2>
            <p>工具能力、分类和启动方式与“自由实训”保持一致，研究模式额外记录项目、证据和复核状态。</p>
          </div>
          <div className="tool-filters" aria-label="研究工具分类">
            {(["全部", ...aiToolCategories] as const).map((item) => (
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
              <article className="tool-card research-tool-card" key={tool.id}>
                <div className={`tool-icon tool-${tool.color}`}>
                  <Icon size={23} />
                </div>
                <div className="tool-card-top">
                  <span>{tool.category}</span>
                  <em>{tool.level}</em>
                </div>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <div className="research-use-note">
                  <Lightbulb size={14} />
                  <span>{tool.researchUse}</span>
                </div>
                <div className="tool-tags">
                  {tool.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="tool-card-footer">
                  <small>{tool.users} 人练过</small>
                  <button type="button" onClick={() => onSelect(tool)}>
                    用于研究 <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="free-practice-strip research-design-strip">
        <div>
          <span>
            <Sparkles size={20} />
          </span>
          <div>
            <strong>不知道该组合哪些工具？</strong>
            <p>描述研究问题、资料类型和预期成果，AI 会生成可修改的工具链与复核节点。</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToast("已生成：深度研究 → 证据库 → 数据分析 → 成果复核工具链")}
        >
          <Sparkles size={16} /> AI 设计研究工具链
        </button>
      </section>
    </>
  );
}

export function TeacherResearchWorkspace({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const { state, dispatch } = useDemoState();
  const [section, setSection] = useState<ResearchSection>("projects");
  const [activeStep, setActiveStep] = useState(1);
  const [selectedTool, setSelectedTool] = useState<AiToolDefinition | null>(null);
  const recommendedTools = [
    getAiTool("deep-research"),
    getAiTool("literature"),
    getAiTool("data-analysis"),
  ].filter((tool): tool is AiToolDefinition => tool !== null);

  return (
    <div className="page research-page">
      <WorkspaceHeader
        tone="assess"
        variant="overview"
        eyebrow={
          <>
            <SearchCheck size={15} /> 教师专属 · AI 辅助研究
          </>
        }
        title="AI 研究工作台"
        description="从教学问题出发，组合与自由实训一致的 AI 工具，完成证据可追溯、过程可复核的研究项目。"
        summary={
          <div className="research-summary-badge">
            <strong>1</strong>
            <span>项进行中课题</span>
            <small>资料仅使用匿名模拟数据</small>
          </div>
        }
        actions={
          <button
            className="primary-button"
            type="button"
            onClick={() => onToast("新建研究项目向导已打开：请先明确问题、对象与伦理边界")}
          >
            <FolderKanban size={16} /> 新建研究项目
          </button>
        }
      />

      <div className="context-tabs research-tabs" role="tablist" aria-label="教师研究功能">
        {([
          { id: "projects", label: "研究项目", note: "问题到成果" },
          { id: "tools", label: "AI 工具", note: `${aiTools.length} 类共享工具` },
          { id: "agent", label: "科研智能体", note: `草稿 v${state.teacherGrowth.researchAgent.version}` },
          { id: "outputs", label: "成果与伦理", note: "引用与复核" },
        ] as const).map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={section === item.id}
            className={section === item.id ? "active" : ""}
            key={item.id}
            onClick={() => setSection(item.id)}
          >
            <strong>{item.label}</strong>
            <small>{item.note}</small>
          </button>
        ))}
      </div>

      {section === "projects" && (
        <>
          <section className="research-project-card">
            <div className="research-project-heading">
              <div>
                <span className="section-kicker">进行中的行动研究</span>
                <h2>生成式 AI 支持高职视觉设计反馈的行动研究</h2>
                <p>研究问题：结构化 AI 反馈能否提升学生提示词迭代质量与反思深度？</p>
              </div>
              <span className="status-badge status-active">进行中 · 第 2 / 4 阶段</span>
            </div>
            <div className="research-project-meta">
              <span><Clock3 size={15} /> 2026.07—2026.10</span>
              <span><BookOpenCheck size={15} /> 已纳入 18 条文献证据</span>
              <span><LockKeyhole size={15} /> 匿名样本 · 教师可见</span>
            </div>
            <div className="research-progress" aria-label="研究项目进度">
              <span style={{ width: `${activeStep * 25}%` }} />
            </div>
          </section>

          <section className="research-workflow-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">可复核研究流程</span>
                <h2>四步完成从问题到成果</h2>
                <p>AI 生成内容均保留来源、参数和人工确认状态。</p>
              </div>
            </div>
            <div className="research-step-grid">
              {researchSteps.map((step, index) => {
                const stepNumber = index + 1;
                const completed = stepNumber < activeStep;
                const current = stepNumber === activeStep;
                return (
                  <article
                    className={`research-step-card ${completed ? "completed" : ""} ${current ? "current" : ""}`}
                    key={step.title}
                  >
                    <div className="research-step-number">
                      {completed ? <Check size={16} /> : stepNumber}
                    </div>
                    <span>{current ? "当前阶段" : completed ? "已完成" : "待开始"}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <div className="research-step-tools">
                      {step.toolIds.map((id) => {
                        const tool = getAiTool(id);
                        return tool ? <span key={id}>{tool.name}</span> : null;
                      })}
                    </div>
                    <small>产出：{step.output}</small>
                    {current && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStep((value) => Math.min(value + 1, researchSteps.length));
                          onToast(`${step.title}的阶段记录已更新`);
                        }}
                      >
                        继续当前阶段 <ArrowRight size={14} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="research-recommendations">
            <div className="section-heading">
              <div>
                <span className="section-kicker">当前阶段推荐</span>
                <h2>先补齐证据，再进入数据分析</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setSection("tools") }>
                查看全部 AI 工具 <ArrowRight size={14} />
              </button>
            </div>
            <div className="research-recommendation-grid">
              {recommendedTools.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <article key={tool.id}>
                    <span className={`tool-icon tool-${tool.color}`}><Icon size={19} /></span>
                    <div>
                      <small>{index === 0 ? "建议先用" : "随后使用"}</small>
                      <h3>{tool.name}</h3>
                      <p>{tool.researchUse}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedTool(tool)}>开始使用</button>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {section === "tools" && (
        <ResearchToolGrid onSelect={setSelectedTool} onToast={onToast} />
      )}

      {section === "agent" && (() => {
        const agent = state.teacherGrowth.researchAgent;
        const sources = [
          { id: "source-001", title: "匿名课堂观察记录", meta: "32 条 · 已脱敏 · 已导入" },
          { id: "source-002", title: "结构化反馈文献证据矩阵", meta: "18 篇 · v1.2 · 已导入" },
          { id: "source-003", title: "学生作品迭代编码表", meta: "24 份 · 匿名样本 · 已导入" },
        ];
        const agentTools = ["deep-research", "rag", "data-analysis", "dify"]
          .map((id) => getAiTool(id))
          .filter((tool): tool is AiToolDefinition => Boolean(tool));
        const toggleSource = (id: string) => dispatch({ type: "UPDATE_RESEARCH_AGENT", patch: { sourceIds: agent.sourceIds.includes(id) ? agent.sourceIds.filter((item) => item !== id) : [...agent.sourceIds, id] } });
        const toggleTool = (id: string) => dispatch({ type: "UPDATE_RESEARCH_AGENT", patch: { toolIds: agent.toolIds.includes(id) ? agent.toolIds.filter((item) => item !== id) : [...agent.toolIds, id] } });
        return (
          <div className="research-agent-layout">
            <section className="research-agent-builder">
              <div className="section-heading"><div><span className="section-kicker">科研智能体设计流程</span><h2>课堂互动研究助理</h2><p>选择项目与已导入资料，配置角色和工具后进行确定性模拟测试。</p></div><span className={`agent-status status-${agent.status}`}>{agent.status === "draft" ? "草稿" : agent.status === "tested" ? "已测试" : "已保存"} · v{agent.version}</span></div>
              <div className="agent-builder-step"><span>1</span><div><label htmlFor="agent-project">关联研究项目</label><select id="agent-project" value={agent.projectId} onChange={(event) => dispatch({ type: "UPDATE_RESEARCH_AGENT", patch: { projectId: event.target.value } })}><option value="project-001">生成式 AI 支持高职视觉设计反馈的行动研究</option></select></div></div>
              <div className="agent-builder-step"><span>2</span><div><strong>绑定已导入资料</strong><div className="agent-option-grid">{sources.map((source) => <label key={source.id}><input type="checkbox" checked={agent.sourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} /><span>{source.title}<small>{source.meta}</small></span></label>)}</div></div></div>
              <div className="agent-builder-step"><span>3</span><div><label htmlFor="agent-persona">角色与任务边界</label><textarea id="agent-persona" value={agent.persona} onChange={(event) => dispatch({ type: "UPDATE_RESEARCH_AGENT", patch: { persona: event.target.value } })} /></div></div>
              <div className="agent-builder-step"><span>4</span><div><strong>可调用 AI 工具</strong><div className="agent-tool-picker">{agentTools.map((tool) => <button className={agent.toolIds.includes(tool.id) ? "is-active" : ""} type="button" key={tool.id} onClick={() => toggleTool(tool.id)}>{agent.toolIds.includes(tool.id) && <Check size={14} />}{tool.name}</button>)}</div></div></div>
              <div className="agent-action-row"><button className="secondary-button" type="button" disabled={!agent.sourceIds.length || !agent.toolIds.length} onClick={() => dispatch({ type: "TEST_RESEARCH_AGENT" })}><Play size={15} />模拟测试</button><button className="primary-button" type="button" disabled={agent.status === "draft"} onClick={() => dispatch({ type: "SAVE_RESEARCH_AGENT" })}><Save size={15} />保存新版本</button><button className="secondary-button" type="button" disabled={agent.status !== "saved"} onClick={() => dispatch({ type: "LINK_RESEARCH_AGENT_OUTPUT" })}><FileCheck2 size={15} />关联研究成果</button></div>
              {agent.testResult && <div className="agent-test-result"><CheckCircle2 size={18} /><div><strong>模拟运行通过</strong><p>{agent.testResult}</p></div></div>}
              {agent.linkedOutput && <div className="agent-linked-output"><FileCheck2 size={18} />{agent.linkedOutput}</div>}
            </section>
            <aside className="research-agent-governance"><Bot size={28} /><span className="section-kicker">运行与交付边界</span><h2>四项状态必须可见</h2>{[
              ["citations", "来源引用", "每条观点回到原始资料"],
              ["manualReview", "人工确认", "教师确认后才能进入成果"],
              ["anonymousData", "匿名数据", "不处理真实身份字段"],
              ["aiDisclosure", "AI 使用披露", "记录模型、提示与辅助范围"],
            ].map(([key, label, detail]) => <div key={key}><CheckCircle2 size={17} /><span><strong>{label}</strong><small>{detail}</small></span></div>)}</aside>
          </div>
        );
      })()}

      {section === "outputs" && (
        <div className="research-output-layout">
          <section className="research-output-card">
            <div className="section-heading">
              <div>
                <span className="section-kicker">研究成果包</span>
                <h2>每项结论都能回到来源与过程</h2>
              </div>
            </div>
            <div className="research-output-list">
              {projectOutputs.map((output) => (
                <article key={output.name}>
                  <span><FileCheck2 size={18} /></span>
                  <div>
                    <h3>{output.name}</h3>
                    <p>{output.detail}</p>
                  </div>
                  <em className={`output-status output-${output.status}`}>{output.status}</em>
                </article>
              ))}
            </div>
          </section>
          <aside className="research-ethics-card">
            <span className="section-kicker">研究诚信与 AI 使用边界</span>
            <h2>提交成果前必须完成</h2>
            <ul>
              <li><CheckCircle2 size={17} /> 学生与访谈数据已匿名化</li>
              <li><CheckCircle2 size={17} /> 关键结论至少有两类证据支持</li>
              <li><CheckCircle2 size={17} /> 引用可回到原始来源位置</li>
              <li><CircleAlert size={17} /> AI 辅助范围与人工复核尚待披露</li>
              <li><CircleAlert size={17} /> 模型、提示与分析参数尚待归档</li>
            </ul>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onToast("研究诚信检查已运行：2 项待补充")}
            >
              <ShieldCheck size={16} /> 运行成果合规检查
            </button>
          </aside>
        </div>
      )}

      {selectedTool && (
        <ToolDialog
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
