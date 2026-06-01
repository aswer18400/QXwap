import type { ReactNode } from "react";
import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";

export function NotificationItem({
  title,
  body,
  read,
  timestamp,
  statusLabel,
  actionLabel,
  content,
  onOpen,
  className
}: {
  title: string;
  body: string;
  read: boolean;
  timestamp?: string;
  statusLabel?: string;
  actionLabel?: string;
  content?: ReactNode;
  onOpen?: () => void;
  className?: string;
}) {
  return (
    <article className={`notice-row app-notification-item${read ? "" : " unread"}${className ? ` ${className}` : ""}`}>
      <div className="offer-summary-top">
        <div className="offer-summary-intro">
          <div className="offer-summary-headline">
            {statusLabel ? <StatusBadge kind="notification" status={read ? "read" : "unread"} label={statusLabel} /> : null}
          </div>
          <h3>{title}</h3>
          {body ? <p className="offer-summary-note">{body}</p> : null}
        </div>
      </div>
      {content ? <div className="notification-item-content">{content}</div> : null}
      <div className="notification-offer-footer">
        {timestamp ? <span className="caption">{timestamp}</span> : <span />}
        {onOpen ? (
          <Button type="button" variant="secondary" onClick={onOpen}>
            {actionLabel || "เปิด"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
