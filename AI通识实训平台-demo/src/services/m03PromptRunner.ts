import { compileM03Prompt } from '../m03/data'
import type { M03OutputParagraph, M03PromptSnapshot, M03RunResult, M03Version } from '../m03/types'

export interface M03RunInput {
  participantId: string
  version: M03Version
  snapshot: M03PromptSnapshot
}

export interface M03PromptRunner {
  run(input: M03RunInput): Promise<M03RunResult>
}

function activityText(snapshot: M03PromptSnapshot): string {
  const scaffolding = /零基础|不了解|初次/u.test(snapshot.studentFoundation)
    ? '教师先示范拆解“主体—风格—细节”，学生再依照句式支架补全提示词。'
    : '学生先独立诊断模糊提示词，再互换作品并说明三个要素的控制作用。'
  const practiceMinutes = Math.max(8, snapshot.duration - 15)
  return `共 ${snapshot.duration} 分钟：5 分钟情境导入，10 分钟要素示范，${practiceMinutes} 分钟练习与互评，剩余时间核验总结。${scaffolding}`
}

function questions(snapshot: M03PromptSnapshot): Array<{ question: string; answer: string }> {
  const level = snapshot.difficulty === '入门'
    ? ['识别下列提示词中的主体、风格和细节。', '补全缺少的提示词要素。', '用三个要素写出一条完整提示词。']
    : snapshot.difficulty === '进阶'
      ? ['比较两条提示词并判断哪条控制更明确。', '诊断生成偏差并修改对应要素。', '根据教学情境重写提示词并解释选择。']
      : ['为同一主题设计两种提示词策略并预测差异。', '诊断失败结果，提出可验证的单变量改写。', '使用核验标准评价提示词并完成二次优化。']
  return Array.from({ length: snapshot.questionCount }, (_, index) => ({
    question: level[index % level.length],
    answer: snapshot.difficulty === '入门'
      ? '答案需明确标出主体、风格、细节，表达可以不同但三要素必须完整。'
      : '答案需给出判断、修改后的提示词及与课程三要素相对应的理由。',
  }))
}

function createParagraphs(snapshot: M03PromptSnapshot, version: M03Version): M03OutputParagraph[] {
  const items: M03OutputParagraph[] = [
    { id: `${version}-intro`, label: '课堂导入', kind: 'introduction', content: `从学生熟悉的拍照滤镜切入，引出“用文字控制 AI 画面”的任务。本课目标是：${snapshot.objective}。` },
    { id: `${version}-activity`, label: '活动步骤', kind: 'activity', content: activityText(snapshot) },
  ]
  questions(snapshot).forEach((item, index) => {
    items.push({ id: `${version}-q${index + 1}`, label: `练习题 ${index + 1}`, kind: 'question', content: item.question })
    items.push({ id: `${version}-a${index + 1}`, label: `答案解析 ${index + 1}`, kind: 'answer', content: item.answer })
  })
  items.push({ id: `${version}-verification`, label: '核验清单', kind: 'verification', content: `核对材料范围：${snapshot.materialScope}；核对题量 ${snapshot.questionCount}、难度“${snapshot.difficulty}”、时长 ${snapshot.duration} 分钟及输出格式“${snapshot.outputFormat}”。` })
  if (snapshot.outputFormat === 'Markdown 表格') return items.map((item) => ({ ...item, content: `| ${item.label} | ${item.content} |` }))
  if (snapshot.outputFormat === 'JSON 结构') return items.map((item) => ({ ...item, content: JSON.stringify({ section: item.label, content: item.content }, null, 2) }))
  return items
}

export const localM03PromptRunner: M03PromptRunner = {
  async run(input) {
    const snapshot = structuredClone(input.snapshot)
    await new Promise((resolve) => setTimeout(resolve, 320))
    return {
      runId: `m03-${input.participantId}-${input.version}-${Date.now()}`,
      version: input.version,
      generatedAt: new Date().toISOString(),
      snapshot,
      compiledPrompt: compileM03Prompt(snapshot),
      paragraphs: createParagraphs(snapshot, input.version),
    }
  },
}

// 正式接入时由业务服务端实现同一接口。浏览器端只提交结构化快照，模型密钥不得进入前端。
