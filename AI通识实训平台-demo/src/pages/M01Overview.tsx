import { ArrowRight, CheckCircle2, Clock3, FileCheck2, ShieldAlert, UsersRound } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'

export function M01Overview({ onNext }: { onNext: () => void }) {
  return (
    <>
      <PageHeader
        eyebrow="步骤 1 / 6 · 任务说明"
        title="大模型幻觉识别与内容核验"
        description="通过四个真实教学场景，练习识别 AI 回答中的虚构规定、错误步骤、无依据引用和过度推断。"
        aside={<div className="duration-card"><Clock3 size={20} /><span><strong>45 分钟</strong><small>入门 · 必修</small></span></div>}
      />
      <section className="objective-grid">
        <article><ShieldAlert size={22} /><span><strong>要解决的问题</strong><p>避免把 AI 编造的政策、急救建议、研究引用或因果结论直接用于教学。</p></span></article>
        <article><FileCheck2 size={22} /><span><strong>任务成果</strong><p>AI 内容核验记录、教师修正对照表和小组核验清单。</p></span></article>
        <article><UsersRound size={22} /><span><strong>协作方式</strong><p>先完成个人判断，再从本组成员中选择对象开展交叉复核。</p></span></article>
      </section>
      <section className="content-card flow-card">
        <div className="section-heading"><div><span className="eyebrow">任务流程</span><h2>你将完成六个连续步骤</h2></div></div>
        <ol className="flow-list">
          {[
            ['01', '阅读任务说明', '了解成果与通过标准'],
            ['02', '向 AI 提问', '获取四份未经人工修订的回答原文'],
            ['03', '标注并逐项核验', '识别五类对象，判断能否采用并填写依据'],
            ['04', '完成教师修正', '保留原内容、修正内容和理由'],
            ['05', '开展小组复核', '确认角色、交叉复核并补齐清单'],
            ['06', '查看评分与成果', '检查是否达到 8 分及核心步骤要求'],
          ].map(([number, title, description]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}
        </ol>
      </section>
      <section className="pass-card">
        <div><CheckCircle2 size={22} /><span><strong>通过条件</strong><p>总分不低于 8 分，并完成四份回答核验、识别至少 3 处问题、至少 1 处教师修正及小组复核。</p></span></div>
        <button className="primary-button" type="button" onClick={onNext}>开始 AI 提问<ArrowRight size={17} /></button>
      </section>
    </>
  )
}
