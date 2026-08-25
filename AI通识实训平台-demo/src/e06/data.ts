import type { E06Document, E06Draft, E06Progress } from './domain'

export const e06Documents: [E06Document, E06Document, E06Document] = [
  { documentId: 'D01', title: '项目化课堂中“个人预想—小组解释—全班互评”支架的形成性研究', author: '教研训练案例编写组 A', year: 2024, authorization: '已授权用于本地培训 Demo；平台已审核虚构材料', reviewedFictional: true, excerpts: [
    { excerptId: 'D01-P2-S1', locator: '第 2 页·研究对象', text: '对某高职一年级 2 个教学班共 58 名匿名学习者的 6 次项目任务课进行连续观察。' },
    { excerptId: 'D01-P3-S2', locator: '第 3 页·方法', text: '比较引入三段式支架前后的任务单完整率，并对 12 组课堂解释记录进行编码。' },
    { excerptId: 'D01-P5-S1', locator: '第 5 页·发现', text: '第 4—6 次课的任务单完整率高于基线，学习者对步骤依据的解释次数增加。' },
    { excerptId: 'D01-P6-S2', locator: '第 6 页·边界', text: '本结果来自同一专业的两个班级，未分离教师经验和重复练习的影响，不能推广为所有课程的因果结论。' },
  ] },
  { documentId: 'D02', title: '退出卡反馈在实训课堂中的小规模设计实验', author: '教研训练案例编写组 B', year: 2023, authorization: '已授权用于本地培训 Demo；平台已审核虚构材料', reviewedFictional: true, excerpts: [
    { excerptId: 'D02-P1-S2', locator: '第 1 页·研究对象', text: '选取一个机电实训班 28 名匿名学习者，在连续 4 周的每次课末使用三题退出卡。' },
    { excerptId: 'D02-P2-S3', locator: '第 2 页·方法', text: '按周统计三题全对比例，教师依据当周错误类型调整下次课的 10 分钟补教活动。' },
    { excerptId: 'D02-P4-S1', locator: '第 4 页·发现', text: '第 4 周三题全对比例高于第 1 周；高频错误类型从 5 类减少为 3 类。' },
    { excerptId: 'D02-P5-S2', locator: '第 5 页·边界', text: '只有一个班且没有对照组；结果只能说明本班四周内的共变，不能证明退出卡必然导致成绩提升。' },
  ] },
  { documentId: 'D03', title: '职业教育项目作品双层量规的专家咨询与试评', author: '教研训练案例编写组 C', year: 2024, authorization: '已授权用于本地培训 Demo；平台已审核虚构材料', reviewedFictional: true, excerpts: [
    { excerptId: 'D03-P1-S3', locator: '第 1 页·研究对象', text: '对 6 名专业教师和 18 份已匿名项目作品开展量规咨询与试评。' },
    { excerptId: 'D03-P2-S1', locator: '第 2 页·方法', text: '两轮专家咨询后，两名教师独立试评 18 份作品，对任务过程与产品质量分层记录。' },
    { excerptId: 'D03-P4-S2', locator: '第 4 页·发现', text: '修订后量规能分开过程合规性与最终作品质量；两名试评教师的分歧项减少。' },
    { excerptId: 'D03-P5-S3', locator: '第 5 页·边界', text: '试评作品数量较少，量规只在一类项目中试用，尚未检验跨专业适用性。' },
  ] },
]

export function createInitialE06Progress(): E06Progress {
  return { version: 1, route: 'overview', source: { teachingQuestion: '如何用可观察、可反馈的学习证据改进高职项目化课堂？', intendedUse: '用于校本教研选题与下一轮课堂改进方案论证。', documents: structuredClone(e06Documents), exactlyThreeConfirmed: false, authorizationConfirmed: false, noOpenWebConfirmed: false, privacyConfirmed: false }, workingRecords: [], comparisons: [], peerReview: { recordId: '', reviewerId: '', reviewerGroupId: '', artifactKind: 'e06-literature-package', artifactId: '', reviewedFingerprint: '', documentChecks: [], suggestion: '', simulated: true, disclosure: '当前 Demo 无多人后端；核验由作者依据同组成员身份在本机触发确定性模拟，非实时提交，不代表真实组员在线提交。', submitted: false }, revisions: [], teacherConfirmation: { metadataConfirmed: false, conclusionsConfirmed: false, comparisonConfirmed: false, zeroFalseCitationConfirmed: false, complianceConfirmed: false, finalResponsibilityConfirmed: false }, attemptHistory: [], assessments: [], updatedAt: new Date().toISOString() }
}

export function createE06Draft(participantId: string, inputFingerprint: string): E06Draft {
  const records: E06Draft['records'] = [
    { documentId: 'D01', title: e06Documents[0].title, author: e06Documents[0].author, year: 2024, researchObject: '两个高职教学班 58 名匿名学习者的 6 次项目任务课', method: '支架引入前后任务单完整率比较与 12 组解释记录编码', finding: '后三次课任务单完整率高于基线，依据解释次数增加', boundary: '同一专业两班，未分离教师经验与重复练习，不支持普遍因果推广', objectReference: 'D01-P2-S1', methodReference: 'D01-P3-S2', findingReference: 'D01-P5-S1', boundaryReference: 'D01-P6-S2', teacherReviewed: false },
    { documentId: 'D02', title: e06Documents[1].title, author: e06Documents[1].author, year: 2023, researchObject: '一个机电实训班 28 名匿名学习者的四周退出卡', method: '按周统计三题全对比例，并按错误类型调整下次课补教', finding: '退出卡必然导致学生成绩提升，可推广到所有高职课程', boundary: '四周连续跟踪已证明稳定因果关系', objectReference: 'D02-P1-S2', methodReference: 'D02-P2-S3', findingReference: 'D02-P4-S1', boundaryReference: 'D02-P5-S2', teacherReviewed: false },
    { documentId: 'D03', title: e06Documents[2].title, author: e06Documents[2].author, year: 2024, researchObject: '6 名专业教师和 18 份匿名项目作品', method: '两轮专家咨询与两名教师独立试评', finding: '双层量规能分开过程合规性和作品质量，两名试评者分歧项减少', boundary: '仅 18 份作品与一类项目，未检验跨专业适用性', objectReference: 'D03-P1-S3', methodReference: 'D03-P2-S1', findingReference: 'D03-P4-S2', boundaryReference: 'D03-P5-S3', teacherReviewed: false },
  ]
  return { draftId: `E06-DRAFT-${participantId}-${inputFingerprint}`, participantId, inputFingerprint, generatedAt: '2026-08-25T00:00:00.000Z', engineLabel: '本地确定性文献梳理引擎（Demo）', records }
}
