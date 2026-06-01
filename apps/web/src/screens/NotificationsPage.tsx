import { useEffect, useState } from "react";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { NotificationItem } from "../components/NotificationItem";
import { PageState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { formatCashAmountValue, formatDateTimeValue } from "../lib/format";
import type { NotificationEntry, OfferDetail, RequireLogin, User } from "../lib/types";
import { notificationService, swapService } from "../services";

function offerStatusLabel(status?: string) {
  return (
    {
      pending: "รอตอบรับ",
      accepted: "ตอบรับแล้ว",
      countered: "มีข้อเสนอโต้กลับ",
      scheduled: "นัดรับพร้อมแล้ว",
      handover_pending: "กำลังส่งมอบ",
      rejected: "ปฏิเสธแล้ว",
      cancelled: "ยกเลิกแล้ว",
      expired: "หมดเวลาแล้ว",
      completed: "แลกสำเร็จแล้ว",
      reported: "มีการรายงานปัญหา"
    }[String(status || "")] || "อัปเดตข้อเสนอ"
  );
}

function bundleSummary(detail?: OfferDetail | null) {
  if (!detail) return "";
  if (!detail.offered_items.length) {
    const cashAmountLabel = formatCashAmountValue(detail.offer.cash_amount);
    return cashAmountLabel ? `เงินสดเพิ่ม ${cashAmountLabel}` : "ยังไม่ได้แนบสินค้า";
  }
  if (detail.offered_items.length === 1) return detail.offered_items[0].title;
  return `${detail.offered_items[0].title} และอีก ${detail.offered_items.length - 1} ชิ้น`;
}

function notificationActionLabel(entry: NotificationEntry) {
  const data = entry.data || {};
  if (data.conversation_id) return "เปิดแชต";
  if (data.offer_id) return "เปิดดีล";
  if (data.item_id) return "เปิดสินค้า";
  if (data.profile_id) return "เปิดโปรไฟล์";
  if (entry.type === "credit_earned" || entry.type === "reward_redeemed") return "เปิดเครดิต";
  return "เปิด";
}

function notificationStatusLabel(entry: NotificationEntry, detail?: OfferDetail | null) {
  if (detail) return offerStatusLabel(detail.offer.status);
  return entry.read_at ? "อ่านแล้ว" : "ใหม่";
}

export function NotificationsPage({
  user,
  requireLogin,
  onBack,
  onOpenNotification,
  onUnreadCountChange
}: {
  user: User | null;
  requireLogin: RequireLogin;
  onBack: () => void;
  onOpenNotification: (entry: NotificationEntry) => Promise<void> | void;
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
        const nextNotifications = await notificationService.listNotifications();
        if (!live) return;
        setNotifications(nextNotifications);
        onUnreadCountChange?.(nextNotifications.filter((entry) => !entry.read_at).length);
        const offerIds = Array.from(new Set(nextNotifications.map((entry) => entry.data?.offer_id).filter(Boolean))) as string[];
        if (!offerIds.length) {
          setOfferDetails({});
          return;
        }
        const details = await Promise.all(
          offerIds.map((offerId) =>
            swapService.getOfferDetail(offerId)
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

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="แจ้งเตือน"
        subtitle="ดูอัปเดตของดีล แชต และเครดิต"
        onBack={onBack}
      />
    );
  }

  async function markAllRead() {
    setMarkingAll(true);
    setLoadError("");
    try {
      await notificationService.markAllRead();
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
    const normalizedEntry = entry.read_at ? entry : { ...entry, read_at: new Date().toISOString() };
    try {
      if (!entry.read_at) {
        await notificationService.markNotificationRead(entry.id);
        const nextNotifications = notifications.map((row) => (row.id === entry.id ? { ...row, read_at: new Date().toISOString() } : row));
        setNotifications(nextNotifications);
        onUnreadCountChange?.(nextNotifications.filter((row) => !row.read_at).length);
      }
    } catch {
      // noop
    }
    await onOpenNotification(normalizedEntry);
  }

  const unreadCount = notifications.filter((entry) => !entry.read_at).length;

  return (
    <section className="screen notifications-page">
      <PageHeader
        title="การแจ้งเตือน"
        subtitle={unreadCount ? `มี ${unreadCount} รายการที่ต้องเปิดดู` : "ไม่มีรายการใหม่"}
        onBack={onBack}
        align="left"
        actions={
          <button type="button" className="page-header-text-action" disabled={!unreadCount || markingAll} onClick={() => void markAllRead()}>
            {markingAll ? "กำลังอัปเดต..." : "อ่านทั้งหมด"}
          </button>
        }
      />
      {!loading ? (
        <div className="panel notifications-summary-strip">
          <b>{unreadCount ? "เปิดรายการใหม่ได้จากด้านล่าง" : "อัปเดตล่าสุดจะขึ้นที่นี่"}</b>
          <span>{notifications.length ? `${notifications.length} รายการทั้งหมด` : "ยังไม่มีความเคลื่อนไหว"}</span>
        </div>
      ) : null}
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && !notifications.length ? (
        <PageState
          state="empty"
          title="ยังไม่มีแจ้งเตือน"
          summary="เมื่อมีดีลใหม่ ข้อความเข้า หรือเครดิตอัปเดต ระบบจะแจ้งไว้ที่หน้านี้"
          details={[]}
        />
      ) : null}
      {!loading && notifications.length ? (
        <div className="notifications-list list">
          {notifications.map((entry) => {
            const interactive = Boolean(
              entry.data?.offer_id ||
              entry.data?.conversation_id ||
              entry.data?.item_id ||
              entry.data?.profile_id ||
              entry.type === "credit_earned" ||
              entry.type === "reward_redeemed"
            );
            const detail = entry.data?.offer_id ? offerDetails[entry.data.offer_id] : null;
            const targetItem = detail?.target_item || null;
            const offeredItems = detail?.offered_items || [];
            const leadItem = offeredItems[0] || null;
            const cashAmountLabel = formatCashAmountValue(detail?.offer.cash_amount);
            if (interactive) {
              return (
                <NotificationItem
                  key={entry.id}
                  title={entry.title}
                  body={entry.body}
                  read={Boolean(entry.read_at)}
                  timestamp={formatDateTimeValue(entry.created_at)}
                  statusLabel={notificationStatusLabel(entry, detail)}
                  actionLabel={notificationActionLabel(entry)}
                  className={detail ? "notification-offer-card" : undefined}
                  onOpen={() => void openNotification(entry)}
                  content={detail ? (
                    <>
                      <div className="notification-detail-grid">
                        <div className="notification-detail-card">
                          <small>รายการ</small>
                          <b>{targetItem?.title || detail.offer.target_title || "สินค้า"}</b>
                          {targetItem?.location.label ? <span>{targetItem.location.label}</span> : null}
                        </div>
                        <div className="notification-detail-card">
                          <small>ข้อเสนอ</small>
                          <b>{bundleSummary(detail)}</b>
                          {leadItem?.location.label ? <span>{leadItem.location.label}</span> : null}
                          {!leadItem && cashAmountLabel ? <span>{cashAmountLabel}</span> : null}
                        </div>
                      </div>
                      {detail.offer.message ? <p className="notification-inline-note">{detail.offer.message}</p> : null}
                    </>
                  ) : (
                    undefined
                  )}
                />
              );
            }
            return (
              <NotificationItem
                key={entry.id}
                title={entry.title}
                body={entry.body}
                read={Boolean(entry.read_at)}
                timestamp={formatDateTimeValue(entry.created_at)}
                statusLabel={notificationStatusLabel(entry)}
                actionLabel={notificationActionLabel(entry)}
                onOpen={interactive ? () => void openNotification(entry) : undefined}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
