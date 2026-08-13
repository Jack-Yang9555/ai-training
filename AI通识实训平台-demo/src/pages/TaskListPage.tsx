import { useEffect } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, Info, LockKeyhole, Settings2, UsersRound, X } from 'lucide-react'
import { electiveTaskIds, taskGroups, trainingTasks } from '../training/catalog'
import type { ElectiveAssignments, ElectiveTaskId, PortalRoute, TaskGroupId, TrainingSnapshot, TrainingTaskDefinition, TrainingTaskId } from '../training/types'
import { taskActionLabel, taskWorkspaceRegistry } from '../training/workspaces'

const statusLabels = { ready: '可开始', 'in-progress': '进行中', completed: '已完成', blocked: '前置未完成', framework: '框架已建立' } as const

interface TaskListPageProps {
  groupId?: TaskGroupId
  focusElectiveBucketId?: string
  snapshot: TrainingSnapshot
  electiveAssignments: ElectiveAssignments
  onElectiveChange: (assignments: ElectiveAssignments) => void
  onNavigate: (route: PortalRoute) => void
  onOpenTask: (taskId: TrainingTaskId) => void
}

export function TaskListPage({ groupId, focusElectiveBucketId, snapshot, electiveAssignments, onElectiveChange, onNavigate, onOpenTask }: TaskListPageProps) {
  const activeGroup = taskGroups.find((item) => item.id === groupId) ?? taskGroups[0]
  if (activeGroup.kind === 'selection') {
    return <ElectiveTaskGroup groupId={activeGroup.id} focusBucketId={focusElectiveBucketId} assignments={electiveAssignments} onChange={onElectiveChange} onNavigate={onNavigate} onOpenTask={onOpenTask} />
  }
  return <>
    <section className="day-page-hero"><div><span className="eyebrow">TASK CATALOG · {taskGroups.length} 个分组</span><h1>实训任务清单</h1><p>集中查看任务内容、当前状态、推荐顺序和成果要求。M04 与 M05 分别保留教案编制、命题审校闭环，均可使用任务内输入独立开始。</p></div><div className="day-page-facts"><span><CalendarDays size={18} />当前方案：三日培训</span><span><Clock3 size={18} />基础日程 18 小时</span></div></section>
    <TaskGroupNav activeGroupId={activeGroup.id} onNavigate={onNavigate} />
    <section className="portal-section"><div className="section-heading"><div><span className="eyebrow">{activeGroup.code}</span><h2>{activeGroup.label} · {activeGroup.focus}</h2></div><p>{activeGroup.summary}</p></div><div className="task-timeline full-training-timeline">
      {activeGroup.items.map((entry, index) => {
        if (entry.electiveBucketId) {
          const tasks = (electiveAssignments[entry.electiveBucketId] ?? []).map((id) => trainingTasks[id])
          return <ElectiveDayTasks key={entry.id} index={index} bucketId={entry.electiveBucketId} scheduleLabel={entry.scheduleLabel} tasks={tasks} onConfigure={() => onNavigate({ page: 'tasks', groupId: 'elective-pool', focusElectiveBucketId: entry.electiveBucketId })} onOpenTask={onOpenTask} />
        }
        const task = trainingTasks[entry.taskId!]
        const state = snapshot.taskStates[task.id]
        const hasWorkspace = Boolean(taskWorkspaceRegistry[task.id])
        return <article className={`day-task training-task-card ${state.status}`} key={entry.id}><div className="timeline-index"><span>{String(index + 1).padStart(2, '0')}</span></div><div className="day-task-body"><div className="day-task-meta"><span className="task-code">{task.id}</span><span>{entry.scheduleLabel}</span><span>{entry.duration} 分钟</span><span>{task.kind === 'mandatory' ? '必修' : '阶段验收'}</span></div><h3>{task.title}</h3><p>{task.description}</p><div className="task-state-line"><span className={`status-pill ${state.status}`}>{state.status === 'completed' && <CheckCircle2 size={13} />}{statusLabels[state.status]}</span><small>{state.blockingReasons[0] ?? (state.status === 'in-progress' ? `已保存 ${state.progressPercent}%` : '任务工作台已可体验')}</small></div></div><button className={hasWorkspace && state.status !== 'blocked' ? 'primary-button' : 'secondary-button'} type="button" onClick={() => onOpenTask(task.id)}>{taskActionLabel(task.id, state.status)}<ArrowRight size={16} /></button></article>
      })}
    </div></section>
  </>
}

