import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate))
if (!executablePath) throw new Error('没有找到可用于浏览器验收的 Chrome 或 Edge。')

const baseUrl = process.env.M01_DEMO_URL ?? 'http://127.0.0.1:4178'
const outputDir = path.resolve('.artifacts/playwright')
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(error.message))

async function overflow() {
  return page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
}

function taskCard(taskId) {
  return page.locator('.training-task-card').filter({ has: page.locator('.task-code').getByText(taskId, { exact: true }) })
}

function archiveCard(taskId) {
  return page.locator('.task-archive-card').filter({ has: page.locator(':scope > span').getByText(taskId, { exact: true }) })
}

await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('heading', { name: '从可信使用到 AI 教学综合应用' }).waitFor()
const passRuleBox = await page.getByRole('heading', { name: '达标规则' }).boundingBox()
const trainingPathBox = await page.getByRole('heading', { name: '当前实训安排' }).boundingBox()
if (!passRuleBox || !trainingPathBox || passRuleBox.y >= trainingPathBox.y) throw new Error('达标规则没有前移到实训安排之前。')
if (await page.getByText('十类个人成果统一归档').count() > 0) throw new Error('实训总览仍显示不属于安排的成果归档卡片。')
if (await page.getByRole('button', { name: '管理培训人员' }).count() > 0) throw new Error('当前实训安排下方仍显示人员管理卡片。')
const teacherInfoButton = page.getByRole('button', { name: '查看教师与小组信息' })
const participantManagementButton = page.getByRole('button', { name: '培训人员与分组' })
const teacherInfoBox = await teacherInfoButton.boundingBox()
const participantManagementBox = await participantManagementButton.boundingBox()
if (!teacherInfoBox || !participantManagementBox || participantManagementBox.x <= teacherInfoBox.x) throw new Error('人员分组入口没有放在教师信息之后。')
await teacherInfoButton.click()
const teacherGroupPanel = page.getByRole('region', { name: '教师与所在小组信息' })
await teacherGroupPanel.getByText('第 3 组成员').waitFor()
for (const name of ['张老师', '李老师', '王老师', '陈老师', '赵老师', '林老师']) await teacherGroupPanel.getByRole('listitem', { name: `组员：${name}` }).waitFor()
await teacherInfoButton.click()
const mapOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'day1-task-map-1440.png'), fullPage: true })

await page.getByRole('button', { name: '任务清单', exact: true }).click()
const initialM02Card = taskCard('M02')
const initialM03Card = taskCard('M03')
const initialM04Card = taskCard('M04')
const initialM05Card = taskCard('M05')
const initialG01Card = taskCard('G01')
for (const card of [initialM02Card, initialM03Card, initialM04Card, initialM05Card, initialG01Card]) {
  await card.getByText('可开始', { exact: true }).waitFor()
  if (await card.getByText(/前置任务待完成/).count() > 0) throw new Error('全新状态仍存在跨任务完成依赖。')
}
await initialG01Card.getByRole('button', { name: '开始验收' }).click()
await page.getByText(/G01 可独立开始/).waitFor()
await page.getByText('当前教师 · 任务内演示成果').waitFor()
if (!await page.getByRole('button', { name: /建立成果目录/ }).isEnabled()) throw new Error('M01—M05 未完成时 G01 不能独立开始。')
if (await page.getByText('当前为无多人后端的模拟组员成果，不代表真实提交。').count() === 0) throw new Error('G01 未展示无多人后端模拟边界。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M04').getByRole('button', { name: '开始任务' }).click()
await page.getByText(/M03 仅为推荐复用来源/).waitFor()
if (!await page.getByRole('button', { name: /确认教案输入/ }).isEnabled()) throw new Error('M03 未通过时 M04 不能独立开始。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await page.getByRole('button', { name: /DAY 2/ }).click()
const initialM06Card = taskCard('M06')
const initialM07Card = taskCard('M07')
const initialM08Card = taskCard('M08')
const initialG02Card = taskCard('G02')
for (const card of [initialM06Card, initialM07Card, initialM08Card, initialG02Card]) {
  await card.getByText('可开始', { exact: true }).waitFor()
  if (await card.getByText(/前置任务待完成/).count() > 0) throw new Error('全新状态 M06/M07/M08/G02 仍存在跨任务完成依赖。')
}
await taskCard('M06').getByRole('button', { name: '开始任务' }).click()
await page.getByText(/M04 仅为推荐复用来源/).waitFor()
if (!await page.getByRole('button', { name: /确认制作输入/ }).isEnabled()) throw new Error('上游未完成时 M06 不能独立开始。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M07').getByRole('button', { name: '开始任务' }).click()
await page.getByText(/M06 未完成不阻塞 M07/).waitFor()
if (!await page.getByRole('button', { name: /确认分析输入/ }).isEnabled()) throw new Error('M06 未完成时 M07 不能独立开始。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M08').getByRole('button', { name: '开始任务' }).click()
await page.getByText(/未完成上游任务不会阻塞 M08/).waitFor()
if (!await page.getByRole('button', { name: /确认网页输入/ }).isEnabled()) throw new Error('M04/M06 未完成时 M08 不能独立开始。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('G02').getByRole('button', { name: /开始验收/ }).click()
await page.getByText(/缺项仅在 G02 内用明确标注的演示成果补齐/).waitFor()
if (!await page.getByRole('button', { name: /核对小组成果目录/ }).isEnabled()) throw new Error('M06/M08 未完成时 G02 不能独立开始。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await page.getByRole('button', { name: /DAY 1/ }).click()
const independentTaskListOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'independent-task-list-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const independentTaskListCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'independent-task-list-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await initialM02Card.getByRole('button', { name: '开始任务' }).click()
if (!await page.getByRole('button', { name: /进入多模型运行台/ }).isEnabled()) throw new Error('M01 未完成时 M02 仍无法开始。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M03').getByRole('button', { name: '开始任务' }).click()
if (!await page.getByRole('button', { name: /进入 AI 对话练习/ }).isEnabled()) throw new Error('M01、M02 未完成时 M03 仍无法开始。')
await page.getByLabel('返回任务清单', { exact: true }).click()
await page.getByRole('button', { name: '实训总览', exact: true }).click()

await participantManagementButton.click()
await page.getByRole('button', { name: '载入示例名单' }).click()
await page.getByText('格式校验通过，可确认覆盖当前名单。').waitFor()
await page.getByRole('button', { name: '确认导入 10 人' }).click()
const participantsOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'participants-import-1440.png'), fullPage: true })

await page.getByRole('button', { name: '任务清单', exact: true }).click()
await page.getByRole('button', { name: /选修任务库/ }).click()
await page.getByRole('button', { name: /课程改进 · E03 \+ E04/ }).click()
await page.getByText('两天选修任务已满足最低要求').waitFor()
await page.locator('.elective-card').filter({ hasText: 'E05' }).getByRole('button', { name: '加入第二天' }).click()
await page.getByText('第二天：E03、E05；第三天：E04。所有选择已同步到对应 DAY 和成果中心。').waitFor()
const electiveOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'elective-multiselect-1440.png'), fullPage: true })
await page.getByRole('button', { name: /DAY 2/ }).click()
await page.getByRole('heading', { name: '第二天已选 2 项任务' }).waitFor()
await page.getByRole('button', { name: /DAY 3/ }).click()
await page.getByRole('heading', { name: '第三天已选 1 项任务' }).waitFor()
await page.getByRole('button', { name: '调整第三天选修' }).click()
await page.getByRole('button', { name: '从第三天移除 E04' }).click()
await page.getByRole('alert').getByText('第三天尚未选择任务').waitFor()
await page.getByRole('button', { name: '实训总览', exact: true }).click()

await page.getByRole('button', { name: /开始第一个任务/ }).click()
await page.getByRole('button', { name: /开始 AI 提问/ }).click()
await page.getByRole('button', { name: /生成全部演示回答/ }).click()
await page.getByRole('button', { name: /进入标注核验/ }).click()

for (const id of ['A', 'B', 'C', 'D']) {
  await page.getByRole('tab', { name: new RegExp(`^${id}`) }).click()
  await page.getByRole('button', { name: /载入参考标注/ }).click()
}
await page.getByRole('button', { name: /进入教师修正/ }).click()
await page.getByRole('button', { name: /填入参考修正/ }).click()
await page.getByRole('button', { name: /进入小组复核/ }).click()

