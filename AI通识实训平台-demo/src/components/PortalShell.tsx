import { BookOpenCheck, CalendarRange, FolderKanban, LayoutDashboard, RotateCcw, ShieldCheck, UsersRound } from 'lucide-react'
import type { ParticipantDirectory, PortalRoute, TrainingParticipant } from '../training/types'
import { TeacherGroupInfo } from './TeacherGroupInfo'

interface PortalShellProps {
  route: PortalRoute
  onNavigate: (route: PortalRoute) => void
  onReset: () => void
  currentParticipant?: TrainingParticipant
  participantDirectory: ParticipantDirectory
  children: React.ReactNode
}

export function PortalShell({ route, onNavigate, onReset, currentParticipant, participantDirectory, children }: PortalShellProps) {
  const tasksActive = route.page === 'tasks' || route.page === 'task'

  return (
    <div className="app-shell portal-shell">
      <header className="topbar portal-topbar">
        <button className="brand" type="button" onClick={() => onNavigate({ page: 'dashboard' })} aria-label="返回实训总览">
          <span className="brand-mark" aria-hidden="true"><BookOpenCheck size={21} /></span>
          <span className="brand-copy"><strong>启境</strong><small>AI 通识实训平台 · 全程 Demo</small></span>
        </button>
        <nav className="portal-nav" aria-label="实训一级导航">
          <button className={route.page === 'dashboard' ? 'active' : ''} type="button" onClick={() => onNavigate({ page: 'dashboard' })}><LayoutDashboard size={16} />实训总览</button>
          <button className={tasksActive ? 'active' : ''} type="button" onClick={() => onNavigate({ page: 'tasks' })}><CalendarRange size={16} />任务清单</button>
          <button className={route.page === 'portfolio' ? 'active' : ''} type="button" onClick={() => onNavigate({ page: 'portfolio' })}><FolderKanban size={16} />成果中心</button>
        </nav>
        <div className="topbar-actions">
          <div className="demo-boundary"><ShieldCheck size={16} />本地模拟数据</div>
          <TeacherGroupInfo currentParticipant={currentParticipant} participantDirectory={participantDirectory} />
          <button className={route.page === 'participants' ? 'participant-management-button active' : 'participant-management-button'} type="button" onClick={() => onNavigate({ page: 'participants' })} aria-label="培训人员与分组"><UsersRound size={17} /><span>人员分组</span></button>
          <button className="icon-button" type="button" onClick={onReset} title="重置全部实训数据" aria-label="重置全部实训数据"><RotateCcw size={18} /></button>
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  )
}
