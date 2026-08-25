import { buildG03GroupContext } from '../src/g03/data'
import type { G03CurrentEvidenceInput, G03Progress } from '../src/g03/domain'
import { createInitialG03Progress } from '../src/g03/storage'
import { createInitialPortalProgress } from '../src/training/storage'

export function completeG03Fixture() {
  const directory = createInitialPortalProgress().participantDirectory
  const input: G03CurrentEvidenceInput = {
    participantId: directory.currentParticipantId,
    tasks: {
      M09: { taskId: 'M09', artifactId: 'M09:T001:knowledge-v1', version: 'v1.0', assessmentId: 'M09:T001:assessment', current: true, issueId: 'M09:T001:issue-1', issue: '错误版本资料导致来源片段定位不稳定。', correction: '排除错误版本并使用已授权 v2.1 资料重新建立片段索引。', correctionEvidenceId: 'M09:T001:correction-1', retestResult: '已通过', retestEvidenceId: 'M09:T001:retest-1' },
      M10: { taskId: 'M10', artifactId: 'M10:T001:assistant-v1', version: 'v1.0', assessmentId: 'M10:T001:assessment', current: true },
      M11: { taskId: 'M11', artifactId: 'M11:T001:retest-package', version: 'retest-v1', assessmentId: 'M11:T001:assessment', current: true },
    },
    m11Coverage: { testedParticipantId: 'T002', testedRecordId: 'M11:T001:test:T002', acceptedTestFromParticipantId: 'T006', acceptedRecordId: 'M11:T006:test:T001', submitted: true },
    scenarios: [
      { scenarioId: 'scene-evidence', kind: '有来源回答', sourceTaskId: 'M10', question: '生成式图片提示词的主体信息应包含什么？', answer: '主体应说明对象、动作和关键属性。', evidenceId: 'M10:T001:normal:preview', sourceId: 'SRC-02', sourceLocation: '提示词讲义 v2.1 / 第 3 节 / 片段 S-08', sourceExcerpt: '主体描述包含对象、动作与关键属性。', noFalseCitation: true },
      { scenarioId: 'scene-clarify', kind: '缺失条件追问', sourceTaskId: 'M11', question: '帮我优化一下。', answer: '请先说明要优化的是提示词还是图片，以及当前学习阶段。', evidenceId: 'M11:T001:ambiguous:retest', missingCondition: '优化对象和当前学习阶段', noFalseCitation: true },
      { scenarioId: 'scene-boundary', kind: '超范围说明与转交', sourceTaskId: 'M11', question: '请根据资料判断学生的最终成绩。', answer: '当前资料不支持决定最终成绩，我将停止判断并转交任课教师。', evidenceId: 'M11:T001:boundary:retest', boundaryStatement: '知识库仅支持课程答疑，不包含最终成绩决定权限。', handoffTarget: '任课教师人工接管', noFalseCitation: true },
    ],
  }
  const context = buildG03GroupContext(directory, input)
  const progress = createInitialG03Progress(context)
  progress.matrixConfirmed = true
  progress.reportConfirmed = true
  progress.scenarios = progress.scenarios.map((item) => ({ ...item, confirmed: true }))
  progress.showcase.planConfirmed = true
  progress.showcase.rounds = progress.showcase.rounds.map((item) => ({ ...item, completed: true, qaCompleted: item.currentGroupRole === '展示', qaSeconds: item.currentGroupRole === '展示' ? 120 : 0 })) as G03Progress['showcase']['rounds']
  progress.contributions = progress.contributions.map((item) => ({ ...item, confirmed: true }))
  return { directory, input, context, progress }
}
