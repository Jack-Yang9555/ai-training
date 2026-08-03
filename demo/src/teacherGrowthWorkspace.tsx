import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  Heart,
  ListChecks,
  Play,
  RefreshCw,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react"
import { useDemoState } from "./demoState"
import { LearnerWorkspaceHeader } from "./learnerWorkspace"
import { practicalAssessmentQuestion, teacherAssessmentQuestions } from "./teacherAssessmentQuestions"
import type { ImportedLearningResource, TeacherGrowthSection } from "./types"
import { EmptyState, WorkspaceHeader } from "./ui"

const growthSections: Array<{ id: TeacherGrowthSection; label: string; icon: typeof Target }> = [
  { id: "assessment", label: "摸底测评", icon: Target },
  { id: "plan", label: "培训计划", icon: ListChecks },
  { id: "learning", label: "课程学习", icon: BookOpen },
  { id: "path", label: "自主路径", icon: Route },
  { id: "practice", label: "实训记录", icon: FlaskConical },
  { id: "report", label: "能力报告", icon: BarChart3 },
]

function AssessmentWorkspace({ onContinue }: { onContinue: () => void }) {
  const { state, dispatch } = useDemoState()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [practicalChecks, setPracticalChecks] = useState<Record<string, boolean>>({})
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const assessment = state.teacherGrowth.assessment

  if (assessment.status === "completed") {
    return (
      <div className="growth-section-stack">
        <div className="growth-result-hero">
          <div>
            <span>首次摸底已完成 · {assessment.completedAt}</span>
            <strong>{assessment.score}</strong>
            <p>{assessment.level} · 已形成详细能力证据与提升目标</p>
          </div>
          <button className="primary-button" type="button" onClick={onContinue}>
            查看个性化培训计划 <ArrowRight size={15} />
          </button>
        </div>
        <div className="growth-dimension-grid">
          {assessment.dimensions.map((dimension) => (
            <article className="growth-dimension-card" key={dimension.label}>
              <div><strong>{dimension.label}</strong><span>{dimension.score} / {dimension.target}</span></div>
              <div className="growth-meter"><span style={{ width: `${dimension.score}%` }} /></div>
              <p>{dimension.evidence}</p>
            </article>
          ))}
        </div>
        <div className="growth-insight-grid">
          <article><h3>优势证据</h3>{assessment.strengths.map((item) => <p key={item}><CheckCircle2 size={15} />{item}</p>)}</article>
          <article><h3>优先补强</h3>{assessment.gaps.map((item) => <p key={item}><Target size={15} />{item}</p>)}</article>
          <article><h3>推荐目标</h3>{assessment.recommendedGoals.map((item) => <p key={item}><Sparkles size={15} />{item}</p>)}</article>
        </div>
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length
  const practicalCount = practicalAssessmentQuestion.completionItems.filter((item) => practicalChecks[item]).length
  const canSubmit = answeredCount === teacherAssessmentQuestions.length && practicalCount === practicalAssessmentQuestion.completionItems.length && manualConfirmed
  return (
    <div className="growth-section-stack">
      <div className="imported-content-notice">
        <ShieldCheck size={20} />
        <div><strong>教师 AI 能力摸底包 · 已导入</strong><p>从唯一题库固定抽取 C02、C05、C34、C09、C39、C171；答案、实操证据和人工确认均真实记录。</p></div>
        <span>题库 v2.3</span>
      </div>
      <div className="teacher-assessment-question-list">
        {teacherAssessmentQuestions.map((question, questionIndex) => (
          <article className="teacher-assessment-question" key={question.id}>
            <header>
              <span>{question.id} · {question.type}</span>
              <em>{question.dimension}</em>
            </header>
            <h3>{questionIndex + 1}. {question.stem}</h3>
            <div className="teacher-assessment-options">
              {question.options.map((option, optionIndex) => (
                <button
                  type="button"
                  className={answers[question.id] === option ? "is-selected" : ""}
                  key={option}
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                  {answers[question.id] === option && <Check size={15} />}
                </button>
              ))}
            </div>
          </article>
        ))}
        <article className="teacher-assessment-question practical-question">
          <header><span>C171 · 实操</span><em>真实操作与成果验证</em></header>
          <h3>6. {practicalAssessmentQuestion.stem}</h3>
          <p>{practicalAssessmentQuestion.explanation}</p>
          <div className="practical-evidence-checklist">
            {practicalAssessmentQuestion.completionItems.map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  checked={Boolean(practicalChecks[item])}
                  onChange={() => setPracticalChecks((current) => ({ ...current, [item]: !current[item] }))}
                />
                <span><FileText size={15} /> {item}</span>
              </label>
            ))}
          </div>
          <label className="manual-confirmation">
            <input type="checkbox" checked={manualConfirmed} onChange={(event) => setManualConfirmed(event.target.checked)} />
            <span><ShieldCheck size={16} /><strong>教师人工确认</strong>以上证据清单来自本人完成的虚构工具选型任务，结论已人工复核。</span>
          </label>
        </article>
      </div>
      <div className="growth-action-bar">
        <div><strong>作答 {answeredCount} / 5 · 实操证据 {practicalCount} / 5</strong><span>{manualConfirmed ? "人工确认已完成" : "还需完成人工确认"}</span></div>
        <button className="primary-button" type="button" disabled={!canSubmit} onClick={() => dispatch({ type: "COMPLETE_TEACHER_ASSESSMENT" })}>提交摸底测评并生成报告</button>
      </div>
    </div>
  )
}