await page.getByLabel('本次承担角色').selectOption({ label: '核验员' })
await page.getByLabel('被复核成员').selectOption({ index: 1 })
await page.getByLabel('关联修正成果').selectOption({ index: 1 })
await page.getByLabel('依据是否准确').selectOption({ label: '准确' })
await page.getByLabel('修正是否合理').selectOption({ label: '合理' })
await page.getByLabel('复核建议').fill('建议补充文件检索日期，并保留官网检索路径。')
await page.getByLabel('第8项核验项').fill('个人隐私信息')
await page.getByLabel('第8项核验要点').fill('检查是否包含姓名、学号等个人标识')
await page.getByLabel('第8项典型幻觉').fill('编造或展示可识别学生的学号')
await page.getByLabel('第8项应对方式').fill('删除个人标识并使用匿名汇总数据')
await page.getByRole('button', { name: '提交复核' }).click()
await page.getByRole('button', { name: /查看评分与成果/ }).click()
await page.getByRole('heading', { name: 'M01 任务已通过' }).waitFor()
const scoreText = await page.locator('.result-score').innerText()
const resultOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm01-result-1440.png'), fullPage: true })

await page.getByLabel('返回任务清单', { exact: true }).click()
const m02Card = taskCard('M02')
await m02Card.getByRole('button', { name: '开始任务' }).click()
await page.getByRole('heading', { name: '多模型教学结果对比与选择' }).waitFor()
await page.getByRole('button', { name: /进入多模型运行台/ }).click()
await page.getByRole('heading', { name: '多模型调试与预览' }).waitFor()
if (await page.getByText('变量', { exact: true }).count() > 0 || await page.getByText('知识库', { exact: true }).count() > 0) throw new Error('M02 工作台出现了变量或知识库等超纲入口。')
if (await page.getByText('智谱清言 GLM-4', { exact: true }).count() > 0) throw new Error('盲评前泄露了真实模型名称。')
await page.getByRole('button', { name: /同时运行 2 个模型/ }).click()
await page.getByText('2 / 2 运行成功').waitFor()
const m02RunOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm02-workbench-1440.png'), fullPage: true })

await page.setViewportSize({ width: 1024, height: 768 })
const m02CompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm02-workbench-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })

await page.getByRole('button', { name: /进入任务遵循检查/ }).click()
const complianceAnswers = [
  ['符合', '符合', '完整', '符合'],
  ['符合', '偏难', '完整', '超出范围'],
]
const complianceCards = page.locator('.m02-evaluation-card')
for (let modelIndex = 0; modelIndex < complianceAnswers.length; modelIndex += 1) {
  const fieldsets = complianceCards.nth(modelIndex).locator('fieldset')
  for (let dimensionIndex = 0; dimensionIndex < complianceAnswers[modelIndex].length; dimensionIndex += 1) {
    await fieldsets.nth(dimensionIndex).getByLabel(complianceAnswers[modelIndex][dimensionIndex], { exact: true }).check()
  }
}
await page.getByText('8 项任务遵循检查已经完成。').waitFor()
await page.getByRole('button', { name: /进入五维盲评/ }).click()
await page.getByRole('heading', { name: '逐项完成 10 项五维盲评' }).waitFor()
const m02RatingOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm02-guided-rating-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m02RatingCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm02-guided-rating-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })

const ratingScores = [[5, 5, 5, 5, 5], [4, 2, 2, 3, 5]]
for (let modelIndex = 0; modelIndex < ratingScores.length; modelIndex += 1) {
  for (let ratingIndex = 0; ratingIndex < ratingScores[modelIndex].length; ratingIndex += 1) {
    const card = page.locator('.m02-guided-rating-card')
    await card.locator('.m02-labeled-rating-scale button').nth(ratingScores[modelIndex][ratingIndex] - 1).click()
    await page.locator('.m02-rating-output.active .m02-rating-output-body button').first().click()
    await card.locator('textarea').fill(`引用该模型具体输出段落，说明第 ${ratingIndex + 1} 个评价维度的判断依据。`)
    if (!(modelIndex === ratingScores.length - 1 && ratingIndex === ratingScores[modelIndex].length - 1)) {
      await card.getByRole('button', { name: /保存并进入下一项/ }).click()
    }
  }
}
await page.getByText('10 项评分和输出证据已经完整填写，可以提交盲评。').waitFor()
page.once('dialog', (dialog) => dialog.accept())
await page.getByRole('button', { name: /提交盲评并揭晓/ }).click()
await page.getByRole('heading', { name: '模型已揭晓，继续选择与修正' }).waitFor()
await page.locator('.m02-reveal-strip').getByText(/智谱清言 GLM-4/).waitFor()
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('heading', { name: '模型已揭晓，继续选择与修正' }).waitFor()
await page.getByRole('region', { name: '选择与修正' }).waitFor()

const disabledSelectionFields = await page.locator('.m02-selection-section select:disabled').count()
if (disabledSelectionFields !== 2) throw new Error(`选择模型前应有 2 个修正下拉框禁用，实际为 ${disabledSelectionFields}`)
await page.getByRole('radio', { name: /模型 A.*点击选择/ }).click()
const enabledSelectionFields = await page.locator('.m02-selection-section select:enabled').count()
if (enabledSelectionFields !== 2) throw new Error(`选择模型后应有 2 个修正下拉框开放，实际为 ${enabledSelectionFields}`)
const reusedEvidence = page.locator('.m02-reused-evidence-grid > button')
if (await reusedEvidence.count() !== 5) throw new Error('未展示完整的 5 条既有盲评证据')
await reusedEvidence.nth(1).click()
await reusedEvidence.nth(2).click()
await page.locator('.m02-compare-choices > article').filter({ hasText: '模型 B' }).getByText('当前对比对象').waitFor()
await page.locator('.m02-decision-summary textarea').fill('模型 A 的任务遵循和教学适用证据更充分，比模型 B 更适合本次零基础课堂。')
const correctionSection = page.locator('.m02-selection-section').filter({ hasText: '修正所选结果中的一处内容' })
await correctionSection.locator('select').nth(0).selectOption('A-a3')
await correctionSection.locator('select').nth(1).selectOption({ label: '解析不清' })
await correctionSection.locator('textarea').nth(0).fill('一朵向日葵，油画风格，花瓣上有露珠；开放题答案可以多样。')
await correctionSection.locator('textarea').nth(1).fill('原解析没有说明开放题答案不唯一，需要避免学生把示例当成唯一答案。')
await page.getByText('模型选择、盲评证据复用、综合结论和人工修改均已完整记录。').waitFor()
const m02SelectionOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm02-selection-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m02SelectionCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm02-selection-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByRole('button', { name: /进入小组共评/ }).click()

await page.getByLabel('本次承担角色').selectOption({ label: '核验员' })
await page.getByLabel('被共评成员').selectOption({ index: 1 })
await page.getByLabel('关联评分成果').selectOption({ index: 1 })
await page.getByLabel('评分是否与输出一致').selectOption({ label: '一致' })
await page.getByLabel('评分理由证据是否充分').selectOption({ label: '充分' })
await page.getByLabel('模型选择是否合理').selectOption({ label: '合理' })
await page.getByLabel('评分差异最大的维度').first().selectOption('clarity')
await page.getByLabel('差异原因分析').fill('对课堂导入语言清晰度的评价标准略有不同。')
await page.getByLabel('可执行的补充建议').fill('建议补充题型递进证据并说明适用对象。')
await page.getByLabel('本组选出的模型').selectOption('A')
await page.getByLabel('评分差异最大的维度').last().selectOption('clarity')
await page.getByLabel('本组选择理由').fill('材料范围、题型递进和表达均适合当前零基础课堂。')
await page.getByLabel('评分差异说明').fill('组员对课堂导入语言清晰度的评分相差一分。')
await page.getByLabel('人工修改共识').fill('需要说明开放题答案不唯一，并保留教师人工审校。')
await page.getByRole('button', { name: '提交共评' }).click()
await page.getByRole('button', { name: /查看评分与成果/ }).click()
await page.getByRole('heading', { name: 'M02 任务已通过' }).waitFor()
const m02ScoreText = await page.locator('.result-score').innerText()
const m02ResultOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm02-result-1440.png'), fullPage: true })

