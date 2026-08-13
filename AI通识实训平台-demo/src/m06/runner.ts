import type { M06Draft, M06Input, M06VideoPreview } from './domain'

const narration = '本节微课学习设备点检中的异常识别。先看记录是否超过参考阈值，再观察变化是否连续出现，并结合现场状态交叉判断。单个数值偏高不能直接证明设备故障，记录缺失时也不能补写推测。请标记待核项，再复查仪表、时间和工况；若三类证据相互支持，提交异常复核；若证据不足，保留现状并说明还需采集什么。最后用点检表写出依据、限制和下一步，不给出无证据的绝对结论。'

export interface M06ContentRunner {
  run(input: M06Input): Promise<M06Draft>
  render(draft: M06Draft): Promise<M06VideoPreview>
}

function stableId(prefix: string, value: unknown) {
  const source = JSON.stringify(value)
  let hash = 0
  for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  return `${prefix}-${hash.toString(16).padStart(8, '0')}`
}

export class LocalM06ContentRunner implements M06ContentRunner {
  async run(input: M06Input): Promise<M06Draft> {
    const slides = [
      { title: '任务情境', coreMessage: '点检判断需要证据链', body: `面向${input.audience}，从真实点检记录出发识别待核信号。`, visualNote: '设备轮廓与点检表字段示意，不使用真实人员素材。' },
      { title: '学习目标', coreMessage: input.teachingObjectives[0] || '认识异常观察维度', body: `本环节用于${input.teachingStage}，完成后应能说明判断依据。`, visualNote: '用三枚简洁图标表示目标、证据与复核。' },
      { title: '观察一：阈值', coreMessage: '阈值是线索，不是最终结论', body: '对照课程给出的参考范围，标记超出或接近边界的记录。', visualNote: '参考线与数据点示意，避免红色恐吓式表达。' },
      { title: '观察二：连续变化', coreMessage: '趋势比单点更能说明问题', body: '检查相邻时段是否持续偏离，并核对时间与工况是否一致。', visualNote: '三时段趋势线，明确标注为教学示意。' },
      { title: '观察三：现场状态', coreMessage: '记录要与现场证据交叉核验', body: '结合声音、温度、振动与运行状态；证据不足时保持待核。', visualNote: '证据卡片并列，不出现未经授权的设备照片。' },
      { title: '判断与行动', coreMessage: '先说明依据和限制，再选择行动', body: '证据一致时提交复核；不一致时补采信息，不把推测写成事实。', visualNote: '“提交复核 / 补采信息”双路径流程图。' },
      { title: '一分钟练习', coreMessage: '用点检表写出可复核结论', body: '写出观察到的证据、当前限制与下一步，不判断人员态度或能力。', visualNote: '留出三栏答题区：依据、限制、行动。' },
    ].map((slide, index) => ({
      id: `slide-${index + 1}`,
      order: index + 1,
      ...slide,
      evidenceSource: input.verifiedMaterial,
    }))
    return {
      draftId: stableId('m06-draft', input),
      generatedAt: new Date().toISOString(),
      slides,
      originalNarration: narration,
      slideMappings: slides.map((slide) => ({ slideId: slide.id, narrationCue: `讲解“${slide.coreMessage}”，并与第 ${slide.order} 页画面同步。` })),
      aiDisclosure: '本草稿由任务内确定性规则生成，仅供教学演练；专业内容、素材权利和最终发布责任由教师人工确认。',
    }
  }

  async render(draft: M06Draft): Promise<M06VideoPreview> {
    return {
      videoId: stableId('m06-video', draft.draftId),
      generatedAt: new Date().toISOString(),
      durationSeconds: 54,
      playable: true,
      subtitleSynchronized: true,
      resolution: '1280×720',
      renderingNote: '本地确定性预览：模拟 45—60 秒数字人微课成片，不调用真实数字人服务。',
    }
  }
}
