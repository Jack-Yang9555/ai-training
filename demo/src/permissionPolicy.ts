import type { LearningStage, UserRole } from "./types";

export type ProductCapability =
  | "teaching-workspace"
  | "student-workspace"
  | "manager-workspace"
  | "teacher-growth"
  | "teacher-research"
  | "edit-lesson"
  | "edit-score"
  | "student-answer"
  | "personal-student-report"
  | "aggregate-teaching-data"
  | "aggregate-teacher-development"
  | "configure-teacher-development-goals"
  | "anonymous-student-evidence";

const roleCapabilities: Record<UserRole, ReadonlySet<ProductCapability>> = {
  teacher: new Set([
    "teaching-workspace",
    "teacher-growth",
    "teacher-research",
    "edit-lesson",
    "edit-score",
    "aggregate-teaching-data",
  ]),
  student: new Set([
    "student-workspace",
    "student-answer",
    "personal-student-report",
  ]),
  manager: new Set([
    "manager-workspace",
    "aggregate-teaching-data",
    "aggregate-teacher-development",
    "configure-teacher-development-goals",
    "anonymous-student-evidence",
  ]),
};

export function canAccess(role: UserRole, capability: ProductCapability) {
  return roleCapabilities[role].has(capability);
}

export function canNavigateStage(role: UserRole, stage: LearningStage) {
  if (role === "manager") return stage === "home";
  if (stage === "research") return canAccess(role, "teacher-research");
  if (stage === "training") return role === "teacher" || role === "student";
  return stage === "home" || stage === "teach" || stage === "learn" || stage === "assess" || stage === "report";
}

export function requireAccess(
  role: UserRole,
  capability: ProductCapability,
) {
  if (!canAccess(role, capability)) {
    throw new Error(`Permission denied: ${role} cannot access ${capability}`);
  }
}
