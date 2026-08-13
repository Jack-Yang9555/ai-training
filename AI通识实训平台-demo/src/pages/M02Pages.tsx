import React, { useState } from 'react'
import {
  AlertTriangle, ArrowRight, BookOpenText, CheckCircle2, Clock3, Eye,
  FileCheck2, Gauge, LockKeyhole, Play, RefreshCw, RotateCcw, ShieldCheck,
  Sparkles, UsersRound,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { groupRoles } from '../data/trainingParticipants'
import {
  m02ComplianceDimensions, m02RatingDimensions, validateM02BlindReview,
  validateM02Compliance, validateM02Correction, validateM02GroupConclusion,
  validateM02PeerReview, validateM02Ratings, validateM02ReviewStage,
  validateM02Selection,
} from '../m02/validation'
import {
  m02ComplianceLabels, m02ComplianceOptions, m02CourseMaterial, m02LockedPrompt,
  m02ModelIds, m02RatingGuidance, m02RatingLabels, m02RatingScale,
} from '../m02/data'
import { buildM02PeerArtifacts } from '../m02/peerArtifacts'
import type {
  M02ComplianceDimension, M02ComplianceValue, M02CorrectionRecord, M02GroupConclusion,
  M02ModelId, M02PeerReview, M02Progress, M02RatingDimension, M02RatingEvidence,
  M02Route, M02ScoreResult, M02SelectionDecision,
} from '../m02/types'
import { currentParticipant } from '../training/participants'
import { trainingTasks } from '../training/catalog'
import type { ParticipantDirectory } from '../training/types'

const sourceParagraph = (progress: M02Progress, modelId: M02ModelId | undefined, paragraphId: string) => modelId ? progress.run?.results[modelId]?.paragraphs.find((item) => item.id === paragraphId) : undefined
const m02ArtifactIcons = [FileCheck2, Gauge, Sparkles, UsersRound]

export function M02Overview({ onNext }: { onNext: () => void }) {
  return <>
    <PageHeader eyebrow="步骤 1 / 6 · 任务说明" title="多模型教学结果对比与选择" description="在完全相同的课程材料和提示词条件下，对两个匿名模型进行有证据的盲评，形成按任务选模型的判断。" aside={<div className="duration-card"><Clock3 size={20} /><span><strong>45 分钟</strong><small>入门 · 必修</small></span></div>} />
    <section className="objective-grid">
      <article><Gauge size={22} /><span><strong>同条件比较</strong><p>课程材料、提示词和运行批次全部锁定，避免用不同输入比较模型。</p></span></article>
      <article><Eye size={22} /><span><strong>先盲评后揭晓</strong><p>评分前只显示模型 A/B，提交评价后才显示真实名称。</p></span></article>
      <article><UsersRound size={22} /><span><strong>个人评分与小组共评</strong><p>个人引用输出证据作出判断，再与同组成员的成果交叉比较。</p></span></article>
    </section>
    <section className="content-card flow-card"><div className="section-heading"><div><span className="eyebrow">任务流程</span><h2>六个连续步骤</h2></div></div><ol className="flow-list m02-flow-list">{[
      ['01', '任务说明', '确认规则与成果要求'], ['02', '同条件运行', '同时生成两个匿名模型结果'],
      ['03', '遵循检查', '完成 2 × 4 项约束判断'], ['04', '盲评与选择修正', '完成评分，揭晓后在同页选择并人工修改'],
      ['05', '小组共评', '交叉查看组员评分并形成结论'], ['06', '评分与成果', '检查 10 分制评分和四类成果'],
    ].map(([number, title, detail]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{detail}</p></div></li>)}</ol></section>
    <section className="content-card artifact-section"><div className="section-heading"><div><span className="eyebrow">成果契约</span><h2>完成后形成四项过程成果</h2></div><p>只进入任务过程成果，不重复计入十类个人最终成果。</p></div><div className="m02-artifact-grid">{trainingTasks.M02.outputs.map((name, index) => <article key={name}><FileCheck2 size={20} /><strong>{name}</strong><p>{['保存两个结果的 8 项任务约束判断。', '保存 10 项分值、段落引用和评分理由。', '保存所选模型、两条复用盲评证据、综合结论和一处修改前后记录。', '保存组员共评与本组共同选择结论。'][index]}</p></article>)}</div></section>
    <section className="pass-card"><div><CheckCircle2 size={22} /><span><strong>通过条件</strong><p>总分不低于 8 分，且盲评、模型选择、人工修正和小组共评四项核心要求全部通过。</p></span></div><button className="primary-button" type="button" onClick={onNext}>进入多模型运行台<ArrowRight size={17} /></button></section>
  </>
}

export function M02Workbench({ progress, running, onRun, onNext }: { progress: M02Progress; running: boolean; onRun: () => void; onNext: () => void }) {
  const runSucceeded = progress.run?.status === 'succeeded' && m02ModelIds.every((id) => progress.run?.results[id]?.status === 'succeeded')
  return <>
    <PageHeader eyebrow="步骤 2 / 6 · 同条件运行" title="多模型调试与预览" description="左侧输入条件已锁定，右侧两个匿名模型属于同一运行批次。当前使用确定性模拟运行，未来可替换为单个 Dify Workflow 两分支。" aside={runSucceeded ? <div className="metric-pill"><CheckCircle2 size={18} /><span><strong>同批次成功</strong><small>{progress.run?.runId}</small></span></div> : undefined} />
    <section className="m02-dify-workbench" aria-label="多模型调试与预览工作台">
      <aside className="m02-input-panel">
        <div className="m02-panel-title"><span><BookOpenText size={18} />锁定课程输入</span><em>只读</em></div>
        <div className="m02-material-summary"><span>{m02CourseMaterial.course}</span><strong>{m02CourseMaterial.lesson}</strong><dl><div><dt>对象</dt><dd>{m02CourseMaterial.audience}</dd></div><div><dt>目标</dt><dd>{m02CourseMaterial.objective}</dd></div><div><dt>材料范围</dt><dd>{m02CourseMaterial.scope}</dd></div></dl><p>{m02CourseMaterial.content}</p></div>
        <label className="m02-locked-prompt"><span>统一提示词 <LockKeyhole size={13} /></span><textarea readOnly rows={12} value={m02LockedPrompt} /></label>
        <button className="primary-button m02-run-button" type="button" disabled={running} onClick={onRun}>{running ? <><RefreshCw className="spin" size={17} />两个分支运行中…</> : <><Play size={17} />{progress.run ? '重新运行 2 个模型' : '同时运行 2 个模型'}</>}</button>
        <small>重新运行将创建新批次，并清除旧批次的检查、评分、选择、修正与共评。</small>
      </aside>
      <div className="m02-preview-panel">
        <div className="m02-preview-heading"><div><span className="eyebrow">DEBUG & PREVIEW</span><h2>调试与预览</h2></div><span>{running ? '2 个分支执行中' : runSucceeded ? '2 / 2 运行成功' : '等待运行'}</span></div>
        <div className="m02-model-columns">
          {m02ModelIds.map((modelId, index) => {
            const result = progress.run?.results[modelId]
            return <article className={`m02-model-output ${result?.status ?? (running ? 'running' : 'idle')}`} key={modelId}><header><span>#{index + 1}</span><strong>模型 {modelId}</strong><em>{running ? '运行中' : result?.status === 'succeeded' ? '成功' : result?.status === 'failed' ? '失败' : '待运行'}</em></header><div className="m02-model-body">{running ? <div className="m02-model-empty"><Sparkles size={22} /><strong>正在生成教学结果</strong><p>两个模型使用同一份输入</p></div> : result?.status === 'succeeded' ? result.paragraphs.map((item) => <section id={`m02-${item.id}`} key={item.id}><span>{item.label}</span><p>{item.content}</p></section>) : result?.status === 'failed' ? <div className="m02-model-empty failed"><AlertTriangle size={22} /><strong>分支运行失败</strong><p>{result.error}</p></div> : <div className="m02-model-empty"><Play size={22} /><strong>等待同时运行</strong><p>真实名称将在盲评提交后揭晓</p></div>}</div></article>
          })}
        </div>
      </div>
    </section>
    <div className="page-actions"><span>{runSucceeded ? <><CheckCircle2 size={16} />同一批次的两个模型结果已完整保存</> : '任一分支失败时不得进入评价'}</span><button className="primary-button" type="button" disabled={!runSucceeded || running} onClick={onNext}>进入任务遵循检查<ArrowRight size={17} /></button></div>
  </>
}

export function M02CompliancePage({ progress, onUpdate, onNext }: { progress: M02Progress; onUpdate: (modelId: M02ModelId, dimension: M02ComplianceDimension, value: M02ComplianceValue) => void; onNext: () => void }) {
  const validation = validateM02Compliance(progress)
  const completedCount = m02ModelIds.reduce((total, modelId) => total + Object.values(progress.compliance[modelId] ?? {}).filter(Boolean).length, 0)
  const locked = progress.blindReviewSubmitted
  return <>
    <PageHeader eyebrow="步骤 3 / 6 · 遵循检查" title="检查两个结果是否遵守任务约束" description={locked ? '盲评已经提交，本页判断已锁定；重新评价必须重置 M02。' : '分别判断题量、难度、格式和材料范围。判断对象是实际输出，不显示系统参照答案。'} />
    <div className="m02-evaluation-grid">{m02ModelIds.map((modelId) => <article className="content-card m02-evaluation-card" key={modelId}><header><span>模型 {modelId}</span><strong>{Object.values(progress.compliance[modelId] ?? {}).filter(Boolean).length} / 4</strong></header>{m02ComplianceDimensions.map((dimension) => <fieldset disabled={locked} key={dimension}><legend>{m02ComplianceLabels[dimension]}</legend><div className="m02-choice-row">{m02ComplianceOptions[dimension].map((option) => <label className={progress.compliance[modelId]?.[dimension] === option ? 'selected' : ''} key={option}><input type="radio" name={`${modelId}-${dimension}`} value={option} checked={progress.compliance[modelId]?.[dimension] === option} onChange={() => onUpdate(modelId, dimension, option)} />{option}</label>)}</div></fieldset>)}</article>)}</div>
    <ValidationNotice messages={validation.messages} success="8 项任务遵循检查已经完成。" />
    <div className="page-actions"><span>{completedCount} / 8 项检查已记录{locked ? ' · 已锁定' : ''}</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入五维盲评<ArrowRight size={17} /></button></div>
  </>
}

export function M02RatingPage({ progress, onUpdate, onSubmit, onSelectModel, onUpdateDecision, onUpdateCorrection, onNext }: { progress: M02Progress; onUpdate: (modelId: M02ModelId, dimension: M02RatingDimension, patch: Partial<M02RatingEvidence>) => void; onSubmit: () => void; onSelectModel: (id: M02ModelId) => void; onUpdateDecision: (patch: Partial<M02SelectionDecision>) => void; onUpdateCorrection: (patch: Partial<M02CorrectionRecord>) => void; onNext: () => void }) {
  const validation = validateM02Ratings(progress)
  const locked = progress.blindReviewSubmitted
  const ratingTasks = m02ModelIds.flatMap((modelId) => m02RatingDimensions.map((dimension) => ({ modelId, dimension })))
  const isComplete = ({ modelId, dimension }: typeof ratingTasks[number]) => {
    const rating = progress.ratings[modelId]?.[dimension]
    return Boolean(rating?.score && progress.run?.results[modelId]?.paragraphs.some((item) => item.id === rating.paragraphId) && rating.reason.trim().length >= 10)
  }
  const completedCount = ratingTasks.filter(isComplete).length
  const firstIncompleteIndex = ratingTasks.findIndex((task) => !isComplete(task))
  const [activeIndex, setActiveIndex] = useState(() => firstIncompleteIndex < 0 ? 0 : firstIncompleteIndex)
  const activeTask = ratingTasks[activeIndex]
  const activeRating = progress.ratings[activeTask.modelId]?.[activeTask.dimension] ?? { paragraphId: '', reason: '' }
  const activeComplete = isComplete(activeTask)
  const furthestOpenIndex = locked || firstIncompleteIndex < 0 ? ratingTasks.length - 1 : firstIncompleteIndex
  const activeParagraph = progress.run?.results[activeTask.modelId]?.paragraphs.find((item) => item.id === activeRating.paragraphId)
  return <>
    <PageHeader eyebrow="步骤 4 / 6 · 盲评与选择修正" title={locked ? '模型已揭晓，继续选择与修正' : '先逐项完成 10 项五维盲评'} description={locked ? '盲评分数已经锁定；请在当前页面继续选择适合本次任务的模型，并完成一处人工修正。如需重评，必须重置 M02。' : '本步骤分两阶段：先完成带证据盲评，提交并揭晓名称后，再在当前页完成选择与修正。'} aside={<div className="metric-pill"><Gauge size={18} /><span><strong>{completedCount} / 10 项</strong><small>{locked ? '阶段 1 已完成' : '阶段 1 · 逐项盲评'}</small></span></div>} />
    {locked && <div className="m02-reveal-strip">{m02ModelIds.map((id) => <span key={id}><strong>模型 {id}</strong>{progress.revealedModelNames[id]}</span>)}</div>}
    {!locked && <><nav className="m02-rating-progress" aria-label="10 项盲评进度">{m02ModelIds.map((modelId) => <div key={modelId}><strong>模型 {modelId}</strong><span>{m02RatingDimensions.map((dimension) => {
      const index = ratingTasks.findIndex((task) => task.modelId === modelId && task.dimension === dimension)
      const complete = isComplete(ratingTasks[index])
      return <button type="button" key={dimension} disabled={index > furthestOpenIndex} className={index === activeIndex ? 'active' : complete ? 'complete' : ''} aria-label={`第 ${index + 1} 项，模型 ${modelId} ${m02RatingLabels[dimension]}，${complete ? '已完成' : index === activeIndex ? '正在评价' : '待完成'}`} onClick={() => setActiveIndex(index)}>{complete ? <CheckCircle2 size={13} /> : index + 1}<small>{m02RatingLabels[dimension]}</small></button>
    })}</span></div>)}</nav>
    <section className="m02-blind-rating-workspace" aria-label="匿名模型输出与盲评作答">
      <section className="content-card m02-rating-output-panel" aria-label="匿名模型输出对比">
        <header className="m02-rating-compare-heading"><div><span className="eyebrow">匿名对比材料</span><h2>同时查看两个模型的完整输出</h2><p>模型名称仍保持隐藏。可随时对照 A、B 的内容，当前被评模型以蓝色标出。</p></div><span>当前评分：模型 {activeTask.modelId}</span></header>
        <div className="m02-rating-output-columns">{m02ModelIds.map((modelId, index) => {
          const result = progress.run?.results[modelId]
          const isActiveModel = modelId === activeTask.modelId
          const modelCompleted = m02RatingDimensions.filter((dimension) => isComplete({ modelId, dimension })).length
          return <article className={`m02-rating-output${isActiveModel ? ' active' : ''}`} aria-label={`模型 ${modelId} 完整输出`} key={modelId}>
            <header><span>#{index + 1}</span><div><strong>模型 {modelId}</strong><small>{progress.revealedModelNames[modelId] ?? '匿名模型'}</small></div><em>{isActiveModel ? '正在评价' : `${modelCompleted} / 5`}</em></header>
            <div className="m02-rating-output-body">{result?.status === 'succeeded' ? result.paragraphs.map((item) => isActiveModel ? <button type="button" role="radio" aria-checked={activeRating.paragraphId === item.id} aria-label={`引用模型 ${modelId} 的${item.label}作为依据`} disabled={locked} className={activeRating.paragraphId === item.id ? 'selected' : ''} key={item.id} onClick={() => onUpdate(modelId, activeTask.dimension, { paragraphId: item.id })}><span>{item.label}</span><p>{item.content}</p></button> : <section key={item.id}><span>{item.label}</span><p>{item.content}</p></section>) : <div className="m02-rating-output-empty"><AlertTriangle size={18} /><strong>暂无可评价输出</strong><p>请返回运行页完成同一批次的两个模型结果。</p></div>}</div>
          </article>
        })}</div>
      </section>
      <section className="content-card m02-guided-rating-card">
        <header><div><span className="eyebrow">第 {activeIndex + 1} / 10 项 · 模型 {activeTask.modelId}</span><h2>{m02RatingLabels[activeTask.dimension]}</h2><p>{m02RatingGuidance[activeTask.dimension]}</p></div><em>{progress.revealedModelNames[activeTask.modelId] ?? '匿名模型 · 名称未揭晓'}</em></header>
        <div className="m02-rating-step"><span>第 1 步</span><div><strong>对照左侧两份输出，选择最符合当前模型表现的一档</strong><p>五档含义固定，分数越高表示越符合当前评价标准。</p></div></div>
        <div className="m02-labeled-rating-scale" role="radiogroup" aria-label={`模型 ${activeTask.modelId} ${m02RatingLabels[activeTask.dimension]}评分`}>{m02RatingScale.map((item) => <button type="button" role="radio" aria-checked={activeRating.score === item.score} disabled={locked} className={activeRating.score === item.score ? 'selected' : ''} key={item.score} onClick={() => onUpdate(activeTask.modelId, activeTask.dimension, { score: item.score })}><strong>{item.score} 分</strong><span>{item.label}</span><small>{item.hint}</small></button>)}</div>
        <div className="m02-rating-step"><span>第 2 步</span><div><strong>在左侧当前模型中点击一段输出作为证据</strong><p>两个模型均完整展示，但只有当前被评模型的段落可选，已选段落会高亮。</p></div></div>
        <div className={activeParagraph ? 'm02-selected-evidence selected' : 'm02-selected-evidence'} aria-live="polite">{activeParagraph ? <><span>{activeParagraph.label}</span><p>{activeParagraph.content}</p></> : <><Eye size={18} /><div><strong>尚未选择证据</strong><p>请在左侧蓝色模型面板中点击一个段落。</p></div></>}</div>
        <div className="m02-rating-step"><span>第 3 步</span><div><strong>结合已选段落说明评分理由</strong><p>{activeParagraph ? `当前引用：${activeParagraph.label}` : '请先在左侧当前模型中选择一段输出证据。'}</p></div></div>
        <label className="field m02-guided-reason"><span>评分理由（不少于 10 字）</span><textarea disabled={locked} rows={5} value={activeRating.reason} onChange={(event) => onUpdate(activeTask.modelId, activeTask.dimension, { reason: event.target.value })} placeholder="指出该段中的具体表现，并说明为什么对应所选评分档位" /><small className={activeRating.reason.trim().length >= 10 ? 'complete' : ''}>{activeRating.reason.trim().length} / 10 字</small></label>
        <div className="m02-guided-actions"><button className="secondary-button" type="button" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}>上一项</button><span>{activeComplete ? <><CheckCircle2 size={16} />本项三步已完成</> : '完成三步后才能进入下一项'}</span>{activeIndex < ratingTasks.length - 1 ? <button className="primary-button" type="button" disabled={!activeComplete} onClick={() => setActiveIndex((index) => Math.min(ratingTasks.length - 1, index + 1))}>保存并进入下一项<ArrowRight size={16} /></button> : <strong className={validation.valid ? 'complete' : ''}>{validation.valid ? '10 项已全部完成' : '这是最后一项'}</strong>}</div>
      </section>
    </section>
    <ValidationNotice messages={validation.messages} success="10 项评分和输出证据已经完整填写，可以提交盲评。" />
    <div className="page-actions"><span>提交前不会显示真实模型名称</span><button className="secondary-button" type="button" disabled={!validation.valid} onClick={onSubmit}>提交盲评并揭晓</button></div></>}
    {locked && <div className="m02-locked-phase-summary"><CheckCircle2 size={20} /><div><strong>阶段 1 已完成并锁定</strong><p>10 项评分、引用段落和理由均已保存。下面直接复用这些证据完成模型选择与一处人工修正。</p></div></div>}
    {locked && validateM02BlindReview(progress).valid && <M02SelectionStage progress={progress} onSelectModel={onSelectModel} onUpdateDecision={onUpdateDecision} onUpdateCorrection={onUpdateCorrection} onNext={onNext} />}
  </>
}

function M02SelectionStage({ progress, onSelectModel, onUpdateDecision, onUpdateCorrection, onNext }: { progress: M02Progress; onSelectModel: (id: M02ModelId) => void; onUpdateDecision: (patch: Partial<M02SelectionDecision>) => void; onUpdateCorrection: (patch: Partial<M02CorrectionRecord>) => void; onNext: () => void }) {
  const selectionValidation = validateM02Selection(progress)
  const correctionValidation = validateM02Correction(progress)
  const selected = progress.selectedModelId
  const decision = progress.selectionDecision
  const original = sourceParagraph(progress, selected, progress.correction.paragraphId)
  const blindReviewReady = progress.blindReviewSubmitted && validateM02BlindReview(progress).valid
  const toggleEvidence = (dimension: M02RatingDimension) => {
    const current = decision.evidenceDimensions
    if (current.includes(dimension)) onUpdateDecision({ evidenceDimensions: current.filter((item) => item !== dimension) })
    else if (current.length < 2) onUpdateDecision({ evidenceDimensions: [...current, dimension] })
  }
  return <section className="m02-combined-selection" aria-label="选择与修正">
    <div className="m02-combined-stage-heading"><span>阶段 2</span><div><strong>选择与修正</strong><p>直接复用刚才的盲评证据，不重复评分或重写理由。</p></div></div>
    <section className="content-card m02-selection-stage"><div className="section-heading"><div><span className="eyebrow">阶段 2.1 · 选择结果</span><h2>点击一个适合本次教学任务的模型</h2><p>模型卡直接汇总已有盲评分数。切换模型会清空本阶段的决策与修正，避免证据错配。</p></div><span className={selected ? 'm02-step-state complete' : 'm02-step-state'}>{selected ? `已选择模型 ${selected}` : blindReviewReady ? '等待选择' : '尚未开放'}</span></div>
      <div className="m02-select-models" role="radiogroup" aria-label="选择最适合当前教学任务的模型">{m02ModelIds.map((id) => <button className={selected === id ? 'selected' : ''} type="button" role="radio" aria-checked={selected === id} aria-label={`模型 ${id}，${progress.revealedModelNames[id] ?? '名称尚未揭晓'}，${selected === id ? '已选择' : '点击选择'}`} disabled={!blindReviewReady} key={id} onClick={() => onSelectModel(id)}><span>模型 {id}</span><strong>{progress.revealedModelNames[id] ?? '提交盲评后揭晓'}</strong><small>五维合计 {m02RatingDimensions.reduce((sum, dimension) => sum + (progress.ratings[id]?.[dimension]?.score ?? 0), 0)} / 25 · 准确性 {progress.ratings[id]?.accuracy?.score ?? '—'} / 5</small><em>{selected === id ? '已选择' : blindReviewReady ? '点击选择' : '尚未开放'}</em>{selected === id && <CheckCircle2 size={20} />}</button>)}</div>
      {!selected && blindReviewReady && <div className="m02-selection-dependency"><ArrowRight size={17} /><span><strong>先选择模型，再复用它的盲评证据</strong><p>点击上方任意模型卡后，系统会直接带出该模型已经完成的五维评分、段落和理由。</p></span></div>}
    </section>
    <section className={`content-card m02-selection-section${selected && blindReviewReady ? '' : ' waiting'}`}><div className="section-heading"><div><span className="eyebrow">阶段 2.2 · 复用证据形成决策</span><h2>勾选两条已有盲评证据</h2><p>评分、引用段落和原理由盲评记录自动带入；这里只需选择最能支持最终决策的两条。</p></div><span className={decision.evidenceDimensions.length === 2 ? 'm02-step-state complete' : 'm02-step-state'}>{selected && blindReviewReady ? `已选 ${decision.evidenceDimensions.length} / 2 条` : '先完成模型选择'}</span></div>
      {selected && blindReviewReady ? <><div className="m02-reused-evidence-grid">{m02RatingDimensions.map((dimension) => {
        const rating = progress.ratings[selected]?.[dimension]
        const paragraph = sourceParagraph(progress, selected, rating?.paragraphId ?? '')
        const checked = decision.evidenceDimensions.includes(dimension)
        const unavailable = !checked && decision.evidenceDimensions.length >= 2
        return <button type="button" role="checkbox" aria-checked={checked} disabled={unavailable} className={checked ? 'selected' : ''} key={dimension} onClick={() => toggleEvidence(dimension)}><span>{m02RatingLabels[dimension]}<strong>{rating?.score ?? '—'} 分</strong></span><small>{paragraph?.label ?? '证据段落缺失'}</small><p>{rating?.reason ?? '盲评理由缺失'}</p><em>{checked ? <><CheckCircle2 size={14} />已复用</> : unavailable ? '已选满 2 条' : '点击复用'}</em></button>
      })}</div>
      <div className="m02-decision-summary"><div><span className="eyebrow">对比对象</span><strong>另一个模型已自动关联</strong><div className="m02-compare-choices">{m02ModelIds.filter((id) => id !== selected).map((id) => <article key={id}><span>模型 {id}</span><small>{progress.revealedModelNames[id]}</small><em>五维 {m02RatingDimensions.reduce((sum, dimension) => sum + (progress.ratings[id]?.[dimension]?.score ?? 0), 0)} / 25</em><strong>当前对比对象</strong></article>)}</div></div><label className="field"><span>综合选择结论（不少于 10 字）</span><textarea rows={4} value={decision.conclusion} onChange={(event) => onUpdateDecision({ conclusion: event.target.value })} placeholder={`结合已勾选证据，说明模型 ${selected} 为什么比对比模型更适合本次教学任务`} /><small>{decision.conclusion.trim().length} / 10 字</small></label></div></> : <div className="m02-selection-empty"><Eye size={20} /><strong>选择模型后自动带入五维盲评证据</strong><p>无需再次选择评分维度、输出段落或重复填写两条理由。</p></div>}
    </section>
    <section className={`content-card m02-selection-section${selected && blindReviewReady ? '' : ' waiting'}`}><div className="section-heading"><div><span className="eyebrow">阶段 2.3 · 人工核验</span><h2>修正所选结果中的一处内容</h2><p>修改后内容不少于 6 字且必须与原文不同；修改依据不少于 10 字。</p></div><span className="m02-step-state">{selected && blindReviewReady ? `修正模型 ${selected}` : '先完成模型选择'}</span></div><div className="form-grid"><label className="field"><span>模型 {selected ?? '—'} 的原始输出段落</span><select disabled={!selected || !blindReviewReady} value={progress.correction.paragraphId} onChange={(event) => onUpdateCorrection({ paragraphId: event.target.value, revisedContent: '', reason: '' })}><option value="">{selected && blindReviewReady ? '请选择需要修正的段落' : '请先选择上方模型'}</option>{selected && progress.run?.results[selected]?.paragraphs.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label className="field"><span>修改类型</span><select disabled={!selected || !blindReviewReady} value={progress.correction.type ?? ''} onChange={(event) => onUpdateCorrection({ type: event.target.value as M02CorrectionRecord['type'] })}><option value="">{selected && blindReviewReady ? '请选择修改类型' : '请先选择上方模型'}</option>{['答案错误','解析不清','题目超纲','表述不当','其他'].map((item) => <option key={item}>{item}</option>)}</select></label>{original && <div className="m02-original-quote"><span>原内容</span><p>{original.content}</p></div>}<label className="field full"><span>修改后内容（不少于 6 字，且与原文不同）</span><textarea disabled={!selected || !blindReviewReady} rows={3} value={progress.correction.revisedContent} onChange={(event) => onUpdateCorrection({ revisedContent: event.target.value })} placeholder={selected && blindReviewReady ? '填写修改后的完整内容' : '选择模型后填写'} /><small>{progress.correction.revisedContent.trim().length} / 6 字</small></label><label className="field full"><span>修改依据（不少于 10 字）</span><textarea disabled={!selected || !blindReviewReady} rows={2} value={progress.correction.reason} onChange={(event) => onUpdateCorrection({ reason: event.target.value })} placeholder={selected && blindReviewReady ? '说明为什么要改以及依据' : '选择模型后填写'} /><small>{progress.correction.reason.trim().length} / 10 字</small></label></div></section>
    <ValidationNotice messages={blindReviewReady ? [...selectionValidation.messages, ...correctionValidation.messages] : ['请先提交全部五维盲评，再进行模型选择与修正']} success="模型选择、盲评证据复用、综合结论和人工修改均已完整记录。" />
    <div className="page-actions"><span>不要把单次结果泛化为“某模型适合所有任务”</span><button className="primary-button" type="button" disabled={!selectionValidation.valid || !correctionValidation.valid} onClick={onNext}>进入小组共评<ArrowRight size={17} /></button></div>
  </section>
}

export function M02PeerReviewPage({ progress, directory, onUpdateReview, onUpdateConclusion, onSubmit, onNext }: { progress: M02Progress; directory: ParticipantDirectory; onUpdateReview: (patch: Partial<M02PeerReview>) => void; onUpdateConclusion: (patch: Partial<M02GroupConclusion>) => void; onSubmit: () => void; onNext: () => void }) {
  const identity = currentParticipant(directory)
  const artifacts = buildM02PeerArtifacts(directory)
  const selectedArtifact = artifacts.find((item) => item.participantId === progress.peerReview.targetParticipantId)
  const peerValidation = validateM02PeerReview(progress, directory)
  const conclusionValidation = validateM02GroupConclusion(progress)
  const stageValidation = validateM02ReviewStage(progress, directory)
  return <>
    <PageHeader eyebrow="步骤 5 / 6 · 小组共评" title="对比组员评分，形成按任务选模型的共识" description="被共评成员来自当前导入名单中的同组其他成员。组员评分成果为确定性模拟，正式多人系统应替换为真实提交。" aside={<div className="metric-pill"><UsersRound size={18} /><span><strong>{identity?.groupName ?? '未分组'}</strong><small>{artifacts.length} 份组员成果</small></span></div>} />
    <div className="review-source-note"><RefreshCw size={18} /><div><strong>无多人后端的模拟组员成果</strong><p>成果按人员 ID 稳定生成，始终绑定导入名单和同组过滤，不复用当前教师的个人评分表。</p></div></div>
    <section className="content-card review-form"><div className="section-heading"><div><span className="eyebrow">交叉共评</span><h2>选择成员与评分成果</h2></div><span className="identity-readonly">共评人：{identity?.name ?? '未选择'}</span></div><div className="form-grid three-columns"><label className="field"><span>本次承担角色</span><select value={progress.peerReview.reviewerRole ?? ''} onChange={(event) => onUpdateReview({ reviewerRole: event.target.value as M02PeerReview['reviewerRole'] })}><option value="">请选择角色</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select><small>仅对 M02 有效，不写入人员档案</small></label><label className="field"><span>被共评成员</span><select value={progress.peerReview.targetParticipantId} onChange={(event) => { const artifact = artifacts.find((item) => item.participantId === event.target.value); onUpdateReview({ targetParticipantId: event.target.value, targetArtifactId: artifact?.artifactId ?? '', submitted: false }) }}><option value="">请选择同组其他成员</option>{artifacts.map((item) => <option value={item.participantId} key={item.participantId}>{item.participantName}</option>)}</select></label><label className="field"><span>关联评分成果</span><select disabled={!selectedArtifact} value={progress.peerReview.targetArtifactId} onChange={(event) => onUpdateReview({ targetArtifactId: event.target.value, submitted: false })}><option value="">请选择成果</option>{selectedArtifact && <option value={selectedArtifact.artifactId}>个人多模型评分表 · v1</option>}</select></label></div>
      {selectedArtifact && <div className="m02-peer-artifact"><div><span>组员选择</span><strong>模型 {selectedArtifact.selectedModelId}</strong><p>{selectedArtifact.summary}</p></div><div>{m02RatingDimensions.map((dimension) => <span key={dimension}>{m02RatingLabels[dimension]} <strong>{selectedArtifact.scores[dimension]}</strong></span>)}</div></div>}
      <div className="form-grid review-fields"><label className="field"><span>评分是否与输出一致</span><select value={progress.peerReview.scoringConsistent} onChange={(event) => onUpdateReview({ scoringConsistent: event.target.value as M02PeerReview['scoringConsistent'], submitted: false })}><option value="">请选择</option><option>一致</option><option>部分一致</option><option>不一致</option></select></label><label className="field"><span>评分理由证据是否充分</span><select value={progress.peerReview.reasonEvidenceSufficient} onChange={(event) => onUpdateReview({ reasonEvidenceSufficient: event.target.value as M02PeerReview['reasonEvidenceSufficient'], submitted: false })}><option value="">请选择</option><option>充分</option><option>部分充分</option><option>不充分</option></select></label><label className="field"><span>模型选择是否合理</span><select value={progress.peerReview.modelChoiceReasonable} onChange={(event) => onUpdateReview({ modelChoiceReasonable: event.target.value as M02PeerReview['modelChoiceReasonable'], submitted: false })}><option value="">请选择</option><option>合理</option><option>部分合理</option><option>不合理</option></select></label><label className="field"><span>评分差异最大的维度</span><select value={progress.peerReview.scoreDifference ?? ''} onChange={(event) => onUpdateReview({ scoreDifference: event.target.value as M02PeerReview['scoreDifference'], submitted: false })}><option value="">请选择</option>{m02RatingDimensions.map((item) => <option value={item} key={item}>{m02RatingLabels[item]}</option>)}<option value="none">无差异</option></select></label><label className="field full"><span>差异原因分析</span><textarea rows={2} value={progress.peerReview.scoreDifferenceReason} onChange={(event) => onUpdateReview({ scoreDifferenceReason: event.target.value, submitted: false })} placeholder="选择无差异时可不填" /></label><label className="field full"><span>可执行的补充建议</span><textarea rows={2} value={progress.peerReview.suggestion} onChange={(event) => onUpdateReview({ suggestion: event.target.value, submitted: false })} /></label></div>
    </section>
    <section className="content-card m02-group-conclusion"><div className="section-heading"><div><span className="eyebrow">小组共同成果</span><h2>小组模型对比结论</h2></div></div><div className="form-grid"><label className="field"><span>本组选出的模型</span><select value={progress.groupConclusion.selectedModelId ?? ''} onChange={(event) => onUpdateConclusion({ selectedModelId: event.target.value as M02ModelId })}><option value="">请选择</option>{m02ModelIds.map((id) => <option key={id}>{id}</option>)}</select></label><label className="field"><span>评分差异最大的维度</span><select value={progress.groupConclusion.largestDifferenceDimension ?? ''} onChange={(event) => onUpdateConclusion({ largestDifferenceDimension: event.target.value as M02RatingDimension })}><option value="">请选择</option>{m02RatingDimensions.map((item) => <option value={item} key={item}>{m02RatingLabels[item]}</option>)}</select></label><label className="field full"><span>本组选择理由</span><textarea rows={2} value={progress.groupConclusion.selectionReason} onChange={(event) => onUpdateConclusion({ selectionReason: event.target.value })} /></label><label className="field full"><span>评分差异说明</span><textarea rows={2} value={progress.groupConclusion.differenceExplanation} onChange={(event) => onUpdateConclusion({ differenceExplanation: event.target.value })} /></label><label className="field full"><span>人工修改共识</span><textarea rows={2} value={progress.groupConclusion.correctionConsensus} onChange={(event) => onUpdateConclusion({ correctionConsensus: event.target.value })} /></label></div></section>
    <ValidationNotice messages={[...peerValidation.messages, ...conclusionValidation.messages]} success={progress.peerReview.submitted ? '组员共评和四项小组结论已经提交。' : '共评与小组结论完整，可以提交。'} />
    <div className="page-actions"><span>{progress.peerReview.submitted ? <><CheckCircle2 size={16} />小组共评已提交</> : '分组变化后不合法的共评对象会自动失效'}</span><div className="inline-actions"><button className="secondary-button" type="button" disabled={!peerValidation.valid || !conclusionValidation.valid} onClick={onSubmit}>{progress.peerReview.submitted ? '重新提交' : '提交共评'}</button><button className="primary-button" type="button" disabled={!stageValidation.valid} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div></div>
  </>
}

export function M02ResultPage({ progress, result, directory, onNavigate, onReset }: { progress: M02Progress; result: M02ScoreResult; directory: ParticipantDirectory; onNavigate: (route: M02Route) => void; onReset: () => void }) {
  const artifact = buildM02PeerArtifacts(directory).find((item) => item.artifactId === progress.peerReview.targetArtifactId)
  return <>
    <PageHeader eyebrow="步骤 6 / 6 · 评分与成果" title={result.passed ? 'M02 任务已通过' : 'M02 任务结果检查'} description={result.passed ? '同条件运行、盲评、人工修正与小组共评已形成完整证据链。' : '系统依据保存的运行、评价、修改和共评记录实时计算结果。'} aside={<div className={result.passed ? 'result-score passed' : 'result-score'}><strong>{result.total}</strong><span>/ 10 分</span></div>} />
    <section className={result.passed ? 'result-banner passed' : 'result-banner'}>{result.passed ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}<div><strong>{result.passed ? '任务通过：按具体教学任务和输出证据选择模型' : '尚未达到通过条件'}</strong><p>通过条件：总分不低于 8 分，且四项核心步骤全部完成。</p></div><span>{result.coreRequirements.filter((item) => item.passed).length} / 4 项核心要求</span></section>
    <div className="score-layout"><section className="content-card score-card"><div className="section-heading"><div><span className="eyebrow">过程质量评分</span><h2>五项标准</h2></div></div><div className="dimension-list">{result.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong><p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section><section className="content-card requirement-card"><div className="section-heading"><div><span className="eyebrow">通关门槛</span><h2>核心步骤</h2></div></div><div className="requirement-list">{result.coreRequirements.map((requirement) => <button type="button" key={requirement.id} className={requirement.passed ? 'passed' : ''} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section></div>
    <section className="content-card artifact-section"><div className="section-heading"><div><span className="eyebrow">任务成果</span><h2>四项结构化成果</h2></div></div><div className="m02-artifact-grid">{trainingTasks.M02.outputs.map((name, index) => <article key={name}>{React.createElement(m02ArtifactIcons[index], { size: 20 })}<strong>{name}</strong><p>{[`2 个模型 × 4 项约束，完整保存 8 项判断。`, `10 项分值、输出段落引用和评分理由。`, `选择模型 ${progress.selectedModelId ?? '—'}，复用两条盲评证据，并保留综合结论与修改记录。`, `共评对象：${artifact?.participantName ?? '—'}；本组选择模型 ${progress.groupConclusion.selectedModelId ?? '—'}。`][index]}</p></article>)}</div></section>
    <section className="m02-reveal-summary"><strong>盲评后的模型揭晓</strong>{m02ModelIds.map((id) => <span key={id}>模型 {id} · {progress.revealedModelNames[id]}</span>)}</section>
    <div className="page-actions"><span>通过后四项过程成果自动同步到成果中心</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 M02 并重新盲评</button></div>
  </>
}

