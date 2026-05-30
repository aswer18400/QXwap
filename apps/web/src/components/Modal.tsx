import type { ReactNode } from "react";
import { CloseIcon } from "./AppIcons";

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="app-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="app-modal__scrim" onClick={onClose} />
      <div className="app-modal__card">
        <div className="app-modal__head">
          <b>{title}</b>
          <button type="button" onClick={onClose} aria-label="ปิดหน้าต่าง">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="app-modal__body">{children}</div>
      </div>
    </div>
  );
}
