import type {
  LearnerGroup,
  LearningEvidence,
  LearningObservationSnapshot,
  ObservationScope,
} from './types'

const studentNames = [
  '顾明远', '沈清禾', '宋景行', '叶舒然', '江闻舟', '陆星遥', '温以宁', '陈予安',
  '程知远', '唐若溪', '贺云深', '苏念安', '秦书言', '许知夏', '周子墨', '夏语桐',
  '乔慕白', '林一诺', '梁思齐', '季南乔', '孟星河', '谢知意', '傅言川', '韩清越',
  '方予晴', '罗景澄', '魏安然', '杜若衡', '袁清和', '郑书瑶', '邵云起', '蒋意欢',
  '薛明川', '潘知微', '曹映雪', '何远帆',
]

export const learningStudents = studentNames.map((name, index) => ({
  id: `AI240${String(index + 1).padStart(2, '0')}`,
  name,
}))

const ids = learningStudents.map((student) => student.id)
const supportIds = [...ids.slice(0, 7), 'AI24018']
const remainingIds = ids.filter((id) => !supportIds.includes(id))
const consolidateIds = remainingIds.slice(0, 19)
const extendIds = remainingIds.slice(19)

export const initialLearnerGroups: LearnerGroup[] = [
  {
    id: 'support',
    name: '补强组',
    purpose: '先建立可观察的偏差诊断方法',
    reason: '连续练习未改善，负向提示词与实际画面偏差缺少对应证据。',
    knowledgePointId: 'negative',
    memberIds: supportIds,
  },
  {
    id: 'consolidate',
    name: '巩固组',
    purpose: '把构图控制迁移到新的创作主题',
    reason: '已理解核心概念，但跨情境应用的稳定性仍有波动。',
    knowledgePointId: 'composition',
    memberIds: consolidateIds,
  },
  {
    id: 'extend',
    name: '拓展组',
    purpose: '形成可复用的个人视觉控制策略',
    reason: '基础任务完成稳定，可以增加开放约束和自我评价要求。',
    knowledgePointId: 'iteration',
    memberIds: extendIds,
  },
]

const evidence: LearningEvidence[] = [
  { id: 'ev-1', studentId: 'AI24018', studentName: '林一诺', knowledgePointId: 'negative', source: '课堂练习', summary: '4 次偏差诊断中有 2 次使用了无关通用质量词', observedAt: '今天 10:18', confidence: 94, artifact: '随堂练习 3 · 作答记录' },
  { id: 'ev-2', studentId: 'AI24018', studentName: '林一诺', knowledgePointId: 'composition', source: '作品迭代', summary: '第 3 版能通过引导线建立视觉焦点', observedAt: '今天 10:26', confidence: 92, artifact: '未来学习空间 · 第 3 版' },
  { id: 'ev-3', studentId: 'AI24008', studentName: '陈予安', knowledgePointId: 'composition', source: '课堂练习', summary: '连续 3 次调整仍未改变主体与背景的层级关系', observedAt: '今天 10:21', confidence: 96, artifact: '构图控制练习 · 三次尝试' },
  { id: 'ev-4', studentId: 'AI24003', studentName: '宋景行', knowledgePointId: 'negative', source: 'AI助教', summary: '关于文字水印的追问未得到可验证的修改结果', observedAt: '今天 10:14', confidence: 88, artifact: 'AI 助教对话 #126' },
  { id: 'ev-5', studentId: 'AI24006', studentName: '陆星遥', knowledgePointId: 'iteration', source: '作品迭代', summary: '已提交首版作品，但没有修改记录与反思说明', observedAt: '昨天 16:40', confidence: 90, artifact: '未来学习空间 · 第 1 版' },
  { id: 'ev-6', studentId: 'AI24002', studentName: '沈清禾', knowledgePointId: 'structure', source: '学习任务', summary: '本课导学与结构化提示词任务尚未开始', observedAt: '今天 09:55', confidence: 100, artifact: '课次 3 · 任务状态' },
  { id: 'ev-7', studentId: 'AI24014', studentName: '许知夏', knowledgePointId: 'structure', source: '测评过程', summary: '六要素识别与重组连续两次达到目标水平', observedAt: '昨天 15:20', confidence: 91, artifact: '单元形成性检测 2' },
  { id: 'ev-8', studentId: 'AI24015', studentName: '周子墨', knowledgePointId: 'iteration', source: '作品迭代', summary: '能够解释三轮修改与生成结果之间的关系', observedAt: '今天 10:28', confidence: 95, artifact: '作品迭代说明 · 第 3 版' },
  { id: 'ev-9', studentId: 'AI24001', studentName: '顾明远', knowledgePointId: 'negative', source: '课堂练习', summary: '两次练习均将负向提示词写成通用质量词', observedAt: '今天 10:12', confidence: 93, artifact: '偏差诊断练习 · 第 2 次' },
  { id: 'ev-10', studentId: 'AI24005', studentName: '江闻舟', knowledgePointId: 'negative', source: 'AI助教', summary: '同一知识点重复提问 4 次，尚未提交修改样例', observedAt: '今天 10:23', confidence: 86, artifact: 'AI 助教对话聚类 #negative' },
  { id: 'ev-11', studentId: 'AI24012', studentName: '苏念安', knowledgePointId: 'composition', source: '学习任务', summary: '构图迁移任务晚于计划 1 个课次', observedAt: '昨天 18:00', confidence: 100, artifact: '单元任务进度' },
  { id: 'ev-12', studentId: 'AI24030', studentName: '郑书瑶', knowledgePointId: 'iteration', source: '作品迭代', summary: '主动增加限制条件并完成风格一致性复核', observedAt: '今天 10:30', confidence: 94, artifact: '拓展挑战 · 个人风格词库' },
]

