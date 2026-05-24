import { BackNavIcon } from "./AppIcons";

export function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
  align = "center"
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <>
      <div className="page-header-offset" aria-hidden="true" />
      <div className={`page-header${align === "left" ? " page-header--left" : ""}`}>
        <button type="button" className="page-back-button" onClick={onBack} aria-label={`กลับจากหน้า ${title}`}>
          <BackNavIcon size={18} />
        </button>
        <div className="page-header-copy">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : <span className="page-header-spacer" aria-hidden="true" />}
      </div>
    </>
  );
}
