import type { TeacherAbilityDimensionName } from "./types";

export interface TeacherAssessmentQuestion {
  id: "C02" | "C05" | "C34" | "C09" | "C39";
  type: "单选" | "情境判断";
  dimension: TeacherAbilityDimensionName;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
}

export const teacherAssessmentQuestions: TeacherAssessmentQuestion[] = [
  {
    id: "C02",
    type: "单选",
    dimension: "AI 基础认知",
    stem: "大模型中的“词元（Token）”通常指什么？",
    options: [
      "模型一次对话可保存的全部上下文",
      "用于验证接口访问权限的密钥单位",
      "衡量模型训练轮次的计数单位",
      "模型处理文字时使用的小单位",
    ],
    answer: "模型处理文字时使用的小单位",
    explanation: "词元是模型处理文字时使用的小单位，可以是一个字、一个词或词的一部分。",
  },
  {
    id: "C05",
    type: "单选",
    dimension: "提示词与多模态",
    stem: "“提示词”通常指什么？",
    options: [
      "告诉 AI 要做什么以及有什么要求的指令",
      "用于限定模型可读取资料范围的知识库目录",
      "用于判断模型输出正确率的评分量规",
      "用于保存多轮对话历史的系统日志",
    ],
    answer: "告诉 AI 要做什么以及有什么要求的指令",
    explanation: "提示词是用户向 AI 说明任务、对象和具体要求的指令。",
  },
  {
    id: "C34",
    type: "单选",
    dimension: "知识库与智能体",
    stem: "课程资料进入知识库时，为什么要记录来源和版本？",
    options: [
      "便于按文件数量衡量知识库建设进度",
      "便于模型优先引用篇幅较长的资料",
      "便于减少教师对具体内容的再次审核",
      "便于判断内容是否可靠和仍然有效",
    ],
    answer: "便于判断内容是否可靠和仍然有效",
    explanation: "来源和版本是资料追溯、更新与审核的基础。",
  },
  {
    id: "C09",
    type: "单选",
    dimension: "教学融合",
    stem: "AI 辅助批改作业时，教师最重要的职责是什么？",
    options: [
      "将 AI 评分作为统一尺度直接计入成绩",
      "复核评分依据和异常结果",
      "优先检查全班平均分是否接近期望",
      "仅复核被 AI 判为低分的学生作业",
    ],
    answer: "复核评分依据和异常结果",
    explanation: "教师应复核评分依据，特别关注异常和边界情况。",
  },
  {
    id: "C39",
    type: "情境判断",
    dimension: "研究创新",
    stem: "AI 根据一份很小的课堂问卷给出全校性结论。教师应如何处理？",
    options: [
      "保留全校性结论，但把措辞改为“可能”",
      "让 AI 补充更多理由以提高结论可信度",
      "剔除与总体结论不一致的少数回答",
      "说明样本限制并缩小结论范围",
    ],
    answer: "说明样本限制并缩小结论范围",
    explanation: "小样本不能支持超出数据范围的概括。",
  },
];

export const practicalAssessmentQuestion = {
  id: "C171" as const,
  type: "实操" as const,
  dimension: "AI 基础认知" as const,
  stem: "请比较两种虚构 AI 教学工具，并形成可核验的选型建议。",
  explanation: "以真实任务约束和证据进行工具比较，不依据品牌、热度或单次演示选型。",
  completionItems: [
    "建立统一指标",
    "核验功能与限制",
    "比较隐私、无障碍和成本",
    "记录证据来源",
    "给出有条件的人工结论",
  ],
};

