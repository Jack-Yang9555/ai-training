import { useEffect } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, Info, LockKeyhole, Settings2, UsersRound, X } from 'lucide-react'
import { electiveTaskIds, taskGroups, trainingTasks } from '../training/catalog'
import type { ElectiveAssignments, ElectiveTaskId, GroupElectiveSelection, ParticipantDirectory, PortalRoute, TaskGroupId, TrainingSnapshot, TrainingTaskDefinition, TrainingTaskId } from '../training/types'
import { taskActionLabel, taskWorkspaceRegistry } from '../training/workspaces'

const statusLabels = { ready: '可开始', 'in-progress': '进行中', completed: '已完成', blocked: '前置未完成', framework: '框架已建立' } as const

interface TaskListPageProps {
  groupId?: TaskGroupId
  focusElectiveBucketId?: string
  snapshot: TrainingSnapshot
  electiveAssignments: ElectiveAssignments
  electiveSelection?: GroupElectiveSelection
  participantDirectory: ParticipantDirectory
  currentMemberElectiveConfirmed: boolean
  onElectiveChange: (assignments: ElectiveAssignments) => void
  onElectiveConfirm: () => void
  onNavigate: (route: PortalRoute) => void
  onOpenTask: (taskId: TrainingTaskId) => void
}

export function TaskListPage({ groupId, focusElectiveBucketId, snapshot, electiveAssignments, electiveSelection, participantDirectory, currentMemberElectiveConfirmed, onElectiveChange, onElectiveConfirm, onNavigate, onOpenTask }: TaskListPageProps) {
  const activeGroup = taskGroups.find((item) => item.id === groupId) ?? taskGroups[0]
  if (activeGroup.kind === 'selection') {
    return <ElectiveTaskGroup groupId={activeGroup.id} focusBucketId={focusElectiveBucketId} snapshot={snapshot} assignments={electiveAssignments} selection={electiveSelection} directory={participantDirectory} memberConfirmed={currentMemberElectiveConfirmed} onChange={onElectiveChange} onConfirm={onElectiveConfirm} onNavigate={onNavigate} onOpenTask={onOpenTask} />
  }
  return <>
    <section className="day-page-hero"><div><span className="eyebrow">TASK CATALOG · {taskGroups.length} 个分组</span><h1>实训任务清单</h1><p>集中查看任务内容、当前状态、推荐顺序和成果要求。M04 与 M05 分别保留教案编制、命题审校闭环，均可使用任务内输入独立开始。</p></div><div className="day-page-facts"><span><CalendarDays size={18} />当前方案：三日培训</span><span><Clock3 size={18} />基础日程 18 小时</span></div></section>
    <TaskGroupNav activeGroupId={activeGroup.id} onNavigate={onNavigate} />
    <section className="portal-section"><div className="section-heading"><div><span className="eyebrow">{activeGroup.code}</span><h2>{activeGroup.label} · {activeGroup.focus}</h2></div><p>{activeGroup.summary}</p></div><div className="task-timeline full-training-timeline">
      {activeGroup.items.map((entry, index) => {
        if (entry.electiveBucketId) {
          const tasks = (electiveAssignments[entry.electiveBucketId] ?? []).map((id) => trainingTasks[id])
          return <ElectiveDayTasks key={entry.id} index={index} bucketId={entry.electiveBucketId} scheduleLabel={entry.scheduleLabel} tasks={tasks} snapshot={snapshot} onConfigure={() => onNavigate({ page: 'tasks', groupId: 'elective-pool', focusElectiveBucketId: entry.electiveBucketId })} onOpenTask={onOpenTask} />
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

function ElectiveTaskGroup({ groupId, focusBucketId, snapshot, assignments, selection, directory, memberConfirmed, onChange, onConfirm, onNavigate, onOpenTask }: { groupId: TaskGroupId; focusBucketId?: string; snapshot: TrainingSnapshot; assignments: ElectiveAssignments; selection?: GroupElectiveSelection; directory: ParticipantDirectory; memberConfirmed: boolean; onChange: (assignments: ElectiveAssignments) => void; onConfirm: () => void; onNavigate: (route: PortalRoute) => void; onOpenTask: (id: TrainingTaskId) => void }) {
  const group = taskGroups.find((item) => item.id === groupId)!
  const rule = group.selectionRule!
  const currentParticipant = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const groupMembers = directory.participants.filter((item) => item.groupId === currentParticipant?.groupId)
  const selectedBy = directory.participants.find((item) => item.participantId === selection?.selectedByParticipantId)
  const selectedIds = rule.buckets.map((bucket) => assignments[bucket.id]?.[0]).filter((id): id is ElectiveTaskId => Boolean(id))
  const selectionComplete = selectedIds.length === rule.buckets.length && new Set(selectedIds).size === rule.buckets.length
  const confirmedMemberCount = groupMembers.filter((item) => Boolean(selection?.memberConfirmedAt[item.participantId])).length

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
    const next = { ...assignments, [bucketId]: [id] }
    rule.buckets.forEach((bucket) => {
      if (bucket.id !== bucketId && next[bucket.id]?.includes(id)) next[bucket.id] = []
    })
    onChange(next)
  }

  function removeFromBucket(bucketId: string) {
    onChange({ ...assignments, [bucketId]: [] })
  }

  function applyRecommendation(ids: ElectiveTaskId[]) {
    const next = { ...assignments }
    rule.buckets.forEach((bucket, index) => { next[bucket.id] = ids[index] ? [ids[index]] : [] })
    onChange(next)
  }

  return <>
    <section className="day-page-hero"><div><span className="eyebrow">{group.code} · TASK CATALOG</span><h1>实训任务清单</h1><p>{group.summary}</p></div><div className={selectionComplete ? 'selection-counter complete' : 'selection-counter'}><UsersRound size={21} /><span><strong>{selectedIds.length} / 2 项</strong><small>{selectionComplete ? `顺序已确定 · ${confirmedMemberCount}/${groupMembers.length} 人确认` : '本组需共同选择两项'}</small></span></div></section>
    <TaskGroupNav activeGroupId={group.id} onNavigate={onNavigate} />
    <div className="recommendation-strip"><Info size={17} /><span>采用基础组合（会覆盖当前选择）：</span>{rule.recommendations.map((item) => <button type="button" key={item.label} onClick={() => applyRecommendation(item.taskIds)}>{item.label} · {item.taskIds.join(' + ')}</button>)}</div>
    <section className={focusBucketId ? 'elective-assignment-panel focused' : 'elective-assignment-panel'} aria-label="选修任务日程分配">
      <div><span className="eyebrow">小组共同决策</span><h2>选择 2 个不同任务并确定先后顺序</h2><p>第 1 项安排在第二天，第 2 项安排在第三天。任一选择变化都会撤销原有成员确认，组员需逐人重新确认后才能进入任务。</p></div>
      <div className="elective-slot-fields">
        {rule.buckets.map((bucket, index) => {
          const id = assignments[bucket.id]?.[0]
          const complete = Boolean(id)
          return <div id={`elective-bucket-${bucket.id}`} className={`${focusBucketId === bucket.id ? 'elective-bucket focused' : 'elective-bucket'}${complete ? '' : ' incomplete'}`} key={bucket.id} tabIndex={-1}><div className="elective-bucket-heading"><span>第 {index + 1} 项 · {bucket.label}</span><em className={complete ? 'complete' : ''}>{complete ? '已确定' : '待选择'}</em></div><div className="elective-bucket-tasks">{id ? <span><strong>{id}</strong>{trainingTasks[id].title}<button type="button" onClick={() => removeFromBucket(bucket.id)} aria-label={`清空第 ${index + 1} 项 ${id}`} title="清空选择"><X size={13} /></button></span> : <div className="elective-empty-warning" role="alert"><Info size={14} /><span><strong>第 {index + 1} 项尚未选择</strong><small>从下方任务卡选择一个不同任务。</small></span></div>}</div><small>{index === 0 ? '先学：第二天完成' : '后学：第三天完成'}，同步到日程和成果中心</small></div>
        })}
      </div>
    </section>
    <section className={`elective-group-confirmation${selectionComplete ? ' ready' : ''}${memberConfirmed ? ' confirmed' : ''}`} aria-label="组员选修确认">
      <div className="elective-confirmation-heading"><div><span className="eyebrow">GROUP CONFIRMATION</span><h2>{currentParticipant?.groupName ?? '当前教研组'} · 组员逐人确认</h2><p>{selectionComplete ? `${selectedBy?.name ?? currentParticipant?.name ?? '组员'}于${selection?.selectedAt ? new Date(selection.selectedAt).toLocaleString('zh-CN', { hour12: false }) : '刚刚'}确定选修顺序。每位教师只确认本人，不代替其他组员。` : '先完成两项选择与顺序配置，再由组员逐人确认。'}</p></div><button className={memberConfirmed ? 'secondary-button' : 'primary-button'} type="button" disabled={!selectionComplete || memberConfirmed} onClick={onConfirm}>{memberConfirmed ? <CheckCircle2 size={16} /> : <UsersRound size={16} />}{memberConfirmed ? '本人已确认' : '我已确认本组选修顺序'}</button></div>
      <div className="elective-member-chips">{groupMembers.map((member) => { const confirmed = Boolean(selection?.memberConfirmedAt[member.participantId]); return <span className={confirmed ? 'confirmed' : ''} key={member.participantId}>{confirmed ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}<strong>{member.name}</strong><small>{member.participantId === directory.currentParticipantId ? '当前教师' : confirmed ? '已确认' : '待本人确认'}</small></span> })}</div>
      {selectionComplete && !memberConfirmed && <div className="elective-confirmation-warning" role="alert"><LockKeyhole size={15} />当前教师尚未确认，E01—E06 任务入口暂时锁定。</div>}
    </section>
    <section className="elective-grid">{electiveTaskIds.map((id) => {
      const task = trainingTasks[id]
      const assignedBucket = assignmentFor(id)
      const state = snapshot.taskStates[id]
      const hasWorkspace = Boolean(taskWorkspaceRegistry[id])
      return <article className={assignedBucket ? 'elective-card selected' : 'elective-card'} key={id}><div className="elective-card-head"><span>{id}</span><em>{task.difficulty}</em>{assignedBucket && <CheckCircle2 size={20} />}</div><h2>{task.title}</h2><p>{task.description}</p><div className="elective-tags"><span>{task.capability}</span><span>{task.collaboration}</span></div><div className="elective-day-actions">{rule.buckets.map((bucket, index) => <button className={assignedBucket?.id === bucket.id ? 'primary-button' : 'secondary-button'} type="button" key={bucket.id} onClick={() => addToBucket(bucket.id, id)}>{assignedBucket?.id === bucket.id ? `已设为第 ${index + 1} 项` : `设为第 ${index + 1} 项`}</button>)}</div><button className={hasWorkspace && assignedBucket && memberConfirmed ? 'primary-button elective-framework-link' : 'text-button elective-framework-link'} type="button" onClick={() => onOpenTask(id)}>{hasWorkspace && assignedBucket ? (memberConfirmed ? taskActionLabel(id, state.status) : '确认选择后开始') : '查看框架'}<ArrowRight size={14} /></button></article>
    })}</section>
    <div className="selection-result"><div><strong>{selectionComplete ? (memberConfirmed ? '当前教师已确认，可按顺序开始实训' : '两项顺序已确定，等待当前教师确认') : '请为本组选择两个不同的选修任务'}</strong><p>{rule.buckets.map((bucket, index) => `第 ${index + 1} 项（${bucket.label}）：${assignments[bucket.id]?.[0] || '未选择'}`).join('；')}。选择按教研组保存，并同步到日程和成果中心。</p></div></div>
  </>
}

function ElectiveDayTasks({ index, bucketId, scheduleLabel, tasks, snapshot, onConfigure, onOpenTask }: { index: number; bucketId: string; scheduleLabel: string; tasks: TrainingTaskDefinition[]; snapshot: TrainingSnapshot; onConfigure: () => void; onOpenTask: (id: TrainingTaskId) => void }) {
  const dayLabel = bucketId === 'day-2' ? '第二天' : bucketId === 'day-3' ? '第三天' : '当天'
  const task = tasks[0]
  const state = task ? snapshot.taskStates[task.id] : undefined
  const hasWorkspace = task ? Boolean(taskWorkspaceRegistry[task.id]) : false
  const orderLabel = bucketId === 'day-2' ? '第 1 项' : '第 2 项'
  return <article className={`day-task training-task-card elective-slot elective-day-task-list ${task ? 'configured' : 'unconfigured'}`}><div className="timeline-index"><span>{String(index + 1).padStart(2, '0')}</span></div><div className="day-task-body"><div className="day-task-meta"><span className="task-code">选修任务</span><span>{scheduleLabel}</span><span>60 分钟</span><span>{orderLabel} · 全组统一</span></div><h3>{task ? `${orderLabel}：${task.id} · ${task.title}` : `${dayLabel}选修尚未配置`}</h3>{task ? <p>{task.description}</p> : <p>本组需在选修池中配置一个任务，并由当前教师确认执行顺序。</p>}<div className="task-state-line"><span className={`status-pill ${state?.status ?? 'blocked'}`}>{state?.status === 'completed' ? <CheckCircle2 size={13} /> : state?.status === 'blocked' ? <LockKeyhole size={13} /> : <FileText size={13} />}{state ? statusLabels[state.status] : '尚未配置'}</span><small>{state?.blockingReasons[0] ?? (task ? '本组选修顺序已同步' : '尚未满足选修配置要求')}</small></div></div><div className="elective-day-controls">{task && <button className={hasWorkspace && state?.status !== 'blocked' ? 'primary-button' : 'secondary-button'} type="button" onClick={() => onOpenTask(task.id)}>{hasWorkspace ? taskActionLabel(task.id, state?.status ?? 'blocked') : '查看框架'}<ArrowRight size={14} /></button>}<button className="secondary-button" type="button" onClick={onConfigure}><Settings2 size={15} />{task ? `调整${orderLabel}` : '选择选修'}<ArrowRight size={16} /></button></div></article>
}