function TaskGroupNav({ activeGroupId, onNavigate }: { activeGroupId: TaskGroupId; onNavigate: (route: PortalRoute) => void }) {
  return <nav className="day-switcher task-group-switcher" aria-label="任务清单分组">{taskGroups.map((group) => <button className={group.id === activeGroupId ? 'active' : ''} type="button" key={group.id} onClick={() => onNavigate({ page: 'tasks', groupId: group.id })}><span>{group.code}</span><strong>{group.label} · {group.focus}</strong></button>)}</nav>
}

function ElectiveTaskGroup({ groupId, focusBucketId, assignments, onChange, onNavigate, onOpenTask }: { groupId: TaskGroupId; focusBucketId?: string; assignments: ElectiveAssignments; onChange: (assignments: ElectiveAssignments) => void; onNavigate: (route: PortalRoute) => void; onOpenTask: (id: TrainingTaskId) => void }) {
  const group = taskGroups.find((item) => item.id === groupId)!
  const rule = group.selectionRule!
  const completeBuckets = rule.buckets.filter((bucket) => (assignments[bucket.id]?.length ?? 0) >= rule.minimumPerBucket).length
  const totalSelected = rule.buckets.reduce((total, bucket) => total + (assignments[bucket.id]?.length ?? 0), 0)

  useEffect(() => {
    if (!focusBucketId) return
    const field = document.getElementById(`elective-bucket-${focusBucketId}`)
    field?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    field?.focus()
  }, [focusBucketId])

  function assignmentFor(id: ElectiveTaskId) {
    return rule.buckets.find((bucket) => assignments[bucket.id]?.includes(id))
  }

  function addToBucket(bucketId: string, id: ElectiveTaskId) {
    if (assignmentFor(id)) return
    onChange({ ...assignments, [bucketId]: [...(assignments[bucketId] ?? []), id] })
  }

  function removeFromBucket(bucketId: string, id: ElectiveTaskId) {
    const current = assignments[bucketId] ?? []
    onChange({ ...assignments, [bucketId]: current.filter((item) => item !== id) })
  }

  function applyRecommendation(ids: ElectiveTaskId[]) {
    const next = { ...assignments }
    rule.buckets.forEach((bucket, index) => { next[bucket.id] = ids[index] ? [ids[index]] : [] })
    onChange(next)
  }

  return <>
    <section className="day-page-hero"><div><span className="eyebrow">{group.code} · TASK CATALOG</span><h1>实训任务清单</h1><p>{group.summary}</p></div><div className={completeBuckets === rule.buckets.length ? 'selection-counter complete' : 'selection-counter'}><UsersRound size={21} /><span><strong>{completeBuckets} / {rule.buckets.length} 天</strong><small>{completeBuckets === rule.buckets.length ? `最低要求已满足 · 共 ${totalSelected} 项` : '每天至少选择 1 项'}</small></span></div></section>
    <TaskGroupNav activeGroupId={group.id} onNavigate={onNavigate} />
    <div className="recommendation-strip"><Info size={17} /><span>采用基础组合（会覆盖当前选择）：</span>{rule.recommendations.map((item) => <button type="button" key={item.label} onClick={() => applyRecommendation(item.taskIds)}>{item.label} · {item.taskIds.join(' + ')}</button>)}</div>
    <section className={focusBucketId ? 'elective-assignment-panel focused' : 'elective-assignment-panel'} aria-label="选修任务日程分配">
      <div><span className="eyebrow">统一配置</span><h2>按执行日多选任务</h2><p>每天至少选择 {rule.minimumPerBucket} 项，可继续增选；同一任务只能归属一天。允许清空某一天，但清空后会提示该日尚未满足最低要求。</p></div>
      <div className="elective-slot-fields">
        {rule.buckets.map((bucket) => {
          const ids = assignments[bucket.id] ?? []
          const complete = ids.length >= rule.minimumPerBucket
          return <div id={`elective-bucket-${bucket.id}`} className={`${focusBucketId === bucket.id ? 'elective-bucket focused' : 'elective-bucket'}${complete ? '' : ' incomplete'}`} key={bucket.id} tabIndex={-1}><div className="elective-bucket-heading"><span>{bucket.label}选修任务</span><em className={complete ? 'complete' : ''}>{complete ? `已选 ${ids.length} 项` : `未满足：至少选 ${rule.minimumPerBucket} 项`}</em></div><div className="elective-bucket-tasks">{ids.length > 0 ? ids.map((id) => <span key={id}><strong>{id}</strong>{trainingTasks[id].title}<button type="button" onClick={() => removeFromBucket(bucket.id, id)} aria-label={`从${bucket.label}移除 ${id}`} title="移除任务"><X size={13} /></button></span>) : <div className="elective-empty-warning" role="alert"><Info size={14} /><span><strong>{bucket.label}尚未选择任务</strong><small>请从下方任务卡至少加入 {rule.minimumPerBucket} 项，完成前不满足培训要求。</small></span></div>}</div><small>选择变化会同步到 {bucket.label} 日程和成果中心</small></div>
        })}
      </div>
    </section>
    <section className="elective-grid">{electiveTaskIds.map((id) => {
      const task = trainingTasks[id]
      const assignedBucket = assignmentFor(id)
      return <article className={assignedBucket ? 'elective-card selected' : 'elective-card'} key={id}><div className="elective-card-head"><span>{id}</span><em>{task.difficulty}</em>{assignedBucket && <CheckCircle2 size={20} />}</div><h2>{task.title}</h2><p>{task.description}</p><div className="elective-tags"><span>{task.capability}</span><span>{task.collaboration}</span></div><div className="elective-day-actions">{rule.buckets.map((bucket) => <button className={assignedBucket?.id === bucket.id ? 'primary-button' : 'secondary-button'} type="button" key={bucket.id} disabled={Boolean(assignedBucket)} onClick={() => addToBucket(bucket.id, id)}>{assignedBucket?.id === bucket.id ? `已加入${bucket.label}` : assignedBucket ? `已在${assignedBucket.label}` : `加入${bucket.label}`}</button>)}</div><button className="text-button elective-framework-link" type="button" onClick={() => onOpenTask(id)}>查看框架<ArrowRight size={14} /></button></article>
    })}</section>
    <div className="selection-result"><div><strong>{completeBuckets === rule.buckets.length ? '两天选修任务已满足最低要求' : '请为第二天和第三天各选择至少 1 项'}</strong><p>{rule.buckets.map((bucket) => `${bucket.label}：${assignments[bucket.id]?.join('、') || '未选择'}`).join('；')}。所有选择已同步到对应 DAY 和成果中心。</p></div></div>
  </>
}

