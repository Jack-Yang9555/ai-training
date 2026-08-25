import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type {
  SchoolTeacherDevelopmentGoal,
  TeacherDevelopmentDimension,
  TeacherDevelopmentLevel,
  TeacherDevelopmentPlanConfig,
  TeacherDevelopmentPlanSummary,
  TeacherDevelopmentScopeId,
} from "./types";

export type {
  SchoolTeacherDevelopmentGoal,
  TeacherDevelopmentDimension,
  TeacherDevelopmentLevel,
  TeacherDevelopmentPlanConfig,
  TeacherDevelopmentPlanSummary,
  TeacherDevelopmentScopeId,
} from "./types";

export const TEACHER_DEVELOPMENT_MIN_AGGREGATE_SIZE = 5;

export const teacherDevelopmentLevels = ["L1", "L2", "L3", "L4"] as const;

export const teacherDevelopmentDimensions = [
  "AI 基础认知",
  "提示词与多模态",
  "知识库与智能体",
  "教学融合",
  "研究创新",
] as const;

export interface TeacherDevelopmentManagerProps {
  onToast?: (message: string) => void;
  initialScopeId?: TeacherDevelopmentScopeId;
  publishedGoals?: readonly SchoolTeacherDevelopmentGoal[];
  onPublish?: (plan: TeacherDevelopmentPlanSummary) => void;
  className?: string;
}

type DistributionKey = TeacherDevelopmentLevel | "pending";

interface AggregateMetric {
  label: string;
  value: number;
  note: string;
}

interface GateMetric {
  id: "fact-verification" | "data-copyright" | "human-responsibility";
  label: string;
  passed: number;
}

interface AnonymousDevelopmentGroup {
  id: string;
  name: string;
  memberCount: number;
  currentSegment: string;
  targetLevel: TeacherDevelopmentLevel;
  focusDimension: TeacherDevelopmentDimension;
  deadline: string;
  requiredModules: string;
  gateRequirement: string;
  completionRate: number;
}

interface AggregateScopeSnapshot {
  id: TeacherDevelopmentScopeId;
  code: string;
  label: string;
  teacherCount: number;
  period: string;
  distribution: Record<DistributionKey, number>;
  dimensionAverages: Record<TeacherDevelopmentDimension, number>;
  gates: readonly GateMetric[];
  progress: readonly AggregateMetric[];
  groups: readonly AnonymousDevelopmentGroup[];
}

