import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, FileSearch, ShieldCheck, X } from "lucide-react";
import type { EvidenceRecord } from "./types";

export const evidenceRecords: EvidenceRecord[] = [
  {
    id: "evidence-prepare-visual",
    courseId: "course-visual-design",
    kind: "备课适配",
    title: "AI 备课适配依据",
    source: "课程标准 v2.1、人工智能 2401 班课前诊断",
    knowledgePoints: ["提示词结构", "画面与构图控制", "负向提示词"],
    originalInput: "基础一般、36 人、线下 45 分钟，重点提升负向提示词应用。",
    artifactVersion: "情境化教案 v1.3",
    rubric: ["目标可测量", "活动与目标一致", "难度适配", "资源可追溯"],
    aiConclusion: "保留标准目标，将负向提示词案例增加 2 分钟并减少风格词讲解。",
    confidence: 91,
    sufficiency: "充分",
    permissionScope: "教师课程",
    anonymous: true,
    modelVersion: "Qijing-Sim-2026.07",
    generatedAt: "2026-07-31 09:12",
    updatedAt: "2026-07-31 09:18",
    reviewStatus: "已确认",
    humanEdits: [{ operator: "周老师", change: "将案例对比由 6 分钟调整为 8 分钟", at: "09:18" }],
  },
  {
    id: "evidence-tutor-answer",
    courseId: "course-visual-design",
    kind: "助教回答",
    title: "AI 助教回答引用",
    source: "《提示词讲义》第 3.2 节、案例集 CASE-014",
    knowledgePoints: ["负向提示词"],
    originalInput: "画面中总出现文字水印，应该怎样调整？",
    artifactVersion: "助教回答 v1",
    rubric: ["仅引用课程资料", "明确知识边界", "给出可执行步骤"],
    aiConclusion: "在负向提示词中明确加入文字、水印、Logo，并对比修改前后结果。",
    confidence: 88,
    sufficiency: "充分",
    permissionScope: "学生本人",
    anonymous: false,
    modelVersion: "Qijing-Tutor-Sim-2.4",
    generatedAt: "2026-07-31 10:06",
    updatedAt: "2026-07-31 10:06",
    reviewStatus: "无需复核",
    humanEdits: [],
  },
  {
    id: "evidence-ai-score",
    courseId: "course-visual-design",
    kind: "AI评分",
    title: "AI 批改评分证据",
    source: "学生作品第 3 版、提示词迭代记录、课程评分量规 v2.0",
    knowledgePoints: ["提示词结构", "视觉表达", "内容安全"],
    originalInput: "未来学习空间作品第 3 版及创作说明。",
    artifactVersion: "作品 v3 / 评分 v2",
    rubric: ["任务符合度 10", "提示词结构 10", "视觉表达 10", "创意表现 10", "内容安全 10"],
    aiConclusion: "AI 原评分 43/50；教师复核后确认视觉表达证据不足，最终 42/50。",
    aiOriginalValue: "43 / 50",
    finalValue: "42 / 50",
    confidence: 92,
    sufficiency: "基本充分",
    permissionScope: "教师课程",
    anonymous: false,
    modelVersion: "Qijing-Grader-Sim-1.8",
    generatedAt: "2026-07-31 10:42",
    updatedAt: "2026-07-31 10:51",
    reviewStatus: "已修改",
    humanEdits: [{ operator: "周老师", change: "视觉表达维度 -1，补充复核说明", at: "10:51" }],
  },
  {
    id: "evidence-diagnosis",
    courseId: "course-visual-design",
    kind: "学情诊断",
    title: "负向提示词掌握诊断",
    source: "学习任务、课堂练习、作品迭代、测评过程、AI 助教对话",
    knowledgePoints: ["负向提示词"],
    originalInput: "人工智能 2401 班最近一个单元的匿名过程证据。",
    artifactVersion: "班级诊断快照 v4",
    rubric: ["至少两类证据", "证据时效不超过 7 天", "区分未掌握与证据不足"],
    aiConclusion: "班级掌握度 54%，8 名学生需先完成针对性排除词练习。",
    confidence: 86,
    sufficiency: "充分",
    permissionScope: "匿名教学管理",
    anonymous: true,
    modelVersion: "Qijing-Diagnosis-Sim-3.1",
    generatedAt: "2026-07-31 10:38",
    updatedAt: "2026-07-31 10:38",
    reviewStatus: "待复核",
    humanEdits: [],
  },
  {
    id: "evidence-report-remediation",
    courseId: "course-visual-design",
    kind: "报告建议",
    title: "报告建议与补学任务依据",
    source: "阶段测评、作品 v2→v3、教师复核结果",
    knowledgePoints: ["负向提示词", "画面与构图控制"],
    originalInput: "个人评分证据与最近两次作品版本。",
    artifactVersion: "成长报告 v1.2",
    rubric: ["只使用本人证据", "建议对应薄弱点", "任务可完成且可回流"],
    aiConclusion: "推荐立即完成画面控制与负向提示词补强包。",
    confidence: 89,
    sufficiency: "充分",
    permissionScope: "学生本人",
    anonymous: false,
    modelVersion: "Qijing-Report-Sim-2.0",
    generatedAt: "2026-07-31 10:55",
    updatedAt: "2026-07-31 10:55",
    reviewStatus: "无需复核",
    humanEdits: [],
  },
  {
    id: "evidence-ethics-report",
    courseId: "course-ai-ethics",
    kind: "补学任务",
    title: "版权与隐私风险辨识补强依据",
    source: "伦理测评 5 题、风险修订方案 v2、来源核验清单",
    knowledgePoints: ["版权识别", "隐私保护", "证据核验"],
    originalInput: "个人作答与修订版方案，不包含其他学生数据。",
    artifactVersion: "伦理成长报告 v1",
    rubric: ["风险识别准确", "修订可执行", "来源可核验", "责任边界清晰"],
    aiConclusion: "证据核验仍偏弱，建议完成版权与隐私风险辨识补强包。",
    confidence: 84,
    sufficiency: "基本充分",
    permissionScope: "学生本人",
    anonymous: false,
    modelVersion: "Qijing-Ethics-Sim-1.0",
    generatedAt: "2026-07-31 15:20",
    updatedAt: "2026-07-31 15:20",
    reviewStatus: "无需复核",
    humanEdits: [],
  },
  {
    id: "evidence-tutor-low-confidence",
    courseId: "course-visual-design",
    kind: "助教回答",
    title: "低置信度助教回答复核",
    source: "课程知识库仅命中《案例集》1 条低相关片段",
    knowledgePoints: ["媒介选择", "知识边界"],
    originalInput: "学校对校外发布的 AI 图片有哪些最新版权审批要求？",
    artifactVersion: "助教回答 v1",
    rubric: ["仅引用课程资料", "证据不足时明确说明", "超出范围转人工"],
    aiConclusion: "课程知识库不包含学校最新审批制度，当前无法确认；请查阅学校正式规定或联系教师。",
    confidence: 42,
    sufficiency: "证据不足",
    permissionScope: "匿名教学管理",
    anonymous: true,
    modelVersion: "Qijing-Tutor-Sim-2.4",
    generatedAt: "2026-07-31 14:31",
    updatedAt: "2026-07-31 14:35",
    reviewStatus: "待复核",
    humanEdits: [],
  },
];

