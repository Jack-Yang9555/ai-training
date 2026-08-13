import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Info, Upload, UsersRound } from 'lucide-react'
import { sampleParticipants } from '../data/trainingParticipants'
import { createParticipantDirectory, parseParticipantCsv, participantCsvHeaders, type ParticipantImportResult } from '../training/participants'
import type { ParticipantDirectory } from '../training/types'

interface ParticipantsPageProps {
  directory: ParticipantDirectory
  onConfirm: (directory: ParticipantDirectory) => void
  onCurrentParticipantChange: (participantId: string) => void
}

function sampleCsv() {
  const rows = sampleParticipants.map((item) => [item.participantId, item.name, item.organization, item.department, item.specialty, item.contact, item.groupName])
  return [participantCsvHeaders, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
}

export function ParticipantsPage({ directory, onConfirm, onCurrentParticipantChange }: ParticipantsPageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<ParticipantImportResult | null>(null)
  const [draftName, setDraftName] = useState('')
  const [reading, setReading] = useState(false)
  const visibleParticipants = draft?.participants.length ? draft.participants : directory.participants
  const groups = useMemo(() => {
    const grouped = new Map<string, typeof visibleParticipants>()
    visibleParticipants.forEach((participant) => grouped.set(participant.groupName, [...(grouped.get(participant.groupName) ?? []), participant]))
    return [...grouped.entries()]
  }, [visibleParticipants])

  function loadText(text: string, sourceName: string) {
    setDraft(parseParticipantCsv(text))
    setDraftName(sourceName)
  }

  async function readFile(file?: File) {
    if (!file) return
    setReading(true)
    try {
      const text = typeof file.text === 'function'
        ? await file.text()
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result ?? ''))
            reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
            reader.readAsText(file, 'UTF-8')
          })
      loadText(text, file.name)
    } catch {
      setDraft({ participants: [], errors: ['文件读取失败，请确认文件为 UTF-8 CSV 后重试。'], warnings: [] })
      setDraftName(file.name)
    } finally {
      setReading(false)
    }
  }

  function confirmImport() {
    if (!draft || draft.errors.length > 0 || draft.participants.length === 0) return
    onConfirm(createParticipantDirectory(draft.participants, draftName))
    setDraft(null)
    setDraftName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return <>
    <section className="simple-page-hero participant-page-hero"><div><span className="eyebrow">PARTICIPANTS & GROUPS</span><h1>培训人员与分组</h1><p>导入培训人员基本信息和分组结果，为任务协作、同组复核和成果归属提供统一人员数据。人员档案不设置角色，任务角色在每个任务中临时分配。</p></div><div className="selection-counter complete"><UsersRound size={21} /><span><strong>{directory.participants.length} 人</strong><small>{new Set(directory.participants.map((item) => item.groupId)).size} 个小组</small></span></div></section>

    <section className="participant-import-grid">
      <div className="content-card participant-import-card"><div className="section-heading"><div><span className="eyebrow">步骤 1</span><h2>选择人员名单</h2></div><FileSpreadsheet size={23} /></div><p>支持 UTF-8 CSV。必填列为人员编号、姓名、分组；单位、部门、专业方向和联系方式属于可补充的基本信息。</p><div className="participant-import-actions"><input ref={inputRef} className="visually-hidden" type="file" accept=".csv,text/csv" aria-label="选择培训人员 CSV" onChange={(event) => readFile(event.target.files?.[0])} /><button className="primary-button" type="button" disabled={reading} onClick={() => inputRef.current?.click()}><Upload size={16} />{reading ? '正在读取' : '选择 CSV 文件'}</button><button className="secondary-button" type="button" onClick={() => loadText(sampleCsv(), '培训人员示例.csv')}>载入示例名单</button></div><div className="csv-contract"><strong>CSV 表头</strong><code>{participantCsvHeaders.join(',')}</code></div></div>
      <div className="content-card participant-import-card"><div className="section-heading"><div><span className="eyebrow">步骤 2</span><h2>校验并确认</h2></div>{draft && (draft.errors.length === 0 ? <CheckCircle2 className="valid" size={23} /> : <AlertTriangle className="invalid" size={23} />)}</div>{draft ? <><p><strong>{draftName}</strong> · 识别 {draft.participants.length} 人、{new Set(draft.participants.map((item) => item.groupId)).size} 个小组。</p>{draft.errors.map((message) => <div className="import-message error" key={message}><AlertTriangle size={15} />{message}</div>)}{draft.warnings.map((message) => <div className="import-message warning" key={message}><Info size={15} />{message}</div>)}{draft.errors.length === 0 && <div className="import-message success"><CheckCircle2 size={15} />格式校验通过，可确认覆盖当前名单。</div>}<button className="primary-button" type="button" disabled={draft.errors.length > 0 || draft.participants.length === 0} onClick={confirmImport}>确认导入 {draft.participants.length} 人</button></> : <div className="import-empty"><Info size={20} /><span><strong>等待选择文件</strong><small>选择 CSV 或载入示例后，这里会显示错误、警告和预览结果。</small></span></div>}</div>
    </section>

    <section className="participant-status-strip"><div><CheckCircle2 size={17} /><span><strong>当前名单：{directory.sourceName}</strong><small>已确认导入 · {new Date(directory.importedAt).toLocaleString('zh-CN', { hour12: false })}</small></span></div><label><span>当前演示人员</span><select aria-label="当前演示人员" value={directory.currentParticipantId} onChange={(event) => onCurrentParticipantChange(event.target.value)}>{directory.participants.map((item) => <option value={item.participantId} key={item.participantId}>{item.name} · {item.groupName}</option>)}</select></label></section>

    <section className="portal-section"><div className="section-heading"><div><span className="eyebrow">IMPORT PREVIEW</span><h2>{draft?.participants.length ? '待导入名单预览' : '当前培训人员名单'}</h2></div><p>角色不会进入人员档案；任务执行时按任务要求单独选择。</p></div><div className="participant-table-wrap"><table className="participant-table"><thead><tr><th>人员编号</th><th>姓名</th><th>单位</th><th>部门</th><th>专业方向</th><th>联系方式</th><th>分组</th></tr></thead><tbody>{visibleParticipants.map((item) => <tr key={item.participantId}><td>{item.participantId}</td><td><strong>{item.name}</strong></td><td>{item.organization || '—'}</td><td>{item.department || '—'}</td><td>{item.specialty || '—'}</td><td>{item.contact || '—'}</td><td><span>{item.groupName}</span></td></tr>)}</tbody></table></div></section>

    <section className="portal-section"><div className="section-heading"><div><span className="eyebrow">GROUP OVERVIEW</span><h2>分组情况</h2></div><p>同组关系将用于小组复核对象过滤；每组不足 2 人时无法形成交叉复核。</p></div><div className="group-overview-grid">{groups.map(([groupName, members]) => <article className={members.length < 2 ? 'group-overview-card warning' : 'group-overview-card'} key={groupName}><div><strong>{groupName}</strong><span>{members.length} 人</span></div><p>{members.map((item) => item.name).join('、')}</p><small>{members.length < 2 ? '人数不足，无法交叉复核' : '已具备同组交叉复核条件'}</small></article>)}</div></section>
  </>
}
