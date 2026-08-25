import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Filter,
  GitBranch,
  History,
  Link2,
  ListChecks,
  LocateFixed,
  Network,
  RotateCcw,
  Scale,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import type {
  E04CourseSource,
  E04GraphDraft,
  E04GraphReview,
  E04Progress,
  E04RelationType,
  E04Route,
  E04TeacherConfirmation,
} from '../e04/domain'
import {
  applyE04ReferenceCorrections,
  eligibleE04Reviewers,
  invalidateE04Confirmation,
  invalidateE04DerivedWork,
  invalidateE04ReviewContext,
  LocalE04GraphRunner,
  simulateE04GraphReview,
} from '../e04/runner'
import { calculateE04Score, createE04Assessment } from '../e04/scoring'
import { createConfirmedE04Package } from '../e04/storage'
import {
  confirmedE04PackageIsCurrent,
  detectE04InitialDefects,
  diagnoseE04Graph,
  latestE04AssessmentIsCurrent,
  validateE04AssessmentSubmission,
  validateE04Confirmation,
  validateE04GraphReview,
  validateE04Nodes,
  validateE04Relations,
  validateE04Revision,
  validateE04Source,
} from '../e04/validation'
import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

const graphRunner = new LocalE04GraphRunner()
const groupRoles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']
const relationTypes: Array<'全部' | E04RelationType> = ['全部', '先修', '组成', '应用', '易错']

export interface E04WorkspacePageProps {
  progress: E04Progress
  participantId: string
  directory: ParticipantDirectory
  onUpdate: (updater: (current: E04Progress) => E04Progress) => void
  onNavigate: (route: E04Route) => void
  onNext: () => void
  onReset: () => void
}

const routeLabels: Record<E04Route, string> = {
  overview: '步骤 1 / 8 · 任务说明',
  source: '步骤 2 / 8 · 课程来源',
  nodes: '步骤 3 / 8 · 节点初稿',
  relations: '步骤 4 / 8 · 关系初稿',
  'graph-review': '步骤 5 / 8 · 图谱与同组复核',
  revision: '步骤 6 / 8 · 人工修正',
  confirmation: '步骤 7 / 8 · 教师确认',
  result: '步骤 8 / 8 · 评分与成果',
}

const confirmationItems: Array<[keyof E04TeacherConfirmation, string, string]> = [
  ['sourceAndEvidenceConfirmed', '来源与证据已逐项核验', '节点与关系均可定位到当前课程来源片段。'],
  ['graphQualityConfirmed', '图谱质量检查已通过', '无同名重复、重复关系、自环、孤立节点或无依据关系。'],
  ['finalArtifactsConfirmed', '三项最终成果已逐项检查', '图谱、节点与关系列表、人工修正记录来自同一版本。'],
  ['finalResponsibilityConfirmed', '教师承担最终教学判断责任', 'AI 初稿与模拟组员意见仅作辅助，不替代教师核验。'],
]

function updateSourceField<K extends keyof E04CourseSource>(current: E04Progress, field: K, value: E04CourseSource[K]) {
  const invalidated = invalidateE04DerivedWork(current, '课程来源、版本、授权或安全确认发生变化')
  return { ...invalidated, source: { ...invalidated.source, [field]: value } }
}

