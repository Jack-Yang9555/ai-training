import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM07Progress } from '../src/m07/data'
import { M07InputPage, M07LayerReviewPage } from '../src/pages/M07Pages'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M07 工作台关键组件', () => {
  it('M06 未完成时仍可独立确认固定虚拟数据输入', () => { const progress = createInitialM07Progress(); progress.input = { ...progress.input, sourceConfirmed: true, anonymousConfirmed: true, virtualDataConfirmed: true, noRankingConfirmed: true }; render(<M07InputPage progress={progress} m06Passed={false} sourceCurrent={false} onReuseM06={vi.fn()} onUpdate={vi.fn()} onNext={vi.fn()} />); expect(screen.getByRole('button', { name: '检查成绩表' })).toBeEnabled(); expect(screen.getByRole('button', { name: 'M06 暂无可复用成果' })).toBeDisabled(); expect(screen.getByText(/不依赖 M06/)).toBeInTheDocument() })
  it('互评只展示当前同组其他成员并披露模拟边界', () => { const progress = createInitialM07Progress(), directory = createInitialPortalProgress().participantDirectory; render(<M07LayerReviewPage progress={progress} directory={directory} onUpdateTask={vi.fn()} onUpdatePeer={vi.fn()} onSubmitPeer={vi.fn()} onUpdateConfirmation={vi.fn()} onConfirm={vi.fn()} onNext={vi.fn()} />); expect(screen.getByText('无多人后端的模拟边界')).toBeInTheDocument(); expect(screen.queryByRole('option',{ name:'张老师' })).not.toBeInTheDocument(); expect(screen.getByRole('option',{ name:'李老师' })).toBeInTheDocument(); expect(screen.queryByRole('option',{ name:'周老师' })).not.toBeInTheDocument() })
})
