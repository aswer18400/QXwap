import { useEffect, useState } from "react";
import { ChatActionIcon, OfferActionIcon, Truck } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { DealTypeBadge } from "../components/DealTypeBadge";

type OfferCardModel = {
  id: string;
  status: string;
  target_item_id: string;
  target_title?: string;
  target_image?: string;
  from_user_id: string;
  to_user_id: string;
  from_name?: string;
  to_name?: string;
  owner_name?: string;
  cash_amount?: number;
};

function formatCashAmount(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!amount) return "";
  return `${amount.toLocaleString("th-TH")} บาท`;
}

function offerStatusLabel(status: string) {
  return (
    {
      pending: "รอตอบรับ",
      accepted_by_receiver: "รออีกฝ่ายยืนยัน",
      accepted: "พร้อมนัดรับและส่งมอบ",
      rejected: "ปฏิเสธแล้ว",
      cancelled: "ยกเลิกแล้ว",
      confirmed: "แลกสำเร็จแล้ว"
    }[status] || status
  );
}

function shipmentStatusLabel(currentStep?: string) {
  return (
    {
      started: "กำลังตกลงเวลาหรือวิธีส่งมอบ",
      picked_up: "เริ่มรับของแล้ว",
      in_transit: "กำลังส่งมอบ",
      finished: "ส่งมอบครบ รอยืนยันรับของ"
    }[String(currentStep || "started")] || "กำลังอัปเดต"
  );
}

function nextActionCopy(detail?: OfferDetail | null, currentUserId?: string) {
  if (!detail) return "เปิดดูรายละเอียดเพื่อดำเนินการต่อ";
  const { offer, shipment } = detail;
  if (offer.status === "pending") {
    return offer.to_user_id === currentUserId ? "ตรวจและตอบรับข้อเสนอ" : "รออีกฝ่ายตอบรับหรือยกเลิก";
  }
  if (offer.status === "accepted_by_receiver") {
    return offer.from_user_id === currentUserId ? "คุยต่อได้และกดยืนยันเพื่อเริ่มนัดรับ" : "รอผู้เสนอคนแรกยืนยันขั้นสุดท้าย";
  }
  if (offer.status === "accepted") {
    return shipment ? shipmentStatusLabel(shipment.current_step) : "ตั้งเวลานัดรับหรือเลือกส่งขนส่ง";
  }
  if (offer.status === "confirmed") return "ดีลนี้สำเร็จแล้ว";
  if (offer.status === "rejected") return `ข้อเสนอถูกปฏิเสธ${offer.rejection_reason ? `: ${offer.rejection_reason}` : ""}`;
  if (offer.status === "cancelled") return "ข้อเสนอนี้ถูกยกเลิกแล้ว";
  return "เปิดดูรายละเอียดเพื่อดำเนินการต่อ";
}

