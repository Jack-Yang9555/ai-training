import type {
  ElectiveTaskId,
  PortfolioDefinition,
  TaskStepDefinition,
  TaskGroupDefinition,
  TrainingTaskDefinition,
  TrainingTaskId,
} from './types'

export const m01Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'answers', label: 'AI 提问', number: '02' },
  { id: 'verification', label: '标注核验', number: '03' },
  { id: 'corrections', label: '教师修正', number: '04' },
  { id: 'group-review', label: '小组复核', number: '05' },
  { id: 'result', label: '评分与成果', number: '06' },
]

export const m02Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'run', label: '多模型运行', number: '02' },
  { id: 'compliance', label: '遵循检查', number: '03' },
  { id: 'rating', label: '盲评与选择修正', number: '04' },
  { id: 'peer-review', label: '小组共评', number: '05' },
  { id: 'result', label: '评分与成果', number: '06' },
]

export const m03Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'design', label: 'AI 对话仿写', number: '02' },
  { id: 'v1', label: '生成第一版练习包', number: '03' },
  { id: 'iteration', label: '单变量迭代', number: '04' },
  { id: 'compare', label: '比较与核验', number: '05' },
  { id: 'peer-review', label: '小组互评', number: '06' },
  { id: 'result', label: '评分与成果', number: '07' },
]

export const m04Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'input', label: '输入确认', number: '02' },
  { id: 'draft', label: 'AI 草稿', number: '03' },
  { id: 'audit', label: '人工审校', number: '04' },
  { id: 'peer-review', label: '小组互评', number: '05' },
  { id: 'confirmation', label: '教师确认版', number: '06' },
  { id: 'result', label: '评分与成果', number: '07' },
]

export const m05Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'input', label: '命题输入', number: '02' },
  { id: 'draft', label: 'AI 题目包', number: '03' },
  { id: 'audit', label: '逐题审校', number: '04' },
  { id: 'revision', label: '人工修订', number: '05' },
  { id: 'peer-review', label: '互评与确认', number: '06' },
  { id: 'result', label: '评分与成果', number: '07' },
]

export const m06Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'input', label: '制作输入', number: '02' },
  { id: 'deck', label: '课件核验', number: '03' },
  { id: 'narration', label: '讲解稿核验', number: '04' },
  { id: 'avatar-video', label: '数字人与成片', number: '05' },
  { id: 'review-confirm', label: '互评与确认', number: '06' },
  { id: 'result', label: '评分与成果', number: '07' },
]

export const m07Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'input', label: '分析输入', number: '02' },
  { id: 'data-check', label: '数据检查', number: '03' },
  { id: 'statistics', label: '统计与复算', number: '04' },
  { id: 'analysis', label: '结论审校', number: '05' },
  { id: 'layering-review', label: '分层与复核', number: '06' },
  { id: 'result', label: '评分与成果', number: '07' },
]

export const m08Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'input', label: '用途与材料', number: '02' },
  { id: 'draft', label: 'AI 原始网页', number: '03' },
  { id: 'iterations', label: '两轮迭代', number: '04' },
  { id: 'browser-test', label: '下载与测试', number: '05' },
  { id: 'peer-confirm', label: '学生测试与确认', number: '06' },
  { id: 'result', label: '评分与成果', number: '07' },
]

