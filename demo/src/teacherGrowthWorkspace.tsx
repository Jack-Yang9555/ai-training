import { useMemo, useState } from "react"
import {
  ArrowDown, ArrowRight, ArrowUp, BarChart3, BookOpen, Bot, Check,
  CheckCircle2, CircleAlert, Clock3, FileCheck2, FileText, FlaskConical,
  Heart, ListChecks, LockKeyhole, Play, RefreshCw, Route, Save, School,
  ShieldCheck, Sparkles, Target,
} from "lucide-react"
import {
  ACTIVE_GROWTH_ORGANIZATION_ID,
  ACTIVE_GROWTH_TEACHER_NAME,
  selectApplicableSchoolDevelopmentGoal,
  useDemoState,
} from "./demoState"
import { LearnerWorkspaceHeader } from "./learnerWorkspace"
import {
  practicalAssessmentQuestion, practicalRetestQuestion, teacherAssessmentQuestions,
  teacherRetestQuestions, teacherTrustGateQuestions, type TeacherTrustGateId,
} from "./teacherAssessmentQuestions"
import {
  EVIDENCE_CHANNELS, GATE_IDS, type AbilitySnapshot, type EvidenceChannel,
  type GateId, type GateStatus, type GrowthStageId,
} from "./teacherGrowthModel"
import { checkRetestEligibility, deriveGrowthStages } from "./teacherGrowthScoring"
import type { ImportedLearningResource, TeacherGrowthSection } from "./types"
import { EmptyState, WorkspaceHeader } from "./ui"

const growthSections: Array<{ id: TeacherGrowthSection; label: string; icon: typeof Target }> = [
  { id: "overview", label: "成长总览", icon: Sparkles },
  { id: "assessment", label: "摸底与报告", icon: Target },
  { id: "plan", label: "培训计划", icon: ListChecks },
  { id: "learning", label: "课程学习与自主路径", icon: BookOpen },
  { id: "practice", label: "实训记录与作品", icon: FlaskConical },
  { id: "application", label: "教学应用", icon: FileCheck2 },
  { id: "research", label: "研究成果", icon: Bot },
  { id: "report", label: "成长报告与复测", icon: BarChart3 },
]

const stageSection: Record<GrowthStageId, TeacherGrowthSection> = {
  "baseline-assessment": "assessment", "baseline-report": "assessment",
  "training-plan": "plan", "course-learning": "learning", "self-learning": "learning",
  "ai-practice": "practice", "teaching-application": "application",
  "research-output": "research", "growth-report": "report", "final-retest": "report",
}

const gateLabels: Record<GateId, string> = {
  "fact-verification": "事实核验", "data-copyright": "数据版权", "human-responsibility": "人工责任",
}
const gateStatusLabels: Record<GateStatus, string> = {
  "not-evaluated": "待评价", insufficient: "证据不足", failed: "未通过", passed: "已通过",
}
const channelLabels: Record<EvidenceChannel, string> = {
  assessment: "测评", task: "任务", artifact: "作品", application: "应用",
}

function newestSnapshot(snapshots: AbilitySnapshot[], kinds: AbilitySnapshot["kind"][]) {
  return [...snapshots].reverse().find((snapshot) => kinds.includes(snapshot.kind)) ?? null
}

function snapshotLevel(snapshot: AbilitySnapshot | null) {
  if (!snapshot) return "待摸底"
  return snapshot.certifiedLevel
    ? `正式 ${snapshot.certifiedLevel} · 能力测算 ${snapshot.calculatedLevel}`
    : `待通关 · 能力测算 ${snapshot.calculatedLevel}`
}

function GateStatusCards({ snapshot }: { snapshot: AbilitySnapshot | null }) {
  return <div className="growth-gate-grid" aria-label="可信应用三项通关门槛">{GATE_IDS.map((gateId) => {
    const status = snapshot?.gateResults[gateId] ?? "not-evaluated"
    return <article className={`growth-gate-card status-${status}`} key={gateId}>
      <span>{status === "passed" ? <ShieldCheck size={18} /> : <CircleAlert size={18} />}</span>
      <div><strong>{gateLabels[gateId]}</strong><p>{gateStatusLabels[status]} · 不计入能力分，但决定能否正式定级</p></div>
    </article>
  })}</div>
}

function GrowthJourney({ onNavigate }: { onNavigate: (section: TeacherGrowthSection) => void }) {
  const { state } = useDemoState()
  const latest = newestSnapshot(state.growthSnapshots, ["final", "current", "baseline"])
  const stages = deriveGrowthStages({
    cycle: state.growthCycle, evidence: state.growthEvidence, snapshots: state.growthSnapshots,
    gateResults: latest?.gateResults, evidenceCoverage: latest?.evidenceCoverage,
  })
  const statusLabel = { locked: "待解锁", available: "可开始", "in-progress": "进行中", completed: "已完成" }
  return <ol className="growth-journey" aria-label="教师成长十阶段旅程">{stages.map((stage) =>
    <li className={`status-${stage.status}`} key={stage.id}><button type="button" onClick={() => onNavigate(stageSection[stage.id])}>
      <span>{stage.status === "completed" ? <Check size={14} /> : stage.order}</span><strong>{stage.label}</strong><small>{statusLabel[stage.status]}</small>
    </button></li>)}</ol>
}

