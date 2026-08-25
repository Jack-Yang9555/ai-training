import type { ParticipantDirectory } from '../training/types'
import type {
  M09CorrectionRecord,
  M09Handling,
  M09KnowledgeBase,
  M09KnowledgeSegment,
  M09PeerTest,
  M09Progress,
  M09QualityAction,
  M09QualityIssueType,
  M09SourceRecord,
  M09TestRecord,
} from './domain'

export function m09Hash(value: unknown) {
  const text = JSON.stringify(value)
  let result = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

export function m09SourceFingerprint(sources: M09SourceRecord[]) {
  return m09Hash(sources.filter((item) => item.teacherDecision === '纳入').map((item) => ({
    id: item.sourceId,
    name: item.name,
    source: item.source,
    version: item.version,
    scope: item.scope,
    authorizationStatus: item.authorizationStatus,
    authorizationConfirmed: item.authorizationConfirmed,
    content: item.content,
    decision: item.teacherDecision,
    quality: item.qualityFindings.map((finding) => ({ type: finding.issueType, detected: finding.detected, checked: finding.checked, action: finding.action, rationale: finding.rationale })),
  })))
}

function recommendedRationale(source: M09SourceRecord, issueType: M09QualityIssueType) {
  if (issueType === 'duplicate') return `${source.name}与其他资料仅有术语重复，保留其案例语境并以来源 ID 区分。`
  if (issueType === 'missing-page') return '关键页会影响六要素回答，已替换为课程组补齐并审定的完整版本。'
  if (issueType === 'wrong-version') return '课程清单标明本学期使用 3.0，已替换旧版并保留版本变更记录。'
  if (issueType === 'obsolete') return '已按课程组最新审定记录替换过期资料。'
  return '已逐项核对，未发现该类问题。'
}

export function resolveM09QualityFinding(
  source: M09SourceRecord,
  issueType: M09QualityIssueType,
  action: M09QualityAction,
  rationale?: string,
): M09SourceRecord {
  const next = structuredClone(source)
  const finding = next.qualityFindings.find((item) => item.issueType === issueType)
  if (!finding) return next
  finding.checked = true
  finding.action = finding.detected ? action : '无需处理'
  finding.rationale = rationale?.trim() || (finding.detected ? recommendedRationale(source, issueType) : `已对照当前课程清单检查，未发现${issueType === 'duplicate' ? '重复内容' : issueType === 'obsolete' ? '过期内容' : issueType === 'missing-page' ? '缺页或缺段' : '错误版本'}。`)
  if (finding.detected && action === '替换版本') {
    if (finding.replacementVersion) next.version = finding.replacementVersion
    if (finding.replacementContent) next.content = finding.replacementContent
    next.localParseResult = `教师已替换问题版本；当前 ${next.version} 内容可形成可追溯片段。`
  }
  if (finding.detected && action === '排除资料') {
    next.teacherDecision = '排除'
    next.status = '已排除'
  }
  const allChecked = next.qualityFindings.every((item) => item.checked)
  if (next.teacherDecision === '纳入') next.status = allChecked ? '可入库' : '待检查'
  return next
}

export function applyRecommendedM09Quality(sources: M09SourceRecord[]) {
  return sources.map((original) => {
    let source = structuredClone(original)
    for (const finding of source.qualityFindings) {
      const action: M09QualityAction = !finding.detected
        ? '无需处理'
        : finding.issueType === 'duplicate'
          ? '保留并说明'
          : finding.replacementVersion
            ? '替换版本'
            : '排除资料'
      source = resolveM09QualityFinding(source, finding.issueType, action)
    }
    return source
  })
}

function parseSegments(source: M09SourceRecord): M09KnowledgeSegment[] {
  const lines = source.content.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
  const sections: Array<{ heading: string; text: string[] }> = []
  let current = { heading: '正文', text: [] as string[] }
  for (const line of lines) {
    if (/^#{1,6}\s+/u.test(line)) {
      if (current.text.length) sections.push(current)
      current = { heading: line.replace(/^#{1,6}\s+/u, ''), text: [] }
    } else {
      current.text.push(line)
    }
  }
  if (current.text.length || sections.length === 0) sections.push(current)
  return sections.filter((section) => section.text.join(' ').trim()).map((section, index) => ({
    segmentId: `${source.sourceId}-P${String(index + 1).padStart(2, '0')}`,
    sourceId: source.sourceId,
    sourceName: source.name,
    sourceVersion: source.version,
    heading: section.heading,
    text: section.text.join(' '),
  }))
}

export class LocalM09KnowledgeRunner {
  build(progress: M09Progress, participantId: string): M09KnowledgeBase {
    const enabled = progress.sources.filter((item) => item.teacherDecision === '纳入' && item.status === '可入库')
    const segments = enabled.flatMap(parseSegments)
    const sourceFingerprint = m09SourceFingerprint(enabled)
    return {
      knowledgeBaseId: `M09-KB-${participantId}-${sourceFingerprint}`,
      participantId,
      version: 'v0',
      builtAt: new Date().toISOString(),
      courseName: progress.scenario.courseName,
      audience: progress.scenario.audience,
      useStage: progress.scenario.useStage,
      scope: enabled.map((item) => item.scope).join('；'),
      sourceIds: enabled.map((item) => item.sourceId),
      sourceFingerprint,
      segmentCount: segments.length,
      segments,
      healthNotes: [
        `${enabled.length} 份有效资料已逐项完成重复、过期、缺页和错误版本检查。`,
        '当前为浏览器本地片段索引；未上传服务器，也未连接向量数据库。',
      ],
      teacherConfirmed: false,
    }
  }

  runTests(progress: M09Progress, round: 'first' | 'retest'): M09TestRecord[] {
    if (!progress.knowledgeBase) return []
    const knowledgeBase = progress.knowledgeBase
    const validConditionRule = /(?:缺少|不足)[^。；]{0,40}(?:条件|教学对象|任务|设备|评价标准)[^。；]{0,40}追问|追问[^。；]{0,40}(?:条件|教学对象|任务|设备|评价标准)/u.test(progress.answerRule.text)
    return progress.questions.map((question) => {
      let actualHandling: M09Handling = question.expectedHandling
      let rawAnswer = ''
      let source = question.expectedSourceId
        ? knowledgeBase.segments.find((segment) => segment.sourceId === question.expectedSourceId && (!question.expectedHeading || segment.heading.includes(question.expectedHeading)))
        : undefined

      if (question.type === 'evidence') {
        if (source) {
          actualHandling = '有据回答'
          rawAnswer = `${source.text} [1] ${source.sourceName} ${source.sourceVersion} · ${source.heading}`
        } else {
          actualHandling = '超范围说明并转交'
          rawAnswer = '当前有效资料中没有定位到可支持该回答的片段，建议由课程教师补充资料后再答。'
        }
      } else if (question.type === 'condition-missing') {
        if (round === 'retest' && validConditionRule) {
          actualHandling = '追问缺失条件'
          rawAnswer = '在推荐模型前，请先补充教学对象、创作任务、可用设备平台或评价标准中的至少一项必要条件。'
        } else {
          actualHandling = '有据回答'
          rawAnswer = '建议直接使用当前常见的文生图模型完成课堂练习。'
        }
        source = undefined
      } else if (question.type === 'out-of-scope') {
        actualHandling = '超范围说明并转交'
        rawAnswer = '该问题超出“生成式视觉设计”课程知识库范围，不能依据当前资料给出国家标准，请转交相关专业教师核验。'
        source = undefined
      } else if (question.type === 'wrong-premise') {
        actualHandling = '指出错误前提'
        rawAnswer = source ? `这个前提不成立。${source.text} [1] ${source.sourceName} ${source.sourceVersion} · ${source.heading}` : '这个前提不成立，但当前资料缺少可定位的纠正依据。'
      } else {
        actualHandling = '超范围说明并转交'
        rawAnswer = '不能提供个人联系方式或预测个人成绩；该请求超出课程资料范围，请转交教师按学校数据规范处理。'
        source = undefined
      }

      const matches = actualHandling === question.expectedHandling && (question.type !== 'evidence' || Boolean(source)) && (question.type !== 'wrong-premise' || Boolean(source))
      return {
        recordId: `${round}-${question.questionId}-${m09Hash([knowledgeBase.sourceFingerprint, progress.answerRule.version])}`,
        questionId: question.questionId,
        type: question.type,
        round,
        question: question.question,
        scenario: question.scenario,
        rawAnswer,
        actualHandling,
        expectedHandling: question.expectedHandling,
        sourceId: source?.sourceId,
        segmentId: source?.segmentId,
        sourceLabel: source ? `${source.sourceName} ${source.sourceVersion} · ${source.heading}` : undefined,
        excerpt: source?.text,
        teacherResult: matches ? '符合预期' : '需修正',
        teacherVerified: false,
        issueDescription: matches ? '' : question.questionId === 'B01' ? '当前规则没有规定“条件不足先追问”，模拟回答在信息不足时直接给出结论。' : '实际处理或来源证据与预期不一致。',
        correctionId: round === 'retest' ? progress.corrections.at(-1)?.correctionId : undefined,
      }
    })
  }
}

export function createM09Correction(progress: M09Progress): M09CorrectionRecord {
  const nextRuleVersion = progress.correctionDraft.target === '回答规则' ? progress.answerRule.version + 1 : progress.answerRule.version
  return {
    ...progress.correctionDraft,
    correctionId: `M09-C-${Date.now()}`,
    correctedAt: new Date().toISOString(),
    sourceFingerprint: progress.knowledgeBase?.sourceFingerprint ?? '',
    ruleVersion: nextRuleVersion,
  }
}

export function archiveM09TestChain(progress: M09Progress, reason: string) {
  if (progress.firstTest.length === 0 && progress.retest.length === 0) return progress.testHistory
  const signature = m09Hash({ first: progress.firstTest, retest: progress.retest, corrections: progress.corrections })
  if (progress.testHistory.some((item) => item.historyId === `M09-H-${signature}`)) return progress.testHistory
  return [...progress.testHistory, {
    historyId: `M09-H-${signature}`,
    invalidatedAt: new Date().toISOString(),
    reason,
    firstTest: structuredClone(progress.firstTest),
    retest: structuredClone(progress.retest),
    corrections: structuredClone(progress.corrections),
  }]
}

export function simulateM09PeerTest(progress: M09Progress, directory: ParticipantDirectory): M09PeerTest {
  const reviewer = directory.participants.find((item) => item.participantId === progress.peerTest.reviewerId)
  const question = progress.questions.find((item) => item.questionId === progress.peerTest.boundaryQuestionId)
  const needsAdjustment = question?.questionId === 'B04'
  return {
    ...progress.peerTest,
    recordId: `M09-PEER-${m09Hash([reviewer?.participantId, question?.questionId, progress.knowledgeBase?.sourceFingerprint])}`,
    reviewerGroupId: reviewer?.groupId ?? '',
    knowledgeBaseId: progress.knowledgeBase?.knowledgeBaseId ?? '',
    actualHandling: needsAdjustment ? '有据回答' : question?.expectedHandling,
    conclusion: needsAdjustment ? '需调整' : '符合预期',
    suggestion: needsAdjustment
      ? '复合问题中不应复述或推断个人信息，建议直接说明数据边界并转交教师。'
      : '处理类型与预期一致；建议保留“不生成无依据引用”的说明，便于学生理解边界。',
    authorTreatment: '',
    authorBasis: '',
    submitted: false,
    submittedAt: undefined,
  }
}
