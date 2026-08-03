export interface WorkspaceSelection {
  selectedCourseId: string | null;
  selectedClassId: string | null;
  selectedLearningTaskId: string | null;
  selectedAssessmentId: string | null;
  selectedReportId: string | null;
}

export type ClassStatus = "live" | "upcoming" | "preparing";

export interface TeacherClassSummary {
  id: string;
  courseId: string;
  lessonId: string;
  name: string;
  courseName: string;
  lesson: string;
  schedule: string;
  status: ClassStatus;
  statusLabel: string;
  students: number;
  participation: number;
  alerts: number;
  progress: number;
  reportId: string;
  reportLabel: string;
  learningFocus: string;
}

export type AssessmentStatus =
  | "draft"
  | "scheduled"
  | "in-progress"
  | "grading"
  | "completed";

export interface AssessmentWorkspaceSummary {
  id: string;
  paperId: string;
  classId: string;
  title: string;
  scene: "随堂测" | "单元测" | "正式考试";
  status: AssessmentStatus;
  statusLabel: string;
  schedule: string;
  progress: string;
  primaryAction: string;
  reportId?: string;
}

export interface StudentCourseSummary {
  id: string;
  classId: string;
  name: string;
  teacher: string;
  nextLesson: string;
  schedule: string;
  progress: number;
  status: "active" | "upcoming";
  taskLabel: string;
  objectives: string[];
  resources: string[];
  graphReady: boolean;
  tutorReady: boolean;
}

export interface StudentLearningTaskSummary {
  id: string;
  courseId: string;
  title: string;
  description: string;
  status: "assigned" | "in-progress" | "completed";
  priority: number;
  progress: number;
  dueAt: string;
  knowledgePoint: string;
}

export interface WorkspaceReportData {
  id: string;
  classId: string;
  title: string;
  generatedAt: string;
  completionRate: number;
  completedCount: number;
  averageScore: number;
  scoreDelta: number;
  aiReviewRate: number;
  reviewCount: number;
  difficultyFit: number;
  commonError: string;
  distribution: Array<{ range: string; count: number }>;
  mastery: Array<{ name: string; value: number }>;
  students: Array<{
    name: string;
    score: number;
    status: string;
    point: string;
  }>;
  recommendations: Array<{
    priority: "立即补强" | "继续巩固" | "拓展挑战";
    title: string;
    description: string;
    action: string;
  }>;
}

export interface StudentGrowthReportSummary {
  id: string;
  courseId: string;
  assessmentId: string;
  title: string;
  score: number;
  progressLabel: string;
  focus: string;
}

export const emptyWorkspaceSelection: WorkspaceSelection = {
  selectedCourseId: null,
  selectedClassId: null,
  selectedLearningTaskId: null,
  selectedAssessmentId: null,
  selectedReportId: null,
};

export const teacherClasses: TeacherClassSummary[] = [
  {
    id: "class-ai-2401",
    courseId: "course-visual-design",
    lessonId: "lesson-3-1",
    name: "人工智能 2401 班",
    courseName: "生成式视觉设计",
    lesson: "从自然语言描述到高质量视觉作品",
    schedule: "正在上课 · 10:00–10:45",
    status: "live",
    statusLabel: "上课中",
    students: 36,
    participation: 94,
    alerts: 8,
    progress: 78,
    reportId: "report-ai-2401",
    reportLabel: "第 3 课课堂诊断",
    learningFocus: "构图控制与负向提示词",
  },
  {
    id: "class-ai-2402",
    courseId: "course-visual-design",
    lessonId: "lesson-2-2",
    name: "人工智能 2402 班",
    courseName: "生成式视觉设计",
    lesson: "场景、媒介与风格",
    schedule: "今天 14:00 · 45 分钟",
    status: "upcoming",
    statusLabel: "即将开始",
    students: 32,
    participation: 87,
    alerts: 3,
    progress: 64,
    reportId: "report-ai-2402",
    reportLabel: "单元二学习进展",
    learningFocus: "媒介选择与风格边界",
  },
  {
    id: "class-media-2302",
    courseId: "course-visual-design",
    lessonId: "lesson-4-1",
    name: "数字媒体 2302 班",
    courseName: "生成式视觉设计",
    lesson: "多轮创作与版本管理",
    schedule: "明天 09:00 · 待完成备课",
    status: "preparing",
    statusLabel: "待备课",
    students: 30,
    participation: 72,
    alerts: 5,
    progress: 42,
    reportId: "report-media-2302",
    reportLabel: "单元三阶段报告",
    learningFocus: "版本记录与迭代证据",
  },
  {
    id: "class-ai-ethics-2401",
    courseId: "course-ai-ethics",
    lessonId: "ethics-lesson-1",
    name: "AI 伦理 2401 班",
    courseName: "AI 创作伦理与安全",
    lesson: "版权、隐私与内容安全",
    schedule: "今天 14:00 · 45 分钟",
    status: "upcoming",
    statusLabel: "即将开始",
    students: 34,
    participation: 91,
    alerts: 4,
    progress: 62,
    reportId: "report-ai-ethics-2401",
    reportLabel: "版权与隐私阶段诊断",
    learningFocus: "版权识别、隐私保护与证据核验",
  },
];

