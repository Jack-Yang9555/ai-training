import type { ParticipantDirectory } from '../training/types'
import type {
  E03Finding,
  E03FindingId,
  E03ImprovementMeasure,
  E03MeasureId,
  E03Progress,
  E03Route,
} from './domain'
import {
  e03FindingsFingerprint,
  e03Hash,
  e03InputFingerprint,
  e03MeasureFingerprint,
  eligibleE03Reviewers,
} from './runner'

export interface E03ValidationResult { valid: boolean; messages: string[] }
export type E03InitialDefect = 'fact-label-overreach' | 'vague-unobservable-measure'

const findingIds: E03FindingId[] = ['F01', 'F02', 'F03']
const measureIds: E03MeasureId[] = ['A01', 'A02']

function unique(values: string[]) { return [...new Set(values)] }
function nonEmpty(value: string) { return Boolean(value.trim()) }
function exactIdSet(actual: string[], expected: string[]) {
  return actual.length === expected.length
    && new Set(actual).size === expected.length
    && expected.every((id) => actual.includes(id))
}

function combinedContent(progress: E03Progress) {
  return [
    progress.source.sourceName,
    progress.source.teachingGoal,
    progress.source.classroomActivities,
    progress.source.assessmentResults,
    ...progress.source.excerpts.flatMap((item) => [item.locator, item.content]),
    ...progress.workingFindings.flatMap((item) => [item.observedFact, item.interpretationToConfirm]),
    ...(progress.workingMeasures?.measures ?? []).flatMap((item) => [
      item.implementationPhase,
      item.teacherAction,
      item.observableStudentBehavior,
      item.checkMethod,
    ]),
  ].join('\n')
}

export function e03UnsafeIdentityFindings(progress: E03Progress) {
  const text = combinedContent(progress)
  const findings: string[] = []
  if (/(?:1[3-9]\d{9})/u.test(text)) findings.push('手机号')
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) findings.push('电子邮箱')
  if (/(?:\d{17}[\dXx])|(?:身份证(?:号|号码)?\s*[:：]?\s*\d{6,})/u.test(text)) findings.push('身份信息')
  if (/(?:学生姓名|姓名|学号)\s*[:：]\s*[^\s，。；;]+/u.test(text)) findings.push('真实姓名或学号字段')
  return unique(findings)
}

export function e03FixedLabelFindings(value: string) {
  const labels: string[] = []
  const patterns: Array<[string, RegExp]> = [
    ['态度或主动性标签', /(?:学习态度|态度消极|不积极|主动性不足|缺乏(?:学习)?主动性)/u],
    ['能力或基础标签', /(?:能力偏弱|理解能力|基础薄弱|能力差|基础差)/u],
    ['动机或品格标签', /(?:缺乏(?:学习)?动机|懒惰|不认真|不用心)/u],
    ['长期固定标签', /(?:一贯|长期|总是|从不).{0,8}(?:落后|消极|较差|不会|不参与)/u],
  ]
  for (const [label, pattern] of patterns) if (pattern.test(value)) labels.push(label)
  return labels
}

export function validateE03Source(progress: E03Progress): E03ValidationResult {
  const messages: string[] = []
  const source = progress.source
  if (![source.sourceId, source.sourceName, source.version, source.teachingGoal, source.classroomActivities, source.assessmentResults].every(nonEmpty)) {
    messages.push('课堂记录名称、版本、教学目标、课堂活动和评价结果须完整')
  }
  if (source.sourceKind === '平台已审核虚构课堂记录' && source.reviewedFictional !== true) {
    messages.push('平台虚构课堂记录必须明确标注已经审核')
  }
  if (source.sourceKind === '教师确认已匿名化本地记录' && source.reviewedFictional !== false) {
    messages.push('本地记录不得冒充平台已审核虚构材料')
  }
  if (source.excerpts.length < 3 || new Set(source.excerpts.map((item) => item.referenceId)).size !== source.excerpts.length) {
    messages.push('课堂记录须包含不少于 3 个编号唯一的可定位片段')
  }
  if (source.excerpts.some((item) => !nonEmpty(item.referenceId) || !nonEmpty(item.locator) || !nonEmpty(item.content))) {
    messages.push('每个课堂记录片段须有编号、原记录位置和内容')
  }
  if (!source.anonymizationConfirmed || !source.sourceOnlyConfirmed || !source.noRealIdentityConfirmed) {
    messages.push('须分别确认记录已匿名化、只基于所给记录和不含真实身份')
  }
  const unsafe = e03UnsafeIdentityFindings(progress)
  if (unsafe.length) messages.push(`课堂材料检测到${unsafe.join('、')}，不得运行课堂反思分析`)
  return { valid: messages.length === 0, messages: unique(messages) }
}

