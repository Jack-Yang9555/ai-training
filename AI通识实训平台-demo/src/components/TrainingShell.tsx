import {
  BookOpenCheck,
  ChevronRight,
  Clock3,
  Home,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import { TeacherGroupInfo } from './TeacherGroupInfo'

interface TrainingShellProps<Route extends string> {
  route: Route
  task: { id: string; title: string; duration: number; kindLabel: string }
  steps: { route: Route; label: string; number: string }[]
  progressPercent: number
  onNavigate: (route: Route) => void
  canNavigate?: (route: Route) => boolean
  onExitTask: () => void
  onReset: () => void
  currentParticipant?: TrainingParticipant
  participantDirectory: ParticipantDirectory
  children: React.ReactNode
}

export function TrainingShell<Route extends string>({ route, task, steps, progressPercent, onNavigate, canNavigate = () => true, onExitTask, onReset, currentParticipant, participantDirectory, children }: TrainingShellProps<Route>) {
  const activeIndex = steps.findIndex((step) => step.route === route)

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={onExitTask} aria-label="返回任务清单">
          <span className="brand-mark" aria-hidden="true"><BookOpenCheck size={21} /></span>
          <span className="brand-copy"><strong>AI 通识实训平台</strong><small>GENERAL AI TRAINING · 全程 Demo</small></span>
        </button>
        <div className="topbar-actions">
          <div className="demo-boundary"><ShieldCheck size={16} />本地模拟数据</div>
          <TeacherGroupInfo currentParticipant={currentParticipant} participantDirectory={participantDirectory} />
          <button className="icon-button" type="button" onClick={onReset} title="重置演示数据" aria-label="重置演示数据"><RotateCcw size={18} /></button>
        </div>
      </header>

      <div className="task-layout">
          <aside className="task-sidebar">
            <button className="back-map" type="button" onClick={onExitTask}><Home size={17} />返回任务清单</button>
            <div className="task-mini-card">
              <span className="task-id">{task.id}</span>
              <strong>{task.title}</strong>
              <span><Clock3 size={14} />{task.duration} 分钟 · {task.kindLabel}</span>
            </div>
            <div className="progress-block">
              <div><span>任务进度</span><strong>{progressPercent}%</strong></div>
              <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
            </div>
            <nav className="step-nav" aria-label={`${task.id} 任务步骤`}>
              {steps.map((step, index) => {
                const active = route === step.route
                const visited = activeIndex >= index || progressPercent === 100
                return (
                  <button className={active ? 'active' : visited ? 'visited' : ''} type="button" key={step.route} disabled={!canNavigate(step.route)} onClick={() => onNavigate(step.route)}>
                    <span>{step.number}</span><strong>{step.label}</strong>{active && <ChevronRight size={16} />}
                  </button>
                )
              })}
            </nav>
            <p className="sidebar-note">页面用于帮助开发人员理解业务流程、状态与校验逻辑，不连接真实模型或生产数据。</p>
          </aside>
          <main className="task-main">{children}</main>
        </div>
    </div>
  )
}
