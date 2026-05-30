import type { ReactNode } from "react";
import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";

export function NotificationItem({
  title,
  body,
  read,
  timestamp,
  statusLabel,
  content,
  onOpen
}: {
  title: string;
  body: string;
  read: boolean;
  timestamp?: string;
  statusLabel?: string;
  content?: ReactNode;
  onOpen?: () => void;
}) {
  return (
    <article className={`notice-row app-notification-item${read ? "" : " unread"}`}>
      <div className="offer-summary-top">
        <div className="offer-summary-intro">
          <div className="offer-summary-headline">
            <small className="offer-summary-side-label">การแจ้งเตือน</small>
            <StatusBadge kind="notification" status={read ? "read" : "unread"} label={statusLabel} />
          </div>
          <h3>{title}</h3>
          <p className="offer-summary-note">{body}</p>
        </div>
      </div>
      {content}
      <div className="notification-offer-footer">
        {timestamp ? <span className="caption">{timestamp}</span> : <span />}
        {onOpen ? (
          <Button type="button" variant="secondary" onClick={onOpen}>
            เปิดรายการนี้
          </Button>
        ) : null}
      </div>
    </article>
  );
}
