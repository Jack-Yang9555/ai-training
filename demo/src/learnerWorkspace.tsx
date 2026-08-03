import type { ReactNode } from "react"
import { WorkspaceHeader } from "./ui"
import type { LearnerKind } from "./types"

export function LearnerWorkspaceHeader({
  learnerKind,
  learnerName,
  title,
  description,
  summary,
  className,
  variant = "workspace",
}: {
  learnerKind: LearnerKind
  learnerName: string
  title: string
  description: string
  summary?: ReactNode
  className?: string
  variant?: "workspace" | "overview"
}) {
  return (
    <WorkspaceHeader
      title={title}
      description={description}
      eyebrow={`${learnerName} · ${learnerKind === "teacher" ? "教师学员" : "学生学员"}`}
      tone="learn"
      summary={summary}
      className={className}
      variant={variant}
    />
  )
}
