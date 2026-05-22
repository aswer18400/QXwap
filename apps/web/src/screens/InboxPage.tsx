import { useEffect, useState } from "react";
import { OfferActionIcon, Truck } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { inboxTabs } from "../design-system";
import type { InboxTab, Item, OfferDetail, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { DealTypeBadge } from "../components/DealTypeBadge";

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
  const [offerDetails, setOfferDetails] = useState<Record<string, OfferDetail>>({});
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
      await loadOfferDetails([...o.sent, ...o.received]);
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

  async function loadOfferDetails(nextOffers: any[]) {
    const pairs = await Promise.all(
      nextOffers.map((offer) =>
        api<OfferDetail>(`/offers/${offer.id}/detail`)
          .then((detail) => [offer.id, detail] as const)
          .catch(() => [offer.id, null] as const)
      )
    );
    setOfferDetails(Object.fromEntries(pairs.filter(([, detail]) => detail)));
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
        started: "เริ่มนัดรับสินค้าแล้ว",
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
    if (!shipment) return "เริ่มนัดรับสินค้าและกำหนดช่วงเวลาที่สะดวก";
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

  const activeSentOffers = sentOffers;

  function renderOfferCard(o: any, direction: "sent" | "received") {
    const item = items.find((x) => x.id === o.target_item_id);
    const shipment = shipments[o.id];
    const detail = offerDetails[o.id];
    const ownerName = o.owner?.name || o.owner_name || o.to_name || "เจ้าของสินค้า";
    const senderName = o.from_name || "ผู้ขอ Xwap";
    const statusText = offerStatusLabel(o.status);
    const myLeadItem = detail?.offered_items?.[0] || null;
    const targetItem = detail?.target_item || item || null;
    const myExtraCount = Math.max((detail?.offered_items?.length || 1) - 1, 0);
    const cashText = formatCashAmount(o.cash_amount);
    const summaryBits = [
      myExtraCount ? `มีสินค้าอีก ${myExtraCount} ชิ้น` : "",
      cashText ? `เงินสด ${cashText}` : ""
    ].filter(Boolean);
    return (
      <button
        type="button"
        className="panel offer-panel offer-compare-summary"
        key={o.id}
        onClick={() => openOfferDetail(o.id)}
        aria-label={`เปิดข้อเสนอ ${o.target_title || "สินค้า"}`}
      >
        <div className="offer-summary-top">
          <span className={`offer-status-pill offer-status-pill--${o.status}`}>{statusText}</span>
          <span className="offer-summary-side-label">{direction === "received" ? "ข้อเสนอที่ได้รับ" : "ข้อเสนอที่ส่ง"}</span>
        </div>
        <div className="offer-summary-compare">
          <div className="offer-summary-product">
            <small>สินค้าของเรา</small>
            <div className="offer-summary-product-card">
              <img src={asset(myLeadItem?.media.images?.[0]) || wantedFallbacks.Other} alt={myLeadItem?.title || "สินค้าของเรา"} />
              <div>
                <b>{myLeadItem?.title || "ยังไม่มีสินค้าแนบ"}</b>
                {myLeadItem ? <DealTypeBadge type={myLeadItem.deal.type} /> : null}
              </div>
            </div>
          </div>
          <div className="offer-summary-vs">
            <OfferActionIcon size={18} />
          </div>
          <div className="offer-summary-product">
            <small>สินค้าของอีกฝ่าย</small>
            <div className="offer-summary-product-card">
              <img src={asset(targetItem?.media.images?.[0]) || asset(o.target_image) || wantedFallbacks.Other} alt={targetItem?.title || o.target_title || "สินค้าที่ต้องการ"} />
              <div>
                <b>{targetItem?.title || o.target_title || "สินค้าที่ต้องการ"}</b>
                {targetItem ? <DealTypeBadge type={targetItem.deal.type} /> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="offer-summary-meta">
          <b>เสนอโดย {senderName}</b>
          <span>{summaryBits.length ? summaryBits.join(" · ") : shipment ? shipmentStatusLabel(shipment) : nextActionCopy(o, shipment)}</span>
          <span>ถึงร้าน {ownerName}</span>
        </div>
        <span className="primary wide offer-summary-open">ดูข้อเสนอ</span>
      </button>
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
          {activeSentOffers.length ? (
            <>
              <div className="offer-section">
                {activeSentOffers.map((offer) => renderOfferCard(offer, "sent"))}
              </div>
            </>
          ) : (
            <div className="empty">ยังไม่มีข้อเสนอที่ส่ง</div>
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
