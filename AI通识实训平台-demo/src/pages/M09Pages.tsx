import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSearch,
  FileText,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import type {
  M09CorrectionDraft,
  M09Handling,
  M09PeerTest,
  M09Progress,
  M09QualityAction,
  M09QualityIssueType,
  M09Route,
  M09Scenario,
  M09SourceRecord,
} from '../m09/domain'
import { m09QualityIssueLabels } from '../m09/domain'
import type { calculateM09Score } from '../m09/scoring'
import {
  confirmedM09KnowledgeBaseIsCurrent,
  latestM09AssessmentIsCurrent,
  validateM09AssessmentSubmission,
  validateM09Build,
  validateM09Confirmation,
  validateM09CorrectionRetest,
  validateM09FirstTest,
  validateM09PeerTest,
  validateM09Quality,
  validateM09Sources,
} from '../m09/validation'
import { currentParticipant } from '../training/participants'
import { trainingTasks } from '../training/catalog'
import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

const roles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']
const handlingOptions: M09Handling[] = ['有据回答', '追问缺失条件', '超范围说明并转交', '指出错误前提']
const qualityActions: M09QualityAction[] = ['保留并说明', '替换版本', '排除资料']

function TextField({ label, value, onChange, rows = 3, disabled = false }: { label: string; value: string; onChange: (value: string) => void; rows?: number; disabled?: boolean }) {
  return <label className="field"><span>{label}</span><textarea rows={rows} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>
}

function TestSummary({ progress, round }: { progress: M09Progress; round: 'first' | 'retest' }) {
  const records = round === 'first' ? progress.firstTest : progress.retest
  const passed = records.filter((item) => item.teacherResult === '符合预期').length
  const evidence = records.filter((item) => item.type === 'evidence' && item.teacherResult === '符合预期').length
  const boundary = records.filter((item) => item.type !== 'evidence' && item.teacherResult === '符合预期').length
  return <div className="m09-metric-grid" aria-live="polite">
    <article><strong>{passed} / 9</strong><span>{round === 'first' ? '首测符合预期' : '复测符合预期'}</span></article>
    <article><strong>{evidence} / 5</strong><span>有据题定位来源</span></article>
    <article><strong>{boundary} / 4</strong><span>边界题处理正确</span></article>
    <article className={passed === 9 ? 'is-good' : 'is-warning'}><strong>{9 - passed}</strong><span>待修正问题</span></article>
  </div>
}