const signals = [
  { id: 'sg-1', studentId: 'AI24008', studentName: '陈予安', type: '连续尝试未改善' as const, level: 'high' as const, title: '构图控制连续三次未改善', detail: '建议先使用正反案例定位主体层级，再继续生成。', knowledgePointId: 'composition', evidenceIds: ['ev-3'] },
  { id: 'sg-2', studentId: 'AI24002', studentName: '沈清禾', type: '任务未开始' as const, level: 'high' as const, title: '本课学习任务尚未开始', detail: '已落后当前教学进度一个环节，需要确认进入障碍。', knowledgePointId: 'structure', evidenceIds: ['ev-6'] },
  { id: 'sg-3', studentId: 'AI24006', studentName: '陆星遥', type: '作品缺少迭代' as const, level: 'medium' as const, title: '作品只有首版且无反思', detail: '建议提供一次基于证据的修改脚手架。', knowledgePointId: 'iteration', evidenceIds: ['ev-5'] },
  { id: 'sg-4', studentId: 'AI24003', studentName: '宋景行', type: '助教问题未解决' as const, level: 'medium' as const, title: '水印问题尚未形成可验证修改', detail: 'AI 助教对话已转为教师可查看的过程证据。', knowledgePointId: 'negative', evidenceIds: ['ev-4'] },
  { id: 'sg-5', studentId: 'AI24012', studentName: '苏念安', type: '进度滞后' as const, level: 'medium' as const, title: '构图迁移任务落后一个课次', detail: '概念理解正常，建议缩短任务并保留核心迁移目标。', knowledgePointId: 'composition', evidenceIds: ['ev-11'] },
]

const scopeConfig: Record<ObservationScope, Pick<LearningObservationSnapshot, 'updatedAt' | 'metrics' | 'trends' | 'stages'>> = {
  lesson: {
    updatedAt: '今天 10:32 · 当前课次',
    metrics: { participationRate: 89, completionRate: 68, onTrackCount: 25, attentionCount: 7 },
    trends: [
      { label: '导学', participation: 92, completion: 86, practice: 78, iteration: 22 },
      { label: '概念', participation: 89, completion: 81, practice: 74, iteration: 31 },
      { label: '实践', participation: 89, completion: 68, practice: 66, iteration: 47 },
    ],
    stages: [{ label: '提前完成', count: 4, tone: 'green' }, { label: '按计划推进', count: 21, tone: 'blue' }, { label: '进度滞后', count: 7, tone: 'amber' }, { label: '尚未开始', count: 4, tone: 'coral' }],
  },
  week: {
    updatedAt: '今天 10:32 · 最近 7 天',
    metrics: { participationRate: 92, completionRate: 74, onTrackCount: 27, attentionCount: 6 },
    trends: [
      { label: '周一', participation: 86, completion: 58, practice: 61, iteration: 24 },
      { label: '周二', participation: 89, completion: 64, practice: 67, iteration: 32 },
      { label: '周三', participation: 91, completion: 70, practice: 72, iteration: 41 },
      { label: '今天', participation: 92, completion: 74, practice: 76, iteration: 49 },
    ],
    stages: [{ label: '提前完成', count: 6, tone: 'green' }, { label: '按计划推进', count: 21, tone: 'blue' }, { label: '进度滞后', count: 6, tone: 'amber' }, { label: '尚未开始', count: 3, tone: 'coral' }],
  },
  unit: {
    updatedAt: '今天 10:32 · 本单元持续更新',
    metrics: { participationRate: 94, completionRate: 78, onTrackCount: 28, attentionCount: 8 },
    trends: [
      { label: '课次 1', participation: 83, completion: 61, practice: 64, iteration: 18 },
      { label: '课次 2', participation: 89, completion: 69, practice: 71, iteration: 32 },
      { label: '课次 3', participation: 94, completion: 78, practice: 76, iteration: 49 },
      { label: '当前', participation: 94, completion: 78, practice: 79, iteration: 56 },
    ],
    stages: [{ label: '拓展学习', count: 9, tone: 'green' }, { label: '稳定巩固', count: 19, tone: 'blue' }, { label: '需要补强', count: 8, tone: 'coral' }],
  },
}

