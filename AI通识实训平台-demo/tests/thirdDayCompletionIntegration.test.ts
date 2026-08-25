import { describe, expect, it } from 'vitest'
import { g03OutputNames } from '../src/g03/data'
import { createG03Assessment, g03Conditions } from '../src/g03/validation'
import { createInitialM11Progress, createM11QuestionSet } from '../src/m11/data'
import type { M11M10Evidence } from '../src/m11/domain'
import {
  createM11ReferenceRevisions,
  createM11RingPairing,
  LocalM11QaRunner,
  markM11ExpectedAudits,
  markM11RetestVerified,
} from '../src/m11/runner'
import { createConfirmedM11Package } from '../src/m11/storage'
import { validateM11Confirmation } from '../src/m11/validation'
import { portfolioDefinitions, trainingTasks } from '../src/training/catalog'
import { createInitialPortalProgress } from '../src/training/storage'
import { taskWorkspaceRegistry } from '../src/training/workspaces'
import { completeG03Fixture } from './g03Fixtures'
import { buildPassedM10 } from './m10Fixtures'

const expectedCatalog = {
  M10: {
    kind: 'mandatory',
    duration: 75,
    steps: ['overview', 'source', 'configuration', 'flow', 'boundaries', 'preview', 'review-confirm', 'result'],
    outputs: ['课程 AI 助教 v1.0', '六要素配置表、边界规则清单和配置修改记录'],
  },
  M11: {
    kind: 'mandatory',
    duration: 60,
    steps: ['overview', 'pairing', 'first-test', 'audit', 'revision', 'retest', 'confirmation', 'result'],
    outputs: ['5 类问题的首轮答疑测试、规则修改说明与复测记录', '课程助教修改说明'],
  },
  G03: {
    kind: 'milestone',
    duration: 30,
    steps: ['overview', 'matrix', 'issues', 'scenarios', 'showcase', 'contributions', 'assessment'],
    outputs: ['课程知识库与 AI 助教综合测试报告', '3 分钟核心演示和 2 分钟在线答问记录', '成员角色与贡献清单'],
  },
} as const

