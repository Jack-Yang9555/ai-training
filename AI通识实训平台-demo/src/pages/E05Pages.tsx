import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  FileCode2,
  FileText,
  Filter,
  History,
  Link2,
  ListChecks,
  RotateCcw,
  Scale,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TestTube2,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import type {
  E05CourseProfile,
  E05CoverageStatus,
  E05JobMaterial,
  E05PeerReview,
  E05Progress,
  E05Route,
  E05TeacherConfirmation,
} from '../e05/domain'
import {
  applyE05ReferenceRevision,
  createE05WebPage,
  downloadE05SingleFileHtml,
  effectiveE05Mappings,
  effectiveE05Suggestions,
  eligibleE05Reviewers,
  invalidateE05Confirmation,
  invalidateE05DerivedWork,
  invalidateE05ReviewContext,
  LocalE05MappingRunner,
  runE05OfflineTest,
  simulateE05PeerReview,
} from '../e05/runner'
import { calculateE05Score, createE05Assessment } from '../e05/scoring'
import { createConfirmedE05Package } from '../e05/storage'
import {
  confirmedE05PackageIsCurrent,
  detectE05InitialDefects,
  latestE05AssessmentIsCurrent,
  validateE05AssessmentSubmission,
  validateE05Confirmation,
  validateE05Mapping,
  validateE05PeerReview,
  validateE05Revision,
  validateE05Source,
  validateE05Suggestions,
  validateE05WebPage,
} from '../e05/validation'
import type { ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

const mappingRunner = new LocalE05MappingRunner()
const groupRoles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']
const coverageOptions: Array<'全部' | E05CoverageStatus> = ['全部', '已覆盖', '覆盖不足', '暂未覆盖']

export interface E05WorkspacePageProps {
  progress: E05Progress
  participantId: string
  directory: ParticipantDirectory
  onUpdate: (updater: (current: E05Progress) => E05Progress) => void
  onNavigate: (route: E05Route) => void
  onNext: () => void
  onReset: () => void
}

const routeLabels: Record<E05Route, string> = {
  overview: '步骤 1 / 8 · 任务说明',
  source: '步骤 2 / 8 · 岗位与课程来源',
  mapping: '步骤 3 / 8 · 岗位任务与映射',
  suggestions: '步骤 4 / 8 · 建议与单文件网页',
  'peer-review': '步骤 5 / 8 · 同组复核',
  revision: '步骤 6 / 8 · 人工修正与离线复测',
  confirmation: '步骤 7 / 8 · 教师确认',
  result: '步骤 8 / 8 · 评分与成果',
}

const confirmationItems: Array<[keyof E05TeacherConfirmation, string, string]> = [
  ['sourceAndEvidenceConfirmed', '来源、授权、脱敏与双侧证据已核验', '岗位任务只来自当前已审核材料，课程事实只来自本人课程文件。'],
  ['mappingAndSuggestionsConfirmed', '映射与恰好 3 项建议已逐项核验', '映射不重复、状态互斥，建议只回应已记录差距。'],
  ['offlineArtifactConfirmed', '单文件 HTML 已预览、可导出并通过离线复测', '网页可筛选覆盖状态、点击映射查看两侧依据，不含外链脚本或密钥。'],
  ['finalResponsibilityConfirmed', '教师承担最终专业判断责任', 'AI 抽取、建议与模拟组员意见仅作辅助，不自行增加岗位要求。'],
]

function updateJobField<K extends keyof E05JobMaterial>(current: E05Progress, field: K, value: E05JobMaterial[K]) {
  const reset = invalidateE05DerivedWork(current, '岗位材料、审核、脱敏或授权发生变化')
  return { ...reset, source: { ...reset.source, jobMaterial: { ...reset.source.jobMaterial, [field]: value } } }
}

function updateCourseField<K extends keyof E05CourseProfile>(current: E05Progress, field: K, value: E05CourseProfile[K]) {
  const reset = invalidateE05DerivedWork(current, '本人课程目标、内容或版本发生变化')
  return { ...reset, source: { ...reset.source, course: { ...reset.source.course, [field]: value } } }
}

function ArtifactGrid({ progress, ready }: { progress: E05Progress; ready: boolean }) {
  const artifacts = progress.confirmedPackage?.artifacts ?? [
    { artifactId: 'E05:pending:mapping-webpage', kind: 'e05-mapping-webpage', name: '课程—岗位能力映射网页', filename: progress.webPage?.filename },
    { artifactId: 'E05:pending:gap-suggestion-list', kind: 'e05-gap-suggestion-list', name: '差距与改进建议清单' },
  ]
  const descriptions = [
    `${progress.jobTaskDraft?.tasks.length ?? 0} 项岗位任务、${effectiveE05Mappings(progress).length} 条映射，支持筛选与两侧证据详情。`,
    `${effectiveE05Suggestions(progress).length} 项建议与 ${progress.revisions.length} 条修改前后和依据记录。`,
  ]
  return <div className="e05-artifact-grid">{artifacts.map((artifact, index) => <article key={artifact.kind}><span>{index + 1}</span><div><strong>{artifact.name}</strong><p>{descriptions[index]}</p><small>{artifact.filename || artifact.artifactId}</small></div>{ready ? <CheckCircle2 size={21} /> : <FileText size={21} />}</article>)}</div>
}

function WebArtifactPanel({ progress, participantId, onUpdate, allowGenerate }: {
  progress: E05Progress
  participantId: string
  onUpdate: E05WorkspacePageProps['onUpdate']
  allowGenerate: boolean
}) {
  const validation = validateE05WebPage(progress, participantId)
  const checks = progress.webPage?.offlineTest?.checks
  return <section className="content-card e05-web-card">
    <div className="section-heading"><div><span className="eyebrow">SINGLE-FILE HTML</span><h2>实时预览、导出与离线测试</h2></div><span>{progress.webPage ? `v${progress.webPage.version} · ${progress.webPage.filename}` : '等待生成'}</span></div>
    <div className="e05-web-actions">
      <button className="primary-button" type="button" disabled={!allowGenerate} onClick={() => onUpdate((current) => ({ ...current, webPage: createE05WebPage(current, participantId), confirmedPackage: undefined }))}><FileCode2 size={17} />{progress.webPage ? '重新生成当前 HTML' : '生成单文件 HTML'}</button>
      <button className="secondary-button" type="button" disabled={!progress.webPage} onClick={() => onUpdate(runE05OfflineTest)}><TestTube2 size={17} />运行本地离线测试</button>
      <button className="secondary-button" type="button" disabled={!progress.webPage} onClick={() => progress.webPage && downloadE05SingleFileHtml(progress.webPage)}><Download size={17} />导出 HTML</button>
    </div>
    {checks && <div className="e05-offline-checks">{Object.entries(checks).map(([id, passed]) => <span className={passed ? 'e05-passed' : ''} key={id}>{passed ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{id}</span>)}</div>}
    {progress.webPage && <div className="e05-preview-shell"><header><Eye size={17} /><strong>当前单文件预览</strong><small>{progress.webPage.exportDisclosure}</small></header><iframe title="E05 课程岗位映射单文件预览" srcDoc={progress.webPage.html} sandbox="allow-scripts" /></div>}
    <ValidationNotice messages={validation.messages} success="单文件 HTML 与当前映射、恰好 3 项建议指纹一致，覆盖筛选、关系详情和无外部依赖离线测试已通过。" />
  </section>
}

export function E05WorkspacePage({ progress, participantId, directory, onUpdate, onNavigate, onNext, onReset }: E05WorkspacePageProps) {
  const [coverageFilter, setCoverageFilter] = useState<'全部' | E05CoverageStatus>('全部')
  const [selectedMappingId, setSelectedMappingId] = useState('')
  const score = useMemo(() => calculateE05Score(progress, directory), [progress, directory])
  const reviewers = eligibleE05Reviewers(directory)
  const participant = directory.participants.find((item) => item.participantId === participantId)
  const mappings = effectiveE05Mappings(progress)
  const suggestions = effectiveE05Suggestions(progress)
  const selectedMapping = mappings.find((item) => item.mappingId === selectedMappingId)
  const selectedObjective = progress.source.course.objectives.find((item) => item.objectiveId === selectedMapping?.courseObjectiveId)
  const selectedTask = progress.jobTaskDraft?.tasks.find((item) => item.taskId === selectedMapping?.jobTaskId)

  function resetReviewIdentity(patch: Partial<E05PeerReview>) {
    onUpdate((current) => {
      const base = current.workingMappings || current.confirmedPackage
        ? invalidateE05ReviewContext(current, '同组复核人员或任务角色发生变化')
        : current
      return {
        ...base,
        peerReview: {
          ...base.peerReview,
          recordId: '', reviewerId: '', reviewerGroupId: '', reviewerRole: undefined,
          reviewedMappingFingerprint: '', reviewedSuggestionFingerprint: '', reviewedWebPageId: '',
          mappingJudgement: '', suggestionJudgement: '', targetRecordIds: [], suggestion: '',
          authorTreatment: '', authorBasis: '', simulated: false, submitted: false, submittedAt: undefined,
          ...patch,
        },
        workingMappings: undefined,
        workingSuggestions: undefined,
        revisions: [],
        confirmedPackage: undefined,
      }
    })
  }

  function updateConfirmation(field: keyof E05TeacherConfirmation, checked: boolean) {
    onUpdate((current) => {
      const base = current.confirmedPackage ? invalidateE05Confirmation(current, '教师最终确认内容发生变化') : current
      return { ...base, teacherConfirmation: { ...base.teacherConfirmation, [field]: checked }, confirmedPackage: undefined }
    })
  }

  if (progress.route === 'overview') {
    return <>
      <PageHeader eyebrow={routeLabels.overview} title="用 60 分钟把课程目标与岗位任务做成可点击的离线映射网页" description="只从经审核、授权、脱敏的岗位材料和本人课程目标建立双侧有据关系，通过同组复核与教师修正形成两项成果。" aside={<div className="metric-pill"><TableProperties size={20} /><span><strong>60 分钟</strong><small>个人主作 · 小组复核</small></span></div>} />
      <section className="e05-overview-grid"><article className="content-card"><BookOpenCheck size={24} /><h2>两侧审核事实</h2><p>岗位任务来自已审核脱敏材料，课程目标来自本人课程文件。</p></article><article className="content-card"><Link2 size={24} /><h2>不少于 10 条映射</h2><p>每条关系有唯一目标—任务组合、互斥覆盖状态和双侧依据。</p></article><article className="content-card"><FileCode2 size={24} /><h2>单文件 HTML</h2><p>支持覆盖筛选、点击关系查看两侧依据、本地预览、导出与离线测试。</p></article></section>
      <div className="e05-boundary-note"><ShieldCheck size={20} /><div><strong>与 M08 的边界</strong><p>E05 只生成课程—岗位映射与差距建议网页，不复制 M08 的学生练习网页或交互任务。</p></div></div>
      <div className="page-actions"><span><ListChecks size={16} />8 步完成来源、映射、建议、网页、复核、修正和验收</span><button className="primary-button" type="button" onClick={onNext}>登记两侧来源<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'source') {
    const validation = validateE05Source(progress)
    return <>
      <PageHeader eyebrow={routeLabels.source} title="锁定已审核脱敏岗位材料与本人课程目标" description="岗位任务与课程目标分属两个事实源；未审核、未授权、未脱敏或来源不清时不能生成。" aside={<div className="metric-pill"><ShieldCheck size={19} /><span><strong>{progress.source.jobMaterial.excerpts.length} + {progress.source.course.objectives.length}</strong><small>岗位片段 · 课程目标</small></span></div>} />
      <div className="e05-source-layout"><section className="content-card e05-source-card"><div className="section-heading"><div><span className="eyebrow">JOB MATERIAL</span><h2>岗位材料</h2></div><span>{progress.source.jobMaterial.auditStatus} · {progress.source.jobMaterial.anonymized ? '已脱敏' : '未脱敏'}</span></div><div className="form-grid">{([
        ['documentName', '文档名称'], ['version', '版本'], ['sourceOrganization', '来源机构'], ['authorization', '授权'], ['scopeNote', '适用范围'],
      ] as Array<[keyof Pick<E05JobMaterial, 'documentName' | 'version' | 'sourceOrganization' | 'authorization' | 'scopeNote'>, string]>).map(([field, label]) => <label className="field" key={field}><span>{label}</span><textarea rows={field === 'version' ? 2 : 3} value={progress.source.jobMaterial[field]} onChange={(event) => onUpdate((current) => updateJobField(current, field, event.target.value))} /></label>)}</div><div className="e05-excerpt-list">{progress.source.jobMaterial.excerpts.map((item) => <article key={item.excerptId}><span>{item.excerptId}</span><div><strong>{item.heading}</strong><p>{item.content}</p></div></article>)}</div></section>
      <section className="content-card e05-course-card"><div className="section-heading"><div><span className="eyebrow">MY COURSE</span><h2>本人课程目标</h2></div><span>{progress.source.course.version}</span></div><div className="form-grid">{([
        ['courseName', '课程名称'], ['documentName', '课程文件'], ['version', '版本'], ['ownerStatement', '本人责任说明'], ['authorization', '课程文件授权'],
      ] as Array<[keyof Pick<E05CourseProfile, 'courseName' | 'documentName' | 'version' | 'ownerStatement' | 'authorization'>, string]>).map(([field, label]) => <label className="field" key={field}><span>{label}</span><textarea rows={field === 'version' ? 2 : 3} value={progress.source.course[field]} onChange={(event) => onUpdate((current) => updateCourseField(current, field, event.target.value))} /></label>)}</div><div className="e05-objective-list">{progress.source.course.objectives.map((item, index) => <label className="field" key={item.objectiveId}><span>{item.objectiveId} · {item.title} · {item.evidenceId}</span><textarea rows={3} value={item.description} onChange={(event) => onUpdate((current) => {
        const reset = invalidateE05DerivedWork(current, '本人课程目标发生变化')
        const objectives = reset.source.course.objectives.map((objective, objectiveIndex) => objectiveIndex === index ? { ...objective, description: event.target.value } : objective)
        return { ...reset, source: { ...reset.source, course: { ...reset.source.course, objectives } } }
      })} /></label>)}</div></section></div>
      <div className="e05-source-confirmations">{([
        ['jobMaterialAuthorizationConfirmed', '岗位材料审核与授权已核对'], ['privacyConfirmed', '岗位材料已脱敏，未录入真实身份信息或密钥'], ['courseOwnershipConfirmed', '课程目标为本人录入并可用于本次映射'], ['teacherVerifiedConfirmed', '教师已核验两侧来源和适用范围'],
      ] as Array<[keyof Pick<E05Progress['source'], 'jobMaterialAuthorizationConfirmed' | 'privacyConfirmed' | 'courseOwnershipConfirmed' | 'teacherVerifiedConfirmed'>, string]>).map(([field, label]) => <label key={field}><input type="checkbox" checked={progress.source[field]} onChange={(event) => onUpdate((current) => {
        const reset = invalidateE05DerivedWork(current, '来源审核、授权或隐私确认发生变化')
        return { ...reset, source: { ...reset.source, [field]: event.target.checked } }
      })} /><span>{label}</span></label>)}</div>
      <ValidationNotice messages={validation.messages} success="岗位材料的审核、授权、脱敏与本人课程目标、版本和所有权已完整登记。" />
      <div className="page-actions"><span>来源变化会保留旧尝试快照，但不沿用旧映射、确认或通过</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>提取岗位任务并建立映射<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'mapping') {
    const validation = validateE05Mapping(progress, participantId)
    const visibleMappings = mappings.filter((item) => coverageFilter === '全部' || item.status === coverageFilter)
    return <>
      <PageHeader eyebrow={routeLabels.mapping} title="确定性提取 6 项岗位任务，建立 12 条双侧有据映射" description="同一课程目标与岗位任务组合不重复；每条映射只标记一种互斥覆盖状态，并可点击查看两侧依据。" aside={<div className="metric-pill"><TableProperties size={19} /><span><strong>{mappings.length} / 10</strong><small>{progress.jobTaskDraft?.tasks.length ?? 0} / 5 岗位任务</small></span></div>} />
      <button className="primary-button" type="button" disabled={!validateE05Source(progress).valid} onClick={() => onUpdate((current) => {
        const base = current.jobTaskDraft ? invalidateE05DerivedWork(current, '重新提取岗位任务与映射初稿') : current
        return { ...base, ...mappingRunner.run(base, participantId), updatedAt: new Date().toISOString() }
      })}><Sparkles size={17} />{progress.mappingDraft ? '重新生成确定性映射初稿' : '运行本地任务提取与映射'}</button>
      {progress.jobTaskDraft && <section className="e05-task-grid" aria-label="岗位任务列表">{progress.jobTaskDraft.tasks.map((item) => <article key={item.taskId}><span>{item.taskId}</span><div><strong>{item.name}</strong><p>{item.description}</p><small>{item.jobEvidenceExcerptId}</small></div></article>)}</section>}
      {progress.mappingDraft && <><div className="e05-mapping-toolbar"><label><Filter size={17} /><span>覆盖筛选</span><select aria-label="覆盖状态筛选" value={coverageFilter} onChange={(event) => setCoverageFilter(event.target.value as '全部' | E05CoverageStatus)}>{coverageOptions.map((item) => <option key={item}>{item}</option>)}</select></label><span aria-live="polite">当前 {visibleMappings.length} 条</span></div><div className="e05-mapping-list">{visibleMappings.map((item) => {
        const objective = progress.source.course.objectives.find((candidate) => candidate.objectiveId === item.courseObjectiveId)
        const task = progress.jobTaskDraft?.tasks.find((candidate) => candidate.taskId === item.jobTaskId)
        return <button aria-pressed={selectedMappingId === item.mappingId} className={item.mappingId === 'MAP-12' ? 'e05-mapping-row e05-issue' : 'e05-mapping-row'} type="button" key={item.mappingId} onClick={() => setSelectedMappingId(item.mappingId)}><span>{item.mappingId}</span><strong>{objective?.title} → {task?.name}</strong><em>{item.status}</em><small>{item.courseEvidenceId} + {item.jobEvidenceExcerptId}</small><Eye size={17} /></button>
      })}</div></>}
      {selectedMapping && <section className="e05-relation-detail" aria-live="polite"><SearchCheck size={20} /><div><strong>{selectedMapping.mappingId} · {selectedObjective?.title} → {selectedTask?.name}</strong><p><b>课程依据 {selectedMapping.courseEvidenceId}：</b>{selectedMapping.courseEvidenceSummary}</p><p><b>岗位依据 {selectedMapping.jobEvidenceExcerptId}：</b>{selectedMapping.jobEvidenceSummary}</p><small>判断：{selectedMapping.judgementBasis}</small></div></section>}
      {progress.mappingDraft && <div className="e05-defect-note"><AlertTriangle size={19} /><div><strong>初稿保留一项可区分误判</strong><p>MAP-12 的课程证据明确“未覆盖交付记录”，初稿却标为“覆盖不足”；后续将由同组复核与教师修正。</p></div><span>{detectE05InitialDefects(progress).filter((item) => item === 'incorrect-map-12-status').length} / 1</span></div>}
      <ValidationNotice messages={validation.messages} success="6 项岗位任务与 12 条不重复、状态互斥、双侧有据映射已形成，MAP-12 误判可明确复核。" />
      <div className="page-actions"><span>点击映射关系可查看课程与岗位两侧依据</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>生成 3 项建议与网页<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'suggestions') {
    const suggestionValidation = validateE05Suggestions(progress, participantId)
    const webValidation = validateE05WebPage(progress, participantId)
    return <>
      <PageHeader eyebrow={routeLabels.suggestions} title="确认恰好 3 项建议，生成可离线的单文件网页" description="建议只回应已记录的覆盖不足或暂未覆盖关系，不自行增加岗位要求；AI 原建议将与教师修正版分开保存。" aside={<div className="metric-pill"><FileCode2 size={19} /><span><strong>{suggestions.length} / 3</strong><small>建议数量必须恰好</small></span></div>} />
      <button className="primary-button" type="button" disabled={!validateE05Mapping(progress, participantId).valid} onClick={() => onUpdate((current) => ({ ...current, aiSuggestionDraft: mappingRunner.suggest(current, participantId), webPage: undefined, confirmedPackage: undefined }))}><Sparkles size={17} />{progress.aiSuggestionDraft ? '重新生成恰好 3 项建议初稿' : '生成恰好 3 项建议初稿'}</button>
      {progress.aiSuggestionDraft && <section className="e05-suggestion-grid">{progress.aiSuggestionDraft.suggestions.map((item) => <article className={item.suggestionId === 'SG-03' ? 'e05-issue' : ''} key={item.suggestionId}><header><span>{item.suggestionId}</span><strong>{item.linkedMappingId}</strong></header><p><b>差距：</b>{item.gap}</p><p><b>课程调整：</b>{item.courseAdjustment}</p><p><b>预期证据：</b>{item.expectedEvidence}</p><small>{item.courseEvidenceId} + {item.jobEvidenceExcerptId}</small></article>)}</section>}
      <ValidationNotice messages={suggestionValidation.messages} success="恰好 3 项建议均关联已记录差距和双侧依据，SG-03 的笼统动作与证据已作为后续复核点。" />
      <WebArtifactPanel progress={progress} participantId={participantId} onUpdate={onUpdate} allowGenerate={suggestionValidation.valid} />
      <div className="page-actions"><span>预览、导出和离线测试均在本地完成，不上传材料或请求外部资源</span><button className="primary-button" type="button" disabled={!webValidation.valid} onClick={onNext}>进入同组复核<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'peer-review') {
    const validation = validateE05PeerReview(progress, directory)
    const selectedReviewer = reviewers.find((item) => item.participantId === progress.peerReview.reviewerId)
    return <>
      <PageHeader eyebrow={routeLabels['peer-review']} title="请同组其他成员核对映射状态与建议可执行性" description="复核对象只来自当前人员目录中的同组其他成员；当前 Demo 由作者在本机触发确定性意见。" aside={<div className="metric-pill"><UsersRound size={19} /><span><strong>{reviewers.length} 人</strong><small>当前同组可选</small></span></div>} />
      <div className="e05-simulation-note"><UsersRound size={20} /><div><strong>无多人后端的模拟复核边界</strong><p>{progress.peerReview.disclosure}</p></div></div>
      <section className="content-card e05-review-card"><div className="form-grid"><label className="field"><span>当前同组其他成员</span><select value={progress.peerReview.reviewerId} onChange={(event) => resetReviewIdentity({ reviewerId: event.target.value })}><option value="">请选择</option>{reviewers.map((item) => <option key={item.participantId} value={item.participantId}>{item.name} · {item.specialty}</option>)}</select><small>不显示本人或跨组成员。</small></label><label className="field"><span>本次任务临时角色</span><select value={progress.peerReview.reviewerRole ?? ''} onChange={(event) => resetReviewIdentity({ reviewerId: progress.peerReview.reviewerId, reviewerRole: event.target.value as GroupRole })}><option value="">请选择</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select></label><label className="field"><span>当前小组</span><input readOnly value={participant?.groupName ?? '未分组'} /></label><label className="field"><span>被复核网页</span><input readOnly value={progress.webPage?.webPageId ?? '尚未生成'} /></label></div>
      <button className="secondary-button" type="button" disabled={!selectedReviewer || !progress.peerReview.reviewerRole || !progress.webPage?.offlineTest?.passed} onClick={() => onUpdate((current) => ({ ...current, peerReview: simulateE05PeerReview(current, directory), workingMappings: undefined, workingSuggestions: undefined, revisions: [], confirmedPackage: undefined }))}><Sparkles size={16} />生成并披露模拟组员复核</button>
      {progress.peerReview.recordId && <div className="e05-review-result"><article><span>映射状态</span><strong>{progress.peerReview.mappingJudgement}</strong><small>MAP-12</small></article><article><span>建议可执行性</span><strong>{progress.peerReview.suggestionJudgement}</strong><small>SG-03</small></article><p><strong>具体意见：</strong>{progress.peerReview.suggestion}</p></div>}
      <button className="primary-button" type="button" disabled={!progress.peerReview.recordId || progress.peerReview.submitted} onClick={() => onUpdate((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true, submittedAt: new Date().toISOString() } }))}><FileCheck2 size={17} />{progress.peerReview.submitted ? '复核记录已提交' : '提交映射与建议复核'}</button></section>
      <ValidationNotice messages={validation.messages} success="同组其他成员、临时角色、MAP-12 与 SG-03 问题事实及模拟边界已完整保存。" />
      <div className="page-actions"><span>“需调整”是有效复核事实，不会被当作无效提交</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>根据意见修正并复测<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'revision') {
    const validation = validateE05Revision(progress, directory)
    const canBuildFinal = Boolean(progress.workingMappings && progress.workingSuggestions)
    return <>
      <PageHeader eyebrow={routeLabels.revision} title="修正 MAP-12 与 SG-03，重新生成并离线复测" description="AI 原映射与原建议继续保留；教师确认版保存修改前、修改后、同组复核与课程—岗位双侧依据。" aside={<div className="metric-pill"><Wrench size={19} /><span><strong>{progress.revisions.length} / 1</strong><small>实质修正门槛</small></span></div>} />
      <section className="content-card e05-revision-card"><div className="section-heading"><div><span className="eyebrow">TRACEABLE REVISION</span><h2>映射与建议修正</h2></div><span>{progress.peerReview.recordId || '等待复核'}</span></div><div className="e05-revision-grid">{[
        ['MAP-12', '覆盖状态', '覆盖不足', '暂未覆盖'], ['SG-03', '课程调整', '加强版本交付训练', '增加 15 分钟交付演练与明确清单'], ['SG-03', '预期证据', '保留相关证据', 'v1/v2、参数、理由、核验与授权检查单'],
      ].map(([id, label, before, after], index) => {
        const record = progress.revisions[index]
        return <article className={record ? 'e05-complete' : ''} key={`${id}-${label}`}><header><span>{index + 1}</span><div><strong>{id} · {label}</strong><small>{record ? `${record.courseEvidenceId} + ${record.jobEvidenceExcerptId}` : '等待应用修正'}</small></div>{record ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</header><div><p><span>修改前</span>{record?.beforeValue ?? before}</p><ArrowRight size={16} /><p><span>修改后</span>{record?.afterValue ?? after}</p></div>{record && <small>{record.basis}</small>}</article>
      })}</div><button className="primary-button" type="button" disabled={!progress.peerReview.submitted || canBuildFinal} onClick={() => onUpdate((current) => applyE05ReferenceRevision(current, participantId))}><Wrench size={17} />{canBuildFinal ? '修正已应用' : '应用有据映射与建议修正'}</button></section>
      <WebArtifactPanel progress={progress} participantId={participantId} onUpdate={onUpdate} allowGenerate={canBuildFinal} />
      <ValidationNotice messages={validation.messages} success="MAP-12 与 SG-03 已实质修正，修正后 v2 单文件 HTML 已重新生成并通过离线复测。" />
      <div className="page-actions"><span>实质内容变化后旧网页、确认与当前通过失效，但 AI 原稿、复核与历史保留</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入教师最终确认<ArrowRight size={17} /></button></div>
    </>
  }

  if (progress.route === 'confirmation') {
    const finalValidation = validateE05Revision(progress, directory)
    const validation = validateE05Confirmation(progress, directory)
    const packageCurrent = confirmedE05PackageIsCurrent(progress, directory)
    const checkedCount = Object.values(progress.teacherConfirmation).filter(Boolean).length
    return <>
      <PageHeader eyebrow={routeLabels.confirmation} title="由教师确认两侧证据、映射建议、离线网页与最终责任" description="四类事实须分别留痕；确认与当前参训者、同组名单、映射、建议和网页指纹绑定。" aside={<div className="metric-pill"><UserCheck size={19} /><span><strong>{checkedCount} / 4</strong><small>教师责任确认</small></span></div>} />
      <section className="content-card e05-confirmation-card"><div className="section-heading"><div><span className="eyebrow">TEACHER RESPONSIBILITY</span><h2>四项逐条确认</h2></div><span>{finalValidation.valid ? '最终成果已就绪' : '最终成果仍有缺项'}</span></div><div className="e05-confirmation-list">{confirmationItems.map(([field, label, detail]) => <label key={field}><input type="checkbox" disabled={!finalValidation.valid} checked={progress.teacherConfirmation[field]} onChange={(event) => updateConfirmation(field, event.target.checked)} /><span><strong>{label}</strong><small>{detail}</small></span>{progress.teacherConfirmation[field] && <CheckCircle2 size={18} />}</label>)}</div><button className="primary-button" type="button" disabled={!validation.valid} onClick={() => onUpdate((current) => ({ ...current, confirmedPackage: createConfirmedE05Package(current, directory) }))}><ShieldCheck size={17} />{packageCurrent ? '当前两项成果已确认' : '形成教师确认的两项成果'}</button></section>
      <section className="content-card e05-artifact-section"><div className="section-heading"><div><span className="eyebrow">EXACTLY TWO OUTPUTS</span><h2>固定成果恰好 2 项</h2></div><span>{packageCurrent ? '当前指纹已确认' : '等待确认'}</span></div><ArtifactGrid progress={progress} ready={packageCurrent} /><p className="e05-slot-note"><BadgeCheck size={16} />两项成果共同构成 E05 的一个个人选修成果，不会在十类个人成果中占两个槽位。</p></section>
      <ValidationNotice messages={validation.messages} success={packageCurrent ? '四项教师责任已确认，当前指纹对应的两项固定成果已形成。' : '四项教师责任已确认；请形成当前两项固定成果。'} />
      <div className="page-actions"><span>来源、人员、复核、映射、建议、网页或确认变化后，旧历史保留，当前成果包失效</span><button className="primary-button" type="button" disabled={!packageCurrent} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div>
    </>
  }

  const assessmentValidation = validateE05AssessmentSubmission(progress, directory)
  const passed = latestE05AssessmentIsCurrent(progress, directory)
  const packageCurrent = confirmedE05PackageIsCurrent(progress, directory)
  return <>
    <PageHeader eyebrow={routeLabels.result} title={passed ? 'E05 当前验收已通过' : 'E05 五维评分与成果验收'} description="总分不低于 8 分、四项核心要求全部通过，且专业证据、人工迭代、安全三项硬门槛均为 2 分。" aside={<div className={passed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>} />
    <section className={passed ? 'result-banner passed' : 'result-banner'}>{passed ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}<div><strong>{passed ? '当前验收通过，恰好两项成果已归档' : packageCurrent ? '两项成果已确认，等待提交验收' : '当前确认版仍有缺项'}</strong><p>6 岗位任务 → 12 双侧映射 → 3 建议 → 同组复核 → 3 条有据修正 → v2 离线网页。</p></div><span>{score.coreRequirements.filter((item) => item.passed).length} / 4 核心要求</span></section>
    <div className="score-layout e05-score-layout"><section className="content-card e05-score-card"><div className="dimension-list">{score.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong>{['evidence', 'iteration', 'safety'].includes(dimension.id) && <em className="e05-hard-gate">硬门槛</em>}<p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}</div></section><section className="content-card e05-requirement-card"><div className="requirement-list">{score.coreRequirements.map((requirement) => <button className={requirement.passed ? 'passed' : ''} type="button" key={requirement.id} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}</div></section></div>
    <section className="e05-gate-summary"><div className={score.total >= 8 ? 'e05-passed' : ''}><Scale size={18} /><span><strong>{score.total >= 8 ? '总分已达标' : '总分未达标'}</strong><small>{score.total} / 10，要求 ≥ 8</small></span></div><div className={score.hardGatesPassed ? 'e05-passed' : ''}><ShieldCheck size={18} /><span><strong>{score.hardGatesPassed ? '三项硬门槛通过' : '硬门槛未全部通过'}</strong><small>专业证据 · 人工迭代 · 安全</small></span></div><div className={score.coreRequirementsPassed ? 'e05-passed' : ''}><ListChecks size={18} /><span><strong>{score.coreRequirementsPassed ? '核心要求完整' : '核心要求仍有缺项'}</strong><small>{score.coreRequirements.filter((item) => item.passed).length} / 4</small></span></div></section>
    <section className="content-card e05-result-artifacts"><div className="section-heading"><div><span className="eyebrow">ARCHIVE CONTRACT</span><h2>两项成果 · 一个选修槽位</h2></div><span>{passed ? '已同步归档' : '待当前验收'}</span></div><ArtifactGrid progress={progress} ready={passed} /></section>
    <section className="content-card e05-assessment-card"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>初验与复验历史</h2></div><span>{progress.assessments.length} 次</span></div>{progress.assessments.length > 0 && <div className="e05-history-list">{progress.assessments.map((assessment, index) => <article key={assessment.assessmentId}><span>{assessment.attempt === 'initial' ? '初验' : `复验 ${index}`}</span><strong>{assessment.total} / 10 · {assessment.passed ? '通过' : '待补验'}</strong><small>{new Date(assessment.assessedAt).toLocaleString('zh-CN', { hour12: false })}</small><em>{assessment.modificationSummary || '按当前内容指纹提交'}</em></article>)}</div>}{!passed && <button className="primary-button" type="button" disabled={!assessmentValidation.valid} onClick={() => onUpdate((current) => ({ ...current, assessments: [...current.assessments, createE05Assessment(current, directory, current.assessments.length ? '按当前映射、建议、复核、修正与离线网页重新提交。' : '完成映射与建议复核、有据修正和离线复测。')] }))}><ClipboardCheck size={17} />{progress.assessments.length ? '提交复验' : '提交验收'}</button>}</section>
    <ValidationNotice messages={assessmentValidation.messages} success="当前教师确认版、两项固定成果和全部验收证据已经齐备。" />
    <div className="page-actions"><span>实质内容变化后旧验收历史保留，当前通过按内容指纹自动失效</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置 E05</button></div>
    {progress.attemptHistory.length > 0 && <p className="e05-attempt-note"><History size={16} />已保留 {progress.attemptHistory.length} 条来源、复核、网页或确认变化前的完整快照。</p>}
  </>
}
