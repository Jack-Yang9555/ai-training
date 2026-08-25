import { createInitialM09Progress, createM09SampleSources } from '../src/m09/data'
import { applyRecommendedM09Quality, createM09Correction, LocalM09KnowledgeRunner, simulateM09PeerTest } from '../src/m09/runner'
import { createM09Assessment } from '../src/m09/scoring'
import { createConfirmedM09KnowledgeBase } from '../src/m09/storage'
import { createInitialM10Progress } from '../src/m10/data'
import { applyM10ReferenceRevision, eligibleM10Reviewers, LocalM10AssistantRunner, m10KnowledgeSourceFromM09, simulateM10PeerReview, synchronizeM10Source } from '../src/m10/runner'
import { createM10Assessment } from '../src/m10/scoring'
import { createConfirmedM10Assistant } from '../src/m10/storage'
import { createInitialPortalProgress } from '../src/training/storage'
import type { ParticipantDirectory } from '../src/training/types'

export function buildPassedM09(directory: ParticipantDirectory) {
  const participantId = directory.currentParticipantId
  const runner = new LocalM09KnowledgeRunner()
  const progress = createInitialM09Progress()
  progress.sources = applyRecommendedM09Quality(createM09SampleSources())
  progress.knowledgeBase = runner.build(progress, participantId)
  progress.firstTest = runner.runTests(progress, 'first').map((item) => ({ ...item, teacherVerified: true }))
  progress.firstTestFrozen = true
  const correction = createM09Correction(progress)
  progress.corrections = [correction]
  progress.answerRule = { version: correction.ruleVersion, text: correction.after }
  progress.retest = runner.runTests(progress, 'retest').map((item) => ({ ...item, teacherVerified: true }))
  const current = directory.participants.find((item) => item.participantId === participantId)!
  const peer = directory.participants.find((item) => item.groupId === current.groupId && item.participantId !== participantId)!
  progress.peerTest = { ...progress.peerTest, reviewerId: peer.participantId, reviewerRole: '核验员', boundaryQuestionId: 'B01' }
  progress.peerTest = { ...simulateM09PeerTest(progress, directory), submitted: true, submittedAt: new Date().toISOString() }
  progress.teacherConfirmation = { scopeConfirmed: true, sourcesConfirmed: true, boundaryConfirmed: true, safetyConfirmed: true, maintenanceResponsibilityConfirmed: true }
  progress.confirmedKnowledgeBase = createConfirmedM09KnowledgeBase(progress, directory)
  progress.assessments = [createM09Assessment(progress, directory)]
  return progress
}

export function buildPassedM10(directory = createInitialPortalProgress().participantDirectory) {
  const participantId = directory.currentParticipantId
  const source = m10KnowledgeSourceFromM09(buildPassedM09(directory), directory)
  if (!source) throw new Error('M10 测试需要当前 M09 通过证据')
  let progress = synchronizeM10Source(createInitialM10Progress(), source)
  progress = { ...progress, ...new LocalM10AssistantRunner().configure(source) }
  progress.previews = new LocalM10AssistantRunner().preview(progress)
  const reviewer = eligibleM10Reviewers(directory)[0]
  if (!reviewer) throw new Error('M10 测试需要当前同组其他成员')
  progress.peerReview = { ...progress.peerReview, reviewerId: reviewer.participantId, reviewerRole: '核验员' }
  progress.peerReview = { ...simulateM10PeerReview(progress, directory), submitted: true, submittedAt: new Date().toISOString() }
  progress = applyM10ReferenceRevision(progress)
  progress.teacherConfirmation = { knowledgeSourceConfirmed: true, roleBoundaryConfirmed: true, fourStepFlowConfirmed: true, fiveRulesConfirmed: true, humanTakeoverResponsibilityConfirmed: true }
  progress.confirmedAssistant = createConfirmedM10Assistant(progress, directory)
  progress.assessments = [createM10Assessment(progress, directory)]
  return progress
}
