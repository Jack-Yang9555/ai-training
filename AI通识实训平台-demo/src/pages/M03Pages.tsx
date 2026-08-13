import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Circle, ClipboardCheck, FileDiff, FileText, Layers3, LockKeyhole, MessageSquareText, Play, RefreshCw, RotateCcw, Send, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { groupRoles } from '../data/trainingParticipants'
import { currentParticipant } from '../training/participants'
import { trainingTasks } from '../training/catalog'
import type { ParticipantDirectory } from '../training/types'
import { compileM03Prompt, m03DefaultSnapshot, m03VariableHints, m03VariableLabels } from '../m03/data'
import { buildM03PeerArtifacts } from '../m03/peerArtifacts'
import { m03PromptMessageToSnapshot, m03PromptTopics, recognizedM03MessageTopics } from '../m03/promptMessage'
import type { M03PromptTopic } from '../m03/promptMessage'
import type { M03IterationVariable, M03PeerReview, M03Progress, M03PromptSnapshot, M03Route, M03ScoreResult, M03VerificationRecord, M03Version } from '../m03/types'
import { latestM03AssessmentIsCurrent, validateM03AssessmentSubmission, validateM03Comparison, validateM03Iteration, validateM03PeerReview, validateM03ProfessionalEvidence, validateM03PromptMessage, validateM03Verification } from '../m03/validation'

const variables = Object.keys(m03VariableLabels) as M03IterationVariable[]

function m03PromptSegment(snapshot: M03PromptSnapshot, topic: M03PromptTopic): string {
  if (topic === 'role-task') return `角色：${snapshot.role}\n任务：${snapshot.task}`
  if (topic === 'background') return `课程：${snapshot.courseName}\n课次：${snapshot.lessonName}\n使用环节：${snapshot.teachingPhase}\n授课对象：${snapshot.audience}\n学生基础：${snapshot.studentFoundation}\n教学目标：${snapshot.objective}`
  if (topic === 'input') return `材料名称：${snapshot.materialName}\n材料正文：${snapshot.materialContent}\n允许使用范围：${snapshot.materialScope}`
  if (topic === 'constraints') return `课堂时长：${snapshot.duration} 分钟\n题量：${snapshot.questionCount} 道\n难度：${snapshot.difficulty}`
  if (topic === 'format') return `呈现格式：${snapshot.outputFormat}\n必须包含：${snapshot.requiredSections}`
  return `质量标准：${snapshot.qualityStandards}`
}

export function M03Overview({ onNext }: { onNext: () => void }) {
  return <>
    <PageHeader eyebrow="步骤 1 / 7 · 任务说明" title="结构化提示词设计与迭代" description="进入仿真的 AI 对话页面，先阅读一条六项完整示例，再从空白消息框开始，为自己的教学场景写一条提示词。" aside={<div className="metric-pill"><Layers3 size={18} /><span><strong>60 分钟</strong><small>必修 · 入门</small></span></div>} />
    <section className="overview-hero"><div><span className="eyebrow">任务目标</span><h2>每一轮只改一个变量，才能知道结果为什么变化</h2><p>默认沿用 M02 的文生图课程，也可以替换为本人课程的非敏感文本材料。Demo 不上传文件、不连接真实模型。</p><div className="outcome-chips"><span>提示词 V1</span><span>提示词 V2</span><span>版本变化说明</span></div></div><div className="task-rule-card"><strong>通过条件</strong><ul><li>总分不低于 8 分</li><li>四项核心步骤全部完成</li><li>专业证据、人工迭代和安全三项均为 2 分</li></ul></div></section>
    <section className="content-card m03-flow-card"><div className="section-heading"><div><span className="eyebrow">LEARNING FLOW</span><h2>七步完成证据闭环</h2></div></div><div className="m03-flow-grid">{['AI 对话仿写','生成第一版练习包','单变量生成第二版','版本比较与核验','小组互评','评分归档'].map((label, index) => <article key={label}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong></article>)}</div></section>
    <div className="page-actions"><span><ShieldCheck size={16} />课程材料只保存在当前浏览器</span><button className="primary-button" type="button" onClick={onNext}>进入 AI 对话练习<ArrowRight size={17} /></button></div>
  </>
}

