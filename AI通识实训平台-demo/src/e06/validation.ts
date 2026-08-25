import type { ParticipantDirectory } from '../training/types'
import { e06Documents } from './data'
import type { E06DocumentId, E06Progress, E06Route } from './domain'
import { e06ComparisonFingerprint, e06Hash, e06InputFingerprint, e06LiteratureFingerprint, eligibleE06Reviewers } from './runner'

export interface E06ValidationResult { valid: boolean; messages: string[] }
const ids: E06DocumentId[] = ['D01', 'D02', 'D03']
const unique = (values: string[]) => [...new Set(values)]
const nonEmpty = (value: string) => Boolean(value.trim())
function exact(actual: string[], expected: string[]) { return actual.length === expected.length && new Set(actual).size === expected.length && expected.every((item) => actual.includes(item)) }
function excerpts(progress: E06Progress) { return new Map(progress.source.documents.flatMap((document) => document.excerpts.map((item) => [item.excerptId, { documentId: document.documentId, ...item }] as const))) }

export function e06UnsafeFindings(progress: E06Progress) { const text = [progress.source.teachingQuestion, progress.source.intendedUse, ...progress.source.documents.flatMap((item) => [item.title, item.author, item.authorization, ...item.excerpts.flatMap((part) => [part.locator, part.text])])].join('\n'); const messages: string[] = []; if (/1[3-9]\d{9}/u.test(text)) messages.push('手机号'); if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(text)) messages.push('邮箱'); if (/\d{17}[\dXx]/u.test(text)) messages.push('身份证'); return unique(messages) }

