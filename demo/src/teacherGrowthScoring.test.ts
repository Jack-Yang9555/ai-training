import { describe, expect, it } from "vitest"
import {
  ABILITY_DIMENSIONS,
  EMPTY_GATE_RESULTS,
  EVIDENCE_CHANNELS,
  GATE_IDS,
  createInitialTeacherGrowthCycle,
  type AbilityDimensionScores,
  type AbilitySnapshot,
  type GateId,
  type GateStatus,
  type GrowthEvidenceRecord,
  type TeacherGrowthCycle,
} from "./teacherGrowthModel"
import {
  calculateAbilitySnapshot,
  calculateGateResults,
  checkRetestEligibility,
  deduplicateEvidence,
  deriveGrowthStages,
  deriveGrowthStageStatuses,
  determineCalculatedLevel,
} from "./teacherGrowthScoring"

const passedGates: Record<GateId, GateStatus> = {
  "fact-verification": "passed",
  "data-copyright": "passed",
  "human-responsibility": "passed",
}

const dimensionScores = (
  value: number,
  overrides: Partial<AbilityDimensionScores> = {},
): AbilityDimensionScores =>
  Object.fromEntries(
    ABILITY_DIMENSIONS.map((dimension) => [
      dimension,
      overrides[dimension] ?? value,
    ]),
  ) as AbilityDimensionScores

let evidenceSequence = 0

const makeEvidence = (
  overrides: Partial<GrowthEvidenceRecord> = {},
): GrowthEvidenceRecord => {
  evidenceSequence += 1
  const id = overrides.id ?? `evidence-${evidenceSequence}`
  return {
    id,
    sourceEventId: overrides.sourceEventId ?? `event-${evidenceSequence}`,
    teacherId: "teacher-1",
    cycleId: "cycle-1",
    channel: "task",
    source: "测试来源",
    task: "测试任务",
    artifactVersion: "v1",
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 80,
    })),
    gateAssertions: [],
    rubric: ["已完成人工复核"],
    reviewStatus: "confirmed",
    anonymous: true,
    confidence: 0.9,
    occurredAt: `2026-08-${String(Math.min(28, evidenceSequence)).padStart(2, "0")}T08:00:00.000Z`,
    ...overrides,
  }
}

const calculate = (
  baselineScores: AbilityDimensionScores,
  evidence: readonly GrowthEvidenceRecord[],
  overrides: Partial<{
    kind: AbilitySnapshot["kind"]
    assessmentGateResults: Partial<Record<GateId, GateStatus>>
    cycleId: string
  }> = {},
) =>
  calculateAbilitySnapshot({
    id: "snapshot-1",
    cycleId: overrides.cycleId ?? "cycle-1",
    kind: overrides.kind ?? "current",
    baselineScores,
    evidence,
    assessmentGateResults: overrides.assessmentGateResults,
    generatedAt: "2026-08-20T08:00:00.000Z",
  })

const makeL3Evidence = (score = 80): GrowthEvidenceRecord[] => [
  makeEvidence({
    id: "assessment-l3",
    sourceEventId: "assessment-l3",
    channel: "assessment",
    assessmentKind: "baseline",
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({ dimension, score })),
  }),
  makeEvidence({
    id: "task-l3",
    sourceEventId: "task-l3",
    channel: "task",
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({ dimension, score })),
  }),
  makeEvidence({
    id: "research-l3",
    sourceEventId: "research-l3",
    channel: "artifact",
    qualifiers: ["reviewed-research-output"],
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({ dimension, score })),
  }),
  makeEvidence({
    id: "application-l3",
    sourceEventId: "application-l3",
    channel: "application",
    qualifiers: ["teaching-application-loop"],
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({ dimension, score })),
  }),
]

