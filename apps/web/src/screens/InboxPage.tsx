import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { inboxTabs } from "../design-system";
import type { InboxTab, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";

export function InboxPage({
  user,
  requireLogin,
  items,
  openItemById,
  openProfile,
  openOfferDetail,
  initialTab,
  onBack
}: {
  user: User | null;
  requireLogin: RequireLogin;
  items: Item[];
  openItemById: (itemId: string, fallbackItem?: Item | null) => void | Promise<void>;
  openProfile: (p: User) => void;
  openOfferDetail: (offerId: string) => void;
  initialTab: InboxTab;
  onBack?: () => void;
}) {
  const [offers, setOffers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Record<string, any>>({});
  const [tab, setTab] = useState<InboxTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError("");
    Promise.all([
      api<{ offers: any[] }>("/offers"),
      api<{ notifications: any[] }>("/notifications").catch(() => ({ notifications: [] }))
    ])
      .then(async ([o, n]) => {
        setOffers(o.offers);
        setNotifications(n.notifications);
        await loadShipments(o.offers);
      })
      .catch((error: any) => setLoadError(error.message || "โหลดอินบ็อกซ์ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="ข้อเสนอ" />;
  const currentUser = user;

  async function loadShipments(nextOffers: any[]) {
    const accepted = nextOffers.filter((o) => o.status === "accepted" || o.status === "confirmed");
    const pairs = await Promise.all(
      accepted.map((o) =>
        api<{ shipment: any }>(`/shipments/${o.id}`)
          .then((data) => [o.id, data.shipment] as const)
          .catch(() => [o.id, null] as const)
      )
    );
    setShipments(Object.fromEntries(pairs.filter(([, shipment]) => shipment)));
  }

  function offerStatusLabel(status: string) {
    return (
      {
        pending: "รอเจ้าของสินค้าตอบรับ",
        accepted: "ยอมรับข้อเสนอแล้ว",
        rejected: "ข้อเสนอถูกปฏิเสธ",
        cancelled: "ยกเลิกข้อเสนอแล้ว",
        confirmed: "ยืนยันการแลกสำเร็จแล้ว"
      }[status] || status
    );
  }

  function shipmentStatusLabel(shipment: any) {
    const currentStep = String(shipment?.current_step || "started") as "started" | "picked_up" | "in_transit" | "finished";
    return (
      {
        started: "สร้างงานขนส่งแล้ว รอรับของ",
        picked_up: "รับของจากต้นทางแล้ว",
        in_transit: "กำลังขนส่งไปปลายทาง",
        finished: "ส่งของครบแล้ว รอยืนยันการแลก"
      }[currentStep] || currentStep
    );
  }

  function nextActionCopy(offer: any, shipment: any) {
    if (offer.status === "pending") {
      return offer.to_user_id === currentUser.id
        ? "ตรวจข้อเสนอแล้วเลือกยอมรับหรือปฏิเสธ"
        : "รอเจ้าของสินค้าตอบรับ หรือยกเลิกข้อเสนอนี้";
    }
    if (!(offer.status === "accepted" || offer.status === "confirmed")) return "ไม่มีขั้นตอนถัดไปสำหรับข้อเสนอนี้";
    if (!shipment) return "เริ่มงานขนส่งเพื่อเข้าสู่ขั้นตอนรับ-ส่งสินค้า";
    if (shipment.current_step === "started") return "อัปเดตว่าได้รับของจากต้นทางแล้ว";
    if (shipment.current_step === "picked_up") return "อัปเดตว่ากำลังจัดส่งอยู่";
    if (shipment.current_step === "in_transit") return "ปิดงานขนส่งเมื่อส่งของถึงปลายทางแล้ว";
    if (shipment.current_step === "finished" && offer.status !== "confirmed") return "ยืนยันสำเร็จเพื่อปิดดีล";
    return "ดีลนี้พร้อมติดตามผลต่อจากรายการด้านบน";
  }

  async function openNotificationOffer(notification: any) {
    const nextOfferId = notification?.data?.offer_id;
    if (!nextOfferId) return;
    try {
      if (!notification.read_at) {
        await api("/notifications/read", { method: "POST", body: JSON.stringify({ id: notification.id }) });
        setNotifications((current) => current.map((entry) => (entry.id === notification.id ? { ...entry, read_at: new Date().toISOString() } : entry)));
      }
    } catch {
      // noop
    }
    openOfferDetail(nextOfferId);
  }

  return (
    <section className="screen">
      {onBack ? <PageHeader title="อินบ็อกซ์" subtitle="ดูข้อเสนอและสถานะการดำเนินการ" onBack={onBack} /> : <h1>อินบ็อกซ์</h1>}
      <div className="segmented" role="tablist" aria-label="อินบ็อกซ์">
        {inboxTabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && tab === "offers" ? (
        offers.length ? (
          offers.map((o) => {
            const item = items.find((x) => x.id === o.target_item_id);
            const shipment = shipments[o.id];
            const ownerName = o.owner?.name || o.owner_name || o.to_name || "เจ้าของสินค้า";
            const ownerAvatar = o.owner?.avatar_url || o.owner_avatar || o.to_avatar || "";
            const senderName = o.from_name || "ผู้ขอ Xwap";
            const senderAvatar = o.from_avatar || "";
            const owner = {
              id: o.to_user_id,
              email: "",
              display_name: ownerName,
              avatar_url: ownerAvatar
            };
            const sender = {
              id: o.from_user_id,
              email: "",
              display_name: senderName,
              avatar_url: senderAvatar
            };
            return (
              <article
                className="panel offer-panel"
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => openOfferDetail(o.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openOfferDetail(o.id);
                  }
                }}
              >
                <div className="offer-top">
                  <button onClick={(event) => { event.stopPropagation(); openProfile(sender); }} aria-label={`เปิดโปรไฟล์ ${senderName}`}>
                    <img src={asset(senderAvatar)} alt={senderName} />
                    <span>{senderName}</span>
                  </button>
                  <button onClick={(event) => { event.stopPropagation(); openProfile(owner); }} aria-label={`เปิดโปรไฟล์ ${ownerName}`}>
                    <img src={asset(ownerAvatar)} alt={ownerName} />
                    <span>{ownerName}</span>
                  </button>
                </div>
                <button
                  className="offer-item"
                  onClick={(event) => {
                    event.stopPropagation();
                    void openItemById(o.target_item_id, item || null);
                  }}
                  aria-label={`เปิดรายละเอียด ${o.target_title || "สินค้า"}`}
                >
                  <img src={asset(o.target_image) || wantedFallbacks.Other} alt={o.target_title || "สินค้า"} />
                  <span>
                    <b>{o.target_title || "สินค้า"}</b>
                    <small>สถานะ: {offerStatusLabel(o.status)}</small>
                  </span>
                </button>
                <p>{o.message || "ไม่มีข้อความ"}</p>
                <p>เงินสด {o.cash_amount}</p>
                <p className="offer-next-step">
                  ขั้นตอนถัดไป: {nextActionCopy(o, shipment)}
                </p>
                {o.instant_swap ? (
                  <p className="logistics-line">
                    <Truck size={15} aria-hidden="true" /> แลกทันที · {o.logistics?.shipping_payer || "หารร่วมกัน"} ·{" "}
                    {o.logistics?.pickup_window || "รอนัดเวลา"}
                  </p>
                ) : null}
                {o.rejection_reason ? (
                  <p className="err" role="status">เหตุผลปฏิเสธ: {o.rejection_reason}</p>
                ) : null}
                {o.status === "accepted" || o.status === "confirmed" ? (
                  <div className="shipment-box">
                    <b>ขนส่ง Instant Swap</b>
                    {shipment ? (
                      <>
                        <p>
                          สถานะ {shipment.status} · {shipmentStatusLabel(shipment)} ·{" "}
                          {shipment.tracking_number || "ยังไม่มีเลขติดตาม"}
                        </p>
                      </>
                    ) : (
                      <p>ยังไม่ได้สร้างงานขนส่งสำหรับข้อเสนอนี้</p>
                    )}
                  </div>
                ) : null}
                <div className="action-row">
                  <button type="button" className="primary" onClick={(event) => { event.stopPropagation(); openOfferDetail(o.id); }}>
                    ดูข้อเสนอแลกสินค้า
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty">ยังไม่มี Xwap</div>
        )
      ) : !loading && notifications.length ? (
        notifications.map((n) => (
          <button type="button" className={`panel notification-panel${n.read_at ? "" : " unread"}`} key={n.id} onClick={() => void openNotificationOffer(n)}>
            <b>{n.title}</b>
            <p>{n.body}</p>
            <small>{n.read_at ? "เปิดรายละเอียดอีกครั้ง" : "แตะเพื่อเปิดหน้าข้อเสนอ"}</small>
          </button>
        ))
      ) : (
        <div className="empty">ยังไม่มีโนติฟิเคชัน</div>
      )}
    </section>
  );
}
