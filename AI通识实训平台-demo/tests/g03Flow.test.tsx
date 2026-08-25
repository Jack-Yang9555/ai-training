import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { G03Progress } from '../src/g03/domain'
import { createInitialG03Progress } from '../src/g03/storage'
import { createG03Assessment } from '../src/g03/validation'
import { G03AssessmentPage, G03Overview, G03WorkspacePage } from '../src/pages/G03Pages'
import { completeG03Fixture } from './g03Fixtures'

function MatrixHarness({ initial }: { initial: G03Progress }) {
  const [progress, setProgress] = useState(initial)
  return <G03WorkspacePage progress={progress} onUpdate={(updater) => setProgress((current) => updater(current))} onReset={vi.fn()} />
}

describe('G03 工作台关键流程', () => {
  it('说明页明确不计分、本人真实证据边界和恰好三项成果', () => {
    const { context } = completeG03Fixture()
    const progress = createInitialG03Progress(context)
    render(<G03Overview progress={progress} onNext={vi.fn()} />)
    expect(screen.getByText(/G03 不重复执行三个个人任务，也不采用数值评分/)).toBeInTheDocument()
    expect(screen.getByText('本人三项当前证据')).toBeInTheDocument()
    expect(screen.getByText('课程知识库与 AI 助教综合测试报告')).toBeInTheDocument()
    expect(screen.getByText('3 分钟核心演示和 2 分钟在线答问记录')).toBeInTheDocument()
    expect(screen.getByText('成员角色与贡献清单')).toBeInTheDocument()
  })

  it('矩阵页在逐人确认前阻止下一步，确认后进入问题修正汇总', async () => {
    const user = userEvent.setup()
    const { progress } = completeG03Fixture()
    progress.route = 'matrix'
    progress.matrixConfirmed = false
    render(<MatrixHarness initial={progress} />)
    const next = screen.getByRole('button', { name: /汇总问题、修改与复测/ })
    expect(next).toBeDisabled()
    expect(screen.getAllByText('确定性模拟组员证据').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('checkbox', { name: /逐人核对双向覆盖/ }))
    expect(next).toBeEnabled()
    await user.click(next)
    expect(screen.getByRole('heading', { name: '从 M09—M11 证据中定位至少一条完整闭环' })).toBeInTheDocument()
  })

  it('阶段验收允许保存未通过初验，并显示四项条件和三个固定成果', async () => {
    const user = userEvent.setup()
    const { context } = completeG03Fixture()
    const progress = createInitialG03Progress(context)
    progress.route = 'assessment'
    render(<MatrixHarness initial={progress} />)
    expect(screen.getByText('G03 四条件验收')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交初验' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: '提交初验' }))
    expect(screen.getByText('初验')).toBeInTheDocument()
    expect(screen.getByText(/未通过 · 0\/4 项/)).toBeInTheDocument()
    expect(screen.getByLabelText('补验修改摘要')).toBeInTheDocument()
  })

  it('当前通过页不显示数值总分，只显示 4/4 与初验历史', () => {
    const { progress } = completeG03Fixture()
    const result = createG03Assessment(progress, '培训师', '2026-08-25T10:00:00.000Z')
    progress.assessments = [result.assessment]
    progress.artifacts = result.artifacts
    render(<G03AssessmentPage progress={progress} onNavigate={vi.fn()} onUpdateSummary={vi.fn()} onSubmit={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'G03 阶段验收已通过' })).toBeInTheDocument()
    expect(screen.getByText('/ 4 项')).toBeInTheDocument()
    expect(screen.queryByText(/\/ 10 分/)).not.toBeInTheDocument()
    expect(screen.getByText(/已通过 · 4\/4 项/)).toBeInTheDocument()
  })
})