const scopeSnapshots: Record<TeacherDevelopmentScopeId, AggregateScopeSnapshot> = {
  school: {
    id: "school",
    code: "SCH",
    label: "全校",
    teacherCount: 96,
    period: "2026 秋季学期",
    distribution: { L1: 18, L2: 32, L3: 23, L4: 9, pending: 14 },
    dimensionAverages: {
      "AI 基础认知": 68,
      "提示词与多模态": 74,
      "知识库与智能体": 66,
      "教学融合": 71,
      "研究创新": 62,
    },
    gates: [
      { id: "fact-verification", label: "事实核验", passed: 84 },
      { id: "data-copyright", label: "数据版权", passed: 80 },
      { id: "human-responsibility", label: "人工责任", passed: 89 },
    ],
    progress: [
      { label: "培训计划确认率", value: 88, note: "84 / 96 人已确认" },
      { label: "课程完成率", value: 74, note: "已完成必修学习" },
      { label: "作品通过率", value: 68, note: "按量规与人工复核" },
      { label: "教学应用闭环率", value: 61, note: "有应用前后证据" },
      { label: "研究成果完成率", value: 46, note: "已通过引用与匿名检查" },
      { label: "结业复测率", value: 37, note: "完成等值复测" },
    ],
    groups: [
      {
        id: "G-01",
        name: "AI 基础补强组",
        memberCount: 18,
        currentSegment: "L1 / 待通关",
        targetLevel: "L2",
        focusDimension: "AI 基础认知",
        deadline: "2026-11-20",
        requiredModules: "AI 通识基础、可信结果核验",
        gateRequirement: "事实核验必须通过",
        completionRate: 42,
      },
      {
        id: "G-02",
        name: "教学融合提升组",
        memberCount: 16,
        currentSegment: "L2",
        targetLevel: "L3",
        focusDimension: "教学融合",
        deadline: "2026-12-18",
        requiredModules: "课堂应用设计、学情诊断与干预",
        gateRequirement: "三项门槛全部通过",
        completionRate: 58,
      },
      {
        id: "G-03",
        name: "知识库实践组",
        memberCount: 12,
        currentSegment: "L2",
        targetLevel: "L3",
        focusDimension: "知识库与智能体",
        deadline: "2026-12-25",
        requiredModules: "课程知识库 RAG、教学智能体实践",
        gateRequirement: "数据版权与人工责任通过",
        completionRate: 51,
      },
      {
        id: "G-04",
        name: "研究创新引领组",
        memberCount: 9,
        currentSegment: "L3",
        targetLevel: "L4",
        focusDimension: "研究创新",
        deadline: "2027-01-15",
        requiredModules: "研究证据管理、AI 成果人工复核",
        gateRequirement: "三项门槛全部通过",
        completionRate: 34,
      },
    ],
  },
  "ai-college": {
    id: "ai-college",
    code: "AIC",
    label: "人工智能学院",
    teacherCount: 54,
    period: "2026 秋季学期",
    distribution: { L1: 8, L2: 18, L3: 15, L4: 6, pending: 7 },
    dimensionAverages: {
      "AI 基础认知": 70,
      "提示词与多模态": 76,
      "知识库与智能体": 73,
      "教学融合": 72,
      "研究创新": 65,
    },
    gates: [
      { id: "fact-verification", label: "事实核验", passed: 50 },
      { id: "data-copyright", label: "数据版权", passed: 45 },
      { id: "human-responsibility", label: "人工责任", passed: 50 },
    ],
    progress: [
      { label: "培训计划确认率", value: 91, note: "49 / 54 人已确认" },
      { label: "课程完成率", value: 79, note: "已完成必修学习" },
      { label: "作品通过率", value: 73, note: "按量规与人工复核" },
      { label: "教学应用闭环率", value: 65, note: "有应用前后证据" },
      { label: "研究成果完成率", value: 52, note: "已通过引用与匿名检查" },
      { label: "结业复测率", value: 43, note: "完成等值复测" },
    ],
    groups: [
      {
        id: "AIC-G-01",
        name: "AI 基础补强组",
        memberCount: 10,
        currentSegment: "L1 / 待通关",
        targetLevel: "L2",
        focusDimension: "AI 基础认知",
        deadline: "2026-11-20",
        requiredModules: "AI 通识基础、可信结果核验",
        gateRequirement: "事实核验必须通过",
        completionRate: 49,
      },
      {
        id: "AIC-G-02",
        name: "知识库实践组",
        memberCount: 12,
        currentSegment: "L2",
        targetLevel: "L3",
        focusDimension: "知识库与智能体",
        deadline: "2026-12-25",
        requiredModules: "课程知识库 RAG、教学智能体实践",
        gateRequirement: "三项门槛全部通过",
        completionRate: 63,
      },
      {
        id: "AIC-G-03",
        name: "研究创新引领组",
        memberCount: 7,
        currentSegment: "L3",
        targetLevel: "L4",
        focusDimension: "研究创新",
        deadline: "2027-01-15",
        requiredModules: "研究证据管理、AI 成果人工复核",
        gateRequirement: "三项门槛全部通过",
        completionRate: 37,
      },
    ],
  },
  "creative-college": {
    id: "creative-college",
    code: "DCC",
    label: "数字创意学院",
    teacherCount: 42,
    period: "2026 秋季学期",
    distribution: { L1: 10, L2: 14, L3: 8, L4: 3, pending: 7 },
    dimensionAverages: {
      "AI 基础认知": 65,
      "提示词与多模态": 72,
      "知识库与智能体": 57,
      "教学融合": 69,
      "研究创新": 58,
    },
    gates: [
      { id: "fact-verification", label: "事实核验", passed: 34 },
      { id: "data-copyright", label: "数据版权", passed: 35 },
      { id: "human-responsibility", label: "人工责任", passed: 39 },
    ],
    progress: [
      { label: "培训计划确认率", value: 83, note: "35 / 42 人已确认" },
      { label: "课程完成率", value: 67, note: "已完成必修学习" },
      { label: "作品通过率", value: 62, note: "按量规与人工复核" },
      { label: "教学应用闭环率", value: 55, note: "有应用前后证据" },
      { label: "研究成果完成率", value: 38, note: "已通过引用与匿名检查" },
      { label: "结业复测率", value: 29, note: "完成等值复测" },
    ],
    groups: [
      {
        id: "DCC-G-01",
        name: "提示词与多模态实践组",
        memberCount: 14,
        currentSegment: "L1 / L2",
        targetLevel: "L3",
        focusDimension: "提示词与多模态",
        deadline: "2026-12-18",
        requiredModules: "结构化提示词、多模态教学作品",
        gateRequirement: "数据版权必须通过",
        completionRate: 56,
      },
      {
        id: "DCC-G-02",
        name: "知识库补强组",
        memberCount: 9,
        currentSegment: "L1 / 待通关",
        targetLevel: "L2",
        focusDimension: "知识库与智能体",
        deadline: "2026-11-27",
        requiredModules: "课程知识库基础、检索引用核验",
        gateRequirement: "事实核验与数据版权通过",
        completionRate: 39,
      },
      {
        id: "DCC-G-03",
        name: "教学融合提升组",
        memberCount: 8,
        currentSegment: "L2",
        targetLevel: "L3",
        focusDimension: "教学融合",
        deadline: "2026-12-25",
        requiredModules: "课堂应用设计、学情诊断与干预",
        gateRequirement: "人工责任必须通过",
        completionRate: 47,
      },
    ],
  },
};