function TrainingPlanWorkspace({ onLearn, onAssessment }: { onLearn: () => void; onAssessment: () => void }) {
  const { state, dispatch } = useDemoState()
  const plan = state.teacherGrowth.trainingPlan
  if (!plan) {
    return <EmptyState icon={<Target size={24} />} title="先完成 AI 能力摸底" description="培训方案将根据五维能力结果，从已导入标准课程中确定性生成。" action={<button className="primary-button" type="button" onClick={onAssessment}>开始摸底测评</button>} />
  }
  return (
    <div className="growth-section-stack">
      <div className="growth-plan-summary">
        <div><span>方案状态</span><strong>{plan.status === "accepted" ? "已确认执行" : "待教师确认"}</strong></div>
        <label>每周投入<select aria-label="每周学习时间" value={plan.weeklyHours} onChange={(event) => dispatch({ type: "SET_TEACHER_PLAN_WEEKLY_HOURS", value: Number(event.target.value) })}><option value={2}>2 小时</option><option value={4}>4 小时</option><option value={6}>6 小时</option><option value={8}>8 小时</option></select></label>
        <div><span>预计周期</span><strong>{plan.durationWeeks} 周</strong></div>
        <div><span>来源</span><strong>摸底结果 + 已导入课程</strong></div>
      </div>
      <div className="growth-plan-list">
        {plan.modules.map((module, index) => (
          <article className={!module.enabled ? "growth-plan-module is-disabled" : "growth-plan-module"} key={module.id}>
            <span className="plan-sequence">{index + 1}</span>
            <div className="plan-module-copy"><div><h3>{module.title}</h3><span>{module.required ? "必修" : "选修"} · {module.duration} 分钟 · {module.ability}</span></div><p>{module.reason}</p></div>
            <div className="plan-module-actions">
              <button className="icon-button" type="button" aria-label={`上移${module.title}`} disabled={index === 0} onClick={() => dispatch({ type: "MOVE_TEACHER_PLAN_MODULE", id: module.id, direction: -1 })}><ArrowUp size={15} /></button>
              <button className="icon-button" type="button" aria-label={`下移${module.title}`} disabled={index === plan.modules.length - 1} onClick={() => dispatch({ type: "MOVE_TEACHER_PLAN_MODULE", id: module.id, direction: 1 })}><ArrowDown size={15} /></button>
              {!module.required && <button className="secondary-button compact-button" type="button" onClick={() => dispatch({ type: "TOGGLE_TEACHER_PLAN_MODULE", id: module.id })}>{module.enabled ? "移出选修" : "加入选修"}</button>}
            </div>
          </article>
        ))}
      </div>
      <div className="growth-action-bar"><div><strong>{plan.title}</strong><span>{plan.updatedAt}</span></div>{plan.status === "accepted" ? <button className="primary-button" type="button" onClick={onLearn}>继续课程学习 <ArrowRight size={15} /></button> : <button className="primary-button" type="button" onClick={() => dispatch({ type: "ACCEPT_TEACHER_PLAN" })}>确认并开始培训</button>}</div>
    </div>
  )
}

