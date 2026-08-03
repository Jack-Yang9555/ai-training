import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  ListChecks,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getCourseRuntimeDefinition } from "./courseRuntimeData";
import { useEvidenceCenter } from "./evidenceCenter";
import { WorkspaceHeader } from "./ui";
import type {
  AssessmentWorkspaceSummary,
  StudentCourseSummary,
  StudentLearningTaskSummary,
  TeacherClassSummary,
  WorkspaceReportData,
} from "./workspaceData";

export function EthicsTeacherWorkspace({
  classroom,
  report,
  onMoveNext,
  primaryLabel = "进入学习促进",
  onOpenReport,
  onToast,
}: {
  classroom: TeacherClassSummary;
  report: WorkspaceReportData | null;
  onMoveNext: () => void;
  primaryLabel?: string;
  onOpenReport: () => void;
  onToast: (message: string) => void;
}) {
  const { openEvidence } = useEvidenceCenter();
  const runtime = getCourseRuntimeDefinition(classroom.courseId);
  return (
    <div className="page ethics-workspace">
      <WorkspaceHeader
        tone="teach"
        eyebrow="AI 创作伦理与安全 · 轻量完整闭环"
        title="版权、隐私与内容安全"
        description="围绕风险识别、证据核验与方案修订组织课堂；本课程状态与视觉设计课程完全隔离。"
        actions={
          <button className="primary-button" type="button" onClick={onMoveNext}>
            {primaryLabel} <ArrowRight size={15} />
          </button>
        }
      />
      <div className="ethics-teacher-metrics">
        <article><small>课程班级</small><strong>{classroom.name}</strong><span>{classroom.students} 人</span></article>
        <article><small>测评完成</small><strong>{report?.completionRate ?? 91}%</strong><span>{report?.completedCount ?? 31} 人已提交</span></article>
        <article><small>当前薄弱点</small><strong>证据核验</strong><span>掌握度 62%</span></article>
        <article><small>补学完成</small><strong>18%</strong><span>任务已发布</span></article>
      </div>
      <div className="ethics-teacher-grid">
        <section className="card">
          <div className="card-heading"><div><h2>课堂任务路线</h2><p>{runtime.currentTopic} · 45 分钟</p></div></div>
          <div className="ethics-route">
            {runtime.guideSteps.map((step, index) => (
              <button type="button" key={step.id} onClick={() => onToast(`已打开：${step.title}`)}>
                <span>{index + 1}</span><div><strong>{step.title}</strong><small>{step.description}</small></div><em>{step.duration} 分钟</em>
              </button>
            ))}
          </div>
        </section>
        <aside className="card ethics-status-card">
          <span className="section-kicker">课程状态</span>
          <h2>测评与补学已形成回流</h2>
          <ul>
            <li><CheckCircle2 size={16} /> 4 道客观题 + 1 道情境判断</li>
            <li><CheckCircle2 size={16} /> 五项伦理能力报告已生成</li>
            <li><CircleAlert size={16} /> 4 份方案等待人工复核</li>
          </ul>
          <button className="secondary-button" type="button" onClick={() => openEvidence("evidence-ethics-report")}>
            <FileCheck2 size={15} /> 查看课程证据
          </button>
          <button className="primary-button" type="button" onClick={onOpenReport}>
            查看班级诊断 <ArrowRight size={15} />
          </button>
        </aside>
      </div>
    </div>
  );
}

