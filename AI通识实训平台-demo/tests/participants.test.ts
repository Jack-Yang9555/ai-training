import { describe, expect, it } from 'vitest'
import { parseParticipantCsv } from '../src/training/participants'

describe('培训人员 CSV 导入', () => {
  it('解析基本信息和分组，不包含固定任务角色', () => {
    const result = parseParticipantCsv([
      '人员编号,姓名,单位,部门,专业方向,联系方式,分组',
      'T101,刘老师,示范职业学院,信息工程系,软件技术,13800000001,第 1 组',
      'T102,何老师,示范职业学院,艺术设计系,视觉设计,13800000002,第 1 组',
    ].join('\n'))
    expect(result.errors).toEqual([])
    expect(result.participants).toHaveLength(2)
    expect(result.participants[0]).toEqual({ participantId: 'T101', name: '刘老师', organization: '示范职业学院', department: '信息工程系', specialty: '软件技术', contact: '13800000001', groupId: 'group-1', groupName: '第 1 组' })
    expect(result.participants[0]).not.toHaveProperty('role')
  })

  it('阻止缺少必填列和重复人员编号，提醒单人小组', () => {
    expect(parseParticipantCsv('姓名,分组\n刘老师,第 1 组').errors).toContain('缺少必填列：人员编号')
    const result = parseParticipantCsv('人员编号,姓名,分组\nT101,刘老师,第 1 组\nT101,何老师,第 2 组')
    expect(result.errors).toContain('第 3 行人员编号重复：T101')
    expect(result.warnings).toContain('第 1 组少于 2 人，无法完成交叉复核')
  })
})
