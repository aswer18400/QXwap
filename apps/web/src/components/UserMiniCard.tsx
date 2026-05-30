import type { User } from "../lib/types";
import { Avatar } from "./Avatar";

export function UserMiniCard({
  user,
  meta,
  submeta,
  active = false,
  onClick,
  className
}: {
  user: Pick<User, "id" | "display_name" | "avatar_url" | "rating" | "city">;
  meta?: string;
  submeta?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <Avatar src={user.avatar_url} name={user.display_name} size={44} />
      <span className="app-user-mini-card__copy">
        <b>{user.display_name || "QXwap user"}</b>
        {meta ? <small>{meta}</small> : null}
        {submeta ? <small>{submeta}</small> : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`app-user-mini-card${active ? " active" : ""}${className ? ` ${className}` : ""}`}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onClick();
        }}
      >
        {content}
      </div>
    );
  }

  return <div className={`app-user-mini-card${active ? " active" : ""}${className ? ` ${className}` : ""}`}>{content}</div>;
}
