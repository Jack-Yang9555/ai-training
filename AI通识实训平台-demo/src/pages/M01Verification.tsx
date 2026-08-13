import { ArrowRight, BookOpen, CheckCircle2, Crosshair, Highlighter, Sparkles } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { TextAnnotator } from '../components/TextAnnotator'
import { ValidationNotice } from '../components/ValidationNotice'
import { annotationTypeLabels, judgmentLabels, m01Answers } from '../data/m01Data'
import { summarizeJudgments } from '../logic/m01Summary'
import { getJudgmentProgress, validateAnnotations, validateJudgments } from '../logic/m01Validation'
import type { AnnotationType, AnswerId, Judgment, ReferenceAnnotation, TextAnnotation } from '../types'

interface M01VerificationProps {
  activeAnswerId: AnswerId
  onActiveAnswerChange: (answerId: AnswerId) => void
  annotations: TextAnnotation[]
  onAddAnnotation: (answerId: AnswerId, selection: { start: number; end: number; text: string }, type: AnnotationType) => void
  onDeleteAnnotation: (annotationId: string) => void
  onUpdateAnnotation: (annotationId: string, patch: Partial<TextAnnotation>) => void
  onLoadReference: (answerId: AnswerId, references: ReferenceAnnotation[]) => void
  onNext: () => void
}