const distributionLabels: ReadonlyArray<{ key: DistributionKey; label: string; note: string }> = [
  { key: "L1", label: "L1 入门", note: "完成基础任务与作品" },
  { key: "L2", label: "L2 实践", note: "可独立完成教学任务" },
  { key: "L3", label: "L3 创新", note: "有复杂作品与应用证据" },
  { key: "L4", label: "L4 引领", note: "有跨场景与研究引领证据" },
  { key: "pending", label: "待通关", note: "有测算等级，但门槛未全部通过" },
];

const moduleRecommendations: Record<TeacherDevelopmentDimension, readonly string[]> = {
  "AI 基础认知": ["AI 通识基础", "可信结果核验"],
  "提示词与多模态": ["结构化提示词", "多模态教学作品"],
  "知识库与智能体": ["课程知识库 RAG", "教学智能体实践"],
  "教学融合": ["课堂应用设计", "学情诊断与干预"],
  "研究创新": ["研究证据管理", "AI 研究成果复核"],
};

const dimensionCodes: Record<TeacherDevelopmentDimension, string> = {
  "AI 基础认知": "BAS",
  "提示词与多模态": "PMM",
  "知识库与智能体": "KBA",
  "教学融合": "TEA",
  "研究创新": "RES",
};

const cadenceByLevel: Record<TeacherDevelopmentLevel, string> = {
  L1: "4 周·每周 2 学时",
  L2: "6 周·每周 3 学时",
  L3: "8 周·每周 4 学时",
  L4: "10 周·每周 4 学时 + 同伴引领",
};

