export type UserRole = "teacher" | "student" | "manager";

export type LearningStage =
  | "home"
  | "teach"
  | "learn"
  | "assess"
  | "report"
  | "research"
  | "training";

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface DifficultyLabel {
  level: DifficultyLevel;
  label: "基础" | "入门" | "进阶" | "挑战" | "拓展";
  reason: string;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  mastery: number;
  difficulty: DifficultyLabel;
  prerequisite?: string;
}

export interface LessonStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  type: "warmup" | "concept" | "compare" | "practice" | "quiz";
  resource: string;
}

export interface LessonPlan {
  title: string;
  subtitle: string;
  duration: number;
  objectives: string[];
  steps: LessonStep[];
  knowledgePoints: KnowledgePoint[];
}

export type TeachingMode = "院校教学" | "企业培训";
export type LearnerLevel = "基础薄弱" | "基础一般" | "基础较好";
export type DeliveryMode = "线下课堂" | "线上直播" | "混合式教学";

export interface TeachingContext {
  mode: TeachingMode;
  audience: string;
  learnerLevel: LearnerLevel;
  learnerCount: number;
  deliveryMode: DeliveryMode;
  duration: number;
  targetDifficulty: DifficultyLevel;
  focus: string;
}

export type CourseResourceOrigin = "standard" | "ai-generated";
export type CourseResourceStatus =
  | "standard"
  | "draft"
  | "published"
  | "archived";
export type CourseResourceKind =
  | "课程标准"
  | "课程大纲"
  | "课程讲义"
  | "教学课件"
  | "案例集"
  | "习题集"
  | "评分量规"
  | "情境化教案"
  | "课堂活动包"
  | "配套题目集"
  | "教学进度方案";

export interface CourseResource {
  id: string;
  title: string;
  kind: CourseResourceKind;
  origin: CourseResourceOrigin;
  status: CourseResourceStatus;
  courseId: string;
  unitId: string;
  lessonId: string;
  version: string;
  updatedAt: string;
  knowledgePoints: string[];
  scenario?: TeachingMode;
  parentVersion?: string;
  description: string;
}

export interface StandardLesson {
  id: string;
  title: string;
  sequence: number;
  duration: number;
  difficulty: DifficultyLevel;
  objectives: string[];
  knowledgePoints: string[];
  resourceIds: string[];
  steps: LessonStep[];
}

export interface CourseUnit {
  id: string;
  title: string;
  sequence: number;
  lessons: StandardLesson[];
}

export interface StandardCourse {
  id: string;
  title: string;
  version: string;
  description: string;
  units: CourseUnit[];
}

export interface PlanAdjustment {
  dimension: "教学目标" | "教学难度" | "教学节奏" | "教学活动" | "配套题目";
  before: string;
  after: string;
  reason: string;
}

export interface TeachingProgressPlan {
  totalSessions: number;
  currentSession: number;
  milestones: Array<{ label: string; timing: string; outcome: string }>;
}

export interface AdaptedLessonPlan extends LessonPlan {
  id: string;
  courseId: string;
  unitId: string;
  standardLessonId: string;
  version: string;
  status: "generated" | "draft" | "published";
  context: TeachingContext;
  adjustments: PlanAdjustment[];
  progress: TeachingProgressPlan;
  supportingQuestions: QuestionItem[];
  resourceIds: string[];
}

export interface LearningRecord {
  label: string;
  value: string;
  delta?: string;
}

export interface PracticeQuestion {
  id: string;
  title: string;
  hint: string;
  difficulty: DifficultyLabel;
  knowledgePoint: string;
  completed: boolean;
}

export interface PracticeSet {
  title: string;
  reason: string;
  questions: PracticeQuestion[];
}

export type ObservationScope = "lesson" | "week" | "unit";
export type LearningEvidenceSource =
  | "学习任务"
  | "课堂练习"
  | "作品迭代"
  | "测评过程"
  | "AI助教";

export interface LearningEvidence {
  id: string;
  studentId: string;
  studentName: string;
  knowledgePointId: string;
  source: LearningEvidenceSource;
  summary: string;
  observedAt: string;
  confidence: number;
  artifact: string;
}

export interface LearningSignal {
  id: string;
  studentId: string;
  studentName: string;
  type:
    | "进度滞后"
    | "连续尝试未改善"
    | "任务未开始"
    | "作品缺少迭代"
    | "助教问题未解决";
  level: "high" | "medium";
  title: string;
  detail: string;
  knowledgePointId: string;
  evidenceIds: string[];
}

