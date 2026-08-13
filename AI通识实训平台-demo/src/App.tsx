import { useEffect, useMemo, useState } from 'react'
import { PortalShell } from './components/PortalShell'
import { TrainingShell } from './components/TrainingShell'
import { m01Answers } from './data/m01Data'
import { calculateM01Score } from './logic/m01Scoring'
import { progressForRoute } from './logic/m01Validation'
import { calculateM02Score } from './m02/scoring'
import { clearAllM02Progress, clearParticipantM02Progress, createInitialM02Progress, loadM02Store, progressForParticipant, saveM02Store, updateParticipantM02Progress } from './m02/storage'
import type { M02ComplianceDimension, M02ComplianceValue, M02CorrectionRecord, M02GroupConclusion, M02ModelId, M02PeerReview, M02Progress, M02RatingDimension, M02RatingEvidence, M02Route, M02SelectionDecision } from './m02/types'
import {
  isM02RunSucceeded, progressForM02, validateM02BlindReview, validateM02Compliance,
  validateM02Correction, validateM02GroupConclusion, validateM02PeerReview,
  validateM02Selection,
} from './m02/validation'
import { calculateM03Score, createM03Assessment } from './m03/scoring'
import { clearAllM03Progress, clearParticipantM03Progress, loadM03Store, m03ProgressForParticipant, saveM03Store, updateParticipantM03Progress } from './m03/storage'
import type { M03IterationVariable, M03PeerReview, M03Progress, M03PromptSnapshot, M03Route, M03VerificationRecord, M03Version } from './m03/types'
import { latestM03AssessmentIsCurrent, progressForM03, validateM03Comparison, validateM03Iteration, validateM03PeerReview, validateM03ProfessionalEvidence, validateM03PromptMessage } from './m03/validation'
import { createM04Assessment, calculateM04Score } from './m04/scoring'
import { clearAllM04Progress, clearParticipantM04Progress, createConfirmedM04Plan, loadM04Store, m04ProgressForParticipant, saveM04Store, updateParticipantM04Progress } from './m04/storage'
import type { M04CorrectionRecord, M04CorrectionType, M04InputSnapshot, M04PeerReview, M04Progress, M04Route } from './m04/types'
import { confirmedM04PlanIsCurrent, latestM04AssessmentIsCurrent, m04SourceIsCurrent, progressForM04, validateM04Audit, validateM04Draft, validateM04Input, validateM04PeerReview } from './m04/validation'
import { calculateM05Score, createM05Assessment } from './m05/scoring'
import { clearAllM05Progress, clearParticipantM05Progress, createConfirmedM05Package, loadM05Store, m05ProgressForParticipant, saveM05Store, updateParticipantM05Progress } from './m05/storage'
import type { M05InputSnapshot, M05PeerReview, M05Progress, M05QuestionAudit, M05RevisionRecord, M05Route } from './m05/types'
import { confirmedM05PackageIsCurrent, latestM05AssessmentIsCurrent, m05SourceIsCurrent, progressForM05, validateM05Audits, validateM05Draft, validateM05Input, validateM05Revisions } from './m05/validation'
import { createM06Assessment, calculateM06Score } from './m06/scoring'
import { clearAllM06Progress, clearParticipantM06Progress, createConfirmedM06Package, loadM06Store, m06ProgressForParticipant, saveM06Store, updateParticipantM06Progress } from './m06/storage'
import type { M06DeckAudit, M06Input, M06PeerReview, M06Progress, M06Route } from './m06/domain'
import { confirmedM06PackageIsCurrent, latestM06AssessmentIsCurrent, progressForM06, validateM06DeckAudit, validateM06Draft, validateM06Input, validateM06Narration, validateM06PeerReview, validateM06Video } from './m06/validation'
import { LocalM06ContentRunner } from './m06/runner'
import { createM07Assessment, calculateM07Score } from './m07/scoring'
import { clearAllM07Progress, clearParticipantM07Progress, createConfirmedM07Deliverable, loadM07Store, m07ProgressForParticipant, saveM07Store, updateParticipantM07Progress } from './m07/storage'
import type { M07ConclusionReview, M07DataCheck, M07Input, M07ManualCheck, M07PeerReview, M07Progress, M07Route } from './m07/domain'
import { confirmedM07DeliverableIsCurrent, latestM07AssessmentIsCurrent, progressForM07, validateM07Conclusions, validateM07DataCheck, validateM07Draft, validateM07Input, validateM07LayerTasks, validateM07ManualChecks, validateM07PeerReview } from './m07/validation'
import { LocalM07AnalysisRunner } from './m07/runner'
import { createInitialM08Progress } from './m08/data'
import type { M08BrowserTest, M08Input, M08PeerTest, M08Progress, M08Route } from './m08/domain'
import { LocalM08WebRunner } from './m08/runner'
import { calculateM08Score, createM08Assessment } from './m08/scoring'
import { clearAllM08Progress, clearParticipantM08Progress, createConfirmedM08Webpage, loadM08Store, m08ProgressForParticipant, saveM08Store, updateParticipantM08Progress } from './m08/storage'
import { confirmedM08WebpageIsCurrent, latestM08AssessmentIsCurrent, progressForM08, validateM08BrowserTest, validateM08Draft, validateM08Input, validateM08Iterations, validateM08PeerTest } from './m08/validation'
import { createG01Assessment } from './g01/assessment'
import { buildG01GroupContext } from './g01/data'
import { clearAllG01Progress, clearGroupG01Progress, g01ProgressForGroup, invalidateAllG01Progress, loadG01Store, saveG01Store, updateGroupG01Progress } from './g01/storage'
import type { G01ChecklistItem, G01Contribution, G01CrossCheck, G01CurrentMemberEvidence, G01ErrorCorrection, G01Progress, G01Route } from './g01/types'
import { g01IsCurrentlyPassed, g01PrerequisitesComplete, progressForG01 } from './g01/validation'
import { buildG02GroupContext } from './g02/data'
import { clearAllG02Progress, clearGroupG02Progress, g02ProgressForGroup, invalidateAllG02Progress, loadG02Store, saveG02Store, updateGroupG02Progress } from './g02/storage'
import type { G02Contribution, G02CurrentEvidence, G02Progress, G02Revision, G02Route, G02Showcase } from './g02/types'
import { createG02Assessment, latestG02AssessmentIsCurrent, progressForG02, validateG02Directory, validateG02Feedback, validateG02Revision, validateG02Showcase } from './g02/validation'
import { M01Answers } from './pages/M01Answers'
import { M01Corrections } from './pages/M01Corrections'
import { M01GroupReview } from './pages/M01GroupReview'
import { M01Overview } from './pages/M01Overview'
import { M01Result } from './pages/M01Result'
import { M01Verification } from './pages/M01Verification'
import { M02CompliancePage, M02Overview, M02PeerReviewPage, M02RatingPage, M02ResultPage, M02Workbench } from './pages/M02Pages'
import { M03ComparePage, M03DesignPage, M03IterationPage, M03Overview, M03PeerReviewPage, M03ResultPage, M03V1Page } from './pages/M03Pages'
import { M04AuditPage, M04ConfirmationPage, M04DraftPage, M04InputPage, M04Overview, M04PeerReviewPage, M04ResultPage } from './pages/M04Pages'
import { M05AuditPage, M05DraftPage, M05InputPage, M05Overview, M05PeerReviewPage, M05ResultPage, M05RevisionPage } from './pages/M05Pages'
import { M06AvatarVideoPage, M06DeckPage, M06InputPage, M06NarrationPage, M06Overview, M06ResultPage, M06ReviewConfirmPage } from './pages/M06Pages'
import { M07AnalysisPage, M07DataCheckPage, M07InputPage, M07LayerReviewPage, M07Overview, M07ResultPage, M07StatisticsPage } from './pages/M07Pages'
import { G01AssessmentPage, G01ChecklistPage, G01CrossChecksPage, G01DirectoryPage, G01ErrorsPage, G01Overview } from './pages/G01Pages'
import { G02AssessmentPage, G02DirectoryPage, G02FeedbackPage, G02Overview, G02RevisionPage, G02ShowcasePage } from './pages/G02Pages'
import { M08BrowserTestPage, M08DraftPage, M08InputPage, M08IterationsPage, M08Overview, M08PeerConfirmPage, M08ResultPage } from './pages/M08Pages'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { TaskFrameworkPage } from './pages/TaskFrameworkPage'
import { TrainingDashboard } from './pages/TrainingDashboard'
import { TaskListPage } from './pages/TaskListPage'
import { clearProgress, createInitialGroupReview, loadProgress, saveProgress } from './storage/m01Storage'
import { localM02ModelRunner } from './services/m02ModelRunner'
import { localM03PromptRunner } from './services/m03PromptRunner'
import { localM04LessonPlanRunner } from './services/m04LessonPlanRunner'
import { localM05QuestionRunner } from './services/m05QuestionRunner'
import { m02CourseMaterial, m02LockedPrompt, m02ModelIds } from './m02/data'
import { g01Steps, g02Steps, m01Steps, m02Steps, m03Steps, m04Steps, m05Steps, m06Steps, m07Steps, m08Steps, taskGroups, trainingTasks } from './training/catalog'
import { buildTrainingSnapshot } from './training/progress'
import { clearPortalProgress, loadPortalProgress, savePortalProgress, selectedElectiveIds, updateElectiveAssignments, updateParticipantDirectory, updatePortalRoute } from './training/storage'
import { currentParticipant } from './training/participants'
import type { ElectiveAssignments, PortalRoute, TaskArtifactSubmission, TaskGroupId, TrainingTaskId } from './training/types'
import { taskWorkspaceRegistry } from './training/workspaces'
import type {
  AnnotationType,
  AnswerId,
  ChecklistItem,
  CorrectionRecord,
  DemoRoute,
  M01Progress,
  ReferenceAnnotation,
  TextAnnotation,
} from './types'

const m01RouteOrder: DemoRoute[] = ['overview', 'answers', 'verification', 'corrections', 'group-review', 'result']
const m01ShellSteps = m01Steps.map((step) => ({ ...step, route: step.id as DemoRoute }))
const m02RouteOrder: M02Route[] = ['overview', 'run', 'compliance', 'rating', 'peer-review', 'result']
const m02ShellSteps = m02Steps.map((step) => ({ ...step, route: step.id as M02Route }))
const m03RouteOrder: M03Route[] = ['overview', 'design', 'v1', 'iteration', 'compare', 'peer-review', 'result']
const m03ShellSteps = m03Steps.map((step) => ({ ...step, route: step.id as M03Route }))
const m04RouteOrder: M04Route[] = ['overview', 'input', 'draft', 'audit', 'peer-review', 'confirmation', 'result']
const m04ShellSteps = m04Steps.map((step) => ({ ...step, route: step.id as M04Route }))
const m05RouteOrder: M05Route[] = ['overview', 'input', 'draft', 'audit', 'revision', 'peer-review', 'result']
const m05ShellSteps = m05Steps.map((step) => ({ ...step, route: step.id as M05Route }))
const m06RouteOrder: M06Route[] = ['overview', 'input', 'deck', 'narration', 'avatar-video', 'review-confirm', 'result']
const m06ShellSteps = m06Steps.map((step) => ({ ...step, route: step.id as M06Route }))
const m07RouteOrder: M07Route[] = ['overview', 'input', 'data-check', 'statistics', 'analysis', 'layering-review', 'result']
const m07ShellSteps = m07Steps.map((step) => ({ ...step, route: step.id as M07Route }))
const m08RouteOrder: M08Route[] = ['overview', 'input', 'draft', 'iterations', 'browser-test', 'peer-confirm', 'result']
const m08ShellSteps = m08Steps.map((step) => ({ ...step, route: step.id as M08Route }))
const g01RouteOrder: G01Route[] = ['overview', 'directory', 'errors', 'cross-checks', 'checklist', 'assessment']
const g01ShellSteps = g01Steps.map((step) => ({ ...step, route: step.id as G01Route }))
const g02RouteOrder: G02Route[] = ['overview', 'directory', 'showcase', 'feedback', 'revision', 'assessment']
const g02ShellSteps = g02Steps.map((step) => ({ ...step, route: step.id as G02Route }))

