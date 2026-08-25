import type { ParticipantDirectory, TrainingParticipant } from '../training/types'
import {
  createE05DeterministicJobTasks,
  createE05DeterministicMappings,
  createE05DeterministicSuggestions,
} from './data'
import type {
  E05CoverageStatus,
  E05JobTaskDraft,
  E05Mapping,
  E05MappingDraft,
  E05OfflineTestRecord,
  E05PeerReview,
  E05Progress,
  E05RevisionRecord,
  E05Suggestion,
  E05SuggestionDraft,
  E05WebPageArtifact,
} from './domain'

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]))
  }
  return value
}

export function e05Hash(value: unknown) {
  const input = JSON.stringify(canonical(value))
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase()
}

export function e05SourceFingerprint(progress: Pick<E05Progress, 'source'>) {
  return e05Hash(progress.source)
}

export function e05JobTaskFingerprint(draft: E05JobTaskDraft | undefined) {
  if (!draft) return ''
  return e05Hash({ draftId: draft.draftId, participantId: draft.participantId, inputFingerprint: draft.inputFingerprint, tasks: draft.tasks })
}

export function e05MappingFingerprint(value: E05MappingDraft | E05Mapping[] | undefined) {
  if (!value) return ''
  const mappings = Array.isArray(value) ? value : value.mappings
  return e05Hash(mappings)
}

export function e05SuggestionFingerprint(value: E05SuggestionDraft | E05Suggestion[] | undefined) {
  if (!value) return ''
  const suggestions = Array.isArray(value) ? value : value.suggestions
  return e05Hash(suggestions)
}

export function effectiveE05Mappings(progress: E05Progress) {
  return progress.workingMappings ?? progress.mappingDraft?.mappings ?? []
}

export function effectiveE05Suggestions(progress: E05Progress) {
  return progress.workingSuggestions ?? progress.aiSuggestionDraft?.suggestions ?? []
}

export function e05WebContentFingerprint(progress: E05Progress, participantId: string) {
  return e05Hash({
    participantId,
    source: e05SourceFingerprint(progress),
    jobTasks: progress.jobTaskDraft?.tasks ?? [],
    mappings: effectiveE05Mappings(progress),
    suggestions: effectiveE05Suggestions(progress),
  })
}

export class LocalE05MappingRunner {
  run(progress: Pick<E05Progress, 'source'>, participantId: string): { jobTaskDraft: E05JobTaskDraft; mappingDraft: E05MappingDraft } {
    const jobTaskDraft = createE05DeterministicJobTasks(participantId, e05SourceFingerprint(progress))
    const mappingDraft = createE05DeterministicMappings(participantId, e05JobTaskFingerprint(jobTaskDraft))
    return { jobTaskDraft, mappingDraft }
  }

  suggest(progress: E05Progress, participantId: string): E05SuggestionDraft | undefined {
    if (!progress.mappingDraft) return undefined
    return createE05DeterministicSuggestions(participantId, e05MappingFingerprint(progress.mappingDraft))
  }
}

function html(value: string) {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}

