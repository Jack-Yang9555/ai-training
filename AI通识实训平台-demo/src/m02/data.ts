import type {
  M02ComplianceDimension,
  M02ComplianceValue,
  M02ModelId,
  M02ModelResult,
  M02RatingDimension,
} from './types'

export const m02ModelIds: M02ModelId[] = ['A', 'B']

export const m02CourseMaterial = {
  course: '生成式视觉设计——文生图创意实践',
  lesson: '第 2 课：提示词基础',
  audience: '高职二年级，零基础',
  duration: '45 分钟',
  objective: '理解提示词的基本结构，能用“主体 + 风格 + 细节”写出第一条提示词',
  scope: '提示词三要素（主体、风格、细节）、3 个示例图、1 个反例图',
  content: '提示词是用自然语言告诉 AI 想生成什么画面的一段话。主体决定画什么，风格决定怎么画，细节决定画成什么样。三要素齐全，才能减少 AI 自由发挥造成的结果偏离。',
}

export const m02LockedPrompt = `你是一位高职教师，正在为“生成式视觉设计——文生图创意实践”的“提示词基础”课备课。

请根据锁定课程材料生成：
1. 课堂导入语 1 段（100—200 字，联系学生日常经验）；
2. 入门级练习题 3 道，每道均含题目、答案和解析；
3. 内容限定在“主体 + 风格 + 细节”范围内；
4. 三道题的题型应有变化，不要完全相同。`

function paragraph(id: string, label: string, content: string, kind: 'introduction' | 'question' | 'answer' | 'analysis') {
  return { id, label, content, kind }
}

export const m02ModelResults: Record<M02ModelId, M02ModelResult> = {
  A: {
    blindId: 'A', status: 'succeeded', paragraphs: [
      paragraph('A-intro', '课堂导入', '同学们，你们平时拍照会加滤镜、调色调吗？其实你们已经在用“风格”控制画面了。今天我们要用文字让 AI 画出想要的图，只要把主体、风格和细节说清楚，就能从“随便画”变成“精准画”。', 'introduction'),
      paragraph('A-q1', '练习题 1 · 题目', '请用“主体 + 风格 + 细节”写出一条提示词，生成一张赛博朋克风格的城市图。', 'question'),
      paragraph('A-a1', '练习题 1 · 答案', '一座未来城市，赛博朋克风格，霓虹灯闪烁的雨夜。', 'answer'),
      paragraph('A-x1', '练习题 1 · 解析', '主体是城市，风格是赛博朋克，细节是霓虹灯与雨夜，三要素齐全。', 'analysis'),
      paragraph('A-q2', '练习题 2 · 题目', '以下提示词缺少哪个要素：“一只猫，水彩风格”？A. 主体 B. 风格 C. 细节。', 'question'),
      paragraph('A-a2', '练习题 2 · 答案', '答案 C：细节。', 'answer'),
      paragraph('A-x2', '练习题 2 · 解析', '已有主体“猫”和风格“水彩”，但没有光线、姿态或背景等具体细节。', 'analysis'),
      paragraph('A-q3', '练习题 3 · 题目', '请将模糊提示词“一朵花”修改为三要素齐全的提示词。', 'question'),
      paragraph('A-a3', '练习题 3 · 答案', '一朵向日葵，油画风格，花瓣上有露珠。', 'answer'),
      paragraph('A-x3', '练习题 3 · 解析', '修改后补充了油画风格和花瓣露珠的细节，画面意图更清楚。', 'analysis'),
    ],
  },
  B: {
    blindId: 'B', status: 'succeeded', paragraphs: [
      paragraph('B-intro', '课堂导入', 'AI 绘画的历史可以追溯到 2014 年生成对抗网络的提出。从 GAN 到 Diffusion，再到 Stable Diffusion 和 Midjourney，今天我们将从技术原理理解提示词如何影响生成结果。', 'introduction'),
      paragraph('B-q1', '练习题 1 · 题目', '请写出包含主体、风格、细节、构图和色调五个要素的提示词。', 'question'),
      paragraph('B-a1', '练习题 1 · 答案', '一座未来城市，赛博朋克风格，俯视全景，霓虹灯，冷色调。', 'answer'),
      paragraph('B-x1', '练习题 1 · 解析', '五要素能更精确地控制画面。', 'analysis'),
      paragraph('B-q2', '练习题 2 · 题目', '请解释 CLIP 模型的文本—图像对比学习机制，并说明它如何影响提示词语义理解。', 'question'),
      paragraph('B-a2', '练习题 2 · 答案', 'CLIP 通过对比学习将文本和图像映射到同一向量空间。', 'answer'),
      paragraph('B-x2', '练习题 2 · 解析', '理解该机制有助于使用模型能够识别的语义表达。', 'analysis'),
      paragraph('B-q3', '练习题 3 · 题目', '请对比 Stable Diffusion 和 Midjourney 的底层架构差异及各自适用的提示词风格。', 'question'),
      paragraph('B-a3', '练习题 3 · 答案', '两类模型的训练数据和生成架构不同，对提示词的理解会有差异。', 'answer'),
      paragraph('B-x3', '练习题 3 · 解析', '选择模型时应考虑提示词风格与模型的匹配度。', 'analysis'),
    ],
  },
}