export interface LearningObservationSnapshot {
  scope: ObservationScope;
  courseId: string;
  classId: string;
  className: string;
  unitId: string;
  unitTitle: string;
  updatedAt: string;
  learnerCount: number;
  metrics: {
    participationRate: number;
    completionRate: number;
    onTrackCount: number;
    attentionCount: number;
  };
  trends: Array<{
    label: string;
    participation: number;
    completion: number;
    practice: number;
    iteration: number;
  }>;
  stages: Array<{
    label: string;
    count: number;
    tone: "green" | "blue" | "amber" | "coral";
  }>;
  signals: LearningSignal[];
  evidence: LearningEvidence[];
}

export interface LearningMastery {
  knowledgePointId: string;
  name: string;
  target: number;
  current: number | null;
  change: number;
  confidence: number;
  status: "达成良好" | "需要巩固" | "重点补强" | "证据不足";
  evidenceIds: string[];
  updatedAt: string;
}

export interface LearningDiagnosis {
  scope: ObservationScope;
  unitId: string;
  summary: string;
  mastery: LearningMastery[];
  misconceptions: Array<{
    title: string;
    detail: string;
    count: number;
    knowledgePointId: string;
  }>;
  tutorInsights: Array<{
    question: string;
    count: number;
    knowledgePointId: string;
    unresolved: boolean;
  }>;
  difficultyFit: Array<{ label: string; count: number; note: string }>;
  generatedAt: string;
}

export interface LearnerGroup {
  id: "support" | "consolidate" | "extend";
  name: "补强组" | "巩固组" | "拓展组";
  purpose: string;
  reason: string;
  knowledgePointId: string;
  memberIds: string[];
}

export interface InterventionPlan {
  id: string;
  source: "learning-promotion" | "teaching-diagnosis";
  groupId: LearnerGroup["id"];
  targetKnowledgePointId: string;
  title: string;
  objective: string;
  activity: string;
  resource: string;
  questionCount: number;
  difficulty: DifficultyLevel;
  duration: number;
  dueAt: string;
  recipients: string[];
  version: string;
  status: "draft" | "published";
}

export interface InterventionAssignment {
  id: string;
  planId: string;
  studentId: string;
  assignedAt: string;
  status: "assigned" | "completed";
}

export interface StudentLearningTask {
  id: string;
  planId: string;
  studentId: string;
  classId: string;
  courseId: string;
  source: InterventionPlan["source"];
  title: string;
  description: string;
  knowledgePoint: string;
  difficulty: DifficultyLevel;
  duration: number;
  dueAt: string;
  status: "assigned" | "completed";
}

export interface ScoreEvidence {
  label: string;
  value: number;
  max: number;
  note: string;
}

export interface MachineScore {
  value: number;
  max: 30;
  correct: number;
  total: number;
}

export interface AiRubricScore {
  value: number;
  originalValue: number;
  max: 50;
  confidence: number;
  evidence: ScoreEvidence[];
}

export interface ManualScore {
  value: number;
  max: 20;
  note: string;
}

export interface AssessmentSubmission {
  student: string;
  studentId: string;
  status: "待复核" | "已完成" | "异常";
  submittedAt: string;
  machine: MachineScore;
  ai: AiRubricScore;
  manual: ManualScore;
}

export interface RecommendationAction {
  priority: "立即补强" | "继续巩固" | "拓展挑战";
  title: string;
  description: string;
  action: string;
}

export interface AssessmentReport {
  completionRate: number;
  averageScore: number;
  aiReviewRate: number;
  difficultyFit: number;
  recommendations: RecommendationAction[];
}

export type ProcessingStatus = "待处理" | "解析中" | "已就绪" | "需关注";

export interface KnowledgeDocument {
  id: string;
  name: string;
  kind: "课程大纲" | "课程讲义" | "案例集" | "评分量规";
  version: string;
  chunks: number;
  coverage: number;
  status: ProcessingStatus;
  updatedAt: string;
}

export interface RetrievalEvidence {
  document: string;
  section: string;
  excerpt: string;
  confidence: number;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  status: "draft" | "ready";
  coverage: number;
  duplicateRate: number;
  documents: KnowledgeDocument[];
}

export type KnowledgeNodeStatus = "mastered" | "learning" | "weak" | "locked";

export interface KnowledgeNode {
  id: string;
  name: string;
  level: DifficultyLevel;
  mastery: number;
  status: KnowledgeNodeStatus;
  source: string;
  questionCount: number;
  prerequisite?: string;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: "前置" | "包含" | "迁移";
}

export interface CourseKnowledgeGraph {
  generated: boolean;
  version: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  updatedAt: string;
}

export interface TutorPersona {
  name: string;
  role: string;
  style: string;
  boundary: string;
  avatar: string;
  voice: string;
  speed: number;
}

export interface TutorDeployment {
  status: "draft" | "published" | "paused";
  version: string;
  audience: string;
  schedule: string;
  link: string;
}

export interface TutorMessage {
  id: string;
  role: "assistant" | "student";
  content: string;
  node?: string;
  confidence?: number;
  evidence?: RetrievalEvidence[];
}