export function validateE06Source(progress: E06Progress): E06ValidationResult {
  const messages: string[] = []
  if (!nonEmpty(progress.source.teachingQuestion) || progress.source.teachingQuestion.length < 12) messages.push('须填写明确、可用于教研的教学问题')
  if (!nonEmpty(progress.source.intendedUse)) messages.push('须说明文献梳理用于教研选题或方案论证的具体用途')
  if (!exact(progress.source.documents.map((item) => item.documentId), ids)) messages.push('必须且只能使用 D01—D03 三份当前获准材料')
  for (const expected of e06Documents) {
    const actual = progress.source.documents.find((item) => item.documentId === expected.documentId)
    if (!actual || actual.title !== expected.title || actual.author !== expected.author || actual.year !== expected.year || actual.authorization !== expected.authorization || !actual.reviewedFictional) messages.push(`${expected.documentId}：题名、作者、年份或授权元数据与当前获准材料不符`)
    if (!actual || actual.excerpts.length !== 4 || actual.excerpts.some((item) => !nonEmpty(item.excerptId) || !nonEmpty(item.locator) || !nonEmpty(item.text))) messages.push(`${expected.documentId}：必须保留对象、方法、发现和边界四个可点查原文位置`)
  }
  if (!progress.source.exactlyThreeConfirmed || !progress.source.authorizationConfirmed || !progress.source.noOpenWebConfirmed || !progress.source.privacyConfirmed) messages.push('须确认只用三份材料、材料获准、不使用开放网络且不含敏感信息')
  const unsafe = e06UnsafeFindings(progress); if (unsafe.length) messages.push(`材料检测到${unsafe.join('、')}`)
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function detectE06InitialDefects(progress: E06Progress) { const d02 = progress.draft?.records.find((item) => item.documentId === 'D02'); return d02 && (d02.finding.includes('必然') || d02.finding.includes('所有') || d02.boundary.includes('因果')) ? ['conclusion-overreach' as const] : [] }

function recordMessages(progress: E06Progress, final: boolean) {
  const records = progress.workingRecords; const messages: string[] = []; const sourceRefs = excerpts(progress)
  if (!exact(records.map((item) => item.documentId), ids)) messages.push('文献梳理表必须恰好包含 D01—D03 三份材料')
  for (const record of records) {
    const source = progress.source.documents.find((item) => item.documentId === record.documentId)
    if (!source || record.title !== source.title || record.author !== source.author || record.year !== source.year) messages.push(`${record.documentId}：题名、作者或年份与获准材料不符`)
    for (const [label, value, ref] of [['研究对象', record.researchObject, record.objectReference], ['方法', record.method, record.methodReference], ['发现', record.finding, record.findingReference], ['边界', record.boundary, record.boundaryReference]] as const) {
      const location = sourceRefs.get(ref); if (!nonEmpty(value) || !location || location.documentId !== record.documentId) messages.push(`${record.documentId}：${label}必须完整且指向本资料可点查位置`)
    }
    if (final && !record.teacherReviewed) messages.push(`${record.documentId}：教师须逐份核验元数据、结论与边界`)
  }
  if (progress.draft?.participantId !== undefined && progress.draft.participantId.length === 0) messages.push('初稿缺少 participantId')
  if (progress.draft && progress.draft.inputFingerprint !== e06InputFingerprint(progress)) messages.push('教学问题或材料变化，旧初稿已失效')
  if (final) { const d02 = records.find((item) => item.documentId === 'D02'); if (!d02 || d02.finding.includes('必然') || d02.finding.includes('所有') || !d02.boundary.includes('无对照组') || !d02.boundary.includes('不能证明')) messages.push('D02 结论越界尚未按 D02-P4-S1 / D02-P5-S2 修正') }
  return messages
}

export function validateE06InitialReview(progress: E06Progress, participantId?: string): E06ValidationResult {
  const messages = [...validateE06Source(progress).messages]
  if (!progress.draft || progress.draft.participantId !== participantId) messages.push('须生成当前教师的本地确定性初稿')
  messages.push(...recordMessages(progress, false))
  for (const documentId of ids) {
    if (!progress.workingRecords.find((record) => record.documentId === documentId)?.teacherReviewed) messages.push(`${documentId}：教师须逐份核验元数据、结论与边界`)
  }
  if (!exact(detectE06InitialDefects(progress), ['conclusion-overreach'])) messages.push('确定性初稿必须稳定暴露一处 D02 结论越界问题')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE06Comparisons(progress: E06Progress, participantId?: string): E06ValidationResult {
  const messages = [...validateE06InitialReview(progress, participantId).messages]; const sourceRefs = excerpts(progress)
  if (progress.comparisons.length < 2 || new Set(progress.comparisons.map((item) => item.comparisonId)).size !== progress.comparisons.length) messages.push('须形成至少 2 条稳定 ID 的观点比较')
  for (const comparison of progress.comparisons) {
    if (!['一致', '不同', '相互补充'].includes(comparison.kind)) messages.push(`${comparison.comparisonId}：关系类型必须三选一`)
    if (!nonEmpty(comparison.comparison) || !nonEmpty(comparison.boundary) || !nonEmpty(comparison.intendedUse)) messages.push(`${comparison.comparisonId}：对比观点、比较边界和教研用途须完整`)
    if (comparison.references.length !== 2 || new Set(comparison.references.map((item) => item.documentId)).size !== 2) messages.push(`${comparison.comparisonId}：必须引用两份不同材料`)
    if (comparison.references.some((item) => !nonEmpty(item.point) || sourceRefs.get(item.excerptId)?.documentId !== item.documentId)) messages.push(`${comparison.comparisonId}：每份观点必须指向对应资料的真实位置`)
  }
  if (progress.comparisons.some((item) => !item.teacherReviewed)) messages.push('教师须逐条核验观点比较的关系类型、两份引用与适用边界')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE06PeerReview(progress: E06Progress, directory: ParticipantDirectory): E06ValidationResult {
  const messages = [...validateE06Comparisons(progress, directory.currentParticipantId).messages]; const review = progress.peerReview; const reviewer = eligibleE06Reviewers(directory).find((item) => item.participantId === review.reviewerId)
  if (!reviewer || review.reviewerGroupId !== reviewer.groupId) messages.push('核验人必须是当前同组的其他成员'); if (!review.reviewerRole) messages.push('须记录任务内临时角色')
  if (review.documentChecks.length !== 3 || !exact(review.documentChecks.map((item) => item.documentId), ids) || review.documentChecks.some((item) => !nonEmpty(item.note))) messages.push('须逐份核验 D01—D03 的元数据与结论')
  if (!review.documentChecks.every((item) => item.metadataAccurate) || review.documentChecks.find((item) => item.documentId === 'D02')?.conclusionAccurate !== false) messages.push('确定性复核应如实保留元数据正确且 D02 结论越界的事实')
  const reviewedRecords = progress.draft?.records.map((item) => ({ ...item, teacherReviewed: progress.workingRecords.find((record) => record.documentId === item.documentId)?.teacherReviewed ?? false }))
  if (!reviewedRecords || review.reviewedFingerprint !== e06Hash({ records: reviewedRecords, comparisons: progress.comparisons })) messages.push('同组核验须绑定修正前文献梳理与观点比较的精确指纹')
  if (!review.recordId || !review.artifactId || !review.reviewedFingerprint || !nonEmpty(review.suggestion) || !review.submitted || !review.submittedAt) messages.push('须提交完整的同组核验记录')
  if (!review.simulated || !review.disclosure.includes('无多人后端') || !review.disclosure.includes('非实时提交')) messages.push('Demo 必须公开模拟复核边界')
  return { valid: messages.length === 0, messages: unique(messages) }
}

export function validateE06Revision(progress: E06Progress, directory: ParticipantDirectory): E06ValidationResult {
  const messages = [...validateE06PeerReview(progress, directory).messages, ...recordMessages(progress, true)]; const refs = excerpts(progress)
  const revisions = progress.revisions.filter((item) => item.participantId === directory.currentParticipantId && item.sourceReviewId === progress.peerReview.recordId && item.beforeValue.trim() !== item.afterValue.trim() && nonEmpty(item.basis) && refs.get(item.sourceExcerptId)?.documentId === item.documentId)
  if (revisions.length < 1) messages.push('作者须根据同组核验实质修改至少 1 处，并保留前后、依据与引用位置')
  if (progress.comparisons.some((item) => !item.teacherReviewed)) messages.push('教师须逐条核验最终观点比较的类型、引用与边界')
  return { valid: messages.length === 0, messages: unique(messages) }
}
export const validateE06Final = validateE06Revision

export function validateE06Confirmation(progress: E06Progress, directory: ParticipantDirectory): E06ValidationResult { const messages = [...validateE06Revision(progress, directory).messages]; if (Object.values(progress.teacherConfirmation).some((item) => !item)) messages.push('须逐项确认元数据、结论、比较、零虚假引用、合规与教师责任'); return { valid: messages.length === 0, messages: unique(messages) } }
function rosterFingerprint(directory: ParticipantDirectory) { const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId); return e06Hash(directory.participants.filter((item) => item.groupId === current?.groupId).map((item) => ({ id: item.participantId, name: item.name, groupId: item.groupId })).sort((a, b) => a.id.localeCompare(b.id))) }
export function e06ConfirmationFingerprint(progress: E06Progress, directory: ParticipantDirectory) { return e06Hash({ participantId: directory.currentParticipantId, source: progress.source, records: progress.workingRecords, comparisons: progress.comparisons, peerReview: progress.peerReview, revisions: progress.revisions, confirmation: progress.teacherConfirmation, roster: rosterFingerprint(directory) }) }
export function confirmedE06PackageIsCurrent(progress: E06Progress, directory: ParticipantDirectory) { const pkg = progress.confirmedPackage; const current = directory.participants.find((item) => item.participantId === directory.currentParticipantId); return Boolean(pkg && current && validateE06Confirmation(progress, directory).valid && pkg.participantId === current.participantId && pkg.groupId === current.groupId && pkg.sourceFingerprint === e06InputFingerprint(progress) && pkg.literatureFingerprint === e06LiteratureFingerprint(progress) && pkg.comparisonFingerprint === e06ComparisonFingerprint(progress) && pkg.confirmationFingerprint === e06ConfirmationFingerprint(progress, directory) && pkg.artifacts.length === 3 && pkg.artifacts[0]?.name === '文献梳理表' && pkg.artifacts[1]?.name === '观点对比表' && pkg.artifacts[2]?.name === '引用核验记录') }
export function e06ContentFingerprint(progress: E06Progress, directory: ParticipantDirectory) { return e06Hash({ confirmation: e06ConfirmationFingerprint(progress, directory), package: progress.confirmedPackage ?? null }) }
export function latestE06AssessmentIsCurrent(progress: E06Progress, directory: ParticipantDirectory) { const latest = progress.assessments.at(-1); return Boolean(latest?.passed && latest.contentFingerprint === e06ContentFingerprint(progress, directory)) }
export function progressForE06(progress: E06Progress, directory: ParticipantDirectory) { if (latestE06AssessmentIsCurrent(progress, directory)) return 100; if (progress.route === 'overview' && !progress.draft && !progress.workingRecords.length && !progress.comparisons.length && !progress.confirmedPackage && !progress.assessments.length) return 0; const floors: Record<E06Route, number> = { overview: 0, question: 10, review: 25, comparison: 40, 'peer-review': 55, revision: 70, confirmation: 85, result: 90 }; let value = floors[progress.route]; if (validateE06Source(progress).valid) value = Math.max(value, 20); if (validateE06InitialReview(progress, directory.currentParticipantId).valid) value = Math.max(value, 40); if (validateE06Comparisons(progress, directory.currentParticipantId).valid) value = Math.max(value, 55); if (validateE06PeerReview(progress, directory).valid) value = Math.max(value, 65); if (validateE06Revision(progress, directory).valid) value = Math.max(value, 80); if (confirmedE06PackageIsCurrent(progress, directory)) value = Math.max(value, 95); return Math.min(99, value) }
