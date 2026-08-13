import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { m03DefaultSnapshot } from '../src/m03/data'
import { m03PromptMessageToSnapshot } from '../src/m03/promptMessage'
import { createInitialM03Progress } from '../src/m03/storage'
import { M03ComparePage, M03DesignPage, M03IterationPage, M03PeerReviewPage } from '../src/pages/M03Pages'
import { localM03PromptRunner } from '../src/services/m03PromptRunner'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M03 工作台关键交互', () => {
  it('仿真 AI 聊天页要求教师从空白消息中自行输入六项名称和内容', async () => {
    const progress = createInitialM03Progress()
    progress.design = { ...m03DefaultSnapshot, rightsConfirmed: true, privacyConfirmed: true, lessonName: '课' }
    const onUpdate = vi.fn()
    const onUpdateMessage = vi.fn()
    const { container } = render(<M03DesignPage progress={progress} onUpdate={onUpdate} onUpdateMessage={onUpdateMessage} onUnlock={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '在仿真 AI 对话中完成你的提示词' })).toBeInTheDocument()
    expect(screen.getAllByText('提示词教学助手').length).toBeGreaterThan(0)
    expect(screen.getByText('示例教师')).toBeInTheDocument()
    expect(container.querySelectorAll('.m03-ai-example-prompt section')).toHaveLength(6)
    expect(container.querySelectorAll('.m03-ai-detection-list')).toHaveLength(0)
    expect(container.querySelectorAll('.m03-ai-compose-panel')).toHaveLength(1)
    expect(container.querySelectorAll('.m03-ai-draft-field')).toHaveLength(0)
    expect(screen.getByLabelText('我的提示词消息')).toHaveValue('')
    expect(screen.getAllByRole('button', { name: '发送我的提示词' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: '发送我的提示词' })).toBeDisabled()
    expect(Array.from(container.querySelectorAll('.m03-ai-example-prompt strong')).map((node) => node.textContent)).toEqual(['角色 / 任务', '背景', '输入', '约束', '输出格式', '质量标准'])
    expect(screen.getByText('六项结构 0/6')).toBeInTheDocument()
    expect(screen.queryByText('教学背景')).not.toBeInTheDocument()
    expect(screen.queryByText('课程材料')).not.toBeInTheDocument()
    expect(screen.queryByText('生成约束')).not.toBeInTheDocument()
    const message = '01 角色 / 任务\n角色：课程助教；任务：生成课堂练习。\n02 背景\n课程：人工智能基础；课次：新课。\n03 输入\n材料名称：课程讲义；材料正文：人工智能基础概念；允许使用范围：仅限讲义。\n04 约束\n45 分钟，3 道题，入门。\n05 输出格式\n分节文本；必须包含：活动、练习、答案。\n06 质量标准\n内容准确，答案与题目匹配。'
    fireEvent.change(screen.getByLabelText('我的提示词消息'), { target: { value: message } })
    expect(onUpdateMessage).toHaveBeenCalledWith(message, expect.objectContaining({ role: '课程助教', courseName: '人工智能基础', materialName: '课程讲义', duration: 45, questionCount: 3 }))
    const completeProgress = { ...progress, designMessage: message, design: m03PromptMessageToSnapshot(message, progress.design) }
    const { container: completedContainer } = render(<M03DesignPage progress={completeProgress} onUpdate={onUpdate} onUpdateMessage={onUpdateMessage} onUnlock={vi.fn()} onNext={vi.fn()} />)
    expect(completedContainer.querySelector('.m03-ai-recognition-summary .complete')).toHaveTextContent('六项结构 6/6')
    expect(screen.getAllByRole('button', { name: '发送我的提示词' }).at(-1)).toBeEnabled()
  })

  it('比较页并排展示 V1/V2，并提供两套段落证据表单', async () => {
    const progress = createInitialM03Progress()
    progress.design.rightsConfirmed = true
    progress.design.privacyConfirmed = true
    progress.v1 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v1', snapshot: progress.design })
    progress.iterationVariable = 'questionCount'
    progress.iterationDraft = { ...progress.v1.snapshot, questionCount: 4 }
    progress.v2 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v2', snapshot: progress.iterationDraft })
    render(<M03ComparePage progress={progress} onUpdateComparison={vi.fn()} onUpdateVerification={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText('唯一变化：题量')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'V1 专业核验' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'V2 专业核验' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('关联输出段落')).toHaveLength(2)
  })

  it('单变量编辑区以等宽双栏对齐展示 V1 原值与 V2 修改值', async () => {
    const progress = createInitialM03Progress()
    progress.design.rightsConfirmed = true
    progress.design.privacyConfirmed = true
    progress.v1 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v1', snapshot: progress.design })
    progress.iterationVariable = 'studentFoundation'
    progress.iterationDraft = { ...progress.v1.snapshot }
    const { container } = render(<M03IterationPage progress={progress} running={false} onSelectVariable={vi.fn()} onUpdateDraft={vi.fn()} onRun={vi.fn()} onNext={vi.fn()} />)
    expect(container.querySelectorAll('.m03-variable-version-card')).toHaveLength(2)
    expect(screen.getByText('第一版 V1')).toBeInTheDocument()
    expect(screen.getByText('第二版 V2')).toBeInTheDocument()
    expect(screen.getByLabelText('修改后的学生基础')).toHaveValue(progress.design.studentFoundation)
  })

  it('小组互评只显示同组其他成员并披露模拟边界', () => {
    const progress = createInitialM03Progress()
    const directory = createInitialPortalProgress().participantDirectory
    render(<M03PeerReviewPage progress={progress} directory={directory} onUpdate={vi.fn()} onSubmit={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText('无多人后端的模拟组员成果')).toBeInTheDocument()
    expect(screen.getByText(/仅对 M03 有效/)).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '张老师' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '李老师' })).toBeInTheDocument()
  })
})
