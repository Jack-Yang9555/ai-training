import type { M08Input, M08KnowledgeCard, M08Question, M08WebVersion } from './domain'

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function renderHtml(input: M08Input, version: Pick<M08WebVersion, 'title' | 'objective' | 'knowledgeCards' | 'questions' | 'interactionLabel'>, correction = '') {
  const cards = version.knowledgeCards.map((card) => `<button class="card" type="button" aria-expanded="false"><strong>${escapeHtml(card.title)}</strong><span>${escapeHtml(card.content)}</span><small>依据：${escapeHtml(card.evidenceSource)}</small></button>`).join('')
  const questions = version.questions.map((question, questionIndex) => `<fieldset data-answer="${question.correctIndex}"><legend>${questionIndex + 1}. ${escapeHtml(question.prompt)}</legend>${question.options.map((option, optionIndex) => `<label><input type="radio" name="q${questionIndex}" value="${optionIndex}">${escapeHtml(option)}</label>`).join('')}<button type="button" class="check">检查答案</button><p class="feedback" aria-live="polite"></p><template>${escapeHtml(question.explanation)}</template></fieldset>`).join('')
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"><title>${escapeHtml(version.title)}</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;color:#172033;background:#fff}main{max-width:960px;margin:auto;padding:32px 20px}header{padding:28px;border:1px solid #dbe6ff;border-radius:18px;background:#f7faff}h1{font-size:30px;margin:8px 0}p{line-height:1.7}.path{color:#2f6bff;font-weight:700}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:24px 0}.card{min-height:120px;text-align:left;padding:18px;border:1px solid #e5eaf2;border-radius:14px;background:#fff;color:inherit}.card span,.card small{display:none;margin-top:10px;line-height:1.6}.card[aria-expanded=true] span,.card[aria-expanded=true] small{display:block}fieldset{margin:16px 0;padding:18px;border:1px solid #e5eaf2;border-radius:14px}label{display:block;padding:8px}.check{margin-top:10px;padding:10px 16px;border:0;border-radius:10px;background:#2f6bff;color:#fff}.feedback{font-weight:700}.correction{padding:14px;border-left:4px solid #0f9f8f;background:#e9fbf7}@media(max-width:640px){main{padding:18px 14px}h1{font-size:24px}.cards{grid-template-columns:1fr}}</style></head><body><main><header><small>${escapeHtml(input.pageType)} · ${escapeHtml(input.teachingUse)}</small><h1>${escapeHtml(version.title)}</h1><p>${escapeHtml(version.objective)}</p><p class="path">${escapeHtml(version.interactionLabel)}</p></header><section class="cards" aria-label="互动知识卡">${cards}</section>${correction ? `<p class="correction">学生测试后修正：${escapeHtml(correction)}</p>` : ''}<section aria-label="即时反馈测验"><h2>5 道即时反馈题</h2>${questions}</section></main><script>document.querySelectorAll('.card').forEach(function(card){card.addEventListener('click',function(){card.setAttribute('aria-expanded',card.getAttribute('aria-expanded')==='true'?'false':'true')})});document.querySelectorAll('fieldset').forEach(function(box){box.querySelector('.check').addEventListener('click',function(){var picked=box.querySelector('input:checked');var out=box.querySelector('.feedback');if(!picked){out.textContent='请先选择一个答案。';return}var ok=Number(picked.value)===Number(box.dataset.answer);out.textContent=(ok?'回答正确。':'回答错误。')+' '+box.querySelector('template').content.textContent})})</script></body></html>`
}

function baseCards(input: M08Input): M08KnowledgeCard[] {
  const evidence = input.sourceReferences.length ? input.sourceReferences.map((item) => item.sourceTaskId).join('、') + ' 当前成果' : 'M08 任务内已核验材料'
  return [
    { id: 'card-1', title: '先明确教学任务', content: '先说清要学生完成什么，再补充背景和输入材料。', evidenceSource: evidence },
    { id: 'card-2', title: '写出必要约束', content: '限制材料范围、教学时长、安全边界和不能出现的内容。', evidenceSource: evidence },
    { id: 'card-3', title: '规定输出格式', content: '明确页面、步骤、题型或作品应以什么结构交付。', evidenceSource: evidence },
    { id: 'card-4', title: '保留教师核验', content: '事实、答案、专业步骤和素材权利必须由教师最终确认。', evidenceSource: evidence },
  ]
}

