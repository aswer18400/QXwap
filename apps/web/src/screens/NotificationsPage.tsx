import { useEffect, useState } from "react";
import { LocationMetaIcon, PriceCashIcon } from "../components/AppIcons";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { NotificationItem } from "../components/NotificationItem";
import { PageState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
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
    return cashAmountLabel ? `ยังไม่ได้แนบสินค้า · มีเงินสดเพิ่ม ${cashAmountLabel}` : "ข้อเสนอนี้ยังไม่ได้แนบสินค้า";
  }
  if (detail.offered_items.length === 1) return detail.offered_items[0].title;
  return `${detail.offered_items[0].title} และอีก ${detail.offered_items.length - 1} ชิ้น`;
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
        title="โนติฟิเคชัน"
        subtitle="ดูอัปเดตล่าสุดของบัญชีนี้"
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
        subtitle={unreadCount ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : "อัปเดตดีลและสถานะล่าสุด"}
        onBack={onBack}
        align="left"
        actions={
          <button type="button" className="page-header-text-action" disabled={!unreadCount || markingAll} onClick={() => void markAllRead()}>
            {markingAll ? "กำลังอัปเดต..." : "อ่านทั้งหมด"}
          </button>
        }
      />
      <div className="panel notifications-hero">
        <div className="notifications-hero-copy">
          <small>อัปเดตล่าสุดของคุณ</small>
          <b>{unreadCount ? `มีรายการใหม่ ${unreadCount} รายการ` : "ไม่มีรายการใหม่ในตอนนี้"}</b>
          <span>รวมการเปลี่ยนสถานะข้อเสนอ การตอบกลับ และข้อความจากคู่ดีลไว้ในหน้าเดียว</span>
        </div>
        <div className="notifications-hero-stats">
          <span>
            <b>{notifications.length}</b>
            <small>ทั้งหมด</small>
          </span>
          <span className={unreadCount ? "active" : ""}>
            <b>{unreadCount}</b>
            <small>ยังไม่อ่าน</small>
          </span>
        </div>
      </div>
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && !notifications.length ? (
        <PageState
          state="empty"
          title="ยังไม่มีการแจ้งเตือน"
          summary="เมื่อมีข้อเสนอใหม่ ข้อความเข้า หรือดีลของคุณเปลี่ยนสถานะ ระบบจะแจ้งไว้ที่หน้านี้ทั้งหมด"
          details={[
            "ติดตามการตอบรับ ปฏิเสธ และการยืนยันข้อเสนอ",
            "เปิดต่อไปยังห้องแชทหรือหน้ารายละเอียดดีลได้ทันที",
            "ช่วยให้ไม่พลาดขั้นตอนนัดรับ ส่งมอบ และยืนยันรับของ"
          ]}
          note="ตอนนี้ยังไม่มีความเคลื่อนไหวใหม่ในบัญชีนี้"
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
                  statusLabel={detail ? offerStatusLabel(detail.offer.status) : entry.read_at ? "อ่านแล้ว" : "ใหม่"}
                  className={detail ? "notification-offer-card" : undefined}
                  onOpen={() => void openNotification(entry)}
                  content={detail ? (
                    <>
                      <div className="offer-summary-compare">
                        <div className="offer-summary-product">
                          <small className="offer-summary-side-label">สินค้าหลักของดีล</small>
                          <div className="offer-summary-product-card">
                            <img src={asset(targetItem?.media.images?.[0]) || wantedFallbacks.Other} alt={targetItem?.title || "สินค้า"} />
                            <div>
                              <b>{targetItem?.title || detail.offer.target_title || "สินค้า"}</b>
                              <small>{targetItem?.condition || "ยังไม่ระบุสภาพ"}</small>
                              <div className="offer-summary-meta">
                                <span><LocationMetaIcon size={14} /> {targetItem?.location.label || "ยังไม่ระบุพื้นที่"}</span>
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
                              <small>{leadItem?.condition || (cashAmountLabel ? `มีเงินสดเพิ่ม ${cashAmountLabel}` : "ส่งมาเป็นข้อความประกอบข้อเสนอ")}</small>
                              <div className="offer-summary-meta">
                                {leadItem ? <span><LocationMetaIcon size={14} /> {leadItem.location.label || "ยังไม่ระบุพื้นที่"}</span> : null}
                                {!leadItem && detail.offer.message ? <span>{detail.offer.message}</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="offer-summary-terms">
                        {cashAmountLabel ? (
                          <div className="offer-summary-term">
                            <small>เงินสดที่แนบมา</small>
                            <b><PriceCashIcon size={14} /> {cashAmountLabel}</b>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="item-copy">{entry.body}</div>
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
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
