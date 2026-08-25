import type { TeacherAbilityDimensionName } from "./types"
import {
  ABILITY_DIMENSIONS,
  ABILITY_LEVELS,
  EMPTY_GATE_RESULTS,
  EVIDENCE_CHANNELS,
  GATE_IDS,
  GROWTH_STAGE_DEFINITIONS,
  type AbilityChannelScores,
  type AbilityDimensionScores,
  type AbilityLevel,
  type AbilityLevelEligibility,
  type AbilitySnapshot,
  type DerivedGrowthStage,
  type DimensionChannelScores,
  type EvidenceChannel,
  type EvidenceCoverageStatus,
  type GateId,
  type GateStatus,
  type GrowthEvidenceQualifier,
  type GrowthEvidenceRecord,
  type GrowthStageId,
  type GrowthStageStatus,
  type RetestEligibilityResult,
  type RetestRequirementCheck,
  type TeacherGrowthCycle,
} from "./teacherGrowthModel"

export const CHANNEL_WEIGHTS: Readonly<Record<EvidenceChannel, number>> = {
  assessment: 0.3,
  task: 0.25,
  artifact: 0.25,
  application: 0.2,
}

export const MIN_SCORING_CONFIDENCE = 0.7

export interface CalculateAbilitySnapshotInput {
  id: string
  cycleId: string
  kind: AbilitySnapshot["kind"]
  baselineScores: AbilityDimensionScores
  evidence: readonly GrowthEvidenceRecord[]
  /** Baseline assessment gate results; newer evidence assertions supersede them. */
  assessmentGateResults?: Partial<Record<GateId, GateStatus>>
  generatedAt: string
  /** A supplied baseline represents a completed assessment by default. */
  baselineCompleted?: boolean
  minimumConfidence?: number
}

export interface EvaluateLevelEligibilityInput {
  overallScore: number
  dimensionScores: AbilityDimensionScores
  evidence: readonly GrowthEvidenceRecord[]
  evidenceCoverage: Record<EvidenceChannel, EvidenceCoverageStatus>
  baselineCompleted: boolean
  minimumConfidence?: number
}

export interface CheckRetestEligibilityInput {
  cycle: TeacherGrowthCycle
  evidence: readonly GrowthEvidenceRecord[]
  gateResults?: Record<GateId, GateStatus>
  evidenceCoverage?: Record<EvidenceChannel, EvidenceCoverageStatus>
  minimumConfidence?: number
}

export interface DeriveGrowthStagesInput
  extends CheckRetestEligibilityInput {
  snapshots: readonly AbilitySnapshot[]
}

const LEVEL_ORDER_DESCENDING = [...ABILITY_LEVELS].reverse()

const clampScore = (value: number) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0

const roundScore = (value: number) => Math.round(value * 100) / 100

const mean = (values: readonly number[]) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0