function ResourceCard({ resource }: { resource: ImportedLearningResource }) {
  const { dispatch } = useDemoState()
  const [note, setNote] = useState(resource.note)
  const nextProgress = resource.completed ? 100 : Math.min(100, Math.max(resource.progress + 35, 35))
  return (
    <article className="growth-resource-card">
      <div className="growth-resource-heading"><span>{resource.type}</span><button className={resource.favorite ? "favorite-button is-active" : "favorite-button"} type="button" aria-label={resource.favorite ? "取消收藏" : "收藏"} onClick={() => dispatch({ type: "TOGGLE_TEACHER_RESOURCE_FAVORITE", id: resource.id })}><Heart size={17} fill={resource.favorite ? "currentColor" : "none"} /></button></div>
      <h3>{resource.title}</h3><p>{resource.source} · {resource.version} · {resource.duration} 分钟</p><span className="ability-tag">{resource.ability}</span>
      <div className="resource-progress-row"><div className="growth-meter"><span style={{ width: `${resource.progress}%` }} /></div><strong>{resource.progress}%</strong></div>
      <textarea aria-label={`${resource.title}学习笔记`} value={note} placeholder="记录学习笔记…" onChange={(event) => setNote(event.target.value)} />
      <div className="resource-actions"><button className="secondary-button" type="button" onClick={() => dispatch({ type: "SAVE_TEACHER_RESOURCE_NOTE", id: resource.id, note })}><Save size={15} />保存笔记</button><button className="primary-button" type="button" disabled={resource.completed} onClick={() => dispatch({ type: "UPDATE_TEACHER_RESOURCE_PROGRESS", id: resource.id, progress: nextProgress })}>{resource.completed ? <><Check size={15} /> 已完成</> : <><Play size={15} /> {resource.progress ? "继续学习" : "开始学习"}</>}</button></div>
    </article>
  )
}

function LearningWorkspace() {
  const { state } = useDemoState()
  const completed = state.teacherGrowth.resources.filter((resource) => resource.completed).length
  return (
    <div className="growth-section-stack">
      <LearnerWorkspaceHeader learnerKind="teacher" learnerName="李老师" title="教师课程学习工作区" description="使用与学生学习一致的资源进度、收藏、笔记和继续学习能力，但课程报名、学习进度与报告均属于教师本人。" summary={<div className="home-summary learn-summary"><strong>{completed}/{state.teacherGrowth.resources.length}</strong><span>资源已完成</span></div>} />
      <div className="imported-content-notice"><BookOpen size={20} /><div><strong>全部内容均已导入</strong><p>平台仅组织、呈现和记录，不提供课程、视频、题目或量规编辑入口。</p></div><span>教师学员上下文</span></div>
      <div className="growth-resource-grid">{state.teacherGrowth.resources.map((resource) => <ResourceCard resource={resource} key={resource.id} />)}</div>
    </div>
  )
}

function LearningPathWorkspace() {
  const { state, dispatch } = useDemoState()
  const [pathMode, setPathMode] = useState<"recommended" | "custom">("recommended")
  const path = pathMode === "recommended" ? state.teacherGrowth.recommendedPath : state.teacherGrowth.customPath
  const ordered = path.resourceIds.map((id) => state.teacherGrowth.resources.find((resource) => resource.id === id)).filter((resource): resource is ImportedLearningResource => Boolean(resource))
  return (
    <div className="growth-section-stack">
      <div className="path-mode-switch"><button className={pathMode === "recommended" ? "is-active" : ""} type="button" onClick={() => setPathMode("recommended")}>AI 推荐路径</button><button className={pathMode === "custom" ? "is-active" : ""} type="button" onClick={() => setPathMode("custom")}>我的路径</button></div>
      <div className="path-explanation"><Sparkles size={19} /><div><strong>{pathMode === "recommended" ? "依据五维摸底结果生成" : "从已导入资源与实训任务中自主组合"}</strong><p>{pathMode === "recommended" ? "优先补强知识库、智能体和研究创新，再回到教学融合迁移。" : "勾选内容后可调整顺序；保存只影响教师自己的学习路径。"}</p></div></div>
      {pathMode === "custom" && <div className="path-resource-picker">{state.teacherGrowth.resources.map((resource) => <label key={resource.id}><input type="checkbox" checked={path.resourceIds.includes(resource.id)} onChange={() => dispatch({ type: "TOGGLE_CUSTOM_PATH_RESOURCE", id: resource.id })} /><span>{resource.title}</span><small>{resource.type} · {resource.ability}</small></label>)}</div>}
      <div className="path-ordered-list">{ordered.map((resource, index) => <article key={resource.id}><span>{index + 1}</span><div><strong>{resource.title}</strong><small>{resource.duration} 分钟 · {resource.ability}</small></div>{pathMode === "custom" && <div><button className="icon-button" type="button" aria-label={`上移${resource.title}`} disabled={index === 0} onClick={() => dispatch({ type: "MOVE_CUSTOM_PATH_RESOURCE", id: resource.id, direction: -1 })}><ArrowUp size={15} /></button><button className="icon-button" type="button" aria-label={`下移${resource.title}`} disabled={index === ordered.length - 1} onClick={() => dispatch({ type: "MOVE_CUSTOM_PATH_RESOURCE", id: resource.id, direction: 1 })}><ArrowDown size={15} /></button></div>}</article>)}</div>
      {pathMode === "custom" && <div className="growth-action-bar"><div><strong>{path.resourceIds.length} 项学习内容</strong><span>{path.updatedAt}</span></div><button className="primary-button" type="button" disabled={!path.resourceIds.length} onClick={() => dispatch({ type: "SAVE_CUSTOM_PATH" })}><Save size={15} />保存我的路径</button></div>}
    </div>
  )
}