function findingStructureMessages(progress: E03Progress, findings: E03Finding[], requireReviewed: boolean) {
  const messages: string[] = []
  if (!exactIdSet(findings.map((item) => item.findingId), findingIds)) {
    messages.push('课堂发现必须恰好为 F01、F02、F03 三条且编号唯一')
  }
  const excerpts = new Map(progress.source.excerpts.map((item) => [item.referenceId, item]))
  for (const finding of findings) {
    if (![finding.observedFact, finding.sourceReference, finding.sourceExcerpt, finding.interpretationToConfirm].every(nonEmpty)) {
      messages.push(`${finding.findingId}：观察事实、原记录位置、来源片段和待确认解释须完整`)
      continue
    }
    const excerpt = excerpts.get(finding.sourceReference)
    if (!excerpt || excerpt.content.trim() !== finding.sourceExcerpt.trim()) {
      messages.push(`${finding.findingId}：来源引用必须打开并对应当前课堂记录原文`)
    }
    const labels = e03FixedLabelFindings(finding.observedFact)
    if (labels.length) messages.push(`${finding.findingId}：观察事实夹带${labels.join('、')}，须移到待确认解释或删除`)
    if (!/(?:可能|需|待确认|仍需|尚需)/u.test(finding.interpretationToConfirm)) {
      messages.push(`${finding.findingId}：解释须明确标注为可能或仍需确认，不能冒充已证实事实`)
    }
    if (/(?:已经证明|必然|就是因为|说明.{0,8}(?:态度|能力|动机))/u.test(finding.interpretationToConfirm)) {
      messages.push(`${finding.findingId}：待确认解释不得写成确定性归因`)
    }
    if (requireReviewed && !finding.teacherReviewed) messages.push(`${finding.findingId}：教师须逐条核验，不能使用总勾选代替`)
  }
  return unique(messages)
}

export function detectE03InitialDefects(progress: E03Progress): E03InitialDefect[] {
  const defects: E03InitialDefect[] = []
  const f02 = progress.aiDraft?.findings.find((item) => item.findingId === 'F02')
  if (f02 && e03FixedLabelFindings(f02.observedFact).length > 0) defects.push('fact-label-overreach')
  const a02 = progress.measureDraft?.measures.find((item) => item.measureId === 'A02')
  if (a02 && !e03MeasureIsSpecific(a02)) defects.push('vague-unobservable-measure')
  return defects
}

