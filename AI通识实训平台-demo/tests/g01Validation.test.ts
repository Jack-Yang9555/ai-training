import { describe, expect, it } from 'vitest'
import { createG01Assessment } from '../src/g01/assessment'
import { buildG01GroupContext } from '../src/g01/data'
import { G01_STORAGE_KEY, LEGACY_G01_STORAGE_KEY, clearAllG01Progress, clearGroupG01Progress, createEmptyG01Store, createInitialG01Progress, g01ProgressForGroup, invalidateAllG01Progress, loadG01Store, updateGroupG01Progress } from '../src/g01/storage'
import type { G01CurrentMemberEvidence, G01Progress } from '../src/g01/types'
import { g01ChecklistComplete, g01CrossChecksComplete, g01ErrorsComplete, g01IsCurrentlyPassed, g01PrerequisitesComplete, progressForG01, validateG01Assessment } from '../src/g01/validation'
import { createParticipantDirectory } from '../src/training/participants'
import type { ParticipantDirectory, TrainingParticipant } from '../src/training/types'

const members: TrainingParticipant[] = [
  { participantId: 'P01', name: '甲老师', organization: '', department: '', specialty: '', contact: '', groupId: 'group-a', groupName: 'A 组' },
  { participantId: 'P02', name: '乙老师', organization: '', department: '', specialty: '', contact: '', groupId: 'group-a', groupName: 'A 组' },
  { participantId: 'P03', name: '丙老师', organization: '', department: '', specialty: '', contact: '', groupId: 'group-b', groupName: 'B 组' },
  { participantId: 'P04', name: '丁老师', organization: '', department: '', specialty: '', contact: '', groupId: 'group-b', groupName: 'B 组' },
]

function directory(currentParticipantId = 'P01', source = members): ParticipantDirectory {
  const value = createParticipantDirectory(source, 'test.csv'); value.currentParticipantId = currentParticipantId; return value
}

function allPrerequisitesCompleteFixture(participantId = 'P01'): G01CurrentMemberEvidence {
  return {
    participantId,
    prerequisites: {
      M01: { complete: true, artifactIds: [`${participantId}:M01`] },
      M02: { complete: true, artifactIds: [`${participantId}:M02`] },
      M03: { complete: true, artifactIds: [`${participantId}:M03:v1`, `${participantId}:M03:v2`] },
      M04: { complete: true, artifactIds: [`${participantId}:M04`] },
      M05: { complete: true, artifactIds: [`${participantId}:M05`] },
    },
    errorCorrection: { sourceTaskId: 'M01', sourceArtifactId: `${participantId}:error`, aiError: '错误内容', teacherCorrection: '教师修正', correctionBasis: '课程材料' },
    crossCheck: { targetParticipantId: participantId === 'P01' ? 'P02' : 'P01', targetParticipantName: participantId === 'P01' ? '乙老师' : '甲老师', artifactType: '题目包', targetArtifactId: 'peer:M05', finding: '已核对答案与依据', conclusion: '通过' },
    contribution: { role: '核验员', contribution: '核对事实、答案和材料依据并汇总清单。' },
  }
}

function completeProgress(): G01Progress {
  const context = buildG01GroupContext(directory(), allPrerequisitesCompleteFixture())
  return createInitialG01Progress(context)
}

