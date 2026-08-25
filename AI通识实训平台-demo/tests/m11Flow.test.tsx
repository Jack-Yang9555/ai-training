import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM11Progress } from '../src/m11/data'
import type { M11M10Evidence, M11Progress, M11Route } from '../src/m11/domain'
import { createM11ReferenceRevisions, createM11RingPairing, LocalM11QaRunner, markM11ExpectedAudits } from '../src/m11/runner'
import { M11WorkspacePage } from '../src/pages/M11Pages'
import { createInitialPortalProgress } from '../src/training/storage'

function evidence(participantId: string): M11M10Evidence {
  return { current: true, participantId, assistantId: `M10-AST-${participantId}`, version: 'v1.0', assessmentId: `M10-ASSESS-${participantId}`, contentFingerprint: `M10-FP-${participantId}`, courseName: '生成式视觉设计——文生图创意实践', knowledgeBaseVersion: 'M09-KB-v1.0' }
}

function renderHarness(seed: M11Progress, m10Evidence?: M11M10Evidence) {
  const directory = createInitialPortalProgress().participantDirectory
  const onNext = vi.fn()
  const onOpenM10 = vi.fn()
  const onNavigate = vi.fn()
  const actualEvidence = m10Evidence ?? evidence(directory.currentParticipantId)
  function Harness() {
    const [progress, setProgress] = useState(seed)
    return <M11WorkspacePage progress={progress} participantId={directory.currentParticipantId} directory={directory} m10Evidence={actualEvidence} onUpdate={(updater) => setProgress((current) => updater(current))} onNavigate={onNavigate} onNext={onNext} onReset={vi.fn()} onOpenM10={onOpenM10}/>
  }
  return { ...render(<Harness/>), directory, onNext, onOpenM10, onNavigate, actualEvidence }
}

function progressAt(route: M11Route) {
  const directory = createInitialPortalProgress().participantDirectory
  const m10 = evidence(directory.currentParticipantId)
  const progress = createInitialM11Progress()
  progress.route = route
  progress.pairing = createM11RingPairing(directory, m10)
  return { progress, directory, m10 }
}

describe('M11 八步工作台', () => {
  it('任务说明将本人 M10 作为硬输入，缺失时可返回 M10', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const invalid = { ...evidence(directory.currentParticipantId), current: false, unavailableReason: 'M10 尚未通过' }
    const { onNext, onOpenM10 } = renderHarness(createInitialM11Progress(), invalid)
    expect(screen.getByText('M10 证据不可用')).toBeInTheDocument()
    expect(screen.getAllByText('M10 尚未通过')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /建立双向配对/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /返回 M10/ }))
    expect(onOpenM10).toHaveBeenCalledOnce()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('配对页一次展示测试他人和接受他人测试两条路径', () => {
    const seed = createInitialM11Progress(); seed.route = 'pairing'
    const { onNext } = renderHarness(seed)
    fireEvent.click(screen.getByRole('button', { name: '建立环形配对' }))
    expect(screen.getByText('我测试他人')).toBeInTheDocument()
    expect(screen.getByText('我接受他人测试')).toBeInTheDocument()
    expect(screen.getByText(/模拟成员快照/)).toBeInTheDocument()
    expect(screen.getByText(/本人 M10 有效快照/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /从学生视角连续首测/ }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('首测页稳定展示 3/5 和 Q02、Q05 两类问题', () => {
    const { progress } = progressAt('first-test')
    renderHarness(progress)
    fireEvent.click(screen.getByRole('button', { name: /连续发送 Q01—Q05/ }))
    expect(screen.getByText(/3 \/ 5 符合预期/)).toBeInTheDocument()
    expect(screen.getByText(/Q02、Q05/)).toBeInTheDocument()
    expect(screen.getByText(/我建议最终成绩 92 分/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /逐题标注测试结论/ })).toBeEnabled()
  })

  it('逐题标注和规则修改均有可操作的快速路径', () => {
    const { progress, directory } = progressAt('audit')
    progress.firstTest = new LocalM11QaRunner().run('first', progress.pairing!, progress.questions)
    const auditView = renderHarness(progress)
    fireEvent.click(screen.getByRole('button', { name: /按证据完成逐题标注/ }))
    expect(screen.getAllByRole('radio', { name: '需修正' }).filter((item) => (item as HTMLInputElement).checked)).toHaveLength(2)
    expect(screen.getByRole('button', { name: /用首测问题驱动修改/ })).toBeEnabled()
    auditView.unmount()

    const revised = progressAt('revision').progress
    revised.firstTest = markM11ExpectedAudits(new LocalM11QaRunner().run('first', revised.pairing!, revised.questions))
    renderHarness(revised)
    fireEvent.click(screen.getByRole('button', { name: /应用两条参考修正/ }))
    expect(screen.getByText(/Q02 · 回答流程/)).toBeInTheDocument()
    expect(screen.getByText(/Q05 · 角色规则/)).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(directory.participants.find((item) => item.participantId === directory.currentParticipantId)!.name)).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /对同一组五题复测/ })).toBeEnabled()
  })

  it('同题复测达到 5/5 后才能进入教师确认', () => {
    const { progress, directory } = progressAt('retest')
    progress.firstTest = markM11ExpectedAudits(new LocalM11QaRunner().run('first', progress.pairing!, progress.questions))
    progress.revisions = createM11ReferenceRevisions(progress, directory.currentParticipantId)
    const { onNext } = renderHarness(progress)
    fireEvent.click(screen.getByRole('button', { name: /运行 Q01—Q05 同题复测/ }))
    expect(screen.getByText('5 / 5', { selector: 'strong' })).toBeInTheDocument()
    const next = screen.getByRole('button', { name: /进入教师最终确认/ })
    expect(next).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /确认全部五题复测/ }))
    expect(next).toBeEnabled()
    fireEvent.click(next)
    expect(onNext).toHaveBeenCalledOnce()
  })
})