export interface AiTutor {
  persona: TutorPersona;
  deployment: TutorDeployment;
  configured: boolean;
  messages: TutorMessage[];
}

export type QuestionType =
  | "单选"
  | "多选"
  | "判断"
  | "填空"
  | "简答"
  | "案例分析"
  | "创作实操题";

export interface RubricCriterion {
  label: string;
  score: number;
  description: string;
}

export interface QuestionItem {
  id: string;
  type: QuestionType;
  stem: string;
  answer: string;
  explanation: string;
  knowledgePoint: string;
  difficulty: DifficultyLevel;
  cognitiveLevel: string;
  score: number;
  source: RetrievalEvidence;
  origin: "AI生成" | "教师创建" | "历史试题";
  usageCount: number;
  correctRate: number;
  enabled: boolean;
  similar: boolean;
  rubric?: RubricCriterion[];
}

export interface QuestionGenerationConfig {
  scene: "随堂练习" | "单元测" | "正式考试";
  knowledgePoints: string[];
  types: QuestionType[];
  count: number;
  difficulty: DifficultyLevel;
  cognitiveLevel: string;
}

export interface QuestionBank {
  items: QuestionItem[];
  version: string;
}

export interface TrainingPlan {
  id: string;
  title: string;
  objective: string;
  duration: number;
  environment: string[];
  steps: Array<{ title: string; checkpoint: string; minutes: number }>;
  deliverables: string[];
  rubric: RubricCriterion[];
}

export interface PracticalAssessment {
  id: string;
  title: string;
  brief: string;
  deliverables: string[];
  checkpoints: string[];
  rubric: RubricCriterion[];
}

export interface PaperBlueprint {
  scene: "随堂测" | "单元测" | "正式考试";
  duration: number;
  totalScore: 100;
  machineScore: 30;
  aiScore: 50;
  manualScore: 20;
  difficulty: { basic: number; advanced: number; challenge: number };
}

export interface PaperQualityCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface AssessmentPaper {
  id: string;
  title: string;
  version: "A" | "B";
  status: "draft" | "published";
  blueprint: PaperBlueprint;
  questions: QuestionItem[];
  checks: PaperQualityCheck[];
}

export interface TrainingTask {
  id: string;
  title: string;
  frequency: string;
  difficulty: DifficultyLevel;
  standardMinutes: number;
  prerequisite?: string;
  input: string;
  output: string;
  ability: "知识底座" | "AI助教" | "命题组卷" | "批改分析";
}

export interface TrainingTaskProgress {
  taskId: string;
  status: "locked" | "available" | "completed";
  score?: number;
  actualMinutes?: number;
  completedAt?: string;
}

export interface TeacherAbilityReport {
  level: "L1 AI入门者" | "L2 AI实践者" | "L3 AI创新者" | "L4 AI引领者";
  completed: number;
  total: number;
  dimensions: Array<{ label: string; value: number }>;
  nextTask: string;
  calculatedLevel?: "L1" | "L2" | "L3" | "L4";
  certifiedLevel?: "L1" | "L2" | "L3" | "L4" | null;
  gatePassed?: boolean;
}

export type TeacherWorkspaceMode = "teaching" | "growth"

export type LearnerKind = "student" | "teacher"

export type TeacherGrowthSection =
  | "overview"
  | "assessment"
  | "plan"
  | "learning"
  | "practice"
  | "application"
  | "research"
  | "report"

export type TeacherAssessmentStage = "baseline" | "progress" | "final"

export type TeacherAbilityDimensionName =
  | "AI 基础认知"
  | "提示词与多模态"
  | "知识库与智能体"
  | "教学融合"
  | "研究创新"

export interface TeacherAssessmentDimension {
  label: TeacherAbilityDimensionName
  score: number
  target: number
  evidence: string
}

export interface TeacherAssessmentResult {
  status: "not-started" | "completed"
  stage: TeacherAssessmentStage
  score: number
  level: "L1 AI入门者" | "L2 AI实践者" | "L3 AI创新者" | "L4 AI引领者"
  completedAt?: string
  dimensions: TeacherAssessmentDimension[]
  typeScores: Array<{ label: "理论题" | "情境判断" | "实操任务"; score: number }>
  strengths: string[]
  gaps: string[]
  recommendedGoals: string[]
}

export interface ImportedLearningResource {
  id: string
  title: string
  type: "视频" | "文档" | "案例" | "实训"
  source: string
  version: string
  duration: number
  ability: TeacherAbilityDimensionName
  imported: true
  favorite: boolean
  progress: number
  completed: boolean
  note: string
}

export interface TeacherTrainingModule {
  id: string
  title: string
  ability: TeacherAbilityDimensionName
  required: boolean
  enabled: boolean
  duration: number
  status: "not-started" | "in-progress" | "completed"
  resourceIds: string[]
  reason: string
}

