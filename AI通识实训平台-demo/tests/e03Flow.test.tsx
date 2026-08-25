import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialE03Progress } from '../src/e03/data'
import type { E03Progress, E03Route } from '../src/e03/domain'
import {
  applyE03FindingCorrections,
  applyE03ReferenceRevision,
  createE03MeasureDraft,
  eligibleE03Reviewers,
  LocalE03FindingRunner,
  simulateE03PeerReview,
} from '../src/e03/runner'
import { createE03Assessment } from '../src/e03/scoring'
import { createConfirmedE03Package } from '../src/e03/storage'
import { E03WorkspacePage } from '../src/pages/E03Pages'
import { createInitialPortalProgress } from '../src/training/storage'

const routes: E03Route[] = ['overview', 'source', 'findings', 'measures', 'peer-review', 'revision', 'confirmation', 'result']

function Harness({ initialProgress = createInitialE03Progress() }: { initialProgress?: E03Progress }) {
  const directory = createInitialPortalProgress().participantDirectory
  const [progress, setProgress] = useState(initialProgress)
  const participantId = directory.currentParticipantId
  return (
    <E03WorkspacePage
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
  let progress = createInitialE03Progress()
  progress.aiDraft = new LocalE03FindingRunner().run(progress, directory.currentParticipantId)
  progress = applyE03FindingCorrections(progress, directory.currentParticipantId)
  progress.workingFindings.forEach((item) => { item.teacherReviewed = true })
  progress = createE03MeasureDraft(progress, directory.currentParticipantId)
  const reviewer = eligibleE03Reviewers(directory)[0]
  progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.peerReview = { ...simulateE03PeerReview(progress, directory), submitted: true, submittedAt: '2026-08-25T01:00:00.000Z' }
  progress = applyE03ReferenceRevision(progress, directory.currentParticipantId)
  progress.workingMeasures?.measures.forEach((item) => { item.teacherReviewed = true })
  progress.teacherConfirmation = {
    sourceBoundaryConfirmed: true,
    findingsReviewedConfirmed: true,
    noRealIdentityConfirmed: true,
    noFixedLabelsConfirmed: true,
    finalArtifactsConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE03Package(progress, directory)
  progress.assessments.push(createE03Assessment(progress, directory))
  progress.route = 'result'
  return progress
}

describe('E03 八步工作台', () => {
  it('从任务说明进入来源页并生成稳定暴露事实标签缺陷的三条初稿', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByRole('heading', { name: '让课堂反思从印象判断回到证据与下一次行动' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '查看匿名课堂记录' }))
    expect(screen.getByRole('heading', { name: '先锁定课堂记录、目标、活动与评价结果' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '生成三条课堂发现' }))
    expect(screen.getByRole('heading', { name: '生成恰好三条发现，再逐条分开事实与解释' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '运行并生成三条初稿' }))

    expect(screen.getByText('稳定暴露 1 类事实边界缺陷')).toBeInTheDocument()
    expect(screen.getAllByText(/态度消极、理解能力偏弱/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: '纠正 F02 并形成教师工作稿' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /打开 REC-02/ }))
    expect(screen.getByRole('heading', { name: '先锁定课堂记录、目标、活动与评价结果' })).toBeInTheDocument()
  })

  it('完成态清楚展示五维硬门槛和恰好两项成果', () => {
    render(<Harness initialProgress={completedProgress()} />)

    expect(screen.getByRole('heading', { name: 'E03 当前验收已通过' })).toBeInTheDocument()
    expect(screen.getByText('三项硬门槛通过')).toBeInTheDocument()
    expect(screen.getAllByText('硬门槛')).toHaveLength(3)
    expect(screen.getByText('教学反思或评课记录')).toBeInTheDocument()
    expect(screen.getByText('下一次课改进清单')).toBeInTheDocument()
    expect(screen.getByText('两项成果 · 一个选修槽位')).toBeInTheDocument()
  })
})
