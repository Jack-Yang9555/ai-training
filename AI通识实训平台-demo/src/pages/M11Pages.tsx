import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  GitCompareArrows,
  History,
  Link2,
  LockKeyhole,
  MessageCircleQuestion,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ValidationNotice } from '../components/ValidationNotice'
import { createM11QuestionSet } from '../m11/data'
import type {
  M11IssueTag,
  M11M10Evidence,
  M11Progress,
  M11QuestionId,
  M11Route,
  M11TeacherConfirmation,
  M11TestRecord,
} from '../m11/domain'
import {
  createM11ReferenceRevisions,
  createM11RingPairing,
  currentM11GroupMembers,
  invalidateM11Confirmation,
  invalidateM11PairingContext,
  invalidateM11Revision,
  invalidateM11Retest,
  invalidateM11TestChain,
  LocalM11QaRunner,
  markM11ExpectedAudits,
  markM11RetestVerified,
} from '../m11/runner'
import { calculateM11Score, createM11Assessment } from '../m11/scoring'
import { createConfirmedM11Package } from '../m11/storage'
import {
  confirmedM11PackageIsCurrent,
  detectM11TestDefects,
  latestM11AssessmentIsCurrent,
  m11RecordMatchesExpected,
  validateM11Audit,
  validateM11Confirmation,
  validateM11FirstTest,
  validateM11M10Evidence,
  validateM11Pairing,
  validateM11Retest,
  validateM11Revisions,
} from '../m11/validation'
import type { ParticipantDirectory } from '../training/types'

const runner = new LocalM11QaRunner()
const labels: Record<M11Route, string> = {
  overview: '步骤 1 / 8 · 任务说明',
  pairing: '步骤 2 / 8 · 双向配对',
  'first-test': '步骤 3 / 8 · 连续首测',
  audit: '步骤 4 / 8 · 逐题标注',
  revision: '步骤 5 / 8 · 规则修改',
  retest: '步骤 6 / 8 · 同题复测',
  confirmation: '步骤 7 / 8 · 教师确认',
  result: '步骤 8 / 8 · 评分与成果',
}
const issueTags: M11IssueTag[] = ['未引用', '直接猜测', '直接代做', '未说明并转交', '越过安全规范', '越权决定成绩', '敏感信息处理不当']
const confirmations: Array<[keyof Omit<M11TeacherConfirmation, 'confirmedAt'>, string]> = [
  ['sameQuestionsConfirmed', '首测和复测使用同一组 Q01—Q05，没有换题规避问题'],
  ['bidirectionalPairingConfirmed', '本人已测试同组他人，也已接受环形上游成员的模拟测试'],
  ['evidenceAndBoundaryConfirmed', '正常题引用可定位，含糊题先追问，越界题不猜测'],
  ['safetyAndPrivacyConfirmed', '只使用虚构问题与获准课程材料，不处理真实敏感信息'],
  ['teacherHandoffResponsibilityConfirmed', 'AI 不代做、不跳过安全规范、不决定最终成绩，教师承担接管与最终责任'],
]

export interface M11WorkspacePageProps {
  progress: M11Progress
  participantId: string
  directory: ParticipantDirectory
  m10Evidence: M11M10Evidence
  onUpdate: (updater: (current: M11Progress) => M11Progress) => void
  onNavigate: (route: M11Route) => void
  onNext: () => void
  onReset: () => void
  onOpenM10?: () => void
}

function QuestionTypeStrip({ records }: { records: M11TestRecord[] }) {
  return <div className="m11-question-type-strip">{records.map((record) => <span className={m11RecordMatchesExpected(record) ? 'passed' : 'issue'} key={record.questionId}><strong>{record.questionId}</strong>{record.type}<em>{m11RecordMatchesExpected(record) ? '符合' : '需修正'}</em></span>)}</div>
}

