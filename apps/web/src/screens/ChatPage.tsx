import { useEffect, useState } from "react";
import { MenuIcon, Plus, Send } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { OfferDetail, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { ChatSkeleton } from "../components/Skeletons";

const MAX_CHAT_MESSAGE_LENGTH = 1000;

type ChatMessage = {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

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
  const [chatError, setChatError] = useState("");
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
    if (!detail?.conversation_id) {
      setMessages([]);
      setChatError("");
      return;
    }
    let live = true;
    setChatLoading(true);
    api<{ messages: ChatMessage[] }>(`/chat/conversations/${detail.conversation_id}/messages`)
      .then((data) => {
        if (!live) return;
        setMessages(data.messages || []);
        setChatError("");
      })
      .catch((error: Error) => {
        if (!live) return;
        setMessages([]);
        setChatError(error.message || "โหลดข้อความไม่สำเร็จ");
      })
      .finally(() => live && setChatLoading(false));
    return () => {
      live = false;
    };
  }, [detail?.conversation_id]);

  useEffect(() => {
    if (!detail?.conversation_id) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void api<{ messages: ChatMessage[] }>(`/chat/conversations/${detail.conversation_id}/messages`)
        .then((data) => {
          setMessages(data.messages || []);
          setChatError("");
        })
        .catch((error: Error) => setChatError(error.message || "อัปเดตข้อความไม่สำเร็จ"));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [detail?.conversation_id]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="แชท" />;

  async function reloadMessages() {
    if (!detail?.conversation_id) return;
    const chat = await api<{ messages: ChatMessage[] }>(`/chat/conversations/${detail.conversation_id}/messages`);
    setMessages(chat.messages || []);
    setChatError("");
  }

  async function sendMessage() {
    if (!detail?.conversation_id || !messageText.trim()) return;
    setSending(true);
    setChatError("");
    try {
      await api(`/chat/conversations/${detail.conversation_id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: messageText.trim() })
      });
      setMessageText("");
      await reloadMessages();
    } catch (error: any) {
      setChatError(error.message || "ส่งข้อความไม่สำเร็จ");
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
  const offerStatusLabel = detail?.offer.status === "accepted"
    ? "ทั้งสองฝ่ายตอบรับแล้ว"
    : detail?.offer.status === "confirmed"
      ? "ดีลนี้สำเร็จแล้ว"
      : detail?.offer.status === "accepted_by_receiver"
        ? "คุยต่อได้และรออีกฝ่ายยืนยัน"
        : "คุยต่อได้ระหว่างตรวจข้อเสนอ";
  const counterpartAvatar = detail
    ? detail.offer.from_user_id === user.id
      ? detail.offer.to_avatar || detail.target_item?.owner.avatar_url || ""
      : detail.offer.from_avatar || detail.offered_items?.[0]?.owner.avatar_url || ""
    : "";
  const counterpartStatus = detail?.offer.status === "accepted" || detail?.offer.status === "confirmed" ? "ออนไลน์" : "กำลังคุยดีล";
  const chatDate = messages[0]?.created_at
    ? new Date(messages[0].created_at).toLocaleDateString("th-TH", { dateStyle: "long" })
    : "";

  return (
    <section className="screen chat-page">
      <PageHeader
        title={counterpartName}
        subtitle={counterpartStatus}
        onBack={onBack}
        align="left"
        actions={<span className="page-header-icon"><MenuIcon size={16} /></span>}
      />
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <ChatSkeleton /> : null}
      {!loading && !detail ? <div className="empty">ไม่พบข้อมูลแชท</div> : null}
      {!loading && detail ? (
        <>
          <div className="panel chat-conversation-hero">
            <div className="chat-conversation-party">
              <img src={asset(counterpartAvatar) || wantedFallbacks.Other} alt={counterpartName} />
              <div>
                <b>{counterpartName}</b>
                <small>{counterpartStatus}</small>
              </div>
            </div>
            <div className="chat-conversation-meta">
              <b>{targetTitle}</b>
              <span>{offerStatusLabel}</span>
            </div>
          </div>
          {!detail.conversation_id ? (
            <div className="panel offer-detail-panel">
              <div className="empty-inline">ยังไม่พบห้องแชทของข้อเสนอนี้</div>
            </div>
          ) : (
            <div className="panel chat-thread-panel">
              <div className="chat-thread chat-layout" role="log" aria-live="polite" aria-relevant="additions text">
                {chatDate ? <div className="chat-date-divider">{chatDate}</div> : null}
                {chatLoading ? <p>กำลังโหลดข้อความ...</p> : null}
                {chatError ? <div className="chat-error-state"><p className="err" role="alert">{chatError}</p><button type="button" className="secondary" onClick={() => void reloadMessages()}>ลองใหม่</button></div> : null}
                {!chatLoading && !chatError && messages.length === 0 ? <p>เริ่มแชทได้เลย</p> : null}
                {messages.map((message) => (
                  <div key={message.id} className={`chat-bubble${message.sender_id === user.id ? " me" : ""}`}>
                    <span>{message.text}</span>
                    <small>{formatChatTime(message.created_at)}</small>
                  </div>
                ))}
              </div>
              <div className="chat-compose">
                <button type="button" className="chat-compose-plus" aria-label="เพิ่มตัวเลือกข้อความ">
                  <Plus size={16} />
                </button>
                <textarea
                  aria-label="พิมพ์ข้อความแชท"
                  value={messageText}
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                  onChange={(event) => setMessageText(event.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))}
                  placeholder="พิมพ์ข้อความ"
                />
                <button className="primary chat-send-button" disabled={sending || !messageText.trim()} onClick={() => void sendMessage()}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