interface EvidenceCenterValue {
  openEvidence: (id: string) => void;
  closeEvidence: () => void;
}

const EvidenceCenterContext = createContext<EvidenceCenterValue | null>(null);

export function EvidenceCenterProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const record = useMemo(
    () => evidenceRecords.find((item) => item.id === activeId) ?? null,
    [activeId],
  );

  return (
    <EvidenceCenterContext.Provider
      value={{ openEvidence: setActiveId, closeEvidence: () => setActiveId(null) }}
    >
      {children}
      {record && (
        <div className="evidence-overlay" role="presentation" onMouseDown={() => setActiveId(null)}>
          <aside
            className="evidence-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={record.title}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span><FileSearch size={15} /> 统一 AI 证据链</span>
                <h2>{record.title}</h2>
                <p>{record.kind} · {record.artifactVersion}</p>
              </div>
              <button type="button" aria-label="关闭证据详情" onClick={() => setActiveId(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="evidence-governance">
              <span><ShieldCheck size={14} /> {record.permissionScope}</span>
              <span>置信度 {record.confidence}%</span>
              <span className={record.sufficiency === "证据不足" ? "is-warning" : ""}>{record.sufficiency}</span>
              <span>{record.reviewStatus}</span>
            </div>
            <section>
              <h3>来源与知识点</h3>
              <p>{record.source}</p>
              <div className="evidence-tags">{record.knowledgePoints.map((item) => <span key={item}>{item}</span>)}</div>
            </section>
            <section>
              <h3>原始输入或作品版本</h3>
              <p>{record.originalInput}</p>
            </section>
            <section>
              <h3>使用的量规条目</h3>
              <ul>{record.rubric.map((item) => <li key={item}><CheckCircle2 size={14} /> {item}</li>)}</ul>
            </section>
            <section>
              <h3>AI 判断与得分理由</h3>
              <p>{record.aiConclusion}</p>
              {record.aiOriginalValue && (
                <div className="evidence-values">
                  <span>AI 原值 <strong>{record.aiOriginalValue}</strong></span>
                  <span>最终值 <strong>{record.finalValue}</strong></span>
                </div>
              )}
            </section>
            <section>
              <h3>治理与版本</h3>
              <dl>
                <div><dt>模拟服务版本</dt><dd>{record.modelVersion}</dd></div>
                <div><dt>匿名状态</dt><dd>{record.anonymous ? "已匿名" : "本人可见"}</dd></div>
                <div><dt>生成时间</dt><dd>{record.generatedAt}</dd></div>
                <div><dt>更新时间</dt><dd>{record.updatedAt}</dd></div>
              </dl>
            </section>
            <section>
              <h3>教师修改与最终确认</h3>
              {record.humanEdits.length ? (
                record.humanEdits.map((item) => (
                  <p key={`${item.operator}-${item.at}`}>{item.operator} · {item.at}：{item.change}</p>
                ))
              ) : (
                <p>暂无人工修改；当前结论状态为“{record.reviewStatus}”。</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </EvidenceCenterContext.Provider>
  );
}

export function useEvidenceCenter() {
  const value = useContext(EvidenceCenterContext);
  if (!value) throw new Error("useEvidenceCenter must be used inside EvidenceCenterProvider");
  return value;
}
