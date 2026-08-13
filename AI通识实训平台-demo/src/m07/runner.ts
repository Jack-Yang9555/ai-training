import { m07Dataset } from './data'
import type { M07AnalysisDraft, M07Input, M07LayerTask, M07Metric, M07StudentRecord } from './domain'

function round(value: number) { return Math.round(value * 10) / 10 }
function average(values: number[]) { return round(values.reduce((sum, value) => sum + value, 0) / values.length) }
function percentage(count: number, total: number) { return round(count / total * 100) }
function stableId(prefix: string, value: unknown) { const source = JSON.stringify(value); let hash = 0; for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) >>> 0; return `${prefix}-${hash.toString(16).padStart(8, '0')}` }

export function calculateM07Metrics(records: M07StudentRecord[] = m07Dataset): M07Metric[] {
  const quiz2 = records.flatMap((item) => item.quiz2 === null ? [] : [item.quiz2])
  const combined = records.map((item) => item.quiz2 === null ? item.quiz1 : (item.quiz1 + item.quiz2) / 2)
  const bands = { high: combined.filter((value) => value >= 85).length, middle: combined.filter((value) => value >= 70 && value < 85).length, foundation: combined.filter((value) => value < 70).length }
  const metrics: M07Metric[] = [
    { id: 'quiz1-average', label: '测验一平均分', value: average(records.map((item) => item.quiz1)), unit: '分', sampleSize: records.length, calculation: '20 人测验一总分 ÷ 20' },
    { id: 'quiz2-average', label: '测验二平均分', value: average(quiz2), unit: '分', sampleSize: quiz2.length, calculation: '19 个有效测验二分数总和 ÷ 19；A20 缺失不补写' },
    { id: 'band-high', label: '85 分及以上', value: bands.high, unit: '人', sampleSize: records.length, calculation: '两次测验有效均分 ≥ 85 的人数' },
    { id: 'band-middle', label: '70—84.9 分', value: bands.middle, unit: '人', sampleSize: records.length, calculation: '两次测验有效均分在 70—84.9 的人数' },
    { id: 'band-foundation', label: '70 分以下', value: bands.foundation, unit: '人', sampleSize: records.length, calculation: '两次测验有效均分 < 70 的人数' },
    ...(['kp1','kp2','kp3','kp4'] as const).map((key, index) => ({ id: `kp${index + 1}-accuracy`, label: `知识点 ${index + 1} 正确率`, value: percentage(records.filter((item) => item[key]).length, records.length), unit: '%' as const, sampleSize: records.length, calculation: `知识点 ${index + 1} 答对人数 ÷ 20 × 100%` })),
    { id: 'practical-average', label: '实操任务平均分', value: average(records.map((item) => item.practicalScore)), unit: '分', sampleSize: records.length, calculation: '20 人实操任务总分 ÷ 20' },
    { id: 'homework-completion', label: '作业完成率', value: percentage(records.filter((item) => item.homeworkCompleted).length, records.length), unit: '%', sampleSize: records.length, calculation: '完成作业人数 ÷ 20 × 100%' },
  ]
  return metrics
}

export class LocalM07AnalysisRunner {
  async run(input: M07Input): Promise<{ draft: M07AnalysisDraft; layerTasks: M07LayerTask[] }> {
    const metrics = calculateM07Metrics()
    const kp3 = metrics.find((item) => item.id === 'kp3-accuracy')!
    const draft: M07AnalysisDraft = {
      draftId: stableId('m07-draft', input), generatedAt: new Date().toISOString(), metrics,
      aiConclusions: [
        { id: 'weak-kp3', aiText: `知识点 3 正确率为 ${kp3.value}%，是四个知识点中最低，可作为本轮共同补强重点。`, evidenceMetricIds: ['kp1-accuracy','kp2-accuracy','kp3-accuracy','kp4-accuracy'], requiredJudgment: '结论有据' },
        { id: 'attitude-claim', aiText: '未完成作业的学生学习态度消极。', evidenceMetricIds: ['homework-completion'], requiredJudgment: '结论无据' },
        { id: 'extension-claim', aiText: '高分段学生表现较好，可直接承担所有拓展任务。', evidenceMetricIds: ['band-high'], requiredJudgment: '结论需限定' },
      ],
      aiDisclosure: '统计量由本地确定性公式计算，解释文本为 AI 模拟草稿；教师必须复核至少 3 个数字、删除无据判断并对最终结论负责。',
    }
    const combined = m07Dataset.map((item) => ({ id: item.studentId, value: item.quiz2 === null ? item.quiz1 : (item.quiz1 + item.quiz2) / 2 }))
    const members = (test: (value: number) => boolean) => combined.filter((item) => test(item.value)).map((item) => item.id)
    const layerTasks: M07LayerTask[] = [
      { groupId: 'support', groupName: '补强组', memberIds: members((value) => value < 70), temporaryCriteria: '本轮两次测验有效均分低于 70，仅用于下一课次临时支持', evidence: `知识点 3 正确率 ${kp3.value}% 且基础段 ${metrics.find((item) => item.id === 'band-foundation')!.value} 人`, taskName: '证据卡片补强练习', taskInstruction: '从三个点检案例中标出阈值、趋势和现场状态证据，再选择“提交复核”或“补采信息”。', supportResource: '三维证据提示卡与一份完成示例', checkMethod: '依据、限制和下一步三栏均完整即完成' },
      { groupId: 'consolidate', groupName: '巩固组', memberIds: members((value) => value >= 70 && value < 85), temporaryCriteria: '本轮两次测验有效均分 70—84.9，仅用于下一课次练习', evidence: `中间段 ${metrics.find((item) => item.id === 'band-middle')!.value} 人，继续巩固证据链表达`, taskName: '异常判断路径排序', taskInstruction: '重排六个判断步骤，并为每一步补写对应课程材料依据。', supportResource: '判断路径卡与课程讲义节选', checkMethod: '顺序正确且至少引用三处材料依据' },
      { groupId: 'extend', groupName: '拓展组', memberIds: members((value) => value >= 85), temporaryCriteria: '本轮两次测验有效均分不低于 85，仅用于下一课次拓展观察', evidence: `高分段 ${metrics.find((item) => item.id === 'band-high')!.value} 人，仅反映本轮数据表现`, taskName: '边界情境设计', taskInstruction: '设计一个证据相互矛盾的点检案例，给出可复核的限制说明和补采方案。', supportResource: '开放情境模板与安全边界清单', checkMethod: '情境含冲突证据、限制说明和可执行补采方案' },
    ]
    return { draft, layerTasks }
  }
}
