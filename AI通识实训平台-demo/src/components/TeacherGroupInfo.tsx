import { useState } from 'react'
import { ChevronDown, CircleUserRound, UsersRound } from 'lucide-react'
import type { ParticipantDirectory, TrainingParticipant } from '../training/types'

interface TeacherGroupInfoProps {
  currentParticipant?: TrainingParticipant
  participantDirectory: ParticipantDirectory
}

export function TeacherGroupInfo({ currentParticipant, participantDirectory }: TeacherGroupInfoProps) {
  const [open, setOpen] = useState(false)
  const groupMembers = currentParticipant
    ? participantDirectory.participants.filter((participant) => participant.groupId === currentParticipant.groupId)
    : []

  return <div className={open ? 'teacher-info open' : 'teacher-info'}>
    <button className="teacher-info-trigger" type="button" aria-expanded={open} aria-label="查看教师与小组信息" onClick={() => setOpen((current) => !current)}>
      <CircleUserRound size={18} />
      <span><strong>{currentParticipant?.name ?? '未选择人员'}</strong><small>{currentParticipant ? `${currentParticipant.groupName} · ${currentParticipant.department}` : '请先导入人员'}</small></span>
      <ChevronDown className="teacher-info-chevron" size={14} />
    </button>
    {open && <section className="teacher-info-panel" aria-label="教师与所在小组信息">
      <div className="teacher-info-heading"><div><small>当前教师</small><strong>{currentParticipant?.name ?? '未选择人员'}</strong></div>{currentParticipant && <span>{currentParticipant.specialty || currentParticipant.department}</span>}</div>
      {currentParticipant ? <>
        <div className="teacher-group-title"><span><UsersRound size={16} /><strong>{currentParticipant.groupName}成员</strong></span><em>{groupMembers.length} 人</em></div>
        <div className="teacher-member-list" role="list" aria-label={`${currentParticipant.groupName}组员列表`}>{groupMembers.map((member) => <div role="listitem" aria-label={`组员：${member.name}`} key={member.participantId}><span className={member.participantId === currentParticipant.participantId ? 'current' : ''}>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.department || member.organization || '未填写部门'}</small></div>{member.participantId === currentParticipant.participantId && <em>本人</em>}</div>)}</div>
      </> : <p className="teacher-info-empty">请先进入人员分组页面导入名单并选择当前演示人员。</p>}
    </section>}
  </div>
}