function PracticeWorkspace({ onTraining }: { onTraining: () => void }) {
  const { state } = useDemoState()
  const records = state.teacherGrowth.practiceRecords
  return (
    <div className="growth-section-stack">
      <div className="practice-summary-card"><FlaskConical size={24} /><div><strong>自由实训与培训计划使用同一套 13 类 AI 工具</strong><p>每次完成模拟实训后，工具、任务、时长、得分和作品都会回流当前教师的成长档案。</p></div><button className="primary-button" type="button" onClick={onTraining}>进入自由实训 <ArrowRight size={15} /></button></div>
      {!records.length ? <EmptyState icon={<FlaskConical size={24} />} title="还没有教师实训成果" description="进入自由实训并完成任一工具任务后，这里将自动生成记录。" /> : <div className="practice-record-list">{records.map((record) => <article key={record.id}><div><span>{record.toolName}</span><strong>{record.task}</strong><p>{record.completedAt} · {record.duration} 分钟 · 得分 {record.score}</p></div><span className="practice-artifact">{record.artifact}</span></article>)}</div>}
    </div>
  )
}

function AbilityReportWorkspace({ onResearch }: { onResearch: () => void }) {
  const { state, dispatch } = useDemoState()
  const assessment = state.teacherGrowth.assessment
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(state.teacherGrowth.evidenceLedger[0]?.id ?? null)
  const selectedEvidence = state.teacherGrowth.evidenceLedger.find((item) => item.id === selectedEvidenceId) ?? null
  if (assessment.status !== "completed") return <EmptyState icon={<BarChart3 size={24} />} title="完成摸底后生成能力报告" description="报告将呈现五维能力、题型表现、证据、优势、短板和提升目标。" />
  const currentByLabel = new Map(state.teacherReport.dimensions.map((dimension) => [dimension.label, dimension.value]))
  return (
    <div className="growth-section-stack">
      <div className="growth-report-hero"><div><span>{assessment.stage === "final" ? "结业复测已完成" : "成长中 · 可继续积累证据"}</span><strong>{state.teacherReport.level}</strong><p>学习资源 {state.teacherGrowth.resources.filter((item) => item.completed).length} 项 · 实训成果 {state.teacherGrowth.practiceRecords.length} 项 · 科研智能体 v{state.teacherGrowth.researchAgent.version}</p></div><button className="secondary-button" type="button" onClick={() => dispatch({ type: "COMPLETE_TEACHER_RETEST" })}><RefreshCw size={15} />{assessment.stage === "final" ? "再次模拟复测" : "参加结业复测"}</button></div>
      <div className="growth-comparison-list">{assessment.dimensions.map((dimension) => { const current = currentByLabel.get(dimension.label) ?? dimension.score; return <article key={dimension.label}><div><strong>{dimension.label}</strong><span>摸底 {dimension.score} → 当前 {current}</span></div><div className="comparison-bars"><span style={{ width: `${dimension.score}%` }} /><strong style={{ width: `${current}%` }} /></div><p>{dimension.evidence}</p></article> })}</div>
      <section className="teacher-evidence-ledger">
        <div className="workspace-title"><div><span className="section-kicker">个人能力证据台账</span><h2>能力变化可回到具体任务与人工复核</h2><p>仅当前教师本人可见；教学管理者只能获得匿名汇总指标。</p></div><span>{state.teacherGrowth.evidenceLedger.length} 条记录</span></div>
        <div className="teacher-evidence-layout">
          <div className="teacher-evidence-list">
            {state.teacherGrowth.evidenceLedger.map((item) => (
              <button type="button" className={item.id === selectedEvidenceId ? "is-active" : ""} key={item.id} onClick={() => setSelectedEvidenceId(item.id)}>
                <span>{item.source}</span><strong>{item.task}</strong><small>{item.course} · {item.completedAt}</small>
              </button>
            ))}
          </div>
          {selectedEvidence && (
            <article className="teacher-evidence-detail card">
              <header><div><span>{selectedEvidence.source}</span><h3>{selectedEvidence.task}</h3></div><em>{selectedEvidence.reviewStatus}</em></header>
              <dl>
                <div><dt>成果版本</dt><dd>{selectedEvidence.artifactVersion}</dd></div>
                <div><dt>匿名状态</dt><dd>{selectedEvidence.anonymous ? "已匿名" : "教师本人数据"}</dd></div>
                <div><dt>能力影响</dt><dd>{selectedEvidence.abilityImpact}</dd></div>
                <div><dt>人工复核</dt><dd>{selectedEvidence.reviewStatus}</dd></div>
              </dl>
              <div className="teacher-evidence-dimensions">{selectedEvidence.dimensions.map((item) => <span key={item}>{item}</span>)}</div>
            </article>
          )}
        </div>
      </section>
      <div className="growth-insight-grid"><article><h3>题型表现</h3>{assessment.typeScores.map((item) => <p key={item.label}><span>{item.label}</span><strong>{item.score}</strong></p>)}</article><article><h3>成长里程碑</h3><p><CheckCircle2 size={15} />完成首次 AI 能力摸底</p><p><CheckCircle2 size={15} />生成个性化培训方案</p><p><Clock3 size={15} />持续积累学习与实训证据</p></article><article><h3>下一步</h3><p><Sparkles size={15} />{state.teacherReport.nextTask}</p><button className="secondary-button" type="button" onClick={onResearch}><Bot size={15} />设计科研智能体</button></article></div>
    </div>
  )
}