await page.getByLabel('返回任务清单', { exact: true }).click()
const m03Card = taskCard('M03')
await m03Card.getByRole('button', { name: '开始任务' }).click()
await page.getByRole('heading', { name: '结构化提示词设计与迭代' }).waitFor()
await page.getByRole('button', { name: /进入 AI 对话练习/ }).click()
await page.getByRole('heading', { name: '在仿真 AI 对话中完成你的提示词' }).waitFor()
if (await page.locator('.m03-ai-example-prompt section').count() !== 6) throw new Error('M03 教师消息未展示六段示例提示词。')
if (await page.locator('.m03-ai-detection-list').count() !== 0) throw new Error('M03 右侧仍展示占空间的六项检查卡片。')
if (await page.locator('.m03-ai-compose-panel').count() !== 1) throw new Error('M03 消息输入框未移动到右侧操作栏。')
if (await page.locator('.m03-ai-draft-field').count() !== 0) throw new Error('M03 右侧仍存在替教师预填的仿写输入框。')
const m03MessageInput = page.getByLabel('我的提示词消息')
if (await m03MessageInput.inputValue() !== '') throw new Error('M03 教师消息输入框初始状态不是空白。')
const m03TeacherMessage = [
  '01 角色 / 任务',
  '角色：高职人工智能课程助教；任务：生成课堂活动练习包。',
  '02 背景',
  '课程：生成式视觉设计；课次：提示词基础；使用环节：课堂导入与练习；授课对象：高职二年级学生；学生基础：零基础；教学目标：理解主体、风格、细节三个要素。',
  '03 输入',
  '材料名称：提示词基础讲义；材料正文：主体决定画什么，风格决定怎么画，细节决定画成什么样；允许使用范围：仅限讲义中的三个要素。',
  '04 约束',
  '课堂时长：45 分钟；题量：3 道；难度：入门。',
  '05 输出格式',
  '呈现格式：分节文本；必须包含：课堂导入、活动步骤、练习题、答案解析、核验清单。',
  '06',
  '质量标准',
  '质量标准：专业内容只能依据输入材料；活动对应教学目标；题目与答案逐一匹配；不得编造材料外知识。',
].join('\n')
await m03MessageInput.fill(m03TeacherMessage)
await page.getByText('六项结构 6/6').waitFor()
await page.getByLabel('材料来源与权限已确认').check()
await page.getByLabel('未包含真实学生敏感信息').check()
await page.getByText('六项名称和内容均已识别，发送前确认已完成，可以发送。').waitFor()
const m03DesignOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm03-dialogue-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m03DesignCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm03-dialogue-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByRole('button', { name: '发送我的提示词', exact: true }).click()
await page.getByRole('button', { name: '生成第一版课堂练习包', exact: true }).click()
await page.getByText(/第一版提示词和课堂练习包已保存在本地/).waitFor()
await page.getByRole('button', { name: /调整一个条件生成第二版/ }).click()
await page.getByRole('button', { name: /题量.*改变生成练习题的数量/ }).click()
const m03VariableCards = page.locator('.m03-variable-version-card')
if (await m03VariableCards.count() !== 2) throw new Error('M03 单变量编辑区未显示 V1/V2 两张对照卡。')
const [m03V1Box, m03V2Box] = await Promise.all([m03VariableCards.nth(0).boundingBox(), m03VariableCards.nth(1).boundingBox()])
if (!m03V1Box || !m03V2Box || Math.abs(m03V1Box.y - m03V2Box.y) > 1 || Math.abs(m03V1Box.width - m03V2Box.width) > 1 || Math.abs(m03V1Box.height - m03V2Box.height) > 1) throw new Error('M03 V1/V2 对照卡未顶部对齐或尺寸不一致。')
await page.getByLabel('修改后的题量').fill('4')
await page.getByText('系统确认只有一个变量发生变化，可以生成 V2。').waitFor()
await page.screenshot({ path: path.join(outputDir, 'm03-iteration-1440.png'), fullPage: true })
await page.getByRole('button', { name: '生成 V2', exact: true }).click()
await page.getByText(/V2 与 V1 已关联到同一次迭代/).waitFor()
await page.getByRole('button', { name: /比较并核验两版/ }).click()
await page.getByLabel('结果变化说明（必填）').fill('题量从三道增加到四道，结果新增一道练习与答案解析。')
await page.getByLabel('教学适用性结论（必填）').fill('V1 适合紧凑课堂，V2 适合有更多练习时间的课堂。')
const verificationCards = page.locator('.m03-verification-card')
await verificationCards.nth(0).getByLabel('关联输出段落').selectOption('v1-q1')
await verificationCards.nth(0).getByLabel('课程材料依据（必填）').fill('讲义明确包含主体、风格、细节三要素。')
await verificationCards.nth(0).getByLabel('材料范围').selectOption({ label: '一致' })
await verificationCards.nth(0).getByLabel('教学目标一致性').selectOption({ label: '一致' })
await verificationCards.nth(0).getByLabel('核验结论（必填）').fill('题目与材料范围和识别三要素目标一致。')
await verificationCards.nth(1).getByLabel('关联输出段落').selectOption('v2-q4')
await verificationCards.nth(1).getByLabel('课程材料依据（必填）').fill('讲义三要素可用于新增的第四道迁移练习。')
await verificationCards.nth(1).getByLabel('材料范围').selectOption({ label: '一致' })
await verificationCards.nth(1).getByLabel('教学目标一致性').selectOption({ label: '一致' })
await verificationCards.nth(1).getByLabel('核验结论（必填）').fill('新增题仍在材料范围内并服务于独立编写目标。')
await page.getByText('两版变化说明和专业证据完整，且均与材料范围及教学目标一致。').waitFor()
const m03CompareOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm03-compare-1440.png'), fullPage: true })
await page.getByRole('button', { name: /进入小组互评/ }).click()
await page.getByLabel(/本次承担角色/).selectOption({ label: '核验员' })
await page.getByLabel('被互评成员').selectOption({ index: 1 })
await page.getByLabel('关联版本成果').selectOption({ index: 1 })
await page.getByLabel('输入范围是否明确').selectOption({ label: '明确' })
await page.getByLabel('输出格式是否明确').selectOption({ label: '明确' })
await page.getByLabel('质量标准是否明确').selectOption({ label: '部分明确' })
await page.getByLabel('可执行的互评建议（必填）').fill('建议补充每道题与课程目标的对应关系。')
await page.getByRole('button', { name: '提交互评' }).click()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交验收' }).click()
await page.getByRole('heading', { name: 'M03 任务已通过' }).waitFor()
const m03ScoreText = await page.locator('.result-score').innerText()
const m03ResultOverflow = await overflow()
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto'
  document.body.style.scrollBehavior = 'auto'
  window.scrollTo(0, 0)
})
await page.waitForFunction(() => window.scrollY === 0)
await page.screenshot({ path: path.join(outputDir, 'm03-result-1440.png'), fullPage: true })
await page.getByLabel('返回任务清单', { exact: true }).click()
const m04Card = taskCard('M04')
await m04Card.getByText('可开始', { exact: true }).waitFor()
await m04Card.getByRole('button', { name: '开始任务' }).click()
await page.getByRole('heading', { name: 'AI 辅助教案编制' }).waitFor()
await page.getByRole('button', { name: /确认教案输入/ }).click()
await page.getByRole('button', { name: /读取 M03 当前成果/ }).click()
await page.waitForTimeout(300)
const m04InputValidationText = await page.locator('.validation').innerText()
if (!m04InputValidationText.includes('课程输入、材料和课堂限制完整，可以生成教案草稿。')) throw new Error(`M04 输入复用后仍未通过：${m04InputValidationText}`)
await page.getByRole('button', { name: /生成 AI 教案草稿/ }).click()
await page.getByRole('button', { name: '生成 AI 教案草稿', exact: true }).click()
await page.getByText(/活动时间合计 45 分钟/).waitFor()
await page.getByRole('button', { name: /开始逐项人工审校/ }).click()

