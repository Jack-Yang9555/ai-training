import fs from "node:fs";
import path from "node:path";

const bankPath = path.resolve("docs/data/高职教师AI认知测评题库.json");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));

const newQuestions = [
  {
    id: "C131",
    scope: "common",
    branch: null,
    type: "单选",
    dimension: "研究创新",
    tags: ["模型评估与实验", "事实核验"],
    difficulty: "L1",
    stem: "在评估分类模型时，召回率（Recall）主要关注什么？",
    options: [
      "模型正确识别出的正例占所有实际正例的比例",
      "模型预测为正例中实际为正例的比例",
      "模型在所有预测中判断正确的比例",
      "模型对负例的识别准确程度"
    ],
    answer: ["模型正确识别出的正例占所有实际正例的比例"],
    explanation: "召回率衡量模型找出所有实际正例的能力，即正确识别的正例占全部实际正例的比例。",
    score: 1,
    estimatedMinutes: 1,
    primaryTag: "模型评估与实验"
  },
  {
    id: "C132",
    scope: "common",
    branch: null,
    type: "多选",
    dimension: "研究创新",
    tags: ["数据标注与数据治理"],
    difficulty: "L1",
    stem: "在 AI 项目中，以下哪些做法有助于提高数据标注的一致性？",
    options: [
      "每位标注员独立理解标注规则，不进行统一培训",
      "制定清晰的标注规则并提供示例",
      "定期抽检标注结果并反馈分歧",
      "标注完成后不再复查，直接用于训练"
    ],
    answer: ["制定清晰的标注规则并提供示例", "定期抽检标注结果并反馈分歧"],
    explanation: "统一规则和定期抽检是保证标注一致性的关键手段，不培训或不复查都会导致标注质量下降。",
    score: 2,
    estimatedMinutes: 1.5,
    primaryTag: "数据标注与数据治理"
  },
  {
    id: "C133",
    scope: "common",
    branch: null,
    type: "判断",
    dimension: "研究创新",
    tags: ["隐私计算", "数据隐私"],
    difficulty: "L1",
    stem: "差分隐私通过在查询结果中添加随机噪声，使得攻击者无法推断任何单个个体的数据，因此可以完全替代数据访问权限管理。",
    options: ["正确", "错误"],
    answer: ["错误"],
    explanation: "差分隐私降低了单个体被识别的风险，但不能完全替代权限管理，两者应结合使用。",
    score: 1,
    estimatedMinutes: 1,
    primaryTag: "隐私计算"
  },
  {
    id: "C134",
    scope: "common",
    branch: null,
    type: "单选",
    dimension: "研究创新",
    tags: ["模型评估与实验"],
    difficulty: "L1",
    stem: "在模型评估中，如果测试集与训练集完全相同，最可能出现什么问题？",
    options: [
      "模型的训练效率会明显提升",
      "模型的泛化能力被高估，实际应用效果可能显著下降",
      "评估结果将更加客观和可靠",
      "模型参数会自动优化到最优值"
    ],
    answer: ["模型的泛化能力被高估，实际应用效果可能显著下降"],
    explanation: "用训练集做测试集会导致过拟合评估，模型泛化能力被高估，实际应用效果可能大幅下降。",
    score: 1,
    estimatedMinutes: 1,
    primaryTag: "模型评估与实验"
  },
  {
    id: "C135",
    scope: "common",
    branch: null,
    type: "多选",
    dimension: "研究创新",
    tags: ["数据标注与数据治理", "事实核验"],
    difficulty: "L1",
    stem: "教师指导学生整理训练数据时，以下哪些做法有助于保障数据质量？",
    options: [
      "记录数据的来源、采集时间和预处理步骤",
      "尽可能多地收集数据，不关注来源是否可靠",
      "对缺失值和异常值进行标注和处理",
      "建立数据版本管理，保留每次修改的记录"
    ],
    answer: ["记录数据的来源、采集时间和预处理步骤", "对缺失值和异常值进行标注和处理", "建立数据版本管理，保留每次修改的记录"],
    explanation: "数据质量管理需要记录来源、处理异常值和版本管理，盲目追求数量而忽视可靠性会引入噪声。",
    score: 2,
    estimatedMinutes: 1.5,
    primaryTag: "数据标注与数据治理"
  },
  {
    id: "C136",
    scope: "common",
    branch: null,
    type: "判断",
    dimension: "研究创新",
    tags: ["隐私计算", "数据隐私"],
    difficulty: "L2",
    stem: "联邦学习中，各参与方只在本地训练模型并交换模型参数或梯度，不共享原始数据，因此可以在保护数据隐私的前提下联合建模。",
    options: ["正确", "错误"],
    answer: ["正确"],
    explanation: "联邦学习的核心思路是数据不动模型动，各方本地训练后只上传参数更新，原始数据不出本地。",
    score: 1,
    estimatedMinutes: 1,
    primaryTag: "隐私计算"
  },
  {
    id: "C137",
    scope: "common",
    branch: null,
    type: "单选",
    dimension: "研究创新",
    tags: ["科研设计与数据分析"],
    difficulty: "L2",
    stem: `教师指导学生用 AI 分析实验数据时，AI 给出的相关性分析显示两个变量高度相关。学生据此得出“A 导致 B”的结论。教师最合理的指导是什么？`,
    options: [
      "相关性较高说明因果关系成立，可以接受结论",
      "更换 AI 工具重新分析，直到得到不同结果",
      "删除部分数据以使结果更符合预期",
      "提醒学生相关性不等于因果性，需要进一步设计实验或查找混淆变量"
    ],
    answer: ["提醒学生相关性不等于因果性，需要进一步设计实验或查找混淆变量"],
    explanation: "相关性不意味着因果性，需要控制变量实验或排查混淆因素才能建立因果关系。",
    score: 1,
    estimatedMinutes: 1.5,
    primaryTag: "科研设计与数据分析"
  },
  {
    id: "C138",
    scope: "common",
    branch: null,
    type: "多选",
    dimension: "研究创新",
    tags: ["版权与学术诚信", "AI披露"],
    difficulty: "L2",
    stem: "教师在论文中使用 AI 辅助文献综述时，以下哪些做法符合学术诚信要求？",
    options: [
      "在方法部分说明 AI 工具的使用方式和范围",
      "逐条核验 AI 生成的文献引用是否真实存在",
      "直接引用 AI 生成的综述段落，不标注 AI 参与",
      "保留 AI 交互的提示词和输出记录以备查证"
    ],
    answer: ["在方法部分说明 AI 工具的使用方式和范围", "逐条核验 AI 生成的文献引用是否真实存在", "保留 AI 交互的提示词和输出记录以备查证"],
    explanation: "学术诚信要求披露 AI 使用、核验引用真实性并保留过程记录，直接引用不标注违反诚信原则。",
    score: 2,
    estimatedMinutes: 1.5,
    primaryTag: "版权与学术诚信"
  },
  {
    id: "C139",
    scope: "common",
    branch: null,
    type: "情境判断",
    dimension: "研究创新",
    tags: ["模型评估与实验"],
    difficulty: "L2",
    stem: "学生在课程项目中训练了一个图像分类模型，在测试集上准确率达到 95%。但部署后发现实际场景中准确率大幅下降。教师调查发现测试集图片质量远高于实际拍摄的照片。教师最合理的建议是什么？",
    options: [
      "在实际场景中多拍摄一些高质量照片补充测试集",
      "将模型准确率目标提高到 98% 以弥补差距",
      "收集与实际场景条件一致的测试数据重新评估模型",
      "放弃该模型，改用现成的商业 API"
    ],
    answer: ["收集与实际场景条件一致的测试数据重新评估模型"],
    explanation: "测试集应与实际使用场景一致，否则评估结果不具参考价值。应收集真实场景数据重新评估。",
    score: 2,
    estimatedMinutes: 1.5,
    primaryTag: "模型评估与实验"
  },
  {
    id: "C140",
    scope: "common",
    branch: null,
    type: "情境判断",
    dimension: "研究创新",
    tags: ["数据标注与数据治理"],
    difficulty: "L3",
    stem: `研究团队使用 AI 分析学生评教数据时，发现标注员对“中性”和“偏正面”的标注分歧很大，导致模型在中间地带的分类不稳定。团队负责人最合理的处理是什么？`,
    options: [
      "增加多轮交叉标注，统计分歧类型并修订标注规则中模糊的边界定义",
      "删除所有有分歧的样本，只保留标注完全一致的样本",
      `将分歧样本统一标注为“中性”，不再讨论`,
      "放弃人工标注，改为完全依赖 AI 自动标注"
    ],
    answer: ["增加多轮交叉标注，统计分歧类型并修订标注规则中模糊的边界定义"],
    explanation: "标注分歧说明规则不够清晰，应通过交叉标注发现分歧模式并修订规则，简单删除或统一标注会损失信息。",
    score: 2,
    estimatedMinutes: 2,
    primaryTag: "数据标注与数据治理"
  }
];

// Add new questions to commonQuestions
bank.commonQuestions.push(...newQuestions);

// Update assemblyPolicy
bank.assemblyPolicy.bankQuestionCount = 290;
bank.assemblyPolicy.bankTypeCounts = {
  "单选": 121, "多选": 49, "判断": 28, "情境判断": 72, "开放": 10, "实操": 10
};
bank.assemblyPolicy.bankDifficultyCounts = { L1: 163, L2: 83, L3: 44 };
bank.assemblyPolicy.bankDimensionCounts = {
  "AI 基础认知": 52, "提示词与多模态": 52, "知识库与智能体": 62,
  "教学融合": 62, "研究创新": 62
};

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log("Added 10 研究创新 questions (C131-C140) and updated assemblyPolicy");
console.log("New commonQuestions count:", bank.commonQuestions.length);
