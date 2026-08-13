import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryDir = path.resolve(scriptDir, "..", "..");
const assessmentDir = path.join(repositoryDir, "docs", "课程与测评");
const bankPath = path.join(assessmentDir, "data", "高职教师AI认知测评题库.json");
const htmlPath = path.join(assessmentDir, "高职教师AI认知测评Demo.html");
const markdownPath = path.join(assessmentDir, "高职教师AI认知测评题库.md");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const requestedModes = process.argv.slice(2);
const validModes = new Set(["--check", "--sync-html", "--sync-all"]);
if (requestedModes.some((mode) => !validModes.has(mode)) || requestedModes.length > 1) {
  throw new Error("用法：node scripts/测评题库/build-teacher-ai-assessment-bank.mjs [--check|--sync-html|--sync-all]");
}
const mode = requestedModes[0] || "--sync-all";

const dimensions = ["AI 基础认知", "提示词与多模态", "知识库与智能体", "教学融合", "研究创新"];
const groupKeys = ["common", "computerAI", "engineering", "medicalHealth", "businessHumanitiesServices"];
const branchKeys = groupKeys.slice(1);
const expectedGroupSizes = { common: 180, computerAI: 40, engineering: 40, medicalHealth: 40, businessHumanitiesServices: 40 };
const expectedTypes = {
  common: { "单选": 73, "多选": 37, "判断": 12, "情境判断": 44, "开放": 2, "实操": 12 },
  branch: { "单选": 16, "多选": 5, "判断": 5, "情境判断": 10, "开放": 2, "实操": 2 },
};
const expectedBankTypes = { "单选": 137, "多选": 57, "判断": 32, "情境判断": 84, "开放": 10, "实操": 20 };
const expectedDifficulties = {
  common: { L1: 89, L2: 54, L3: 37 },
  computerAI: { L1: 19, L2: 13, L3: 8 },
  engineering: { L1: 25, L2: 11, L3: 4 },
  medicalHealth: { L1: 25, L2: 11, L3: 4 },
  businessHumanitiesServices: { L1: 25, L2: 11, L3: 4 },
};
const expectedStandardTypes = { "单选": 18, "多选": 6, "判断": 6, "情境判断": 12, "开放": 4, "实操": 4 };
const originalPrimaryTags = [
  "大模型基础",
  "能力边界与幻觉",
  "工具选择",
  "数据隐私",
  "提示词结构",
  "提示词迭代",
  "多模态应用",
  "学生AI素养",
  "知识库治理",
  "RAG检索与引用",
  "智能体与工作流",
  "事实核验",
  "备课与资源开发",
  "课堂互动与分层",
  "评价反馈与学情分析",
  "实训与产教融合",
  "科研设计与数据分析",
  "版权与学术诚信",
  "安全伦理与教师责任",
  "专业实践与行业规范",
];
const expandedPrimaryTags = [
  "机器学习基础",
  "深度学习与神经网络",
  "AI历史与发展",
  "计算机视觉基础",
  "自然语言与语音",
  "AI可解释性",
  "AI法律法规与治理",
  "AI与社会影响",
  "大模型推理与学习",
  "AI工具生态与接入",
  "模型评估与实验",
  "强化学习与具身智能",
  "AI部署与工程",
  "数据标注与数据治理",
  "隐私计算",
];
const newPrimaryTags = [
  "教师专业发展",
  "人本与可持续AI",
  "AI安全与攻防",
  "智能体编排与工具调用",
  "真实操作与成果验证",
];
const expectedPrimaryTags = [...originalPrimaryTags, ...expandedPrimaryTags, ...newPrimaryTags];
const expectedPrimaryTagCounts = {
  ...Object.fromEntries(originalPrimaryTags.map((tag) => [tag, 10])),
  ...Object.fromEntries(expandedPrimaryTags.map((tag) => [tag, 4])),
  "RAG检索与引用": 11,
  "智能体与工作流": 11,
  "知识库治理": 11,
  "AI工具生态与接入": 5,
  "AI部署与工程": 5,
  "数据标注与数据治理": 8,
  "隐私计算": 7,
  "AI可解释性": 6,
  "模型评估与实验": 8,
  "自然语言与语音": 5,
  "AI法律法规与治理": 5,
  "AI与社会影响": 5,
  "备课与资源开发": 12,
  "评价反馈与学情分析": 12,
  "课堂互动与分层": 12,
  "实训与产教融合": 11,
  "科研设计与数据分析": 11,
  "版权与学术诚信": 11,
  "教师专业发展": 10,
  "人本与可持续AI": 10,
  "AI安全与攻防": 10,
  "智能体编排与工具调用": 10,
  "真实操作与成果验证": 10,
};
const expectedCrossTags = [
  "安全",
  "数据隐私",
  "事实核验",
  "版权",
  "AI披露",
  "公平",
  "教师责任",
  "无障碍",
  "行业规范",
  "可解释",
  "法律治理",
  "社会影响",
  "部署工程",
];
const scoreForType = (type) => (type === "多选" || type === "情境判断" ? 2 : type === "开放" || type === "实操" ? 5 : 1);

