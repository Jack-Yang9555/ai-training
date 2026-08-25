import { ArrowLeft, CheckCircle2, Clock3, FileOutput, Info, Layers3, LockKeyhole, Route } from 'lucide-react'
import { trainingTasks } from '../training/catalog'
import type { TaskRuntimeState, TrainingTaskDefinition } from '../training/types'

export function TaskFrameworkPage({ task, state, onBack }: { task: TrainingTaskDefinition; state: TaskRuntimeState; onBack: () => void }) {
  const hasPrerequisites = Boolean(task.prerequisites?.length)
  const workspaceImplemented = task.contentStatus === 'implemented'
  const processSteps = task.steps ?? [['01', '任务学习'], ['02', '输入与实操'], ['03', '过程记录'], ['04', '小组复核'], ['05', '教师修改'], ['06', '评分验收'], ['07', '成果提交']].map(([number, label]) => ({ number, label }))
  return <>
    <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={16} />返回任务清单</button>
    <section className="framework-hero"><div><span className="eyebrow">{task.id} · {task.kind === 'mandatory' ? '必修任务' : task.kind === 'elective' ? '选修任务' : '阶段验收'}</span><h1>{task.title}</h1><p>{task.description}</p><div className="hero-facts"><span><Clock3 size={17} />{task.duration} 分钟</span><span><Layers3 size={17} />{task.difficulty}</span><span><Route size={17} />{task.collaboration}</span></div></div><span className="framework-badge"><LockKeyhole size={17} />{workspaceImplemented ? '工作台已建成 · 当前门禁锁定' : '详细工作台待扩展'}</span></section>
    <div className="framework-grid"><section className="content-card framework-panel"><span className="eyebrow">{hasPrerequisites ? 'PREREQUISITE' : 'RECOMMENDED ORDER'}</span><h2>{hasPrerequisites ? '前置依赖' : '推荐顺序（不限制进入）'}</h2>{hasPrerequisites ? <><p>完成以下任务的当前有效验收后，前置依赖自动解除。</p><div className="prerequisite-list">{task.prerequisites?.map((id) => <span key={id}>{state.pendingPrerequisites.includes(id) ? <LockKeyhole size={15} /> : <CheckCircle2 size={15} />}{id} · {trainingTasks[id].title}</span>)}</div></> : task.recommendedAfter.length === 0 ? <p>可直接开始本任务。</p> : <><p>建议先了解以下任务，但无需完成即可进入本任务。</p><div className="prerequisite-list">{task.recommendedAfter.map((id) => <span key={id}><CheckCircle2 size={15} />{id} · {trainingTasks[id].title}</span>)}</div></>}<div className="blocking-list">{state.blockingReasons.map((reason) => <p key={reason}><Info size={14} />{reason}</p>)}</div></section><section className="content-card framework-panel"><span className="eyebrow">OUTPUT CONTRACT</span><h2>成果契约</h2><div className="output-list">{task.outputs.map((output) => <span key={output}><FileOutput size={16} />{output}</span>)}</div></section></div>
    <section className="content-card task-blueprint"><div className="section-heading"><div><span className="eyebrow">TASK PROCESS</span><h2>任务实施步骤</h2></div><p>{workspaceImplemented ? '解除当前门禁后，将进入已建成的可操作任务工作台。' : '具体步骤将在该任务的详细交互设计中完善。'}</p></div><div className="blueprint-flow">{processSteps.map(({ number, label }) => <article key={number}><span>{number}</span><strong>{label}</strong></article>)}</div></section>
    <section className="framework-boundary"><strong>当前页面状态</strong><p>{workspaceImplemented ? `任务工作台已经完成；当前仅因“${state.blockingReasons[0] ?? '门禁条件未满足'}”暂不开放。` : '任务信息、推荐顺序、预期成果和通用步骤已建立；详细操作页面将在后续任务设计中补充。'}</p></section>
  </>
}
