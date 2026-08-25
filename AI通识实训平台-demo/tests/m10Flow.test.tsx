import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM10Progress } from '../src/m10/data'
import type { M10Progress, M10Route } from '../src/m10/domain'
import { M10WorkspacePage } from '../src/pages/M10Pages'
import { createInitialPortalProgress } from '../src/training/storage'
import { buildPassedM10 } from './m10Fixtures'

const routes: M10Route[] = ['overview', 'source', 'configuration', 'flow', 'boundaries', 'preview', 'review-confirm', 'result']

function CompletedHarness() {
  const directory = createInitialPortalProgress().participantDirectory
  const [progress, setProgress] = useState<M10Progress>(() => ({ ...buildPassedM10(directory), route: 'overview' }))
  const next = () => setProgress((current) => ({ ...current, route: routes[Math.min(routes.indexOf(current.route) + 1, routes.length - 1)] }))
  return <M10WorkspacePage progress={progress} participantId={directory.currentParticipantId} directory={directory} onUpdate={(updater) => setProgress((current) => updater(current))} onNavigate={(route) => setProgress((current) => ({ ...current, route }))} onNext={next} onReset={vi.fn()} />
}

describe('M10 工作台关键流程', () => {
  it('任务说明明确 M09 硬输入、6+4+5、预览边界和两项成果/一个槽位', () => {
    const directory = createInitialPortalProgress().participantDirectory
    render(<M10WorkspacePage progress={createInitialM10Progress()} participantId={directory.currentParticipantId} directory={directory} onUpdate={vi.fn()} onNavigate={vi.fn()} onNext={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getByText('M09 硬输入')).toBeInTheDocument()
    expect(screen.getByText('75 分钟')).toBeInTheDocument()
    expect(screen.getByText('六要素')).toBeInTheDocument()
    expect(screen.getByText('固定四步')).toBeInTheDocument()
    expect(screen.getByText('五类边界')).toBeInTheDocument()
    expect(screen.getByText(/成果恰好 2 项/)).toBeInTheDocument()
    expect(screen.getByText(/1 个槽位/)).toBeInTheDocument()
    expect(screen.getByText(/预览不代替 M11/)).toBeInTheDocument()
  })

  it('M09 证据缺失时明确阻断并可返回 M09', () => {
    const directory = createInitialPortalProgress().participantDirectory
    render(<M10WorkspacePage progress={{ ...createInitialM10Progress(), route: 'source' }} participantId={directory.currentParticipantId} directory={directory} onUpdate={vi.fn()} onNavigate={vi.fn()} onNext={vi.fn()} onReset={vi.fn()} onOpenM09={vi.fn()} />)
    expect(screen.getByText('未发现当前 M09 通过证据')).toBeInTheDocument()
    expect(screen.getByText(/不会用演示知识库替代/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回 M09 完成知识库' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /配置六要素/ })).toBeDisabled()
  })

  it('八步已完成证据可逐页打开，四步不可删除，结果显示恰好两项任务成果', async () => {
    const user = userEvent.setup()
    render(<CompletedHarness />)
    await user.click(screen.getByRole('button', { name: /检查 M09 输入/ }))
    expect(screen.getByText(/M09 CURRENT EVIDENCE/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /配置六要素/ }))
    expect(screen.getByRole('heading', { name: /用教学语言配置角色/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /设置固定四步/ }))
    expect(screen.getAllByText('不可删除/调序')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: /设置五类边界/ }))
    expect(screen.getAllByRole('combobox')).toHaveLength(5)
    await user.click(screen.getByRole('button', { name: /运行双场景预览/ }))
    expect(screen.getByRole('heading', { name: '正常问题预览' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '边界问题预览' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /进入同组互评/ }))
    expect(screen.getByText('确定性模拟，不代表真实组员实时提交')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /张老师/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /李老师/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /周老师/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /查看评分与成果/ }))
    expect(screen.getByText('M10 当前验收已通过')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '任务成果恰好 2 项' })).toBeInTheDocument()
    expect(screen.getByText(/个人成果中只占 1 个/)).toBeInTheDocument()
    expect(screen.getByText('课程 AI 助教 v1.0')).toBeInTheDocument()
    expect(screen.getByText('六要素配置表、边界规则清单和配置修改记录')).toBeInTheDocument()
  })
})
