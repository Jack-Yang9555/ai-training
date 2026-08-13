import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'
import { createInitialProgress, STORAGE_KEY } from '../src/storage/m01Storage'
import { PORTAL_STORAGE_KEY } from '../src/training/storage'
import type { PortalRoute } from '../src/training/types'

function setPortalRoute(route: PortalRoute) {
  window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify({ version: 2, route, electiveAssignments: { 'day-2': [], 'day-3': [] }, updatedAt: new Date().toISOString() }))
}

describe('AI 通识实训平台 Demo 关键交互', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(PORTAL_STORAGE_KEY)
  })

  it('从任务清单进入 M01 并生成全部回答', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: '从可信使用到 AI 教学综合应用' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /开始第一个任务/ }))
    expect(screen.getByRole('heading', { name: '大模型幻觉识别与内容核验' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /开始 AI 提问/ }))
    await user.click(screen.getByRole('button', { name: /生成全部演示回答/ }))
    expect(screen.getAllByText('AI 原始回答')).toHaveLength(4)
    expect(screen.getByRole('button', { name: /进入标注核验/ })).toBeEnabled()
  })

  it('M01 未通过时也可直接进入 M02 工作台', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /查看任务清单/ }))
    expect(screen.getByRole('heading', { name: '实训任务清单' })).toBeInTheDocument()
    const m02Card = screen.getByText('M02').closest('.training-task-card')
    expect(m02Card).not.toBeNull()
    await user.click(within(m02Card as HTMLElement).getByRole('button', { name: /开始任务/ }))
    expect(screen.getByRole('heading', { name: '多模型教学结果对比与选择' })).toBeInTheDocument()
    expect(screen.queryByText('M01 尚未通过')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /进入多模型运行台/ })).toBeEnabled()
  })

  it('M01 与 M02 未通过时也可直接进入 M03 并开始设计', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /查看任务清单/ }))
    const m03Card = screen.getByText('M03').closest('.training-task-card')
    expect(m03Card).not.toBeNull()
    await user.click(within(m03Card as HTMLElement).getByRole('button', { name: /开始任务/ }))
    expect(screen.getByRole('heading', { name: '结构化提示词设计与迭代' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /进入 AI 对话练习/ })).toBeEnabled()
  })

  it('培训人员页面可校验并确认导入基本信息与分组', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByRole('button', { name: /^培训人员$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '管理培训人员' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '查看教师与小组信息' }))
    const teacherPanel = screen.getByRole('region', { name: '教师与所在小组信息' })
    expect(within(teacherPanel).getByText('第 3 组成员')).toBeInTheDocument()
    expect(within(teacherPanel).getByText('6 人')).toBeInTheDocument()
    for (const name of ['张老师', '李老师', '王老师', '陈老师', '赵老师', '林老师']) expect(within(teacherPanel).getByRole('listitem', { name: `组员：${name}` })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '查看教师与小组信息' }))
    await user.click(screen.getByRole('button', { name: '培训人员与分组' }))
    expect(screen.getByRole('heading', { name: '培训人员与分组' })).toBeInTheDocument()
    expect(screen.getByText('当前名单：内置示例名单.csv')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '当前演示人员' })).toHaveValue('T001')
    expect(screen.queryByText('核验员')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '载入示例名单' }))
    expect(screen.getByText('格式校验通过，可确认覆盖当前名单。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认导入 10 人' }))
    expect(screen.getByText('当前名单：培训人员示例.csv')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '当前培训人员名单' })).toBeInTheDocument()
  })

  it('可从 CSV 文件导入人员，且人员档案不含任务角色', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '培训人员与分组' }))
    const file = new File([
      '人员编号,姓名,单位,部门,专业方向,联系方式,分组\n',
      'P01,刘老师,示范职业学院,信息系,软件技术,13800000001,第 1 组\n',
      'P02,何老师,示范职业学院,艺术系,视觉设计,13800000002,第 1 组',
    ], '新培训名单.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('选择培训人员 CSV'), file)
    expect(await screen.findByText('新培训名单.csv')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.includes('识别 2 人、1 个小组') === true)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认导入 2 人' }))
    expect(screen.getByText('当前名单：新培训名单.csv')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '当前演示人员' })).toHaveValue('P01')
  })

  it('后两天选修可以多选、每天至少一项且不能跨天重复', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^任务清单$/ }))
    await user.click(screen.getByRole('button', { name: /选修任务库/ }))
    await user.click(screen.getByRole('button', { name: /课程改进 · E03 \+ E04/ }))
    expect(screen.getByText('两天选修任务已满足最低要求')).toBeInTheDocument()

    const e05Card = screen.getByRole('heading', { name: '课程目标与岗位能力映射网页' }).closest('article')!
    await user.click(within(e05Card).getByRole('button', { name: '加入第二天' }))
    expect(within(e05Card).getByRole('button', { name: '已在第二天' })).toBeDisabled()
    expect(screen.getByText('第二天：E03、E05；第三天：E04。所有选择已同步到对应 DAY 和成果中心。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /DAY 2/ }))
    expect(screen.getByRole('heading', { name: '第二天已选 2 项任务' })).toBeInTheDocument()
    expect(screen.getByText(/E03 · AI 辅助教学反思与评课/)).toBeInTheDocument()
    expect(screen.getByText(/E05 · 课程目标与岗位能力映射网页/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /DAY 3/ }))
    expect(screen.getByRole('heading', { name: '第三天已选 1 项任务' })).toBeInTheDocument()
    expect(screen.getByText(/E04 · AI 辅助课程知识图谱设计/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '调整第三天选修' }))
    await user.click(screen.getByRole('button', { name: '从第三天移除 E04' }))
    expect(screen.getByRole('alert')).toHaveTextContent('第三天尚未选择任务')
    expect(screen.getByText('请为第二天和第三天各选择至少 1 项')).toBeInTheDocument()
    expect(screen.getByText('第二天：E03、E05；第三天：未选择。所有选择已同步到对应 DAY 和成果中心。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /DAY 3/ }))
    expect(screen.getByRole('heading', { name: '第三天选修尚未配置' })).toBeInTheDocument()
    expect(screen.getByText('未满足最低要求')).toBeInTheDocument()
  })

  it('选择判断和填写依据后实时更新分项完成数', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /开始第一个任务/ }))
    await user.click(screen.getByRole('button', { name: /开始 AI 提问/ }))
    await user.click(screen.getByRole('button', { name: /生成全部演示回答/ }))
    await user.click(screen.getByRole('button', { name: /进入标注核验/ }))
    await user.click(screen.getByRole('button', { name: /载入参考标注/ }))

    expect(screen.getAllByText('4', { selector: '.verification-progress strong' })).toHaveLength(3)
    expect(screen.getAllByText('完整核验')).toHaveLength(1)

    const firstEvidence = screen.getAllByRole('textbox')[0]
    await user.clear(firstEvidence)
    expect(screen.getByText('判断 4/4，具体依据 3/4')).toBeInTheDocument()
    expect(screen.getByText(/还需 6 个字/)).toBeInTheDocument()

    await user.type(firstEvidence, '教育部官方网站')
    expect(screen.getByText('判断 4/4，具体依据 4/4')).toBeInTheDocument()
    expect(screen.getAllByText(/依据已记录/)).toHaveLength(4)
  })

  it('可从待补项目直接定位到其他回答的缺失标注', async () => {
    const user = userEvent.setup()
    const progress = createInitialProgress()
    progress.route = 'verification'
    progress.annotations = [{
      id: 'missing-b-judgment',
      answerId: 'B',
      start: 3,
      end: 13,
      text: '职业院校课堂教学',
      type: 'rule',
      evidenceSource: '教育部官方网站',
    }]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    setPortalRoute({ page: 'task', taskId: 'M01' })
    render(<App />)

    const locator = screen.getByRole('button', { name: /定位回答 B 的标注/ })
    expect(locator).toHaveTextContent('未选择判断')
    await user.click(locator)

    expect(screen.getByRole('tab', { name: /B\s+课堂安全/ })).toHaveClass('active')
    expect(document.getElementById('judgment-missing-b-judgment')).toHaveClass('needs-attention')
  })

  it('教师修订页不展示判断为需删除的内容，并可返回对应回答调整判断', async () => {
    const user = userEvent.setup()
    const progress = createInitialProgress()
    progress.route = 'corrections'
    progress.annotations = [
      { id: 'delete-item', answerId: 'A', start: 0, end: 6, text: '应当删除的内容', type: 'rule', judgment: 'delete', evidenceSource: '教育部官方网站' },
      { id: 'adopt-item-a1', answerId: 'A', start: 7, end: 13, text: '可以采用的内容一', type: 'rule', judgment: 'adopt', evidenceSource: '教育部官方网站' },
      { id: 'adopt-item-a2', answerId: 'A', start: 14, end: 20, text: '可以采用的内容二', type: 'rule', judgment: 'adopt', evidenceSource: '教育部官方网站' },
      { id: 'revise-item', answerId: 'B', start: 0, end: 6, text: '应当修正的内容', type: 'safety-step', judgment: 'revise', evidenceSource: '权威急救操作规范' },
      { id: 'limit-item', answerId: 'D', start: 0, end: 6, text: '应当限定的内容', type: 'absolute-conclusion', judgment: 'limit', evidenceSource: '教育评价基本原则' },
    ]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    setPortalRoute({ page: 'task', taskId: 'M01' })
    render(<App />)

    expect(screen.queryByText('应当删除的内容')).not.toBeInTheDocument()
    expect(screen.getByText('应当修正的内容')).toBeInTheDocument()
    expect(screen.getByText('应当限定的内容')).toBeInTheDocument()
    expect(screen.getByText('当前 3 处，其中需删除 1 处')).toBeInTheDocument()
    expect(screen.getByText('需修正或需限定 2 处；需删除不进入本步骤')).toBeInTheDocument()
    expect(screen.getByText('无需教师修正')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看回答 B 的核验判断' }))
    expect(screen.getByRole('tab', { name: /B\s+课堂安全/ })).toHaveClass('active')
  })

  it('小组复核成果由前一步完整教师修正动态生成', async () => {
    const user = userEvent.setup()
    const progress = createInitialProgress()
    progress.route = 'group-review'
    progress.annotations = [{
      id: 'dynamic-b-correction',
      answerId: 'B',
      start: 0,
      end: 8,
      text: '动态生成的原内容',
      type: 'safety-step',
      judgment: 'revise',
      evidenceSource: '权威急救操作规范',
    }]
    progress.corrections = {
      'dynamic-b-correction': {
        annotationId: 'dynamic-b-correction',
        problemType: '错误步骤',
        revisedContent: '动态生成的教师修正内容',
        reason: '依据规范调整错误操作步骤',
      },
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    setPortalRoute({ page: 'task', taskId: 'M01' })
    render(<App />)

    expect(screen.getByText('已从上一步动态生成 1 份完整成果')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /王老师/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /李老师/ })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /被复核成员/ }), 'T003')
    await user.selectOptions(screen.getByRole('combobox', { name: /关联修正成果/ }), 'dynamic-b-correction')

    expect(screen.getByText('动态生成的原内容')).toBeInTheDocument()
    expect(screen.getByText('动态生成的教师修正内容')).toBeInTheDocument()
    expect(screen.getByText('依据规范调整错误操作步骤')).toBeInTheDocument()
  })

  it('小组复核所有必填字段非空即可提交，并明确显示真实待补项', async () => {
    const user = userEvent.setup()
    const progress = createInitialProgress()
    progress.route = 'group-review'
    progress.annotations = [{ id: 'short-review', answerId: 'B', start: 0, end: 8, text: '需要复核的原内容', type: 'safety-step', judgment: 'revise', evidenceSource: '权威急救操作规范' }]
    progress.corrections = { 'short-review': { annotationId: 'short-review', problemType: '错误步骤', revisedContent: '教师已经修正内容', reason: '依据规范调整步骤' } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    setPortalRoute({ page: 'task', taskId: 'M01' })
    render(<App />)

    expect(screen.getByRole('alert')).toHaveTextContent('请先确认本次复核承担的角色')
    expect(screen.getByRole('button', { name: '提交复核' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: '提交复核' }))
    expect(screen.getByText('已列出未满足项，请补充后再次提交')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: /本次承担角色/ }), '核验员')
    await user.selectOptions(screen.getByRole('combobox', { name: /被复核成员/ }), 'T003')
    await user.selectOptions(screen.getByRole('combobox', { name: /关联修正成果/ }), 'short-review')
    await user.selectOptions(screen.getByRole('combobox', { name: /依据是否准确/ }), '准确')
    await user.selectOptions(screen.getByRole('combobox', { name: /修正是否合理/ }), '合理')
    await user.type(screen.getByRole('textbox', { name: /复核建议/ }), '建议')
    await user.type(screen.getByRole('textbox', { name: '第8项核验项' }), '隐私')
    await user.type(screen.getByRole('textbox', { name: '第8项核验要点' }), '学号')
    await user.type(screen.getByRole('textbox', { name: '第8项典型幻觉' }), '编造')
    await user.type(screen.getByRole('textbox', { name: '第8项应对方式' }), '删除')

    expect(screen.getByRole('button', { name: '提交复核' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: '提交复核' }))
    expect(screen.getAllByText('复核记录已提交')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /查看评分与成果/ })).toBeEnabled()
  })

  it('切换当前人员后旧复核提交失效并要求重新选择对象', async () => {
    const user = userEvent.setup()
    const progress = createInitialProgress()
    progress.route = 'group-review'
    progress.groupReview = { reviewerRole: '核验员', targetUserId: 'T003', correctionAnnotationId: 'dynamic-b-correction', evidenceAccurate: '准确', correctionReasonable: '合理', omissions: '', suggestion: '建议补充权威来源记录', submitted: true }
    progress.annotations = [{ id: 'dynamic-b-correction', answerId: 'B', start: 0, end: 8, text: '动态生成的原内容', type: 'safety-step', judgment: 'revise', evidenceSource: '权威急救操作规范' }]
    progress.corrections = { 'dynamic-b-correction': { annotationId: 'dynamic-b-correction', problemType: '错误步骤', revisedContent: '动态生成的教师修正内容', reason: '依据规范调整错误操作步骤' } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    setPortalRoute({ page: 'participants' })
    render(<App />)

    await user.selectOptions(screen.getByRole('combobox', { name: '当前演示人员' }), 'T007')
    await user.click(screen.getByRole('button', { name: /^任务清单$/ }))
    await user.click(screen.getByRole('button', { name: /DAY 1/ }))
    const m01Card = screen.getByText('M01').closest('.training-task-card')
    expect(m01Card).not.toBeNull()
    await user.click(within(m01Card as HTMLElement).getByRole('button', { name: /开始任务|继续任务|查看成果/ }))
    expect(screen.getByRole('heading', { name: '确认角色，交叉复核一份组员成果' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /本次承担角色/ })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: /被复核成员/ })).toHaveValue('')
    expect(screen.queryByText('复核记录已提交')).not.toBeInTheDocument()
  })
})
