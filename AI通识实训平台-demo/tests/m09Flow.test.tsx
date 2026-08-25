import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM09Progress } from '../src/m09/data'
import { M09Overview, M09PeerConfirmPage, M09SourcesPage } from '../src/pages/M09Pages'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M09 工作台关键组件', () => {
  it('任务说明明确 2—5、5+4、同题复测和两项成果', () => {
    render(<M09Overview onNext={vi.fn()} />)
    expect(screen.getByText(/2—5 份课程资料/)).toBeInTheDocument()
    expect(screen.getByText(/同一组 5 道有据题和 4 道边界题/)).toBeInTheDocument()
    expect(screen.getByText('成果恰好 2 项')).toBeInTheDocument()
    expect(screen.getByText('本地仿真边界')).toBeInTheDocument()
  })

  it('来源页提供样例和真实本地文件读取，并明确不上传', () => {
    const progress = createInitialM09Progress()
    render(<M09SourcesPage progress={progress} onLoadSamples={vi.fn()} onFiles={vi.fn()} onUpdateScenario={vi.fn()} onUpdateSource={vi.fn()} onRemoveSource={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /载入 4 份课程样例/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/读取本机 .txt\/.md/)).toHaveAttribute('type', 'file')
    expect(screen.getByText(/文件只在当前浏览器处理，不会上传/)).toBeInTheDocument()
  })

  it('同组测试下拉排除本人和跨组成员，并披露模拟边界', () => {
    const progress = createInitialM09Progress()
    const directory = createInitialPortalProgress().participantDirectory
    render(<M09PeerConfirmPage progress={progress} directory={directory} onUpdatePeer={vi.fn()} onSimulatePeer={vi.fn()} onSubmitPeer={vi.fn()} onUpdateConfirmation={vi.fn()} onConfirm={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText('确定性模拟，不代表真实组员提交')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '张老师' })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: '李老师' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '周老师' })).not.toBeInTheDocument()
  })
})