export const m09Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'sources', label: '来源登记', number: '02' },
  { id: 'quality', label: '逐份质检', number: '03' },
  { id: 'build', label: '建立 v0', number: '04' },
  { id: 'first-test', label: '9 项首测', number: '05' },
  { id: 'correction-retest', label: '修正与同题复测', number: '06' },
  { id: 'peer-confirm', label: '小组测试与确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const m10Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'source', label: '绑定知识库', number: '02' },
  { id: 'configuration', label: '六要素配置', number: '03' },
  { id: 'flow', label: '四步回答流程', number: '04' },
  { id: 'boundaries', label: '五类边界规则', number: '05' },
  { id: 'preview', label: '双场景预览', number: '06' },
  { id: 'review-confirm', label: '互评修改与确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const m11Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'pairing', label: '双向测试配对', number: '02' },
  { id: 'first-test', label: '五类问题首测', number: '03' },
  { id: 'audit', label: '逐题行为标注', number: '04' },
  { id: 'revision', label: '规则实质修改', number: '05' },
  { id: 'retest', label: '同题复测', number: '06' },
  { id: 'confirmation', label: '教师确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const m12Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'evidence', label: '10 类成果', number: '02' },
  { id: 'orchestration', label: '三阶段编排', number: '03' },
  { id: 'correction', label: '错误修正', number: '04' },
  { id: 'assistant', label: '助教双场景', number: '05' },
  { id: 'integration', label: '联调修改复测', number: '06' },
  { id: 'safety', label: '安全展示确认', number: '07' },
  { id: 'result', label: '结果与成果', number: '08' },
]

export const e01Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'input', label: '样例与目标', number: '02' },
  { id: 'rubric', label: '四维量规', number: '03' },
  { id: 'ai-review', label: '五份试评', number: '04' },
  { id: 'teacher-review', label: '逐份复核与复测', number: '05' },
  { id: 'peer-confirm', label: '同组复核与确认', number: '06' },
  { id: 'result', label: '评分与成果', number: '07' },
]

export const e02Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'source', label: '任务与规范', number: '02' },
  { id: 'draft', label: '任务书草稿', number: '03' },
  { id: 'safety-rubric', label: '安全与量规', number: '04' },
  { id: 'peer-review', label: '同组复核', number: '05' },
  { id: 'teacher-revision', label: '教师修正', number: '06' },
  { id: 'confirmation', label: '最终确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const e03Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'source', label: '课堂记录', number: '02' },
  { id: 'findings', label: '三条发现', number: '03' },
  { id: 'measures', label: '两项措施', number: '04' },
  { id: 'peer-review', label: '同组互评', number: '05' },
  { id: 'revision', label: '教师修正', number: '06' },
  { id: 'confirmation', label: '最终确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const e04Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'source', label: '课程来源', number: '02' },
  { id: 'nodes', label: '知识节点', number: '03' },
  { id: 'relations', label: '关系建模', number: '04' },
  { id: 'graph-review', label: '图谱复核', number: '05' },
  { id: 'revision', label: '人工修正', number: '06' },
  { id: 'confirmation', label: '最终确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const e05Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'source', label: '课程与岗位来源', number: '02' },
  { id: 'mapping', label: '目标能力映射', number: '03' },
  { id: 'suggestions', label: '差距与建议', number: '04' },
  { id: 'peer-review', label: '同组复核', number: '05' },
  { id: 'revision', label: '教师修正', number: '06' },
  { id: 'confirmation', label: '最终确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const e06Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '任务说明', number: '01' },
  { id: 'question', label: '教研问题', number: '02' },
  { id: 'review', label: '文献梳理', number: '03' },
  { id: 'comparison', label: '观点对比', number: '04' },
  { id: 'peer-review', label: '同组核验', number: '05' },
  { id: 'revision', label: '引用修正', number: '06' },
  { id: 'confirmation', label: '最终确认', number: '07' },
  { id: 'result', label: '评分与成果', number: '08' },
]

export const g01Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '说明与基线', number: '01' },
  { id: 'directory', label: '成果目录', number: '02' },
  { id: 'errors', label: '错误修正', number: '03' },
  { id: 'cross-checks', label: '交叉检查', number: '04' },
  { id: 'checklist', label: '清单与贡献', number: '05' },
  { id: 'assessment', label: '阶段验收', number: '06' },
]

export const g02Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '里程碑说明', number: '01' },
  { id: 'directory', label: '成果目录', number: '02' },
  { id: 'showcase', label: '展示与互动', number: '03' },
  { id: 'feedback', label: '跨组反馈', number: '04' },
  { id: 'revision', label: '修改与贡献', number: '05' },
  { id: 'assessment', label: '小组验收', number: '06' },
]

export const g03Steps: TaskStepDefinition[] = [
  { id: 'overview', label: '里程碑说明', number: '01' },
  { id: 'matrix', label: '双向测试矩阵', number: '02' },
  { id: 'issues', label: '问题与修正', number: '03' },
  { id: 'scenarios', label: '三场景演示', number: '04' },
  { id: 'showcase', label: '两轮展示答问', number: '05' },
  { id: 'contributions', label: '成员贡献确认', number: '06' },
  { id: 'assessment', label: '阶段验收', number: '07' },
]

