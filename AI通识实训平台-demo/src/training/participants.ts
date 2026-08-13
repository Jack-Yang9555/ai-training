import type { ParticipantDirectory, TrainingParticipant } from './types'

export const participantCsvHeaders = ['人员编号', '姓名', '单位', '部门', '专业方向', '联系方式', '分组'] as const

export interface ParticipantImportResult {
  participants: TrainingParticipant[]
  errors: string[]
  warnings: string[]
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1 }
      else quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(field.trim()); field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field.trim()); field = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else field += character
  }
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function groupIdFor(groupName: string, index: number): string {
  const number = groupName.match(/\d+/)?.[0]
  return number ? `group-${number}` : `group-${index + 1}`
}

export function parseParticipantCsv(text: string): ParticipantImportResult {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length === 0) return { participants: [], errors: ['文件为空，请选择包含表头和人员数据的 CSV 文件'], warnings: [] }
  const header = rows[0]
  const indexes = Object.fromEntries(participantCsvHeaders.map((name) => [name, header.indexOf(name)])) as Record<typeof participantCsvHeaders[number], number>
  const errors: string[] = []
  const warnings: string[] = []
  ;(['人员编号', '姓名', '分组'] as const).forEach((name) => { if (indexes[name] < 0) errors.push(`缺少必填列：${name}`) })
  if (errors.length > 0) return { participants: [], errors, warnings }

  const participants: TrainingParticipant[] = []
  const seenIds = new Set<string>()
  const groupIds = new Map<string, string>()
  rows.slice(1).forEach((row, rowIndex) => {
    const line = rowIndex + 2
    const value = (name: typeof participantCsvHeaders[number]) => indexes[name] >= 0 ? (row[indexes[name]] ?? '').trim() : ''
    const participantId = value('人员编号')
    const name = value('姓名')
    const groupName = value('分组')
    if (!participantId || !name || !groupName) {
      errors.push(`第 ${line} 行缺少人员编号、姓名或分组`)
      return
    }
    if (seenIds.has(participantId)) {
      errors.push(`第 ${line} 行人员编号重复：${participantId}`)
      return
    }
    seenIds.add(participantId)
    if (!groupIds.has(groupName)) groupIds.set(groupName, groupIdFor(groupName, groupIds.size))
    participants.push({ participantId, name, organization: value('单位'), department: value('部门'), specialty: value('专业方向'), contact: value('联系方式'), groupId: groupIds.get(groupName)!, groupName })
  })
  if (participants.length === 0 && errors.length === 0) errors.push('没有可导入的人员数据')
  const groupCounts = new Map<string, number>()
  participants.forEach((item) => groupCounts.set(item.groupName, (groupCounts.get(item.groupName) ?? 0) + 1))
  const singleGroups = [...groupCounts.entries()].filter(([, count]) => count < 2).map(([name]) => name)
  if (singleGroups.length > 0) warnings.push(`${singleGroups.join('、')}少于 2 人，无法完成交叉复核`)
  if (participants.some((item) => !item.organization || !item.department || !item.specialty)) warnings.push('部分人员的单位、部门或专业方向为空，可导入但建议补充')
  return { participants, errors, warnings }
}

export function createParticipantDirectory(participants: TrainingParticipant[], sourceName: string): ParticipantDirectory {
  return { participants, currentParticipantId: participants[0]?.participantId ?? '', sourceName, importedAt: new Date().toISOString() }
}

export function currentParticipant(directory: ParticipantDirectory): TrainingParticipant | undefined {
  return directory.participants.find((item) => item.participantId === directory.currentParticipantId)
}

export function reviewableParticipants(directory: ParticipantDirectory): TrainingParticipant[] {
  const current = currentParticipant(directory)
  if (!current) return []
  return directory.participants.filter((item) => item.groupId === current.groupId && item.participantId !== current.participantId)
}
