import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM04Progress } from '../src/m04/storage'
import { M04DraftPage, M04InputPage, M04PeerReviewPage } from '../src/pages/M04Pages'
import { localM04LessonPlanRunner } from '../src/services/m04LessonPlanRunner'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M04 工作台关键组件', () => {
  it('教案输入页可独立确认任务内基线，并保留 M03 可选复用和 45—90 分钟边界', () => {
    const progress = createInitialM04Progress()
    render(<M04InputPage progress={progress} m03Passed onReuseM03={vi.fn()} onUpdate={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '教案输入来源' })).toBeInTheDocument()
    expect(screen.getByLabelText('教学目标（必填）')).toBeInTheDocument()
    expect(screen.getByLabelText('课程材料正文（必填）')).toBeInTheDocument()
    expect(screen.getByLabelText('课堂时长（45—90 分钟）')).toHaveAttribute('min', '45')
    expect(screen.getByText('不设置规范未要求的字数门槛')).toBeInTheDocument()
  })

  it('M03 未完成时 M04 输入仍可独立确认', () => {
    const progress = createInitialM04Progress()
    progress.input = { ...progress.input, sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true }
    render(<M04InputPage progress={progress} m03Passed={false} onReuseM03={vi.fn()} onUpdate={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: '生成 AI 教案草稿' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'M03 暂无可复用成果' })).toBeDisabled()
  })

  it('草稿页展示目标、活动、评价、分层支持的对应结构和本地模拟边界', async () => {
    const progress = createInitialM04Progress()
    progress.input = { ...progress.input, sourceM03AssessmentId: 'a', sourceM03RunId: 'b', sourcePromptSummary: '六格', sourceConfirmed: true, rightsConfirmed: true, privacyConfirmed: true }
    progress.draft = await localM04LessonPlanRunner.run({ participantId: 'T001', input: progress.input })
    render(<M04DraftPage progress={progress} running={false} onRun={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText(/不连接真实模型、Dify、后端或 API Key/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '3 个学习目标' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '活动—目标—评价对应' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '分层支持' })).toBeInTheDocument()
  })

  it('小组互评只列出同组其他成员，角色不写入人员档案，并披露模拟边界', async () => {
    const user = userEvent.setup()
    const progress = createInitialM04Progress()
    const directory = createInitialPortalProgress().participantDirectory
    const onUpdate = vi.fn()
    render(<M04PeerReviewPage progress={progress} directory={directory} onUpdate={onUpdate} onSubmit={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText('无多人后端的模拟组员成果')).toBeInTheDocument()
    expect(screen.getByText(/仅对 M04 有效/)).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '张老师' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '李老师' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '周老师' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('被互评成员'), 'T002')
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ targetParticipantId: 'T002', targetArtifactId: expect.stringContaining('T002') }))
  })
})
