import { AlertTriangle, ArrowRight, CheckCircle2, FileCheck2, RotateCcw, ShieldCheck, TableProperties } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { judgmentLabels, m01Answers } from '../data/m01Data'
import { buildReviewArtifacts } from '../logic/m01Review'
import { summarizeJudgments } from '../logic/m01Summary'
import { currentParticipant, reviewableParticipants } from '../training/participants'
import type { ParticipantDirectory } from '../training/types'
import type { DemoRoute, M01Progress, M01ScoreResult } from '../types'

interface M01ResultProps {
  progress: M01Progress
  result: M01ScoreResult
  onNavigate: (route: DemoRoute) => void
  onReset: () => void
  participantDirectory: ParticipantDirectory
}

export function M01Result({ progress, result, participantDirectory, onNavigate, onReset }: M01ResultProps) {
  const [artifact, setArtifact] = React.useState<'records' | 'corrections' | 'checklist'>('records')
  const corrections = progress.annotations.filter(
    (annotation) =>
      (annotation.judgment === 'revise' || annotation.judgment === 'limit') &&
      progress.corrections[annotation.id],
  )
  const identity = currentParticipant(participantDirectory)
  const target = participantDirectory.participants.find((member) => member.participantId === progress.groupReview.targetUserId)
  const peerCorrection = buildReviewArtifacts(progress.annotations, progress.corrections, reviewableParticipants(participantDirectory)).find((item) => item.id === progress.groupReview.correctionAnnotationId)

  return (
    <>
      <PageHeader
        eyebrow="步骤 6 / 6 · 评分与成果"
        title={result.passed ? 'M01 任务已通过' : 'M01 任务结果检查'}
        description={result.passed ? '你已经完成个人核验、教师修正和小组复核，过程证据已形成三类成果。' : '系统依据过程记录实时评分。补齐未通过的核心步骤后即可重新计算。'}
        aside={<div className={result.passed ? 'result-score passed' : 'result-score'}><strong>{result.total}</strong><span>/ 10 分</span></div>}
      />

      <section className={result.passed ? 'result-banner passed' : 'result-banner'}>
        {result.passed ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
        <div><strong>{result.passed ? '任务通过：AI 生成内容必须经教师核验后使用' : '尚未达到通过条件'}</strong><p>通过条件：总分不低于 8 分，且 4 项核心步骤全部完成。</p></div>
        <span>{result.coreRequirements.filter((item) => item.passed).length} / {result.coreRequirements.length} 项核心要求</span>
      </section>

      <div className="score-layout">
        <section className="content-card score-card">
          <div className="section-heading"><div><span className="eyebrow">过程质量评分</span><h2>五项标准</h2></div></div>
          <div className="dimension-list">
            {result.dimensions.map((dimension) => <div className="dimension-row" key={dimension.id}><span className={`score-dot score-${dimension.score}`}>{dimension.score}</span><div><strong>{dimension.label}</strong><p>{dimension.evidence}</p></div><div className="mini-score-track"><span style={{ width: `${dimension.score * 50}%` }} /></div></div>)}
          </div>
        </section>
        <section className="content-card requirement-card">
          <div className="section-heading"><div><span className="eyebrow">通关门槛</span><h2>核心步骤</h2></div></div>
          <div className="requirement-list">
            {result.coreRequirements.map((requirement) => <button type="button" key={requirement.id} className={requirement.passed ? 'passed' : ''} onClick={() => onNavigate(requirement.route)}>{requirement.passed ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}<span><strong>{requirement.label}</strong><small>{requirement.passed ? '已完成' : '点击前往补充'}</small></span>{!requirement.passed && <ArrowRight size={16} />}</button>)}
          </div>
        </section>
      </div>

      <section className="content-card artifact-section">
        <div className="section-heading"><div><span className="eyebrow">任务成果</span><h2>成果数据预览</h2></div><div className="artifact-tabs"><button className={artifact === 'records' ? 'active' : ''} type="button" onClick={() => setArtifact('records')}><FileCheck2 size={16} />核验记录</button><button className={artifact === 'corrections' ? 'active' : ''} type="button" onClick={() => setArtifact('corrections')}><TableProperties size={16} />修正对照表</button><button className={artifact === 'checklist' ? 'active' : ''} type="button" onClick={() => setArtifact('checklist')}><ShieldCheck size={16} />小组清单</button></div></div>
        {artifact === 'records' && (
          <div className="artifact-grid">{m01Answers.map((answer) => { const items = progress.annotations.filter((item) => item.answerId === answer.id); const overall = summarizeJudgments(items); return <article key={answer.id}><div><span>{answer.id}</span><strong>{answer.scene}</strong></div><p>标注 {items.length} 处 · 已核验 {items.filter((item) => item.judgment).length} 处</p><div className="summary-badges">{overall.map((item) => <span key={item}>{item}</span>)}</div></article> })}</div>
        )}
        {artifact === 'corrections' && (
          <div className="checklist-table-wrap"><table className="checklist-table"><thead><tr><th>内容</th><th>原内容</th><th>判断</th><th>教师修正</th><th>修正理由</th></tr></thead><tbody>{corrections.map((annotation) => { const record = progress.corrections[annotation.id]; return <tr key={annotation.id}><td>{annotation.answerId}</td><td>{annotation.text}</td><td>{annotation.judgment ? judgmentLabels[annotation.judgment] : '—'}</td><td>{record.revisedContent}</td><td>{record.reason}</td></tr> })}</tbody></table></div>
        )}
        {artifact === 'checklist' && (
          <><div className="review-trace"><strong>复核记录</strong><span>复核人：{identity?.name ?? '—'}（{progress.groupReview.reviewerRole}）</span><span>被复核人：{target?.name ?? '—'}</span><span>关联成果：{peerCorrection?.title ?? '—'}</span></div><div className="checklist-table-wrap"><table className="checklist-table"><thead><tr><th>序号</th><th>核验项</th><th>核验要点</th><th>典型幻觉表现</th><th>应对方式</th></tr></thead><tbody>{progress.checklist.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.checkItem}</td><td>{item.keyPoint}</td><td>{item.typicalHallucination}</td><td>{item.response}</td></tr>)}</tbody></table></div></>
        )}
      </section>
      <div className="page-actions"><span>全部数据保存在当前浏览器，可返回任一步骤继续修改</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16} />重置并重新演示</button></div>
    </>
  )
}

import React from 'react'
