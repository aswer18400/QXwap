import { Avatar } from "./Avatar";

export function ChatListItem({
  avatarUrl,
  title,
  subtitle,
  timestamp,
  unread = false,
  unreadCount = 0,
  onClick
}: {
  avatarUrl?: string | null;
  title: string;
  subtitle: string;
  timestamp?: string;
  unread?: boolean;
  unreadCount?: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Avatar src={avatarUrl} name={title} size={44} />
      <div className="app-chat-list-item__copy">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
      <div className="app-chat-list-item__meta">
        {timestamp ? <small>{timestamp}</small> : null}
        {unreadCount > 0 ? <b className="app-chat-list-item__badge">{unreadCount}</b> : null}
      </div>
    </>
  );

  return onClick ? (
    <div
      role="button"
      tabIndex={0}
      className={`app-chat-list-item${unread ? " unread" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onClick();
      }}
    >
      {content}
    </div>
  ) : (
    <div className={`app-chat-list-item${unread ? " unread" : ""}`}>{content}</div>
  );
}