function GraphPreview({ graph, filter, zoom, onLocate }: {
  graph?: E04GraphDraft
  filter: '全部' | E04RelationType
  zoom: number
  onLocate: (excerptId: string) => void
}) {
  if (!graph) return <div className="e04-empty-state"><Network size={30} /><p>尚未生成可视图谱数据。</p></div>
  const width = 760
  const height = 430
  const centerX = width / 2
  const centerY = height / 2
  const coordinates = new Map(graph.nodes.map((item, index) => {
    const angle = (Math.PI * 2 * index) / graph.nodes.length - Math.PI / 2
    const radius = index % 2 === 0 ? 170 : 135
    return [item.nodeId, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius }] as const
  }))
  const visibleRelations = graph.relations.filter((item) => filter === '全部' || item.type === filter)
  return (
    <div className="e04-graph-scroll" tabIndex={0} aria-label="可局部滚动的图谱画布">
      <svg className="e04-graph-canvas" role="img" aria-label={`课程知识图谱可视图，${graph.nodes.length} 个节点，${visibleRelations.length} 条当前可见关系`} viewBox={`0 0 ${width} ${height}`} style={{ width: `${zoom}%` }}>
        <defs><marker id="e04-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
        {visibleRelations.map((item) => {
          const start = coordinates.get(item.sourceNodeId)
          const end = coordinates.get(item.targetNodeId)
          if (!start || !end) return null
          return <line key={item.relationId} x1={start.x} y1={start.y} x2={end.x} y2={end.y} markerEnd="url(#e04-arrow)" data-relation-type={item.type} />
        })}
        {graph.nodes.map((item) => {
          const point = coordinates.get(item.nodeId)!
          return <g key={item.nodeId} className={graph.focusNodeIds.includes(item.nodeId) ? 'e04-node-focus' : ''} onClick={() => onLocate(item.sourceExcerptId)} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onLocate(item.sourceExcerptId)
            }
          }} role="button" tabIndex={0} aria-label={`定位 ${item.nodeId} ${item.label} 的来源 ${item.sourceExcerptId}`}>
            <circle cx={point.x} cy={point.y} r="27" />
            <text x={point.x} y={point.y - 2} textAnchor="middle">{item.nodeId}</text>
            <text x={point.x} y={point.y + 15} textAnchor="middle">{item.label.length > 6 ? `${item.label.slice(0, 6)}…` : item.label}</text>
          </g>
        })}
      </svg>
    </div>
  )
}