export function TeacherGrowthWorkspace({ onTraining, onResearch }: { onTraining: () => void; onResearch: () => void }) {
  const { state } = useDemoState()
  const [section, setSection] = useState<TeacherGrowthSection>("assessment")
  const completedResources = useMemo(() => state.teacherGrowth.resources.filter((resource) => resource.completed).length, [state.teacherGrowth.resources])
  return (
    <section className="teacher-growth-workspace">
      <WorkspaceHeader title="我的 AI 成长" description="从摸底、培训、学习和实训一路沉淀到科研智能体与复测报告；所有数据均属于当前教师本人。" eyebrow="李老师 · 教师个人成长空间" tone="learn" variant="overview" summary={<div className="growth-header-summary"><strong>{state.teacherGrowth.assessment.status === "completed" ? state.teacherReport.level : "待摸底"}</strong><span>{completedResources} 项资源完成 · {state.teacherGrowth.practiceRecords.length} 项实训</span></div>} />
      <nav className="growth-section-nav" aria-label="教师成长功能"><div>{growthSections.map(({ id, label, icon: Icon }) => <button className={section === id ? "is-active" : ""} type="button" key={id} onClick={() => setSection(id)}><Icon size={17} />{label}</button>)}</div></nav>
      <div className="growth-section-content">
        {section === "assessment" && <AssessmentWorkspace onContinue={() => setSection("plan")} />}
        {section === "plan" && <TrainingPlanWorkspace onLearn={() => setSection("learning")} onAssessment={() => setSection("assessment")} />}
        {section === "learning" && <LearningWorkspace />}
        {section === "path" && <LearningPathWorkspace />}
        {section === "practice" && <PracticeWorkspace onTraining={onTraining} />}
        {section === "report" && <AbilityReportWorkspace onResearch={onResearch} />}
      </div>
    </section>
  )
}
