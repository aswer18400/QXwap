import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  onBack,
  actions
}: {
  title: string;
  onBack: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <button type="button" className="page-back-button" onClick={onBack} aria-label={`กลับจากหน้า ${title}`}>
        <ArrowLeft size={18} />
      </button>
      <div className="page-header-copy">
        <h1>{title}</h1>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : <span className="page-header-spacer" aria-hidden="true" />}
    </div>
  );
}
