import { Avatar } from "./Avatar";

export function ChatListItem({
  avatarUrl,
  title,
  subtitle,
  timestamp,
  unread = false,
  onClick
}: {
  avatarUrl?: string | null;
  title: string;
  subtitle: string;
  timestamp?: string;
  unread?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Avatar src={avatarUrl} name={title} size={44} />
      <div className="app-chat-list-item__copy">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
      {timestamp ? <small>{timestamp}</small> : null}
    </>
  );

  return onClick ? (
    <button type="button" className={`app-chat-list-item${unread ? " unread" : ""}`} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={`app-chat-list-item${unread ? " unread" : ""}`}>{content}</div>
  );
}