function GrowthOverview({ onNavigate }: { onNavigate: (section: TeacherGrowthSection) => void }) {
  const { state } = useDemoState()
  const latest = newestSnapshot(state.growthSnapshots, ["final", "current", "baseline"])
  const eligibility = checkRetestEligibility({ cycle: state.growthCycle, evidence: state.growthEvidence, gateResults: latest?.gateResults, evidenceCoverage: latest?.evidenceCoverage })
  const covered = latest ? EVIDENCE_CHANNELS.filter((channel) => latest.evidenceCoverage[channel] === "sufficient").length : 0
  const nextSection: TeacherGrowthSection = state.teacherGrowth.assessment.status !== "completed" ? "assessment" : !state.growthCycle.planConfirmed ? "plan" : "report"
  const nextLabel = nextSection === "assessment" ? "开始摸底测评" : nextSection === "plan" ? "确认培训计划" : "查看成长报告"
  return <div className="growth-section-stack">
    <section className="growth-overview-hero"><div><span className="section-kicker">当前发展周期 · 2026 教师 AI 能力提升</span><h2>{snapshotLevel(latest)}</h2><p>目标 {state.growthCycle.targetLevel} · 统一读取测评、任务、作品和应用证据；三项门槛独立通关。</p></div><button className="primary-button" type="button" onClick={() => onNavigate(nextSection)}>{nextLabel} <ArrowRight size={15} /></button></section>
    <div className="growth-overview-metrics">
      <article><small>五维均分</small><strong>{latest ? Math.round(latest.overallScore) : "—"}</strong><span>五维等权</span></article>
      <article><small>可信门槛</small><strong>{latest ? `${GATE_IDS.filter((id) => latest.gateResults[id] === "passed").length}/3` : "0/3"}</strong><span>不计分 · 一票阻断</span></article>
      <article><small>证据通道</small><strong>{covered}/4</strong><span>测评 / 任务 / 作品 / 应用</span></article>
      <article><small>复测准备度</small><strong>{eligibility.readinessPercent}%</strong><span>{eligibility.eligible ? "已具备资格" : `还需 ${eligibility.missingRequirementIds.length} 项`}</span></article>
    </div>
    <GateStatusCards snapshot={latest} />
    <section className="growth-channel-panel"><div className="workspace-title"><div><span className="section-kicker">30 / 25 / 25 / 20</span><h2>四类证据共同支撑等级</h2><p>缺少成长证据时沿用摸底基线并标记证据不足，不用点击次数代替能力。</p></div></div><div className="growth-channel-grid">{EVIDENCE_CHANNELS.map((channel, index) => <article key={channel}><span>{channelLabels[channel]} · {[30, 25, 25, 20][index]}%</span><strong>{latest ? Math.round(latest.channelScores[channel]) : "—"}</strong><small>{latest ? latest.evidenceCoverage[channel] === "sufficient" ? "证据充分" : latest.evidenceCoverage[channel] === "insufficient" ? "待复核" : "尚缺证据" : "待摸底"}</small></article>)}</div></section>
  </div>
}

