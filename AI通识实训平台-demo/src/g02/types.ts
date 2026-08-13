import type { ElectiveTaskId, ParticipantDirectory } from '../training/types'
import type { GroupRole } from '../types'

export type G02Route = 'overview' | 'directory' | 'showcase' | 'feedback' | 'revision' | 'assessment'
export type G02StageStatus = '待验收' | '未通过' | '已通过' | '需补验'
export type G02EvidenceSource = '真实本地成果' | '模拟组员摘要' | '任务内演示成果'
export type G02EvidenceType = 'M06 课件' | 'M06 可播放视频' | 'M08 互动网页' | '首个选修成果'

export interface G02EvidenceItem { artifactId: string; type: G02EvidenceType; name: string; source: G02EvidenceSource; playable?: boolean; interactive?: boolean }
export interface G02MemberEvidence { participantId: string; participantName: string; groupId: string; groupName: string; isCurrentParticipant: boolean; evidence: G02EvidenceItem[] }
export interface G02Showcase { title: string; teachingScenario: string; artifactIds: string[]; onlineDemoArtifactId: string; onlineInteractionName: string; onlineInteractionTested: boolean; confirmed: boolean }
export interface G02CrossGroupFeedback { feedbackId: string; sourceGroupId: string; sourceGroupName: string; feedback: string; source: '跨组反馈模拟'; received: true }
export interface G02Revision { feedbackId: string; before: string; after: string; basis: string; contributorParticipantId: string; applied: boolean }
export interface G02Contribution { participantId: string; participantName: string; role?: GroupRole; kind: '作品贡献' | '实质修改'; contribution: string; artifactId: string; source: G02EvidenceSource }
export interface G02ArtifactSnapshot { artifactId: string; name: '小组多模态教学成果展示页' | '同伴反馈与修改记录' | '成员贡献清单'; capturedAt: string; fingerprint: string; summary: string }
export type G02ConditionId = 'showcase-completeness' | 'member-contribution' | 'online-interaction' | 'feedback-revision'
export interface G02AcceptanceCondition { id: G02ConditionId; label: string; passed: boolean; evidence: string }
export interface G02AssessmentRecord { assessmentId: string; phase: '初验' | '补验'; outcome: '未通过' | '已通过'; submittedAt: string; assessor: string; method: '本地规则引擎（Demo）'; fingerprint: string; failedConditionIds: G02ConditionId[]; conditions: G02AcceptanceCondition[]; modificationSummary: string; artifacts: G02ArtifactSnapshot[] }
export interface G02Progress { version: 1; groupId: string; groupName: string; rosterFingerprint: string; evidenceFingerprint: string; route: G02Route; memberEvidence: G02MemberEvidence[]; directoryConfirmed: boolean; showcase: G02Showcase; feedback: G02CrossGroupFeedback[]; feedbackConfirmed: boolean; revision: G02Revision; contributions: G02Contribution[]; contributionsConfirmed: boolean; artifacts: G02ArtifactSnapshot[]; assessmentModificationSummary: string; assessments: G02AssessmentRecord[]; currentStatus: G02StageStatus; updatedAt: string }
export interface G02Store { version: 1; groups: Record<string, G02Progress> }
export interface G02CurrentEvidence { participantId: string; m06DeckArtifactId?: string; m06VideoArtifactId?: string; m08WebArtifactId?: string; firstElectiveId?: ElectiveTaskId; firstElectiveArtifactId?: string }
export interface G02GroupContext { groupId: string; groupName: string; rosterFingerprint: string; evidenceFingerprint: string; memberEvidence: G02MemberEvidence[]; seedFeedback: G02CrossGroupFeedback[]; seedContributions: G02Contribution[]; directory: ParticipantDirectory }
