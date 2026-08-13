import { m03DefaultSnapshot } from './data'
import type { M03PromptSnapshot } from './types'

export type M03PromptTopic = 'role-task' | 'background' | 'input' | 'constraints' | 'format' | 'quality'

export const m03PromptTopics: Array<{ id: M03PromptTopic; label: string }> = [
  { id: 'role-task', label: '角色 / 任务' },
  { id: 'background', label: '背景' },
  { id: 'input', label: '输入' },
  { id: 'constraints', label: '约束' },
  { id: 'format', label: '输出格式' },
  { id: 'quality', label: '质量标准' },
]

const topicByHeading: Record<string, M03PromptTopic> = {
  '角色/任务': 'role-task',
  背景: 'background',
  输入: 'input',
  约束: 'constraints',
  输出格式: 'format',
  质量标准: 'quality',
}

// Accept the ways teachers commonly structure a chat message, while still
// requiring every heading to start on its own line. Examples:
// 06 质量标准、【06 质量标准】、- 6. 质量标准、### 质量标准、**质量标准**。
const headingPattern = /^\s*(?:[-+>*#]\s*)*(?:\*\*|__)?(?:[【[（(]\s*)?(?:(?:第\s*)?(?:0?[1-6]|０?[１-６]|[①②③④⑤⑥])(?:\s*项)?\s*[.．、:：)）\-]?\s*)?(?:\*\*|__)?(角色\s*[\/／]\s*任务|背景|输入|约束|输出格式|质量标准)(?:\s*(?:\*\*|__))?(?:\s*[】\]）)])?(?:\s*[：:]\s*)?/gmu

function topicFromHeading(heading: string): M03PromptTopic | undefined {
  const normalizedHeading = heading.replace(/\s|／/gu, (value) => value === '／' ? '/' : '')
  return topicByHeading[normalizedHeading]
}

export function extractM03MessageSections(message: string): Partial<Record<M03PromptTopic, string>> {
  const matches = Array.from(message.matchAll(headingPattern))
  const sections: Partial<Record<M03PromptTopic, string>> = {}
  matches.forEach((match, index) => {
    const topic = topicFromHeading(match[1])
    if (!topic || sections[topic] !== undefined) return
    const start = (match.index ?? 0) + match[0].length
    // A teacher may write a section title and then repeat the field name in its
    // content, e.g. “06” / “质量标准” / “质量标准：……”. Only a different
    // section heading ends the current section.
    const nextDifferentTopic = matches.slice(index + 1).find((candidate) => topicFromHeading(candidate[1]) !== topic)
    const end = nextDifferentTopic?.index ?? message.length
    sections[topic] = message.slice(start, end).trim()
  })
  return sections
}

export function recognizedM03MessageTopics(message: string): Record<M03PromptTopic, boolean> {
  const sections = extractM03MessageSections(message)
  return Object.fromEntries(m03PromptTopics.map(({ id }) => [id, Boolean(sections[id]?.trim())])) as Record<M03PromptTopic, boolean>
}

function segmentField(value: string, label: string): string | undefined {
  const match = value.match(new RegExp('(?:^|[\\n；;])\\s*' + label + '[：:]\\s*([^\\n；;]*)', 'u'))
  return match?.[1]?.trim() || undefined
}

export function m03PromptMessageToSnapshot(message: string, safety: Pick<M03PromptSnapshot, 'rightsConfirmed' | 'privacyConfirmed'>): M03PromptSnapshot {
  const sections = extractM03MessageSections(message)
  const snapshot = structuredClone(m03DefaultSnapshot)
  snapshot.rightsConfirmed = safety.rightsConfirmed
  snapshot.privacyConfirmed = safety.privacyConfirmed

  const roleTask = sections['role-task']?.trim()
  if (roleTask) {
    snapshot.role = segmentField(roleTask, '角色') ?? roleTask
    snapshot.task = segmentField(roleTask, '任务') ?? roleTask
  }

  const background = sections.background?.trim()
  if (background) {
    snapshot.courseName = segmentField(background, '课程') ?? background
    snapshot.lessonName = segmentField(background, '课次') ?? background
    snapshot.teachingPhase = segmentField(background, '使用环节') ?? background
    snapshot.audience = segmentField(background, '授课对象') ?? background
    snapshot.studentFoundation = segmentField(background, '学生基础') ?? background
    snapshot.objective = segmentField(background, '教学目标') ?? background
  }

  const input = sections.input?.trim()
  if (input) {
    snapshot.materialName = segmentField(input, '材料名称') ?? input
    snapshot.materialContent = segmentField(input, '材料正文') ?? input
    snapshot.materialScope = segmentField(input, '允许使用范围') ?? input
  }

  const constraints = sections.constraints?.trim()
  if (constraints) {
    const duration = constraints.match(/(\d+)\s*分钟/u)
    const questionCount = constraints.match(/(\d+)\s*道/u)
    const difficulty = constraints.match(/(?:难度[：:]?\s*)?(入门|进阶|挑战)/u)
    if (duration) snapshot.duration = Number(duration[1])
    if (questionCount) snapshot.questionCount = Number(questionCount[1])
    if (difficulty) snapshot.difficulty = difficulty[1] as M03PromptSnapshot['difficulty']
  }

  const format = sections.format?.trim()
  if (format) {
    const outputFormat = format.match(/(分节文本|Markdown 表格|JSON 结构)/u)
    if (outputFormat) snapshot.outputFormat = outputFormat[1] as M03PromptSnapshot['outputFormat']
    snapshot.requiredSections = segmentField(format, '必须包含') ?? format
  }

  const quality = sections.quality?.trim()
  if (quality) snapshot.qualityStandards = segmentField(quality, '质量标准') ?? quality
  return snapshot
}
