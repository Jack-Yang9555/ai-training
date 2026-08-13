import { g01OutputNames, g01PrerequisiteTaskIds } from './data'
import type { G01AcceptanceCondition, G01ArtifactSnapshot, G01ChecklistCategory, G01Progress, G01StageStatus } from './types'

function filled(value: string | undefined): boolean { return Boolean(value?.trim()) }

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return (hash >>> 0).toString(36)
}

function artifactMinimum(taskId: string): number { return taskId === 'M03' ? 2 : 1 }

export function g01ContentFingerprint(progress: G01Progress): string {
  const canonical = {
    groupId: progress.groupId,
    rosterFingerprint: progress.rosterFingerprint,
    memberPrerequisites: progress.memberPrerequisites.map((member) => ({ participantId: member.participantId, source: member.source, evidence: member.evidence.map((item) => ({ taskId: item.taskId, complete: item.complete, artifactIds: [...item.artifactIds].sort() })) })),
    errorCorrections: progress.errorCorrections.map((item) => ({ ...item })).sort((a, b) => a.participantId.localeCompare(b.participantId)),
    crossChecks: progress.crossChecks.map((item) => ({ ...item })).sort((a, b) => a.reviewerParticipantId.localeCompare(b.reviewerParticipantId)),
    checklist: progress.checklist.map((item) => ({ ...item })),
    contributions: progress.contributions.map((item) => ({ ...item })).sort((a, b) => a.participantId.localeCompare(b.participantId)),
  }
  return `g01-${hashText(JSON.stringify(canonical))}`
}

export function g01PrerequisitesComplete(progress: G01Progress): boolean {
  return progress.memberPrerequisites.length > 0 && progress.memberPrerequisites.every((member) => g01PrerequisiteTaskIds.every((taskId) => {
    const evidence = member.evidence.find((item) => item.taskId === taskId)
    return Boolean(evidence?.complete && evidence.artifactIds.length >= artifactMinimum(taskId))
  }))
}

export function g01ErrorsComplete(progress: G01Progress): boolean {
  return progress.memberPrerequisites.every((member) => progress.errorCorrections.some((item) => item.participantId === member.participantId && filled(item.sourceArtifactId) && filled(item.aiError) && filled(item.teacherCorrection) && filled(item.correctionBasis)))
}

export function g01CrossChecksComplete(progress: G01Progress): boolean {
  const memberIds = new Set(progress.memberPrerequisites.map((item) => item.participantId))
  return progress.memberPrerequisites.length > 1 && progress.memberPrerequisites.every((member) => progress.crossChecks.some((item) => item.reviewerParticipantId === member.participantId && memberIds.has(item.targetParticipantId) && item.targetParticipantId !== member.participantId && filled(item.targetArtifactId) && filled(item.finding) && filled(item.conclusion)))
}

export function g01ChecklistComplete(progress: G01Progress): boolean {
  const completeItems = progress.checklist.filter((item) => filled(item.checkItem) && filled(item.evidence) && filled(item.handling))
  const categories = new Set<G01ChecklistCategory>(completeItems.map((item) => item.category))
  return completeItems.length >= 8 && (['事实', '引用', '安全', '目标', '答案'] as G01ChecklistCategory[]).every((category) => categories.has(category))
}

export function g01ContributionsComplete(progress: G01Progress): boolean {
  return progress.memberPrerequisites.every((member) => progress.contributions.some((item) => item.participantId === member.participantId && Boolean(item.role) && filled(item.contribution)))
}