export function M01Verification({
  activeAnswerId,
  onActiveAnswerChange,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation,
  onLoadReference,
  onNext,
}: M01VerificationProps) {
  const [focusedAnnotationId, setFocusedAnnotationId] = React.useState<string | null>(null)
  const currentAnswer = m01Answers.find((answer) => answer.id === activeAnswerId)!
  const currentAnnotations = annotations.filter((annotation) => annotation.answerId === activeAnswerId)
  const annotationValidation = validateAnnotations(annotations)
  const judgmentValidation = validateJudgments(annotations)
  const judgmentProgress = getJudgmentProgress(annotations)
  const allValid = annotationValidation.valid && judgmentValidation.valid
  const summary = summarizeJudgments(currentAnnotations)
  const incompleteAnnotations = annotations.filter(
    (annotation) => !annotation.judgment || annotation.evidenceSource.trim().length < 6,
  )
  const trackingItems = m01Answers.flatMap((answer) => {
    const items = annotations.filter((item) => item.answerId === answer.id)
    const judged = items.filter((item) => item.judgment).length
    const evidenced = items.filter((item) => item.evidenceSource.trim().length >= 6).length
    return [
      {
        id: `${answer.id}-annotations`,
        label: `回答 ${answer.id} · 标注至少 3 处`,
        completed: items.length >= 3,
        detail: `当前 ${items.length} 处`,
      },
      {
        id: `${answer.id}-verification`,
        label: `回答 ${answer.id} · 完成判断和依据`,
        completed: items.length >= 3 && judged === items.length && evidenced === items.length,
        detail: `判断 ${judged}/${items.length}，具体依据 ${evidenced}/${items.length}`,
      },
    ]
  })

  React.useEffect(() => {
    if (!focusedAnnotationId) return
    const card = document.getElementById(`judgment-${focusedAnnotationId}`)
    if (!card) return
    card.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    const annotation = annotations.find((item) => item.id === focusedAnnotationId)
    const target = annotation?.judgment
      ? card.querySelector<HTMLTextAreaElement>('textarea')
      : card.querySelector<HTMLInputElement>('input[type="radio"]')
    target?.focus({ preventScroll: true })
    const timer = window.setTimeout(() => setFocusedAnnotationId(null), 2200)
    return () => window.clearTimeout(timer)
  }, [activeAnswerId, annotations, focusedAnnotationId])

  function locateAnnotation(annotation: TextAnnotation) {
    onActiveAnswerChange(annotation.answerId)
    setFocusedAnnotationId(annotation.id)
  }

  return (
    <>
      <PageHeader
        eyebrow="步骤 3 / 6 · 标注核验"
        title="标出风险对象，逐项判断并记录依据"
        description="先拖动选择 AI 回答中的文字，再选择标注类型。每份回答至少标注 3 处，每条标注都要完成判断和具体依据。"
        aside={<div className="metric-pill"><Highlighter size={18} /><span><strong>{annotations.length}</strong><small>已标注对象</small></span></div>}
      />
      <div className="answer-tabs" role="tablist" aria-label="选择回答">
        {m01Answers.map((answer) => {
          const items = annotations.filter((item) => item.answerId === answer.id)
          const pendingCount = items.filter((item) => !item.judgment || item.evidenceSource.trim().length < 6).length
          const done = items.length >= 3 && items.every((item) => item.judgment && item.evidenceSource.trim().length >= 6)
          return (
            <button className={activeAnswerId === answer.id ? 'active' : ''} role="tab" type="button" key={answer.id} onClick={() => onActiveAnswerChange(answer.id)}>
              <span>{answer.id}</span><div><strong>{answer.scene}</strong><small>{items.length}/3 处{done ? ' · 已核验' : pendingCount > 0 ? ` · 待补 ${pendingCount}` : ''}</small></div>{done && <CheckCircle2 size={17} />}
            </button>
          )
        })}
      </div>
      <section className="content-card verification-workbench">
        <div className="question-strip"><span>问题 {currentAnswer.id}</span><p>{currentAnswer.question}</p></div>
        <div className="workbench-heading">
          <div><h2>① 划词标注</h2><p>同一段文字不能重复或重叠标注。</p></div>
          <button className="ghost-button" type="button" onClick={() => onLoadReference(currentAnswer.id, currentAnswer.referenceAnnotations)}><Sparkles size={16} />载入参考标注</button>
        </div>
        <TextAnnotator
          answer={currentAnswer}
          annotations={currentAnnotations}
          onAdd={(selection, type) => onAddAnnotation(currentAnswer.id, selection, type)}
          onDelete={onDeleteAnnotation}
        />
        <div className="judgment-section">
          <div className="workbench-heading judgment-heading"><div><h2>② 逐项判断与依据</h2><p>依据需填写文件名称、检索数据库或规范条目，不能只写“查过了”。</p></div>{summary.length > 0 && <div className="summary-badges">总体判断：{summary.map((item) => <span key={item}>{item}</span>)}</div>}</div>
          <div className="verification-progress" aria-live="polite">
            <span><strong>{judgmentProgress.judged}</strong> / {judgmentProgress.total}<small>已选择判断</small></span>
            <span><strong>{judgmentProgress.evidenced}</strong> / {judgmentProgress.total}<small>依据达到要求</small></span>
            <span className="complete"><strong>{judgmentProgress.completed}</strong> / {judgmentProgress.total}<small>完整核验</small></span>
          </div>
          {incompleteAnnotations.length > 0 && (
            <div className="incomplete-locator" aria-live="polite">
              <div className="incomplete-locator-head"><span><Crosshair size={16} /><strong>待补项目 {incompleteAnnotations.length} 条</strong></span><small>点击可直接定位到对应标注</small></div>
              <div className="incomplete-locator-list">
                {incompleteAnnotations.map((annotation) => {
                  const missing: string[] = []
                  if (!annotation.judgment) missing.push('未选择判断')
                  if (annotation.evidenceSource.trim().length < 6) missing.push(`依据还差 ${6 - annotation.evidenceSource.trim().length} 字`)
                  const excerpt = annotation.text.length > 28 ? `${annotation.text.slice(0, 28)}…` : annotation.text
                  return (
                    <button type="button" key={annotation.id} onClick={() => locateAnnotation(annotation)} aria-label={`定位回答 ${annotation.answerId} 的标注：${excerpt}`}>
                      <span>回答 {annotation.answerId}</span><strong>“{excerpt}”</strong><em>{missing.join('、')}</em><ArrowRight size={15} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {currentAnnotations.length === 0 ? (
            <div className="empty-state"><BookOpen size={24} /><strong>尚未添加标注</strong><p>在上方回答原文中选择需要核验的内容。</p></div>
          ) : (
            <div className="judgment-list">
              {currentAnnotations.map((annotation, index) => (
                <article id={`judgment-${annotation.id}`} className={focusedAnnotationId === annotation.id ? 'judgment-card needs-attention' : 'judgment-card'} key={annotation.id}>
                  <div className="judgment-quote"><span>{index + 1}</span><div><em>{annotationTypeLabels[annotation.type]}</em><strong>“{annotation.text}”</strong></div></div>
                  <div className="judgment-options">
                    {(Object.keys(judgmentLabels) as Judgment[]).map((judgment) => (
                      <label key={judgment} className={annotation.judgment === judgment ? 'selected' : ''}><input type="radio" name={`judgment-${annotation.id}`} checked={annotation.judgment === judgment} onChange={() => onUpdateAnnotation(annotation.id, { judgment })} />{judgmentLabels[judgment]}</label>
                    ))}
                  </div>
                  <label className="field full"><span>依据来源</span><textarea value={annotation.evidenceSource} onChange={(event) => onUpdateAnnotation(annotation.id, { evidenceSource: event.target.value })} placeholder="例如：教育部官网政策文件检索；《深化新时代教育评价改革总体方案》（2020 年）" rows={2} /><small className={annotation.evidenceSource.trim().length < 6 ? 'field-hint warning' : 'field-hint success'}>{annotation.evidenceSource.trim().length < 6 ? `还需 ${6 - annotation.evidenceSource.trim().length} 个字，请填写可追溯的具体来源` : `依据已记录 · ${annotation.evidenceSource.trim().length} 字`}</small></label>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <ValidationNotice messages={[...annotationValidation.messages, ...judgmentValidation.messages]} items={trackingItems} success="四份回答均已达到标注数量要求，所有对象都完成了判断与依据记录。" />
      <div className="page-actions"><span>可随时切换回答，当前内容会自动保存</span><button className="primary-button" type="button" disabled={!allValid} onClick={onNext}>进入教师修正<ArrowRight size={17} /></button></div>
    </>
  )
}

import React from 'react'