export function validateE03InitialFindings(progress: E03Progress, participantId?: string): E03ValidationResult {
  const messages = [...validateE03Source(progress).messages]
  const draft = progress.aiDraft
  if (!draft) return { valid: false, messages: unique([...messages, '尚未生成三条确定性课堂发现']) }
  if (!draft.participantId || (participantId && draft.participantId !== participantId)) messages.push('课堂发现初稿不属于当前 participantId')
  if (draft.inputFingerprint !== e03InputFingerprint(progress)) messages.push('课堂发现初稿所用记录版本已经失效')
  const structureMessages = findingStructureMessages(progress, draft.findings, false)
    .filter((message) => !message.startsWith('F02：观察事实夹带'))
  messages.push(...structureMessages)
  const defects = detectE03InitialDefects(progress).filter((item) => item === 'fact-label-overreach')
  if (!exactIdSet(defects, ['fact-label-overreach'])) {
    messages.push('确定性发现初稿须稳定暴露一处“把一次表现写成态度/能力标签”的可区分缺陷')
  }
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE03Findings(progress: E03Progress, participantId?: string): E03ValidationResult {
  const messages = [...validateE03Source(progress).messages]
  if (!progress.aiDraft) messages.push('须保留只读的 AI 三条发现初稿')
  if (progress.aiDraft && participantId && progress.aiDraft.participantId !== participantId) messages.push('AI 初稿不属于当前 participantId')
  messages.push(...findingStructureMessages(progress, progress.workingFindings, true))
  return { valid: messages.length === 0, messages: unique(messages) }
}

const vagueMeasurePatterns = [
  /加强.{0,10}(?:关注|教育|引导)/u,
  /提升.{0,8}(?:积极性|主动性|意识)/u,
  /学生更积极/u,
  /教师观察课堂表现/u,
]

export function e03MeasureIsSpecific(measure: E03ImprovementMeasure) {
  const values = [measure.implementationPhase, measure.teacherAction, measure.observableStudentBehavior, measure.checkMethod]
  if (!values.every(nonEmpty)) return false
  const text = values.join('\n')
  if (vagueMeasurePatterns.some((pattern) => pattern.test(text))) return false
  if (e03FixedLabelFindings(text).length) return false
  const actionIsObservable = /(?:发放|提问|追问|核对|记录|展示|组织|要求|请|收回|统计|勾选)/u.test(measure.teacherAction)
  const studentBehaviorIsObservable = /(?:提交|口述|打开|完成|写出|举手|排序|操作|指认|作答)/u.test(measure.observableStudentBehavior)
  const checkIsObservable = /(?:记录|统计|勾选|收回|检查|退出卡|量表|表)/u.test(measure.checkMethod)
  return actionIsObservable && studentBehaviorIsObservable && checkIsObservable
}

function measureStructureMessages(progress: E03Progress, useWorking: boolean, requireReviewed: boolean) {
  const messages: string[] = []
  const measureSet = useWorking ? progress.workingMeasures : progress.measureDraft
  if (!measureSet) return ['尚未形成两条下一次课改进措施']
  if (measureSet.participantId !== progress.aiDraft?.participantId) messages.push('改进清单不属于当前课堂发现作者')
  if (measureSet.basedOnFindingsFingerprint !== e03FindingsFingerprint(progress.workingFindings)) {
    messages.push('改进清单关联的三条课堂发现已经发生变化')
  }
  if (!exactIdSet(measureSet.measures.map((item) => item.measureId), measureIds)) {
    messages.push('改进措施必须恰好为 A01、A02 两条且编号唯一')
  }
  for (const measure of measureSet.measures) {
    if (![measure.implementationPhase, measure.teacherAction, measure.observableStudentBehavior, measure.checkMethod].every(nonEmpty)) {
      messages.push(`${measure.measureId}：实施阶段、教师动作、学生可观察行为和检查方法须完整`)
    }
    if (!measure.linkedFindingIds.length || measure.linkedFindingIds.some((id) => !findingIds.includes(id))) {
      messages.push(`${measure.measureId}：须关联至少一条当前 F01–F03 课堂发现`)
    }
    if (useWorking && !e03MeasureIsSpecific(measure)) {
      messages.push(`${measure.measureId}：措施须具体、可执行、可观察且可检查，不得只写“加强关注”等泛化表述`)
    }
    if (requireReviewed && !measure.teacherReviewed) messages.push(`${measure.measureId}：教师须逐条核验最终措施`)
  }
  return unique(messages)
}

export function validateE03InitialMeasures(progress: E03Progress, participantId?: string): E03ValidationResult {
  const messages = [...validateE03Findings(progress, participantId).messages, ...measureStructureMessages(progress, false, false)]
  const measureDefects = detectE03InitialDefects(progress).filter((item) => item === 'vague-unobservable-measure')
  if (!exactIdSet(measureDefects, ['vague-unobservable-measure'])) {
    messages.push('两条措施初稿须稳定暴露一条具体性、可执行性和可观察性均待调整的措施')
  }
  const a01 = progress.measureDraft?.measures.find((item) => item.measureId === 'A01')
  if (a01 && !e03MeasureIsSpecific(a01)) messages.push('A01 应作为具体、可执行、可观察的对照措施')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE03Measures(progress: E03Progress, participantId?: string): E03ValidationResult {
  const messages = [...validateE03Findings(progress, participantId).messages, ...measureStructureMessages(progress, true, true)]
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE03PeerReview(progress: E03Progress, directory: ParticipantDirectory): E03ValidationResult {
  const messages = [...validateE03InitialMeasures(progress, directory.currentParticipantId).messages]
  const review = progress.peerReview
  const reviewer = eligibleE03Reviewers(directory).find((item) => item.participantId === review.reviewerId)
  if (!reviewer || review.reviewerGroupId !== reviewer.groupId) messages.push('复核人必须是当前同组的其他真实参训成员')
  if (!review.reviewerRole) messages.push('须记录复核人的任务内临时角色')
  if (review.templateVersion !== '1.0' || review.targetScope !== 'member' || review.artifactKind !== 'e03-improvement-measures') {
    messages.push('须使用 E03 v1.0 成员级“下一次课改进清单”复核模板')
  }
  if (!progress.measureDraft
    || review.artifactId !== progress.measureDraft.artifactId
    || review.reviewedMeasureFingerprint !== e03MeasureFingerprint(progress)) {
    messages.push('同组复核须关联两条措施初稿的精确 artifactId 与内容指纹')
  }
  if (!exactIdSet(review.judgements.map((item) => item.measureId), measureIds)) {
    messages.push('须分别复核 A01、A02 两条措施，不能使用总评价代替')
  }
  for (const judgement of review.judgements) {
    if (!judgement.specific || !judgement.executable || !judgement.observable || !judgement.suggestion.trim()) {
      messages.push(`${judgement.measureId}：具体性、可执行性、可观察性和建议须逐项记录`)
    }
  }
  const a01 = review.judgements.find((item) => item.measureId === 'A01')
  const a02 = review.judgements.find((item) => item.measureId === 'A02')
  if (a01 && (a01.specific !== '具体' || a01.executable !== '可执行' || a01.observable !== '可观察')) {
    messages.push('A01 的确定性复核事实应为具体、可执行、可观察')
  }
  if (a02 && (a02.specific !== '需调整' || a02.executable !== '需调整' || a02.observable !== '需调整')) {
    messages.push('A02 的确定性复核事实应如实保留三项“需调整”')
  }
  if (!review.simulated
    || !review.disclosure.includes('无多人后端')
    || !review.disclosure.includes('非实时提交')
    || !review.disclosure.includes('不代表真实组员在线提交')) {
    messages.push('Demo 复核须公开无多人后端、非实时代录边界，不冒充组员在线提交')
  }
  if (!review.recordId || !review.submitted || !review.submittedAt) messages.push('须提交完整的同组措施复核记录')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE03Revision(progress: E03Progress, directory: ParticipantDirectory): E03ValidationResult {
  const messages = [...validateE03PeerReview(progress, directory).messages, ...validateE03Measures(progress, directory.currentParticipantId).messages]
  const measureSubstance = (measure: E03ImprovementMeasure | undefined) => measure ? {
    measureId: measure.measureId,
    linkedFindingIds: measure.linkedFindingIds,
    implementationPhase: measure.implementationPhase,
    teacherAction: measure.teacherAction,
    observableStudentBehavior: measure.observableStudentBehavior,
    checkMethod: measure.checkMethod,
  } : undefined
  const currentRevisions = progress.revisions.filter((revision) => {
    const before = progress.measureDraft?.measures.find((item) => item.measureId === revision.measureId)
    const after = progress.workingMeasures?.measures.find((item) => item.measureId === revision.measureId)
    const judgement = progress.peerReview.judgements.find((item) => item.measureId === revision.measureId)
    return revision.participantId === directory.currentParticipantId
      && revision.sourcePeerReviewId === progress.peerReview.recordId
      && revision.reviewedMeasureFingerprint === progress.peerReview.reviewedMeasureFingerprint
      && revision.sourceSuggestion === judgement?.suggestion
      && revision.authorTreatment === '已采纳并修正'
      && revision.authorBasis.trim()
      && e03Hash(measureSubstance(revision.before)) === e03Hash(measureSubstance(before))
      && e03Hash(measureSubstance(revision.after)) === e03Hash(measureSubstance(after))
      && e03Hash(measureSubstance(revision.before)) !== e03Hash(measureSubstance(revision.after))
  })
  if (!currentRevisions.length) messages.push('作者须依据当前同组反馈实质修改至少一条措施，并保存修改前、修改后和反馈来源')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export const validateE03Final = validateE03Revision

export function validateE03Confirmation(progress: E03Progress, directory: ParticipantDirectory): E03ValidationResult {
  const messages = [...validateE03Revision(progress, directory).messages]
  if (Object.values(progress.teacherConfirmation).some((checked) => !checked)) {
    messages.push('须逐项确认来源边界、三条发现、真实身份、固定标签、两项成果和教师最终责任')
  }
  if (e03UnsafeIdentityFindings(progress).length) messages.push('最终成果仍含可能识别真实个人的信息')
  const finalLabelText = [
    ...progress.workingFindings.map((item) => item.observedFact),
    ...(progress.workingMeasures?.measures ?? []).flatMap((item) => [item.teacherAction, item.observableStudentBehavior, item.checkMethod]),
  ].join('\n')
  if (e03FixedLabelFindings(finalLabelText).length) messages.push('最终观察事实或措施仍含态度、能力、动机或长期固定标签')
  return { valid: messages.length === 0, messages: unique(messages) }
}

function groupRosterFingerprint(directory: ParticipantDirectory) {
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  const roster = directory.participants
    .filter((item) => item.groupId === current?.groupId)
    .map((item) => ({ participantId: item.participantId, name: item.name, groupId: item.groupId }))
    .sort((left, right) => left.participantId.localeCompare(right.participantId))
  return e03Hash(roster)
}

export function e03ConfirmationFingerprint(progress: E03Progress, directory: ParticipantDirectory) {
  return e03Hash({
    participantId: directory.currentParticipantId,
    source: progress.source,
    aiDraft: progress.aiDraft,
    workingFindings: progress.workingFindings,
    measureDraft: progress.measureDraft,
    workingMeasures: progress.workingMeasures,
    peerReview: progress.peerReview,
    revisions: progress.revisions,
    teacherConfirmation: progress.teacherConfirmation,
    groupRoster: groupRosterFingerprint(directory),
  })
}

export function confirmedE03PackageIsCurrent(progress: E03Progress, directory: ParticipantDirectory) {
  const pkg = progress.confirmedPackage
  const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId)
  if (!pkg || !current || !progress.workingMeasures || !validateE03Confirmation(progress, directory).valid) return false
  const exactArtifacts = pkg.artifacts.length === 2
    && pkg.artifacts[0]?.kind === 'e03-reflection-record'
    && pkg.artifacts[0]?.name === '教学反思或评课记录'
    && pkg.artifacts[1]?.kind === 'e03-improvement-measures'
    && pkg.artifacts[1]?.name === '下一次课改进清单'
    && pkg.artifacts.every((item) => item.version === '1.0')
  return exactArtifacts
    && pkg.participantId === directory.currentParticipantId
    && pkg.participantName === current.name
    && pkg.groupId === current.groupId
    && pkg.groupName === current.groupName
    && pkg.sourceId === progress.source.sourceId
    && pkg.sourceName === progress.source.sourceName
    && pkg.sourceVersion === progress.source.version
    && pkg.teachingGoal === progress.source.teachingGoal
    && pkg.classroomActivities === progress.source.classroomActivities
    && pkg.assessmentResults === progress.source.assessmentResults
    && pkg.artifactVersion === '1.0'
    && exactIdSet(pkg.findingIds, findingIds)
    && exactIdSet(pkg.measureIds, measureIds)
    && pkg.findingsFingerprint === e03FindingsFingerprint(progress.workingFindings)
    && pkg.measuresFingerprint === e03MeasureFingerprint(progress, true)
    && e03Hash(pkg.findings) === e03Hash(progress.workingFindings)
    && e03Hash(pkg.measures) === e03Hash(progress.workingMeasures.measures)
    && e03Hash(pkg.peerReview) === e03Hash(progress.peerReview)
    && e03Hash(pkg.revisions) === e03Hash(progress.revisions)
    && e03Hash(pkg.teacherConfirmation) === e03Hash(progress.teacherConfirmation)
    && pkg.confirmationFingerprint === e03ConfirmationFingerprint(progress, directory)
}

export function e03ContentFingerprint(progress: E03Progress, directory: ParticipantDirectory) {
  return e03Hash({
    confirmation: e03ConfirmationFingerprint(progress, directory),
    package: progress.confirmedPackage ?? null,
  })
}

export function latestE03AssessmentIsCurrent(progress: E03Progress, directory: ParticipantDirectory) {
  const latest = progress.assessments.at(-1)
  return Boolean(latest?.passed && latest.contentFingerprint === e03ContentFingerprint(progress, directory))
}

export function validateE03AssessmentSubmission(progress: E03Progress, directory: ParticipantDirectory): E03ValidationResult {
  const messages = [...validateE03Confirmation(progress, directory).messages]
  if (!confirmedE03PackageIsCurrent(progress, directory)) messages.push('须先形成当前教师的两项固定成果包')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function progressForE03(progress: E03Progress, directory: ParticipantDirectory) {
  if (latestE03AssessmentIsCurrent(progress, directory)) return 100
  if (progress.route === 'overview'
    && !progress.aiDraft
    && !progress.measureDraft
    && !progress.workingMeasures
    && !progress.confirmedPackage
    && progress.assessments.length === 0) return 0
  const routeFloor: Record<E03Route, number> = {
    overview: 0,
    source: 10,
    findings: 25,
    measures: 40,
    'peer-review': 55,
    revision: 70,
    confirmation: 85,
    result: 90,
  }
  let value = routeFloor[progress.route]
  if (validateE03Source(progress).valid) value = Math.max(value, 20)
  if (validateE03Findings(progress, directory.currentParticipantId).valid) value = Math.max(value, 40)
  if (validateE03InitialMeasures(progress, directory.currentParticipantId).valid) value = Math.max(value, 55)
  if (validateE03PeerReview(progress, directory).valid) value = Math.max(value, 65)
  if (validateE03Revision(progress, directory).valid) value = Math.max(value, 80)
  if (confirmedE03PackageIsCurrent(progress, directory)) value = Math.max(value, 90)
  return value
}
