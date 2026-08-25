import type {
  E04CourseSource,
  E04GraphDraft,
  E04Node,
  E04Progress,
  E04Relation,
} from './domain'

export function createE04ReviewedFictionalSource(): E04CourseSource {
  return {
    sourceId: 'E04-SOURCE-PROMPT-01',
    courseName: '生成式 AI 提示词设计',
    documentName: '生成式 AI 提示词设计课程要点（平台已审核虚构样例）',
    version: '2026.1',
    sourceOrganization: '平台教学研发组',
    authorization: '限本地 Demo 教学演示，可用于生成与修改训练成果',
    scopeNote: '只用于课程概念、先修、组成、应用与易错关系设计；不作为 M09 知识库。',
    reviewedFictional: true,
    excerpts: [
      { excerptId: 'C01', heading: '基础概念', content: '生成式 AI 以大语言模型为常见基础，提示词是人与模型交互的任务表达。' },
      { excerptId: 'C02', heading: '提示词结构', content: '提示词结构包括角色设定、任务描述和输出格式；理解基本结构后再设定负向提示词。' },
      { excerptId: 'C03', heading: '上下文与示例', content: '上下文界定任务边界，Few-shot 示例展示预期格式与处理方式。' },
      { excerptId: 'C04', heading: '参数控制', content: '参数控制包括温度参数等生成设置，用于调整输出的稳定性与多样性。' },
      { excerptId: 'C05', heading: '质量核验', content: '模型输出可能出现幻觉，须使用可靠来源进行事实核验，不得把生成内容直接当作事实。' },
      { excerptId: 'C06', heading: '安全与权利', content: '提交提示词、上下文和示例前，须核验隐私、版权与材料授权，并对输出进行人工核验。' },
    ],
    materialAuthorizationConfirmed: true,
    privacyConfirmed: true,
    teacherVerifiedConfirmed: true,
  }
}

export function createInitialE04Progress(): E04Progress {
  return {
    version: 1,
    route: 'overview',
    source: createE04ReviewedFictionalSource(),
    graphReview: {
      recordId: '',
      reviewerId: '',
      reviewerGroupId: '',
      graphId: '',
      reviewedGraphFingerprint: '',
      relationDirection: '',
      omission: '',
      targetRecordId: '',
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
      graphQualityConfirmed: false,
      finalArtifactsConfirmed: false,
      finalResponsibilityConfirmed: false,
    },
    attemptHistory: [],
    assessments: [],
    updatedAt: new Date().toISOString(),
  }
}

function node(nodeId: string, label: string, category: E04Node['category'], definition: string, sourceExcerptId: string): E04Node {
  return { nodeId, label, category, definition, sourceExcerptId, aliases: [], teacherReviewed: false }
}

function relation(
  relationId: string,
  sourceNodeId: string,
  type: E04Relation['type'],
  targetNodeId: string,
  rationale: string,
  sourceExcerptId: string,
): E04Relation {
  return { relationId, sourceNodeId, type, targetNodeId, rationale, sourceExcerptId, teacherReviewed: false }
}

