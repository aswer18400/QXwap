import { useEffect, useMemo, useState } from "react";
import { MenuIcon, Plus, Send, SwapDealIcon } from "../components/AppIcons";
import { Button } from "../components/Button";
import { ChatListItem } from "../components/ChatListItem";
import { MessageBubble } from "../components/MessageBubble";
import { PageState } from "../components/PageState";
import { StatusBadge } from "../components/StatusBadge";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { ChatConversation, ChatMessage, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { PageHeader } from "../components/PageHeader";
import { ChatSkeleton } from "../components/Skeletons";
import { chatService, notificationService, swapService } from "../services";

const MAX_CHAT_MESSAGE_LENGTH = 1000;

function formatChatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function formatChatListTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function conversationPreview(conversation: ChatConversation) {
  if (conversation.last_message_text?.trim()) {
    return conversation.last_message_type === "system"
      ? `อัปเดตดีล: ${conversation.last_message_text}`
      : conversation.last_message_text;
  }
  if (conversation.offer_status) return `สถานะดีล: ${conversation.offer_status}`;
  return conversation.item_title ? `คุยต่อเกี่ยวกับ ${conversation.item_title}` : "ยังไม่มีข้อความ";
}

function offerStatusSummary(detail?: OfferDetail | null, conversation?: ChatConversation | null) {
  const status = detail?.offer.status || conversation?.offer_status || conversation?.item_status || "";
  return (
    {
      pending: "กำลังรออีกฝ่ายตอบรับข้อเสนอ",
      accepted: "ดีลนี้ตอบรับแล้ว เปิดแชทเพื่อนัดหมายต่อได้ทันที",
      countered: "มีข้อเสนอโต้กลับในดีลนี้",
      scheduled: "นัดหมายแลกของพร้อมแล้ว",
      handover_pending: "กำลังอยู่ระหว่างส่งมอบและยืนยันรับของ",
      completed: "ดีลนี้สำเร็จและพร้อมให้รีวิวแล้ว",
      rejected: "ข้อเสนอนี้ถูกปฏิเสธแล้ว",
      expired: "ดีลนี้หมดเวลาเพราะไม่มีการตอบกลับ",
      cancelled: "ข้อเสนอนี้ถูกยกเลิกแล้ว",
      reported: "ดีลนี้กำลังมีการรายงานปัญหา",
      active: "คุยต่อเกี่ยวกับสินค้านี้ได้ทันที",
      inactive: "รายการนี้ถูกปิดประกาศแล้ว",
      swapped: "รายการนี้ถูกแลกไปแล้ว"
    }[String(status)] || "คุยต่อและติดตามสถานะของดีลได้จากห้องแชทนี้"
  );
}

export function ChatPage({
  offerId,
  conversationId,
  user,
  requireLogin,
  openOfferDetail,
  openConversation,
  openItemById,
  openInbox,
  onNotificationCountChange,
  onBack
}: {
  offerId?: string;
  conversationId?: string;
  user: User | null;
  requireLogin: RequireLogin;
  openOfferDetail: (offerId: string, tab?: OfferTab) => void;
  openConversation: (conversationId: string) => void;
  openItemById: (itemId: string) => void | Promise<void>;
  openInbox: () => void;
  onNotificationCountChange?: (count: number) => void;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<OfferDetail | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [chatError, setChatError] = useState("");
  const [messageText, setMessageText] = useState("");

  const isThreadMode = Boolean(offerId || conversationId);

  const syncNotificationCount = async () => {
    if (!user || !onNotificationCountChange) return;
    try {
      onNotificationCountChange(await notificationService.getUnreadCount());
    } catch {
      // noop
    }
  };

  useEffect(() => {
    if (!user) return;
    let live = true;
    setLoading(true);
    setLoadError("");
    setChatError("");
    setMessages([]);

    if (!isThreadMode) {
      chatService.listConversations()
        .then((data) => {
          if (!live) return;
          setConversations(data || []);
          setConversation(null);
          setDetail(null);
        })
        .catch((error: Error) => live && setLoadError(error.message || "โหลดรายการแชทไม่สำเร็จ"))
        .finally(() => live && setLoading(false));
      return () => {
        live = false;
      };
    }

    if (offerId) {
      swapService.getOfferDetail(offerId)
        .then(async (data) => {
          if (!live) return;
          setDetail(data);
          if (data.conversation_id) {
            try {
              const nextConversation = await chatService.getConversation(data.conversation_id);
              if (!live) return;
              setConversation(nextConversation);
            } catch {
              if (!live) return;
              setConversation(null);
            }
          } else {
            setConversation(null);
          }
        })
        .catch((error: Error) => live && setLoadError(error.message || "โหลดแชทไม่สำเร็จ"))
        .finally(() => live && setLoading(false));
    } else if (conversationId) {
      chatService.getConversation(conversationId)
        .then(async (data) => {
          if (!live) return;
          setConversation(data);
          if (data.offer_id) {
            try {
              const nextDetail = await swapService.getOfferDetail(data.offer_id);
              if (!live) return;
              setDetail(nextDetail);
            } catch {
              if (!live) return;
              setDetail(null);
            }
          } else {
            setDetail(null);
          }
        })
        .catch((error: Error) => live && setLoadError(error.message || "โหลดแชทไม่สำเร็จ"))
        .finally(() => live && setLoading(false));
    }

    return () => {
      live = false;
    };
  }, [conversationId, isThreadMode, offerId, user]);

  const resolvedConversationId = detail?.conversation_id || conversation?.id || conversationId || null;

  async function reloadMessages() {
    if (!resolvedConversationId) return;
    setChatLoading(true);
    try {
      const chat = await chatService.getMessages(resolvedConversationId);
      setMessages(chat || []);
      setChatError("");
      await syncNotificationCount();
      if (!detail) {
        const nextConversation = await chatService.getConversation(resolvedConversationId);
        setConversation(nextConversation);
      }
    } catch (error: any) {
      setMessages([]);
      setChatError(error.message || "โหลดข้อความไม่สำเร็จ");
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    if (!resolvedConversationId || !isThreadMode) return;
    void reloadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedConversationId, isThreadMode]);

  useEffect(() => {
    if (!resolvedConversationId || !isThreadMode) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void reloadMessages();
    }, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedConversationId, isThreadMode]);

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="แชต"
        subtitle="คุยต่อรองสินค้าและติดตามสถานะดีลจากห้องแชทของแต่ละการแลกได้หลังเข้าสู่ระบบ"
        onBack={onBack}
      />
    );
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
  const counterpartAvatar = detail
    ? detail.offer.from_user_id === user.id
      ? detail.offer.to_avatar || detail.target_item?.owner.avatar_url || ""
      : detail.offer.from_avatar || detail.target_item?.owner.avatar_url || ""
    : conversation?.counterpart_avatar || "";
  const counterpartStatus = offerStatusSummary(detail, conversation);
  const chatDate = messages[0]?.created_at
    ? new Date(messages[0].created_at).toLocaleDateString("th-TH", { dateStyle: "long" })
    : "";
  const itemContextId = detail?.target_item?.id || conversation?.item_id || null;
  const itemContextTitle = detail?.target_item?.title || conversation?.item_title || "สินค้าที่กำลังคุยกัน";
  const itemContextImage = detail?.target_item?.media.images?.[0] || conversation?.item_image || "";
  const swapTab = useMemo<OfferTab>(() => {
    if (!detail) return "received";
    return detail.offer.from_user_id === user.id ? "sent" : "received";
  }, [detail, user.id]);

  if (!isThreadMode) {
    return (
      <section className="screen chat-page">
        <PageHeader
          title="แชตของฉัน"
          subtitle="ทุกห้องคุยที่ผูกกับดีลหรือสินค้า จะรวมไว้ที่นี่ทั้งหมด"
          onBack={onBack}
          align="left"
          actions={<span className="page-header-icon"><MenuIcon size={16} /></span>}
        />
        {loadError ? <p className="err" role="alert">{loadError}</p> : null}
        {loading ? <ChatSkeleton /> : null}
        {!loading && !conversations.length ? (
          <PageState
            state="empty"
            title="ยังไม่มีห้องแชท"
            summary="เมื่อคุณเริ่มข้อเสนอแลกหรือคุยกับเจ้าของสินค้า ห้องแชทจริงจะมาอยู่ที่นี่"
            actions={[
              { label: "ดูดีลของฉัน", onClick: openInbox, variant: "secondary" },
              { label: "กลับหน้าก่อน", onClick: onBack }
            ]}
            align="left"
          />
        ) : null}
        {!loading && conversations.length ? (
          <div className="panel chat-thread-panel">
            <div className="list">
              {conversations.map((entry) => (
                <ChatListItem
                  key={entry.id}
                  avatarUrl={entry.counterpart_avatar}
                  title={entry.counterpart_name || "คู่สนทนา"}
                  subtitle={conversationPreview(entry)}
                  timestamp={formatChatListTime(entry.last_message_at || entry.updated_at)}
                  unread={Boolean(entry.unread_count)}
                  unreadCount={Number(entry.unread_count || 0)}
                  onClick={() => openConversation(entry.id)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

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
          actions={[
            { label: "กลับไปหน้าก่อน", onClick: onBack, variant: "secondary" },
            { label: "ดูดีลของฉัน", onClick: openInbox, variant: "ghost" }
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
              <b>{detail?.target_item?.title || conversation?.item_title || "คุยต่อจากดีลนี้"}</b>
              <span>{detail?.offer.status ? `สถานะดีล: ${detail.offer.status}` : "ห้องแชตของดีลนี้เปิดอยู่"}</span>
            </div>
          </div>
          <div className="panel chat-context-grid">
            {detail?.offer.id ? (
              <button type="button" className="chat-context-card" onClick={() => openOfferDetail(detail.offer.id, swapTab)}>
                <small>บริบทดีล</small>
                <b>เปิดหน้าดีลนี้</b>
                <span>{offerStatusSummary(detail, conversation)}</span>
                <StatusBadge kind="swap" status={detail.offer.status} />
              </button>
            ) : null}
            {itemContextId ? (
              <button type="button" className="chat-context-card" onClick={() => void openItemById(itemContextId)}>
                <small>บริบทสินค้า</small>
                <div className="chat-context-item">
                  <img src={asset(itemContextImage) || wantedFallbacks.Other} alt={itemContextTitle} />
                  <div>
                    <b>{itemContextTitle}</b>
                    <span>{conversation?.item_status || detail?.target_item?.status || "เปิดรับข้อเสนอ"}</span>
                  </div>
                </div>
              </button>
            ) : null}
          </div>
          {detail && !detail.conversation_id ? (
            <div className="panel offer-detail-panel">
              <PageState
                state="empty"
                title="ยังไม่เปิดห้องแชทของข้อเสนอนี้"
                summary="ระบบจะเปิดแชทให้เมื่อข้อเสนอพร้อมเข้าสู่ขั้นตอนคุยต่อหรือตอบรับแล้ว"
                actions={[{ label: "กลับไปหน้าก่อน", onClick: onBack, variant: "secondary" }]}
                align="left"
              />
            </div>
          ) : (
            <div className="panel chat-thread-panel">
              <div className="chat-thread chat-layout" role="log" aria-live="polite" aria-relevant="additions text">
                {chatDate ? <div className="chat-date-divider">{chatDate}</div> : null}
                {chatLoading ? <PageState state="loading" summary="กำลังโหลดข้อความ..." /> : null}
                {chatError ? (
                  <div className="chat-error-state">
                    <p className="err" role="alert">{chatError}</p>
                    <Button type="button" variant="secondary" onClick={() => void reloadMessages()}>ลองใหม่</Button>
                  </div>
                ) : null}
                {!chatLoading && !chatError && messages.length === 0 ? (
                  <PageState state="empty" summary="เริ่มแชทได้เลย" />
                ) : null}
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    text={message.text}
                    timestamp={formatChatTime(message.created_at)}
                    isMe={Boolean(message.sender_id && message.sender_id === user.id)}
                    variant={message.message_type === "system" ? "system" : "user"}
                    label={message.message_type === "system" ? "อัปเดตระบบ" : undefined}
                  />
                ))}
              </div>
              <div className="chat-compose">
                <button type="button" className="chat-compose-plus" aria-label="ดูบริบทดีลนี้" onClick={openInbox}>
                  <SwapDealIcon size={16} />
                </button>
                <textarea
                  aria-label="พิมพ์ข้อความแชท"
                  value={messageText}
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                  onChange={(event) => setMessageText(event.target.value.slice(0, MAX_CHAT_MESSAGE_LENGTH))}
                  placeholder="พิมพ์ข้อความถึงคู่ดีล"
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
