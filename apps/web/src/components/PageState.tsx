import type { ReactNode } from "react";
import { Button } from "./Button";

type PageStateAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function PageState({
  state,
  title,
  summary,
  details = [],
  note,
  actions = [],
  align = "center"
}: {
  state: "loading" | "empty" | "error" | "success";
  title?: string;
  summary?: string;
  details?: string[];
  note?: string;
  actions?: PageStateAction[];
  align?: "center" | "left";
}) {
  const resolvedTitle = title || (
    state === "loading"
      ? "กำลังโหลดข้อมูล"
      : state === "error"
        ? "เกิดปัญหาชั่วคราว"
        : state === "success"
          ? "ดำเนินการสำเร็จ"
          : "ยังไม่มีข้อมูล"
  );

  return (
    <div className={`empty empty-action context-empty-state page-state page-state--${state}${align === "left" ? " context-empty-state--left" : ""}`}>
      <div className="context-empty-copy">
        <b>{resolvedTitle}</b>
        {summary ? <p>{summary}</p> : null}
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
            <Button key={action.label} variant={action.variant || "primary"} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
      {state === "loading" ? <div className="page-state-spinner" aria-hidden="true" /> : null}
    </div>
  );
}
