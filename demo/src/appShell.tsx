import { Building2, GraduationCap, UserRound } from "lucide-react";
import type { UserRole } from "./types";

interface RoleSwitcherProps {
  role: UserRole;
  onSwitch: (role: UserRole) => void;
}

export function RoleSwitcher({ role, onSwitch }: RoleSwitcherProps) {
  return (
    <div className="role-switch" aria-label="切换用户视角">
      <button
        className={role === "teacher" ? "active" : ""}
        type="button"
        onClick={() => onSwitch("teacher")}
      >
        <GraduationCap size={16} /> 教师
      </button>
      <button
        className={role === "student" ? "active" : ""}
        type="button"
        onClick={() => onSwitch("student")}
      >
        <UserRound size={16} /> 学生
      </button>
      <button
        className={role === "manager" ? "active" : ""}
        type="button"
        onClick={() => onSwitch("manager")}
      >
        <Building2 size={16} /> 教学管理
      </button>
    </div>
  );
}

export function WorkspaceLoading() {
  return (
    <div className="workspace-loading" role="status" aria-live="polite">
      <span className="workspace-loading-dot" />
      正在载入工作区
    </div>
  );
}