function TestRecordList({ progress, round, onVerify }: { progress: M09Progress; round: 'first' | 'retest'; onVerify: (questionId: string, checked: boolean) => void }) {
  const records = round === 'first' ? progress.firstTest : progress.retest
  return <div className="m09-test-list">
    {records.map((record) => <article className={`m09-test-card ${record.teacherResult === '符合预期' ? 'passed' : 'needs-fix'}`} key={record.recordId}>
      <header>
        <span>{record.questionId} · {record.type === 'evidence' ? '有据题' : '边界题'}</span>
        <strong>{record.teacherResult === '符合预期' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{record.teacherResult}</strong>
      </header>
      <h3>{record.question}</h3>
      <p className="m09-answer"><small>确定性本地模拟回答</small>{record.rawAnswer}</p>
      <div className="m09-handling-row"><span>实际处理：<strong>{record.actualHandling}</strong></span><span>预期：{record.expectedHandling}</span></div>
      {record.sourceLabel && <details className="m09-evidence"><summary><FolderOpen size={15} />打开来源片段 · {record.sourceLabel}</summary><p><mark>{record.excerpt}</mark></p><small>片段已定位不等于内容已通过；勾选下方核验后才代表教师确认。</small></details>}
      {!record.sourceLabel && record.teacherResult === '符合预期' && <p className="m09-correct-no-source">未引用资料：当前资料不能支持该结论，此处不生成引用是正确边界行为。</p>}
      {record.issueDescription && <p className="m09-issue-copy">问题：{record.issueDescription}</p>}
      <label className="m09-verify-check"><input type="checkbox" checked={record.teacherVerified} onChange={(event) => onVerify(record.questionId, event.target.checked)} /><span>我已对照实际处理、预期和来源完成教师核验</span></label>
    </article>)}
  </div>
}

export function M09Overview({ onNext }: { onNext: () => void }) {
  return <>
    <PageHeader eyebrow="步骤 1 / 8 · 任务说明" title="课程知识库建设与测试" description="把本人审核过的 2—5 份课程资料建成可追溯的本地片段索引；用同一组 5 道有据题和 4 道边界题完成首测、实质修正和复测，再经同组测试与教师确认形成 v1.0。" aside={<div className="metric-pill"><Database size={18} /><span><strong>75 分钟</strong><small>个人主作 · 小组边界测试</small></span></div>} />
    <section className="content-card m09-journey-card">
      <div className="section-heading"><div><span className="eyebrow">TRACE · TEST · CORRECT</span><h2>一条可解释、可复验的知识库闭环</h2></div></div>
      <div className="m09-journey-grid">{[['01','登记 2—5 份'],['02','四类逐项质检'],['03','建立 v0'],['04','5+4 首测'],['05','实质修正'],['06','同题复测'],['07','同组边界测试'],['08','确认 v1.0']].map(([number,label]) => <article key={number}><span>{number}</span><strong>{label}</strong></article>)}</div>
    </section>
    <div className="m04-overview-grid">
      <section className="content-card"><span className="eyebrow">有区分度的首测</span><h2>首测不会一键全绿</h2><p className="muted-copy">样例在 B01 稳定暴露“条件不足却直接回答”的规则缺口；只有加入“先追问必要条件”的实质规则后，同题复测才会通过。</p></section>
      <section className="content-card"><span className="eyebrow">成果恰好 2 项</span><h2>知识库与测试证据分开归档</h2><p className="muted-copy">① {trainingTasks.M09.outputs[0]}；② {trainingTasks.M09.outputs[1]}。成果中心仍只占“课程知识库和来源清单”一个个人成果槽位。</p></section>
    </div>
    <div className="review-source-note"><ShieldCheck size={18} /><div><strong>本地仿真边界</strong><p>资料在浏览器内读取并按标题、段落建立规则索引；不上传服务器，不宣称连接向量数据库，不展示无法解释的置信度。</p></div></div>
    <div className="page-actions"><span>推荐路径约 8 次主要操作，可随时回看已完成证据</span><button className="primary-button" type="button" onClick={onNext}>开始登记来源<ArrowRight size={17} /></button></div>
  </>
}

export function M09SourcesPage({ progress, onLoadSamples, onFiles, onUpdateScenario, onUpdateSource, onRemoveSource, onNext }: { progress: M09Progress; onLoadSamples: () => void; onFiles: (files: File[]) => void; onUpdateScenario: (patch: Partial<M09Scenario>) => void; onUpdateSource: (sourceId: string, patch: Partial<M09SourceRecord>) => void; onRemoveSource: (sourceId: string) => void; onNext: () => void }) {
  const validation = validateM09Sources(progress)
  return <>
    <PageHeader eyebrow="步骤 2 / 8 · 来源登记" title="先把每份资料的来源、版本、范围和授权说清楚" description="可载入完整课程样例，也可真实读取本机 .txt/.md。文件只在当前浏览器处理，不会上传。AI/规则原始解析与教师最终纳入决定分别保存。" />
    <section className="content-card m09-source-toolbar">
      <div><span className="eyebrow">BROWSER-LOCAL INPUT</span><h2>资料入口</h2><p>当前 {progress.sources.length} 份；纳入 {progress.sources.filter((item) => item.teacherDecision === '纳入').length} 份</p></div>
      <div className="m09-source-actions"><button className="primary-button" type="button" onClick={onLoadSamples}><Sparkles size={17} />载入 4 份课程样例</button><label className="secondary-button m09-file-button"><Upload size={17} />读取本机 .txt/.md<input type="file" multiple accept=".txt,.md,text/plain,text/markdown" onChange={(event) => { onFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = '' }} /></label></div>
    </section>
    {progress.importNotice && <div className="review-source-note" aria-live="polite"><FileText size={18} /><div><strong>本地读取结果</strong><p>{progress.importNotice}</p></div></div>}
    <section className="content-card m04-input-form">
      <div className="form-grid"><TextField label="课程名称" rows={2} value={progress.scenario.courseName} onChange={(courseName) => onUpdateScenario({ courseName })} /><TextField label="教学对象" rows={2} value={progress.scenario.audience} onChange={(audience) => onUpdateScenario({ audience })} /></div>
      <div className="form-grid"><label className="field"><span>使用环节</span><select value={progress.scenario.useStage} onChange={(event) => onUpdateScenario({ useStage: event.target.value as M09Scenario['useStage'] })}><option>答疑</option><option>复习</option></select></label><TextField label="教学用途" rows={2} value={progress.scenario.teachingPurpose} onChange={(teachingPurpose) => onUpdateScenario({ teachingPurpose })} /></div>
    </section>
    {progress.sources.length === 0 && <section className="content-card empty-state"><BookOpenCheck size={28} /><h2>尚未登记资料</h2><p>点击“载入 4 份课程样例”可走完整验收；也可以从本机读取文本后补全登记信息。</p></section>}
    <div className="m09-source-list">{progress.sources.map((source) => <article className="content-card m09-source-card" key={source.sourceId}>
      <header><div><span className="status-pill">{source.sourceId}</span><strong>{source.name || '未命名资料'}</strong></div><span className={`status-pill ${source.status === '可入库' ? 'completed' : source.status === '已排除' ? 'blocked' : ''}`}>{source.status}</span></header>
      <div className="form-grid"><TextField label="资料名称" rows={2} value={source.name} onChange={(name) => onUpdateSource(source.sourceId, { name })} /><TextField label="明确来源" rows={2} value={source.source} onChange={(value) => onUpdateSource(source.sourceId, { source: value })} /></div>
      <div className="form-grid"><TextField label="版本" rows={2} value={source.version} onChange={(version) => onUpdateSource(source.sourceId, { version })} /><TextField label="适用范围" rows={2} value={source.scope} onChange={(scope) => onUpdateSource(source.sourceId, { scope })} /></div>
      <TextField label="内容摘要" value={source.summary} onChange={(summary) => onUpdateSource(source.sourceId, { summary })} />
      <TextField label="资料正文（浏览器本地内容）" rows={5} value={source.content} onChange={(content) => onUpdateSource(source.sourceId, { content })} />
      <div className="m09-decision-grid"><div><small>本地规则原始解析（模拟 AI 原始解析）</small><p>{source.localParseResult}</p></div><div><small>教师最终决定</small><div className="form-grid"><label className="field"><span>纳入决定</span><select value={source.teacherDecision} onChange={(event) => onUpdateSource(source.sourceId, { teacherDecision: event.target.value as M09SourceRecord['teacherDecision'], status: event.target.value === '排除' ? '已排除' : '待检查' })}><option>待决定</option><option>纳入</option><option>排除</option></select></label><label className="field"><span>授权状态</span><select value={source.authorizationStatus} onChange={(event) => onUpdateSource(source.sourceId, { authorizationStatus: event.target.value as M09SourceRecord['authorizationStatus'] })}><option>待确认</option><option>已授权</option><option>未授权</option></select></label></div><label className="m09-verify-check"><input type="checkbox" checked={source.authorizationConfirmed} onChange={(event) => onUpdateSource(source.sourceId, { authorizationConfirmed: event.target.checked })} /><span>教师已核对授权与使用范围</span></label></div></div>
      <button className="text-button danger" type="button" onClick={() => onRemoveSource(source.sourceId)}>移除此资料</button>
    </article>)}</div>
    <ValidationNotice messages={validation.messages} success="已纳入 2—5 份资料；来源、版本、范围、授权和教师决定均完整，且未检出阻断性敏感内容。" />
    <div className="page-actions"><span>同名同版本、未授权、个人信息或密钥会被定位并阻止进入下一步</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入四类质量检查<ArrowRight size={17} /></button></div>
  </>
}

export function M09QualityPage({ progress, onApplyRecommendations, onResolve, onNext }: { progress: M09Progress; onApplyRecommendations: () => void; onResolve: (sourceId: string, issueType: M09QualityIssueType, action: M09QualityAction, rationale?: string) => void; onNext: () => void }) {
  const validation = validateM09Quality(progress)
  const sources = progress.sources.filter((item) => item.teacherDecision === '纳入')
  return <>
    <PageHeader eyebrow="步骤 3 / 8 · 逐份质检" title="重复、过期、缺页、错误版本，四类问题逐项留痕" description="命中项必须选择互斥处置并填写依据。过期、关键缺页和错误版本不能靠“保留并说明”变成合格；替换后仍保留原问题记录。" aside={<button className="primary-button" type="button" onClick={onApplyRecommendations}><ShieldCheck size={17} />采用安全处置建议</button>} />
    <div className="m09-quality-list">{sources.map((source) => <section className="content-card" key={source.sourceId}>
      <div className="section-heading"><div><span className="eyebrow">{source.sourceId} · {source.version}</span><h2>{source.name}</h2></div><span className={`status-pill ${source.status === '可入库' ? 'completed' : ''}`}>{source.status}</span></div>
      <div className="m09-quality-grid">{source.qualityFindings.map((finding) => <fieldset key={finding.issueType} className={finding.detected ? 'detected' : 'clear'}>
        <legend>{m09QualityIssueLabels[finding.issueType]}</legend>
        <span className={finding.detected ? 'm09-detected' : 'm09-clear'}>{finding.detected ? '已发现问题' : '未发现问题'}</span>
        <label className="field"><span>互斥处置</span><select value={finding.action} disabled={!finding.detected} onChange={(event) => onResolve(source.sourceId, finding.issueType, event.target.value as M09QualityAction, finding.rationale)}>{!finding.detected && <option>无需处理</option>}<option>未处理</option>{qualityActions.map((action) => <option key={action}>{action}</option>)}</select></label>
        <TextField label="检查或处理依据" rows={3} value={finding.rationale} onChange={(rationale) => onResolve(source.sourceId, finding.issueType, finding.detected ? finding.action : '无需处理', rationale)} />
        {finding.replacementVersion && <small>安全建议：替换为已审定 {finding.replacementVersion}</small>}
      </fieldset>)}</div>
    </section>)}</div>
    <ValidationNotice messages={validation.messages} success="每份有效资料都完成四类独立检查；缺页与错误版本已替换，局部重复已保留并说明。" />
    <div className="page-actions"><span>当前可入库 {sources.filter((item) => item.status === '可入库').length} / {sources.length} 份</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>建立知识库 v0<ArrowRight size={17} /></button></div>
  </>
}

export function M09BuildPage({ progress, onBuild, onNext }: { progress: M09Progress; onBuild: () => void; onNext: () => void }) {
  const validation = validateM09Build(progress)
  const knowledgeBase = progress.knowledgeBase
  return <>
    <PageHeader eyebrow="步骤 4 / 8 · 建立 v0" title="把当前有效资料建立为可追溯的本地片段索引" description="本 Demo 真实按标题和非空段落切分来源。任何启用状态、正文或版本变化都会改变来源指纹并要求重建。首测通过前版本只能是 v0。" />
    <section className="content-card m09-build-panel"><div><span className="eyebrow">LOCAL SEGMENT INDEX</span><h2>{knowledgeBase ? '知识库 v0 已建立' : '等待建立 v0'}</h2><p>不配置切片参数，不展示向量距离或置信度；只展示可以直接核对的资料数、片段数和原文。</p></div><button className="primary-button" type="button" onClick={onBuild}><Database size={17} />{knowledgeBase ? '按当前资料重新建立 v0' : '建立知识库 v0'}</button></section>
    {knowledgeBase && <>
      <div className="m09-metric-grid"><article><strong>{knowledgeBase.sourceIds.length}</strong><span>有效资料</span></article><article><strong>{knowledgeBase.segmentCount}</strong><span>可定位片段</span></article><article><strong>{knowledgeBase.version}</strong><span>当前版本</span></article><article><strong>{knowledgeBase.sourceFingerprint}</strong><span>来源指纹</span></article></div>
      <section className="content-card"><div className="section-heading"><div><span className="eyebrow">SOURCE EXPLORER</span><h2>来源索引与原文片段</h2></div><span>{knowledgeBase.courseName} · {knowledgeBase.useStage}</span></div><div className="m09-segment-list">{knowledgeBase.segments.map((segment) => <details key={segment.segmentId}><summary><FileSearch size={16} /><strong>{segment.segmentId}</strong><span>{segment.sourceName} {segment.sourceVersion} · {segment.heading}</span></summary><p><mark>{segment.text}</mark></p></details>)}</div></section>
      <section className="content-card"><span className="eyebrow">健康说明</span>{knowledgeBase.healthNotes.map((note) => <p key={note} className="muted-copy">• {note}</p>)}</section>
    </>}
    <ValidationNotice messages={validation.messages} success="v0 与当前资料指纹一致；资料数、片段数、范围、健康说明和原文入口完整。" />
    <div className="page-actions"><span>v0 是待测试版本，不等于教师确认的 v1.0</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>配置并运行 9 项首测<ArrowRight size={17} /></button></div>
  </>
}

export function M09FirstTestPage({ progress, onUpdateQuestion, onRun, onVerify, onVerifyAll, onNext }: { progress: M09Progress; onUpdateQuestion: (questionId: string, question: string) => void; onRun: () => void; onVerify: (questionId: string, checked: boolean) => void; onVerifyAll: () => void; onNext: () => void }) {
  const validation = validateM09FirstTest(progress)
  return <>
    <PageHeader eyebrow="步骤 5 / 8 · 9 项首测" title="同一批完成 5 道有据题和 4 道边界题" description="首测前可编辑题目；运行后题号与题目冻结。每题同时显示模拟原始回答、实际/预期处理、来源片段和教师核验。样例首测稳定为 8 / 9。" />
    <section className="content-card"><div className="section-heading"><div><span className="eyebrow">FIXED QUESTION SET</span><h2>9 道稳定题号</h2></div><span>{progress.firstTestFrozen ? '首测已冻结，禁止换题' : '首测前可编辑'}</span></div><div className="m09-question-editor">{progress.questions.map((question) => <label key={question.questionId}><span><strong>{question.questionId}</strong>{question.type === 'evidence' ? '有据题' : '边界题'} · 预期“{question.expectedHandling}”</span><textarea rows={2} value={question.question} disabled={progress.firstTestFrozen} onChange={(event) => onUpdateQuestion(question.questionId, event.target.value)} /></label>)}</div><button className="primary-button" type="button" disabled={progress.firstTestFrozen} onClick={onRun}><Sparkles size={17} />{progress.firstTestFrozen ? '首测已运行并冻结' : '运行 9 项首测'}</button></section>
    {progress.firstTest.length > 0 && <><TestSummary progress={progress} round="first" /><section className="content-card m09-test-intro"><strong>为什么不是 9 / 9？</strong><p>B01 缺少教学对象、任务、设备或评价条件，但 v0 规则没有要求先追问，因此模拟回答直接给出建议。这是需要真实修改规则才能解决的缺口。</p><button className="secondary-button" type="button" onClick={onVerifyAll}><ClipboardCheck size={17} />对照证据确认全部 9 项核验</button></section><TestRecordList progress={progress} round="first" onVerify={onVerify} /></>}
    <ValidationNotice messages={validation.messages} success="首测已冻结：5 道有据题均定位来源，4 道边界题中 1 道暴露真实规则缺口，9 项均经教师核验。" />
    <div className="page-actions"><span>首测记录会永久保留；后续修正与重建不会覆盖它</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>修正规则并同题复测<ArrowRight size={17} /></button></div>
  </>
}

export function M09CorrectionRetestPage({ progress, onUpdateDraft, onSaveCorrection, onRunRetest, onVerify, onVerifyAll, onNext }: { progress: M09Progress; onUpdateDraft: (patch: Partial<M09CorrectionDraft>) => void; onSaveCorrection: () => void; onRunRetest: () => void; onVerify: (questionId: string, checked: boolean) => void; onVerifyAll: () => void; onNext: () => void }) {
  const validation = validateM09CorrectionRetest(progress)
  const issues = progress.firstTest.filter((item) => item.teacherResult === '需修正')
  const draft = progress.correctionDraft
  const canSave = Boolean(issues.some((item) => item.questionId === draft.questionId) && draft.before.trim() && draft.after.trim() && draft.before.trim() !== draft.after.trim() && draft.basis.trim())
  return <>
    <PageHeader eyebrow="步骤 6 / 8 · 修正与同题复测" title="先保存可解释的实质修正，再用完全相同的 9 道题复测" description="系统不会因为点击“复测”自动变绿。只有新规则明确覆盖 B01 的条件缺失处理，B01 才会改变；其余 8 题保持稳定。" />
    <section className="content-card"><div className="section-heading"><div><span className="eyebrow">CORRECTION RECORD</span><h2>关联首测问题</h2></div><span>{progress.corrections.length} 条已保存</span></div><div className="form-grid"><label className="field"><span>首测问题</span><select value={draft.questionId} onChange={(event) => onUpdateDraft({ questionId: event.target.value })}>{issues.map((item) => <option key={item.questionId} value={item.questionId}>{item.questionId} · {item.issueDescription}</option>)}</select></label><label className="field"><span>修改对象</span><select value={draft.target} onChange={(event) => onUpdateDraft({ target: event.target.value as M09CorrectionDraft['target'] })}><option>回答规则</option><option>课程资料</option></select></label></div><div className="form-grid"><TextField label="修改前" rows={5} value={draft.before} onChange={(before) => onUpdateDraft({ before })} /><TextField label="修改后" rows={5} value={draft.after} onChange={(after) => onUpdateDraft({ after })} /></div><TextField label="修改依据" value={draft.basis} onChange={(basis) => onUpdateDraft({ basis })} /><button className="primary-button" type="button" disabled={!canSave} onClick={onSaveCorrection}><FileText size={17} />保存实质修正并升级规则版本</button></section>
    {progress.corrections.length > 0 && <section className="content-card"><div className="section-heading"><div><span className="eyebrow">FROZEN HISTORY</span><h2>修正记录</h2></div><span>当前规则 v{progress.answerRule.version}</span></div>{progress.corrections.map((record) => <article className="m09-correction-record" key={record.correctionId}><strong>{record.questionId} · {record.target} · 规则 v{record.ruleVersion}</strong><p>{record.before}</p><span>→</span><p>{record.after}</p><small>依据：{record.basis}</small></article>)}<button className="primary-button" type="button" onClick={onRunRetest}><RefreshCw size={17} />运行同一组 9 题复测</button></section>}
    {progress.retest.length > 0 && <><div className="m09-round-compare"><article><span>首测</span><strong>{progress.firstTest.filter((item) => item.teacherResult === '符合预期').length} / 9</strong><small>规则 v0 · B01 需修正</small></article><ArrowRight size={24} /><article className="passed"><span>复测</span><strong>{progress.retest.filter((item) => item.teacherResult === '符合预期').length} / 9</strong><small>规则 v{progress.answerRule.version} · 同一题号</small></article></div><TestSummary progress={progress} round="retest" /><section className="content-card m09-test-intro"><strong>同题对照已建立</strong><p>首测与复测的 9 个 questionId 和题目正文完全一致；只允许资料或回答规则的实质变化影响结果。</p><button className="secondary-button" type="button" onClick={onVerifyAll}><ClipboardCheck size={17} />对照首测确认全部 9 项复核</button></section><TestRecordList progress={progress} round="retest" onVerify={onVerify} /></>}
    <ValidationNotice messages={validation.messages} success="首测已保留，实质修正有前后和依据，同一组 9 题复测达到 9 / 9 并完成人工核验。" />
    <div className="page-actions"><span>当前状态为 v1.0 候选；仍须完成同组边界测试和教师确认</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进行同组边界测试<ArrowRight size={17} /></button></div>
  </>
}

export function M09PeerConfirmPage({ progress, directory, onUpdatePeer, onSimulatePeer, onSubmitPeer, onUpdateConfirmation, onConfirm, onNext }: { progress: M09Progress; directory: ParticipantDirectory; onUpdatePeer: (patch: Partial<M09PeerTest>) => void; onSimulatePeer: () => void; onSubmitPeer: () => void; onUpdateConfirmation: (patch: Partial<M09Progress['teacherConfirmation']>) => void; onConfirm: () => void; onNext: () => void }) {
  const identity = currentParticipant(directory)
  const peers = directory.participants.filter((item) => item.groupId === identity?.groupId && item.participantId !== identity?.participantId)
  const review = progress.peerTest
  const peerValidation = validateM09PeerTest(progress, directory)
  const confirmationValidation = validateM09Confirmation(progress, directory)
  const current = confirmedM09KnowledgeBaseIsCurrent(progress, directory)
  const boundaryQuestions = progress.questions.filter((item) => item.type !== 'evidence')
  const canSubmit = Boolean(review.reviewerId && review.reviewerRole && review.actualHandling && review.conclusion && review.suggestion.trim() && (review.conclusion !== '需调整' || (review.authorTreatment && review.authorBasis.trim())))
  return <>
    <PageHeader eyebrow="步骤 7 / 8 · 小组测试与教师确认" title="同组其他成员测试至少 1 道边界题，教师再确认 v1.0" description="成员列表按当前 groupId 过滤并排除本人。“需调整”是有效事实，作者必须修正或记录不采纳依据，不要求一律好评。" aside={<div className="metric-pill"><UsersRound size={18} /><span><strong>{identity?.groupName ?? '未分组'}</strong><small>{peers.length} 名同组测试者可选</small></span></div>} />
    <div className="review-source-note"><RefreshCw size={18} /><div><strong>确定性模拟，不代表真实组员提交</strong><p>当前 Demo 没有多人后端。成员身份和同组过滤使用真实目录；测试摘要由所选题号稳定生成，并保存在当前教师的 M09 进度中。</p></div></div>
    <section className="content-card review-form"><div className="form-grid"><label className="field"><span>本人本次小组角色</span><select value={review.reviewerRole ?? ''} onChange={(event) => onUpdatePeer({ reviewerRole: event.target.value as GroupRole, submitted: false })}><option value="">请选择</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></label><label className="field"><span>同组测试人</span><select value={review.reviewerId} onChange={(event) => onUpdatePeer({ reviewerId: event.target.value, submitted: false })}><option value="">请选择当前同组其他成员</option>{peers.map((peer) => <option key={peer.participantId} value={peer.participantId}>{peer.name}</option>)}</select></label></div><label className="field"><span>边界测试题</span><select value={review.boundaryQuestionId} onChange={(event) => onUpdatePeer({ boundaryQuestionId: event.target.value, actualHandling: undefined, conclusion: undefined, suggestion: '', submitted: false })}>{boundaryQuestions.map((question) => <option key={question.questionId} value={question.questionId}>{question.questionId} · {question.question}</option>)}</select></label><button className="primary-button" type="button" disabled={!review.reviewerId || !review.reviewerRole || !review.boundaryQuestionId} onClick={onSimulatePeer}><UsersRound size={17} />运行同组边界测试模拟</button>
      {review.actualHandling && <div className={`m09-peer-result ${review.conclusion === '符合预期' ? 'passed' : 'needs-fix'}`}><span>实际处理：<strong>{review.actualHandling}</strong></span><span>结论：<strong>{review.conclusion}</strong></span><TextField label="具体问题或建议" value={review.suggestion} onChange={(suggestion) => onUpdatePeer({ suggestion, submitted: false })} />{review.conclusion === '需调整' && <><label className="field"><span>作者处理</span><select value={review.authorTreatment} onChange={(event) => onUpdatePeer({ authorTreatment: event.target.value as M09PeerTest['authorTreatment'], submitted: false })}><option value="">请选择</option><option>已按建议修正</option><option>不采纳并记录依据</option></select></label><TextField label="作者修正或不采纳依据" value={review.authorBasis} onChange={(authorBasis) => onUpdatePeer({ authorBasis, submitted: false })} /></>}</div>}
      <button className="secondary-button" type="button" disabled={!canSubmit} onClick={onSubmitPeer}>{review.submitted ? '重新提交边界测试记录' : '提交边界测试记录'}</button>
    </section>
    <ValidationNotice messages={peerValidation.messages} success="当前同组其他成员已完成至少 1 道边界测试，角色、实际处理、结论和建议均已留痕。" />
    <section className="content-card"><div className="section-heading"><div><span className="eyebrow">TEACHER FINAL</span><h2>教师最终确认</h2></div><span>{current ? 'v1.0 当前有效' : '等待确认'}</span></div><div className="confirmation-list">{([['scopeConfirmed','资料范围与课程、对象和答疑/复习场景一致'],['sourcesConfirmed','5 道有据题的来源和原文片段均已人工核验'],['boundaryConfirmed','4 道边界题不会越界回答或伪造引用'],['safetyConfirmed','有效资料授权明确且不含真实个人信息或密钥'],['maintenanceResponsibilityConfirmed','教师承担知识库更新、发布与教学使用的最终责任']] as const).map(([field,label]) => <label key={field}><input type="checkbox" checked={progress.teacherConfirmation[field]} onChange={(event) => onUpdateConfirmation({ [field]: event.target.checked })} /><span><strong>{label}</strong></span></label>)}</div><button className="primary-button" type="button" disabled={!confirmationValidation.valid} onClick={onConfirm}><BookOpenCheck size={17} />{current ? '重新形成当前 v1.0' : '形成课程知识库 v1.0'}</button></section>
    <div className="page-actions"><span>{current ? 'v1.0 与当前来源、规则、同题复测、小组测试和教师确认一致' : '任何实质变化都会使旧通过失效，但历史仍保留'}</span><button className="primary-button" type="button" disabled={!current} onClick={onNext}>进入评分与成果<ArrowRight size={17} /></button></div>
  </>
}

export function M09ResultPage({ progress, result, directory, onNavigate, onSubmitAssessment, onReset }: { progress: M09Progress; result: ReturnType<typeof calculateM09Score>; directory: ParticipantDirectory; onNavigate: (route: M09Route) => void; onSubmitAssessment: () => void; onReset: () => void }) {
  const currentPassed = latestM09AssessmentIsCurrent(progress, directory)
  const latest = progress.assessments.at(-1)
  const canSubmit = validateM09AssessmentSubmission(progress, directory).valid
  return <>
    <PageHeader eyebrow="步骤 8 / 8 · 评分与成果" title={currentPassed ? 'M09 任务已通过' : latest ? 'M09 当前内容待复验' : 'M09 任务结果检查'} description="总分不低于 8；四项核心要求全部通过；专业准确与证据、人工核验与迭代、隐私版权伦理安全三项硬门槛必须各得 2 分。" aside={<div className={currentPassed ? 'result-score passed' : 'result-score'}><strong>{result.total}</strong><span>/ 10 分</span></div>} />
    <section className={currentPassed ? 'result-banner passed' : 'result-banner'}>{currentPassed ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}<div><strong>{currentPassed ? '当前知识库 v1.0 已通过并归档两项成果' : '尚未形成当前有效的通过快照'}</strong><p>首测必须真实暴露问题；修正后沿用同一 9 题复测；同组边界测试和教师确认均进入当前指纹。</p></div><span>{result.coreRequirements.filter((item) => item.passed).length} / 4 项核心要求</span></section>
    <div className="score-layout"><section className="content-card score-card"><div className="dimension-list">{result.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong><p>{dimension.evidence}</p>{['evidence','iteration','safety'].includes(dimension.id) && <small className="m09-hard-gate">硬门槛 · 必须 2 分</small>}</div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section><section className="content-card requirement-card"><div className="requirement-list">{result.coreRequirements.map((requirement) => <button type="button" key={requirement.id} className={requirement.passed ? 'passed' : ''} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '证据完整' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section></div>
    <section className="content-card artifact-section"><div className="section-heading"><div><span className="eyebrow">TASK ARCHIVE</span><h2>任务成果恰好 2 项</h2></div><span>个人成果中心仍为 1 个知识库槽位</span></div><div className="m03-artifact-grid">{trainingTasks.M09.outputs.map((output,index) => <article key={output}>{index === 0 ? <Database size={20} /> : <ClipboardCheck size={20} />}<strong>{output}</strong><p>{index === 0 ? '包含 v1.0、本次课程范围、2—5 份来源、版本和可定位片段。' : '包含同一 9 题首测/复测、教师核验、实质修正和同组边界测试。'}</p></article>)}</div></section>
    <section className="content-card m03-assessment-panel"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>验收历史</h2></div><span>{progress.assessments.length} 次提交</span></div>{progress.assessments.length > 0 && <div className="m03-assessment-history">{progress.assessments.map((assessment,index) => <article key={assessment.assessmentId}><span>{index === 0 ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '未通过'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN')}</small></article>)}</div>}{!currentPassed && <button className="primary-button" type="button" disabled={!canSubmit} onClick={onSubmitAssessment}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交验收'}</button>}</section>
    <div className="page-actions"><span>{currentPassed ? '同一内容指纹只归档一次；资料或规则变化后需重新确认和复验' : '五维分数、硬门槛与核心步骤均由当前证据计算'}</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 M09</button></div>
  </>
}