describe('G01 阶段验收规则', () => {
  it('任一成员五类验收材料不齐、缺错误修正或缺交叉检查均不能通过', () => {
    const progress = completeProgress()
    progress.memberPrerequisites[1].evidence.find((item) => item.taskId === 'M02')!.complete = false
    expect(g01PrerequisitesComplete(progress)).toBe(false)
    progress.memberPrerequisites[1].evidence.find((item) => item.taskId === 'M02')!.complete = true
    progress.errorCorrections = progress.errorCorrections.filter((item) => item.participantId !== 'P02')
    expect(g01ErrorsComplete(progress)).toBe(false)
    progress.errorCorrections = completeProgress().errorCorrections
    progress.crossChecks = progress.crossChecks.filter((item) => item.reviewerParticipantId !== 'P02')
    expect(g01CrossChecksComplete(progress)).toBe(false)
    expect(validateG01Assessment(progress).some((item) => !item.passed)).toBe(true)
  })

  it('清单少于 8 项或缺少事实、引用、安全、目标、答案任一类别都不能通过', () => {
    const progress = completeProgress()
    progress.checklist = progress.checklist.slice(0, 7)
    expect(g01ChecklistComplete(progress)).toBe(false)
    progress.checklist = completeProgress().checklist.map((item) => ({ ...item, category: item.category === '答案' ? '事实' : item.category }))
    expect(progress.checklist).toHaveLength(8)
    expect(g01ChecklistComplete(progress)).toBe(false)
  })

  it('完整初验通过后恰好形成三项固定成果且不含数值评分', () => {
    const assessed = createG01Assessment(completeProgress(), '测试验收人', '2026-08-12T12:00:00.000Z')
    expect(g01IsCurrentlyPassed(assessed)).toBe(true)
    expect(assessed.artifacts.map((item) => item.name)).toEqual(['教学设计与命题成果目录', 'AI 教学内容核验清单', '个人贡献记录'])
    expect(new Set(assessed.artifacts.map((item) => item.name)).size).toBe(3)
    expect(assessed.assessments[0]).not.toHaveProperty('score')
    expect(assessed.assessments[0]).not.toHaveProperty('total')
  })

  it('初验失败与补验历史追加保存，修改后旧记录不被覆盖', () => {
    const initial = completeProgress(); initial.checklist = initial.checklist.slice(0, 7)
    const failed = createG01Assessment(initial, '测试验收人', '2026-08-12T12:00:00.000Z')
    expect(failed.currentStatus).toBe('未通过')
    expect(failed.artifacts).toEqual([])
    expect(failed.assessments[0].artifacts).toEqual([])
    expect(failed.assessments[0].failedConditionIds).toContain('checklist-coverage')
    const repaired = { ...failed, checklist: completeProgress().checklist, assessmentModificationSummary: '补齐第 8 项并恢复答案类别。' }
    expect({ ...repaired, currentStatus: '需补验' }.assessments).toHaveLength(1)
    const rechecked = createG01Assessment({ ...repaired, currentStatus: '需补验' }, '测试验收人', '2026-08-12T12:30:00.000Z')
    expect(rechecked.assessments).toHaveLength(2)
    expect(rechecked.assessments.map((item) => item.phase)).toEqual(['初验', '补验'])
    expect(rechecked.assessments[0].outcome).toBe('未通过')
    expect(rechecked.assessments[1].outcome).toBe('已通过')
    expect(rechecked.assessments[1].modificationSummary).toBe('补齐第 8 项并恢复答案类别。')
  })
})

