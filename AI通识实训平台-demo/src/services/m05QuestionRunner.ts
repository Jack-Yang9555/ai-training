import type { M05InputSnapshot, M05Question, M05QuestionPackage } from '../m05/types'

export interface M05QuestionRunInput { participantId: string; input: M05InputSnapshot }
export interface M05QuestionRunner { run(input: M05QuestionRunInput): Promise<M05QuestionPackage> }

function option(id: string, text: string) { return { id, text } }

function buildQuestions(input: M05InputSnapshot): M05Question[] {
  const objectives = input.objectives
  const q = (id: string, type: M05Question['type'], stem: string, answer: string, explanation: string, objectiveIds: string[], difficulty: M05Question['difficulty'], options: M05Question['options'] = [], scoringPoints: M05Question['scoringPoints'] = []): M05Question => ({
    id, type, stem, options, answer, explanation, materialEvidence: `${input.materialName}：${input.materialContent}`, objectiveIds, difficulty, scoringPoints,
  })
  return [
    q('q1', 'single', '文生图提示词中，决定“画什么”的要素是？', 'A', '课程材料明确说明主体决定画什么。', [objectives[0].id], '基础', [option('A', '主体'), option('B', '风格'), option('C', '细节'), option('D', '文件格式')]),
    q('q2', 'single', '要表达“油画质感”，主要应写入哪个要素？', 'B', '油画质感描述画面怎样呈现，属于风格。', [objectives[0].id], '基础', [option('A', '主体'), option('B', '风格'), option('C', '细节'), option('D', '题量')]),
    q('q3', 'single', '下列哪条提示词同时包含主体、风格和细节？', 'C', 'C 同时说明海报主体、扁平插画风格和蓝紫色光点细节。', [objectives[0].id, objectives[1].id], '进阶', [option('A', '一张海报'), option('B', '扁平插画风格'), option('C', '校园科技节海报，扁平插画风格，蓝紫色光点细节'), option('D', '请生成得更好看')]),
    q('q4', 'multiple', '编写结构完整的文生图提示词时，应优先明确哪些要素？', 'A、B、C', '课程材料规定主体、风格、细节是三个基本要素。', [objectives[0].id, objectives[1].id], '基础', [option('A', '主体'), option('B', '风格'), option('C', '细节'), option('D', '模型内部参数')]),
    q('q5', 'judgment', '“三要素齐全可以减少生成结果偏离”符合课程材料。', '正确', '该表述与课程材料原文一致。', [objectives[0].id], '基础', [option('正确', '正确'), option('错误', '错误')]),
    q('q6', 'scenario', '学生只写“校园海报”，结果画面风格不统一。请指出缺失要素并写出一条修改建议。', '缺少风格和细节；例如补充“扁平插画风格、蓝紫色光点细节”。', '答案依据三要素结构，针对生成偏差补齐风格和细节。', [objectives[1].id, objectives[2].id], '进阶'),
    q('q7', 'scenario', '提示词写有“油画风格、暖色光影”，但未说明画面主体。应如何修正？', '补充明确主体，例如“校园图书馆”，保留已有风格和细节。', '材料说明主体决定画什么，缺少主体会造成内容方向不明确。', [objectives[0].id, objectives[2].id], '进阶'),
    q('q8', 'comprehensive', '为校园文化活动编写一条包含主体、风格、细节的提示词，并说明一次基于生成偏差的修改。', '示例：校园科技节海报，扁平插画风格，蓝紫色光点细节；若主体不突出，则把“校园科技节”调整为画面中央主标题。', '综合检查三要素结构、生成偏差判断和可解释修改。', [objectives[0].id, objectives[1].id, objectives[2].id], '综合', [], [
      { id: 'sp1', criterion: '主体、风格、细节三要素齐全', points: 3 }, { id: 'sp2', criterion: '内容符合校园文化活动情境', points: 2 },
      { id: 'sp3', criterion: '指出一处具体生成偏差', points: 2 }, { id: 'sp4', criterion: '给出对应修改并说明理由', points: 3 },
    ]),
  ]
}

export const localM05QuestionRunner: M05QuestionRunner = {
  async run({ participantId, input }) {
    await new Promise((resolve) => setTimeout(resolve, 320))
    return { packageId: `m05-${participantId}-${Date.now()}`, generatedAt: new Date().toISOString(), input: structuredClone(input), questions: buildQuestions(input) }
  },
}

// 正式接入由业务服务端实现同一接口；浏览器端不保存模型密钥，也不直连 Dify 或模型供应商。
