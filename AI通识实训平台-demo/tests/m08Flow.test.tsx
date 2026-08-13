import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM08Progress } from '../src/m08/data'
import { M08InputPage, M08PeerConfirmPage } from '../src/pages/M08Pages'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M08 工作台关键组件', () => {
  it('M04、M06 均未完成时仍可使用任务内基线独立进入生成', () => { const progress = createInitialM08Progress(); render(<M08InputPage progress={progress} m04Available={false} m06Available={false} onUseBaseline={vi.fn()} onReuseM04={vi.fn()} onReuseM06={vi.fn()} onUpdate={vi.fn()} onNext={vi.fn()} />); expect(screen.getByRole('button', { name: '生成 AI 原始网页' })).toBeEnabled(); expect(screen.getByRole('button', { name: 'M04 暂无当前成果' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'M06 暂无当前成果' })).toBeDisabled() })
  it('学生测试只展示当前同组其他成员并披露模拟边界', () => { const progress = createInitialM08Progress(), directory = createInitialPortalProgress().participantDirectory; render(<M08PeerConfirmPage progress={progress} directory={directory} onUpdatePeer={vi.fn()} onSubmitPeer={vi.fn()} onUpdateConfirmation={vi.fn()} onConfirm={vi.fn()} onNext={vi.fn()} />); expect(screen.getByText('无多人后端的模拟边界')).toBeInTheDocument(); expect(screen.queryByRole('option', { name: '张老师' })).not.toBeInTheDocument(); expect(screen.getByRole('option', { name: '李老师' })).toBeInTheDocument(); expect(screen.queryByRole('option', { name: '周老师' })).not.toBeInTheDocument() })
})