const tasks: TrainingTaskDefinition[] = [
  { id: 'M01', title: '大模型幻觉识别与内容核验', kind: 'mandatory', duration: 45, difficulty: '入门', collaboration: '个人判断、小组复核', description: '核验事实、引用、安全步骤与结论边界，建立 AI 内容必须经教师核验后使用的意识。', outputs: ['AI 生成内容核验记录', '教师修正对照表', '小组核验清单'], capability: 'AI 基础认知', recommendedAfter: [], contentStatus: 'implemented', steps: m01Steps },
  { id: 'M02', title: '多模型教学结果对比与选择', kind: 'mandatory', duration: 45, difficulty: '入门', collaboration: '个人评分、小组共评', description: '在相同材料和提示词条件下比较多个模型，基于证据选择适合当前教学任务的结果。', outputs: ['任务遵循检查记录', '五维对比评分表', '模型选择与人工修正记录', '小组模型对比结论'], capability: 'AI 基础认知', recommendedAfter: ['M01'], contentStatus: 'implemented', steps: m02Steps },
  { id: 'M03', title: '结构化提示词设计与迭代', kind: 'mandatory', duration: 60, difficulty: '入门', collaboration: '个人完成、小组互评', description: '按照角色/任务、背景、输入、约束、输出格式、质量标准六格形成可复用提示词，并完成一次可解释的单变量迭代。', outputs: ['提示词 V1', '提示词 V2', '两个版本的变化说明'], capability: '提示词与多模态', recommendedAfter: ['M02'], contentStatus: 'implemented', steps: m03Steps },
  { id: 'M04', title: 'AI 辅助教案编制', kind: 'mandatory', duration: 105, difficulty: '应用', collaboration: '个人主作、小组互评', description: '围绕一节课形成目标、活动、评价与分层支持对应的结构化教案，经人工审校形成教师确认版。', outputs: ['AI 教案草稿', '教案人工审校记录', '教师确认版教案'], capability: '教学融合', recommendedAfter: ['M03'], contentStatus: 'implemented', steps: m04Steps },
  { id: 'M05', title: 'AI 辅助命题与审校', kind: 'mandatory', duration: 75, difficulty: '应用', collaboration: '个人主作、小组互评', description: '基于课程目标与材料生成规定题型的 8 道题，逐题核验答案、解析、依据和评分要点，形成人工修订后的教师确认题目包。', outputs: ['课堂题目包', '题目核验依据与修改记录'], capability: '教学融合', recommendedAfter: ['M04'], contentStatus: 'implemented', steps: m05Steps },
  { id: 'G01', title: '教学设计与命题成果验收', kind: 'milestone', duration: 30, difficulty: '应用', collaboration: '小组共创', description: '复核每位成员 M01—M05 的可信使用、模型比较、提示词、教案和题目包成果，完成交叉检查、五类核验清单和贡献留痕。', outputs: ['教学设计与命题成果目录', 'AI 教学内容核验清单', '个人贡献记录'], capability: '阶段验收', recommendedAfter: ['M01', 'M02', 'M03', 'M04', 'M05'], contentStatus: 'implemented', steps: g01Steps },
  { id: 'M06', title: 'AI 辅助课件与数字人微课制作', kind: 'mandatory', duration: 120, difficulty: '应用', collaboration: '个人主作、A/B/C 三批轮转、小组互评', description: '制作并人工核验 6—8 页课件、150—180 字讲解稿和 45—60 秒数字人微课，形成教师确认组合成果。', outputs: ['AI 课件与数字人微课成果'], capability: '提示词与多模态', recommendedAfter: ['G01'], contentStatus: 'implemented', steps: m06Steps },
  { id: 'M07', title: 'AI 辅助成绩分析与分层教学设计', kind: 'mandatory', duration: 60, difficulty: '应用', collaboration: '个人主作、小组数字复核', description: '使用 A01—A20 匿名虚拟数据复核统计结果，审校 AI 结论边界，形成补强、巩固、拓展三个临时学习任务。', outputs: ['学情分析与分层学习任务'], capability: '教学融合', recommendedAfter: ['M06'], contentStatus: 'implemented', steps: m07Steps },
  { id: 'M08', title: '交互式教学网页生成与优化', kind: 'mandatory', duration: 90, difficulty: '应用', collaboration: '个人主作、小组测试', description: '生成含 3—5 张知识卡、5 道即时反馈题和至少 1 个互动的离线单文件网页，经两轮教师迭代、双端测试和同组学生测试修正后确认归档。', outputs: ['交互式教学网页'], capability: '提示词与多模态', recommendedAfter: ['M06'], contentStatus: 'implemented', steps: m08Steps },
  { id: 'G02', title: '多模态教学成果展示与互评', kind: 'milestone', duration: 30, difficulty: '应用', collaboration: '小组共创', description: '聚合 M06 课件与视频、M08 互动网页和首个选修成果，完成一页式展示、在线互动、跨组反馈修改和全员贡献确认。', outputs: ['小组多模态教学成果展示页', '同伴反馈与修改记录', '成员贡献清单'], capability: '阶段验收', recommendedAfter: ['M06', 'M08'], contentStatus: 'implemented', steps: g02Steps },
  { id: 'M09', title: '课程知识库建设与测试', kind: 'mandatory', duration: 75, difficulty: '应用', collaboration: '个人主作、小组测试', description: '登记并逐项质检 2—5 份课程资料，建立可追溯来源索引，以同一组 5 道有据题和 4 道边界题完成首测、实质修正与复测，经同组测试和教师确认形成 v1.0。', outputs: ['课程知识库 v1.0 及来源清单', '课程知识库 9 项问答测试报告和修正记录'], capability: '知识库与智能体', recommendedAfter: ['G02'], contentStatus: 'implemented', steps: m09Steps },
  { id: 'M10', title: '课程 AI 助教配置', kind: 'mandatory', duration: 75, difficulty: '应用', collaboration: '个人主作、小组互评', description: '绑定当前有效课程知识库，完成角色、对象、任务、知识、流程、边界六要素和五类异常规则配置，经双场景预览、同组互评及人工修改形成教师确认版助教。', outputs: ['课程 AI 助教 v1.0', '六要素配置表、边界规则清单和配置修改记录'], capability: '知识库与智能体', recommendedAfter: ['M09'], contentStatus: 'implemented', steps: m10Steps },
  { id: 'M11', title: '学生答疑功能测试与优化', kind: 'mandatory', duration: 60, difficulty: '应用', collaboration: '小组交叉测试', description: '以学生视角连续测试正常、含糊、越界、代做、安全与评价五类问题，逐题定位缺陷并完成规则实质修改和同题复测。', outputs: ['5 类问题的首轮答疑测试、规则修改说明与复测记录', '课程助教修改说明'], capability: '知识库与智能体', recommendedAfter: ['M10'], contentStatus: 'implemented', steps: m11Steps },
  { id: 'M12', title: 'AI 教学成果综合应用', kind: 'mandatory', duration: 60, difficulty: '综合', collaboration: '个人组装、小组展示', description: '将课前、课中、课后成果整合为可演示的教学闭环，说明 AI 边界与教师责任。', outputs: ['成果目录', '使用说明', '人工修改记录'], capability: '教学融合', recommendedAfter: ['M11'], contentStatus: 'implemented', steps: m12Steps },
  { id: 'G03', title: '课程知识库与 AI 助教综合测试及展示', kind: 'milestone', duration: 30, difficulty: '验收', collaboration: '小组共创', description: '汇总 M09—M11 的双向测试、问题修正与复测证据，完成有据回答、条件追问、越界转交三场景演示、A/B 两轮展示答问和全员贡献确认。', outputs: ['课程知识库与 AI 助教综合测试报告', '3 分钟核心演示和 2 分钟在线答问记录', '成员角色与贡献清单'], capability: '阶段验收', recommendedAfter: ['M09', 'M10', 'M11', 'M12'], contentStatus: 'implemented', steps: g03Steps },
  { id: 'E01', title: 'AI 辅助批改与个性化反馈', kind: 'elective', duration: 60, difficulty: '应用', collaboration: '个人主作、小组复核', description: '用同一四维量规完成 A01—A05 五份匿名作业试评，逐份核验证据和反馈，经关联修正、同题复测、同组复核与教师确认形成可追溯成果。', outputs: ['评分量规', '5 份批改结果与个性化反馈'], capability: '教学融合', recommendedAfter: ['M08'], contentStatus: 'implemented', steps: e01Steps },
  { id: 'E02', title: '实训任务书与评分量规设计', kind: 'elective', duration: 60, difficulty: '应用', collaboration: '个人主作、小组复核', description: '依据已审核虚构规范拆解职业实训任务，逐步核对完成证据和安全条款，修正操作顺序、安全检查与分值闭合问题，形成教师确认的任务书、检查单和 100 分量规。', outputs: ['实训任务书', '安全检查单', '100 分评分量规'], capability: '教学融合', recommendedAfter: ['M08'], contentStatus: 'implemented', steps: e02Steps },
  { id: 'E03', title: 'AI 辅助教学反思与评课', kind: 'elective', duration: 60, difficulty: '应用', collaboration: '个人主作、小组互评', description: '只依据匿名课堂记录形成恰好 3 条可追溯发现，区分观察事实与待确认解释，经同组互评和人工修正形成恰好 2 项下一次课可执行、可观察的改进措施。', outputs: ['教学反思或评课记录', '下一次课改进清单'], capability: '研究创新', recommendedAfter: ['M08'], contentStatus: 'implemented', steps: e03Steps },
  { id: 'E04', title: 'AI 辅助课程知识图谱设计', kind: 'elective', duration: 60, difficulty: '综合', collaboration: '个人主作、小组复核', description: '从已登记课程来源提取不少于 15 个节点和 20 条有向关系，以同一数据驱动节点表、关系表与可视图，经方向及遗漏复核完成至少 2 处人工修正。', outputs: ['课程知识图谱', '节点与关系列表', '人工修正记录'], capability: '研究创新', recommendedAfter: ['M08'], contentStatus: 'implemented', steps: e04Steps },
  { id: 'E05', title: '课程目标与岗位能力映射网页', kind: 'elective', duration: 60, difficulty: '综合', collaboration: '个人主作、小组复核', description: '依据已登记课程目标与岗位任务证据建立可追溯映射，识别覆盖差距，经同组复核和教师修正形成网页化成果。', outputs: ['课程—岗位能力映射网页', '差距与改进建议清单'], capability: '研究创新', recommendedAfter: ['M08'], contentStatus: 'implemented', steps: e05Steps },
  { id: 'E06', title: '教研文献梳理与引用核验', kind: 'elective', duration: 60, difficulty: '应用', collaboration: '个人主作、小组核验', description: '围绕明确教研问题梳理已登记文献观点，比较异同并逐条核验引用，经同组核验和教师修正形成可复核成果。', outputs: ['文献梳理表', '观点对比表', '引用核验记录'], capability: '研究创新', recommendedAfter: ['M08'], contentStatus: 'implemented', steps: e06Steps },
]