function referenceToAnnotation(answerId: AnswerId, reference: ReferenceAnnotation, index: number): TextAnnotation | null {
  const answer = m01Answers.find((item) => item.id === answerId)
  if (!answer) return null
  const start = answer.answer.indexOf(reference.text)
  if (start < 0) return null
  return { id: `reference-${answerId}-${index}`, answerId, start, end: start + reference.text.length, text: reference.text, type: reference.type, judgment: reference.judgment, evidenceSource: reference.evidenceSource }
}

function groupForTask(taskId: TrainingTaskId, assignments: ElectiveAssignments): TaskGroupId | undefined {
  return taskGroups.find((group) => group.items.some((entry) => entry.taskId === taskId || (entry.electiveBucketId && assignments[entry.electiveBucketId]?.some((id) => id === taskId))))?.id
}

export default function App() {
  const [m01Progress, setM01Progress] = useState<M01Progress>(() => loadProgress())
  const [m02Store, setM02Store] = useState(() => loadM02Store())
  const [m02Running, setM02Running] = useState(false)
  const [m03Store, setM03Store] = useState(() => loadM03Store())
  const [m03Running, setM03Running] = useState(false)
  const [m04Store, setM04Store] = useState(() => loadM04Store())
  const [m04Running, setM04Running] = useState(false)
  const [m05Store, setM05Store] = useState(() => loadM05Store())
  const [m05Running, setM05Running] = useState(false)
  const [m06Store, setM06Store] = useState(() => loadM06Store())
  const [m06Running, setM06Running] = useState(false)
  const [m06Rendering, setM06Rendering] = useState(false)
  const [m07Store, setM07Store] = useState(() => loadM07Store())
  const [m07Running, setM07Running] = useState(false)
  const [m08Store, setM08Store] = useState(() => loadM08Store())
  const [m08Running, setM08Running] = useState(false)
  const [g01Store, setG01Store] = useState(() => loadG01Store())
  const [g02Store, setG02Store] = useState(() => loadG02Store())
  const [portalProgress, setPortalProgress] = useState(() => loadPortalProgress())
  const [verificationAnswerId, setVerificationAnswerId] = useState<AnswerId>('A')

  useEffect(() => saveProgress(m01Progress), [m01Progress])
  useEffect(() => saveM02Store(m02Store), [m02Store])
  useEffect(() => saveM03Store(m03Store), [m03Store])
  useEffect(() => saveM04Store(m04Store), [m04Store])
  useEffect(() => saveM05Store(m05Store), [m05Store])
  useEffect(() => saveM06Store(m06Store), [m06Store])
  useEffect(() => saveM07Store(m07Store), [m07Store])
  useEffect(() => saveM08Store(m08Store), [m08Store])
  useEffect(() => saveG01Store(g01Store), [g01Store])
  useEffect(() => saveG02Store(g02Store), [g02Store])
  useEffect(() => savePortalProgress(portalProgress), [portalProgress])

  const m01ProgressPercent = useMemo(() => progressForRoute(m01Progress, portalProgress.participantDirectory), [m01Progress, portalProgress.participantDirectory])
  const m01Score = useMemo(() => calculateM01Score(m01Progress, portalProgress.participantDirectory), [m01Progress, portalProgress.participantDirectory])
  const activeParticipant = useMemo(() => currentParticipant(portalProgress.participantDirectory), [portalProgress.participantDirectory])
  const activeParticipantId = activeParticipant?.participantId ?? 'anonymous'
  const m02Progress = useMemo(() => progressForParticipant(m02Store, activeParticipantId), [m02Store, activeParticipantId])
  const m02ProgressPercent = useMemo(() => progressForM02(m02Progress, portalProgress.participantDirectory), [m02Progress, portalProgress.participantDirectory])
  const m02Score = useMemo(() => calculateM02Score(m02Progress, portalProgress.participantDirectory), [m02Progress, portalProgress.participantDirectory])
  const m03Progress = useMemo(() => m03ProgressForParticipant(m03Store, activeParticipantId), [m03Store, activeParticipantId])
  const m03ProgressPercent = useMemo(() => progressForM03(m03Progress, portalProgress.participantDirectory), [m03Progress, portalProgress.participantDirectory])
  const m03Score = useMemo(() => calculateM03Score(m03Progress, portalProgress.participantDirectory), [m03Progress, portalProgress.participantDirectory])
  const m03Passed = useMemo(() => latestM03AssessmentIsCurrent(m03Progress, portalProgress.participantDirectory), [m03Progress, portalProgress.participantDirectory])
  const m04Progress = useMemo(() => m04ProgressForParticipant(m04Store, activeParticipantId), [m04Store, activeParticipantId])
  const m03CurrentAssessmentId = m03Passed ? m03Progress.assessments.at(-1)?.assessmentId : undefined
  const m03CurrentRunId = m03Passed ? (m03Progress.v2 ?? m03Progress.v1)?.runId : undefined
  const m04SourceCurrent = useMemo(() => m04SourceIsCurrent(m04Progress, m03CurrentAssessmentId, m03CurrentRunId), [m04Progress, m03CurrentAssessmentId, m03CurrentRunId])
  const m04ProgressPercent = useMemo(() => progressForM04(m04Progress, portalProgress.participantDirectory), [m04Progress, portalProgress.participantDirectory])
  const m04Score = useMemo(() => calculateM04Score(m04Progress, portalProgress.participantDirectory), [m04Progress, portalProgress.participantDirectory])
  const m04Passed = useMemo(() => latestM04AssessmentIsCurrent(m04Progress, portalProgress.participantDirectory), [m04Progress, portalProgress.participantDirectory])
  const m04CurrentAssessmentId = m04Passed ? m04Progress.assessments.at(-1)?.assessmentId : undefined
  const m04CurrentPlanId = m04Passed ? m04Progress.confirmedPlan?.planId : undefined
  const m05Progress = useMemo(() => m05ProgressForParticipant(m05Store, activeParticipantId), [m05Store, activeParticipantId])
  const m05SourceCurrent = useMemo(() => m05SourceIsCurrent(m05Progress, m04CurrentAssessmentId, m04CurrentPlanId), [m05Progress, m04CurrentAssessmentId, m04CurrentPlanId])
  const m05ProgressPercent = useMemo(() => progressForM05(m05Progress, portalProgress.participantDirectory), [m05Progress, portalProgress.participantDirectory])
  const m05Score = useMemo(() => calculateM05Score(m05Progress, portalProgress.participantDirectory), [m05Progress, portalProgress.participantDirectory])
  const m05Passed = useMemo(() => latestM05AssessmentIsCurrent(m05Progress, portalProgress.participantDirectory), [m05Progress, portalProgress.participantDirectory])
  const m06Progress = useMemo(() => m06ProgressForParticipant(m06Store, activeParticipantId), [m06Store, activeParticipantId])
  const m06SourceCurrent = useMemo(() => Boolean(m04Passed && m06Progress.input.sourceKind === 'm04' && m06Progress.input.sourceAssessmentId === m04CurrentAssessmentId && m06Progress.input.sourcePlanId === m04CurrentPlanId), [m04Passed, m04CurrentAssessmentId, m04CurrentPlanId, m06Progress.input])
  const m06ProgressPercent = useMemo(() => progressForM06(m06Progress, portalProgress.participantDirectory), [m06Progress, portalProgress.participantDirectory])
  const m06Score = useMemo(() => calculateM06Score(m06Progress, portalProgress.participantDirectory), [m06Progress, portalProgress.participantDirectory])
  const m06Passed = useMemo(() => latestM06AssessmentIsCurrent(m06Progress, portalProgress.participantDirectory), [m06Progress, portalProgress.participantDirectory])
  const m07Progress = useMemo(() => m07ProgressForParticipant(m07Store, activeParticipantId), [m07Store, activeParticipantId])
  const m06CurrentAssessmentId = m06Passed ? m06Progress.assessmentHistory.at(-1)?.assessmentId : undefined
  const m06CurrentPackageId = m06Passed ? m06Progress.confirmedPackage?.packageId : undefined
  const m07SourceCurrent = useMemo(() => Boolean(m06Passed && m07Progress.input.sourceKind === 'm06' && m07Progress.input.sourceAssessmentId === m06CurrentAssessmentId && m07Progress.input.sourcePackageId === m06CurrentPackageId), [m06Passed, m06CurrentAssessmentId, m06CurrentPackageId, m07Progress.input])
  const m07ProgressPercent = useMemo(() => progressForM07(m07Progress, portalProgress.participantDirectory), [m07Progress, portalProgress.participantDirectory])
  const m07Score = useMemo(() => calculateM07Score(m07Progress, portalProgress.participantDirectory), [m07Progress, portalProgress.participantDirectory])
  const m07Passed = useMemo(() => latestM07AssessmentIsCurrent(m07Progress, portalProgress.participantDirectory), [m07Progress, portalProgress.participantDirectory])
  const m08Progress = useMemo(() => m08ProgressForParticipant(m08Store, activeParticipantId), [m08Store, activeParticipantId])
  const m08ProgressPercent = useMemo(() => progressForM08(m08Progress, portalProgress.participantDirectory), [m08Progress, portalProgress.participantDirectory])
  const m08Score = useMemo(() => calculateM08Score(m08Progress, portalProgress.participantDirectory), [m08Progress, portalProgress.participantDirectory])
  const m08Passed = useMemo(() => latestM08AssessmentIsCurrent(m08Progress, portalProgress.participantDirectory), [m08Progress, portalProgress.participantDirectory])
  const g01CurrentEvidence = useMemo<G01CurrentMemberEvidence>(() => {
    const correction = Object.values(m01Progress.corrections).find((item) => item.revisedContent.trim() && item.reason.trim())
    const annotation = correction ? m01Progress.annotations.find((item) => item.id === correction.annotationId) : undefined
    const targetParticipantId = m05Progress.peerReview.targetParticipantId
    const targetParticipantName = portalProgress.participantDirectory.participants.find((item) => item.participantId === targetParticipantId)?.name ?? ''
    const m05ReviewNeedsChange = [m05Progress.peerReview.answerCorrectness, m05Progress.peerReview.materialEvidence, m05Progress.peerReview.objectiveAlignment, m05Progress.peerReview.difficultySuitability].some((item) => item === '需调整' || item === '不一致')
    return {
      participantId: activeParticipantId,
      prerequisites: {
        M01: { complete: m01Score.passed, artifactIds: m01Score.passed ? ['M01:verification'] : [] },
        M02: { complete: m02Score.passed, artifactIds: m02Score.passed ? [m02Progress.run?.runId ?? `${activeParticipantId}:M02:rating`] : [] },
        M03: { complete: m03Passed, artifactIds: m03Passed && m03Progress.v1 && m03Progress.v2 ? [m03Progress.v1.runId, m03Progress.v2.runId] : [] },
        M04: { complete: m04Passed, artifactIds: m04Passed && m04Progress.confirmedPlan ? [m04Progress.confirmedPlan.planId] : [] },
        M05: { complete: m05Passed, artifactIds: m05Passed && m05Progress.confirmedPackage ? [m05Progress.confirmedPackage.packageId] : [] },
      },
      errorCorrection: correction && annotation ? { sourceTaskId: 'M01', sourceArtifactId: correction.annotationId, aiError: annotation.text, teacherCorrection: correction.revisedContent, correctionBasis: correction.reason } : undefined,
      crossCheck: m05Progress.peerReview.submitted ? { targetParticipantId, targetParticipantName, artifactType: '题目包', targetArtifactId: m05Progress.peerReview.targetArtifactId, finding: m05Progress.peerReview.suggestion, conclusion: m05ReviewNeedsChange ? '需修改' : '通过' } : undefined,
      contribution: m05Progress.peerReview.reviewerRole ? { role: m05Progress.peerReview.reviewerRole, contribution: `完成 M01—M05 当前有效成果；在 M05 对${targetParticipantName || '同组成员'}题目包完成答案、依据、目标与难度交叉核验。` } : undefined,
    }
  }, [activeParticipantId, m01Progress.annotations, m01Progress.corrections, m01Score.passed, m02Progress.run?.runId, m02Score.passed, m03Passed, m03Progress.v1, m03Progress.v2, m04Passed, m04Progress.confirmedPlan, m05Passed, m05Progress.confirmedPackage, m05Progress.peerReview, portalProgress.participantDirectory.participants])
  const g01Context = useMemo(() => buildG01GroupContext(portalProgress.participantDirectory, g01CurrentEvidence), [g01CurrentEvidence, portalProgress.participantDirectory])
  const g01Progress = useMemo(() => g01ProgressForGroup(g01Store, g01Context), [g01Context, g01Store])
  const g01ProgressPercent = useMemo(() => progressForG01(g01Progress), [g01Progress])
  const g01Passed = useMemo(() => g01IsCurrentlyPassed(g01Progress), [g01Progress])
  useEffect(() => {
    setG01Store((current) => {
      const synchronized = g01ProgressForGroup(current, g01Context)
      if (JSON.stringify(current.groups[g01Context.groupId]) === JSON.stringify(synchronized)) return current
      return { ...current, groups: { ...current.groups, [g01Context.groupId]: synchronized } }
    })
  }, [g01Context])
  const g02CurrentEvidence = useMemo<G02CurrentEvidence>(() => ({
    participantId: activeParticipantId,
    m06DeckArtifactId: m06Passed && m06Progress.confirmedPackage ? `${m06Progress.confirmedPackage.packageId}:deck` : undefined,
    m06VideoArtifactId: m06Passed && m06Progress.confirmedPackage ? `${m06Progress.confirmedPackage.packageId}:video` : undefined,
    m08WebArtifactId: m08Passed ? m08Progress.confirmedWebpage?.webpageId : undefined,
    firstElectiveId: portalProgress.electiveAssignments['day-2']?.[0],
  }), [activeParticipantId, m06Passed, m06Progress.confirmedPackage, m08Passed, m08Progress.confirmedWebpage, portalProgress.electiveAssignments])
  const g02Context = useMemo(() => buildG02GroupContext(portalProgress.participantDirectory, g02CurrentEvidence), [g02CurrentEvidence, portalProgress.participantDirectory])
  const g02Progress = useMemo(() => g02ProgressForGroup(g02Store, g02Context), [g02Context, g02Store])
  const g02ProgressPercent = useMemo(() => progressForG02(g02Progress), [g02Progress])
  const g02Passed = useMemo(() => latestG02AssessmentIsCurrent(g02Progress), [g02Progress])
  useEffect(() => {
    setG02Store((current) => {
      if (!current.groups[g02Context.groupId]) return current
      const synchronized = g02ProgressForGroup(current, g02Context)
      if (JSON.stringify(current.groups[g02Context.groupId]) === JSON.stringify(synchronized)) return current
      return { ...current, groups: { ...current.groups, [g02Context.groupId]: synchronized } }
    })
  }, [g02Context])
  const activeElectiveIds = useMemo(() => selectedElectiveIds(portalProgress.electiveAssignments), [portalProgress.electiveAssignments])
  const trainingSnapshot = useMemo(() => buildTrainingSnapshot({ taskProgress: {
    M01: { progressPercent: m01ProgressPercent, passed: m01Score.passed, score: m01Score.total },
    M02: { progressPercent: m02ProgressPercent, passed: m02Score.passed, score: m02Score.total },
    M03: { progressPercent: m03ProgressPercent, passed: m03Passed, score: m03Score.total },
    M04: { progressPercent: m04ProgressPercent, passed: m04Passed, score: m04Score.total },
    M05: { progressPercent: m05ProgressPercent, passed: m05Passed, score: m05Score.total },
    G01: { progressPercent: g01ProgressPercent, passed: g01Passed },
    M06: { progressPercent: m06ProgressPercent, passed: m06Passed, score: m06Score.total },
    M07: { progressPercent: m07ProgressPercent, passed: m07Passed, score: m07Score.total },
    M08: { progressPercent: m08ProgressPercent, passed: m08Passed, score: m08Score.total },
    G02: { progressPercent: g02ProgressPercent, passed: g02Passed },
  }, selectedElectiveIds: activeElectiveIds }), [m01ProgressPercent, m01Score, m02ProgressPercent, m02Score, m03ProgressPercent, m03Passed, m03Score.total, m04ProgressPercent, m04Passed, m04Score.total, m05ProgressPercent, m05Passed, m05Score.total, g01ProgressPercent, g01Passed, m06ProgressPercent, m06Passed, m06Score.total, m07ProgressPercent, m07Passed, m07Score.total, m08ProgressPercent, m08Passed, m08Score.total, g02ProgressPercent, g02Passed, activeElectiveIds])
  const taskArtifactSubmissions = useMemo<Partial<Record<TrainingTaskId, TaskArtifactSubmission>>>(() => ({
    M01: {
      taskId: 'M01',
      submittedAt: m01Score.passed ? m01Progress.updatedAt : undefined,
      artifacts: [
        { artifactId: 'M01:verification', name: 'AI 生成内容核验记录' },
        { artifactId: 'M01:corrections', name: '教师修正对照表' },
        { artifactId: 'M01:group-review', name: '小组核验清单' },
      ],
    },
    M02: {
      taskId: 'M02',
      submittedAt: m02Score.passed ? m02Progress.updatedAt : undefined,
      artifacts: [
        ...trainingTasks.M02.outputs.map((name, index) => ({ artifactId: `M02:output:${index + 1}`, name })),
      ],
    },
    M03: {
      taskId: 'M03',
      submittedAt: m03Passed ? m03Progress.assessments.at(-1)?.submittedAt : undefined,
      artifacts: trainingTasks.M03.outputs.map((name, index) => ({ artifactId: `M03:output:${index + 1}`, name })),
    },
    M04: {
      taskId: 'M04',
      submittedAt: m04Passed ? m04Progress.assessments.at(-1)?.submittedAt : undefined,
      artifacts: trainingTasks.M04.outputs.map((name, index) => ({ artifactId: `M04:output:${index + 1}`, name })),
    },
    M05: {
      taskId: 'M05',
      submittedAt: m05Passed ? m05Progress.assessments.at(-1)?.submittedAt : undefined,
      artifacts: trainingTasks.M05.outputs.map((name, index) => ({ artifactId: `M05:output:${index + 1}`, name })),
    },
    G01: {
      taskId: 'G01',
      submittedAt: g01Passed ? g01Progress.assessments.at(-1)?.submittedAt : undefined,
      artifacts: g01Passed ? g01Progress.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: item.capturedAt })) : [],
    },
    M06: {
      taskId: 'M06',
      submittedAt: m06Passed ? m06Progress.assessmentHistory.at(-1)?.assessedAt : undefined,
      artifacts: m06Passed && m06Progress.confirmedPackage ? [{ artifactId: m06Progress.confirmedPackage.packageId, name: trainingTasks.M06.outputs[0] }] : [],
    },
    M07: {
      taskId: 'M07',
      submittedAt: m07Passed ? m07Progress.assessmentHistory.at(-1)?.assessedAt : undefined,
      artifacts: m07Passed && m07Progress.confirmedDeliverable ? [{ artifactId: m07Progress.confirmedDeliverable.deliverableId, name: trainingTasks.M07.outputs[0] }] : [],
    },
    M08: {
      taskId: 'M08',
      submittedAt: m08Passed ? m08Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: m08Passed && m08Progress.confirmedWebpage ? [{ artifactId: m08Progress.confirmedWebpage.webpageId, name: trainingTasks.M08.outputs[0] }] : [],
    },
    G02: {
      taskId: 'G02',
      submittedAt: g02Passed ? g02Progress.assessments.at(-1)?.submittedAt : undefined,
      artifacts: g02Passed ? g02Progress.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: item.capturedAt })) : [],
    },
  }), [m01Progress.updatedAt, m01Score.passed, m02Progress.updatedAt, m02Score.passed, m03Passed, m03Progress.assessments, m04Passed, m04Progress.assessments, m05Passed, m05Progress.assessments, g01Passed, g01Progress.artifacts, g01Progress.assessments, m06Passed, m06Progress.assessmentHistory, m06Progress.confirmedPackage, m07Passed, m07Progress.assessmentHistory, m07Progress.confirmedDeliverable, m08Passed, m08Progress.assessments, m08Progress.confirmedWebpage, g02Passed, g02Progress.artifacts, g02Progress.assessments])

  function updateM01Progress(updater: (current: M01Progress) => M01Progress) {
    setM01Progress((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }))
  }

  function updateM02Progress(updater: (current: M02Progress) => M02Progress) {
    setM02Store((current) => updateParticipantM02Progress(current, activeParticipantId, updater))
  }

  function updateM03Progress(updater: (current: M03Progress) => M03Progress) {
    setM03Store((current) => updateParticipantM03Progress(current, activeParticipantId, updater))
  }

  function updateM04Progress(updater: (current: M04Progress) => M04Progress) {
    setM04Store((current) => updateParticipantM04Progress(current, activeParticipantId, updater))
  }

  function updateM05Progress(updater: (current: M05Progress) => M05Progress) {
    setM05Store((current) => updateParticipantM05Progress(current, activeParticipantId, updater))
  }

  function updateM06Progress(updater: (current: M06Progress) => M06Progress) {
    setM06Store((current) => updateParticipantM06Progress(current, activeParticipantId, updater))
  }

  function updateM07Progress(updater: (current: M07Progress) => M07Progress) {
    setM07Store((current) => updateParticipantM07Progress(current, activeParticipantId, updater))
  }

  function updateM08Progress(updater: (current: M08Progress) => M08Progress) {
    setM08Store((current) => updateParticipantM08Progress(current, activeParticipantId, updater))
  }

  function updateG01Progress(updater: (current: G01Progress) => G01Progress) {
    setG01Store((current) => updateGroupG01Progress(current, g01Context, updater))
  }

  function updateG02Progress(updater: (current: G02Progress) => G02Progress) {
    setG02Store((current) => updateGroupG02Progress(current, g02Context, updater))
  }

  function navigatePortal(route: PortalRoute) {
    setPortalProgress((current) => updatePortalRoute(current, route))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateM01(route: DemoRoute) {
    if (route === 'day1') {
      navigatePortal({ page: 'tasks', groupId: 'day-1' })
      return
    }
    updateM01Progress((current) => ({ ...current, route }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextM01(route: DemoRoute) {
    const index = m01RouteOrder.indexOf(route)
    navigateM01(m01RouteOrder[index + 1] ?? 'result')
  }

  function navigateM02(route: M02Route) {
    updateM02Progress((current) => ({ ...current, route }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextM02(route: M02Route) {
    const index = m02RouteOrder.indexOf(route)
    navigateM02(m02RouteOrder[index + 1] ?? 'result')
  }

  function canNavigateM02(route: M02Route) {
    if (route === 'overview') return true
    if (route === 'run') return true
    if (route === 'compliance') return isM02RunSucceeded(m02Progress)
    if (route === 'rating') return validateM02Compliance(m02Progress).valid
    if (route === 'peer-review') return validateM02Selection(m02Progress).valid && validateM02Correction(m02Progress).valid
    return validateM02PeerReview(m02Progress, portalProgress.participantDirectory).valid && validateM02GroupConclusion(m02Progress).valid && m02Progress.peerReview.submitted
  }

  function navigateM03(route: M03Route) {
    updateM03Progress((current) => ({ ...current, route }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextM03(route: M03Route) {
    const index = m03RouteOrder.indexOf(route)
    navigateM03(m03RouteOrder[index + 1] ?? 'result')
  }

  function canNavigateM03(route: M03Route) {
    if (route === 'overview' || route === 'design') return true
    if (route === 'v1') return validateM03PromptMessage(m03Progress.designMessage, m03Progress.design).valid
    if (route === 'iteration') return Boolean(m03Progress.v1)
    if (route === 'compare') return Boolean(m03Progress.v2) && validateM03Iteration(m03Progress).valid
    if (route === 'peer-review') return validateM03Comparison(m03Progress).valid && validateM03ProfessionalEvidence(m03Progress).valid
    return validateM03PeerReview(m03Progress, portalProgress.participantDirectory).valid
  }

  function navigateM04(route: M04Route) {
    updateM04Progress((current) => ({ ...current, route }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextM04(route: M04Route) {
    const index = m04RouteOrder.indexOf(route)
    navigateM04(m04RouteOrder[index + 1] ?? 'result')
  }

  function canNavigateM04(route: M04Route) {
    if (route === 'overview') return true
    if (route === 'input') return true
    if (route === 'draft') return validateM04Input(m04Progress).valid
    if (route === 'audit') return validateM04Draft(m04Progress).valid
    if (route === 'peer-review') return validateM04Audit(m04Progress).valid
    if (route === 'confirmation') return validateM04PeerReview(m04Progress, portalProgress.participantDirectory).valid
    return confirmedM04PlanIsCurrent(m04Progress, portalProgress.participantDirectory)
  }

  function navigateM05(route: M05Route) {
    updateM05Progress((current) => ({ ...current, route }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextM05(route: M05Route) {
    const index = m05RouteOrder.indexOf(route)
    navigateM05(m05RouteOrder[index + 1] ?? 'result')
  }

  function canNavigateM05(route: M05Route) {
    if (route === 'overview' || route === 'input') return true
    if (route === 'draft') return validateM05Input(m05Progress).valid
    if (route === 'audit') return validateM05Draft(m05Progress).valid
    if (route === 'revision') return validateM05Audits(m05Progress).valid
    if (route === 'peer-review') return validateM05Revisions(m05Progress).valid
    return confirmedM05PackageIsCurrent(m05Progress, portalProgress.participantDirectory)
  }

  function navigateM06(route: M06Route) {
    updateM06Progress((current) => ({ ...current, route }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextM06(route: M06Route) {
    const index = m06RouteOrder.indexOf(route)
    navigateM06(m06RouteOrder[index + 1] ?? 'result')
  }

  function canNavigateM06(route: M06Route) {
    if (route === 'overview' || route === 'input') return true
    if (route === 'deck') return validateM06Input(m06Progress).valid
    if (route === 'narration') return validateM06DeckAudit(m06Progress).valid
    if (route === 'avatar-video') return validateM06Narration(m06Progress).valid
    if (route === 'review-confirm') return validateM06Video(m06Progress).valid
    return validateM06PeerReview(m06Progress, portalProgress.participantDirectory).valid && confirmedM06PackageIsCurrent(m06Progress, portalProgress.participantDirectory)
  }

  function navigateM07(route: M07Route) { updateM07Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextM07(route: M07Route) { const index = m07RouteOrder.indexOf(route); navigateM07(m07RouteOrder[index + 1] ?? 'result') }
  function canNavigateM07(route: M07Route) {
    if (route === 'overview' || route === 'input') return true
    if (route === 'data-check') return validateM07Input(m07Progress).valid
    if (route === 'statistics') return validateM07DataCheck(m07Progress).valid
    if (route === 'analysis') return validateM07ManualChecks(m07Progress).valid
    if (route === 'layering-review') return validateM07Conclusions(m07Progress).valid
    return validateM07LayerTasks(m07Progress).valid && validateM07PeerReview(m07Progress, portalProgress.participantDirectory).valid && confirmedM07DeliverableIsCurrent(m07Progress, portalProgress.participantDirectory)
  }

  function navigateM08(route: M08Route) { updateM08Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextM08(route: M08Route) { const index = m08RouteOrder.indexOf(route); navigateM08(m08RouteOrder[index + 1] ?? 'result') }
  function canNavigateM08(route: M08Route) {
    if (route === 'overview' || route === 'input') return true
    if (route === 'draft') return validateM08Input(m08Progress).valid
    if (route === 'iterations') return validateM08Draft(m08Progress).valid
    if (route === 'browser-test') return validateM08Iterations(m08Progress).valid
    if (route === 'peer-confirm') return validateM08BrowserTest(m08Progress).valid
    return validateM08PeerTest(m08Progress, portalProgress.participantDirectory).valid && confirmedM08WebpageIsCurrent(m08Progress, portalProgress.participantDirectory)
  }

  function navigateG01(route: G01Route) {
    updateG01Progress((current) => ({ ...current, route }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextG01(route: G01Route) {
    const index = g01RouteOrder.indexOf(route)
    navigateG01(g01RouteOrder[index + 1] ?? 'assessment')
  }

  function canNavigateG01(route: G01Route) {
    return route === 'overview' || g01PrerequisitesComplete(g01Progress)
  }

  function navigateG02(route: G02Route) { updateG02Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextG02(route: G02Route) { const index = g02RouteOrder.indexOf(route); navigateG02(g02RouteOrder[index + 1] ?? 'assessment') }
  function canNavigateG02(route: G02Route) {
    if (route === 'overview' || route === 'directory' || route === 'assessment') return true
    if (route === 'showcase') return validateG02Directory(g02Progress).valid
    if (route === 'feedback') return validateG02Showcase(g02Progress).valid
    if (route === 'revision') return validateG02Feedback(g02Progress).valid
    return validateG02Revision(g02Progress).valid
  }

  function openTask(taskId: TrainingTaskId) {
    const workspace = taskWorkspaceRegistry[taskId]
    if (workspace?.workspaceId === 'm01' && m01Progress.route === 'day1') updateM01Progress((current) => ({ ...current, route: m01ProgressPercent > 0 ? 'answers' : 'overview' }))
    if (workspace?.workspaceId === 'm02' && m02Progress.route === 'overview' && m02ProgressPercent > 0) updateM02Progress((current) => ({ ...current, route: current.peerReview.submitted ? 'result' : validateM02Selection(current).valid && validateM02Correction(current).valid ? 'peer-review' : current.blindReviewSubmitted ? 'rating' : current.run ? 'compliance' : 'run' }))
    if (workspace?.workspaceId === 'm03' && m03Progress.route === 'overview' && m03ProgressPercent > 0) updateM03Progress((current) => ({ ...current, route: current.v2 ? 'compare' : current.v1 ? 'iteration' : 'design' }))
    if (workspace?.workspaceId === 'm04' && m04Progress.route === 'overview' && m04ProgressPercent > 0) updateM04Progress((current) => ({ ...current, route: current.confirmedPlan ? 'result' : current.peerReview.submitted ? 'confirmation' : current.draft ? 'audit' : 'input' }))
    if (workspace?.workspaceId === 'm05' && m05Progress.route === 'overview' && m05ProgressPercent > 0) updateM05Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : current.peerReview.submitted ? 'peer-review' : current.revisions.length >= 2 ? 'peer-review' : current.draft ? 'audit' : 'input' }))
    if (workspace?.workspaceId === 'm06' && m06Progress.route === 'overview' && m06ProgressPercent > 0) updateM06Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : current.videoPreview ? 'review-confirm' : current.draft ? 'deck' : 'input' }))
    if (workspace?.workspaceId === 'm07' && m07Progress.route === 'overview' && m07ProgressPercent > 0) updateM07Progress((current) => ({ ...current, route: current.confirmedDeliverable ? 'result' : current.draft ? 'statistics' : current.dataCheck.teacherConfirmed ? 'statistics' : 'input' }))
    if (workspace?.workspaceId === 'm08' && m08Progress.route === 'overview' && m08ProgressPercent > 0) updateM08Progress((current) => ({ ...current, route: current.confirmedWebpage ? 'result' : current.peerTest.submitted ? 'peer-confirm' : current.iterationRecords.length === 2 ? 'browser-test' : current.versions.length ? 'iterations' : 'input' }))
    if (workspace?.workspaceId === 'g02' && g02Progress.route === 'overview' && g02ProgressPercent > 0) updateG02Progress((current) => ({ ...current, route: current.assessments.length ? 'assessment' : current.feedbackConfirmed ? 'revision' : current.showcase.confirmed ? 'feedback' : current.directoryConfirmed ? 'showcase' : 'directory' }))
    navigatePortal({ page: 'task', taskId })
  }

  function resetM01() {
    if (!window.confirm('重置后将清除 M01 的全部本地填写进度，是否继续？')) return
    setM01Progress(clearProgress())
    setVerificationAnswerId('A')
    window.scrollTo({ top: 0 })
  }

  function resetM02() {
    if (!window.confirm('重置后将清除当前教师的 M02 运行、盲评、修正与共评数据，是否继续？')) return
    setM02Store((current) => clearParticipantM02Progress(current, activeParticipantId))
    setM02Running(false)
    window.scrollTo({ top: 0 })
  }

  function resetM03() {
    if (!window.confirm('重置后将清除当前教师的 M03 两版提示词、核验、互评与验收历史，是否继续？')) return
    setM03Store((current) => clearParticipantM03Progress(current, activeParticipantId))
    setM03Running(false)
    window.scrollTo({ top: 0 })
  }

  function resetM04() {
    if (!window.confirm('重置后将清除当前教师的 M04 输入、AI 草稿、人工审校、互评和验收历史，是否继续？')) return
    setM04Store((current) => clearParticipantM04Progress(current, activeParticipantId))
    setM04Running(false)
    window.scrollTo({ top: 0 })
  }

  function resetM05() {
    if (!window.confirm('重置后将清除当前教师的 M05 输入、AI 题目包、逐题审校、修订、互评和验收历史，是否继续？')) return
    setM05Store((current) => clearParticipantM05Progress(current, activeParticipantId))
    setM05Running(false)
    window.scrollTo({ top: 0 })
  }

  function resetM06() {
    if (!window.confirm('重置后将只清除当前教师的 M06 输入、课件、讲解稿、数字人视频、互评和验收历史，是否继续？')) return
    setM06Store((current) => clearParticipantM06Progress(current, activeParticipantId))
    setM06Running(false)
    setM06Rendering(false)
    window.scrollTo({ top: 0 })
  }

  function resetM07() {
    if (!window.confirm('重置后将只清除当前教师的 M07 课程情境、数据检查、统计复核、结论、分层任务、互评和验收历史，是否继续？')) return
    setM07Store((current) => clearParticipantM07Progress(current, activeParticipantId))
    setM07Running(false)
    window.scrollTo({ top: 0 })
  }

  function resetM08() {
    if (!window.confirm('重置后将只清除当前教师的 M08 输入、三版网页、浏览器测试、同组学生测试和验收历史，是否继续？')) return
    setM08Store((current) => clearParticipantM08Progress(current, activeParticipantId))
    setM08Running(false)
    window.scrollTo({ top: 0 })
  }

  function resetG01() {
    if (!window.confirm('重置后只清除当前小组的 G01 目录、核验、贡献和验收历史，是否继续？')) return
    setG01Store((current) => clearGroupG01Progress(current, g01Context.groupId))
    window.scrollTo({ top: 0 })
  }

  function resetG02() {
    if (!window.confirm('重置后只清除当前小组的 G02 目录、展示、跨组反馈修改、贡献和验收历史，是否继续？')) return
    setG02Store((current) => clearGroupG02Progress(current, g02Context.groupId))
    window.scrollTo({ top: 0 })
  }

  function resetAll() {
    if (!window.confirm('重置后将恢复示例培训人员名单，并清除选修选择、M01、全部教师的 M02—M08 进度和所有小组 G01、G02 验收数据，是否继续？')) return
    setM01Progress(clearProgress())
    setPortalProgress(clearPortalProgress())
    setM02Store(clearAllM02Progress())
    setM03Store(clearAllM03Progress())
    setM04Store(clearAllM04Progress())
    setM05Store(clearAllM05Progress())
    setM06Store(clearAllM06Progress())
    setM07Store(clearAllM07Progress())
    setM08Store(clearAllM08Progress())
    setG01Store(clearAllG01Progress())
    setG02Store(clearAllG02Progress())
    setVerificationAnswerId('A')
    window.scrollTo({ top: 0 })
  }

  function addAnnotation(answerId: AnswerId, selection: { start: number; end: number; text: string }, type: AnnotationType) {
    const annotation: TextAnnotation = { id: `${answerId}-${selection.start}-${Date.now()}`, answerId, start: selection.start, end: selection.end, text: selection.text, type, evidenceSource: '' }
    updateM01Progress((current) => ({ ...current, annotations: [...current.annotations, annotation] }))
  }

  function deleteAnnotation(annotationId: string) {
    updateM01Progress((current) => {
      const corrections = { ...current.corrections }; delete corrections[annotationId]
      const groupReview = current.groupReview.correctionAnnotationId === annotationId ? { ...current.groupReview, correctionAnnotationId: '', submitted: false } : current.groupReview
      return { ...current, annotations: current.annotations.filter((item) => item.id !== annotationId), corrections, groupReview }
    })
  }

  function updateAnnotation(annotationId: string, patch: Partial<TextAnnotation>) {
    updateM01Progress((current) => ({ ...current, annotations: current.annotations.map((item) => item.id === annotationId ? { ...item, ...patch } : item), groupReview: current.groupReview.correctionAnnotationId === annotationId ? { ...current.groupReview, submitted: false } : current.groupReview }))
  }

  function loadReferenceAnnotations(answerId: AnswerId, references: ReferenceAnnotation[]) {
    const loaded = references.map((reference, index) => referenceToAnnotation(answerId, reference, index)).filter(Boolean) as TextAnnotation[]
    updateM01Progress((current) => {
      const replacedIds = new Set(current.annotations.filter((item) => item.answerId === answerId).map((item) => item.id))
      const corrections = Object.fromEntries(Object.entries(current.corrections).filter(([id]) => !replacedIds.has(id)))
      const selectedReplaced = replacedIds.has(current.groupReview.correctionAnnotationId)
      return { ...current, annotations: [...current.annotations.filter((item) => item.answerId !== answerId), ...loaded], corrections, groupReview: selectedReplaced ? { ...current.groupReview, correctionAnnotationId: '', submitted: false } : current.groupReview }
    })
  }

  function updateCorrection(annotationId: string, patch: Partial<CorrectionRecord>) {
    updateM01Progress((current) => {
      const annotation = current.annotations.find((item) => item.id === annotationId)
      const fallbackProblem = annotation?.judgment === 'revise' ? '错误步骤' : annotation?.judgment === 'limit' ? '过度推断' : annotation?.type === 'citation' ? '无依据引用' : '编造内容'
      const existing = current.corrections[annotationId] ?? { annotationId, problemType: fallbackProblem, revisedContent: '', reason: '' }
      return { ...current, corrections: { ...current.corrections, [annotationId]: { ...existing, ...patch } }, groupReview: current.groupReview.correctionAnnotationId === annotationId ? { ...current.groupReview, submitted: false } : current.groupReview }
    })
  }

  function loadReferenceCorrections() {
    updateM01Progress((current) => {
      const corrections = { ...current.corrections }; let selectedCorrectionUpdated = false
      current.annotations.forEach((annotation) => {
        if (annotation.judgment !== 'revise' && annotation.judgment !== 'limit') return
        const answer = m01Answers.find((item) => item.id === annotation.answerId)
        const reference = answer?.referenceAnnotations.find((item) => item.text === annotation.text)
        if (!reference?.revisedContent || !reference.reason) return
        corrections[annotation.id] = { annotationId: annotation.id, problemType: reference.problemType ?? (annotation.judgment === 'revise' ? '错误步骤' : '过度推断'), revisedContent: reference.revisedContent, reason: reference.reason }
        if (current.groupReview.correctionAnnotationId === annotation.id) selectedCorrectionUpdated = true
      })
      return { ...current, corrections, groupReview: selectedCorrectionUpdated ? { ...current.groupReview, submitted: false } : current.groupReview }
    })
  }

  function updateCustomChecklist(patch: Partial<ChecklistItem>) {
    updateM01Progress((current) => {
      const existingIndex = current.checklist.findIndex((item) => !item.preset)
      const base: ChecklistItem = existingIndex >= 0 ? current.checklist[existingIndex] : { id: 'custom-8', checkItem: '', keyPoint: '', typicalHallucination: '', response: '', preset: false }
      const updated = { ...base, ...patch }
      const checklist = existingIndex >= 0 ? current.checklist.map((item, index) => index === existingIndex ? updated : item) : [...current.checklist, updated]
      return { ...current, checklist, groupReview: { ...current.groupReview, submitted: false } }
    })
  }

  async function runM02Models() {
    setM02Running(true)
    const initial = createInitialM02Progress()
    updateM02Progress(() => ({ ...initial, route: 'run', run: { runId: `pending-${Date.now()}`, status: 'running', startedAt: new Date().toISOString(), results: {} } }))
    try {
      const run = await localM02ModelRunner.run({ courseMaterial: JSON.stringify(m02CourseMaterial), prompt: m02LockedPrompt, participantId: activeParticipantId })
      updateM02Progress((current) => ({ ...current, run }))
    } catch (error) {
      updateM02Progress((current) => ({ ...current, run: { runId: `failed-${Date.now()}`, status: 'failed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), results: {}, error: error instanceof Error ? error.message : '运行失败' } }))
    } finally {
      setM02Running(false)
    }
  }

  async function submitM02BlindReview() {
    if (!window.confirm('提交后将锁定遵循检查和五维评分，并揭晓模型名称。是否提交？')) return
    if (!m02Progress.run) return
    const revealedModelNames = await localM02ModelRunner.reveal(m02Progress.run.runId)
    updateM02Progress((current) => ({ ...current, blindReviewSubmitted: true, revealedModelNames }))
  }

  async function runM03Version(version: M03Version) {
    const snapshot = version === 'v1' ? m03Progress.design : m03Progress.iterationDraft
    if (!snapshot) return
    setM03Running(true)
    try {
      const run = await localM03PromptRunner.run({ participantId: activeParticipantId, version, snapshot })
      updateM03Progress((current) => version === 'v1'
        ? { ...current, v1: run, design: structuredClone(run.snapshot), iterationVariable: undefined, iterationDraft: undefined, v2: undefined, comparison: { changeExplanation: '', suitabilityConclusion: '' }, verification: { v1: { paragraphId: '', materialEvidence: '', materialScope: '', objectiveAlignment: '', conclusion: '' }, v2: { paragraphId: '', materialEvidence: '', materialScope: '', objectiveAlignment: '', conclusion: '' } }, peerReview: { targetParticipantId: '', targetArtifactId: '', inputScopeClear: '', outputFormatClear: '', qualityStandardClear: '', suggestion: '', submitted: false }, assessmentModificationSummary: '' }
        : { ...current, v2: run, iterationDraft: structuredClone(run.snapshot), comparison: { changeExplanation: '', suitabilityConclusion: '' }, verification: { ...current.verification, v2: { paragraphId: '', materialEvidence: '', materialScope: '', objectiveAlignment: '', conclusion: '' } }, peerReview: { targetParticipantId: '', targetArtifactId: '', inputScopeClear: '', outputFormatClear: '', qualityStandardClear: '', suggestion: '', submitted: false }, assessmentModificationSummary: '' })
    } finally {
      setM03Running(false)
    }
  }

  function unlockM03Design() {
    if (!window.confirm('修改基础输入会清除 V1 之后的迭代、核验、互评和当前验收状态；历史验收记录会保留。是否继续？')) return
    updateM03Progress((current) => ({
      ...current, v1: undefined, iterationVariable: undefined, iterationDraft: undefined, v2: undefined,
      comparison: { changeExplanation: '', suitabilityConclusion: '' },
      verification: { v1: { paragraphId: '', materialEvidence: '', materialScope: '', objectiveAlignment: '', conclusion: '' }, v2: { paragraphId: '', materialEvidence: '', materialScope: '', objectiveAlignment: '', conclusion: '' } },
      peerReview: { targetParticipantId: '', targetArtifactId: '', inputScopeClear: '', outputFormatClear: '', qualityStandardClear: '', suggestion: '', submitted: false },
      assessmentModificationSummary: '', route: 'design',
    }))
  }

  function reuseM03ForM04() {
    const assessment = m03Progress.assessments.at(-1)
    const source = m03Progress.v2 ?? m03Progress.v1
    if (!m03Passed || !assessment || !source) return
    updateM04Progress((current) => ({
      ...current,
      input: {
        ...current.input,
        sourceM03AssessmentId: assessment.assessmentId,
        sourceM03RunId: source.runId,
        sourcePromptSummary: source.compiledPrompt,
        courseName: source.snapshot.courseName,
        lessonName: source.snapshot.lessonName,
        audience: source.snapshot.audience,
        studentFoundation: source.snapshot.studentFoundation,
        teachingObjective: source.snapshot.objective,
        duration: Math.min(90, Math.max(45, source.snapshot.duration)),
        materialName: source.snapshot.materialName,
        materialContent: source.snapshot.materialContent,
        materialScope: source.snapshot.materialScope,
        sourceConfirmed: true,
        rightsConfirmed: source.snapshot.rightsConfirmed,
        privacyConfirmed: source.snapshot.privacyConfirmed,
      },
      draft: undefined,
      confirmedPlan: undefined,
      assessmentModificationSummary: '',
    }))
  }

  async function runM04Draft() {
    setM04Running(true)
    try {
      const draft = await localM04LessonPlanRunner.run({ participantId: activeParticipantId, input: m04Progress.input })
      updateM04Progress((current) => ({ ...current, draft, confirmedPlan: undefined, assessmentModificationSummary: '' }))
    } finally { setM04Running(false) }
  }

  function reuseM04ForM05() {
    const assessment = m04Progress.assessments.at(-1)
    const plan = m04Progress.confirmedPlan
    if (!m04Passed || !assessment || !plan) return
    updateM05Progress((current) => ({
      ...current,
      input: {
        ...current.input,
        sourceM04AssessmentId: assessment.assessmentId,
        sourceM04PlanId: plan.planId,
        courseName: plan.input.courseName,
        lessonName: plan.input.lessonName,
        audience: plan.input.audience,
        studentFoundation: plan.input.studentFoundation,
        objectives: plan.objectives.map((item) => ({ id: item.id, content: item.content })),
        materialName: plan.input.materialName,
        materialContent: plan.input.materialContent,
        materialScope: plan.input.materialScope,
        sourceConfirmed: true,
        rightsConfirmed: plan.input.rightsConfirmed,
        privacyConfirmed: plan.input.privacyConfirmed,
      },
      draft: undefined,
      audits: {},
      revisions: [],
      confirmedPackage: undefined,
      assessmentModificationSummary: '',
    }))
  }

  async function runM05Draft() {
    setM05Running(true)
    try {
      const draft = await localM05QuestionRunner.run({ participantId: activeParticipantId, input: m05Progress.input })
      updateM05Progress((current) => ({ ...current, draft, audits: {}, revisions: [], confirmedPackage: undefined, assessmentModificationSummary: '' }))
    } finally { setM05Running(false) }
  }

  function reuseM04ForM06() {
    const assessment = m04Progress.assessments.at(-1)
    const plan = m04Progress.confirmedPlan
    if (!m04Passed || !assessment || !plan) return
    updateM06Progress((current) => ({
      ...current,
      input: {
        ...current.input,
        sourceKind: 'm04',
        sourceAssessmentId: assessment.assessmentId,
        sourcePlanId: plan.planId,
        sourceSummary: '复用 M04 当前有效教师确认版的课程情境、目标与已核验材料。',
        courseName: plan.input.courseName,
        lessonName: plan.input.lessonName,
        audience: plan.input.audience,
        studentFoundation: plan.input.studentFoundation,
        teachingObjectives: plan.objectives.slice(0, 3).map((item) => item.content),
        verifiedMaterial: plan.input.materialContent,
        sourceConfirmed: true,
        rightsConfirmed: plan.input.rightsConfirmed,
        privacyConfirmed: plan.input.privacyConfirmed,
      },
      draft: undefined,
      confirmedPackage: undefined,
    }))
  }

  async function runM06Draft() {
    setM06Running(true)
    try {
      const draft = await new LocalM06ContentRunner().run(m06Progress.input)
      updateM06Progress((current) => ({ ...current, draft, deckAudit: { ...current.deckAudit, checkedSlideIds: [], modifiedSlideId: '', modifiedField: '', originalContent: '', revisedContent: '', modificationBasis: '' }, narrationReview: { ...current.narrationReview, revisedNarration: draft.originalNarration, mappingConfirmed: false, terminologyChecked: false, teacherConfirmed: false }, videoPreview: undefined, confirmedPackage: undefined }))
    } finally { setM06Running(false) }
  }

  async function renderM06Video() {
    if (!m06Progress.draft) return
    setM06Rendering(true)
    try {
      const videoPreview = await new LocalM06ContentRunner().render(m06Progress.draft)
      updateM06Progress((current) => ({ ...current, videoPreview, confirmedPackage: undefined }))
    } finally { setM06Rendering(false) }
  }

  function reuseM06ForM07() {
    const assessment = m06Progress.assessmentHistory.at(-1)
    const packageResult = m06Progress.confirmedPackage
    if (!m06Passed || !assessment || !packageResult) return
    updateM07Progress((current) => ({
      ...current,
      input: { ...current.input, sourceKind: 'm06', sourceAssessmentId: assessment.assessmentId, sourcePackageId: packageResult.packageId, sourceSummary: '复用 M06 当前教师确认课件与微课的课程主题、目标和教学阶段，仅作为分层任务情境。', courseName: m06Progress.input.courseName, lessonName: m06Progress.input.lessonName, audience: `${m06Progress.input.audience}（匿名虚拟班级）`, teachingObjectives: [...m06Progress.input.teachingObjectives], teachingStage: `基于 M06“${m06Progress.input.teachingStage}”后的下一课次练习`, sourceConfirmed: true },
      dataCheck: { ...current.dataCheck }, draft: undefined, manualChecks: [], conclusionReviews: [], layerTasks: [], confirmedDeliverable: undefined,
    }))
  }

  async function runM07Analysis() {
    setM07Running(true)
    try {
      const result = await new LocalM07AnalysisRunner().run(m07Progress.input)
      updateM07Progress((current) => ({ ...current, draft: result.draft, layerTasks: result.layerTasks, manualChecks: [], conclusionReviews: [], confirmedDeliverable: undefined }))
    } finally { setM07Running(false) }
  }

  function replaceM08Input(input: M08Input) {
    const baseline = createInitialM08Progress()
    updateM08Progress((current) => ({ ...current, input, versions: [], iterationRecords: [], iterationDrafts: baseline.iterationDrafts, browserTest: baseline.browserTest, peerTest: baseline.peerTest, teacherConfirmation: baseline.teacherConfirmation, confirmedWebpage: undefined }))
  }

  function reuseM04ForM08() {
    const assessment = m04Progress.assessments.at(-1), plan = m04Progress.confirmedPlan
    if (!m04Passed || !assessment || !plan) return
    replaceM08Input({ ...createInitialM08Progress().input, courseTitle: plan.input.courseName, lessonTitle: plan.input.lessonName, audience: plan.input.audience, studentFoundation: plan.input.studentFoundation, learningObjective: plan.objectives.map((item) => item.content).join('；'), verifiedMaterial: plan.input.materialContent, sourceReferences: [{ sourceTaskId: 'M04', assessmentId: assessment.assessmentId, artifactId: plan.planId, summary: '复用 M04 当前教师确认版教案。' }], rightsConfirmed: plan.input.rightsConfirmed, privacyConfirmed: plan.input.privacyConfirmed })
  }

  function reuseM06ForM08() {
    const assessment = m06Progress.assessmentHistory.at(-1), packageResult = m06Progress.confirmedPackage
    if (!m06Passed || !assessment || !packageResult) return
    const deckMaterial = packageResult.finalDeck.map((slide) => `${slide.title}：${slide.coreMessage}。${slide.body}`).join('\n')
    replaceM08Input({ ...createInitialM08Progress().input, courseTitle: m06Progress.input.courseName, lessonTitle: m06Progress.input.lessonName, audience: m06Progress.input.audience, studentFoundation: m06Progress.input.studentFoundation, learningObjective: m06Progress.input.teachingObjectives.join('；'), verifiedMaterial: `${deckMaterial}\n教师审定讲解稿：${packageResult.finalNarration}`, sourceReferences: [{ sourceTaskId: 'M06', assessmentId: assessment.assessmentId, artifactId: packageResult.packageId, summary: '复用 M06 当前教师确认课件和讲解稿。' }], rightsConfirmed: m06Progress.input.rightsConfirmed, privacyConfirmed: m06Progress.input.privacyConfirmed })
  }

  async function runM08Draft() {
    setM08Running(true)
    try { const version = await new LocalM08WebRunner().generate(m08Progress.input); updateM08Progress((current) => ({ ...current, versions: [version], iterationRecords: [], confirmedWebpage: undefined })) }
    finally { setM08Running(false) }
  }

  async function iterateM08(round: 1 | 2) {
    const previous = m08Progress.versions.at(-1), instruction = m08Progress.iterationDrafts[round - 1]
    if (!previous || !instruction.trim() || m08Progress.iterationRecords.length !== round - 1) return
    setM08Running(true)
    try {
      const version = await new LocalM08WebRunner().iterate(m08Progress.input, previous, instruction, round)
      updateM08Progress((current) => ({ ...current, versions: [...current.versions, version], iterationRecords: [...current.iterationRecords, { round, instruction, beforeSummary: previous.interactionLabel, afterSummary: version.interactionLabel + `；${version.knowledgeCards[round - 1]?.content ?? ''}`, versionId: version.versionId, createdAt: new Date().toISOString() }], confirmedWebpage: undefined }))
    } finally { setM08Running(false) }
  }

  function downloadM08Html() {
    const version = m08Progress.versions.at(-1)
    if (!version) return
    const url = URL.createObjectURL(new Blob([version.html], { type: 'text/html;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'M08-interactive-teaching-web.html'; anchor.click(); URL.revokeObjectURL(url)
    updateM08Progress((current) => ({ ...current, browserTest: { ...current.browserTest, downloaded: true }, confirmedWebpage: undefined }))
  }

  const activeWorkspace = portalProgress.route.page === 'task' ? taskWorkspaceRegistry[portalProgress.route.taskId] : undefined
  if (activeWorkspace?.workspaceId === 'm01') {
    const activeRoute = m01Progress.route === 'day1' ? 'overview' : m01Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M01Overview onNext={() => nextM01('overview')} />; break
      case 'answers': page = <M01Answers askedAnswerIds={m01Progress.askedAnswerIds} onAsk={(id) => updateM01Progress((current) => ({ ...current, askedAnswerIds: current.askedAnswerIds.includes(id) ? current.askedAnswerIds : [...current.askedAnswerIds, id] }))} onAskAll={() => updateM01Progress((current) => ({ ...current, askedAnswerIds: ['A', 'B', 'C', 'D'] }))} onNext={() => nextM01('answers')} />; break
      case 'verification': page = <M01Verification activeAnswerId={verificationAnswerId} onActiveAnswerChange={setVerificationAnswerId} annotations={m01Progress.annotations} onAddAnnotation={addAnnotation} onDeleteAnnotation={deleteAnnotation} onUpdateAnnotation={updateAnnotation} onLoadReference={loadReferenceAnnotations} onNext={() => nextM01('verification')} />; break
      case 'corrections': page = <M01Corrections annotations={m01Progress.annotations} corrections={m01Progress.corrections} onUpdate={updateCorrection} onLoadReference={loadReferenceCorrections} onReviewAnswer={(answerId) => { setVerificationAnswerId(answerId); navigateM01('verification') }} onNext={() => nextM01('corrections')} />; break
      case 'group-review': page = <M01GroupReview review={m01Progress.groupReview} checklist={m01Progress.checklist} annotations={m01Progress.annotations} corrections={m01Progress.corrections} participantDirectory={portalProgress.participantDirectory} onUpdateReview={(patch) => updateM01Progress((current) => ({ ...current, groupReview: { ...current.groupReview, ...patch, submitted: patch.submitted ?? false } }))} onUpdateCustomChecklist={updateCustomChecklist} onSubmit={() => updateM01Progress((current) => ({ ...current, groupReview: { ...current.groupReview, submitted: true } }))} onNext={() => nextM01('group-review')} />; break
      case 'result': page = <M01Result progress={m01Progress} result={m01Score} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM01} onReset={resetM01} />; break
      default: page = <M01Overview onNext={() => nextM01('overview')} />
    }
    const task = trainingTasks.M01
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m01ShellSteps} progressPercent={m01ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM01} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-1' })} onReset={resetM01}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm02') {
    const activeRoute = m02Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M02Overview onNext={() => nextM02('overview')} />; break
      case 'run': page = <M02Workbench progress={m02Progress} running={m02Running} onRun={runM02Models} onNext={() => nextM02('run')} />; break
      case 'compliance': page = <M02CompliancePage progress={m02Progress} onUpdate={(modelId: M02ModelId, dimension: M02ComplianceDimension, value: M02ComplianceValue) => updateM02Progress((current) => current.blindReviewSubmitted ? current : ({ ...current, compliance: { ...current.compliance, [modelId]: { ...current.compliance[modelId], [dimension]: value } } }))} onNext={() => nextM02('compliance')} />; break
      case 'rating': page = <M02RatingPage progress={m02Progress} onUpdate={(modelId: M02ModelId, dimension: M02RatingDimension, patch: Partial<M02RatingEvidence>) => updateM02Progress((current) => ({ ...current, ratings: { ...current.ratings, [modelId]: { ...current.ratings[modelId], [dimension]: { paragraphId: '', reason: '', ...current.ratings[modelId]?.[dimension], ...patch } } } }))} onSubmit={submitM02BlindReview} onSelectModel={(selectedModelId) => updateM02Progress((current) => ({ ...current, selectedModelId, selectionDecision: { evidenceDimensions: [], comparedModelId: m02ModelIds.find((id) => id !== selectedModelId), conclusion: '' }, correction: { paragraphId: '', revisedContent: '', reason: '' }, peerReview: { ...current.peerReview, submitted: false } }))} onUpdateDecision={(patch: Partial<M02SelectionDecision>) => updateM02Progress((current) => ({ ...current, selectionDecision: { ...current.selectionDecision, ...patch }, peerReview: { ...current.peerReview, submitted: false } }))} onUpdateCorrection={(patch: Partial<M02CorrectionRecord>) => updateM02Progress((current) => ({ ...current, correction: { ...current.correction, ...patch }, peerReview: { ...current.peerReview, submitted: false } }))} onNext={() => nextM02('rating')} />; break
      case 'peer-review': page = <M02PeerReviewPage progress={m02Progress} directory={portalProgress.participantDirectory} onUpdateReview={(patch: Partial<M02PeerReview>) => updateM02Progress((current) => ({ ...current, peerReview: { ...current.peerReview, ...patch, submitted: patch.submitted ?? false } }))} onUpdateConclusion={(patch: Partial<M02GroupConclusion>) => updateM02Progress((current) => ({ ...current, groupConclusion: { ...current.groupConclusion, ...patch }, peerReview: { ...current.peerReview, submitted: false } }))} onSubmit={() => updateM02Progress((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true } }))} onNext={() => nextM02('peer-review')} />; break
      case 'result': page = <M02ResultPage progress={m02Progress} result={m02Score} directory={portalProgress.participantDirectory} onNavigate={navigateM02} onReset={resetM02} />; break
      default: page = <M02Overview onNext={() => nextM02('overview')} />
    }
    const task = trainingTasks.M02
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m02ShellSteps} progressPercent={m02ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM02} canNavigate={canNavigateM02} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-1' })} onReset={resetM02}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm03') {
    const activeRoute = m03Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M03Overview onNext={() => nextM03('overview')} />; break
      case 'design': page = <M03DesignPage progress={m03Progress} onUpdate={(patch: Partial<M03PromptSnapshot>) => updateM03Progress((current) => current.v1 ? current : ({ ...current, design: { ...current.design, ...patch }, assessmentModificationSummary: '' }))} onUpdateMessage={(designMessage, design) => updateM03Progress((current) => current.v1 ? current : ({ ...current, designMessage, design, assessmentModificationSummary: '' }))} onUnlock={unlockM03Design} onNext={() => nextM03('design')} />; break
      case 'v1': page = <M03V1Page progress={m03Progress} running={m03Running} onRun={() => runM03Version('v1')} onNext={() => nextM03('v1')} />; break
      case 'iteration': page = <M03IterationPage progress={m03Progress} running={m03Running} onSelectVariable={(iterationVariable: M03IterationVariable) => updateM03Progress((current) => current.v2 || !current.v1 ? current : ({ ...current, iterationVariable, iterationDraft: structuredClone(current.v1.snapshot), assessmentModificationSummary: '' }))} onUpdateDraft={(patch: Partial<M03PromptSnapshot>) => updateM03Progress((current) => current.v2 || !current.iterationDraft ? current : ({ ...current, iterationDraft: { ...current.iterationDraft, ...patch }, assessmentModificationSummary: '' }))} onRun={() => runM03Version('v2')} onNext={() => nextM03('iteration')} />; break
      case 'compare': page = <M03ComparePage progress={m03Progress} onUpdateComparison={(patch) => updateM03Progress((current) => ({ ...current, comparison: { ...current.comparison, ...patch }, assessmentModificationSummary: '' }))} onUpdateVerification={(version: M03Version, patch: Partial<M03VerificationRecord>) => updateM03Progress((current) => ({ ...current, verification: { ...current.verification, [version]: { ...current.verification[version], ...patch } }, assessmentModificationSummary: '' }))} onNext={() => nextM03('compare')} />; break
      case 'peer-review': page = <M03PeerReviewPage progress={m03Progress} directory={portalProgress.participantDirectory} onUpdate={(patch: Partial<M03PeerReview>) => updateM03Progress((current) => ({ ...current, peerReview: { ...current.peerReview, ...patch, submitted: patch.submitted ?? false }, assessmentModificationSummary: '' }))} onSubmit={() => updateM03Progress((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true }, assessmentModificationSummary: '' }))} onNext={() => nextM03('peer-review')} />; break
      case 'result': page = <M03ResultPage progress={m03Progress} result={m03Score} directory={portalProgress.participantDirectory} onNavigate={navigateM03} onSubmitAssessment={() => updateM03Progress((current) => ({ ...current, assessments: [...current.assessments, createM03Assessment(current, portalProgress.participantDirectory)], assessmentModificationSummary: '' }))} onUpdateModificationSummary={(assessmentModificationSummary) => updateM03Progress((current) => ({ ...current, assessmentModificationSummary }))} onReset={resetM03} />; break
      default: page = <M03Overview onNext={() => nextM03('overview')} />
    }
    const task = trainingTasks.M03
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m03ShellSteps} progressPercent={m03ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM03} canNavigate={canNavigateM03} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-1' })} onReset={resetM03}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm04') {
    const activeRoute = m04Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M04Overview onNext={() => nextM04('overview')} />; break
      case 'input': page = <M04InputPage progress={m04Progress} m03Passed={m03Passed} sourceCurrent={m04SourceCurrent} onReuseM03={reuseM03ForM04} onUpdate={(patch: Partial<M04InputSnapshot>) => updateM04Progress((current) => ({ ...current, input: { ...current.input, ...patch }, draft: undefined, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onNext={() => nextM04('input')} />; break
      case 'draft': page = <M04DraftPage progress={m04Progress} running={m04Running} onRun={runM04Draft} onNext={() => nextM04('draft')} />; break
      case 'audit': page = <M04AuditPage progress={m04Progress} onObjectiveCheck={(id, checked) => updateM04Progress((current) => ({ ...current, audit: { ...current.audit, objectiveChecks: { ...current.audit.objectiveChecks, [id]: checked } }, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onActivityCheck={(id, value) => updateM04Progress((current) => ({ ...current, audit: { ...current.audit, activityChecks: { ...current.audit.activityChecks, [id]: value } }, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onUpdateFlags={(patch) => updateM04Progress((current) => ({ ...current, audit: { ...current.audit, ...patch }, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onUpdateCorrection={(type: M04CorrectionType, patch: Partial<M04CorrectionRecord>) => updateM04Progress((current) => ({ ...current, audit: { ...current.audit, corrections: { ...current.audit.corrections, [type]: { ...current.audit.corrections[type], ...patch } } }, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onNext={() => nextM04('audit')} />; break
      case 'peer-review': page = <M04PeerReviewPage progress={m04Progress} directory={portalProgress.participantDirectory} onUpdate={(patch: Partial<M04PeerReview>) => updateM04Progress((current) => ({ ...current, peerReview: { ...current.peerReview, ...patch, submitted: patch.submitted ?? false }, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onSubmit={() => updateM04Progress((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true }, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onNext={() => nextM04('peer-review')} />; break
      case 'confirmation': page = <M04ConfirmationPage progress={m04Progress} directory={portalProgress.participantDirectory} onUpdate={(patch) => updateM04Progress((current) => ({ ...current, confirmation: { ...current.confirmation, ...patch }, confirmedPlan: undefined, assessmentModificationSummary: '' }))} onConfirm={() => updateM04Progress((current) => ({ ...current, confirmedPlan: createConfirmedM04Plan(current, portalProgress.participantDirectory), assessmentModificationSummary: '' }))} onNext={() => nextM04('confirmation')} />; break
      case 'result': page = <M04ResultPage progress={m04Progress} result={m04Score} directory={portalProgress.participantDirectory} onNavigate={navigateM04} onSubmitAssessment={() => updateM04Progress((current) => ({ ...current, assessments: [...current.assessments, createM04Assessment(current, portalProgress.participantDirectory)], assessmentModificationSummary: '' }))} onUpdateModificationSummary={(assessmentModificationSummary) => updateM04Progress((current) => ({ ...current, assessmentModificationSummary }))} onReset={resetM04} />; break
      default: page = <M04Overview onNext={() => nextM04('overview')} />
    }
    const task = trainingTasks.M04
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m04ShellSteps} progressPercent={m04ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM04} canNavigate={canNavigateM04} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-1' })} onReset={resetM04}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm05') {
    const activeRoute = m05Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M05Overview onNext={() => nextM05('overview')} />; break
      case 'input': page = <M05InputPage progress={m05Progress} m04Passed={m04Passed} sourceCurrent={m05SourceCurrent} onReuseM04={reuseM04ForM05} onUpdate={(patch: Partial<M05InputSnapshot>) => updateM05Progress((current) => ({ ...current, input: { ...current.input, ...patch }, draft: undefined, audits: {}, revisions: [], confirmedPackage: undefined, assessmentModificationSummary: '' }))} onNext={() => nextM05('input')} />; break
      case 'draft': page = <M05DraftPage progress={m05Progress} running={m05Running} onRun={runM05Draft} onNext={() => nextM05('draft')} />; break
      case 'audit': page = <M05AuditPage progress={m05Progress} onUpdate={(questionId: string, patch: Partial<M05QuestionAudit>) => updateM05Progress((current) => ({ ...current, audits: { ...current.audits, [questionId]: { ...current.audits[questionId], ...patch } }, confirmedPackage: undefined, assessmentModificationSummary: '' }))} onNext={() => nextM05('audit')} />; break
      case 'revision': page = <M05RevisionPage progress={m05Progress} onUpdate={(slot: number, record: M05RevisionRecord) => updateM05Progress((current) => { const revisions = [...current.revisions]; revisions[slot] = record; return { ...current, revisions, confirmedPackage: undefined, assessmentModificationSummary: '' } })} onNext={() => nextM05('revision')} />; break
      case 'peer-review': page = <M05PeerReviewPage progress={m05Progress} directory={portalProgress.participantDirectory} onUpdateReview={(patch: Partial<M05PeerReview>) => updateM05Progress((current) => ({ ...current, peerReview: { ...current.peerReview, ...patch, submitted: patch.submitted ?? false }, confirmedPackage: undefined, assessmentModificationSummary: '' }))} onSubmit={() => updateM05Progress((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true }, confirmedPackage: undefined, assessmentModificationSummary: '' }))} onUpdateConfirmation={(patch) => updateM05Progress((current) => ({ ...current, confirmation: { ...current.confirmation, ...patch }, confirmedPackage: undefined, assessmentModificationSummary: '' }))} onConfirm={() => updateM05Progress((current) => ({ ...current, confirmedPackage: createConfirmedM05Package(current, portalProgress.participantDirectory), assessmentModificationSummary: '' }))} onNext={() => nextM05('peer-review')} />; break
      case 'result': page = <M05ResultPage progress={m05Progress} result={m05Score} directory={portalProgress.participantDirectory} onNavigate={navigateM05} onSubmitAssessment={() => updateM05Progress((current) => ({ ...current, assessments: [...current.assessments, createM05Assessment(current, portalProgress.participantDirectory)], assessmentModificationSummary: '' }))} onUpdateModificationSummary={(assessmentModificationSummary) => updateM05Progress((current) => ({ ...current, assessmentModificationSummary }))} onReset={resetM05} />; break
      default: page = <M05Overview onNext={() => nextM05('overview')} />
    }
    const task = trainingTasks.M05
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m05ShellSteps} progressPercent={m05ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM05} canNavigate={canNavigateM05} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-1' })} onReset={resetM05}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm06') {
    const activeRoute = m06Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M06Overview onNext={() => nextM06('overview')} />; break
      case 'input': page = <M06InputPage progress={m06Progress} m04Passed={m04Passed} sourceCurrent={m06SourceCurrent} onReuseM04={reuseM04ForM06} onUpdate={(patch: Partial<M06Input>) => updateM06Progress((current) => ({ ...current, input: { ...current.input, ...patch }, draft: undefined, videoPreview: undefined, confirmedPackage: undefined }))} onNext={() => nextM06('input')} />; break
      case 'deck': page = <M06DeckPage progress={m06Progress} running={m06Running} onRun={runM06Draft} onUpdateAudit={(patch: Partial<M06DeckAudit>) => updateM06Progress((current) => ({ ...current, deckAudit: { ...current.deckAudit, ...patch }, videoPreview: undefined, confirmedPackage: undefined }))} onNext={() => nextM06('deck')} />; break
      case 'narration': page = <M06NarrationPage progress={m06Progress} onUpdate={(patch) => updateM06Progress((current) => ({ ...current, narrationReview: { ...current.narrationReview, ...patch }, videoPreview: undefined, confirmedPackage: undefined }))} onNext={() => nextM06('narration')} />; break
      case 'avatar-video': page = <M06AvatarVideoPage progress={m06Progress} rendering={m06Rendering} onUpdate={(patch) => updateM06Progress((current) => ({ ...current, avatarConfig: { ...current.avatarConfig, ...patch }, videoPreview: undefined, confirmedPackage: undefined }))} onRender={renderM06Video} onNext={() => nextM06('avatar-video')} />; break
      case 'review-confirm': page = <M06ReviewConfirmPage progress={m06Progress} directory={portalProgress.participantDirectory} onUpdateReview={(patch: Partial<M06PeerReview>) => updateM06Progress((current) => ({ ...current, peerReview: { ...current.peerReview, ...patch, submitted: patch.submitted ?? false }, confirmedPackage: undefined }))} onSubmitReview={() => updateM06Progress((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true }, confirmedPackage: undefined }))} onUpdateConfirmation={(patch) => updateM06Progress((current) => ({ ...current, teacherConfirmation: { ...current.teacherConfirmation, ...patch }, confirmedPackage: undefined }))} onConfirm={() => updateM06Progress((current) => ({ ...current, confirmedPackage: createConfirmedM06Package(current, portalProgress.participantDirectory) }))} onNext={() => nextM06('review-confirm')} />; break
      case 'result': page = <M06ResultPage progress={m06Progress} result={m06Score} directory={portalProgress.participantDirectory} onNavigate={navigateM06} onSubmitAssessment={() => updateM06Progress((current) => ({ ...current, assessmentHistory: [...current.assessmentHistory, createM06Assessment(current, portalProgress.participantDirectory)] }))} onReset={resetM06} />; break
      default: page = <M06Overview onNext={() => nextM06('overview')} />
    }
    const task = trainingTasks.M06
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m06ShellSteps} progressPercent={m06ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM06} canNavigate={canNavigateM06} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-2' })} onReset={resetM06}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm07') {
    const activeRoute = m07Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M07Overview onNext={() => nextM07('overview')} />; break
      case 'input': page = <M07InputPage progress={m07Progress} m06Passed={m06Passed} sourceCurrent={m07SourceCurrent} onReuseM06={reuseM06ForM07} onUpdate={(patch: Partial<M07Input>) => updateM07Progress((current) => ({ ...current, input: { ...current.input, ...patch }, draft: undefined, manualChecks: [], conclusionReviews: [], layerTasks: [], confirmedDeliverable: undefined }))} onNext={() => nextM07('input')} />; break
      case 'data-check': page = <M07DataCheckPage progress={m07Progress} onUpdate={(patch: Partial<M07DataCheck>) => updateM07Progress((current) => ({ ...current, dataCheck: { ...current.dataCheck, ...patch }, draft: undefined, manualChecks: [], conclusionReviews: [], layerTasks: [], confirmedDeliverable: undefined }))} onNext={() => nextM07('data-check')} />; break
      case 'statistics': page = <M07StatisticsPage progress={m07Progress} running={m07Running} onRun={runM07Analysis} onUpdateChecks={(manualChecks: M07ManualCheck[]) => updateM07Progress((current) => ({ ...current, manualChecks, confirmedDeliverable: undefined }))} onNext={() => nextM07('statistics')} />; break
      case 'analysis': page = <M07AnalysisPage progress={m07Progress} onUpdateReviews={(conclusionReviews: M07ConclusionReview[]) => updateM07Progress((current) => ({ ...current, conclusionReviews, confirmedDeliverable: undefined }))} onNext={() => nextM07('analysis')} />; break
      case 'layering-review': page = <M07LayerReviewPage progress={m07Progress} directory={portalProgress.participantDirectory} onUpdateTask={(index, patch) => updateM07Progress((current) => { const layerTasks = [...current.layerTasks]; layerTasks[index] = { ...layerTasks[index], ...patch }; return { ...current, layerTasks, confirmedDeliverable: undefined } })} onUpdatePeer={(patch: Partial<M07PeerReview>) => updateM07Progress((current) => ({ ...current, peerReview: { ...current.peerReview, ...patch, submitted: patch.submitted ?? false }, confirmedDeliverable: undefined }))} onSubmitPeer={() => updateM07Progress((current) => ({ ...current, peerReview: { ...current.peerReview, submitted: true }, confirmedDeliverable: undefined }))} onUpdateConfirmation={(patch) => updateM07Progress((current) => ({ ...current, teacherConfirmation: { ...current.teacherConfirmation, ...patch }, confirmedDeliverable: undefined }))} onConfirm={() => updateM07Progress((current) => ({ ...current, confirmedDeliverable: createConfirmedM07Deliverable(current, portalProgress.participantDirectory) }))} onNext={() => nextM07('layering-review')} />; break
      case 'result': page = <M07ResultPage progress={m07Progress} result={m07Score} directory={portalProgress.participantDirectory} onNavigate={navigateM07} onSubmitAssessment={() => updateM07Progress((current) => ({ ...current, assessmentHistory: [...current.assessmentHistory, createM07Assessment(current, portalProgress.participantDirectory)] }))} onReset={resetM07} />; break
      default: page = <M07Overview onNext={() => nextM07('overview')} />
    }
    const task = trainingTasks.M07
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m07ShellSteps} progressPercent={m07ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM07} canNavigate={canNavigateM07} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-2' })} onReset={resetM07}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm08') {
    const activeRoute = m08Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M08Overview onNext={() => nextM08('overview')} />; break
      case 'input': page = <M08InputPage progress={m08Progress} m04Available={m04Passed} m06Available={m06Passed} onUseBaseline={() => replaceM08Input(createInitialM08Progress().input)} onReuseM04={reuseM04ForM08} onReuseM06={reuseM06ForM08} onUpdate={(patch: Partial<M08Input>) => updateM08Progress((current) => ({ ...current, input: { ...current.input, ...patch }, versions: [], iterationRecords: [], browserTest: createInitialM08Progress().browserTest, peerTest: createInitialM08Progress().peerTest, teacherConfirmation: createInitialM08Progress().teacherConfirmation, confirmedWebpage: undefined }))} onNext={() => nextM08('input')} />; break
      case 'draft': page = <M08DraftPage progress={m08Progress} running={m08Running} onRun={runM08Draft} onNext={() => nextM08('draft')} />; break
      case 'iterations': page = <M08IterationsPage progress={m08Progress} running={m08Running} onUpdateDraft={(round, value) => updateM08Progress((current) => { const drafts: [string,string] = [...current.iterationDrafts]; drafts[round - 1] = value; return { ...current, iterationDrafts: drafts, confirmedWebpage: undefined } })} onIterate={iterateM08} onNext={() => nextM08('iterations')} />; break
      case 'browser-test': page = <M08BrowserTestPage progress={m08Progress} onDownload={downloadM08Html} onUpdate={(patch: Partial<M08BrowserTest>) => updateM08Progress((current) => ({ ...current, browserTest: { ...current.browserTest, ...patch }, confirmedWebpage: undefined }))} onNext={() => nextM08('browser-test')} />; break
      case 'peer-confirm': page = <M08PeerConfirmPage progress={m08Progress} directory={portalProgress.participantDirectory} onUpdatePeer={(patch: Partial<M08PeerTest>) => updateM08Progress((current) => ({ ...current, peerTest: { ...current.peerTest, ...patch, submitted: patch.submitted ?? false }, confirmedWebpage: undefined }))} onSubmitPeer={() => updateM08Progress((current) => ({ ...current, peerTest: { ...current.peerTest, submitted: true }, confirmedWebpage: undefined }))} onUpdateConfirmation={(patch) => updateM08Progress((current) => ({ ...current, teacherConfirmation: { ...current.teacherConfirmation, ...patch }, confirmedWebpage: undefined }))} onConfirm={() => updateM08Progress((current) => ({ ...current, confirmedWebpage: createConfirmedM08Webpage(current, portalProgress.participantDirectory) }))} onNext={() => nextM08('peer-confirm')} />; break
      case 'result': page = <M08ResultPage progress={m08Progress} result={m08Score} directory={portalProgress.participantDirectory} onNavigate={navigateM08} onSubmitAssessment={() => updateM08Progress((current) => ({ ...current, assessments: [...current.assessments, createM08Assessment(current, portalProgress.participantDirectory)] }))} onReset={resetM08} />; break
      default: page = <M08Overview onNext={() => nextM08('overview')} />
    }
    const task = trainingTasks.M08
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m08ShellSteps} progressPercent={m08ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM08} canNavigate={canNavigateM08} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-2' })} onReset={resetM08}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'g01') {
    const activeRoute = g01Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <G01Overview progress={g01Progress} onNext={() => nextG01('overview')} />; break
      case 'directory': page = <G01DirectoryPage progress={g01Progress} onNext={() => nextG01('directory')} />; break
      case 'errors': page = <G01ErrorsPage progress={g01Progress} onUpdate={(participantId: string, patch: Partial<G01ErrorCorrection>) => updateG01Progress((current) => ({ ...current, errorCorrections: current.errorCorrections.map((item) => item.participantId === participantId ? { ...item, ...patch } : item), artifacts: [] }))} onNext={() => nextG01('errors')} />; break
      case 'cross-checks': page = <G01CrossChecksPage progress={g01Progress} onUpdate={(participantId: string, patch: Partial<G01CrossCheck>) => updateG01Progress((current) => ({ ...current, crossChecks: current.crossChecks.map((item) => item.reviewerParticipantId === participantId ? { ...item, ...patch } : item), artifacts: [] }))} onNext={() => nextG01('cross-checks')} />; break
      case 'checklist': page = <G01ChecklistPage progress={g01Progress} onUpdateChecklist={(id: string, patch: Partial<G01ChecklistItem>) => updateG01Progress((current) => ({ ...current, checklist: current.checklist.map((item) => item.id === id ? { ...item, ...patch } : item), artifacts: [] }))} onAddChecklist={() => updateG01Progress((current) => ({ ...current, checklist: [...current.checklist, { id: `g01-check-${Date.now()}`, category: '事实', checkItem: '', evidence: '', handling: '' }], artifacts: [] }))} onRemoveChecklist={(id) => updateG01Progress((current) => ({ ...current, checklist: current.checklist.filter((item) => item.id !== id), artifacts: [] }))} onUpdateContribution={(participantId: string, patch: Partial<G01Contribution>) => updateG01Progress((current) => ({ ...current, contributions: current.contributions.map((item) => item.participantId === participantId ? { ...item, ...patch } : item), artifacts: [] }))} onNext={() => nextG01('checklist')} />; break
      case 'assessment': page = <G01AssessmentPage progress={g01Progress} onSubmit={() => updateG01Progress((current) => createG01Assessment(current, activeParticipant?.name ?? '当前小组'))} onUpdateModificationSummary={(assessmentModificationSummary) => updateG01Progress((current) => ({ ...current, assessmentModificationSummary }))} onReset={resetG01} />; break
      default: page = <G01Overview progress={g01Progress} onNext={() => nextG01('overview')} />
    }
    const task = trainingTasks.G01
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '阶段验收' }} steps={g01ShellSteps} progressPercent={g01ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateG01} canNavigate={canNavigateG01} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-1' })} onReset={resetG01}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'g02') {
    const activeRoute = g02Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <G02Overview groupName={g02Progress.groupName} onNext={() => nextG02('overview')} />; break
      case 'directory': page = <G02DirectoryPage progress={g02Progress} onConfirm={(directoryConfirmed) => updateG02Progress((current) => ({ ...current, directoryConfirmed, artifacts: [] }))} onNext={() => nextG02('directory')} />; break
      case 'showcase': page = <G02ShowcasePage progress={g02Progress} onUpdate={(patch: Partial<G02Showcase>) => updateG02Progress((current) => ({ ...current, showcase: { ...current.showcase, ...patch }, artifacts: [] }))} onNext={() => nextG02('showcase')} />; break
      case 'feedback': page = <G02FeedbackPage progress={g02Progress} onConfirm={(feedbackConfirmed) => updateG02Progress((current) => ({ ...current, feedbackConfirmed, artifacts: [] }))} onNext={() => nextG02('feedback')} />; break
      case 'revision': page = <G02RevisionPage progress={g02Progress} onUpdateRevision={(patch: Partial<G02Revision>) => updateG02Progress((current) => ({ ...current, revision: { ...current.revision, ...patch }, artifacts: [] }))} onUpdateContribution={(participantId: string, patch: Partial<G02Contribution>) => updateG02Progress((current) => ({ ...current, contributions: current.contributions.map((item) => item.participantId === participantId ? { ...item, ...patch } : item), contributionsConfirmed: false, artifacts: [] }))} onConfirmContributions={(contributionsConfirmed) => updateG02Progress((current) => ({ ...current, contributionsConfirmed, artifacts: [] }))} onNext={() => nextG02('revision')} />; break
      case 'assessment': page = <G02AssessmentPage progress={g02Progress} onNavigate={navigateG02} onUpdateSummary={(assessmentModificationSummary) => updateG02Progress((current) => ({ ...current, assessmentModificationSummary }))} onSubmit={() => updateG02Progress((current) => { const result = createG02Assessment(current); return { ...current, assessments: [...current.assessments, result.assessment], artifacts: result.artifacts, assessmentModificationSummary: '' } })} onReset={resetG02} />; break
      default: page = <G02Overview groupName={g02Progress.groupName} onNext={() => nextG02('overview')} />
    }
    const task = trainingTasks.G02
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '阶段验收' }} steps={g02ShellSteps} progressPercent={g02ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateG02} canNavigate={canNavigateG02} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-2' })} onReset={resetG02}>{page}</TrainingShell>
  }

  let portalPage: React.ReactNode
  const route = portalProgress.route
  switch (route.page) {
    case 'dashboard': portalPage = <TrainingDashboard snapshot={trainingSnapshot} onNavigate={navigatePortal} onOpenTask={openTask} />; break
    case 'tasks': portalPage = <TaskListPage groupId={route.groupId} focusElectiveBucketId={route.focusElectiveBucketId} snapshot={trainingSnapshot} electiveAssignments={portalProgress.electiveAssignments} onElectiveChange={(assignments) => setPortalProgress((current) => updateElectiveAssignments(current, assignments))} onNavigate={navigatePortal} onOpenTask={openTask} />; break
    case 'participants': portalPage = <ParticipantsPage directory={portalProgress.participantDirectory} onConfirm={(directory) => { setPortalProgress((current) => updateParticipantDirectory(current, directory)); updateM01Progress((current) => ({ ...current, groupReview: createInitialGroupReview() })); setM02Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', submitted: false } }])) })); setM03Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', submitted: false }, assessmentModificationSummary: '' }])) })); setM04Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', submitted: false }, confirmedPlan: undefined, assessmentModificationSummary: '' }])) })); setM05Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', targetQuestionId: '', submitted: false }, confirmedPackage: undefined, assessmentModificationSummary: '' }])) })); setM06Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, reviewerId: '', artifactId: '', submitted: false }, confirmedPackage: undefined }])) })); setM07Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, reviewerId: '', artifactId: '', submitted: false }, confirmedDeliverable: undefined }])) })); setM08Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerTest: { ...progress.peerTest, reviewerId: '', artifactId: '', submitted: false }, confirmedWebpage: undefined }])) })); setG01Store((current) => invalidateAllG01Progress(current)); setG02Store((current) => invalidateAllG02Progress(current)) }} onCurrentParticipantChange={(participantId) => { setPortalProgress((current) => updateParticipantDirectory(current, { ...current.participantDirectory, currentParticipantId: participantId })); updateM01Progress((current) => ({ ...current, groupReview: createInitialGroupReview() })) }} />; break
    case 'portfolio': portalPage = <PortfolioPage snapshot={trainingSnapshot} electiveAssignments={portalProgress.electiveAssignments} submissions={taskArtifactSubmissions} />; break
    case 'task': {
      const task = trainingTasks[route.taskId]
      const groupId = groupForTask(route.taskId, portalProgress.electiveAssignments)
      portalPage = <TaskFrameworkPage task={task} state={trainingSnapshot.taskStates[route.taskId]} onBack={() => navigatePortal({ page: 'tasks', groupId })} />
      break
    }
  }
  return <PortalShell route={portalProgress.route} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigatePortal} onReset={resetAll}>{portalPage}</PortalShell>
}