function percentage(value: number, total: number) {
  return `${Math.round((value / total) * 100)}%`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${year} 年 ${Number(month)} 月 ${Number(day)} 日` : value;
}

function getEligibleCount(snapshot: AggregateScopeSnapshot, targetLevel: TeacherDevelopmentLevel) {
  const targetIndex = teacherDevelopmentLevels.indexOf(targetLevel);
  return teacherDevelopmentLevels
    .slice(0, targetIndex)
    .reduce((sum, level) => sum + snapshot.distribution[level], snapshot.distribution.pending);
}

export function buildTeacherDevelopmentPlan(
  config: TeacherDevelopmentPlanConfig,
): TeacherDevelopmentPlanSummary {
  const snapshot = scopeSnapshots[config.scopeId];
  const eligibleCount = getEligibleCount(snapshot, config.targetLevel);
  const groupCount =
    eligibleCount < TEACHER_DEVELOPMENT_MIN_AGGREGATE_SIZE
      ? 0
      : Math.max(1, Math.ceil(eligibleCount / 12));
  const minimumGroupSize = groupCount === 0 ? 0 : Math.floor(eligibleCount / groupCount);
  const maximumGroupSize = groupCount === 0 ? 0 : Math.ceil(eligibleCount / groupCount);
  const groupSizeSummary =
    groupCount === 0
      ? "样本不足，方案已抑制"
      : minimumGroupSize === maximumGroupSize
      ? `每组 ${minimumGroupSize} 人`
      : `每组 ${minimumGroupSize}—${maximumGroupSize} 人`;
  const lowerLevels = teacherDevelopmentLevels.slice(0, teacherDevelopmentLevels.indexOf(config.targetLevel));
  const sourceSegment = ["待通关", ...lowerLevels].join(" / ");

  return {
    ...config,
    id: `TD-${snapshot.code}-${config.targetLevel}-${dimensionCodes[config.focusDimension]}`,
    scopeLabel: snapshot.label,
    eligibleCount,
    groupCount,
    groupSizeSummary,
    sourceSegment,
    requiredModules: [...moduleRecommendations[config.focusDimension]],
    gateRequirement: "事实核验、数据版权、人工责任三项门槛全部通过",
    cadence: cadenceByLevel[config.targetLevel],
  };
}

export function TeacherDevelopmentManager({
  onToast,
  initialScopeId = "school",
  publishedGoals = [],
  onPublish,
  className = "",
}: TeacherDevelopmentManagerProps) {
  const [config, setConfig] = useState<TeacherDevelopmentPlanConfig>({
    scopeId: initialScopeId,
    targetLevel: "L3",
    focusDimension: "教学融合",
    deadline: "2026-12-18",
  });
  const [generatedPlan, setGeneratedPlan] = useState<TeacherDevelopmentPlanSummary | null>(null);
  const snapshot = scopeSnapshots[config.scopeId];
  const visibleGroups = snapshot.groups.filter(
    (group) => group.memberCount >= TEACHER_DEVELOPMENT_MIN_AGGREGATE_SIZE,
  );
  const weakestDimension = teacherDevelopmentDimensions.reduce((current, dimension) =>
    snapshot.dimensionAverages[dimension] < snapshot.dimensionAverages[current] ? dimension : current,
  );
  const publishedForScope = publishedGoals.filter(
    (goal) => goal.scopeId === config.scopeId || (config.scopeId !== "school" && goal.scopeId === "school"),
  );
  const generatedPlanIsPublished = Boolean(
    generatedPlan
    && publishedForScope.some((goal) =>
      goal.id === generatedPlan.id
      && goal.deadline === generatedPlan.deadline
      && goal.targetLevel === generatedPlan.targetLevel
      && goal.focusDimension === generatedPlan.focusDimension,
    ),
  );

  function updateConfig(patch: Partial<TeacherDevelopmentPlanConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
    setGeneratedPlan(null);
  }

  function generatePlan() {
    const plan = buildTeacherDevelopmentPlan(config);
    setGeneratedPlan(plan);
    onToast?.(`已生成 ${plan.scopeLabel} ${plan.groupCount} 个匿名培养群组方案`);
  }

  function publishPlan() {
    if (!generatedPlan || !onPublish || generatedPlan.groupCount === 0) return;
    onPublish(generatedPlan);
    onToast?.(`已发布学校培养目标 ${generatedPlan.id}，适用教师可在培训计划中引用`);
  }

  return (
    <section
      className={`manager-content-stack teacher-development-manager ${className}`.trim()}
      aria-labelledby="teacher-development-title"
    >
      <section className="manager-panel">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">教师发展</span>
            <h2 id="teacher-development-title">学校分层培养</h2>
            <p>
              按正式等级、五维能力、通关门槛和成长进度组织培养；当前仅使用确定性匿名聚合数据。
            </p>
          </div>
          <span>{snapshot.period} · {snapshot.teacherCount} 人</span>
        </div>

        <div className="manager-filter-bar">
          <div role="group" aria-label="教师发展组织范围">
            {(Object.values(scopeSnapshots) as AggregateScopeSnapshot[]).map((scope) => (
              <button
                type="button"
                className={config.scopeId === scope.id ? "is-active" : ""}
                aria-pressed={config.scopeId === scope.id}
                key={scope.id}
                onClick={() => updateConfig({ scopeId: scope.id })}
              >
                {scope.label}
              </button>
            ))}
          </div>
          <span>
            <ShieldCheck size={14} /> 最小聚合人数 {TEACHER_DEVELOPMENT_MIN_AGGREGATE_SIZE} 人
          </span>
        </div>

        <div className="manager-operation-list manager-alert-section" aria-label="聚合与权限边界">
          <article>
            <UsersRound size={18} />
            <div>
              <strong>小样本抑制已启用</strong>
              <small>
                仅显示人数不少于 {TEACHER_DEVELOPMENT_MIN_AGGREGATE_SIZE} 人的组织或群组；不足时不显示人数、比例、标签或趋势。
              </small>
            </div>
            <span>强制规则</span>
          </article>
          <article>
            <ShieldCheck size={18} />
            <div>
              <strong>个人成长数据不可见</strong>
              <small>
                管理端不提供教师姓名、工号、联系方式、单题答案、实操原始输入、笔记、自定义路径、原始作品、研究草稿或个人完整报告。
              </small>
            </div>
            <span>无下钻</span>
          </article>
        </div>
      </section>

      <section className="manager-panel" aria-labelledby="teacher-level-distribution-title">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">正式定级</span>
            <h3 id="teacher-level-distribution-title">L1—L4 与待通关分布</h3>
            <p>待通关人员保留测算等级，但不计入 L1—L4 正式等级人数。</p>
          </div>
        </div>
        <div className="manager-quality-grid" aria-label="教师能力等级分布">
          {distributionLabels.map((item) => {
            const count = snapshot.distribution[item.key];
            return (
              <article key={item.key}>
                <small>{item.label}</small>
                <strong>{count} 人</strong>
                <p>{percentage(count, snapshot.teacherCount)} · {item.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="manager-panel" aria-labelledby="teacher-dimension-title">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">能力与可信底线</span>
            <h3 id="teacher-dimension-title">五维平均与三项门槛</h3>
            <p>五维分数表示能力水平；三项门槛不计分，但任一未通过都会阻断正式定级。</p>
          </div>
          <span>短板：{weakestDimension} {snapshot.dimensionAverages[weakestDimension]} 分</span>
        </div>
        <div className="manager-quality-grid" aria-label="五维能力平均分">
          {teacherDevelopmentDimensions.map((dimension) => (
            <article key={dimension}>
              <small>{dimension}</small>
              <strong>{snapshot.dimensionAverages[dimension]} 分</strong>
              <p>{dimension === weakestDimension ? "当前优先补强" : "五维等权聚合"}</p>
            </article>
          ))}
        </div>
        <div className="manager-quality-grid manager-alert-section" aria-label="三项通关门槛通过率">
          {snapshot.gates.map((gate) => (
            <article key={gate.id}>
              <small>{gate.label}通过率</small>
              <strong>{percentage(gate.passed, snapshot.teacherCount)}</strong>
              <p>{gate.passed} / {snapshot.teacherCount} 人已通过</p>
            </article>
          ))}
        </div>
      </section>

      <section className="manager-panel" aria-labelledby="teacher-progress-title">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">连续成长闭环</span>
            <h3 id="teacher-progress-title">六类进度指标</h3>
            <p>指标仅统计有效学习、作品、应用、研究与复测证据，不以页面访问或工具启动次数充当完成。</p>
          </div>
        </div>
        <div className="manager-quality-grid" aria-label="教师成长进度指标">
          {snapshot.progress.map((metric) => (
            <article key={metric.label}>
              <small>{metric.label}</small>
              <strong>{metric.value}%</strong>
              <p>{metric.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="manager-panel" aria-labelledby="anonymous-groups-title">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">已有培养群组</span>
            <h3 id="anonymous-groups-title">匿名分层培养计划</h3>
            <p>群组只保留编号、规模、目标和进度；不提供成员名单或个人档案链接。</p>
          </div>
          <span>{visibleGroups.length} 个可见群组</span>
        </div>
        <div className="manager-operation-list manager-alert-section">
          {visibleGroups.map((group) => (
            <article key={group.id}>
              <Layers3 size={18} />
              <div>
                <strong>{group.name} {group.id} · {group.memberCount} 人</strong>
                <small>
                  {group.currentSegment} → {group.targetLevel} · 重点：{group.focusDimension} · 截止：{formatDate(group.deadline)}
                </small>
                <small>必修：{group.requiredModules} · 门槛：{group.gateRequirement}</small>
              </div>
              <span>完成 {group.completionRate}%</span>
            </article>
          ))}
        </div>
      </section>

      <section className="manager-panel" aria-labelledby="development-plan-builder-title">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">聚合目标配置</span>
            <h3 id="development-plan-builder-title">生成新的分层培养方案</h3>
            <p>组织范围与上方聚合视图联动；发布后只把群组级目标写入学校培养计划，不反向开放个人成长数据。</p>
          </div>
          <span>{snapshot.label}</span>
        </div>

        <div className="manager-operation-list manager-alert-section" aria-label="当前已发布学校培养目标">
          {publishedForScope.length ? publishedForScope.slice(0, 3).map((goal) => (
            <article key={`${goal.id}-${goal.publishedAt}`}>
              <CheckCircle2 size={18} />
              <div>
                <strong>{goal.id} · {goal.focusDimension} · 目标 {goal.targetLevel}</strong>
                <small>{goal.scopeLabel} · 截止 {formatDate(goal.deadline)} · {goal.groupCount} 个匿名群组</small>
              </div>
              <span>已发布</span>
            </article>
          )) : (
            <article>
              <ClipboardCheck size={18} />
              <div>
                <strong>当前范围暂无已发布培养目标</strong>
                <small>可生成确定性群组方案，经确认后发布到教师培训计划。</small>
              </div>
              <span>待配置</span>
            </article>
          )}
        </div>

        <div className="context-form manager-alert-section">
          <label>
            <strong>目标等级</strong>
            <select
              aria-label="学校培养目标等级"
              value={config.targetLevel}
              onChange={(event) => updateConfig({ targetLevel: event.target.value as TeacherDevelopmentLevel })}
            >
              {teacherDevelopmentLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            <strong>重点维度</strong>
            <select
              aria-label="学校培养重点维度"
              value={config.focusDimension}
              onChange={(event) => updateConfig({ focusDimension: event.target.value as TeacherDevelopmentDimension })}
            >
              {teacherDevelopmentDimensions.map((dimension) => (
                <option key={dimension} value={dimension}>{dimension}</option>
              ))}
            </select>
          </label>
          <label>
            <strong>组织范围</strong>
            <select
              aria-label="学校培养组织范围"
              value={config.scopeId}
              onChange={(event) => updateConfig({ scopeId: event.target.value as TeacherDevelopmentScopeId })}
            >
              {(Object.values(scopeSnapshots) as AggregateScopeSnapshot[]).map((scope) => (
                <option key={scope.id} value={scope.id}>{scope.label}</option>
              ))}
            </select>
          </label>
          <label className="wide">
            <strong>截止日期</strong>
            <input
              aria-label="学校培养截止日期"
              type="date"
              value={config.deadline}
              min="2026-08-21"
              onChange={(event) => updateConfig({ deadline: event.target.value })}
            />
          </label>
        </div>

        <div className="context-generate-bar">
          <div>
            <ClipboardCheck size={20} />
            <span>
              <strong>确定性群组规则</strong>
              <small>选取待通关和低于目标等级的聚合人数，每组不超过 12 人且不少于最小聚合人数。</small>
            </span>
          </div>
          <button className="primary-button" type="button" disabled={!config.deadline} onClick={generatePlan}>
            <GraduationCap size={17} /> 生成群组方案
          </button>
        </div>

        {generatedPlan && (
          <section className="manager-audit-preview" aria-live="polite" aria-label="新的分层培养方案摘要">
            <div className="workspace-title">
              <div>
                <span className="section-kicker">方案已生成</span>
                <h3>{generatedPlan.id}</h3>
              </div>
              <span>{generatedPlanIsPublished ? "学校目标·已发布" : "聚合方案·未发布"}</span>
            </div>
            <article>
              <span>适用范围</span>
              <strong>{generatedPlan.scopeLabel} · {generatedPlan.sourceSegment}</strong>
              <p>{generatedPlan.eligibleCount} 人纳入聚合规则，不生成成员名单。</p>
            </article>
            <article>
              <span>群组结构</span>
              <strong>{generatedPlan.groupCount} 个匿名群组 · {generatedPlan.groupSizeSummary}</strong>
              <p>目标 {generatedPlan.targetLevel} · 重点维度：{generatedPlan.focusDimension}</p>
            </article>
            <article>
              <span>必修模块</span>
              <strong>{generatedPlan.requiredModules.join(" + ")}</strong>
              <p>{generatedPlan.cadence} · 截止 {formatDate(generatedPlan.deadline)}</p>
            </article>
            <article>
              <span>可信门槛</span>
              <strong>{generatedPlan.gateRequirement}</strong>
              <p>门槛未全部通过时只显示测算等级，不授予正式等级。</p>
            </article>
            <div className="context-generate-bar">
              <div>
                <ShieldCheck size={20} />
                <span>
                  <strong>发布仍保持匿名边界</strong>
                  <small>教师端只引用适用的学校目标、建议模块与截止日期，不接收群组成员名单。</small>
                </span>
              </div>
              <button
                className="primary-button"
                type="button"
                disabled={!onPublish || generatedPlan.groupCount === 0 || generatedPlanIsPublished}
                onClick={publishPlan}
              >
                <GraduationCap size={17} /> {generatedPlanIsPublished ? "当前方案已发布" : "发布学校培养目标"}
              </button>
            </div>
          </section>
        )}
      </section>

      <section className="manager-audit-preview" aria-label="教师发展聚合数据说明">
        <div className="workspace-title">
          <div>
            <span className="section-kicker">模拟边界</span>
            <h3>本页为确定性匿名聚合视图</h3>
            <p>数值不来自真实人事、学习或考试系统；正式接入时应由服务端生成经小样本抑制的聚合快照。</p>
          </div>
        </div>
        <article>
          <span>计算口径</span>
          <strong>正式等级 + 五维平均 + 三项门槛 + 六类进度</strong>
          <p>不读取个人证据台账、不在浏览器中用个人记录反算聚合结果。</p>
        </article>
        <article>
          <span>权限边界</span>
          <strong>可制定群组目标，不可访问教师成长档案</strong>
          <p>正式系统还应在接口层拒绝管理角色请求个人答案、笔记、作品和研究草稿。</p>
        </article>
        <article>
          <span>状态说明</span>
          <strong><CheckCircle2 size={15} /> 学校培养目标由共享演示状态统一发布与重置</strong>
          <p><Activity size={14} /> 教师培训计划只读引用当前适用目标；管理端始终不读取个人证据台账。</p>
        </article>
      </section>
    </section>
  );
}
