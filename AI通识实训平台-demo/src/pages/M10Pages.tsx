import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  History,
  Link2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { m10ElementMeta } from '../m10/data'
import type {
  M10BoundaryAction,
  M10BoundaryRule,
  M10FlowStep,
  M10Progress,
  M10Route,
  M10SixElements,
  M10TeacherConfirmation,
} from '../m10/domain'
import {
  applyM10ReferenceRevision,
  eligibleM10Reviewers,
  invalidateM10Confirmation,
  invalidateM10DerivedWork,
  invalidateM10ReviewContext,
  LocalM10AssistantRunner,
  simulateM10PeerReview,
} from '../m10/runner'
import { calculateM10Score, createM10Assessment } from '../m10/scoring'
import { createConfirmedM10Assistant } from '../m10/storage'
import {
  confirmedM10AssistantIsCurrent,
  latestM10AssessmentIsCurrent,
  validateM10Boundaries,
  validateM10Configuration,
  validateM10Flow,
  validateM10PeerReview,
  validateM10Previews,
  validateM10Revision,
  validateM10Source,
  validateM10Confirmation,
} from '../m10/validation'
import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

const runner = new LocalM10AssistantRunner()
const groupRoles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']
const allowedActions: M10BoundaryAction[] = ['追问', '拒绝并引导', '说明边界并转交', '暂停并转交']

const routeLabels: Record<M10Route, string> = {
  overview: '步骤 1 / 8 · 任务说明',
  source: '步骤 2 / 8 · 绑定 M09 知识库',
  configuration: '步骤 3 / 8 · 六要素配置',
  flow: '步骤 4 / 8 · 固定四步流程',
  boundaries: '步骤 5 / 8 · 五类边界规则',
  preview: '步骤 6 / 8 · 正常与边界预览',
  'review-confirm': '步骤 7 / 8 · 同组互评与教师确认',
  result: '步骤 8 / 8 · 评分与成果',
}

const confirmationItems: Array<[keyof M10TeacherConfirmation, string, string]> = [
  ['knowledgeSourceConfirmed', '知识来源已确认', '只绑定本人 M09 当前通过的知识库 v1.0。'],
  ['roleBoundaryConfirmed', '角色与教师责任已确认', '助教只做答疑与学习支持，不替代教师最终判断。'],
  ['fourStepFlowConfirmed', '固定四步流程已确认', '了解问题、检索、引用解释、检查理解的动作与失败处理可执行。'],
  ['fiveRulesConfirmed', '五类边界规则已确认', '超范围、代做、安全、最终成绩和敏感数据均有规范回应与转交。'],
  ['humanTakeoverResponsibilityConfirmed', '最终人工接管责任已确认', '低置信度、安全和关键教学决策由教师接管。'],
]

export interface M10WorkspacePageProps {
  progress: M10Progress
  participantId: string
  directory: ParticipantDirectory
  onUpdate: (updater: (current: M10Progress) => M10Progress) => void
  onNavigate: (route: M10Route) => void
  onNext: () => void
  onReset: () => void
  onOpenM09?: () => void
}

function TextField({ label, value, onChange, rows = 3, readOnly = false }: { label: string; value: string; onChange?: (value: string) => void; rows?: number; readOnly?: boolean }) {
  return <label className="field"><span>{label}</span><textarea rows={rows} value={value} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} /></label>
}

function updateSixElement(progress: M10Progress, key: keyof M10SixElements, value: string) {
  const base = invalidateM10DerivedWork(progress, '六要素发生变化')
  return { ...base, sixElements: { ...base.sixElements, [key]: value } }
}

function updateFlowStep(progress: M10Progress, stepId: M10FlowStep['stepId'], patch: Partial<M10FlowStep>) {
  const base = invalidateM10DerivedWork(progress, '四步流程发生变化')
  return { ...base, flowSteps: base.flowSteps.map((step) => step.stepId === stepId ? { ...step, ...patch, stepId: step.stepId, order: step.order, label: step.label } : step) }
}

function updateBoundaryRule(progress: M10Progress, ruleId: string, patch: Partial<M10BoundaryRule>) {
  const base = invalidateM10DerivedWork(progress, '五类边界规则发生变化')
  return { ...base, boundaryRules: base.boundaryRules.map((rule) => rule.ruleId === ruleId ? { ...rule, ...patch, ruleId: rule.ruleId, type: rule.type, label: rule.label } : rule) }
}

