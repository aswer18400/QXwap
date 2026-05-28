import { useEffect, useRef } from "react";
import { BackNavIcon } from "./AppIcons";

export function PageHeader({
  title,
  onBack,
  actions,
  autoFocusTitle = false
}: {
  title: string;
  onBack: () => void;
  actions?: React.ReactNode;
  autoFocusTitle?: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!autoFocusTitle) return;
    titleRef.current?.focus();
  }, [autoFocusTitle]);
  return (
    <>
      <div className="page-header-offset" aria-hidden="true" />
      <div className="page-header">
        <button type="button" className="page-back-button" onClick={onBack} aria-label={`กลับจากหน้า ${title}`}>
          <BackNavIcon size={18} />
        </button>
        <div className="page-header-copy">
          <h1 ref={titleRef} tabIndex={autoFocusTitle ? -1 : undefined}>{title}</h1>
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : <span className="page-header-spacer" aria-hidden="true" />}
      </div>
    </>
  );
}
