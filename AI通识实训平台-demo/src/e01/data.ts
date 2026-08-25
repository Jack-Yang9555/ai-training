import type {
  E01AnonymousAnswer,
  E01AnswerId,
  E01Feedback,
  E01Progress,
  E01Rubric,
  E01RubricDimensionId,
  E01RubricScore,
} from './domain'

export const e01AnswerIds: E01AnswerId[] = ['A01', 'A02', 'A03', 'A04', 'A05']

export function createE01AnonymousAnswers(): E01AnonymousAnswer[] {
  return [
    {
      answerId: 'A01', version: '1.0', fictional: true, anonymous: true,
      text: '结构化提示词包含角色与任务、背景、输入、约束、输出格式和质量标准。例如设计校园海报时，我会限定受众、画幅比例、字体可读性和版权检查，并在生成后对照标准逐项核验。',
    },
    {
      answerId: 'A02', version: '1.0', fictional: true, anonymous: true,
      text: '提示词应写明任务、画面背景、素材和输出格式。我会先生成一版，再根据画面效果增加颜色和构图要求。',
    },
    {
      answerId: 'A03', version: '1.0', fictional: true, anonymous: true,
      text: '我会先写清楚角色和设计任务，再提供应用场景和已有素材，最后要求输出操作步骤。对结果需要人工检查，但我还没有列出明确的质量标准。',
    },
    {
      answerId: 'A04', version: '1.0', fictional: true, anonymous: true,
      text: '结构化提示词就是把想要的画面写清楚。我认为形容词越多效果一定越好，所以会持续增加风格词，直到生成结果看起来丰富。',
    },
    {
      answerId: 'A05', version: '1.0', fictional: true, anonymous: true,
      text: '我会让 AI 帮我写提示词，然后选一张好看的图作为作业。如果效果不好就再生成一次。',
    },
  ]
}

export const e01EvidenceExcerpts: Record<E01AnswerId, string> = {
  A01: '并在生成后对照标准逐项核验',
  A02: '再根据画面效果增加颜色和构图要求',
  A03: '但我还没有列出明确的质量标准',
  A04: '我认为形容词越多效果一定越好',
  A05: '如果效果不好就再生成一次',
}

export const e01AiScoreMatrix: Record<E01AnswerId, Record<E01RubricDimensionId, E01RubricScore>> = {
  A01: { 'goal-alignment': 3, 'professional-quality': 3, 'evidence-use': 3, 'actionable-expression': 3 },
  A02: { 'goal-alignment': 2, 'professional-quality': 2, 'evidence-use': 2, 'actionable-expression': 2 },
  A03: { 'goal-alignment': 2, 'professional-quality': 3, 'evidence-use': 2, 'actionable-expression': 2 },
  A04: { 'goal-alignment': 2, 'professional-quality': 2, 'evidence-use': 3, 'actionable-expression': 2 },
  A05: { 'goal-alignment': 1, 'professional-quality': 1, 'evidence-use': 1, 'actionable-expression': 1 },
}

export const e01ExpectedFinalScoreMatrix: Record<E01AnswerId, Record<E01RubricDimensionId, E01RubricScore>> = {
  ...e01AiScoreMatrix,
  A04: { ...e01AiScoreMatrix.A04, 'evidence-use': 2 },
}