function ElectiveDayTasks({ index, bucketId, scheduleLabel, tasks, onConfigure, onOpenTask }: { index: number; bucketId: string; scheduleLabel: string; tasks: TrainingTaskDefinition[]; onConfigure: () => void; onOpenTask: (id: TrainingTaskId) => void }) {
  const dayLabel = bucketId === 'day-2' ? '第二天' : bucketId === 'day-3' ? '第三天' : '当天'
  return <article className={`day-task training-task-card elective-slot elective-day-task-list ${tasks.length > 0 ? 'configured' : 'unconfigured'}`}><div className="timeline-index"><span>{String(index + 1).padStart(2, '0')}</span></div><div className="day-task-body"><div className="day-task-meta"><span className="task-code">选修任务</span><span>{scheduleLabel}</span><span>每项 60 分钟</span><span>可多选且不跨天重复</span></div><h3>{tasks.length > 0 ? `${dayLabel}已选 ${tasks.length} 项任务` : `${dayLabel}选修尚未配置`}</h3>{tasks.length > 0 ? <div className="elective-day-items">{tasks.map((task, taskIndex) => <div key={task.id}><span><strong>{task.id} · {task.title}</strong><small>{taskIndex === 0 ? `${scheduleLabel} · 纳入基础日程` : '增选任务 · 当天自主完成'}；{task.description}</small></span><button className="text-button" type="button" onClick={() => onOpenTask(task.id)}>查看框架<ArrowRight size={14} /></button></div>)}</div> : <p>至少选择 1 项；选择结果会同步到任务清单和成果中心。</p>}<div className="task-state-line"><span className={`status-pill ${tasks.length > 0 ? 'framework' : 'blocked'}`}>{tasks.length > 0 ? <><FileText size={13} />已配置 {tasks.length} 项</> : <><LockKeyhole size={13} />未满足最低要求</>}</span></div></div><button className="secondary-button" type="button" onClick={onConfigure}><Settings2 size={15} />{tasks.length > 0 ? `调整${dayLabel}选修` : '选择选修'}<ArrowRight size={16} /></button></article>
}
