import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM06Progress } from '../src/m06/data'
import { M06InputPage, M06ReviewConfirmPage } from '../src/pages/M06Pages'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M06 工作台关键组件', () => {
  it('M04 未完成时仍可独立确认输入并继续', () => {
    const progress = createInitialM06Progress()
    progress.input = { ...progress.input, sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true }
    render(<M06InputPage progress={progress} m04Passed={false} sourceCurrent={false} onReuseM04={vi.fn()} onUpdate={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: '进入课件草稿' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'M04 暂无可复用成果' })).toBeDisabled()
    expect(screen.getByText(/不依赖上游任务/)).toBeInTheDocument()
  })

  it('互评只展示当前同组其他成员并披露模拟边界', () => {
    const progress = createInitialM06Progress()
    const directory = createInitialPortalProgress().participantDirectory
    render(<M06ReviewConfirmPage progress={progress} directory={directory} onUpdateReview={vi.fn()} onSubmitReview={vi.fn()} onUpdateConfirmation={vi.fn()} onConfirm={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText('无多人后端的模拟边界')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '张老师' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '李老师' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '周老师' })).not.toBeInTheDocument()
  })
})