function TextField({ label, value, rows = 2, disabled, onChange, placeholder }: { label: string; value: string; rows?: number; disabled?: boolean; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="field"><span>{label}</span><textarea rows={rows} disabled={disabled} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
}

export function M03DesignPage({ progress, onUpdate, onUpdateMessage, onNext, onUnlock }: { progress: M03Progress; onUpdate: (patch: Partial<M03PromptSnapshot>) => void; onUpdateMessage: (message: string, snapshot: M03PromptSnapshot) => void; onNext: () => void; onUnlock: () => void }) {
  const validation = validateM03PromptMessage(progress.designMessage, progress.design)
  const locked = Boolean(progress.v1)
  const recognizedTopics = recognizedM03MessageTopics(progress.designMessage)
  const completedTopics = m03PromptTopics.filter((item) => recognizedTopics[item.id]).length
  const updateMessage = (message: string) => onUpdateMessage(message, m03PromptMessageToSnapshot(message, progress.design))
  return <>
    <PageHeader eyebrow="步骤 2 / 7 · AI 对话仿写" title="在仿真 AI 对话中完成你的提示词" description="先阅读示例，再像真实聊天一样从空白输入框开始。六项名称和内容都需要由你亲自输入，右侧只做识别提示。" aside={locked ? <button className="secondary-button" type="button" onClick={onUnlock}><RotateCcw size={16} />修改基础输入</button> : undefined} />
    <div className="m03-ai-workspace">
      <section className="content-card m03-ai-chat">
        <header className="m03-ai-chat-header"><div className="m03-ai-chat-identity"><span><Bot size={20} /></span><div><strong>提示词教学助手</strong><small><i />在线 · 本地模拟对话</small></div></div><div className="m03-ai-chat-tools"><span>示例会话</span><button type="button" aria-label="会话说明"><MessageSquareText size={17} /></button></div></header>
        <div className="m03-ai-transcript">
          <div className="m03-ai-message assistant"><span className="m03-ai-avatar"><Bot size={17} /></span><div className="m03-ai-bubble"><strong>提示词教学助手</strong><p>你好！下面是一位教师发送给 AI 的完整教学提示词。请观察六项名称和内容的写法，然后在下方自己输入一条完整消息。</p></div></div>
          <div className="m03-ai-message user"><div className="m03-ai-bubble"><strong>示例教师</strong><p className="m03-ai-prompt-intro">请为我的课堂生成一份活动练习包。完整要求如下：</p><div className="m03-ai-example-prompt">{m03PromptTopics.map((item, index) => <section key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><p>{m03PromptSegment(m03DefaultSnapshot, item.id)}</p></div></section>)}</div></div></div>
          <div className="m03-ai-message assistant"><span className="m03-ai-avatar"><Bot size={17} /></span><div className="m03-ai-bubble"><strong>提示词教学助手</strong><p>我已识别到角色 / 任务、背景、输入、约束、输出格式、质量标准 6 项。现在轮到你：不要复制示例内容，请结合自己的课程完成一条消息。</p><div className="m03-ai-detected"><span><CheckCircle2 size={14} />六项名称完整</span><span><ShieldCheck size={14} />输入边界明确</span><span><Sparkles size={14} />可生成课堂练习包</span></div></div></div>
        </div>
      </section>
      <aside className="content-card m03-ai-compose-panel">
        <div className="m03-ai-composer m03-ai-composer-side">
          <div className="m03-ai-composer-label"><span>你的消息</span><small>{completedTopics} / 6 项已识别</small></div>
          <textarea aria-label="我的提示词消息" rows={18} disabled={locked} value={progress.designMessage} placeholder="请从这里开始输入你的完整提示词……" onChange={(event) => updateMessage(event.target.value)} />
          <div className="m03-ai-recognition-summary"><span className={completedTopics === 6 ? 'complete' : ''}>{completedTopics === 6 ? <CheckCircle2 size={14} /> : <Circle size={14} />}六项结构 {completedTopics}/6</span><small>每项名称单独起一行，系统自动识别</small></div>
          <section className="m03-ai-safety"><div><ShieldCheck size={17} /><span><strong>发送前确认</strong><small>正式使用 AI 时同样需要检查</small></span></div><label className="check-row"><input type="checkbox" disabled={locked} checked={progress.design.rightsConfirmed} onChange={(event) => onUpdate({ rightsConfirmed: event.target.checked })} /><span><strong>材料来源与权限已确认</strong><small>本人、授权或平台演示材料</small></span></label><label className="check-row"><input type="checkbox" disabled={locked} checked={progress.design.privacyConfirmed} onChange={(event) => onUpdate({ privacyConfirmed: event.target.checked })} /><span><strong>未包含真实学生敏感信息</strong><small>姓名、学号、联系方式已去除</small></span></label></section>
          <div className="m03-ai-composer-actions"><span>发送后生成第一版课堂练习包</span><button className="m03-ai-send" type="button" aria-label="发送我的提示词" disabled={!validation.valid || locked} onClick={onNext}><Send size={18} /></button></div>
        </div>
      </aside>
    </div>
    <ValidationNotice messages={validation.messages} success="六项名称和内容均已识别，发送前确认已完成，可以发送。" />
    <div className="page-actions"><span>{locked ? <><LockKeyhole size={16} />第一版（V1）已锁定当前对话快照</> : '左侧阅读示例，右侧从空白消息框亲自输入'}</span><span>发送后生成第一版课堂练习包</span></div>
  </>
}

function RunResult({ version, progress }: { version: M03Version; progress: M03Progress }) {
  const run = version === 'v1' ? progress.v1 : progress.v2
  if (!run) return <div className="m03-run-empty"><Sparkles size={24} /><strong>{version.toUpperCase()} 尚未生成</strong><p>运行后将保存提示词快照、运行编号、时间和结构化结果。</p></div>
  return <div className="m03-run-result"><div className="m03-run-meta"><span>{run.version.toUpperCase()}</span><strong>{run.runId}</strong><small>{new Date(run.generatedAt).toLocaleString('zh-CN')}</small></div><div className="m03-output-list">{run.paragraphs.map((item) => <article key={item.id}><span>{item.label}</span><p>{item.content}</p></article>)}</div></div>
}

export function M03V1Page({ progress, running, onRun, onNext }: { progress: M03Progress; running: boolean; onRun: () => void; onNext: () => void }) {
  return <>
    <PageHeader eyebrow="步骤 3 / 7 · 第一版课堂练习包" title="生成并保存第一版课堂活动练习包" description="系统根据教师刚才发送的六项提示词生成课堂导入、活动步骤、练习题、答案解析和核验清单。生成后保存为 V1 并锁定。" />
    <div className="m03-run-layout"><section className="content-card m03-locked-prompt"><div className="section-heading"><div><span className="eyebrow">PROMPT V1</span><h2>第一版提示词</h2></div><span className="readonly-badge"><LockKeyhole size={14} />快照只读</span></div><pre>{progress.v1?.compiledPrompt ?? compileM03Prompt(progress.design)}</pre><button className="primary-button full-button" type="button" disabled={running || Boolean(progress.v1)} onClick={onRun}><Play size={17} />{running ? '正在生成课堂练习包…' : progress.v1 ? '第一版练习包已生成并锁定' : '生成第一版课堂练习包'}</button></section><section className="content-card"><RunResult version="v1" progress={progress} /></section></div>
    <div className="page-actions"><span>{progress.v1 ? <><CheckCircle2 size={16} />第一版提示词和课堂练习包已保存在本地</> : '使用确定性本地生成器，不调用真实模型'}</span><button className="primary-button" type="button" disabled={!progress.v1} onClick={onNext}>调整一个条件生成第二版<ArrowRight size={17} /></button></div>
  </>
}

function VariableEditor({ variable, snapshot, onUpdate }: { variable: M03IterationVariable; snapshot: M03PromptSnapshot; onUpdate: (patch: Partial<M03PromptSnapshot>) => void }) {
  if (variable === 'studentFoundation') return <TextField label="修改后的学生基础" rows={4} value={snapshot.studentFoundation} onChange={(studentFoundation) => onUpdate({ studentFoundation })} />
  if (variable === 'questionCount') return <label className="field"><span>修改后的题量</span><input type="number" min="1" value={snapshot.questionCount} onChange={(event) => onUpdate({ questionCount: Number(event.target.value) })} /></label>
  if (variable === 'duration') return <label className="field"><span>修改后的课堂时长</span><input type="number" min="1" value={snapshot.duration} onChange={(event) => onUpdate({ duration: Number(event.target.value) })} /></label>
  if (variable === 'difficulty') return <label className="field"><span>修改后的难度</span><select value={snapshot.difficulty} onChange={(event) => onUpdate({ difficulty: event.target.value as M03PromptSnapshot['difficulty'] })}><option>入门</option><option>进阶</option><option>挑战</option></select></label>
  return <label className="field"><span>修改后的输出格式</span><select value={snapshot.outputFormat} onChange={(event) => onUpdate({ outputFormat: event.target.value as M03PromptSnapshot['outputFormat'] })}><option>分节文本</option><option>Markdown 表格</option><option>JSON 结构</option></select></label>
}

export function M03IterationPage({ progress, running, onSelectVariable, onUpdateDraft, onRun, onNext }: { progress: M03Progress; running: boolean; onSelectVariable: (variable: M03IterationVariable) => void; onUpdateDraft: (patch: Partial<M03PromptSnapshot>) => void; onRun: () => void; onNext: () => void }) {
  const validation = validateM03Iteration(progress)
  const locked = Boolean(progress.v2)
  return <>
    <PageHeader eyebrow="步骤 4 / 7 · 单变量迭代" title="只调整一项条件并生成 V2" description="系统会深度比较两个快照。除选中变量外，角色/任务、背景、输入、其他约束、输出格式和质量标准保持不变。" />
    <section className="content-card m03-variable-section"><div className="section-heading"><div><span className="eyebrow">ONE VARIABLE</span><h2>选择唯一调整变量</h2></div><span>{progress.iterationVariable ? `当前：${m03VariableLabels[progress.iterationVariable]}` : '尚未选择'}</span></div><div className="m03-variable-grid">{variables.map((variable) => <button type="button" disabled={locked} className={progress.iterationVariable === variable ? 'selected' : ''} key={variable} onClick={() => onSelectVariable(variable)}><strong>{m03VariableLabels[variable]}</strong><small>{m03VariableHints[variable]}</small></button>)}</div>{progress.iterationVariable && progress.iterationDraft && <div className="m03-variable-editor"><section className="m03-variable-version-card readonly"><header><span>第一版 V1</span><strong>{m03VariableLabels[progress.iterationVariable]}</strong></header><div className="m03-variable-value">{String(progress.v1?.snapshot[progress.iterationVariable])}</div></section><section className="m03-variable-version-card editable"><header><span>第二版 V2</span><strong>{m03VariableLabels[progress.iterationVariable]}</strong></header><VariableEditor variable={progress.iterationVariable} snapshot={progress.iterationDraft} onUpdate={onUpdateDraft} /></section></div>}</section>
    <section className="content-card m03-v2-preview"><div className="section-heading"><div><span className="eyebrow">PROMPT V2</span><h2>第二版提示词与结果</h2></div></div>{progress.iterationDraft && <pre>{compileM03Prompt(progress.iterationDraft)}</pre>}<button className="primary-button" type="button" disabled={locked || running || !validation.valid} onClick={onRun}><Sparkles size={17} />{running ? '正在生成…' : progress.v2 ? 'V2 已锁定' : '生成 V2'}</button>{progress.v2 && <RunResult version="v2" progress={progress} />}</section>
    {!progress.v2 && <ValidationNotice messages={validation.messages} success="系统确认只有一个变量发生变化，可以生成 V2。" />}
    <div className="page-actions"><span>{progress.v2 ? <><CheckCircle2 size={16} />V2 与 V1 已关联到同一次迭代</> : '发现第二项变化时禁止生成'}</span><button className="primary-button" type="button" disabled={!progress.v2} onClick={onNext}>比较并核验两版<ArrowRight size={17} /></button></div>
  </>
}

function VerificationForm({ version, progress, onUpdate }: { version: M03Version; progress: M03Progress; onUpdate: (patch: Partial<M03VerificationRecord>) => void }) {
  const run = version === 'v1' ? progress.v1 : progress.v2
  const record = progress.verification[version]
  const validation = validateM03Verification(progress, version)
  return <section className="content-card m03-verification-card"><div className="section-heading"><div><span className="eyebrow">{version.toUpperCase()} EVIDENCE</span><h2>{version.toUpperCase()} 专业核验</h2></div><span className={validation.valid ? 'complete' : ''}>{validation.valid ? '记录完整' : '待完成'}</span></div><label className="field"><span>关联输出段落</span><select value={record.paragraphId} onChange={(event) => onUpdate({ paragraphId: event.target.value })}><option value="">请选择</option>{run?.paragraphs.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><TextField label="课程材料依据（必填）" value={record.materialEvidence} onChange={(materialEvidence) => onUpdate({ materialEvidence })} placeholder="填写支持该段内容的课程材料条目或原文" /><div className="form-grid"><label className="field"><span>材料范围</span><select value={record.materialScope} onChange={(event) => onUpdate({ materialScope: event.target.value as M03VerificationRecord['materialScope'] })}><option value="">请选择</option><option>一致</option><option>需调整</option></select></label><label className="field"><span>教学目标一致性</span><select value={record.objectiveAlignment} onChange={(event) => onUpdate({ objectiveAlignment: event.target.value as M03VerificationRecord['objectiveAlignment'] })}><option value="">请选择</option><option>一致</option><option>需调整</option></select></label></div><TextField label="核验结论（必填）" value={record.conclusion} onChange={(conclusion) => onUpdate({ conclusion })} /></section>
}

export function M03ComparePage({ progress, onUpdateComparison, onUpdateVerification, onNext }: { progress: M03Progress; onUpdateComparison: (patch: Partial<M03Progress['comparison']>) => void; onUpdateVerification: (version: M03Version, patch: Partial<M03VerificationRecord>) => void; onNext: () => void }) {
  const comparison = validateM03Comparison(progress)
  const professional = validateM03ProfessionalEvidence(progress)
  return <>
    <PageHeader eyebrow="步骤 5 / 7 · 比较与核验" title="解释唯一变量如何改变了结果" description="并排核对提示词与课堂活动练习包；每个版本至少绑定一段输出，回到课程材料和教学目标完成专业核验。" />
    <section className="content-card m03-diff-summary"><div><FileDiff size={20} /><span><strong>唯一变化：{progress.iterationVariable ? m03VariableLabels[progress.iterationVariable] : '—'}</strong><small>{progress.iterationVariable ? `${String(progress.v1?.snapshot[progress.iterationVariable])} → ${String(progress.v2?.snapshot[progress.iterationVariable])}` : '尚无有效迭代'}</small></span></div></section>
    <div className="m03-version-columns">{(['v1','v2'] as M03Version[]).map((version) => { const run = version === 'v1' ? progress.v1 : progress.v2; return <section className="content-card" key={version}><div className="section-heading"><div><span className="eyebrow">{version.toUpperCase()}</span><h2>提示词与生成结果</h2></div></div><pre className="m03-compact-prompt">{run?.compiledPrompt}</pre><div className="m03-output-list compact">{run?.paragraphs.map((item) => <article key={item.id}><span>{item.label}</span><p>{item.content}</p></article>)}</div></section> })}</div>
    <section className="content-card m03-comparison-form"><div className="section-heading"><div><span className="eyebrow">CHANGE EXPLANATION</span><h2>版本变化说明</h2></div></div><div className="form-grid"><TextField label="结果变化说明（必填）" rows={4} value={progress.comparison.changeExplanation} onChange={(changeExplanation) => onUpdateComparison({ changeExplanation })} /><TextField label="教学适用性结论（必填）" rows={4} value={progress.comparison.suitabilityConclusion} onChange={(suitabilityConclusion) => onUpdateComparison({ suitabilityConclusion })} /></div></section>
    <div className="m03-version-columns"><VerificationForm version="v1" progress={progress} onUpdate={(patch) => onUpdateVerification('v1', patch)} /><VerificationForm version="v2" progress={progress} onUpdate={(patch) => onUpdateVerification('v2', patch)} /></div>
    <ValidationNotice messages={[...comparison.messages, ...professional.messages]} success="两版变化说明和专业证据完整，且均与材料范围及教学目标一致。" />
    <div className="page-actions"><span>判断“需调整”会被保留，但专业准确维度不能得 2 分</span><button className="primary-button" type="button" disabled={!comparison.valid || !validateM03Verification(progress, 'v1').valid || !validateM03Verification(progress, 'v2').valid} onClick={onNext}>进入小组互评<ArrowRight size={17} /></button></div>
  </>
}

export function M03PeerReviewPage({ progress, directory, onUpdate, onSubmit, onNext }: { progress: M03Progress; directory: ParticipantDirectory; onUpdate: (patch: Partial<M03PeerReview>) => void; onSubmit: () => void; onNext: () => void }) {
  const identity = currentParticipant(directory)
  const artifacts = buildM03PeerArtifacts(directory)
  const selected = artifacts.find((item) => item.participantId === progress.peerReview.targetParticipantId && item.artifactId === progress.peerReview.targetArtifactId)
  const validation = validateM03PeerReview(progress, directory)
  return <>
    <PageHeader eyebrow="步骤 6 / 7 · 小组互评" title="检查组员提示词是否足够明确" description="被互评成员来自当前导入名单中的同组其他成员。允许如实选择“不明确”，有效互评取决于字段与建议完整，而不是正面评价。" aside={<div className="metric-pill"><UsersRound size={18} /><span><strong>{identity?.groupName ?? '未分组'}</strong><small>{artifacts.length} 份模拟成果</small></span></div>} />
    <div className="review-source-note"><RefreshCw size={18} /><div><strong>无多人后端的模拟组员成果</strong><p>成果按人员 ID 确定性生成并受同组过滤；正式系统应替换为组员真实提交的 V1/V2。</p></div></div>
    <section className="content-card review-form"><div className="section-heading"><div><span className="eyebrow">PEER ARTIFACT</span><h2>选择成员与版本成果</h2></div><span className="identity-readonly">互评人：{identity?.name ?? '未选择'}</span></div><div className="form-grid three-columns"><label className="field"><span>本次承担角色</span><select value={progress.peerReview.reviewerRole ?? ''} onChange={(event) => onUpdate({ reviewerRole: event.target.value as M03PeerReview['reviewerRole'], submitted: false })}><option value="">请选择</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select><small>仅对 M03 有效，不写入人员档案</small></label><label className="field"><span>被互评成员</span><select value={progress.peerReview.targetParticipantId} onChange={(event) => { const artifact = artifacts.find((item) => item.participantId === event.target.value); onUpdate({ targetParticipantId: event.target.value, targetArtifactId: artifact?.artifactId ?? '', submitted: false }) }}><option value="">请选择同组其他成员</option>{artifacts.map((item) => <option value={item.participantId} key={item.participantId}>{item.participantName}</option>)}</select></label><label className="field"><span>关联版本成果</span><select disabled={!selected} value={progress.peerReview.targetArtifactId} onChange={(event) => onUpdate({ targetArtifactId: event.target.value, submitted: false })}><option value="">请选择</option>{selected && <option value={selected.artifactId}>提示词 V1/V2 与变化说明</option>}</select></label></div>{selected && <div className="m03-peer-artifact"><span>{selected.variableLabel}</span><strong>{selected.beforeValue} → {selected.afterValue}</strong><p>{selected.summary}</p></div>}<div className="form-grid three-columns">{([['inputScopeClear','输入范围是否明确'],['outputFormatClear','输出格式是否明确'],['qualityStandardClear','质量标准是否明确']] as const).map(([field,label]) => <label className="field" key={field}><span>{label}</span><select value={progress.peerReview[field]} onChange={(event) => onUpdate({ [field]: event.target.value as M03PeerReview[typeof field], submitted: false })}><option value="">请选择</option><option>明确</option><option>部分明确</option><option>不明确</option></select></label>)}</div><TextField label="可执行的互评建议（必填）" rows={3} value={progress.peerReview.suggestion} onChange={(suggestion) => onUpdate({ suggestion, submitted: false })} /></section>
    <ValidationNotice messages={validation.messages} success="同组版本成果、三项检查和可执行建议已经提交。" />
    <div className="page-actions"><span>人员名单或分组变化后，旧互评对象自动失效</span><div className="inline-actions"><button className="secondary-button" type="button" disabled={!progress.peerReview.reviewerRole || !selected || !progress.peerReview.inputScopeClear || !progress.peerReview.outputFormatClear || !progress.peerReview.qualityStandardClear || !progress.peerReview.suggestion.trim()} onClick={onSubmit}>{progress.peerReview.submitted ? '重新提交互评' : '提交互评'}</button><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入评分与成果<ArrowRight size={17} /></button></div></div>
  </>
}

export function M03ResultPage({ progress, result, directory, onNavigate, onSubmitAssessment, onUpdateModificationSummary, onReset }: { progress: M03Progress; result: M03ScoreResult; directory: ParticipantDirectory; onNavigate: (route: M03Route) => void; onSubmitAssessment: () => void; onUpdateModificationSummary: (value: string) => void; onReset: () => void }) {
  const latest = progress.assessments.at(-1)
  const currentPassed = latestM03AssessmentIsCurrent(progress, directory)
  const canSubmit = validateM03AssessmentSubmission(progress, directory).valid
  return <>
    <PageHeader eyebrow="步骤 7 / 7 · 评分与成果" title={currentPassed ? 'M03 任务已通过' : latest ? 'M03 复验准备' : 'M03 任务结果检查'} description="系统依据当前两版提示词、专业核验和互评记录实时计算；提交验收后形成当前有效的成绩与成果快照。" aside={<div className={currentPassed ? 'result-score passed' : 'result-score'}><strong>{result.total}</strong><span>/ 10 分</span></div>} />
    <section className={currentPassed ? 'result-banner passed' : 'result-banner'}>{currentPassed ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}<div><strong>{currentPassed ? '任务通过：形成可解释的单变量提示词迭代' : '尚未形成当前有效的通过快照'}</strong><p>总分 ≥ 8，四项核心步骤通过，且专业证据、人工迭代和安全均为 2 分。</p></div><span>{result.coreRequirements.filter((item) => item.passed).length} / 4 项核心要求</span></section>
    <div className="score-layout"><section className="content-card score-card"><div className="section-heading"><div><span className="eyebrow">过程质量评分</span><h2>五项标准</h2></div></div><div className="dimension-list">{result.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong><p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section><section className="content-card requirement-card"><div className="section-heading"><div><span className="eyebrow">通关门槛</span><h2>核心步骤</h2></div></div><div className="requirement-list">{result.coreRequirements.map((requirement) => <button type="button" key={requirement.id} className={requirement.passed ? 'passed' : ''} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section></div>
    <section className="content-card artifact-section"><div className="section-heading"><div><span className="eyebrow">任务成果</span><h2>三项过程成果</h2></div></div><div className="m03-artifact-grid">{trainingTasks.M03.outputs.map((name, index) => <article key={name}>{[<FileText size={20} />, <FileText size={20} />, <FileDiff size={20} />][index]}<strong>{name}</strong><p>{index === 0 ? '六格字段、编译提示词和 V1 快照。' : index === 1 ? '单变量后的编译提示词和 V2 快照。' : `调整${progress.iterationVariable ? m03VariableLabels[progress.iterationVariable] : '—'}的结果变化与适用性结论。`}</p></article>)}</div></section>
    <section className="content-card m03-assessment-panel"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>验收与复验留痕</h2></div><span>{progress.assessments.length} 次提交</span></div>{progress.assessments.length > 0 && <div className="m03-assessment-history">{progress.assessments.map((assessment, index) => <article key={assessment.assessmentId}><span>{index === 0 ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '未通过'}</strong><small>{new Date(assessment.submittedAt).toLocaleString('zh-CN')} · {assessment.engine}</small>{assessment.modificationSummary && <p>{assessment.modificationSummary}</p>}</article>)}</div>}{progress.assessments.length > 0 && !currentPassed && <TextField label="本轮修改摘要（再次验收必填）" rows={2} value={progress.assessmentModificationSummary} onChange={onUpdateModificationSummary} />}{!currentPassed && <div className="inline-actions"><button className="primary-button" type="button" disabled={!canSubmit || (progress.assessments.length > 0 && !progress.assessmentModificationSummary.trim())} onClick={onSubmitAssessment}><ClipboardCheck size={17} />{progress.assessments.length > 0 ? '提交复验' : '提交验收'}</button></div>}</section>
    <div className="page-actions"><span>{currentPassed ? '三项过程成果已自动同步到成果中心' : '修改实质数据后旧快照保留，但不再计为当前有效成绩'}</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 M03</button></div>
  </>
}
