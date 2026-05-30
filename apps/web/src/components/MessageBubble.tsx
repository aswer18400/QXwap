export function MessageBubble({
  text,
  timestamp,
  isMe = false,
  variant = "user",
  label
}: {
  text: string;
  timestamp?: string;
  isMe?: boolean;
  variant?: "user" | "system";
  label?: string;
}) {
  return (
    <div className={`chat-bubble app-message-bubble${isMe ? " me" : ""}${variant === "system" ? " system" : ""}`}>
      {label ? <small className="app-message-bubble__label">{label}</small> : null}
      <span>{text}</span>
      {timestamp ? <small>{timestamp}</small> : null}
    </div>
  );
}
