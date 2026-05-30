type TrustPill = string | { label: string; tone?: string };

function normalizePill(pill: TrustPill) {
  if (typeof pill === "string") {
    return { label: pill, tone: "" };
  }
  return { label: pill.label, tone: pill.tone || "" };
}

export function TrustPillList({
  pills,
  ariaLabel,
  rowClassName,
  pillClassName
}: {
  pills: TrustPill[];
  ariaLabel: string;
  rowClassName: string;
  pillClassName: string;
}) {
  if (!pills.length) return null;
  return (
    <div className={rowClassName} aria-label={ariaLabel}>
      {pills.map((pill) => {
        const normalized = normalizePill(pill);
        const toneClass = normalized.tone ? ` ${pillClassName}--${normalized.tone}` : "";
        return (
          <span key={normalized.label} className={`${pillClassName}${toneClass}`}>
            {normalized.label}
          </span>
        );
      })}
    </div>
  );
}
