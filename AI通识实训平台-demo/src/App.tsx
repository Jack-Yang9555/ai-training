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
import { createInitialM09Progress, createM09LocalSource, createM09SampleSources } from './m09/data'
import type { M09CorrectionDraft, M09PeerTest, M09Progress, M09QualityAction, M09QualityIssueType, M09Route, M09Scenario, M09SourceRecord } from './m09/domain'
import { applyRecommendedM09Quality, archiveM09TestChain, createM09Correction, LocalM09KnowledgeRunner, resolveM09QualityFinding, simulateM09PeerTest } from './m09/runner'
import { calculateM09Score, createM09Assessment } from './m09/scoring'
import { clearAllM09Progress, clearParticipantM09Progress, createConfirmedM09KnowledgeBase, loadM09Store, m09ProgressForParticipant, saveM09Store, updateParticipantM09Progress } from './m09/storage'
import { confirmedM09KnowledgeBaseIsCurrent, latestM09AssessmentIsCurrent, progressForM09, validateM09Build, validateM09CorrectionRetest, validateM09FirstTest, validateM09Quality, validateM09Sources } from './m09/validation'
import { calculateM10Score, clearAllM10Progress, clearParticipantM10Progress, confirmedM10AssistantIsCurrent, invalidateM10ReviewContext, latestM10AssessmentIsCurrent, loadM10Store, m10KnowledgeSourceFromM09, m10ProgressForParticipant, progressForM10, saveM10Store, synchronizeM10Source, updateParticipantM10Progress, validateM10Boundaries, validateM10Configuration, validateM10Flow, validateM10Previews, validateM10Source } from './m10'
import type { M10Progress, M10Route } from './m10'
import { calculateM11Score, clearAllM11Progress, clearParticipantM11Progress, confirmedM11PackageIsCurrent, invalidateM11PairingContext, latestM11AssessmentIsCurrent, loadM11Store, m11M10Fingerprint, m11ProgressForParticipant, m11RosterFingerprint, progressForM11, saveM11Store, updateParticipantM11Progress, validateM11Audit, validateM11FirstTest, validateM11Pairing, validateM11Retest, validateM11Revisions } from './m11'
import type { M11M10Evidence, M11Progress, M11Route } from './m11'
import { createInitialE01Progress } from './e01/data'
import type { E01Progress, E01Route } from './e01/domain'
import { archiveE01Attempt } from './e01/runner'
import { calculateE01Score } from './e01/scoring'
import { clearAllE01Progress, clearParticipantE01Progress, e01ProgressForParticipant, loadE01Store, saveE01Store, updateParticipantE01Progress } from './e01/storage'
import { confirmedE01PackageIsCurrent, latestE01AssessmentIsCurrent, progressForE01, validateE01AiReview, validateE01Input, validateE01Rubric, validateE01TeacherReview } from './e01/validation'
import { createInitialE02Progress } from './e02/data'
import type { E02Progress, E02Route } from './e02/domain'
import { archiveE02Attempt } from './e02/runner'
import { calculateE02Score } from './e02/scoring'
import { clearAllE02Progress, clearParticipantE02Progress, e02ProgressForParticipant, loadE02Store, saveE02Store, updateParticipantE02Progress } from './e02/storage'
import { confirmedE02PackageIsCurrent, latestE02AssessmentIsCurrent, progressForE02, validateE02FinalDraft, validateE02InitialDraft, validateE02PeerReview, validateE02Source } from './e02/validation'
import type { E03Progress, E03Route } from './e03/domain'
import { invalidateE03ReviewContext } from './e03/runner'
import { calculateE03Score } from './e03/scoring'
import { clearAllE03Progress, clearParticipantE03Progress, e03ProgressForParticipant, loadE03Store, saveE03Store, updateParticipantE03Progress } from './e03/storage'
import { confirmedE03PackageIsCurrent, latestE03AssessmentIsCurrent, progressForE03, validateE03Findings, validateE03InitialMeasures, validateE03PeerReview, validateE03Revision, validateE03Source } from './e03/validation'
import type { E04Progress, E04Route } from './e04/domain'
import { invalidateE04ReviewContext } from './e04/runner'
import { calculateE04Score } from './e04/scoring'
import { clearAllE04Progress, clearParticipantE04Progress, e04ProgressForParticipant, loadE04Store, saveE04Store, updateParticipantE04Progress } from './e04/storage'
import { confirmedE04PackageIsCurrent, latestE04AssessmentIsCurrent, progressForE04, validateE04GraphReview, validateE04Nodes, validateE04Relations, validateE04Revision, validateE04Source } from './e04/validation'
import type { E05Progress, E05Route } from './e05/domain'
import { invalidateE05ReviewContext } from './e05/runner'
import { calculateE05Score } from './e05/scoring'
import { clearAllE05Progress, clearParticipantE05Progress, e05ProgressForParticipant, loadE05Store, saveE05Store, updateParticipantE05Progress } from './e05/storage'
import { confirmedE05PackageIsCurrent, latestE05AssessmentIsCurrent, progressForE05, validateE05Mapping, validateE05PeerReview, validateE05Revision, validateE05Source, validateE05Suggestions, validateE05WebPage } from './e05/validation'
import type { E06Progress, E06Route } from './e06/domain'
import { invalidateE06ReviewContext } from './e06/runner'
import { calculateE06Score } from './e06/scoring'
import { clearAllE06Progress, clearParticipantE06Progress, e06ProgressForParticipant, loadE06Store, saveE06Store, updateParticipantE06Progress } from './e06/storage'
import { confirmedE06PackageIsCurrent, latestE06AssessmentIsCurrent, progressForE06, validateE06Comparisons, validateE06InitialReview, validateE06PeerReview, validateE06Revision, validateE06Source } from './e06/validation'
import { buildOfficialM12Evidence, createInitialM12Progress, getOfficialM12Progress, updateOfficialM12Progress } from './m12/data'
import type { M12AssistantCard, M12CorrectionEvidence, M12Progress, M12Route } from './m12/domain'
import { calculateM12Score, createM12Assessment } from './m12/scoring'
import { clearAllM12Progress, clearParticipantM12Progress, createConfirmedM12Bundle, loadM12Store, m12ProgressForParticipant, saveM12Store, updateParticipantM12Progress } from './m12/storage'
import { confirmedM12BundleIsCurrent, latestM12AssessmentIsCurrent, m12EvidenceFingerprint, officialProgressForM12, progressForM12, validateM12Assistant, validateM12Correction, validateM12Evidence, validateM12Flow, validateM12Retest, validateM12SafetyShowcase, validateM12TeacherConfirmation } from './m12/validation'
import { createG01Assessment } from './g01/assessment'
import { buildG01GroupContext } from './g01/data'
import { clearAllG01Progress, clearGroupG01Progress, g01ProgressForGroup, invalidateAllG01Progress, loadG01Store, saveG01Store, updateGroupG01Progress } from './g01/storage'
import type { G01ChecklistItem, G01Contribution, G01CrossCheck, G01CurrentMemberEvidence, G01ErrorCorrection, G01Progress, G01Route } from './g01/types'
import { g01IsCurrentlyPassed, g01PrerequisitesComplete, progressForG01 } from './g01/validation'
import { buildG02GroupContext } from './g02/data'
import { clearAllG02Progress, clearGroupG02Progress, g02ProgressForGroup, invalidateAllG02Progress, loadG02Store, saveG02Store, updateGroupG02Progress } from './g02/storage'
import type { G02Contribution, G02CurrentEvidence, G02Progress, G02Revision, G02Route, G02Showcase } from './g02/types'
import { createG02Assessment, latestG02AssessmentIsCurrent, progressForG02, validateG02Directory, validateG02Feedback, validateG02Revision, validateG02Showcase } from './g02/validation'
import { buildG03GroupContext, clearAllG03Progress, clearGroupG03Progress, createG03Assessment, g03ProgressForGroup, invalidateAllG03Progress, latestG03AssessmentIsCurrent, loadG03Store, progressForG03, saveG03Store, updateGroupG03Progress, validateG03Contributions, validateG03Issues, validateG03Matrix, validateG03Scenarios, validateG03Showcase } from './g03'
import type { G03CurrentEvidenceInput, G03Progress, G03Route } from './g03'
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
import { G03WorkspacePage } from './pages/G03Pages'
import { M08BrowserTestPage, M08DraftPage, M08InputPage, M08IterationsPage, M08Overview, M08PeerConfirmPage, M08ResultPage } from './pages/M08Pages'
import { M09BuildPage, M09CorrectionRetestPage, M09FirstTestPage, M09Overview, M09PeerConfirmPage, M09QualityPage, M09ResultPage, M09SourcesPage } from './pages/M09Pages'
import { M10WorkspacePage } from './pages/M10Pages'
import { M11WorkspacePage } from './pages/M11Pages'
import { E01WorkspacePage } from './pages/E01Pages'
import { E02WorkspacePage } from './pages/E02Pages'
import { E03WorkspacePage } from './pages/E03Pages'
import { E04WorkspacePage } from './pages/E04Pages'
import { E05WorkspacePage } from './pages/E05Pages'
import { E06WorkspacePage } from './pages/E06Pages'
import { M12WorkspacePage } from './pages/M12Pages'
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
import { e01Steps, e02Steps, e03Steps, e04Steps, e05Steps, e06Steps, g01Steps, g02Steps, g03Steps, m01Steps, m02Steps, m03Steps, m04Steps, m05Steps, m06Steps, m07Steps, m08Steps, m09Steps, m10Steps, m11Steps, m12Steps, taskGroups, trainingTasks } from './training/catalog'
import { buildTrainingSnapshot } from './training/progress'
import { clearPortalProgress, confirmCurrentMemberElectiveSelection, currentElectiveSelection, currentMemberElectiveConfirmed, loadPortalProgress, savePortalProgress, selectedElectiveIds, updateElectiveAssignments, updateParticipantDirectory, updatePortalRoute } from './training/storage'
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
const m09RouteOrder: M09Route[] = ['overview', 'sources', 'quality', 'build', 'first-test', 'correction-retest', 'peer-confirm', 'result']
const m09ShellSteps = m09Steps.map((step) => ({ ...step, route: step.id as M09Route }))
const m10RouteOrder: M10Route[] = ['overview', 'source', 'configuration', 'flow', 'boundaries', 'preview', 'review-confirm', 'result']
const m10ShellSteps = m10Steps.map((step) => ({ ...step, route: step.id as M10Route }))
const m11RouteOrder: M11Route[] = ['overview', 'pairing', 'first-test', 'audit', 'revision', 'retest', 'confirmation', 'result']
const m11ShellSteps = m11Steps.map((step) => ({ ...step, route: step.id as M11Route }))
const m12RouteOrder: M12Route[] = ['overview', 'evidence', 'orchestration', 'correction', 'assistant', 'integration', 'safety', 'result']
const m12ShellSteps = m12Steps.map((step) => ({ ...step, route: step.id as M12Route }))
const e01RouteOrder: E01Route[] = ['overview', 'input', 'rubric', 'ai-review', 'teacher-review', 'peer-confirm', 'result']
const e01ShellSteps = e01Steps.map((step) => ({ ...step, route: step.id as E01Route }))
const e02RouteOrder: E02Route[] = ['overview', 'source', 'draft', 'safety-rubric', 'peer-review', 'teacher-revision', 'confirmation', 'result']
const e02ShellSteps = e02Steps.map((step) => ({ ...step, route: step.id as E02Route }))
const e03RouteOrder: E03Route[] = ['overview', 'source', 'findings', 'measures', 'peer-review', 'revision', 'confirmation', 'result']
const e03ShellSteps = e03Steps.map((step) => ({ ...step, route: step.id as E03Route }))
const e04RouteOrder: E04Route[] = ['overview', 'source', 'nodes', 'relations', 'graph-review', 'revision', 'confirmation', 'result']
const e04ShellSteps = e04Steps.map((step) => ({ ...step, route: step.id as E04Route }))
const e05RouteOrder: E05Route[] = ['overview', 'source', 'mapping', 'suggestions', 'peer-review', 'revision', 'confirmation', 'result']
const e05ShellSteps = e05Steps.map((step) => ({ ...step, route: step.id as E05Route }))
const e06RouteOrder: E06Route[] = ['overview', 'question', 'review', 'comparison', 'peer-review', 'revision', 'confirmation', 'result']
const e06ShellSteps = e06Steps.map((step) => ({ ...step, route: step.id as E06Route }))
const g01RouteOrder: G01Route[] = ['overview', 'directory', 'errors', 'cross-checks', 'checklist', 'assessment']
const g01ShellSteps = g01Steps.map((step) => ({ ...step, route: step.id as G01Route }))
const g02RouteOrder: G02Route[] = ['overview', 'directory', 'showcase', 'feedback', 'revision', 'assessment']
const g02ShellSteps = g02Steps.map((step) => ({ ...step, route: step.id as G02Route }))
const g03RouteOrder: G03Route[] = ['overview', 'matrix', 'issues', 'scenarios', 'showcase', 'contributions', 'assessment']
const g03ShellSteps = g03Steps.map((step) => ({ ...step, route: step.id as G03Route }))

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

