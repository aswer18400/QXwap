import { useEffect, useState } from "react";
import { MenuIcon, Plus, Send } from "../components/AppIcons";
import { Button } from "../components/Button";
import { MessageBubble } from "../components/MessageBubble";
import { PageState } from "../components/PageState";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { ChatConversation, ChatMessage, OfferDetail, RequireLogin, User } from "../lib/types";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { PageHeader } from "../components/PageHeader";
import { ChatSkeleton } from "../components/Skeletons";
import { chatService, swapService } from "../services";

const MAX_CHAT_MESSAGE_LENGTH = 1000;

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPage({
  offerId,
  conversationId,
  user,
  requireLogin,
  onBack
}: {
  offerId?: string;
  conversationId?: string;
  user: User | null;
  requireLogin: RequireLogin;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<OfferDetail | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
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
    if (offerId) {
      swapService.getOfferDetail(offerId)
        .then((data) => {
          if (!live) return;
          setDetail(data);
          setConversation(null);
        })
        .catch((error: Error) => live && setLoadError(error.message || "โหลดแชทไม่สำเร็จ"))
        .finally(() => live && setLoading(false));
    } else if (conversationId) {
      chatService.getConversation(conversationId)
        .then((data) => {
          if (!live) return;
          setConversation(data);
          setDetail(null);
        })
        .catch((error: Error) => live && setLoadError(error.message || "โหลดแชทไม่สำเร็จ"))
        .finally(() => live && setLoading(false));
    } else {
      setDetail(null);
      setConversation(null);
      setLoadError("ไม่พบข้อมูลแชท");
      setLoading(false);
    }
    return () => {
      live = false;
    };
  }, [conversationId, offerId, user]);

  const resolvedConversationId = detail?.conversation_id || conversation?.id || conversationId || null;

  useEffect(() => {
    if (!resolvedConversationId) {
      setMessages([]);
      setChatError("");
      return;
    }
    let live = true;
    setChatLoading(true);
    chatService.getMessages(resolvedConversationId)
      .then((data) => {
        if (!live) return;
        setMessages(data || []);
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
  }, [resolvedConversationId]);

  useEffect(() => {
    if (!resolvedConversationId) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void chatService.getMessages(resolvedConversationId)
        .then((data) => {
          setMessages(data || []);
          setChatError("");
        })
        .catch((error: Error) => setChatError(error.message || "อัปเดตข้อความไม่สำเร็จ"));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [resolvedConversationId]);

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="แชท"
        subtitle="คุยต่อรองสินค้าและนัดรับส่งมอบจากห้องแชทของแต่ละดีลได้หลังเข้าสู่ระบบ"
        onBack={onBack}
      />
    );
  }

  async function reloadMessages() {
    if (!resolvedConversationId) return;
    const chat = await chatService.getMessages(resolvedConversationId);
    setMessages(chat || []);
    setChatError("");
  }

  async function sendMessage() {
    if (!resolvedConversationId || !messageText.trim()) return;
    setSending(true);
    setChatError("");
    try {
      await chatService.sendMessage(resolvedConversationId, messageText.trim());
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
    : conversation?.counterpart_name || "คู่สนทนา";
  const targetTitle = detail?.target_item?.title || detail?.offered_items?.[0]?.title || conversation?.item_title || "แชทเกี่ยวกับสินค้า";
  const offerStatusLabel = detail?.offer.status === "accepted"
    ? "ทั้งสองฝ่ายตอบรับแล้ว"
    : detail?.offer.status === "countered"
      ? "มีข้อเสนอโต้กลับที่ต้องตัดสินใจ"
      : detail?.offer.status === "scheduled"
        ? "ทั้งสองฝ่ายยืนยันนัดรับแล้ว"
        : detail?.offer.status === "handover_pending"
          ? "ดีลนี้อยู่ระหว่างส่งมอบ"
          : detail?.offer.status === "completed"
            ? "ดีลนี้สำเร็จแล้ว"
            : detail?.offer.status === "reported"
              ? "ดีลนี้มีการรายงานปัญหา"
              : detail
                ? "คุยต่อได้ระหว่างตรวจข้อเสนอ"
                : conversation?.item_status === "active"
                  ? "คุยต่อเกี่ยวกับสินค้านี้ได้ทันที"
                  : "รายการนี้อาจไม่พร้อมเริ่มดีลใหม่แล้ว";
  const counterpartAvatar = detail
    ? detail.offer.from_user_id === user.id
      ? detail.offer.to_avatar || detail.target_item?.owner.avatar_url || ""
      : detail.offer.from_avatar || detail.offered_items?.[0]?.owner.avatar_url || ""
    : conversation?.counterpart_avatar || "";
  const counterpartStatus = detail
    ? (["accepted", "scheduled", "handover_pending", "completed"].includes(detail.offer.status) ? "ออนไลน์" : detail.offer.status === "reported" ? "กำลังตรวจปัญหาดีล" : "กำลังคุยดีล")
    : (conversation?.item_status === "active" ? "พร้อมคุย" : "สถานะสินค้าเปลี่ยนแล้ว");
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
      {!loading && !detail && !conversation ? (
        <PageState
          state="empty"
          title="ไม่พบข้อมูลแชทนี้"
          summary="ห้องแชทอาจยังไม่ถูกสร้าง หรือดีลนี้ไม่พร้อมให้เปิดห้องสนทนาแล้ว"
          details={[
            "กลับไปตรวจในหน้าข้อเสนอเพื่อดูว่ายังมีดีลนี้อยู่หรือไม่",
            "ถ้าดีลยังไม่ถูกตอบรับ บางครั้งแชทจะยังไม่ถูกเปิดให้ใช้งาน"
          ]}
          actions={[
            { label: "กลับไปหน้าก่อน", onClick: onBack, variant: "secondary" }
          ]}
          align="left"
        />
      ) : null}
      {!loading && (detail || conversation) ? (
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
          {detail && !detail.conversation_id ? (
            <div className="panel offer-detail-panel">
              <PageState
                state="empty"
                title="ยังไม่เปิดห้องแชทของข้อเสนอนี้"
                summary="ระบบจะเปิดแชทให้เมื่อข้อเสนอพร้อมเข้าสู่ขั้นตอนคุยต่อหรือตอบรับแล้ว"
                details={[
                  "ถ้ายังอยู่ในช่วงตรวจข้อเสนอ คุณยังอาจต้องกลับไปดูหน้าข้อเสนอก่อน",
                  "เมื่อดีลขยับสถานะแล้ว ห้องแชทจะกลับมาใช้งานได้อัตโนมัติ"
                ]}
                actions={[{ label: "กลับไปหน้าก่อน", onClick: onBack, variant: "secondary" }]}
                align="left"
              />
            </div>
          ) : (
            <div className="panel chat-thread-panel">
              <div className="chat-thread chat-layout" role="log" aria-live="polite" aria-relevant="additions text">
                {chatDate ? <div className="chat-date-divider">{chatDate}</div> : null}
                {chatLoading ? <PageState state="loading" summary="กำลังโหลดข้อความ..." /> : null}
                {chatError ? <div className="chat-error-state"><p className="err" role="alert">{chatError}</p><Button type="button" variant="secondary" onClick={() => void reloadMessages()}>ลองใหม่</Button></div> : null}
                {!chatLoading && !chatError && messages.length === 0 ? <PageState state="empty" summary="เริ่มแชทได้เลย" /> : null}
                {messages.map((message) => (
                  <MessageBubble key={message.id} text={message.text} timestamp={formatChatTime(message.created_at)} isMe={message.sender_id === user.id} />
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
