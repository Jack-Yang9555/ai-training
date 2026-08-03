import { describe, expect, it } from 'vitest'
import { defaultBlueprint, seededQuestions, trainingTasks } from './trainingData'
import { aiDemoService } from './services/aiDemoService'

describe('培训能力领域数据', () => {
  it('包含十一项有前置关系的培训任务', () => {
    expect(trainingTasks).toHaveLength(11)
    expect(trainingTasks[0].prerequisite).toBeUndefined()
    expect(trainingTasks.find((task) => task.id === 'tutor-publish')?.prerequisite).toBe('avatar-config')
    expect(trainingTasks.find((task) => task.id === 'learning-analyze')?.prerequisite).toBe('assignment-grade')
  })

  it('组卷固定为100分并通过质量检查', async () => {
    const paper = await aiDemoService.assemblePaper(defaultBlueprint, seededQuestions)
    expect(paper.questions.reduce((sum, question) => sum + question.score, 0)).toBe(100)
    expect(paper.blueprint.machineScore + paper.blueprint.aiScore + paper.blueprint.manualScore).toBe(100)
    expect(paper.checks.every((check) => check.passed)).toBe(true)
  })

  it('AI助教对课程外问题触发知识边界', async () => {
    const response = await aiDemoService.generateTutorReply('请帮我解释会计借贷记账法')
    expect(response.evidence).toHaveLength(0)
    expect(response.confidence).toBeLessThan(60)
    expect(response.content).toContain('超出了当前课程知识库范围')
  })
})