for (const checkbox of await page.locator('.m04-audit-checks').first().locator('input[type="checkbox"]').all()) await checkbox.check()
for (const select of await page.locator('.m04-activity-audit select').all()) await select.selectOption({ label: '可实施' })
for (const checkbox of await page.locator('.m04-limit-checks input[type="checkbox"]').all()) await checkbox.check()
const m04CorrectionCards = page.locator('.m04-correction-card')
for (let index = 0; index < 3; index += 1) {
  const card = m04CorrectionCards.nth(index)
  await card.locator('select').selectOption({ index: 1 })
  const original = await card.locator('textarea').nth(0).inputValue()
  await card.locator('textarea').nth(1).fill(`${original}（教师已按本班学情、现场条件和课程材料核对调整）`)
  await card.locator('textarea').nth(2).fill(index === 2 ? '课程讲义三要素定义、材料允许范围和专业安全要求。' : '本班学生基础、45 分钟课时及普通机房设备条件。')
}
await page.getByText('教案结构与课堂条件均已核对，三类人工修改记录完整。').waitFor()
const m04AuditOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm04-audit-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m04AuditCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm04-audit-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByRole('button', { name: /进入小组互评/ }).click()
await page.getByText('无多人后端的模拟组员成果').waitFor()
await page.getByLabel('本次承担角色').selectOption({ label: '核验员' })
await page.getByLabel('被互评成员').selectOption({ label: '李老师' })
await page.getByLabel('整体可实施性').selectOption({ label: '可实施' })
await page.getByLabel('目标—活动—评价是否一致').selectOption({ label: '一致' })
await page.getByLabel('目标是否可观察评价').selectOption({ label: '一致' })
await page.getByLabel('活动是否符合课时设备条件').selectOption({ label: '一致' })
await page.getByLabel('分层支持是否对应目标与活动').selectOption({ label: '一致' })
await page.getByLabel('可执行的互评建议（必填）').fill('建议在离堂卡中明确写出修改前后版本的对应目标。')
await page.getByRole('button', { name: '提交互评' }).click()
await page.getByRole('button', { name: /形成教师确认版/ }).click()
await page.getByLabel('处理方式').selectOption({ label: '采纳并已核对' })
await page.getByLabel('处理说明与依据（必填）').fill('已在教师确认版保留修改前后证据，并核对目标对应关系。')
for (const checkbox of await page.locator('.m04-peer-response input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: '生成教师确认版', exact: true }).click()
await page.getByText('教师确认版与当前审校、互评记录一致').waitFor()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交验收' }).click()
await page.getByRole('heading', { name: 'M04 任务已通过' }).waitFor()
const m04ScoreText = await page.locator('.result-score').innerText()
const m04ResultOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm04-result-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m04ResultCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm04-result-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByLabel('返回任务清单', { exact: true }).click()

const m05Card = taskCard('M05')
await m05Card.getByText('可开始', { exact: true }).waitFor()
await m05Card.getByRole('button', { name: '开始任务' }).click()
await page.getByRole('heading', { name: 'AI 辅助命题与审校' }).waitFor()
await page.getByRole('button', { name: /确认命题输入/ }).click()
await page.getByRole('button', { name: /读取 M04 当前成果/ }).click()
await page.getByText('当前内容来自 M04 有效教师确认版。').waitFor()
await page.getByRole('button', { name: /进入 AI 题目包/ }).click()
await page.getByRole('button', { name: '生成 8 道题目草稿' }).click()
await page.getByText(/8 道题及规定题型齐全/).waitFor()
await page.getByRole('button', { name: /开始逐题人工审校/ }).click()
for (const card of await page.locator('.m05-audit-card').all()) {
  for (const select of await card.locator('select').all()) await select.selectOption({ index: 1 })
  for (const checkbox of await card.locator('input[type="checkbox"]').all()) await checkbox.check()
}
await page.getByText(/8 道题的题干、答案、目标、难度、材料依据/).waitFor()
await page.getByRole('button', { name: /进入人工修订/ }).click()
const m05RevisionCards = page.locator('.m05-revision-card')
await m05RevisionCards.nth(0).locator('select').selectOption({ index: 6 })
await m05RevisionCards.nth(1).locator('select').selectOption({ index: 8 })
for (let index = 0; index < 2; index += 1) {
  const card = m05RevisionCards.nth(index)
  const original = await card.getByLabel('AI 原题干（自动保存）').inputValue()
  await card.getByLabel('教师修改后题干（必填）').fill(`${original}请结合课程材料写出判断依据。`)
  await card.getByLabel('修改原因（必填）').fill('补充材料依据要求，使题目目标对齐并可核验。')
}
await page.getByRole('button', { name: /进入同组交叉核验/ }).click()
await page.getByLabel('本次承担角色').selectOption({ label: '核验员' })
await page.getByLabel('被互评成员').selectOption('T002')
await page.getByLabel('交叉核验题目（至少 1 题）').selectOption({ index: 1 })
for (const label of ['答案与解析是否正确','材料依据是否一致','学习目标是否对齐','难度是否适合当前学生']) await page.getByLabel(label).selectOption({ label: '一致' })
await page.getByLabel('可执行的互评建议（必填）').fill('建议在综合任务评分要点中明确材料依据与分值对应。')
await page.getByRole('button', { name: '提交互评' }).click()
await page.getByLabel('互评处理方式').selectOption({ label: '采纳并已核对' })
await page.getByLabel('处理说明与依据（必填）').fill('已核对综合任务答案、材料依据和评分要点，当前版本可执行。')
for (const checkbox of await page.locator('.m04-peer-response input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: /生成教师确认题目包/ }).click()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交验收' }).click()
await page.getByRole('heading', { name: 'M05 任务已通过' }).waitFor()
const m05ScoreText = await page.locator('.result-score').innerText()
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M05').getByText('已完成', { exact: true }).waitFor()

const g01CardAfterM04 = taskCard('G01')
await g01CardAfterM04.getByRole('button', { name: /^(开始|继续)验收$/ }).click()
await page.getByRole('heading', { name: '教学设计与命题成果验收' }).waitFor()
await page.getByText(/所有成员.*验收材料齐全，可以建立小组成果目录/).waitFor()
if (await page.getByText('当前为无多人后端的模拟组员成果，不代表真实提交。').count() === 0) throw new Error('G01 完整流程未披露模拟组员边界。')
await page.getByRole('button', { name: /建立成果目录/ }).click()
for (const artifact of ['教学设计与命题成果目录', 'AI 教学内容核验清单', '个人贡献记录']) await page.getByText(artifact, { exact: true }).waitFor()
await page.getByRole('button', { name: /核对错误与修正/ }).click()
await page.getByText('每位成员均有一处可追溯的 AI 错误与教师修正。').waitFor()
await page.getByRole('button', { name: /检查交叉复核/ }).click()
await page.getByText('每位成员均完成至少一次同组交叉检查。').waitFor()
await page.getByRole('button', { name: /汇总核验清单/ }).click()
await page.getByRole('heading', { name: 'AI 教学内容核验清单' }).waitFor()
if (await page.locator('.g01-checklist-list > article').count() !== 8) throw new Error('G01 默认核验清单不是 8 项。')
await page.getByRole('button', { name: /进入阶段验收/ }).click()
if (await page.getByText('/ 10 分').count() > 0) throw new Error('G01 阶段验收错误展示了 10 分制。')
await page.getByRole('button', { name: '提交初验' }).click()
await page.getByText('G01 阶段验收已通过', { exact: true }).waitFor()
const g01Store = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:g01:v2') ?? '{}'))
const g01Group = g01Store.groups?.['group-3']
if (!g01Group || g01Group.currentStatus !== '已通过') throw new Error('G01 通过状态未按 groupId 保存。')
if (g01Group.artifacts?.length !== 3 || new Set(g01Group.artifacts.map((item) => item.name)).size !== 3) throw new Error('G01 未恰好保存三项成果快照。')
const g01AssessmentOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'g01-assessment-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const g01AssessmentCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'g01-assessment-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('G01').getByText('已完成', { exact: true }).waitFor()

await page.getByRole('button', { name: /DAY 2/ }).click()
await taskCard('M06').getByRole('button', { name: /^(开始|继续)任务$/ }).click()
await page.getByRole('heading', { name: 'AI 辅助课件与数字人微课制作' }).waitFor()
await page.getByRole('button', { name: /确认制作输入/ }).click()
await page.getByRole('button', { name: '读取 M04 当前成果' }).click()
if (!await page.getByText('当前内容来自 M04 当前有效教师确认版。').isVisible()) throw new Error('M06 未能可选复用 M04 当前成果。')
const m06EnterDeckButton = page.getByRole('button', { name: /进入课件草稿/ })
if (!await m06EnterDeckButton.isEnabled()) {
  const messages = await page.locator('.validation.error').allInnerTexts()
  const storedInput = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}').participants?.T001?.input)
  throw new Error(`M06 复用后输入校验失败：${JSON.stringify({ messages, storedInput })}`)
}
await m06EnterDeckButton.click()
await page.getByRole('button', { name: /生成课件与讲解稿原始草稿/ }).click()
await page.getByText('7 页 AI 原始课件').waitFor()
for (const checkbox of await page.locator('.m06-slide-card input[type="checkbox"]').all()) await checkbox.check()
const m06TeacherAudit = page.locator('.content-card').filter({ has: page.getByRole('heading', { name: '教师人工检查' }) })
for (const checkbox of await m06TeacherAudit.locator('.confirmation-list input[type="checkbox"]').all()) await checkbox.check()
await m06TeacherAudit.getByLabel('选择修改页面').selectOption('slide-1')
await m06TeacherAudit.getByLabel('修改字段').selectOption('body')
await m06TeacherAudit.getByLabel('教师修改后内容（必填）').fill('面向当前学生基础，从匿名虚拟点检记录出发识别待核信号，并先说明证据边界。')
await m06TeacherAudit.getByLabel('修改依据（必填）').fill('补充学生基础和证据边界，使导入与课程材料中的复核要求直接对应。')
await page.getByRole('button', { name: /核验讲解稿/ }).click()
const m06TeacherScript = page.locator('.m06-script-grid > section').nth(1)
for (const checkbox of await m06TeacherScript.locator('input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: /配置数字人与视频/ }).click()
const m06Config = page.locator('.m04-overview-grid > section').first()
for (const checkbox of await m06Config.locator('input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: '生成本地视频预览' }).click()
await page.getByText('视频可播放').waitFor()
await page.getByRole('button', { name: /进入同组互评/ }).click()
await page.getByLabel('本次承担角色').selectOption({ label: '核验员' })
await page.getByLabel('被互评成员').selectOption('T002')
await page.getByLabel('教学场景适配').selectOption({ label: '适配' })
await page.getByLabel('数字人使用合规').selectOption({ label: '合规' })
await page.getByLabel('视频可播放').selectOption({ label: '可播放' })
await page.getByLabel('可执行互评建议（必填）').fill('建议在最后一页进一步明确复核结果的提交方式。')
await page.getByRole('button', { name: '提交互评' }).click()
await page.getByLabel('互评处理方式').selectOption({ label: '已采纳' })
await page.getByLabel('处理说明与依据（必填）').fill('已核对建议，最后一页的行动路径和提交方式均已明确。')
for (const checkbox of await page.locator('.m04-peer-response input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: '形成教师确认组合成果' }).click()
await page.getByText('教师确认成果与当前课件、讲稿、配置、视频和互评一致').waitFor()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交验收' }).click()
await page.getByRole('heading', { name: 'M06 任务已通过' }).waitFor()
const m06ScoreText = await page.locator('.result-score').innerText()
const m06StorePassed = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}'))
if (m06StorePassed.participants?.T001?.confirmedPackage?.finalDeck?.length !== 7) throw new Error('M06 教师确认成果未保存 7 页 PPT。')
if (m06StorePassed.participants?.T001?.confirmedPackage?.video?.durationSeconds !== 54) throw new Error('M06 可播放视频规格不正确。')

await page.getByRole('button', { name: /生成并逐页核验 6—8 页课件/ }).click()
const m06RevisedContent = page.getByLabel('教师修改后内容（必填）')
const originalM06RevisedContent = await m06RevisedContent.inputValue()
await m06RevisedContent.fill(`${originalM06RevisedContent}（当前修改）`)
const m06InvalidatedStore = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}').participants.T001)
if (m06InvalidatedStore.assessmentHistory?.length !== 1 || m06InvalidatedStore.confirmedPackage) throw new Error('M06 实质修改后未保留旧验收历史或旧确认成果仍有效。')
await m06RevisedContent.fill(originalM06RevisedContent)
await page.getByRole('button', { name: '核验讲解稿' }).click()
await page.getByRole('button', { name: '配置数字人与视频' }).click()
await page.getByRole('button', { name: '生成本地视频预览' }).click()
await page.getByText('视频可播放').waitFor()
await page.getByRole('button', { name: '进入同组互评' }).click()
await page.getByRole('button', { name: '形成教师确认组合成果' }).click()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交复验' }).click()
await page.getByRole('heading', { name: 'M06 任务已通过' }).waitFor()
const m06RetestedStore = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}').participants.T001)
if (m06RetestedStore.assessmentHistory?.length !== 2) throw new Error('M06 恢复当前内容后未保留初验并新增复验历史。')

const m06ResultOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm06-result-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m06ResultCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm06-result-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M06').getByText('已完成', { exact: true }).waitFor()

await taskCard('M07').getByRole('button', { name: /^(开始|继续)任务$/ }).click()
await page.getByRole('heading', { name: 'AI 辅助成绩分析与分层教学设计' }).waitFor()
await page.getByRole('button', { name: /确认分析输入/ }).click()
await page.getByRole('button', { name: '读取 M06 当前成果' }).click()
if (!await page.getByText(/当前课程情境来自 M06 当前有效教师确认成果/).isVisible()) throw new Error('M07 未能可选复用 M06 当前成果。')
for (const checkbox of await page.locator('.m04-input-form .confirmation-list input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: /检查成绩表/ }).click()
await page.getByRole('button', { name: '标记全部字段已检查' }).click()
await page.getByText('A20 · 测验二缺失').locator('..').getByText('已识别').locator('input').check()
await page.getByText('A17 · 两次测验相差 56 分').locator('..').getByText('已识别').locator('input').check()
const m07QualityCards = page.locator('.m04-overview-grid > section')
await m07QualityCards.nth(0).getByLabel('处理方式').fill('测验二平均分排除缺失值，并明确有效样本量 n=19；不补写推测分数。')
await m07QualityCards.nth(1).getByLabel('处理方式').fill('保留原始分数并标注两次测验分差较大，正式教学中需复核原始记录。')
await page.getByText('教师已完成人工数据质量检查').locator('xpath=ancestor::label').locator('input').check()
await page.getByRole('button', { name: /运行确定性统计/ }).click()
await page.getByRole('button', { name: /计算统计并生成 AI 解释草稿/ }).click()
await page.getByText('11 个统计指标').waitFor()
const m07DraftStore = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}').participants.T001)
const manualMetricIds = ['quiz1-average', 'quiz2-average', 'band-high']
const m07CheckCards = page.locator('.m07-check-grid > article')
for (let index = 0; index < manualMetricIds.length; index += 1) {
  const metricId = manualMetricIds[index]
  const metric = m07DraftStore.draft.metrics.find((item) => item.id === metricId)
  await m07CheckCards.nth(index).locator('select').selectOption(metricId)
  await m07CheckCards.nth(index).locator('input[type="number"]').fill(String(metric.value))
  await m07CheckCards.nth(index).getByLabel('复算过程或纠正说明').fill(`按“${metric.calculation}”人工复算，与确定性结果一致。`)
}
await page.getByRole('button', { name: /审校 AI 结论/ }).click()
const m07ConclusionCards = page.locator('.m07-conclusion-grid > article')
await m07ConclusionCards.nth(0).locator('select').selectOption({ label: '结论有据' })
await m07ConclusionCards.nth(0).getByLabel('判断依据').fill('对比四个知识点正确率，知识点 3 在本轮数据中最低。')
await m07ConclusionCards.nth(0).getByLabel('教师最终表述').fill('知识点 3 为本轮共同补强重点，其正确率在四个知识点中最低。')
await m07ConclusionCards.nth(1).locator('select').selectOption({ label: '结论无据' })
await m07ConclusionCards.nth(1).getByLabel('判断依据').fill('作业完成情况不能证明学习态度，删除该判断。')
await m07ConclusionCards.nth(2).locator('select').selectOption({ label: '结论需限定' })
await m07ConclusionCards.nth(2).getByLabel('判断依据').fill('高分段只能支持本轮临时任务安排，不能推断长期能力。')
await m07ConclusionCards.nth(2).getByLabel('教师最终表述').fill('本轮测验有效均分不低于 85 的学生，可在下一课次尝试拓展任务；分组随新证据调整。')
await page.getByRole('button', { name: /设计临时分层任务/ }).click()
await page.getByLabel('本次承担角色').selectOption({ label: '核验员' })
await page.getByLabel('同组复算成员').selectOption('T002')
await page.getByLabel('复算数字').selectOption('quiz1-average')
await page.getByLabel('同伴复算值').fill(String(m07DraftStore.draft.metrics.find((item) => item.id === 'quiz1-average').value))
await page.getByLabel('复算过程或差异说明').fill('按 20 人测验一总分除以 20 复算，结果与确定性公式一致。')
await page.getByRole('button', { name: '提交同组复算' }).click()
await page.getByLabel('复算意见处理').selectOption({ label: '已采纳' })
await page.getByLabel('处理说明与依据').fill('已核对同伴复算过程和确定性公式，结果一致。')
for (const checkbox of await page.locator('.m04-peer-response input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: '形成教师确认成果' }).click()
await page.getByText('教师确认成果与当前数据、统计、结论、分层任务和复核一致').waitFor()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交验收' }).click()
await page.getByRole('heading', { name: 'M07 任务已通过' }).waitFor()
let m07ScoreText = await page.locator('.result-score').innerText()
const m07PassedStore = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}').participants.T001)
if (m07PassedStore.confirmedDeliverable?.layerTasks?.length !== 3) throw new Error('M07 未恰好保存 3 个临时分层任务。')
if (m07PassedStore.assessmentHistory?.length !== 1) throw new Error('M07 初验历史数量不正确。')

await page.getByRole('button', { name: /分层与复核/ }).click()
const firstLayerTaskName = page.locator('.m07-layer-grid > article').first().getByLabel('任务名称')
const originalLayerTaskName = await firstLayerTaskName.inputValue()
await firstLayerTaskName.fill(`${originalLayerTaskName}（当前修改）`)
const m07InvalidatedStore = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}').participants.T001)
if (m07InvalidatedStore.assessmentHistory?.length !== 1 || m07InvalidatedStore.confirmedDeliverable) throw new Error('M07 实质修改后未保留旧验收历史或旧确认成果仍有效。')
await firstLayerTaskName.fill(originalLayerTaskName)
await page.getByRole('button', { name: '形成教师确认成果' }).click()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交复验' }).click()
await page.getByRole('heading', { name: 'M07 任务已通过' }).waitFor()
m07ScoreText = await page.locator('.result-score').innerText()
const m07ResultOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm07-result-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m07ResultCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm07-result-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M07').getByText('已完成', { exact: true }).waitFor()

await taskCard('M08').getByRole('button', { name: '开始任务' }).click()
await page.getByRole('button', { name: /确认网页输入/ }).click()
await page.getByRole('button', { name: /复用 M06 当前成果/ }).click()
await page.getByText('已复用 M06').waitFor()
await page.getByRole('button', { name: /生成 AI 原始网页/ }).click()
await page.getByRole('button', { name: '生成 AI 原始 V0' }).click()
await page.getByText('4 张知识卡、5 道有解析和依据的题').waitFor()
await page.getByRole('button', { name: /开始两轮教师迭代/ }).click()
await page.getByRole('button', { name: /执行第 1 轮并保存 V1/ }).click()
await page.getByText('1 / 2 轮').waitFor()
await page.getByRole('button', { name: /执行第 2 轮并保存 V2/ }).click()
await page.getByText('2 / 2 轮').waitFor()
await page.getByRole('button', { name: /下载并测试网页/ }).click()
const m08Download = page.waitForEvent('download')
await page.getByRole('button', { name: /下载单文件 HTML/ }).click()
await m08Download
for (const checkbox of await page.locator('.confirmation-list input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: /邀请同组成员学生测试/ }).click()
await page.getByText('无多人后端的模拟边界').waitFor()
await page.getByLabel('本次承担角色').selectOption({ label: '学生体验员' })
await page.getByLabel('学生测试成员').selectOption('T002')
await page.getByLabel('学生实际操作过程').fill('依次展开四张知识卡，完成五道即时反馈题，并查看正确与错误提示。')
await page.getByLabel('发现的至少 1 个问题').fill('首屏学习路径提示不够突出，首次操作时容易直接跳到测验。')
await page.getByLabel('修正前').fill('先阅读知识卡，再完成即时测验。')
await page.getByLabel('修正后').fill('步骤 1 展开四张知识卡；步骤 2 完成五题；步骤 3 根据错误反馈回看对应知识卡。')
await page.getByLabel('修正依据').fill('同组学生测试者首次操作路径与现场口述反馈。')
await page.getByRole('button', { name: /提交学生测试与修正/ }).click()
for (const checkbox of await page.locator('.confirmation-list input[type="checkbox"]').all()) await checkbox.check()
await page.getByRole('button', { name: /形成教师最终网页/ }).click()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交验收' }).click()
await page.getByRole('heading', { name: 'M08 任务已通过' }).waitFor()
let m08ScoreText = await page.locator('.result-score').innerText()
const m08PassedStore = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}').participants.T001)
if (m08PassedStore.versions?.length !== 3 || m08PassedStore.iterationRecords?.length !== 2) throw new Error('M08 未保留 V0/V1/V2 与恰好两轮迭代记录。')
if (m08PassedStore.assessments?.length !== 1 || !m08PassedStore.confirmedWebpage) throw new Error('M08 初验或教师最终网页保存不正确。')

await page.getByRole('button', { name: /学生测试与确认/ }).click()
const originalM08Correction = await page.getByLabel('修正后').inputValue()
await page.getByLabel('修正后').fill(`${originalM08Correction}（当前修改）`)
const m08InvalidatedStore = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}').participants.T001)
if (m08InvalidatedStore.assessments?.length !== 1 || m08InvalidatedStore.confirmedWebpage) throw new Error('M08 实质修改后未保留旧验收历史或旧确认网页仍有效。')
await page.getByLabel('修正后').fill(originalM08Correction)
await page.getByRole('button', { name: /提交学生测试与修正/ }).click()
await page.getByRole('button', { name: /形成教师最终网页/ }).click()
await page.getByRole('button', { name: /进入评分与成果/ }).click()
await page.getByRole('button', { name: '提交复验' }).click()
await page.getByRole('heading', { name: 'M08 任务已通过' }).waitFor()
m08ScoreText = await page.locator('.result-score').innerText()
const m08ResultOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm08-result-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const m08ResultCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'm08-result-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M08').getByText('已完成', { exact: true }).waitFor()

await taskCard('G02').getByRole('button', { name: /开始验收/ }).click()
await page.getByRole('button', { name: /核对小组成果目录/ }).click()
await page.getByText('无多人后端与未实现选修任务的模拟边界').waitFor()
await page.getByLabel('小组已核对成果目录和来源标记').check()
await page.getByRole('button', { name: /编排一页式展示/ }).click()
await page.getByLabel('小组确认四类成果均已在当前一页式展示中呈现').check()
await page.getByLabel('现场已完成操作并看到即时反馈').check()
await page.getByRole('button', { name: /接收跨组反馈/ }).click()
await page.getByLabel('小组已共同阅读并判断两条具体跨组反馈').check()
await page.getByRole('button', { name: /依据反馈修改并确认贡献/ }).click()
await page.getByLabel('该修改已实际应用到当前展示页').check()
await page.getByLabel('小组确认每位成员至少贡献 1 项作品或完成 1 处实质修改').check()
await page.getByRole('button', { name: /进入里程碑验收/ }).click()
await page.getByRole('button', { name: '提交小组验收' }).click()
await page.getByRole('heading', { name: 'G02 里程碑已通过' }).waitFor()
let g02ConditionText = await page.locator('.result-score').innerText()
const g02PassedStore = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('qijing-training-demo:g02:v1') ?? '{}').groups ?? {})[0])
if (g02PassedStore.assessments?.length !== 1 || g02PassedStore.artifacts?.length !== 3) throw new Error('G02 初验或三份固定成果保存不正确。')
if (new Set(g02PassedStore.artifacts.map((item) => item.name)).size !== 3) throw new Error('G02 三份成果存在重复名称。')

await page.getByRole('button', { name: /展示与互动/ }).click()
const originalG02Title = await page.getByLabel('展示页标题').inputValue()
await page.getByLabel('展示页标题').fill(`${originalG02Title}（当前修改）`)
const g02InvalidatedStore = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('qijing-training-demo:g02:v1') ?? '{}').groups ?? {})[0])
if (g02InvalidatedStore.assessments?.length !== 1 || g02InvalidatedStore.artifacts?.length !== 0 || g02InvalidatedStore.currentStatus !== '需补验') throw new Error('G02 实质修改后未保留旧验收历史、旧成果仍有效或状态未变为需补验。')
await page.getByLabel('展示页标题').fill(originalG02Title)
await page.getByLabel('小组确认四类成果均已在当前一页式展示中呈现').check()
await page.getByRole('button', { name: /接收跨组反馈/ }).click()
await page.getByRole('button', { name: /依据反馈修改并确认贡献/ }).click()
await page.getByRole('button', { name: /进入里程碑验收/ }).click()
await page.getByLabel('补验修改摘要').fill('根据跨组反馈重新核对首屏学习路径，并恢复小组对当前展示页的共同确认。')
await page.getByRole('button', { name: '提交补验' }).click()
await page.getByRole('heading', { name: 'G02 里程碑已通过' }).waitFor()
g02ConditionText = await page.locator('.result-score').innerText()
const g02ResultOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'g02-result-1440.png'), fullPage: true })
await page.setViewportSize({ width: 1024, height: 768 })
const g02ResultCompactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'g02-result-1024.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('G02').getByText('已完成', { exact: true }).waitFor()

