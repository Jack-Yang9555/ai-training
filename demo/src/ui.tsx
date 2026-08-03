import type { ReactNode } from "react";

export type WorkspaceTone =
  | "teach"
  | "learn"
  | "assess"
  | "report"
  | "training";

interface WorkspaceHeaderProps {
  title: string;
  description: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  tone?: WorkspaceTone;
  variant?: "workspace" | "overview";
  headingLevel?: 1 | 2;
  className?: string;
}

export function WorkspaceHeader({
  title,
  description,
  eyebrow,
  actions,
  summary,
  tone = "teach",
  variant = "workspace",
  headingLevel = 1,
  className = "",
}: WorkspaceHeaderProps) {
  return (
    <section
      className={`workspace-header tone-${tone} variant-${variant} ${className}`.trim()}
    >
      <div className="workspace-header-copy">
        {eyebrow && <span className="workspace-eyebrow">{eyebrow}</span>}
        {headingLevel === 1 ? <h1>{title}</h1> : <h2>{title}</h2>}
        <p>{description}</p>
      </div>
      {(summary || actions) && (
        <div className="workspace-header-side">
          {summary}
          {actions && <div className="workspace-header-actions">{actions}</div>}
        </div>
      )}
    </section>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <section className={`empty-state ${className}`.trim()}>
      <span className="empty-state-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <div className="empty-state-action">{action}</div>}
    </section>
  );
}
