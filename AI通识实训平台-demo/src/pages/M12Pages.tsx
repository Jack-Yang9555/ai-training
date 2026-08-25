import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Eye,
  FileCheck2,
  FolderOpen,
  Link2,
  LockKeyhole,
  Play,
  RefreshCw,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
  TestTube2,
  UserCheck,
  UsersRound,
  Wrench,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import {
  createInitialM12Progress,
  createM12PreviewAssistantCards,
  createM12PreviewCorrection,
  createM12SuggestedFlow,
  m12SlotDefinitions,
  selectM12Mode,
} from '../m12/data'
import type {
  M12AssistantCard,
  M12CheckpointId,
  M12CorrectionEvidence,
  M12EvidenceSlot,
  M12FlowEntry,
  M12Mode,
  M12Progress,
  M12Route,
  M12Stage,
  M12TeacherConfirmation,
} from '../m12/domain'
import { runM12Checkpoint, startM12IntegrationRound } from '../m12/runner'
import { calculateM12Score, createM12Assessment } from '../m12/scoring'
import { createConfirmedM12Bundle } from '../m12/storage'
import {
  confirmedM12BundleIsCurrent,
  latestM12AssessmentIsCurrent,
  m12EvidenceFingerprint,
  m12PreviewIsComplete,
  routeForM12Requirement,
  validateM12Assistant,
  validateM12Correction,
  validateM12Evidence,
  validateM12Flow,
  validateM12Retest,
  validateM12SafetyShowcase,
  validateM12TeacherConfirmation,
} from '../m12/validation'
import { trainingTasks } from '../training/catalog'
import type { ParticipantDirectory, TrainingTaskId } from '../training/types'
import type { GroupRole } from '../types'

const roles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']
const stages: M12Stage[] = ['课前', '课中', '课后']