export const trainingTasks = Object.fromEntries(tasks.map((task) => [task.id, task])) as Record<TrainingTaskId, TrainingTaskDefinition>
export const electiveTaskIds = tasks.filter((task) => task.kind === 'elective').map((task) => task.id) as ElectiveTaskId[]

export const taskGroups: TaskGroupDefinition[] = [
  { id: 'day-1', label: '第一天', code: 'DAY 1', kind: 'sequence', focus: 'AI 可信使用、教学设计与命题', summary: '形成可信使用基础、教师确认版教案和课堂题目包，并完成阶段验收。', items: [
    { id: 'd1-m01', taskId: 'M01', scheduleLabel: '09:30—10:15', duration: 45 }, { id: 'd1-m02', taskId: 'M02', scheduleLabel: '10:15—11:00', duration: 45 }, { id: 'd1-m03', taskId: 'M03', scheduleLabel: '11:00—12:00', duration: 60 }, { id: 'd1-m04', taskId: 'M04', scheduleLabel: '14:00—15:45', duration: 105 }, { id: 'd1-m05', taskId: 'M05', scheduleLabel: '15:45—17:00', duration: 75 }, { id: 'd1-g01', taskId: 'G01', scheduleLabel: '17:00—17:30', duration: 30 },
  ] },
  { id: 'day-2', label: '第二天', code: 'DAY 2', kind: 'sequence', focus: '多模态教学资源、学情分析与成果展示', summary: '完成课件与微课、匿名学情分析、交互网页、本组第 1 项选修和多模态互评。', items: [
    { id: 'd2-m06', taskId: 'M06', scheduleLabel: '09:30—11:30', duration: 120 }, { id: 'd2-m07', taskId: 'M07', scheduleLabel: '11:30—12:30', duration: 60 }, { id: 'd2-m08', taskId: 'M08', scheduleLabel: '14:00—15:30', duration: 90 }, { id: 'd2-e1', electiveBucketId: 'day-2', scheduleLabel: '15:30 起', duration: 60 }, { id: 'd2-g02', taskId: 'G02', scheduleLabel: '16:30—17:00', duration: 30 },
  ] },
  { id: 'day-3', label: '第三天', code: 'DAY 3', kind: 'sequence', focus: '课程知识库、AI 助教与综合应用', summary: '完成知识库、AI 助教、答疑测试、本组第 2 项选修和三日成果的综合应用验收。', items: [
    { id: 'd3-m09', taskId: 'M09', scheduleLabel: '09:30—10:45', duration: 75 }, { id: 'd3-m10', taskId: 'M10', scheduleLabel: '10:45—12:00', duration: 75 }, { id: 'd3-m11', taskId: 'M11', scheduleLabel: '14:00—15:00', duration: 60 }, { id: 'd3-e2', electiveBucketId: 'day-3', scheduleLabel: '15:00 起', duration: 60 }, { id: 'd3-m12', taskId: 'M12', scheduleLabel: '16:00—17:00', duration: 60 }, { id: 'd3-g03', taskId: 'G03', scheduleLabel: '17:00—17:30', duration: 30 },
  ] },
  {
    id: 'elective-pool',
    label: '选修任务库',
    code: 'ELECTIVES',
    kind: 'selection',
    focus: '每组选择两项并确定执行顺序',
    summary: '每个教研组从 E01—E06 中共同选择两个不同任务，第 1 项安排在第二天、第 2 项安排在第三天；选择变更后，每位组员都需重新确认本人执行顺序。',
    items: electiveTaskIds.map((taskId) => ({ id: `pool-${taskId}`, taskId, scheduleLabel: '选修任务', duration: trainingTasks[taskId].duration })),
    selectionRule: {
      minimumPerBucket: 1,
      buckets: [{ id: 'day-2', label: '第二天' }, { id: 'day-3', label: '第三天' }],
      recommendations: [
        { label: '教学评价', taskIds: ['E01', 'E02'] },
        { label: '课程改进', taskIds: ['E03', 'E04'] },
        { label: '专业发展', taskIds: ['E05', 'E06'] },
      ],
    },
  },
]

