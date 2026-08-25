import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialM12Progress } from '../src/m12/data'
import type { M12Progress } from '../src/m12/domain'
import { M12WorkspacePage } from '../src/pages/M12Pages'
import { createInitialPortalProgress } from '../src/training/storage'

describe('M12 工作台入口', () => {
  it('明确区分正式成果核对与非计分仿真预演', () => {
    const directory = createInitialPortalProgress().participantDirectory
    render(<M12WorkspacePage progress={createInitialM12Progress()} officialEvidence={[]} participantId={directory.currentParticipantId} directory={directory} correctionOptions={[]} assistantOptions={[]} onUpdate={vi.fn()} onNavigate={vi.fn()} onNext={vi.fn()} onOpenSource={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getByRole('button', { name: /核对本人 10 类成果/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /进入完整仿真预演/ })).toBeInTheDocument()
    expect(screen.getByText(/不会被预演替代/)).toBeInTheDocument()
    expect(screen.getByText(/不重新评价 10 类单项作品/)).toBeInTheDocument()
  })

  it('正式模式可选择真实同组成员并据实登记现场反馈', async () => {
    const user = userEvent.setup()
    const directory = createInitialPortalProgress().participantDirectory
    const participantId = directory.currentParticipantId
    const participant = directory.participants.find((item) => item.participantId === participantId)
    const reviewer = directory.participants.find((item) => item.groupId === participant?.groupId && item.participantId !== participantId)
    expect(reviewer).toBeDefined()

    const initial: M12Progress = {
      ...createInitialM12Progress(),
      route: 'safety',
      mode: 'official',
      flow: [{ entryId: 'FLOW-interactive-web', slotId: 'interactive-web', stage: '课中', order: 1, audience: '学生', teachingStep: '互动练习', objective: '即时反馈', teacherAction: '观察并接管', transition: '进入复盘' }],
    }

    function Harness() {
      const [progress, setProgress] = useState(initial)
      return <M12WorkspacePage progress={progress} officialEvidence={[]} participantId={participantId} directory={directory} correctionOptions={[]} assistantOptions={[]} onUpdate={setProgress} onNavigate={vi.fn()} onNext={vi.fn()} onOpenSource={vi.fn()} onReset={vi.fn()} />
    }

    render(<Harness />)
    await user.selectOptions(screen.getByLabelText('本人展示角色'), '展示员')
    await user.selectOptions(screen.getByLabelText('纳入展示的成果入口'), 'interactive-web')
    await user.type(screen.getByLabelText('本人展示内容或操作贡献'), '演示三阶段流程与教师接管。')
    await user.selectOptions(screen.getByLabelText('现场反馈人'), reviewer!.participantId)
    await user.type(screen.getByLabelText('同组流程反馈'), '流程衔接清楚，教师接管可操作。')

    const registerButton = screen.getByRole('button', { name: /登记现场反馈/ })
    expect(registerButton).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /据实代录/ }))
    expect(registerButton).toBeEnabled()
    await user.click(registerButton)
    expect(screen.getByText(new RegExp(`已登记：${reviewer!.name}`))).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /已阅读反馈/ }))
    expect(screen.getByRole('button', { name: '提交展示记录' })).toBeEnabled()
  })
})