export interface TeacherTrainingPlan {
  id: string
  title: string
  weeklyHours: number
  durationWeeks: number
  status: "draft" | "accepted"
  modules: TeacherTrainingModule[]
  updatedAt: string
}

export interface TeacherLearningPath {
  resourceIds: string[]
  saved: boolean
  updatedAt: string
}

export interface TeacherPracticeRecord {
  id: string
  toolId: string
  toolName: string
  task: string
  duration: number
  score: number
  artifact: string
  artifactConfirmed: boolean
  completedAt: string
}

export interface ResearchAgentDraft {
  projectId: string
  name: string
  persona: string
  sourceIds: string[]
  toolIds: string[]
  version: number
  status: "draft" | "tested" | "saved"
  testResult?: string
  linkedOutput?: string
  sharedOutput?: string
  checks: {
    citations: boolean
    manualReview: boolean
    anonymousData: boolean
    aiDisclosure: boolean
    parameterArchive: boolean
  }
}

export interface TeacherGrowthState {
  assessment: TeacherAssessmentResult
  trainingPlan: TeacherTrainingPlan | null
  resources: ImportedLearningResource[]
  recommendedPath: TeacherLearningPath
  customPath: TeacherLearningPath
  selfLearningProgress: Record<string, number>
  practiceRecords: TeacherPracticeRecord[]
  researchAgent: ResearchAgentDraft
}

export type TeacherDevelopmentScopeId = "school" | "ai-college" | "creative-college"

export type TeacherDevelopmentLevel = "L1" | "L2" | "L3" | "L4"

export type TeacherDevelopmentDimension = TeacherAbilityDimensionName

export interface TeacherDevelopmentPlanConfig {
  scopeId: TeacherDevelopmentScopeId
  targetLevel: TeacherDevelopmentLevel
  focusDimension: TeacherDevelopmentDimension
  deadline: string
}

export interface TeacherDevelopmentPlanSummary extends TeacherDevelopmentPlanConfig {
  id: string
  scopeLabel: string
  eligibleCount: number
  groupCount: number
  groupSizeSummary: string
  sourceSegment: string
  requiredModules: string[]
  gateRequirement: string
  cadence: string
}

export interface SchoolTeacherDevelopmentGoal extends TeacherDevelopmentPlanSummary {
  status: "published"
  publishedAt: string
}

export type ManagerWorkspaceTab =
  | "overview"
  | "courses"
  | "quality"
  | "assessments"
  | "ai";

export interface ManagerSelection {
  organizationId: "school" | "ai-college" | "creative-college";
  courseId: string | null;
  classId: string | null;
  alertId: string | null;
}

export interface CourseRuntimeBundle {
  courseId: string;
  courseName: string;
  classIds: string[];
  resourceIds: string[];
  taskIds: string[];
  assessmentIds: string[];
  reportIds: string[];
  currentTopic: string;
  remediation: {
    packageId: string;
    title: string;
    status: "available" | "assigned" | "completed";
    completionRate: number;
  };
  revision: number;
}

export type EvidenceReviewStatus =
  | "待复核"
  | "已确认"
  | "已修改"
  | "无需复核";

export interface EvidenceRecord {
  id: string;
  courseId: string;
  kind:
    | "备课适配"
    | "助教回答"
    | "AI评分"
    | "学情诊断"
    | "报告建议"
    | "补学任务"
    | "管理预警";
  title: string;
  source: string;
  knowledgePoints: string[];
  originalInput: string;
  artifactVersion: string;
  rubric: string[];
  aiConclusion: string;
  aiOriginalValue?: string;
  finalValue?: string;
  confidence: number;
  sufficiency: "充分" | "基本充分" | "证据不足";
  permissionScope: "教师课程" | "学生本人" | "匿名教学管理";
  anonymous: boolean;
  modelVersion: string;
  generatedAt: string;
  updatedAt: string;
  reviewStatus: EvidenceReviewStatus;
  humanEdits: Array<{
    operator: string;
    change: string;
    at: string;
  }>;
}

export type TeachingOperationAlertStatus = "待处理" | "已交办" | "已解决";

export interface TeachingOperationAlert {
  id: string;
  type: "参与度不足" | "知识点掌握不足" | "测评异常或复核积压" | "AI助教低置信度或人工接管";
  organizationId: ManagerSelection["organizationId"];
  courseId: string;
  classId: string;
  title: string;
  metric: string;
  anonymousEvidence: Array<{
    studentCode: string;
    summary: string;
  }>;
  assignee: string | null;
  status: TeachingOperationAlertStatus;
  updatedAt: string;
}

export interface AuditRecord {
  id: string;
  actor: string;
  role: UserRole;
  action: string;
  target: string;
  result: string;
  at: string;
}