await page.getByRole('button', { name: '成果中心', exact: true }).click()
await page.getByRole('heading', { name: '任务成果自动归档' }).waitFor()
const m01Archive = archiveCard('M01')
await m01Archive.getByText('已同步归档').waitFor()
if (!await m01Archive.getByText('AI 生成内容核验记录、教师修正对照表、小组核验清单').isVisible()) throw new Error('M01 完成成果未同步到成果中心。')
const m02Archive = archiveCard('M02')
await m02Archive.getByText('已同步归档').waitFor()
for (const artifact of ['任务遵循检查记录', '五维对比评分表', '模型选择与人工修正记录', '小组模型对比结论']) {
  if (!await m02Archive.getByText(new RegExp(artifact)).isVisible()) throw new Error(`M02 成果未同步：${artifact}`)
}
const m03Archive = archiveCard('M03')
await m03Archive.getByText('已同步归档').waitFor()
for (const artifact of ['提示词 V1', '提示词 V2', '两个版本的变化说明']) {
  if (!await m03Archive.getByText(new RegExp(artifact)).isVisible()) throw new Error(`M03 成果未同步：${artifact}`)
}
const m04Archive = archiveCard('M04')
await m04Archive.getByText('已同步归档').waitFor()
for (const artifact of ['AI 教案草稿', '教案人工审校记录', '教师确认版教案']) {
  if (!await m04Archive.getByText(new RegExp(artifact)).isVisible()) throw new Error(`M04 成果未同步：${artifact}`)
}
const m04ArchivedNames = (await m04Archive.locator('p').innerText()).split('、')
if (m04ArchivedNames.length !== 3 || new Set(m04ArchivedNames).size !== 3) throw new Error('M04 归档成果不是恰好三项且各归档一次。')
const m05Archive = archiveCard('M05')
await m05Archive.getByText('已同步归档').waitFor()
const m05ArchivedText = await m05Archive.locator('p').innerText()
if (m05ArchivedText !== '课堂题目包、题目核验依据与修改记录') throw new Error(`M05 成果不是恰好两套且各归档一次：${m05ArchivedText}`)
const g01Archive = archiveCard('G01')
await g01Archive.getByText('已同步归档').waitFor()
const g01ArchivedText = await g01Archive.locator('p').innerText()
if (g01ArchivedText !== '教学设计与命题成果目录、AI 教学内容核验清单、个人贡献记录') throw new Error(`G01 归档成果不是恰好三项且各归档一次：${g01ArchivedText}`)
const m06Archive = archiveCard('M06')
await m06Archive.getByText('已同步归档').waitFor()
const m06ArchivedText = await m06Archive.locator('p').innerText()
if (m06ArchivedText !== 'AI 课件与数字人微课成果') throw new Error(`M06 组合成果不是恰好一套且归档一次：${m06ArchivedText}`)
const m07Archive = archiveCard('M07')
await m07Archive.getByText('已同步归档').waitFor()
const m07ArchivedText = await m07Archive.locator('p').innerText()
if (m07ArchivedText !== '学情分析与分层学习任务') throw new Error(`M07 成果不是恰好一份且归档一次：${m07ArchivedText}`)
const m08Archive = archiveCard('M08')
await m08Archive.getByText('已同步归档').waitFor()
const m08ArchivedText = await m08Archive.locator('p').innerText()
if (m08ArchivedText !== '交互式教学网页') throw new Error(`M08 成果不是恰好一个且归档一次：${m08ArchivedText}`)
const g02Archive = archiveCard('G02')
await g02Archive.getByText('已同步归档').waitFor()
const g02ArchivedText = await g02Archive.locator('p').innerText()
if (g02ArchivedText !== '小组多模态教学成果展示页、同伴反馈与修改记录、成员贡献清单') throw new Error(`G02 成果不是恰好三份且各归档一次：${g02ArchivedText}`)
const portfolioOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'portfolio-1440.png'), fullPage: true })

