import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { M09_STORAGE_KEY } from '../src/m09/storage'
import { createInitialM10Progress } from '../src/m10/data'
import { m10KnowledgeSourceFromM09, synchronizeM10Source } from '../src/m10/runner'
import { M10_STORAGE_KEY } from '../src/m10/storage'
import { createInitialPortalProgress, PORTAL_STORAGE_KEY } from '../src/training/storage'
import { buildPassedM09 } from './m10Fixtures'

function seedThirdDay(route: 'list' | 'm10', includeCompletedM10 = false) {
  const portal = createInitialPortalProgress()
  portal.route = route === 'list' ? { page: 'tasks', groupId: 'day-3' } : { page: 'task', taskId: 'M10' }
  const participantId = portal.participantDirectory.currentParticipantId
  const m09 = buildPassedM09(portal.participantDirectory)
  window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(portal))
  window.localStorage.setItem(M09_STORAGE_KEY, JSON.stringify({ version: 1, participants: { [participantId]: m09 } }))
  if (includeCompletedM10) {
    const source = m10KnowledgeSourceFromM09(m09, portal.participantDirectory)
    if (!source) throw new Error('测试需要当前 M09 通过证据')
    const m10 = { ...synchronizeM10Source(createInitialM10Progress(), source), route: 'result' as const }
    window.localStorage.setItem(M10_STORAGE_KEY, JSON.stringify({ version: 1, participants: { [participantId]: m10 } }))
  }
}

function seedG03WithoutPrerequisites() {
  const portal = createInitialPortalProgress()
  portal.route = { page: 'task', taskId: 'G03' }
  window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(portal))
}

describe('第三天主应用 M10 集成边界', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('M09 通过后首次进入 M10 仍从任务说明开始，不把自动绑定误判为续做', async () => {
    seedThirdDay('list')
    const user = userEvent.setup()
    render(<App />)

    const card = screen.getByText('M10').closest('.training-task-card')
    expect(card).not.toBeNull()
    await waitFor(() => expect(within(card as HTMLElement).getByRole('button')).toBeEnabled())
    await user.click(within(card as HTMLElement).getByRole('button'))

    expect(screen.getByRole('heading', { name: '课程 AI 助教配置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '检查 M09 输入' })).toBeEnabled()
    expect(screen.queryByRole('heading', { name: '用教学语言配置角色、对象、任务、知识、流程和边界' })).not.toBeInTheDocument()
  })

  it('重置 M10 后立即重新绑定未变化的当前 M09，不需刷新或切换教师', async () => {
    seedThirdDay('m10', true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('M10 五维评分与成果验收')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重置 M10' }))
    expect(screen.getByRole('heading', { name: '课程 AI 助教配置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /02绑定知识库/ }))
    expect(screen.getByRole('heading', { name: '只绑定本人 M09 当前有效知识库' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '未发现当前 M09 通过证据' })).not.toBeInTheDocument()
    expect(screen.getByText(/已绑定当前教师 M09 真实通过证据/)).toBeInTheDocument()
  })
})

describe('第三天主应用 G03 初验入口', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('证据未齐时也能直接进入阶段验收并保存一次未通过初验', async () => {
    seedG03WithoutPrerequisites()
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /07阶段验收/ }))
    expect(screen.getByRole('heading', { name: 'G03 四条件验收' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '提交初验' }))
    expect(screen.getByText('1 次提交')).toBeInTheDocument()
    expect(screen.getByText(/未通过 · 0\/4 项/)).toBeInTheDocument()
  })
})
