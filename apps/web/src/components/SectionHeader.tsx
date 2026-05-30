import type { ReactNode } from "react";

export function SectionHeader({
  title,
  subtitle,
  action,
  compact = false,
  centered = false
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
  centered?: boolean;
}) {
  return (
    <div className={`section-head${compact ? " compact" : ""}${centered ? " section-head-centered" : ""}`}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
