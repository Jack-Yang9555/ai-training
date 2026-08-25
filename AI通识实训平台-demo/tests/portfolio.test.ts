import { describe, expect, it } from 'vitest'
import { buildTrainingPortfolio } from '../src/training/portfolio'
import { buildTrainingSnapshot } from '../src/training/progress'
import type { M01ScoreResult } from '../src/types'

const incompleteScore: M01ScoreResult = { dimensions: [], total: 0, coreRequirements: [], passed: false }
const passedScore: M01ScoreResult = { dimensions: [], total: 10, coreRequirements: [], passed: true }

describe('成果中心统一归档', () => {
  it('M01 完成后自动进入任务归档，但不会误计入十类最终成果', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M01: { progressPercent: 100, passed: passedScore.passed, score: passedScore.total } }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments: { 'day-2': [], 'day-3': [] } })
    const m01 = portfolio.taskArchives.find((item) => item.taskId === 'M01')

    expect(m01?.status).toBe('archived')
    expect(m01?.artifacts.map((item) => item.name)).toEqual(['AI 生成内容核验记录', '教师修正对照表', '小组核验清单'])
    expect(portfolio.archivedTaskCount).toBe(1)
    expect(portfolio.completedDeliverableCount).toBe(0)
  })

  it('任务未完成时保留过程状态，不会提前归档', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M01: { progressPercent: 60, passed: incompleteScore.passed, score: incompleteScore.total } }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments: { 'day-2': [], 'day-3': [] } })
    const m01 = portfolio.taskArchives.find((item) => item.taskId === 'M01')

    expect(m01?.status).toBe('in-progress')
    expect(m01?.progressPercent).toBe(60)
    expect(portfolio.archivedTaskCount).toBe(0)
  })

  it('后续任务可通过统一提交接口覆盖目录中的成果契约', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M01: { progressPercent: 100, passed: passedScore.passed, score: passedScore.total } }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({
      snapshot,
      electiveAssignments: { 'day-2': [], 'day-3': [] },
      submissions: {
        M01: {
          taskId: 'M01',
          submittedAt: '2026-08-12T00:00:00.000Z',
          artifacts: [{ artifactId: 'm01-report', name: 'M01 核验报告', uri: '/artifacts/m01-report' }],
        },
      },
    })
    const m01 = portfolio.taskArchives.find((item) => item.taskId === 'M01')

    expect(m01?.source).toBe('submission')
    expect(m01?.artifacts).toEqual([{ artifactId: 'm01-report', name: 'M01 核验报告', uri: '/artifacts/m01-report' }])
  })

  it('M02 通过后归档四项过程成果但不计入十类最终成果', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {
      M01: { progressPercent: 100, passed: true, score: 10 },
      M02: { progressPercent: 100, passed: true, score: 10 },
    }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments: { 'day-2': [], 'day-3': [] } })
    const m02 = portfolio.taskArchives.find((item) => item.taskId === 'M02')
    expect(m02?.status).toBe('archived')
    expect(m02?.artifacts.map((item) => item.name)).toEqual(['任务遵循检查记录', '五维对比评分表', '模型选择与人工修正记录', '小组模型对比结论'])
    expect(portfolio.completedDeliverableCount).toBe(0)
  })

  it('M03 通过后恰好归档三项过程成果并保持最终成果计数不变', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {
      M01: { progressPercent: 100, passed: true, score: 10 },
      M02: { progressPercent: 100, passed: true, score: 10 },
      M03: { progressPercent: 100, passed: true, score: 10 },
    }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments: { 'day-2': [], 'day-3': [] } })
    const m03 = portfolio.taskArchives.find((item) => item.taskId === 'M03')
    expect(m03?.status).toBe('archived')
    expect(m03?.artifacts.map((item) => item.name)).toEqual(['提示词 V1', '提示词 V2', '两个版本的变化说明'])
    expect(portfolio.completedDeliverableCount).toBe(0)
  })

  it('M04 通过后恰好归档三项成果一次', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {
      M03: { progressPercent: 100, passed: true, score: 10 },
      M04: { progressPercent: 100, passed: true, score: 10 },
    }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments: { 'day-2': [], 'day-3': [] } })
    const archives = portfolio.taskArchives.filter((item) => item.taskId === 'M04')
    expect(archives).toHaveLength(1)
    expect(archives[0].status).toBe('archived')
    expect(archives[0].artifacts.map((item) => item.name)).toEqual(['AI 教案草稿', '教案人工审校记录', '教师确认版教案'])
  })

  it('M05 通过后恰好归档两套成果一次，并完成课堂题目包最终成果', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {
      M04: { progressPercent: 100, passed: true, score: 10 }, M05: { progressPercent: 100, passed: true, score: 10 },
    }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments: { 'day-2': [], 'day-3': [] } })
    const archives = portfolio.taskArchives.filter((item) => item.taskId === 'M05')
    expect(archives).toHaveLength(1)
    expect(archives[0].status).toBe('archived')
    expect(archives[0].artifacts.map((item) => item.name)).toEqual(['课堂题目包', '题目核验依据与修改记录'])
    expect(portfolio.personalDeliverables.find((item) => item.id === 'question-pack')?.status).toBe('archived')
  })

  it('G01 通过后恰好归档三项规定成果一次', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: {
      M01: { progressPercent: 100, passed: true, score: 10 }, M02: { progressPercent: 100, passed: true, score: 10 }, M03: { progressPercent: 100, passed: true, score: 10 }, M04: { progressPercent: 100, passed: true, score: 10 }, M05: { progressPercent: 100, passed: true, score: 10 }, G01: { progressPercent: 100, passed: true },
    }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments: { 'day-2': [], 'day-3': [] }, submissions: { G01: { taskId: 'G01', submittedAt: '2026-08-12T12:00:00.000Z', artifacts: ['教学设计与命题成果目录', 'AI 教学内容核验清单', '个人贡献记录'].map((name, index) => ({ artifactId: `G01:${index}`, name })) } } })
    const archives = portfolio.taskArchives.filter((item) => item.taskId === 'G01')
    expect(archives).toHaveLength(1)
    expect(archives[0].status).toBe('archived')
    expect(archives[0].artifacts.map((item) => item.name)).toEqual(['教学设计与命题成果目录', 'AI 教学内容核验清单', '个人贡献记录'])
    expect(new Set(archives[0].artifacts.map((item) => item.artifactId)).size).toBe(3)
  })

  it('M09 通过后任务归档恰好两项，个人成果中心仍只占一个知识库槽位', () => {
    const snapshot = buildTrainingSnapshot({ taskProgress: { M09: { progressPercent: 100, passed: true, score: 10 } }, selectedElectiveIds: [] })
    const portfolio = buildTrainingPortfolio({
      snapshot,
      electiveAssignments: { 'day-2': [], 'day-3': [] },
      submissions: {
        M09: {
          taskId: 'M09',
          submittedAt: '2026-08-24T00:00:00.000Z',
          artifacts: [
            { artifactId: 'M09:kb', name: '课程知识库 v1.0 及来源清单' },
            { artifactId: 'M09:report', name: '课程知识库 9 项问答测试报告和修正记录' },
          ],
        },
      },
    })
    const archives = portfolio.taskArchives.filter((item) => item.taskId === 'M09')
    expect(archives).toHaveLength(1)
    expect(archives[0].artifacts).toHaveLength(2)
    expect(portfolio.personalDeliverables.filter((item) => item.source === 'M09')).toHaveLength(1)
    expect(portfolio.personalDeliverables.find((item) => item.id === 'knowledge-base')?.status).toBe('archived')
  })


  it('E01 通过后只归档两类规定成果，并只占当天一个个人选修槽位', () => {
    const snapshot = buildTrainingSnapshot({
      taskProgress: { E01: { progressPercent: 100, passed: true, score: 10 } },
      selectedElectiveIds: ['E01'],
    })
    const portfolio = buildTrainingPortfolio({
      snapshot,
      electiveAssignments: { 'day-2': ['E01'], 'day-3': [] },
      submissions: {
        E01: {
          taskId: 'E01',
          submittedAt: '2026-08-24T00:00:00.000Z',
          artifacts: [
            { artifactId: 'E01:rubric', name: '评分量规' },
            { artifactId: 'E01:grading-feedback', name: '5 份批改结果与个性化反馈' },
          ],
        },
      },
    })
    const archive = portfolio.taskArchives.find((item) => item.taskId === 'E01')
    expect(archive?.status).toBe('archived')
    expect(archive?.artifacts.map((item) => item.name)).toEqual(['评分量规', '5 份批改结果与个性化反馈'])
    expect(new Set(archive?.artifacts.map((item) => item.artifactId)).size).toBe(2)
    const electiveSlots = portfolio.personalDeliverables.filter((item) => item.source === 'elective-day-2')
    expect(electiveSlots).toHaveLength(1)
    expect(electiveSlots[0].sourceTaskIds).toEqual(['E01'])
    expect(electiveSlots[0].status).toBe('archived')
  })
})
