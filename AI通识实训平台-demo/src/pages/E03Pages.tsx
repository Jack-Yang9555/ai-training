import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  History,
  Link2,
  ListChecks,
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
import type {
  E03ClassroomSource,
  E03PeerReview,
  E03Progress,
  E03Route,
  E03TeacherConfirmation,
} from '../e03/domain'
import {
  applyE03FindingCorrections,
  applyE03ReferenceRevision,
  createE03MeasureDraft,
  eligibleE03Reviewers,
  invalidateE03Confirmation,
  invalidateE03DerivedWork,
  invalidateE03ReviewContext,
  LocalE03FindingRunner,
  simulateE03PeerReview,
} from '../e03/runner'
import { calculateE03Score, createE03Assessment } from '../e03/scoring'
import { createConfirmedE03Package } from '../e03/storage'
import {
  confirmedE03PackageIsCurrent,
  detectE03InitialDefects,
  latestE03AssessmentIsCurrent,
  validateE03AssessmentSubmission,
  validateE03Confirmation,
  validateE03Findings,
  validateE03InitialFindings,
  validateE03InitialMeasures,
  validateE03PeerReview,
  validateE03Revision,
  validateE03Source,
} from '../e03/validation'
import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

const findingRunner = new LocalE03FindingRunner()
const groupRoles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']

export interface E03WorkspacePageProps {
  progress: E03Progress
  participantId: string
  directory: ParticipantDirectory
  onUpdate: (updater: (current: E03Progress) => E03Progress) => void
  onNavigate: (route: E03Route) => void
  onNext: () => void
  onReset: () => void
}

const routeLabels: Record<E03Route, string> = {
  overview: '步骤 1 / 8 · 任务说明',
  source: '步骤 2 / 8 · 课堂记录',
  findings: '步骤 3 / 8 · 三条发现',
  measures: '步骤 4 / 8 · 两条措施',
  'peer-review': '步骤 5 / 8 · 同组复核',
  revision: '步骤 6 / 8 · 措施修订',
  confirmation: '步骤 7 / 8 · 教师确认',
  result: '步骤 8 / 8 · 评分与成果',
}

const confirmationItems: Array<[keyof E03TeacherConfirmation, string, string]> = [
  ['sourceBoundaryConfirmed', '全部结论只基于当前课堂记录', '越出记录的内容均留在“待确认解释”，不作为已证实事实。'],
  ['findingsReviewedConfirmed', 'F01–F03 已由教师逐条核验', '三条发现均保存观察事实、原记录位置与待确认解释。'],
  ['noRealIdentityConfirmed', '当前成果不含真实学生身份', '课堂记录只使用匿名人数、小组与行为信息。'],
  ['noFixedLabelsConfirmed', '没有把一次表现固化为学生标签', '不使用态度、能力、动机或长期特征替代课堂证据。'],
  ['finalArtifactsConfirmed', '两项最终成果已经逐项检查', '教学反思或评课记录与下一次课改进清单内容一致。'],
  ['finalResponsibilityConfirmed', '教师承担最终教学判断责任', '确定性初稿与模拟同组意见仅作训练辅助。'],
]

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

function currentParticipant(directory: ParticipantDirectory, participantId: string) {
  return directory.participants.find((item) => item.participantId === participantId)
}

function updateSourceField<K extends keyof E03ClassroomSource>(
  current: E03Progress,
  field: K,
  value: E03ClassroomSource[K],
) {
  const invalidated = invalidateE03DerivedWork(current, '课堂记录、教学目标、课堂活动或评价结果发生变化')
  return { ...invalidated, source: { ...invalidated.source, [field]: value } }
}

