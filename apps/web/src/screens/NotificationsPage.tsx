import { useEffect, useState } from "react";
import { NotificationsNavIcon } from "../components/AppIcons";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { api } from "../lib/api";
import type { RequireLogin, User } from "../lib/types";

type NotificationEntry = {
  id: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at?: string;
  data?: {
    offer_id?: string;
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
  openOfferDetail: (offerId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    setLoading(true);
    setLoadError("");
    api<{ notifications: NotificationEntry[] }>("/notifications")
      .then((data) => {
        if (!live) return;
        const nextNotifications = data.notifications || [];
        setNotifications(nextNotifications);
        onUnreadCountChange?.(nextNotifications.filter((entry) => !entry.read_at).length);
      })
      .catch((error: Error) => live && setLoadError(error.message || "โหลดโนติฟิเคชันไม่สำเร็จ"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [user]);

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
    if (entry.data?.offer_id) openOfferDetail(entry.data.offer_id);
  }

  const unreadCount = notifications.filter((entry) => !entry.read_at).length;

  return (
    <section className="screen">
      <PageHeader title="โนติฟิเคชัน" onBack={onBack} />
      <div className="panel notifications-hero">
        <div className="notifications-hero-copy">
          <span className="notifications-hero-icon"><NotificationsNavIcon size={18} /></span>
          <div>
            <b>รายการแจ้งเตือนทั้งหมด</b>
            <p>{unreadCount ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : "อัปเดตล่าสุดทั้งหมดอ่านแล้ว"}</p>
          </div>
        </div>
        <button type="button" className="secondary" disabled={!unreadCount || markingAll} onClick={() => void markAllRead()}>
          {markingAll ? "กำลังอัปเดต..." : "อ่านทั้งหมด"}
        </button>
      </div>
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && !notifications.length ? <div className="empty">ยังไม่มีโนติฟิเคชัน</div> : null}
      {!loading && notifications.length ? (
        <div className="notifications-list">
          {notifications.map((entry) => {
            const interactive = Boolean(entry.data?.offer_id);
            if (interactive) {
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`panel notification-panel${entry.read_at ? "" : " unread"}`}
                  onClick={() => void openNotification(entry)}
                >
                  <div className="notification-panel-top">
                    <b>{entry.title}</b>
                    <small>{formatNotificationTime(entry.created_at)}</small>
                  </div>
                  <p>{entry.body}</p>
                  <span className="notification-panel-link">เปิดข้อเสนอ</span>
                </button>
              );
            }
            return (
              <div key={entry.id} className={`panel notification-panel${entry.read_at ? "" : " unread"}`}>
                <div className="notification-panel-top">
                  <b>{entry.title}</b>
                  <small>{formatNotificationTime(entry.created_at)}</small>
                </div>
                <p>{entry.body}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