export const teacherAssessments: AssessmentWorkspaceSummary[] = [
  {
    id: "assessment-unit-draft",
    paperId: "paper-unit-two",
    classId: "class-ai-2402",
    title: "单元二 · 提示词结构测评",
    scene: "单元测",
    status: "draft",
    statusLabel: "待发布",
    schedule: "计划今天 16:00 发布",
    progress: "18 道题 · 100 分",
    primaryAction: "完成组卷",
  },
  {
    id: "assessment-live-lesson",
    paperId: "paper-lesson-three",
    classId: "class-ai-2401",
    title: "第 3 课 · 视觉控制随堂测",
    scene: "随堂测",
    status: "in-progress",
    statusLabel: "进行中",
    schedule: "今天 10:30 截止",
    progress: "31 / 36 人已提交",
    primaryAction: "查看考试进度",
  },
  {
    id: "assessment-grading-work",
    paperId: "paper-creative-work",
    classId: "class-ai-2401",
    title: "未来学习空间 · 创作实操",
    scene: "正式考试",
    status: "grading",
    statusLabel: "待批改",
    schedule: "今天 09:40 已结束",
    progress: "36 份作品 · 1 份异常",
    primaryAction: "批改作业",
  },
  {
    id: "assessment-complete-unit",
    paperId: "paper-unit-one",
    classId: "class-media-2302",
    title: "单元一 · 生成式视觉基础",
    scene: "单元测",
    status: "completed",
    statusLabel: "已完成",
    schedule: "昨天 17:00 完成",
    progress: "平均分 84.6 · 已复核",
    primaryAction: "查看评分复核",
    reportId: "report-media-2302",
  },
  {
    id: "assessment-ethics-review",
    paperId: "paper-ethics-risk-review",
    classId: "class-ai-ethics-2401",
    title: "版权、隐私与内容安全测评",
    scene: "单元测",
    status: "completed",
    statusLabel: "已完成",
    schedule: "今天 15:10 完成",
    progress: "平均分 81.4 · 4 份待复核",
    primaryAction: "查看评分复核",
    reportId: "report-ai-ethics-2401",
  },
];

export const studentCourses: StudentCourseSummary[] = [
  {
    id: "course-visual-design",
    classId: "class-ai-2401",
    name: "生成式视觉设计",
    teacher: "周老师",
    nextLesson: "从自然语言描述到高质量视觉作品",
    schedule: "正在上课 · 还需约 18 分钟",
    progress: 68,
    status: "active",
    taskLabel: "1 项教师任务待完成",
    objectives: [
      "掌握结构化提示词的六个关键要素",
      "使用构图与光线词控制画面",
      "根据生成偏差完成有效迭代",
    ],
    resources: ["概念速览", "视觉控制案例画廊", "未来学习空间任务说明"],
    graphReady: true,
    tutorReady: true,
  },
  {
    id: "course-ai-ethics",
    classId: "class-ai-ethics-2401",
    name: "AI 创作伦理与安全",
    teacher: "陈老师",
    nextLesson: "版权、隐私与内容安全",
    schedule: "今天 14:00 · 当前课题学习中",
    progress: 56,
    status: "active",
    taskLabel: "1 项风险修订任务待完成",
    objectives: [
      "识别 AI 创作中的版权与隐私风险",
      "理解内容安全与负责任创作原则",
      "能够对创作方案进行伦理风险检查",
    ],
    resources: ["课程介绍", "创作版权入门卡", "内容安全案例"],
    graphReady: false,
    tutorReady: false,
  },
];

