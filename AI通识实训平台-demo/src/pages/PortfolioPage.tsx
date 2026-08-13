import { CheckCircle2, CircleDashed, FolderKanban, ShieldCheck } from 'lucide-react'
import { trainingTasks } from '../training/catalog'
import { buildTrainingPortfolio } from '../training/portfolio'
import type { ElectiveAssignments, TaskArtifactSubmission, TrainingSnapshot, TrainingTaskId } from '../training/types'

export function PortfolioPage({ snapshot, electiveAssignments, submissions }: { snapshot: TrainingSnapshot; electiveAssignments: ElectiveAssignments; submissions?: Partial<Record<TrainingTaskId, TaskArtifactSubmission>> }) {
  const portfolio = buildTrainingPortfolio({ snapshot, electiveAssignments, submissions })

  return <>
    <section className="simple-page-hero"><div><span className="eyebrow">PORTFOLIO & ASSESSMENT</span><h1>成果中心</h1><p>任务达到完成条件后，过程成果自动进入任务归档；十类个人成果按来源任务独立聚合，避免把任务完成、成果归档和综合计分混为同一状态。</p></div><div className="selection-counter"><FolderKanban size={21} /><span><strong>{portfolio.archivedTaskCount} / {portfolio.eligibleTaskCount}</strong><small>已完成任务自动归档</small></span></div></section>

    <section className="portal-section"><div className="section-heading"><div><span className="eyebrow">TASK ARCHIVE</span><h2>任务成果自动归档</h2></div><p>统一读取任务目录和完成状态；后续任务接入同一成果提交接口，无需在成果中心逐项写死。</p></div><div className="task-archive-grid">{portfolio.taskArchives.map((item) => <article className={`task-archive-card ${item.status}`} key={item.taskId}><span>{item.taskId}</span><div><strong>{item.title}</strong><p>{item.artifacts.map((artifact) => artifact.name).join('、')}</p></div><em>{item.status === 'archived' ? '已同步归档' : item.status === 'in-progress' ? `进行中 ${item.progressPercent}%` : trainingTasks[item.taskId].contentStatus === 'implemented' ? '待完成' : '工作台待实现'}</em></article>)}</div></section>

    <section className="portal-section"><div className="section-heading"><div><span className="eyebrow">10 DELIVERABLES</span><h2>十类个人成果目录</h2></div><p><span className="portfolio-status-count">{portfolio.completedDeliverableCount} / {portfolio.personalDeliverables.length} 类已归档</span> · 每个槽位绑定来源任务，所有来源完成后自动转为可验收成果。</p></div><div className="portfolio-grid">{portfolio.personalDeliverables.map((item, index) => <article className={item.status === 'archived' ? 'portfolio-card complete' : 'portfolio-card'} key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.name}</strong><p>{item.sourceTaskIds.length > 0 ? item.sourceTaskIds.map((id) => `${id} · ${trainingTasks[id].title}`).join('；') : '当天选修任务尚未配置'}</p></div><em>{item.sourceTaskIds.length > 0 && item.source.toString().startsWith('elective-') ? `${item.sourceTaskIds.length} 项` : item.quantity}</em>{item.status === 'archived' ? <CheckCircle2 size={18} /> : <CircleDashed size={18} />}</article>)}</div></section>

    <section className="content-card portfolio-panel portfolio-pass-panel"><div className="section-heading"><div><span className="eyebrow">PASS RULE</span><h2>总评要求</h2></div></div><div className="score-contract"><div><strong>60</strong><span>12 项必修</span></div><div><strong>10</strong><span>两天选修</span></div><div><strong>20</strong><span>成果综合评分</span></div><div><strong>10</strong><span>小组协作</span></div></div><p className="score-rule"><ShieldCheck size={17} />总分 ≥ 80，且第二、第三天各至少完成 1 项选修，三项阶段验收及统一最低要求全部通过。</p></section>
  </>
}