export function buildE05SingleFileHtml(progress: E05Progress, participantId: string) {
  const mappings = effectiveE05Mappings(progress)
  const suggestions = effectiveE05Suggestions(progress)
  const tasks = progress.jobTaskDraft?.tasks ?? []
  const objectives = progress.source.course.objectives
  const objectiveById = new Map(objectives.map((item) => [item.objectiveId, item]))
  const taskById = new Map(tasks.map((item) => [item.taskId, item]))
  const statusOptions: E05CoverageStatus[] = ['已覆盖', '覆盖不足', '暂未覆盖']
  const mappingRows = mappings.map((item) => {
    const objective = objectiveById.get(item.courseObjectiveId)
    const task = taskById.get(item.jobTaskId)
    const detail = `${item.courseEvidenceId}：${item.courseEvidenceSummary}\n${item.jobEvidenceExcerptId}：${item.jobEvidenceSummary}\n判断依据：${item.judgementBasis}`
    return `<button type="button" class="mapping-row" data-mapping-id="${html(item.mappingId)}" data-status="${html(item.status)}" data-detail="${html(detail)}"><span>${html(item.mappingId)}</span><strong>${html(objective?.title ?? item.courseObjectiveId)} → ${html(task?.name ?? item.jobTaskId)}</strong><em>${html(item.status)}</em><small>${html(item.courseEvidenceId)} + ${html(item.jobEvidenceExcerptId)}</small></button>`
  }).join('')
  const taskCards = tasks.map((item) => `<article><strong>${html(item.taskId)} · ${html(item.name)}</strong><p>${html(item.description)}</p><small>${html(item.jobEvidenceExcerptId)}</small></article>`).join('')
  const suggestionCards = suggestions.map((item) => `<article><strong>${html(item.suggestionId)} · ${html(item.linkedMappingId)}</strong><p><b>差距：</b>${html(item.gap)}</p><p><b>调整：</b>${html(item.courseAdjustment)}</p><p><b>预期证据：</b>${html(item.expectedEvidence)}</p><small>${html(item.courseEvidenceId)} + ${html(item.jobEvidenceExcerptId)}</small></article>`).join('')
  return `<!doctype html>
<html lang="zh-CN" data-e05-single-file="true">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${html(progress.source.course.courseName)}·课岗映射</title>
<style>
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#172033;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}main{width:min(1080px,100%);margin:auto;padding:24px}header,.panel{border:1px solid #dce2ec;border-radius:16px;background:#fff;padding:20px;margin-bottom:16px}h1{font-size:26px;margin:0 0 8px}h2{font-size:19px}p,button,select{font-size:14px;line-height:1.6}.meta{color:#5e6b80}.task-grid,.suggestion-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.task-grid article,.suggestion-grid article{border:1px solid #dce2ec;border-radius:12px;padding:14px}.mapping-list{display:grid;gap:8px}.mapping-row{width:100%;min-height:48px;display:grid;grid-template-columns:70px 1fr 90px 140px;align-items:center;gap:10px;border:1px solid #dce2ec;border-radius:10px;background:#fff;padding:10px;text-align:left;cursor:pointer}.mapping-row:hover,.mapping-row:focus{border-color:#2f6bff;outline:3px solid #dce6ff}.mapping-row em{font-style:normal;color:#2458c9}.mapping-row small{color:#647188}.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.toolbar select{min-height:44px;border:1px solid #cfd7e5;border-radius:8px;padding:0 10px}.detail{min-height:86px;margin-top:12px;border-left:4px solid #2f6bff;background:#eef3ff;padding:12px;white-space:pre-line}.hidden{display:none}@media(max-width:620px){main{padding:12px}.mapping-row{grid-template-columns:62px 1fr}.mapping-row em,.mapping-row small{grid-column:2}}
</style>
</head>
<body>
<main>
<header><h1>课程—岗位能力映射</h1><p class="meta">学员：${html(participantId)} · 课程：${html(progress.source.course.courseName)} · 课程版本：${html(progress.source.course.version)} · 岗位材料：${html(progress.source.jobMaterial.version)}</p></header>
<section class="panel"><h2>岗位任务（${tasks.length}项）</h2><div class="task-grid">${taskCards}</div></section>
<section class="panel"><div class="toolbar"><h2>映射关系（${mappings.length}条）</h2><label for="coverage-filter">覆盖筛选</label><select id="coverage-filter"><option value="全部">全部</option>${statusOptions.map((item) => `<option value="${item}">${item}</option>`).join('')}</select></div><div class="mapping-list">${mappingRows}</div><section id="relationship-detail" class="detail" aria-live="polite">点击任一映射关系，查看课程与岗位两侧依据。</section></section>
<section class="panel"><h2>差距与改进建议（恰好${suggestions.length}项）</h2><div class="suggestion-grid">${suggestionCards}</div></section>
</main>
<script>
(function(){var filter=document.getElementById('coverage-filter');var rows=[].slice.call(document.querySelectorAll('[data-mapping-id]'));var detail=document.getElementById('relationship-detail');filter.addEventListener('change',function(){rows.forEach(function(row){row.classList.toggle('hidden',filter.value!=='全部'&&row.getAttribute('data-status')!==filter.value);});});rows.forEach(function(row){row.addEventListener('click',function(){detail.textContent=row.getAttribute('data-mapping-id')+'\\n'+row.getAttribute('data-detail');});});})();
</script>
</body>
</html>`
}

