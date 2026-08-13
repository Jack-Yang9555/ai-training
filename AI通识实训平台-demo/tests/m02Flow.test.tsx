import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { m02ComplianceReference, m02ModelIds, m02ModelResults, m02RatingReference, m02RealModelNames } from '../src/m02/data'
import { createInitialM02Progress } from '../src/m02/storage'
import type { M02Progress } from '../src/m02/types'
import { M02PeerReviewPage, M02RatingPage, M02Workbench } from '../src/pages/M02Pages'
import { createInitialPortalProgress } from '../src/training/storage'

function successfulRun(progress: M02Progress) {
  progress.run = {
    runId: 'm02-same-batch', status: 'succeeded', startedAt: '2026-08-12T00:00:00.000Z', completedAt: '2026-08-12T00:00:01.000Z',
    results: Object.fromEntries(m02ModelIds.map((id) => [id, m02ModelResults[id]])),
  }
  return progress
}

function submittedBlindReview(progress: M02Progress) {
  successfulRun(progress)
  progress.compliance = structuredClone(m02ComplianceReference)
  progress.ratings = Object.fromEntries(m02ModelIds.map((modelId) => [modelId, Object.fromEntries(Object.entries(m02RatingReference[modelId]).map(([dimension, score]) => [dimension, { score, paragraphId: `${modelId}-intro`, reason: '引用具体输出内容说明本项评分判断依据。' }]))]))
  progress.blindReviewSubmitted = true
  progress.revealedModelNames = { ...m02RealModelNames }
  return progress
}

