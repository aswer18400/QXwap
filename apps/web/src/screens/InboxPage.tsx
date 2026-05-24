import { useEffect, useState } from "react";
import {
  ChatActionIcon,
  DistanceIcon,
  LocationMetaIcon,
  OfferActionIcon,
  PriceCashIcon,
  SwapDealIcon
} from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { DealTypeBadge } from "../components/DealTypeBadge";

type InboxViewTab = "received" | "sent";

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

function formatOfferTimestamp(value?: string) {
  if (!value) return "ล่าสุด";
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatItemDistance(item?: Item | null) {
  if (!item || item.location.distance_km == null) return "";
  if (item.location.distance_km < 1) return "< 1 กม.";
  if (item.location.distance_km < 10) return `${item.location.distance_km.toFixed(1)} กม.`;
  return `${Math.round(item.location.distance_km)} กม.`;
}

function itemWantedSummary(item?: Item | null) {
  if (!item) return "";
  if (item.wanted.text) return item.wanted.text;
  if (item.wanted.tags.length) return `ต้องการแลก ${item.wanted.tags.slice(0, 3).join(" · ")}`;
  return "เปิดรับข้อเสนอ";
}

function dealTypeLabel(item?: Item | null) {
  if (!item) return "แลก";
  return item.deal.type === "swap"
    ? "แลกเท่านั้น"
    : item.deal.type === "both"
      ? "ขายหรือแลก"
      : item.deal.type === "sell"
        ? "ขาย"
        : "ต้องการซื้อ";
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

function primaryActionLabel(detail?: OfferDetail | null, currentUserId?: string) {
  if (!detail) return "ดูรายละเอียด";
  const { offer, shipment } = detail;
  if (offer.status === "pending") {
    return offer.to_user_id === currentUserId ? "ตอบรับหรือปฏิเสธ" : "ดูสถานะข้อเสนอ";
  }
  if (offer.status === "accepted_by_receiver") {
    return offer.from_user_id === currentUserId ? "ยืนยันข้อเสนอ" : "รออีกฝ่ายยืนยัน";
  }
  if (offer.status === "accepted") {
    if (!shipment) return "จัดการนัดรับ";
    if (shipment.current_step === "finished") return "ยืนยันรับของ";
    return "จัดการการส่งมอบ";
  }
  if (offer.status === "confirmed") return "ดูผลการแลก";
  if (offer.status === "rejected" || offer.status === "cancelled") return "ดูสรุปดีล";
  return "ดูรายละเอียด";
}

export function OffersPage({
  user,
  requireLogin,
  items,
  openItemById,
  openProfile,
  openChat,
  openOfferDetail,
  initialTab,
  onBack
}: {
  user: User | null;
  requireLogin: RequireLogin;
  items: Item[];
  openItemById: (itemId: string, fallbackItem?: Item | null) => void | Promise<void>;
  openProfile: (p: User) => void;
  openChat: (offerId: string, tab?: OfferTab) => void;
  openOfferDetail: (offerId: string, tab?: OfferTab) => void;
  initialTab: OfferTab;
  onBack?: () => void;
}) {
  const [sentOffers, setSentOffers] = useState<OfferCardModel[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<OfferCardModel[]>([]);
  const [shipments, setShipments] = useState<Record<string, any>>({});
  const [offerDetails, setOfferDetails] = useState<Record<string, OfferDetail>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<InboxViewTab>("received");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
    const offeredItems = detail?.offered_items || [];
    const cashText = formatCashAmount(detail?.offer.cash_amount ?? offer.cash_amount);
    const message = detail?.offer.message?.trim();
    const otherPartyName = direction === "received"
      ? detail?.offer.from_name || offer.from_name || "ผู้เสนอ"
      : detail?.offer.to_name || offer.to_name || offer.owner_name || "เจ้าของสินค้า";
    const bundleLeadItem = offeredItems[0] || null;
    const createdAt = formatOfferTimestamp(detail?.offer.created_at);
    const targetLabel = direction === "received" ? "เขาขอสินค้าชิ้นนี้" : "สินค้าที่คุณต้องการ";
    const offeredLabel = direction === "received" ? "สิ่งที่อีกฝ่ายเสนอ" : "สิ่งที่คุณเสนอ";
    const targetLocation = targetItem?.location.label || "ยังไม่ระบุพื้นที่";
    const targetDistance = formatItemDistance(targetItem);
    const bundleLocation = bundleLeadItem?.location.label || "";
    const bundleDistance = formatItemDistance(bundleLeadItem);
    const bundleSummary = offeredItems.length
      ? offeredItems.length === 1
        ? offeredItems[0].title
        : `${offeredItems[0].title} และอีก ${offeredItems.length - 1} ชิ้น`
      : "ข้อเสนอนี้ยังไม่ได้แนบสินค้า";
    const noteText = shipment ? shipmentStatusLabel(shipment.current_step) : nextActionCopy(detail, currentUserId);
    const urgencyClass = direction === "received" && offer.status === "pending" ? " offer-compare-summary--urgent" : "";

    return (
      <article className={`panel offer-compare-summary${urgencyClass}`} key={offer.id}>
        <div className="offer-summary-top">
          <div className="offer-summary-intro">
            <div className="offer-summary-headline">
              <small className="offer-summary-side-label">{direction === "received" ? "ข้อเสนอที่เข้ามา" : "ข้อเสนอที่คุณส่ง"}</small>
              <span className={`offer-status-pill offer-status-pill--${offer.status}`}>{offerStatusLabel(offer.status)}</span>
            </div>
            <button
              type="button"
              className="offer-summary-party-link"
              onClick={() =>
                openProfile({
                  id: direction === "received" ? offer.from_user_id : offer.to_user_id,
                  email: "",
                  display_name: otherPartyName
                })
              }
            >
              {otherPartyName}
            </button>
            <p className="offer-summary-note">{createdAt} · {noteText}</p>
          </div>
          <button
            type="button"
            className="offer-summary-open"
            onClick={() => openOfferDetail(offer.id, direction)}
          >
            เปิดดีลนี้
          </button>
        </div>

        <div className="offer-summary-compare">
          <div className="offer-summary-product">
            <small className="offer-summary-side-label">{targetLabel}</small>
            {targetItem ? (
              <button type="button" className="offer-summary-product-card" onClick={() => openItemById(targetItem.id, targetItem)}>
                <img src={asset(targetItem.media.images[0]) || wantedFallbacks.Other} alt={targetItem.title} />
                <div>
                  <b>{targetItem.title}</b>
                  <small>{targetItem.category} · {targetItem.condition || "ยังไม่ระบุสภาพ"}</small>
                  <div className="offer-summary-meta">
                    <span><LocationMetaIcon size={14} /> {targetLocation}</span>
                    {targetDistance ? <span><DistanceIcon size={14} /> {targetDistance}</span> : null}
                    <span><SwapDealIcon size={14} /> {itemWantedSummary(targetItem)}</span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="offer-summary-product-card offer-summary-product-card--empty">
                <div>
                  <b>{offer.target_title || "สินค้า"}</b>
                  <small>ไม่พบรายละเอียดสินค้าในระบบแล้ว</small>
                </div>
              </div>
            )}
          </div>

          <div className="offer-summary-vs">⇄</div>

          <div className="offer-summary-product">
            <small className="offer-summary-side-label">{offeredLabel}</small>
            {bundleLeadItem ? (
              <>
                <button type="button" className="offer-summary-product-card" onClick={() => openItemById(bundleLeadItem.id, bundleLeadItem)}>
                  <img src={asset(bundleLeadItem.media.images[0]) || wantedFallbacks.Other} alt={bundleLeadItem.title} />
                  <div>
                    <b>{bundleSummary}</b>
                    <small>{bundleLeadItem.category} · {bundleLeadItem.condition || "ยังไม่ระบุสภาพ"}</small>
                    <div className="offer-summary-meta">
                      <span><LocationMetaIcon size={14} /> {bundleLocation}</span>
                      {bundleDistance ? <span><DistanceIcon size={14} /> {bundleDistance}</span> : null}
                      <span><SwapDealIcon size={14} /> {itemWantedSummary(bundleLeadItem)}</span>
                    </div>
                  </div>
                </button>
                <div className="offer-summary-thumb-strip">
                  {offeredItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="offer-summary-thumb"
                      onClick={() => openItemById(item.id, item)}
                      aria-label={`เปิดสินค้า ${item.title}`}
                    >
                      <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
                    </button>
                  ))}
                  {offeredItems.length > 3 ? <span className="offer-summary-thumb-count">+{offeredItems.length - 3}</span> : null}
                </div>
              </>
            ) : (
              <div className="offer-summary-product-card offer-summary-product-card--empty">
                <div>
                  <b>ยังไม่มีสินค้าแนบ</b>
                  <small>{cashText ? `มีเงินสดเพิ่ม ${cashText}` : "ข้อเสนอครั้งนี้ส่งมาเป็นข้อความอย่างเดียว"}</small>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="offer-summary-terms">
          <div className="offer-summary-term">
            <small>ประเภทดีล</small>
            <b>{targetItem ? <DealTypeBadge type={targetItem.deal.type} label={dealTypeLabel(targetItem)} /> : "ข้อเสนอแลก"}</b>
          </div>
          {cashText ? (
            <div className="offer-summary-term">
              <small>เงินสดที่แนบมา</small>
              <b><PriceCashIcon size={14} /> {cashText}</b>
            </div>
          ) : null}
          {message ? (
            <div className="offer-summary-term offer-summary-term--message">
              <small>ข้อความที่แนบมากับข้อเสนอ</small>
              <b>{message}</b>
            </div>
          ) : null}
        </div>

        <div className="offer-summary-footer">
          <div className="offer-summary-foot-actions">
            <button type="button" className="offer-summary-chat" onClick={() => openChat(offer.id, direction)}>
              <ChatActionIcon size={14} /> แชต
            </button>
            <button type="button" className="offer-summary-link" onClick={() => openOfferDetail(offer.id, direction)}>
              <OfferActionIcon size={14} /> {primaryActionLabel(detail, currentUserId)}
            </button>
          </div>
          <button type="button" className="offer-summary-link" onClick={() => openOfferDetail(offer.id, direction)}>
            ดูรายละเอียดข้อเสนอ
          </button>
        </div>
      </article>
    );
  }

  const rows = activeTab === "received" ? receivedOffers : sentOffers;

  return (
    <section className="screen inbox-page">
      {onBack ? <PageHeader title="ข้อเสนอ" subtitle="ติดตามดีลที่ได้รับและที่คุณส่งออกไป" onBack={onBack} /> : <h1>ข้อเสนอ</h1>}
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading ? (
        <>
          <div className="segmented" role="tablist" aria-label="ประเภทข้อเสนอ">
            <button
              type="button"
              className={activeTab === "received" ? "on" : ""}
              onClick={() => setActiveTab("received")}
              role="tab"
              aria-selected={activeTab === "received"}
            >
              ได้รับ
            </button>
            <button
              type="button"
              className={activeTab === "sent" ? "on" : ""}
              onClick={() => setActiveTab("sent")}
              role="tab"
              aria-selected={activeTab === "sent"}
            >
              ส่งแล้ว
            </button>
          </div>
          <div className="offer-section list">
            {rows.length ? (
              rows.map((offer) => renderOfferCard(offer, activeTab === "received" ? "received" : "sent"))
            ) : (
              <div className="empty">
                {activeTab === "received" ? "ยังไม่มีข้อเสนอที่ได้รับ" : "ยังไม่มีข้อเสนอที่ส่ง"}
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
