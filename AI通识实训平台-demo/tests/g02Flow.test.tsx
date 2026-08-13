import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildG02GroupContext } from '../src/g02/data'
import { createInitialG02Progress } from '../src/g02/storage'
import { G02DirectoryPage, G02Overview } from '../src/pages/G02Pages'
import { createInitialPortalProgress } from '../src/training/storage'

describe('G02 工作台关键组件', () => {
  it('说明页明确 G02 独立边界、M07 非验收材料和恰好三份成果', () => { render(<G02Overview groupName="第三组" onNext={vi.fn()} />); expect(screen.getByText(/M07 不属于 G02 验收材料/)).toBeInTheDocument(); expect(screen.getByText('小组多模态教学成果展示页')).toBeInTheDocument(); expect(screen.getByText('同伴反馈与修改记录')).toBeInTheDocument(); expect(screen.getByText('成员贡献清单')).toBeInTheDocument() })
  it('目录页披露真实、任务内演示和模拟组员三类来源边界', () => { const directory = createInitialPortalProgress().participantDirectory, progress = createInitialG02Progress(buildG02GroupContext(directory, { participantId: directory.currentParticipantId })); render(<G02DirectoryPage progress={progress} onConfirm={vi.fn()} onNext={vi.fn()} />); expect(screen.getByText('无多人后端与未实现选修任务的模拟边界')).toBeInTheDocument(); expect(screen.getAllByText('任务内演示成果').length).toBeGreaterThan(0); expect(screen.getAllByText('模拟组员摘要').length).toBeGreaterThan(0) })
})
