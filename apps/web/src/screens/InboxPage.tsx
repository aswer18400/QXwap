import { useEffect, useState } from "react";
import { Truck } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { inboxTabs } from "../design-system";
import type { InboxTab, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";

function formatCashAmount(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!amount) return "";
  return `${amount.toLocaleString("th-TH")} บาท`;
}

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
  const [sentOffers, setSentOffers] = useState<any[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Record<string, any>>({});
  const [tab, setTab] = useState<InboxTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notificationsFailed, setNotificationsFailed] = useState(false);

  async function reloadInbox() {
    setLoading(true);
    setLoadError("");
    try {
      const [o, n] = await Promise.all([
        Promise.all([
          api<{ offers: any[] }>("/offers/sent"),
          api<{ offers: any[] }>("/offers/received")
        ]).then(([sent, received]) => ({ sent: sent.offers || [], received: received.offers || [] })),
        api<{ notifications: any[] }>("/notifications")
          .then((data) => {
            setNotificationsFailed(false);
            return data;
          })
          .catch(() => {
            setNotificationsFailed(true);
            return { notifications: [] };
          })
      ]);
      setSentOffers(o.sent);
      setReceivedOffers(o.received);
      setNotifications(n.notifications);
      await loadShipments([...o.sent, ...o.received]);
    } catch (error: any) {
      setLoadError(error.message || "โหลดอินบ็อกซ์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    if (!user) return;
    void reloadInbox();
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
        accepted_by_receiver: "อีกฝ่ายตอบรับแล้ว",
        accepted: "ทั้งสองฝ่ายตอบรับแล้ว",
        rejected: "ข้อเสนอถูกปฏิเสธ",
        cancelled: "ยกเลิกข้อเสนอแล้ว",
        confirmed: "ดีลนี้กลายเป็นประวัติการแลกแล้ว"
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
    if (offer.status === "accepted_by_receiver") {
      return offer.from_user_id === currentUser.id
        ? "ยืนยันรับข้อเสนอเพื่อเปิดแชทและเริ่มนัดรับ"
        : "รออีกฝ่ายยืนยันให้ครบก่อนเปิดแชท";
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

  const activeReceivedOffers = receivedOffers.filter((offer) => offer.status !== "confirmed");
  const activeSentOffers = sentOffers.filter((offer) => offer.status !== "confirmed");
  const historyOffers = [...receivedOffers, ...sentOffers].filter((offer) => offer.status === "confirmed");

  function renderOfferCard(o: any, direction: "sent" | "received") {
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
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openProfile(sender);
            }}
            aria-label={`เปิดโปรไฟล์ ${senderName}`}
          >
            <img src={asset(senderAvatar)} alt={senderName} />
            <span>{senderName}</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openProfile(owner);
            }}
            aria-label={`เปิดโปรไฟล์ ${ownerName}`}
          >
            <img src={asset(ownerAvatar)} alt={ownerName} />
            <span>{ownerName}</span>
          </button>
        </div>
        <div className="offer-detail-copy offer-detail-facts">
          <div>
            <small>{direction === "received" ? "ข้อเสนอที่ได้รับ" : "ข้อเสนอที่ส่ง"}</small>
            <b>{offerStatusLabel(o.status)}</b>
          </div>
          {o.status === "confirmed" ? (
            <div>
              <small>สถานะดีล</small>
              <b>ประวัติการแลกสำเร็จ</b>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="offer-item"
          onClick={(event) => {
            event.stopPropagation();
            openOfferDetail(o.id);
          }}
          aria-label={`เปิดข้อเสนอ ${o.target_title || "สินค้า"}`}
        >
          <img src={asset(o.target_image) || asset(item?.media.images?.[0]) || wantedFallbacks.Other} alt={o.target_title || "สินค้า"} />
          <span>
            <b>{o.target_title || "สินค้า"}</b>
            <small>{offerStatusLabel(o.status)}</small>
          </span>
        </button>
        {o.message ? <p>{o.message}</p> : null}
        {formatCashAmount(o.cash_amount) ? <p>เงินสด {formatCashAmount(o.cash_amount)}</p> : null}
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
              <p>
                สถานะ {shipment.status} · {shipmentStatusLabel(shipment)} · {shipment.tracking_number || "ยังไม่มีเลขติดตาม"}
              </p>
            ) : (
              <p>ยังไม่ได้สร้างงานขนส่งสำหรับข้อเสนอนี้</p>
            )}
          </div>
        ) : null}
        <div className="action-row">
          <button
            type="button"
            className="primary"
            onClick={(event) => {
              event.stopPropagation();
              openOfferDetail(o.id);
            }}
          >
            ดูข้อเสนอแลกสินค้า
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="screen">
      {onBack ? <PageHeader title="อินบ็อกซ์" onBack={onBack} /> : <h1>อินบ็อกซ์</h1>}
      <div className="segmented" role="tablist" aria-label="อินบ็อกซ์">
        {inboxTabs.map((t) => (
          <button
            key={t.id}
            id={`inbox-tab-${t.id}`}
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`inbox-panel-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && tab === "offers" ? (
        <div id="inbox-panel-offers" role="tabpanel" aria-labelledby="inbox-tab-offers">
          {activeReceivedOffers.length || activeSentOffers.length || historyOffers.length ? (
            <>
              {activeReceivedOffers.length ? (
                <div className="offer-section">
                  <div className="section-head compact"><h2>ข้อเสนอที่ได้รับ</h2></div>
                  {activeReceivedOffers.map((offer) => renderOfferCard(offer, "received"))}
                </div>
              ) : null}
              {activeSentOffers.length ? (
                <div className="offer-section">
                  <div className="section-head compact"><h2>ข้อเสนอที่ส่ง</h2></div>
                  {activeSentOffers.map((offer) => renderOfferCard(offer, "sent"))}
                </div>
              ) : null}
              {historyOffers.length ? (
                <div className="offer-section">
                  <div className="section-head compact"><h2>ประวัติดีลสำเร็จ</h2></div>
                  {historyOffers.map((offer) => renderOfferCard(offer, offer.to_user_id === currentUser.id ? "received" : "sent"))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty">ยังไม่มี Xwap</div>
          )}
        </div>
      ) : !loading && notifications.length ? (
        <div id="inbox-panel-notifications" role="tabpanel" aria-labelledby="inbox-tab-notifications">
          {notifications.map((n) => {
            const offerId = n?.data?.offer_id;
            if (!offerId) {
              return (
                <div className={`panel notification-panel${n.read_at ? "" : " unread"}`} key={n.id}>
                  <b>{n.title}</b>
                  <p>{n.body}</p>
                </div>
              );
            }
            return (
              <button type="button" className={`panel notification-panel${n.read_at ? "" : " unread"}`} key={n.id} onClick={() => void openNotificationOffer(n)}>
                <b>{n.title}</b>
                <p>{n.body}</p>
              </button>
            );
          })}
        </div>
      ) : !loading && notificationsFailed ? (
        <div id="inbox-panel-notifications" role="tabpanel" aria-labelledby="inbox-tab-notifications" className="empty">
          <p role="alert">โหลดโนติฟิเคชันไม่สำเร็จ</p>
          <button type="button" className="secondary" onClick={() => void reloadInbox()}>
            ลองใหม่
          </button>
        </div>
      ) : (
        <div id="inbox-panel-notifications" role="tabpanel" aria-labelledby="inbox-tab-notifications" className="empty">ยังไม่มีโนติฟิเคชัน</div>
      )}
    </section>
  );
}
