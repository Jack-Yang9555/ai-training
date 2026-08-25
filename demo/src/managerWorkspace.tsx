import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  ListChecks,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useEvidenceCenter } from "./evidenceCenter";
import { useTeachingOperations } from "./teachingOperations";
import type { ManagerSelection, ManagerWorkspaceTab } from "./types";
import { WorkspaceHeader } from "./ui";
import { teacherClasses } from "./workspaceData";
import { TeacherDevelopmentManager } from "./teacherDevelopmentManager";
import { useDemoState } from "./demoState";

const tabs: Array<{ id: ManagerWorkspaceTab; label: string; short: string; icon: typeof Activity }> = [
  { id: "overview", label: "运行总览", short: "总", icon: Activity },
  { id: "courses", label: "课程班级", short: "课", icon: Layers3 },
  { id: "quality", label: "学习质量", short: "质", icon: GraduationCap },
  { id: "assessments", label: "测评运行", short: "测", icon: ClipboardCheck },
  { id: "ai", label: "AI 应用", short: "AI", icon: Bot },
];

const organizations = [
  { id: "school" as const, label: "全校" },
  { id: "ai-college" as const, label: "人工智能学院" },
  { id: "creative-college" as const, label: "数字创意学院" },
];

export function ManagerWorkspace({ onToast }: { onToast: (message: string) => void }) {
  const { state: { schoolTeacherDevelopmentGoals }, dispatch } = useDemoState();
  const [tab, setTab] = useState<ManagerWorkspaceTab>("overview");
  const [aiView, setAiView] = useState<"operations" | "teacher-development">("operations");
  const [selection, setSelection] = useState<ManagerSelection>({
    organizationId: "school",
    courseId: null,
    classId: null,
    alertId: null,
  });
  const { alerts, auditRecords, assignAlert } = useTeachingOperations();
  const { openEvidence } = useEvidenceCenter();
  const visibleAlerts = useMemo(
    () =>
      selection.organizationId === "school"
        ? alerts
        : alerts.filter((item) => item.organizationId === selection.organizationId),
    [alerts, selection.organizationId],
  );
  const activeAlert = alerts.find((item) => item.id === selection.alertId) ?? null;
  const resolved = alerts.filter((item) => item.status === "已解决").length;

  return (
    <section className="manager-workspace">
      <WorkspaceHeader
        tone="teach"
        variant="overview"
        eyebrow="王主任 · 教学运行管理空间"
        title={tabs.find((item) => item.id === tab)?.label ?? "教学管理"}
        description="管理课程、学习质量、测评、AI 应用与教师发展匿名汇总；不开放教师个人答案、笔记、作品或研究草稿。"
        summary={<div className="manager-scope-summary"><strong>{organizations.find((item) => item.id === selection.organizationId)?.label}</strong><span>2 门课程 · 4 个班级</span></div>}
      />
      <div className="manager-filter-bar">
        <div role="group" aria-label="组织范围">
          {organizations.map((item) => (
            <button type="button" className={selection.organizationId === item.id ? "is-active" : ""} key={item.id} onClick={() => setSelection((current) => ({ ...current, organizationId: item.id, alertId: null }))}>
              {item.label}
            </button>
          ))}
        </div>
        <span><ShieldCheck size={14} /> 聚合数据 + 匿名学生证据 + 教师发展汇总</span>
      </div>
      <nav className="manager-tabs" aria-label="教学管理任务面">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? "is-active" : ""} key={id} onClick={() => setTab(id)}><Icon size={17} /> {label}</button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="manager-content-stack">
          <div className="manager-metrics">
            <article><small>运行课程</small><strong>2</strong><span>视觉设计 / AI 创作伦理</span></article>
            <article><small>学习参与</small><strong>86%</strong><span>较上周 +3%</span></article>
            <article><small>待复核</small><strong>5</strong><span>评分与情境方案</span></article>
            <article><small>预警闭环</small><strong>{resolved}/{alerts.length}</strong><span>实时回流</span></article>
          </div>
          <button className="manager-development-entry" type="button" onClick={() => { setAiView("teacher-development"); setTab("ai"); }}>
            <span><GraduationCap size={20} /></span><div><strong>教师 AI 分层培养</strong><p>查看 L1—L4、待通关、五维短板与匿名培养群组</p></div><ArrowRight size={16} />
          </button>
          <section className="manager-alert-section">
            <div className="workspace-title"><div><span className="section-kicker">优先待办</span><h2>确定性教学运行预警</h2><p>预警只展示聚合和匿名证据，不暴露姓名、原始作品或个人报告。</p></div></div>
            <div className="manager-alert-grid">
              {visibleAlerts.map((alert) => (
                <button type="button" className={`manager-alert-card status-${alert.status}`} key={alert.id} onClick={() => setSelection((current) => ({ ...current, alertId: alert.id }))}>
                  <header><span><AlertTriangle size={15} /> {alert.type}</span><em>{alert.status}</em></header>
                  <strong>{alert.title}</strong><p>{alert.metric}</p>
                  <footer>{alert.assignee ? `负责人：${alert.assignee}` : "尚未交办"}<ArrowRight size={14} /></footer>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "courses" && (
        <section className="manager-panel">
          <div className="workspace-title"><div><span className="section-kicker">组织—课程—班级</span><h2>课程与班级运行</h2><p>全校、院系、课程和班级筛选使用同一教学运行口径。</p></div></div>
          <div className="manager-class-list">
            {teacherClasses.map((item) => (
              <article key={item.id}><span><Building2 size={17} /></span><div><strong>{item.name}</strong><small>{item.courseName} · {item.lesson}</small></div><div><b>{item.participation}%</b><small>参与度</small></div><em>{item.statusLabel}</em></article>
            ))}
          </div>
        </section>
      )}

      {tab === "quality" && (
        <section className="manager-panel">
          <div className="workspace-title"><div><span className="section-kicker">参与—完成—掌握—干预</span><h2>学习质量</h2><p>使用汇总趋势判断是否需要教学行动，不形成永久学生标签。</p></div></div>
          <div className="manager-quality-grid">
            {[
              ["参与度", "86%", "目标 90%"],
              ["任务完成", "82%", "补学任务纳入统计"],
              ["目标掌握", "74%", "负向提示词仍偏弱"],
              ["难度匹配", "87%", "挑战适中"],
              ["干预效果", resolved ? "76%" : "待回流", resolved ? "主预警已解决" : "等待学生完成"],
            ].map(([label, value, note]) => <article key={label}><small>{label}</small><strong>{value}</strong><p>{note}</p></article>)}
          </div>
        </section>
      )}

      {tab === "assessments" && (
        <section className="manager-panel">
          <div className="workspace-title"><div><span className="section-kicker">进度—异常—复核—补学</span><h2>测评运行</h2><p>管理者只能查看运行状态和匿名异常，不能修改评分或代替学生作答。</p></div></div>
          <div className="manager-operation-list">
            <article><ListChecks size={18} /><div><strong>视觉控制随堂测</strong><small>31 / 36 已提交 · 1 份异常</small></div><span>进行中</span></article>
            <article><ClipboardCheck size={18} /><div><strong>版权、隐私与内容安全测评</strong><small>31 / 34 已提交 · 4 份待复核</small></div><span>待复核</span></article>
            <article><CheckCircle2 size={18} /><div><strong>单元一 · 生成式视觉基础</strong><small>平均分 84.6 · 已完成补学回流</small></div><span>已完成</span></article>
          </div>
        </section>
      )}

      {tab === "ai" && (
        <div className="manager-content-stack">
          <div className="path-mode-switch manager-ai-view-switch" role="tablist" aria-label="AI 应用二级视图">
            <button type="button" role="tab" aria-selected={aiView === "operations"} className={aiView === "operations" ? "is-active" : ""} onClick={() => setAiView("operations")}>应用运行</button>
            <button type="button" role="tab" aria-selected={aiView === "teacher-development"} className={aiView === "teacher-development" ? "is-active" : ""} onClick={() => setAiView("teacher-development")}>教师发展</button>
          </div>
          {aiView === "operations" ? <section className="manager-panel">
          <div className="workspace-title"><div><span className="section-kicker">命中—置信度—接管—复核</span><h2>AI 应用运行</h2><p>低置信度结果进入人工队列；证据不足不会显示为确定结论。</p></div></div>
          <div className="manager-quality-grid">
            {[
              ["助教知识命中率", "89%", "目标 ≥ 85%"],
              ["低置信度回答", "7", "已交办周老师"],
              ["人工接管", "3", "全部保留处理记录"],
              ["AI 评分复核", "22%", "AI 原值与最终值并存"],
            ].map(([label, value, note]) => <article key={label}><small>{label}</small><strong>{value}</strong><p>{note}</p></article>)}
          </div>
          <div className="manager-review-queue">
            <button type="button" onClick={() => openEvidence("evidence-tutor-low-confidence")}><span>证据不足</span><strong>学校版权审批制度回答</strong><small>置信度 42% · 已转人工复核</small></button>
            <button type="button" onClick={() => openEvidence("evidence-ai-score")}><span>已人工修改</span><strong>林一诺作品 AI 评分</strong><small>AI 原值 43 → 最终值 42</small></button>
          </div>
          </section> : (
            <TeacherDevelopmentManager
              onToast={onToast}
              initialScopeId={selection.organizationId}
              publishedGoals={schoolTeacherDevelopmentGoals}
              onPublish={(plan) => dispatch({ type: "PUBLISH_SCHOOL_DEVELOPMENT_GOAL", plan })}
            />
          )}
        </div>
      )}

      {activeAlert && (
        <div className="manager-detail-overlay" role="presentation" onMouseDown={() => setSelection((current) => ({ ...current, alertId: null }))}>
          <aside role="dialog" aria-modal="true" aria-label="管理预警详情" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>{activeAlert.type}</span><h2>{activeAlert.title}</h2><p>{activeAlert.metric}</p></div><button type="button" onClick={() => setSelection((current) => ({ ...current, alertId: null }))}>关闭</button></header>
            <section><h3>匿名学生证据</h3>{activeAlert.anonymousEvidence.map((item) => <article key={item.studentCode}><strong>{item.studentCode}</strong><p>{item.summary}</p></article>)}</section>
            <section className="manager-alert-flow"><h3>处理状态</h3><div><span className="is-done">待处理</span><i /><span className={activeAlert.status !== "待处理" ? "is-done" : ""}>已交办</span><i /><span className={activeAlert.status === "已解决" ? "is-done" : ""}>已解决</span></div></section>
            <button className="secondary-button" type="button" onClick={() => openEvidence("evidence-diagnosis")}>查看聚合证据链</button>
            {activeAlert.status === "待处理" && activeAlert.id === "alert-negative-mastery" && <button className="primary-button" type="button" onClick={() => { assignAlert(activeAlert.id); onToast("预警已交办给周老师，教师首页将出现管理关注任务"); }}>交办给周老师</button>}
          </aside>
        </div>
      )}

      <section className="manager-audit-preview">
        <div className="workspace-title"><div><span className="section-kicker">模拟审计记录</span><h2>关键状态变化可见</h2></div></div>
        {auditRecords.slice(0, 4).map((item) => <article key={item.id}><span>{item.at}</span><strong>{item.actor} · {item.action}</strong><p>{item.target} · {item.result}</p></article>)}
      </section>

      <nav className="manager-mobile-nav" aria-label="移动端教学管理导航">
        {tabs.map(({ id, short, icon: Icon }) => <button type="button" className={tab === id ? "is-active" : ""} key={id} onClick={() => setTab(id)}><Icon size={18} /><span>{short}</span></button>)}
      </nav>
    </section>
  );
}
