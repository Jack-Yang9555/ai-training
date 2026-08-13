import type { ParticipantDirectory } from '../training/types'
import type { M08AssessmentRecord, M08Progress } from './domain'
import { confirmedM08WebpageIsCurrent, containsM08UnsafeContent, m08ContentFingerprint, validateM08BrowserTest, validateM08Draft, validateM08Input, validateM08Iterations, validateM08PeerTest } from './validation'

function scored(valid: boolean, partial: boolean): 0 | 1 | 2 { return valid ? 2 : partial ? 1 : 0 }

export function calculateM08Score(progress: M08Progress, directory: ParticipantDirectory) {
  const input = validateM08Input(progress), draft = validateM08Draft(progress), iterations = validateM08Iterations(progress), browser = validateM08BrowserTest(progress), peer = validateM08PeerTest(progress, directory), current = confirmedM08WebpageIsCurrent(progress, directory)
  const version = progress.versions.at(-1)
  const evidenceValid = Boolean(version && version.questions.length === 5 && version.questions.every((item) => item.explanation.trim() && item.evidenceSource.trim()) && progress.teacherConfirmation.answersExplanationsConfirmed && progress.teacherConfirmation.materialAlignmentConfirmed)
  const safe = input.valid && progress.teacherConfirmation.offlineSafetyConfirmed && progress.teacherConfirmation.finalResponsibilityConfirmed && !containsM08UnsafeContent([progress.input.verifiedMaterial, progress.peerTest.correctionAfter])
  const dimensions = [
    { id: 'completion' as const, label: '操作完成与核心步骤', score: scored(draft.valid && browser.valid && peer.valid && current, Boolean(version)), evidence: `网页${version ? '已生成' : '待生成'}，浏览器测试${browser.valid ? '完成' : '待补'}，学生测试修正${peer.valid ? '完成' : '待补'}，最终确认${current ? '有效' : '待形成'}` },
    { id: 'adaptation' as const, label: '教学场景适配', score: scored(draft.valid && Boolean(version?.interactionLabel.trim()) && progress.teacherConfirmation.responsiveConfirmed, Boolean(progress.input.teachingUse.trim())), evidence: draft.valid ? `${progress.input.pageType}用途、学习路径和响应式页面已形成` : '教学用途、知识卡、测验或互动仍需补齐' },
    { id: 'evidence' as const, label: '专业准确与证据', score: scored(evidenceValid, Boolean(version)), evidence: evidenceValid ? '5 道题的答案、解析和内容依据已由教师核验' : '答案解析、材料一致性或内容依据仍需教师确认' },
    { id: 'iteration' as const, label: '人工核验与迭代', score: scored(iterations.valid && peer.valid && current, progress.iterationRecords.length > 0), evidence: `自然语言迭代 ${progress.iterationRecords.length}/2 轮，同组学生测试与问题修正${peer.valid ? '有效' : '待完成'}` },
    { id: 'safety' as const, label: '隐私、版权、伦理与安全', score: safe ? 2 as const : containsM08UnsafeContent([progress.input.verifiedMaterial, progress.peerTest.correctionAfter]) ? 0 as const : 1 as const, evidence: safe ? '单文件离线运行，不含密钥、真实个人数据和外部资源，教师承担最终责任' : '版权、隐私、离线资源、密钥或最终责任确认仍需补齐' },
  ]
  const coreRequirements = [
    { id: 'web-draft', label: '生成标题、目标、3—5 张知识卡、5 道即时反馈题和至少 1 个互动', passed: draft.valid, route: 'draft' as const },
    { id: 'offline-test', label: '下载单文件 HTML，完成桌面、手机和离线浏览器测试', passed: browser.valid, route: 'browser-test' as const },
    { id: 'peer-correction', label: '当前同组其他成员以学生身份测试，并据此修正至少 1 处', passed: peer.valid, route: 'peer-confirm' as const },
    { id: 'teacher-confirmation', label: '教师确认答案、材料、响应式和安全边界，形成当前最终网页', passed: current, route: 'peer-confirm' as const },
  ]
  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const hardGatesPassed = dimensions.filter((item) => ['evidence', 'iteration', 'safety'].includes(item.id)).every((item) => item.score === 2)
  return { dimensions, total, coreRequirements, hardGatesPassed, passed: total >= 8 && hardGatesPassed && coreRequirements.every((item) => item.passed) }
}

export function createM08Assessment(progress: M08Progress, directory: ParticipantDirectory): M08AssessmentRecord {
  const result = calculateM08Score(progress, directory)
  return { assessmentId: `m08-assessment-${Date.now()}`, assessedAt: new Date().toISOString(), attempt: progress.assessments.length === 0 ? 'initial' : 'retest', total: result.total, passed: result.passed, contentFingerprint: m08ContentFingerprint(progress, directory) }
}
