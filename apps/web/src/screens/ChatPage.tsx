import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { api } from "../lib/api";
import type { OfferDetail, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";

type ChatMessage = {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export function ChatPage({
  offerId,
  user,
  requireLogin,
  onBack
}: {
  offerId: string;
  user: User | null;
  requireLogin: RequireLogin;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<OfferDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (!user) return;
    let live = true;
    setLoading(true);
    setLoadError("");
    api<OfferDetail>(`/offers/${offerId}/detail`)
      .then((data) => {
        if (!live) return;
        setDetail(data);
      })
      .catch((error: Error) => live && setLoadError(error.message || "โหลดแชทไม่สำเร็จ"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [offerId, user]);

  useEffect(() => {
    if (!detail?.chat_enabled || !detail.conversation_id) {
      setMessages([]);
      return;
    }
    let live = true;
    setChatLoading(true);
    api<{ messages: ChatMessage[] }>(`/chat/conversations/${detail.conversation_id}/messages`)
      .then((data) => live && setMessages(data.messages || []))
      .catch(() => live && setMessages([]))
      .finally(() => live && setChatLoading(false));
    return () => {
      live = false;
    };
  }, [detail?.chat_enabled, detail?.conversation_id]);

  useEffect(() => {
    if (!detail?.chat_enabled || !detail.conversation_id) return;
    const timer = window.setInterval(() => {
      void api<{ messages: ChatMessage[] }>(`/chat/conversations/${detail.conversation_id}/messages`)
        .then((data) => setMessages(data.messages || []))
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [detail?.chat_enabled, detail?.conversation_id]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="แชท" />;

  async function reloadMessages() {
    if (!detail?.conversation_id) return;
    const chat = await api<{ messages: ChatMessage[] }>(`/chat/conversations/${detail.conversation_id}/messages`);
    setMessages(chat.messages || []);
  }

  async function sendMessage() {
    if (!detail?.conversation_id || !messageText.trim()) return;
    setSending(true);
    setLoadError("");
    try {
      await api(`/chat/conversations/${detail.conversation_id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: messageText.trim() })
      });
      setMessageText("");
      await reloadMessages();
    } catch (error: any) {
      setLoadError(error.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  const counterpartName = detail
    ? detail.offer.from_user_id === user.id
      ? detail.offer.to_name || "คู่สนทนา"
      : detail.offer.from_name || "คู่สนทนา"
    : "คู่สนทนา";
  const targetTitle = detail?.target_item?.title || detail?.offered_items?.[0]?.title || "ข้อเสนอแลกสินค้า";

  return (
    <section className="screen chat-page">
      <PageHeader title="แชท" onBack={onBack} />
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && !detail ? <div className="empty">ไม่พบข้อมูลแชท</div> : null}
      {!loading && detail ? (
        <>
          <div className="panel offer-detail-panel offer-chat-summary">
            <b>{counterpartName}</b>
            <span>{targetTitle}</span>
          </div>
          {!detail.chat_enabled ? (
            <div className="panel offer-detail-panel">
              <div className="empty-inline">จะเริ่มแชทได้เมื่อทั้งสองฝ่ายตอบรับข้อเสนอแล้ว</div>
            </div>
          ) : (
            <div className="panel offer-detail-panel">
              <div className="chat-thread" aria-live="polite">
                {chatLoading ? <p>กำลังโหลดข้อความ...</p> : null}
                {!chatLoading && messages.length === 0 ? <p>เริ่มคุยเรื่องวัน เวลา และสถานที่นัดรับได้เลย</p> : null}
                {messages.map((message) => (
                  <div key={message.id} className={`chat-bubble${message.sender_id === user.id ? " me" : ""}`}>
                    <span>{message.text}</span>
                  </div>
                ))}
              </div>
              <div className="chat-compose">
                <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="พิมพ์ข้อความ" />
                <button className="primary" disabled={sending || !messageText.trim()} onClick={() => void sendMessage()}>
                  <Send size={16} /> {sending ? "กำลังส่ง..." : "ส่งข้อความ"}
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
