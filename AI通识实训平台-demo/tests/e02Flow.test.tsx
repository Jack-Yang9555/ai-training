import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialE02Progress } from '../src/e02/data'
import type { E02Progress, E02Route } from '../src/e02/domain'
import {
  applyE02ReferenceCorrections,
  eligibleE02Reviewers,
  LocalE02DraftRunner,
  simulateE02PeerReview,
} from '../src/e02/runner'
import { createE02Assessment } from '../src/e02/scoring'
import { createConfirmedE02Package } from '../src/e02/storage'
import { E02WorkspacePage } from '../src/pages/E02Pages'
import { createInitialPortalProgress } from '../src/training/storage'

const routes: E02Route[] = ['overview', 'source', 'draft', 'safety-rubric', 'peer-review', 'teacher-revision', 'confirmation', 'result']

function Harness({ initialProgress = createInitialE02Progress() }: { initialProgress?: E02Progress }) {
  const directory = createInitialPortalProgress().participantDirectory
  const [progress, setProgress] = useState(initialProgress)
  const participantId = directory.currentParticipantId
  return (
    <E02WorkspacePage
      progress={progress}
      participantId={participantId}
      directory={directory}
      onUpdate={(updater) => setProgress((current) => updater(current))}
      onNavigate={(route) => setProgress((current) => ({ ...current, route }))}
      onNext={() => setProgress((current) => ({ ...current, route: routes[Math.min(routes.indexOf(current.route) + 1, routes.length - 1)] }))}
      onReset={vi.fn()}
    />
  )
}

function completedProgress() {
  const directory = createInitialPortalProgress().participantDirectory
  let progress = createInitialE02Progress()
  progress.aiDraft = new LocalE02DraftRunner().run(progress, directory.currentParticipantId)
  const reviewer = eligibleE02Reviewers(directory)[0]
  progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.peerReview = { ...simulateE02PeerReview(progress, directory), submitted: true, submittedAt: '2026-08-25T01:00:00.000Z' }
  progress = applyE02ReferenceCorrections(progress, directory.currentParticipantId)
  progress.teacherConfirmation = {
    specificationReviewedConfirmed: true,
    authorizationAndPrivacyConfirmed: true,
    finalArtifactsConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE02Package(progress, directory)
  progress.assessments.push(createE02Assessment(progress, directory))
  progress.route = 'result'
  return progress
}

describe('E02 八步工作台', () => {
  it('从说明页进入规范页并生成稳定暴露三类问题的 95 分初稿', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByRole('heading', { name: '把一项实训任务拆成可操作、可核验、可评分的闭环' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '登记任务与规范' }))
    expect(screen.getByRole('heading', { name: '先锁定职业任务、适用设备和规范边界' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '生成任务书初稿' }))
    expect(screen.getByRole('heading', { name: '生成一份可追溯、但故意不完美的 AI 初稿' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '运行并生成初稿' }))

    expect(screen.getByText(/初稿稳定暴露 3 类可区分问题/)).toBeInTheDocument()
    expect(screen.getByText(/S02 \/ S03 操作错序/)).toBeInTheDocument()
    expect(screen.getByText(/SAFE-02 只有泛化提醒/)).toBeInTheDocument()
    expect(screen.getByText(/评分量规合计 95 分/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '核对安全与量规' })).toBeEnabled()
  })

  it('完成态清楚展示五维硬门槛和恰好三项成果', () => {
    render(<Harness initialProgress={completedProgress()} />)

    expect(screen.getByRole('heading', { name: 'E02 当前验收已通过' })).toBeInTheDocument()
    expect(screen.getByText('三项硬门槛通过')).toBeInTheDocument()
    expect(screen.getAllByText('硬门槛')).toHaveLength(3)
    expect(screen.getByText('实训任务书')).toBeInTheDocument()
    expect(screen.getByText('安全检查单')).toBeInTheDocument()
    expect(screen.getByText('100 分评分量规')).toBeInTheDocument()
    expect(screen.getByText('三项成果 · 一个选修槽位')).toBeInTheDocument()
  })
})