function PreviewCard({ record }: { record: M10Progress['previews'][number] }) {
  return <article className={`content-card ${record.kind === 'boundary' ? 'issue' : ''}`}>
    <div className="section-heading"><div><span className="eyebrow">{record.kind === 'normal' ? 'NORMAL QUESTION' : 'BOUNDARY QUESTION'}</span><h2>{record.kind === 'normal' ? '正常问题预览' : '边界问题预览'}</h2></div>{record.kind === 'normal' ? <CheckCircle2 size={20} /> : <ShieldCheck size={20} />}</div>
    <p><strong>学生：</strong>{record.question}</p><p className="m09-answer"><small>只读的本地确定性原始预览</small>{record.rawAnswer}</p>
    {record.source && <details className="m09-evidence"><summary><Link2 size={15} />打开命中来源 · {record.source.sourceLabel}</summary><p><mark>{record.source.excerpt}</mark></p></details>}
    {record.triggeredRuleId && <div className="review-source-note"><LockKeyhole size={17} /><div><strong>{record.triggeredRuleId} · {record.triggeredRuleLabel}</strong><p>无伪造引用；转交：{record.handoff}</p></div></div>}
    <div className="m09-journey-grid">{record.trace.map((step) => <article key={step.stepId}><span>{String(step.order).padStart(2, '0')}</span><strong>{step.label}</strong><small>{step.detail}</small></article>)}</div>
  </article>
}

