import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildG01GroupContext } from '../src/g01/data'
import { createInitialG01Progress } from '../src/g01/storage'
import type { G01CurrentMemberEvidence } from '../src/g01/types'
import { G01AssessmentPage, G01Overview } from '../src/pages/G01Pages'
import { createParticipantDirectory } from '../src/training/participants'
import type { TrainingParticipant } from '../src/training/types'

const participants: TrainingParticipant[] = [
  { participantId: 'P01', name: '甲老师', organization: '', department: '', specialty: '', contact: '', groupId: 'g1', groupName: '第 1 组' },
  { participantId: 'P02', name: '乙老师', organization: '', department: '', specialty: '', contact: '', groupId: 'g1', groupName: '第 1 组' },
]

function evidence(m05 = true): G01CurrentMemberEvidence {
  return { participantId: 'P01', prerequisites: { M01: { complete: true, artifactIds: ['M01'] }, M02: { complete: true, artifactIds: ['M02'] }, M03: { complete: true, artifactIds: ['V1', 'V2'] }, M04: { complete: true, artifactIds: ['M04'] }, M05: { complete: m05, artifactIds: m05 ? ['M05'] : [] } }, errorCorrection: { sourceTaskId: 'M01', sourceArtifactId: 'err', aiError: '错误', teacherCorrection: '修正', correctionBasis: '依据' }, crossCheck: { targetParticipantId: 'P02', targetParticipantName: '乙老师', artifactType: '题目包', targetArtifactId: 'P02:M05', finding: '已核对', conclusion: '通过' }, contribution: { role: '核验员', contribution: '核验并汇总。' } }
}

function progress(m05 = true) {
  const directory = createParticipantDirectory(participants, 'test.csv')
  return createInitialG01Progress(buildG01GroupContext(directory, evidence(m05)))
}

describe('G01 工作台关键组件', () => {
  it('M05 未完成时使用任务内演示成果且允许 G01 独立开始', () => {
    render(<G01Overview progress={progress(false)} onNext={vi.fn()} />)
    expect(screen.getByText(/G01 可独立开始/)).toBeInTheDocument()
    expect(screen.getByText('当前教师 · 任务内演示成果')).toBeInTheDocument()
    expect(screen.getByText('所有成员五类验收材料齐全，可以建立小组成果目录')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /建立成果目录/ })).toBeEnabled()
  })

  it('无多人后端模拟边界醒目可见且不会标成真实提交', () => {
    render(<G01Overview progress={progress()} onNext={vi.fn()} />)
    expect(screen.getByText('当前为无多人后端的模拟组员成果，不代表真实提交。')).toBeInTheDocument()
    expect(screen.getAllByText('模拟组员摘要').length).toBeGreaterThan(0)
  })

  it('阶段验收页展示逐项证据与三项固定成果，不展示 10 分制', () => {
    render(<G01AssessmentPage progress={{ ...progress(), route: 'assessment' }} onSubmit={vi.fn()} onUpdateModificationSummary={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getByText('逐项验收证据')).toBeInTheDocument()
    expect(screen.getByText('教学设计与命题成果目录')).toBeInTheDocument()
    expect(screen.getByText('AI 教学内容核验清单')).toBeInTheDocument()
    expect(screen.getByText('个人贡献记录')).toBeInTheDocument()
    expect(screen.getByText('无数值评分')).toBeInTheDocument()
    expect(screen.queryByText('/ 10 分')).not.toBeInTheDocument()
  })
})
