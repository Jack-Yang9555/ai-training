import type {
  E05JobTaskDraft,
  E05MappingDraft,
  E05Progress,
  E05SourceBundle,
  E05Suggestion,
  E05SuggestionDraft,
} from './domain'

export function createE05ReviewedSourceBundle(): E05SourceBundle {
  return {
    jobMaterial: {
      sourceId: 'E05-JOB-SOURCE-01',
      documentName: 'AI 内容运营助理岗位任务说明（平台已审核、已脱敏虚构样例）',
      version: '2026.1',
      sourceOrganization: '平台产教研发组',
      authorization: '限本地 Demo 教学演示和课岗映射练习使用',
      scopeNote: '只作为 E05 岗位任务事实来源，不代表真实企业招聘要求。',
      auditStatus: '已审核',
      anonymized: true,
      reviewedFictional: true,
      excerpts: [
        { excerptId: 'JEV-01', heading: '业务需求解析', content: '根据经审核的内容任务单，识别对象、目标、输出格式与不可触碰边界。' },
        { excerptId: 'JEV-02', heading: '结构化提示词编写', content: '把业务需求转化为包含角色、任务、约束与输出格式的结构化提示词。' },
        { excerptId: 'JEV-03', heading: '生成参数配置', content: '按内容稳定性与多样性要求配置参数，对比不同参数的生成结果。' },
        { excerptId: 'JEV-04', heading: '事实与引用核验', content: '使用经审核来源核对生成内容中的事实、数据和引用，标记待确认内容。' },
        { excerptId: 'JEV-05', heading: '版权隐私检查', content: '在输入和发布前核验材料授权、个人信息与版权边界，不使用未授权或含敏感信息的材料。' },
        { excerptId: 'JEV-06', heading: '版本迭代与交付', content: '保留提示词、参数、修改理由和核验结果，按审核流程交付可追溯版本。' },
      ],
    },
    course: {
      courseId: 'E05-COURSE-PROMPT-01',
      courseName: '生成式 AI 提示词设计',
      documentName: '本人课程目标与内容记录',
      version: '2026.1',
      ownerStatement: '由当前参训教师录入并对课程目标的真实性与适用性负责。',
      authorization: '允许用于本次课岗映射练习与成果导出',
      objectives: [
        { objectiveId: 'CO-01', title: '结构化表达任务', description: '学员能分析任务需求，编写含角色、任务、约束和输出格式的提示词。', evidenceId: 'CEV-01' },
        { objectiveId: 'CO-02', title: '配置参数并比较输出', description: '学员能配置生成参数，比较两组输出的稳定性与多样性。', evidenceId: 'CEV-02' },
        { objectiveId: 'CO-03', title: '核验生成内容', description: '学员能使用指定来源核对事实与引用，区分已核验与待确认内容。', evidenceId: 'CEV-03' },
        { objectiveId: 'CO-04', title: '守住材料与权利边界', description: '学员能在输入前检查授权、隐私与版权；当前目标未覆盖版本交付记录。', evidenceId: 'CEV-04' },
      ],
    },
    jobMaterialAuthorizationConfirmed: true,
    privacyConfirmed: true,
    courseOwnershipConfirmed: true,
    teacherVerifiedConfirmed: true,
  }
}

