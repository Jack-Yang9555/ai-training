import { describe, expect, it } from 'vitest'
import { initialLearnerGroups, initialLearningSnapshots, learningStudents } from './learningData'
import { aiDemoService } from './services/aiDemoService'

describe('学习促进领域数据', () => {
  it('模拟36名学习者并形成8、19、9人的动态分组', () => {
    expect(learningStudents).toHaveLength(36)
    expect(initialLearnerGroups.map((group) => group.memberIds.length)).toEqual([8, 19, 9])
    const memberIds = initialLearnerGroups.flatMap((group) => group.memberIds)
    expect(new Set(memberIds).size).toBe(36)
    expect(memberIds).toContain('AI24018')
  })

  it('不同观察周期产生可追溯诊断并区分证据不足', async () => {
    const unit = await aiDemoService.analyzeLearningEvidence(initialLearningSnapshots.unit)
    const lesson = await aiDemoService.analyzeLearningEvidence(initialLearningSnapshots.lesson)
    expect(unit.mastery.find((point) => point.knowledgePointId === 'negative')?.status).toBe('重点补强')
    expect(unit.mastery.find((point) => point.knowledgePointId === 'negative')?.evidenceIds.length).toBeGreaterThan(2)
    expect(lesson.mastery.find((point) => point.knowledgePointId === 'iteration')?.status).toBe('证据不足')
    expect(lesson.mastery.find((point) => point.knowledgePointId === 'iteration')?.current).toBeNull()
  })

  it('AI分层建议保留目标、接收者、难度和草稿状态', async () => {
    const diagnosis = await aiDemoService.analyzeLearningEvidence(initialLearningSnapshots.unit)
    const plan = await aiDemoService.generateGroupIntervention(diagnosis, initialLearnerGroups[0])
    expect(plan.recipients).toHaveLength(8)
    expect(plan.targetKnowledgePointId).toBe('negative')
    expect(plan.status).toBe('draft')
    expect(plan.difficulty).toBeGreaterThanOrEqual(1)
  })
})