describe('M02 工作台关键交互', () => {
  const ratingPageCallbacks = {
    onUpdate: vi.fn(), onSubmit: vi.fn(), onSelectModel: vi.fn(),
    onUpdateDecision: vi.fn(), onUpdateCorrection: vi.fn(), onNext: vi.fn(),
  }

  it('呈现锁定输入和两个匿名结果面板，不出现超纲入口', () => {
    const progress = successfulRun(createInitialM02Progress())
    render(<M02Workbench progress={progress} running={false} onRun={vi.fn()} onNext={vi.fn()} />)

    expect(screen.getByRole('region', { name: '多模型调试与预览工作台' })).toBeInTheDocument()
    expect(screen.getByText('模型 A')).toBeInTheDocument()
    expect(screen.getByText('模型 B')).toBeInTheDocument()
    expect(screen.queryByText('模型 C')).not.toBeInTheDocument()
    expect(screen.queryByText('变量')).not.toBeInTheDocument()
    expect(screen.queryByText('知识库')).not.toBeInTheDocument()
    expect(screen.queryByText('智谱清言 GLM-4')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /进入任务遵循检查/ })).toBeEnabled()
  })

  it('任一分支失败时禁止进入评价，并支持整批重新运行', async () => {
    const user = userEvent.setup()
    const onRun = vi.fn()
    const progress = createInitialM02Progress()
    progress.run = {
      runId: 'm02-partial-batch', status: 'failed', startedAt: '2026-08-12T00:00:00.000Z', completedAt: '2026-08-12T00:00:01.000Z',
      results: { A: m02ModelResults.A, B: { ...m02ModelResults.B, status: 'failed', error: '模拟失败' } },
    }
    render(<M02Workbench progress={progress} running={false} onRun={onRun} onNext={vi.fn()} />)

    expect(screen.getByRole('button', { name: /进入任务遵循检查/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /重新运行 2 个模型/ }))
    expect(onRun).toHaveBeenCalledOnce()
  })

  it('盲评提交前隐藏名称，提交后揭晓并锁定评分控件', () => {
    const progress = successfulRun(createInitialM02Progress())
    const { rerender } = render(<M02RatingPage progress={progress} {...ratingPageCallbacks} />)
    expect(screen.getByText('匿名模型 · 名称未揭晓')).toBeInTheDocument()
    expect(screen.queryByText('智谱清言 GLM-4')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '匿名模型输出与盲评作答' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '匿名模型输出对比' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '模型 A 完整输出' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: '模型 B 完整输出' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: '模型 C 完整输出' })).not.toBeInTheDocument()
    expect(screen.getByText(/请解释 CLIP 模型的文本—图像对比学习机制/)).toBeInTheDocument()
    expect(screen.getAllByRole('radio', { name: /引用模型 A/ })).toHaveLength(10)
    expect(screen.queryAllByRole('radio', { name: /引用模型 B/ })).toHaveLength(0)
    expect(screen.getByRole('button', { name: /保存并进入下一项/ })).toBeDisabled()
    expect(screen.getAllByRole('radio', { name: /分/ })).toHaveLength(5)
    expect(screen.getByRole('radio', { name: /1 分.*明显不符合.*不能直接使用/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /5 分.*完全符合.*直接使用/ })).toBeInTheDocument()
    expect(screen.getByText('两个模型均完整展示，但只有当前被评模型的段落可选，已选段落会高亮。')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '10 项盲评进度' })).toBeInTheDocument()

    const submitted = submittedBlindReview(createInitialM02Progress())
    rerender(<M02RatingPage progress={submitted} {...ratingPageCallbacks} />)
    expect(screen.getAllByText('智谱清言 GLM-4').length).toBeGreaterThanOrEqual(2)
    expect(document.querySelectorAll('.m02-labeled-rating-scale [role="radio"]')).toHaveLength(0)
    expect(screen.getByText('阶段 1 已完成并锁定')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '选择与修正' })).toBeInTheDocument()
  })

  it('选择修正和小组共评只呈现当前任务所需字段及模拟成果边界', () => {
    const progress = submittedBlindReview(createInitialM02Progress())
    progress.selectedModelId = 'A'
    const { unmount } = render(<M02RatingPage progress={progress} {...ratingPageCallbacks} />)
    expect(screen.getByText('勾选两条已有盲评证据')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByText('另一个模型已自动关联')).toBeInTheDocument()
    expect(screen.queryByText('无需再次选择评分维度、输出段落或重复填写两条理由。')).not.toBeInTheDocument()
    expect(screen.getByText('修正所选结果中的一处内容')).toBeInTheDocument()
    unmount()

    render(<M02PeerReviewPage progress={progress} directory={createInitialPortalProgress().participantDirectory} onUpdateReview={vi.fn()} onUpdateConclusion={vi.fn()} onSubmit={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByText('无多人后端的模拟组员成果')).toBeInTheDocument()
    expect(screen.getByText('小组模型对比结论')).toBeInTheDocument()
    expect(screen.getByText(/仅对 M02 有效/)).toBeInTheDocument()
  })

  it('选择与修正只在盲评提交后同页开放，并在选择模型后开放关联字段', () => {
    const blocked = successfulRun(createInitialM02Progress())
    const { rerender } = render(<M02RatingPage progress={blocked} {...ratingPageCallbacks} />)
    expect(screen.queryByRole('region', { name: '选择与修正' })).not.toBeInTheDocument()

    const ready = submittedBlindReview(createInitialM02Progress())
    rerender(<M02RatingPage progress={ready} {...ratingPageCallbacks} />)
    expect(screen.getByRole('region', { name: '选择与修正' })).toBeInTheDocument()
    expect(screen.getByText('先选择模型，再复用它的盲评证据')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /模型 A.*点击选择/ })).toBeEnabled()
    expect(screen.getAllByRole('combobox').every((field) => field.hasAttribute('disabled'))).toBe(true)

    ready.selectedModelId = 'A'
    rerender(<M02RatingPage progress={ready} {...ratingPageCallbacks} />)
    expect(screen.getByText('已选择模型 A')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox').every((field) => !field.hasAttribute('disabled'))).toBe(true)
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    const compareChoices = document.querySelector('.m02-compare-choices')
    expect(compareChoices).not.toBeNull()
    expect(within(compareChoices as HTMLElement).getByText('当前对比对象')).toBeInTheDocument()
    expect(within(compareChoices as HTMLElement).queryAllByRole('radio')).toHaveLength(0)
  })
})