function GraphTools({ filter, setFilter, zoom, setZoom }: {
  filter: '全部' | E04RelationType
  setFilter: (value: '全部' | E04RelationType) => void
  zoom: number
  setZoom: (value: number) => void
}) {
  return <div className="e04-graph-tools">
    <label><Filter size={17} /><span>关系筛选</span><select aria-label="关系类型筛选" value={filter} onChange={(event) => setFilter(event.target.value as '全部' | E04RelationType)}>{relationTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
    <button type="button" aria-label="缩小图谱" onClick={() => setZoom(Math.max(75, zoom - 25))}><ZoomOut size={18} /></button>
    <span>{zoom}%</span>
    <button type="button" aria-label="放大图谱" onClick={() => setZoom(Math.min(175, zoom + 25))}><ZoomIn size={18} /></button>
  </div>
}

function ArtifactGrid({ progress, ready }: { progress: E04Progress; ready: boolean }) {
  const artifacts = progress.confirmedPackage?.artifacts ?? [
    { artifactId: 'E04:pending:knowledge-graph', kind: 'e04-knowledge-graph', name: '课程知识图谱' },
    { artifactId: 'E04:pending:node-relation-list', kind: 'e04-node-relation-list', name: '节点与关系列表' },
    { artifactId: 'E04:pending:revision-log', kind: 'e04-revision-log', name: '人工修正记录' },
  ]
  const descriptions = [
    `${progress.workingGraph?.nodes.length ?? 0} 节点、${progress.workingGraph?.relations.length ?? 0} 条有向关系的可筛选可视图。`,
    '与图谱可视图同源的节点表和关系表。',
    `${progress.revisions.length} 条修改前、修改后、定位记录和来源依据。`,
  ]
  return <div className="e04-artifact-grid">{artifacts.map((artifact, index) => <article key={artifact.kind}><span>{index + 1}</span><div><strong>{artifact.name}</strong><p>{descriptions[index]}</p><small>{artifact.artifactId}</small></div>{ready ? <CheckCircle2 size={21} /> : <FileText size={21} />}</article>)}</div>
}

export function E04WorkspacePage({ progress, participantId, directory, onUpdate, onNavigate, onNext, onReset }: E04WorkspacePageProps) {
  const [filter, setFilter] = useState<'全部' | E04RelationType>('全部')
  const [zoom, setZoom] = useState(100)
  const [locatedExcerptId, setLocatedExcerptId] = useState('')
  const score = useMemo(() => calculateE04Score(progress, directory), [progress, directory])
  const reviewers = eligibleE04Reviewers(directory)
  const participant = directory.participants.find((item) => item.participantId === participantId)
  const locatedExcerpt = progress.source.excerpts.find((item) => item.excerptId === locatedExcerptId)

  function resetReviewIdentity(patch: Partial<E04GraphReview>) {
    onUpdate((current) => {
      const base = current.workingGraph || current.confirmedPackage
        ? invalidateE04ReviewContext(current, '同组复核人员或任务角色发生变化')
        : current
      return {
        ...base,
        graphReview: {
          ...base.graphReview,
          recordId: '', reviewerId: '', reviewerGroupId: '', reviewerRole: undefined,
          graphId: '', reviewedGraphFingerprint: '', relationDirection: '', omission: '', targetRecordId: '', suggestion: '',
          authorTreatment: '', authorBasis: '', simulated: false, submitted: false, submittedAt: undefined,
          ...patch,
        },
        workingGraph: undefined,
        revisions: [],
        confirmedPackage: undefined,
      }
    })
  }

  function updateConfirmation(field: keyof E04TeacherConfirmation, checked: boolean) {
    onUpdate((current) => {
      const base = current.confirmedPackage ? invalidateE04Confirmation(current, '教师最终确认内容发生变化') : current
      return { ...base, teacherConfirmation: { ...base.teacherConfirmation, [field]: checked }, confirmedPackage: undefined }
    })
  }

  if (progress.route === 'overview') {
    return <>
      <PageHeader eyebrow={routeLabels.overview} title="用 60 分钟完成一次可追溯的课程知识图谱设计" description="从已登记课程材料抽取节点与有向关系，使用同一数据生成表格与可视图，经同组复核和教师修正后验收。" aside={<div className="metric-pill"><Network size={20} /><span><strong>60 分钟</strong><small>个人主作 · 小组复核</small></span></div>} />
      <section className="e04-overview-grid">
        <article className="content-card"><BookOpenCheck size={24} /><h2>有据输入</h2><p>登记课程名称、文档、版本、授权和可定位片段。</p></article>
        <article className="content-card"><GitBranch size={24} /><h2>确定闭环</h2><p>初稿稳定暴露 3 类缺陷，复核后完成 3 条可核对人工修正。</p></article>
        <article className="content-card"><BadgeCheck size={24} /><h2>恰好三项成果</h2><p>课程知识图谱、节点与关系列表、人工修正记录共占一个选修槽位。</p></article>
      </section>
      <div className="e04-boundary-note"><ShieldCheck size={20} /><div><strong>与 M09 的边界</strong><p>E04 只设计课程概念及关系结构，不代替 M09 的文档入库、切分、检索与引用。</p></div></div>
      <div className="page-actions"><span><ListChecks size={16} />8 步完成来源、初稿、复核、修正、确认和验收</span><button className="primary-button" type="button" onClick={onNext}>登记课程来源<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'source') {
    const validation = validateE04Source(progress)
    return <>
      <PageHeader eyebrow={routeLabels.source} title="先固定课程来源、版本和授权边界" description="后续每个节点和关系都必须回指当前来源片段；来源变化会使旧图谱与当前通过失效。" aside={<div className="metric-pill"><Link2 size={19} /><span><strong>{progress.source.excerpts.length} 条</strong><small>可定位片段</small></span></div>} />
      <section className="content-card e04-source-card">
        <div className="form-grid">
          {([
            ['courseName', '课程名称'], ['documentName', '来源文档'], ['version', '来源版本'], ['sourceOrganization', '来源机构'], ['authorization', '材料授权'], ['scopeNote', '使用范围'],
          ] as Array<[keyof Pick<E04CourseSource, 'courseName' | 'documentName' | 'version' | 'sourceOrganization' | 'authorization' | 'scopeNote'>, string]>).map(([field, label]) => <label className="field" key={field}><span>{label}</span><textarea rows={field === 'version' ? 2 : 3} value={progress.source[field]} onChange={(event) => onUpdate((current) => updateSourceField(current, field, event.target.value))} /></label>)}
        </div>
        <div className="e04-source-confirmations">
          {([
            ['materialAuthorizationConfirmed', '已核对材料授权'], ['privacyConfirmed', '未录入真实身份信息或密钥'], ['teacherVerifiedConfirmed', '教师已核验来源与适用范围'],
          ] as Array<[keyof Pick<E04CourseSource, 'materialAuthorizationConfirmed' | 'privacyConfirmed' | 'teacherVerifiedConfirmed'>, string]>).map(([field, label]) => <label key={field}><input type="checkbox" checked={progress.source[field]} onChange={(event) => onUpdate((current) => updateSourceField(current, field, event.target.checked))} /><span>{label}</span></label>)}
        </div>
      </section>
      <section className="content-card e04-excerpt-list"><div className="section-heading"><div><span className="eyebrow">TRACEABLE EXCERPTS</span><h2>课程来源片段</h2></div><span>{progress.source.documentName}</span></div>{progress.source.excerpts.map((item) => <article key={item.excerptId}><span>{item.excerptId}</span><div><strong>{item.heading}</strong><p>{item.content}</p></div></article>)}</section>
      <ValidationNotice messages={validation.messages} success="课程来源、版本、授权、隐私与可定位片段已完整登记。" />
      <div className="page-actions"><span>来源变化时保留旧尝试历史，但不沿用旧确认与通过</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>生成节点初稿<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'nodes') {
    const validation = validateE04Nodes(progress, participantId)
    const defects = detectE04InitialDefects(progress)
    return <>
      <PageHeader eyebrow={routeLabels.nodes} title="生成 16 个节点，并保留可区分的同名缺陷" description="AI 初稿为只读学习证据；N08 与 N16 的同名问题不在生成时暗中消失，将由同组复核和教师修正处理。" aside={<div className="metric-pill"><Network size={19} /><span><strong>{progress.aiDraft?.nodes.length ?? 0} / 15</strong><small>节点门槛</small></span></div>} />
      <button className="primary-button" type="button" disabled={!validateE04Source(progress).valid} onClick={() => onUpdate((current) => {
        const base = current.aiDraft ? invalidateE04DerivedWork(current, '重新生成节点与关系初稿') : current
        const draft = graphRunner.run(base, participantId)
        return { ...base, aiDraft: draft, updatedAt: new Date().toISOString() }
      })}><Sparkles size={17} />{progress.aiDraft ? '重新生成确定性初稿' : '生成确定性图谱初稿'}</button>
      {progress.aiDraft && <section className="e04-node-grid" aria-label="节点初稿">{progress.aiDraft.nodes.map((item) => <article className={item.nodeId === 'N08' || item.nodeId === 'N16' ? 'e04-node-card e04-issue' : 'e04-node-card'} key={item.nodeId}><header><span>{item.nodeId}</span><strong>{item.label}</strong></header><p>{item.definition}</p><footer><span>{item.category}</span><button type="button" onClick={() => setLocatedExcerptId(item.sourceExcerptId)}><LocateFixed size={15} />{item.sourceExcerptId}</button></footer></article>)}</section>}
      {locatedExcerpt && <div className="e04-source-locator"><SearchCheck size={18} /><div><strong>{locatedExcerpt.excerptId} · {locatedExcerpt.heading}</strong><p>{locatedExcerpt.content}</p></div></div>}
      <div className="e04-defect-strip"><AlertTriangle size={19} /><div><strong>当前初稿缺陷</strong><p>{defects.length ? '同名节点、先修方向反转、无来源关系均已被稳定保留。' : '等待生成初稿。'}</p></div><span>{defects.length} / 3</span></div>
      <ValidationNotice messages={validation.messages} success="16 个节点及其来源已生成，同名节点缺陷可明确识别。" />
      <div className="page-actions"><span>初稿缺陷是后续复核与修正的有效证据</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>检查有向关系<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'relations') {
    const validation = validateE04Relations(progress, participantId)
    const diagnostics = diagnoseE04Graph(progress.aiDraft, progress)
    return <>
      <PageHeader eyebrow={routeLabels.relations} title="检查 22 条有向关系与 4 类关系" description="关系必须明确起点、方向、类型、终点和来源；R07 与 R18 保留为可复核的确定性问题。" aside={<div className="metric-pill"><GitBranch size={19} /><span><strong>{progress.aiDraft?.relations.length ?? 0} / 20</strong><small>{new Set(progress.aiDraft?.relations.map((item) => item.type) ?? []).size} / 3 类型</small></span></div>} />
      <div className="e04-table-scroll" tabIndex={0}><table className="e04-relation-table"><thead><tr><th>编号</th><th>起点</th><th>类型</th><th>终点</th><th>来源</th><th>依据</th></tr></thead><tbody>{progress.aiDraft?.relations.map((item) => <tr className={['R07', 'R18'].includes(item.relationId) ? 'e04-issue' : ''} key={item.relationId}><td>{item.relationId}</td><td>{item.sourceNodeId}</td><td>{item.type}</td><td>{item.targetNodeId}</td><td>{item.sourceExcerptId ? <button className="e04-source-button" type="button" onClick={() => setLocatedExcerptId(item.sourceExcerptId)}><LocateFixed size={15} />{item.sourceExcerptId}</button> : '缺失'}</td><td>{item.rationale}</td></tr>)}</tbody></table></div>
      {locatedExcerpt && <div className="e04-source-locator"><SearchCheck size={18} /><div><strong>{locatedExcerpt.excerptId} · {locatedExcerpt.heading}</strong><p>{locatedExcerpt.content}</p></div></div>}
      <section className="e04-quality-grid"><article><span>{diagnostics.duplicateNodeGroups.length}</span><strong>同名节点组</strong></article><article><span>{diagnostics.selfLoopRelationIds.length}</span><strong>自环关系</strong></article><article><span>{diagnostics.orphanNodeIds.length}</span><strong>孤立节点</strong></article><article className="e04-issue"><span>{diagnostics.unsupportedRelationIds.length}</span><strong>无来源关系</strong></article></section>
      <ValidationNotice messages={validation.messages} success="22 条有向关系覆盖 4 种类型，方向反转与无来源问题均可定位。" />
      <div className="page-actions"><span>“起点 → 类型 → 终点”与表格、可视图共用同一数据</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>打开图谱并同组复核<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'graph-review') {
    const validation = validateE04GraphReview(progress, directory)
    const selectedReviewer = reviewers.find((item) => item.participantId === progress.graphReview.reviewerId)
    return <>
      <PageHeader eyebrow={routeLabels['graph-review']} title="用可筛选图谱检查方向与关键遗漏" description="节点表、关系表和可视图使用同一份初稿数据；点击节点可定位来源。" aside={<div className="metric-pill"><UsersRound size={19} /><span><strong>{reviewers.length} 人</strong><small>当前同组可选</small></span></div>} />
      <section className="content-card e04-graph-card"><GraphTools filter={filter} setFilter={setFilter} zoom={zoom} setZoom={setZoom} /><GraphPreview graph={progress.aiDraft} filter={filter} zoom={zoom} onLocate={setLocatedExcerptId} />{locatedExcerpt && <div className="e04-source-locator"><SearchCheck size={18} /><div><strong>{locatedExcerpt.excerptId} · {locatedExcerpt.heading}</strong><p>{locatedExcerpt.content}</p></div></div>}</section>
      <div className="e04-simulation-note"><UsersRound size={20} /><div><strong>无多人后端的模拟复核边界</strong><p>{progress.graphReview.disclosure}</p></div></div>
      <section className="content-card e04-review-card">
        <div className="form-grid"><label className="field"><span>当前同组其他成员</span><select value={progress.graphReview.reviewerId} onChange={(event) => resetReviewIdentity({ reviewerId: event.target.value })}><option value="">请选择</option>{reviewers.map((item) => <option key={item.participantId} value={item.participantId}>{item.name} · {item.specialty}</option>)}</select><small>不显示本人或跨组成员。</small></label><label className="field"><span>本次任务临时角色</span><select value={progress.graphReview.reviewerRole ?? ''} onChange={(event) => resetReviewIdentity({ reviewerId: progress.graphReview.reviewerId, reviewerRole: event.target.value as GroupRole })}><option value="">请选择</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select></label><label className="field"><span>当前小组</span><input readOnly value={participant?.groupName ?? '未分组'} /></label><label className="field"><span>被复核图谱</span><input readOnly value={progress.aiDraft?.graphId ?? '尚未生成'} /></label></div>
        <button className="secondary-button" type="button" disabled={!selectedReviewer || !progress.graphReview.reviewerRole} onClick={() => onUpdate((current) => ({ ...current, graphReview: simulateE04GraphReview(current, directory), workingGraph: undefined, revisions: [], confirmedPackage: undefined }))}><Sparkles size={16} />生成并披露模拟组员复核</button>
        {progress.graphReview.recordId && <div className="e04-review-result"><article><span>关系方向</span><strong>{progress.graphReview.relationDirection}</strong></article><article><span>关键遗漏</span><strong>{progress.graphReview.omission}</strong></article><article><span>定位记录</span><strong>{progress.graphReview.targetRecordId}</strong></article><p><strong>具体建议：</strong>{progress.graphReview.suggestion}</p></div>}
        <button className="primary-button" type="button" disabled={!progress.graphReview.recordId || progress.graphReview.submitted} onClick={() => onUpdate((current) => ({ ...current, graphReview: { ...current.graphReview, submitted: true, submittedAt: new Date().toISOString() } }))}><FileCheck2 size={17} />{progress.graphReview.submitted ? '复核记录已提交' : '提交方向与遗漏复核'}</button>
      </section>
      <ValidationNotice messages={validation.messages} success="同组其他成员、临时角色、方向与遗漏事实及模拟边界已完整保存。" />
      <div className="page-actions"><span>“需调整”和“存在遗漏”是有效复核事实，不会被当作无效提交</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>根据意见人工修正<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'revision') {
    const validation = validateE04Revision(progress, directory)
    const diagnostics = diagnoseE04Graph(progress.workingGraph, progress)
    return <>
      <PageHeader eyebrow={routeLabels.revision} title="完成 3 条可核对修正，并保持数量门槛" description="合并同名节点、反转先修方向、删除无来源关系；每条修正保存前后值、复核记录和课程片段。" aside={<div className="metric-pill"><Wrench size={19} /><span><strong>{progress.revisions.length} / 2</strong><small>实质修正门槛</small></span></div>} />
      <section className="content-card e04-revision-card"><div className="section-heading"><div><span className="eyebrow">TRACEABLE REVISION</span><h2>修正记录</h2></div><span>{progress.graphReview.recordId || '等待复核'}</span></div><div className="e04-revision-grid">{[
        ['N16', '合并同名节点', 'N16：负向提示词', '合并至 N08 并保留别名'],
        ['R07', '反转先修方向', 'N08 -先修-> N04', 'N04 -先修-> N08'],
        ['R18', '删除无来源关系', 'N15 -组成-> N10', '已删除'],
      ].map(([id, label, before, after], index) => {
        const record = progress.revisions.find((item) => item.targetId === id)
        return <article className={record ? 'e04-complete' : ''} key={id}><header><span>{index + 1}</span><div><strong>{id} · {label}</strong><small>{record ? `依据 ${record.basisExcerptId}` : '等待应用修正'}</small></div>{record ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</header><div><p><span>修改前</span>{record?.beforeValue ?? before}</p><ArrowRight size={16} /><p><span>修改后</span>{record?.afterValue ?? after}</p></div>{record && <small>{record.basis}</small>}</article>
      })}</div><button className="primary-button" type="button" disabled={!progress.graphReview.submitted || Boolean(progress.workingGraph && validation.valid)} onClick={() => onUpdate((current) => applyE04ReferenceCorrections(current, participantId))}><Wrench size={17} />{progress.workingGraph ? '三项修正已应用' : '应用 3 项有据修正'}</button></section>
      {progress.workingGraph && <section className="e04-quality-grid"><article><span>{progress.workingGraph.nodes.length}</span><strong>节点</strong></article><article><span>{progress.workingGraph.relations.length}</span><strong>有向关系</strong></article><article><span>{new Set(progress.workingGraph.relations.map((item) => item.type)).size}</span><strong>关系类型</strong></article><article className={Object.values(diagnostics).every((items) => items.length === 0) ? 'e04-complete' : 'e04-issue'}><span>{Object.values(diagnostics).reduce((sum, items) => sum + items.length, 0)}</span><strong>质量问题</strong></article></section>}
      <ValidationNotice messages={validation.messages} success="15 个节点、21 条关系和 4 种类型均达标，3 条修正与来源依据完整。" />
      <div className="page-actions"><span>工作图谱发生实质变化后，旧确认与当前通过失效，但历史保留</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入教师最终确认<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'confirmation') {
    const finalValidation = validateE04Revision(progress, directory)
    const validation = validateE04Confirmation(progress, directory)
    const packageCurrent = confirmedE04PackageIsCurrent(progress, directory)
    const checkedCount = Object.values(progress.teacherConfirmation).filter(Boolean).length
    return <>
      <PageHeader eyebrow={routeLabels.confirmation} title="由教师确认来源、图质量、三项成果和最终责任" description="确认不是一个总勾选；四类事实须分别留痕，并与当前人员、组员名单和图谱指纹绑定。" aside={<div className="metric-pill"><UserCheck size={19} /><span><strong>{checkedCount} / 4</strong><small>教师责任确认</small></span></div>} />
      <section className="content-card e04-confirmation-card"><div className="section-heading"><div><span className="eyebrow">TEACHER RESPONSIBILITY</span><h2>四项逐条确认</h2></div><span>{finalValidation.valid ? '最终图谱已就绪' : '最终图谱仍有缺项'}</span></div><div className="e04-confirmation-list">{confirmationItems.map(([field, label, detail]) => <label key={field}><input type="checkbox" disabled={!finalValidation.valid} checked={progress.teacherConfirmation[field]} onChange={(event) => updateConfirmation(field, event.target.checked)} /><span><strong>{label}</strong><small>{detail}</small></span>{progress.teacherConfirmation[field] && <CheckCircle2 size={18} />}</label>)}</div><button className="primary-button" type="button" disabled={!validation.valid} onClick={() => onUpdate((current) => ({ ...current, confirmedPackage: createConfirmedE04Package(current, directory) }))}><ShieldCheck size={17} />{packageCurrent ? '当前三项成果已确认' : '形成教师确认的三项成果'}</button></section>
      <section className="content-card e04-artifact-section"><div className="section-heading"><div><span className="eyebrow">EXACTLY THREE OUTPUTS</span><h2>固定成果恰好 3 项</h2></div><span>{packageCurrent ? '当前指纹已确认' : '等待确认'}</span></div><ArtifactGrid progress={progress} ready={packageCurrent} /><p className="e04-slot-note"><BadgeCheck size={16} />三项任务成果共同构成 E04 的一个个人选修成果，不会在十类个人成果中占三个槽位。</p></section>
      <ValidationNotice messages={validation.messages} success={packageCurrent ? '四项教师责任已确认，当前内容指纹对应的三项固定成果已形成。' : '四项教师责任已确认；请形成当前三项固定成果。'} />
      <div className="page-actions"><span>来源、人员、复核、修正或确认变化后，旧历史保留，当前成果包失效</span><button className="primary-button" type="button" disabled={!packageCurrent} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div>
    </>
  }

  const assessmentValidation = validateE04AssessmentSubmission(progress, directory)
  const passed = latestE04AssessmentIsCurrent(progress, directory)
  const packageCurrent = confirmedE04PackageIsCurrent(progress, directory)
  return <>
    <PageHeader eyebrow={routeLabels.result} title={passed ? 'E04 当前验收已通过' : 'E04 五维评分与成果验收'} description="总分不低于 8 分、四项核心要求全部通过，且专业证据、人工迭代、安全三项硬门槛均为 2 分。" aside={<div className={passed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>} />
    <section className={passed ? 'result-banner passed' : 'result-banner'}>{passed ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}<div><strong>{passed ? '当前验收通过，恰好三项成果已归档' : packageCurrent ? '三项成果已确认，等待提交验收' : '当前确认版仍有缺项'}</strong><p>16 节点初稿 → 方向及遗漏复核 → 3 项有据修正 → 15 节点、21 关系确认版。</p></div><span>{score.coreRequirements.filter((item) => item.passed).length} / 4 核心要求</span></section>
    <div className="score-layout e04-score-layout"><section className="content-card e04-score-card"><div className="dimension-list">{score.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong>{['evidence', 'iteration', 'safety'].includes(dimension.id) && <em className="e04-hard-gate">硬门槛</em>}<p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section><section className="content-card e04-requirement-card"><div className="requirement-list">{score.coreRequirements.map((requirement) => <button className={requirement.passed ? 'passed' : ''} type="button" key={requirement.id} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section></div>
    <section className="e04-gate-summary"><div className={score.total >= 8 ? 'e04-passed' : ''}><Scale size={18} /><span><strong>{score.total >= 8 ? '总分已达标' : '总分未达标'}</strong><small>{score.total} / 10，要求 ≥ 8</small></span></div><div className={score.hardGatesPassed ? 'e04-passed' : ''}><ShieldCheck size={18} /><span><strong>{score.hardGatesPassed ? '三项硬门槛通过' : '硬门槛未全部通过'}</strong><small>专业证据 · 人工迭代 · 安全</small></span></div><div className={score.coreRequirementsPassed ? 'e04-passed' : ''}><ListChecks size={18} /><span><strong>{score.coreRequirementsPassed ? '核心要求完整' : '核心要求仍有缺项'}</strong><small>{score.coreRequirements.filter((item) => item.passed).length} / 4</small></span></div></section>
    <section className="content-card e04-result-artifacts"><div className="section-heading"><div><span className="eyebrow">ARCHIVE CONTRACT</span><h2>三项成果 · 一个选修槽位</h2></div><span>{passed ? '已同步归档' : '待当前验收'}</span></div><ArtifactGrid progress={progress} ready={passed} /></section>
    <section className="content-card e04-assessment-card"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>初验与复验历史</h2></div><span>{progress.assessments.length} 次</span></div>{progress.assessments.length > 0 && <div className="e04-history-list">{progress.assessments.map((assessment, index) => <article key={assessment.assessmentId}><span>{assessment.attempt === 'initial' ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '待补验'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN', { hour12: false })}</small><em>{assessment.modificationSummary || '按当前内容指纹提交'}</em></article>)}</div>}{!passed && <button className="primary-button" type="button" disabled={!assessmentValidation.valid} onClick={() => onUpdate((current) => ({ ...current, assessments: [...current.assessments, createE04Assessment(current, directory, current.assessments.length ? '按当前图谱、复核与修正记录重新提交。' : '完成同组复核和三项有据修正。')] }))}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交验收'}</button>}</section>
    <ValidationNotice messages={assessmentValidation.messages} success="当前教师确认版、三项固定成果和全部验收证据已经齐备。" />
    <div className="page-actions"><span>实质内容变化后旧验收历史保留，当前通过按内容指纹自动失效</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 E04</button></div>
    {progress.attemptHistory.length > 0 && <p className="e04-attempt-note"><History size={16} />已保留 {progress.attemptHistory.length} 条来源、复核或确认变化前的完整快照。</p>}
  </>
}
