import { m02ModelResults, m02RealModelNames } from '../m02/data'
import type { M02ModelId, M02RunBatch } from '../m02/types'

export interface M02RunInput {
  courseMaterial: string
  prompt: string
  participantId: string
}

export interface M02ModelRunner {
  run(input: M02RunInput): Promise<M02RunBatch>
  reveal(runId: string): Promise<Record<M02ModelId, string>>
}

function cloneResults() {
  return Object.fromEntries(Object.entries(m02ModelResults).map(([id, result]) => [id, { ...result, paragraphs: result.paragraphs.map((item) => ({ ...item })) }]))
}

export const localM02ModelRunner: M02ModelRunner = {
  async run(input) {
    const startedAt = new Date().toISOString()
    await new Promise((resolve) => setTimeout(resolve, 420))
    return {
      runId: `m02-${input.participantId}-${Date.now()}`,
      status: 'succeeded',
      startedAt,
      completedAt: new Date().toISOString(),
      results: cloneResults(),
    }
  },
  async reveal() {
    return { ...m02RealModelNames }
  },
}

// 真实接入时由服务端实现同一接口：服务端调用一个 Dify Workflow 的两个模型分支，
// 统一返回同一 runId 下的匿名 A/B 结果；API Key 不进入浏览器端。
