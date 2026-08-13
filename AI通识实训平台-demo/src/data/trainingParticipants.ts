import type { GroupRole } from '../types'
import type { TrainingParticipant } from '../training/types'

export const groupRoles: GroupRole[] = ['协调员', '操作员', '核验员', '记录员', '展示员', '学生体验员']

export const sampleParticipants: TrainingParticipant[] = [
  { participantId: 'T001', name: '张老师', organization: '启明职业技术学院', department: '数字创意学院', specialty: '视觉设计', contact: '138****2101', groupId: 'group-3', groupName: '第 3 组' },
  { participantId: 'T002', name: '李老师', organization: '启明职业技术学院', department: '人工智能学院', specialty: '计算机应用', contact: '138****2102', groupId: 'group-3', groupName: '第 3 组' },
  { participantId: 'T003', name: '王老师', organization: '启明职业技术学院', department: '智能制造学院', specialty: '机电一体化', contact: '138****2103', groupId: 'group-3', groupName: '第 3 组' },
  { participantId: 'T004', name: '陈老师', organization: '启明职业技术学院', department: '商贸管理学院', specialty: '电子商务', contact: '138****2104', groupId: 'group-3', groupName: '第 3 组' },
  { participantId: 'T005', name: '赵老师', organization: '启明职业技术学院', department: '文化传播学院', specialty: '数字媒体', contact: '138****2105', groupId: 'group-3', groupName: '第 3 组' },
  { participantId: 'T006', name: '林老师', organization: '启明职业技术学院', department: '公共基础部', specialty: '大学语文', contact: '138****2106', groupId: 'group-3', groupName: '第 3 组' },
  { participantId: 'T007', name: '周老师', organization: '启明职业技术学院', department: '人工智能学院', specialty: '软件技术', contact: '138****2201', groupId: 'group-4', groupName: '第 4 组' },
  { participantId: 'T008', name: '吴老师', organization: '启明职业技术学院', department: '智能制造学院', specialty: '工业机器人', contact: '138****2202', groupId: 'group-4', groupName: '第 4 组' },
  { participantId: 'T009', name: '郑老师', organization: '启明职业技术学院', department: '商贸管理学院', specialty: '市场营销', contact: '138****2203', groupId: 'group-4', groupName: '第 4 组' },
  { participantId: 'T010', name: '孙老师', organization: '启明职业技术学院', department: '公共基础部', specialty: '大学英语', contact: '138****2204', groupId: 'group-4', groupName: '第 4 组' },
]

export const sampleCurrentParticipantId = 'T001'
