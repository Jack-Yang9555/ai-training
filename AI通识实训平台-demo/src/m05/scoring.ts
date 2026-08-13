import type { ParticipantDirectory } from '../training/types'
import type { M05AssessmentSnapshot, M05Progress, M05ScoreResult } from './types'
import { confirmedM05PackageIsCurrent, containsM05UnsafeContent, m05CurrentFingerprint, m05Distribution, revisionIsComplete, validateM05Audits, validateM05Draft, validateM05PeerReview, validateM05Revisions } from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateM05Score(progress: M05Progress, directory: ParticipantDirectory, _legacyUpstreamAvailable = true): M05ScoreResult {
  const questions = progress.draft?.questions ?? []
  const distribution = m05Distribution(questions)
  const draft = validateM05Draft(progress)
  const audits = validateM05Audits(progress)
  const revisions = validateM05Revisions(progress)
  const peer = validateM05PeerReview(progress, directory)
  const currentConfirmed = confirmedM05PackageIsCurrent(progress, directory)
  const completeRevisions = progress.revisions.filter((item) => revisionIsComplete(item, progress.draft?.questions))
  const advancedRevision = completeRevisions.some((record) => questions.some((item) => item.id === record.questionId && (item.type === 'scenario' || item.type === 'comprehensive')))
  const evidenceComplete = questions.length === 8 && questions.every((item) => item.answer.trim() && item.explanation.trim() && item.materialEvidence.trim() && progress.audits[item.id]?.answerClarity === '明确' && progress.audits[item.id]?.evidenceVerified) && progress.confirmation.answerConfirmed && progress.confirmation.rubricConfirmed
  const safe = progress.input.rightsConfirmed && progress.input.privacyConfirmed && progress.confirmation.safetyConfirmed && questions.every((item) => progress.audits[item.id]?.safeAndFair) && !containsM05UnsafeContent([...questions.flatMap((item) => [item.stem, item.answer, item.explanation, item.materialEvidence]), ...progress.revisions.flatMap((item) => [item.revisedContent, item.reason]), progress.peerReview.suggestion, progress.confirmation.peerResponse])
  const coveredObjectives = new Set(questions.flatMap((item) => item.objectiveIds)).size
  const exactDistribution = distribution.single === 3 && distribution.multiple === 1 && distribution.judgment === 1 && distribution.scenario === 2 && distribution.comprehensive === 1
  const dimensions: M05ScoreResult['dimensions'] = [
    { id: 'completion', label: '操作完成与核心步骤', score: scored(draft.valid && audits.valid && currentConfirmed, questions.length > 0), evidence: `${questions.length}/8 道题，题型结构${exactDistribution ? '齐全' : '待补'}，教师确认题目包${currentConfirmed ? '有效' : '待形成'}` },
    { id: 'adaptation', label: '教学场景适配', score: scored(draft.valid && coveredObjectives >= 3 && questions.every((item) => progress.audits[item.id]?.objectiveAligned && progress.audits[item.id]?.difficultySuitable), questions.length > 0 && coveredObjectives > 0), evidence: `覆盖 ${coveredObjectives} 个学习目标，题型与逐题难度${questions.every((item) => progress.audits[item.id]?.difficultySuitable) ? '已核对' : '待核对'}` },
    { id: 'evidence', label: '专业准确与证据', score: scored(evidenceComplete, questions.some((item) => item.materialEvidence.trim())), evidence: evidenceComplete ? '8 道题答案、解析、材料依据和综合题评分要点均经教师核验' : '答案、解析、材料依据或评分要点仍需核验' },
    { id: 'iteration', label: '人工核验与迭代', score: scored(revisions.valid && completeRevisions.length >= 2 && advancedRevision && peer.valid && currentConfirmed, completeRevisions.length > 0), evidence: `已完成 ${completeRevisions.length}/2 道实质修改，情境/综合题修改${advancedRevision ? '已覆盖' : '待覆盖'}，交叉互评${peer.valid ? '有效' : '待提交'}` },
    { id: 'safety', label: '隐私、版权、伦理与安全', score: safe ? 2 : containsM05UnsafeContent(questions.flatMap((item) => [item.stem, item.answer])) ? 0 : 1, evidence: safe ? '材料权属、去标识化、公平表述和安全操作均已确认' : '隐私、版权、公平或安全确认仍需补齐' },
  ]
  const coreRequirements: M05ScoreResult['coreRequirements'] = [
    { id: 'source-draft', label: '确认命题输入并生成规定结构的 8 道题（可选复用 M04）', passed: progress.input.sourceConfirmed && draft.valid, route: 'draft' },
    { id: 'question-audit', label: '逐题核验目标、答案解析、材料依据、干扰项与评分要点', passed: audits.valid && evidenceComplete, route: 'audit' },
    { id: 'two-revisions', label: '至少修改 2 题且含 1 道情境题或综合任务题', passed: revisions.valid && completeRevisions.length >= 2 && advancedRevision, route: 'revision' },
    { id: 'peer-confirmation', label: '交叉核验至少 1 题并形成当前教师确认题目包', passed: peer.valid && currentConfirmed, route: 'peer-review' },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createM05Assessment(progress: M05Progress, directory: ParticipantDirectory, _legacyUpstreamAvailable = true): M05AssessmentSnapshot {
  const result = calculateM05Score(progress, directory)
  return { assessmentId: `m05-assessment-${Date.now()}`, submittedAt: new Date().toISOString(), engine: '本地规则引擎（Demo）', fingerprint: m05CurrentFingerprint(progress, directory), modificationSummary: progress.assessmentModificationSummary.trim(), total: result.total, dimensionScores: Object.fromEntries(result.dimensions.map((item) => [item.id, item.score])) as M05AssessmentSnapshot['dimensionScores'], coreRequirementPasses: Object.fromEntries(result.coreRequirements.map((item) => [item.id, item.passed])), passed: result.passed }
}