function invalidateM09Pipeline(current: M09Progress, reason: string): M09Progress {
  const initial = createInitialM09Progress()
  return {
    ...current,
    knowledgeBase: undefined,
    firstTest: [],
    firstTestFrozen: false,
    correctionDraft: initial.correctionDraft,
    corrections: [],
    retest: [],
    peerTest: initial.peerTest,
    teacherConfirmation: initial.teacherConfirmation,
    confirmedKnowledgeBase: undefined,
    testHistory: archiveM09TestChain(current, reason),
  }
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
  const [m09Store, setM09Store] = useState(() => loadM09Store())
  const [m10Store, setM10Store] = useState(() => loadM10Store())
  const [m11Store, setM11Store] = useState(() => loadM11Store())
  const [e01Store, setE01Store] = useState(() => loadE01Store())
  const [e02Store, setE02Store] = useState(() => loadE02Store())
  const [e03Store, setE03Store] = useState(() => loadE03Store())
  const [e04Store, setE04Store] = useState(() => loadE04Store())
  const [e05Store, setE05Store] = useState(() => loadE05Store())
  const [e06Store, setE06Store] = useState(() => loadE06Store())
  const [m12Store, setM12Store] = useState(() => loadM12Store())
  const [g01Store, setG01Store] = useState(() => loadG01Store())
  const [g02Store, setG02Store] = useState(() => loadG02Store())
  const [g03Store, setG03Store] = useState(() => loadG03Store())
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
  useEffect(() => saveM09Store(m09Store), [m09Store])
  useEffect(() => saveM10Store(m10Store), [m10Store])
  useEffect(() => saveM11Store(m11Store), [m11Store])
  useEffect(() => saveE01Store(e01Store), [e01Store])
  useEffect(() => saveE02Store(e02Store), [e02Store])
  useEffect(() => saveE03Store(e03Store), [e03Store])
  useEffect(() => saveE04Store(e04Store), [e04Store])
  useEffect(() => saveE05Store(e05Store), [e05Store])
  useEffect(() => saveE06Store(e06Store), [e06Store])
  useEffect(() => saveM12Store(m12Store), [m12Store])
  useEffect(() => saveG01Store(g01Store), [g01Store])
  useEffect(() => saveG02Store(g02Store), [g02Store])
  useEffect(() => saveG03Store(g03Store), [g03Store])
  useEffect(() => savePortalProgress(portalProgress), [portalProgress])

  const m01ProgressPercent = useMemo(() => progressForRoute(m01Progress, portalProgress.participantDirectory), [m01Progress, portalProgress.participantDirectory])
  const m01Score = useMemo(() => calculateM01Score(m01Progress, portalProgress.participantDirectory), [m01Progress, portalProgress.participantDirectory])
  const activeParticipant = useMemo(() => currentParticipant(portalProgress.participantDirectory), [portalProgress.participantDirectory])
  const activeParticipantId = activeParticipant?.participantId ?? 'anonymous'
  const activeGroupElectiveSelection = useMemo(() => currentElectiveSelection(portalProgress), [portalProgress])
  const activeMemberElectiveConfirmed = useMemo(() => currentMemberElectiveConfirmed(portalProgress), [portalProgress])
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
  const m09Progress = useMemo(() => m09ProgressForParticipant(m09Store, activeParticipantId), [m09Store, activeParticipantId])
  const m09ProgressPercent = useMemo(() => progressForM09(m09Progress, portalProgress.participantDirectory), [m09Progress, portalProgress.participantDirectory])
  const m09Score = useMemo(() => calculateM09Score(m09Progress, portalProgress.participantDirectory), [m09Progress, portalProgress.participantDirectory])
  const m09Passed = useMemo(() => latestM09AssessmentIsCurrent(m09Progress, portalProgress.participantDirectory), [m09Progress, portalProgress.participantDirectory])
  const m10KnowledgeSource = useMemo(() => m10KnowledgeSourceFromM09(m09Progress, portalProgress.participantDirectory), [m09Progress, portalProgress.participantDirectory])
  const m10Progress = useMemo(() => m10ProgressForParticipant(m10Store, activeParticipantId), [m10Store, activeParticipantId])
  useEffect(() => {
    setM10Store((current) => updateParticipantM10Progress(current, activeParticipantId, (saved) => synchronizeM10Source(saved, m10KnowledgeSource)))
  }, [activeParticipantId, m10KnowledgeSource])
  const m10ProgressPercent = useMemo(() => progressForM10(m10Progress, portalProgress.participantDirectory), [m10Progress, portalProgress.participantDirectory])
  const m10Score = useMemo(() => calculateM10Score(m10Progress, portalProgress.participantDirectory), [m10Progress, portalProgress.participantDirectory])
  const m10Passed = useMemo(() => latestM10AssessmentIsCurrent(m10Progress, portalProgress.participantDirectory), [m10Progress, portalProgress.participantDirectory])
  const m11M10Evidence = useMemo<M11M10Evidence>(() => {
    const assessment = m10Progress.assessments.at(-1)
    const assistant = m10Progress.confirmedAssistant
    if (m10Passed && assessment && assistant) return {
      current: true,
      participantId: activeParticipantId,
      assistantId: assistant.assistantId,
      version: assistant.version,
      assessmentId: assessment.assessmentId,
      contentFingerprint: assessment.contentFingerprint,
      courseName: assistant.source.courseName,
      knowledgeBaseVersion: assistant.source.version,
      confirmedAt: assistant.confirmedAt,
    }
    return {
      current: false,
      participantId: activeParticipantId,
      assistantId: '',
      version: '',
      assessmentId: '',
      contentFingerprint: '',
      courseName: m09Progress.scenario.courseName,
      knowledgeBaseVersion: '',
      unavailableReason: 'M10 尚无当前有效的教师确认课程 AI 助教 v1.0',
    }
  }, [activeParticipantId, m09Progress.scenario.courseName, m10Passed, m10Progress.assessments, m10Progress.confirmedAssistant])
  const m11Progress = useMemo(() => m11ProgressForParticipant(m11Store, activeParticipantId), [m11Store, activeParticipantId])
  useEffect(() => {
    setM11Store((current) => updateParticipantM11Progress(current, activeParticipantId, (saved) => {
      if (!saved.pairing) return saved
      const sourceChanged = saved.pairing.m10Fingerprint !== m11M10Fingerprint(m11M10Evidence)
      const rosterChanged = saved.pairing.rosterFingerprint !== m11RosterFingerprint(portalProgress.participantDirectory)
      return sourceChanged || rosterChanged ? invalidateM11PairingContext(saved, sourceChanged ? 'M10 当前助教版本或验收发生变化' : '人员或分组发生变化') : saved
    }))
  }, [activeParticipantId, m11M10Evidence, portalProgress.participantDirectory])
  const m11ProgressPercent = useMemo(() => progressForM11(m11Progress, portalProgress.participantDirectory, m11M10Evidence), [m11Progress, portalProgress.participantDirectory, m11M10Evidence])
  const m11Score = useMemo(() => calculateM11Score(m11Progress, portalProgress.participantDirectory, m11M10Evidence), [m11Progress, portalProgress.participantDirectory, m11M10Evidence])
  const m11Passed = useMemo(() => latestM11AssessmentIsCurrent(m11Progress, portalProgress.participantDirectory, m11M10Evidence), [m11Progress, portalProgress.participantDirectory, m11M10Evidence])
  const e01Progress = useMemo(() => e01ProgressForParticipant(e01Store, activeParticipantId), [e01Store, activeParticipantId])
  const e01ProgressPercent = useMemo(() => progressForE01(e01Progress, portalProgress.participantDirectory), [e01Progress, portalProgress.participantDirectory])
  const e01Score = useMemo(() => calculateE01Score(e01Progress, portalProgress.participantDirectory), [e01Progress, portalProgress.participantDirectory])
  const e01Passed = useMemo(() => latestE01AssessmentIsCurrent(e01Progress, portalProgress.participantDirectory), [e01Progress, portalProgress.participantDirectory])
  const e02Progress = useMemo(() => e02ProgressForParticipant(e02Store, activeParticipantId), [e02Store, activeParticipantId])
  const e02ProgressPercent = useMemo(() => progressForE02(e02Progress, portalProgress.participantDirectory), [e02Progress, portalProgress.participantDirectory])
  const e02Score = useMemo(() => calculateE02Score(e02Progress, portalProgress.participantDirectory), [e02Progress, portalProgress.participantDirectory])
  const e02Passed = useMemo(() => latestE02AssessmentIsCurrent(e02Progress, portalProgress.participantDirectory), [e02Progress, portalProgress.participantDirectory])
  const e03Progress = useMemo(() => e03ProgressForParticipant(e03Store, activeParticipantId), [e03Store, activeParticipantId])
  const e03ProgressPercent = useMemo(() => progressForE03(e03Progress, portalProgress.participantDirectory), [e03Progress, portalProgress.participantDirectory])
  const e03Score = useMemo(() => calculateE03Score(e03Progress, portalProgress.participantDirectory), [e03Progress, portalProgress.participantDirectory])
  const e03Passed = useMemo(() => latestE03AssessmentIsCurrent(e03Progress, portalProgress.participantDirectory), [e03Progress, portalProgress.participantDirectory])
  const e04Progress = useMemo(() => e04ProgressForParticipant(e04Store, activeParticipantId), [e04Store, activeParticipantId])
  const e04ProgressPercent = useMemo(() => progressForE04(e04Progress, portalProgress.participantDirectory), [e04Progress, portalProgress.participantDirectory])
  const e04Score = useMemo(() => calculateE04Score(e04Progress, portalProgress.participantDirectory), [e04Progress, portalProgress.participantDirectory])
  const e04Passed = useMemo(() => latestE04AssessmentIsCurrent(e04Progress, portalProgress.participantDirectory), [e04Progress, portalProgress.participantDirectory])
  const e05Progress = useMemo(() => e05ProgressForParticipant(e05Store, activeParticipantId), [e05Store, activeParticipantId])
  const e05ProgressPercent = useMemo(() => progressForE05(e05Progress, portalProgress.participantDirectory), [e05Progress, portalProgress.participantDirectory])
  const e05Score = useMemo(() => calculateE05Score(e05Progress, portalProgress.participantDirectory), [e05Progress, portalProgress.participantDirectory])
  const e05Passed = useMemo(() => latestE05AssessmentIsCurrent(e05Progress, portalProgress.participantDirectory), [e05Progress, portalProgress.participantDirectory])
  const e06Progress = useMemo(() => e06ProgressForParticipant(e06Store, activeParticipantId), [e06Store, activeParticipantId])
  const e06ProgressPercent = useMemo(() => progressForE06(e06Progress, portalProgress.participantDirectory), [e06Progress, portalProgress.participantDirectory])
  const e06Score = useMemo(() => calculateE06Score(e06Progress, portalProgress.participantDirectory), [e06Progress, portalProgress.participantDirectory])
  const e06Passed = useMemo(() => latestE06AssessmentIsCurrent(e06Progress, portalProgress.participantDirectory), [e06Progress, portalProgress.participantDirectory])
  const m12OfficialEvidence = useMemo(() => {
    const day2ElectiveId = portalProgress.electiveAssignments['day-2']?.[0]
    const day3ElectiveId = portalProgress.electiveAssignments['day-3']?.[0]
    const electiveEvidence = (taskId: typeof day2ElectiveId, dayLabel: string) => {
      if (taskId === 'E01' && activeMemberElectiveConfirmed && e01Passed && e01Progress.confirmedPackage) {
        return { current: true as const, sourceTaskId: taskId, sourceLabel: `${taskId} · ${dayLabel}个人选修`, artifactId: e01Progress.confirmedPackage.packageId, version: e01Progress.rubric.version, assessmentId: e01Progress.assessments.at(-1)?.assessmentId, updatedAt: e01Progress.confirmedPackage.confirmedAt, summary: `当前教师确认的完整 E01 成果包，含评分量规 ${e01Progress.confirmedPackage.artifacts[0].artifactId} 与五份批改反馈 ${e01Progress.confirmedPackage.artifacts[1].artifactId}。` }
      }
      if (taskId === 'E02' && activeMemberElectiveConfirmed && e02Passed && e02Progress.confirmedPackage && e02Progress.workingDraft) {
        return { current: true as const, sourceTaskId: taskId, sourceLabel: `${taskId} · ${dayLabel}个人选修`, artifactId: e02Progress.confirmedPackage.packageId, version: e02Progress.workingDraft.rubric.version, assessmentId: e02Progress.assessments.at(-1)?.assessmentId, updatedAt: e02Progress.confirmedPackage.confirmedAt, summary: `当前教师确认的完整 E02 成果包，含实训任务书、安全检查单和 100 分评分量规共 ${e02Progress.confirmedPackage.artifacts.length} 项固定成果。` }
      }
      if (taskId === 'E03' && activeMemberElectiveConfirmed && e03Passed && e03Progress.confirmedPackage) {
        return { current: true as const, sourceTaskId: taskId, sourceLabel: `${taskId} · ${dayLabel}个人选修`, artifactId: e03Progress.confirmedPackage.packageId, version: e03Progress.confirmedPackage.artifactVersion, assessmentId: e03Progress.assessments.at(-1)?.assessmentId, updatedAt: e03Progress.confirmedPackage.confirmedAt, summary: '当前教师确认的完整 E03 成果包，含可追溯的教学反思或评课记录与下一次课改进清单。' }
      }
      if (taskId === 'E04' && activeMemberElectiveConfirmed && e04Passed && e04Progress.confirmedPackage) {
        return { current: true as const, sourceTaskId: taskId, sourceLabel: `${taskId} · ${dayLabel}个人选修`, artifactId: e04Progress.confirmedPackage.packageId, version: `v${e04Progress.confirmedPackage.graphVersion}`, assessmentId: e04Progress.assessments.at(-1)?.assessmentId, updatedAt: e04Progress.confirmedPackage.confirmedAt, summary: `当前教师确认的完整 E04 成果包，含 ${e04Progress.confirmedPackage.nodeCount} 个节点、${e04Progress.confirmedPackage.relationCount} 条关系及人工修正记录。` }
      }
      if (taskId === 'E05' && activeMemberElectiveConfirmed && e05Passed && e05Progress.confirmedPackage) {
        return { current: true as const, sourceTaskId: taskId, sourceLabel: `${taskId} · ${dayLabel}个人选修`, artifactId: e05Progress.confirmedPackage.packageId, version: `v${e05Progress.confirmedPackage.webPageVersion}`, assessmentId: e05Progress.assessments.at(-1)?.assessmentId, updatedAt: e05Progress.confirmedPackage.confirmedAt, summary: `当前教师确认的完整 E05 成果包，含课程—岗位能力映射网页、3 项差距改进建议和 ${e05Progress.confirmedPackage.revisionCount} 条人工修正。` }
      }
      if (taskId === 'E06' && activeMemberElectiveConfirmed && e06Passed && e06Progress.confirmedPackage) {
        return { current: true as const, sourceTaskId: taskId, sourceLabel: `${taskId} · ${dayLabel}个人选修`, artifactId: e06Progress.confirmedPackage.packageId, version: `v${e06Progress.version}`, assessmentId: e06Progress.assessments.at(-1)?.assessmentId, updatedAt: e06Progress.confirmedPackage.confirmedAt, summary: '当前教师确认的完整 E06 成果包，含文献梳理表、观点对比表和引用核验记录。' }
      }
      return { current: false as const, sourceTaskId: taskId, sourceLabel: taskId ? `${taskId} · ${dayLabel}个人选修` : `${dayLabel}选修任务`, unavailableReason: taskId ? `${taskId} 尚无当前有效的教师确认选修成果` : `${dayLabel}尚未选择个人选修任务` }
    }
    return buildOfficialM12Evidence(activeParticipantId, {
      'lesson-plan': m04Passed && m04Progress.confirmedPlan ? { current: true, sourceTaskId: 'M04', artifactId: m04Progress.confirmedPlan.planId, version: m04Progress.confirmedPlan.sourceDraftId, assessmentId: m04Progress.assessments.at(-1)?.assessmentId, updatedAt: m04Progress.confirmedPlan.confirmedAt, summary: '当前教师确认版教案，保留目标、活动、评价和人工审校记录。' } : { current: false, sourceTaskId: 'M04', unavailableReason: 'M04 尚无当前有效的教师确认版教案' },
      'question-pack': m05Passed && m05Progress.confirmedPackage ? { current: true, sourceTaskId: 'M05', artifactId: m05Progress.confirmedPackage.packageId, version: m05Progress.confirmedPackage.sourceDraftId, assessmentId: m05Progress.assessments.at(-1)?.assessmentId, updatedAt: m05Progress.confirmedPackage.confirmedAt, summary: '当前教师确认题目包，包含 8 道题及答案、解析、依据与评分要点。' } : { current: false, sourceTaskId: 'M05', unavailableReason: 'M05 尚无当前有效的课堂题目包' },
      multimodal: m06Passed && m06Progress.confirmedPackage ? { current: true, sourceTaskId: 'M06', artifactId: m06Progress.confirmedPackage.packageId, version: m06Progress.confirmedPackage.sourceDraftId, assessmentId: m06Progress.assessmentHistory.at(-1)?.assessmentId, updatedAt: m06Progress.confirmedPackage.confirmedAt, summary: '当前教师确认的课件、讲解稿与数字人微课组合成果。' } : { current: false, sourceTaskId: 'M06', unavailableReason: 'M06 尚无当前有效的课件与数字人微课组合成果' },
      'learning-analysis': m07Passed && m07Progress.confirmedDeliverable ? { current: true, sourceTaskId: 'M07', artifactId: m07Progress.confirmedDeliverable.deliverableId, version: m07Progress.confirmedDeliverable.sourceDraftId, assessmentId: m07Progress.assessmentHistory.at(-1)?.assessmentId, updatedAt: m07Progress.confirmedDeliverable.confirmedAt, summary: '当前教师确认的匿名学情分析与补强、巩固、拓展任务。' } : { current: false, sourceTaskId: 'M07', unavailableReason: 'M07 尚无当前有效的学情分析与分层任务' },
      'interactive-web': m08Passed && m08Progress.confirmedWebpage ? { current: true, sourceTaskId: 'M08', artifactId: m08Progress.confirmedWebpage.webpageId, version: m08Progress.confirmedWebpage.sourceVersionId, assessmentId: m08Progress.assessments.at(-1)?.assessmentId, updatedAt: m08Progress.confirmedWebpage.confirmedAt, summary: '当前教师确认的离线单文件交互式教学网页。' } : { current: false, sourceTaskId: 'M08', unavailableReason: 'M08 尚无当前有效的交互式教学网页' },
      'knowledge-base': m09Passed && m09Progress.confirmedKnowledgeBase ? { current: true, sourceTaskId: 'M09', artifactId: m09Progress.confirmedKnowledgeBase.sourceListArtifactId, version: m09Progress.confirmedKnowledgeBase.version, assessmentId: m09Progress.assessments.at(-1)?.assessmentId, updatedAt: m09Progress.confirmedKnowledgeBase.confirmedAt, summary: '当前教师确认的课程知识库 v1.0、来源清单和 9 项测试报告。' } : { current: false, sourceTaskId: 'M09', unavailableReason: 'M09 尚无当前有效的课程知识库 v1.0' },
      assistant: m10Passed && m10Progress.confirmedAssistant ? { current: true, sourceTaskId: 'M10', artifactId: m10Progress.confirmedAssistant.artifacts[0].artifactId, version: m10Progress.confirmedAssistant.version, assessmentId: m10Progress.assessments.at(-1)?.assessmentId, updatedAt: m10Progress.confirmedAssistant.confirmedAt, summary: '当前教师确认的课程 AI 助教 v1.0，包含六要素、固定四步流程、五类边界规则和双场景预览。' } : { current: false, sourceTaskId: 'M10', unavailableReason: 'M10 尚无当前有效的课程 AI 助教 v1.0' },
      'qa-test': m11Passed && m11Progress.confirmedPackage ? { current: true, sourceTaskId: 'M11', artifactId: m11Progress.confirmedPackage.portfolioArtifact.artifactId, version: 'retest-v1', assessmentId: m11Progress.assessments.at(-1)?.assessmentId, updatedAt: m11Progress.confirmedPackage.confirmedAt, summary: '当前教师确认的五类学生问题首测、规则修改与同题 5/5 复测记录。' } : { current: false, sourceTaskId: 'M11', unavailableReason: 'M11 尚无当前有效的答疑测试、修改与复测记录' },
      'elective-day-2': electiveEvidence(day2ElectiveId, '第二天'),
      'elective-day-3': electiveEvidence(day3ElectiveId, '第三天'),
    })
  }, [activeParticipantId, m04Passed, m04Progress.confirmedPlan, m04Progress.assessments, m05Passed, m05Progress.confirmedPackage, m05Progress.assessments, m06Passed, m06Progress.confirmedPackage, m06Progress.assessmentHistory, m07Passed, m07Progress.confirmedDeliverable, m07Progress.assessmentHistory, m08Passed, m08Progress.confirmedWebpage, m08Progress.assessments, m09Passed, m09Progress.confirmedKnowledgeBase, m09Progress.assessments, m10Passed, m10Progress.confirmedAssistant, m10Progress.assessments, m11Passed, m11Progress.confirmedPackage, m11Progress.assessments, activeMemberElectiveConfirmed, e01Passed, e01Progress.confirmedPackage, e01Progress.rubric.version, e01Progress.assessments, e02Passed, e02Progress.confirmedPackage, e02Progress.workingDraft, e02Progress.assessments, e03Passed, e03Progress.confirmedPackage, e03Progress.assessments, e04Passed, e04Progress.confirmedPackage, e04Progress.assessments, e05Passed, e05Progress.confirmedPackage, e05Progress.assessments, e06Passed, e06Progress.confirmedPackage, e06Progress.assessments, e06Progress.version, portalProgress.electiveAssignments])
  const m12Progress = useMemo(() => m12ProgressForParticipant(m12Store, activeParticipantId), [m12Store, activeParticipantId])
  const m12OfficialProgress = useMemo(() => getOfficialM12Progress(m12Progress), [m12Progress])
  useEffect(() => {
    if (m12OfficialProgress.evidence.length === 0 || m12EvidenceFingerprint(m12OfficialProgress.evidence) === m12EvidenceFingerprint(m12OfficialEvidence)) return
    setM12Store((current) => updateParticipantM12Progress(current, activeParticipantId, (saved) => updateOfficialM12Progress(saved, (official) => ({ ...official, evidence: m12OfficialEvidence }))))
  }, [activeParticipantId, m12OfficialEvidence, m12OfficialProgress.evidence])
  const m12WorkbenchProgressPercent = useMemo(() => progressForM12(m12Progress, activeParticipantId, portalProgress.participantDirectory), [m12Progress, activeParticipantId, portalProgress.participantDirectory])
  const m12OfficialProgressPercent = useMemo(() => officialProgressForM12(m12OfficialProgress, activeParticipantId, portalProgress.participantDirectory), [m12OfficialProgress, activeParticipantId, portalProgress.participantDirectory])
  const m12Score = useMemo(() => calculateM12Score(m12OfficialProgress, activeParticipantId, portalProgress.participantDirectory), [m12OfficialProgress, activeParticipantId, portalProgress.participantDirectory])
  const m12Passed = useMemo(() => latestM12AssessmentIsCurrent(m12OfficialProgress, portalProgress.participantDirectory), [m12OfficialProgress, portalProgress.participantDirectory])
  const m12CorrectionOptions = useMemo<M12CorrectionEvidence[]>(() => {
    const options: M12CorrectionEvidence[] = []
    const m09Correction = m09Passed ? m09Progress.corrections.at(-1) : undefined
    if (m09Correction && m09Progress.confirmedKnowledgeBase) options.push({ correctionId: m09Correction.correctionId, sourceTaskId: 'M09', sourceArtifactId: m09Progress.confirmedKnowledgeBase.testReportArtifactId, sourceParticipantId: activeParticipantId, sourceVersion: m09Progress.confirmedKnowledgeBase.version, sourceAssessmentId: m09Progress.assessments.at(-1)?.assessmentId, aiOriginal: m09Correction.before, issue: m09Progress.firstTest.find((item) => item.questionId === m09Correction.questionId)?.issueDescription ?? '首测回答不符合预期', teacherCorrection: m09Correction.after, basis: m09Correction.basis, confirmed: false, preview: false })
    const m11Revision = m11Passed ? m11Progress.revisions.at(-1) : undefined
    if (m11Revision && m11Progress.confirmedPackage) options.push({ correctionId: m11Revision.revisionId, sourceTaskId: 'M11', sourceArtifactId: m11Progress.confirmedPackage.portfolioArtifact.artifactId, sourceParticipantId: activeParticipantId, sourceVersion: 'retest-v1', sourceAssessmentId: m11Progress.assessments.at(-1)?.assessmentId, aiOriginal: m11Revision.beforeValue, issue: `M11 ${m11Revision.relatedQuestionIds.join('/')} 首测暴露答疑规则缺陷`, teacherCorrection: m11Revision.afterValue, basis: m11Revision.basis, confirmed: false, preview: false })
    if (m08Passed && m08Progress.confirmedWebpage && m08Progress.peerTest.submitted) options.push({ correctionId: `M08-${m08Progress.confirmedWebpage.webpageId}-peer`, sourceTaskId: 'M08', sourceArtifactId: m08Progress.confirmedWebpage.webpageId, sourceParticipantId: activeParticipantId, sourceVersion: m08Progress.confirmedWebpage.sourceVersionId, sourceAssessmentId: m08Progress.assessments.at(-1)?.assessmentId, aiOriginal: m08Progress.peerTest.correctionBefore, issue: m08Progress.peerTest.issueFound, teacherCorrection: m08Progress.peerTest.correctionAfter, basis: m08Progress.peerTest.correctionBasis, confirmed: false, preview: false })
    const e02Correction = e02Passed ? e02Progress.modifications.at(-1) : undefined
    if (e02Correction && e02Progress.confirmedPackage && e02Progress.workingDraft) options.push({ correctionId: e02Correction.modificationId, sourceTaskId: 'E02', sourceArtifactId: e02Progress.confirmedPackage.packageId, sourceParticipantId: activeParticipantId, sourceVersion: e02Progress.workingDraft.rubric.version, sourceAssessmentId: e02Progress.assessments.at(-1)?.assessmentId, aiOriginal: e02Correction.beforeValue, issue: `E02 ${e02Correction.targetId} 的${e02Correction.category === 'step' ? '操作顺序' : e02Correction.category === 'safety' ? '安全表述' : '量规分值'}不符合当前规范`, teacherCorrection: e02Correction.afterValue, basis: `${e02Correction.basisClauseId} · ${e02Correction.basis}`, confirmed: false, preview: false })
    const e03Correction = e03Passed ? e03Progress.revisions.at(-1) : undefined
    if (e03Correction && e03Progress.confirmedPackage) options.push({ correctionId: e03Correction.revisionId, sourceTaskId: 'E03', sourceArtifactId: e03Progress.confirmedPackage.packageId, sourceParticipantId: activeParticipantId, sourceVersion: e03Progress.confirmedPackage.artifactVersion, sourceAssessmentId: e03Progress.assessments.at(-1)?.assessmentId, aiOriginal: e03Correction.before.teacherAction, issue: `E03 ${e03Correction.measureId} 原措施缺少可执行、可观察与可检查的闭环`, teacherCorrection: e03Correction.after.teacherAction, basis: `${e03Correction.sourceSuggestion} · ${e03Correction.authorBasis}`, confirmed: false, preview: false })
    const e04Correction = e04Passed ? e04Progress.revisions.at(-1) : undefined
    if (e04Correction && e04Progress.confirmedPackage) options.push({ correctionId: e04Correction.revisionId, sourceTaskId: 'E04', sourceArtifactId: e04Progress.confirmedPackage.packageId, sourceParticipantId: activeParticipantId, sourceVersion: `v${e04Progress.confirmedPackage.graphVersion}`, sourceAssessmentId: e04Progress.assessments.at(-1)?.assessmentId, aiOriginal: e04Correction.beforeValue, issue: `E04 ${e04Correction.targetId} 的${e04Correction.field === 'direction' ? '关系方向' : e04Correction.field === 'merge' ? '重复节点' : '图谱记录'}需要人工修正`, teacherCorrection: e04Correction.afterValue, basis: `${e04Correction.basisExcerptId} · ${e04Correction.basis}`, confirmed: false, preview: false })
    const e05Correction = e05Passed ? e05Progress.revisions.at(-1) : undefined
    if (e05Correction && e05Progress.confirmedPackage) options.push({ correctionId: e05Correction.revisionId, sourceTaskId: 'E05', sourceArtifactId: e05Progress.confirmedPackage.packageId, sourceParticipantId: activeParticipantId, sourceVersion: `v${e05Progress.confirmedPackage.webPageVersion}`, sourceAssessmentId: e05Progress.assessments.at(-1)?.assessmentId, aiOriginal: e05Correction.beforeValue, issue: `E05 ${e05Correction.targetId} 的${e05Correction.field === 'status' ? '覆盖状态' : e05Correction.field === 'courseAdjustment' ? '课程调整动作' : e05Correction.field === 'expectedEvidence' ? '可观察证据' : '映射判断依据'}需要人工修正`, teacherCorrection: e05Correction.afterValue, basis: `${e05Correction.courseEvidenceId} / ${e05Correction.jobEvidenceExcerptId} · ${e05Correction.basis}`, confirmed: false, preview: false })
    const e06Correction = e06Passed ? e06Progress.revisions.at(-1) : undefined
    if (e06Correction && e06Progress.confirmedPackage) options.push({ correctionId: e06Correction.revisionId, sourceTaskId: 'E06', sourceArtifactId: e06Progress.confirmedPackage.packageId, sourceParticipantId: activeParticipantId, sourceVersion: `v${e06Progress.version}`, sourceAssessmentId: e06Progress.assessments.at(-1)?.assessmentId, aiOriginal: e06Correction.beforeValue, issue: `E06 ${e06Correction.documentId} 的${e06Correction.field === 'finding' ? '研究发现' : e06Correction.field === 'boundary' ? '适用边界' : '引用记录'}需要人工修正`, teacherCorrection: e06Correction.afterValue, basis: `${e06Correction.sourceExcerptId} · ${e06Correction.basis}`, confirmed: false, preview: false })
    return options
  }, [activeParticipantId, m09Passed, m09Progress.corrections, m09Progress.confirmedKnowledgeBase, m09Progress.firstTest, m09Progress.assessments, m11Passed, m11Progress.revisions, m11Progress.confirmedPackage, m11Progress.assessments, m08Passed, m08Progress.confirmedWebpage, m08Progress.peerTest, m08Progress.assessments, e02Passed, e02Progress.modifications, e02Progress.confirmedPackage, e02Progress.workingDraft, e02Progress.assessments, e03Passed, e03Progress.revisions, e03Progress.confirmedPackage, e03Progress.assessments, e04Passed, e04Progress.revisions, e04Progress.confirmedPackage, e04Progress.assessments, e05Passed, e05Progress.revisions, e05Progress.confirmedPackage, e05Progress.assessments, e06Passed, e06Progress.revisions, e06Progress.confirmedPackage, e06Progress.assessments, e06Progress.version])
  const m12AssistantOptions = useMemo<M12AssistantCard[]>(() => {
    const assistant = m10Passed ? m10Progress.confirmedAssistant : undefined
    const normal = assistant?.previews.find((item) => item.kind === 'normal')
    const packageRecord = m11Passed ? m11Progress.confirmedPackage : undefined
    const boundary = m11Progress.retest.find((item) => item.questionId === 'Q03')
    const m10AssessmentId = m10Progress.assessments.at(-1)?.assessmentId
    const m11AssessmentId = m11Progress.assessments.at(-1)?.assessmentId
    if (!assistant || !normal?.source || !m10AssessmentId || !packageRecord || !boundary || !m11AssessmentId) return []
    return [
      {
        cardId: `M12-M10-${normal.previewId}`,
        kind: 'evidence',
        sourceTaskId: 'M10',
        sourceArtifactId: assistant.artifacts[0].artifactId,
        sourceParticipantId: activeParticipantId,
        sourceVersion: assistant.version,
        sourceAssessmentId: m10AssessmentId,
        question: normal.question,
        answer: normal.rawAnswer,
        citationLabel: normal.source.sourceLabel,
        citationExcerpt: normal.source.excerpt,
        teacherTakeover: '教师核对来源片段与当前知识库版本后，再决定是否用于教学。',
        confirmed: false,
        preview: false,
      },
      {
        cardId: `M12-M11-${boundary.recordId}`,
        kind: 'boundary',
        sourceTaskId: 'M11',
        sourceArtifactId: packageRecord.portfolioArtifact.artifactId,
        sourceParticipantId: activeParticipantId,
        sourceVersion: 'retest-v1',
        sourceAssessmentId: m11AssessmentId,
        question: boundary.studentQuestion,
        answer: boundary.rawAnswer,
        boundaryExplanation: '当前资料无法支持该问题；助教停止猜测、不伪造来源，并按 M11 复测规则转交教师。',
        teacherTakeover: '课程教师核对问题范围和授权边界，决定后续人工答复。',
        confirmed: false,
        preview: false,
      },
    ]
  }, [activeParticipantId, m10Passed, m10Progress.confirmedAssistant, m10Progress.assessments, m11Passed, m11Progress.confirmedPackage, m11Progress.retest, m11Progress.assessments])
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
    firstElectiveArtifactId: portalProgress.electiveAssignments['day-2']?.[0] === 'E01' && activeMemberElectiveConfirmed && e01Passed
      ? e01Progress.confirmedPackage?.packageId
      : portalProgress.electiveAssignments['day-2']?.[0] === 'E02' && activeMemberElectiveConfirmed && e02Passed
        ? e02Progress.confirmedPackage?.packageId
        : portalProgress.electiveAssignments['day-2']?.[0] === 'E03' && activeMemberElectiveConfirmed && e03Passed
          ? e03Progress.confirmedPackage?.packageId
          : portalProgress.electiveAssignments['day-2']?.[0] === 'E04' && activeMemberElectiveConfirmed && e04Passed
            ? e04Progress.confirmedPackage?.packageId
            : portalProgress.electiveAssignments['day-2']?.[0] === 'E05' && activeMemberElectiveConfirmed && e05Passed
              ? e05Progress.confirmedPackage?.packageId
              : portalProgress.electiveAssignments['day-2']?.[0] === 'E06' && activeMemberElectiveConfirmed && e06Passed
                ? e06Progress.confirmedPackage?.packageId
                : undefined,
  }), [activeParticipantId, m06Passed, m06Progress.confirmedPackage, m08Passed, m08Progress.confirmedWebpage, activeMemberElectiveConfirmed, e01Passed, e01Progress.confirmedPackage, e02Passed, e02Progress.confirmedPackage, e03Passed, e03Progress.confirmedPackage, e04Passed, e04Progress.confirmedPackage, e05Passed, e05Progress.confirmedPackage, e06Passed, e06Progress.confirmedPackage, portalProgress.electiveAssignments])
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
  const g03CurrentEvidence = useMemo<G03CurrentEvidenceInput>(() => {
    const tasks: G03CurrentEvidenceInput['tasks'] = {}
    if (m09Passed && m09Progress.confirmedKnowledgeBase) tasks.M09 = {
      taskId: 'M09',
      artifactId: m09Progress.confirmedKnowledgeBase.testReportArtifactId,
      version: m09Progress.confirmedKnowledgeBase.version,
      assessmentId: m09Progress.assessments.at(-1)?.assessmentId ?? '',
      current: true,
    }
    if (m10Passed && m10Progress.confirmedAssistant) tasks.M10 = {
      taskId: 'M10',
      artifactId: m10Progress.confirmedAssistant.artifacts[0].artifactId,
      version: m10Progress.confirmedAssistant.version,
      assessmentId: m10Progress.assessments.at(-1)?.assessmentId ?? '',
      current: true,
    }
    const m11Revision = m11Progress.revisions.at(-1)
    if (m11Passed && m11Progress.confirmedPackage) tasks.M11 = {
      taskId: 'M11',
      artifactId: m11Progress.confirmedPackage.portfolioArtifact.artifactId,
      version: 'retest-v1',
      assessmentId: m11Progress.assessments.at(-1)?.assessmentId ?? '',
      current: true,
      issueId: m11Revision?.revisionId,
      issue: m11Revision ? `${m11Revision.relatedQuestionIds.join('/')} 首测回答行为不符合预期` : undefined,
      correction: m11Revision?.afterValue,
      correctionEvidenceId: m11Revision?.revisionId,
      retestResult: m11Revision ? '已通过' : undefined,
      retestEvidenceId: m11Revision ? m11Progress.retest.find((item) => m11Revision.relatedQuestionIds.includes(item.questionId))?.recordId : undefined,
    }
    const scenarios: G03CurrentEvidenceInput['scenarios'] = []
    const evidencePreview = m10Progress.confirmedAssistant?.previews.find((item) => item.kind === 'normal')
    const questionRecord = m11Progress.retest.find((item) => item.questionId === 'Q02')
    const boundaryRecord = m11Progress.retest.find((item) => item.questionId === 'Q03')
    if (m10Passed && evidencePreview?.source) scenarios.push({
      scenarioId: 'G03-SCENARIO-EVIDENCE',
      kind: '有来源回答',
      sourceTaskId: 'M10',
      question: evidencePreview.question,
      answer: evidencePreview.rawAnswer,
      evidenceId: evidencePreview.previewId,
      sourceId: evidencePreview.source.sourceId,
      sourceLocation: evidencePreview.source.sourceLabel,
      sourceExcerpt: evidencePreview.source.excerpt,
      noFalseCitation: true,
    })
    if (m11Passed && questionRecord) scenarios.push({
      scenarioId: 'G03-SCENARIO-QUESTION',
      kind: '缺失条件追问',
      sourceTaskId: 'M11',
      question: questionRecord.studentQuestion,
      answer: questionRecord.rawAnswer,
      evidenceId: questionRecord.recordId,
      missingCondition: '作品目标、当前效果与约束条件',
      noFalseCitation: true,
    })
    if (m11Passed && boundaryRecord) scenarios.push({
      scenarioId: 'G03-SCENARIO-BOUNDARY',
      kind: '超范围说明与转交',
      sourceTaskId: 'M11',
      question: boundaryRecord.studentQuestion,
      answer: boundaryRecord.rawAnswer,
      evidenceId: boundaryRecord.recordId,
      boundaryStatement: '当前绑定资料不包含未公开信息，助教停止猜测且不生成虚假引用。',
      handoffTarget: '当前课程教师',
      noFalseCitation: !boundaryRecord.sourceLabel && !boundaryRecord.sourceExcerpt,
    })
    const coverageRefs = m11Passed ? m11Progress.confirmedPackage?.coverageRefs : undefined
    return {
      participantId: activeParticipantId,
      tasks,
      m11Coverage: coverageRefs ? {
        testedParticipantId: coverageRefs.outgoing.testedParticipantId,
        testedRecordId: coverageRefs.outgoing.coverageId,
        acceptedTestFromParticipantId: coverageRefs.incoming.testerParticipantId,
        acceptedRecordId: coverageRefs.incoming.coverageId,
        submitted: true,
      } : undefined,
      scenarios,
    }
  }, [activeParticipantId, m09Passed, m09Progress.confirmedKnowledgeBase, m09Progress.assessments, m10Passed, m10Progress.confirmedAssistant, m10Progress.assessments, m11Passed, m11Progress.confirmedPackage, m11Progress.assessments, m11Progress.pairing, m11Progress.revisions, m11Progress.retest])
  const g03Context = useMemo(() => buildG03GroupContext(portalProgress.participantDirectory, g03CurrentEvidence), [portalProgress.participantDirectory, g03CurrentEvidence])
  const g03Progress = useMemo(() => g03ProgressForGroup(g03Store, g03Context), [g03Store, g03Context])
  const g03ProgressPercent = useMemo(() => progressForG03(g03Progress), [g03Progress])
  const g03Passed = useMemo(() => latestG03AssessmentIsCurrent(g03Progress), [g03Progress])
  useEffect(() => {
    setG03Store((current) => {
      if (!current.groups[g03Context.groupId]) return current
      const synchronized = g03ProgressForGroup(current, g03Context)
      if (JSON.stringify(current.groups[g03Context.groupId]) === JSON.stringify(synchronized)) return current
      return { ...current, groups: { ...current.groups, [g03Context.groupId]: synchronized } }
    })
  }, [g03Context])
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
    M09: { progressPercent: m09ProgressPercent, passed: m09Passed, score: m09Score.total },
    M10: { progressPercent: m10ProgressPercent, passed: m10Passed, score: m10Score.total },
    M11: { progressPercent: m11ProgressPercent, passed: m11Passed, score: m11Score.total },
    E01: { progressPercent: e01ProgressPercent, passed: e01Passed, score: e01Score.total },
    E02: { progressPercent: e02ProgressPercent, passed: e02Passed, score: e02Score.total },
    E03: { progressPercent: e03ProgressPercent, passed: e03Passed, score: e03Score.total },
    E04: { progressPercent: e04ProgressPercent, passed: e04Passed, score: e04Score.total },
    E05: { progressPercent: e05ProgressPercent, passed: e05Passed, score: e05Score.total },
    E06: { progressPercent: e06ProgressPercent, passed: e06Passed, score: e06Score.total },
    M12: { progressPercent: m12OfficialProgressPercent, passed: m12Passed, score: m12Score.total },
    G03: { progressPercent: g03ProgressPercent, passed: g03Passed },
  }, selectedElectiveIds: activeElectiveIds, currentMemberElectiveConfirmed: activeMemberElectiveConfirmed }), [m01ProgressPercent, m01Score, m02ProgressPercent, m02Score, m03ProgressPercent, m03Passed, m03Score.total, m04ProgressPercent, m04Passed, m04Score.total, m05ProgressPercent, m05Passed, m05Score.total, g01ProgressPercent, g01Passed, m06ProgressPercent, m06Passed, m06Score.total, m07ProgressPercent, m07Passed, m07Score.total, m08ProgressPercent, m08Passed, m08Score.total, g02ProgressPercent, g02Passed, m09ProgressPercent, m09Passed, m09Score.total, m10ProgressPercent, m10Passed, m10Score.total, m11ProgressPercent, m11Passed, m11Score.total, e01ProgressPercent, e01Passed, e01Score.total, e02ProgressPercent, e02Passed, e02Score.total, e03ProgressPercent, e03Passed, e03Score.total, e04ProgressPercent, e04Passed, e04Score.total, e05ProgressPercent, e05Passed, e05Score.total, e06ProgressPercent, e06Passed, e06Score.total, m12OfficialProgressPercent, m12Passed, m12Score.total, g03ProgressPercent, g03Passed, activeElectiveIds, activeMemberElectiveConfirmed])
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
    M09: {
      taskId: 'M09',
      submittedAt: m09Passed ? m09Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: m09Passed && m09Progress.confirmedKnowledgeBase ? [
        { artifactId: m09Progress.confirmedKnowledgeBase.sourceListArtifactId, name: trainingTasks.M09.outputs[0] },
        { artifactId: m09Progress.confirmedKnowledgeBase.testReportArtifactId, name: trainingTasks.M09.outputs[1] },
      ] : [],
    },
    M10: {
      taskId: 'M10',
      submittedAt: m10Passed ? m10Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: m10Passed && m10Progress.confirmedAssistant
        ? m10Progress.confirmedAssistant.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: m10Progress.confirmedAssistant?.confirmedAt }))
        : [],
    },
    M11: {
      taskId: 'M11',
      submittedAt: m11Passed ? m11Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: m11Passed && m11Progress.confirmedPackage
        ? m11Progress.confirmedPackage.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: m11Progress.confirmedPackage?.confirmedAt }))
        : [],
    },
    E01: {
      taskId: 'E01',
      submittedAt: e01Passed ? e01Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: e01Passed && e01Progress.confirmedPackage
        ? e01Progress.confirmedPackage.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: e01Progress.confirmedPackage?.confirmedAt }))
        : [],
    },
    E02: {
      taskId: 'E02',
      submittedAt: e02Passed ? e02Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: e02Passed && e02Progress.confirmedPackage
        ? e02Progress.confirmedPackage.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: e02Progress.confirmedPackage?.confirmedAt }))
        : [],
    },
    E03: {
      taskId: 'E03',
      submittedAt: e03Passed ? e03Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: e03Passed && e03Progress.confirmedPackage
        ? e03Progress.confirmedPackage.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: e03Progress.confirmedPackage?.confirmedAt }))
        : [],
    },
    E04: {
      taskId: 'E04',
      submittedAt: e04Passed ? e04Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: e04Passed && e04Progress.confirmedPackage
        ? e04Progress.confirmedPackage.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: e04Progress.confirmedPackage?.confirmedAt }))
        : [],
    },
    E05: {
      taskId: 'E05',
      submittedAt: e05Passed ? e05Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: e05Passed && e05Progress.confirmedPackage
        ? e05Progress.confirmedPackage.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: e05Progress.confirmedPackage?.confirmedAt }))
        : [],
    },
    E06: {
      taskId: 'E06',
      submittedAt: e06Passed ? e06Progress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: e06Passed && e06Progress.confirmedPackage
        ? e06Progress.confirmedPackage.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: e06Progress.confirmedPackage?.confirmedAt }))
        : [],
    },
    M12: {
      taskId: 'M12',
      submittedAt: m12Passed ? m12OfficialProgress.assessments.at(-1)?.assessedAt : undefined,
      artifacts: m12Passed && m12OfficialProgress.confirmedBundle ? [
        { artifactId: m12OfficialProgress.confirmedBundle.directoryArtifactId, name: trainingTasks.M12.outputs[0] },
        { artifactId: m12OfficialProgress.confirmedBundle.usageArtifactId, name: trainingTasks.M12.outputs[1] },
        { artifactId: m12OfficialProgress.confirmedBundle.revisionArtifactId, name: trainingTasks.M12.outputs[2] },
      ] : [],
    },
    G03: {
      taskId: 'G03',
      submittedAt: g03Passed ? g03Progress.assessments.at(-1)?.submittedAt : undefined,
      artifacts: g03Passed ? g03Progress.artifacts.map((item) => ({ artifactId: item.artifactId, name: item.name, updatedAt: item.capturedAt })) : [],
    },
  }), [m01Progress.updatedAt, m01Score.passed, m02Progress.updatedAt, m02Score.passed, m03Passed, m03Progress.assessments, m04Passed, m04Progress.assessments, m05Passed, m05Progress.assessments, g01Passed, g01Progress.artifacts, g01Progress.assessments, m06Passed, m06Progress.assessmentHistory, m06Progress.confirmedPackage, m07Passed, m07Progress.assessmentHistory, m07Progress.confirmedDeliverable, m08Passed, m08Progress.assessments, m08Progress.confirmedWebpage, g02Passed, g02Progress.artifacts, g02Progress.assessments, m09Passed, m09Progress.assessments, m09Progress.confirmedKnowledgeBase, m10Passed, m10Progress.assessments, m10Progress.confirmedAssistant, m11Passed, m11Progress.assessments, m11Progress.confirmedPackage, e01Passed, e01Progress.assessments, e01Progress.confirmedPackage, e02Passed, e02Progress.assessments, e02Progress.confirmedPackage, e03Passed, e03Progress.assessments, e03Progress.confirmedPackage, e04Passed, e04Progress.assessments, e04Progress.confirmedPackage, e05Passed, e05Progress.assessments, e05Progress.confirmedPackage, e06Passed, e06Progress.assessments, e06Progress.confirmedPackage, m12Passed, m12OfficialProgress.assessments, m12OfficialProgress.confirmedBundle, g03Passed, g03Progress.assessments, g03Progress.artifacts])

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

  function updateM09Progress(updater: (current: M09Progress) => M09Progress) {
    setM09Store((current) => updateParticipantM09Progress(current, activeParticipantId, updater))
  }

  function updateM10Progress(updater: (current: M10Progress) => M10Progress) {
    setM10Store((current) => updateParticipantM10Progress(current, activeParticipantId, updater))
  }

  function updateM11Progress(updater: (current: M11Progress) => M11Progress) {
    setM11Store((current) => updateParticipantM11Progress(current, activeParticipantId, updater))
  }

  function updateE01Progress(updater: (current: E01Progress) => E01Progress) {
    setE01Store((current) => updateParticipantE01Progress(current, activeParticipantId, updater))
  }

  function updateE02Progress(updater: (current: E02Progress) => E02Progress) {
    setE02Store((current) => updateParticipantE02Progress(current, activeParticipantId, updater))
  }

  function updateE03Progress(updater: (current: E03Progress) => E03Progress) {
    setE03Store((current) => updateParticipantE03Progress(current, activeParticipantId, updater))
  }

  function updateE04Progress(updater: (current: E04Progress) => E04Progress) {
    setE04Store((current) => updateParticipantE04Progress(current, activeParticipantId, updater))
  }

  function updateE05Progress(updater: (current: E05Progress) => E05Progress) {
    setE05Store((current) => updateParticipantE05Progress(current, activeParticipantId, updater))
  }

  function updateE06Progress(updater: (current: E06Progress) => E06Progress) {
    setE06Store((current) => updateParticipantE06Progress(current, activeParticipantId, updater))
  }

  function invalidateE01RosterContext(progress: E01Progress): E01Progress {
    const initial = createInitialE01Progress()
    return {
      ...progress,
      peerReview: initial.peerReview,
      teacherConfirmation: initial.teacherConfirmation,
      confirmedPackage: undefined,
      attemptHistory: archiveE01Attempt(progress, '培训人员名单或当前小组发生变化'),
    }
  }

  function invalidateE02RosterContext(progress: E02Progress): E02Progress {
    const initial = createInitialE02Progress()
    return {
      ...progress,
      peerReview: initial.peerReview,
      modifications: [],
      teacherConfirmation: initial.teacherConfirmation,
      confirmedPackage: undefined,
      attemptHistory: archiveE02Attempt(progress, '培训人员名单或当前小组发生变化'),
    }
  }

  function invalidateE03RosterContext(progress: E03Progress): E03Progress {
    return invalidateE03ReviewContext(progress, '培训人员名单或当前小组发生变化')
  }

  function invalidateE04RosterContext(progress: E04Progress): E04Progress {
    return invalidateE04ReviewContext(progress, '培训人员名单或当前小组发生变化')
  }

  function invalidateE05RosterContext(progress: E05Progress): E05Progress {
    return invalidateE05ReviewContext(progress, '培训人员名单或当前小组发生变化')
  }

  function invalidateE06RosterContext(progress: E06Progress): E06Progress {
    return invalidateE06ReviewContext(progress, '培训人员名单或当前小组发生变化')
  }

  function updateM12Progress(updater: (current: M12Progress) => M12Progress) {
    setM12Store((current) => updateParticipantM12Progress(current, activeParticipantId, updater))
  }
  function invalidateM12ParticipantContext(progress: M12Progress) {
    const initial = createInitialM12Progress()
    const invalidate = (current: M12Progress): M12Progress => ({
      ...current,
      showcase: initial.showcase,
      teacherConfirmation: initial.teacherConfirmation,
      previewCompletedAt: undefined,
      confirmedBundle: undefined,
    })
    return updateOfficialM12Progress(invalidate(progress), invalidate)
  }

  function updateG01Progress(updater: (current: G01Progress) => G01Progress) {
    setG01Store((current) => updateGroupG01Progress(current, g01Context, updater))
  }

  function updateG02Progress(updater: (current: G02Progress) => G02Progress) {
    setG02Store((current) => updateGroupG02Progress(current, g02Context, updater))
  }

  function updateG03Progress(updater: (current: G03Progress) => G03Progress) {
    setG03Store((current) => updateGroupG03Progress(current, g03Context, updater))
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

  function navigateM09(route: M09Route) { updateM09Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextM09(route: M09Route) { const index = m09RouteOrder.indexOf(route); navigateM09(m09RouteOrder[index + 1] ?? 'result') }
  function canNavigateM09(route: M09Route) {
    if (route === 'overview' || route === 'sources') return true
    if (route === 'quality') return validateM09Sources(m09Progress).valid
    if (route === 'build') return validateM09Quality(m09Progress).valid
    if (route === 'first-test') return validateM09Build(m09Progress).valid
    if (route === 'correction-retest') return validateM09FirstTest(m09Progress).valid
    if (route === 'peer-confirm') return validateM09CorrectionRetest(m09Progress).valid
    return confirmedM09KnowledgeBaseIsCurrent(m09Progress, portalProgress.participantDirectory)
  }

  function navigateM10(route: M10Route) { updateM10Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextM10(route: M10Route) { const index = m10RouteOrder.indexOf(route); navigateM10(m10RouteOrder[index + 1] ?? 'result') }
  function canNavigateM10(route: M10Route) {
    if (route === 'overview' || route === 'source') return true
    if (route === 'configuration') return validateM10Source(m10Progress, activeParticipantId).valid
    if (route === 'flow') return validateM10Configuration(m10Progress, activeParticipantId).valid
    if (route === 'boundaries') return validateM10Flow(m10Progress, activeParticipantId).valid
    if (route === 'preview') return validateM10Boundaries(m10Progress, activeParticipantId).valid
    if (route === 'review-confirm') return validateM10Previews(m10Progress, activeParticipantId).valid
    return confirmedM10AssistantIsCurrent(m10Progress, portalProgress.participantDirectory)
  }

  function navigateM11(route: M11Route) { updateM11Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextM11(route: M11Route) { const index = m11RouteOrder.indexOf(route); navigateM11(m11RouteOrder[index + 1] ?? 'result') }
  function canNavigateM11(route: M11Route) {
    if (route === 'overview' || route === 'pairing') return true
    if (route === 'first-test') return validateM11Pairing(m11Progress, portalProgress.participantDirectory, m11M10Evidence).valid
    if (route === 'audit') return validateM11FirstTest(m11Progress, portalProgress.participantDirectory, m11M10Evidence).valid
    if (route === 'revision') return validateM11Audit(m11Progress, portalProgress.participantDirectory, m11M10Evidence).valid
    if (route === 'retest') return validateM11Revisions(m11Progress, portalProgress.participantDirectory, m11M10Evidence).valid
    if (route === 'confirmation') return validateM11Retest(m11Progress, portalProgress.participantDirectory, m11M10Evidence).valid
    return confirmedM11PackageIsCurrent(m11Progress, portalProgress.participantDirectory, m11M10Evidence)
  }

  function navigateE01(route: E01Route) { updateE01Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextE01(route: E01Route) { const index = e01RouteOrder.indexOf(route); navigateE01(e01RouteOrder[index + 1] ?? 'result') }
  function canNavigateE01(route: E01Route) {
    if (route === 'overview' || route === 'input') return true
    if (route === 'rubric') return validateE01Input(e01Progress).valid
    if (route === 'ai-review') return validateE01Rubric(e01Progress).valid && e01Progress.rubric.teacherConfirmed
    if (route === 'teacher-review') return validateE01AiReview(e01Progress, activeParticipantId).valid
    if (route === 'peer-confirm') return validateE01TeacherReview(e01Progress, activeParticipantId).valid
    return confirmedE01PackageIsCurrent(e01Progress, portalProgress.participantDirectory)
  }

  function navigateE02(route: E02Route) { updateE02Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextE02(route: E02Route) { const index = e02RouteOrder.indexOf(route); navigateE02(e02RouteOrder[index + 1] ?? 'result') }
  function canNavigateE02(route: E02Route) {
    if (route === 'overview' || route === 'source') return true
    if (route === 'draft') return validateE02Source(e02Progress).valid
    if (route === 'safety-rubric' || route === 'peer-review') return validateE02InitialDraft(e02Progress, activeParticipantId).valid
    if (route === 'teacher-revision') return validateE02PeerReview(e02Progress, portalProgress.participantDirectory).valid
    if (route === 'confirmation') return validateE02FinalDraft(e02Progress, portalProgress.participantDirectory).valid
    return confirmedE02PackageIsCurrent(e02Progress, portalProgress.participantDirectory)
  }

  function navigateE03(route: E03Route) { updateE03Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextE03(route: E03Route) { const index = e03RouteOrder.indexOf(route); navigateE03(e03RouteOrder[index + 1] ?? 'result') }
  function canNavigateE03(route: E03Route) {
    if (route === 'overview' || route === 'source') return true
    if (route === 'findings') return validateE03Source(e03Progress).valid
    if (route === 'measures') return validateE03Findings(e03Progress, activeParticipantId).valid
    if (route === 'peer-review') return validateE03InitialMeasures(e03Progress, activeParticipantId).valid
    if (route === 'revision') return validateE03PeerReview(e03Progress, portalProgress.participantDirectory).valid
    if (route === 'confirmation') return validateE03Revision(e03Progress, portalProgress.participantDirectory).valid
    return confirmedE03PackageIsCurrent(e03Progress, portalProgress.participantDirectory)
  }

  function navigateE04(route: E04Route) { updateE04Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextE04(route: E04Route) { const index = e04RouteOrder.indexOf(route); navigateE04(e04RouteOrder[index + 1] ?? 'result') }
  function canNavigateE04(route: E04Route) {
    if (route === 'overview' || route === 'source') return true
    if (route === 'nodes') return validateE04Source(e04Progress).valid
    if (route === 'relations') return validateE04Nodes(e04Progress, activeParticipantId).valid
    if (route === 'graph-review') return validateE04Relations(e04Progress, activeParticipantId).valid
    if (route === 'revision') return validateE04GraphReview(e04Progress, portalProgress.participantDirectory).valid
    if (route === 'confirmation') return validateE04Revision(e04Progress, portalProgress.participantDirectory).valid
    return confirmedE04PackageIsCurrent(e04Progress, portalProgress.participantDirectory)
  }

  function navigateE05(route: E05Route) { updateE05Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextE05(route: E05Route) { const index = e05RouteOrder.indexOf(route); navigateE05(e05RouteOrder[index + 1] ?? 'result') }
  function canNavigateE05(route: E05Route) {
    if (route === 'overview' || route === 'source') return true
    if (route === 'mapping') return validateE05Source(e05Progress).valid
    if (route === 'suggestions') return validateE05Mapping(e05Progress, activeParticipantId).valid
    if (route === 'peer-review') return validateE05Suggestions(e05Progress, activeParticipantId).valid && validateE05WebPage(e05Progress, activeParticipantId).valid
    if (route === 'revision') return validateE05PeerReview(e05Progress, portalProgress.participantDirectory).valid
    if (route === 'confirmation') return validateE05Revision(e05Progress, portalProgress.participantDirectory).valid
    return confirmedE05PackageIsCurrent(e05Progress, portalProgress.participantDirectory)
  }

  function navigateE06(route: E06Route) { updateE06Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextE06(route: E06Route) { const index = e06RouteOrder.indexOf(route); navigateE06(e06RouteOrder[index + 1] ?? 'result') }
  function canNavigateE06(route: E06Route) {
    if (route === 'overview' || route === 'question') return true
    if (route === 'review') return validateE06Source(e06Progress).valid
    if (route === 'comparison') return validateE06InitialReview(e06Progress, activeParticipantId).valid
    if (route === 'peer-review') return validateE06Comparisons(e06Progress, activeParticipantId).valid
    if (route === 'revision') return validateE06PeerReview(e06Progress, portalProgress.participantDirectory).valid
    if (route === 'confirmation') return validateE06Revision(e06Progress, portalProgress.participantDirectory).valid
    return confirmedE06PackageIsCurrent(e06Progress, portalProgress.participantDirectory)
  }

  function navigateM12(route: M12Route) { updateM12Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextM12(route: M12Route) { const index = m12RouteOrder.indexOf(route); navigateM12(m12RouteOrder[index + 1] ?? 'result') }
  function canNavigateM12(route: M12Route) {
    if (route === 'overview' || route === 'evidence') return true
    if (route === 'orchestration') return validateM12Evidence(m12Progress, activeParticipantId).valid
    if (route === 'correction') return validateM12Flow(m12Progress, activeParticipantId).valid
    if (route === 'assistant') return validateM12Correction(m12Progress).valid
    if (route === 'integration') return validateM12Assistant(m12Progress).valid
    if (route === 'safety') return validateM12Retest(m12Progress).valid
    return m12Progress.mode === 'preview'
      ? Boolean(m12Progress.previewCompletedAt && validateM12TeacherConfirmation(m12Progress, activeParticipantId).valid)
      : confirmedM12BundleIsCurrent(m12Progress, portalProgress.participantDirectory)
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

  function navigateG03(route: G03Route) { updateG03Progress((current) => ({ ...current, route })); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function nextG03(route: G03Route) { const index = g03RouteOrder.indexOf(route); navigateG03(g03RouteOrder[index + 1] ?? 'assessment') }
  function canNavigateG03(route: G03Route) {
    // 阶段验收页始终可进入，才能在证据未齐时保存一次真实的“未通过初验”。
    // 其余制作步骤仍按前序证据逐段放行。
    if (route === 'overview' || route === 'matrix' || route === 'assessment') return true
    if (route === 'issues') return validateG03Matrix(g03Progress).valid
    if (route === 'scenarios') return validateG03Issues(g03Progress).valid
    if (route === 'showcase') return validateG03Scenarios(g03Progress).valid
    if (route === 'contributions') return validateG03Showcase(g03Progress).valid
    return validateG03Contributions(g03Progress).valid
  }

  function openTask(taskId: TrainingTaskId) {
    if (trainingTasks[taskId].kind === 'elective' && (!activeElectiveIds.some((id) => id === taskId) || !activeMemberElectiveConfirmed)) {
      navigatePortal({ page: 'task', taskId })
      return
    }
    const workspace = taskWorkspaceRegistry[taskId]
    if (workspace?.workspaceId === 'm01' && m01Progress.route === 'day1') updateM01Progress((current) => ({ ...current, route: m01ProgressPercent > 0 ? 'answers' : 'overview' }))
    if (workspace?.workspaceId === 'm02' && m02Progress.route === 'overview' && m02ProgressPercent > 0) updateM02Progress((current) => ({ ...current, route: current.peerReview.submitted ? 'result' : validateM02Selection(current).valid && validateM02Correction(current).valid ? 'peer-review' : current.blindReviewSubmitted ? 'rating' : current.run ? 'compliance' : 'run' }))
    if (workspace?.workspaceId === 'm03' && m03Progress.route === 'overview' && m03ProgressPercent > 0) updateM03Progress((current) => ({ ...current, route: current.v2 ? 'compare' : current.v1 ? 'iteration' : 'design' }))
    if (workspace?.workspaceId === 'm04' && m04Progress.route === 'overview' && m04ProgressPercent > 0) updateM04Progress((current) => ({ ...current, route: current.confirmedPlan ? 'result' : current.peerReview.submitted ? 'confirmation' : current.draft ? 'audit' : 'input' }))
    if (workspace?.workspaceId === 'm05' && m05Progress.route === 'overview' && m05ProgressPercent > 0) updateM05Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : current.peerReview.submitted ? 'peer-review' : current.revisions.length >= 2 ? 'peer-review' : current.draft ? 'audit' : 'input' }))
    if (workspace?.workspaceId === 'm06' && m06Progress.route === 'overview' && m06ProgressPercent > 0) updateM06Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : current.videoPreview ? 'review-confirm' : current.draft ? 'deck' : 'input' }))
    if (workspace?.workspaceId === 'm07' && m07Progress.route === 'overview' && m07ProgressPercent > 0) updateM07Progress((current) => ({ ...current, route: current.confirmedDeliverable ? 'result' : current.draft ? 'statistics' : current.dataCheck.teacherConfirmed ? 'statistics' : 'input' }))
    if (workspace?.workspaceId === 'm08' && m08Progress.route === 'overview' && m08ProgressPercent > 0) updateM08Progress((current) => ({ ...current, route: current.confirmedWebpage ? 'result' : current.peerTest.submitted ? 'peer-confirm' : current.iterationRecords.length === 2 ? 'browser-test' : current.versions.length ? 'iterations' : 'input' }))
    if (workspace?.workspaceId === 'm09' && m09Progress.route === 'overview' && m09ProgressPercent > 0) updateM09Progress((current) => ({ ...current, route: current.confirmedKnowledgeBase ? 'result' : current.retest.length ? 'peer-confirm' : current.firstTest.length ? 'correction-retest' : current.knowledgeBase ? 'first-test' : validateM09Quality(current).valid ? 'build' : current.sources.length ? 'quality' : 'sources' }))
    const m10HasAuthoredWork = Object.values(m10Progress.sixElements).some((value) => value.trim())
      || m10Progress.flowSteps.some((step) => step.action.trim() || step.failureHandling.trim())
      || m10Progress.boundaryRules.some((rule) => rule.trigger.trim() || rule.response.trim() || rule.handoff.trim())
      || Boolean(m10Progress.previews.length || m10Progress.peerReview.reviewId || m10Progress.revisions.length || m10Progress.confirmedAssistant || m10Progress.assessments.length)
    if (workspace?.workspaceId === 'm10' && m10Progress.route === 'overview' && m10HasAuthoredWork) updateM10Progress((current) => ({ ...current, route: confirmedM10AssistantIsCurrent(current, portalProgress.participantDirectory) ? 'result' : validateM10Previews(current, activeParticipantId).valid ? 'review-confirm' : validateM10Boundaries(current, activeParticipantId).valid ? 'preview' : validateM10Flow(current, activeParticipantId).valid ? 'boundaries' : validateM10Configuration(current, activeParticipantId).valid ? 'flow' : validateM10Source(current, activeParticipantId).valid ? 'configuration' : 'source' }))
    if (workspace?.workspaceId === 'm11' && m11Progress.route === 'overview' && m11ProgressPercent > 0) updateM11Progress((current) => ({ ...current, route: confirmedM11PackageIsCurrent(current, portalProgress.participantDirectory, m11M10Evidence) ? 'result' : validateM11Retest(current, portalProgress.participantDirectory, m11M10Evidence).valid ? 'confirmation' : validateM11Revisions(current, portalProgress.participantDirectory, m11M10Evidence).valid ? 'retest' : validateM11Audit(current, portalProgress.participantDirectory, m11M10Evidence).valid ? 'revision' : validateM11FirstTest(current, portalProgress.participantDirectory, m11M10Evidence).valid ? 'audit' : validateM11Pairing(current, portalProgress.participantDirectory, m11M10Evidence).valid ? 'first-test' : 'pairing' }))
    if (workspace?.workspaceId === 'e01' && e01Progress.route === 'overview' && e01ProgressPercent > 0) updateE01Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : validateE01TeacherReview(current, activeParticipantId).valid ? 'peer-confirm' : validateE01AiReview(current, activeParticipantId).valid ? 'teacher-review' : validateE01Rubric(current).valid && current.rubric.teacherConfirmed ? 'ai-review' : validateE01Input(current).valid ? 'rubric' : 'input' }))
    if (workspace?.workspaceId === 'e02' && e02Progress.route === 'overview' && e02ProgressPercent > 0) updateE02Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : validateE02FinalDraft(current, portalProgress.participantDirectory).valid ? 'confirmation' : validateE02PeerReview(current, portalProgress.participantDirectory).valid ? 'teacher-revision' : current.peerReview.recordId ? 'peer-review' : validateE02InitialDraft(current, activeParticipantId).valid ? 'safety-rubric' : validateE02Source(current).valid ? 'draft' : 'source' }))
    if (workspace?.workspaceId === 'e03' && e03Progress.route === 'overview' && e03ProgressPercent > 0) updateE03Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : validateE03Revision(current, portalProgress.participantDirectory).valid ? 'confirmation' : current.peerReview.submitted ? 'revision' : validateE03InitialMeasures(current, activeParticipantId).valid ? 'peer-review' : validateE03Findings(current, activeParticipantId).valid ? 'measures' : current.aiDraft ? 'findings' : validateE03Source(current).valid ? 'findings' : 'source' }))
    if (workspace?.workspaceId === 'e04' && e04Progress.route === 'overview' && e04ProgressPercent > 0) updateE04Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : validateE04Revision(current, portalProgress.participantDirectory).valid ? 'confirmation' : current.graphReview.submitted ? 'revision' : validateE04Relations(current, activeParticipantId).valid ? 'graph-review' : current.aiDraft ? 'nodes' : validateE04Source(current).valid ? 'nodes' : 'source' }))
    if (workspace?.workspaceId === 'e05' && e05Progress.route === 'overview' && e05ProgressPercent > 0) updateE05Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : validateE05Revision(current, portalProgress.participantDirectory).valid ? 'confirmation' : current.peerReview.submitted ? 'revision' : validateE05WebPage(current, activeParticipantId).valid ? 'peer-review' : validateE05Mapping(current, activeParticipantId).valid ? 'suggestions' : validateE05Source(current).valid ? 'mapping' : 'source' }))
    if (workspace?.workspaceId === 'e06' && e06Progress.route === 'overview' && e06ProgressPercent > 0) updateE06Progress((current) => ({ ...current, route: current.confirmedPackage ? 'result' : validateE06Revision(current, portalProgress.participantDirectory).valid ? 'confirmation' : current.peerReview.submitted ? 'revision' : validateE06Comparisons(current, activeParticipantId).valid ? 'peer-review' : validateE06InitialReview(current, activeParticipantId).valid ? 'comparison' : validateE06Source(current).valid ? 'review' : 'question' }))
    if (workspace?.workspaceId === 'm12' && m12Progress.route === 'overview' && m12WorkbenchProgressPercent > 0) updateM12Progress((current) => ({ ...current, route: current.previewCompletedAt || current.confirmedBundle ? 'result' : validateM12Retest(current).valid ? 'safety' : validateM12Assistant(current).valid ? 'integration' : validateM12Correction(current).valid ? 'assistant' : validateM12Flow(current, activeParticipantId).valid ? 'correction' : validateM12Evidence(current, activeParticipantId).valid ? 'orchestration' : 'evidence' }))
    if (workspace?.workspaceId === 'g02' && g02Progress.route === 'overview' && g02ProgressPercent > 0) updateG02Progress((current) => ({ ...current, route: current.assessments.length ? 'assessment' : current.feedbackConfirmed ? 'revision' : current.showcase.confirmed ? 'feedback' : current.directoryConfirmed ? 'showcase' : 'directory' }))
    if (workspace?.workspaceId === 'g03' && g03Progress.route === 'overview' && g03ProgressPercent > 0) updateG03Progress((current) => ({ ...current, route: current.assessments.length ? 'assessment' : validateG03Contributions(current).valid ? 'assessment' : validateG03Showcase(current).valid ? 'contributions' : validateG03Scenarios(current).valid ? 'showcase' : validateG03Issues(current).valid ? 'scenarios' : validateG03Matrix(current).valid ? 'issues' : 'matrix' }))
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

  function resetM09() {
    if (!window.confirm('重置后将只清除当前教师的 M09 来源、质检、知识库、首复测、小组测试和验收历史，是否继续？')) return
    setM09Store((current) => clearParticipantM09Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetM10() {
    if (!window.confirm('重置后将只清除当前教师的 M10 助教配置、预览、互评、修订和验收历史，是否继续？')) return
    setM10Store((current) => updateParticipantM10Progress(clearParticipantM10Progress(current, activeParticipantId), activeParticipantId, (saved) => synchronizeM10Source(saved, m10KnowledgeSource)))
    window.scrollTo({ top: 0 })
  }

  function resetM11() {
    if (!window.confirm('重置后将只清除当前教师的 M11 配对、首复测、逐题审校、修订和验收历史，是否继续？')) return
    setM11Store((current) => clearParticipantM11Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetE01() {
    if (!window.confirm('重置后将只清除当前教师的 E01 量规、五份试评、人工修正、同组复核和验收历史，是否继续？')) return
    setE01Store((current) => clearParticipantE01Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetE02() {
    if (!window.confirm('重置后将只清除当前教师的 E02 任务书、安全检查、100 分量规、同组复核和验收历史，是否继续？')) return
    setE02Store((current) => clearParticipantE02Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetE03() {
    if (!window.confirm('重置后将只清除当前教师的 E03 课堂发现、改进措施、同组复核、修订与验收历史，是否继续？')) return
    setE03Store((current) => clearParticipantE03Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetE04() {
    if (!window.confirm('重置后将只清除当前教师的 E04 来源、节点关系、同组复核、人工修正与验收历史，是否继续？')) return
    setE04Store((current) => clearParticipantE04Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetE05() {
    if (!window.confirm('重置后将只清除当前教师的 E05 课程与岗位来源、映射网页、差距建议、同组复核、人工修正和验收历史，是否继续？')) return
    setE05Store((current) => clearParticipantE05Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetE06() {
    if (!window.confirm('重置后将只清除当前教师的 E06 教研问题、文献梳理、观点对比、引用核验、人工修正和验收历史，是否继续？')) return
    setE06Store((current) => clearParticipantE06Progress(current, activeParticipantId))
    window.scrollTo({ top: 0 })
  }

  function resetM12() {
    if (!window.confirm('重置后将只清除当前教师的 M12 成果目录、流程编排、联调修改、展示确认和验收历史，是否继续？')) return
    setM12Store((current) => clearParticipantM12Progress(current, activeParticipantId))
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

  function resetG03() {
    if (!window.confirm('重置后只清除当前小组的 G03 双向矩阵、问题闭环、场景、路演、贡献和验收历史，是否继续？')) return
    setG03Store((current) => clearGroupG03Progress(current, g03Context.groupId))
    window.scrollTo({ top: 0 })
  }

  function resetAll() {
    if (!window.confirm('重置后将恢复示例培训人员名单，并清除选修选择、全部教师的 M01—M12、E01—E06 进度和所有小组 G01—G03 验收数据，是否继续？')) return
    setM01Progress(clearProgress())
    setPortalProgress(clearPortalProgress())
    setM02Store(clearAllM02Progress())
    setM03Store(clearAllM03Progress())
    setM04Store(clearAllM04Progress())
    setM05Store(clearAllM05Progress())
    setM06Store(clearAllM06Progress())
    setM07Store(clearAllM07Progress())
    setM08Store(clearAllM08Progress())
    setM09Store(clearAllM09Progress())
    setM10Store(clearAllM10Progress())
    setM11Store(clearAllM11Progress())
    setE01Store(clearAllE01Progress())
    setE02Store(clearAllE02Progress())
    setE03Store(clearAllE03Progress())
    setE04Store(clearAllE04Progress())
    setE05Store(clearAllE05Progress())
    setE06Store(clearAllE06Progress())
    setM12Store(clearAllM12Progress())
    setG01Store(clearAllG01Progress())
    setG02Store(clearAllG02Progress())
    setG03Store(clearAllG03Progress())
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

  function loadM09Samples() {
    updateM09Progress((current) => ({
      ...invalidateM09Pipeline(current, '重新载入课程样例'),
      sources: createM09SampleSources(),
      importNotice: '已载入 4 份课程样例。S02 缺页、S03 局部重复、S04 错误版本将在下一步分别处置。',
    }))
  }

  async function readM09LocalFiles(files: File[]) {
    const accepted = files.filter((file) => /\.(?:txt|md)$/iu.test(file.name) && file.size > 0)
    const rejected = files.filter((file) => !/\.(?:txt|md)$/iu.test(file.name) || file.size === 0)
    const loaded = await Promise.all(accepted.map(async (file, index) => createM09LocalSource(`L${Date.now()}-${index + 1}`, file.name, await file.text())))
    updateM09Progress((current) => ({
      ...invalidateM09Pipeline(current, '读取或追加本地资料'),
      sources: [...current.sources, ...loaded],
      importNotice: `已在浏览器本地读取 ${loaded.length} 份；${rejected.length ? `拒绝 ${rejected.length} 份空文件或非 .txt/.md 文件；` : ''}内容未上传。请补全版本、范围、授权和教师决定。`,
    }))
  }

  function updateM09Scenario(patch: Partial<M09Scenario>) {
    updateM09Progress((current) => ({ ...invalidateM09Pipeline(current, '课程场景发生变化'), scenario: { ...current.scenario, ...patch } }))
  }

  function updateM09Source(sourceId: string, patch: Partial<M09SourceRecord>) {
    updateM09Progress((current) => ({ ...invalidateM09Pipeline(current, `资料 ${sourceId} 登记信息发生变化`), sources: current.sources.map((source) => source.sourceId === sourceId ? { ...source, ...patch } : source) }))
  }

  function removeM09Source(sourceId: string) {
    updateM09Progress((current) => ({ ...invalidateM09Pipeline(current, `移除资料 ${sourceId}`), sources: current.sources.filter((source) => source.sourceId !== sourceId) }))
  }

  function applyM09QualityRecommendations() {
    updateM09Progress((current) => ({ ...invalidateM09Pipeline(current, '质量处置发生变化'), sources: applyRecommendedM09Quality(current.sources) }))
  }

  function resolveM09Quality(sourceId: string, issueType: M09QualityIssueType, action: M09QualityAction, rationale?: string) {
    updateM09Progress((current) => ({ ...invalidateM09Pipeline(current, `资料 ${sourceId} 质量处置发生变化`), sources: current.sources.map((source) => source.sourceId === sourceId ? resolveM09QualityFinding(source, issueType, action, rationale) : source) }))
  }

  function buildM09KnowledgeBase() {
    updateM09Progress((current) => {
      const next = invalidateM09Pipeline(current, '重新建立知识库 v0')
      return { ...next, knowledgeBase: new LocalM09KnowledgeRunner().build({ ...next, sources: current.sources }, activeParticipantId) }
    })
  }

  function runM09FirstTest() {
    updateM09Progress((current) => ({ ...current, firstTest: new LocalM09KnowledgeRunner().runTests(current, 'first'), firstTestFrozen: true, corrections: [], retest: [], peerTest: createInitialM09Progress().peerTest, teacherConfirmation: createInitialM09Progress().teacherConfirmation, confirmedKnowledgeBase: undefined }))
  }

  function verifyM09Test(round: 'first' | 'retest', questionId: string, checked: boolean) {
    updateM09Progress((current) => ({ ...current, [round === 'first' ? 'firstTest' : 'retest']: (round === 'first' ? current.firstTest : current.retest).map((item) => item.questionId === questionId ? { ...item, teacherVerified: checked } : item), confirmedKnowledgeBase: undefined }))
  }

  function verifyAllM09Tests(round: 'first' | 'retest') {
    updateM09Progress((current) => ({ ...current, [round === 'first' ? 'firstTest' : 'retest']: (round === 'first' ? current.firstTest : current.retest).map((item) => ({ ...item, teacherVerified: true })), confirmedKnowledgeBase: undefined }))
  }

  function saveM09Correction() {
    updateM09Progress((current) => {
      const correction = createM09Correction(current)
      const testHistory = current.retest.length ? archiveM09TestChain(current, '新增实质修正，上一轮复测转入历史') : current.testHistory
      return {
        ...current,
        answerRule: correction.target === '回答规则' ? { version: correction.ruleVersion, text: correction.after } : current.answerRule,
        corrections: [...current.corrections, correction],
        retest: [],
        peerTest: createInitialM09Progress().peerTest,
        teacherConfirmation: createInitialM09Progress().teacherConfirmation,
        confirmedKnowledgeBase: undefined,
        testHistory,
      }
    })
  }

  function runM09Retest() {
    updateM09Progress((current) => ({ ...current, retest: new LocalM09KnowledgeRunner().runTests(current, 'retest'), peerTest: createInitialM09Progress().peerTest, teacherConfirmation: createInitialM09Progress().teacherConfirmation, confirmedKnowledgeBase: undefined }))
  }

  function updateM09Peer(patch: Partial<M09PeerTest>) {
    updateM09Progress((current) => ({ ...current, peerTest: { ...current.peerTest, ...patch, submitted: patch.submitted ?? false }, confirmedKnowledgeBase: undefined }))
  }

  const activeTaskId = portalProgress.route.page === 'task' ? portalProgress.route.taskId : undefined
  const activeWorkspace = activeTaskId
    && (trainingTasks[activeTaskId].kind !== 'elective' || (activeMemberElectiveConfirmed && activeElectiveIds.some((id) => id === activeTaskId)))
    ? taskWorkspaceRegistry[activeTaskId]
    : undefined
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

  if (activeWorkspace?.workspaceId === 'm09') {
    const activeRoute = m09Progress.route
    let page: React.ReactNode
    switch (activeRoute) {
      case 'overview': page = <M09Overview onNext={() => nextM09('overview')} />; break
      case 'sources': page = <M09SourcesPage progress={m09Progress} onLoadSamples={loadM09Samples} onFiles={readM09LocalFiles} onUpdateScenario={updateM09Scenario} onUpdateSource={updateM09Source} onRemoveSource={removeM09Source} onNext={() => nextM09('sources')} />; break
      case 'quality': page = <M09QualityPage progress={m09Progress} onApplyRecommendations={applyM09QualityRecommendations} onResolve={resolveM09Quality} onNext={() => nextM09('quality')} />; break
      case 'build': page = <M09BuildPage progress={m09Progress} onBuild={buildM09KnowledgeBase} onNext={() => nextM09('build')} />; break
      case 'first-test': page = <M09FirstTestPage progress={m09Progress} onUpdateQuestion={(questionId, question) => updateM09Progress((current) => current.firstTestFrozen ? current : ({ ...current, questions: current.questions.map((item) => item.questionId === questionId ? { ...item, question } : item), confirmedKnowledgeBase: undefined }))} onRun={runM09FirstTest} onVerify={(questionId, checked) => verifyM09Test('first', questionId, checked)} onVerifyAll={() => verifyAllM09Tests('first')} onNext={() => nextM09('first-test')} />; break
      case 'correction-retest': page = <M09CorrectionRetestPage progress={m09Progress} onUpdateDraft={(patch: Partial<M09CorrectionDraft>) => updateM09Progress((current) => ({ ...current, correctionDraft: { ...current.correctionDraft, ...patch }, confirmedKnowledgeBase: undefined }))} onSaveCorrection={saveM09Correction} onRunRetest={runM09Retest} onVerify={(questionId, checked) => verifyM09Test('retest', questionId, checked)} onVerifyAll={() => verifyAllM09Tests('retest')} onNext={() => nextM09('correction-retest')} />; break
      case 'peer-confirm': page = <M09PeerConfirmPage progress={m09Progress} directory={portalProgress.participantDirectory} onUpdatePeer={updateM09Peer} onSimulatePeer={() => updateM09Progress((current) => ({ ...current, peerTest: simulateM09PeerTest(current, portalProgress.participantDirectory), confirmedKnowledgeBase: undefined }))} onSubmitPeer={() => updateM09Progress((current) => ({ ...current, peerTest: { ...current.peerTest, submitted: true, submittedAt: new Date().toISOString() }, confirmedKnowledgeBase: undefined }))} onUpdateConfirmation={(patch) => updateM09Progress((current) => ({ ...current, teacherConfirmation: { ...current.teacherConfirmation, ...patch }, confirmedKnowledgeBase: undefined }))} onConfirm={() => updateM09Progress((current) => ({ ...current, confirmedKnowledgeBase: createConfirmedM09KnowledgeBase(current, portalProgress.participantDirectory) }))} onNext={() => nextM09('peer-confirm')} />; break
      case 'result': page = <M09ResultPage progress={m09Progress} result={m09Score} directory={portalProgress.participantDirectory} onNavigate={navigateM09} onSubmitAssessment={() => updateM09Progress((current) => ({ ...current, assessments: [...current.assessments, createM09Assessment(current, portalProgress.participantDirectory)] }))} onReset={resetM09} />; break
      default: page = <M09Overview onNext={() => nextM09('overview')} />
    }
    const task = trainingTasks.M09
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m09ShellSteps} progressPercent={m09ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM09} canNavigate={canNavigateM09} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-3' })} onReset={resetM09}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm10') {
    const activeRoute = m10Progress.route
    const task = trainingTasks.M10
    const page = <M10WorkspacePage progress={m10Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} onUpdate={updateM10Progress} onNavigate={navigateM10} onNext={() => nextM10(activeRoute)} onReset={resetM10} onOpenM09={() => openTask('M09')} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m10ShellSteps} progressPercent={m10ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM10} canNavigate={canNavigateM10} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-3' })} onReset={resetM10}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm11') {
    const activeRoute = m11Progress.route
    const task = trainingTasks.M11
    const page = <M11WorkspacePage progress={m11Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} m10Evidence={m11M10Evidence} onUpdate={updateM11Progress} onNavigate={navigateM11} onNext={() => nextM11(activeRoute)} onReset={resetM11} onOpenM10={() => openTask('M10')} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m11ShellSteps} progressPercent={m11ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM11} canNavigate={canNavigateM11} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-3' })} onReset={resetM11}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'e01') {
    const activeRoute = e01Progress.route
    const task = trainingTasks.E01
    const page = <E01WorkspacePage progress={e01Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} onUpdate={updateE01Progress} onNavigate={navigateE01} onNext={() => nextE01(activeRoute)} onReset={resetE01} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '选修' }} steps={e01ShellSteps} progressPercent={e01ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateE01} canNavigate={canNavigateE01} onExitTask={() => navigatePortal({ page: 'tasks', groupId: groupForTask('E01', portalProgress.electiveAssignments) ?? 'elective-pool' })} onReset={resetE01}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'e02') {
    const activeRoute = e02Progress.route
    const task = trainingTasks.E02
    const page = <E02WorkspacePage progress={e02Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} onUpdate={updateE02Progress} onNavigate={navigateE02} onNext={() => nextE02(activeRoute)} onReset={resetE02} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '选修' }} steps={e02ShellSteps} progressPercent={e02ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateE02} canNavigate={canNavigateE02} onExitTask={() => navigatePortal({ page: 'tasks', groupId: groupForTask('E02', portalProgress.electiveAssignments) ?? 'elective-pool' })} onReset={resetE02}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'e03') {
    const activeRoute = e03Progress.route
    const task = trainingTasks.E03
    const page = <E03WorkspacePage progress={e03Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} onUpdate={updateE03Progress} onNavigate={navigateE03} onNext={() => nextE03(activeRoute)} onReset={resetE03} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '选修' }} steps={e03ShellSteps} progressPercent={e03ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateE03} canNavigate={canNavigateE03} onExitTask={() => navigatePortal({ page: 'tasks', groupId: groupForTask('E03', portalProgress.electiveAssignments) ?? 'elective-pool' })} onReset={resetE03}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'e04') {
    const activeRoute = e04Progress.route
    const task = trainingTasks.E04
    const page = <E04WorkspacePage progress={e04Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} onUpdate={updateE04Progress} onNavigate={navigateE04} onNext={() => nextE04(activeRoute)} onReset={resetE04} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '选修' }} steps={e04ShellSteps} progressPercent={e04ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateE04} canNavigate={canNavigateE04} onExitTask={() => navigatePortal({ page: 'tasks', groupId: groupForTask('E04', portalProgress.electiveAssignments) ?? 'elective-pool' })} onReset={resetE04}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'e05') {
    const activeRoute = e05Progress.route
    const task = trainingTasks.E05
    const page = <E05WorkspacePage progress={e05Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} onUpdate={updateE05Progress} onNavigate={navigateE05} onNext={() => nextE05(activeRoute)} onReset={resetE05} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '选修' }} steps={e05ShellSteps} progressPercent={e05ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateE05} canNavigate={canNavigateE05} onExitTask={() => navigatePortal({ page: 'tasks', groupId: groupForTask('E05', portalProgress.electiveAssignments) ?? 'elective-pool' })} onReset={resetE05}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'e06') {
    const activeRoute = e06Progress.route
    const task = trainingTasks.E06
    const page = <E06WorkspacePage progress={e06Progress} participantId={activeParticipantId} directory={portalProgress.participantDirectory} onUpdate={updateE06Progress} onNavigate={navigateE06} onNext={() => nextE06(activeRoute)} onReset={resetE06} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '选修' }} steps={e06ShellSteps} progressPercent={e06ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateE06} canNavigate={canNavigateE06} onExitTask={() => navigatePortal({ page: 'tasks', groupId: groupForTask('E06', portalProgress.electiveAssignments) ?? 'elective-pool' })} onReset={resetE06}>{page}</TrainingShell>
  }

  if (activeWorkspace?.workspaceId === 'm12') {
    const activeRoute = m12Progress.route
    const task = trainingTasks.M12
    const page = <M12WorkspacePage progress={m12Progress} officialEvidence={m12OfficialEvidence} participantId={activeParticipantId} directory={portalProgress.participantDirectory} correctionOptions={m12CorrectionOptions} assistantOptions={m12AssistantOptions} onUpdate={updateM12Progress} onNavigate={navigateM12} onNext={() => nextM12(activeRoute)} onOpenSource={openTask} onReset={resetM12} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '必修' }} steps={m12ShellSteps} progressPercent={m12WorkbenchProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateM12} canNavigate={canNavigateM12} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-3' })} onReset={resetM12}>{page}</TrainingShell>
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

  if (activeWorkspace?.workspaceId === 'g03') {
    const activeRoute = g03Progress.route
    const task = trainingTasks.G03
    const page = <G03WorkspacePage progress={g03Progress} onUpdate={updateG03Progress} onNavigate={navigateG03} onSubmitAssessment={() => updateG03Progress((current) => { const result = createG03Assessment(current, activeParticipant?.name ?? '培训师'); return { ...current, assessments: [...current.assessments, result.assessment], artifacts: result.artifacts, assessmentModificationSummary: '' } })} onReset={resetG03} />
    return <TrainingShell route={activeRoute} task={{ id: task.id, title: task.title, duration: task.duration, kindLabel: '阶段验收' }} steps={g03ShellSteps} progressPercent={g03ProgressPercent} currentParticipant={activeParticipant} participantDirectory={portalProgress.participantDirectory} onNavigate={navigateG03} canNavigate={canNavigateG03} onExitTask={() => navigatePortal({ page: 'tasks', groupId: 'day-3' })} onReset={resetG03}>{page}</TrainingShell>
  }

  let portalPage: React.ReactNode
  const route = portalProgress.route
  switch (route.page) {
    case 'dashboard': portalPage = <TrainingDashboard snapshot={trainingSnapshot} onNavigate={navigatePortal} onOpenTask={openTask} />; break
    case 'tasks': portalPage = <TaskListPage groupId={route.groupId} focusElectiveBucketId={route.focusElectiveBucketId} snapshot={trainingSnapshot} electiveAssignments={portalProgress.electiveAssignments} electiveSelection={activeGroupElectiveSelection} participantDirectory={portalProgress.participantDirectory} currentMemberElectiveConfirmed={activeMemberElectiveConfirmed} onElectiveChange={(assignments) => setPortalProgress((current) => updateElectiveAssignments(current, assignments))} onElectiveConfirm={() => setPortalProgress((current) => confirmCurrentMemberElectiveSelection(current))} onNavigate={navigatePortal} onOpenTask={openTask} />; break
    case 'participants': portalPage = <ParticipantsPage directory={portalProgress.participantDirectory} onConfirm={(directory) => { setPortalProgress((current) => updateParticipantDirectory(current, directory)); updateM01Progress((current) => ({ ...current, groupReview: createInitialGroupReview() })); setM02Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', submitted: false } }])) })); setM03Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', submitted: false }, assessmentModificationSummary: '' }])) })); setM04Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', submitted: false }, confirmedPlan: undefined, assessmentModificationSummary: '' }])) })); setM05Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, targetParticipantId: '', targetArtifactId: '', targetQuestionId: '', submitted: false }, confirmedPackage: undefined, assessmentModificationSummary: '' }])) })); setM06Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, reviewerId: '', artifactId: '', submitted: false }, confirmedPackage: undefined }])) })); setM07Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerReview: { ...progress.peerReview, reviewerId: '', artifactId: '', submitted: false }, confirmedDeliverable: undefined }])) })); setM08Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerTest: { ...progress.peerTest, reviewerId: '', artifactId: '', submitted: false }, confirmedWebpage: undefined }])) })); setM09Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, { ...progress, peerTest: { ...createInitialM09Progress().peerTest }, teacherConfirmation: createInitialM09Progress().teacherConfirmation, confirmedKnowledgeBase: undefined }])) })); setM10Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateM10ReviewContext(progress, '培训人员名单或当前小组发生变化')])) })); setM11Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateM11PairingContext(progress, '培训人员名单或当前小组发生变化')])) })); setE01Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateE01RosterContext(progress)])) })); setE02Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateE02RosterContext(progress)])) })); setE03Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateE03RosterContext(progress)])) })); setE04Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateE04RosterContext(progress)])) })); setE05Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateE05RosterContext(progress)])) })); setE06Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateE06RosterContext(progress)])) })); setM12Store((current) => ({ ...current, participants: Object.fromEntries(Object.entries(current.participants).map(([participantId, progress]) => [participantId, invalidateM12ParticipantContext(progress)])) })); setG01Store((current) => invalidateAllG01Progress(current)); setG02Store((current) => invalidateAllG02Progress(current)); setG03Store((current) => invalidateAllG03Progress(current)) }} onCurrentParticipantChange={(participantId) => { setPortalProgress((current) => updateParticipantDirectory(current, { ...current.participantDirectory, currentParticipantId: participantId })); updateM01Progress((current) => ({ ...current, groupReview: createInitialGroupReview() })) }} />; break
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
