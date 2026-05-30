import type { ReactNode } from "react";
import { PageState } from "./PageState";

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
  return <PageState state="empty" title={title} summary={summary} details={details} note={note} actions={actions} align={align} />;
}
