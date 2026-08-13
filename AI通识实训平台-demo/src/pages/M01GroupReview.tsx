import { useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, RefreshCw, UsersRound } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { groupRoles } from '../data/trainingParticipants'
import { buildReviewArtifacts } from '../logic/m01Review'
import { validateGroupReview } from '../logic/m01Validation'
import { currentParticipant, reviewableParticipants } from '../training/participants'
import type { ParticipantDirectory } from '../training/types'
import type { ChecklistItem, CorrectionRecord, GroupReviewRecord, GroupRole, TextAnnotation } from '../types'

interface M01GroupReviewProps {
  review: GroupReviewRecord
  checklist: ChecklistItem[]
  annotations: TextAnnotation[]
  corrections: Record<string, CorrectionRecord>
  participantDirectory: ParticipantDirectory
  onUpdateReview: (patch: Partial<GroupReviewRecord>) => void
  onUpdateCustomChecklist: (patch: Partial<ChecklistItem>) => void
  onSubmit: () => void
  onNext: () => void
}

export function M01GroupReview({ review, checklist, annotations, corrections, participantDirectory, onUpdateReview, onUpdateCustomChecklist, onSubmit, onNext }: M01GroupReviewProps) {
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const customItem = checklist.find((item) => !item.preset)
  const identity = currentParticipant(participantDirectory)
  const reviewableMembers = reviewableParticipants(participantDirectory)
  const reviewArtifacts = buildReviewArtifacts(annotations, corrections, reviewableMembers)
  const availableMembers = reviewableMembers.filter((member) => reviewArtifacts.some((item) => item.targetUserId === member.participantId))
  const availableCorrections = reviewArtifacts.filter((item) => item.targetUserId === review.targetUserId)
  const selectedCorrection = availableCorrections.find((item) => item.id === review.correctionAnnotationId)
  const validation = validateGroupReview(review, checklist, annotations, corrections, participantDirectory)
  const customItemComplete = Boolean(customItem && [customItem.checkItem, customItem.keyPoint, customItem.typicalHallucination, customItem.response].every((value) => Boolean(value.trim())))
  const trackingItems = [
    { id: 'role', label: '确认本次小组角色', completed: Boolean(review.reviewerRole), detail: review.reviewerRole ? `已确认：${review.reviewerRole}` : '尚未确认' },
    { id: 'source', label: '生成可复核教师修正成果', completed: reviewArtifacts.length >= 1, detail: `已从上一步动态生成 ${reviewArtifacts.length} 份完整成果` },
    { id: 'target', label: '选择同组被复核成员与成果', completed: Boolean(review.targetUserId && selectedCorrection), detail: review.targetUserId && selectedCorrection ? '复核关系已建立' : '尚未完整选择' },
    { id: 'review-fields', label: '完成复核判断与建议', completed: Boolean(review.evidenceAccurate && review.correctionReasonable && review.suggestion.trim()), detail: review.evidenceAccurate && review.correctionReasonable && review.suggestion.trim() ? '复核意见已填写' : '仍有复核字段待填写' },
    { id: 'checklist', label: '形成不少于 8 项核验清单', completed: checklist.length >= 8 && customItemComplete, detail: `${checklist.length}/8 项，第 8 项${customItemComplete ? '已完整填写' : '待补充'}` },
    { id: 'submit', label: '提交小组复核记录', completed: review.submitted, detail: review.submitted ? '复核记录已提交' : '内容完成后点击提交' },
  ]

  function handleSubmit() {
    if (!validation.valid) {
      setSubmitAttempted(true)
      document.getElementById('m01-group-review-validation')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitAttempted(false)
    onSubmit()
  }

  return (
    <>
      <PageHeader
        eyebrow="步骤 5 / 6 · 小组复核"
        title="确认角色，交叉复核一份组员成果"
        description="复核人来自登录态，被复核对象只能从同组成员中选择。每条意见都关联角色、对象和具体修正记录。"
        aside={<div className="metric-pill"><UsersRound size={18} /><span><strong>{identity?.groupName ?? '未分组'}</strong><small>{identity ? participantDirectory.participants.filter((item) => item.groupId === identity.groupId).length : 0} 名成员</small></span></div>}
      />

      <div className="review-source-note" aria-live="polite"><RefreshCw size={18} /><div><strong>成果池已从教师修正动态生成</strong><p>当前读取到 {reviewArtifacts.length} 份完整成果；单用户 Demo 按回答场景映射给导入名单中的同组成员，正式系统应替换为后端真实提交记录。</p></div></div>

      <section className="content-card review-form">
        <div className="section-heading"><div><span className="eyebrow">交叉复核</span><h2>复核关系与意见</h2></div><span className="identity-readonly">复核人：{identity?.name ?? '未选择'}（{identity?.groupName ?? '未分组'}）</span></div>
        <div className="form-grid three-columns">
          <label className="field"><span>本次承担角色</span><select value={review.reviewerRole ?? ''} onChange={(event) => onUpdateReview({ reviewerRole: event.target.value as GroupRole })}><option value="">请选择角色</option>{groupRoles.map((role) => <option key={role}>{role}</option>)}</select><small>仅对本任务有效，不写入人员档案</small></label>
          <label className="field"><span>被复核成员</span><select value={availableMembers.some((member) => member.participantId === review.targetUserId) ? review.targetUserId : ''} onChange={(event) => onUpdateReview({ targetUserId: event.target.value, correctionAnnotationId: '' })}><option value="">{availableMembers.length === 0 ? '暂无同组成员的可复核成果' : '请选择有可复核成果的组员'}</option>{availableMembers.map((member) => <option value={member.participantId} key={member.participantId}>{member.name}（{member.department}）</option>)}</select><small>名单来自培训人员导入，动态排除本人、跨组成员及暂无完整成果者</small></label>
          <label className="field"><span>关联修正成果</span><select disabled={!review.targetUserId || availableCorrections.length === 0} value={selectedCorrection?.id ?? ''} onChange={(event) => onUpdateReview({ correctionAnnotationId: event.target.value })}><option value="">{reviewArtifacts.length === 0 ? '上一步暂无完整教师修正' : !review.targetUserId ? '请先选择有成果的组员' : '请选择动态生成的成果'}</option>{availableCorrections.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        </div>
        {selectedCorrection && (
          <div className="peer-artifact">
            <div><span>原内容</span><p>{selectedCorrection.original}</p></div>
            <div><span>组员修正</span><p>{selectedCorrection.revised}</p></div>
            <div><span>组员依据</span><p>{selectedCorrection.evidence}</p></div>
            <div><span>修正理由</span><p>{selectedCorrection.reason}</p></div>
          </div>
        )}
        <div className="form-grid review-fields">
          <label className="field"><span>依据是否准确</span><select value={review.evidenceAccurate} onChange={(event) => onUpdateReview({ evidenceAccurate: event.target.value as GroupReviewRecord['evidenceAccurate'] })}><option value="">请选择</option><option>准确</option><option>需补充</option><option>不准确</option></select></label>
          <label className="field"><span>修正是否合理</span><select value={review.correctionReasonable} onChange={(event) => onUpdateReview({ correctionReasonable: event.target.value as GroupReviewRecord['correctionReasonable'] })}><option value="">请选择</option><option>合理</option><option>部分合理</option><option>不合理</option></select></label>
          <label className="field full"><span>是否还有遗漏（选填）</span><textarea rows={2} value={review.omissions} onChange={(event) => onUpdateReview({ omissions: event.target.value })} placeholder="说明还可补充核验的对象或依据" /></label>
          <label className="field full"><span>复核建议（必填）</span><textarea required rows={2} value={review.suggestion} onChange={(event) => onUpdateReview({ suggestion: event.target.value })} placeholder="例如：建议补充文件检索日期，并保留官网链接或截图" /></label>
        </div>
      </section>

      <section className="content-card checklist-section">
        <div className="section-heading"><div><span className="eyebrow">小组共同成果</span><h2>AI 教学内容核验清单</h2><p>第 8 项为自定义核验项，四个单元格均为必填。</p></div><div className="checklist-count"><ClipboardList size={17} />{checklist.length} / 8 项</div></div>
        <div className="checklist-table-wrap">
          <table className="checklist-table"><thead><tr><th>序号</th><th>核验项</th><th>核验要点</th><th>典型幻觉表现</th><th>应对方式</th></tr></thead><tbody>
            {checklist.filter((item) => item.preset).map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.checkItem}</td><td>{item.keyPoint}</td><td>{item.typicalHallucination}</td><td>{item.response}</td></tr>)}
            <tr className="custom-checklist-row"><td>8</td><td><input required aria-label="第8项核验项" value={customItem?.checkItem ?? ''} onChange={(event) => onUpdateCustomChecklist({ checkItem: event.target.value })} placeholder="补充核验项（必填）" /></td><td><input required aria-label="第8项核验要点" value={customItem?.keyPoint ?? ''} onChange={(event) => onUpdateCustomChecklist({ keyPoint: event.target.value })} placeholder="怎样核验（必填）" /></td><td><input required aria-label="第8项典型幻觉" value={customItem?.typicalHallucination ?? ''} onChange={(event) => onUpdateCustomChecklist({ typicalHallucination: event.target.value })} placeholder="常见表现（必填）" /></td><td><input required aria-label="第8项应对方式" value={customItem?.response ?? ''} onChange={(event) => onUpdateCustomChecklist({ response: event.target.value })} placeholder="处理方式（必填）" /></td></tr>
          </tbody></table>
        </div>
      </section>

      <div id="m01-group-review-validation"><ValidationNotice messages={validation.messages} items={trackingItems} success={review.submitted ? '小组复核已提交，角色、对象、意见和 8 项清单均已留痕。' : '内容完整，可以提交本次小组复核。'} /></div>
      <div className="page-actions">
        <span>{review.submitted ? <><CheckCircle2 size={16} />复核记录已提交</> : submitAttempted && !validation.valid ? '已列出未满足项，请补充后再次提交' : '提交后仍可在 Demo 中修改并重新提交'}</span>
        <div className="inline-actions"><button className="secondary-button" type="button" title={validation.valid ? undefined : '点击检查未完成项目'} onClick={handleSubmit}>{review.submitted ? '重新提交' : '提交复核'}</button><button className="primary-button" type="button" disabled={!review.submitted || !validation.valid} onClick={onNext}>查看评分与成果<ArrowRight size={17} /></button></div>
      </div>
    </>
  )
}
