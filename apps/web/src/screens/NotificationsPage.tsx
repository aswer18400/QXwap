import { useEffect, useState } from "react";
import { LocationMetaIcon, PriceCashIcon, SwapDealIcon } from "../components/AppIcons";
import { DealTypeBadge } from "../components/DealTypeBadge";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";

type NotificationEntry = {
  id: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at?: string;
  data?: {
    offer_id?: string;
    inbox_tab?: OfferTab;
  } | null;
};

function formatNotificationTime(value?: string) {
  if (!value) return "ล่าสุด";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ล่าสุด";
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function offerStatusLabel(status?: string) {
  return (
    {
      pending: "รอตอบรับ",
      accepted_by_receiver: "รออีกฝ่ายยืนยัน",
      accepted: "กำลังนัดรับและส่งมอบ",
      rejected: "ปฏิเสธแล้ว",
      cancelled: "ยกเลิกแล้ว",
      confirmed: "แลกสำเร็จแล้ว"
    }[String(status || "")] || "อัปเดตข้อเสนอ"
  );
}

function itemWantedSummary(item?: Item | null) {
  if (!item) return "";
  if (item.wanted.text) return item.wanted.text;
  if (item.wanted.tags.length) return `ต้องการแลก ${item.wanted.tags.slice(0, 3).join(" · ")}`;
  return "เปิดรับข้อเสนอ";
}

function dealTypeLabel(item?: Item | null) {
  if (!item) return "ข้อเสนอแลก";
  return item.deal.type === "swap"
    ? "แลกเท่านั้น"
    : item.deal.type === "both"
      ? "ขายหรือแลก"
      : item.deal.type === "sell"
      ? "ขาย"
      : "ต้องการซื้อ";
}

function bundleSummary(detail?: OfferDetail | null) {
  if (!detail) return "";
  if (!detail.offered_items.length) {
    const cashAmount = Number(detail.offer.cash_amount || 0);
    return cashAmount ? `ยังไม่ได้แนบสินค้า · มีเงินสดเพิ่ม ${cashAmount.toLocaleString("th-TH")} บาท` : "ข้อเสนอนี้ยังไม่ได้แนบสินค้า";
  }
  if (detail.offered_items.length === 1) return detail.offered_items[0].title;
  return `${detail.offered_items[0].title} และอีก ${detail.offered_items.length - 1} ชิ้น`;
}

export function NotificationsPage({
  user,
  requireLogin,
  onBack,
  openOfferDetail,
  onUnreadCountChange
}: {
  user: User | null;
  requireLogin: RequireLogin;
  onBack: () => void;
  openOfferDetail: (offerId: string, tab?: OfferTab) => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [offerDetails, setOfferDetails] = useState<Record<string, OfferDetail>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    const loadNotifications = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await api<{ notifications: NotificationEntry[] }>("/notifications");
        if (!live) return;
        const nextNotifications = data.notifications || [];
        setNotifications(nextNotifications);
        onUnreadCountChange?.(nextNotifications.filter((entry) => !entry.read_at).length);
        const offerIds = Array.from(new Set(nextNotifications.map((entry) => entry.data?.offer_id).filter(Boolean))) as string[];
        if (!offerIds.length) {
          setOfferDetails({});
          return;
        }
        const details = await Promise.all(
          offerIds.map((offerId) =>
            api<OfferDetail>(`/offers/${offerId}/detail`)
              .then((detail) => [offerId, detail] as const)
              .catch(() => [offerId, null] as const)
          )
        );
        if (!live) return;
        setOfferDetails(Object.fromEntries(details.filter(([, detail]) => detail)) as Record<string, OfferDetail>);
      } catch (error: any) {
        if (!live) return;
        setLoadError(error.message || "โหลดโนติฟิเคชันไม่สำเร็จ");
      } finally {
        if (live) setLoading(false);
      }
    };
    void loadNotifications();
    return () => {
      live = false;
    };
  }, [user, onUnreadCountChange]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="โนติฟิเคชัน" />;

  async function markAllRead() {
    setMarkingAll(true);
    setLoadError("");
    try {
      await api("/notifications/read", { method: "POST", body: JSON.stringify({}) });
      const nextNotifications = notifications.map((entry) => ({ ...entry, read_at: entry.read_at || new Date().toISOString() }));
      setNotifications(nextNotifications);
      onUnreadCountChange?.(0);
    } catch (error: any) {
      setLoadError(error.message || "อัปเดตโนติฟิเคชันไม่สำเร็จ");
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(entry: NotificationEntry) {
    try {
      if (!entry.read_at) {
        await api("/notifications/read", { method: "POST", body: JSON.stringify({ id: entry.id }) });
        const nextNotifications = notifications.map((row) => (row.id === entry.id ? { ...row, read_at: new Date().toISOString() } : row));
        setNotifications(nextNotifications);
        onUnreadCountChange?.(nextNotifications.filter((row) => !row.read_at).length);
      }
    } catch {
      // noop
    }
    if (entry.data?.offer_id) openOfferDetail(entry.data.offer_id, entry.data.inbox_tab || "received");
  }

  const unreadCount = notifications.filter((entry) => !entry.read_at).length;

  return (
    <section className="screen notifications-page">
      <PageHeader
        title="การแจ้งเตือน"
        subtitle={unreadCount ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : "อัปเดตดีลและสถานะล่าสุด"}
        onBack={onBack}
        actions={
          <button type="button" className="page-header-text-action" disabled={!unreadCount || markingAll} onClick={() => void markAllRead()}>
            {markingAll ? "กำลังอัปเดต..." : "อ่านทั้งหมด"}
          </button>
        }
      />
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && !notifications.length ? <div className="empty">ยังไม่มีโนติฟิเคชัน</div> : null}
      {!loading && notifications.length ? (
        <div className="notifications-list list">
          {notifications.map((entry) => {
            const interactive = Boolean(entry.data?.offer_id);
            const detail = entry.data?.offer_id ? offerDetails[entry.data.offer_id] : null;
            const targetItem = detail?.target_item || null;
            const offeredItems = detail?.offered_items || [];
            const leadItem = offeredItems[0] || null;
            const cashAmount = Number(detail?.offer.cash_amount || 0);
            if (interactive) {
              const cashAmount = Number(detail?.offer.cash_amount || 0);
              return (
                <article
                  key={entry.id}
                  className={`notice-row notification-offer-card${entry.read_at ? "" : " unread"}`}
                >
                  <div className="offer-summary-top">
                    <div className="offer-summary-intro">
                      <div className="offer-summary-headline">
                        <small className="offer-summary-side-label">การแจ้งเตือนดีล</small>
                        <span className={`offer-status-pill offer-status-pill--${detail?.offer.status || "pending"}`}>
                          {detail ? offerStatusLabel(detail.offer.status) : entry.read_at ? "อ่านแล้ว" : "ใหม่"}
                        </span>
                      </div>
                      <h3>{entry.title}</h3>
                      <p className="offer-summary-note">{entry.body}</p>
                    </div>
                    <span className={`pill${entry.read_at ? "" : " success"}`}>{entry.read_at ? "อ่านแล้ว" : "ใหม่"}</span>
                  </div>
                  {detail ? (
                    <>
                      <div className="offer-summary-compare">
                        <div className="offer-summary-product">
                          <small className="offer-summary-side-label">สินค้าหลักของดีล</small>
                          <div className="offer-summary-product-card">
                            <img src={asset(targetItem?.media.images?.[0]) || wantedFallbacks.Other} alt={targetItem?.title || "สินค้า"} />
                            <div>
                              <b>{targetItem?.title || detail.offer.target_title || "สินค้า"}</b>
                              <small>{targetItem?.category || "สินค้าแลก"} · {targetItem?.condition || "ยังไม่ระบุสภาพ"}</small>
                              <div className="offer-summary-meta">
                                <span><LocationMetaIcon size={14} /> {targetItem?.location.label || "ยังไม่ระบุพื้นที่"}</span>
                                <span><SwapDealIcon size={14} /> {itemWantedSummary(targetItem)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="offer-summary-vs">⇄</div>
                        <div className="offer-summary-product">
                          <small className="offer-summary-side-label">สิ่งที่แนบมากับข้อเสนอ</small>
                          <div className="offer-summary-product-card">
                            <img src={asset(leadItem?.media.images?.[0]) || wantedFallbacks.Other} alt={leadItem?.title || "ยังไม่มีสินค้าแนบ"} />
                            <div>
                              <b>{bundleSummary(detail)}</b>
                              <small>{leadItem?.category || (cashAmount ? `มีเงินสดเพิ่ม ${cashAmount.toLocaleString("th-TH")} บาท` : "ส่งมาเป็นข้อความประกอบข้อเสนอ")}</small>
                              <div className="offer-summary-meta">
                                {leadItem ? <span><LocationMetaIcon size={14} /> {leadItem.location.label || "ยังไม่ระบุพื้นที่"}</span> : null}
                                {leadItem ? <span><SwapDealIcon size={14} /> {itemWantedSummary(leadItem)}</span> : detail.offer.message ? <span>{detail.offer.message}</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="offer-summary-terms">
                        <div className="offer-summary-term">
                          <small>ประเภทดีล</small>
                          {targetItem ? (
                            <span className="offer-summary-term-badge">
                              <DealTypeBadge type={targetItem.deal.type} label={dealTypeLabel(targetItem)} />
                            </span>
                          ) : (
                            <b>ข้อเสนอแลก</b>
                          )}
                        </div>
                        {cashAmount ? (
                          <div className="offer-summary-term">
                            <small>เงินสดที่แนบมา</small>
                            <b><PriceCashIcon size={14} /> {cashAmount.toLocaleString("th-TH")} บาท</b>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="item-copy">{entry.body}</div>
                  )}
                  <div className="notification-offer-footer">
                    <span className="caption">{formatNotificationTime(entry.created_at)}</span>
                    <button type="button" className="offer-summary-link" onClick={() => void openNotification(entry)}>
                      เปิดข้อเสนอนี้
                    </button>
                  </div>
                </article>
              );
            }
            return (
              <div key={entry.id} className={`notice-row${entry.read_at ? "" : " unread"}`}>
                <div className="section-head compact">
                  <h3>{entry.title}</h3>
                  <span className={`pill${entry.read_at ? "" : " success"}`}>{entry.read_at ? "อ่านแล้ว" : "ใหม่"}</span>
                </div>
                <div className="item-copy">{entry.body}</div>
                <div className="caption">{formatNotificationTime(entry.created_at)}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