export function validateG01Assessment(progress: G01Progress): G01AcceptanceCondition[] {
  const categories = new Set(progress.checklist.filter((item) => filled(item.checkItem) && filled(item.evidence) && filled(item.handling)).map((item) => item.category))
  const missingCategories = (['事实', '引用', '安全', '目标', '答案'] as G01ChecklistCategory[]).filter((item) => !categories.has(item))
  const prerequisitePassed = g01PrerequisitesComplete(progress)
  const errorsPassed = g01ErrorsComplete(progress)
  const checklistPassed = g01ChecklistComplete(progress)
  const crossChecksPassed = g01CrossChecksComplete(progress)
  const contributionsPassed = g01ContributionsComplete(progress)
  return [
    { id: 'prerequisite-completeness', source: '三日方案验收条件', label: '每位成员的核验记录、多模型评分、提示词双版本、教案和题目包齐全', passed: prerequisitePassed, evidence: prerequisitePassed ? `${progress.memberPrerequisites.length} 名成员五类验收材料均有明确引用` : '至少一名成员的 G01 验收材料不完整' },
    { id: 'error-corrections', source: '三日方案验收条件', label: '每位成员至少展示 1 处 AI 错误及教师修正', passed: errorsPassed, evidence: errorsPassed ? `${progress.memberPrerequisites.length} 名成员均有错误、修正和依据` : '至少一名成员的错误修正记录不完整' },
    { id: 'checklist-coverage', source: '三日方案验收条件', label: '核验清单不少于 8 项并覆盖事实、引用、安全、目标和答案', passed: checklistPassed, evidence: checklistPassed ? `${progress.checklist.length} 项，五类检查均覆盖` : `完整清单 ${progress.checklist.filter((item) => filled(item.checkItem) && filled(item.evidence) && filled(item.handling)).length} 项；缺少类别：${missingCategories.join('、') || '无'}` },
    { id: 'cross-checks', source: '三日方案验收条件', label: '每位成员完成至少 1 次教案或题目包交叉检查', passed: crossChecksPassed, evidence: crossChecksPassed ? `${progress.memberPrerequisites.length} 名成员均有同组交叉检查` : '至少一名成员缺少有效交叉检查，或检查对象不是同组其他成员' },
    { id: 'artifact-completeness', source: '三日方案小组操作与成果契约', label: '个人贡献覆盖每位成员，三项规定成果可完整生成', passed: contributionsPassed, evidence: contributionsPassed ? `${progress.memberPrerequisites.length} 名成员的角色与具体贡献齐全；成果名称固定为三项` : '至少一名成员缺少角色或具体贡献，个人贡献记录尚不完整' },
  ]
}

export function createG01Artifacts(progress: G01Progress, capturedAt: string, fingerprint = g01ContentFingerprint(progress)): G01ArtifactSnapshot[] {
  const summaries = [`${progress.memberPrerequisites.length} 名成员 × M01—M05 五类成果`, `${progress.checklist.length} 项核验，覆盖事实、引用、安全、目标和答案`, `${progress.contributions.length} 名成员角色与具体贡献`]
  return g01OutputNames.map((name, index) => ({ artifactId: `G01:${progress.groupId}:output:${index + 1}:${fingerprint}`, name, capturedAt, fingerprint, summary: summaries[index] }))
}

export function g01CurrentStatus(progress: G01Progress): G01StageStatus {
  const latest = progress.assessments.at(-1)
  if (!latest) return '待验收'
  const current = latest.fingerprint === g01ContentFingerprint(progress) && !progress.rosterFingerprint.startsWith('invalidated:')
  if (!current) return '需补验'
  return latest.outcome === '已通过' ? '已通过' : '未通过'
}

export function g01IsCurrentlyPassed(progress: G01Progress): boolean { return g01CurrentStatus(progress) === '已通过' }

export function progressForG01(progress: G01Progress): number {
  if (!g01PrerequisitesComplete(progress)) return progress.assessments.length > 0 || progress.route !== 'overview' ? 1 : 0
  if (progress.route === 'overview' && progress.assessments.length === 0 && progress.artifacts.length === 0) return 0
  const completed = [g01PrerequisitesComplete(progress), g01ErrorsComplete(progress), g01CrossChecksComplete(progress), g01ChecklistComplete(progress), g01ContributionsComplete(progress), g01IsCurrentlyPassed(progress)].filter(Boolean).length
  return Math.round((completed / 6) * 100)
}