export function createE05WebPage(progress: E05Progress, participantId: string): E05WebPageArtifact | undefined {
  if (!progress.jobTaskDraft || !progress.mappingDraft || !progress.aiSuggestionDraft) return undefined
  const contentFingerprint = e05WebContentFingerprint(progress, participantId)
  const version = progress.revisions.length ? 2 : 1
  return {
    webPageId: `E05-WEB-${e05Hash([participantId, contentFingerprint, version])}`,
    participantId,
    version,
    filename: `E05-${participantId}-course-job-mapping-v${version}.html`,
    generatedAt: new Date().toISOString(),
    contentFingerprint,
    html: buildE05SingleFileHtml(progress, participantId),
    exportDisclosure: '本地确定性引擎生成的单文件 HTML；不请求外链脚本、样式、密钥或网络服务。',
  }
}

export function evaluateE05OfflineHtml(progress: E05Progress, page: E05WebPageArtifact): E05OfflineTestRecord {
  const mappings = effectiveE05Mappings(progress)
  const suggestions = effectiveE05Suggestions(progress)
  const checks = {
    singleFile: /^<!doctype html>/iu.test(page.html) && /<html[^>]*data-e05-single-file="true"/iu.test(page.html),
    noExternalDependencies: !/<script\b[^>]*\bsrc\s*=/iu.test(page.html)
      && !/<link\b[^>]*\bhref\s*=/iu.test(page.html)
      && !/(?:src|href)\s*=\s*["'](?:https?:)?\/\//iu.test(page.html),
    coverageFilterAvailable: /id="coverage-filter"/u.test(page.html) && /data-status=/u.test(page.html),
    clickableRelationshipDetails: /data-mapping-id=/u.test(page.html) && /id="relationship-detail"/u.test(page.html) && /addEventListener\('click'/u.test(page.html),
    taskThresholdMet: (progress.jobTaskDraft?.tasks.length ?? 0) >= 5,
    mappingThresholdMet: mappings.length >= 10,
    exactSuggestionCount: suggestions.length === 3,
    currentContentFingerprint: page.contentFingerprint === e05WebContentFingerprint(progress, page.participantId),
  }
  const testedAt = new Date().toISOString()
  return {
    testId: `E05-OFFLINE-${e05Hash([page.webPageId, page.contentFingerprint, checks])}`,
    webPageId: page.webPageId,
    testedAt,
    passed: Object.values(checks).every(Boolean),
    checks,
    disclosure: '本记录为本地单文件结构与交互确定性离线测试；不会上传文档或请求网络服务。',
  }
}

export function runE05OfflineTest(progress: E05Progress): E05Progress {
  if (!progress.webPage) return progress
  const offlineTest = evaluateE05OfflineHtml(progress, progress.webPage)
  return { ...progress, webPage: { ...progress.webPage, offlineTest }, confirmedPackage: undefined, updatedAt: new Date().toISOString() }
}

export function downloadE05SingleFileHtml(page: E05WebPageArtifact) {
  if (typeof document === 'undefined' || typeof window === 'undefined' || typeof window.URL?.createObjectURL !== 'function') return false
  const blob = new Blob([page.html], { type: 'text/html;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = page.filename
  anchor.click()
  window.URL.revokeObjectURL(url)
  return true
}

export function eligibleE05Reviewers(directory: ParticipantDirectory): TrainingParticipant[] {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!current) return []
  return directory.participants.filter((item) => item.groupId === current.groupId && item.participantId !== current.participantId)
}

export function simulateE05PeerReview(progress: E05Progress, directory: ParticipantDirectory): E05PeerReview {
  const reviewer = eligibleE05Reviewers(directory).find((item) => item.participantId === progress.peerReview.reviewerId)
  if (!reviewer || !progress.peerReview.reviewerRole || !progress.mappingDraft || !progress.aiSuggestionDraft || !progress.webPage?.offlineTest?.passed) {
    return { ...progress.peerReview, recordId: '', submitted: false, submittedAt: undefined }
  }
  return {
    ...progress.peerReview,
    recordId: `E05-REVIEW-${e05Hash([reviewer.participantId, e05MappingFingerprint(progress.mappingDraft), e05SuggestionFingerprint(progress.aiSuggestionDraft)])}`,
    reviewerGroupId: reviewer.groupId,
    reviewedMappingFingerprint: e05MappingFingerprint(progress.mappingDraft),
    reviewedSuggestionFingerprint: e05SuggestionFingerprint(progress.aiSuggestionDraft),
    reviewedWebPageId: progress.webPage.webPageId,
    mappingJudgement: '需调整',
    suggestionJudgement: '需调整',
    targetRecordIds: ['MAP-12', 'SG-03'],
    suggestion: 'MAP-12 的课程证据明确“未覆盖版本交付记录”，应改为“暂未覆盖”；SG-03 需补充具体调整动作和可检查证据。',
    authorTreatment: '',
    authorBasis: '',
    simulated: true,
    disclosure: '当前 Demo 无多人后端；本记录由作者在本机触发确定性模拟，非实时提交，不代表真实组员在线提交。',
    submitted: false,
    submittedAt: undefined,
  }
}

function revision(
  progress: E05Progress,
  participantId: string,
  targetKind: E05RevisionRecord['targetKind'],
  targetId: string,
  field: E05RevisionRecord['field'],
  beforeValue: string,
  afterValue: string,
  basis: string,
  courseEvidenceId: string,
  jobEvidenceExcerptId: string,
): E05RevisionRecord {
  const base = {
    participantId,
    sourceReviewId: progress.peerReview.recordId,
    reviewedMappingFingerprint: progress.peerReview.reviewedMappingFingerprint,
    reviewedSuggestionFingerprint: progress.peerReview.reviewedSuggestionFingerprint,
    targetKind,
    targetId,
    field,
    beforeValue,
    afterValue,
    basis,
    courseEvidenceId,
    jobEvidenceExcerptId,
  }
  return { ...base, revisionId: `E05-REV-${e05Hash(base)}`, revisedAt: new Date().toISOString() }
}

export function applyE05ReferenceRevision(progress: E05Progress, participantId: string): E05Progress {
  if (!progress.mappingDraft || !progress.aiSuggestionDraft || !progress.peerReview.submitted || !progress.peerReview.recordId) return progress
  const jobTaskDraft = progress.jobTaskDraft ? {
    ...structuredClone(progress.jobTaskDraft),
    tasks: progress.jobTaskDraft.tasks.map((item) => ({ ...item, teacherReviewed: true })),
  } : undefined
  const mappingDraft = {
    ...progress.mappingDraft,
    jobTaskFingerprint: e05JobTaskFingerprint(jobTaskDraft),
  }
  const workingMappings = structuredClone(progress.mappingDraft.mappings).map((item) => item.mappingId === 'MAP-12'
    ? { ...item, status: '暂未覆盖' as const, judgementBasis: '课程证据明确未覆盖版本交付记录，因此按两侧证据判定为暂未覆盖。', teacherReviewed: true }
    : { ...item, teacherReviewed: true })
  const workingSuggestions = structuredClone(progress.aiSuggestionDraft.suggestions).map((item) => item.suggestionId === 'SG-03'
    ? {
      ...item,
      courseAdjustment: '在课程末增加 15 分钟交付演练：学员提交 v1/v2 提示词、参数、修改理由、事实核验与授权检查项。',
      expectedEvidence: '一份包含 v1/v2、参数、修改理由、核验结果和授权勾选的交付检查单。',
      teacherReviewed: true,
    }
    : { ...item, teacherReviewed: true })
  const originalMapping = progress.mappingDraft.mappings.find((item) => item.mappingId === 'MAP-12')!
  const originalSuggestion = progress.aiSuggestionDraft.suggestions.find((item) => item.suggestionId === 'SG-03')!
  const finalSuggestion = workingSuggestions.find((item) => item.suggestionId === 'SG-03')!
  const revisions = [
    revision(progress, participantId, 'mapping', 'MAP-12', 'status', originalMapping.status, '暂未覆盖', '课程目标 CEV-04 明确没有交付记录，岗位 JEV-06 则明确要求交付留痕。', 'CEV-04', 'JEV-06'),
    revision(progress, participantId, 'suggestion', 'SG-03', 'courseAdjustment', originalSuggestion.courseAdjustment, finalSuggestion.courseAdjustment, '按同组意见补充时长、学员动作和交付内容，不新增岗位要求。', 'CEV-04', 'JEV-06'),
    revision(progress, participantId, 'suggestion', 'SG-03', 'expectedEvidence', originalSuggestion.expectedEvidence, finalSuggestion.expectedEvidence, '将“相关证据”改为可逐项检查的交付清单。', 'CEV-04', 'JEV-06'),
  ]
  return {
    ...progress,
    jobTaskDraft,
    mappingDraft,
    workingMappings,
    workingSuggestions,
    webPage: undefined,
    peerReview: {
      ...progress.peerReview,
      authorTreatment: '已采纳并修正',
      authorBasis: '依据 CEV-04 与 JEV-06 的双侧证据更正覆盖状态，并将建议具体化为可执行、可检查动作。',
    },
    revisions,
    teacherConfirmation: {
      sourceAndEvidenceConfirmed: false,
      mappingAndSuggestionsConfirmed: false,
      offlineArtifactConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    updatedAt: new Date().toISOString(),
  }
}

function hasDerivedWork(progress: E05Progress) {
  return Boolean(progress.jobTaskDraft
    || progress.mappingDraft
    || progress.aiSuggestionDraft
    || progress.workingMappings
    || progress.workingSuggestions
    || progress.webPage
    || progress.peerReview.recordId
    || progress.revisions.length
    || progress.confirmedPackage)
}

export function archiveE05Attempt(progress: E05Progress, reason: string) {
  if (!hasDerivedWork(progress)) return progress.attemptHistory
  const snapshot = {
    route: progress.route,
    source: progress.source,
    jobTaskDraft: progress.jobTaskDraft,
    mappingDraft: progress.mappingDraft,
    aiSuggestionDraft: progress.aiSuggestionDraft,
    workingMappings: progress.workingMappings,
    workingSuggestions: progress.workingSuggestions,
    webPage: progress.webPage,
    peerReview: progress.peerReview,
    revisions: progress.revisions,
    teacherConfirmation: progress.teacherConfirmation,
    confirmedPackage: progress.confirmedPackage,
  }
  const historyId = `E05-H-${e05Hash(snapshot)}`
  if (progress.attemptHistory.some((item) => item.historyId === historyId)) return progress.attemptHistory
  return [...progress.attemptHistory, {
    historyId,
    invalidatedAt: new Date().toISOString(),
    reason,
    route: progress.route,
    source: structuredClone(progress.source),
    jobTaskDraft: structuredClone(progress.jobTaskDraft),
    mappingDraft: structuredClone(progress.mappingDraft),
    aiSuggestionDraft: structuredClone(progress.aiSuggestionDraft),
    workingMappings: structuredClone(progress.workingMappings),
    workingSuggestions: structuredClone(progress.workingSuggestions),
    webPage: structuredClone(progress.webPage),
    peerReview: structuredClone(progress.peerReview),
    revisions: structuredClone(progress.revisions),
    teacherConfirmation: structuredClone(progress.teacherConfirmation),
    confirmedPackage: structuredClone(progress.confirmedPackage),
  }]
}

function emptyPeerReview(progress: E05Progress): E05PeerReview {
  return {
    ...progress.peerReview,
    recordId: '',
    reviewerId: '',
    reviewerGroupId: '',
    reviewerRole: undefined,
    reviewedMappingFingerprint: '',
    reviewedSuggestionFingerprint: '',
    reviewedWebPageId: '',
    mappingJudgement: '',
    suggestionJudgement: '',
    targetRecordIds: [],
    suggestion: '',
    authorTreatment: '',
    authorBasis: '',
    simulated: false,
    submitted: false,
    submittedAt: undefined,
  }
}

export function invalidateE05Confirmation(progress: E05Progress, reason: string): E05Progress {
  return {
    ...progress,
    teacherConfirmation: {
      sourceAndEvidenceConfirmed: false,
      mappingAndSuggestionsConfirmed: false,
      offlineArtifactConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    confirmedPackage: undefined,
    attemptHistory: archiveE05Attempt(progress, reason),
    updatedAt: new Date().toISOString(),
  }
}

export function invalidateE05ReviewContext(progress: E05Progress, reason: string): E05Progress {
  const reset = invalidateE05Confirmation(progress, reason)
  return {
    ...reset,
    workingMappings: undefined,
    workingSuggestions: undefined,
    webPage: undefined,
    peerReview: emptyPeerReview(reset),
    revisions: [],
  }
}

export function invalidateE05DerivedWork(progress: E05Progress, reason: string): E05Progress {
  const reset = invalidateE05ReviewContext(progress, reason)
  return {
    ...reset,
    jobTaskDraft: undefined,
    mappingDraft: undefined,
    aiSuggestionDraft: undefined,
  }
}