export function M10WorkspacePage({ progress, participantId, directory, onUpdate, onNavigate, onNext, onReset, onOpenM09 }: M10WorkspacePageProps) {
  const score = useMemo(() => calculateM10Score(progress, directory), [progress, directory])
  const reviewers = eligibleM10Reviewers(directory)

  if (progress.route === 'overview') return <>
    <PageHeader eyebrow={routeLabels.overview} title="课程 AI 助教配置" description="把 M09 已通过知识库变成“会正确教学”的助教：配置六要素、固定四步回答流程和五类边界，再经互评与实质修改形成 v1.0。" aside={<div className="metric-pill"><Bot size={19} /><span><strong>75 分钟</strong><small>个人主作 · 小组互评</small></span></div>} />
    <section className="content-card"><div className="section-heading"><div><span className="eyebrow">SOURCE → RULES → PREVIEW → REVIEW</span><h2>回答“对”之前，先配置“如何回答”</h2></div></div><div className="m09-journey-grid">{[['01','M09 硬输入'],['02','六要素'],['03','固定四步'],['04','五类边界'],['05','正常/边界预览'],['06','同组互评'],['07','实质修改'],['08','确认 v1.0']].map(([number, label]) => <article key={number}><span>{number}</span><strong>{label}</strong></article>)}</div></section>
    <div className="e03-overview-grid"><article className="content-card"><span>01</span><div><strong>不重复建知识库</strong><p>M10 只读取本人 M09 当前通过的 v1.0；失效时不用样例补位。</p></div></article><article className="content-card"><span>02</span><div><strong>不暴露工程参数</strong><p>教师配置教学含义，不填系统提示词、温度或节点编排。</p></div></article><article className="content-card"><span>03</span><div><strong>预览不代替 M11</strong><p>本任务只用两道问题确认配置可运行，不冒充学生端五类黑盒测试。</p></div></article><article className="content-card"><span>04</span><div><strong>成果恰好 2 项</strong><p>任务证据分两项归档，个人成果中仍只占“课程 AI 助教”1 个槽位。</p></div></article></div>
    <section className="e03-pass-rule"><ShieldCheck size={21} /><div><strong>总分 ≥ 8，且专业证据、人工迭代、安全均为 2 分</strong><p>五类边界或人工接管不能用其他得分抵消。</p></div></section>
    <div className="page-actions"><span>本地确定性模拟 · 无真实模型、多人后端或发布服务</span><button className="primary-button" type="button" onClick={onNext}>检查 M09 输入<ArrowRight size={17} /></button></div>
  </>

  if (progress.route === 'source') {
    const validation = validateM10Source(progress, participantId)
    const source = progress.knowledgeSource
    return <>
      <PageHeader eyebrow={routeLabels.source} title="只绑定本人 M09 当前有效知识库" description="页面只读展示知识库、版本、资料数、范围和验收号。M09 未通过、来源换版或人员不匹配时会硬阻断。" />
      {!source && <section className="content-card empty-state"><LockKeyhole size={30} /><h2>未发现当前 M09 通过证据</h2><p>请先由当前教师在 M09 形成知识库 v1.0 并提交通过验收。该页不会用演示知识库替代。</p>{onOpenM09 && <button className="primary-button" type="button" onClick={onOpenM09}>返回 M09 完成知识库</button>}</section>}
      {source && <><section className="content-card"><div className="section-heading"><div><span className="eyebrow">M09 CURRENT EVIDENCE</span><h2>{source.courseName} · 课程知识库 {source.version}</h2></div><span className="status-pill completed">当前通过</span></div><div className="m09-metric-grid"><article><strong>{source.sourceCount}</strong><span>已审核资料</span></article><article><strong>{source.segmentCount}</strong><span>可定位片段</span></article><article><strong>{source.version}</strong><span>当前版本</span></article><article><strong>{source.m09AssessmentId}</strong><span>M09 验收号</span></article></div><div className="e03-measure-list"><article><dl><div><dt>知识库编号</dt><dd>{source.knowledgeBaseId}</dd></div><div><dt>学员</dt><dd>{source.participantId} · {source.audience}</dd></div></dl></article><article><dl><div><dt>适用范围</dt><dd>{source.scope}</dd></div><div><dt>来源指纹</dt><dd>{source.sourceFingerprint}</dd></div></dl></article></div></section><details className="content-card m09-evidence"><summary><Database size={17} />查看用于正常问题预览的可定位片段</summary><p><strong>{source.previewSegment.segmentId} · {source.previewSegment.sourceLabel}</strong></p><p><mark>{source.previewSegment.excerpt}</mark></p></details></>}
      <ValidationNotice messages={validation.messages} success="已绑定当前教师 M09 真实通过证据；当来源版本或验收指纹变化时，M10 当前通过会失效但历史保留。" />
      <div className="page-actions"><span>一次只绑定 1 个当前知识库快照</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>配置六要素<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'configuration') {
    const validation = validateM10Configuration(progress, participantId)
    return <>
      <PageHeader eyebrow={routeLabels.configuration} title="用教学语言配置角色、对象、任务、知识、流程和边界" description="六格分别保存并参照当前课程证据；不暴露系统提示词、温度或节点编排。" aside={<button className="primary-button" type="button" disabled={!progress.knowledgeSource} onClick={() => onUpdate((current) => { if (!current.knowledgeSource) return current; const base = invalidateM10DerivedWork(current, '重新载入六要素安全草案'); return { ...base, ...runner.configure(current.knowledgeSource) } })}><Sparkles size={17} />载入安全配置草案</button>} />
      <div className="e03-overview-grid">{m10ElementMeta.map((item, index) => <section className="content-card" key={item.id}><div className="section-heading"><div><span className="eyebrow">0{index + 1} · {item.label}</span><h2>{item.meaning}</h2></div></div><TextField label={`${item.label}配置`} value={progress.sixElements[item.id]} rows={5} onChange={(value) => onUpdate((current) => updateSixElement(current, item.id, value))} /><small>{item.example}</small></section>)}</div>
      <ValidationNotice messages={validation.messages} success="六要素已分别完整保存；知识指向当前 M09 v1.0，角色和任务保留教师责任。" />
      <div className="page-actions"><span>配置变化后旧预览、互评和确认失效</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>设置固定四步<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'flow') {
    const validation = validateM10Flow(progress, participantId)
    return <>
      <PageHeader eyebrow={routeLabels.flow} title="回答顺序固定，只配置每步动作与失败处理" description="四步不允许删除或调序。检索失败须进入边界处理；检查理解必须让学生表达或自检，不得代做。" />
      <div className="m09-quality-list">{progress.flowSteps.map((step) => <section className="content-card" key={step.stepId}><div className="section-heading"><div><span className="eyebrow">STEP {step.order} · FIXED</span><h2>{step.label}</h2></div><span className="status-pill">不可删除/调序</span></div><div className="form-grid"><TextField label="助教动作" value={step.action} rows={4} onChange={(action) => onUpdate((current) => updateFlowStep(current, step.stepId, { action }))} /><TextField label="失败或不确定处理" value={step.failureHandling} rows={4} onChange={(failureHandling) => onUpdate((current) => updateFlowStep(current, step.stepId, { failureHandling }))} /></div></section>)}</div>
      <ValidationNotice messages={validation.messages} success="四步顺序、动作和失败处理完整；检索失败进入边界，检查理解不代做。" />
      <div className="page-actions"><span>四步将原样出现在两道配置预览中</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>设置五类边界<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'boundaries') {
    const validation = validateM10Boundaries(progress, participantId)
    return <>
      <PageHeader eyebrow={routeLabels.boundaries} title="五类边界逐项配置，禁止越权动作" description="每类保存触发条件、合法动作、规范回应和转交对象。可选动作只有追问、拒绝并引导、说明边界并转交、暂停并转交。" />
      <div className="m09-quality-list">{progress.boundaryRules.map((rule) => <section className="content-card" key={rule.ruleId}><div className="section-heading"><div><span className="eyebrow">{rule.ruleId} · {rule.type}</span><h2>{rule.label}</h2></div><ShieldCheck size={19} /></div><TextField label="触发条件" value={rule.trigger} onChange={(trigger) => onUpdate((current) => updateBoundaryRule(current, rule.ruleId, { trigger }))} /><label className="field"><span>回应动作（受控单选）</span><select value={rule.action} onChange={(event) => onUpdate((current) => updateBoundaryRule(current, rule.ruleId, { action: event.target.value as M10BoundaryAction }))}>{allowedActions.map((action) => <option key={action}>{action}</option>)}</select></label><TextField label="规范回应" value={rule.response} onChange={(response) => onUpdate((current) => updateBoundaryRule(current, rule.ruleId, { response }))} /><TextField label="转交对象" value={rule.handoff} rows={2} onChange={(handoff) => onUpdate((current) => updateBoundaryRule(current, rule.ruleId, { handoff }))} /></section>)}</div>
      <ValidationNotice messages={validation.messages} success="五类规则齐全；动作、规范回应和转交对象可执行，不包含自动决定成绩或存储敏感数据。" />
      <div className="page-actions"><span>五类边界缺一项均不能通过</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>运行双场景预览<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'preview') {
    const configurationReady = validateM10Boundaries(progress, participantId).valid
    const validation = validateM10Previews(progress, participantId)
    return <>
      <PageHeader eyebrow={routeLabels.preview} title="用一道正常问题和一道边界问题预览配置路径" description="原始预览只读；正常问题须打开 M09 来源，边界问题须命中规则且不伪造引用。该步不替代 M11 学生黑盒测试。" aside={<button className="primary-button" type="button" disabled={!configurationReady} onClick={() => onUpdate((current) => ({ ...invalidateM10ReviewContext(current, '重新运行双场景预览'), previews: runner.preview(current) }))}><RefreshCw size={17} />{progress.previews.length ? '重新运行预览' : '运行双场景预览'}</button>} />
      <div className="review-source-note"><Sparkles size={18} /><div><strong>本地确定性运行器</strong><p>结果受 M09 来源指纹、六要素、四步和五类规则影响；不连接真实模型、Dify 或知识库服务。</p></div></div>
      {progress.previews.length === 0 && <section className="content-card empty-state"><Route size={29} /><h2>尚未运行配置预览</h2><p>配置完整后，两道问题将分别显示四步路径、来源命中和规则触发。</p></section>}
      <div className="m09-quality-list">{progress.previews.map((record) => <PreviewCard record={record} key={record.previewId} />)}</div>
      <ValidationNotice messages={validation.messages} success="正常问题命中可定位原文；边界问题命中 BR-01、无伪造引用并明确转交；两者均展示四步路径。" />
      <div className="page-actions"><span>预览只证明配置可运行，不产生学生端测试结论</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入同组互评<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'review-confirm') {
    const peerValidation = validateM10PeerReview(progress, directory)
    const revisionValidation = validateM10Revision(progress, directory)
    const confirmationValidation = validateM10Confirmation(progress, directory)
    const current = confirmedM10AssistantIsCurrent(progress, directory)
    return <>
      <PageHeader eyebrow={routeLabels['review-confirm']} title="同组其他成员检查，作者至少实质修改一处" description="角色、流程和五类规则分开检查；“需调整”是有效互评事实，不要求一律好评。" />
      <div className="review-source-note"><UsersRound size={18} /><div><strong>确定性模拟，不代表真实组员实时提交</strong><p>{progress.peerReview.disclosure}</p></div></div>
      <section className="content-card"><div className="form-grid"><label className="field"><span>当前同组其他成员</span><select value={progress.peerReview.reviewerId} onChange={(event) => onUpdate((currentProgress) => { const base = invalidateM10ReviewContext(currentProgress, '同组互评人发生变化'); return { ...base, peerReview: { ...base.peerReview, reviewerId: event.target.value } } })}><option value="">请选择</option>{reviewers.map((reviewer) => <option value={reviewer.participantId} key={reviewer.participantId}>{reviewer.name} · {reviewer.specialty}</option>)}</select></label><label className="field"><span>任务内临时角色</span><select value={progress.peerReview.reviewerRole ?? ''} onChange={(event) => onUpdate((currentProgress) => { const base = invalidateM10ReviewContext(currentProgress, '互评角色发生变化'); return { ...base, peerReview: { ...base.peerReview, reviewerId: currentProgress.peerReview.reviewerId, reviewerRole: event.target.value as GroupRole } } })}><option value="">请选择</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select></label></div>
        <button className="secondary-button" type="button" disabled={!progress.peerReview.reviewerId || !progress.peerReview.reviewerRole || !validateM10Previews(progress, participantId).valid} onClick={() => onUpdate((currentProgress) => ({ ...currentProgress, peerReview: simulateM10PeerReview(currentProgress, directory) }))}><Sparkles size={16} />生成并披露模拟互评</button>
        <div className="e03-peer-results">{progress.peerReview.checks.map((item) => <article key={item.checkId}><header><span>{item.label}</span><strong>{item.conclusion}</strong></header><p>{item.note}</p></article>)}</div>
        {progress.peerReview.suggestion && <TextField label="具体建议" value={progress.peerReview.suggestion} readOnly />}
        <button className="primary-button" type="button" disabled={!progress.peerReview.reviewId || progress.peerReview.submitted} onClick={() => onUpdate((currentProgress) => ({ ...currentProgress, peerReview: { ...currentProgress.peerReview, submitted: true, submittedAt: new Date().toISOString() } }))}>{progress.peerReview.submitted ? '互评已提交' : '提交互评记录'}</button>
      </section>
      <ValidationNotice messages={peerValidation.messages} success="当前同组其他成员已分项检查角色、流程和五类规则，并如实保留一项“需调整”。" />
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">SUBSTANTIVE REVISION</span><h2>依据互评完成配置修改</h2></div><span>{progress.revisions.length} 条</span></div><button className="primary-button" type="button" disabled={!progress.peerReview.submitted || progress.revisions.length > 0} onClick={() => onUpdate(applyM10ReferenceRevision)}><Wrench size={16} />{progress.revisions.length ? '已完成实质修改' : '采纳建议并修改角色配置'}</button><div className="e03-before-after">{progress.revisions.map((revision) => <article key={revision.revisionId}><span>{revision.field} · {revision.treatment}</span><strong>修改前：{revision.beforeValue}</strong><p>修改后：{revision.afterValue}</p><small>依据：{revision.basis}</small></article>)}</div></section>
      <ValidationNotice messages={revisionValidation.messages} success="已根据互评保存至少 1 处实质修改，前后、依据、处理方式和指纹均可追溯；双预览已按修改后配置更新。" />
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">TEACHER FINAL</span><h2>五项教师确认</h2></div><UserCheck size={20} /></div><div className="e03-confirmation-list">{confirmationItems.map(([key, label, detail]) => <label key={key}><input type="checkbox" disabled={!revisionValidation.valid} checked={progress.teacherConfirmation[key]} onChange={(event) => onUpdate((currentProgress) => { const base = invalidateM10Confirmation(currentProgress, '教师最终确认发生变化'); return { ...base, teacherConfirmation: { ...base.teacherConfirmation, [key]: event.target.checked } } })} /><span><strong>{label}</strong><small>{detail}</small></span>{progress.teacherConfirmation[key] && <CheckCircle2 size={18} />}</label>)}</div><button className="primary-button" type="button" disabled={!confirmationValidation.valid} onClick={() => onUpdate((currentProgress) => ({ ...currentProgress, confirmedAssistant: createConfirmedM10Assistant(currentProgress, directory) }))}><FileCheck2 size={17} />{current ? '当前课程 AI 助教 v1.0 已确认' : '形成课程 AI 助教 v1.0'}</button></section>
      <ValidationNotice messages={confirmationValidation.messages} success={current ? '五项教师确认与当前来源、配置、预览、互评和修改指纹一致。' : '五项确认已完成，请形成 v1.0。'} />
      <div className="page-actions"><span>人员、M09 来源、配置或确认变化后，旧验收历史保留但当前通过失效</span><button className="primary-button" type="button" disabled={!current} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div>
    </>
  }

  const passed = latestM10AssessmentIsCurrent(progress, directory)
  const confirmed = confirmedM10AssistantIsCurrent(progress, directory)
  const artifacts = progress.confirmedAssistant?.artifacts ?? []
  return <>
    <PageHeader eyebrow={routeLabels.result} title={passed ? 'M10 当前验收已通过' : 'M10 五维评分与成果验收'} description="总分不低于 8 分，核心步骤全部通过，且专业证据、人工核验迭代、安全三项必须均为 2 分。" aside={<div className={passed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>} />
    <section className={passed ? 'result-banner passed' : 'result-banner'}>{passed ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}<div><strong>{passed ? '课程 AI 助教 v1.0 已通过并归档' : confirmed ? '当前 v1.0 已确认，等待提交验收' : '当前证据链仍有缺项'}</strong><p>M09 知识库 → 六要素 → 四步 → 五类边界 → 双预览 → 互评修改 → 五项确认。</p></div><span>{score.coreRequirements.filter((item) => item.passed).length} / {score.coreRequirements.length} 项核心要求</span></section>
    <section className="content-card"><div className="dimension-list">{score.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong>{['evidence', 'iteration', 'safety'].includes(dimension.id) && <em className="e03-hard-gate">硬门槛</em>}<p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section>
    <section className="content-card"><div className="requirement-list">{score.coreRequirements.map((requirement) => <button type="button" className={requirement.passed ? 'passed' : ''} key={requirement.id} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span></button>)}</div></section>
    <section className="content-card artifact-section"><div className="section-heading"><div><span className="eyebrow">EXACTLY TWO TASK OUTPUTS</span><h2>任务成果恰好 2 项</h2></div><span>个人成果中只占 1 个“课程 AI 助教”槽位</span></div><div className="m03-artifact-grid">{artifacts.map((artifact, index) => <article key={artifact.kind}>{index === 0 ? <Bot size={21} /> : <ClipboardCheck size={21} />}<strong>{artifact.name}</strong><p>{index === 0 ? '包含当前 M09 来源、六要素、四步、五类规则和双预览。' : '包含六要素、边界清单、同组互评和至少 1 条修改记录。'}</p><small>{artifact.artifactId}</small></article>)}</div></section>
    <section className="content-card"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>初验与复验历史</h2></div><span>{progress.assessments.length} 次</span></div>{progress.assessments.length > 0 && <div className="m03-assessment-history">{progress.assessments.map((assessment, index) => <article key={assessment.assessmentId}><span>{index === 0 ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '未通过'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN')}</small></article>)}</div>}{!passed && <button className="primary-button" type="button" disabled={!confirmed} onClick={() => onUpdate((currentProgress) => ({ ...currentProgress, assessments: [...currentProgress.assessments, createM10Assessment(currentProgress, directory)] }))}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交验收'}</button>}</section>
    {progress.attemptHistory.length > 0 && <p className="e03-attempt-note"><History size={15} />已保留 {progress.attemptHistory.length} 条失效前配置/验收快照。</p>}
    <div className="page-actions"><span>当前配置指纹只归档一次；实质变化后旧历史保留但不冒充当前通过</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 M10</button></div>
  </>
}