function AssessmentWorkspace({ onContinue }: { onContinue: () => void }) {
  const { state, dispatch } = useDemoState()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [gateAnswers, setGateAnswers] = useState<Partial<Record<TeacherTrustGateId, string>>>({})
  const [practicalChecks, setPracticalChecks] = useState<Record<string, boolean>>({})
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const assessment = state.teacherGrowth.assessment
  const baseline = state.growthSnapshots.find((snapshot) => snapshot.kind === "baseline") ?? null
  if (assessment.status === "completed") return <div className="growth-section-stack">
    <div className="growth-result-hero"><div><span>首次摸底已完成 · {assessment.completedAt}</span><strong>{assessment.score}</strong><p>{assessment.level} · 已形成详细能力证据与提升目标</p><em>{snapshotLevel(baseline)}</em></div><button className="primary-button" type="button" onClick={onContinue}>查看个性化培训计划 <ArrowRight size={15} /></button></div>
    <GateStatusCards snapshot={baseline} />
    <div className="growth-dimension-grid">{assessment.dimensions.map((dimension) => <article className="growth-dimension-card" key={dimension.label}><div><strong>{dimension.label}</strong><span>{dimension.score} / {dimension.target}</span></div><div className="growth-meter"><span style={{ width: `${dimension.score}%` }} /></div><p>{dimension.evidence}</p></article>)}</div>
    <div className="growth-insight-grid"><article><h3>优势证据</h3>{assessment.strengths.map((item) => <p key={item}><CheckCircle2 size={15} />{item}</p>)}</article><article><h3>优先补强</h3>{assessment.gaps.map((item) => <p key={item}><Target size={15} />{item}</p>)}</article><article><h3>推荐目标</h3>{assessment.recommendedGoals.map((item) => <p key={item}><Sparkles size={15} />{item}</p>)}</article></div>
  </div>
  const answeredCount = teacherAssessmentQuestions.filter((question) => Boolean(answers[question.id])).length
  const gateCount = teacherTrustGateQuestions.filter((gate) => Boolean(gateAnswers[gate.id])).length
  const practicalCount = practicalAssessmentQuestion.completionItems.filter((item) => practicalChecks[item]).length
  const canSubmit = answeredCount === 5 && gateCount === 3 && practicalCount === 5 && manualConfirmed
  return <div className="growth-section-stack">
    <div className="imported-content-notice"><ShieldCheck size={20} /><div><strong>教师 AI 能力摸底包 · 已导入</strong><p>固定五维蓝图 + 综合实操 + 三项可信门槛；平台记录作答与人工确认，不提供题目编辑。</p></div><span>题库 v2.3</span></div>
    <div className="teacher-assessment-question-list">
      {teacherAssessmentQuestions.map((question, questionIndex) => <article className="teacher-assessment-question" key={question.id}><header><span>{question.id} · {question.type}</span><em>{question.dimension}</em></header><h3>{questionIndex + 1}. {question.stem}</h3><div className="teacher-assessment-options">{question.options.map((option, optionIndex) => <button type="button" className={answers[question.id] === option ? "is-selected" : ""} key={option} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{answers[question.id] === option && <Check size={15} />}</button>)}</div></article>)}
      <article className="teacher-assessment-question practical-question"><header><span>C171 · 实操</span><em>真实操作与成果验证</em></header><h3>6. {practicalAssessmentQuestion.stem}</h3><p>{practicalAssessmentQuestion.explanation}</p><div className="practical-evidence-checklist">{practicalAssessmentQuestion.completionItems.map((item) => <label key={item}><input type="checkbox" checked={Boolean(practicalChecks[item])} onChange={() => setPracticalChecks((current) => ({ ...current, [item]: !current[item] }))} /><span><FileText size={15} /> {item}</span></label>)}</div></article>
      <section className="growth-gate-question-section"><div className="workspace-title"><div><span className="section-kicker">不计分 · 决定正式定级</span><h2>三项可信应用门槛</h2><p>答错不会降低五维能力分，但正式等级将显示“待通关”。</p></div></div>{teacherTrustGateQuestions.map((gate, index) => <article className="teacher-assessment-question gate-question" key={gate.id}><header><span>G0{index + 1} · 通关门槛</span><em>{gate.label}</em></header><h3>{gate.stem}</h3><div className="teacher-assessment-options">{gate.options.map((option, optionIndex) => <button type="button" className={gateAnswers[gate.id] === option ? "is-selected" : ""} key={option} onClick={() => setGateAnswers((current) => ({ ...current, [gate.id]: option }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{gateAnswers[gate.id] === option && <Check size={15} />}</button>)}</div></article>)}</section>
      <label className="manual-confirmation"><input type="checkbox" checked={manualConfirmed} onChange={(event) => setManualConfirmed(event.target.checked)} /><span><ShieldCheck size={16} /><strong>教师人工确认</strong>以上作答和实操证据来自本人完成的模拟任务，最终结论已人工复核。</span></label>
    </div>
    <div className="growth-action-bar"><div><strong>五维题 {answeredCount}/5 · 实操证据 {practicalCount}/5 · 门槛 {gateCount}/3</strong><span>{manualConfirmed ? "人工确认已完成" : "还需完成人工确认"}</span></div><button className="primary-button" type="button" disabled={!canSubmit} onClick={() => dispatch({ type: "COMPLETE_TEACHER_ASSESSMENT", answers, gateAnswers: gateAnswers as Record<TeacherTrustGateId, string>, practicalCount, manualConfirmed })}>提交摸底测评并生成报告</button></div>
  </div>
}

function TrainingPlanWorkspace({ onLearn, onAssessment }: { onLearn: () => void; onAssessment: () => void }) {
  const { state, dispatch } = useDemoState(); const plan = state.teacherGrowth.trainingPlan
  const schoolGoal = selectApplicableSchoolDevelopmentGoal(
    state.schoolTeacherDevelopmentGoals,
    ACTIVE_GROWTH_ORGANIZATION_ID,
  )
  if (!plan) return <EmptyState icon={<Target size={24} />} title="先完成 AI 能力摸底" description="培训方案将根据五维结果、三项门槛与学校培养目标确定性生成。" action={<button className="primary-button" type="button" onClick={onAssessment}>开始摸底测评</button>} />
  return <div className="growth-section-stack">
    {schoolGoal ? (
      <div className="growth-school-goal">
        <School size={20} />
        <div>
          <strong>学校分层培养目标 {schoolGoal.id}</strong>
          <p>{schoolGoal.scopeLabel} · {schoolGoal.focusDimension}提升 · 目标 {schoolGoal.targetLevel} · 建议模块：{schoolGoal.requiredModules.join("、")} · 截止 {schoolGoal.deadline}</p>
        </div>
        <span>匿名聚合目标</span>
      </div>
    ) : (
      <div className="growth-school-goal">
        <School size={20} />
        <div><strong>本周期暂无已发布学校目标</strong><p>当前培训计划继续依据个人摸底差距与三项可信门槛执行。</p></div>
        <span>个人计划可继续</span>
      </div>
    )}
    <div className="growth-plan-summary"><div><span>方案状态</span><strong>{plan.status === "accepted" ? "已确认执行" : "待教师确认"}</strong></div><label>目标等级<select aria-label="目标能力等级" value={state.growthCycle.targetLevel} onChange={(event) => dispatch({ type: "SET_GROWTH_TARGET_LEVEL", value: event.target.value as "L1" | "L2" | "L3" | "L4" })}><option value="L2">L2 实践</option><option value="L3">L3 创新</option><option value="L4">L4 引领</option></select></label><label>每周投入<select aria-label="每周学习时间" value={plan.weeklyHours} onChange={(event) => dispatch({ type: "SET_TEACHER_PLAN_WEEKLY_HOURS", value: Number(event.target.value) })}><option value={2}>2 小时</option><option value={4}>4 小时</option><option value={6}>6 小时</option><option value={8}>8 小时</option></select></label><div><span>预计周期</span><strong>{plan.durationWeeks} 周</strong></div></div>
    <div className="growth-plan-basis"><strong>生成依据</strong><span>摸底差距</span><span>门槛状态</span><span>已导入课程</span><span>学校目标</span></div>
    <div className="growth-plan-list">{plan.modules.map((module, index) => <article className={!module.enabled ? "growth-plan-module is-disabled" : "growth-plan-module"} key={module.id}><span className="plan-sequence">{index + 1}</span><div className="plan-module-copy"><div><h3>{module.title}</h3><span>{module.required ? "必修" : "选修"} · {module.duration} 分钟 · {module.ability}</span></div><p>{module.reason}</p></div><div className="plan-module-actions"><button className="icon-button" type="button" aria-label={`上移${module.title}`} disabled={index === 0} onClick={() => dispatch({ type: "MOVE_TEACHER_PLAN_MODULE", id: module.id, direction: -1 })}><ArrowUp size={15} /></button><button className="icon-button" type="button" aria-label={`下移${module.title}`} disabled={index === plan.modules.length - 1} onClick={() => dispatch({ type: "MOVE_TEACHER_PLAN_MODULE", id: module.id, direction: 1 })}><ArrowDown size={15} /></button>{!module.required && <button className="secondary-button compact-button" type="button" onClick={() => dispatch({ type: "TOGGLE_TEACHER_PLAN_MODULE", id: module.id })}>{module.enabled ? "移出选修" : "加入选修"}</button>}</div></article>)}</div>
    <div className="growth-action-bar"><div><strong>{plan.title}</strong><span>{plan.updatedAt}</span></div>{plan.status === "accepted" ? <button className="primary-button" type="button" onClick={onLearn}>继续课程学习 <ArrowRight size={15} /></button> : <button className="primary-button" type="button" onClick={() => dispatch({ type: "ACCEPT_TEACHER_PLAN" })}>确认并开始培训</button>}</div>
  </div>
}

function ResourceCard({ resource, mode, progress, disabled = false }: { resource: ImportedLearningResource; mode: "course" | "self"; progress: number; disabled?: boolean }) {
  const { dispatch } = useDemoState(); const [note, setNote] = useState(resource.note); const completed = progress === 100; const nextProgress = completed ? 100 : Math.min(100, Math.max(progress + 50, 50))
  return <article className="growth-resource-card"><div className="growth-resource-heading"><span>{mode === "course" ? resource.type : "自主任务"}</span><button className={resource.favorite ? "favorite-button is-active" : "favorite-button"} type="button" aria-label={resource.favorite ? "取消收藏" : "收藏"} onClick={() => dispatch({ type: "TOGGLE_TEACHER_RESOURCE_FAVORITE", id: resource.id })}><Heart size={17} fill={resource.favorite ? "currentColor" : "none"} /></button></div><h3>{resource.title}</h3><p>{resource.source} · {resource.version} · {resource.duration} 分钟</p><span className="ability-tag">{resource.ability}</span><div className="resource-progress-row"><div className="growth-meter"><span style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div><textarea aria-label={`${resource.title}学习笔记`} value={note} placeholder="记录学习笔记…" onChange={(event) => setNote(event.target.value)} /><div className="resource-actions"><button className="secondary-button" type="button" onClick={() => dispatch({ type: "SAVE_TEACHER_RESOURCE_NOTE", id: resource.id, note })}><Save size={15} />保存笔记</button><button className="primary-button" type="button" disabled={completed || disabled} onClick={() => dispatch({ type: "UPDATE_TEACHER_RESOURCE_PROGRESS", id: resource.id, progress: nextProgress, mode })}>{completed ? <><Check size={15} /> 已完成</> : disabled ? <><LockKeyhole size={15} /> 先保存路径</> : <><Play size={15} /> {progress ? "继续学习" : mode === "course" ? "开始学习" : "开始自主任务"}</>}</button></div></article>
}

function LearningWorkspace() {
  const { state, dispatch } = useDemoState(); const [mode, setMode] = useState<"course" | "self">("course"); const path = state.teacherGrowth.customPath
  const requiredCourseResourceIds = new Set(state.teacherGrowth.trainingPlan?.modules.filter((module) => module.required && module.enabled).flatMap((module) => module.resourceIds) ?? [])
  const selfResources = state.teacherGrowth.resources.filter((resource) => !requiredCourseResourceIds.has(resource.id))
  const ordered = path.resourceIds.map((id) => selfResources.find((resource) => resource.id === id)).filter((resource): resource is ImportedLearningResource => Boolean(resource))
  const completedCourse = state.teacherGrowth.resources.filter((resource) => resource.completed).length; const completedSelf = Object.values(state.teacherGrowth.selfLearningProgress).filter((progress) => progress === 100).length
  return <div className="growth-section-stack">
    <LearnerWorkspaceHeader learnerKind="teacher" learnerName={ACTIVE_GROWTH_TEACHER_NAME} title="教师课程学习工作区" description="课程进度与自主任务分开记录，避免同一资源重复满足两项复测资格。" summary={<div className="home-summary learn-summary"><strong>{mode === "course" ? `${completedCourse}/${state.teacherGrowth.resources.length}` : `${completedSelf}/${Math.max(1, path.resourceIds.length)}`}</strong><span>{mode === "course" ? "课程资源已完成" : "自主任务已完成"}</span></div>} />
    <div className="path-mode-switch" role="tablist" aria-label="课程学习与自主学习"><button role="tab" aria-selected={mode === "course"} className={mode === "course" ? "is-active" : ""} type="button" onClick={() => setMode("course")}>课程学习</button><button role="tab" aria-selected={mode === "self"} className={mode === "self" ? "is-active" : ""} type="button" onClick={() => setMode("self")}>自主学习路径</button></div>
    {mode === "course" ? <><div className="imported-content-notice"><BookOpen size={20} /><div><strong>标准课程内容已导入</strong><p>至少完成 1 个必修模块及检查题，才形成课程任务证据。</p></div><span>教师学员上下文</span></div><div className="growth-resource-grid">{state.teacherGrowth.resources.map((resource) => <ResourceCard resource={resource} mode="course" progress={resource.progress} key={resource.id} />)}</div></> : <><div className="path-explanation"><Sparkles size={19} /><div><strong>从已导入资源中创建额外的自主任务</strong><p>先选择并保存路径，再完成至少 1 项；已纳入必修计划的 {requiredCourseResourceIds.size} 项资源不在此重复计数。</p></div></div><div className="path-resource-picker">{selfResources.map((resource) => <label key={resource.id}><input type="checkbox" checked={path.resourceIds.includes(resource.id)} onChange={() => dispatch({ type: "TOGGLE_CUSTOM_PATH_RESOURCE", id: resource.id })} /><span>{resource.title}</span><small>{resource.type} · {resource.ability}</small></label>)}</div><div className="path-ordered-list">{ordered.map((resource, index) => <article key={resource.id}><span>{index + 1}</span><div><strong>{resource.title}</strong><small>{resource.duration} 分钟 · {resource.ability}</small></div><div><button className="icon-button" type="button" aria-label={`上移${resource.title}`} disabled={index === 0} onClick={() => dispatch({ type: "MOVE_CUSTOM_PATH_RESOURCE", id: resource.id, direction: -1 })}><ArrowUp size={15} /></button><button className="icon-button" type="button" aria-label={`下移${resource.title}`} disabled={index === ordered.length - 1} onClick={() => dispatch({ type: "MOVE_CUSTOM_PATH_RESOURCE", id: resource.id, direction: 1 })}><ArrowDown size={15} /></button></div></article>)}</div><div className="growth-action-bar"><div><strong>{path.resourceIds.length} 项自主学习内容</strong><span>{path.updatedAt}</span></div><button className="primary-button" type="button" disabled={!path.resourceIds.length || path.saved} onClick={() => dispatch({ type: "SAVE_CUSTOM_PATH" })}><Save size={15} />{path.saved ? "自主路径已保存" : "保存我的路径"}</button></div>{ordered.length ? <div className="growth-resource-grid">{ordered.map((resource) => <ResourceCard resource={resource} mode="self" progress={state.teacherGrowth.selfLearningProgress[resource.id] ?? 0} disabled={!path.saved} key={`self-${resource.id}`} />)}</div> : <EmptyState icon={<Route size={24} />} title="选择至少 1 项自主资源" description="自主学习必须形成独立任务进度，不能直接复用必修课程完成记录。" />}</>}
  </div>
}

function PracticeWorkspace({ onTraining }: { onTraining: () => void }) {
  const { state, dispatch } = useDemoState(); const records = state.teacherGrowth.practiceRecords
  return <div className="growth-section-stack"><div className="practice-summary-card"><FlaskConical size={24} /><div><strong>共享 13 类 AI 工具，任务与作品分两步记录</strong><p>完成工具任务先形成任务证据；作品只有通过量规并由教师确认后才进入作品通道。</p></div><button className="primary-button" type="button" onClick={onTraining}>进入自由实训 <ArrowRight size={15} /></button></div>{!records.length ? <EmptyState icon={<FlaskConical size={24} />} title="还没有教师实训任务" description="进入自由实训完成任一工具任务后，这里将生成待确认作品。" /> : <div className="practice-record-list">{records.map((record) => <article key={record.id}><div><span>{record.toolName}</span><strong>{record.task}</strong><p>{record.completedAt} · {record.duration} 分钟 · 任务分 {record.score}</p></div><div className="practice-record-actions"><span className={record.artifactConfirmed ? "practice-artifact is-confirmed" : "practice-artifact"}>{record.artifact} · {record.artifactConfirmed ? "已确认" : "待复核"}</span>{!record.artifactConfirmed && <button className="secondary-button" type="button" disabled={!state.growthCycle.planConfirmed} onClick={() => dispatch({ type: "CONFIRM_TEACHER_PRACTICE_ARTIFACT", id: record.id })}><ShieldCheck size={15} />按量规确认作品</button>}</div></article>)}</div>}</div>
}

function TeachingApplicationWorkspace({ onTeaching }: { onTeaching: () => void }) {
  const { state } = useDemoState(); const closedLoops = state.growthEvidence.filter((record) => record.qualifiers?.includes("teaching-application-loop") && record.reviewStatus === "confirmed"); const publishedArtifacts = state.growthEvidence.filter((record) => record.source === "智能备课与教学实施" && record.channel === "artifact")
  return <div className="growth-section-stack"><div className="practice-summary-card"><FileCheck2 size={24} /><div><strong>教学应用必须完成“发布—使用—结果回流”</strong><p>教案发布只形成作品；批改人工确认或分层干预完成回流后，才形成应用闭环证据。</p></div><button className="primary-button" type="button" onClick={onTeaching}>进入教学工作 <ArrowRight size={15} /></button></div><div className="growth-application-summary"><article><small>已发布教学作品</small><strong>{publishedArtifacts.length}</strong><span>尚不等于应用闭环</span></article><article><small>应用闭环</small><strong>{new Set(closedLoops.map((record) => record.sourceEventId)).size}</strong><span>已确认并回流</span></article></div>{!closedLoops.length ? <EmptyState icon={<FileCheck2 size={24} />} title="还没有完整教学应用证据" description="可在教学工作发布分层干预并等待学生完成回流，或在 AI 批改中人工确认最终结果。" /> : <div className="growth-evidence-card-list">{closedLoops.map((record) => <article key={record.id}><header><span>应用通道</span><em>已应用且已回流</em></header><strong>{record.task}</strong><p>{record.source} · {record.artifactVersion}</p><small>{record.rubric.join(" · ")}</small></article>)}</div>}</div>
}

function ResearchOutputWorkspace({ onResearch }: { onResearch: () => void }) {
  const { state, dispatch } = useDemoState(); const agent = state.teacherGrowth.researchAgent; const outputs = state.growthEvidence.filter((record) => record.qualifiers?.includes("reviewed-research-output"))
  return <div className="growth-section-stack"><div className="practice-summary-card"><Bot size={24} /><div><strong>研究成果沿用 AI 研究工作台</strong><p>引用、匿名、AI 披露、参数归档和人工复核五项全部通过，作品才进入能力计算。</p></div><button className="primary-button" type="button" onClick={onResearch}>进入 AI 研究 <ArrowRight size={15} /></button></div><div className="research-growth-status"><div><span>关联成果</span><strong>{agent.linkedOutput ?? "尚未关联"}</strong></div><div><span>校内共享 / 示范</span><strong>{agent.sharedOutput ?? "尚未形成"}</strong></div>{agent.linkedOutput && !agent.sharedOutput && <button className="secondary-button" type="button" onClick={() => dispatch({ type: "SHARE_RESEARCH_AGENT_OUTPUT" })}><School size={15} />形成校内共享示范</button>}</div>{!outputs.length ? <EmptyState icon={<Bot size={24} />} title="还没有已复核研究成果" description="研究草稿和工具测试不计分；请先完成五项治理检查并关联成果。" /> : <div className="growth-evidence-card-list">{outputs.map((record) => <article key={record.id}><header><span>{channelLabels[record.channel]}</span><em>{record.reviewStatus === "confirmed" ? "已复核" : "待复核"}</em></header><strong>{record.task}</strong><p>{record.artifactVersion}</p><small>{record.rubric.join(" · ")}</small></article>)}</div>}</div>
}

function RetestForm() {
  const { dispatch } = useDemoState(); const [answers, setAnswers] = useState<Record<string, string>>({}); const [gateAnswers, setGateAnswers] = useState<Partial<Record<TeacherTrustGateId, string>>>({}); const [practicalChecks, setPracticalChecks] = useState<Record<string, boolean>>({}); const [manualConfirmed, setManualConfirmed] = useState(false)
  const answerCount = teacherRetestQuestions.filter((question) => answers[question.id]).length; const gateCount = teacherTrustGateQuestions.filter((gate) => gateAnswers[gate.id]).length; const practicalCount = practicalRetestQuestion.completionItems.filter((item) => practicalChecks[item]).length; const canSubmit = answerCount === 5 && gateCount === 3 && practicalCount === 5 && manualConfirmed
  return <section className="growth-retest-form"><div className="workspace-title"><div><span className="section-kicker">等值新题 · 不复用摸底题 ID</span><h2>结业复测</h2><p>完成 R02、R05、R34、R09、R39、综合实操和三项门槛复核后生成不可变 final 快照。</p></div></div>{teacherRetestQuestions.map((question, index) => <article className="teacher-assessment-question" key={question.id}><header><span>{question.id} · {question.type}</span><em>{question.dimension}</em></header><h3>{index + 1}. {question.stem}</h3><div className="teacher-assessment-options">{question.options.map((option, optionIndex) => <button type="button" className={answers[question.id] === option ? "is-selected" : ""} key={option} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{answers[question.id] === option && <Check size={15} />}</button>)}</div></article>)}<article className="teacher-assessment-question practical-question"><header><span>{practicalRetestQuestion.id} · 综合实操</span><em>跨情境迁移</em></header><h3>6. {practicalRetestQuestion.stem}</h3><div className="practical-evidence-checklist">{practicalRetestQuestion.completionItems.map((item) => <label key={item}><input type="checkbox" checked={Boolean(practicalChecks[item])} onChange={() => setPracticalChecks((current) => ({ ...current, [item]: !current[item] }))} /><span><FileText size={15} />{item}</span></label>)}</div></article><section className="growth-gate-question-section"><h3>三项门槛重新判定</h3>{teacherTrustGateQuestions.map((gate) => <article className="teacher-assessment-question gate-question" key={`retest-${gate.id}`}><header><span>复测门槛</span><em>{gate.label}</em></header><h3>{gate.stem}</h3><div className="teacher-assessment-options">{gate.options.map((option, optionIndex) => <button type="button" className={gateAnswers[gate.id] === option ? "is-selected" : ""} key={option} onClick={() => setGateAnswers((current) => ({ ...current, [gate.id]: option }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{gateAnswers[gate.id] === option && <Check size={15} />}</button>)}</div></article>)}</section><label className="manual-confirmation"><input type="checkbox" checked={manualConfirmed} onChange={(event) => setManualConfirmed(event.target.checked)} /><span><ShieldCheck size={16} /><strong>复测人工确认</strong>我已核验全部复测证据并对最终提交负责。</span></label><div className="growth-action-bar"><div><strong>等值题 {answerCount}/5 · 实操 {practicalCount}/5 · 门槛 {gateCount}/3</strong><span>{manualConfirmed ? "人工确认已完成" : "还需人工确认"}</span></div><button className="primary-button" type="button" disabled={!canSubmit} onClick={() => dispatch({ type: "COMPLETE_TEACHER_RETEST", answers, gateAnswers: gateAnswers as Record<TeacherTrustGateId, string>, practicalCount, manualConfirmed })}>提交复测并生成正式结果</button></div></section>
}

function AbilityReportWorkspace({ onResearch }: { onResearch: () => void }) {
  const { state } = useDemoState(); const [showRetest, setShowRetest] = useState(false); const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(state.growthEvidence[0]?.id ?? null)
  const baseline = state.growthSnapshots.find((snapshot) => snapshot.kind === "baseline") ?? null; const current = newestSnapshot(state.growthSnapshots, ["current", "baseline"]); const final = newestSnapshot(state.growthSnapshots, ["final"]); const latest = final ?? current
  const eligibility = checkRetestEligibility({ cycle: state.growthCycle, evidence: state.growthEvidence, gateResults: latest?.gateResults, evidenceCoverage: latest?.evidenceCoverage }); const selectedEvidence = state.growthEvidence.find((item) => item.id === selectedEvidenceId) ?? null
  if (!baseline) return <EmptyState icon={<BarChart3 size={24} />} title="完成摸底后生成成长报告" description="报告将比较 baseline、current 与 final 三个独立快照。" />
  return <div className="growth-section-stack">
    <div className="growth-report-hero"><div><span>{final ? "本周期结业复测已完成" : "成长中 · 证据持续回流"}</span><strong>{snapshotLevel(latest)}</strong><p>综合分 {Math.round(latest?.overallScore ?? 0)} · 四类证据 {EVIDENCE_CHANNELS.filter((channel) => latest?.evidenceCoverage[channel] === "sufficient").length}/4 · 复测准备度 {eligibility.readinessPercent}%</p></div>{final ? <span className="growth-cycle-complete"><CheckCircle2 size={18} /> 本周期已完成</span> : <button className="secondary-button" type="button" onClick={() => setShowRetest(true)}><RefreshCw size={15} />{eligibility.eligible ? "参加结业复测" : "检查复测资格"}</button>}</div>
    <GateStatusCards snapshot={latest} />
    <div className="growth-snapshot-grid">{[{ label: "摸底 baseline", snapshot: baseline }, { label: "当前 current", snapshot: current }, { label: "复测 final", snapshot: final }].map(({ label, snapshot }) => <article className={!snapshot ? "is-empty" : ""} key={label}><span>{label}</span><strong>{snapshot ? Math.round(snapshot.overallScore) : "—"}</strong><p>{snapshot ? snapshotLevel(snapshot) : "尚未生成"}</p></article>)}</div>
    <div className="growth-comparison-list">{Object.keys(baseline.dimensionScores).map((label) => { const dimension = label as keyof typeof baseline.dimensionScores; const currentScore = current?.dimensionScores[dimension] ?? baseline.dimensionScores[dimension]; const finalScore = final?.dimensionScores[dimension]; return <article key={label}><div><strong>{label}</strong><span>摸底 {Math.round(baseline.dimensionScores[dimension])} → 当前 {Math.round(currentScore)}{finalScore !== undefined ? ` → 复测 ${Math.round(finalScore)}` : ""}</span></div><div className="comparison-bars"><span style={{ width: `${baseline.dimensionScores[dimension]}%` }} /><strong style={{ width: `${finalScore ?? currentScore}%` }} /></div></article> })}</div>
    <section className="growth-readiness-panel" id="retest-readiness"><div className="workspace-title"><div><span className="section-kicker">严格复测门禁</span><h2>复测准备清单</h2><p>全部十项满足后才开放复测提交；门槛未通过可以复测，但正式定级仍会被阻断。</p></div><strong>{eligibility.readinessPercent}%</strong></div><div className="growth-readiness-list">{eligibility.requirements.map((item) => <article className={item.met ? "is-met" : ""} key={item.id}>{item.met ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<div><strong>{item.label}</strong><p>{item.reason}</p></div></article>)}</div></section>
    {showRetest && (eligibility.eligible ? <RetestForm /> : <div className="growth-retest-blocked"><LockKeyhole size={21} /><div><strong>暂未开放复测提交</strong><p>按上方清单补齐缺项；按钮不会静默失效，也不会通过点击直接加分。</p></div></div>)}
    <section className="teacher-evidence-ledger"><div className="workspace-title"><div><span className="section-kicker">个人能力证据台账</span><h2>每一分都能回到来源、通道与量规</h2><p>仅当前教师本人可见；教学管理者只获得满足最小样本规则的匿名汇总。</p></div><span>{state.growthEvidence.length} 条记录</span></div><div className="teacher-evidence-layout"><div className="teacher-evidence-list">{state.growthEvidence.map((item) => <button type="button" className={item.id === selectedEvidenceId ? "is-active" : ""} key={item.id} onClick={() => setSelectedEvidenceId(item.id)}><span>{channelLabels[item.channel]} · {item.source}</span><strong>{item.task}</strong><small>{item.occurredAt} · {item.reviewStatus === "confirmed" ? "已确认" : item.reviewStatus === "pending" ? "待复核" : "已否决"}</small></button>)}</div>{selectedEvidence ? <article className="teacher-evidence-detail card"><header><div><span>{channelLabels[selectedEvidence.channel]}</span><h3>{selectedEvidence.task}</h3></div><em>{selectedEvidence.reviewStatus === "confirmed" ? "已确认" : "不计分"}</em></header><dl><div><dt>来源事件</dt><dd>{selectedEvidence.sourceEventId}</dd></div><div><dt>成果版本</dt><dd>{selectedEvidence.artifactVersion ?? "过程记录"}</dd></div><div><dt>匿名状态</dt><dd>{selectedEvidence.anonymous ? "已匿名 / 个人学习数据" : "未匿名"}</dd></div><div><dt>量规</dt><dd>{selectedEvidence.rubric.join("、")}</dd></div></dl><div className="teacher-evidence-dimensions">{selectedEvidence.dimensions.map((item) => <span key={item.dimension}>{item.dimension} {item.score}</span>)}</div></article> : <EmptyState icon={<FileText size={22} />} title="选择一条证据查看详情" description="初始状态不再预置个人已完成证据。" />}</div></section>
    <div className="growth-insight-grid"><article><h3>成长里程碑</h3><p><CheckCircle2 size={15} />完成首次 AI 能力摸底</p><p>{state.growthCycle.planConfirmed ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}个人发展计划</p><p>{final ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}结业复测与下一周期</p></article><article><h3>下一步</h3><p><Sparkles size={15} />{state.teacherReport.nextTask}</p><button className="secondary-button" type="button" onClick={onResearch}><Bot size={15} />完善研究成果</button></article></div>
  </div>
}

export function TeacherGrowthWorkspace({ onTraining, onResearch, onTeaching }: { onTraining: () => void; onResearch: () => void; onTeaching: () => void }) {
  const { state } = useDemoState(); const [section, setSection] = useState<TeacherGrowthSection>("assessment")
  const latest = useMemo(() => newestSnapshot(state.growthSnapshots, ["final", "current", "baseline"]), [state.growthSnapshots]); const completedResources = useMemo(() => state.teacherGrowth.resources.filter((resource) => resource.completed).length, [state.teacherGrowth.resources])
  return <section className="teacher-growth-workspace"><WorkspaceHeader title="我的 AI 成长" description="十阶段连续闭环，以五维能力、四类证据和三项可信门槛共同支撑 L1—L4。" eyebrow={`${ACTIVE_GROWTH_TEACHER_NAME} · 教师个人成长空间`} tone="learn" variant="overview" summary={<div className="growth-header-summary"><strong>{snapshotLevel(latest)}</strong><span>目标 {state.growthCycle.targetLevel} · 课程 {completedResources} 项 · 实训 {state.teacherGrowth.practiceRecords.length} 项</span></div>} /><GrowthJourney onNavigate={setSection} /><nav className="growth-section-nav" aria-label="教师成长功能"><div>{growthSections.map(({ id, label, icon: Icon }) => <button className={section === id ? "is-active" : ""} type="button" key={id} onClick={() => setSection(id)}><Icon size={17} />{label}</button>)}</div></nav><div className="growth-section-content">{section === "overview" && <GrowthOverview onNavigate={setSection} />}{section === "assessment" && <AssessmentWorkspace onContinue={() => setSection("plan")} />}{section === "plan" && <TrainingPlanWorkspace onLearn={() => setSection("learning")} onAssessment={() => setSection("assessment")} />}{section === "learning" && <LearningWorkspace />}{section === "practice" && <PracticeWorkspace onTraining={onTraining} />}{section === "application" && <TeachingApplicationWorkspace onTeaching={onTeaching} />}{section === "research" && <ResearchOutputWorkspace onResearch={onResearch} />}{section === "report" && <AbilityReportWorkspace onResearch={onResearch} />}</div></section>
}
