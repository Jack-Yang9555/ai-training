import { beforeEach, describe, expect, it } from 'vitest'
import { m03DefaultSnapshot } from '../src/m03/data'
import { m03PromptMessageToSnapshot, recognizedM03MessageTopics } from '../src/m03/promptMessage'
import { buildM03PeerArtifacts } from '../src/m03/peerArtifacts'
import { calculateM03Score, createM03Assessment } from '../src/m03/scoring'
import { createInitialM03Progress, LEGACY_M03_STORAGE_KEY, loadM03Store, M03_STORAGE_KEY, m03ProgressForParticipant, saveM03Store, updateParticipantM03Progress } from '../src/m03/storage'
import type { M03IterationVariable, M03Progress, M03PromptSnapshot } from '../src/m03/types'
import { changedM03Fields, containsM03SensitiveInformation, latestM03AssessmentIsCurrent, validateM03Design, validateM03Iteration, validateM03PeerReview } from '../src/m03/validation'
import { localM03PromptRunner } from '../src/services/m03PromptRunner'
import { createInitialPortalProgress } from '../src/training/storage'

async function completeProgress(): Promise<{ progress: M03Progress; directory: ReturnType<typeof createInitialPortalProgress>['participantDirectory'] }> {
  const progress = createInitialM03Progress()
  const directory = createInitialPortalProgress().participantDirectory
  progress.design.rightsConfirmed = true
  progress.design.privacyConfirmed = true
  progress.v1 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v1', snapshot: progress.design })
  progress.iterationVariable = 'questionCount'
  progress.iterationDraft = { ...progress.v1.snapshot, questionCount: 4 }
  progress.v2 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v2', snapshot: progress.iterationDraft })
  progress.comparison = { changeExplanation: '题量从三道增加到四道，结果新增一道练习与答案解析。', suitabilityConclusion: 'V1 适合紧凑课堂，V2 适合有更多练习时间的课堂。' }
  progress.verification.v1 = { paragraphId: 'v1-q1', materialEvidence: '讲义明确包含主体、风格、细节三要素。', materialScope: '一致', objectiveAlignment: '一致', conclusion: '题目与材料范围和识别三要素目标一致。' }
  progress.verification.v2 = { paragraphId: 'v2-q4', materialEvidence: '讲义三要素可用于新增的第四道迁移练习。', materialScope: '一致', objectiveAlignment: '一致', conclusion: '新增题仍在材料范围内并服务于独立编写目标。' }
  const peer = buildM03PeerArtifacts(directory)[0]
  progress.peerReview = { reviewerRole: '核验员', targetParticipantId: peer.participantId, targetArtifactId: peer.artifactId, inputScopeClear: '明确', outputFormatClear: '明确', qualityStandardClear: '部分明确', suggestion: '建议在质量标准中补充每道题与课程目标的对应关系。', submitted: true }
  return { progress, directory }
}