await page.setViewportSize({ width: 1024, height: 768 })
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('heading', { name: '成果中心' }).waitFor()
const compactOverflow = await overflow()
await page.screenshot({ path: path.join(outputDir, 'portfolio-1024.png'), fullPage: true })

await page.getByRole('button', { name: '培训人员与分组', exact: true }).click()
await page.getByLabel('当前演示人员').selectOption('T002')
await page.getByRole('button', { name: '任务清单', exact: true }).click()
const t002M04Card = taskCard('M04')
await t002M04Card.getByText('可开始', { exact: true }).waitFor()
await page.getByRole('button', { name: /DAY 2/ }).click()
await taskCard('M06').getByText('可开始', { exact: true }).waitFor()
await taskCard('M07').getByText('可开始', { exact: true }).waitFor()
await taskCard('M08').getByText('可开始', { exact: true }).waitFor()
const m04StoreAfterSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m04:v1') ?? '{}'))
if (!m04StoreAfterSwitch.participants?.T001 || m04StoreAfterSwitch.participants?.T002) throw new Error('M04 未按 participantId 隔离。')
const m06StoreAfterSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}'))
if (!m06StoreAfterSwitch.participants?.T001 || m06StoreAfterSwitch.participants?.T002) throw new Error('M06 未按 participantId 隔离。')
const m07StoreAfterSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}'))
if (!m07StoreAfterSwitch.participants?.T001 || m07StoreAfterSwitch.participants?.T002) throw new Error('M07 未按 participantId 隔离。')
const m08StoreAfterSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}'))
if (!m08StoreAfterSwitch.participants?.T001 || m08StoreAfterSwitch.participants?.T002) throw new Error('M08 未按 participantId 隔离。')
const g02StoreAfterSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:g02:v1') ?? '{}'))
if (Object.keys(g02StoreAfterSwitch.groups ?? {}).length !== 1 || Object.values(g02StoreAfterSwitch.groups ?? {})[0]?.assessments?.length !== 2) throw new Error('G02 未沿用 groupId 保存同组验收历史。')
await page.getByRole('button', { name: '培训人员与分组', exact: true }).click()
await page.getByLabel('当前演示人员').selectOption('T001')
await page.getByRole('button', { name: '任务清单', exact: true }).click()
await taskCard('M04').getByText('已完成', { exact: true }).waitFor()
await taskCard('G01').getByText('进行中', { exact: true }).waitFor()
await page.getByRole('button', { name: /DAY 2/ }).click()
await taskCard('M06').getByText('已完成', { exact: true }).waitFor()
await taskCard('M07').getByText('已完成', { exact: true }).waitFor()
await taskCard('M08').getByText('已完成', { exact: true }).waitFor()
const g01StoreAfterIdentitySwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:g01:v2') ?? '{}'))
if (g01StoreAfterIdentitySwitch.groups?.['group-3']?.assessments?.length !== 1) throw new Error('当前教师变化后 G01 历史验收未保留。')
if (g01StoreAfterIdentitySwitch.groups?.['group-3']?.currentStatus !== '需补验') throw new Error('当前教师成果引用变化后 G01 仍保持当前通过。')