export const studentLearningTasks: StudentLearningTaskSummary[] = [
  {
    id: "task-visual-revision",
    courseId: "course-visual-design",
    title: "继续完善未来学习空间",
    description: "根据上一版作品证据，重点调整镜头、光线与负向提示词。",
    status: "in-progress",
    priority: 1,
    progress: 68,
    dueAt: "今天 18:00 前",
    knowledgePoint: "画面与构图控制",
  },
  {
    id: "task-negative-practice",
    courseId: "course-visual-design",
    title: "负向提示词补强练习",
    description: "完成 2 个偏差对比案例和 3 道自适应练习。",
    status: "assigned",
    priority: 2,
    progress: 0,
    dueAt: "明天 20:00 前",
    knowledgePoint: "负向提示词",
  },
  {
    id: "task-ethics-risk-review",
    courseId: "course-ai-ethics",
    title: "识别 AI 创作方案中的风险并提出修订",
    description: "检查素材授权、人物隐私、内容安全和责任说明，提交修订方案。",
    status: "in-progress",
    priority: 1,
    progress: 56,
    dueAt: "今天 20:00 前",
    knowledgePoint: "版权、隐私与内容安全",
  },
  {
    id: "task-ethics-remediation",
    courseId: "course-ai-ethics",
    title: "版权与隐私风险辨识补强包",
    description: "完成 2 组授权判断、2 组隐私脱敏和 1 次证据核验。",
    status: "assigned",
    priority: 2,
    progress: 0,
    dueAt: "明天 20:00 前",
    knowledgePoint: "证据核验",
  },
];