export function EthicsStudentLearning({
  course,
  task,
  remediation,
  onAssessment,
  onCompleteRemediation,
  onToast,
}: {
  course: StudentCourseSummary;
  task: StudentLearningTaskSummary | null;
  remediation: boolean;
  onAssessment: () => void;
  onCompleteRemediation: () => void;
  onToast: (message: string) => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const runtime = getCourseRuntimeDefinition(course.id);
  const checks = [
    "素材来源与授权范围已记录",
    "人物身份与敏感信息已脱敏",
    "可能造成误导或伤害的内容已修订",
    "AI 使用与最终责任已明确说明",
  ];
  const completed = checks.filter((item) => checked[item]).length;
  const { openEvidence } = useEvidenceCenter();
  return (
    <div className="page ethics-workspace">
      <WorkspaceHeader
        tone="learn"
        eyebrow={`${course.name} · ${course.teacher}`}
        title="风险识别与方案修订"
        description={runtime.learningBrief}
        summary={<div className="ethics-progress"><strong>{completed}/4</strong><span>风险检查已完成</span></div>}
      />
      {remediation && (
        <section className="remediation-banner">
          <span><ShieldCheck size={18} /></span>
          <div><strong>新补学任务：版权与隐私风险辨识补强包</strong><p>2 组授权判断 + 2 组隐私脱敏 + 1 次证据核验</p></div>
          <button type="button" onClick={onCompleteRemediation}><Play size={15} /> 完成补学</button>
        </section>
      )}
      <div className="ethics-learning-grid">
        <section className="card ethics-case-card">
          <span className="section-kicker">当前学习任务</span>
          <h2>{task?.title ?? runtime.practiceTitle}</h2>
          <p>{task?.description ?? runtime.practiceDescription}</p>
          <div className="ethics-case">
            <strong>待修订方案</strong>
            <p>使用社交平台抓取的人像训练校园宣传角色；沿用网络插画并隐藏出处；自动发布生成内容，不设置人工复核。</p>
          </div>
          <div className="ethics-checklist">
            {checks.map((item) => (
              <button
                type="button"
                key={item}
                className={checked[item] ? "is-checked" : ""}
                onClick={() => setChecked((current) => ({ ...current, [item]: !current[item] }))}
              >
                <span>{checked[item] ? <Check size={15} /> : null}</span>{item}
              </button>
            ))}
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={completed < checks.length}
            onClick={() => {
              onToast("修订方案 v2 已保存，风险证据清单已归档");
              onAssessment();
            }}
          >
            保存修订并进入测评 <ArrowRight size={15} />
          </button>
        </section>
        <aside className="card ethics-learning-side">
          <BookOpenCheck size={24} />
          <h2>判断必须有证据</h2>
          <p>发现风险只是第一步。请记录来源、授权范围、脱敏方式和人工确认人。</p>
          <button className="secondary-button" type="button" onClick={() => openEvidence("evidence-ethics-report")}>
            查看证据示例
          </button>
        </aside>
      </div>
    </div>
  );
}

const ethicsQuestions = [
  {
    id: "ethics-q1",
    type: "单选题",
    point: "版权识别",
    stem: "将网络插画直接作为生成参考，发布前最关键的处理是什么？",
    options: ["隐藏图片出处", "核验授权范围并记录来源", "只降低分辨率", "改用更长提示词"],
    answer: "核验授权范围并记录来源",
  },
  {
    id: "ethics-q2",
    type: "单选题",
    point: "隐私保护",
    stem: "处理包含学生人脸的训练素材时，哪项做法最合适？",
    options: ["默认公开使用", "仅删除文件名", "取得授权并完成必要脱敏", "交给 AI 自动判断"],
    answer: "取得授权并完成必要脱敏",
  },
  {
    id: "ethics-q3",
    type: "判断题",
    point: "内容安全",
    stem: "只要内容由 AI 自动生成，发布者就不需要承担审核责任。",
    options: ["正确", "错误"],
    answer: "错误",
  },
  {
    id: "ethics-q4",
    type: "单选题",
    point: "证据核验",
    stem: "哪项最能证明素材可用于当前校园宣传场景？",
    options: ["素材看起来很专业", "保留授权协议与适用范围", "生成结果没有水印", "模型回答可以使用"],
    answer: "保留授权协议与适用范围",
  },
  {
    id: "ethics-q5",
    type: "情境判断题",
    point: "责任判断",
    stem: "AI 生成的校园招生活动画面疑似刻板化某类学生，发布负责人应如何处理？",
    options: ["按计划直接发布", "仅修改颜色", "暂停发布、人工复核并记录修订依据", "删除 AI 使用说明"],
    answer: "暂停发布、人工复核并记录修订依据",
  },
];

export function EthicsAssessmentWorkspace({
  assessment,
  onComplete,
}: {
  assessment: AssessmentWorkspaceSummary;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const question = ethicsQuestions[index];
  const correct = useMemo(
    () => ethicsQuestions.filter((item) => answers[item.id] === item.answer).length,
    [answers],
  );
  const answer = answers[question.id];
  return (
    <div className="page ethics-workspace">
      <WorkspaceHeader
        tone="assess"
        eyebrow={`${assessment.scene} · 4 道客观题 + 1 道情境判断题`}
        title="版权、隐私与内容安全测评"
        description="逐题完成风险判断；提交后生成只属于你的五项能力报告。"
      />
      <section className="card ethics-assessment-card">
        {!submitted ? (
          <>
            <div className="ethics-assessment-progress">
              <span>第 {index + 1} / {ethicsQuestions.length} 题</span>
              <div><i style={{ width: `${((index + 1) / ethicsQuestions.length) * 100}%` }} /></div>
              <em>{question.type} · {question.point}</em>
            </div>
            <h2>{question.stem}</h2>
            <div className="answer-options">
              {question.options.map((option, optionIndex) => (
                <button
                  type="button"
                  className={answer === option ? "selected" : ""}
                  key={option}
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p>{answer === option && <Check size={16} />}
                </button>
              ))}
            </div>
            <div className="test-actions">
              <button className="secondary-button" type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>上一题</button>
              {index < ethicsQuestions.length - 1 ? (
                <button className="primary-button" type="button" disabled={!answer} onClick={() => setIndex((value) => value + 1)}>下一题 <ArrowRight size={15} /></button>
              ) : (
                <button className="primary-button" type="button" disabled={Object.keys(answers).length < ethicsQuestions.length} onClick={() => setSubmitted(true)}>提交测评 <Check size={15} /></button>
              )}
            </div>
          </>
        ) : (
          <div className="ethics-assessment-result">
            <span><CheckCircle2 size={30} /></span>
            <small>测评与方案证据已归档</small>
            <h2>完成 5 / 5 题，客观判断 {correct} / 5 正确</h2>
            <p>综合得分 82。版权识别和隐私保护进步明显，证据核验仍需补强。</p>
            <button className="primary-button" type="button" onClick={onComplete}>
              查看五项能力报告 <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
