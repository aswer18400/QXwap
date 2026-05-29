import type { ReactNode } from "react";

type EmptyAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

export function ContextEmptyState({
  title,
  summary,
  details = [],
  note,
  actions = [],
  align = "center"
}: {
  title: string;
  summary: string;
  details?: string[];
  note?: string;
  actions?: EmptyAction[];
  align?: "center" | "left";
}) {
  return (
    <div className={`empty empty-action context-empty-state${align === "left" ? " context-empty-state--left" : ""}`}>
      <div className="context-empty-copy">
        <b>{title}</b>
        <p>{summary}</p>
      </div>
      {details.length ? (
        <div className="context-empty-list">
          {details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      ) : null}
      {note ? <small className="context-empty-note">{note}</small> : null}
      {actions.length ? (
        <div className="context-empty-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.variant === "secondary" ? "secondary" : "primary"}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
