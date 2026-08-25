import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  History,
  Link2,
  ListChecks,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import type {
  E02PeerReview,
  E02Progress,
  E02Route,
  E02Scenario,
  E02TeacherConfirmation,
} from '../e02/domain'
import {
  applyE02ReferenceCorrections,
  eligibleE02Reviewers,
  invalidateE02Confirmation,
  invalidateE02DerivedWork,
  LocalE02DraftRunner,
  rubricScoreTotal,
  simulateE02PeerReview,
} from '../e02/runner'
import { calculateE02Score, createE02Assessment } from '../e02/scoring'
import { createConfirmedE02Package } from '../e02/storage'
import {
  confirmedE02PackageIsCurrent,
  detectE02InitialDefects,
  latestE02AssessmentIsCurrent,
  validateE02AssessmentSubmission,
  validateE02Confirmation,
  validateE02FinalDraft,
  validateE02InitialDraft,
  validateE02PeerReview,
  validateE02Source,
} from '../e02/validation'
import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

const draftRunner = new LocalE02DraftRunner()
const groupRoles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']

export interface E02WorkspacePageProps {
  progress: E02Progress
  participantId: string
  directory: ParticipantDirectory
  onUpdate: (updater: (current: E02Progress) => E02Progress) => void
  onNavigate: (route: E02Route) => void
  onNext: () => void
  onReset: () => void
}

const routeLabels: Record<E02Route, string> = {
  overview: '步骤 1 / 8 · 任务说明',
  source: '步骤 2 / 8 · 任务与规范',
  draft: '步骤 3 / 8 · 任务书初稿',
  'safety-rubric': '步骤 4 / 8 · 安全与量规',
  'peer-review': '步骤 5 / 8 · 同组复核',
  'teacher-revision': '步骤 6 / 8 · 有据修正',
  confirmation: '步骤 7 / 8 · 教师确认',
  result: '步骤 8 / 8 · 评分与成果',
}