function fail(message) {
  throw new Error(message);
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = typeof key === "function" ? key(item) : item[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function assertCounts(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if ((actual[key] || 0) !== value) fail(`${label}：${key} 应为 ${value}，实际为 ${actual[key] || 0}`);
  }
  const extras = Object.keys(actual).filter((key) => !(key in expected));
  if (extras.length) fail(`${label} 出现未定义分类：${extras.join("、")}`);
}

if (bank.schemaVersion !== "2.3") fail(`schemaVersion 应为 2.3，实际为 ${bank.schemaVersion}`);
if (JSON.stringify(bank.tagTaxonomy?.primaryTags) !== JSON.stringify(expectedPrimaryTags)) fail("primaryTags 与受控标签表不一致");
if (JSON.stringify(bank.tagTaxonomy?.crossCuttingTags) !== JSON.stringify(expectedCrossTags)) fail("crossCuttingTags 与受控标签表不一致");

const groups = {
  common: bank.commonQuestions,
  ...Object.fromEntries(Object.entries(bank.disciplineBranches).map(([key, branch]) => [key, branch.questions])),
};
if (JSON.stringify(Object.keys(groups)) !== JSON.stringify(groupKeys)) fail(`题组必须为：${groupKeys.join("、")}`);

for (const key of groupKeys) {
  const items = groups[key];
  if (!Array.isArray(items) || items.length !== expectedGroupSizes[key]) {
    fail(`${key} 题池必须为 ${expectedGroupSizes[key]} 题`);
  }
  assertCounts(countBy(items, "type"), key === "common" ? expectedTypes.common : expectedTypes.branch, `${key} 题型`);
  assertCounts(countBy(items, "difficulty"), expectedDifficulties[key], `${key} 难度`);
  const expectedDimensions = key === "common"
    ? { "AI 基础认知": 30, "提示词与多模态": 30, "知识库与智能体": 40, "教学融合": 40, "研究创新": 40 }
    : Object.fromEntries(dimensions.map((dimension) => [dimension, 8]));
  assertCounts(countBy(items, "dimension"), expectedDimensions, `${key} 五维`);
}

const allQuestions = groupKeys.flatMap((key) => groups[key]);
if (allQuestions.length !== 340) fail(`正式计分题必须为 340 道，实际为 ${allQuestions.length}`);
if (new Set(allQuestions.map((item) => item.id)).size !== 340) fail("正式计分题 ID 必须唯一");
assertCounts(countBy(allQuestions, "type"), expectedBankTypes, "全库题型");
assertCounts(countBy(allQuestions, "difficulty"), { L1: 183, L2: 100, L3: 57 }, "全库难度");
assertCounts(countBy(allQuestions, "dimension"), { "AI 基础认知": 62, "提示词与多模态": 62, "知识库与智能体": 72, "教学融合": 72, "研究创新": 72 }, "全库五维");
assertCounts(countBy(allQuestions, "primaryTag"), expectedPrimaryTagCounts, "全库主标签");
const expectedCommonIds = Array.from({ length: 180 }, (_, index) => `C${String(index + 1).padStart(2, "0")}`);
if (JSON.stringify(bank.commonQuestions.map((item) => item.id)) !== JSON.stringify(expectedCommonIds)) {
  fail("共性题 ID 必须按 C01—C180 连续排列");
}

const l1Questions = allQuestions.filter((item) => item.difficulty === "L1");
const l1OptionQuestions = l1Questions.filter((item) => ["单选", "多选", "情境判断"].includes(item.type));
const l1JudgmentQuestions = l1Questions.filter((item) => item.type === "判断");
if (l1Questions.length !== 183 || l1OptionQuestions.length !== 158 || l1JudgmentQuestions.length !== 25) {
  fail(`L1 结构应为 183 道，其中四选项题 158 道、判断题 25 道`);
}
for (const item of l1OptionQuestions) {
  if (item.options.length !== 4) fail(`${item.id} L1 选择类题必须有四个选项`);
  const correctAverage = item.answer.reduce((sum, option) => sum + option.length, 0) / item.answer.length;
  const distractors = item.options.filter((option) => !item.answer.includes(option));
  const distractorAverage = distractors.reduce((sum, option) => sum + option.length, 0) / distractors.length;
  if (correctAverage > distractorAverage * 2.2 || distractorAverage > correctAverage * 2.2) {
    fail(`${item.id} L1 正确项与干扰项平均长度差异超过 2.2 倍`);
  }
}
for (const item of l1JudgmentQuestions) {
  if (JSON.stringify(item.options) !== JSON.stringify(["正确", "错误"])) fail(`${item.id} L1 判断题选项必须为“正确/错误”`);
}
const l1AnswerPositions = { A: 0, B: 0, C: 0, D: 0 };
for (const item of l1OptionQuestions) {
  for (const answer of item.answer) {
    const position = item.options.indexOf(answer);
    l1AnswerPositions[String.fromCharCode(65 + position)] += 1;
  }
}
const l1PositionCounts = Object.values(l1AnswerPositions);
if (Math.max(...l1PositionCounts) - Math.min(...l1PositionCounts) > 5) {
  fail(`L1 正确答案位置分布失衡：${JSON.stringify(l1AnswerPositions)}`);
}

const singleAnswerQuestions = allQuestions.filter((item) => ["单选", "情境判断"].includes(item.type));
const multiAnswerQuestions = allQuestions.filter((item) => item.type === "多选");
const answerPositions = (items) => {
  const positions = { A: 0, B: 0, C: 0, D: 0 };
  for (const item of items) {
    if (item.options.length !== 4) fail(`${item.id} 选择题必须有四个选项`);
    for (const answer of item.answer) {
      const position = item.options.indexOf(answer);
      positions[String.fromCharCode(65 + position)] += 1;
    }
  }
  return positions;
};
for (const item of singleAnswerQuestions) {
  if (item.answer.length !== 1) fail(`${item.id} 四选一题必须且只能有一个正确答案`);
}
for (const item of multiAnswerQuestions) {
  if (item.answer.length < 2 || item.answer.length > 3) fail(`${item.id} 多选题应有 2—3 个正确答案`);
}
const singleAnswerPositions = answerPositions(singleAnswerQuestions);
const multiAnswerPositions = answerPositions(multiAnswerQuestions);
const allOptionPositions = Object.fromEntries(
  Object.keys(singleAnswerPositions).map((key) => [key, singleAnswerPositions[key] + multiAnswerPositions[key]]),
);
for (const [label, positions] of [
  ["四选一", singleAnswerPositions],
  ["多选正确项", multiAnswerPositions],
  ["全部选择题正确项", allOptionPositions],
]) {
  const counts = Object.values(positions);
  if (Math.max(...counts) - Math.min(...counts) > 1) {
    fail(`${label}答案位置分布失衡：${JSON.stringify(positions)}`);
  }
}
const judgmentAnswerCounts = countBy(allQuestions.filter((item) => item.type === "判断"), (item) => item.answer[0]);
if (Math.abs((judgmentAnswerCounts["正确"] || 0) - (judgmentAnswerCounts["错误"] || 0)) > 3) {
  fail(`判断题正确/错误分布失衡：${JSON.stringify(judgmentAnswerCounts)}`);
}

const normalizedStems = new Map();
for (const item of allQuestions) {
  if (!item.id || !item.stem?.trim() || !item.explanation?.trim()) fail(`${item.id || "未知题目"} 缺少题干或解析`);
  if (!dimensions.includes(item.dimension)) fail(`${item.id} 能力维度无效`);
  if (!expectedPrimaryTags.includes(item.primaryTag)) fail(`${item.id} 主标签无效：${item.primaryTag}`);
  if (!Array.isArray(item.tags) || item.tags.length < 1 || item.tags.length > 3 || item.tags[0] !== item.primaryTag) {
    fail(`${item.id} tags 必须以 primaryTag 开头且总数为 1—3`);
  }
  for (const tag of item.tags.slice(1)) {
    if (!expectedCrossTags.includes(tag)) fail(`${item.id} 跨领域标签无效：${tag}`);
  }
  if (item.score !== scoreForType(item.type)) fail(`${item.id} 分值与题型不一致`);
  if (!Array.isArray(item.options) || !Array.isArray(item.answer)) fail(`${item.id} options 或 answer 结构无效`);
  if (["单选", "多选", "判断", "情境判断"].includes(item.type)) {
    if (item.options.length < 2 || item.answer.length < 1) fail(`${item.id} 客观题缺少选项或答案`);
    if (new Set(item.options).size !== item.options.length) fail(`${item.id} 存在重复选项`);
    for (const answer of item.answer) {
      if (!item.options.includes(answer)) fail(`${item.id} 答案不在选项中：${answer}`);
    }
  }
  if (["开放", "实操"].includes(item.type) && (!item.rubricId || item.answer.length < 1)) fail(`${item.id} 主观题缺少量规或答案要点`);
  if (item.type === "实操") {
    const spec = item.practicalSpec;
    if (!spec?.materials?.length || !spec.toolGuidance || spec.steps?.length !== 5 || spec.completionItems?.length !== 4) {
      fail(`${item.id} 实操规范必须包含材料、工具说明、5 个步骤和 4 项完成确认`);
    }
  }
  const normalized = item.stem.replace(/\s+/g, "").replace(/[，。！？、“”‘’：；（）]/g, "");
  if (normalizedStems.has(normalized)) fail(`${item.id} 与 ${normalizedStems.get(normalized)} 题干重复`);
  normalizedStems.set(normalized, item.id);
}

const surveys = bank.surveyQuestions || [];
if (
  surveys.length !== 1 ||
  surveys[0].id !== "S01" ||
  surveys[0].scored !== false ||
  surveys[0].score !== 0 ||
  surveys[0].primaryTag !== "工具选择" ||
  allQuestions.some((item) => item.id === "S01")
) {
  fail("S01 必须是独立、不计分且标记为工具选择的调查题");
}

const policy = bank.assemblyPolicy;
if (
  policy.bankQuestionCount !== 340 ||
  policy.questionsPerTeacher !== 50 ||
  policy.commonQuestionCount !== 30 ||
  policy.disciplineQuestionCount !== 20 ||
  policy.totalScore !== 100
) {
  fail("assemblyPolicy 的题池或标准组卷数量不正确");
}
assertCounts(policy.bankTypeCounts, expectedBankTypes, "assemblyPolicy 全库题型");
assertCounts(policy.poolStructure, expectedGroupSizes, "assemblyPolicy 题池结构");
assertCounts(policy.bankDifficultyCounts, { L1: 183, L2: 100, L3: 57 }, "assemblyPolicy 全库难度");
assertCounts(policy.bankDimensionCounts, { "AI 基础认知": 62, "提示词与多模态": 62, "知识库与智能体": 72, "教学融合": 72, "研究创新": 72 }, "assemblyPolicy 全库五维");

const questionById = Object.fromEntries(allQuestions.map((item) => [item.id, item]));
if (JSON.stringify(Object.keys(policy.standardForms || {})) !== JSON.stringify(branchKeys)) {
  fail(`standardForms 必须包含：${branchKeys.join("、")}`);
}
const standardCommonSignatures = new Set();
for (const branch of branchKeys) {
  const formIds = policy.standardForms[branch];
  if (!Array.isArray(formIds) || formIds.length !== 50 || new Set(formIds).size !== 50) {
    fail(`${branch} 标准卷必须包含 50 个唯一题目 ID`);
  }
  const form = formIds.map((id) => questionById[id]);
  const missingIds = formIds.filter((id) => !questionById[id]);
  if (missingIds.length) fail(`${branch} 标准卷存在无效题目：${missingIds.join("、")}`);
  assertCounts(countBy(form, "type"), expectedStandardTypes, `${branch} 标准50题组卷`);
  if (form.reduce((sum, item) => sum + item.score, 0) !== 100) fail(`${branch} 标准50题组卷总分不是100分`);
  const commonItems = form.filter((item) => item.scope === "common");
  const branchItems = form.filter((item) => item.scope === "discipline");
  if (commonItems.length !== 30 || branchItems.length !== 20 || branchItems.some((item) => item.branch !== branch)) {
    fail(`${branch} 标准卷必须为 30 道共性题加 20 道本专业题`);
  }
  if (
    form.slice(0, 26).some((item) => !["单选", "多选", "判断", "情境判断"].includes(item.type)) ||
    form.slice(26, 28).some((item) => item.type !== "开放") ||
    form.slice(28, 44).some((item) => !["单选", "多选", "判断", "情境判断"].includes(item.type)) ||
    form.slice(44, 46).some((item) => item.type !== "开放") ||
    form.slice(46).some((item) => item.type !== "实操")
  ) {
    fail(`${branch} 标准卷题目顺序不符合“共性客观—共性开放—专业客观—专业开放—实操”`);
  }
  const commonFormItems = [...form.slice(0, 28), ...form.slice(46, 48)];
  assertCounts(countBy(commonFormItems, "type"), { "单选": 12, "多选": 4, "判断": 4, "情境判断": 6, "开放": 2, "实操": 2 }, `${branch} 标准卷共性30题型`);
  assertCounts(countBy(commonFormItems, "difficulty"), { L1: 18, L2: 8, L3: 4 }, `${branch} 标准卷共性30题难度`);
  assertCounts(countBy(commonFormItems, "dimension"), Object.fromEntries(dimensions.map((dimension) => [dimension, 6])), `${branch} 标准卷共性五维`);
  if (new Set(commonFormItems.map((item) => item.primaryTag)).size !== 29) fail(`${branch} 标准卷共性题应覆盖 29 个主标签`);
  standardCommonSignatures.add(commonFormItems.map((item) => item.id).join(","));
}
if (standardCommonSignatures.size !== 1) fail("四套标准卷必须共用同一组共性 30 题");

const demoIds = policy.demoFixedQuestionIds;
if (!Array.isArray(demoIds) || demoIds.length !== 30 || new Set(demoIds).size !== 30) {
  fail("demoFixedQuestionIds 必须包含 30 个唯一题目 ID");
}
const demoQuestions = demoIds.map((id) => questionById[id]);
const missingDemoIds = demoIds.filter((id) => !questionById[id]);
if (missingDemoIds.length) fail(`Demo 题目 ID 不存在：${missingDemoIds.join("、")}`);
if (demoQuestions.some((item) => !["单选", "多选", "判断", "情境判断"].includes(item.type))) {
  fail("Demo 固定 30 题必须全部为客观题");
}
assertCounts(countBy(demoQuestions, "dimension"), Object.fromEntries(dimensions.map((dimension) => [dimension, 6])), "Demo 五维");
assertCounts(countBy(demoQuestions, "difficulty"), { L1: 15, L2: 11, L3: 4 }, "Demo 难度");
assertCounts(countBy(demoQuestions, "type"), { "单选": 10, "多选": 8, "判断": 3, "情境判断": 9 }, "Demo 题型");
const demoTagCounts = countBy(demoQuestions, "primaryTag");
if (Object.keys(demoTagCounts).length !== 28) fail(`Demo 应覆盖 28 个主标签，实际为 ${Object.keys(demoTagCounts).length}`);
const expectedRepeatedDemoTags = ["教师专业发展", "智能体与工作流"];
const actualRepeatedDemoTags = Object.entries(demoTagCounts)
  .filter(([, count]) => count === 2)
  .map(([tag]) => tag)
  .sort();
if (
  JSON.stringify(actualRepeatedDemoTags) !== JSON.stringify([...expectedRepeatedDemoTags].sort()) ||
  Object.values(demoTagCounts).some((count) => count > 2)
) {
  fail(`Demo 仅允许教师专业发展、智能体与工作流各出现两次：${JSON.stringify(demoTagCounts)}`);
}

for (const primaryTag of newPrimaryTags.slice(0, 4)) {
  const items = allQuestions.filter((item) => item.primaryTag === primaryTag);
  assertCounts(countBy(items, "type"), { "单选": 4, "多选": 2, "判断": 1, "情境判断": 3 }, `${primaryTag} 题型`);
  assertCounts(countBy(items, "dimension"), Object.fromEntries(dimensions.map((dimension) => [dimension, 2])), `${primaryTag} 五维`);
}
const practicalExpansion = allQuestions.filter((item) => item.primaryTag === "真实操作与成果验证");
assertCounts(countBy(practicalExpansion, "type"), { "实操": 10 }, "真实操作与成果验证题型");
assertCounts(countBy(practicalExpansion, "difficulty"), { L2: 5, L3: 5 }, "真实操作与成果验证难度");
assertCounts(countBy(practicalExpansion, "dimension"), Object.fromEntries(dimensions.map((dimension) => [dimension, 2])), "真实操作与成果验证五维");

function mdText(value) {
  return String(value).replace(/\r?\n/g, "<br>").replace(/\|/g, "\\|");
}

function renderQuestion(item) {
  const lines = [
    `### ${item.id}｜${item.type}｜${item.difficulty}｜${item.scored === false ? "不计分" : `${item.score} 分`}`,
    "",
    `- **能力维度：** ${item.dimension}`,
    `- **主标签：** ${item.primaryTag}`,
    `- **全部标签：** ${item.tags.join("、")}`,
    `- **预计用时：** ${item.estimatedMinutes} 分钟`,
    "",
    `**题目：** ${mdText(item.stem)}`,
    "",
  ];
  if (item.options.length) {
    item.options.forEach((option, index) => lines.push(`${String.fromCharCode(65 + index)}. ${mdText(option)}`));
    lines.push("");
  }
  if (item.scored === false) {
    lines.push("**答案：** 不计分调查题，无标准答案。");
    if (item.exclusiveOptions?.length) lines.push("", `**互斥选项：** ${item.exclusiveOptions.map(mdText).join("、")}`);
  } else if (["开放", "实操"].includes(item.type)) {
    lines.push("**答案要点：**", "");
    item.answer.forEach((answer) => lines.push(`- ${mdText(answer)}`));
  } else {
    lines.push(`**正确答案：** ${item.answer.map(mdText).join("、")}`);
  }
  lines.push("", `**解析：** ${mdText(item.explanation)}`);
  if (item.rubricId) lines.push("", `**评分量规：** ${item.rubricId}`);
  if (item.practicalSpec) {
    lines.push("", "**实操材料：**", "");
    item.practicalSpec.materials.forEach((material) => lines.push(`- ${mdText(material)}`));
    lines.push("", `**可使用工具：** ${mdText(item.practicalSpec.toolGuidance)}`, "", "**操作步骤：**", "");
    item.practicalSpec.steps.forEach((step, index) => lines.push(`${index + 1}. ${mdText(step)}`));
    lines.push("", "**完成情况确认：**", "");
    item.practicalSpec.completionItems.forEach((itemText) => lines.push(`- [ ] ${mdText(itemText)}`));
  }
  lines.push("", "---", "");
  return lines.join("\n");
}

function renderMarkdown() {
  const typeCounts = countBy(allQuestions, "type");
  const difficultyCounts = countBy(allQuestions, "difficulty");
  const dimensionCounts = countBy(allQuestions, "dimension");
  const primaryTagCounts = countBy(allQuestions, "primaryTag");
  const lines = [
    `# ${bank.title}`,
    "",
    "> 本文档由 `docs/课程与测评/data/高职教师AI认知测评题库.json` 自动生成，便于审阅题目、答案、解析和标签。请修改 JSON 源后重新运行 `node scripts/测评题库/build-teacher-ai-assessment-bank.mjs`，不要直接维护本文档。",
    "",
    `- **Schema 版本：** ${bank.schemaVersion}`,
    `- **题库状态：** ${bank.status}`,
    `- **正式计分题：** ${allQuestions.length} 道`,
    `- **调查题：** ${surveys.length} 道`,
    `- **标准组卷：** ${policy.commonQuestionCount} 道共性题 + ${policy.disciplineQuestionCount} 道专业题 = ${policy.questionsPerTeacher} 道 / ${policy.totalScore} 分`,
    `- **说明：** ${bank.notice}`,
    "",
    "## 一、题库结构",
    "",
    "| 题组 | 题量 | 单选 | 多选 | 判断 | 情境判断 | 开放 | 实操 |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const key of groupKeys) {
    const items = groups[key];
    const counts = countBy(items, "type");
    const label = key === "common" ? "共性题" : bank.disciplineBranches[key].label;
    lines.push(`| ${label} | ${items.length} | ${counts["单选"]} | ${counts["多选"]} | ${counts["判断"]} | ${counts["情境判断"]} | ${counts["开放"]} | ${counts["实操"]} |`);
  }
  lines.push(
    `| **合计** | **${allQuestions.length}** | **${typeCounts["单选"]}** | **${typeCounts["多选"]}** | **${typeCounts["判断"]}** | **${typeCounts["情境判断"]}** | **${typeCounts["开放"]}** | **${typeCounts["实操"]}** |`,
    "",
    "### 难度分布",
    "",
    "| 难度 | 题量 | 占比 |",
    "| --- | ---: | ---: |",
    ...["L1", "L2", "L3"].map((difficulty) => `| ${difficulty} | ${difficultyCounts[difficulty]} | ${(difficultyCounts[difficulty] / allQuestions.length * 100).toFixed(0)}% |`),
    "",
    "### 五维能力分布",
    "",
    "| 能力维度 | 题量 |",
    "| --- | ---: |",
    ...dimensions.map((dimension) => `| ${dimension} | ${dimensionCounts[dimension]} |`),
    "",
    "## 二、标签体系",
    "",
    "每道计分题有一个主标签；`tags` 中还可追加最多两个跨领域标签。",
    "",
    "| 主标签 | 题量 |",
    "| --- | ---: |",
    ...expectedPrimaryTags.map((tag) => `| ${tag} | ${primaryTagCounts[tag]} |`),
    "",
    `**跨领域标签：** ${expectedCrossTags.join("、")}`,
    "",
    "## 三、评分量规",
    "",
  );
  for (const [rubricId, criteria] of Object.entries(bank.rubrics)) {
    lines.push(`### ${rubricId}`, "", "| 评分项 | 分值 |", "| --- | ---: |");
    criteria.forEach((criterion) => lines.push(`| ${mdText(criterion.criterion)} | ${criterion.maxScore} |`));
    lines.push("");
  }
  lines.push("## 四、正式计分题", "");
  for (const key of groupKeys) {
    const label = key === "common" ? "共性题" : bank.disciplineBranches[key].label;
    lines.push(`## ${label}（${groups[key].length} 道）`, "", `题目 ID：${groups[key].map((item) => item.id).join("、")}`, "");
    groups[key].forEach((item) => lines.push(renderQuestion(item)));
  }
  lines.push("## 五、不计分调查题", "");
  surveys.forEach((item) => lines.push(renderQuestion(item)));
  return `${lines.join("\n").trim()}\n`;
}

const sourceText = `${JSON.stringify(bank, null, 2)}\n`;
const hash = crypto.createHash("sha256").update(sourceText).digest("hex").toUpperCase();
const payload = {
  payloadVersion: "1.0",
  sourceBankSchemaVersion: bank.schemaVersion,
  sourceBankQuestionCount: allQuestions.length,
  sourceSha256: hash,
  questionIds: demoIds,
  questions: demoQuestions,
};
const embedded = JSON.stringify(payload).replace(/<\/script/gi, "<\\/script");
let html = fs.readFileSync(htmlPath, "utf8");
if (mode !== "--check") {
  const updatedHtml = html.replace(
    /(<script type="application\/json" id="question-bank">)[\s\S]*?(<\/script>)/,
    `$1${embedded}$2`,
  );
  if (updatedHtml === html && !html.includes(`<script type="application/json" id="question-bank">${embedded}</script>`)) {
    fail("未能定位 HTML 内嵌题库节点");
  }
  if (updatedHtml !== html) fs.writeFileSync(htmlPath, updatedHtml, "utf8");
  html = updatedHtml;
}

const appScript = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/)?.[1];
if (!appScript) fail("未能定位 Demo 主脚本");
try {
  new Function(appScript);
} catch (error) {
  fail(`Demo 主脚本语法错误：${error.message}`);
}
if (/DEMO_QUESTION_IDS/.test(appScript)) fail("HTML 不应再维护第二份 DEMO_QUESTION_IDS");
if (!/BANK\.questions/.test(appScript)) fail("HTML 必须直接从精简载荷的 questions 构建测评");