const makeL4Evidence = (): GrowthEvidenceRecord[] => [
  makeEvidence({
    id: "assessment-l4",
    sourceEventId: "assessment-l4",
    channel: "assessment",
    assessmentKind: "baseline",
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 92,
    })),
  }),
  makeEvidence({
    id: "task-l4",
    sourceEventId: "task-l4",
    channel: "task",
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 90,
    })),
  }),
  makeEvidence({
    id: "research-and-sharing-l4",
    sourceEventId: "research-and-sharing-l4",
    channel: "artifact",
    qualifiers: ["reviewed-research-output", "school-sharing"],
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 91,
    })),
  }),
  makeEvidence({
    id: "application-l4-a",
    sourceEventId: "application-l4-a",
    channel: "application",
    qualifiers: ["teaching-application-loop"],
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 89,
    })),
  }),
  makeEvidence({
    id: "application-l4-b",
    sourceEventId: "application-l4-b",
    channel: "application",
    qualifiers: ["teaching-application-loop"],
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 93,
    })),
  }),
]

const makeL2Evidence = (): GrowthEvidenceRecord[] => [
  ...[1, 2, 3].map((index) =>
    makeEvidence({
      id: `task-l2-${index}`,
      sourceEventId: `task-l2-${index}`,
      channel: "task",
      dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
        dimension,
        score: 62,
      })),
    }),
  ),
  makeEvidence({
    id: "artifact-l2",
    sourceEventId: "artifact-l2",
    channel: "artifact",
    dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 62,
    })),
  }),
]

const makeRetestCycle = (): TeacherGrowthCycle => ({
  ...createInitialTeacherGrowthCycle({
    id: "cycle-1",
    teacherId: "teacher-1",
    targetLevel: "L3",
  }),
  status: "developing",
  activePlanId: "plan-1",
  planConfirmed: true,
  selfLearningPathSaved: true,
  stageStatus: {
    ...createInitialTeacherGrowthCycle({
      id: "unused",
      teacherId: "teacher-1",
    }).stageStatus,
    "baseline-assessment": "completed",
    "baseline-report": "completed",
    "training-plan": "completed",
  },
})

const makeRetestEvidence = (): GrowthEvidenceRecord[] => [
  makeEvidence({
    id: "retest-assessment",
    sourceEventId: "retest-assessment",
    channel: "assessment",
    assessmentKind: "baseline",
    gateAssertions: GATE_IDS.map((gateId) => ({
      gateId,
      status: "passed",
      reason: "已提交可复核证据",
    })),
  }),
  makeEvidence({
    id: "required-course",
    sourceEventId: "required-course",
    channel: "task",
    qualifiers: ["required-course-module"],
  }),
  makeEvidence({
    id: "self-learning",
    sourceEventId: "self-learning",
    channel: "task",
    qualifiers: ["self-learning-resource"],
  }),
  makeEvidence({
    id: "practice-one-task",
    sourceEventId: "practice-one",
    channel: "task",
    qualifiers: ["ai-practice"],
  }),
  makeEvidence({
    id: "practice-one-artifact",
    sourceEventId: "practice-one",
    channel: "artifact",
    qualifiers: ["ai-practice"],
  }),
  makeEvidence({
    id: "practice-two-task",
    sourceEventId: "practice-two",
    channel: "task",
    qualifiers: ["ai-practice"],
  }),
  makeEvidence({
    id: "teaching-loop",
    sourceEventId: "teaching-loop",
    channel: "application",
    qualifiers: ["teaching-application-loop"],
  }),
  makeEvidence({
    id: "research-output",
    sourceEventId: "research-output",
    channel: "artifact",
    qualifiers: ["reviewed-research-output"],
  }),
]