export const m02ComplianceLabels: Record<M02ComplianceDimension, string> = {
  questionCount: '题量', difficulty: '难度', format: '格式', materialScope: '材料范围',
}

export const m02ComplianceOptions: Record<M02ComplianceDimension, M02ComplianceValue[]> = {
  questionCount: ['符合', '多出', '缺少'],
  difficulty: ['符合', '偏难', '偏易'],
  format: ['完整', '部分缺失', '缺少'],
  materialScope: ['符合', '超出范围'],
}

export const m02ComplianceReference: Record<M02ModelId, Record<M02ComplianceDimension, M02ComplianceValue>> = {
  A: { questionCount: '符合', difficulty: '符合', format: '完整', materialScope: '符合' },
  B: { questionCount: '符合', difficulty: '偏难', format: '完整', materialScope: '超出范围' },
}

export const m02RatingLabels: Record<M02RatingDimension, string> = {
  accuracy: '准确性', instructionFollowing: '任务遵循', teachingFit: '教学适用', clarity: '表达清楚', safety: '安全边界',
}

export const m02RatingGuidance: Record<M02RatingDimension, string> = {
  accuracy: '答案、解析和专业表述是否正确，是否存在事实或专业错误。',
  instructionFollowing: '是否遵守题量、难度、格式和材料范围四项任务约束。',
  teachingFit: '是否适合当前高职零基础课堂，教师需要修改多少才能使用。',
  clarity: '语言是否清晰、连贯，学生能否直接理解题目、答案和解析。',
  safety: '是否包含敏感信息、不当内容、越界建议或未经核验的风险表述。',
}

export const m02RatingScale = [
  { score: 1, label: '明显不符合', hint: '问题严重，不能直接使用' },
  { score: 2, label: '较不符合', hint: '存在较多问题，需要大幅修改' },
  { score: 3, label: '基本符合', hint: '基本可用，但仍需明显修改' },
  { score: 4, label: '比较符合', hint: '整体良好，只需少量修改' },
  { score: 5, label: '完全符合', hint: '表现充分，基本可直接使用' },
] as const

export const m02RatingReference: Record<M02ModelId, Record<M02RatingDimension, number>> = {
  A: { accuracy: 5, instructionFollowing: 5, teachingFit: 5, clarity: 5, safety: 5 },
  B: { accuracy: 4, instructionFollowing: 2, teachingFit: 2, clarity: 3, safety: 5 },
}

export const m02RealModelNames: Record<M02ModelId, string> = {
  A: '智谱清言 GLM-4', B: '某开源模型',
}
