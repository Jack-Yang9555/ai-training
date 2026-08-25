import { describe, expect, it } from 'vitest'
import { createInitialE02Progress } from '../src/e02/data'
import type { E02Progress, E02Route } from '../src/e02/domain'
import {
  applyE02ReferenceCorrections,
  eligibleE02Reviewers,
  LocalE02DraftRunner,
  simulateE02PeerReview,
} from '../src/e02/runner'
import { createE02Assessment } from '../src/e02/scoring'
import { createConfirmedE02Package } from '../src/e02/storage'
import { buildG02GroupContext } from '../src/g02/data'
import { buildOfficialM12Evidence } from '../src/m12/data'
import { e02Steps, trainingTasks } from '../src/training/catalog'
import { buildTrainingPortfolio } from '../src/training/portfolio'
import { buildTrainingSnapshot } from '../src/training/progress'
import { createInitialPortalProgress } from '../src/training/storage'
import { taskWorkspaceRegistry } from '../src/training/workspaces'

const expectedRoutes = [
  'overview',
  'source',
  'draft',
  'safety-rubric',
  'peer-review',
  'teacher-revision',
  'confirmation',
  'result',
] satisfies E02Route[]

const expectedOutputNames = ['实训任务书', '安全检查单', '100 分评分量规']

function createPassedE02() {
  const directory = createInitialPortalProgress().participantDirectory
  let progress: E02Progress = createInitialE02Progress()
  progress.aiDraft = new LocalE02DraftRunner().run(progress, directory.currentParticipantId)
  progress.workingDraft = structuredClone(progress.aiDraft)

  const reviewer = eligibleE02Reviewers(directory)[0]
  if (!reviewer) throw new Error('E02 集成测试需要至少一名当前同组其他成员')
  progress.peerReview = {
    ...progress.peerReview,
    reviewerId: reviewer.participantId,
    reviewerRole: '核验员',
  }
  progress.peerReview = {
    ...simulateE02PeerReview(progress, directory),
    submitted: true,
    submittedAt: '2026-08-25T01:00:00.000Z',
  }
  progress = applyE02ReferenceCorrections(progress, directory.currentParticipantId)
  progress.teacherConfirmation = {
    specificationReviewedConfirmed: true,
    authorizationAndPrivacyConfirmed: true,
    finalArtifactsConfirmed: true,
    finalResponsibilityConfirmed: true,
  }
  progress.confirmedPackage = createConfirmedE02Package(progress, directory)
  if (!progress.confirmedPackage || !progress.workingDraft) throw new Error('E02 确认成果包生成失败')
  progress.assessments = [...progress.assessments, createE02Assessment(progress, directory)]

  return {
    directory,
    progress,
    package: progress.confirmedPackage,
    assessment: progress.assessments.at(-1)!,
  }
}

describe('E02 平台集成契约', () => {
  it('任务目录标记为已实现，并注册完整八步工作台', () => {
    expect(trainingTasks.E02.contentStatus).toBe('implemented')
    expect(trainingTasks.E02.steps).toBe(e02Steps)
    expect(e02Steps.map((step) => step.id)).toEqual(expectedRoutes)
    expect(new Set(e02Steps.map((step) => step.id)).size).toBe(8)
    expect(taskWorkspaceRegistry.E02).toEqual({
      taskId: 'E02',
      workspaceId: 'e02',
      startLabel: '开始任务',
      continueLabel: '继续任务',
      completedLabel: '查看成果',
    })
  })

  it('目录契约与教师确认成果包保持同一组三项成果名称', () => {
    const { package: confirmedPackage } = createPassedE02()
    expect(trainingTasks.E02.outputs).toEqual(expectedOutputNames)
    expect(confirmedPackage.artifacts.map((artifact) => artifact.name)).toEqual(expectedOutputNames)
    expect(confirmedPackage.artifacts.map((artifact) => artifact.kind)).toEqual([
      'e02-task-book',
      'e02-safety-checklist',
      'e02-rubric',
    ])
    expect(new Set(confirmedPackage.artifacts.map((artifact) => artifact.artifactId)).size).toBe(3)
  })

  it('通用成果中心归档三项任务成果，但当天个人选修只占一个槽位', () => {
    const { package: confirmedPackage, assessment } = createPassedE02()
    const snapshot = buildTrainingSnapshot({
      taskProgress: { E02: { progressPercent: 100, passed: true, score: 10 } },
      selectedElectiveIds: ['E02'],
      currentMemberElectiveConfirmed: true,
    })
    const portfolio = buildTrainingPortfolio({
      snapshot,
      electiveAssignments: { 'day-2': ['E02'], 'day-3': [] },
      submissions: {
        E02: {
          taskId: 'E02',
          submittedAt: assessment.assessedAt,
          artifacts: confirmedPackage.artifacts.map((artifact) => ({
            artifactId: artifact.artifactId,
            name: artifact.name,
            updatedAt: confirmedPackage.confirmedAt,
          })),
        },
      },
    })

    const archive = portfolio.taskArchives.find((item) => item.taskId === 'E02')
    expect(archive?.status).toBe('archived')
    expect(archive?.source).toBe('submission')
    expect(archive?.artifacts.map((artifact) => artifact.name)).toEqual(expectedOutputNames)

    const e02Slots = portfolio.personalDeliverables.filter((item) => item.sourceTaskIds.includes('E02'))
    expect(e02Slots).toHaveLength(1)
    expect(e02Slots[0]).toMatchObject({
      id: 'elective-day-2',
      sourceTaskIds: ['E02'],
      status: 'archived',
    })
  })

  it('同一个 E02 成果包可作为 G02 首个选修成果和 M12 正式选修证据', () => {
    const { directory, progress, package: confirmedPackage, assessment } = createPassedE02()
    const participantId = directory.currentParticipantId
    const g02Context = buildG02GroupContext(directory, {
      participantId,
      firstElectiveId: 'E02',
      firstElectiveArtifactId: confirmedPackage.packageId,
    })
    const currentMember = g02Context.memberEvidence.find((member) => member.isCurrentParticipant)
    const g02Elective = currentMember?.evidence.find((item) => item.type === '首个选修成果')
    expect(g02Elective).toMatchObject({
      artifactId: confirmedPackage.packageId,
      source: '真实本地成果',
    })
    expect(g02Elective?.name).toContain('E02 首个选修成果')
    expect(g02Context.evidenceFingerprint).toMatch(/^evidence-/)

    const version = `${confirmedPackage.specificationVersion} · ${progress.workingDraft!.rubric.version}`
    const m12Evidence = buildOfficialM12Evidence(participantId, {
      'elective-day-2': {
        current: true,
        sourceTaskId: 'E02',
        sourceLabel: 'E02 · 第二天个人选修',
        artifactId: confirmedPackage.packageId,
        version,
        assessmentId: assessment.assessmentId,
        updatedAt: confirmedPackage.confirmedAt,
        summary: '当前教师确认的实训任务书、安全检查单与 100 分评分量规。',
      },
    })
    expect(m12Evidence.find((item) => item.slotId === 'elective-day-2')).toMatchObject({
      participantId,
      sourceTaskId: 'E02',
      status: 'current',
      artifactId: confirmedPackage.packageId,
      version,
      assessmentId: assessment.assessmentId,
    })

    const incompleteM12Evidence = buildOfficialM12Evidence(participantId, {
      'elective-day-2': {
        current: true,
        sourceTaskId: 'E02',
        artifactId: confirmedPackage.packageId,
        version,
      },
    })
    expect(incompleteM12Evidence.find((item) => item.slotId === 'elective-day-2')?.status).toBe('missing')
  })
})