function baseQuestions(input: M08Input): M08Question[] {
  const evidence = input.sourceReferences.length ? input.sourceReferences.map((item) => item.sourceTaskId).join('、') + ' 当前成果' : 'M08 任务内已核验材料'
  return [
    { id: 'q1', prompt: '结构化表达应首先明确什么？', options: ['教学任务', '装饰颜色', '模型品牌'], correctIndex: 0, explanation: '先明确可观察的教学任务，其他条件才有组织依据。', evidenceSource: evidence },
    { id: 'q2', prompt: '材料范围的主要作用是什么？', options: ['限制无依据扩写', '增加网页长度', '隐藏答案'], correctIndex: 0, explanation: '材料范围用于约束生成内容，避免引入无法核验的信息。', evidenceSource: evidence },
    { id: 'q3', prompt: '哪一项属于输出格式？', options: ['以知识卡和测验呈现', '学生基础较弱', '不得含个人数据'], correctIndex: 0, explanation: '知识卡和测验描述的是结果的组织结构。', evidenceSource: evidence },
    { id: 'q4', prompt: 'AI 生成答案后教师应怎样处理？', options: ['核对材料与解析', '直接发布', '只看排版'], correctIndex: 0, explanation: '答案、解析和专业内容必须回到已核验材料检查。', evidenceSource: evidence },
    { id: 'q5', prompt: '离线网页中不得包含什么？', options: ['模型密钥和真实个人数据', '学习目标', '即时反馈'], correctIndex: 0, explanation: '密钥、真实个人数据和未经授权资源都不得写入网页。', evidenceSource: evidence },
  ]
}

export class LocalM08WebRunner {
  async generate(input: M08Input): Promise<M08WebVersion> {
    await Promise.resolve()
    const seed = { title: `${input.courseTitle} · ${input.lessonTitle}`, objective: input.learningObjective, knowledgeCards: baseCards(input), questions: baseQuestions(input), interactionLabel: '先点击 4 张知识卡，再完成 5 道即时反馈题' }
    return { versionId: `m08-v0-${Date.now()}`, versionLabel: 'AI 原始 V0', generatedAt: new Date().toISOString(), ...seed, html: renderHtml(input, seed), aiDisclosure: '确定性本地网页生成器（Demo），未调用模型、后端或外部资源。' }
  }

  async iterate(input: M08Input, previous: M08WebVersion, instruction: string, round: 1 | 2): Promise<M08WebVersion> {
    await Promise.resolve()
    const cards = previous.knowledgeCards.map((card, index) => index === round - 1 ? { ...card, content: `${card.content} 教师第 ${round} 轮要求：${instruction.trim()}` } : card)
    const questions = previous.questions.map((question) => round === 2 ? { ...question, explanation: `${question.explanation} 如未答对，请返回“${cards[Math.min(Number(question.id.slice(1)) - 1, cards.length - 1)].title}”复查。` } : question)
    const next = { title: previous.title, objective: previous.objective, knowledgeCards: cards, questions, interactionLabel: round === 1 ? '学习路径：展开知识卡 → 完成测验 → 根据反馈复查' : previous.interactionLabel }
    return { versionId: `m08-v${round}-${Date.now()}`, versionLabel: round === 1 ? '教师修改 V1' : '教师修改 V2', generatedAt: new Date().toISOString(), ...next, html: renderHtml(input, next), aiDisclosure: previous.aiDisclosure }
  }
}

export function renderConfirmedM08Html(input: M08Input, version: M08WebVersion, correction: string) {
  return renderHtml(input, version, correction)
}

