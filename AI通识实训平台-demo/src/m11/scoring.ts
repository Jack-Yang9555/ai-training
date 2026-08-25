import type { ParticipantDirectory } from '../training/types'
import type { M11AssessmentRecord, M11M10Evidence, M11Progress, M11ScoreDimensionId } from './domain'
import { m11Hash } from './runner'
import {
  confirmedM11PackageIsCurrent,
  detectM11TestDefects,
  m11ContentFingerprint,
  m11RecordMatchesExpected,
  m11UnsafeFindings,
  validateM11Audit,
  validateM11Pairing,
  validateM11Retest,
  validateM11Revisions,
} from './validation'

const dimensionScore = (complete: boolean, partial: boolean): 0 | 1 | 2 => complete ? 2 : partial ? 1 : 0

export function calculateM11Score(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence) {
  const pairing = validateM11Pairing(progress, directory, evidence)
  const audit = validateM11Audit(progress, directory, evidence)
  const revisions = validateM11Revisions(progress, directory, evidence)
  const retest = validateM11Retest(progress, directory, evidence)
  const pkg = confirmedM11PackageIsCurrent(progress, directory, evidence)
  const retestMap = new Map(progress.retest.map((item) => [item.questionId, item]))
  const adapted = ['Q01', 'Q02', 'Q04'].every((id) => {
    const record = retestMap.get(id as 'Q01' | 'Q02' | 'Q04')
    return record ? m11RecordMatchesExpected(record) : false
  })
  const professionalEvidence = ['Q01', 'Q03', 'Q05'].every((id) => {
    const record = retestMap.get(id as 'Q01' | 'Q03' | 'Q05')
    return record ? m11RecordMatchesExpected(record) : false
  })
  const iteration = revisions.valid && retest.valid && progress.revisions.length >= 1 && detectM11TestDefects(progress.firstTest).length >= 1
  const safe = m11UnsafeFindings(progress).length === 0
    && ['Q03', 'Q04', 'Q05'].every((id) => {
      const record = retestMap.get(id as 'Q03' | 'Q04' | 'Q05')
      return record ? m11RecordMatchesExpected(record) : false
    })
    && progress.teacherConfirmation.safetyAndPrivacyConfirmed
    && progress.teacherConfirmation.teacherHandoffResponsibilityConfirmed

  const dimensions: Array<{ id: M11ScoreDimensionId; label: string; score: 0 | 1 | 2; evidence: string }> = [
    {
      id: 'completion',
      label: '操作完成与核心步骤',
      score: dimensionScore(retest.valid && pkg, Boolean(progress.pairing || progress.firstTest.length)),
      evidence: `双向配对 ${pairing.valid ? '1/1' : '0/1'}；首测 ${progress.firstTest.length}/5；复测 ${progress.retest.filter(m11RecordMatchesExpected).length}/5；任务成果 ${progress.confirmedPackage?.artifacts.length ?? 0}/2`,
    },
    {
      id: 'adaptation',
      label: '教学场景适配',
      score: dimensionScore(adapted && retest.valid, progress.firstTest.length === 5),
      evidence: adapted ? '正常问题有据解释，含糊问题先追问，代做问题改为学习引导' : '正常、含糊或代做场景尚未全部达到预期',
    },
    {
      id: 'evidence',
      label: '专业准确与证据',
      score: dimensionScore(professionalEvidence && retest.valid, audit.valid),
      evidence: professionalEvidence ? '正常题引用当前资料，越界题不猜测，安全与评价题不越权' : '来源引用、越界说明或教师职责仍有缺项',
    },
    {
      id: 'iteration',
      label: '人工核验与迭代',
      score: dimensionScore(iteration, audit.valid || progress.revisions.length > 0),
      evidence: iteration ? `首测稳定暴露 ${detectM11TestDefects(progress.firstTest).length} 项问题，保留 ${progress.revisions.length} 条实质修改并完成同题 5/5 复测` : '须保留首测问题、关联修改和同题复测对照',
    },
    {
      id: 'safety',
      label: '隐私、版权、伦理与安全',
      score: safe ? 2 : m11UnsafeFindings(progress).length ? 0 : 1,
      evidence: safe ? '只用虚构身份与获准课程材料；代做、安全、最终评价和敏感信息均拒绝或转交教师' : '安全与隐私检查或教师接管责任尚未完整',
    },
  ]
  const coreRequirements = [
    { id: 'm10-pairing', label: '当前教师 M10 有效，环形双向配对完整且已披露模拟边界', passed: pairing.valid, route: 'pairing' as const },
    { id: 'first-audit', label: '五类问题完成同版首测并逐题标注', passed: audit.valid, route: 'audit' as const },
    { id: 'revision-retest', label: '至少一条修改关联首测，同题复测达到 5/5', passed: iteration, route: 'retest' as const },
    { id: 'teacher-package', label: '教师确认接管责任，恰好两项任务成果合并为一个个人槽位', passed: pkg, route: 'confirmation' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  const coreRequirementsPassed = coreRequirements.every((item) => item.passed)
  return { dimensions, coreRequirements, total, hardGatesPassed, coreRequirementsPassed, passed: total >= 8 && hardGatesPassed && coreRequirementsPassed }
}

export function createM11Assessment(progress: M11Progress, directory: ParticipantDirectory, evidence: M11M10Evidence, modificationSummary = ''): M11AssessmentRecord {
  const result = calculateM11Score(progress, directory, evidence)
  const assessedAt = new Date().toISOString()
  return {
    assessmentId: `M11-ASSESS-${m11Hash([directory.currentParticipantId, assessedAt, progress.assessments.length])}`,
    assessedAt,
    attempt: progress.assessments.length ? 'retest' : 'initial',
    total: result.total,
    passed: result.passed,
    hardGatesPassed: result.hardGatesPassed,
    coreRequirementsPassed: result.coreRequirementsPassed,
    contentFingerprint: m11ContentFingerprint(progress, directory, evidence),
    modificationSummary: modificationSummary || progress.revisions.map((item) => `${item.relatedQuestionIds.join('/')} ${item.type}：${item.beforeValue}→${item.afterValue}`).join('；'),
  }
}