export function OffersPage({
  user,
  requireLogin,
  items,
  openOfferDetail,
  initialTab: _initialTab,
  onBack
}: {
  user: User | null;
  requireLogin: RequireLogin;
  items: Item[];
  openItemById: (itemId: string, fallbackItem?: Item | null) => void | Promise<void>;
  openProfile: (p: User) => void;
  openOfferDetail: (offerId: string) => void;
  initialTab: OfferTab;
  onBack?: () => void;
}) {
  const [sentOffers, setSentOffers] = useState<OfferCardModel[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<OfferCardModel[]>([]);
  const [shipments, setShipments] = useState<Record<string, any>>({});
  const [offerDetails, setOfferDetails] = useState<Record<string, OfferDetail>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!user) return;
    let live = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      Promise.all([
        api<{ offers: OfferCardModel[] }>("/offers/sent"),
        api<{ offers: OfferCardModel[] }>("/offers/received")
      ]).then(([sent, received]) => ({ sent: sent.offers || [], received: received.offers || [] }))
    ])
      .then(async ([offerResponse]) => {
        if (!live) return;
        setSentOffers(offerResponse.sent);
        setReceivedOffers(offerResponse.received);

        const allOffers = [...offerResponse.received, ...offerResponse.sent];
        const detailPairs = await Promise.all(
          allOffers.map((offer) =>
            api<OfferDetail>(`/offers/${offer.id}/detail`)
              .then((detail) => [offer.id, detail] as const)
              .catch(() => [offer.id, null] as const)
          )
        );
        if (!live) return;
        const nextDetails = Object.fromEntries(detailPairs.filter(([, detail]) => detail)) as Record<string, OfferDetail>;
        setOfferDetails(nextDetails);

        const shipmentPairs = await Promise.all(
          allOffers
            .filter((offer) => {
              const detail = nextDetails[offer.id];
              return detail?.offer.status === "accepted" || detail?.offer.status === "confirmed";
            })
            .map((offer) =>
              api<{ shipment: any }>(`/shipments/${offer.id}`)
                .then((data) => [offer.id, data.shipment] as const)
                .catch(() => [offer.id, null] as const)
            )
        );
        if (!live) return;
        setShipments(Object.fromEntries(shipmentPairs.filter(([, shipment]) => shipment)));
      })
      .catch((error: any) => live && setLoadError(error.message || "โหลดข้อเสนอไม่สำเร็จ"))
      .finally(() => live && setLoading(false));

    return () => {
      live = false;
    };
  }, [user]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="ข้อเสนอ" />;
  const currentUserId = user.id;

  function renderOfferCard(offer: OfferCardModel, direction: "sent" | "received") {
    const detail = offerDetails[offer.id];
    const shipment = shipments[offer.id];
    const targetItem = detail?.target_item || items.find((entry) => entry.id === offer.target_item_id) || null;
    const myItems = direction === "received" ? (targetItem ? [targetItem] : []) : detail?.offered_items || [];
    const otherItems = direction === "received" ? detail?.offered_items || [] : (targetItem ? [targetItem] : []);
    const cashText = formatCashAmount(detail?.offer.cash_amount ?? offer.cash_amount);
    const message = detail?.offer.message?.trim();
    const otherPartyName = direction === "received"
      ? detail?.offer.from_name || offer.from_name || "ผู้เสนอ"
      : detail?.offer.to_name || offer.to_name || offer.owner_name || "เจ้าของสินค้า";
    const isChatOpen = Boolean(detail?.chat_enabled);
    const isUrgent = direction === "received" && offer.status === "pending";

    return (
      <button
        type="button"
        className={`panel offer-panel offer-compare-summary${isUrgent ? " offer-compare-summary--urgent" : ""}`}
        key={offer.id}
        onClick={() => openOfferDetail(offer.id)}
      >
        <div className="offer-summary-top">
          <span className={`offer-status-pill offer-status-pill--${offer.status}`}>{offerStatusLabel(offer.status)}</span>
          <span className="offer-summary-side-label">{direction === "received" ? "ข้อเสนอที่ได้รับ" : "ข้อเสนอที่ส่ง"}</span>
        </div>

        <div className="offer-summary-compare">
          <div className="offer-summary-product">
            <small>{direction === "received" ? "สินค้าที่อีกฝ่ายอยากได้" : "สินค้าที่คุณเสนอ"}</small>
            <div className="offer-summary-product-card">
              <img
                src={asset(myItems[0]?.media.images?.[0]) || asset(offer.target_image) || wantedFallbacks.Other}
                alt={myItems[0]?.title || offer.target_title || "สินค้า"}
              />
              <div>
                <b>{myItems[0]?.title || offer.target_title || "สินค้า"}</b>
                {myItems[0] ? <DealTypeBadge type={myItems[0].deal.type} /> : null}
                {myItems.length > 1 ? <small>รวม {myItems.length} ชิ้น</small> : null}
              </div>
            </div>
          </div>

          <div className="offer-summary-vs">
            <OfferActionIcon size={18} />
          </div>

          <div className="offer-summary-product">
            <small>{direction === "received" ? "สินค้าที่อีกฝ่ายเสนอมา" : "สินค้าที่คุณต้องการ"}</small>
            <div className="offer-summary-product-card">
              <img
                src={asset(otherItems[0]?.media.images?.[0]) || asset(offer.target_image) || wantedFallbacks.Other}
                alt={otherItems[0]?.title || offer.target_title || "สินค้า"}
              />
              <div>
                <b>{otherItems[0]?.title || offer.target_title || "สินค้า"}</b>
                {otherItems[0] ? <DealTypeBadge type={otherItems[0].deal.type} /> : null}
                {otherItems.length > 1 ? <small>รวม {otherItems.length} ชิ้น</small> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="offer-summary-meta">
          <b>คู่ดีล: {otherPartyName}</b>
          <span>{shipment ? shipmentStatusLabel(shipment.current_step) : nextActionCopy(detail, currentUserId)}</span>
          {cashText ? <span>เงินสดเพิ่ม {cashText}</span> : null}
          {message ? <span>หมายเหตุ: {message}</span> : null}
        </div>

        <div className="offer-summary-footer">
          <span className="offer-summary-open">ดูข้อเสนอ</span>
          <div className="offer-summary-foot-actions">
            {targetItem ? <span className="offer-summary-link">มีสินค้าแนบ</span> : null}
            <span className="offer-summary-link">คู่ดีล {otherPartyName}</span>
            {isChatOpen ? <span className="offer-summary-chat"><ChatActionIcon size={14} /> แชทพร้อม</span> : null}
            {shipment ? <span className="offer-summary-chat"><Truck size={14} /> ติดตามได้</span> : null}
          </div>
        </div>
      </button>
    );
  }

  const pendingReceivedCount = receivedOffers.filter((offer) => offer.status === "pending").length;

  return (
    <section className="screen">
      {onBack ? <PageHeader title="ข้อเสนอ" onBack={onBack} /> : <h1>ข้อเสนอ</h1>}
      <div className="panel offer-hub-hero">
        <div>
          <b>ศูนย์กลางข้อเสนอแลกสินค้า</b>
          <p>แยกจากโนติฟิเคชันแล้ว หน้านี้ใช้จัดการข้อเสนอทั้งหมด ส่วนกระดิ่งด้านบนไว้ดูแจ้งเตือนอย่างเดียว</p>
        </div>
        <div className="offer-hub-stats">
          <span><b>{receivedOffers.length}</b> ได้รับ</span>
          <span><b>{sentOffers.length}</b> ส่งแล้ว</span>
          <span className={pendingReceivedCount ? "urgent" : ""}><b>{pendingReceivedCount}</b> รอตอบ</span>
        </div>
      </div>
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading ? (
        <>
          <div className="offer-group-block">
            <div className="offer-group-head">
              <h2>ข้อเสนอที่ได้รับ</h2>
              <span>{receivedOffers.length ? `${receivedOffers.length} รายการ` : "ยังไม่มีรายการ"}</span>
            </div>
            {receivedOffers.length ? (
              <div className="offer-section">
                {receivedOffers.map((offer) => renderOfferCard(offer, "received"))}
              </div>
            ) : (
              <div className="empty">ยังไม่มีข้อเสนอที่ได้รับ</div>
            )}
          </div>

          <div className="offer-group-block">
            <div className="offer-group-head">
              <h2>ข้อเสนอที่ส่ง</h2>
              <span>{sentOffers.length ? `${sentOffers.length} รายการ` : "ยังไม่มีรายการ"}</span>
            </div>
            {sentOffers.length ? (
              <div className="offer-section">
                {sentOffers.map((offer) => renderOfferCard(offer, "sent"))}
              </div>
            ) : (
              <div className="empty">ยังไม่มีข้อเสนอที่ส่ง</div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