await page.getByRole('button', { name: '培训人员与分组', exact: true }).click()
await page.getByLabel('当前演示人员').selectOption('T002')
await page.getByRole('button', { name: '任务清单', exact: true }).click()
await page.getByRole('button', { name: /DAY 2/ }).click()
await taskCard('M06').getByRole('button', { name: '开始任务' }).click()
await page.getByRole('button', { name: /确认制作输入/ }).click()
await page.waitForFunction(() => Boolean(JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}').participants?.T002))
page.once('dialog', (dialog) => dialog.accept())
await page.getByLabel('重置演示数据', { exact: true }).click()
await page.waitForFunction(() => {
  const participants = JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}').participants ?? {}
  return Boolean(participants.T001) && !participants.T002
})
const m06AfterTaskReset = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}'))
const m07AfterM06TaskReset = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}'))
if (!m06AfterTaskReset.participants?.T001 || m06AfterTaskReset.participants?.T002) throw new Error('M06 任务内重置没有只清当前教师当前任务。')
if (!m07AfterM06TaskReset.participants?.T001) throw new Error('M06 任务内重置误清了 M07 数据。')

await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M07').getByRole('button', { name: '开始任务' }).click()
await page.getByRole('button', { name: /确认分析输入/ }).click()
await page.waitForFunction(() => Boolean(JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}').participants?.T002))
page.once('dialog', (dialog) => dialog.accept())
await page.getByLabel('重置演示数据', { exact: true }).click()
await page.waitForFunction(() => {
  const participants = JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}').participants ?? {}
  return Boolean(participants.T001) && !participants.T002
})
const m07AfterTaskReset = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}'))
const m06AfterM07TaskReset = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}'))
if (!m07AfterTaskReset.participants?.T001 || m07AfterTaskReset.participants?.T002) throw new Error('M07 任务内重置没有只清当前教师当前任务。')
if (!m06AfterM07TaskReset.participants?.T001) throw new Error('M07 任务内重置误清了 M06 数据。')

await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('M08').getByRole('button', { name: '开始任务' }).click()
await page.getByRole('button', { name: /确认网页输入/ }).click()
await page.waitForFunction(() => Boolean(JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}').participants?.T002))
page.once('dialog', (dialog) => dialog.accept())
await page.getByLabel('重置演示数据', { exact: true }).click()
await page.waitForFunction(() => {
  const participants = JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}').participants ?? {}
  return Boolean(participants.T001) && !participants.T002
})
const m08AfterTaskReset = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}'))
const m07AfterM08TaskReset = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}'))
if (!m08AfterTaskReset.participants?.T001 || m08AfterTaskReset.participants?.T002) throw new Error('M08 任务内重置没有只清当前教师当前任务。')
if (!m07AfterM08TaskReset.participants?.T001) throw new Error('M08 任务内重置误清了 M07 数据。')

await page.getByLabel('返回任务清单', { exact: true }).click()
await taskCard('G02').getByRole('button', { name: /开始验收|继续验收/ }).click()
page.once('dialog', (dialog) => dialog.accept())
await page.getByLabel('重置演示数据', { exact: true }).click()
await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('qijing-training-demo:g02:v1') ?? '{}').groups ?? {}).length === 0)
const m08AfterG02TaskReset = await page.evaluate(() => JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}'))
if (!m08AfterG02TaskReset.participants?.T001) throw new Error('G02 当前小组重置误清了个人 M08 数据。')

await page.getByLabel('返回任务清单', { exact: true }).click()
page.once('dialog', (dialog) => dialog.accept())
await page.getByLabel('重置全部实训数据', { exact: true }).click()
await page.waitForFunction(() => {
  const m06 = JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}').participants ?? {}
  const m07 = JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}').participants ?? {}
  const m08 = JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}').participants ?? {}
  const g02 = JSON.parse(localStorage.getItem('qijing-training-demo:g02:v1') ?? '{}').groups ?? {}
  return Object.keys(m06).length === 0 && Object.keys(m07).length === 0 && Object.keys(m08).length === 0 && Object.keys(g02).length === 0
})
const storesAfterGlobalReset = await page.evaluate(() => ({
  m06: JSON.parse(localStorage.getItem('qijing-training-demo:m06:v1') ?? '{}'),
  m07: JSON.parse(localStorage.getItem('qijing-training-demo:m07:v1') ?? '{}'),
  m08: JSON.parse(localStorage.getItem('qijing-training-demo:m08:v1') ?? '{}'),
  g02: JSON.parse(localStorage.getItem('qijing-training-demo:g02:v1') ?? '{}'),
}))
if (Object.keys(storesAfterGlobalReset.m06.participants ?? {}).length || Object.keys(storesAfterGlobalReset.m07.participants ?? {}).length || Object.keys(storesAfterGlobalReset.m08.participants ?? {}).length || Object.keys(storesAfterGlobalReset.g02.groups ?? {}).length) throw new Error('全局重置未清除全部教师的 M06/M07/M08 和全部小组 G02 数据。')

