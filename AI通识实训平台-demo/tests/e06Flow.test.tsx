import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialE06Progress } from '../src/e06/data'
import type { E06Progress } from '../src/e06/domain'
import { LocalE06LiteratureRunner } from '../src/e06/runner'
import { E06WorkspacePage } from '../src/pages/E06Pages'
import { createInitialPortalProgress } from '../src/training/storage'

describe('E06 八步工作台', () => {
  it('任务说明公开边界并进入材料页', () => { const progress = createInitialE06Progress(); const directory = createInitialPortalProgress().participantDirectory; const onNext = vi.fn(); render(<E06WorkspacePage progress={progress} participantId={directory.currentParticipantId} directory={directory} onUpdate={vi.fn()} onNavigate={vi.fn()} onNext={onNext} onReset={vi.fn()}/>); expect(screen.getByText(/D01—D03 三份获准材料/)).toBeInTheDocument(); expect(screen.getByText(/无开放网络/)).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /锁定教学问题与材料/ })); expect(onNext).toHaveBeenCalledOnce() })
  it('材料页同时展示元数据、授权和可点查位置', () => { const progress = createInitialE06Progress(); progress.route = 'question'; const directory = createInitialPortalProgress().participantDirectory; render(<E06WorkspacePage progress={progress} participantId={directory.currentParticipantId} directory={directory} onUpdate={vi.fn()} onNavigate={vi.fn()} onNext={vi.fn()} onReset={vi.fn()}/>); expect(screen.getByText('D01 · 已审核虚构教研材料')).toBeInTheDocument(); expect(screen.getAllByText(/已授权用于本地培训 Demo/)).toHaveLength(3); expect(screen.getByText('D02-P5-S2')).toBeInTheDocument(); expect(screen.getByText(/不能证明退出卡必然导致成绩提升/)).toBeInTheDocument() })
  it('文献梳理必须逐份核验后才能进入观点比较', () => {
    const directory = createInitialPortalProgress().participantDirectory; const initial = createInitialE06Progress(); initial.route = 'review'; initial.source.exactlyThreeConfirmed = true; initial.source.authorizationConfirmed = true; initial.source.noOpenWebConfirmed = true; initial.source.privacyConfirmed = true; initial.draft = new LocalE06LiteratureRunner().run(initial, directory.currentParticipantId); initial.workingRecords = structuredClone(initial.draft.records)
    const onNext = vi.fn()
    function Harness({ seed }: { seed: E06Progress }) { const [progress, setProgress] = useState(seed); return <E06WorkspacePage progress={progress} participantId={directory.currentParticipantId} directory={directory} onUpdate={(updater) => setProgress((current) => updater(current))} onNavigate={vi.fn()} onNext={onNext} onReset={vi.fn()}/> }
    render(<Harness seed={initial}/>); const next = screen.getByRole('button', { name: /形成观点对比/ }); expect(next).toBeDisabled(); fireEvent.click(next); expect(onNext).not.toHaveBeenCalled()
    screen.getAllByRole('checkbox', { name: /教师已回到四个位置逐项核对/ }).forEach((checkbox) => fireEvent.click(checkbox)); expect(next).toBeEnabled(); fireEvent.click(next); expect(onNext).toHaveBeenCalledOnce()
  })
})