describe('M03 校验、评分与存储', () => {
  it('只识别由教师输入且带有内容的固定六项名称', () => {
    const incomplete = '01 角色 / 任务\n请作为课程助教生成练习。\n02 背景\n人工智能基础课。\n03 输入\n'
    expect(recognizedM03MessageTopics(incomplete)).toEqual({
      'role-task': true, background: true, input: false, constraints: false, format: false, quality: false,
    })
    const complete = '01 角色 / 任务\n角色：课程助教；任务：生成练习。\n02 背景\n课程：人工智能基础。\n03 输入\n材料名称：讲义；材料正文：基础概念。\n04 约束\n30 分钟，4 道题，进阶。\n05 输出格式\nMarkdown 表格；必须包含：练习和答案。\n06 质量标准\n内容准确。'
    const snapshot = m03PromptMessageToSnapshot(complete, { rightsConfirmed: true, privacyConfirmed: true })
    expect(snapshot).toMatchObject({ role: '课程助教', courseName: '人工智能基础。', materialName: '讲义', duration: 30, questionCount: 4, difficulty: '进阶', outputFormat: 'Markdown 表格', qualityStandards: '内容准确。' })
    expect(Object.values(recognizedM03MessageTopics(complete)).every(Boolean)).toBe(true)
  })

  it.each([
    '06 质量标准：内容准确，答案与题目匹配。',
    '6、质量标准\n内容准确，答案与题目匹配。',
    '【06 质量标准】\n内容准确，答案与题目匹配。',
    '- 6. **质量标准**：内容准确，答案与题目匹配。',
    '### 质量标准\n- 内容准确，答案与题目匹配。',
    '０６、质量标准：内容准确，答案与题目匹配。',
  ])('接受教师常用的质量标准标题格式：%s', (qualitySection) => {
    expect(recognizedM03MessageTopics(qualitySection).quality).toBe(true)
  })

  it('接受编号、标题、重复字段名分三行输入的质量标准', () => {
    const teacherMessage = [
      '01', '角色 / 任务', '角色：课程助教；任务：生成课堂练习。',
      '02', '背景', '课程：人工智能基础。',
      '03', '输入', '材料名称：讲义；材料正文：基础概念。',
      '04', '约束', '课堂时长：45 分钟；题量：3 道；难度：入门。',
      '05', '输出格式', '呈现格式：分节文本；必须包含：练习题、答案解析。',
      '06', '质量标准', '质量标准：专业内容只能依据输入材料；题目与答案逐一匹配；不得编造材料外知识。',
    ].join('\n')
    expect(recognizedM03MessageTopics(teacherMessage)).toEqual({
      'role-task': true, background: true, input: true, constraints: true, format: true, quality: true,
    })
  })

  it.each([
    '06 质量标准',
    '【06 质量标准】：',
    '- 6. **质量标准**',
  ])('质量标准只有标题、没有内容时仍不通过：%s', (qualitySection) => {
    expect(recognizedM03MessageTopics(qualitySection).quality).toBe(false)
  })

  beforeEach(() => {
    window.localStorage.removeItem(M03_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_M03_STORAGE_KEY)
  })

  it('六格仅要求必填非空，并执行权属、隐私与敏感信息检查', () => {
    const snapshot = { ...m03DefaultSnapshot, rightsConfirmed: true, privacyConfirmed: true, lessonName: '课' }
    expect(validateM03Design(snapshot).valid).toBe(true)
    expect(containsM03SensitiveInformation(['学生手机号：13800138000'])).toBe(true)
    expect(validateM03Design({ ...snapshot, materialContent: '联系邮箱 teacher@example.com' }).valid).toBe(false)
  })

  it.each<[M03IterationVariable, Partial<M03PromptSnapshot>]>([
    ['studentFoundation', { studentFoundation: '已掌握三要素并完成过一次练习' }],
    ['questionCount', { questionCount: 4 }],
    ['difficulty', { difficulty: '进阶' }],
    ['duration', { duration: 60 }],
    ['outputFormat', { outputFormat: 'Markdown 表格' }],
  ])('允许只修改 %s', async (variable, patch) => {
    const progress = createInitialM03Progress()
    progress.design.rightsConfirmed = true
    progress.design.privacyConfirmed = true
    progress.v1 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v1', snapshot: progress.design })
    progress.iterationVariable = variable
    progress.iterationDraft = { ...progress.v1.snapshot, ...patch }
    expect(validateM03Iteration(progress)).toEqual({ valid: true, messages: [] })
    expect(changedM03Fields(progress.v1.snapshot, progress.iterationDraft)).toEqual([variable])
  })

  it('未改变或改变多个字段均禁止生成 V2', async () => {
    const progress = createInitialM03Progress()
    progress.design.rightsConfirmed = true
    progress.design.privacyConfirmed = true
    progress.v1 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v1', snapshot: progress.design })
    progress.iterationVariable = 'questionCount'
    progress.iterationDraft = { ...progress.v1.snapshot }
    expect(validateM03Iteration(progress).valid).toBe(false)
    progress.iterationDraft = { ...progress.v1.snapshot, questionCount: 4, duration: 60 }
    expect(validateM03Iteration(progress).messages).toContain('检测到 2 项变化，只允许调整一个变量')
  })

  it('五类变量会形成可观察的确定性结果差异', async () => {
    const base = { ...m03DefaultSnapshot, rightsConfirmed: true, privacyConfirmed: true }
    const v1 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v1', snapshot: base })
    const variants: M03PromptSnapshot[] = [
      { ...base, studentFoundation: '已掌握三要素' }, { ...base, questionCount: 4 }, { ...base, difficulty: '进阶' }, { ...base, duration: 60 }, { ...base, outputFormat: 'JSON 结构' },
    ]
    for (const snapshot of variants) {
      const v2 = await localM03PromptRunner.run({ participantId: 'T001', version: 'v2', snapshot })
      expect(v2.paragraphs.map((item) => item.content).join('\n')).not.toBe(v1.paragraphs.map((item) => item.content).join('\n'))
    }
  })

  it('完整证据、单变量迭代和安全互评得 10 分，提交后成为当前通过快照', async () => {
    const { progress, directory } = await completeProgress()
    const score = calculateM03Score(progress, directory)
    expect(score.total).toBe(10)
    expect(score.hardGatesPassed).toBe(true)
    expect(score.passed).toBe(true)
    progress.assessments.push(createM03Assessment(progress, directory))
    expect(latestM03AssessmentIsCurrent(progress, directory)).toBe(true)
    progress.comparison.changeExplanation = '修改后的变化说明'
    expect(latestM03AssessmentIsCurrent(progress, directory)).toBe(false)
  })

  it('专业核验为需调整时硬门槛失败', async () => {
    const { progress, directory } = await completeProgress()
    progress.verification.v2.materialScope = '需调整'
    const score = calculateM03Score(progress, directory)
    expect(score.dimensions.find((item) => item.id === 'evidence')?.score).not.toBe(2)
    expect(score.passed).toBe(false)
  })

  it('互评允许不明确评价，但分组变化后旧对象失效', async () => {
    const { progress, directory } = await completeProgress()
    progress.peerReview.inputScopeClear = '不明确'
    expect(validateM03PeerReview(progress, directory).valid).toBe(true)
    const changed = { ...directory, participants: directory.participants.map((item) => item.participantId === progress.peerReview.targetParticipantId ? { ...item, groupId: 'other', groupName: '其他组' } : item) }
    expect(validateM03PeerReview(progress, changed).valid).toBe(false)
  })

  it('按 participantId 隔离保存进度', () => {
    let store = loadM03Store()
    store = updateParticipantM03Progress(store, 'T001', (current) => ({ ...current, route: 'iteration' }))
    saveM03Store(store)
    const loaded = loadM03Store()
    expect(m03ProgressForParticipant(loaded, 'T001').route).toBe('iteration')
    expect(m03ProgressForParticipant(loaded, 'T002').route).toBe('overview')
  })

  it('旧六格记录迁移时保留验收历史，但使旧版本成果失效', async () => {
    const { progress, directory } = await completeProgress()
    progress.assessments.push(createM03Assessment(progress, directory))
    window.localStorage.setItem(LEGACY_M03_STORAGE_KEY, JSON.stringify({ version: 1, participants: { T001: { ...progress, version: 1 } } }))
    const migrated = m03ProgressForParticipant(loadM03Store(), 'T001')
    expect(migrated.version).toBe(2)
    expect(migrated.design.role).toBe(m03DefaultSnapshot.role)
    expect(migrated.v1).toBeUndefined()
    expect(migrated.v2).toBeUndefined()
    expect(migrated.assessments).toHaveLength(1)
  })
})