export function E03WorkspacePage({ progress, participantId, directory, onUpdate, onNavigate, onNext, onReset }: E03WorkspacePageProps) {
  const score = useMemo(() => calculateE03Score(progress, directory), [progress, directory])
  const participant = currentParticipant(directory, participantId)
  const reviewers = eligibleE03Reviewers(directory)

  function openSourceReference(referenceId: string) {
    onNavigate('source')
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(`e03-${referenceId}`)
        target?.focus()
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      })
    })
  }

  function resetPeerIdentity(patch: Partial<E03PeerReview>) {
    onUpdate((current) => {
      const hasReviewWork = Boolean(current.peerReview.recordId || current.workingMeasures || current.confirmedPackage)
      const base = hasReviewWork ? invalidateE03ReviewContext(current, '同组复核人员或任务角色发生变化') : current
      return {
        ...base,
        peerReview: {
          ...base.peerReview,
          reviewerId: '',
          reviewerGroupId: '',
          reviewerRole: undefined,
          recordId: '',
          artifactId: '',
          reviewedMeasureFingerprint: '',
          judgements: [
            { measureId: 'A01', specific: '', executable: '', observable: '', suggestion: '' },
            { measureId: 'A02', specific: '', executable: '', observable: '', suggestion: '' },
          ],
          submitted: false,
          submittedAt: undefined,
          ...patch,
        },
      }
    })
  }

  function markFindingReviewed(findingId: string, checked: boolean) {
    onUpdate((current) => {
      const hasDownstream = Boolean(current.measureDraft || current.peerReview.recordId || current.workingMeasures || current.confirmedPackage)
      const base = hasDownstream ? invalidateE03ReviewContext(current, '课堂发现逐条核验状态发生变化') : current
      return {
        ...base,
        workingFindings: base.workingFindings.map((item) => item.findingId === findingId ? { ...item, teacherReviewed: checked } : item),
        measureDraft: undefined,
      }
    })
  }

  function markMeasureReviewed(measureId: string, checked: boolean) {
    onUpdate((current) => {
      const base = current.confirmedPackage ? invalidateE03Confirmation(current, '最终措施逐条核验状态发生变化') : current
      if (!base.workingMeasures) return base
      return {
        ...base,
        workingMeasures: {
          ...base.workingMeasures,
          measures: base.workingMeasures.measures.map((item) => item.measureId === measureId ? { ...item, teacherReviewed: checked } : item),
        },
        confirmedPackage: undefined,
      }
    })
  }

  function updateConfirmation(field: keyof E03TeacherConfirmation, checked: boolean) {
    onUpdate((current) => {
      const base = current.confirmedPackage ? invalidateE03Confirmation(current, '教师最终确认发生变化') : current
      return {
        ...base,
        teacherConfirmation: { ...current.teacherConfirmation, [field]: checked },
        confirmedPackage: undefined,
      }
    })
  }

  if (progress.route === 'overview') {
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.overview}
          title="让课堂反思从印象判断回到证据与下一次行动"
          description="仅基于一份匿名课堂记录完成三条可追溯发现、两条下一次课措施、同组逐项复核和至少一次有据修订。"
          aside={<div className="duration-card"><Scale size={20} /><span><strong>60 分钟</strong><small>个人主作 · 小组复核</small></span></div>}
        />
        <section className="e03-overview-grid">
          <article className="content-card"><span>01</span><div><strong>事实不等于解释</strong><p>时间、人数、行为和作品结果留在观察事实；动机、能力与原因只能作为待确认解释。</p></div></article>
          <article className="content-card"><span>02</span><div><strong>初稿不会一键全对</strong><p>确定性初稿稳定保留一处学生标签和一条泛化措施，教师必须真实纠错。</p></div></article>
          <article className="content-card"><span>03</span><div><strong>同组只复核措施</strong><p>同组其他成员逐项判断两条措施是否具体、可执行、可观察，不重新裁决课堂事实。</p></div></article>
          <article className="content-card"><span>04</span><div><strong>下一次课可检查</strong><p>至少一条措施保存修改前、修改后与反馈来源，最终由教师承担教学判断责任。</p></div></article>
        </section>
        <section className="content-card e03-contract-card">
          <div><FileCheck2 size={22} /><span><strong>固定成果恰好 2 项</strong><small>E03 整体只占一个个人选修成果槽位</small></span></div>
          <div className="e03-contract-artifacts"><span>教学反思或评课记录</span><span>下一次课改进清单</span></div>
        </section>
        <section className="e03-pass-rule" aria-label="E03 通关要求">
          <ShieldCheck size={21} />
          <div><strong>总分 ≥ 8 且三项硬门槛必须为 2 分</strong><p>专业准确与证据、人工核验与迭代、隐私版权伦理与安全不可由其他得分抵消。</p></div>
          <span>5 维 × 2 分</span>
        </section>
        <div className="page-actions"><span>本任务不连接真实模型、多人后端或真实学生系统</span><button className="primary-button" type="button" onClick={onNext}>查看匿名课堂记录<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'source') {
    const validation = validateE03Source(progress)
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.source}
          title="先锁定课堂记录、目标、活动与评价结果"
          description="当前使用平台已审核虚构记录；所有发现必须回到下面三个原记录片段，越出来源的内容只能标为待确认解释。"
          aside={<div className="metric-pill"><ShieldCheck size={19} /><span><strong>{progress.source.version}</strong><small>已审核虚构记录</small></span></div>}
        />
        <section className="content-card e03-source-card">
          <div className="section-heading"><div><span className="eyebrow">SOURCE BOUNDARY</span><h2>{progress.source.sourceName}</h2></div><span>{participant?.name ?? '当前教师'} · {participant?.groupName ?? '未分组'}</span></div>
          <div className="form-grid">
            <label className="field"><span>来源类型</span><input readOnly value={progress.source.sourceKind} /></label>
            <label className="field"><span>来源版本</span><input readOnly value={progress.source.version} /></label>
          </div>
          <TextField label="教学目标" value={progress.source.teachingGoal} onChange={(value) => onUpdate((current) => updateSourceField(current, 'teachingGoal', value))} />
          <TextField label="课堂活动" value={progress.source.classroomActivities} onChange={(value) => onUpdate((current) => updateSourceField(current, 'classroomActivities', value))} />
          <TextField label="评价结果" value={progress.source.assessmentResults} onChange={(value) => onUpdate((current) => updateSourceField(current, 'assessmentResults', value))} />
          <div className="e03-source-confirmations">
            <label><input type="checkbox" checked={progress.source.anonymizationConfirmed} onChange={(event) => onUpdate((current) => updateSourceField(current, 'anonymizationConfirmed', event.target.checked))} /><span><strong>记录已匿名化</strong><small>本地记录也必须先完成匿名化再录入。</small></span></label>
            <label><input type="checkbox" checked={progress.source.sourceOnlyConfirmed} onChange={(event) => onUpdate((current) => updateSourceField(current, 'sourceOnlyConfirmed', event.target.checked))} /><span><strong>只基于所给记录</strong><small>越出来源的判断统一标为待确认。</small></span></label>
            <label><input type="checkbox" checked={progress.source.noRealIdentityConfirmed} onChange={(event) => onUpdate((current) => updateSourceField(current, 'noRealIdentityConfirmed', event.target.checked))} /><span><strong>不含真实身份</strong><small>姓名、学号、联系方式和身份证信息不得进入分析。</small></span></label>
          </div>
        </section>
        <section className="content-card e03-source-excerpts">
          <div className="section-heading"><div><span className="eyebrow">TRACEABLE RECORD</span><h2>可打开的原记录片段</h2></div><span>{progress.source.excerpts.length} 个位置</span></div>
          <div className="e03-excerpt-list">{progress.source.excerpts.map((item) => <article id={`e03-${item.referenceId}`} tabIndex={-1} key={item.referenceId}><span>{item.referenceId}</span><div><strong>{item.locator}</strong><p>{item.content}</p></div><Link2 size={17} /></article>)}</div>
        </section>
        <ValidationNotice messages={validation.messages} success="课堂记录、教学目标、活动、评价结果和三项来源边界均已锁定。" />
        <div className="page-actions"><span>修改来源后旧验收历史保留，但当前发现、复核与通过状态失效</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>生成三条课堂发现<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'findings') {
    const initialValidation = validateE03InitialFindings(progress, participantId)
    const finalValidation = validateE03Findings(progress, participantId)
    const defects = detectE03InitialDefects(progress).filter((item) => item === 'fact-label-overreach')
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.findings}
          title="生成恰好三条发现，再逐条分开事实与解释"
          description="AI 原稿只读保存；F02 故意把一次课堂表现写成态度与能力标签，教师必须纠正后逐条核验 F01–F03。"
          aside={<div className="metric-pill"><Sparkles size={19} /><span><strong>{progress.aiDraft ? '3 / 3' : '待生成'}</strong><small>课堂发现</small></span></div>}
        />
        <section className="content-card e03-run-card">
          <div><Sparkles size={22} /><span><strong>本地确定性课堂证据引擎（Demo）</strong><small>不连接真实模型；相同 participantId 与来源指纹生成相同三条初稿。</small></span></div>
          <button className="primary-button" type="button" onClick={() => onUpdate((current) => {
            const base = invalidateE03DerivedWork(current, current.aiDraft ? '重新运行 E03 课堂发现初稿' : '生成 E03 课堂发现初稿')
            return { ...base, aiDraft: findingRunner.run(base, participantId), updatedAt: new Date().toISOString() }
          })}>{progress.aiDraft ? '重新生成只读初稿' : '运行并生成三条初稿'}<ArrowRight size={16} /></button>
        </section>
        {progress.aiDraft && <section className="content-card e03-findings-card">
          <div className="section-heading"><div><span className="eyebrow">AI ORIGINAL · READ ONLY</span><h2>三条课堂发现初稿</h2></div><span className="status-pill framework">AI 原稿只读</span></div>
          <div className="e03-finding-list">{progress.aiDraft.findings.map((finding) => <article className={finding.findingId === 'F02' ? 'issue' : ''} key={finding.findingId}><header><span>{finding.findingId}</span>{finding.findingId === 'F02' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</header><div><strong>观察事实</strong><p>{finding.observedFact}</p></div><div><strong>待确认解释</strong><p>{finding.interpretationToConfirm}</p></div><button className="e03-source-link" type="button" onClick={() => openSourceReference(finding.sourceReference)}><Link2 size={14} />打开 {finding.sourceReference} · {progress.source.excerpts.find((item) => item.referenceId === finding.sourceReference)?.locator}</button></article>)}</div>
          <div className="e03-defect-note"><AlertTriangle size={20} /><div><strong>稳定暴露 {defects.length} 类事实边界缺陷</strong><p>F02 用“态度消极、理解能力偏弱”替代了记录中的人数、时间和可观察行为。</p></div></div>
          <button className="secondary-button" type="button" disabled={!initialValidation.valid} onClick={() => onUpdate((current) => applyE03FindingCorrections(current.peerReview.recordId || current.measureDraft ? invalidateE03ReviewContext(current, '重新纠正课堂发现') : current, participantId))}><Wrench size={16} />纠正 F02 并形成教师工作稿</button>
        </section>}
        {progress.workingFindings.length > 0 && <section className="content-card e03-working-findings">
          <div className="section-heading"><div><span className="eyebrow">TEACHER WORKING COPY</span><h2>教师逐条核验</h2></div><span>{progress.workingFindings.filter((item) => item.teacherReviewed).length} / 3</span></div>
          <div className="e03-finding-list">{progress.workingFindings.map((finding) => <article className={finding.teacherReviewed ? 'complete' : ''} key={finding.findingId}><header><span>{finding.findingId}</span>{finding.teacherReviewed && <CheckCircle2 size={18} />}</header><div><strong>观察事实</strong><p>{finding.observedFact}</p></div><div><strong>待确认解释</strong><p>{finding.interpretationToConfirm}</p></div><button className="e03-source-link" type="button" onClick={() => openSourceReference(finding.sourceReference)}><Link2 size={14} />打开 {finding.sourceReference} · 原记录位置</button><label><input type="checkbox" checked={finding.teacherReviewed} onChange={(event) => markFindingReviewed(finding.findingId, event.target.checked)} /><span>教师已逐条核验事实、解释与来源</span></label></article>)}</div>
        </section>}
        <ValidationNotice
          messages={progress.workingFindings.length ? finalValidation.messages : initialValidation.messages}
          success={progress.workingFindings.length
            ? 'F01–F03 已逐条核验，全部可回到原记录，事实与待确认解释边界清楚。'
            : 'AI 原稿结构完整，并稳定保留一处待教师纠正的事实标签缺陷。'}
        />
        <div className="page-actions"><span>不得用一个总勾选代替三条发现的教师核验</span><button className="primary-button" type="button" disabled={!finalValidation.valid} onClick={onNext}>形成两条改进措施<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'measures') {
    const validation = validateE03InitialMeasures(progress, participantId)
    const measures = progress.measureDraft?.measures ?? []
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.measures}
          title="形成恰好两条下一次课改进措施"
          description="每条必须关联至少一个发现，并写全实施阶段、教师动作、学生可观察行为和检查方法；A02 初稿故意保留泛化表述。"
          aside={<div className="metric-pill"><ListChecks size={19} /><span><strong>{measures.length} / 2</strong><small>改进措施</small></span></div>}
        />
        <section className="content-card e03-measures-card">
          <div className="section-heading"><div><span className="eyebrow">NEXT LESSON</span><h2>两条措施初稿</h2></div><span>具体 · 可执行 · 可观察</span></div>
          <button className="primary-button" type="button" onClick={() => onUpdate((current) => createE03MeasureDraft(current.measureDraft || current.peerReview.recordId ? invalidateE03ReviewContext(current, '重新形成两条措施初稿') : current, participantId))}><ListChecks size={16} />{progress.measureDraft ? '重新形成两条措施' : '形成两条措施初稿'}</button>
          <div className="e03-measure-list">{measures.map((measure) => <article className={measure.measureId === 'A02' ? 'issue' : ''} key={measure.measureId}><header><span>{measure.measureId}</span><strong>关联 {measure.linkedFindingIds.join('、')}</strong>{measure.measureId === 'A02' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</header><dl><div><dt>实施阶段</dt><dd>{measure.implementationPhase}</dd></div><div><dt>教师动作</dt><dd>{measure.teacherAction}</dd></div><div><dt>学生可观察行为</dt><dd>{measure.observableStudentBehavior}</dd></div><div><dt>检查方法</dt><dd>{measure.checkMethod}</dd></div></dl></article>)}</div>
          {progress.measureDraft && <div className="e03-defect-note"><AlertTriangle size={20} /><div><strong>A02 需要真实复核与修订</strong><p>“加强关注、提升积极性、观察表现”没有明确动作、可观察行为与检查标准，并再次使用学生标签。</p></div></div>}
        </section>
        <ValidationNotice messages={validation.messages} success="两条措施结构完整，并稳定保留一条可由同组成员识别的泛化缺陷。" />
        <div className="page-actions"><span>初稿问题是学习证据；进入复核不代表 A02 已经合格</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>请同组成员逐项复核<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'peer-review') {
    const validation = validateE03PeerReview(progress, directory)
    const selectedReviewer = reviewers.find((item) => item.participantId === progress.peerReview.reviewerId)
    return (
      <>
        <PageHeader
          eyebrow={routeLabels['peer-review']}
          title="由当前同组其他成员逐条复核两项措施"
          description="复核只判断措施是否具体、可执行、可观察，不重新裁决 F01–F03 的课堂事实。负面评价也是有效复核事实。"
          aside={<div className="metric-pill"><UsersRound size={19} /><span><strong>{reviewers.length} 人</strong><small>当前同组可选</small></span></div>}
        />
        <div className="e03-simulation-note"><UsersRound size={21} /><div><strong>无多人后端的模拟复核边界</strong><p>{progress.peerReview.disclosure}</p></div></div>
        <section className="content-card e03-peer-card">
          <div className="form-grid">
            <label className="field"><span>当前同组其他成员</span><select value={progress.peerReview.reviewerId} onChange={(event) => resetPeerIdentity({ reviewerId: event.target.value })}><option value="">请选择</option>{reviewers.map((item) => <option key={item.participantId} value={item.participantId}>{item.name} · {item.specialty}</option>)}</select><small>排除本人和跨组成员。</small></label>
            <label className="field"><span>本次任务临时角色</span><select value={progress.peerReview.reviewerRole ?? ''} onChange={(event) => resetPeerIdentity({ reviewerId: progress.peerReview.reviewerId, reviewerRole: event.target.value as GroupRole })}><option value="">请选择</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select><small>只用于当前 E03 复核，不回写人员档案。</small></label>
            <label className="field"><span>被复核成果</span><input readOnly value={progress.measureDraft?.artifactId ?? '尚未形成改进清单'} /></label>
            <label className="field"><span>当前小组</span><input readOnly value={participant?.groupName ?? '未分组'} /></label>
          </div>
          <button className="secondary-button" type="button" disabled={!selectedReviewer || !progress.peerReview.reviewerRole} onClick={() => onUpdate((current) => {
            const reviewerId = current.peerReview.reviewerId
            const reviewerRole = current.peerReview.reviewerRole
            const clean = current.peerReview.recordId || current.workingMeasures || current.confirmedPackage
              ? invalidateE03ReviewContext(current, '重新生成同组模拟复核')
              : current
            const base = { ...clean, peerReview: { ...clean.peerReview, reviewerId, reviewerRole } }
            return { ...base, peerReview: simulateE03PeerReview(base, directory) }
          })}><Sparkles size={16} />生成并披露模拟组员复核</button>
          {progress.peerReview.recordId && <div className="e03-peer-results">{progress.peerReview.judgements.map((judgement) => <article key={judgement.measureId}><header><span>{judgement.measureId}</span><strong>{judgement.specific} · {judgement.executable} · {judgement.observable}</strong></header><p>{judgement.suggestion}</p></article>)}</div>}
          <button className="primary-button" type="button" disabled={!progress.peerReview.recordId || progress.peerReview.submitted} onClick={() => onUpdate((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true, submittedAt: new Date().toISOString() }, confirmedPackage: undefined }))}><FileCheck2 size={16} />{progress.peerReview.submitted ? '两条复核事实已提交' : '提交两条复核事实'}</button>
        </section>
        <ValidationNotice messages={validation.messages} success="同组其他成员、临时角色、两条逐项评价、建议和模拟边界均已保存。" />
        <div className="page-actions"><span>“需调整”是有效复核事实；作者必须修订或说明处理依据</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>依据反馈修订措施<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'revision') {
    const validation = validateE03Revision(progress, directory)
    const revision = progress.revisions.at(-1)
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.revision}
          title="依据同组反馈实质修改至少一条措施"
          description="保留措施修改前、修改后、反馈记录与作者依据；最终两条措施仍须由教师逐条核验。"
          aside={<div className="metric-pill"><Wrench size={19} /><span><strong>{progress.revisions.length} 条</strong><small>有据修订</small></span></div>}
        />
        <section className="content-card e03-revision-card">
          <div className="section-heading"><div><span className="eyebrow">FEEDBACK TO REVISION</span><h2>A02 修改闭环</h2></div><span>{progress.peerReview.recordId || '等待复核'}</span></div>
          <button className="primary-button" type="button" disabled={!progress.peerReview.submitted || Boolean(progress.workingMeasures)} onClick={() => onUpdate((current) => applyE03ReferenceRevision(current, participantId))}><Wrench size={16} />{progress.workingMeasures ? 'A02 已完成有据修订' : '采纳反馈并修订 A02'}</button>
          {revision && <div className="e03-before-after"><article><span>修改前</span><strong>{revision.before.teacherAction}</strong><p>{revision.before.observableStudentBehavior}</p><small>{revision.before.checkMethod}</small></article><ArrowRight size={20} /><article className="complete"><span>修改后</span><strong>{revision.after.teacherAction}</strong><p>{revision.after.observableStudentBehavior}</p><small>{revision.after.checkMethod}</small></article></div>}
          {revision && <div className="e03-feedback-source"><Link2 size={17} /><div><strong>反馈来源</strong><p>{revision.sourceSuggestion}</p><small>{revision.sourcePeerReviewId} · {revision.authorBasis}</small></div></div>}
        </section>
        {progress.workingMeasures && <section className="content-card e03-final-measures">
          <div className="section-heading"><div><span className="eyebrow">TEACHER REVIEW</span><h2>最终两条措施逐项确认</h2></div><span>{progress.workingMeasures.measures.filter((item) => item.teacherReviewed).length} / 2</span></div>
          <div className="e03-measure-list">{progress.workingMeasures.measures.map((measure) => <article className={measure.teacherReviewed ? 'complete' : ''} key={measure.measureId}><header><span>{measure.measureId}</span><strong>关联 {measure.linkedFindingIds.join('、')}</strong>{measure.teacherReviewed && <CheckCircle2 size={18} />}</header><dl><div><dt>实施阶段</dt><dd>{measure.implementationPhase}</dd></div><div><dt>教师动作</dt><dd>{measure.teacherAction}</dd></div><div><dt>学生可观察行为</dt><dd>{measure.observableStudentBehavior}</dd></div><div><dt>检查方法</dt><dd>{measure.checkMethod}</dd></div></dl><label><input type="checkbox" checked={measure.teacherReviewed} onChange={(event) => markMeasureReviewed(measure.measureId, event.target.checked)} /><span>教师已逐条核验本措施</span></label></article>)}</div>
        </section>}
        <ValidationNotice messages={validation.messages} success="两条措施均已逐项核验，至少一条保存了修改前、修改后和当前同组反馈来源。" />
        <div className="page-actions"><span>最终措施必须能在下一次课执行、观察并检查</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入教师最终确认<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'confirmation') {
    const revisionValidation = validateE03Revision(progress, directory)
    const validation = validateE03Confirmation(progress, directory)
    const packageCurrent = confirmedE03PackageIsCurrent(progress, directory)
    const checkedCount = Object.values(progress.teacherConfirmation).filter(Boolean).length
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.confirmation}
          title="由教师逐项确认来源、标签边界与两项成果"
          description="确认不是一个总勾选：来源范围、三条发现、真实身份、固定标签、两项成果和最终责任须分别留痕。"
          aside={<div className="metric-pill"><UserCheck size={19} /><span><strong>{checkedCount} / 6</strong><small>教师责任确认</small></span></div>}
        />
        <section className="content-card e03-confirmation-card">
          <div className="section-heading"><div><span className="eyebrow">TEACHER RESPONSIBILITY</span><h2>六项逐条确认</h2></div><span>{revisionValidation.valid ? '最终内容已就绪' : '最终内容仍有缺项'}</span></div>
          <div className="e03-confirmation-list">{confirmationItems.map(([field, label, detail]) => <label key={field}><input type="checkbox" disabled={!revisionValidation.valid} checked={progress.teacherConfirmation[field]} onChange={(event) => updateConfirmation(field, event.target.checked)} /><span><strong>{label}</strong><small>{detail}</small></span>{progress.teacherConfirmation[field] && <CheckCircle2 size={18} />}</label>)}</div>
          <button className="primary-button" type="button" disabled={!validation.valid} onClick={() => onUpdate((current) => ({ ...current, confirmedPackage: createConfirmedE03Package(current, directory) }))}><ShieldCheck size={17} />{packageCurrent ? '当前两项成果已确认' : '形成教师确认的两项成果'}</button>
        </section>
        <section className="content-card e03-artifact-section">
          <div className="section-heading"><div><span className="eyebrow">EXACTLY TWO OUTPUTS</span><h2>固定成果恰好 2 项</h2></div><span>{packageCurrent ? '当前指纹已确认' : '等待确认'}</span></div>
          <div className="e03-artifact-grid">{(progress.confirmedPackage?.artifacts ?? [
            { artifactId: 'E03:pending:reflection', kind: 'e03-reflection-record' as const, name: '教学反思或评课记录' as const, version: '1.0' as const },
            { artifactId: 'E03:pending:measures', kind: 'e03-improvement-measures' as const, name: '下一次课改进清单' as const, version: '1.0' as const },
          ]).map((artifact, index) => <article key={artifact.kind}><span>{index + 1}</span><div><strong>{artifact.name}</strong><p>{index === 0 ? 'F01–F03：观察事实、原记录位置与待确认解释。' : 'A01–A02：实施阶段、教师动作、学生行为、检查方法及修订证据。'}</p><small>{artifact.artifactId} · v{artifact.version}</small></div>{packageCurrent ? <CheckCircle2 size={21} /> : <FileText size={21} />}</article>)}</div>
          <p className="e03-slot-note"><BadgeCheck size={15} />两项任务成果共同构成 E03 的一个个人选修成果，G02/M12 应接收完整 packageId，而非只取一个子成果。</p>
        </section>
        <ValidationNotice messages={validation.messages} success={packageCurrent ? '六项教师责任已确认，当前内容指纹对应的两项固定成果已形成。' : '六项教师责任已确认；请点击上方按钮形成当前两项成果。'} />
        <div className="page-actions"><span>来源、人员、复核、修订或确认变化后，旧历史保留，当前成果包失效</span><button className="primary-button" type="button" disabled={!packageCurrent} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div>
      </>
    )
  }

  const assessmentValidation = validateE03AssessmentSubmission(progress, directory)
  const passed = latestE03AssessmentIsCurrent(progress, directory)
  const packageCurrent = confirmedE03PackageIsCurrent(progress, directory)
  return (
    <>
      <PageHeader
        eyebrow={routeLabels.result}
        title={passed ? 'E03 当前验收已通过' : 'E03 五维评分与成果验收'}
        description="总分不低于 8 分、四项核心要求全部通过，且专业证据、人工迭代、安全三项硬门槛均为 2 分。"
        aside={<div className={passed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>}
      />
      <section className={passed ? 'result-banner passed' : 'result-banner'}>
        {passed ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
        <div><strong>{passed ? '当前验收通过，两项成果已归档' : packageCurrent ? '两项成果已确认，等待提交验收' : '当前确认版仍有缺项'}</strong><p>三条证据发现 → 两条下一课措施 → 同组逐项复核 → A02 有据修订 → 教师确认。</p></div>
        <span>{score.coreRequirements.filter((item) => item.passed).length} / 4 核心要求</span>
      </section>
      <div className="score-layout e03-score-layout">
        <section className="content-card e03-score-card"><div className="dimension-list">{score.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong>{['evidence', 'iteration', 'safety'].includes(dimension.id) && <em className="e03-hard-gate">硬门槛</em>}<p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section>
        <section className="content-card e03-requirement-card"><div className="requirement-list">{score.coreRequirements.map((requirement) => <button className={requirement.passed ? 'passed' : ''} type="button" key={requirement.id} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section>
      </div>
      <section className="e03-gate-summary">
        <div className={score.total >= 8 ? 'passed' : ''}><Scale size={18} /><span><strong>{score.total >= 8 ? '总分已达标' : '总分未达标'}</strong><small>{score.total} / 10，要求 ≥ 8</small></span></div>
        <div className={score.hardGatesPassed ? 'passed' : ''}><ShieldCheck size={18} /><span><strong>{score.hardGatesPassed ? '三项硬门槛通过' : '硬门槛未全部通过'}</strong><small>专业证据 · 人工迭代 · 安全</small></span></div>
        <div className={score.coreRequirementsPassed ? 'passed' : ''}><ListChecks size={18} /><span><strong>{score.coreRequirementsPassed ? '核心步骤完整' : '核心步骤仍有缺项'}</strong><small>{score.coreRequirements.filter((item) => item.passed).length} / 4</small></span></div>
      </section>
      <section className="content-card e03-result-artifacts">
        <div className="section-heading"><div><span className="eyebrow">ARCHIVE CONTRACT</span><h2>两项成果 · 一个选修槽位</h2></div><span>{passed ? '已同步归档' : '待当前验收'}</span></div>
        <div className="e03-artifact-grid">{(progress.confirmedPackage?.artifacts ?? []).map((artifact, index) => <article key={artifact.kind}><span>{index + 1}</span><div><strong>{artifact.name}</strong><p>{index === 0 ? '三条课堂发现与证据位置。' : '两条下一次课措施与反馈修订记录。'}</p><small>{artifact.artifactId}</small></div>{passed ? <CheckCircle2 size={21} /> : <FileCheck2 size={21} />}</article>)}</div>
      </section>
      <section className="content-card e03-assessment-card">
        <div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>初验与复验历史</h2></div><span>{progress.assessments.length} 次</span></div>
        {progress.assessments.length > 0 && <div className="e03-history-list">{progress.assessments.map((assessment, index) => <article key={assessment.assessmentId}><span>{assessment.attempt === 'initial' ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '待补验'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN', { hour12: false })}</small><em>{assessment.modificationSummary || '按当前内容指纹提交'}</em></article>)}</div>}
        {!passed && <button className="primary-button" type="button" disabled={!assessmentValidation.valid} onClick={() => onUpdate((current) => ({ ...current, assessments: [...current.assessments, createE03Assessment(current, directory, current.assessments.length ? '按当前三条发现、两条措施与复核修订重新提交。' : '完成事实边界纠正、同组逐项复核和 A02 有据修订。')] }))}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交验收'}</button>}
      </section>
      <ValidationNotice messages={assessmentValidation.messages} success="当前教师确认版、两项固定成果和全部验收证据已经齐备。" />
      <div className="page-actions"><span>实质内容变化后旧验收历史保留，当前通过按内容指纹自动失效</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 E03</button></div>
      {progress.attemptHistory.length > 0 && <p className="e03-attempt-note"><History size={15} />已保留 {progress.attemptHistory.length} 条来源、复核或确认变化前的完整快照。</p>}
    </>
  )
}
