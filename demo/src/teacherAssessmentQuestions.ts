import type { TeacherAbilityDimensionName } from "./types";

export interface TeacherAssessmentQuestion {
  id: "C02" | "C05" | "C34" | "C09" | "C39" | "R02" | "R05" | "R34" | "R09" | "R39";
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

export type TeacherTrustGateId =
  | "fact-verification"
  | "data-copyright"
  | "human-responsibility";

export interface TeacherTrustGateQuestion {
  id: TeacherTrustGateId;
  label: "事实核验" | "数据版权" | "人工责任";
  stem: string;
  options: string[];
  answer: string;
  evidence: string;
}

export const teacherTrustGateQuestions: TeacherTrustGateQuestion[] = [
  {
    id: "fact-verification",
    label: "事实核验",
    stem: "AI 给出一条将影响课堂安全要求的政策结论，教师发布前应怎样处理？",
    options: [
      "核对正式来源、版本和适用范围，并保留修正记录",
      "只要模型给出引用链接即可直接发布",
    ],
    answer: "核对正式来源、版本和适用范围，并保留修正记录",
    evidence: "正式来源、版本、交叉核验和人工修正记录",
  },
  {
    id: "data-copyright",
    label: "数据版权",
    stem: "学生作品含身份信息且素材授权范围不明确，最合适的处理是什么？",
    options: [
      "先脱敏并确认数据用途、素材授权和引用归属",
      "仅删除学生姓名后即可用于任何公开场景",
    ],
    answer: "先脱敏并确认数据用途、素材授权和引用归属",
    evidence: "授权范围、匿名状态、许可信息和引用归属",
  },
  {
    id: "human-responsibility",
    label: "人工责任",
    stem: "AI 评分将影响学生正式成绩时，教师必须承担什么责任？",
    options: [
      "复核评分依据，保留 AI 原值、最终值和责任人确认",
      "只处理学生主动申诉的评分，其余自动生效",
    ],
    answer: "复核评分依据，保留 AI 原值、最终值和责任人确认",
    evidence: "人工复核、修改记录、最终确认和责任主体",
  },
];

export const teacherRetestQuestions: TeacherAssessmentQuestion[] = [
  {
    id: "R02",
    type: "情境判断",
    dimension: "AI 基础认知",
    stem: "AI 对陌生专业设备给出确定操作步骤，但没有可靠来源。教师首先应怎样处理？",
    options: ["要求补充来源并由专业人员复核", "先让学生按步骤尝试再观察结果"],
    answer: "要求补充来源并由专业人员复核",
    explanation: "高风险专业操作必须先核验来源和适用条件。",
  },
  {
    id: "R05",
    type: "情境判断",
    dimension: "提示词与多模态",
    stem: "为稳定比较两版教学海报，哪种迭代方式最便于判断改动效果？",
    options: ["一次只改变一个关键变量并保留版本", "同时改变风格、构图、文字和模型"],
    answer: "一次只改变一个关键变量并保留版本",
    explanation: "单变量和版本留痕有助于判断变化来自哪里。",
  },
  {
    id: "R34",
    type: "情境判断",
    dimension: "知识库与智能体",
    stem: "课程智能体无法从已绑定资料找到答案时，应采用什么策略？",
    options: ["说明知识边界并转人工处理", "根据相近主题生成一个可能答案"],
    answer: "说明知识边界并转人工处理",
    explanation: "知识边界和人工转接是可信智能体的必要能力。",
  },
  {
    id: "R09",
    type: "情境判断",
    dimension: "教学融合",
    stem: "教师如何证明一项 AI 分层干预确实改善了学习？",
    options: ["保存干预前后同口径证据并复核变化", "记录 AI 已经生成过补学任务"],
    answer: "保存干预前后同口径证据并复核变化",
    explanation: "应用证据必须包含行动、结果回流和可比指标。",
  },
  {
    id: "R39",
    type: "情境判断",
    dimension: "研究创新",
    stem: "AI 整理的研究结论与一条原始证据矛盾，教师应怎样处理？",
    options: ["回到原始证据修订结论并披露 AI 使用", "删除不一致证据以保持报告连贯"],
    answer: "回到原始证据修订结论并披露 AI 使用",
    explanation: "研究结论必须能够回到原始来源并保留人工判断。",
  },
];

export const practicalRetestQuestion = {
  id: "C171-retest" as const,
  stem: "请复核一项虚构 AI 教学应用，并形成可追溯的最终结论。",
  completionItems: [
    "核对事实来源与版本",
    "检查数据授权和匿名状态",
    "对照任务目标与评价量规",
    "保留 AI 原结果和人工修改",
    "确认最终责任人与适用范围",
  ],
};
