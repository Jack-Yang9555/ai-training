import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  History,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { e01AnswerIds, e01ExpectedFinalScoreMatrix } from '../e01/data'
import type {
  E01AnswerId,
  E01CorrectionDraft,
  E01Progress,
  E01Route,
  E01RubricDimension,
  E01TeacherConfirmation,
  E01TeacherReview,
} from '../e01/domain'
import {
  applyE01Correction,
  createE01TeacherReviews,
  invalidateE01DerivedWork,
  LocalE01GradingRunner,
  simulateE01PeerReview,
} from '../e01/runner'
import { calculateE01Score, createE01Assessment } from '../e01/scoring'
import { createConfirmedE01Package } from '../e01/storage'
import {
  confirmedE01PackageIsCurrent,
  latestE01AssessmentIsCurrent,
  routeForE01CoreRequirement,
  validateE01AiReview,
  validateE01AssessmentSubmission,
  validateE01Confirmation,
  validateE01Input,
  validateE01PeerReview,
  validateE01Rubric,
  validateE01TeacherReview,
} from '../e01/validation'
import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

const gradingRunner = new LocalE01GradingRunner()
const groupRoles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']

interface E01WorkspacePageProps {
  progress: E01Progress
  participantId: string
  directory: ParticipantDirectory
  onUpdate: (updater: (current: E01Progress) => E01Progress) => void
  onNavigate: (route: E01Route) => void
  onNext: () => void
  onReset: () => void
}

function inputLabel(route: E01Route) {
  if (route === 'input') return '步骤 2 / 7 · 样例与目标'
  if (route === 'rubric') return '步骤 3 / 7 · 四维量规'
  if (route === 'ai-review') return '步骤 4 / 7 · 五份试评'
  if (route === 'teacher-review') return '步骤 5 / 7 · 逐份复核与复测'
  if (route === 'peer-confirm') return '步骤 6 / 7 · 同组复核与确认'
  return '步骤 7 / 7 · 评分与成果'
}

function TextField({ label, value, onChange, rows = 3, readOnly = false, hint }: {
  label: string
  value: string
  onChange?: (value: string) => void
  rows?: number
  readOnly?: boolean
  hint?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  )
}