export function createE04DeterministicGraph(
  participantId: string,
  inputFingerprint: string,
): E04GraphDraft {
  const graphId = `E04-GRAPH-${participantId}-${inputFingerprint}`
  return {
    graphId,
    participantId,
    inputFingerprint,
    generatedAt: '2026-08-25T04:00:00.000Z',
    title: '生成式 AI 提示词设计课程知识图谱',
    version: 1,
    focusNodeIds: ['N03', 'N04', 'N14'],
    nodes: [
      node('N01', '生成式 AI 基础', '基础概念', '课程的基础概念集合。', 'C01'),
      node('N02', '大语言模型', '基础概念', '常见的生成式 AI 基础模型。', 'C01'),
      node('N03', '提示词', '基础概念', '人与模型交互的任务表达。', 'C01'),
      node('N04', '提示词结构', '方法技能', '组织提示词内容的结构化方法。', 'C02'),
      node('N05', '角色设定', '方法技能', '指定模型扮演的任务角色。', 'C02'),
      node('N06', '任务描述', '方法技能', '说明对象、动作与目标。', 'C02'),
      node('N07', '输出格式', '方法技能', '限定输出的结构与格式。', 'C02'),
      node('N08', '负向提示词', '方法技能', '声明不期望出现的内容或行为。', 'C02'),
      node('N09', '上下文', '方法技能', '提供任务背景、边界与必要信息。', 'C03'),
      node('N10', '参数控制', '参数工具', '调整生成行为的设置集合。', 'C04'),
      node('N11', '温度参数', '参数工具', '调整输出稳定性与多样性的参数。', 'C04'),
      node('N12', 'Few-shot 示例', '方法技能', '用少量示例展示预期处理方式。', 'C03'),
      node('N13', '幻觉', '质量风险', '输出看似合理但与事实不符的风险。', 'C05'),
      node('N14', '事实核验', '质量风险', '使用可靠来源核对输出事实。', 'C05'),
      node('N15', '版权与隐私', '质量风险', '处理材料授权、个人信息与权利边界。', 'C06'),
      // 确定性缺陷 1：与 N08 同名重复，后续合并并保留别名与来源。
      node('N16', '负向提示词', '方法技能', '用排除项限定不期望输出。', 'C02'),
    ],
    relations: [
      relation('R01', 'N01', '组成', 'N02', '基础内容包含大语言模型。', 'C01'),
      relation('R02', 'N01', '组成', 'N03', '基础内容包含提示词。', 'C01'),
      relation('R03', 'N03', '先修', 'N04', '先理解提示词再学习结构化方法。', 'C02'),
      relation('R04', 'N04', '组成', 'N05', '提示词结构包含角色设定。', 'C02'),
      relation('R05', 'N04', '组成', 'N06', '提示词结构包含任务描述。', 'C02'),
      relation('R06', 'N04', '组成', 'N07', '提示词结构包含输出格式。', 'C02'),
      // 确定性缺陷 2：先修方向反了，应为 N04 -> N08。
      relation('R07', 'N08', '先修', 'N04', '先学习结构再设定负向约束。', 'C02'),
      relation('R08', 'N03', '先修', 'N09', '理解任务表达后再补充上下文。', 'C03'),
      relation('R09', 'N09', '先修', 'N12', '上下文为示例界定任务边界。', 'C03'),
      relation('R10', 'N04', '应用', 'N12', '结构化提示词可用于组织 Few-shot 示例。', 'C03'),
      relation('R11', 'N10', '组成', 'N11', '参数控制包含温度设置。', 'C04'),
      relation('R12', 'N11', '应用', 'N03', '温度设置用于调整提示词运行时的输出。', 'C04'),
      relation('R13', 'N03', '易错', 'N13', '直接信任提示词输出易遇到幻觉。', 'C05'),
      relation('R14', 'N14', '应用', 'N13', '事实核验用于处理幻觉风险。', 'C05'),
      relation('R15', 'N12', '应用', 'N14', '对示例与模型输出进行事实核验。', 'C05'),
      relation('R16', 'N15', '应用', 'N03', '提示词材料须符合版权与隐私边界。', 'C06'),
      relation('R17', 'N15', '易错', 'N13', '未核验来源和权利的内容容易引发风险。', 'C06'),
      // 确定性缺陷 3：组成关系无来源，且与课程材料不符，后续删除。
      relation('R18', 'N15', '组成', 'N10', '版权与隐私组成参数控制。', ''),
      relation('R19', 'N05', '应用', 'N06', '角色设定用于约束任务描述的视角。', 'C02'),
      relation('R20', 'N06', '应用', 'N07', '任务描述与输出格式共同界定结果。', 'C02'),
      relation('R21', 'N07', '易错', 'N13', '未限定输出格式时更难发现事实问题。', 'C05'),
      relation('R22', 'N16', '易错', 'N13', '负向约束不清可增加错误输出风险。', 'C02'),
    ],
  }
}