await browser.close()

if (mapOverflow.body > 0 || mapOverflow.html > 0 || independentTaskListOverflow.body > 0 || independentTaskListOverflow.html > 0 || independentTaskListCompactOverflow.body > 0 || independentTaskListCompactOverflow.html > 0 || participantsOverflow.body > 0 || participantsOverflow.html > 0 || electiveOverflow.body > 0 || electiveOverflow.html > 0 || resultOverflow.body > 0 || resultOverflow.html > 0 || m02RunOverflow.body > 0 || m02RunOverflow.html > 0 || m02CompactOverflow.body > 0 || m02CompactOverflow.html > 0 || m02RatingOverflow.body > 0 || m02RatingOverflow.html > 0 || m02RatingCompactOverflow.body > 0 || m02RatingCompactOverflow.html > 0 || m02SelectionOverflow.body > 0 || m02SelectionOverflow.html > 0 || m02SelectionCompactOverflow.body > 0 || m02SelectionCompactOverflow.html > 0 || m02ResultOverflow.body > 0 || m02ResultOverflow.html > 0 || m03DesignOverflow.body > 0 || m03DesignOverflow.html > 0 || m03DesignCompactOverflow.body > 0 || m03DesignCompactOverflow.html > 0 || m03CompareOverflow.body > 0 || m03CompareOverflow.html > 0 || m03ResultOverflow.body > 0 || m03ResultOverflow.html > 0 || m04AuditOverflow.body > 0 || m04AuditOverflow.html > 0 || m04AuditCompactOverflow.body > 0 || m04AuditCompactOverflow.html > 0 || m04ResultOverflow.body > 0 || m04ResultOverflow.html > 0 || m04ResultCompactOverflow.body > 0 || m04ResultCompactOverflow.html > 0 || g01AssessmentOverflow.body > 0 || g01AssessmentOverflow.html > 0 || g01AssessmentCompactOverflow.body > 0 || g01AssessmentCompactOverflow.html > 0 || m06ResultOverflow.body > 0 || m06ResultOverflow.html > 0 || m06ResultCompactOverflow.body > 0 || m06ResultCompactOverflow.html > 0 || m07ResultOverflow.body > 0 || m07ResultOverflow.html > 0 || m07ResultCompactOverflow.body > 0 || m07ResultCompactOverflow.html > 0 || portfolioOverflow.body > 0 || portfolioOverflow.html > 0 || compactOverflow.body > 0 || compactOverflow.html > 0) {
  throw new Error(`检测到横向溢出：${JSON.stringify({ mapOverflow, independentTaskListOverflow, independentTaskListCompactOverflow, participantsOverflow, electiveOverflow, resultOverflow, m02RunOverflow, m02CompactOverflow, m02RatingOverflow, m02RatingCompactOverflow, m02SelectionOverflow, m02SelectionCompactOverflow, m02ResultOverflow, m03DesignOverflow, m03DesignCompactOverflow, m03CompareOverflow, m03ResultOverflow, m04AuditOverflow, m04AuditCompactOverflow, m04ResultOverflow, m04ResultCompactOverflow, g01AssessmentOverflow, g01AssessmentCompactOverflow, portfolioOverflow, compactOverflow })}`)
}
if (consoleErrors.length > 0) throw new Error(`浏览器控制台错误：${consoleErrors.join(' | ')}`)
const m08G02Overflows = { m08ResultOverflow, m08ResultCompactOverflow, g02ResultOverflow, g02ResultCompactOverflow }
if (Object.values(m08G02Overflows).some((item) => item.body > 0 || item.html > 0)) throw new Error(`M08/G02 检测到横向溢出：${JSON.stringify(m08G02Overflows)}`)
if (!scoreText.includes('10') || !scoreText.includes('/ 10 分')) throw new Error(`评分结果不正确：${scoreText}`)
if (!m02ScoreText.includes('10') || !m02ScoreText.includes('/ 10 分')) throw new Error(`M02 评分结果不正确：${m02ScoreText}`)
if (!m03ScoreText.includes('10') || !m03ScoreText.includes('/ 10 分')) throw new Error(`M03 评分结果不正确：${m03ScoreText}`)
if (!m04ScoreText.includes('10') || !m04ScoreText.includes('/ 10 分')) throw new Error(`M04 评分结果不正确：${m04ScoreText}`)
if (!m06ScoreText.includes('10') || !m06ScoreText.includes('/ 10 分')) throw new Error(`M06 评分结果不正确：${m06ScoreText}`)
if (!m07ScoreText.includes('10') || !m07ScoreText.includes('/ 10 分')) throw new Error(`M07 评分结果不正确：${m07ScoreText}`)
if (!m08ScoreText.includes('10') || !m08ScoreText.includes('/ 10 分')) throw new Error(`M08 评分结果不正确：${m08ScoreText}`)
if (!g02ConditionText.includes('4') || !g02ConditionText.includes('/ 4 项')) throw new Error(`G02 四项验收结果不正确：${g02ConditionText}`)

console.log(JSON.stringify({
  baseUrl,
  scoreText,
  m02ScoreText,
  m03ScoreText,
  m04ScoreText,
  m06ScoreText,
  m07ScoreText,
  m08ScoreText,
  g02ConditionText,
  mapOverflow,
  independentTaskListOverflow,
  independentTaskListCompactOverflow,
  participantsOverflow,
  electiveOverflow,
  resultOverflow,
  m02RunOverflow,
  m02CompactOverflow,
  m02RatingOverflow,
  m02RatingCompactOverflow,
  m02SelectionOverflow,
  m02SelectionCompactOverflow,
  m02ResultOverflow,
  m03DesignOverflow,
  m03DesignCompactOverflow,
  m03CompareOverflow,
  m03ResultOverflow,
  m04AuditOverflow,
  m04AuditCompactOverflow,
  m04ResultOverflow,
  m04ResultCompactOverflow,
  m06ResultOverflow,
  m06ResultCompactOverflow,
  m07ResultOverflow,
  m07ResultCompactOverflow,
  m08ResultOverflow,
  m08ResultCompactOverflow,
  g02ResultOverflow,
  g02ResultCompactOverflow,
  g01AssessmentOverflow,
  g01AssessmentCompactOverflow,
  portfolioOverflow,
  compactOverflow,
  consoleErrors,
  screenshots: [
    path.join(outputDir, 'day1-task-map-1440.png'),
    path.join(outputDir, 'independent-task-list-1440.png'),
    path.join(outputDir, 'independent-task-list-1024.png'),
    path.join(outputDir, 'participants-import-1440.png'),
    path.join(outputDir, 'elective-multiselect-1440.png'),
    path.join(outputDir, 'm01-result-1440.png'),
    path.join(outputDir, 'm02-workbench-1440.png'),
    path.join(outputDir, 'm02-workbench-1024.png'),
    path.join(outputDir, 'm02-guided-rating-1440.png'),
    path.join(outputDir, 'm02-guided-rating-1024.png'),
    path.join(outputDir, 'm02-selection-1440.png'),
    path.join(outputDir, 'm02-selection-1024.png'),
    path.join(outputDir, 'm02-result-1440.png'),
    path.join(outputDir, 'm03-dialogue-1440.png'),
    path.join(outputDir, 'm03-dialogue-1024.png'),
    path.join(outputDir, 'm03-compare-1440.png'),
    path.join(outputDir, 'm03-result-1440.png'),
    path.join(outputDir, 'm04-audit-1440.png'),
    path.join(outputDir, 'm04-audit-1024.png'),
    path.join(outputDir, 'm04-result-1440.png'),
    path.join(outputDir, 'm04-result-1024.png'),
    path.join(outputDir, 'm06-result-1440.png'),
    path.join(outputDir, 'm06-result-1024.png'),
    path.join(outputDir, 'm07-result-1440.png'),
    path.join(outputDir, 'm07-result-1024.png'),
    path.join(outputDir, 'm08-result-1440.png'),
    path.join(outputDir, 'm08-result-1024.png'),
    path.join(outputDir, 'g02-result-1440.png'),
    path.join(outputDir, 'g02-result-1024.png'),
    path.join(outputDir, 'g01-assessment-1440.png'),
    path.join(outputDir, 'g01-assessment-1024.png'),
    path.join(outputDir, 'portfolio-1440.png'),
    path.join(outputDir, 'portfolio-1024.png'),
  ],
}, null, 2))