export const portfolioDefinitions: PortfolioDefinition[] = [
  { id: 'lesson-plan', name: '教师教案', source: 'M04', quantity: '1 份' },
  { id: 'question-pack', name: '课堂题目包', source: 'M05', quantity: '1 套（8 道）' },
  { id: 'multimodal', name: 'AI 课件与数字人微课成果', source: 'M06', quantity: '1 套' },
  { id: 'learning-analysis', name: '学情分析与分层学习任务', source: 'M07', quantity: '1 份' },
  { id: 'interactive-web', name: '交互式教学网页', source: 'M08', quantity: '1 个' },
  { id: 'knowledge-base', name: '课程知识库和来源清单', source: 'M09', quantity: '1 套' },
  { id: 'assistant', name: '课程 AI 助教', source: 'M10', quantity: '1 个' },
  { id: 'qa-test', name: '答疑测试、规则修改与复测记录', source: 'M11', quantity: '1 份' },
  { id: 'elective-day-2', name: '第二天个人选修成果', source: 'elective-day-2', quantity: '组内第 1 项' },
  { id: 'elective-day-3', name: '第三天个人选修成果', source: 'elective-day-3', quantity: '组内第 2 项' },
]

export const requiredTaskIds = tasks.filter((task) => task.kind === 'mandatory').map((task) => task.id)
export const milestoneTaskIds = tasks.filter((task) => task.kind === 'milestone').map((task) => task.id)
