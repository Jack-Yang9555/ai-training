import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createInitialE05Progress } from '../src/e05/data'
import type { E05Progress, E05Route } from '../src/e05/domain'
import {
  applyE05ReferenceRevision,
  createE05WebPage,
  eligibleE05Reviewers,
  LocalE05MappingRunner,
  runE05OfflineTest,
  simulateE05PeerReview,
} from '../src/e05/runner'
import { createE05Assessment } from '../src/e05/scoring'
import { createConfirmedE05Package } from '../src/e05/storage'
import { E05WorkspacePage } from '../src/pages/E05Pages'
import { createInitialPortalProgress } from '../src/training/storage'

const routes: E05Route[] = ['overview', 'source', 'mapping', 'suggestions', 'peer-review', 'revision', 'confirmation', 'result']

function Harness({ initialProgress = createInitialE05Progress() }: { initialProgress?: E05Progress }) {
  const directory = createInitialPortalProgress().participantDirectory
  const [progress, setProgress] = useState(initialProgress)
  return <E05WorkspacePage
    progress={progress}
    participantId={directory.currentParticipantId}
    directory={directory}
    onUpdate={(updater) => setProgress((current) => updater(current))}
    onNavigate={(route) => setProgress((current) => ({ ...current, route }))}
    onNext={() => setProgress((current) => ({ ...current, route: routes[Math.min(routes.indexOf(current.route) + 1, routes.length - 1)] }))}
    onReset={vi.fn()}
  />
}

function completedProgress() {
  const directory = createInitialPortalProgress().participantDirectory
  let progress = createInitialE05Progress()
  Object.assign(progress, new LocalE05MappingRunner().run(progress, directory.currentParticipantId))
  progress.aiSuggestionDraft = new LocalE05MappingRunner().suggest(progress, directory.currentParticipantId)
  progress.webPage = createE05WebPage(progress, directory.currentParticipantId)
  progress = runE05OfflineTest(progress)
  const reviewer = eligibleE05Reviewers(directory)[0]
  progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.peerReview = { ...simulateE05PeerReview(progress, directory), submitted: true, submittedAt: '2026-08-25T07:00:00.000Z' }
  progress = applyE05ReferenceRevision(progress, directory.currentParticipantId)
  progress.webPage = createE05WebPage(progress, directory.currentParticipantId)
  progress = runE05OfflineTest(progress)
  progress.teacherConfirmation = {
    sourceAndEvidenceConfirmed: true,
    mappingAndSuggestionsConfirmed: true,
    offlineArtifactConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE05Package(progress, directory)
  progress.assessments.push(createE05Assessment(progress, directory))
  progress.route = 'result'
  return progress
}

describe('E05 八步工作台', () => {
  it('可从说明页进入来源页，生成映射并点击查看双侧依据', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('heading', { name: '用 60 分钟把课程目标与岗位任务做成可点击的离线映射网页' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '登记两侧来源' }))
    await user.click(screen.getByRole('button', { name: /提取岗位任务并建立映射/ }))
    await user.click(screen.getByRole('button', { name: /运行本地任务提取与映射/ }))
    expect(screen.getByText(/6 项岗位任务与 12 条不重复/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /MAP-12.*覆盖不足/ }))
    expect(screen.getByText(/MAP-12 · 守住材料与权利边界/)).toBeInTheDocument()
    expect(screen.getAllByText(/CEV-04/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/JEV-06/).length).toBeGreaterThan(0)
  })

  it('完成态展示五维硬门槛、离线网页和恰好两项成果', () => {
    render(<Harness initialProgress={completedProgress()} />)
    expect(screen.getByRole('heading', { name: 'E05 当前验收已通过' })).toBeInTheDocument()
    expect(screen.getByText('三项硬门槛通过')).toBeInTheDocument()
    expect(screen.getAllByText('硬门槛')).toHaveLength(3)
    expect(screen.getByText('课程—岗位能力映射网页')).toBeInTheDocument()
    expect(screen.getByText('差距与改进建议清单')).toBeInTheDocument()
    expect(screen.getByText('两项成果 · 一个选修槽位')).toBeInTheDocument()
  })
})