const embeddedMatch = html.match(/<script type="application\/json" id="question-bank">([\s\S]*?)<\/script>/);
if (!embeddedMatch) fail("未能定位 HTML 内嵌题库节点");
let embeddedPayload;
try {
  embeddedPayload = JSON.parse(embeddedMatch[1]);
} catch (error) {
  fail(`HTML 精简题库载荷不是合法 JSON：${error.message}`);
}
if (JSON.stringify(embeddedPayload) !== JSON.stringify(payload)) fail("HTML 精简题库载荷与完整 JSON 题库不一致");
if (embeddedPayload.questions.length !== 30 || embeddedPayload.questionIds.length !== 30) fail("HTML 内嵌载荷必须严格包含 30 道题");
if (embeddedPayload.sourceBankQuestionCount !== 340 || embeddedPayload.sourceBankSchemaVersion !== "2.3") {
  fail("HTML 内嵌载荷的源题库版本或题量不正确");
}

if (mode === "--sync-all") {
  const markdown = renderMarkdown();
  if (!fs.existsSync(markdownPath) || fs.readFileSync(markdownPath, "utf8") !== markdown) {
    fs.writeFileSync(markdownPath, markdown, "utf8");
  }
}

const modeLabel = mode === "--check" ? "validated without writes" : mode === "--sync-html" ? "validated and synced HTML payload" : "validated and synced HTML and Markdown";
console.log(`Teacher AI assessment bank ${modeLabel}: ${allQuestions.length} scored questions, ${surveys.length} survey question, 30 embedded demo questions.`);
console.log(`Answer positions: single ${JSON.stringify(singleAnswerPositions)}, multi ${JSON.stringify(multiAnswerPositions)}, all ${JSON.stringify(allOptionPositions)}.`);
console.log(`SHA-256: ${hash}`);
