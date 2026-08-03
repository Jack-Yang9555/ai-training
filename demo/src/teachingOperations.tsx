import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuditRecord, TeachingOperationAlert } from "./types";

const initialAlerts: TeachingOperationAlert[] = [
  {
    id: "alert-negative-mastery",
    type: "知识点掌握不足",
    organizationId: "ai-college",
    courseId: "course-visual-design",
    classId: "class-ai-2401",
    title: "人工智能 2401 班负向提示词掌握度 54%",
    metric: "目标 75% · 当前 54% · 8 人需要补强",
    anonymousEvidence: [
      { studentCode: "学生 A-018", summary: "连续 2 次练习未能针对画面偏差选择排除词。" },
      { studentCode: "学生 A-023", summary: "作品 v2→v3 未记录负向提示词的修改依据。" },
      { studentCode: "学生 A-031", summary: "AI 助教提问 3 次，最后一次仍未解决。" },
    ],
    assignee: null,
    status: "待处理",
    updatedAt: "今天 10:38",
  },
  {
    id: "alert-participation",
    type: "参与度不足",
    organizationId: "creative-college",
    courseId: "course-visual-design",
    classId: "class-media-2302",
    title: "数字媒体 2302 班本周参与度 72%",
    metric: "目标 85% · 6 人尚未开始当前任务",
    anonymousEvidence: [
      { studentCode: "学生 D-004", summary: "本周 2 项学习任务均未开始。" },
      { studentCode: "学生 D-019", summary: "最近一次活动仅停留 3 分钟。" },
    ],
    assignee: null,
    status: "待处理",
    updatedAt: "今天 09:50",
  },
  {
    id: "alert-assessment-review",
    type: "测评异常或复核积压",
    organizationId: "ai-college",
    courseId: "course-ai-ethics",
    classId: "class-ai-ethics-2401",
    title: "AI 伦理 2401 班有 4 份情境方案待复核",
    metric: "低置信度 3 份 · 异常提交 1 份",
    anonymousEvidence: [
      { studentCode: "学生 E-006", summary: "责任判断证据不充分，等待教师复核。" },
      { studentCode: "学生 E-021", summary: "素材授权记录缺少适用范围。" },
    ],
    assignee: "陈老师",
    status: "已交办",
    updatedAt: "今天 15:22",
  },
  {
    id: "alert-tutor-confidence",
    type: "AI助教低置信度或人工接管",
    organizationId: "ai-college",
    courseId: "course-visual-design",
    classId: "class-ai-2402",
    title: "生成式视觉设计助教出现 7 次低置信度回答",
    metric: "知识库命中率 83% · 人工接管 3 次",
    anonymousEvidence: [
      { studentCode: "学生 B-011", summary: "询问课程外版权政策，助教已触发边界说明。" },
      { studentCode: "学生 B-027", summary: "媒介风格问题仅命中 1 条低相关资料。" },
    ],
    assignee: "周老师",
    status: "已交办",
    updatedAt: "今天 14:35",
  },
];

interface TeachingOperationsValue {
  alerts: TeachingOperationAlert[];
  auditRecords: AuditRecord[];
  interventionPublished: boolean;
  assignAlert: (id: string) => void;
  publishManagementIntervention: () => void;
  completeManagementRemediation: () => void;
  resetOperations: () => void;
}

const TeachingOperationsContext = createContext<TeachingOperationsValue | null>(null);

export function TeachingOperationsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [interventionPublished, setInterventionPublished] = useState(false);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([
    {
      id: "audit-initial-1",
      actor: "系统",
      role: "manager",
      action: "生成教学运行预警",
      target: "人工智能 2401 班 · 负向提示词",
      result: "待处理 · 匿名证据 3 条",
      at: "今天 10:38",
    },
  ]);

  const addAudit = (record: Omit<AuditRecord, "id">) =>
    setAuditRecords((current) => [
      { ...record, id: `audit-${current.length + 1}` },
      ...current,
    ]);

  const assignAlert = (id: string) => {
    setAlerts((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "已交办", assignee: "周老师", updatedAt: "刚刚" }
          : item,
      ),
    );
    addAudit({
      actor: "王主任",
      role: "manager",
      action: "交办教学预警",
      target: "人工智能 2401 班 · 负向提示词",
      result: "已交办给周老师",
      at: "刚刚",
    });
  };

  const publishManagementIntervention = () => {
    setInterventionPublished(true);
    addAudit({
      actor: "周老师",
      role: "teacher",
      action: "发布分层干预",
      target: "负向提示词补强任务",
      result: "已发送给 8 名匿名学习者",
      at: "刚刚",
    });
  };

  const completeManagementRemediation = () => {
    setAlerts((current) =>
      current.map((item) =>
        item.id === "alert-negative-mastery"
          ? {
              ...item,
              status: "已解决",
              metric: "补学完成率 100% · 最近一次诊断提升至 76%",
              updatedAt: "刚刚",
            }
          : item,
      ),
    );
    addAudit({
      actor: "学生 A-018",
      role: "student",
      action: "完成补学任务",
      target: "负向提示词补强任务",
      result: "完成结果已回流教师与管理预警",
      at: "刚刚",
    });
  };

  const value = useMemo(
    () => ({
      alerts,
      auditRecords,
      interventionPublished,
      assignAlert,
      publishManagementIntervention,
      completeManagementRemediation,
      resetOperations: () => {
        setAlerts(initialAlerts);
        setInterventionPublished(false);
        setAuditRecords([
          {
            id: "audit-initial-1",
            actor: "系统",
            role: "manager",
            action: "生成教学运行预警",
            target: "人工智能 2401 班 · 负向提示词",
            result: "待处理 · 匿名证据 3 条",
            at: "今天 10:38",
          },
        ]);
      },
    }),
    [alerts, auditRecords, interventionPublished],
  );

  return (
    <TeachingOperationsContext.Provider value={value}>
      {children}
    </TeachingOperationsContext.Provider>
  );
}

export function useTeachingOperations() {
  const value = useContext(TeachingOperationsContext);
  if (!value) throw new Error("useTeachingOperations must be used inside TeachingOperationsProvider");
  return value;
}

