import { ArrowRight, FilePenLine, RotateCcw, Sparkles } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { judgmentLabels, m01Answers } from '../data/m01Data'
import { getCorrectionProgress, validateCorrections } from '../logic/m01Validation'
import type { AnswerId, CorrectionRecord, ProblemType, TextAnnotation } from '../types'

const problemOptions: ProblemType[] = ['错误步骤', '编造内容', '无依据引用', '过度推断']

interface M01CorrectionsProps {
  annotations: TextAnnotation[]
  corrections: Record<string, CorrectionRecord>
  onUpdate: (annotationId: string, patch: Partial<CorrectionRecord>) => void
  onLoadReference: () => void
  onReviewAnswer: (answerId: AnswerId) => void
  onNext: () => void
}

export function M01Corrections({ annotations, corrections, onUpdate, onLoadReference, onReviewAnswer, onNext }: M01CorrectionsProps) {
  const correctionProgress = getCorrectionProgress(annotations, corrections)
  const { actionable, complete, deleted, identifiedIssues } = correctionProgress
  const validation = validateCorrections(annotations, corrections)
  const trackingItems = [
    {
      id: 'identified-issues',
      label: '识别不少于 3 处问题内容',
      completed: identifiedIssues.length >= 3,
      detail: `当前 ${identifiedIssues.length} 处，其中需删除 ${deleted.length} 处`,
    },
    {
      id: 'actionable-content',
      label: '存在可进入教师修订的内容',
      completed: actionable.length >= 1,
      detail: `需修正或需限定 ${actionable.length} 处；需删除不进入本步骤`,
    },
    {
      id: 'complete-correction',
      label: '至少完成 1 条教师修订',
      completed: complete.length >= 1,
      detail: `当前完整完成 ${complete.length}/${actionable.length} 条`,
    },
  ]
  const answerStatuses = m01Answers.map((answer) => {
    const items = annotations.filter((annotation) => annotation.answerId === answer.id)
    const actionableItems = items.filter((annotation) => annotation.judgment === 'revise' || annotation.judgment === 'limit')
    const deletedCount = items.filter((annotation) => annotation.judgment === 'delete').length
    const adoptedCount = items.filter((annotation) => annotation.judgment === 'adopt').length
    const pendingCount = items.filter((annotation) => !annotation.judgment || annotation.evidenceSource.trim().length < 6).length
    const completedCount = actionableItems.filter((annotation) => {
      const record = corrections[annotation.id]
      return record && record.revisedContent.trim().length >= 6 && record.reason.trim().length >= 6
    }).length

    if (items.length < 3 || pendingCount > 0) {
      return {
        answer,
        state: 'pending',
        label: '核验待完成',
        detail: `已标注 ${items.length}/3 处，另有 ${pendingCount} 条判断或依据待补充。`,
      }
    }
    if (actionableItems.length > 0) {
      return {
        answer,
        state: 'actionable',
        label: `进入教师修正 ${actionableItems.length} 条`,
        detail: `“需修正/需限定”共 ${actionableItems.length} 条，已完成 ${completedCount}/${actionableItems.length} 条。`,
      }
    }
    return {
      answer,
      state: 'closed',
      label: '无需教师修正',
        detail: `“需删除”${deletedCount} 条已在核验环节处理，“可采用”${adoptedCount} 条无需修改。`,
    }
  })

  return (
    <>
      <PageHeader
        eyebrow="步骤 4 / 6 · 教师修正"
        title="把核验判断转化为可采用的教学内容"
        description="只有判断为“需修正”或“需限定”的标注进入教师修订；判断为“需删除”的内容已在核验阶段完成处理，不再进入本步骤。"
        aside={<button className="secondary-button" type="button" onClick={onLoadReference}><Sparkles size={16} />填入参考修正</button>}
      />
      <div className="correction-summary"><FilePenLine size={21} /><div><strong>{actionable.length} 条内容需要教师修订</strong><p>{complete.length} 条已完成；{deleted.length} 条“需删除”已在上一步处理</p></div></div>
      <section className="content-card correction-source-overview" aria-label="四份回答教师修正状态">
        <div className="correction-source-heading"><div><h2>四份回答进入情况</h2><p>是否出现修正任务，由上一环节每条标注的核验判断实时决定。</p></div></div>
        <div className="correction-source-grid">
          {answerStatuses.map(({ answer, state, label, detail }) => (
            <article className={`correction-source-card ${state}`} key={answer.id}>
              <div><span>{answer.id}</span><div><strong>回答 {answer.id}</strong><small>{answer.scene}</small></div></div>
              <em>{label}</em>
              <p>{detail}</p>
              <button className="ghost-button" type="button" onClick={() => onReviewAnswer(answer.id)} aria-label={`查看回答 ${answer.id} 的核验判断`}><RotateCcw size={14} />查看核验判断</button>
            </article>
          ))}
        </div>
      </section>
      <div className="correction-list">
        {actionable.map((annotation, index) => {
          const answer = m01Answers.find((item) => item.id === annotation.answerId)!
          const record = corrections[annotation.id] ?? { annotationId: annotation.id, problemType: annotation.judgment === 'revise' ? '错误步骤' : '过度推断', revisedContent: '', reason: '' }
          const completedFields = [record.problemType, record.revisedContent.trim().length >= 6, record.reason.trim().length >= 6].filter(Boolean).length
          return (
            <article className="content-card correction-card" key={annotation.id}>
              <div className="correction-card-head"><span>{String(index + 1).padStart(2, '0')}</span><div><strong>回答 {annotation.answerId} · {answer.scene}</strong><p>{judgmentLabels[annotation.judgment!]}</p></div><em className={completedFields === 3 ? 'correction-status complete' : 'correction-status'}>{completedFields}/3 项</em></div>
              <div className="original-evidence"><div><span>AI 原内容</span><blockquote>{annotation.text}</blockquote></div><div><span>核验依据</span><p>{annotation.evidenceSource}</p></div></div>
              <div className="form-grid">
                <label className="field"><span>问题类型</span><select value={record.problemType} onChange={(event) => onUpdate(annotation.id, { problemType: event.target.value as ProblemType })}>{problemOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
                <label className="field full"><span>教师修正后内容</span><textarea rows={3} value={record.revisedContent} onChange={(event) => onUpdate(annotation.id, { revisedContent: event.target.value })} placeholder="写出可用于对应教学场景的准确内容" /></label>
                <label className="field full"><span>修正理由</span><textarea rows={2} value={record.reason} onChange={(event) => onUpdate(annotation.id, { reason: event.target.value })} placeholder="说明为什么要改，以及依据如何支持这次修改" /></label>
              </div>
            </article>
          )
        })}
      </div>
      <ValidationNotice messages={validation.messages} items={trackingItems} success="已满足教师修订的核心要求，可以提交到小组开展交叉复核。" />
      <div className="page-actions"><span>任务状态会随教师填写实时更新</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入小组复核<ArrowRight size={17} /></button></div>
    </>
  )
}