const confirmationItems: Array<[keyof E02TeacherConfirmation, string, string]> = [
  ['specificationReviewedConfirmed', '规范与条款已经逐项核验', '当前样例为已审核虚构规范，不替代设备说明书或学校安全规程。'],
  ['authorizationAndPrivacyConfirmed', '材料授权与隐私边界已确认', '未录入真实学生、患者、企业数据、密钥或未授权材料。'],
  ['finalArtifactsConfirmed', '三项最终成果已经逐项检查', '任务书、安全检查单和 100 分评分量规内容一致、引用可追溯。'],
  ['finalResponsibilityConfirmed', '教师承担最终教学与实训安全责任', 'AI 初稿与模拟组员意见仅作辅助，不替代教师的最终判断。'],
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

function updateScenarioField<K extends keyof E02Scenario>(
  current: E02Progress,
  field: K,
  value: E02Scenario[K],
): E02Progress {
  const invalidated = invalidateE02DerivedWork(current, '职业任务、课程输入或安全确认发生变化')
  return { ...invalidated, scenario: { ...invalidated.scenario, [field]: value } }
}

function currentParticipant(directory: ParticipantDirectory, participantId: string) {
  return directory.participants.find((item) => item.participantId === participantId)
}

function compactFingerprint(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value
}

function defectLabel(defect: ReturnType<typeof detectE02InitialDefects>[number]) {
  if (defect === 'operation-sequence') return 'S02 / S03 操作错序'
  if (defect === 'vague-safety') return 'SAFE-02 只有泛化提醒'
  return '评分量规合计 95 分'
}

function artifactDescription(index: number, progress: E02Progress) {
  if (index === 0) return `${progress.workingDraft?.taskBook.steps.length ?? 0} 个有序步骤，逐步保存动作、完成证据与规范条款。`
  if (index === 1) return `${progress.workingDraft?.safetyChecklist.length ?? 0} 个可执行检查点，逐项关联步骤和规范。`
  return `${rubricScoreTotal(progress.workingDraft)} 分，评价项包含关键步骤、扣分条件和条款依据。`
}

export function E02WorkspacePage({ progress, participantId, directory, onUpdate, onNavigate, onNext, onReset }: E02WorkspacePageProps) {
  const score = useMemo(() => calculateE02Score(progress, directory), [progress, directory])
  const participant = currentParticipant(directory, participantId)
  const reviewers = eligibleE02Reviewers(directory)

  function resetPeerForIdentity(patch: Partial<E02PeerReview>) {
    onUpdate((current) => {
      const shouldArchive = Boolean(current.workingDraft || current.confirmedPackage)
      const base = shouldArchive ? invalidateE02Confirmation(current, '同组复核人员或任务角色发生变化') : current
      return {
        ...base,
        workingDraft: undefined,
        modifications: [],
        peerReview: {
          ...base.peerReview,
          reviewerId: '',
          reviewerGroupId: '',
          reviewerRole: undefined,
          recordId: '',
          taskBookId: '',
          reviewedDraftFingerprint: '',
          sequence: '',
          safety: '',
          scoreTotal: '',
          suggestion: '',
          authorTreatment: '',
          authorBasis: '',
          submitted: false,
          submittedAt: undefined,
          ...patch,
        },
        confirmedPackage: undefined,
      }
    })
  }

  function updateConfirmation(field: keyof E02TeacherConfirmation, checked: boolean) {
    onUpdate((current) => {
      const base = current.confirmedPackage ? invalidateE02Confirmation(current, '教师最终确认发生变化') : current
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
          title="把一项实训任务拆成可操作、可核验、可评分的闭环"
          description="以已审核虚构低压教学案例完整练习：登记规范、生成初稿、发现三个问题、同组复核、完成四项有据修正，再由教师确认。"
          aside={<div className="duration-card"><Scale size={20} /><span><strong>60 分钟</strong><small>个人主作 · 小组复核</small></span></div>}
        />
        <section className="e02-overview-grid">
          <article className="content-card"><span>01</span><div><strong>审核虚构案例</strong><p>使用平台教学研发组审核的 24V 低压教学案例，醒目标注适用范围，不冒充真实设备规范。</p></div></article>
          <article className="content-card"><span>02</span><div><strong>不会一键全对</strong><p>确定性初稿稳定保留错序、泛化安全提醒和 95 分量规，便于教师真正核验。</p></div></article>
          <article className="content-card"><span>03</span><div><strong>同组复核闭环</strong><p>从当前人员目录选择真实同组其他成员，模拟意见明确披露为非实时提交。</p></div></article>
          <article className="content-card"><span>04</span><div><strong>教师最终责任</strong><p>AI 原稿只读，四项修正均有前后、条款和理由，三项成果由教师最终确认。</p></div></article>
        </section>
        <section className="content-card e02-contract-card">
          <div><BookOpenCheck size={23} /><span><strong>固定成果恰好 3 项</strong><small>E02 仍只占一个个人选修成果槽位</small></span></div>
          <div className="e02-contract-artifacts"><span>实训任务书</span><span>安全检查单</span><span>100 分评分量规</span></div>
        </section>
        <section className="e02-pass-rule" aria-label="E02 通关要求">
          <ShieldCheck size={21} />
          <div><strong>总分 ≥ 8 且三项硬门槛必须为 2 分</strong><p>专业准确与证据、人工核验与迭代、隐私版权伦理与安全不可被其他得分抵消。</p></div>
          <span>5 维 × 2 分</span>
        </section>
        <div className="page-actions"><span>本任务不连接真实模型、设备、多人后端或 API Key</span><button className="primary-button" type="button" onClick={onNext}>登记任务与规范<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'source') {
    const validation = validateE02Source(progress)
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.source}
          title="先锁定职业任务、适用设备和规范边界"
          description="课程情境可由教师调整；当前 Demo 只提供平台已审核虚构规范，所有步骤、安全点和扣分条件都必须回到条款。"
          aside={<div className="metric-pill"><ShieldCheck size={19} /><span><strong>{progress.specification.version}</strong><small>已审核虚构规范</small></span></div>}
        />
        <div className="e02-boundary-note"><ShieldAlert size={21} /><div><strong>这是训练案例，不是设备操作授权</strong><p>{progress.specification.scopeNote}</p></div></div>
        <section className="content-card e02-source-card">
          <div className="section-heading"><div><span className="eyebrow">COURSE TASK</span><h2>本人课程中的职业任务</h2></div><span>{participant?.name ?? '当前教师'} · {participant?.groupName ?? '未分组'}</span></div>
          <div className="form-grid">
            <label className="field"><span>课程名称</span><input value={progress.scenario.courseName} onChange={(event) => onUpdate((current) => updateScenarioField(current, 'courseName', event.target.value))} /></label>
            <label className="field"><span>适用设备（与规范锁定）</span><input value={progress.scenario.equipment} readOnly /></label>
          </div>
          <TextField label="真实职业或实训任务" value={progress.scenario.vocationalTask} onChange={(value) => onUpdate((current) => updateScenarioField(current, 'vocationalTask', value))} />
          <TextField label="学习目标" value={progress.scenario.learningObjective} onChange={(value) => onUpdate((current) => updateScenarioField(current, 'learningObjective', value))} />
          <TextField label="实训条件与限制" value={progress.scenario.trainingConditions} onChange={(value) => onUpdate((current) => updateScenarioField(current, 'trainingConditions', value))} />
          <div className="e02-material-list"><span>已登记材料 · {progress.scenario.materials.length} 项</span>{progress.scenario.materials.map((item, index) => <div key={item}><em>{String(index + 1).padStart(2, '0')}</em><p>{item}</p><CheckCircle2 size={15} /></div>)}</div>
          <div className="e02-source-confirmations">
            <label><input type="checkbox" checked={progress.scenario.materialAuthorizationConfirmed} onChange={(event) => onUpdate((current) => updateScenarioField(current, 'materialAuthorizationConfirmed', event.target.checked))} /><span><strong>材料授权已确认</strong><small>只使用获准虚构材料。</small></span></label>
            <label><input type="checkbox" checked={progress.scenario.privacyConfirmed} onChange={(event) => onUpdate((current) => updateScenarioField(current, 'privacyConfirmed', event.target.checked))} /><span><strong>隐私边界已确认</strong><small>不录入真实个人或企业数据。</small></span></label>
            <label><input type="checkbox" checked={progress.scenario.verifiedOperationOnlyConfirmed} onChange={(event) => onUpdate((current) => updateScenarioField(current, 'verifiedOperationOnlyConfirmed', event.target.checked))} /><span><strong>只使用已核验操作</strong><small>AI 不作安全决策。</small></span></label>
          </div>
        </section>
        <section className="content-card e02-spec-card">
          <div className="section-heading"><div><span className="eyebrow">VERIFIED FICTIONAL SPECIFICATION</span><h2>{progress.specification.name}</h2></div><span className="status-pill completed"><BadgeCheck size={13} />平台已审核</span></div>
          <div className="e02-spec-meta">
            <div><span>版本</span><strong>{progress.specification.version}</strong></div>
            <div><span>来源</span><strong>{progress.specification.sourceOrganization}</strong></div>
            <div><span>适用设备</span><strong>{progress.specification.applicableEquipment}</strong></div>
            <div><span>授权</span><strong>{progress.specification.authorization}</strong></div>
          </div>
          <div className="e02-clause-list">{progress.specification.clauses.map((clause) => <article key={clause.clauseId}><span>{clause.clauseId}</span><div><strong>{clause.title}</strong><p>{clause.requirement}</p></div><Link2 size={16} /></article>)}</div>
        </section>
        <ValidationNotice messages={validation.messages} success="职业任务、规范版本、适用范围、材料授权和隐私边界均已锁定。" />
        <div className="page-actions"><span>修改任务或规范后，旧验收历史保留，但当前草稿与通过状态失效</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>生成任务书初稿<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'draft') {
    const validation = validateE02InitialDraft(progress, participantId)
    const draft = progress.aiDraft
    const defects = detectE02InitialDefects(progress)
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.draft}
          title="生成一份可追溯、但故意不完美的 AI 初稿"
          description="本地确定性引擎根据当前任务与规范指纹生成背景、目标、材料和 4 个步骤；原稿只读，问题留给教师和组员识别。"
          aside={<div className="metric-pill"><Sparkles size={19} /><span><strong>{draft ? '已生成' : '待运行'}</strong><small>本地确定性引擎</small></span></div>}
        />
        <section className="content-card e02-run-card">
          <div><Sparkles size={23} /><span><strong>本地确定性任务书引擎（Demo）</strong><small>不连接真实模型；输出由 participantId、课程任务与规范指纹决定。</small></span></div>
          <button className="primary-button" type="button" onClick={() => onUpdate((current) => {
            const base = invalidateE02DerivedWork(current, current.aiDraft ? '重新运行 E02 确定性初稿' : '生成 E02 确定性初稿')
            const aiDraft = draftRunner.run(base, participantId)
            return { ...base, aiDraft, workingDraft: undefined, updatedAt: new Date().toISOString() }
          })}>{draft ? '重新生成只读初稿' : '运行并生成初稿'}<ArrowRight size={16} /></button>
        </section>
        {draft && <>
          <section className="content-card e02-taskbook-card">
            <div className="section-heading"><div><span className="eyebrow">AI ORIGINAL · READ ONLY</span><h2>{draft.taskBook.title}</h2></div><span className="status-pill framework">AI 原稿只读</span></div>
            <div className="e02-taskbook-summary"><div><span>任务背景</span><p>{draft.taskBook.background}</p></div><div><span>任务目标</span><p>{draft.taskBook.objective}</p></div></div>
            <div className="e02-step-list">{[...draft.taskBook.steps].sort((left, right) => left.order - right.order).map((step) => {
              const issue = step.stepId === 'S02' || step.stepId === 'S03'
              return <article className={issue ? 'issue' : ''} key={step.stepId}><span>{step.order}</span><div><header><strong>{step.stepId} · {step.action}</strong>{step.critical && <em>关键步骤</em>}</header><p><b>完成证据</b>{step.completionEvidence}</p><small><Link2 size={13} />规范条款 {step.clauseId}</small></div>{issue ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</article>
            })}</div>
            <p className="e02-fingerprint">draftId: {draft.draftId} · input: {compactFingerprint(draft.inputFingerprint)} · engine: {draft.engineLabel}</p>
          </section>
          <div className="e02-detected-strip"><AlertTriangle size={21} /><div><strong>初稿稳定暴露 {defects.length} 类可区分问题</strong><p>{defects.map(defectLabel).join('；')}。这些问题不会被系统悄悄修好。</p></div><span>{defects.length} / 3</span></div>
        </>}
        <ValidationNotice messages={validation.messages} success="AI 原始任务书结构完整，并如预期保留三类待复核问题。" />
        <div className="page-actions"><span>下一步先查看安全检查和量规，不在 AI 原稿上直接覆盖</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>核对安全与量规<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'safety-rubric') {
    const validation = validateE02InitialDraft(progress, participantId)
    const draft = progress.aiDraft
    const total = rubricScoreTotal(draft)
    return (
      <>
        <PageHeader
          eyebrow={routeLabels['safety-rubric']}
          title="把安全要求和 100 分量规逐项摊开核对"
          description="初稿已经有 3 个安全点和 5 个评分项，但 SAFE-02 不可执行、总分只有 95；此页只读呈现问题，等待同组复核。"
          aside={<div className={total === 100 ? 'result-score passed' : 'result-score'}><strong>{total}</strong><span>/ 100 分</span></div>}
        />
        <div className="e02-dual-workbench">
          <section className="content-card e02-safety-card">
            <div className="section-heading"><div><span className="eyebrow">SAFETY CHECKLIST</span><h2>安全检查单 · {draft?.safetyChecklist.length ?? 0} 项</h2></div><span>逐项关联步骤与条款</span></div>
            <div className="e02-safety-list">{draft?.safetyChecklist.map((item) => {
              const issue = item.safetyId === 'SAFE-02'
              return <article className={issue ? 'issue' : ''} key={item.safetyId}><header><span>{item.safetyId}</span>{issue ? <em>泛化表述</em> : <CheckCircle2 size={16} />}</header><strong>{item.description}</strong><p>{item.completionEvidence}</p><small><Link2 size={12} />{item.stepId} · 条款 {item.clauseId}</small></article>
            })}</div>
          </section>
          <section className="content-card e02-rubric-card">
            <div className="section-heading"><div><span className="eyebrow">PERFORMANCE RUBRIC</span><h2>评分量规 · {draft?.rubric.version ?? '—'}</h2></div><span className={total === 100 ? 'complete' : 'issue'}>{total} / 100</span></div>
            <div className="e02-table-scroll"><table className="e02-rubric-table"><thead><tr><th>评分项</th><th>分值</th><th>关键步骤</th><th>扣分条件</th><th>条款</th></tr></thead><tbody>{draft?.rubric.items.map((item) => <tr className={item.rubricItemId === 'R05' ? 'issue' : ''} key={item.rubricItemId}><td><strong>{item.rubricItemId}</strong><span>{item.name}</span></td><td>{item.score}</td><td>{item.criticalStepIds.join('、')}</td><td>{item.deductionConditions}</td><td>{item.clauseIds.join('、')}</td></tr>)}</tbody><tfoot><tr><td colSpan={4}>系统实时合计</td><td>{total} 分</td></tr></tfoot></table></div>
          </section>
        </div>
        <section className="e02-issue-matrix" aria-label="初稿问题矩阵">
          <article><span>01</span><div><strong>步骤错序</strong><p>条款 4.2 的端子核对被排在条款 4.3 的接线之后。</p></div><AlertTriangle size={18} /></article>
          <article><span>02</span><div><strong>安全不可观察</strong><p>SAFE-02 只有“注意安全”，没有具体动作、停止条件和证据。</p></div><AlertTriangle size={18} /></article>
          <article><span>03</span><div><strong>分值未闭合</strong><p>五项合计 95 分，尚不能作为正式 100 分操作考核量规。</p></div><AlertTriangle size={18} /></article>
        </section>
        <ValidationNotice messages={validation.messages} success="三类初稿问题已清楚呈现，可以带着具体问题进入同组复核。" />
        <div className="page-actions"><span>初稿问题是有效学习证据；最终提交前必须全部修正</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入同组复核<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'peer-review') {
    const validation = validateE02PeerReview(progress, directory)
    const selectedReviewer = reviewers.find((item) => item.participantId === progress.peerReview.reviewerId)
    return (
      <>
        <PageHeader
          eyebrow={routeLabels['peer-review']}
          title="让同组其他成员检查顺序、安全和 100 分合计"
          description="对象来自当前人员目录并排除本人；当前 Demo 由教师在本机触发确定性模拟意见，不冒充真实组员在线提交。"
          aside={<div className="metric-pill"><UsersRound size={19} /><span><strong>{reviewers.length} 人</strong><small>当前同组可选</small></span></div>}
        />
        <div className="e02-simulation-note"><UsersRound size={21} /><div><strong>无多人后端的模拟复核边界</strong><p>{progress.peerReview.disclosure}</p></div></div>
        <section className="content-card e02-peer-card">
          <div className="form-grid">
            <label className="field"><span>当前同组其他成员</span><select value={progress.peerReview.reviewerId} onChange={(event) => resetPeerForIdentity({ reviewerId: event.target.value })}><option value="">请选择</option>{reviewers.map((item) => <option key={item.participantId} value={item.participantId}>{item.name} · {item.specialty}</option>)}</select><small>不显示本人或跨组人员。</small></label>
            <label className="field"><span>本次任务临时角色</span><select value={progress.peerReview.reviewerRole ?? ''} onChange={(event) => resetPeerForIdentity({ reviewerId: progress.peerReview.reviewerId, reviewerRole: event.target.value as GroupRole })}><option value="">请选择</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select><small>只用于当前 E02 复核，不回写人员档案。</small></label>
            <label className="field"><span>被复核成果</span><input readOnly value={progress.aiDraft?.taskBook.title ?? '尚未生成任务书'} /></label>
            <label className="field"><span>当前小组</span><input readOnly value={participant?.groupName ?? '未分组'} /></label>
          </div>
          <button className="secondary-button" type="button" disabled={!selectedReviewer || !progress.peerReview.reviewerRole} onClick={() => onUpdate((current) => {
            const clean = current.workingDraft || current.confirmedPackage ? invalidateE02Confirmation(current, '重新生成同组模拟复核') : current
            const base = { ...clean, workingDraft: undefined, modifications: [], confirmedPackage: undefined }
            return { ...base, peerReview: simulateE02PeerReview(base, directory) }
          })}><Sparkles size={16} />生成并披露模拟组员复核</button>
          {progress.peerReview.recordId && <div className="e02-peer-result">
            <article><span>操作顺序</span><strong>{progress.peerReview.sequence}</strong><small>S02 / S03</small></article>
            <article><span>安全检查</span><strong>{progress.peerReview.safety}</strong><small>SAFE-02</small></article>
            <article><span>量规合计</span><strong>{progress.peerReview.scoreTotal}</strong><small>当前 95 分</small></article>
            <p><strong>具体意见：</strong>{progress.peerReview.suggestion}</p>
            <small>recordId: {progress.peerReview.recordId} · reviewer: {selectedReviewer?.name} · source: deterministic-demo</small>
          </div>}
          <button className="primary-button" type="button" disabled={!progress.peerReview.recordId || progress.peerReview.submitted} onClick={() => onUpdate((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true, submittedAt: new Date().toISOString() }, confirmedPackage: undefined }))}><FileCheck2 size={16} />{progress.peerReview.submitted ? '复核记录已提交' : '提交复核事实'}</button>
        </section>
        <ValidationNotice messages={validation.messages} success="同组其他成员、临时角色、三项问题和模拟边界均已完整保存。" />
        <div className="page-actions"><span>“需调整”“不是 100 分”是有效复核事实，不会被当作无效提交</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>根据意见有据修正<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'teacher-revision') {
    const validation = validateE02FinalDraft(progress, directory)
    const working = progress.workingDraft
    const correctionPlan = [
      { id: 'S02', label: '接线步骤顺序', before: '顺序 2', after: '顺序 3', clause: '4.3' },
      { id: 'S03', label: '端子核对顺序', before: '顺序 3', after: '顺序 2', clause: '4.2' },
      { id: 'SAFE-02', label: '安全检查描述', before: '注意安全。', after: '断电、逐点核对、异常停止并报告', clause: '4.3' },
      { id: 'R05', label: '过程记录分值', before: '15 分', after: '20 分', clause: '4.1' },
    ]
    return (
      <>
        <PageHeader
          eyebrow={routeLabels['teacher-revision']}
          title="依据同组意见完成 4 项可核对的实质修正"
          description="每项修正都绑定当前复核记录、AI 初稿指纹、修改前后和规范条款；AI 原稿继续保留为 95 分只读版本。"
          aside={<div className="metric-pill"><Wrench size={19} /><span><strong>{progress.modifications.length} / 4</strong><small>有据修正</small></span></div>}
        />
        <section className="e02-version-rail" aria-label="版本流转">
          <div><span>AI 初稿</span><strong>错序 · 泛化安全 · 95 分</strong><small>只读保存</small></div><ArrowRight size={18} />
          <div><span>同组复核</span><strong>3 项明确问题</strong><small>{progress.peerReview.recordId || '待提交'}</small></div><ArrowRight size={18} />
          <div className={working ? 'complete' : ''}><span>教师修正版</span><strong>{working ? '顺序正确 · 安全具体 · 100 分' : '等待应用修正'}</strong><small>最终工作稿</small></div>
        </section>
        <section className="content-card e02-revision-card">
          <div className="section-heading"><div><span className="eyebrow">EVIDENCE-BASED REVISION</span><h2>四项修正计划</h2></div><span>关联复核 {compactFingerprint(progress.peerReview.recordId || '—')}</span></div>
          <div className="e02-revision-grid">{correctionPlan.map((item, index) => {
            const record = progress.modifications.find((modification) => modification.targetId === item.id)
            return <article className={record ? 'complete' : ''} key={item.id}><header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.id} · {item.label}</strong><small>依据条款 {record?.basisClauseId ?? item.clause}</small></div>{record ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</header><div className="e02-before-after"><p><span>修改前</span>{record?.beforeValue ?? item.before}</p><ArrowRight size={16} /><p><span>修改后</span>{record?.afterValue ?? item.after}</p></div><small>{record?.basis ?? '待教师应用复核意见并保存规范依据。'}</small></article>
          })}</div>
          <button className="primary-button" type="button" disabled={!progress.peerReview.submitted || Boolean(working && validation.valid)} onClick={() => onUpdate((current) => applyE02ReferenceCorrections(current, participantId))}><Wrench size={16} />{working ? '四项修正已应用' : '应用 4 项有据修正'}</button>
        </section>
        {working && <div className="e02-final-check-grid">
          <article><CheckCircle2 size={19} /><div><span>规范条款顺序</span><strong>{[...working.taskBook.steps].sort((a, b) => a.order - b.order).map((item) => item.clauseId).join(' → ')}</strong></div></article>
          <article><CheckCircle2 size={19} /><div><span>安全表述</span><strong>3 / 3 可执行、可观察</strong></div></article>
          <article><CheckCircle2 size={19} /><div><span>量规闭合</span><strong>{rubricScoreTotal(working)} / 100 分</strong></div></article>
          <article><CheckCircle2 size={19} /><div><span>人工核验</span><strong>{working.taskBook.steps.filter((item) => item.teacherReviewed).length + working.safetyChecklist.filter((item) => item.teacherReviewed).length + working.rubric.items.filter((item) => item.teacherReviewed).length} 项逐项确认</strong></div></article>
        </div>}
        <ValidationNotice messages={validation.messages} success="四项实质修改与依据完整，最终任务书、安全检查单和 100 分量规均已逐项核验。" />
        <div className="page-actions"><span>工作稿变化会使旧教师确认和当前通过失效，但不会删除 AI 原稿或历史</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入教师最终确认<ArrowRight size={17} /></button></div>
      </>
    )
  }

  if (progress.route === 'confirmation') {
    const finalValidation = validateE02FinalDraft(progress, directory)
    const validation = validateE02Confirmation(progress, directory)
    const packageCurrent = confirmedE02PackageIsCurrent(progress, directory)
    const checkedCount = Object.values(progress.teacherConfirmation).filter(Boolean).length
    return (
      <>
        <PageHeader
          eyebrow={routeLabels.confirmation}
          title="由教师确认规范、安全边界和三项最终成果"
          description="确认不是一个总勾选：规范、授权隐私、三项成果和最终责任四类事实必须分别留痕。"
          aside={<div className="metric-pill"><UserCheck size={19} /><span><strong>{checkedCount} / 4</strong><small>教师责任确认</small></span></div>}
        />
        <section className="content-card e02-confirmation-card">
          <div className="section-heading"><div><span className="eyebrow">TEACHER RESPONSIBILITY</span><h2>四项逐条确认</h2></div><span>{finalValidation.valid ? '最终稿已就绪' : '最终稿仍有缺项'}</span></div>
          <div className="e02-confirmation-list">{confirmationItems.map(([field, label, detail]) => <label key={field}><input type="checkbox" disabled={!finalValidation.valid} checked={progress.teacherConfirmation[field]} onChange={(event) => updateConfirmation(field, event.target.checked)} /><span><strong>{label}</strong><small>{detail}</small></span>{progress.teacherConfirmation[field] && <CheckCircle2 size={18} />}</label>)}</div>
          <button className="primary-button" type="button" disabled={!validation.valid} onClick={() => onUpdate((current) => ({ ...current, confirmedPackage: createConfirmedE02Package(current, directory) }))}><ShieldCheck size={17} />{packageCurrent ? '当前三项成果已确认' : '形成教师确认的三项成果'}</button>
        </section>
        <section className="content-card e02-artifact-section">
          <div className="section-heading"><div><span className="eyebrow">EXACTLY THREE OUTPUTS</span><h2>固定成果恰好 3 项</h2></div><span>{packageCurrent ? '当前指纹已确认' : '等待确认'}</span></div>
          <div className="e02-artifact-grid">{(progress.confirmedPackage?.artifacts ?? [
            { artifactId: 'E02:pending:task-book', kind: 'e02-task-book' as const, name: '实训任务书' as const },
            { artifactId: 'E02:pending:safety-checklist', kind: 'e02-safety-checklist' as const, name: '安全检查单' as const },
            { artifactId: 'E02:pending:rubric', kind: 'e02-rubric' as const, name: '100 分评分量规' as const },
          ]).map((artifact, index) => <article key={artifact.kind}><span>{index + 1}</span><div><strong>{artifact.name}</strong><p>{artifactDescription(index, progress)}</p><small>{artifact.artifactId}</small></div>{packageCurrent ? <CheckCircle2 size={21} /> : <FileText size={21} />}</article>)}</div>
          <p className="e02-slot-note"><BadgeCheck size={15} />三项任务成果共同构成 E02 的一个个人选修成果，不会在十类个人成果中占三个槽位。</p>
        </section>
        <ValidationNotice messages={validation.messages} success={packageCurrent ? '四项教师责任已确认，当前内容指纹对应的三项固定成果已形成。' : '四项教师责任已确认；请点击上方按钮形成当前三项固定成果。'} />
        <div className="page-actions"><span>规范、人员、复核、修正或确认变化后，旧历史保留，当前成果包失效</span><button className="primary-button" type="button" disabled={!packageCurrent} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div>
      </>
    )
  }

  const assessmentValidation = validateE02AssessmentSubmission(progress, directory)
  const passed = latestE02AssessmentIsCurrent(progress, directory)
  const packageCurrent = confirmedE02PackageIsCurrent(progress, directory)
  return (
    <>
      <PageHeader
        eyebrow={routeLabels.result}
        title={passed ? 'E02 当前验收已通过' : 'E02 五维评分与成果验收'}
        description="总分不低于 8 分、四项核心要求全部通过，且专业证据、人工迭代、安全三项硬门槛均为 2 分。"
        aside={<div className={passed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>}
      />
      <section className={passed ? 'result-banner passed' : 'result-banner'}>
        {passed ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
        <div><strong>{passed ? '当前验收通过，恰好三项成果已归档' : packageCurrent ? '三项成果已确认，等待提交验收' : '当前确认版仍有缺项'}</strong><p>95 分 AI 初稿 → 模拟同组复核 → 4 项有据修正 → 100 分教师确认版。</p></div>
        <span>{score.coreRequirements.filter((item) => item.passed).length} / 4 核心要求</span>
      </section>
      <div className="score-layout e02-score-layout">
        <section className="content-card e02-score-card"><div className="dimension-list">{score.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong>{['evidence', 'iteration', 'safety'].includes(dimension.id) && <em className="e02-hard-gate">硬门槛</em>}<p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section>
        <section className="content-card e02-requirement-card"><div className="requirement-list">{score.coreRequirements.map((requirement) => <button className={requirement.passed ? 'passed' : ''} type="button" key={requirement.id} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section>
      </div>
      <section className="e02-gate-summary">
        <div className={score.total >= 8 ? 'passed' : ''}><Scale size={18} /><span><strong>{score.total >= 8 ? '总分已达标' : '总分未达标'}</strong><small>{score.total} / 10，要求 ≥ 8</small></span></div>
        <div className={score.hardGatesPassed ? 'passed' : ''}><ShieldCheck size={18} /><span><strong>{score.hardGatesPassed ? '三项硬门槛通过' : '硬门槛未全部通过'}</strong><small>专业证据 · 人工迭代 · 安全</small></span></div>
        <div className={score.coreRequirementsPassed ? 'passed' : ''}><ListChecks size={18} /><span><strong>{score.coreRequirementsPassed ? '核心步骤完整' : '核心步骤仍有缺项'}</strong><small>{score.coreRequirements.filter((item) => item.passed).length} / 4</small></span></div>
      </section>
      <section className="content-card e02-result-artifacts">
        <div className="section-heading"><div><span className="eyebrow">ARCHIVE CONTRACT</span><h2>三项成果 · 一个选修槽位</h2></div><span>{passed ? '已同步归档' : '待当前验收'}</span></div>
        <div className="e02-artifact-grid">{(progress.confirmedPackage?.artifacts ?? []).map((artifact, index) => <article key={artifact.kind}><span>{index + 1}</span><div><strong>{artifact.name}</strong><p>{artifactDescription(index, progress)}</p><small>{artifact.artifactId}</small></div>{passed ? <CheckCircle2 size={21} /> : <FileCheck2 size={21} />}</article>)}</div>
      </section>
      <section className="content-card e02-assessment-card">
        <div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>初验与复验历史</h2></div><span>{progress.assessments.length} 次</span></div>
        {progress.assessments.length > 0 && <div className="e02-history-list">{progress.assessments.map((assessment, index) => <article key={assessment.assessmentId}><span>{assessment.attempt === 'initial' ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '待补验'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN', { hour12: false })}</small><em>{assessment.modificationSummary || '按当前内容指纹提交'}</em></article>)}</div>}
        {!passed && <button className="primary-button" type="button" disabled={!assessmentValidation.valid} onClick={() => onUpdate((current) => ({ ...current, assessments: [...current.assessments, createE02Assessment(current, directory, current.assessments.length ? '按当前任务书、复核与四项修改重新提交。' : '完成初稿问题识别、同组复核和四项有据修正。')] }))}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交验收'}</button>}
      </section>
      <ValidationNotice messages={assessmentValidation.messages} success="当前教师确认版、三项固定成果和全部验收证据已经齐备。" />
      <div className="page-actions"><span>实质内容变化后旧验收历史保留，当前通过按内容指纹自动失效</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 E02</button></div>
      {progress.attemptHistory.length > 0 && <p className="e02-attempt-note"><History size={15} />已保留 {progress.attemptHistory.length} 条规范、复核或确认变化前的完整快照。</p>}
    </>
  )
}