export const e01InitialFeedback: Record<E01AnswerId, E01Feedback> = {
  A01: {
    strength: '六项结构齐全，并把受众、比例和版权核验落到了设计场景。',
    issue: '可以再补充一条可直接观察的画面质量标准。',
    nextStep: '在“质量标准”中增加“主标题在缩略图下仍清晰可读”，再运行一次单变量对照。',
  },
  A02: {
    strength: '已经写出任务、背景、素材和输出格式，且有一次迭代意图。',
    issue: '尚未写明角色、约束和可检查的质量标准。',
    nextStep: '补入“校园海报设计助理”角色，并增加版权、尺寸和可读性三项检查条件。',
  },
  A03: {
    strength: '作答能按顺序说明角色、任务、场景、素材和输出。',
    issue: '作答自己指出没有列出明确质量标准，因此无法客观检查。',
    nextStep: '为当前任务增加两项可观察标准：关键信息完整、画面主次层级清晰。',
  },
  A04: {
    strength: '已表达要通过多轮生成观察画面变化。',
    issue: '“形容词越多效果一定越好”是绝对化结论，作答没有给出课程证据。',
    nextStep: '继续优化，使内容更好。',
  },
  A05: {
    strength: '已意识到结果不符合预期时需要再迭代。',
    issue: '缺少结构要素、修改依据和人工核验，“好看”也不是可复用的标准。',
    nextStep: '先按六项结构补齐角色、背景、输入、约束、格式和质量标准，再记录一个变量的修改。',
  },
}

export function createInitialE01Rubric(learningObjective: string): E01Rubric {
  return {
    version: 'R1.0',
    teacherConfirmed: false,
    dimensions: [
      { dimensionId: 'goal-alignment', name: '目标达成', linkedObjective: learningObjective, criteria: '回答覆盖结构化提示词六项要素并回应课程任务。', evidenceRequirement: '引用作答中对六项要素或任务目标的具体表述。', maxScore: 3 },
      { dimensionId: 'professional-quality', name: '专业准确', linkedObjective: learningObjective, criteria: '概念、步骤和边界符合课程材料，不使用绝对化错误结论。', evidenceRequirement: '定位作答中的概念、操作步骤或错误前提。', maxScore: 3 },
      { dimensionId: 'evidence-use', name: '证据使用', linkedObjective: learningObjective, criteria: '结论与作答中可观察内容对应，不用无据猜测代替证据。', evidenceRequirement: '每个评分判断必须引用一段作答原句。', maxScore: 3 },
      { dimensionId: 'actionable-expression', name: '反馈可执行性', linkedObjective: learningObjective, criteria: '反馈包含优点、具体问题和可在下一步完成的建议。', evidenceRequirement: '问题和建议均对应作答原句及一个明确动作。', maxScore: 3 },
    ],
  }
}

export const correctedA04NextStep = '将“形容词越多效果一定越好”改为“根据任务目标只调整一个关键变量”，并在修改后补写一条课程材料依据。'

export function createInitialE01Progress(): E01Progress {
  const learningObjective = '能按六项结构编写提示词，并用作答证据解释一次修改。'
  return {
    version: 1,
    route: 'overview',
    scenario: {
      courseName: '生成式视觉设计',
      learningObjective,
      gradingRequirement: '使用同一四维量规对五份作答评分，每条反馈须定位原文并给出可执行下一步。',
      assignmentPrompt: '说明结构化提示词的核心要素，并给出一个可用于文生图课堂任务的迭代方法。',
      sampleSource: '平台固定虚构匿名作答',
      anonymousSamplesConfirmed: true,
    },
    answers: createE01AnonymousAnswers(),
    rubric: createInitialE01Rubric(learningObjective),
    aiReviews: [],
    teacherReviews: [],
    correctionDraft: {
      answerId: 'A04',
      dimensionId: 'evidence-use',
      beforeScore: 3,
      afterScore: 2,
      beforeNextStep: e01InitialFeedback.A04.nextStep,
      afterNextStep: correctedA04NextStep,
      reason: 'A04 没有提供课程证据，“证据使用”不应得 3 分；原建议也没有可执行动作。',
    },
    corrections: [],
    peerReview: {
      recordId: '', templateVersion: '1.0', reviewerId: '', reviewerGroupId: '', targetAnswerId: 'A04', suggestion: '', authorTreatment: '', authorBasis: '', simulated: true,
      disclosure: '当前无多人后端；测试摘要由本地确定性规则生成，不代表真实组员提交。', submitted: false,
    },
    teacherConfirmation: {
      rubricAndObjectiveConfirmed: false,
      fiveFinalReviewsConfirmed: false,
      privacyConfirmed: false,
      aiNotFinalConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    attemptHistory: [],
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}
