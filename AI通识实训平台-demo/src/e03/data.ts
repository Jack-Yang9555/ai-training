import type {
  E03ClassroomSource,
  E03FindingDraft,
  E03MeasureSet,
  E03Progress,
} from './domain'

export function createE03ReviewedFictionalSource(): E03ClassroomSource {
  return {
    sourceId: 'E03-SOURCE-CLASSROOM-01',
    sourceKind: '平台已审核虚构课堂记录',
    sourceName: '《项目任务启动与过程检查》课堂观察记录（已审核虚构样例）',
    version: 'V1.0',
    reviewedFictional: true,
    teachingGoal: '学生能说出项目任务的三个启动步骤，并在小组内按任务单完成首次操作与结果自检。',
    classroomActivities: '导入提问（5 分钟）→ 教师示范（8 分钟）→ 六组任务实践（22 分钟）→ 退出卡检测（5 分钟）。',
    assessmentResults: '共收回 24 份退出卡：16 份完整写出三个启动步骤，4 份写出两个步骤，4 份未作答。',
    excerpts: [
      {
        referenceId: 'REC-01',
        locator: '课堂观察记录 09:05–09:08 · 导入提问',
        content: '教师提出“启动项目前先做哪三步”后，24 名匿名学习者中有 18 人举手，教师随机请 3 人作答，3 人均说出“读任务单、领工具、核对工位”。',
      },
      {
        referenceId: 'REC-02',
        locator: '课堂观察记录 09:18–09:20 · 分组任务启动',
        content: '任务发布 2 分钟后，6 个小组中有 2 组尚未打开任务单；教师提醒“先看任务单第一步”后，这 2 组均打开任务单并开始操作。',
      },
      {
        referenceId: 'REC-03',
        locator: '课堂观察记录 09:38 · 退出卡检测',
        content: '教师收回 24 份退出卡，其中 16 份完整写出三个启动步骤，4 份写出两个步骤，4 份未作答。',
      },
    ],
    anonymizationConfirmed: true,
    sourceOnlyConfirmed: true,
    noRealIdentityConfirmed: true,
  }
}

export function createInitialE03Progress(): E03Progress {
  return {
    version: 1,
    route: 'overview',
    source: createE03ReviewedFictionalSource(),
    workingFindings: [],
    peerReview: {
      recordId: '',
      templateVersion: '1.0',
      targetScope: 'member',
      reviewerId: '',
      reviewerGroupId: '',
      artifactKind: 'e03-improvement-measures',
      artifactId: '',
      reviewedMeasureFingerprint: '',
      judgements: [
        { measureId: 'A01', specific: '', executable: '', observable: '', suggestion: '' },
        { measureId: 'A02', specific: '', executable: '', observable: '', suggestion: '' },
      ],
      simulated: true,
      disclosure: '当前无多人后端；复核由当前教师依据同组成员身份在本机代录，属于非实时提交，不代表真实组员在线提交。',
      submitted: false,
    },
    revisions: [],
    teacherConfirmation: {
      sourceBoundaryConfirmed: false,
      findingsReviewedConfirmed: false,
      noRealIdentityConfirmed: false,
      noFixedLabelsConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    attemptHistory: [],
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}

export function createE03DeterministicFindingDraft(
  participantId: string,
  inputFingerprint: string,
  source: E03ClassroomSource,
): E03FindingDraft {
  const [first, second, third] = source.excerpts
  return {
    draftId: `E03-FINDINGS-${participantId}-${inputFingerprint}`,
    participantId,
    inputFingerprint,
    generatedAt: '2026-08-25T00:00:00.000Z',
    engineLabel: '本地确定性课堂证据引擎（Demo）',
    findings: [
      {
        findingId: 'F01',
        observedFact: '导入提问后，24 名匿名学习者中有 18 人举手；被随机请到的 3 人均说出三个启动步骤。',
        sourceReference: first?.referenceId ?? '',
        sourceExcerpt: first?.content ?? '',
        interpretationToConfirm: '多数学习者可能已能口头回忆启动步骤，但未举手者是否掌握仍需用全员检测确认。',
        teacherReviewed: false,
      },
      {
        findingId: 'F02',
        observedFact: '部分学生学习态度消极、理解能力偏弱，所以任务启动不主动。',
        sourceReference: second?.referenceId ?? '',
        sourceExcerpt: second?.content ?? '',
        interpretationToConfirm: '这些学生可能缺乏学习主动性，仍需进一步确认。',
        teacherReviewed: false,
      },
      {
        findingId: 'F03',
        observedFact: '24 份退出卡中，16 份完整写出三个启动步骤，4 份写出两个步骤，4 份未作答。',
        sourceReference: third?.referenceId ?? '',
        sourceExcerpt: third?.content ?? '',
        interpretationToConfirm: '仍有 8 名匿名学习者的三个启动步骤掌握情况需要在下一次课继续确认。',
        teacherReviewed: false,
      },
    ],
  }
}

export function createInitialE03MeasureSet(
  participantId: string,
  findingsFingerprint: string,
): E03MeasureSet {
  return {
    artifactId: `E03-MEASURES-${participantId}-${findingsFingerprint}`,
    participantId,
    basedOnFindingsFingerprint: findingsFingerprint,
    measures: [
      {
        measureId: 'A01',
        linkedFindingIds: ['F03'],
        implementationPhase: '下一次课导入后的第 3–6 分钟',
        teacherAction: '发放一张三步排序卡，要求每人独立排序后再与同桌核对，教师收回并当场统计。',
        observableStudentBehavior: '24 名匿名学习者均提交排序结果，并能按顺序指认“读任务单、领工具、核对工位”。',
        checkMethod: '以排序卡记录完整正确人数；目标为 24 人全部提交、至少 20 人首次排序正确。',
        teacherReviewed: false,
      },
      {
        measureId: 'A02',
        linkedFindingIds: ['F02'],
        implementationPhase: '下一次课任务实践阶段',
        teacherAction: '加强对主动性不足学生的关注，提升学习积极性。',
        observableStudentBehavior: '学生更积极地参与任务。',
        checkMethod: '教师观察课堂表现。',
        teacherReviewed: false,
      },
    ],
  }
}
