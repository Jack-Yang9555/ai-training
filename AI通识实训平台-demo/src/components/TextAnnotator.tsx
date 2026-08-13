import { useRef, useState } from 'react'
import { Highlighter, Trash2 } from 'lucide-react'
import { annotationTypeLabels } from '../data/m01Data'
import { annotationsOverlap } from '../logic/m01Validation'
import type { AnnotationType, M01Answer, TextAnnotation } from '../types'

interface PendingSelection {
  start: number
  end: number
  text: string
}

interface TextAnnotatorProps {
  answer: M01Answer
  annotations: TextAnnotation[]
  onAdd: (selection: PendingSelection, type: AnnotationType) => void
  onDelete: (annotationId: string) => void
}

const typeClass: Record<AnnotationType, string> = {
  number: 'mark-number',
  rule: 'mark-rule',
  citation: 'mark-citation',
  'safety-step': 'mark-safety',
  'absolute-conclusion': 'mark-absolute',
}

export function TextAnnotator({ answer, annotations, onAdd, onDelete }: TextAnnotatorProps) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [message, setMessage] = useState('拖动选择回答中的文字，再选择标注类型')

  const ordered = [...annotations].sort((a, b) => a.start - b.start)
  const segments: React.ReactNode[] = []
  let cursor = 0
  ordered.forEach((annotation) => {
    if (cursor < annotation.start) segments.push(answer.answer.slice(cursor, annotation.start))
    segments.push(
      <mark className={typeClass[annotation.type]} key={annotation.id} title={annotationTypeLabels[annotation.type]}>
        {answer.answer.slice(annotation.start, annotation.end)}
      </mark>,
    )
    cursor = annotation.end
  })
  if (cursor < answer.answer.length) segments.push(answer.answer.slice(cursor))

  function captureSelection() {
    const selection = window.getSelection()
    const root = textRef.current
    if (!selection || !root || selection.rangeCount === 0 || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return
    const prefixRange = range.cloneRange()
    prefixRange.selectNodeContents(root)
    prefixRange.setEnd(range.startContainer, range.startOffset)
    let start = prefixRange.toString().length
    let selectedText = range.toString()
    const leading = selectedText.length - selectedText.trimStart().length
    const trailing = selectedText.length - selectedText.trimEnd().length
    start += leading
    selectedText = selectedText.trim()
    const end = start + selectedText.length
    selection.removeAllRanges()
    if (!selectedText) return
    if (annotationsOverlap(annotations, { answerId: answer.id, start, end })) {
      setPending(null)
      setMessage('所选文字与已有标注重叠，请重新选择')
      return
    }
    if (trailing < 0) return
    setPending({ start, end, text: selectedText })
    setMessage(`已选择“${selectedText.length > 22 ? `${selectedText.slice(0, 22)}…` : selectedText}”`)
  }

  return (
    <div className="annotator">
      <div className="annotator-toolbar">
        <span><Highlighter size={17} />{message}</span>
        <div className={pending ? 'type-buttons visible' : 'type-buttons'}>
          {(Object.keys(annotationTypeLabels) as AnnotationType[]).map((type) => (
            <button key={type} type="button" onClick={() => { if (pending) { onAdd(pending, type); setPending(null); setMessage('标注已添加，可继续选择文字') } }}>
              {annotationTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>
      <p className="answer-text" ref={textRef} onMouseUp={captureSelection}>{segments}</p>
      {annotations.length > 0 && (
        <div className="annotation-chips">
          {annotations.map((annotation) => (
            <span key={annotation.id} className={typeClass[annotation.type]}>
              <em>{annotationTypeLabels[annotation.type]}</em>{annotation.text}
              <button type="button" onClick={() => onDelete(annotation.id)} aria-label={`删除标注 ${annotation.text}`}><Trash2 size={13} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