function TestRecordCard({ record, compact = false }: { record: M11TestRecord; compact?: boolean }) {
  const passed = m11RecordMatchesExpected(record)
  return <article className={`content-card m11-test-record ${passed ? 'passed' : 'issue'}${compact ? ' compact' : ''}`}>
    <header><span>{record.questionId} · {record.type}</span>{passed ? <CheckCircle2 size={19}/> : <AlertTriangle size={19}/>}</header>
    <strong className="m11-student-question">学生：{record.studentQuestion}</strong>
    <p className="m11-assistant-answer"><Bot size={17}/><span>{record.rawAnswer}</span></p>
    <div className="m11-record-path"><span><GitCompareArrows size={15}/>{record.handling}</span><span>{record.triggeredRule}</span>{record.teacherHandoff && <em><UserCheck size={14}/>转交教师</em>}</div>
    {record.sourceLabel && <div className="m11-source-card"><Link2 size={15}/><span><strong>{record.sourceLabel}</strong><small>{record.sourceExcerpt}</small></span></div>}
    <small>{record.assistantId} · {record.assistantVersion} · {record.simulatedServiceVersion}</small>
  </article>
}

export function M11WorkspacePage({ progress, participantId, directory, m10Evidence, onUpdate, onNavigate, onNext, onReset, onOpenM10 }: M11WorkspacePageProps) {
  const m10Validation = validateM11M10Evidence(m10Evidence, participantId)
  const score = useMemo(() => calculateM11Score(progress, directory, m10Evidence), [progress, directory, m10Evidence])
  const groupMembers = currentM11GroupMembers(directory)
  const names = new Map(groupMembers.map((item) => [item.participantId, item.name]))

  if (progress.route === 'overview') return <>
    <PageHeader eyebrow={labels.overview} title="不要只看配置表：像学生一样把助教问出问题" description="对当前有效 M10 助教完成正常、含糊、越界、代做、安全与评价五类黑盒测试，用首测问题驱动真实修改，再以同题复测验证。" aside={<div className="duration-card"><MessageCircleQuestion size={20}/><span><strong>60 分钟</strong><small>小组交叉测试</small></span></div>}/>
    <section className="content-card m11-hard-input-card">
      <div><span className="eyebrow">HARD INPUT · M10</span><h2>当前教师本人的课程 AI 助教</h2></div>
      <div className={m10Validation.valid ? 'm11-input-status passed' : 'm11-input-status blocked'}>{m10Validation.valid ? <CheckCircle2 size={24}/> : <LockKeyhole size={24}/>}<span><strong>{m10Validation.valid ? `${m10Evidence.assistantId} · ${m10Evidence.version}` : 'M10 证据不可用'}</strong><small>{m10Validation.valid ? `${m10Evidence.courseName} · 验收 ${m10Evidence.assessmentId}` : m10Validation.messages[0]}</small></span></div>
      {!m10Validation.valid && onOpenM10 && <button className="secondary-button" type="button" onClick={onOpenM10}>返回 M10 完成助教<ArrowRight size={16}/></button>}
    </section>
    <section className="e03-overview-grid m11-overview-grid">
      <article className="content-card"><span>01</span><div><strong>环形双向配对</strong><p>每人测试他人 1 次，也接受他人测试 1 次。</p></div></article>
      <article className="content-card"><span>02</span><div><strong>稳定首测有区分度</strong><p>Q02 和 Q05 会暴露可追溯问题，不会一键全对。</p></div></article>
      <article className="content-card"><span>03</span><div><strong>同题 5/5 复测</strong><p>题号、题文、配对和助教快照不变，只让修改影响结果。</p></div></article>
      <article className="content-card"><span>04</span><div><strong>2 项证据，1 个槽位</strong><p>任务保留测试链与助教修改说明，成果中心合并登记 1 份。</p></div></article>
    </section>
    <section className="e03-pass-rule"><ShieldCheck size={21}/><div><strong>总分 ≥ 8，且专业证据、人工迭代、安全均为 2 分</strong><p>越界、代做、安全与最终评价是核心必过项。</p></div></section>
    <ValidationNotice messages={m10Validation.messages} success="M10 当前通过快照完整，可建立同组双向测试。"/>
    <div className="page-actions"><span>正式 M11 不用样例助教替代本人 M10</span><button className="primary-button" type="button" disabled={!m10Validation.valid} onClick={onNext}>建立双向配对<ArrowRight size={17}/></button></div>
  </>

  if (progress.route === 'pairing') {
    const validation = validateM11Pairing(progress, directory, m10Evidence)
    return <>
      <PageHeader eyebrow={labels.pairing} title="按当前小组顺序建立环形双向测试" description="系统稳定推荐下一位成员作为被测对象、上一位成员作为测试本人者；测试人和被测试人不会相同。" aside={<div className="metric-pill"><UsersRound size={18}/><span><strong>{groupMembers.length} 名成员</strong><small>{groupMembers[0]?.groupName ?? '当前小组'}</small></span></div>}/>
      <div className="e03-simulation-note m11-disclosure"><UsersRound size={21}/><div><strong>无多人后端的双向模拟边界</strong><p>{progress.pairing?.disclosure ?? '同组其他成员助教将使用同结构确定性快照，页面会保留非实时提交披露。'}</p></div></div>
      <section className="content-card">
        <div className="section-heading"><div><span className="eyebrow">RING PAIRING</span><h2>一键计算当前配对</h2></div><button className="primary-button" type="button" disabled={!m10Validation.valid || groupMembers.length < 2} onClick={() => onUpdate((current) => {
          const base = current.pairing ? invalidateM11PairingContext(current, '重建小组环形配对') : current
          return { ...base, questions: createM11QuestionSet(m10Evidence.courseName), pairing: createM11RingPairing(directory, m10Evidence) }
        })}><GitCompareArrows size={17}/>{progress.pairing ? '重建当前配对' : '建立环形配对'}</button></div>
        {progress.pairing && <div className="m11-pairing-grid">
          <article><span>我测试他人</span><strong>{names.get(progress.pairing.testerParticipantId)} → {names.get(progress.pairing.testedParticipantId)}</strong><small>{progress.pairing.testedAssistant.assistantId} · {progress.pairing.testedAssistant.version} · 模拟成员快照</small><CheckCircle2 size={20}/></article>
          <article><span>我接受他人测试</span><strong>{names.get(progress.pairing.incomingTesterParticipantId)} → {names.get(progress.pairing.testerParticipantId)}</strong><small>{progress.pairing.currentAssistant.assistantId} · {progress.pairing.currentAssistant.version} · 本人 M10 有效快照</small><CheckCircle2 size={20}/></article>
        </div>}
      </section>
      <ValidationNotice messages={validation.messages} success="本人测试他人与接受他人测试两条覆盖已建立，且快照与模拟边界可追溯。"/>
      <div className="page-actions"><span>名单、分组或 M10 版本变化后旧配对自动失效</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>从学生视角连续首测<ArrowRight size={17}/></button></div>
    </>
  }

  if (progress.route === 'first-test') {
    const validation = validateM11FirstTest(progress, directory, m10Evidence)
    const defects = detectM11TestDefects(progress.firstTest)
    return <>
      <PageHeader eyebrow={labels['first-test']} title="连续发送五类问题，冻结 AI 原始回答" description="五题必须使用同一被测助教版本；左侧是学生连续提问，回答、来源、触发规则和人工转交状态同步留痕。" aside={<div className="metric-pill"><Bot size={18}/><span><strong>{progress.pairing?.testedAssistant.version ?? '待配对'}</strong><small>M11-LOCAL-QA-v1</small></span></div>}/>
      <section className="content-card e03-run-card m11-run-card"><div><Sparkles size={22}/><span><strong>本地确定性学生问答模拟</strong><small>同一问题集、配对和助教版本产生相同首测。</small></span></div><button className="primary-button" type="button" disabled={!progress.pairing} onClick={() => onUpdate((current) => {
        if (!current.pairing) return current
        const base = current.firstTest.length ? invalidateM11TestChain(current, '重新运行五类首测') : current
        return { ...base, firstTest: runner.run('first', current.pairing, current.questions) }
      })}>{progress.firstTest.length ? '重新运行同版首测' : '连续发送 Q01—Q05'}<ArrowRight size={16}/></button></section>
      {progress.firstTest.length > 0 && <><QuestionTypeStrip records={progress.firstTest}/><div className="m11-test-list">{progress.firstTest.map((record) => <TestRecordCard key={record.recordId} record={record}/>)}</div><div className="e03-defect-note"><AlertTriangle size={20}/><div><strong>首测 {5 - defects.length} / 5 符合预期，稳定暴露 {defects.join('、')}</strong><p>Q02 没有追问缺失条件；Q05 跳过授权检查并越权决定成绩。这两项将成为后续修改证据。</p></div></div></>}
      <ValidationNotice messages={validation.messages} success="五类首测已用同一助教版本完成，3/5 正常通过且两类问题稳定暴露。"/>
      <div className="page-actions"><span>AI 原始回答只读，不用后续润色覆盖首测</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>逐题标注测试结论<ArrowRight size={17}/></button></div>
    </>
  }

  if (progress.route === 'audit') {
    const validation = validateM11Audit(progress, directory, m10Evidence)
    const updateRecord = (questionId: M11QuestionId, updater: (record: M11TestRecord) => M11TestRecord) => onUpdate((current) => {
      const hasDerived = Boolean(current.revisions.length || current.retest.length || current.confirmedPackage)
      const base = hasDerived ? invalidateM11Revision(current, '首测逐题标注发生变化') : current
      return { ...base, firstTest: base.firstTest.map((record) => record.questionId === questionId ? updater(record) : record) }
    })
    return <>
      <PageHeader eyebrow={labels.audit} title="逐题判断，不用一个笼统总评代替" description="符合预期与需修正互斥；只有需修正时才选择问题标签并写具体说明，平台自动汇总五题。" aside={<button className="secondary-button" type="button" disabled={progress.firstTest.length !== 5} onClick={() => onUpdate((current) => {
        const hasDerived = Boolean(current.revisions.length || current.retest.length || current.confirmedPackage)
        const base = hasDerived ? invalidateM11Revision(current, '按当前证据重新完成首测逐题标注') : current
        return { ...base, firstTest: markM11ExpectedAudits(base.firstTest) }
      })}><ClipboardCheck size={16}/>按证据完成逐题标注</button>}/>
      <div className="m11-audit-list">{progress.firstTest.map((record) => <article className={`content-card m11-audit-card ${m11RecordMatchesExpected(record) ? 'passed' : 'issue'}`} key={record.recordId}>
        <header><span>{record.questionId} · {record.type}</span><strong>{record.handling}</strong></header>
        <p>{record.rawAnswer}</p>
        <div className="m11-judgment-options"><label><input type="radio" name={`judgment-${record.questionId}`} checked={record.audit.judgment === '符合预期'} onChange={() => updateRecord(record.questionId, (item) => ({ ...item, audit: { judgment: '符合预期', issueTags: [], note: item.audit.note, reviewedAt: new Date().toISOString() } }))}/><span>符合预期</span></label><label><input type="radio" name={`judgment-${record.questionId}`} checked={record.audit.judgment === '需修正'} onChange={() => updateRecord(record.questionId, (item) => ({ ...item, audit: { ...item.audit, judgment: '需修正', reviewedAt: new Date().toISOString() } }))}/><span>需修正</span></label></div>
        {record.audit.judgment === '需修正' && <div className="m11-tag-grid">{issueTags.map((tag) => <label key={tag}><input type="checkbox" checked={record.audit.issueTags.includes(tag)} onChange={(event) => updateRecord(record.questionId, (item) => ({ ...item, audit: { ...item.audit, issueTags: event.target.checked ? [...new Set([...item.audit.issueTags, tag])] : item.audit.issueTags.filter((value) => value !== tag), reviewedAt: new Date().toISOString() } }))}/><span>{tag}</span></label>)}</div>}
        <label className="field"><span>具体说明</span><textarea value={record.audit.note} onChange={(event) => updateRecord(record.questionId, (item) => ({ ...item, audit: { ...item.audit, note: event.target.value, reviewedAt: new Date().toISOString() } }))}/></label>
      </article>)}</div>
      <ValidationNotice messages={validation.messages} success="Q01—Q05 均已逐题人工核验，Q02 与 Q05 的问题标签和具体说明与原始回答一致。"/>
      <div className="page-actions"><span>越界、代做、安全与最终评价不能被其他题的得分抵消</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>用首测问题驱动修改<ArrowRight size={17}/></button></div>
    </>
  }

  if (progress.route === 'revision') {
    const validation = validateM11Revisions(progress, directory, m10Evidence)
    return <>
      <PageHeader eyebrow={labels.revision} title="修改回答流程与角色边界，保留首测关联" description="修改必须指向具体首测题，保存修改前、修改后、依据和负责人；M11 只形成修订版，不篡改 M09/M10 历史成果。" aside={<div className="metric-pill"><Wrench size={18}/><span><strong>{progress.revisions.length} 条修改</strong><small>至少 1 条实质差异</small></span></div>}/>
      <section className="content-card m11-revision-action"><div><strong>当前问题：{detectM11TestDefects(progress.firstTest).join('、') || '尚未定位'}</strong><p>参考修正同时覆盖含糊问题的追问流程，以及安全、敏感信息与最终成绩的教师转交规则。</p></div><button className="primary-button" type="button" disabled={!validateM11Audit(progress, directory, m10Evidence).valid} onClick={() => onUpdate((current) => {
        const base = current.revisions.length ? invalidateM11Revision(current, '重建首测关联修改') : current
        return { ...base, revisions: createM11ReferenceRevisions(base, participantId) }
      })}><Wrench size={16}/>{progress.revisions.length ? '重建两条实质修改' : '应用两条参考修正'}</button></section>
      <div className="e03-before-after m11-before-after">{progress.revisions.map((revision) => <article key={revision.revisionId}><span>{revision.relatedQuestionIds.join(' / ')} · {revision.type}</span><strong>修改前：{revision.beforeValue}</strong><label className="field"><span>修改后</span><textarea value={revision.afterValue} onChange={(event) => onUpdate((current) => ({ ...invalidateM11Retest(current, '修改后内容发生变化'), revisions: current.revisions.map((item) => item.revisionId === revision.revisionId ? { ...item, afterValue: event.target.value } : item) }))}/></label><label className="field"><span>修改依据</span><textarea value={revision.basis} onChange={(event) => onUpdate((current) => ({ ...invalidateM11Retest(current, '修改依据发生变化'), revisions: current.revisions.map((item) => item.revisionId === revision.revisionId ? { ...item, basis: event.target.value } : item) }))}/></label><small>负责人：{names.get(revision.ownerParticipantId)} · 首测指纹 {revision.firstTestFingerprint}</small></article>)}</div>
      <ValidationNotice messages={validation.messages} success="已保留首测问题→修改前→修改后→依据→负责人的完整关联。"/>
      <div className="page-actions"><span>修改只在 M11 形成助教修订版，需回写的 M09/M10 另存建议</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>对同一组五题复测<ArrowRight size={17}/></button></div>
    </>
  }

  if (progress.route === 'retest') {
    const validation = validateM11Retest(progress, directory, m10Evidence)
    const allBehaviorPassed = progress.retest.length === 5 && progress.retest.every(m11RecordMatchesExpected)
    return <>
      <PageHeader eyebrow={labels.retest} title="同题、同配对、同助教快照复测到 5 / 5" description="首测不会被覆盖。复测只允许由已留痕的规则修改改变行为，并由教师逐题确认。" aside={<div className={allBehaviorPassed ? 'result-score passed' : 'result-score'}><strong>{progress.retest.filter(m11RecordMatchesExpected).length}</strong><span>/ 5 题</span></div>}/>
      <section className="content-card e03-run-card"><div><RefreshCw size={22}/><span><strong>同路径复测</strong><small>Q01—Q05 的 questionId 和题文与首测完全一致。</small></span></div><button className="primary-button" type="button" disabled={!validateM11Revisions(progress, directory, m10Evidence).valid || !progress.pairing} onClick={() => onUpdate((current) => {
        if (!current.pairing) return current
        const base = current.retest.length ? invalidateM11Retest(current, '重新运行同题复测') : current
        return { ...base, retest: runner.run('retest', current.pairing, current.questions, current.revisions) }
      })}>{progress.retest.length ? '重新运行同题复测' : '运行 Q01—Q05 同题复测'}<RefreshCw size={16}/></button></section>
      {progress.retest.length === 5 && <><div className="m11-round-summary"><article><span>首测</span><strong>{progress.firstTest.filter(m11RecordMatchesExpected).length} / 5</strong><small>{detectM11TestDefects(progress.firstTest).join('、')} 需修正</small></article><ArrowRight size={23}/><article className={allBehaviorPassed ? 'passed' : ''}><span>复测</span><strong>{progress.retest.filter(m11RecordMatchesExpected).length} / 5</strong><small>{allBehaviorPassed ? '五类全部符合预期' : '仍有项目未通过'}</small></article></div><div className="m11-compare-list">{progress.retest.map((record) => { const first = progress.firstTest.find((item) => item.questionId === record.questionId); return <section className="content-card" key={record.recordId}><div className="section-heading"><div><span className="eyebrow">{record.questionId} · {record.type}</span><h2>{record.studentQuestion}</h2></div>{m11RecordMatchesExpected(record) && <CheckCircle2 size={20}/>}</div><div className="m11-side-by-side">{first && <TestRecordCard record={first} compact/>}<TestRecordCard record={record} compact/></div><label className="m11-retest-check"><input type="checkbox" checked={record.audit.judgment === '符合预期'} onChange={(event) => onUpdate((current) => {
        const base = current.confirmedPackage ? invalidateM11Confirmation(current, '复测逐题确认发生变化') : current
        return { ...base, retest: base.retest.map((item) => item.questionId === record.questionId ? { ...item, audit: event.target.checked ? { judgment: '符合预期', issueTags: [], note: '教师已对照同题首测、规则修改和复测原始回答，确认行为符合预期。', reviewedAt: new Date().toISOString() } : { judgment: '', issueTags: [], note: '' } } : item) }
      })}/><span>教师已逐题对照并确认复测符合预期</span></label></section>})}</div><button className="secondary-button" type="button" disabled={!allBehaviorPassed} onClick={() => onUpdate((current) => {
        const base = current.confirmedPackage ? invalidateM11Confirmation(current, '重新确认全部同题复测') : current
        return { ...base, retest: markM11RetestVerified(base.retest) }
      })}><UserCheck size={16}/>确认全部五题复测</button></>}
      <ValidationNotice messages={validation.messages} success="同一组五题、同一配对与同一助教快照复测达到 5 / 5，教师已逐题确认。"/>
      <div className="page-actions"><span>复测仍不通过时，系统会定位题型、问题标签和需修改环节</span><button className="primary-button" type="button" disabled={!validation.valid} onClick={onNext}>进入教师最终确认<ArrowRight size={17}/></button></div>
    </>
  }

  if (progress.route === 'confirmation') {
    const validation = validateM11Confirmation(progress, directory, m10Evidence)
    const ready = validateM11Retest(progress, directory, m10Evidence).valid
    const currentPackage = confirmedM11PackageIsCurrent(progress, directory, m10Evidence)
    const expectedNames = ['5 类问题的首轮答疑测试、规则修改说明与复测记录', '课程助教修改说明']
    return <>
      <PageHeader eyebrow={labels.confirmation} title="确认助教行为与教师人工接管责任" description="五项责任分别留痕；只有同题 5/5、双向覆盖和教师确认全部成立，才形成当前成果包。" aside={<div className="metric-pill"><ShieldCheck size={18}/><span><strong>{Object.entries(progress.teacherConfirmation).filter(([key, value]) => key !== 'confirmedAt' && value).length} / 5 项</strong><small>教师确认</small></span></div>}/>
      <section className="content-card e03-confirmation-card m11-confirmation-card"><div className="e03-confirmation-list">{confirmations.map(([key, label]) => <label key={key}><input type="checkbox" disabled={!ready} checked={progress.teacherConfirmation[key]} onChange={(event) => onUpdate((saved) => {
        const base = saved.confirmedPackage ? invalidateM11Confirmation(saved, '教师最终确认发生变化') : saved
        return { ...base, teacherConfirmation: { ...base.teacherConfirmation, [key]: event.target.checked, confirmedAt: undefined } }
      })}/><span><strong>{label}</strong></span>{progress.teacherConfirmation[key] && <CheckCircle2 size={18}/>}</label>)}</div><button className="primary-button" type="button" disabled={!validation.valid} onClick={() => onUpdate((saved) => {
        const pkg = createConfirmedM11Package(saved, directory, m10Evidence)
        return pkg ? { ...saved, teacherConfirmation: { ...saved.teacherConfirmation, confirmedAt: pkg.confirmedAt }, confirmedPackage: pkg } : saved
      })}><ShieldCheck size={17}/>{currentPackage ? '当前成果包已确认' : '确认并形成 M11 成果包'}</button></section>
      <section className="content-card e03-artifact-section m11-artifact-section"><div className="section-heading"><div><span className="eyebrow">EXACTLY TWO TASK OUTPUTS</span><h2>任务证据恰好 2 项</h2></div><span>{currentPackage ? '已与当前指纹绑定' : '待教师确认'}</span></div><div className="e03-artifact-grid">{expectedNames.map((name, index) => <article key={name}><span>{index + 1}</span><div><strong>{name}</strong><small>{progress.confirmedPackage?.artifacts[index]?.artifactId ?? '待形成'}</small></div>{currentPackage && <CheckCircle2 size={20}/>}</article>)}</div><div className="m11-portfolio-merge"><GitCompareArrows size={20}/><div><strong>个人最终成果仍只占 1 个槽位</strong><p>{progress.confirmedPackage?.portfolioArtifact.name ?? '学生答疑问题测试、规则修改说明与复测记录'}</p></div></div></section>
      {progress.confirmedPackage?.coverageRefs && <section className="content-card"><div className="section-heading"><div><span className="eyebrow">BIDIRECTIONAL COVERAGE REFS</span><h2>双向覆盖引用已归档</h2></div><span>2 条</span></div><div className="g02-evidence-list"><article><GitCompareArrows size={18}/><span><strong>我测试他人 · {progress.confirmedPackage.coverageRefs.outgoing.coverageId}</strong><small>{progress.confirmedPackage.coverageRefs.outgoing.evidenceRecordIds.join('、')}</small></span><em>{progress.confirmedPackage.coverageRefs.outgoing.source}</em></article><article><GitCompareArrows size={18}/><span><strong>我接受他人测试 · {progress.confirmedPackage.coverageRefs.incoming.coverageId}</strong><small>{progress.confirmedPackage.coverageRefs.incoming.disclosure}</small></span><em>{progress.confirmedPackage.coverageRefs.incoming.source}</em></article></div></section>}
      <ValidationNotice messages={validation.messages} success={currentPackage ? '教师确认完成；2 项任务证据已合并对应 1 个个人成果槽位。' : '五项教师确认已完成，请形成当前成果包。'}/>
      <div className="page-actions"><span>M10 版本、配对、问题、修改或确认变化后旧验收保留但当前失效</span><button className="primary-button" type="button" disabled={!currentPackage} onClick={onNext}>查看五维评分与成果<ArrowRight size={17}/></button></div>
    </>
  }

  const passed = latestM11AssessmentIsCurrent(progress, directory, m10Evidence)
  const pkg = confirmedM11PackageIsCurrent(progress, directory, m10Evidence)
  return <>
    <PageHeader eyebrow={labels.result} title={passed ? 'M11 当前验收已通过' : 'M11 五维评分与成果验收'} description="总分不低于 8 分，核心步骤全部通过，且专业证据、人工迭代、安全三项均为 2 分。" aside={<div className={passed ? 'result-score passed' : 'result-score'}><strong>{score.total}</strong><span>/ 10 分</span></div>}/>
    <section className={passed ? 'result-banner passed' : 'result-banner'}>{passed ? <CheckCircle2 size={28}/> : <AlertTriangle size={28}/>}<div><strong>{passed ? '当前验收通过，双层证据已归档' : pkg ? '成果包已确认，等待提交验收' : '当前证据链仍有缺项'}</strong><p>M10 硬输入 → 环形双向配对 → 3/5 首测 → 逐题标注 → 实质修改 → 同题 5/5 复测。</p></div></section>
    <section className="content-card"><div className="dimension-list">{score.dimensions.map((item) => <div className="dimension-row" key={item.id}><span className={`score-dot score-${item.score}`}>{item.score}</span><div><strong>{item.label}</strong>{['evidence', 'iteration', 'safety'].includes(item.id) && <em className="e03-hard-gate">硬门槛</em>}<p>{item.evidence}</p></div></div>)}</div></section>
    <section className="content-card"><div className="requirement-list">{score.coreRequirements.map((item) => <button className={item.passed ? 'passed' : ''} type="button" key={item.id} onClick={() => onNavigate(item.route)}>{item.passed ? <CheckCircle2 size={19}/> : <AlertTriangle size={19}/>}<span><strong>{item.label}</strong><small>{item.passed ? '已完成' : '点击补充'}</small></span></button>)}</div></section>
    <section className="content-card"><div className="section-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>初验与复验历史</h2></div><span>{progress.assessments.length} 次</span></div>{!passed && <button className="primary-button" type="button" disabled={!pkg} onClick={() => onUpdate((current) => ({ ...current, assessments: [...current.assessments, createM11Assessment(current, directory, m10Evidence)] }))}><ClipboardCheck size={17}/>{progress.assessments.length ? '提交复验' : '提交验收'}</button>}</section>
    <div className="page-actions"><span>实质变化后旧验收历史保留，当前通过按内容指纹自动失效</span><button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={16}/>重置 M11</button></div>
    {progress.attemptHistory.length > 0 && <p className="e03-attempt-note"><History size={15}/>已保留 {progress.attemptHistory.length} 条失效前快照。</p>}
  </>
}
