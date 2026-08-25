import type { TeacherAbilityDimensionName } from "./types"

export const ABILITY_DIMENSIONS = [
  "AI 基础认知",
  "提示词与多模态",
  "知识库与智能体",
  "教学融合",
  "研究创新",
] as const satisfies readonly TeacherAbilityDimensionName[]

export const EVIDENCE_CHANNELS = [
  "assessment",
  "task",
  "artifact",
  "application",
] as const

export const GATE_IDS = [
  "fact-verification",
  "data-copyright",
  "human-responsibility",
] as const

export const ABILITY_LEVELS = ["L1", "L2", "L3", "L4"] as const

export type GrowthStageId =
  | "baseline-assessment"
  | "baseline-report"
  | "training-plan"
  | "course-learning"
  | "self-learning"
  | "ai-practice"
  | "teaching-application"
  | "research-output"
  | "growth-report"
  | "final-retest"

export type GrowthStageStatus =
  | "locked"
  | "available"
  | "in-progress"
  | "completed"

export type EvidenceChannel = (typeof EVIDENCE_CHANNELS)[number]

export type GateId = (typeof GATE_IDS)[number]

export type GateStatus =
  | "not-evaluated"
  | "insufficient"
  | "failed"
  | "passed"

export const EMPTY_GATE_RESULTS: Readonly<Record<GateId, GateStatus>> = {
  "fact-verification": "not-evaluated",
  "data-copyright": "not-evaluated",
  "human-responsibility": "not-evaluated",
}

export type AbilityLevel = (typeof ABILITY_LEVELS)[number]

export type EvidenceCoverageStatus =
  | "missing"
  | "insufficient"
  | "sufficient"

/**
 * Typed milestones keep level and retest rules independent from UI copy or
 * source names. A producer may attach more than one qualifier to one event.
 */
export type GrowthEvidenceQualifier =
  | "required-course-module"
  | "self-learning-resource"
  | "ai-practice"
  | "teaching-application-loop"
  | "reviewed-research-output"
  | "school-sharing"

export interface GrowthEvidenceDimensionScore {
  dimension: TeacherAbilityDimensionName
  score: number
}

export interface GrowthGateAssertion {
  gateId: GateId
  status: GateStatus
  reason: string
}

export interface GrowthEvidenceRecord {
  id: string
  sourceEventId: string
  teacherId: string
  /** Optional during legacy migration; new producers should always set it. */
  cycleId?: string
  channel: EvidenceChannel
  /** Allows baseline/current/final snapshots to select equivalent assessments. */
  assessmentKind?: "baseline" | "progress" | "final"
  source: string
  task: string
  artifactVersion?: string
  dimensions: GrowthEvidenceDimensionScore[]
  gateAssertions: GrowthGateAssertion[]
  rubric: string[]
  reviewStatus: "pending" | "confirmed" | "rejected"
  anonymous: boolean
  /** 0–1. Missing confidence means the producer has not marked it low. */
  confidence?: number
  /** A pending critical record blocks retest readiness. */
  critical?: boolean
  qualifiers?: GrowthEvidenceQualifier[]
  occurredAt: string
}

export type AbilityDimensionScores = Record<
  TeacherAbilityDimensionName,
  number
>

export type AbilityChannelScores = Record<EvidenceChannel, number>

export type DimensionChannelScores = Record<
  TeacherAbilityDimensionName,
  AbilityChannelScores
>

export interface AbilityLevelEligibility {
  level: AbilityLevel
  numericEligible: boolean
  evidenceEligible: boolean
  eligible: boolean
  unmetConditions: string[]
}

export interface AbilitySnapshot {
  id: string
  cycleId: string
  kind: "baseline" | "current" | "final"
  dimensionScores: AbilityDimensionScores
  dimensionChannelScores: DimensionChannelScores
  channelScores: AbilityChannelScores
  overallScore: number
  calculatedLevel: AbilityLevel
  certifiedLevel: AbilityLevel | null
  gateResults: Record<GateId, GateStatus>
  evidenceCoverage: Record<EvidenceChannel, EvidenceCoverageStatus>
  evidenceIds: string[]
  levelEligibility: Record<AbilityLevel, AbilityLevelEligibility>
  generatedAt: string
}

export type TeacherGrowthCycleStatus =
  | "not-started"
  | "baseline"
  | "plan"
  | "developing"
  | "retest-ready"
  | "completed"

export interface TeacherGrowthCycle {
  id: string
  teacherId: string
  status: TeacherGrowthCycleStatus
  targetLevel: AbilityLevel
  stageStatus: Record<GrowthStageId, GrowthStageStatus>
  snapshotIds: string[]
  activePlanId?: string
  /** Explicit flags for requirements that cannot be inferred from evidence. */
  planConfirmed?: boolean
  selfLearningPathSaved?: boolean
}

export interface GrowthStageDefinition {
  id: GrowthStageId
  order: number
  label: string
}

export const GROWTH_STAGE_DEFINITIONS = [
  { id: "baseline-assessment", order: 1, label: "摸底测评" },
  { id: "baseline-report", order: 2, label: "能力报告" },
  { id: "training-plan", order: 3, label: "培训计划" },
  { id: "course-learning", order: 4, label: "课程学习" },
  { id: "self-learning", order: 5, label: "自主学习" },
  { id: "ai-practice", order: 6, label: "AI 实训" },
  { id: "teaching-application", order: 7, label: "教学应用" },
  { id: "research-output", order: 8, label: "研究成果" },
  { id: "growth-report", order: 9, label: "成长报告" },
  { id: "final-retest", order: 10, label: "结业复测" },
] as const satisfies readonly GrowthStageDefinition[]

export type RetestRequirementId =
  | "plan-confirmed"
  | "required-course-module"
  | "self-learning-resource"
  | "ai-practice-count"
  | "confirmed-practice-artifact"
  | "teaching-application-loop"
  | "reviewed-research-output"
  | "reviewable-gates"
  | "four-channel-coverage"
  | "no-pending-critical-evidence"

export interface RetestRequirementCheck {
  id: RetestRequirementId
  label: string
  met: boolean
  evidenceIds: string[]
  reason: string
}

export interface RetestEligibilityResult {
  eligible: boolean
  requirements: RetestRequirementCheck[]
  missingRequirementIds: RetestRequirementId[]
  readinessPercent: number
}

export interface DerivedGrowthStage extends GrowthStageDefinition {
  status: GrowthStageStatus
}

export function createInitialGrowthStageStatus(): Record<
  GrowthStageId,
  GrowthStageStatus
> {
  return {
    "baseline-assessment": "available",
    "baseline-report": "locked",
    "training-plan": "locked",
    "course-learning": "locked",
    "self-learning": "locked",
    "ai-practice": "locked",
    "teaching-application": "locked",
    "research-output": "locked",
    "growth-report": "locked",
    "final-retest": "locked",
  }
}

export function createInitialTeacherGrowthCycle(input: {
  id: string
  teacherId: string
  targetLevel?: AbilityLevel
}): TeacherGrowthCycle {
  return {
    id: input.id,
    teacherId: input.teacherId,
    status: "not-started",
    targetLevel: input.targetLevel ?? "L2",
    stageStatus: createInitialGrowthStageStatus(),
    snapshotIds: [],
    planConfirmed: false,
    selfLearningPathSaved: false,
  }
}