export const teacherReports: WorkspaceReportData[] = [
  {
    id: "report-ai-2401",
    classId: "class-ai-2401",
    title: "第 3 课课堂诊断",
    generatedAt: "今天 10:38",
    completionRate: 94,
    completedCount: 34,
    averageScore: 84.6,
    scoreDelta: 4.2,
    aiReviewRate: 22,
    reviewCount: 8,
    difficultyFit: 87,
    commonError: "把负向提示词写成通用质量词，无法针对画面偏差进行控制。",
    distribution: [
      { range: "<60", count: 2 },
      { range: "60–69", count: 3 },
      { range: "70–79", count: 7 },
      { range: "80–89", count: 14 },
      { range: "90–100", count: 10 },
    ],
    mastery: [
      { name: "提示词结构", value: 82 },
      { name: "画面与构图控制", value: 68 },
      { name: "负向提示词", value: 54 },
      { name: "迭代与评估", value: 61 },
    ],
    students: [
      { name: "林一诺", score: 88, status: "待复核", point: "负向提示词" },
      { name: "周子墨", score: 93, status: "已完成", point: "迭代与评估" },
      { name: "陈予安", score: 76, status: "异常", point: "画面控制" },
    ],
    recommendations: [
      { priority: "立即补强", title: "负向提示词诊断", description: "8 名学生需要先完成针对性排除词对比案例。", action: "生成补学任务" },
      { priority: "继续巩固", title: "构图控制迁移", description: "增加一个带限制条件的构图迁移练习。", action: "加入课后练习" },
      { priority: "拓展挑战", title: "建立个人视觉风格", description: "为稳定达标学生发布个人风格词库任务。", action: "发布挑战任务" },
    ],
  },
  {
    id: "report-ai-2402",
    classId: "class-ai-2402",
    title: "单元二学习进展",
    generatedAt: "今天 09:20",
    completionRate: 88,
    completedCount: 28,
    averageScore: 79.8,
    scoreDelta: 2.6,
    aiReviewRate: 13,
    reviewCount: 4,
    difficultyFit: 82,
    commonError: "同时堆叠多个风格词，却没有说明媒介与场景之间的关系。",
    distribution: [
      { range: "<60", count: 3 },
      { range: "60–69", count: 5 },
      { range: "70–79", count: 9 },
      { range: "80–89", count: 10 },
      { range: "90–100", count: 5 },
    ],
    mastery: [
      { name: "场景描述", value: 76 },
      { name: "媒介选择", value: 63 },
      { name: "风格边界", value: 58 },
      { name: "表达一致性", value: 71 },
    ],
    students: [
      { name: "苏念安", score: 85, status: "已完成", point: "媒介选择" },
      { name: "江闻舟", score: 69, status: "需关注", point: "风格边界" },
      { name: "沈清禾", score: 91, status: "已完成", point: "场景描述" },
    ],
    recommendations: [
      { priority: "立即补强", title: "媒介与风格边界", description: "用四组正反案例区分媒介词与风格词。", action: "生成补学任务" },
      { priority: "继续巩固", title: "场景表达完整性", description: "补充受众、媒介和使用场景的联动练习。", action: "加入课后练习" },
      { priority: "拓展挑战", title: "跨媒介迁移", description: "将同一主题分别转译为海报与分镜方案。", action: "发布挑战任务" },
    ],
  },
  {
    id: "report-media-2302",
    classId: "class-media-2302",
    title: "单元三阶段报告",
    generatedAt: "昨天 17:20",
    completionRate: 90,
    completedCount: 27,
    averageScore: 86.2,
    scoreDelta: 5.1,
    aiReviewRate: 10,
    reviewCount: 3,
    difficultyFit: 91,
    commonError: "作品发生变化但缺少版本说明，无法判断哪一次修改真正有效。",
    distribution: [
      { range: "<60", count: 1 },
      { range: "60–69", count: 2 },
      { range: "70–79", count: 5 },
      { range: "80–89", count: 12 },
      { range: "90–100", count: 10 },
    ],
    mastery: [
      { name: "版本规划", value: 84 },
      { name: "修改记录", value: 72 },
      { name: "证据解释", value: 66 },
      { name: "创作反思", value: 78 },
    ],
    students: [
      { name: "方予晴", score: 94, status: "已完成", point: "创作反思" },
      { name: "杜若衡", score: 81, status: "已完成", point: "修改记录" },
      { name: "罗景澄", score: 74, status: "需关注", point: "证据解释" },
    ],
    recommendations: [
      { priority: "立即补强", title: "版本证据说明", description: "要求每一版记录修改项、结果变化和判断依据。", action: "生成补学任务" },
      { priority: "继续巩固", title: "迭代策略复盘", description: "使用版本树复盘无效修改与有效修改。", action: "加入课后练习" },
      { priority: "拓展挑战", title: "作品策展陈述", description: "将版本证据转化为公开展示的创作陈述。", action: "发布挑战任务" },
    ],
  },
  {
    id: "report-ai-ethics-2401",
    classId: "class-ai-ethics-2401",
    title: "版权与隐私阶段诊断",
    generatedAt: "今天 15:20",
    completionRate: 91,
    completedCount: 31,
    averageScore: 81.4,
    scoreDelta: 6.8,
    aiReviewRate: 12,
    reviewCount: 4,
    difficultyFit: 86,
    commonError: "能够发现风险，但缺少素材授权或隐私处理的可核验证据。",
    distribution: [
      { range: "<60", count: 2 },
      { range: "60–69", count: 4 },
      { range: "70–79", count: 8 },
      { range: "80–89", count: 11 },
      { range: "90–100", count: 9 },
    ],
    mastery: [
      { name: "版权识别", value: 78 },
      { name: "隐私保护", value: 82 },
      { name: "内容安全", value: 84 },
      { name: "证据核验", value: 62 },
      { name: "责任判断", value: 76 },
    ],
    students: [
      { name: "学生 E-006", score: 79, status: "待复核", point: "证据核验" },
      { name: "学生 E-012", score: 86, status: "已完成", point: "责任判断" },
      { name: "学生 E-021", score: 72, status: "需关注", point: "版权识别" },
    ],
    recommendations: [
      { priority: "立即补强", title: "版权与隐私风险辨识", description: "完成授权来源核验与隐私脱敏的正反案例。", action: "生成补学任务" },
      { priority: "继续巩固", title: "内容安全情境判断", description: "使用责任清单说明发布前的人工判断。", action: "加入课后练习" },
      { priority: "拓展挑战", title: "创作合规说明", description: "为修订方案形成完整的来源与 AI 使用披露。", action: "发布挑战任务" },
    ],
  },
];