describe('G01 小组隔离、人员失效与重置边界', () => {
  it('不同小组按 groupId 隔离，任务内重置只清当前组，全局失效保留历史', () => {
    const contextA = buildG01GroupContext(directory('P01'), allPrerequisitesCompleteFixture('P01'))
    const contextB = buildG01GroupContext(directory('P03'), allPrerequisitesCompleteFixture('P03'))
    let store = createEmptyG01Store()
    store = updateGroupG01Progress(store, contextA, (progress) => createG01Assessment(progress, 'A 组'))
    store = updateGroupG01Progress(store, contextB, (progress) => ({ ...progress, route: 'directory' }))
    expect(Object.keys(store.groups).sort()).toEqual(['group-a', 'group-b'])
    expect(store.groups['group-a'].assessments).toHaveLength(1)
    expect(store.groups['group-b'].assessments).toHaveLength(0)
    store = clearGroupG01Progress(store, 'group-a')
    expect(store.groups['group-a']).toBeUndefined()
    expect(store.groups['group-b']).toBeDefined()
    const invalidated = invalidateAllG01Progress(updateGroupG01Progress(store, contextA, (progress) => createG01Assessment(progress, 'A 组')))
    expect(invalidated.groups['group-a'].assessments).toHaveLength(1)
    expect(invalidated.groups['group-a'].currentStatus).toBe('需补验')
    expect(invalidated.groups['group-a'].memberPrerequisites).toEqual([])
    window.localStorage.setItem(G01_STORAGE_KEY, JSON.stringify(invalidated))
    window.localStorage.setItem(LEGACY_G01_STORAGE_KEY, JSON.stringify({ version: 1, groups: {} }))
    expect(clearAllG01Progress().groups).toEqual({})
    expect(window.localStorage.getItem(G01_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(LEGACY_G01_STORAGE_KEY)).toBeNull()
  })

  it('同一 groupId 人员名单变化后旧成员引用、交叉检查、贡献和当前通过自动失效，历史保留', () => {
    const baseDirectory = directory('P01', members.slice(0, 2))
    const context = buildG01GroupContext(baseDirectory, allPrerequisitesCompleteFixture())
    const passed = createG01Assessment(createInitialG01Progress(context), 'A 组')
    const changedMembers = [...members.slice(0, 2), { ...members[2], groupId: 'group-a', groupName: 'A 组' }]
    const changedContext = buildG01GroupContext(directory('P01', changedMembers), allPrerequisitesCompleteFixture())
    const synchronized = g01ProgressForGroup({ version: 2, groups: { 'group-a': passed } }, changedContext)
    expect(synchronized.currentStatus).toBe('需补验')
    expect(synchronized.assessments).toHaveLength(1)
    expect(synchronized.memberPrerequisites.map((item) => item.participantId)).toContain('P03')
    expect(synchronized.errorCorrections).toHaveLength(3)
    expect(synchronized.crossChecks).toHaveLength(3)
    expect(synchronized.contributions).toHaveLength(3)
  })

  it('当前教师缺少真实交叉检查时使用任务内记录，后续真实记录自动替换', () => {
    const missing = allPrerequisitesCompleteFixture(); delete missing.crossCheck
    const contextBefore = buildG01GroupContext(directory(), missing)
    const initial = createInitialG01Progress(contextBefore)
    const current = initial.memberPrerequisites.find((item) => item.participantId === 'P01')!
    expect(current.source).toBe('真实本地成果')
    expect(initial.crossChecks.find((item) => item.reviewerParticipantId === 'P01')).toEqual(expect.objectContaining({ source: '任务内演示成果', targetArtifactId: 'P02:sim:M05', conclusion: '通过' }))
    expect(g01CrossChecksComplete(initial)).toBe(true)
    const contextAfter = buildG01GroupContext(directory(), allPrerequisitesCompleteFixture())
    const synchronized = g01ProgressForGroup({ version: 2, groups: { 'group-a': initial } }, contextAfter)
    expect(synchronized.crossChecks.find((item) => item.reviewerParticipantId === 'P01')).toEqual(expect.objectContaining({ targetArtifactId: 'peer:M05', finding: '已核对答案与依据', conclusion: '通过' }))
  })
})

describe('G01 旧版成果迁移', () => {
  it('保留历史验收但强制补验，不沿用 M05 时代的当前通过', () => {
    const passed = createG01Assessment(completeProgress(), 'A 组')
    const values = new Map([[LEGACY_G01_STORAGE_KEY, JSON.stringify({ version: 1, groups: { 'group-a': { ...passed, version: 1 } } })]])
    const migrated = loadG01Store({ getItem: (key) => values.get(key) ?? null })

    expect(G01_STORAGE_KEY).toContain(':v2')
    expect(migrated.version).toBe(2)
    expect(migrated.groups['group-a'].currentStatus).toBe('需补验')
    expect(migrated.groups['group-a'].assessments).toHaveLength(1)
    expect(migrated.groups['group-a'].memberPrerequisites).toEqual([])
    expect(migrated.groups['group-a'].artifacts).toEqual([])
  })
})

