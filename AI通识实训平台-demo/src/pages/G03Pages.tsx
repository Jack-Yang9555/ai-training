import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileStack,
  MessageSquareText,
  MonitorPlay,
  RotateCcw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { groupRoles } from '../data/trainingParticipants'
import { g03OutputNames } from '../g03/data'
import type {
  G03Contribution,
  G03IssueRecord,
  G03Participation,
  G03Progress,
  G03Route,
  G03RoundRecord,
  G03ScenarioCard,
} from '../g03/domain'
import {
  createG03Assessment,
  g03ArtifactsAreCurrent,
  g03Conditions,
  latestG03AssessmentIsCurrent,
  routeForG03Condition,
  validateG03Contributions,
  validateG03Issues,
  validateG03Matrix,
  validateG03Scenarios,
  validateG03Showcase,
} from '../g03/validation'

const participationOptions: G03Participation[] = ['测试他人', '接受测试', '操作', '讲解', '在线答问', '报告修改']

function TextField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="field"><span>{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

export function G03Overview({ progress, onNext }: { progress: G03Progress; onNext: () => void }) {
  const current = progress.memberEvidence.find((item) => item.isCurrentParticipant)
  return <>
    <PageHeader eyebrow="步骤 1 / 7 · 阶段验收说明" title="G03 课程知识库与 AI 助教综合测试及展示" description="汇总 M09 知识库、M10 助教配置和 M11 学生答疑测试的当前证据，完成全员双向测试核对、三场景演示、A/B 两轮展示和贡献确认。G03 不重复执行三个个人任务，也不采用数值评分。" aside={<div className="metric-pill"><UsersRound size={18} /><span><strong>30 分钟</strong><small>{progress.groupName} · 小组共创</small></span></div>} />
    <section className="content-card m04-flow-card">
      <div className="section-heading"><div><span className="eyebrow">GROUP MILESTONE</span><h2>证据汇总 → 现场演示 → 四条件验收</h2></div><span>不计分</span></div>
      <div className="m04-flow-grid">{[['01','任务说明'],['02','双向矩阵'],['03','问题修正'],['04','三场景卡'],['05','两轮展示'],['06','全员贡献'],['07','阶段验收']].map(([number, label]) => <article key={number}><span>{number}</span><strong>{label}</strong></article>)}</div>
    </section>
    <div className="g02-member-grid">
      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">CURRENT TEACHER EVIDENCE</span><h2>本人三项当前证据</h2></div><span>{current?.taskEvidence.filter((item) => item.source === '真实本地证据' && item.current).length ?? 0} / 3 项真实</span></div>
        <div className="g02-evidence-list">{current?.taskEvidence.map((item) => <article key={item.taskId}><FileSearch size={18} /><span><strong>{item.taskId} · {item.version || '版本缺失'}</strong><small>{item.artifactId || '尚未读取当前有效成果'}</small></span><em>{item.source}</em></article>)}</div>
      </section>
      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">FIXED OUTPUTS</span><h2>通过后恰好归档 3 项</h2></div></div>
        <div className="output-list">{g03OutputNames.map((name) => <span key={name}>{name}</span>)}</div>
      </section>
    </div>
    <div className="review-source-note"><ShieldCheck size={18} /><div><strong>真实证据与 Demo 模拟边界</strong><p>当前教师必须使用本人真实 M09、M10、M11 当前成果；其他成员在无多人后端时按 participantId 确定性模拟并醒目标注，模拟内容不会反写个人任务。</p></div></div>
    <div className="page-actions"><span>四项条件全部通过才生成成果；未通过初验也会保存失败条件</span><button className="primary-button" type="button" onClick={onNext}>核对双向测试矩阵<ArrowRight size={17} /></button></div>
  </>
}

export function G03MatrixPage({ progress, onConfirm, onNext }: { progress: G03Progress; onConfirm: (confirmed: boolean) => void; onNext: () => void }) {
  const validation = validateG03Matrix(progress)
  return <>
    <PageHeader eyebrow="步骤 2 / 7 · 小组测试覆盖矩阵" title="逐人核对测试他人和接受测试" description="矩阵读取 M11 当前确认包；测试对象不得是本人。当前教师出向为真实本地复测，入向为无多人后端下的确定性模拟回传；其他成员同样醒目标注模拟来源，不冒充多人在线提交。" />
    <div className="g02-member-grid">{progress.testMatrix.map((row) => <section className="content-card" key={row.participantId}>
      <div className="section-heading"><div><span className="eyebrow">{row.participantId === progress.currentParticipantId ? 'CURRENT TEACHER' : 'GROUP MEMBER'}</span><h2>{row.participantName}</h2></div><span>{row.submitted ? '记录已提交' : '记录缺失'}</span></div>
      <div className="g02-evidence-list">
        <article><UsersRound size={18} /><span><strong>测试他人：{row.testedParticipantName}</strong><small>{row.testedRecordId || '缺少 M11 测试记录编号'}</small></span><em>{row.participantId === progress.currentParticipantId ? '真实本地复测记录' : row.source}</em></article>
        <article><UsersRound size={18} /><span><strong>接受测试：{row.acceptedTestFromParticipantName}</strong><small>{row.acceptedRecordId || '缺少 M11 被测试记录编号'}</small></span><em>{row.participantId === progress.currentParticipantId ? '确定性模拟回传记录' : row.source}</em></article>
      </div>
    </section>)}</div>
    <label className="content-card confirmation-inline"><input type="checkbox" checked={progress.matrixConfirmed} onChange={(event) => onConfirm(event.target.checked)} /><span><strong>小组已按 participantId 逐人核对双向覆盖</strong><small>人员变化后本确认和当前验收会失效</small></span></label>
    <ValidationNotice messages={validation.messages} success="全员均完成一次测试他人和一次接受测试；本人出向读取真实 M11 复测，入向保留明确的无后端模拟披露。" />
    <div className="page-actions"><span>{progress.testMatrix.filter((row) => row.source === '确定性模拟组员证据').length} 名其他成员为明确标注的 Demo 模拟记录</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>汇总问题、修改与复测<ArrowRight size={17} /></button></div>
  </>
}

export function G03IssuesPage({ progress, onUpdateIssue, onConfirm, onNext }: { progress: G03Progress; onUpdateIssue: (issueId: string, patch: Partial<G03IssueRecord>) => void; onConfirm: (confirmed: boolean) => void; onNext: () => void }) {
  const validation = validateG03Issues(progress)
  return <>
    <PageHeader eyebrow="步骤 3 / 7 · 问题与修正汇总" title="从 M09—M11 证据中定位至少一条完整闭环" description="问题和修改内容来自原任务，不在 G03 重填。小组只确认负责人、来源记录和复测结论，综合报告必须能追溯到原成果编号。" />
    <div className="g02-member-grid">{progress.issues.map((issue) => <section className="content-card" key={issue.issueId}>
      <div className="section-heading"><div><span className="eyebrow">{issue.sourceTask} TRACE</span><h2>{issue.problem}</h2></div><span>{issue.source}</span></div>
      <div className="g02-evidence-list">
        <article><FileSearch size={18} /><span><strong>来源记录</strong><small>{issue.sourceEvidenceId}</small></span><em>{issue.sourceTask}</em></article>
        <article><ClipboardCheck size={18} /><span><strong>修改内容</strong><small>{issue.correction}</small></span><em>{issue.correctionEvidenceId}</em></article>
      </div>
      <div className="form-grid">
        <label className="field"><span>修改负责人</span><select value={issue.responsibleParticipantId} onChange={(event) => onUpdateIssue(issue.issueId, { responsibleParticipantId: event.target.value })}>{progress.memberEvidence.map((member) => <option value={member.participantId} key={member.participantId}>{member.participantName}</option>)}</select></label>
        <label className="field"><span>复测结果</span><select value={issue.retestResult} onChange={(event) => onUpdateIssue(issue.issueId, { retestResult: event.target.value as G03IssueRecord['retestResult'] })}><option>已通过</option><option>仍需修改</option></select></label>
      </div>
      <p className="muted-copy">复测证据：{issue.retestEvidenceId}</p>
    </section>)}</div>
    {progress.issues.length === 0 && <section className="content-card"><h2>尚无可汇入的问题闭环</h2><p className="muted-copy">请先在 M09、M10 或 M11 完成一次问题修改和同题复测；G03 不允许现场补写模拟问题替代。</p></section>}
    <label className="content-card confirmation-inline"><input type="checkbox" checked={progress.reportConfirmed} onChange={(event) => onConfirm(event.target.checked)} /><span><strong>小组确认综合报告只汇总原任务证据</strong><small>已逐项核对来源任务、问题、修改、负责人和复测记录</small></span></label>
    <ValidationNotice messages={validation.messages} success="本人 M09—M11 当前证据齐全，至少一条问题—修改—负责人—复测闭环可追溯。" />
    <div className="page-actions"><span>修改负责人或复测结论属于 G03 报告内容，变化后旧验收失效</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>核对三场景演示卡<ArrowRight size={17} /></button></div>
  </>
}

function scenarioDetail(card: G03ScenarioCard) {
  if (card.kind === '有来源回答') return <details><summary>打开来源位置：{card.sourceLocation || '位置缺失'}</summary><p>{card.sourceExcerpt || '原文片段缺失'}</p><small>来源编号：{card.sourceId || '缺失'}</small></details>
  if (card.kind === '缺失条件追问') return <p className="muted-copy"><strong>明确追问的缺失条件：</strong>{card.missingCondition || '尚未记录'}</p>
  return <p className="muted-copy"><strong>知识边界：</strong>{card.boundaryStatement || '尚未记录'}<br /><strong>人工转交：</strong>{card.handoffTarget || '尚未记录'}</p>
}

export function G03ScenariosPage({ progress, onUpdate, onNext }: { progress: G03Progress; onUpdate: (scenarioId: string, patch: Partial<G03ScenarioCard>) => void; onNext: () => void }) {
  const validation = validateG03Scenarios(progress)
  return <>
    <PageHeader eyebrow="步骤 4 / 7 · 三场景核心演示台" title="用三张卡演示助教最关键的可信行为" description="三张卡直接读取当前教师 M10/M11 当前证据：有据回答来自 M10 正常预览，条件追问与越界转交来自 M11 复测，不重跑 M11 五类完整测试。" />
    <div className="m03-artifact-grid">{progress.scenarios.map((card, index) => <article key={card.scenarioId}>
      <span className="eyebrow">SCENE {index + 1} · 来源任务 {card.sourceTaskId} · {card.source}</span><strong>{card.kind}</strong>
      <p><strong>学生：</strong>{card.question || '问题缺失'}</p><p><strong>助教：</strong>{card.answer || '回答缺失'}</p>
      {scenarioDetail(card)}
      <small>证据编号：{card.evidenceId || '缺失'} · {card.noFalseCitation ? '无虚假引用' : '引用待核验'}</small>
      <label className="confirmation-inline"><input type="checkbox" checked={card.confirmed} onChange={(event) => onUpdate(card.scenarioId, { confirmed: event.target.checked })} /><span><strong>确认该卡现场行为与原证据一致</strong></span></label>
    </article>)}</div>
    <ValidationNotice messages={validation.messages} success="三类场景齐全：来源可定位、追问条件具体、越界无虚假引用且有人工转交。" />
    <div className="page-actions"><span>越界卡不得携带伪造来源；有据卡必须能展开原文位置</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>安排 A/B 两批两轮展示<ArrowRight size={17} /></button></div>
  </>
}

export function G03ShowcasePage({ progress, onConfirmPlan, onUpdateRound, onNext }: { progress: G03Progress; onConfirmPlan: (confirmed: boolean) => void; onUpdateRound: (round: 1 | 2, patch: Partial<G03RoundRecord>) => void; onNext: () => void }) {
  const validation = validateG03Showcase(progress), plan = progress.showcase
  return <>
    <PageHeader eyebrow="步骤 5 / 7 · A/B 两批与两轮" title="第一轮 A 展示，第二轮 B 展示" description="平台记录轮次、实际演示时长和答问状态，不强制浏览器真实等待。现场仍按 5 分钟准备、两轮各 10 分钟、最后 5 分钟汇总执行。" aside={<div className="metric-pill"><MonitorPlay size={18} /><span><strong>当前 {plan.currentBatch} 批</strong><small>{progress.groupName}</small></span></div>} />
    <section className="content-card">
      <div className="section-heading"><div><span className="eyebrow">BATCH ASSIGNMENT</span><h2>全班小组自动分批</h2></div><span>{plan.batchAssignments.length} 个小组</span></div>
      <div className="g02-showcase-lanes">{plan.batchAssignments.map((item) => <article key={item.groupId}><span>{item.batch} 批</span><strong>{item.groupName}</strong><small>{item.groupId === progress.groupId ? '当前小组' : '其他小组'}</small></article>)}</div>
      <p className="muted-copy">{plan.oddGroupNotice}</p>
      <label className="confirmation-inline"><input type="checkbox" checked={plan.planConfirmed} onChange={(event) => onConfirmPlan(event.target.checked)} /><span><strong>确认 5 + 10 + 10 + 5 分钟现场安排与成员角色</strong></span></label>
    </section>
    <div className="g02-member-grid">{plan.rounds.map((round) => <section className="content-card" key={round.round}>
      <div className="section-heading"><div><span className="eyebrow">ROUND {round.round}</span><h2>{round.displayBatch} 批展示 / {round.experienceBatch} 批体验</h2></div><span>本组：{round.currentGroupRole}</span></div>
      {round.currentGroupRole === '展示' ? <div className="form-grid">
        <label className="field"><span>核心演示实际时长（秒，≤180）</span><input type="number" min="1" max="180" value={round.coreDemoSeconds} onChange={(event) => onUpdateRound(round.round, { coreDemoSeconds: Number(event.target.value), completed: false })} /></label>
        <label className="field"><span>在线答问实际时长（秒，≥120）</span><input type="number" min="0" value={round.qaSeconds} onChange={(event) => onUpdateRound(round.round, { qaSeconds: Number(event.target.value), qaCompleted: false, completed: false })} /></label>
        <label className="confirmation-inline"><input type="checkbox" checked={round.qaCompleted} onChange={(event) => onUpdateRound(round.round, { qaCompleted: event.target.checked, completed: false })} /><span><strong>2 分钟在线答问已完成</strong></span></label>
      </div> : <p className="muted-copy">本轮体验另一批展示，依次核对三场景行为并记录反馈。</p>}
      <p className="g02-feedback-copy"><MessageSquareText size={20} />{round.experienceFeedback}<small>{round.feedbackSource}</small></p>
      <label className="confirmation-inline"><input type="checkbox" checked={round.completed} onChange={(event) => onUpdateRound(round.round, { completed: event.target.checked })} /><span><strong>第 {round.round} 轮{round.currentGroupRole}记录已完成</strong></span></label>
    </section>)}</div>
    <ValidationNotice messages={validation.messages} success="A/B 两轮均已完成；本组演示不超过 3 分钟并保存不少于 2 分钟在线答问。" />
    <div className="page-actions"><span>体验反馈为确定性模拟时已明确标记，不冒充真实跨组在线消息</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>逐人确认角色与贡献<ArrowRight size={17} /></button></div>
  </>
}

export function G03ContributionsPage({ progress, onUpdate, onNext }: { progress: G03Progress; onUpdate: (participantId: string, patch: Partial<G03Contribution>) => void; onNext: () => void }) {
  const validation = validateG03Contributions(progress)
  return <>
    <PageHeader eyebrow="步骤 6 / 7 · 成员角色与贡献" title="每位成员逐项确认可识别参与" description="不要求每人承担全部角色；每位成员至少承担操作、讲解或在线答问中的一项，并关联测试、修改、演示或答问证据。" />
    <div className="g02-contribution-list">{progress.contributions.map((item) => <article key={item.participantId}>
      <div className="section-heading"><div><span className="eyebrow">{item.source}</span><h2>{item.participantName}</h2></div><span>{item.confirmed ? '本人已确认' : '待本人确认'}</span></div>
      <div className="form-grid">
        <label className="field"><span>任务角色</span><select value={item.role} onChange={(event) => onUpdate(item.participantId, { role: event.target.value as G03Contribution['role'], confirmed: false })}>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <label className="field"><span>证据引用</span><select value={item.evidenceId} onChange={(event) => onUpdate(item.participantId, { evidenceId: event.target.value, confirmed: false })}>{progress.memberEvidence.find((member) => member.participantId === item.participantId)?.taskEvidence.map((evidence) => <option value={evidence.artifactId} key={evidence.taskId}>{evidence.taskId} · {evidence.artifactId || '证据缺失'}</option>)}</select></label>
      </div>
      <div className="m07-field-checks">{participationOptions.map((kind) => <label key={kind}><input type="checkbox" checked={item.participation.includes(kind)} onChange={(event) => onUpdate(item.participantId, { participation: event.target.checked ? [...item.participation, kind] : item.participation.filter((value) => value !== kind), confirmed: false })} />{kind}</label>)}</div>
      <TextField label="具体贡献" rows={2} value={item.contribution} onChange={(contribution) => onUpdate(item.participantId, { contribution, confirmed: false })} />
      <label className="confirmation-inline"><input type="checkbox" checked={item.confirmed} onChange={(event) => onUpdate(item.participantId, { confirmed: event.target.checked })} /><span><strong>{item.participantName} 逐项确认以上角色、参与和证据</strong></span></label>
    </article>)}</div>
    <ValidationNotice messages={validation.messages} success="全员均有操作、讲解或在线答问中的至少一项可识别参与，并逐人确认。" />
    <div className="page-actions"><span>其他成员贡献为确定性预填，但仍须在本页逐项确认</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入 G03 四条件验收<ArrowRight size={17} /></button></div>
  </>
}

export function G03AssessmentPage({ progress, onNavigate, onUpdateSummary, onSubmit, onReset }: { progress: G03Progress; onNavigate: (route: G03Route) => void; onUpdateSummary: (value: string) => void; onSubmit: () => void; onReset: () => void }) {
  const conditions = g03Conditions(progress), currentPassed = latestG03AssessmentIsCurrent(progress), artifactsCurrent = g03ArtifactsAreCurrent(progress), latest = progress.assessments.at(-1)
  const canSubmit = progress.assessments.length === 0 || Boolean(progress.assessmentModificationSummary.trim())
  return <>
    <PageHeader eyebrow="步骤 7 / 7 · 阶段验收" title={currentPassed ? 'G03 阶段验收已通过' : latest ? 'G03 当前证据需补验' : 'G03 四条件验收'} description="G03 不采用 10 分制。初验允许保存未通过及失败条件；修改后提交补验并填写摘要。人员、来源或现场记录变化时旧历史保留，但当前通过失效。" aside={<div className={currentPassed ? 'result-score passed' : 'result-score'}><strong>{conditions.filter((item) => item.passed).length}</strong><span>/ 4 项</span></div>} />
    <section className={currentPassed ? 'result-banner passed' : 'result-banner'}>{currentPassed ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}<div><strong>{currentPassed ? '四项条件全部通过，三项小组成果已归档' : '四项条件必须同时通过'}</strong><p>双向覆盖、三场景、A/B 两轮与全员贡献、问题修改复测报告，缺一不可。</p></div><span>{progress.currentStatus}</span></section>
    <section className="content-card requirement-card"><div className="requirement-list">{conditions.map((condition) => <button type="button" className={condition.passed ? 'passed' : ''} key={condition.id} onClick={() => onNavigate(routeForG03Condition(condition.id))}>{condition.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{condition.label}</strong><small>{condition.evidence}</small></span>{!condition.passed && <ArrowRight size={16} />}</button>)}</div></section>
    <section className="content-card artifact-section"><div className="section-heading"><div><span className="eyebrow">GROUP OUTPUTS</span><h2>恰好 3 项小组成果</h2></div><span>{artifactsCurrent ? '当前成果已归档' : '四项通过后归档'}</span></div><div className="m03-artifact-grid">{g03OutputNames.map((name, index) => <article key={name}><FileStack size={20} /><strong>{name}</strong><p>{index === 0 ? '包含双向矩阵、M09—M11 问题、修改、负责人和复测记录。' : index === 1 ? '包含三场景、A/B 两轮、3 分钟演示和 2 分钟在线答问。' : '包含全员任务角色、参与类型、具体贡献、证据和逐人确认。'}</p></article>)}</div></section>
    <section className="content-card m03-assessment-panel"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>初验与补验历史</h2></div><span>{progress.assessments.length} 次提交</span></div>{progress.assessments.length > 0 && <div className="m03-assessment-history">{progress.assessments.map((assessment) => <article key={assessment.assessmentId}><span>{assessment.phase}</span><strong>{assessment.outcome} · {assessment.conditions.filter((item) => item.passed).length}/4 项</strong><small>{new Date(assessment.submittedAt).toLocaleString('zh-CN')} · 失败条件 {assessment.failedConditionIds.length} 项</small>{assessment.modificationSummary && <p>{assessment.modificationSummary}</p>}</article>)}</div>}{progress.assessments.length > 0 && !currentPassed && <TextField label="补验修改摘要" value={progress.assessmentModificationSummary} onChange={onUpdateSummary} />}{!currentPassed && <button className="primary-button" type="button" disabled={!canSubmit} onClick={onSubmit}><ClipboardCheck size={17} />{progress.assessments.length ? '提交补验' : '提交初验'}</button>}</section>
    <div className="page-actions"><span>{currentPassed ? '当前证据指纹只归档一次三项成果' : '初验即使未通过也会保存失败条件，不生成成果'}</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置当前小组 G03</button></div>
  </>
}

export interface G03WorkspacePageProps {
  progress: G03Progress
  onUpdate: (updater: (current: G03Progress) => G03Progress) => void
  onNavigate?: (route: G03Route) => void
  onSubmitAssessment?: () => void
  onReset: () => void
}

export function G03WorkspacePage({ progress, onUpdate, onNavigate, onSubmitAssessment, onReset }: G03WorkspacePageProps) {
  const navigate = (route: G03Route) => onNavigate ? onNavigate(route) : onUpdate((current) => ({ ...current, route }))
  const submit = () => {
    if (onSubmitAssessment) { onSubmitAssessment(); return }
    onUpdate((current) => {
      const result = createG03Assessment(current)
      return { ...current, assessments: [...current.assessments, result.assessment], artifacts: result.artifacts, assessmentModificationSummary: '' }
    })
  }
  if (progress.route === 'overview') return <G03Overview progress={progress} onNext={() => navigate('matrix')} />
  if (progress.route === 'matrix') return <G03MatrixPage progress={progress} onConfirm={(matrixConfirmed) => onUpdate((current) => ({ ...current, matrixConfirmed }))} onNext={() => navigate('issues')} />
  if (progress.route === 'issues') return <G03IssuesPage progress={progress} onUpdateIssue={(issueId, patch) => onUpdate((current) => ({ ...current, issues: current.issues.map((item) => item.issueId === issueId ? { ...item, ...patch } : item), reportConfirmed: false }))} onConfirm={(reportConfirmed) => onUpdate((current) => ({ ...current, reportConfirmed }))} onNext={() => navigate('scenarios')} />
  if (progress.route === 'scenarios') return <G03ScenariosPage progress={progress} onUpdate={(scenarioId, patch) => onUpdate((current) => ({ ...current, scenarios: current.scenarios.map((item) => item.scenarioId === scenarioId ? { ...item, ...patch } : item) }))} onNext={() => navigate('showcase')} />
  if (progress.route === 'showcase') return <G03ShowcasePage progress={progress} onConfirmPlan={(planConfirmed) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, planConfirmed } }))} onUpdateRound={(round, patch) => onUpdate((current) => ({ ...current, showcase: { ...current.showcase, rounds: current.showcase.rounds.map((item) => item.round === round ? { ...item, ...patch } : item) as [G03RoundRecord, G03RoundRecord] } }))} onNext={() => navigate('contributions')} />
  if (progress.route === 'contributions') return <G03ContributionsPage progress={progress} onUpdate={(participantId, patch) => onUpdate((current) => ({ ...current, contributions: current.contributions.map((item) => item.participantId === participantId ? { ...item, ...patch } : item) }))} onNext={() => navigate('assessment')} />
  return <G03AssessmentPage progress={progress} onNavigate={navigate} onUpdateSummary={(assessmentModificationSummary) => onUpdate((current) => ({ ...current, assessmentModificationSummary }))} onSubmit={submit} onReset={onReset} />
}
