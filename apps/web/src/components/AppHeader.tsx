import type { ReactNode } from "react";
import { BackNavIcon } from "./AppIcons";

type AppHeaderProps =
  | {
      layout?: "page";
      title: string;
      subtitle?: string;
      onBack?: () => void;
      actions?: ReactNode;
      align?: "left" | "center";
    }
  | {
      layout: "topbar";
      title?: string | null;
      brand: ReactNode;
      onPrimaryClick: () => void;
      actions?: ReactNode;
      titleLabel?: string;
    };

export function AppHeader(props: AppHeaderProps) {
  if (props.layout === "topbar") {
    const title = props.title?.trim();
    return (
      <header className={`topbar${title ? " topbar--title" : " topbar--brand"}`}>
        {title ? (
          <button className="topbar-title-button" onClick={props.onPrimaryClick} aria-label={props.titleLabel || "กลับหน้าหลัก"}>
            <span className="topbar-title">{title}</span>
          </button>
        ) : (
          <button className="brand" onClick={props.onPrimaryClick} aria-label={props.titleLabel || "กลับหน้าแนะนำ"}>
            {props.brand}
          </button>
        )}
        <div className="top-actions">{props.actions}</div>
      </header>
    );
  }

  const { title, subtitle, onBack, actions, align = "center" } = props;
  return (
    <>
      <div className="page-header-offset" aria-hidden="true" />
      <div className={`page-header${align === "left" ? " page-header--left" : ""}`}>
        {onBack ? (
          <button type="button" className="page-back-button" onClick={onBack} aria-label={`กลับจากหน้า ${title}`}>
            <BackNavIcon size={18} />
          </button>
        ) : (
          <span className="page-header-spacer" aria-hidden="true" />
        )}
        <div className="page-header-copy">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-header-actions">{actions}</div> : <span className="page-header-spacer" aria-hidden="true" />}
      </div>
    </>
  );
}