function completeM11FromCurrentM10() {
  const directory = createInitialPortalProgress().participantDirectory
  const m10 = buildPassedM10(directory)
  const assistant = m10.confirmedAssistant
  const assessment = m10.assessments.at(-1)
  if (!assistant || !assessment?.passed) throw new Error('第三天完成性测试需要当前 M10 通过证据')
  const evidence: M11M10Evidence = {
    current: true,
    participantId: directory.currentParticipantId,
    assistantId: assistant.assistantId,
    version: assistant.version,
    assessmentId: assessment.assessmentId,
    contentFingerprint: assessment.contentFingerprint,
    courseName: assistant.source.courseName,
    knowledgeBaseVersion: assistant.source.version,
    confirmedAt: assistant.confirmedAt,
  }
  const progress = createInitialM11Progress()
  progress.questions = createM11QuestionSet(evidence.courseName)
  progress.pairing = createM11RingPairing(directory, evidence)
  if (!progress.pairing) throw new Error('第三天完成性测试需要 M11 双向配对')
  progress.firstTest = markM11ExpectedAudits(new LocalM11QaRunner().run('first', progress.pairing, progress.questions))
  progress.revisions = createM11ReferenceRevisions(progress, directory.currentParticipantId)
  progress.retest = markM11RetestVerified(new LocalM11QaRunner().run('retest', progress.pairing, progress.questions, progress.revisions))
  progress.teacherConfirmation = {
    sameQuestionsConfirmed: true,
    bidirectionalPairingConfirmed: true,
    evidenceAndBoundaryConfirmed: true,
    safetyAndPrivacyConfirmed: true,
    teacherHandoffResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedM11Package(progress, directory, evidence)
  if (!progress.confirmedPackage) throw new Error(validateM11Confirmation(progress, directory, evidence).messages.join('；'))
  return { progress, evidence, directory }
}

describe('第三天 M10/M11/G03 公开完成性契约', () => {
  it('目录将三项标记为 implemented，并保留固定步骤、时长和成果名称', () => {
    for (const taskId of ['M10', 'M11', 'G03'] as const) {
      const task = trainingTasks[taskId]
      const expected = expectedCatalog[taskId]
      expect(task.contentStatus).toBe('implemented')
      expect(task.kind).toBe(expected.kind)
      expect(task.duration).toBe(expected.duration)
      expect(task.steps?.map((step) => step.id)).toEqual([...expected.steps])
      expect(task.steps?.map((step) => step.number)).toEqual(expected.steps.map((_, index) => String(index + 1).padStart(2, '0')))
      expect(task.outputs).toEqual([...expected.outputs])
    }
  })

  it('三项工作台均以公开注册表提供可运行入口', () => {
    expect(taskWorkspaceRegistry.M10).toEqual({ taskId: 'M10', workspaceId: 'm10', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' })
    expect(taskWorkspaceRegistry.M11).toEqual({ taskId: 'M11', workspaceId: 'm11', startLabel: '开始任务', continueLabel: '继续任务', completedLabel: '查看成果' })
    expect(taskWorkspaceRegistry.G03).toEqual({ taskId: 'G03', workspaceId: 'g03', startLabel: '开始验收', continueLabel: '继续验收', completedLabel: '查看验收记录' })
  })

  it('M10 恰好生成 2 项任务成果，但个人成果只登记“课程 AI 助教”1 个槽位', () => {
    const directory = createInitialPortalProgress().participantDirectory
    const progress = buildPassedM10(directory)
    const assistant = progress.confirmedAssistant
    expect(assistant?.artifacts).toHaveLength(2)
    expect(assistant?.artifacts.map((item) => item.name)).toEqual(trainingTasks.M10.outputs)
    expect(assistant?.personalPortfolioSlot).toBe('课程 AI 助教')
    const slots = portfolioDefinitions.filter((item) => item.source === 'M10')
    expect(slots).toEqual([{ id: 'assistant', name: '课程 AI 助教', source: 'M10', quantity: '1 个' }])
  })

  it('M11 恰好归档 2 项任务成果，并合并为 1 个 portfolioArtifact', () => {
    const { progress } = completeM11FromCurrentM10()
    const pkg = progress.confirmedPackage
    expect(pkg?.artifacts).toHaveLength(2)
    expect(pkg?.artifacts.map((item) => item.name)).toEqual(trainingTasks.M11.outputs)
    expect(pkg?.portfolioArtifact.name).toBe('学生答疑问题测试、规则修改说明与复测记录')
    expect(pkg?.portfolioArtifact.mergedFromArtifactIds).toEqual(pkg?.artifacts.map((item) => item.artifactId))
    expect(portfolioDefinitions.filter((item) => item.source === 'M11')).toHaveLength(1)
  })

  it('G03 四项不计分条件全部通过后，恰好产生 3 项固定成果', () => {
    const { progress } = completeG03Fixture()
    const conditions = g03Conditions(progress)
    expect(conditions.map((item) => item.id)).toEqual(['bilateral-coverage', 'three-scenarios', 'two-round-showcase', 'traceable-report'])
    expect(conditions).toHaveLength(4)
    expect(conditions.every((item) => item.passed)).toBe(true)
    const result = createG03Assessment(progress, '培训师', '2026-08-25T10:00:00.000Z')
    expect(result.assessment.outcome).toBe('已通过')
    expect(result.assessment).not.toHaveProperty('score')
    expect(result.assessment).not.toHaveProperty('total')
    expect(result.artifacts).toHaveLength(3)
    expect(result.artifacts.map((item) => item.name)).toEqual([...g03OutputNames])
    expect(result.artifacts.map((item) => item.name)).toEqual(trainingTasks.G03.outputs)
  })
})