const occurredAtValue = (record: GrowthEvidenceRecord) => {
  const timestamp = Date.parse(record.occurredAt)
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

const compareNewestFirst = (
  left: GrowthEvidenceRecord,
  right: GrowthEvidenceRecord,
) =>
  occurredAtValue(right) - occurredAtValue(left) ||
  right.occurredAt.localeCompare(left.occurredAt) ||
  right.id.localeCompare(left.id)

function hasQualifier(
  record: GrowthEvidenceRecord,
  qualifier: GrowthEvidenceQualifier,
) {
  return record.qualifiers?.includes(qualifier) ?? false
}

function belongsToCycle(
  record: GrowthEvidenceRecord,
  cycleId: string,
  teacherId?: string,
) {
  return (
    (!record.cycleId || record.cycleId === cycleId) &&
    (!teacherId || record.teacherId === teacherId)
  )
}

function selectSnapshotEvidence(
  evidence: readonly GrowthEvidenceRecord[],
  kind: AbilitySnapshot["kind"],
) {
  const nonAssessment = evidence.filter(
    (record) => record.channel !== "assessment",
  )
  const assessment = evidence.filter(
    (record) => record.channel === "assessment",
  )
  const preferredKind =
    kind === "baseline" ? "baseline" : kind === "final" ? "final" : "progress"
  const preferred = assessment.filter(
    (record) => record.assessmentKind === preferredKind,
  )
  const baseline = assessment.filter(
    (record) =>
      record.assessmentKind === "baseline" ||
      record.assessmentKind === undefined,
  )
  const selectedAssessment = preferred.length > 0 ? preferred : baseline

  return kind === "baseline"
    ? selectedAssessment
    : [...nonAssessment, ...selectedAssessment]
}

function isReviewable(
  record: GrowthEvidenceRecord,
  minimumConfidence = MIN_SCORING_CONFIDENCE,
) {
  return (
    record.reviewStatus === "confirmed" &&
    (record.confidence === undefined || record.confidence >= minimumConfidence)
  )
}

export function isEvidenceScorable(
  record: GrowthEvidenceRecord,
  minimumConfidence = MIN_SCORING_CONFIDENCE,
) {
  return (
    isReviewable(record, minimumConfidence) &&
    record.anonymous &&
    record.dimensions.length > 0 &&
    record.rubric.length > 0 &&
    (record.channel !== "artifact" || Boolean(record.artifactVersion?.trim()))
  )
}

/**
 * Keeps the newest value for each sourceEventId + channel + dimension key.
 * A superseding pending/rejected record therefore invalidates the older value
 * instead of silently allowing stale evidence to keep scoring.
 */
export function deduplicateEvidence(
  evidence: readonly GrowthEvidenceRecord[],
): GrowthEvidenceRecord[] {
  const seen = new Set<string>()
  const deduplicated: GrowthEvidenceRecord[] = []

  for (const record of [...evidence].sort(compareNewestFirst)) {
    if (record.dimensions.length === 0) {
      deduplicated.push({ ...record, dimensions: [] })
      continue
    }
    const retainedDimensions = record.dimensions.filter(({ dimension }) => {
      const key = `${record.sourceEventId}\u0000${record.channel}\u0000${dimension}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (retainedDimensions.length === 0) continue
    deduplicated.push({ ...record, dimensions: retainedDimensions })
  }

  return deduplicated.sort(
    (left, right) =>
      occurredAtValue(left) - occurredAtValue(right) ||
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.id.localeCompare(right.id),
  )
}

export function calculateGateResults(
  evidence: readonly GrowthEvidenceRecord[],
  options: {
    assessmentGateResults?: Partial<Record<GateId, GateStatus>>
    minimumConfidence?: number
  } = {},
): Record<GateId, GateStatus> {
  const minimumConfidence =
    options.minimumConfidence ?? MIN_SCORING_CONFIDENCE
  const results: Record<GateId, GateStatus> = { ...EMPTY_GATE_RESULTS }
  for (const gateId of GATE_IDS) {
    const assessmentResult = options.assessmentGateResults?.[gateId]
    if (assessmentResult) results[gateId] = assessmentResult
  }

  for (const gateId of GATE_IDS) {
    const candidates = evidence
      .flatMap((record) =>
        record.gateAssertions
          .filter((assertion) => assertion.gateId === gateId)
          .map((assertion) => ({ record, assertion })),
      )
      .sort((left, right) => compareNewestFirst(left.record, right.record))

    const latest = candidates[0]
    if (!latest) continue
    results[gateId] =
      isReviewable(latest.record, minimumConfidence) &&
      latest.assertion.reason.trim().length > 0
      ? latest.assertion.status
      : "insufficient"
  }

  return results
}

export function determineCalculatedLevel(
  overallScore: number,
  dimensionScores: AbilityDimensionScores,
): AbilityLevel {
  const normalizedOverall = clampScore(overallScore)
  const values = ABILITY_DIMENSIONS.map((dimension) =>
    clampScore(dimensionScores[dimension]),
  )
  const dimensionsAtLeast = (minimum: number) =>
    values.filter((value) => value >= minimum).length

  if (
    normalizedOverall >= 85 &&
    dimensionsAtLeast(75) === ABILITY_DIMENSIONS.length
  ) {
    return "L4"
  }
  if (
    normalizedOverall >= 70 &&
    dimensionsAtLeast(60) === ABILITY_DIMENSIONS.length
  ) {
    return "L3"
  }
  if (normalizedOverall >= 55 && dimensionsAtLeast(50) >= 4) {
    return "L2"
  }
  return "L1"
}

function uniqueQualifiedSourceEvents(
  evidence: readonly GrowthEvidenceRecord[],
  qualifier: GrowthEvidenceQualifier,
) {
  return new Set(
    evidence
      .filter((record) => hasQualifier(record, qualifier))
      .map((record) => record.sourceEventId),
  )
}

function validDeduplicatedEvidence(
  evidence: readonly GrowthEvidenceRecord[],
  minimumConfidence = MIN_SCORING_CONFIDENCE,
) {
  return deduplicateEvidence(evidence).filter((record) =>
    isEvidenceScorable(record, minimumConfidence),
  )
}

function evidenceEligibility(
  level: AbilityLevel,
  input: EvaluateLevelEligibilityInput,
) {
  const validEvidence = validDeduplicatedEvidence(
    input.evidence,
    input.minimumConfidence,
  )
  const taskEvents = new Set(
    validEvidence
      .filter((record) => record.channel === "task")
      .map((record) => record.sourceEventId),
  )
  const artifactEvents = new Set(
    validEvidence
      .filter((record) => record.channel === "artifact")
      .map((record) => record.sourceEventId),
  )
  const applicationLoops = uniqueQualifiedSourceEvents(
    validEvidence,
    "teaching-application-loop",
  )
  const reviewedResearchOutputs = uniqueQualifiedSourceEvents(
    validEvidence,
    "reviewed-research-output",
  )
  const schoolSharing = uniqueQualifiedSourceEvents(
    validEvidence,
    "school-sharing",
  )
  const allChannelsCovered = EVIDENCE_CHANNELS.every(
    (channel) => input.evidenceCoverage[channel] === "sufficient",
  )
  const unmetConditions: string[] = []

  if (!input.baselineCompleted) {
    unmetConditions.push("完成摸底测评")
  }

  if (level === "L2") {
    if (taskEvents.size < 3) unmetConditions.push("至少 3 项有效任务")
    if (artifactEvents.size < 1) {
      unmetConditions.push("至少 1 项人工确认作品")
    }
  }

  if (level === "L3" || level === "L4") {
    if (!allChannelsCovered) unmetConditions.push("测评、任务、作品、应用四类通道齐全")
    if (applicationLoops.size < (level === "L4" ? 2 : 1)) {
      unmetConditions.push(
        level === "L4"
          ? "至少 2 个教学应用闭环"
          : "至少 1 个教学应用闭环",
      )
    }
    if (reviewedResearchOutputs.size < 1) {
      unmetConditions.push("至少 1 项已复核研究成果")
    }
  }

  if (level === "L4" && schoolSharing.size < 1) {
    unmetConditions.push("至少 1 项校内共享或示范证据")
  }

  return { eligible: unmetConditions.length === 0, unmetConditions }
}

export function evaluateLevelEligibility(
  level: AbilityLevel,
  input: EvaluateLevelEligibilityInput,
): AbilityLevelEligibility {
  const calculatedLevel = determineCalculatedLevel(
    input.overallScore,
    input.dimensionScores,
  )
  const numericEligible =
    ABILITY_LEVELS.indexOf(level) <= ABILITY_LEVELS.indexOf(calculatedLevel)
  const evidence = evidenceEligibility(level, input)
  const unmetConditions = [...evidence.unmetConditions]

  if (!numericEligible) {
    unmetConditions.unshift(`${level} 的分数或维度下限未满足`)
  }

  return {
    level,
    numericEligible,
    evidenceEligible: evidence.eligible,
    eligible: numericEligible && evidence.eligible,
    unmetConditions,
  }
}

function deriveCoverage(
  allEvidence: readonly GrowthEvidenceRecord[],
  deduplicated: readonly GrowthEvidenceRecord[],
  minimumConfidence: number,
): Record<EvidenceChannel, EvidenceCoverageStatus> {
  return Object.fromEntries(
    EVIDENCE_CHANNELS.map((channel) => {
      const rawRecords = allEvidence.filter(
        (record) => record.channel === channel && record.dimensions.length > 0,
      )
      if (rawRecords.length === 0) return [channel, "missing"]
      const hasValidRecord = deduplicated.some(
        (record) =>
          record.channel === channel &&
          isEvidenceScorable(record, minimumConfidence),
      )
      return [channel, hasValidRecord ? "sufficient" : "insufficient"]
    }),
  ) as Record<EvidenceChannel, EvidenceCoverageStatus>
}

export function calculateAbilitySnapshot({
  id,
  cycleId,
  kind,
  baselineScores,
  evidence,
  assessmentGateResults,
  generatedAt,
  baselineCompleted = true,
  minimumConfidence = MIN_SCORING_CONFIDENCE,
}: CalculateAbilitySnapshotInput): AbilitySnapshot {
  const normalizedBaseline = Object.fromEntries(
    ABILITY_DIMENSIONS.map((dimension) => [
      dimension,
      clampScore(baselineScores[dimension]),
    ]),
  ) as AbilityDimensionScores
  const cycleEvidence = evidence.filter((record) =>
    belongsToCycle(record, cycleId),
  )
  const snapshotEvidence = selectSnapshotEvidence(cycleEvidence, kind)
  const deduplicated = deduplicateEvidence(snapshotEvidence)
  const validEvidence = deduplicated.filter((record) =>
    isEvidenceScorable(record, minimumConfidence),
  )
  const evidenceCoverage = deriveCoverage(
    snapshotEvidence,
    deduplicated,
    minimumConfidence,
  )

  const dimensionChannelScores = Object.fromEntries(
    ABILITY_DIMENSIONS.map((dimension) => {
      const channelScores = Object.fromEntries(
        EVIDENCE_CHANNELS.map((channel) => {
          const scores = validEvidence.flatMap((record) =>
            record.channel === channel
              ? record.dimensions
                  .filter((item) => item.dimension === dimension)
                  .map((item) => clampScore(item.score))
              : [],
          )
          return [
            channel,
            roundScore(
              scores.length ? mean(scores) : normalizedBaseline[dimension],
            ),
          ]
        }),
      ) as AbilityChannelScores
      return [dimension, channelScores]
    }),
  ) as DimensionChannelScores

  const dimensionScores = Object.fromEntries(
    ABILITY_DIMENSIONS.map((dimension) => [
      dimension,
      roundScore(
        EVIDENCE_CHANNELS.reduce(
          (total, channel) =>
            total +
            dimensionChannelScores[dimension][channel] *
              CHANNEL_WEIGHTS[channel],
          0,
        ),
      ),
    ]),
  ) as AbilityDimensionScores

  const channelScores = Object.fromEntries(
    EVIDENCE_CHANNELS.map((channel) => [
      channel,
      roundScore(
        mean(
          ABILITY_DIMENSIONS.map(
            (dimension) => dimensionChannelScores[dimension][channel],
          ),
        ),
      ),
    ]),
  ) as AbilityChannelScores

  const overallScore = roundScore(
    mean(ABILITY_DIMENSIONS.map((dimension) => dimensionScores[dimension])),
  )
  const calculatedLevel = determineCalculatedLevel(
    overallScore,
    dimensionScores,
  )
  const gateResults = calculateGateResults(snapshotEvidence, {
    assessmentGateResults,
    minimumConfidence,
  })
  const eligibilityInput: EvaluateLevelEligibilityInput = {
    overallScore,
    dimensionScores,
    evidence: validEvidence,
    evidenceCoverage,
    baselineCompleted,
    minimumConfidence,
  }
  const levelEligibility = Object.fromEntries(
    ABILITY_LEVELS.map((level) => [
      level,
      evaluateLevelEligibility(level, eligibilityInput),
    ]),
  ) as Record<AbilityLevel, AbilityLevelEligibility>
  const allGatesPassed = GATE_IDS.every(
    (gateId) => gateResults[gateId] === "passed",
  )
  const certifiedLevel = allGatesPassed
    ? (LEVEL_ORDER_DESCENDING.find(
        (level) => levelEligibility[level].eligible,
      ) ?? null)
    : null

  const scoringEvidenceIds = validEvidence.map((record) => record.id)
  const latestGateEvidenceIds = GATE_IDS.flatMap((gateId) => {
    const latest = [...snapshotEvidence]
      .filter((record) =>
        record.gateAssertions.some((assertion) => assertion.gateId === gateId),
      )
      .sort(compareNewestFirst)[0]
    return latest ? [latest.id] : []
  })

  return {
    id,
    cycleId,
    kind,
    dimensionScores,
    dimensionChannelScores,
    channelScores,
    overallScore,
    calculatedLevel,
    certifiedLevel,
    gateResults,
    evidenceCoverage,
    evidenceIds: [...new Set([...scoringEvidenceIds, ...latestGateEvidenceIds])],
    levelEligibility,
    generatedAt,
  }
}

function qualifiedEvidence(
  evidence: readonly GrowthEvidenceRecord[],
  qualifier: GrowthEvidenceQualifier,
  minimumConfidence: number,
) {
  return validDeduplicatedEvidence(evidence, minimumConfidence).filter(
    (record) => hasQualifier(record, qualifier),
  )
}

function requirement(
  check: Omit<RetestRequirementCheck, "reason"> & {
    metReason: string
    missingReason: string
  },
): RetestRequirementCheck {
  return {
    id: check.id,
    label: check.label,
    met: check.met,
    evidenceIds: check.evidenceIds,
    reason: check.met ? check.metReason : check.missingReason,
  }
}

export function checkRetestEligibility({
  cycle,
  evidence,
  minimumConfidence = MIN_SCORING_CONFIDENCE,
  gateResults,
  evidenceCoverage,
}: CheckRetestEligibilityInput): RetestEligibilityResult {
  const cycleEvidence = evidence.filter((record) =>
    belongsToCycle(record, cycle.id, cycle.teacherId),
  )
  const resolvedGateResults =
    gateResults ??
    calculateGateResults(cycleEvidence, { minimumConfidence })
  const deduplicated = deduplicateEvidence(cycleEvidence)
  const coverage =
    evidenceCoverage ??
    deriveCoverage(cycleEvidence, deduplicated, minimumConfidence)
  const requiredCourse = qualifiedEvidence(
    cycleEvidence,
    "required-course-module",
    minimumConfidence,
  )
  const selfLearning = qualifiedEvidence(
    cycleEvidence,
    "self-learning-resource",
    minimumConfidence,
  )
  const aiPractice = qualifiedEvidence(
    cycleEvidence,
    "ai-practice",
    minimumConfidence,
  )
  const practiceEvents = new Set(
    aiPractice.map((record) => record.sourceEventId),
  )
  const practiceArtifacts = aiPractice.filter(
    (record) => record.channel === "artifact",
  )
  const teachingApplications = qualifiedEvidence(
    cycleEvidence,
    "teaching-application-loop",
    minimumConfidence,
  )
  const researchOutputs = qualifiedEvidence(
    cycleEvidence,
    "reviewed-research-output",
    minimumConfidence,
  )
  const gatesReviewable = GATE_IDS.every(
    (gateId) =>
      resolvedGateResults[gateId] === "passed" ||
      resolvedGateResults[gateId] === "failed",
  )
  const pendingCriticalEvidence = cycleEvidence.filter(
    (record) => record.critical && record.reviewStatus === "pending",
  )
  const fourChannelsCovered = EVIDENCE_CHANNELS.every(
    (channel) => coverage[channel] === "sufficient",
  )

  const requirements: RetestRequirementCheck[] = [
    requirement({
      id: "plan-confirmed",
      label: "个人培训计划已确认",
      met:
        Boolean(cycle.activePlanId) &&
        (cycle.planConfirmed === true ||
          cycle.stageStatus["training-plan"] === "completed"),
      evidenceIds: [],
      metReason: "已激活并确认个人培训计划",
      missingReason: "请先确认目标等级、投入时间和培训计划",
    }),
    requirement({
      id: "required-course-module",
      label: "完成至少 1 个必修课程模块",
      met: requiredCourse.length > 0,
      evidenceIds: requiredCourse.map((record) => record.id),
      metReason: "已形成必修课程任务证据",
      missingReason: "请完成至少 1 个必修模块及检查题",
    }),
    requirement({
      id: "self-learning-resource",
      label: "保存自主路径并完成至少 1 项资源",
      met: cycle.selfLearningPathSaved === true && selfLearning.length > 0,
      evidenceIds: selfLearning.map((record) => record.id),
      metReason: "自主路径和学习证据已完整",
      missingReason: "请保存自主路径并完成至少 1 项资源",
    }),
    requirement({
      id: "ai-practice-count",
      label: "完成至少 2 项 AI 实训",
      met: practiceEvents.size >= 2,
      evidenceIds: aiPractice.map((record) => record.id),
      metReason: "AI 实训数量已达到复测要求",
      missingReason: `还需完成 ${Math.max(0, 2 - practiceEvents.size)} 项 AI 实训`,
    }),
    requirement({
      id: "confirmed-practice-artifact",
      label: "至少 1 项实训作品经人工确认",
      met: practiceArtifacts.length > 0,
      evidenceIds: practiceArtifacts.map((record) => record.id),
      metReason: "已有人工确认的实训作品",
      missingReason: "请将至少 1 项实训成果提交量规并完成人工确认",
    }),
    requirement({
      id: "teaching-application-loop",
      label: "形成至少 1 项教学应用闭环",
      met: teachingApplications.length > 0,
      evidenceIds: teachingApplications.map((record) => record.id),
      metReason: "教学应用已发布、使用并回流结果",
      missingReason: "请完成至少 1 个发布—使用—回流闭环",
    }),
    requirement({
      id: "reviewed-research-output",
      label: "关联至少 1 项已复核研究成果",
      met: researchOutputs.length > 0,
      evidenceIds: researchOutputs.map((record) => record.id),
      metReason: "已关联可回溯、已匿名和已复核的研究成果",
      missingReason: "请关联至少 1 项通过治理检查的研究成果",
    }),
    requirement({
      id: "reviewable-gates",
      label: "三项门槛均有可复核结果",
      met: gatesReviewable,
      evidenceIds: cycleEvidence
        .filter((record) => record.gateAssertions.length > 0)
        .map((record) => record.id),
      metReason: "事实核验、数据版权和人工责任均已评价",
      missingReason: "请补齐三项门槛的可复核证据",
    }),
    requirement({
      id: "four-channel-coverage",
      label: "四类证据通道均有有效记录",
      met: fourChannelsCovered,
      evidenceIds: validDeduplicatedEvidence(
        cycleEvidence,
        minimumConfidence,
      ).map((record) => record.id),
      metReason: "测评、任务、作品和应用通道齐全",
      missingReason: `请补齐：${EVIDENCE_CHANNELS.filter((channel) => coverage[channel] !== "sufficient").join(", ")}`,
    }),
    requirement({
      id: "no-pending-critical-evidence",
      label: "无待复核关键证据",
      met: pendingCriticalEvidence.length === 0,
      evidenceIds: pendingCriticalEvidence.map((record) => record.id),
      metReason: "没有待复核的关键证据",
      missingReason: `仍有 ${pendingCriticalEvidence.length} 项关键证据待复核`,
    }),
  ]

  const missingRequirementIds = requirements
    .filter((item) => !item.met)
    .map((item) => item.id)

  return {
    eligible: missingRequirementIds.length === 0,
    requirements,
    missingRequirementIds,
    readinessPercent: Math.round(
      (requirements.filter((item) => item.met).length / requirements.length) *
        100,
    ),
  }
}

export function deriveGrowthStageStatuses({
  cycle,
  evidence,
  snapshots,
  gateResults,
  evidenceCoverage,
  minimumConfidence = MIN_SCORING_CONFIDENCE,
}: DeriveGrowthStagesInput): Record<GrowthStageId, GrowthStageStatus> {
  const cycleSnapshots = snapshots.filter(
    (snapshot) => snapshot.cycleId === cycle.id,
  )
  const cycleEvidence = evidence.filter((record) =>
    belongsToCycle(record, cycle.id, cycle.teacherId),
  )
  const baselineSnapshot = cycleSnapshots.some(
    (snapshot) => snapshot.kind === "baseline",
  )
  const currentSnapshot = cycleSnapshots.some(
    (snapshot) => snapshot.kind === "current",
  )
  const finalSnapshot = cycleSnapshots.some(
    (snapshot) => snapshot.kind === "final",
  )
  const retest = checkRetestEligibility({
    cycle,
    evidence,
    gateResults,
    evidenceCoverage,
    minimumConfidence,
  })
  const requiredCourse = qualifiedEvidence(
    cycleEvidence,
    "required-course-module",
    minimumConfidence,
  ).length
  const selfLearning = qualifiedEvidence(
    cycleEvidence,
    "self-learning-resource",
    minimumConfidence,
  ).length
  const practices = new Set(
    qualifiedEvidence(cycleEvidence, "ai-practice", minimumConfidence).map(
      (record) => record.sourceEventId,
    ),
  ).size
  const practiceArtifact = qualifiedEvidence(
    cycleEvidence,
    "ai-practice",
    minimumConfidence,
  ).some((record) => record.channel === "artifact")
  const teachingApplication = qualifiedEvidence(
    cycleEvidence,
    "teaching-application-loop",
    minimumConfidence,
  ).length
  const researchOutput = qualifiedEvidence(
    cycleEvidence,
    "reviewed-research-output",
    minimumConfidence,
  ).length
  const planCompleted =
    Boolean(cycle.activePlanId) &&
    (cycle.planConfirmed === true ||
      cycle.stageStatus["training-plan"] === "completed")
  const baselineReportCompleted =
    baselineSnapshot &&
    (cycle.stageStatus["baseline-report"] === "completed" ||
      Boolean(cycle.activePlanId))

  const completed: Record<GrowthStageId, boolean> = {
    "baseline-assessment": baselineSnapshot,
    "baseline-report": baselineReportCompleted,
    "training-plan": planCompleted,
    "course-learning": requiredCourse > 0,
    "self-learning":
      cycle.selfLearningPathSaved === true && selfLearning > 0,
    "ai-practice": practices >= 2 && practiceArtifact,
    "teaching-application": teachingApplication > 0,
    "research-output": researchOutput > 0,
    "growth-report": currentSnapshot && retest.eligible,
    "final-retest": finalSnapshot,
  }

  if (finalSnapshot) {
    for (const stage of GROWTH_STAGE_DEFINITIONS) completed[stage.id] = true
  }

  const available: Record<GrowthStageId, boolean> = {
    "baseline-assessment": true,
    "baseline-report": completed["baseline-assessment"],
    "training-plan": completed["baseline-report"],
    "course-learning": completed["training-plan"],
    "self-learning": completed["training-plan"],
    "ai-practice": completed["training-plan"],
    "teaching-application": completed["ai-practice"],
    "research-output": completed["teaching-application"],
    "growth-report": completed["research-output"],
    "final-retest": retest.eligible && completed["growth-report"],
  }

  return Object.fromEntries(
    GROWTH_STAGE_DEFINITIONS.map(({ id }) => {
      if (completed[id]) return [id, "completed"]
      if (!available[id]) return [id, "locked"]
      return [
        id,
        cycle.stageStatus[id] === "in-progress"
          ? "in-progress"
          : "available",
      ]
    }),
  ) as Record<GrowthStageId, GrowthStageStatus>
}

export function deriveGrowthStages(
  input: DeriveGrowthStagesInput,
): DerivedGrowthStage[] {
  const statuses = deriveGrowthStageStatuses(input)
  return GROWTH_STAGE_DEFINITIONS.map((stage) => ({
    ...stage,
    status: statuses[stage.id],
  }))
}
