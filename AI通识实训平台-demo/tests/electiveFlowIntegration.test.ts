import { describe, expect, it } from 'vitest'
import { createM12SuggestedFlow } from '../src/m12/data'
import type { M12EvidenceSlot, M12SlotId } from '../src/m12/domain'
import { trainingTasks } from '../src/training/catalog'
import { taskWorkspaceRegistry } from '../src/training/workspaces'

type ImplementedElectiveId = 'E03' | 'E04' | 'E05' | 'E06'
type ElectiveSlotId = Extract<M12SlotId, 'elective-day-2' | 'elective-day-3'>

const electiveContracts = {
  E03: {
    outputs: ['教学反思或评课记录', '下一次课改进清单'],
    stepIds: ['overview', 'source', 'findings', 'measures', 'peer-review', 'revision', 'confirmation', 'result'],
    workspaceId: 'e03',
  },
  E04: {
    outputs: ['课程知识图谱', '节点与关系列表', '人工修正记录'],
    stepIds: ['overview', 'source', 'nodes', 'relations', 'graph-review', 'revision', 'confirmation', 'result'],
    workspaceId: 'e04',
  },
  E05: {
    outputs: ['课程—岗位能力映射网页', '差距与改进建议清单'],
    stepIds: ['overview', 'source', 'mapping', 'suggestions', 'peer-review', 'revision', 'confirmation', 'result'],
    workspaceId: 'e05',
  },
  E06: {
    outputs: ['文献梳理表', '观点对比表', '引用核验记录'],
    stepIds: ['overview', 'question', 'review', 'comparison', 'peer-review', 'revision', 'confirmation', 'result'],
    workspaceId: 'e06',
  },
} as const satisfies Record<ImplementedElectiveId, {
  outputs: readonly string[]
  stepIds: readonly string[]
  workspaceId: string
}>

function electiveEvidence(slotId: ElectiveSlotId, sourceTaskId: ImplementedElectiveId): M12EvidenceSlot {
  return {
    slotId,
    name: slotId === 'elective-day-2' ? '第二天个人选修成果' : '第三天个人选修成果',
    sourceTaskId,
    sourceLabel: `${sourceTaskId} · 个人选修`,
    participantId: 'T001',
    status: 'current',
    artifactId: `${sourceTaskId}-PKG-current`,
    version: '1.0',
    assessmentId: `${sourceTaskId}-ASSESS-current`,
    summary: `${sourceTaskId} 当前有效成果`,
  }
}

function flowText(flow: ReturnType<typeof createM12SuggestedFlow>[number]) {
  return [flow.teachingStep, flow.objective, flow.teacherAction, flow.transition].join(' ')
}

describe('E03—E06 共享目录与 M12 流程集成契约', () => {
  it('目录发布正式成果契约，并为每项任务提供唯一的八步流程', () => {
    for (const taskId of Object.keys(electiveContracts) as ImplementedElectiveId[]) {
      const contract = electiveContracts[taskId]
      const task = trainingTasks[taskId]
      expect(task.kind).toBe('elective')
      expect(task.contentStatus).toBe('implemented')
      expect(task.outputs).toEqual(contract.outputs)

      const steps = task.steps ?? []
      expect(steps.map((step) => step.id)).toEqual(contract.stepIds)
      expect(steps.map((step) => step.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08'])
      expect(new Set(steps.map((step) => step.id)).size).toBe(8)
      expect(new Set(steps.map((step) => step.number)).size).toBe(8)
    }
  })

  it('为 E03—E06 注册可开始、继续和查看成果的独立工作台', () => {
    for (const taskId of Object.keys(electiveContracts) as ImplementedElectiveId[]) {
      expect(taskWorkspaceRegistry[taskId]).toEqual({
        taskId,
        workspaceId: electiveContracts[taskId].workspaceId,
        startLabel: '开始任务',
        continueLabel: '继续任务',
        completedLabel: '查看成果',
      })
    }
  })

  it.each([
    { taskId: 'E03', mustMatch: [/反思|评课/, /改进/], mustNotMatch: /任务书|安全检查|评分量规|文献|引用|岗位映射/ },
    { taskId: 'E04', mustMatch: [/知识|节点|图谱/, /关系/], mustNotMatch: /任务书|安全检查|评分量规|文献|引用|岗位能力/ },
    { taskId: 'E05', mustMatch: [/岗位|能力/, /映射|差距/], mustNotMatch: /任务书|安全检查|评分量规|文献|引用|教研结论/ },
    { taskId: 'E06', mustMatch: [/文献|引用/, /观点|核验/], mustNotMatch: /任务书|安全检查|评分量规|岗位能力|知识图谱/ },
  ] as const)('M12 对 $taskId 按来源任务生成语义，不硬编码第二天 E02 / 第三天 E06', ({ taskId, mustMatch, mustNotMatch }) => {
    const day2Text = flowText(createM12SuggestedFlow([electiveEvidence('elective-day-2', taskId)])[0])
    const day3Text = flowText(createM12SuggestedFlow([electiveEvidence('elective-day-3', taskId)])[0])

    expect(day2Text).toBe(day3Text)
    for (const pattern of mustMatch) expect(day2Text).toMatch(pattern)
    expect(day2Text).not.toMatch(mustNotMatch)
  })
})