export const studentGrowthReports: StudentGrowthReportSummary[] = [
  {
    id: "report-student-visual",
    courseId: "course-visual-design",
    assessmentId: "student-assessment-complete",
    title: "提示词结构阶段反馈已更新",
    score: 88,
    progressLabel: "视觉控制 +6",
    focus: "负向提示词与构图控制",
  },
  {
    id: "report-student-ethics",
    courseId: "course-ai-ethics",
    assessmentId: "student-assessment-ethics",
    title: "版权与隐私阶段反馈已更新",
    score: 82,
    progressLabel: "风险判断 +12",
    focus: "证据核验与版权识别",
  },
];

export const studentAssessments: AssessmentWorkspaceSummary[] = [
  {
    id: "student-assessment-ready",
    paperId: "paper-lesson-three",
    classId: "class-ai-2401",
    title: "第 3 课 · 视觉控制随堂测",
    scene: "随堂测",
    status: "scheduled",
    statusLabel: "待完成",
    schedule: "今天 11:00 前完成",
    progress: "10 道客观题 + 1 道作品题",
    primaryAction: "开始测评",
  },
  {
    id: "student-assessment-progress",
    paperId: "paper-negative-practice",
    classId: "class-ai-2401",
    title: "负向提示词补强测评",
    scene: "随堂测",
    status: "in-progress",
    statusLabel: "进行中",
    schedule: "还剩 18 分钟",
    progress: "已完成 4 / 7 题",
    primaryAction: "继续测评",
  },
  {
    id: "student-assessment-complete",
    paperId: "paper-structure-review",
    classId: "class-ai-2401",
    title: "提示词结构阶段测评",
    scene: "单元测",
    status: "completed",
    statusLabel: "已完成",
    schedule: "昨天完成",
    progress: "成绩 88 · 反馈已生成",
    primaryAction: "查看结果",
    reportId: "report-student-visual",
  },
  {
    id: "student-assessment-ethics",
    paperId: "paper-ethics-risk-review",
    classId: "class-ai-ethics-2401",
    title: "版权、隐私与内容安全测评",
    scene: "单元测",
    status: "scheduled",
    statusLabel: "待完成",
    schedule: "今天 20:00 前完成",
    progress: "4 道客观题 + 1 道情境判断题",
    primaryAction: "开始测评",
  },
];

export function getTeacherClass(classId: string | null) {
  return teacherClasses.find((item) => item.id === classId) ?? null;
}

export function getStudentCourse(courseId: string | null) {
  return studentCourses.find((item) => item.id === courseId) ?? null;
}

export function getTeacherAssessment(assessmentId: string | null) {
  return teacherAssessments.find((item) => item.id === assessmentId) ?? null;
}

export function getStudentAssessment(assessmentId: string | null) {
  return studentAssessments.find((item) => item.id === assessmentId) ?? null;
}

export function getTeacherReport(reportId: string | null) {
  return teacherReports.find((item) => item.id === reportId) ?? null;
}

export function getStudentGrowthReport(reportId: string | null) {
  return studentGrowthReports.find((item) => item.id === reportId) ?? null;
}

export function getStudentLearningTask(taskId: string | null) {
  return studentLearningTasks.find((item) => item.id === taskId) ?? null;
}