export const initialLearningSnapshots = (Object.keys(scopeConfig) as ObservationScope[]).reduce((result, scope) => {
  result[scope] = {
    scope,
    courseId: 'course-visual-design',
    classId: 'class-ai-2401',
    className: '人工智能 2401 班',
    unitId: 'unit-2',
    unitTitle: '单元二 · 画面控制与创作迭代',
    learnerCount: 36,
    ...scopeConfig[scope],
    signals: scope === 'lesson' ? signals.slice(0, 4) : signals,
    evidence,
  }
  return result
}, {} as Record<ObservationScope, LearningObservationSnapshot>)

export const knowledgePointNames: Record<string, string> = {
  structure: '提示词结构',
  composition: '画面与构图控制',
  negative: '负向提示词',
  iteration: '迭代与评估',
}

const classLearningVariants = {
  "class-ai-2402": {
    className: "人工智能 2402 班",
    learnerCount: 32,
    participationOffset: -7,
    completionOffset: -9,
    attentionCount: 3,
    unitTitle: "单元二 · 场景、媒介与风格",
    summaryPrefix: "媒介与风格练习中",
  },
  "class-media-2302": {
    className: "数字媒体 2302 班",
    learnerCount: 30,
    participationOffset: -22,
    completionOffset: -18,
    attentionCount: 5,
    unitTitle: "单元四 · 多轮创作与版本管理",
    summaryPrefix: "版本记录任务中",
  },
} as const

export function createLearningSnapshotsForClass(
  classId: string,
): Record<ObservationScope, LearningObservationSnapshot> {
  if (classId === "class-ai-2401") return structuredClone(initialLearningSnapshots)
  const variant = classLearningVariants[classId as keyof typeof classLearningVariants]
  if (!variant) return structuredClone(initialLearningSnapshots)
  return Object.fromEntries(
    (Object.keys(initialLearningSnapshots) as ObservationScope[]).map((scope) => {
      const source = initialLearningSnapshots[scope]
      const stages = source.stages.map((stage, index) => ({
        ...stage,
        count: Math.max(1, Math.round((stage.count / source.learnerCount) * variant.learnerCount) - (index === 1 ? 1 : 0)),
      }))
      const snapshot: LearningObservationSnapshot = {
        ...structuredClone(source),
        classId,
        className: variant.className,
        learnerCount: variant.learnerCount,
        unitTitle: variant.unitTitle,
        metrics: {
          participationRate: Math.max(0, source.metrics.participationRate + variant.participationOffset),
          completionRate: Math.max(0, source.metrics.completionRate + variant.completionOffset),
          onTrackCount: Math.max(0, variant.learnerCount - variant.attentionCount),
          attentionCount: variant.attentionCount,
        },
        trends: source.trends.map((trend) => ({
          ...trend,
          participation: Math.max(0, trend.participation + variant.participationOffset),
          completion: Math.max(0, trend.completion + variant.completionOffset),
          practice: Math.max(0, trend.practice + Math.round(variant.completionOffset / 2)),
          iteration: Math.max(0, trend.iteration + Math.round(variant.completionOffset / 3)),
        })),
        stages,
        signals: source.signals.slice(0, variant.attentionCount).map((signal, index) => ({
          ...signal,
          id: `${classId}-${signal.id}`,
          evidenceIds: signal.evidenceIds.map((id) => `${classId}-${id}`),
          title: `${variant.summaryPrefix}${index + 1 > 1 ? "的共性信号" : "需要优先处理"}`,
          detail: `${variant.unitTitle} · ${signal.detail}`,
        })),
        evidence: source.evidence.map((item) => ({
          ...item,
          id: `${classId}-${item.id}`,
          summary: `${variant.summaryPrefix}：${item.summary}`,
          artifact: `${variant.unitTitle} · ${item.artifact}`,
        })),
      }
      return [scope, snapshot]
    }),
  ) as Record<ObservationScope, LearningObservationSnapshot>
}

export function createLearnerGroupsForClass(
  classId: string,
  learnerCount: number,
): LearnerGroup[] {
  const availableIds = ids.slice(0, learnerCount)
  const supportCount = classId === "class-ai-2401" ? 8 : classId === "class-ai-2402" ? 6 : 7
  const extendCount = classId === "class-ai-2401" ? 9 : classId === "class-ai-2402" ? 7 : 6
  const support = availableIds.slice(0, supportCount)
  const extend = availableIds.slice(-extendCount)
  const consolidate = availableIds.filter((id) => !support.includes(id) && !extend.includes(id))
  return initialLearnerGroups.map((group) => ({
    ...structuredClone(group),
    memberIds: group.id === "support" ? support : group.id === "extend" ? extend : consolidate,
    reason:
      classId === "class-ai-2402"
        ? `${group.reason} 当前证据来自媒介与风格表达任务。`
        : classId === "class-media-2302"
          ? `${group.reason} 当前证据来自版本记录与创作反思任务。`
          : group.reason,
  }))
}
