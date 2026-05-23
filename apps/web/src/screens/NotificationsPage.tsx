import { useEffect, useState } from "react";
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
    <section className="screen notifications-page">
      <PageHeader
        title="การแจ้งเตือน"
        subtitle={`${unreadCount} unread`}
        onBack={onBack}
        actions={
          <button type="button" className="page-header-text-action" disabled={!unreadCount || markingAll} onClick={() => void markAllRead()}>
            {markingAll ? "..." : "✓"}
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
            if (interactive) {
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`notice-row${entry.read_at ? "" : " unread"}`}
                  onClick={() => void openNotification(entry)}
                >
                  <div className="section-head compact">
                    <h3>{entry.title}</h3>
                    <span className={`pill${entry.read_at ? "" : " success"}`}>{entry.read_at ? "อ่านแล้ว" : "ใหม่"}</span>
                  </div>
                  <div className="item-copy">{entry.body}</div>
                  <div className="caption">{formatNotificationTime(entry.created_at)}</div>
                </button>
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
