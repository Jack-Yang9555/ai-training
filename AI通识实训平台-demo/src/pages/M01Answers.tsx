import { ArrowRight, Bot, CheckCircle2, MessageSquareText, Send } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { m01Answers } from '../data/m01Data'
import { validateAskedAnswers } from '../logic/m01Validation'
import type { AnswerId } from '../types'

interface M01AnswersProps {
  askedAnswerIds: AnswerId[]
  onAsk: (id: AnswerId) => void
  onAskAll: () => void
  onNext: () => void
}

export function M01Answers({ askedAnswerIds, onAsk, onAskAll, onNext }: M01AnswersProps) {
  const validation = validateAskedAnswers(askedAnswerIds)
  const trackingItems = m01Answers.map((answer) => ({
    id: answer.id,
    label: `回答 ${answer.id} · ${answer.scene}`,
    completed: askedAnswerIds.includes(answer.id),
    detail: askedAnswerIds.includes(answer.id) ? 'AI 原始回答已生成并保存' : '尚未生成回答',
  }))
  return (
    <>
      <PageHeader
        eyebrow="步骤 2 / 6 · AI 提问"
        title="获取四份 AI 原始回答"
        description="问题由平台固定，学员不能增加提示或约束。回答为受控演示样例，完整保留其中可能出现的幻觉。"
        aside={<button className="secondary-button" type="button" onClick={onAskAll}><Bot size={17} />生成全部演示回答</button>}
      />
      <div className="answer-grid">
        {m01Answers.map((answer) => {
          const asked = askedAnswerIds.includes(answer.id)
          return (
            <article className={asked ? 'prompt-card answered' : 'prompt-card'} key={answer.id}>
              <div className="prompt-head"><span className="answer-letter">{answer.id}</span><div><span>{answer.scene}</span><strong>固定问题</strong></div>{asked && <CheckCircle2 size={19} />}</div>
              <p className="prompt-text">{answer.question}</p>
              {!asked ? (
                <button className="secondary-button" type="button" onClick={() => onAsk(answer.id)}><Send size={16} />发送给 AI</button>
              ) : (
                <div className="ai-response"><div><MessageSquareText size={16} /><strong>AI 原始回答</strong><span>演示样例</span></div><p>{answer.answer}</p></div>
              )}
            </article>
          )
        })}
      </div>
      <ValidationNotice messages={validation.messages} items={trackingItems} success="四份 AI 回答已经完整保存，可以开始标注核验。" />
      <div className="page-actions"><span>{askedAnswerIds.length} / 4 份回答已生成</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入标注核验<ArrowRight size={17} /></button></div>
    </>
  )
}
