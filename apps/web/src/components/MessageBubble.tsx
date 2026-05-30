export function MessageBubble({
  text,
  timestamp,
  isMe = false
}: {
  text: string;
  timestamp?: string;
  isMe?: boolean;
}) {
  return (
    <div className={`chat-bubble app-message-bubble${isMe ? " me" : ""}`}>
      <span>{text}</span>
      {timestamp ? <small>{timestamp}</small> : null}
    </div>
  );
}
