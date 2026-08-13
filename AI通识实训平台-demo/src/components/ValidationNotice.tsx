import { AlertCircle, CheckCircle2, Circle } from 'lucide-react'

export interface TrackingItem {
  id: string
  label: string
  completed: boolean
  detail: string
}

interface ValidationNoticeProps {
  messages: string[]
  success?: string
  items?: TrackingItem[]
}

export function ValidationNotice({ messages, success, items }: ValidationNoticeProps) {
  if (items) {
    const completedCount = items.filter((item) => item.completed).length
    const allCompleted = items.length > 0 && completedCount === items.length
    return (
      <div className={allCompleted ? 'task-tracker complete' : 'task-tracker'} aria-live="polite">
        <div className="task-tracker-head">
          <span>{allCompleted ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<strong>{allCompleted ? '本阶段任务已完成' : '任务完成情况'}</strong></span>
          <em>{completedCount} / {items.length} 项</em>
        </div>
        <div className="task-tracker-list">
          {items.map((item) => (
            <div className={item.completed ? 'completed' : 'pending'} key={item.id}>
              {item.completed ? <CheckCircle2 size={17} /> : <Circle size={17} />}
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            </div>
          ))}
        </div>
        {allCompleted && success && <p>{success}</p>}
        {!allCompleted && messages.length > 0 && <div className="tracker-details" role="alert"><strong>仍需完成</strong><ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul><small>页面内容变化后，以上状态会实时更新。</small></div>}
      </div>
    )
  }
  if (messages.length === 0 && success) {
    return <div className="validation success"><CheckCircle2 size={18} /><span>{success}</span></div>
  }
  if (messages.length === 0) return null
  return (
    <div className="validation error"><AlertCircle size={18} /><div><strong>请先完成以下内容</strong><ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul></div></div>
  )
}