function TextField({ label, value, onChange, rows = 2, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <label className="field"><span>{label}</span><textarea rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
}

interface M12WorkspacePageProps {
  progress: M12Progress
  officialEvidence: M12EvidenceSlot[]
  participantId: string
  directory: ParticipantDirectory
  correctionOptions: M12CorrectionEvidence[]
  assistantOptions: M12AssistantCard[]
  onUpdate: (updater: (current: M12Progress) => M12Progress) => void
  onNavigate: (route: M12Route) => void
  onNext: () => void
  onOpenSource: (taskId: TrainingTaskId) => void
  onReset: () => void
}

function evidenceStatusLabel(slot: M12EvidenceSlot) {
  if (slot.status === 'current') return '当前有效'
  if (slot.status === 'preview') return '非计分预演'
  if (slot.status === 'invalid') return '来源已失效'
  return '成果缺失'
}

function normalizeStageOrder(flow: M12FlowEntry[]) {
  return stages.flatMap((stage) => flow.filter((item) => item.stage === stage).sort((a, b) => a.order - b.order).map((item, index) => ({ ...item, order: index + 1 })))
}

function moveEntry(flow: M12FlowEntry[], slotId: M12FlowEntry['slotId'], direction: -1 | 1) {
  const entry = flow.find((item) => item.slotId === slotId)
  if (!entry) return flow
  const lane = flow.filter((item) => item.stage === entry.stage).sort((a, b) => a.order - b.order)
  const index = lane.findIndex((item) => item.slotId === slotId)
  const target = lane[index + direction]
  if (!target) return flow
  return normalizeStageOrder(flow.map((item) => item.slotId === slotId ? { ...item, order: target.order } : item.slotId === target.slotId ? { ...item, order: entry.order } : item))
}

function changeEntryStage(flow: M12FlowEntry[], slotId: M12FlowEntry['slotId'], stage: M12Stage) {
  const maxOrder = Math.max(0, ...flow.filter((item) => item.stage === stage).map((item) => item.order))
  return normalizeStageOrder(flow.map((item) => item.slotId === slotId ? { ...item, stage, order: maxOrder + 1 } : item))
}

function modeNotice(mode: M12Mode) {
  return mode === 'preview'
    ? <div className="review-source-note m12-preview-note"><Sparkles size={18} /><div><strong>非计分仿真预演</strong><p>以下 10 项均为明确标记的本地样例，只用于练习编排、联调和教师接管；不会写入正式成绩、任务完成状态或成果中心。</p></div></div>
    : <div className="review-source-note"><ShieldCheck size={18} /><div><strong>正式成果模式</strong><p>只读取当前教师本人、当前有效且具有成果编号、版本和验收编号的 10 类成果；缺项不会被演示材料替代。</p></div></div>
}

export function M12WorkspacePage(props: M12WorkspacePageProps) {
  const { progress, officialEvidence, participantId, directory, correctionOptions, assistantOptions, onUpdate, onNavigate, onNext, onOpenSource, onReset } = props
  const [openedSlotId, setOpenedSlotId] = useState<M12EvidenceSlot['slotId']>()
  const score = useMemo(() => calculateM12Score(progress, participantId, directory), [progress, participantId, directory])

  if (progress.route === 'overview') {
    return <>
      <PageHeader eyebrow="步骤 1 / 8 · 任务说明" title="把分散成果编排成可演示的一节课" description="M12 只评价成果入口、教学流程、线上联调和人工修改，不重新评价 10 类单项作品的质量。" />
      <section className="content-card m12-journey-card"><div className="section-heading"><div><span className="eyebrow">60-MINUTE WORKFLOW</span><h2>一条真实的教学闭环</h2></div><span>个人组装 · 小组展示</span></div><div className="m09-journey-grid">{[['01','成果盘点'],['02','三阶段编排'],['03','错误修正'],['04','助教双场景'],['05','首轮联调'],['06','修改复测'],['07','安全展示'],['08','确认归档']].map(([number,label]) => <article key={number}><span>{number}</span><strong>{label}</strong></article>)}</div></section>
      <section className="m12-mode-grid">
        <article className="content-card"><ShieldCheck size={24} /><span className="eyebrow">OFFICIAL</span><h2>正式成果核对</h2><p>读取当前教师 10 类有效成果。缺一项即准确阻塞，不生成成绩或归档。</p><button className="primary-button" type="button" onClick={() => onUpdate((current) => selectM12Mode(current, 'official', participantId, officialEvidence))}>核对本人 10 类成果<ArrowRight size={17} /></button></article>
        <article className="content-card preview"><TestTube2 size={24} /><span className="eyebrow">NON-SCORING PREVIEW</span><h2>非计分仿真预演</h2><p>使用醒目标记的样例完整练习编排、3/4 首测、实质修改和 4/4 复测；既有正式记录保持不变。</p><button className="secondary-button" type="button" onClick={() => onUpdate((current) => selectM12Mode(current, 'preview', participantId, officialEvidence))}>进入完整仿真预演<ArrowRight size={17} /></button></article>
      </section>
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">PASS BOUNDARY</span><h2>正式通关不会被预演替代</h2></div></div><div className="m12-boundary-grid"><span><LockKeyhole size={18} /><strong>10 / 10 本人成果</strong><small>含 M10、M11 和两项不同选修</small></span><span><Route size={18} /><strong>课前—课中—课后</strong><small>每个入口唯一且可打开</small></span><span><Wrench size={18} /><strong>问题—修改—复测</strong><small>修改须与联调问题相关</small></span><span><ShieldCheck size={18} /><strong>三项硬门槛</strong><small>证据、人工迭代、安全均为 2 分</small></span></div></section>
    </>
  }

  if (progress.route === 'evidence') {
    const validation = validateM12Evidence(progress, participantId)
    const expectedStatus = progress.mode === 'official' ? 'current' : 'preview'
    const readyCount = progress.evidence.filter((item) => item.status === expectedStatus).length
    const opened = progress.evidence.find((item) => item.slotId === openedSlotId)
    return <>
      <PageHeader eyebrow="步骤 2 / 8 · 成果目录" title="先核对 10 类成果的身份、版本与验收状态" description="M01—M03 是过程成果，M12 也不新增第 11 类；本页只聚合三日方案规定的 10 个固定槽位。" aside={<div className="metric-pill"><FolderOpen size={18} /><span><strong>{readyCount} / 10</strong><small>{progress.mode === 'official' ? '本人当前有效' : '预演快照'}</small></span></div>} />
      {modeNotice(progress.mode)}
      {progress.mode === 'official' && <div className="m12-evidence-toolbar content-card"><div><span className="eyebrow">LIVE SNAPSHOT</span><h2>当前教师成果状态</h2><p>刷新会重新读取上游成果；来源版本变化将使旧确认失效，但历史验收仍保留。</p></div><button className="secondary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, evidence: officialEvidence }))}><RefreshCw size={16} />刷新当前状态</button></div>}
      <div className="m12-artifact-grid">{progress.evidence.map((slot, index) => <article className={`content-card ${slot.status}`} key={slot.slotId}><header><span>{String(index + 1).padStart(2, '0')}</span><em className={`status-pill ${slot.status === 'current' ? 'completed' : slot.status === 'preview' ? 'framework' : 'blocked'}`}>{evidenceStatusLabel(slot)}</em></header><h3>{slot.name}</h3><p>{slot.summary}</p><dl><div><dt>来源</dt><dd>{slot.sourceLabel}</dd></div><div><dt>成果编号</dt><dd>{slot.artifactId ?? '—'}</dd></div><div><dt>版本 / 验收</dt><dd>{slot.version && slot.assessmentId ? `${slot.version} · ${slot.assessmentId}` : '—'}</dd></div></dl>{slot.status === 'missing' || slot.status === 'invalid' ? <button className="secondary-button" type="button" disabled={!slot.sourceTaskId} onClick={() => slot.sourceTaskId && onOpenSource(slot.sourceTaskId)}>返回来源任务<ArrowRight size={15} /></button> : <button className="secondary-button" type="button" onClick={() => setOpenedSlotId(slot.slotId)}><Eye size={15} />打开只读快照</button>}</article>)}</div>
      {opened && <section className="content-card m12-source-preview"><div><BookOpenCheck size={21} /><span><strong>{opened.name}</strong><small>{opened.sourceLabel} · {opened.version} · {opened.assessmentId}</small></span></div><p>{opened.summary}</p><button className="text-button" type="button" onClick={() => setOpenedSlotId(undefined)}>关闭快照</button></section>}
      <ValidationNotice messages={validation.messages} success={progress.mode === 'official' ? '当前教师 10 类成果全部有效，可进入正式流程编排。' : '10 类预演快照已齐备；仅用于非计分操作练习。'} />
      <div className="page-actions"><span>{validation.valid ? '目录身份、版本和验收编号完整' : `还缺 ${10 - readyCount} 类当前有效成果`}</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入三阶段编排<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'orchestration') {
    const validation = validateM12Flow(progress, participantId)
    function updateEntry(slotId: M12FlowEntry['slotId'], patch: Partial<M12FlowEntry>) { onUpdate((current) => ({ ...current, flow: current.flow.map((item) => item.slotId === slotId ? { ...item, ...patch } : item) })) }
    return <>
      <PageHeader eyebrow="步骤 3 / 8 · 课前课中课后编排" title="让 10 个入口在同一节课中各司其职" description="每项成果只出现一次；三个阶段均须有入口，并逐项说明对象、环节、目标、教师动作和下一步衔接。" aside={<button className="primary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, flow: createM12SuggestedFlow(current.evidence) }))}><Sparkles size={16} />应用建议编排</button>} />
      {modeNotice(progress.mode)}
      {progress.flow.length === 0 ? <section className="content-card empty-state"><Route size={30} /><h2>尚未建立教学流程</h2><p>点击“应用建议编排”生成一份可编辑草稿；草稿会故意保留一个课中衔接缺口，用于后续真实联调。</p></section> : <div className="m12-stage-board">{stages.map((stage) => { const entries = progress.flow.filter((item) => item.stage === stage).sort((a, b) => a.order - b.order); return <section className="m12-stage-column" key={stage}><header><span>{stage}</span><strong>{entries.length} 个入口</strong></header>{entries.map((entry, index) => { const slot = progress.evidence.find((item) => item.slotId === entry.slotId); return <article className="m12-flow-entry" key={entry.entryId}><div className="m12-flow-entry-head"><span>{entry.order}</span><div><strong>{slot?.name}</strong><small>{slot?.sourceLabel}</small></div><div><button type="button" aria-label={`上移 ${slot?.name}`} disabled={index === 0} onClick={() => onUpdate((current) => ({ ...current, flow: moveEntry(current.flow, entry.slotId, -1) }))}><ChevronUp size={15} /></button><button type="button" aria-label={`下移 ${slot?.name}`} disabled={index === entries.length - 1} onClick={() => onUpdate((current) => ({ ...current, flow: moveEntry(current.flow, entry.slotId, 1) }))}><ChevronDown size={15} /></button></div></div><label className="field compact"><span>调整阶段</span><select value={entry.stage} onChange={(event) => onUpdate((current) => ({ ...current, flow: changeEntryStage(current.flow, entry.slotId, event.target.value as M12Stage) }))}>{stages.map((item) => <option key={item}>{item}</option>)}</select></label><details><summary>编辑使用说明</summary><TextField label="使用对象" value={entry.audience} onChange={(audience) => updateEntry(entry.slotId, { audience })} /><TextField label="教学环节" value={entry.teachingStep} onChange={(teachingStep) => updateEntry(entry.slotId, { teachingStep })} /><TextField label="对应目标" value={entry.objective} onChange={(objective) => updateEntry(entry.slotId, { objective })} /><TextField label="教师动作" value={entry.teacherAction} onChange={(teacherAction) => updateEntry(entry.slotId, { teacherAction })} /><TextField label="下一步衔接" value={entry.transition} onChange={(transition) => updateEntry(entry.slotId, { transition })} /></details></article>})}</section> })}</div>}
      <ValidationNotice messages={validation.messages} success="10 个入口唯一、三阶段完整，逐项使用说明已保存。" />
      <div className="page-actions"><span>阶段排序支持键盘可用的上移、下移和阶段选择</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>准备 AI 错误修正证据<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'correction') {
    const validation = validateM12Correction(progress)
    const options = progress.mode === 'preview' ? [createM12PreviewCorrection(participantId)] : correctionOptions
    return <>
      <PageHeader eyebrow="步骤 4 / 8 · AI 错误与教师修正" title="引用已有记录，不手填无法追溯的成功故事" description="选择一处 AI 错误，展示原内容、问题、教师修改后和依据；这里只说明可信使用，不重新给上游作品评分。" />
      {modeNotice(progress.mode)}
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">TRACEABLE OPTIONS</span><h2>可用修正记录</h2></div><span>{options.length} 条</span></div>{options.length ? <div className="m12-option-list">{options.map((option) => <button className="m12-option-card" type="button" key={option.correctionId} onClick={() => onUpdate((current) => ({ ...current, correction: { ...option, openedAt: undefined, confirmed: false } }))}><strong>{option.sourceTaskId} · {option.correctionId}</strong><span>{option.issue}</span><ArrowRight size={16} /></button>)}</div> : <div className="empty-state"><LockKeyhole size={28} /><h3>没有当前可追溯修正记录</h3><p>正式模式需先在上游任务中形成当前有效的人工修正。</p></div>}</section>
      {progress.correction && <section className="content-card"><div className="section-heading"><div><span className="eyebrow">SELECTED EVIDENCE</span><h2>{progress.correction.sourceTaskId} 修正记录</h2></div><span>{progress.correction.preview ? '预演记录' : '当前来源'}</span></div><div className="m09-correction-record"><strong>{progress.correction.issue}</strong><p>{progress.correction.aiOriginal}</p><span>→</span><p>{progress.correction.teacherCorrection}</p><small>依据：{progress.correction.basis}</small></div><div className="m12-proof-actions"><button className="secondary-button" type="button" onClick={() => onUpdate((current) => current.correction ? ({ ...current, correction: { ...current.correction, openedAt: new Date().toISOString() } }) : current)}><Eye size={16} />打开来源证据</button><label><input type="checkbox" checked={progress.correction.confirmed} disabled={!progress.correction.openedAt} onChange={(event) => onUpdate((current) => current.correction ? ({ ...current, correction: { ...current.correction, confirmed: event.target.checked } }) : current)} /><span>已核对原内容、修改后和依据</span></label></div>{progress.correction.openedAt && <p className="m09-correct-no-source">已打开本地只读来源快照：{progress.correction.sourceArtifactId}。Demo 不连接外部成果服务。</p>}</section>}
      <ValidationNotice messages={validation.messages} success="AI 错误与教师修正案例完整、可追溯且已人工确认。" />
      <div className="page-actions"><span>正式模式禁止使用预演案例替代本人上游记录</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>准备助教双场景<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'assistant') {
    const validation = validateM12Assistant(progress)
    const available = progress.mode === 'preview' ? createM12PreviewAssistantCards(participantId) : assistantOptions
    return <>
      <PageHeader eyebrow="步骤 5 / 8 · 助教双场景" title="同时演示有据回答与规范越界转交" description="有据回答必须打开来源；超范围回答不应出现伪造引用，并须明确教师接管动作。" aside={<button className="primary-button" type="button" disabled={available.length !== 2} onClick={() => onUpdate((current) => ({ ...current, assistantCards: available.map((item) => ({ ...item, openedAt: undefined, confirmed: false })) }))}><Sparkles size={16} />载入双场景证据</button>} />
      {modeNotice(progress.mode)}
      {available.length !== 2 && progress.assistantCards.length === 0 && <section className="content-card empty-state"><LockKeyhole size={30} /><h2>M10/M11 当前证据不可用</h2><p>正式模式不会用演示卡补齐；请先形成当前课程 AI 助教和答疑复测记录。</p><div className="m08-source-actions"><button className="secondary-button" type="button" onClick={() => onOpenSource('M10')}>返回 M10</button><button className="secondary-button" type="button" onClick={() => onOpenSource('M11')}>返回 M11</button></div></section>}
      <div className="m12-demo-pair">{progress.assistantCards.map((card) => <article className={`content-card ${card.kind}`} key={card.cardId}><header><span className={`status-pill ${card.kind === 'evidence' ? 'completed' : 'framework'}`}>{card.kind === 'evidence' ? '有来源回答' : '超范围转交'}</span><strong>{card.sourceTaskId}</strong></header><h3>{card.question}</h3><p>{card.answer}</p>{card.kind === 'evidence' ? <div className="m09-evidence"><summary><Link2 size={15} />{card.citationLabel}</summary><p>{card.citationExcerpt}</p></div> : <p className="m09-correct-no-source">正确边界：{card.boundaryExplanation} 因此没有课程来源引用。</p>}<div className="m12-takeover"><UserCheck size={16} /><span><strong>教师接管</strong>{card.teacherTakeover}</span></div><button className="secondary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, assistantCards: current.assistantCards.map((item) => item.cardId === card.cardId ? { ...item, openedAt: new Date().toISOString() } : item) }))}><Eye size={15} />{card.kind === 'evidence' ? '打开来源片段' : '打开越界记录'}</button><label className="m12-card-confirm"><input type="checkbox" checked={card.confirmed} disabled={!card.openedAt} onChange={(event) => onUpdate((current) => ({ ...current, assistantCards: current.assistantCards.map((item) => item.cardId === card.cardId ? { ...item, confirmed: event.target.checked } : item) }))} />已核对该演示卡</label></article>)}</div>
      <ValidationNotice messages={validation.messages} success="有据回答可回到来源；越界回答不伪造来源并已转交教师。" />
      <div className="page-actions"><span>两张卡只引用既有证据，不重复运行 M11 五类测试</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>开始连贯联调<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'integration') {
    const retestValidation = validateM12Retest(progress)
    const firstFinished = progress.firstRun.records.every((item) => item.result !== 'pending')
    const issue = progress.firstRun.records.find((item) => item.result === 'issue')
    const revisionReady = Boolean(progress.revision.savedAt)
    const retestFinished = progress.retest.records.every((item) => item.result === 'success')
    function runCheckpoint(round: 'first' | 'retest', checkpointId: M12CheckpointId) { onUpdate((current) => ({ ...current, [round === 'first' ? 'firstRun' : 'retest']: runM12Checkpoint(current, round, checkpointId) })) }
    return <>
      <PageHeader eyebrow="步骤 6 / 8 · 首轮联调、修改与复测" title="真实打开四个入口，让问题从当前流程状态中出现" description="首轮与复测使用相同四个检查点。无关措辞修改不会修复课中衔接问题。" />
      {modeNotice(progress.mode)}
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">FIRST RUN</span><h2>首轮连贯操作</h2></div><button className="secondary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, firstRun: startM12IntegrationRound('first'), revision: createInitialM12Progress().revision, retest: createInitialM12Progress().retest }))}><Play size={16} />开始首轮联调</button></div><div className="m12-integration-stepper">{progress.firstRun.records.map((record, index) => <article className={record.result} key={record.checkpointId}><span>{index + 1}</span><div><strong>{record.label}</strong><p>{record.note || '等待真实打开入口'}</p></div><button className="secondary-button" type="button" disabled={!progress.firstRun.startedAt} onClick={() => runCheckpoint('first', record.checkpointId)}><Eye size={14} />打开入口</button>{record.result === 'success' ? <CheckCircle2 size={19} /> : record.result === 'issue' ? <AlertTriangle size={19} /> : null}</article>)}</div>{firstFinished && <div className={`m09-round-compare ${issue ? '' : 'passed'}`}><article className={issue ? '' : 'passed'}><span>首轮联调</span><strong>{progress.firstRun.records.filter((item) => item.result === 'success').length} / 4</strong><small>{issue ? `发现：${issue.note}` : '未发现问题'}</small></article></div>}</section>
      {issue && <section className="content-card"><div className="section-heading"><div><span className="eyebrow">SUBSTANTIVE REVISION</span><h2>关联问题并保存实质修改</h2></div><button className="secondary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, revision: { issueCheckpointId: issue.checkpointId, type: '衔接方式', before: current.flow.find((item) => item.slotId === 'multimodal')?.transition ?? '', after: '完成微课后进入互动网页；连续两次答错由教师复核。', basis: '首轮联调显示微课结束后的下一入口和教师接管条件不明确。' } }))}><Sparkles size={15} />载入建议修改</button></div><div className="form-grid"><label className="field"><span>修改类型</span><select value={progress.revision.type} onChange={(event) => onUpdate((current) => ({ ...current, revision: { ...current.revision, type: event.target.value as M12Progress['revision']['type'] } }))}><option value="">请选择</option><option>入口</option><option>使用说明</option><option>衔接方式</option></select></label><label className="field"><span>关联问题</span><select value={progress.revision.issueCheckpointId} onChange={(event) => onUpdate((current) => ({ ...current, revision: { ...current.revision, issueCheckpointId: event.target.value as M12CheckpointId } }))}>{progress.firstRun.records.filter((item) => item.result === 'issue').map((item) => <option value={item.checkpointId} key={item.checkpointId}>{item.label}</option>)}</select></label></div><div className="form-grid"><TextField label="修改前" value={progress.revision.before} onChange={(before) => onUpdate((current) => ({ ...current, revision: { ...current.revision, before } }))} /><TextField label="修改后" value={progress.revision.after} onChange={(after) => onUpdate((current) => ({ ...current, revision: { ...current.revision, after } }))} /></div><TextField label="修改依据" value={progress.revision.basis} onChange={(basis) => onUpdate((current) => ({ ...current, revision: { ...current.revision, basis } }))} /><button className="primary-button" type="button" disabled={!progress.revision.type || !progress.revision.issueCheckpointId || !progress.revision.before.trim() || !progress.revision.after.trim() || progress.revision.before.trim() === progress.revision.after.trim() || !progress.revision.basis.trim()} onClick={() => onUpdate((current) => ({ ...current, flow: current.flow.map((item) => item.slotId === 'multimodal' ? { ...item, transition: current.revision.after } : item), revision: { ...current.revision, savedAt: new Date().toISOString() }, retest: createInitialM12Progress().retest }))}><Wrench size={16} />保存并应用到课中衔接</button></section>}
      {revisionReady && <section className="content-card"><div className="section-heading"><div><span className="eyebrow">SAME-PATH RETEST</span><h2>同路径复测</h2></div><button className="secondary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, retest: startM12IntegrationRound('retest') }))}><RefreshCw size={16} />开始同路径复测</button></div><div className="m12-integration-stepper">{progress.retest.records.map((record, index) => <article className={record.result} key={record.checkpointId}><span>{index + 1}</span><div><strong>{record.label}</strong><p>{record.note || '等待重新打开同一入口'}</p></div><button className="secondary-button" type="button" disabled={!progress.retest.startedAt} onClick={() => runCheckpoint('retest', record.checkpointId)}><Eye size={14} />重新打开</button>{record.result === 'success' && <CheckCircle2 size={19} />}</article>)}</div>{retestFinished && <div className="m09-round-compare"><article><span>首轮</span><strong>{progress.firstRun.records.filter((item) => item.result === 'success').length} / 4</strong><small>保留问题证据</small></article><ArrowRight size={22} /><article className="passed"><span>复测</span><strong>4 / 4</strong><small>同一路径全部成功</small></article></div>}</section>}
      <ValidationNotice messages={retestValidation.messages} success="首轮问题、实质修改和同路径 4 / 4 复测闭环完整。" />
      <div className="page-actions"><span>系统记录每次入口打开时间和真实判定结果</span><button className="primary-button" type="button" disabled={!retestValidation.valid} onClick={onNext}>进入安全复核与展示<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'safety') {
    const validation = validateM12SafetyShowcase(progress, directory, participantId)
    const confirmationValidation = validateM12TeacherConfirmation(progress, participantId, directory)
    const previewComplete = m12PreviewIsComplete(progress, participantId)
    const officialCurrent = confirmedM12BundleIsCurrent(progress, directory)
    const currentParticipant = directory.participants.find((item) => item.participantId === participantId)
    const groupReviewers = directory.participants.filter((item) => item.groupId === currentParticipant?.groupId && item.participantId !== participantId)
    const selectedReviewer = groupReviewers.find((item) => item.participantId === progress.showcase.reviewerParticipantId)
    function updateConfirmation(patch: Partial<M12TeacherConfirmation>) { onUpdate((current) => ({ ...current, teacherConfirmation: { ...current.teacherConfirmation, ...patch } })) }
    return <>
      <PageHeader eyebrow="步骤 7 / 8 · 安全、展示与教师确认" title="在发布前完成四项检查并说明教师最终责任" description="小组只复核综合流程衔接，不重复检查 10 个单项作品的全部字段。" />
      {modeNotice(progress.mode)}
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">DETERMINISTIC SAFETY SCAN</span><h2>四项发布前检查</h2></div><button className="secondary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, safety: { ...current.safety, scanRan: true, realPersonalInfoClear: true, unverifiedContentClear: true, unauthorizedMaterialClear: true, unsafeDecisionClear: true } }))}><ShieldCheck size={16} />运行本地检查</button></div><div className="m12-safety-grid">{[['realPersonalInfoClear','真实个人信息','仅使用 A01—A20 匿名虚拟数据'],['unverifiedContentClear','未经核验内容','入口均绑定验收编号与教师确认版本'],['unauthorizedMaterialClear','未授权材料','预演素材仅限本地训练；正式模式读取授权记录'],['unsafeDecisionClear','不安全自动决策','成绩、心理与资格决定均转交教师']] .map(([field,label,detail]) => { const passed = progress.safety[field as keyof M12Progress['safety']]; return <article className={passed ? 'passed' : ''} key={field}>{passed ? <CheckCircle2 size={19} /> : <XCircle size={19} />}<div><strong>{label}</strong><p>{detail}</p></div></article> })}</div><div className="confirmation-list compact"><label><input type="checkbox" checked={progress.safety.aiUseDisclosed} onChange={(event) => onUpdate((current) => ({ ...current, safety: { ...current.safety, aiUseDisclosed: event.target.checked } }))} /><span><strong>已向学生披露 AI 使用范围和可能错误</strong></span></label><label><input type="checkbox" checked={progress.safety.teacherResponsibilityConfirmed} onChange={(event) => onUpdate((current) => ({ ...current, safety: { ...current.safety, teacherResponsibilityConfirmed: event.target.checked } }))} /><span><strong>最终教学、评价和安全责任由教师承担</strong></span></label></div></section>
      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">GROUP SHOWCASE</span><h2>小组结业展示与流程反馈</h2></div><span>{progress.mode === 'preview' ? '无多人后端 · 确定性模拟' : '当前教师据实代录 · 非实时提交'}</span></div>
        <div className="form-grid">
          <label className="field"><span>本人展示角色</span><select value={progress.showcase.reviewerRole ?? ''} onChange={(event) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, reviewerRole: event.target.value as GroupRole, submittedAt: undefined } }))}><option value="">请选择</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label className="field"><span>纳入展示的成果入口</span><select value={progress.showcase.entrySlotId} onChange={(event) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, entrySlotId: event.target.value as M12Progress['showcase']['entrySlotId'], submittedAt: undefined } }))}><option value="">请选择</option>{progress.flow.map((item) => <option value={item.slotId} key={item.slotId}>{m12SlotDefinitions.find((slot) => slot.slotId === item.slotId)?.name}</option>)}</select></label>
        </div>
        <TextField label="本人展示内容或操作贡献" value={progress.showcase.contribution} onChange={(contribution) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, contribution, submittedAt: undefined } }))} />
        {progress.mode === 'official' && <>
          <div className="review-source-note"><UsersRound size={18} /><div><strong>现场反馈采用本地代录</strong><p>选择当前同组其他成员，并由当前教师据实录入现场反馈；页面不会把代录记录冒充为多人后端实时提交。</p></div></div>
          <label className="field"><span>现场反馈人</span><select value={progress.showcase.reviewerParticipantId ?? ''} onChange={(event) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, reviewerParticipantId: event.target.value, peerFeedbackSource: '', feedbackRecorderConfirmed: false, feedbackConfirmed: false, submittedAt: undefined } }))}><option value="">请选择同组其他成员</option>{groupReviewers.map((item) => <option value={item.participantId} key={item.participantId}>{item.name} · {item.groupName}</option>)}</select></label>
        </>}
        {progress.mode === 'preview' && <button className="secondary-button" type="button" onClick={() => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, reviewerParticipantId: undefined, peerFeedback: '流程覆盖课前、课中和课后；建议在微课结束后明确进入互动网页，并保留连续错误时的教师复核入口。', peerFeedbackSource: 'deterministic-preview', feedbackRecorderConfirmed: false, feedbackConfirmed: false, submittedAt: undefined } }))}><UsersRound size={16} />生成同组流程反馈（模拟）</button>}
        <TextField label="同组流程反馈" value={progress.showcase.peerFeedback} onChange={(peerFeedback) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, peerFeedback, peerFeedbackSource: current.mode === 'official' ? '' : current.showcase.peerFeedbackSource, feedbackRecorderConfirmed: current.mode === 'official' ? false : current.showcase.feedbackRecorderConfirmed, feedbackConfirmed: false, submittedAt: undefined } }))} />
        {progress.mode === 'official' && <>
          <label className="m12-card-confirm"><input type="checkbox" checked={progress.showcase.feedbackRecorderConfirmed} disabled={!progress.showcase.reviewerParticipantId || !progress.showcase.peerFeedback.trim()} onChange={(event) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, feedbackRecorderConfirmed: event.target.checked, peerFeedbackSource: '', feedbackConfirmed: false, submittedAt: undefined } }))} />我确认以上内容由当前教师根据现场反馈据实代录</label>
          <button className="secondary-button" type="button" disabled={!selectedReviewer || !progress.showcase.peerFeedback.trim() || !progress.showcase.feedbackRecorderConfirmed} onClick={() => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, peerFeedbackSource: 'group-record', feedbackConfirmed: false, submittedAt: undefined } }))}><FileCheck2 size={16} />登记现场反馈（本地代录）</button>
          {progress.showcase.peerFeedbackSource === 'group-record' && <p className="m09-correct-no-source">已登记：{selectedReviewer?.name} 的现场反馈；记录方式为当前教师本地代录。</p>}
        </>}
        <label className="m12-card-confirm"><input type="checkbox" checked={progress.showcase.feedbackConfirmed} disabled={!progress.showcase.peerFeedback || !progress.showcase.peerFeedbackSource} onChange={(event) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, feedbackConfirmed: event.target.checked, submittedAt: undefined } }))} />已阅读反馈并确认只评价流程衔接</label>
        <button className="primary-button" type="button" disabled={!progress.showcase.reviewerRole || !progress.showcase.entrySlotId || !progress.showcase.contribution.trim() || !progress.showcase.peerFeedback.trim() || !progress.showcase.feedbackConfirmed || (progress.mode === 'official' && (!selectedReviewer || !progress.showcase.feedbackRecorderConfirmed || progress.showcase.peerFeedbackSource !== 'group-record'))} onClick={() => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, submittedAt: new Date().toISOString() } }))}><FileCheck2 size={16} />提交展示记录</button>
      </section>
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">TEACHER FINAL</span><h2>{progress.mode === 'preview' ? '完成预演确认' : '形成正式教师确认版'}</h2></div><span>{previewComplete ? '预演已完成' : officialCurrent ? '正式确认当前有效' : '待确认'}</span></div><div className="confirmation-list">{([['realCourseConfirmed','流程面向一节真实课程，而非功能堆叠'],['flowApplicableConfirmed','课前、课中、课后顺序可实际执行'],['aiDisclosureConfirmed','所有 AI 使用和边界均已披露'],['finalResponsibilityConfirmed','教师承担最终教学、评价与发布责任']] as const).map(([field,label]) => <label key={field}><input type="checkbox" checked={progress.teacherConfirmation[field]} onChange={(event) => updateConfirmation({ [field]: event.target.checked })} /><span><strong>{label}</strong></span></label>)}</div><button className="primary-button" type="button" disabled={!confirmationValidation.valid} onClick={() => onUpdate((current) => { const confirmedAt = new Date().toISOString(); const withConfirmation = { ...current, teacherConfirmation: { ...current.teacherConfirmation, confirmedAt } }; if (current.mode === 'preview') return { ...withConfirmation, previewCompletedAt: confirmedAt, confirmedBundle: undefined }; return { ...withConfirmation, confirmedBundle: createConfirmedM12Bundle(withConfirmation, participantId, directory), previewCompletedAt: undefined } })}>{progress.mode === 'preview' ? <TestTube2 size={16} /> : <FileCheck2 size={16} />}{progress.mode === 'preview' ? '完成非计分预演' : '形成正式确认快照'}</button></section>
      <ValidationNotice messages={validation.messages} success="安全、小组展示和责任确认完整。" />
      <div className="page-actions"><span>{progress.mode === 'preview' ? '预演不会生成正式分数、通过状态或归档成果' : '确认快照与当前 10 类成果及联调指纹绑定'}</span><button className="primary-button" type="button" disabled={progress.mode === 'preview' ? !previewComplete : !officialCurrent} onClick={onNext}>查看结果<ArrowRight size={17} /></button></div>
    </>
  }

  const officialPassed = latestM12AssessmentIsCurrent(progress, directory)
  const previewComplete = m12PreviewIsComplete(progress, participantId)
  const previewChecks = [
    validateM12Evidence(progress, participantId).valid && validateM12Flow(progress, participantId).valid,
    validateM12Correction(progress).valid,
    validateM12Assistant(progress).valid,
    validateM12Retest(progress).valid,
    validateM12SafetyShowcase(progress, directory, participantId).valid && validateM12TeacherConfirmation(progress, participantId, directory).valid,
  ]
  return <>
    <PageHeader eyebrow="步骤 8 / 8 · 结果与成果" title={progress.mode === 'preview' ? previewComplete ? 'M12 非计分预演已完成' : 'M12 预演待补充' : officialPassed ? 'M12 正式任务已通过' : 'M12 正式验收待提交'} description={progress.mode === 'preview' ? '本页只给出规则映射检查，不生成分数、通过状态或成果归档。' : '总分不低于 8 分，四项核心要求全部通过，且专业证据、人工迭代、安全三项均须为 2 分。'} aside={progress.mode === 'preview' ? <div className="result-score preview"><strong>{previewChecks.filter(Boolean).length}</strong><span>/ 5 项规则</span></div> : <div className={officialPassed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>} />
    {modeNotice(progress.mode)}
    <section className={progress.mode === 'preview' ? 'result-banner' : officialPassed ? 'result-banner passed' : 'result-banner'}>{progress.mode === 'preview' ? <TestTube2 size={28} /> : officialPassed ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}<div><strong>{progress.mode === 'preview' ? '预演闭环完整，既有正式状态不受影响' : officialPassed ? '正式通过：三项整合成果已归档' : '尚未形成当前有效的正式通过快照'}</strong><p>{progress.mode === 'preview' ? '10 个预演入口、3/4 首轮、实质修改、4/4 复测和教师责任均已练习。' : 'M12 只归档成果目录、使用说明和人工修改记录，不新增第 11 类个人成果。'}</p></div><span>{progress.mode === 'preview' ? `${previewChecks.filter(Boolean).length} / 5` : `${score.coreRequirements.filter((item) => item.passed).length} / 4 核心要求`}</span></section>
    {progress.mode === 'preview' ? <section className="content-card"><div className="section-heading"><div><span className="eyebrow">NON-SCORING CHECK</span><h2>预演规则映射</h2></div><span>不计分</span></div><div className="requirement-list">{[['成果与三阶段编排',previewChecks[0]],['可追溯 AI 错误修正',previewChecks[1]],['助教有据回答与越界转交',previewChecks[2]],['首轮问题、修改与同路径复测',previewChecks[3]],['安全、展示与教师责任',previewChecks[4]]].map(([label,passed]) => <div className={passed ? 'passed' : ''} key={String(label)}>{passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{label}</strong><small>{passed ? '预演操作完整' : '仍需补充'}</small></span></div>)}</div></section> : <div className="score-layout"><section className="content-card score-card"><div className="dimension-list">{score.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong>{['evidence','iteration','safety'].includes(dimension.id) && <em className="m09-hard-gate">硬门槛</em>}<p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section><section className="content-card requirement-card"><div className="requirement-list">{score.coreRequirements.map((requirement) => <button type="button" key={requirement.id} className={requirement.passed ? 'passed' : ''} onClick={() => onNavigate(routeForM12Requirement(requirement.id))}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section></div>}
    <section className="content-card artifact-section"><div className="section-heading"><div><span className="eyebrow">TASK OUTPUTS</span><h2>三项整合成果，不新增个人成果类别</h2></div><span>{progress.mode === 'preview' ? '只读预演' : officialPassed ? '已归档' : '待正式验收'}</span></div><div className="m03-artifact-grid">{trainingTasks.M12.outputs.map((name, index) => <article key={name}>{index === 0 ? <FolderOpen size={20} /> : index === 1 ? <Route size={20} /> : <Wrench size={20} />}<strong>{name}</strong><p>{index === 0 ? '记录 10 类成果的来源、版本、验收编号和三阶段顺序。' : index === 1 ? '说明对象、环节、目标、教师动作和入口衔接。' : '保留联调问题、修改前后、依据和同路径复测结果。'}</p></article>)}</div><p className="muted-copy">10 类个人成果仍保留在原有 10 个槽位；M12 只建立一套引用快照，不创建第 11 个槽位。</p></section>
    {progress.mode === 'official' && <section className="content-card m03-assessment-panel"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>正式验收历史</h2></div><span>{progress.assessments.length} 次</span></div>{progress.assessments.length > 0 && <div className="m03-assessment-history">{progress.assessments.map((assessment,index) => <article key={assessment.assessmentId}><span>{index === 0 ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '未通过'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN')}</small></article>)}</div>}{!officialPassed && <button className="primary-button" type="button" disabled={!score.eligibleForOfficialAssessment} onClick={() => onUpdate((current) => { const assessment = createM12Assessment(current, participantId, directory); return assessment ? { ...current, assessments: [...current.assessments, assessment] } : current })}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交正式验收'}</button>}</section>}
    <div className="page-actions"><span>{progress.mode === 'preview' ? '如需正式完成，请切回正式模式并补齐本人 10 类当前成果' : officialPassed ? '三项 M12 任务成果已恰好归档一次' : '来源、流程或确认变化后旧历史保留，但当前通过会失效'}</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 M12</button></div>
  </>
}

export function officialM12EvidenceChanged(progress: M12Progress, officialEvidence: M12EvidenceSlot[]) {
  return progress.mode === 'official' && progress.evidence.length > 0 && m12EvidenceFingerprint(progress.evidence) !== m12EvidenceFingerprint(officialEvidence)
}
