import {
  BarChart3,
  Bot,
  Code2,
  Database,
  FileSearch,
  Image as ImageIcon,
  MessageSquareText,
  Network,
  ScanSearch,
  SearchCheck,
  Video,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export const aiToolCategories = [
  "研究与洞察",
  "创作生成",
  "智能体与知识",
  "开发与评测",
] as const;

export type AiToolCategory = (typeof aiToolCategories)[number];

export interface AiToolDefinition {
  id: string;
  name: string;
  category: AiToolCategory;
  icon: LucideIcon;
  color: "coral" | "green" | "blue" | "amber";
  description: string;
  tags: readonly string[];
  level: "零门槛" | "入门" | "进阶" | "挑战";
  users: string;
  researchUse: string;
  starterTask: string;
}

/**
 * “研”与“练”共用的唯一 AI 工具目录。
 * 当前 Demo 只模拟启动、过程记录和成果归档，不连接外部平台或真实模型。
 */
export const aiTools: readonly AiToolDefinition[] = [
  {
    id: "deep-research",
    name: "深度研究助手",
    category: "研究与洞察",
    icon: SearchCheck,
    color: "blue",
    description: "将研究问题拆解为检索计划，汇总多来源证据并保留可核查引用。",
    tags: ["Deep Research", "来源核验"],
    level: "入门",
    users: "3.6k",
    researchUse: "选题扫描、研究现状综述与证据缺口识别",
    starterTask: "围绕一个教学问题生成检索式、来源清单和带引用的研究现状摘要。",
  },
  {
    id: "literature",
    name: "文献研读与证据库",
    category: "研究与洞察",
    icon: FileSearch,
    color: "green",
    description: "基于论文、报告与访谈资料进行溯源问答、对照阅读和证据卡片整理。",
    tags: ["文献研读", "证据卡片"],
    level: "入门",
    users: "2.9k",
    researchUse: "文献编码、观点对照与引文回溯",
    starterTask: "导入三份模拟资料，提取研究问题、方法、结论和局限并生成证据矩阵。",
  },
  {
    id: "data-analysis",
    name: "研究数据分析室",
    category: "研究与洞察",
    icon: BarChart3,
    color: "coral",
    description: "用自然语言完成数据清洗、统计分析、可视化与分析过程复核。",
    tags: ["数据分析", "可视化"],
    level: "进阶",
    users: "2.5k",
    researchUse: "问卷、课堂观察与学习过程数据分析",
    starterTask: "分析一份匿名课堂观察数据，生成分布图、差异说明和可复核分析步骤。",
  },
  {
    id: "prompt",
    name: "提示词实验室",
    category: "创作生成",
    icon: MessageSquareText,
    color: "coral",
    description: "对比不同提示策略，观察输出差异并沉淀可复用的个人模板。",
    tags: ["Prompt", "结构化表达"],
    level: "零门槛",
    users: "4.8k",
    researchUse: "研究指令设计、变量控制与提示策略对照实验",
    starterTask: "为同一研究任务设计三组提示策略，比较结果稳定性并记录变量。",
  },
  {
    id: "multimodal-create",
    name: "多模态内容工坊",
    category: "创作生成",
    icon: ImageIcon,
    color: "green",
    description: "统一练习图像、音频、视频和数字人内容生成，并保留版本与参数。",
    tags: ["图像", "音视频"],
    level: "入门",
    users: "5.2k",
    researchUse: "实验材料、研究展示与多模态成果制作",
    starterTask: "把一份研究摘要转为信息图与 30 秒讲解视频，并记录生成参数。",
  },
  {
    id: "video",
    name: "文生视频工坊",
    category: "创作生成",
    icon: Video,
    color: "blue",
    description: "练习分镜、镜头运动与时序控制，完成短视频创作与版本复盘。",
    tags: ["文生视频", "分镜"],
    level: "进阶",
    users: "2.7k",
    researchUse: "干预材料制作、成果传播与观察刺激设计",
    starterTask: "为一项课堂干预设计 3 镜头实验材料，并说明每个镜头的控制变量。",
  },
  {
    id: "rag",
    name: "知识库 RAG",
    category: "智能体与知识",
    icon: Database,
    color: "amber",
    description: "体验资料切片、混合检索、重排和有依据问答，检查召回与引用质量。",
    tags: ["RAG", "知识库"],
    level: "入门",
    users: "4.1k",
    researchUse: "构建课题资料库和研究证据检索底座",
    starterTask: "建立一个课题知识库，用五个问题检查召回、引用和知识边界。",
  },
  {
    id: "dify",
    name: "Dify 应用实验台",
    category: "智能体与知识",
    icon: Workflow,
    color: "green",
    description: "通过可视化节点编排模型、知识库、工具和条件分支，测试并发布 AI 应用。",
    tags: ["Dify", "Workflow"],
    level: "进阶",
    users: "3.8k",
    researchUse: "快速搭建研究助手、访谈编码或资料处理工作流",
    starterTask: "搭建“资料输入—分类—证据抽取—结构化输出”工作流并完成测试运行。",
  },
  {
    id: "agent",
    name: "智能体搭建台",
    category: "智能体与知识",
    icon: Bot,
    color: "blue",
    description: "配置规划、记忆、工具调用与人工确认节点，完成可监督的代理任务。",
    tags: ["Agent", "工具调用"],
    level: "进阶",
    users: "3.1k",
    researchUse: "多步骤研究任务执行与人机协同流程验证",
    starterTask: "配置一个能规划检索、整理证据并在关键节点请求确认的研究智能体。",
  },
  {
    id: "mcp",
    name: "MCP 工具连接台",
    category: "智能体与知识",
    icon: Network,
    color: "amber",
    description: "理解模型上下文协议，练习连接资料、工具与业务系统并管理授权边界。",
    tags: ["MCP", "工具连接"],
    level: "挑战",
    users: "1.6k",
    researchUse: "连接研究资料源、分析工具和内部系统",
    starterTask: "为模拟研究助手配置两个只读工具，验证权限、参数和失败回退。",
  },
  {
    id: "vision",
    name: "多模态识别",
    category: "开发与评测",
    icon: ScanSearch,
    color: "blue",
    description: "练习图像理解、票据提取、课堂作品编码和视觉问答等真实任务。",
    tags: ["视觉理解", "OCR"],
    level: "入门",
    users: "2.4k",
    researchUse: "图片、作品与课堂视频的辅助编码",
    starterTask: "对一组匿名学生作品进行结构化编码，并人工复核误判样例。",
  },
  {
    id: "vibe-coding",
    name: "Vibe Coding 工作台",
    category: "开发与评测",
    icon: Code2,
    color: "coral",
    description: "用自然语言与编码智能体协作完成需求、原型、测试和迭代，保留变更记录。",
    tags: ["Vibe Coding", "编码智能体"],
    level: "进阶",
    users: "4.3k",
    researchUse: "快速构建问卷、实验原型和数据小工具",
    starterTask: "生成一个匿名问卷原型，补充输入校验、测试用例和隐私说明。",
  },
  {
    id: "evaluate",
    name: "模型评测场",
    category: "开发与评测",
    icon: Network,
    color: "amber",
    description: "用标准样例比较模型效果、稳定性、速度、成本与安全表现。",
    tags: ["模型评测", "质量基线"],
    level: "挑战",
    users: "1.9k",
    researchUse: "模型或提示策略的对照实验与误差分析",
    starterTask: "建立 10 条评测样例，对比两种模型策略并归类失败模式。",
  },
];

export const getAiTool = (id: string) =>
  aiTools.find((tool) => tool.id === id) ?? null;