describe("教师成长唯一评分器", () => {
  it("四通道按 30/25/25/20 计分，未覆盖通道回退到该维摸底分", () => {
    const baseline = dimensionScores(40, {
      "提示词与多模态": 50,
      "知识库与智能体": 60,
      "教学融合": 70,
      "研究创新": 80,
    })
    const assessment = makeEvidence({
      id: "weighted-assessment",
      sourceEventId: "weighted-assessment",
      channel: "assessment",
      dimensions: [{ dimension: "AI 基础认知", score: 100 }],
    })

    const snapshot = calculate(baseline, [assessment])

    expect(snapshot.dimensionScores["AI 基础认知"]).toBe(58)
    expect(snapshot.dimensionScores["提示词与多模态"]).toBe(50)
    expect(snapshot.overallScore).toBe(63.6)
    expect(snapshot.evidenceCoverage).toEqual({
      assessment: "sufficient",
      task: "missing",
      artifact: "missing",
      application: "missing",
    })
  })

  it("无成长证据时保留五维摸底基线，但不伪造证据覆盖", () => {
    const baseline = dimensionScores(61, {
      "AI 基础认知": 57,
      "研究创新": 65,
    })

    const snapshot = calculate(baseline, [])

    expect(snapshot.dimensionScores).toEqual(baseline)
    expect(snapshot.channelScores).toEqual({
      assessment: 61,
      task: 61,
      artifact: 61,
      application: 61,
    })
    expect(snapshot.evidenceCoverage).toEqual(
      Object.fromEntries(
        EVIDENCE_CHANNELS.map((channel) => [channel, "missing"]),
      ),
    )
    expect(snapshot.evidenceIds).toEqual([])
    expect(snapshot.gateResults).toEqual(EMPTY_GATE_RESULTS)
    expect(snapshot.certifiedLevel).toBeNull()
  })

  it.each([
    [54, "L1"],
    [55, "L2"],
    [69, "L2"],
    [70, "L3"],
    [84, "L3"],
    [85, "L4"],
  ] as const)("等级分数边界 %i 对应 %s", (score, expected) => {
    expect(determineCalculatedLevel(score, dimensionScores(score))).toBe(
      expected,
    )
  })

  it("维度下限会阻止虚高综合分授予更高测算等级", () => {
    expect(
      determineCalculatedLevel(
        88,
        dimensionScores(90, { "研究创新": 74 }),
      ),
    ).toBe("L3")
    expect(
      determineCalculatedLevel(
        60,
        dimensionScores(51, {
          "教学融合": 49,
          "研究创新": 49,
        }),
      ),
    ).toBe("L1")
  })

  it("具有 L1、L2、L3、L4 可达的确定性证据路径", () => {
    const l1 = calculate(dimensionScores(45), [], {
      assessmentGateResults: passedGates,
    })
    const l2 = calculate(dimensionScores(60), makeL2Evidence(), {
      assessmentGateResults: passedGates,
    })
    const l3 = calculate(dimensionScores(75), makeL3Evidence(), {
      assessmentGateResults: passedGates,
    })
    const l4 = calculate(dimensionScores(90), makeL4Evidence(), {
      assessmentGateResults: passedGates,
    })

    expect([l1, l2, l3, l4].map((item) => item.calculatedLevel)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
    ])
    expect([l1, l2, l3, l4].map((item) => item.certifiedLevel)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
    ])
    expect(l4.overallScore).toBeGreaterThanOrEqual(85)
    expect(
      ABILITY_DIMENSIONS.every(
        (dimension) => l4.dimensionScores[dimension] >= 75,
      ),
    ).toBe(true)
  })

  it("达到 L4 分数但缺校内共享证据时，正式等级只能到 L3", () => {
    const evidence = makeL4Evidence().map((record) => ({
      ...record,
      qualifiers: record.qualifiers?.filter(
        (qualifier) => qualifier !== "school-sharing",
      ),
    }))

    const snapshot = calculate(dimensionScores(90), evidence, {
      assessmentGateResults: passedGates,
    })

    expect(snapshot.calculatedLevel).toBe("L4")
    expect(snapshot.levelEligibility.L4.evidenceEligible).toBe(false)
    expect(snapshot.certifiedLevel).toBe("L3")
  })

  it.each(GATE_IDS)("任一门槛 %s 未通过都阻断正式等级，不改写分数", (gateId) => {
    const gates = { ...passedGates, [gateId]: "failed" as const }
    const passedSnapshot = calculate(dimensionScores(90), makeL4Evidence(), {
      assessmentGateResults: passedGates,
    })
    const blockedSnapshot = calculate(dimensionScores(90), makeL4Evidence(), {
      assessmentGateResults: gates,
    })

    expect(blockedSnapshot.calculatedLevel).toBe("L4")
    expect(blockedSnapshot.certifiedLevel).toBeNull()
    expect(blockedSnapshot.overallScore).toBe(passedSnapshot.overallScore)
  })

  it("最新可复核门槛断言可以替换历史结果，待复核断言只能算证据不足", () => {
    const historicalFailure = makeEvidence({
      id: "gate-old",
      sourceEventId: "gate-old",
      dimensions: [],
      occurredAt: "2026-08-01T08:00:00.000Z",
      gateAssertions: [
        {
          gateId: "fact-verification",
          status: "failed",
          reason: "旧记录未通过",
        },
      ],
    })
    const latestPass = makeEvidence({
      id: "gate-new",
      sourceEventId: "gate-new",
      dimensions: [],
      occurredAt: "2026-08-02T08:00:00.000Z",
      gateAssertions: [
        {
          gateId: "fact-verification",
          status: "passed",
          reason: "新证据已通过",
        },
      ],
    })

    expect(
      calculateGateResults([historicalFailure, latestPass], {
        assessmentGateResults: passedGates,
      })["fact-verification"],
    ).toBe("passed")

    expect(
      calculateGateResults(
        [
          historicalFailure,
          { ...latestPass, reviewStatus: "pending" as const },
        ],
        { assessmentGateResults: passedGates },
      )["fact-verification"],
    ).toBe("insufficient")
  })

  it("门槛断言缺少可下钻原因时不能视为已通过", () => {
    const assertionWithoutReason = makeEvidence({
      id: "gate-without-reason",
      sourceEventId: "gate-without-reason",
      dimensions: [],
      gateAssertions: [
        {
          gateId: "human-responsibility",
          status: "passed",
          reason: "   ",
        },
      ],
    })

    expect(
      calculateGateResults([assertionWithoutReason], {
        assessmentGateResults: passedGates,
      })["human-responsibility"],
    ).toBe("insufficient")
  })

  it("同一来源事件、通道和维度只计最新一次", () => {
    const older = makeEvidence({
      id: "duplicate-old",
      sourceEventId: "same-event",
      channel: "task",
      dimensions: [{ dimension: "AI 基础认知", score: 70 }],
      occurredAt: "2026-08-01T08:00:00.000Z",
    })
    const newer = makeEvidence({
      id: "duplicate-new",
      sourceEventId: "same-event",
      channel: "task",
      dimensions: [{ dimension: "AI 基础认知", score: 90 }],
      occurredAt: "2026-08-02T08:00:00.000Z",
    })

    expect(deduplicateEvidence([older, newer])).toEqual([newer])
    const snapshot = calculate(dimensionScores(50), [older, newer])

    expect(snapshot.dimensionScores["AI 基础认知"]).toBe(60)
    expect(snapshot.evidenceIds).toEqual(["duplicate-new"])
  })

  it.each([
    ["pending", true, 0.9],
    ["rejected", true, 0.9],
    ["confirmed", false, 0.9],
    ["confirmed", true, 0.69],
  ] as const)(
    "review=%s anonymous=%s confidence=%s 的证据不计分",
    (reviewStatus, anonymous, confidence) => {
      const invalid = makeEvidence({
        id: `invalid-${reviewStatus}-${anonymous}-${confidence}`,
        sourceEventId: `invalid-${reviewStatus}-${anonymous}-${confidence}`,
        channel: "task",
        dimensions: [{ dimension: "AI 基础认知", score: 100 }],
        reviewStatus,
        anonymous,
        confidence,
      })

      const snapshot = calculate(dimensionScores(50), [invalid])

      expect(snapshot.dimensionScores["AI 基础认知"]).toBe(50)
      expect(snapshot.evidenceCoverage.task).toBe("insufficient")
    },
  )

  it("作品证据必须保留成果版本和量规", () => {
    const artifactWithoutTrace = makeEvidence({
      id: "artifact-without-trace",
      sourceEventId: "artifact-without-trace",
      channel: "artifact",
      artifactVersion: undefined,
      rubric: [],
      dimensions: [{ dimension: "研究创新", score: 100 }],
    })

    const snapshot = calculate(dimensionScores(50), [artifactWithoutTrace])

    expect(snapshot.dimensionScores["研究创新"]).toBe(50)
    expect(snapshot.evidenceCoverage.artifact).toBe("insufficient")
  })

  it("后来的待复核版本会暂停同事件旧版证据计分", () => {
    const confirmed = makeEvidence({
      id: "confirmed-old",
      sourceEventId: "versioned-event",
      channel: "artifact",
      dimensions: [{ dimension: "研究创新", score: 90 }],
      occurredAt: "2026-08-01T08:00:00.000Z",
    })
    const pending = makeEvidence({
      ...confirmed,
      id: "pending-new",
      reviewStatus: "pending",
      occurredAt: "2026-08-02T08:00:00.000Z",
    })

    const snapshot = calculate(dimensionScores(50), [confirmed, pending])

    expect(snapshot.dimensionScores["研究创新"]).toBe(50)
    expect(snapshot.evidenceCoverage.artifact).toBe("insufficient")
  })

  it("结业复测只替换测评通道，不将摸底和复测平均", () => {
    const baselineAssessment = makeEvidence({
      id: "baseline-assessment",
      sourceEventId: "baseline-assessment",
      channel: "assessment",
      assessmentKind: "baseline",
      dimensions: [{ dimension: "AI 基础认知", score: 60 }],
    })
    const finalAssessment = makeEvidence({
      id: "final-assessment",
      sourceEventId: "final-assessment",
      channel: "assessment",
      assessmentKind: "final",
      dimensions: [{ dimension: "AI 基础认知", score: 90 }],
    })

    const current = calculate(
      dimensionScores(50),
      [baselineAssessment, finalAssessment],
      { kind: "current" },
    )
    const final = calculate(
      dimensionScores(50),
      [baselineAssessment, finalAssessment],
      { kind: "final" },
    )

    expect(current.dimensionScores["AI 基础认知"]).toBe(53)
    expect(final.dimensionScores["AI 基础认知"]).toBe(62)
  })

  it("基线快照不会读取后来复测的门槛断言", () => {
    const finalGateFailure = makeEvidence({
      id: "final-gate-failure",
      sourceEventId: "final-gate-failure",
      channel: "assessment",
      assessmentKind: "final",
      dimensions: [],
      gateAssertions: [
        {
          gateId: "data-copyright",
          status: "failed",
          reason: "复测时发现新风险",
        },
      ],
    })

    const baseline = calculate(dimensionScores(50), [finalGateFailure], {
      kind: "baseline",
      assessmentGateResults: passedGates,
    })
    const final = calculate(dimensionScores(50), [finalGateFailure], {
      kind: "final",
      assessmentGateResults: passedGates,
    })

    expect(baseline.gateResults["data-copyright"]).toBe("passed")
    expect(final.gateResults["data-copyright"]).toBe("failed")
  })

  it("能力快照不读取其他周期的高分证据", () => {
    const foreign = makeEvidence({
      id: "foreign-high-score",
      sourceEventId: "foreign-high-score",
      cycleId: "cycle-2",
      channel: "task",
      dimensions: ABILITY_DIMENSIONS.map((dimension) => ({
        dimension,
        score: 100,
      })),
    })

    const snapshot = calculate(dimensionScores(40), [foreign])

    expect(snapshot.dimensionScores).toEqual(dimensionScores(40))
    expect(snapshot.evidenceCoverage.task).toBe("missing")
  })
})

