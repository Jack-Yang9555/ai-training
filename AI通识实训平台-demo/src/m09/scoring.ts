import type { ParticipantDirectory } from '../training/types'
import type { M09AssessmentRecord, M09Progress } from './domain'
import {
  confirmedM09KnowledgeBaseIsCurrent,
  m09ContentFingerprint,
  m09UnsafeFindings,
  validateM09Build,
  validateM09Confirmation,
  validateM09CorrectionRetest,
  validateM09FirstTest,
  validateM09PeerTest,
  validateM09Quality,
  validateM09Sources,
} from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateM09Score(progress: M09Progress, directory: ParticipantDirectory) {
  const sources = validateM09Sources(progress)
  const quality = validateM09Quality(progress)
  const build = validateM09Build(progress)
  const first = validateM09FirstTest(progress)
  const retest = validateM09CorrectionRetest(progress)
  const peer = validateM09PeerTest(progress, directory)
  const confirmation = validateM09Confirmation(progress, directory)
  const current = confirmedM09KnowledgeBaseIsCurrent(progress, directory)
  const evidenceRecords = progress.retest.filter((item) => item.type === 'evidence')
  const boundaryRecords = progress.retest.filter((item) => item.type !== 'evidence')
  const evidenceValid = retest.valid
    && evidenceRecords.length === 5
    && evidenceRecords.every((item) => item.teacherResult === '符合预期' && item.teacherVerified && item.sourceId && item.segmentId && item.excerpt)
    && boundaryRecords.length === 4
    && boundaryRecords.every((item) => item.teacherResult === '符合预期' && item.teacherVerified && (item.type === 'wrong-premise' ? Boolean(item.sourceId) : !item.sourceId))
  const iterationValid = first.valid && retest.valid && progress.corrections.some((item) => item.before.trim() !== item.after.trim() && item.basis.trim())
  const activeSources = progress.sources.filter((item) => item.teacherDecision === '纳入')
  const firstPassedCount = progress.firstTest.filter((item) => item.teacherResult === '符合预期').length
  const retestPassedCount = progress.retest.filter((item) => item.teacherResult === '符合预期').length
  const safe = sources.valid && activeSources.every((item) => item.authorizationStatus === '已授权' && item.authorizationConfirmed && m09UnsafeFindings(item).length === 0)
    && progress.teacherConfirmation.safetyConfirmed && progress.teacherConfirmation.maintenanceResponsibilityConfirmed
  const scenarioComplete = Boolean(progress.scenario.courseName.trim() && progress.scenario.audience.trim() && progress.scenario.teachingPurpose.trim() && progress.questions.every((item) => item.scenario.trim()))

  const dimensions = [
    { id: 'completion' as const, label: '操作完成与核心步骤', score: scored(quality.valid && build.valid && first.valid && retest.valid && peer.valid && current, progress.sources.length >= 2 && Boolean(progress.knowledgeBase)), evidence: `有效资料 ${activeSources.length} 份；v0 ${build.valid ? '有效' : '待建立'}；首测答对 ${firstPassedCount}/9${progress.firstTest.length === 9 ? `（暴露 ${9 - firstPassedCount} 项问题）` : ''}；复测答对 ${retestPassedCount}/9；v1.0 ${current ? '当前有效' : '待确认'}` },
    { id: 'adaptation' as const, label: '教学场景适配', score: scored(scenarioComplete && sources.valid, Boolean(progress.scenario.courseName.trim() || progress.scenario.audience.trim())), evidence: scenarioComplete ? `${progress.scenario.courseName} · ${progress.scenario.audience} · ${progress.scenario.useStage}，9 道题均保留场景` : '课程、对象、用途、资料范围或题目场景仍需补齐' },
    { id: 'evidence' as const, label: '专业准确与证据', score: scored(evidenceValid, progress.retest.some((item) => item.teacherResult === '符合预期')), evidence: evidenceValid ? '复测 5 道有据题均定位准确来源，4 道边界题处理正确且无虚假引用' : '复测证据来源或边界处理尚未全部通过人工核验' },
    { id: 'iteration' as const, label: '人工核验与迭代', score: scored(iterationValid, progress.corrections.length > 0 || progress.firstTest.some((item) => item.teacherVerified)), evidence: iterationValid ? `首测已冻结；${progress.corrections.length} 条实质修正关联问题；同一 9 题复测完成` : '须保留首测、实质修正前后及依据，并用同一 9 题复测' },
    { id: 'safety' as const, label: '隐私、版权、伦理与安全', score: safe ? 2 as const : activeSources.some((item) => m09UnsafeFindings(item).length > 0 || item.authorizationStatus === '未授权') ? 0 as const : 1 as const, evidence: safe ? '所有有效资料授权明确且未检出个人信息或密钥；教师确认安全与最终维护责任' : '授权、个人信息、密钥、安全或维护责任仍有缺项' },
  ]
  const coreRequirements = [
    { id: 'sources-build', label: '2—5 份资料逐项质检并形成当前 v0 来源索引', passed: quality.valid && build.valid, route: 'build' as const },
    { id: 'same-question-retest', label: '完成 5+4 首测、实质修正和同一组 9 题复测', passed: first.valid && retest.valid, route: 'correction-retest' as const },
    { id: 'peer-boundary', label: '当前同组其他成员完成至少 1 道边界测试', passed: peer.valid, route: 'peer-confirm' as const },
    { id: 'teacher-confirmation', label: '教师确认资料、来源、边界、安全和维护责任，形成 v1.0', passed: confirmation.valid && current, route: 'peer-confirm' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createM09Assessment(progress: M09Progress, directory: ParticipantDirectory): M09AssessmentRecord {
  const result = calculateM09Score(progress, directory)
  return {
    assessmentId: `M09-ASSESS-${Date.now()}`,
    assessedAt: new Date().toISOString(),
    attempt: progress.assessments.length === 0 ? 'initial' : 'retest',
    total: result.total,
    passed: result.passed,
    contentFingerprint: m09ContentFingerprint(progress, directory),
  }
}