function AnswerTabs({ active, progress, onChange }: { active: E01AnswerId; progress: E01Progress; onChange: (id: E01AnswerId) => void }) {
  return (
    <div className="e01-answer-tabs" role="tablist" aria-label="A01 至 A05 匿名作答">
      {e01AnswerIds.map((answerId) => {
        const teacherReview = progress.teacherReviews.find((item) => item.answerId === answerId)
        return (
          <button
            className={active === answerId ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={active === answerId}
            aria-controls={`e01-answer-${answerId}`}
            key={answerId}
            onClick={() => onChange(answerId)}
          >
            <strong>{answerId}</strong>
            <span>{teacherReview?.status ?? '固定样例'}</span>
            {teacherReview?.reviewed && <CheckCircle2 size={15} />}
          </button>
        )
      })}
    </div>
  )
}

function answerReadyCount(progress: E01Progress, source: 'ai' | 'final') {
  return e01AnswerIds.filter((answerId) => {
    const review = source === 'ai'
      ? progress.aiReviews.find((item) => item.answerId === answerId)
      : progress.teacherReviews.find((item) => item.answerId === answerId)
    if (!review) return false
    const scores = 'dimensionScores' in review ? review.dimensionScores : review.finalDimensionScores
    return scores.every((item) => item.score === e01ExpectedFinalScoreMatrix[answerId][item.dimensionId])
  }).length
}

function updatedScenario(current: E01Progress, field: keyof E01Progress['scenario'], value: string | boolean): E01Progress {
  const invalidated = invalidateE01DerivedWork(current, '课程目标或评分输入已变更')
  const scenario = { ...invalidated.scenario, [field]: value }
  const learningObjective = field === 'learningObjective' ? String(value) : scenario.learningObjective
  return {
    ...invalidated,
    scenario,
    rubric: {
      ...invalidated.rubric,
      teacherConfirmed: false,
      dimensions: invalidated.rubric.dimensions.map((item) => ({ ...item, linkedObjective: learningObjective })),
    },
  }
}

function updatedDimension(current: E01Progress, dimensionId: E01RubricDimension['dimensionId'], patch: Partial<E01RubricDimension>): E01Progress {
  const invalidated = invalidateE01DerivedWork(current, '四维量规内容已变更')
  return {
    ...invalidated,
    rubric: {
      ...invalidated.rubric,
      teacherConfirmed: false,
      dimensions: invalidated.rubric.dimensions.map((item) => item.dimensionId === dimensionId ? { ...item, ...patch } : item),
    },
  }
}

function confirmReview(review: E01TeacherReview): E01TeacherReview {
  return { ...review, reviewed: true, reviewedAt: new Date().toISOString(), status: '确认' }
}

function currentParticipant(directory: ParticipantDirectory, participantId: string) {
  return directory.participants.find((item) => item.participantId === participantId)
}

function sameGroupReviewers(directory: ParticipantDirectory, participantId: string) {
  const current = currentParticipant(directory, participantId)
  return directory.participants.filter((item) => item.groupId === current?.groupId && item.participantId !== participantId)
}

function requirementRoute(id: string) {
  return routeForE01CoreRequirement(id)
}

export function E01WorkspacePage({ progress, participantId, directory, onUpdate, onNavigate, onNext, onReset }: E01WorkspacePageProps) {
  const [activeAnswerId, setActiveAnswerId] = useState<E01AnswerId>('A01')
  const score = useMemo(() => calculateE01Score(progress, directory), [progress, directory])

  if (progress.route === 'overview') {
    return (
      <>
        <PageHeader
          eyebrow="步骤 1 / 7 · 任务说明"
          title="用同一把量规，完成有证据的人工批改"
          description="对 A01—A05 五份固定虚构匿名作答进行四维试评，保留 AI 原始判断，由教师逐份复核、关联修正并承担最终评价责任。"
          aside={<div className="duration-card"><Scale size={20} /><span><strong>60 分钟</strong><small>个人主作 · 小组复核</small></span></div>}
        />
        <section className="e01-overview-grid">
          <article className="content-card"><span>01</span><div><strong>固定证据</strong><p>A01—A05 原文与 1.0 版本只读，不出现姓名、学号或班级。</p></div></article>
          <article className="content-card"><span>02</span><div><strong>同版量规</strong><p>恰好 4 个维度，5 份试评全部绑定同一量规版本。</p></div></article>
          <article className="content-card"><span>03</span><div><strong>4 / 5 → 5 / 5</strong><p>A04 稳定暴露证据评分和建议问题，修正后同题复测。</p></div></article>
          <article className="content-card"><span>04</span><div><strong>教师最终责任</strong><p>组员意见是复核证据，AI 与模拟反馈都不代替教师评价。</p></div></article>
        </section>
        <section className="content-card e01-contract-card">
          <div><BookOpenCheck size={22} /><span><strong>成果恰好 2 类</strong><small>不按 5 份作答拆成 5 类成果</small></span></div>
          <div className="e01-contract-artifacts"><span>评分量规</span><span>5 份批改结果与个性化反馈</span></div>
        </section>
        <div className="page-actions"><span>通关需总分 ≥ 8，专业证据、人工迭代和安全均必须为 2 分</span><button className="primary-button" type="button" onClick={onNext}>核对样例与目标<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'input') {
    const validation = validateE01Input(progress)
    const activeAnswer = progress.answers.find((item) => item.answerId === activeAnswerId) ?? progress.answers[0]
    return (
      <>
        <PageHeader eyebrow={inputLabel(progress.route)} title="先锁定课程目标和五份匿名作答" description="课程输入可编辑；A01—A05 是平台固定的虚构匿名样例，原文与版本不可修改。" aside={<div className="metric-pill"><ShieldCheck size={19} /><span><strong>5 / 5</strong><small>虚构匿名样例</small></span></div>} />
        <section className="content-card e01-input-card">
          <div className="form-grid">
            <label className="field"><span>课程名称</span><input value={progress.scenario.courseName} onChange={(event) => onUpdate((current) => updatedScenario(current, 'courseName', event.target.value))} /></label>
            <label className="field"><span>样例来源</span><input value={progress.scenario.sampleSource} readOnly /></label>
          </div>
          <TextField label="当前学习目标" value={progress.scenario.learningObjective} onChange={(value) => onUpdate((current) => updatedScenario(current, 'learningObjective', value))} />
          <TextField label="评分要求" value={progress.scenario.gradingRequirement} onChange={(value) => onUpdate((current) => updatedScenario(current, 'gradingRequirement', value))} />
          <TextField label="作业题目" value={progress.scenario.assignmentPrompt} onChange={(value) => onUpdate((current) => updatedScenario(current, 'assignmentPrompt', value))} />
          <label className="e01-confirm-row"><input type="checkbox" checked={progress.scenario.anonymousSamplesConfirmed} onChange={(event) => onUpdate((current) => updatedScenario(current, 'anonymousSamplesConfirmed', event.target.checked))} /><span><strong>已确认只使用虚构匿名作答</strong><small>页面不录入真实姓名、学号、班级、联系方式或密钥。</small></span></label>
        </section>
        <section className="content-card e01-answer-browser">
          <div className="section-heading"><div><span className="eyebrow">READ-ONLY SAMPLE SET</span><h2>A01—A05 固定作答</h2></div><span>版本 1.0 · 只读</span></div>
          <AnswerTabs active={activeAnswerId} progress={progress} onChange={setActiveAnswerId} />
          {activeAnswer && <article className="e01-single-answer" role="tabpanel" id={`e01-answer-${activeAnswer.answerId}`}><header><span>{activeAnswer.answerId}</span><div><strong>虚构匿名作答</strong><small>v{activeAnswer.version} · fictional · anonymous</small></div></header><p>{activeAnswer.text}</p></article>}
        </section>
        <ValidationNotice messages={validation.messages} success="课程输入完整，A01—A05 五份固定匿名作答已锁定。" />
        <div className="page-actions"><span>目标或评分要求变化会保留旧验收历史，但当前通过失效</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>设计四维量规<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'rubric') {
    const validation = validateE01Rubric(progress)
    const ready = validation.valid && progress.rubric.teacherConfirmed
    return (
      <>
        <PageHeader eyebrow={inputLabel(progress.route)} title="建立恰好四维的同版评分量规" description="每一维都要对应当前学习目标，写清判定标准和作答证据要求；五份作答不得临时换规则。" aside={<div className="metric-pill"><Scale size={19} /><span><strong>{progress.rubric.version}</strong><small>4 维 · 每维 3 分</small></span></div>} />
        <div className="e01-rubric-grid">
          {progress.rubric.dimensions.map((dimension, index) => (
            <article className="content-card e01-rubric-card" key={dimension.dimensionId}>
              <header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{dimension.name}</strong><small>{dimension.dimensionId} · 满分 {dimension.maxScore}</small></div></header>
              <label className="field"><span>维度名称</span><input value={dimension.name} onChange={(event) => onUpdate((current) => updatedDimension(current, dimension.dimensionId, { name: event.target.value }))} /></label>
              <TextField label="对应学习目标" value={dimension.linkedObjective} onChange={(value) => onUpdate((current) => updatedDimension(current, dimension.dimensionId, { linkedObjective: value }))} rows={2} />
              <TextField label="判定标准" value={dimension.criteria} onChange={(value) => onUpdate((current) => updatedDimension(current, dimension.dimensionId, { criteria: value }))} />
              <TextField label="证据要求" value={dimension.evidenceRequirement} onChange={(value) => onUpdate((current) => updatedDimension(current, dimension.dimensionId, { evidenceRequirement: value }))} />
            </article>
          ))}
        </div>
        <section className="content-card e01-rubric-confirm">
          <label className="e01-confirm-row"><input type="checkbox" checked={progress.rubric.teacherConfirmed} disabled={!validation.valid} onChange={(event) => onUpdate((current) => ({ ...current, rubric: { ...current.rubric, version: event.target.checked && current.attemptHistory.length ? `R1.${current.attemptHistory.length}` : current.rubric.version, teacherConfirmed: event.target.checked }, confirmedPackage: undefined }))} /><span><strong>教师确认当前四维量规</strong><small>确认后，A01—A05 会共用完全相同的量规版本和指纹。</small></span></label>
        </section>
        <ValidationNotice messages={ready ? [] : [...validation.messages, ...(!progress.rubric.teacherConfirmed && validation.valid ? ['请由教师确认当前量规版本'] : [])]} success="四维量规已完整关联学习目标，并形成教师确认版。" />
        <div className="page-actions"><span>量规变化后必须重新运行全部 5 份，不允许为单份作答更换规则</span><button className="primary-button" type="button" disabled={!ready} onClick={onNext}>运行五份同版试评<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'ai-review') {
    const validation = validateE01AiReview(progress, participantId)
    const activeAnswer = progress.answers.find((item) => item.answerId === activeAnswerId)
    const activeReview = progress.aiReviews.find((item) => item.answerId === activeAnswerId)
    const consistency = answerReadyCount(progress, 'ai')
    return (
      <>
        <PageHeader eyebrow={inputLabel(progress.route)} title="用同一量规生成五份可追溯试评" description="本地确定性引擎会稳定产生 4 / 5 份正确基线；A04 保留一处证据评分与下一步建议问题，不用固定成功动画掩盖。" aside={<div className={`result-score ${consistency === 4 ? '' : 'passed'}`}><strong>{consistency}</strong><span>/ 5 份基线</span></div>} />
        <section className="content-card e01-run-panel">
          <div><Sparkles size={22} /><span><strong>本地确定性批改引擎</strong><small>不连接真实模型、多人后端或 API Key；结果由当前输入和量规指纹决定。</small></span></div>
          <button className="primary-button" type="button" onClick={() => onUpdate((current) => { const base = invalidateE01DerivedWork(current, '重新运行五份同版试评'); const aiReviews = gradingRunner.run(base, participantId); return { ...base, aiReviews, teacherReviews: createE01TeacherReviews(aiReviews) } })}>{progress.aiReviews.length ? '重新运行全部 5 份' : '运行五份确定性试评'}<ArrowRight size={16} /></button>
        </section>
        {progress.aiReviews.length > 0 && <section className="content-card e01-answer-browser">
          <div className="section-heading"><div><span className="eyebrow">SAME RUBRIC VERSION</span><h2>逐份查看 AI 原始试评</h2></div><span>{new Set(progress.aiReviews.map((item) => item.rubricVersion)).size} 个量规版本</span></div>
          <AnswerTabs active={activeAnswerId} progress={progress} onChange={setActiveAnswerId} />
          {activeReview && activeAnswer && <article className="e01-review-card" role="tabpanel" id={`e01-answer-${activeAnswerId}`}>
            <header><div><span className="status-pill framework">AI 原始 · 只读</span><h3>{activeAnswerId} 四维试评</h3></div><small>{activeReview.rubricVersion} · {activeReview.engineLabel}</small></header>
            <blockquote>{activeAnswer.text}</blockquote>
            <div className="e01-score-grid">{activeReview.dimensionScores.map((item) => <div key={item.dimensionId}><span>{progress.rubric.dimensions.find((dimension) => dimension.dimensionId === item.dimensionId)?.name}</span><strong>{item.score} / 3</strong><p>证据：“{item.evidenceExcerpt}”</p><small>{item.rationale}</small></div>)}</div>
            <div className="e01-feedback-grid"><article><span>做得好的地方</span><p>{activeReview.feedback.strength}</p></article><article><span>具体问题</span><p>{activeReview.feedback.issue}</p></article><article className={activeAnswerId === 'A04' ? 'needs-fix' : ''}><span>下一步建议</span><p>{activeReview.feedback.nextStep}</p></article></div>
            <p className="e01-fingerprint">reviewId: {activeReview.reviewId} · rubric: {activeReview.rubricFingerprint} · input: {activeReview.inputFingerprint}</p>
          </article>}
        </section>}
        {progress.aiReviews.length > 0 && consistency === 4 && <div className="e01-detected-issue"><AlertTriangle size={20} /><div><strong>稳定发现 1 份需人工修正</strong><p>A04 将无课程证据的绝对化结论评为“证据使用 3 分”，且下一步建议不可执行。</p></div><button type="button" onClick={() => setActiveAnswerId('A04')}>[定位 A04]</button></div>}
        <ValidationNotice messages={validation.messages} success="A01—A05 已用同一四维量规版本完成可追溯试评。" />
        <div className="page-actions"><span>4 / 5 是故意暴露的人工复核入口，不是系统错误</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>逐份人工复核<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'teacher-review') {
    const validation = validateE01TeacherReview(progress, participantId)
    const reviewedCount = progress.teacherReviews.filter((item) => item.reviewed).length
    const finalConsistency = answerReadyCount(progress, 'final')
    const activeAnswer = progress.answers.find((item) => item.answerId === activeAnswerId)
    const aiReview = progress.aiReviews.find((item) => item.answerId === activeAnswerId)
    const teacherReview = progress.teacherReviews.find((item) => item.answerId === activeAnswerId)
    const a04Corrected = progress.corrections.some((item) => item.answerId === 'A04' && item.dimensionId === 'evidence-use')
    const correctionReady = progress.correctionDraft.answerId === 'A04'
      && progress.correctionDraft.dimensionId === 'evidence-use'
      && progress.correctionDraft.beforeScore === 3
      && progress.correctionDraft.afterScore === 2
      && progress.correctionDraft.beforeNextStep.trim() !== progress.correctionDraft.afterNextStep.trim()
      && progress.correctionDraft.afterNextStep.trim().length >= 16
      && Boolean(progress.correctionDraft.reason.trim())
    function updateCorrection(patch: Partial<E01CorrectionDraft>) { onUpdate((current) => ({ ...current, correctionDraft: { ...current.correctionDraft, ...patch }, confirmedPackage: undefined })) }
    return (
      <>
        <PageHeader eyebrow={inputLabel(progress.route)} title="五份独立复核，修正 A04 后复测到 5 / 5" description="每份都要单独查看四维分数、作答证据和三段反馈；不用“全部确认”一个勾选替代五份复核。" aside={<div className={`result-score ${finalConsistency === 5 ? 'passed' : ''}`}><strong>{finalConsistency}</strong><span>/ 5 份复测</span></div>} />
        <section className="content-card e01-answer-browser">
          <div className="section-heading"><div><span className="eyebrow">INDIVIDUAL REVIEW</span><h2>人工复核进度</h2></div><span>{reviewedCount} / 5 已完成</span></div>
          <AnswerTabs active={activeAnswerId} progress={progress} onChange={setActiveAnswerId} />
          {teacherReview && aiReview && activeAnswer && <article className="e01-review-card" role="tabpanel" id={`e01-answer-${activeAnswerId}`}>
            <header><div><span className={`status-pill ${teacherReview.reviewed ? 'completed' : activeAnswerId === 'A04' ? 'blocked' : 'ready'}`}>{teacherReview.status}</span><h3>{activeAnswerId} 教师最终结果</h3></div><small>关联 {teacherReview.aiReviewId} · {teacherReview.rubricVersion}</small></header>
            <blockquote>{activeAnswer.text}</blockquote>
            <div className="e01-score-grid">{teacherReview.finalDimensionScores.map((item) => { const original = aiReview.dimensionScores.find((scoreItem) => scoreItem.dimensionId === item.dimensionId); return <div className={original?.score !== item.score ? 'changed' : ''} key={item.dimensionId}><span>{progress.rubric.dimensions.find((dimension) => dimension.dimensionId === item.dimensionId)?.name}</span><strong>{item.score} / 3</strong>{original?.score !== item.score && <em>AI 原评 {original?.score} → 教师 {item.score}</em>}<p>证据：“{item.evidenceExcerpt}”</p><small>{item.rationale}</small></div> })}</div>
            <div className="e01-feedback-grid"><article><span>做得好的地方</span><p>{teacherReview.finalFeedback.strength}</p></article><article><span>具体问题</span><p>{teacherReview.finalFeedback.issue}</p></article><article className={activeAnswerId === 'A04' && !a04Corrected ? 'needs-fix' : ''}><span>下一步建议</span><p>{teacherReview.finalFeedback.nextStep}</p></article></div>
            {activeAnswerId !== 'A04' && <button className="primary-button e01-single-confirm" type="button" disabled={teacherReview.reviewed} onClick={() => onUpdate((current) => ({ ...current, teacherReviews: current.teacherReviews.map((item) => item.answerId === activeAnswerId ? confirmReview(item) : item), confirmedPackage: undefined }))}><CheckCircle2 size={16} />{teacherReview.reviewed ? '本份已完成复核' : '确认本份复核'}</button>}
          </article>}
        </section>
        {activeAnswerId === 'A04' && !a04Corrected && <section className="content-card e01-correction-panel">
          <div className="section-heading"><div><span className="eyebrow">RELATED CORRECTION</span><h2>只修正已定位的 A04 · 证据使用</h2></div><span>3 分 → 2 分</span></div>
          <div className="e01-correction-link"><span>A04</span><ArrowRight size={17} /><span>证据使用</span><ArrowRight size={17} /><span>作答原句“我认为形容词越多效果一定越好”</span></div>
          <div className="form-grid e01-score-change">
            <label className="field"><span>AI 原分数（只读）</span><input value={`${progress.correctionDraft.beforeScore} / 3`} readOnly /></label>
            <label className="field"><span>教师修正分数</span><select value={progress.correctionDraft.afterScore} onChange={(event) => updateCorrection({ afterScore: Number(event.target.value) as E01CorrectionDraft['afterScore'] })}>{[0, 1, 2, 3].map((value) => <option value={value} key={value}>{value} / 3</option>)}</select></label>
          </div>
          <TextField label="AI 原始下一步（只读）" value={progress.correctionDraft.beforeNextStep} readOnly />
          <TextField label="教师修改后的可执行下一步" value={progress.correctionDraft.afterNextStep} onChange={(value) => updateCorrection({ afterNextStep: value })} hint="必须是学生可直接执行、教师可观察的动作。" />
          <TextField label="修正理由" value={progress.correctionDraft.reason} onChange={(value) => updateCorrection({ reason: value })} />
          <button className="primary-button" type="button" disabled={!correctionReady} onClick={() => onUpdate((current) => applyE01Correction({ ...current, attemptHistory: current.attemptHistory }))}><Wrench size={16} />保存关联修正并复测 A04</button>
        </section>}
        {a04Corrected && <div className="e01-retest-success"><CheckCircle2 size={21} /><div><strong>A04 关联修正已保存，复测达到 5 / 5</strong><p>保留 AI 原始 3 分、教师修正 2 分、前后建议和修正理由。</p></div></div>}
        <ValidationNotice messages={validation.messages} success="A01—A05 已逐份复核，A04 关联修正后同题复测达到 5 / 5。" />
        <div className="page-actions"><span>请通过横向标签逐份确认；尚未复核的作答会持续阻断</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入同组复核<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'peer-confirm') {
    const validation = validateE01PeerReview(progress, directory)
    const confirmationValidation = validateE01Confirmation(progress, directory)
    const reviewers = sameGroupReviewers(directory, participantId)
    const selectedReviewer = reviewers.find((item) => item.participantId === progress.peerReview.reviewerId)
    const packageCurrent = confirmedE01PackageIsCurrent(progress, directory)
    function updatePeer(patch: Partial<E01Progress['peerReview']>) { onUpdate((current) => ({ ...current, peerReview: { ...current.peerReview, ...patch, submitted: false, submittedAt: undefined }, teacherConfirmation: { rubricAndObjectiveConfirmed: false, fiveFinalReviewsConfirmed: false, privacyConfirmed: false, aiNotFinalConfirmed: false, finalResponsibilityConfirmed: false }, confirmedPackage: undefined })) }
    function updateConfirmation(patch: Partial<E01TeacherConfirmation>) { onUpdate((current) => ({ ...current, teacherConfirmation: { ...current.teacherConfirmation, ...patch }, confirmedPackage: undefined })) }
    return (
      <>
        <PageHeader eyebrow={inputLabel(progress.route)} title="选择同组他人复核，由作者处理意见" description="复核只检查一份匿名批改结果的量规一致性、证据对应性和建议可执行性；当前 Demo 使用确定性模拟摘要。" />
        <div className="e01-simulation-note"><UsersRound size={20} /><div><strong>无多人后端的模拟复核边界</strong><p>{progress.peerReview.disclosure}</p></div></div>
        <section className="content-card e01-peer-card">
          <div className="form-grid">
            <label className="field"><span>当前同组其他成员</span><select value={progress.peerReview.reviewerId} onChange={(event) => updatePeer({ reviewerId: event.target.value, reviewerGroupId: '', recordId: '', rubricConsistency: undefined, evidenceAlignment: undefined, actionability: undefined, suggestion: '', authorTreatment: '', authorBasis: '' })}><option value="">请选择</option>{reviewers.map((item) => <option key={item.participantId} value={item.participantId}>{item.name}</option>)}</select><small>不显示本人或跨组成员。</small></label>
            <label className="field"><span>复核人角色</span><select value={progress.peerReview.reviewerRole ?? ''} onChange={(event) => updatePeer({ reviewerRole: event.target.value as GroupRole })}><option value="">请选择</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
            <label className="field"><span>被复核结果</span><select value={progress.peerReview.targetAnswerId} onChange={(event) => updatePeer({ targetAnswerId: event.target.value as E01AnswerId })}>{progress.teacherReviews.filter((item) => item.reviewed).map((item) => <option key={item.answerId}>{item.answerId}</option>)}</select></label>
            <label className="field"><span>当前小组</span><input value={currentParticipant(directory, participantId)?.groupName ?? '未分组'} readOnly /></label>
          </div>
          <button className="secondary-button" type="button" disabled={!selectedReviewer || !progress.peerReview.reviewerRole} onClick={() => onUpdate((current) => { const simulated = simulateE01PeerReview(current, directory); return { ...current, peerReview: { ...simulated, reviewerRole: current.peerReview.reviewerRole }, confirmedPackage: undefined } })}><Sparkles size={16} />生成并披露模拟组员复核</button>
          {progress.peerReview.recordId && <div className="e01-peer-result">
            <div><span>量规一致性</span><strong>{progress.peerReview.rubricConsistency}</strong></div>
            <div><span>证据对应性</span><strong>{progress.peerReview.evidenceAlignment}</strong></div>
            <div><span>建议可执行性</span><strong>{progress.peerReview.actionability}</strong></div>
            <p><strong>具体意见：</strong>{progress.peerReview.suggestion}</p>
          </div>}
          <div className="form-grid e01-peer-treatment">
            <label className="field"><span>作者处理方式</span><select value={progress.peerReview.authorTreatment} onChange={(event) => updatePeer({ authorTreatment: event.target.value as E01Progress['peerReview']['authorTreatment'] })}><option value="">请选择</option><option>已采纳并修正</option><option>不采纳并说明</option></select></label>
            <TextField label="处理依据" value={progress.peerReview.authorBasis} onChange={(value) => updatePeer({ authorBasis: value })} rows={2} />
          </div>
          <button className="primary-button" type="button" disabled={!progress.peerReview.recordId || !progress.peerReview.authorTreatment || !progress.peerReview.authorBasis.trim()} onClick={() => onUpdate((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true, submittedAt: new Date().toISOString() }, confirmedPackage: undefined }))}><FileCheck2 size={16} />提交同组复核与作者处理</button>
        </section>
        <ValidationNotice messages={validation.messages} success="同组其他成员的复核摘要、模拟披露和作者处理已完整保存。" />
        <section className="content-card e01-confirmation-card">
          <div className="section-heading"><div><span className="eyebrow">TEACHER RESPONSIBILITY</span><h2>五项教师最终确认</h2></div><span>{Object.values(progress.teacherConfirmation).filter(Boolean).length} / 5</span></div>
          <div className="confirmation-list">
            {([
              ['rubricAndObjectiveConfirmed', '当前四维量规与学习目标一致'],
              ['fiveFinalReviewsConfirmed', 'A01—A05 五份最终评分、证据和三段反馈已逐份核对'],
              ['privacyConfirmed', '全程仅使用平台固定虚构匿名作答'],
              ['aiNotFinalConfirmed', 'AI 试评不直接代替教师最终评价'],
              ['finalResponsibilityConfirmed', '教师对最终分数、反馈与发布承担责任'],
            ] as const).map(([field, label]) => <label key={field}><input type="checkbox" checked={progress.teacherConfirmation[field]} disabled={!validation.valid} onChange={(event) => updateConfirmation({ [field]: event.target.checked })} /><span><strong>{label}</strong></span></label>)}
          </div>
          <button className="primary-button" type="button" disabled={!confirmationValidation.valid} onClick={() => onUpdate((current) => ({ ...current, confirmedPackage: createConfirmedE01Package(current, directory) }))}><ShieldCheck size={16} />形成教师确认的两类成果</button>
        </section>
        <ValidationNotice messages={confirmationValidation.messages} success="五项教师责任已确认，两类固定成果可进入验收。" />
        <div className="page-actions"><span>内容、人员或复核记录变化后，历史保留，当前确认指纹失效</span><button className="primary-button" type="button" disabled={!packageCurrent} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div>
      </>
    )
  }

  const assessmentValidation = validateE01AssessmentSubmission(progress, directory)
  const passed = latestE01AssessmentIsCurrent(progress, directory)
  const packageCurrent = confirmedE01PackageIsCurrent(progress, directory)
  return (
    <>
      <PageHeader eyebrow={inputLabel('result')} title={passed ? 'E01 任务已通过' : 'E01 评分与两类成果'} description="总分不低于 8 分，四项核心要求全部通过，且专业证据、人工核验迭代、隐私伦理安全三项均须为 2 分。" aside={<div className={passed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>} />
      <section className={passed ? 'result-banner passed' : 'result-banner'}>{passed ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}<div><strong>{passed ? '当前验收通过，两类成果已归档' : packageCurrent ? '两类成果已确认，等待提交验收' : '当前内容与确认版仍有缺项'}</strong><p>4 / 5 确定性试评 → A04 关联修正 → 5 / 5 复测 → 同组复核 → 教师确认。</p></div><span>{score.coreRequirements.filter((item) => item.passed).length} / 4 核心要求</span></section>
      <div className="score-layout">
        <section className="content-card score-card"><div className="dimension-list">{score.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong>{['evidence', 'iteration', 'safety'].includes(dimension.id) && <em className="e01-hard-gate">硬门槛</em>}<p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section>
        <section className="content-card requirement-card"><div className="requirement-list">{score.coreRequirements.map((requirement) => <button className={requirement.passed ? 'passed' : ''} type="button" key={requirement.id} onClick={() => onNavigate(requirementRoute(requirement.id))}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section>
      </div>
      <section className="content-card artifact-section e01-artifact-section">
        <div className="section-heading"><div><span className="eyebrow">EXACTLY TWO OUTPUT TYPES</span><h2>任务成果恰好 2 类</h2></div><span>{passed ? '已同步归档' : '待当前验收'}</span></div>
        <div className="e01-artifact-grid">
          {(progress.confirmedPackage?.artifacts ?? [
            { artifactId: 'E01:pending:rubric', kind: 'e01-rubric' as const, name: '评分量规' as const },
            { artifactId: 'E01:pending:grading-feedback', kind: 'e01-grading-feedback' as const, name: '5 份批改结果与个性化反馈' as const },
          ]).map((artifact, index) => <article key={artifact.kind}><span>{index + 1}</span><div><strong>{artifact.name}</strong><p>{index === 0 ? `当前 ${progress.rubric.version}，恰好 4 个维度，全部关联同一学习目标。` : 'A01—A05 合并为 1 类批改成果，包含 AI 原始版、教师最终版与修正记录。'}</p><small>{artifact.artifactId}</small></div>{passed ? <CheckCircle2 size={21} /> : <FileCheck2 size={21} />}</article>)}
        </div>
        <p className="muted-copy">5 份作答是同一成果类中的稳定记录，不会在成果中心拆成 5 类；E01 作为当天选修仍只占 1 个个人成果槽位。</p>
      </section>
      <section className="content-card e01-assessment-card">
        <div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>验收历史</h2></div><span>{progress.assessments.length} 次</span></div>
        {progress.assessments.length > 0 && <div className="e01-history-list">{progress.assessments.map((assessment, index) => <article key={assessment.assessmentId}><span>{index === 0 ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '未通过'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN')}</small></article>)}</div>}
        {!passed && <button className="primary-button" type="button" disabled={!assessmentValidation.valid} onClick={() => onUpdate((current) => ({ ...current, assessments: [...current.assessments, createE01Assessment(current, directory, current.assessments.length ? '按当前量规、A04 关联修正和同组处理记录重新提交。' : '')] }))}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交验收'}</button>}
      </section>
      <ValidationNotice messages={assessmentValidation.messages} success="当前教师确认版与两类成果已具备验收条件。" />
      <div className="page-actions"><span>实质内容变化后，旧验收历史保留，当前通过会自动失效</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 E01</button></div>
      {progress.attemptHistory.length > 0 && <p className="e01-attempt-note"><History size={15} />已保留 {progress.attemptHistory.length} 条输入或量规变化前的试评快照。</p>}
    </>
  )
}

