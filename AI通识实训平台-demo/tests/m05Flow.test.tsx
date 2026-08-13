import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM05Progress } from '../src/m05/storage'
import { M05DraftPage, M05InputPage, M05PeerReviewPage } from '../src/pages/M05Pages'
import { localM05QuestionRunner } from '../src/services/m05QuestionRunner'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M05 工作台关键组件', () => {
  it('输入页支持任务内输入和可选读取 M04，并显示无隐藏字数门槛', () => {
    const progress = createInitialM05Progress()
    render(<M05InputPage progress={progress} m04Passed onReuseM04={vi.fn()} onUpdate={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '命题输入来源' })).toBeInTheDocument()
    expect(screen.getByLabelText('课程材料正文（必填）')).toBeInTheDocument()
    expect(screen.getAllByText(/不设置隐藏字数门槛/).length).toBeGreaterThan(0)
  })

  it('草稿页展示固定题型、逐题证据和综合任务评分要点', async () => {
    const progress = createInitialM05Progress()
    progress.input = { ...progress.input, sourceM04AssessmentId: 'a', sourceM04PlanId: 'b', sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true }
    progress.draft = await localM05QuestionRunner.run({ participantId: 'T001', input: progress.input })
    render(<M05DraftPage progress={progress} running={false} onRun={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText(/不连接真实模型、Dify、后端或 API Key/)).toBeInTheDocument()
    expect(screen.getAllByText('评分要点').length).toBeGreaterThan(0)
    expect(screen.getByText(/8 道题及规定题型齐全/)).toBeInTheDocument()
  })

  it('互评只提供同组其他成员并明确披露模拟边界', () => {
    const progress = createInitialM05Progress()
    const directory = createInitialPortalProgress().participantDirectory
    render(<M05PeerReviewPage progress={progress} directory={directory} onUpdateReview={vi.fn()} onSubmit={vi.fn()} onUpdateConfirmation={vi.fn()} onConfirm={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText('无多人后端的模拟组员成果')).toBeInTheDocument()
    expect(screen.getByText(/仅对 M05 有效/)).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '张老师' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '李老师' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '周老师' })).not.toBeInTheDocument()
  })
})
