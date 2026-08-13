import { ArrowRight, Award, CalendarDays, CheckCircle2, Clock3, Layers3, ShieldCheck } from 'lucide-react'
import { taskGroups } from '../training/catalog'
import type { PortalRoute, TrainingSnapshot } from '../training/types'
import { trainingTasks } from '../training/catalog'
import { taskActionLabel } from '../training/workspaces'

interface TrainingDashboardProps {
  snapshot: TrainingSnapshot
  onNavigate: (route: PortalRoute) => void
  onOpenTask: (taskId: 'M01' | 'M02') => void
}

export function TrainingDashboard({ snapshot, onNavigate, onOpenTask }: TrainingDashboardProps) {
  const m01State = snapshot.taskStates.M01
  const primaryTaskId = m01State.status === 'completed' ? 'M02' : 'M01'
  const primaryState = snapshot.taskStates[primaryTaskId]
  const primaryTask = trainingTasks[primaryTaskId]
  const primaryActionLabel = primaryTaskId === 'M01' && primaryState.status === 'ready'
    ? '开始第一个任务'
    : `${primaryTaskId} · ${taskActionLabel(primaryTaskId, primaryState.status)}`
  return (
    <>
      <section className="portal-hero">
        <div>
          <span className="eyebrow">高职教师 AI 实操培训 · 三日全程</span>
          <h1>从可信使用到 AI 教学综合应用</h1>
          <p>平台覆盖三天任务、后两天多选任务和三次阶段验收，支持教师按日程完成实操、复核、修改与任务提交。</p>
          <div className="hero-facts"><span><Clock3 size={17} />基础日程 18 小时</span><span><Layers3 size={17} />12 项必修 + 每天至少 1 项选修</span><span><ShieldCheck size={17} />3 次阶段验收</span></div>
          <div className="portal-hero-actions"><button className="primary-button" type="button" onClick={() => onOpenTask(primaryTaskId)}>{primaryActionLabel}<ArrowRight size={17} /></button><button className="secondary-button" type="button" onClick={() => onNavigate({ page: 'tasks' })}>查看任务清单</button></div>
          <p className="dashboard-next-task">当前优先：{primaryTask.title}</p>
        </div>
        <div className="overall-progress-card">
          <span>总体实训进度</span><strong>{snapshot.overallPercent}%</strong>
          <div className="progress-track"><span style={{ width: `${Math.max(snapshot.overallPercent, 2)}%` }} /></div>
          <dl><div><dt>计分任务</dt><dd>{snapshot.completedRequired} / {snapshot.requiredTotal}</dd></div><div><dt>阶段验收</dt><dd>{snapshot.passedMilestones} / {snapshot.milestoneTotal}</dd></div></dl>
        </div>
      </section>

      <section className="dashboard-pass-rule" aria-labelledby="dashboard-pass-title">
        <div className="dashboard-pass-heading"><span><Award size={22} /></span><div><small>PASS RULE</small><h2 id="dashboard-pass-title">达标规则</h2></div></div>
        <div className="dashboard-pass-items"><span><strong>总评 ≥ 80</strong><small>达到总体得分线</small></span><span><strong>两天选修达标</strong><small>第二、第三天各至少完成 1 项</small></span><span><strong>3 次阶段验收</strong><small>G01—G03 均须通过</small></span><span><CheckCircle2 size={17} /><strong>统一最低要求</strong><small>个人成果与小组协作均须达标</small></span></div>
      </section>

      <section className="portal-section">
        <div className="section-heading"><div><span className="eyebrow">TRAINING PATH</span><h2>当前实训安排</h2></div><p>任务按当前培训方案分组，进入清单可查看全部任务状态。</p></div>
        <div className="day-overview-grid">
          {taskGroups.filter((group) => group.kind === 'sequence').map((group) => (
            <article className="day-overview-card" key={group.id}>
              <div className="day-overview-head"><span>{group.code}</span><CalendarDays size={21} /></div>
              <h3>{group.label} · {group.focus}</h3><p>{group.summary}</p>
              <div className="day-overview-meta"><span>{group.items.length} 个任务时段</span><span>360 分钟</span></div>
              <button className="text-button" type="button" onClick={() => onNavigate({ page: 'tasks', groupId: group.id })}>在任务清单中查看<ArrowRight size={15} /></button>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