describe("结业复测资格与十阶段派生", () => {
  it("八项业务条件与两项证据治理条件全部满足才可复测", () => {
    const result = checkRetestEligibility({
      cycle: makeRetestCycle(),
      evidence: makeRetestEvidence(),
    })

    expect(result.eligible).toBe(true)
    expect(result.requirements).toHaveLength(10)
    expect(result.requirements.every((item) => item.met)).toBe(true)
    expect(result.missingRequirementIds).toEqual([])
    expect(result.readinessPercent).toBe(100)
  })

  it("门槛已明确未通过仍可进入复测改进，但待评价或证据不足不可", () => {
    const evidence = makeRetestEvidence().map((record) =>
      record.id === "retest-assessment"
        ? {
            ...record,
            gateAssertions: record.gateAssertions.map((assertion) =>
              assertion.gateId === "fact-verification"
                ? { ...assertion, status: "failed" as const }
                : assertion,
            ),
          }
        : record,
    )
    expect(
      checkRetestEligibility({ cycle: makeRetestCycle(), evidence }).eligible,
    ).toBe(true)

    const pendingGates = checkRetestEligibility({
      cycle: makeRetestCycle(),
      evidence: evidence.filter((record) => record.id !== "retest-assessment"),
    })
    expect(pendingGates.eligible).toBe(false)
    expect(pendingGates.missingRequirementIds).toContain("reviewable-gates")
  })

  it("任一缺口会返回可定位的待补项，不只返回静默布尔值", () => {
    const result = checkRetestEligibility({
      cycle: makeRetestCycle(),
      evidence: makeRetestEvidence().filter(
        (record) => record.id !== "self-learning",
      ),
    })

    expect(result.eligible).toBe(false)
    expect(result.missingRequirementIds).toContain("self-learning-resource")
    expect(
      result.requirements.find((item) => item.id === "self-learning-resource")
        ?.reason,
    ).toContain("保存自主路径")
  })

  it("待复核关键证据单独阻止复测", () => {
    const critical = makeEvidence({
      id: "critical-pending",
      sourceEventId: "critical-pending",
      critical: true,
      reviewStatus: "pending",
    })
    const result = checkRetestEligibility({
      cycle: makeRetestCycle(),
      evidence: [...makeRetestEvidence(), critical],
    })

    expect(result.eligible).toBe(false)
    expect(result.missingRequirementIds).toEqual([
      "no-pending-critical-evidence",
    ])
  })

  it("不读取其他周期或其他教师的证据", () => {
    const foreignEvidence = makeRetestEvidence().map((record) => ({
      ...record,
      cycleId: "cycle-2",
    }))
    const result = checkRetestEligibility({
      cycle: makeRetestCycle(),
      evidence: foreignEvidence,
    })

    expect(result.eligible).toBe(false)
    expect(result.missingRequirementIds).toContain("required-course-module")
    expect(result.missingRequirementIds).toContain("four-channel-coverage")
  })

  it("全新周期派生恰好十个阶段，仅摸底可用", () => {
    const cycle = createInitialTeacherGrowthCycle({
      id: "cycle-1",
      teacherId: "teacher-1",
    })
    const stages = deriveGrowthStages({
      cycle,
      evidence: [],
      snapshots: [],
    })

    expect(stages).toHaveLength(10)
    expect(stages.map((stage) => stage.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(stages[0]).toMatchObject({
      id: "baseline-assessment",
      status: "available",
    })
    expect(stages.slice(1).every((stage) => stage.status === "locked")).toBe(
      true,
    )
  })

  it("证据齐全且成长报告已生成时开放复测，最终快照生成后全阶段完成", () => {
    const cycle = makeRetestCycle()
    const evidence = makeRetestEvidence()
    const baseline = calculate(dimensionScores(60), evidence, {
      kind: "baseline",
      assessmentGateResults: passedGates,
    })
    const current = {
      ...calculate(dimensionScores(60), evidence, {
        kind: "current",
        assessmentGateResults: passedGates,
      }),
      id: "current-snapshot",
    }

    const beforeRetest = deriveGrowthStageStatuses({
      cycle,
      evidence,
      snapshots: [baseline, current],
    })

    expect(beforeRetest["growth-report"]).toBe("completed")
    expect(beforeRetest["final-retest"]).toBe("available")

    const final = {
      ...current,
      id: "final-snapshot",
      kind: "final" as const,
    }
    const completed = deriveGrowthStageStatuses({
      cycle,
      evidence,
      snapshots: [baseline, current, final],
    })
    expect(Object.values(completed).every((status) => status === "completed")).toBe(
      true,
    )
  })
})
