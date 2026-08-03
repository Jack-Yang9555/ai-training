import type { CourseRuntimeBundle } from "./types";

export interface CourseGuideStep {
  id: string;
  title: string;
  description: string;
  duration: number;
}

export interface CourseGuideResource {
  id: string;
  title: string;
  description: string;
}

export interface CourseRuntimeDefinition {
  currentTopic: string;
  guideSteps: CourseGuideStep[];
  resources: CourseGuideResource[];
  learningBrief: string;
  practiceTitle: string;
  practiceDescription: string;
  reportDimensions: Array<{
    label: string;
    before: number;
    current: number;
  }>;
}

export const courseRuntimeDefinitions: Record<string, CourseRuntimeDefinition> = {
  "course-visual-design": {
    currentTopic: "从自然语言描述到高质量视觉作品",
    guideSteps: [
      { id: "visual-1", title: "目标导入", description: "理解本课视觉创作任务", duration: 5 },
      { id: "visual-2", title: "结构拆解", description: "学习提示词六要素", duration: 10 },
      { id: "visual-3", title: "案例对比", description: "识别有效与无效控制", duration: 8 },
      { id: "visual-4", title: "创作实践", description: "完成作品与版本迭代", duration: 17 },
      { id: "visual-5", title: "随堂测评", description: "提交作品与反思", duration: 5 },
    ],
    resources: [
      { id: "visual-resource-1", title: "概念速览", description: "六要素提示词结构 · 6 分钟" },
      { id: "visual-resource-2", title: "案例画廊", description: "8 组生成前后对比" },
      { id: "visual-resource-3", title: "任务说明", description: "未来学习空间创作要求" },
    ],
    learningBrief: "用提示词结构、构图和负向提示词完成作品迭代。",
    practiceTitle: "继续完善未来学习空间",
    practiceDescription: "根据上一版作品证据，调整镜头、光线与负向提示词。",
    reportDimensions: [
      { label: "任务理解", before: 66, current: 87 },
      { label: "提示词结构", before: 63, current: 86 },
      { label: "视觉表达", before: 59, current: 78 },
      { label: "创意表现", before: 64, current: 82 },
      { label: "迭代反思", before: 61, current: 76 },
    ],
  },
  "course-ai-ethics": {
    currentTopic: "版权、隐私与内容安全",
    guideSteps: [
      { id: "ethics-1", title: "风险导入", description: "查看创作方案中的真实风险点", duration: 5 },
      { id: "ethics-2", title: "规则辨析", description: "区分版权、隐私与内容安全", duration: 8 },
      { id: "ethics-3", title: "证据核验", description: "查验素材授权与信息来源", duration: 8 },
      { id: "ethics-4", title: "方案修订", description: "改写有风险的 AI 创作方案", duration: 14 },
      { id: "ethics-5", title: "情境判断", description: "说明责任边界与最终决策", duration: 10 },
    ],
    resources: [
      { id: "ethics-resource-1", title: "版权检查卡", description: "授权、合理使用与来源记录" },
      { id: "ethics-resource-2", title: "隐私保护清单", description: "人脸、身份与敏感信息处理" },
      { id: "ethics-resource-3", title: "内容安全案例", description: "4 组风险识别与修订案例" },
    ],
    learningBrief: "识别 AI 创作方案中的风险，完成证据核验并提出可执行修订。",
    practiceTitle: "识别 AI 创作方案中的风险并提出修订",
    practiceDescription: "检查素材来源、人物隐私、内容安全与责任说明，提交修订版方案。",
    reportDimensions: [
      { label: "版权识别", before: 58, current: 82 },
      { label: "隐私保护", before: 61, current: 85 },
      { label: "内容安全", before: 66, current: 84 },
      { label: "证据核验", before: 52, current: 74 },
      { label: "责任判断", before: 60, current: 80 },
    ],
  },
};

export function createInitialCourseRuntimes(): Record<string, CourseRuntimeBundle> {
  return {
    "course-visual-design": {
      courseId: "course-visual-design",
      courseName: "生成式视觉设计",
      classIds: ["class-ai-2401", "class-ai-2402", "class-media-2302"],
      resourceIds: courseRuntimeDefinitions["course-visual-design"].resources.map((item) => item.id),
      taskIds: ["task-visual-revision", "task-negative-practice"],
      assessmentIds: [
        "student-assessment-ready",
        "student-assessment-progress",
        "student-assessment-complete",
      ],
      reportIds: ["report-student-visual", "report-ai-2401", "report-ai-2402", "report-media-2302"],
      currentTopic: courseRuntimeDefinitions["course-visual-design"].currentTopic,
      remediation: {
        packageId: "visual-negative-remediation",
        title: "画面控制与负向提示词补强包",
        status: "available",
        completionRate: 0,
      },
      revision: 1,
    },
    "course-ai-ethics": {
      courseId: "course-ai-ethics",
      courseName: "AI 创作伦理与安全",
      classIds: ["class-ai-ethics-2401"],
      resourceIds: courseRuntimeDefinitions["course-ai-ethics"].resources.map((item) => item.id),
      taskIds: ["task-ethics-risk-review", "task-ethics-remediation"],
      assessmentIds: ["student-assessment-ethics"],
      reportIds: ["report-student-ethics", "report-ai-ethics-2401"],
      currentTopic: courseRuntimeDefinitions["course-ai-ethics"].currentTopic,
      remediation: {
        packageId: "ethics-copyright-privacy-remediation",
        title: "版权与隐私风险辨识补强包",
        status: "available",
        completionRate: 0,
      },
      revision: 1,
    },
  };
}

export function getCourseRuntimeDefinition(courseId: string) {
  return courseRuntimeDefinitions[courseId] ?? courseRuntimeDefinitions["course-visual-design"];
}

