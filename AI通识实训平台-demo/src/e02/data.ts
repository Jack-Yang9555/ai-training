import type {
  E02DraftPackage,
  E02Progress,
  E02Scenario,
  E02Specification,
} from './domain'

export function createE02ReviewedFictionalSpecification(): E02Specification {
  return {
    sourceKind: '平台已审核虚构实训规范',
    reviewedFictional: true,
    name: '24V 低压教学实训板端子接线与通断检查规范（已审核虚构样例）',
    version: 'V1.0',
    applicableEquipment: '带急停与透明防护罩的 24V 低压教学实训板（虚构型号 EDU-24）',
    sourceOrganization: '平台教学研发组（虚构）',
    authorization: '已授权用于平台内教学演示，不替代设备制造商说明书或学校安全规程',
    scopeNote: '仅用于断电接线和教师监督下的低压通断检查；禁止迁移到市电、医疗或未经核验的设备操作。',
    clauses: [
      { clauseId: '4.1', sequence: 1, title: '断电与外观检查', requirement: '确认实训板电源断开、急停有效且导线绝缘层无破损，并保留检查记录。' },
      { clauseId: '4.2', sequence: 2, title: '图样与端子核对', requirement: '接线前按任务图逐一核对端子编号和导线标识，形成核对表。' },
      { clauseId: '4.3', sequence: 3, title: '端子接线', requirement: '在断电状态下按已核对的端子顺序完成接线，逐点留下可观察的紧固与线号证据。' },
      { clauseId: '4.4', sequence: 4, title: '复核与低压通断检查', requirement: '教师复核接线与防护状态后，方可在教学设备上进行低压通断检查；异常时立即停止并保持断电。' },
    ],
  }
}

export function createInitialE02Scenario(): E02Scenario {
  const specification = createE02ReviewedFictionalSpecification()
  return {
    courseName: '电气装配基础实训',
    vocationalTask: '完成 24V 低压教学实训板端子接线与通断检查',
    learningObjective: '能依据已审核规范完成断电检查、端子核对、接线和教师复核，并提交可观察证据。',
    equipment: specification.applicableEquipment,
    materials: ['虚构教学任务图 1 份', '带完整绝缘层的教学导线 4 根', '线号标签 4 枚', '断电状态检查记录表 1 份'],
    trainingConditions: '仅在教师现场监督、设备断电挂牌和 24V 教学电源条件下进行。',
    materialAuthorizationConfirmed: true,
    privacyConfirmed: true,
    verifiedOperationOnlyConfirmed: true,
  }
}

export function createInitialE02Progress(): E02Progress {
  return {
    version: 1,
    route: 'overview',
    scenario: createInitialE02Scenario(),
    specification: createE02ReviewedFictionalSpecification(),
    peerReview: {
      recordId: '',
      templateVersion: '1.0',
      reviewerId: '',
      reviewerGroupId: '',
      taskBookId: '',
      reviewedDraftFingerprint: '',
      sequence: '',
      safety: '',
      scoreTotal: '',
      suggestion: '',
      authorTreatment: '',
      authorBasis: '',
      simulated: true,
      disclosure: '当前无多人后端；复核由当前教师依据同组成员身份在本机代录，属于非实时提交，不代表真实组员在线提交。',
      submitted: false,
    },
    modifications: [],
    teacherConfirmation: {
      specificationReviewedConfirmed: false,
      authorizationAndPrivacyConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    attemptHistory: [],
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}

export function createE02DeterministicDraft(
  participantId: string,
  inputFingerprint: string,
  scenario: E02Scenario,
): E02DraftPackage {
  return {
    draftId: `E02-DRAFT-${participantId}-${inputFingerprint}`,
    participantId,
    inputFingerprint,
    generatedAt: '2026-08-25T00:00:00.000Z',
    engineLabel: '本地确定性任务书引擎（Demo）',
    taskBook: {
      taskBookId: `E02-BOOK-${participantId}-${inputFingerprint}`,
      title: `${scenario.vocationalTask}实训任务书`,
      background: `面向“${scenario.courseName}”课堂，在教师监督和 24V 低压教学条件下完成端子接线与证据留存。`,
      objective: scenario.learningObjective,
      materials: structuredClone(scenario.materials),
      steps: [
        { stepId: 'S01', order: 1, action: '确认教学实训板断电挂牌、急停有效并检查导线绝缘层。', completionEvidence: '断电挂牌、急停测试和导线外观三项检查记录。', clauseId: '4.1', critical: true, teacherReviewed: false },
        { stepId: 'S02', order: 2, action: '按任务图将导线接入对应端子并完成紧固。', completionEvidence: '每个端子的线号与紧固状态照片或现场勾选记录。', clauseId: '4.3', critical: true, teacherReviewed: false },
        { stepId: 'S03', order: 3, action: '对照任务图核对端子编号和导线标识。', completionEvidence: '端子编号—导线线号逐项核对表。', clauseId: '4.2', critical: true, teacherReviewed: false },
        { stepId: 'S04', order: 4, action: '请教师复核接线与防护状态后，进行教学用低压通断检查。', completionEvidence: '教师复核签记、通断结果和异常停止记录。', clauseId: '4.4', critical: true, teacherReviewed: false },
      ],
    },
    safetyChecklist: [
      { safetyId: 'SAFE-01', description: '接线前确认电源断开、急停有效且导线绝缘无破损。', completionEvidence: '三项检查均勾选并由教师现场核看。', stepId: 'S01', clauseId: '4.1', teacherReviewed: false },
      { safetyId: 'SAFE-02', description: '注意安全。', completionEvidence: '操作员口头确认。', stepId: 'S02', clauseId: '4.3', teacherReviewed: false },
      { safetyId: 'SAFE-03', description: '未取得教师复核签记不得进行低压通断检查；发现异常立即停止并保持断电。', completionEvidence: '教师复核签记和异常停止项均有记录。', stepId: 'S04', clauseId: '4.4', teacherReviewed: false },
    ],
    rubric: {
      rubricId: `E02-RUBRIC-${participantId}-${inputFingerprint}`,
      version: 'R1.0',
      items: [
        { rubricItemId: 'R01', name: '断电与外观检查', score: 15, criticalStepIds: ['S01'], deductionConditions: '缺 1 项检查证据扣 5 分；未确认断电则该项不得分并停止考核。', clauseIds: ['4.1'], teacherReviewed: false },
        { rubricItemId: 'R02', name: '图样、端子与线号核对', score: 25, criticalStepIds: ['S03'], deductionConditions: '每出现 1 处端子或线号不一致扣 5 分。', clauseIds: ['4.2'], teacherReviewed: false },
        { rubricItemId: 'R03', name: '端子接线与紧固', score: 20, criticalStepIds: ['S02'], deductionConditions: '每出现 1 处接线位置或紧固证据缺失扣 5 分。', clauseIds: ['4.3'], teacherReviewed: false },
        { rubricItemId: 'R04', name: '教师复核与通断检查', score: 20, criticalStepIds: ['S04'], deductionConditions: '无教师复核签记不得进行通断检查；异常未停止则该项不得分。', clauseIds: ['4.4'], teacherReviewed: false },
        { rubricItemId: 'R05', name: '过程记录与任务书完整性', score: 15, criticalStepIds: ['S01', 'S02', 'S03', 'S04'], deductionConditions: '每缺 1 类完成证据扣 3 分。', clauseIds: ['4.1', '4.2', '4.3', '4.4'], teacherReviewed: false },
      ],
    },
  }
}