export function createInitialE05Progress(): E05Progress {
  return {
    version: 1,
    route: 'overview',
    source: createE05ReviewedSourceBundle(),
    peerReview: {
      recordId: '',
      reviewerId: '',
      reviewerGroupId: '',
      reviewedMappingFingerprint: '',
      reviewedSuggestionFingerprint: '',
      reviewedWebPageId: '',
      mappingJudgement: '',
      suggestionJudgement: '',
      targetRecordIds: [],
      suggestion: '',
      authorTreatment: '',
      authorBasis: '',
      simulated: false,
      disclosure: '当前 Demo 无多人后端；本记录由作者在本机触发确定性模拟，非实时提交，不代表真实组员在线提交。',
      submitted: false,
    },
    revisions: [],
    teacherConfirmation: {
      sourceAndEvidenceConfirmed: false,
      mappingAndSuggestionsConfirmed: false,
      offlineArtifactConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    attemptHistory: [],
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}

export function createE05DeterministicJobTasks(participantId: string, inputFingerprint: string): E05JobTaskDraft {
  return {
    draftId: `E05-TASKS-${participantId}-${inputFingerprint}`,
    participantId,
    inputFingerprint,
    generatedAt: '2026-08-25T06:00:00.000Z',
    tasks: [
      { taskId: 'JT-01', name: '解析业务需求', description: '识别任务对象、目标、输出格式与边界。', jobEvidenceExcerptId: 'JEV-01', teacherReviewed: false },
      { taskId: 'JT-02', name: '编写结构化提示词', description: '把需求转化为角色、任务、约束和格式。', jobEvidenceExcerptId: 'JEV-02', teacherReviewed: false },
      { taskId: 'JT-03', name: '配置并比较生成参数', description: '根据质量需求配置参数并对比结果。', jobEvidenceExcerptId: 'JEV-03', teacherReviewed: false },
      { taskId: 'JT-04', name: '核验事实与引用', description: '使用经审核来源核对事实、数据和引用。', jobEvidenceExcerptId: 'JEV-04', teacherReviewed: false },
      { taskId: 'JT-05', name: '检查版权与隐私', description: '在输入和发布前核对授权、隐私与版权边界。', jobEvidenceExcerptId: 'JEV-05', teacherReviewed: false },
      { taskId: 'JT-06', name: '记录迭代并交付', description: '保留参数、修改与核验记录，交付可追溯版本。', jobEvidenceExcerptId: 'JEV-06', teacherReviewed: false },
    ],
  }
}

export function createE05DeterministicMappings(participantId: string, jobTaskFingerprint: string): E05MappingDraft {
  const mapping = (
    mappingId: string,
    courseObjectiveId: string,
    jobTaskId: string,
    status: E05MappingDraft['mappings'][number]['status'],
    courseEvidenceId: string,
    courseEvidenceSummary: string,
    jobEvidenceExcerptId: string,
    jobEvidenceSummary: string,
    judgementBasis: string,
  ) => ({ mappingId, courseObjectiveId, jobTaskId, status, courseEvidenceId, courseEvidenceSummary, jobEvidenceExcerptId, jobEvidenceSummary, judgementBasis, teacherReviewed: false })
  return {
    draftId: `E05-MAPPINGS-${participantId}-${jobTaskFingerprint}`,
    participantId,
    jobTaskFingerprint,
    generatedAt: '2026-08-25T06:01:00.000Z',
    mappings: [
      mapping('MAP-01', 'CO-01', 'JT-01', '已覆盖', 'CEV-01', '目标明确要求分析任务需求。', 'JEV-01', '岗位要求识别对象、目标、格式和边界。', '课程动作与岗位任务均包含需求解析。'),
      mapping('MAP-02', 'CO-01', 'JT-02', '已覆盖', 'CEV-01', '目标要求编写角色、任务、约束和格式。', 'JEV-02', '岗位要求编写结构化提示词。', '课程与岗位的动作和产出一致。'),
      mapping('MAP-03', 'CO-01', 'JT-06', '覆盖不足', 'CEV-01', '目标包含提示词产出，但未明确版本记录。', 'JEV-06', '岗位要求保留修改理由和交付版本。', '有相关产出，但课程证据未覆盖交付留痕。'),
      mapping('MAP-04', 'CO-02', 'JT-02', '覆盖不足', 'CEV-02', '目标聚焦参数配置，只间接使用提示词。', 'JEV-02', '岗位要求完整编写结构化提示词。', '课程内容只覆盖岗位任务的部分操作环节。'),
      mapping('MAP-05', 'CO-02', 'JT-03', '已覆盖', 'CEV-02', '目标要求配置参数并比较两组输出。', 'JEV-03', '岗位要求配置参数并对比生成结果。', '动作、对象和可观察产出一致。'),
      mapping('MAP-06', 'CO-02', 'JT-06', '覆盖不足', 'CEV-02', '目标包含结果对比，但未要求记录每次参数。', 'JEV-06', '岗位要求保留参数、修改理由和版本。', '课程已有对比活动，但过程证据不完整。'),
      mapping('MAP-07', 'CO-03', 'JT-01', '暂未覆盖', 'CEV-03', '目标只要求核验生成内容，未要求解析业务任务单。', 'JEV-01', '岗位任务是识别任务对象、目标、格式和边界。', '当前课程目标范围中无对应行为证据。'),
      mapping('MAP-08', 'CO-03', 'JT-04', '已覆盖', 'CEV-03', '目标要求核对事实与引用并标记待确认内容。', 'JEV-04', '岗位要求使用审核来源核对事实、数据和引用。', '课程与岗位的核验对象和动作一致。'),
      mapping('MAP-09', 'CO-03', 'JT-06', '覆盖不足', 'CEV-03', '目标要求区分已核验与待确认内容，但未定义交付记录。', 'JEV-06', '岗位要求记录核验结果并交付可追溯版本。', '课程有核验结果，但缺交付形式和版本证据。'),
      mapping('MAP-10', 'CO-04', 'JT-04', '覆盖不足', 'CEV-04', '目标聚焦授权、隐私和版权，不直接评价事实引用。', 'JEV-04', '岗位要求核对事实、数据与引用。', '权利来源核验有关联，但不足以覆盖完整事实核验。'),
      mapping('MAP-11', 'CO-04', 'JT-05', '已覆盖', 'CEV-04', '目标要求在输入前检查授权、隐私和版权。', 'JEV-05', '岗位要求在输入和发布前检查权利边界。', '课程与岗位的检查对象和安全边界一致。'),
      // 确定性缺陷：课程证据明确未覆盖交付记录，初稿却标为“覆盖不足”。
      mapping('MAP-12', 'CO-04', 'JT-06', '覆盖不足', 'CEV-04', '目标明确未覆盖版本交付记录。', 'JEV-06', '岗位要求保留修改、核验和交付版本。', '初稿将一项无课程行为证据的任务误判为部分覆盖。'),
    ],
  }
}

export function createE05DeterministicSuggestions(participantId: string, mappingFingerprint: string): E05SuggestionDraft {
  const suggestion = (
    suggestionId: string,
    linkedMappingId: string,
    gap: string,
    courseAdjustment: string,
    expectedEvidence: string,
    courseEvidenceId: string,
    jobEvidenceExcerptId: string,
  ): E05Suggestion => ({ suggestionId, linkedMappingId, gap, courseAdjustment, expectedEvidence, courseEvidenceId, jobEvidenceExcerptId, teacherReviewed: false })
  return {
    draftId: `E05-SUGGESTIONS-${participantId}-${mappingFingerprint}`,
    participantId,
    mappingFingerprint,
    generatedAt: '2026-08-25T06:02:00.000Z',
    suggestions: [
      suggestion('SG-01', 'MAP-03', '结构化提示词目标未覆盖修改理由与版本留痕。', '在提示词练习后增加版本对比步骤，要求学员保存 v1/v2 和修改理由。', '一份包含 v1、v2、修改理由和教师核验标记的版本对比表。', 'CEV-01', 'JEV-06'),
      suggestion('SG-02', 'MAP-06', '参数比较活动未保留每次配置与结果证据。', '在参数实验中增加两轮配置记录，学员填写参数值、输出摘要和选择理由。', '一份含两轮参数、输出差异和选择理由的迭代记录。', 'CEV-02', 'JEV-06'),
      // 确定性缺陷：动作和证据过于笼统，同组复核后再具体化。
      suggestion('SG-03', 'MAP-12', '课程目标未覆盖岗位要求的版本交付记录。', '加强版本交付训练。', '保留相关证据。', 'CEV-04', 'JEV-06'),
    ],
  }
}
