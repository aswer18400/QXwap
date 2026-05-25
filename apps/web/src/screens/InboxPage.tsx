import { useEffect, useState } from "react";
import {
  ChatActionIcon,
  DistanceIcon,
  LocationMetaIcon,
  MenuIcon,
  OfferActionIcon,
  PriceCashIcon,
  SearchNavIcon,
  SwapDealIcon
} from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { formatCashAmountValue, formatDateTimeValue, formatDistanceKmValue, formatIntegerValue, formatRatingValue } from "../lib/format";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { ContextEmptyState } from "../components/ContextEmptyState";
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

function formatOfferTimestamp(value?: string) {
  return formatDateTimeValue(value);
}

function formatItemDistance(item?: Item | null) {
  if (!item || item.location.distance_km == null) return "";
  return formatDistanceKmValue(item.location.distance_km);
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

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="ข้อเสนอ"
        subtitle="รวมข้อเสนอที่ได้รับและที่คุณส่งไว้ พร้อมตามขั้นตอนดีลในหน้าเดียว"
        onBack={onBack}
      />
    );
  }
  const currentUserId = user.id;

  function renderOfferCard(offer: OfferCardModel, direction: "sent" | "received") {
    const detail = offerDetails[offer.id];
    const shipment = shipments[offer.id];
    const targetItem = detail?.target_item || items.find((entry) => entry.id === offer.target_item_id) || null;
    const offeredItems = detail?.offered_items || [];
    const cashText = formatCashAmountValue(detail?.offer.cash_amount ?? offer.cash_amount);
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
    const urgencyClass = direction === "received" && offer.status === "pending" ? " message-offer-card--urgent" : "";
    const counterpartAvatar = direction === "received"
      ? detail?.offer.from_avatar || bundleLeadItem?.owner.avatar_url || ""
      : detail?.offer.to_avatar || targetItem?.owner.avatar_url || "";
    const counterpartCity = targetItem?.location.label || bundleLeadItem?.location.label || "กรุงเทพฯ";
    const counterpartRating = direction === "received"
      ? bundleLeadItem?.owner.rating || 4.8
      : targetItem?.owner.rating || 4.8;
    const counterpartReviews = targetItem?.stats.requests || bundleLeadItem?.stats.requests || 0;
    const summaryLine = cashText
      ? `แลก + เงินเพิ่ม ${cashText}`
      : offeredItems.length
        ? `แลก ${bundleSummary}`
        : "ส่งข้อความพร้อมข้อเสนอ";
    const messagePreview = message || noteText;
    const canChat = Boolean(detail?.conversation_id);
    const primaryLabel = direction === "received" && offer.status === "pending" ? "ตอบกลับ" : "ดูรายละเอียด";
    const secondaryLabel = direction === "received" && offer.status === "pending"
      ? "ปฏิเสธ"
      : canChat
        ? "แชท"
        : "ดูรายละเอียด";

    return (
      <article className={`panel message-offer-card${urgencyClass}`} key={offer.id}>
        <div className="message-offer-head">
          <button
            type="button"
            className="message-offer-party"
            onClick={() =>
              openProfile({
                id: direction === "received" ? offer.from_user_id : offer.to_user_id,
                email: "",
                display_name: otherPartyName,
                avatar_url: counterpartAvatar
              })
            }
          >
            <img src={asset(counterpartAvatar) || wantedFallbacks.Other} alt={otherPartyName} />
            <span>
              <b>{otherPartyName}</b>
              <small>⭐ {formatRatingValue(counterpartRating) || "0.0"} ({formatIntegerValue(counterpartReviews)}) · {counterpartCity}</small>
            </span>
          </button>
          <div className="message-offer-status">
            <span className={`offer-status-pill offer-status-pill--${offer.status}`}>{offerStatusLabel(offer.status)}</span>
            <small>{createdAt}</small>
          </div>
        </div>

        <div className="message-offer-tray">
          {(offeredItems.length ? offeredItems : targetItem ? [targetItem] : []).slice(0, 3).map((item) => (
            <button
              key={`message-thumb-${offer.id}-${item.id}`}
              type="button"
              className="message-offer-thumb"
              onClick={() => openItemById(item.id, item)}
              aria-label={`เปิดสินค้า ${item.title}`}
            >
              <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
            </button>
          ))}
          {offeredItems.length > 3 ? <span className="message-offer-thumb-count">+{offeredItems.length - 3}</span> : null}
        </div>

        <div className="message-offer-copy">
          <b>{summaryLine}</b>
          <p>{messagePreview}</p>
        </div>

        <div className="message-offer-caption">
          <span>{targetLabel}</span>
          <b>{targetItem?.title || offer.target_title || "สินค้าเป้าหมาย"}</b>
        </div>

        <div className="message-offer-actions">
          <button type="button" className="primary wide" onClick={() => openOfferDetail(offer.id, direction)}>
            {primaryLabel}
          </button>
          <button
            type="button"
            className={`${direction === "received" && offer.status === "pending" ? "danger" : "secondary"} wide`}
            onClick={() => (canChat && direction !== "received" ? openChat(offer.id, direction) : openOfferDetail(offer.id, direction))}
          >
            {secondaryLabel}
          </button>
        </div>
      </article>
    );
  }

  const rows = activeTab === "received" ? receivedOffers : sentOffers;

  return (
    <section className="screen inbox-page">
      {onBack ? (
        <PageHeader
          title="ข้อความ"
          subtitle="ติดตามดีลที่ได้รับและที่คุณส่งออกไป"
          onBack={onBack}
          align="left"
          actions={
            <div className="page-header-inline-icons">
              <span className="page-header-icon"><SearchNavIcon size={16} /></span>
              <span className="page-header-icon"><MenuIcon size={16} /></span>
            </div>
          }
        />
      ) : (
        <h1>ข้อความ</h1>
      )}
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading ? (
        <>
          <div className="segmented segmented--message" role="tablist" aria-label="ประเภทข้อเสนอ">
            <button
              type="button"
              className={activeTab === "received" ? "on" : ""}
              onClick={() => setActiveTab("received")}
              role="tab"
              aria-selected={activeTab === "received"}
            >
              ได้รับข้อเสนอ {receivedOffers.length ? <b>{receivedOffers.length}</b> : null}
            </button>
            <button
              type="button"
              className={activeTab === "sent" ? "on" : ""}
              onClick={() => setActiveTab("sent")}
              role="tab"
              aria-selected={activeTab === "sent"}
            >
              ส่งข้อเสนอ {sentOffers.length ? <b>{sentOffers.length}</b> : null}
            </button>
          </div>
          <div className="offer-section list">
            {rows.length ? (
              rows.map((offer) => renderOfferCard(offer, activeTab === "received" ? "received" : "sent"))
            ) : (
              <ContextEmptyState
                title={activeTab === "received" ? "ยังไม่มีข้อเสนอที่ได้รับ" : "ยังไม่มีข้อเสนอที่ส่ง"}
                summary={
                  activeTab === "received"
                    ? "เมื่อมีคนสนใจสินค้าของคุณและส่งข้อเสนอเข้ามา รายการจะขึ้นที่หน้านี้พร้อมให้คุณตอบกลับทันที"
                    : "ข้อเสนอที่คุณส่งออกไปจะถูกรวมไว้ที่นี่ เพื่อให้กลับมาติดตามสถานะและเปิดแชทต่อได้ง่าย"
                }
                details={
                  activeTab === "received"
                    ? [
                        "คุณจะเห็นสินค้าที่ถูกเสนอแลกครบทุกชิ้น",
                        "ตอบรับ ปฏิเสธ หรือเปิดแชทต่อรองต่อได้จากจุดเดียว",
                        "สถานะนัดรับ ส่งมอบ และยืนยันรับของจะตามที่นี่ต่อ"
                      ]
                    : [
                        "ตรวจได้ว่าคู่ดีลเปิดอ่านและตอบรับข้อเสนอหรือยัง",
                        "กลับมาดูข้อความและเงื่อนไขที่คุณส่งไว้ได้ครบ",
                        "เมื่อข้อเสนอถูกตอบรับ ระบบจะพาไปขั้นนัดรับต่อทันที"
                      ]
                }
                note={activeTab === "received" ? "เริ่มจากลงสินค้าหรือเปิดรับข้อเสนอเพิ่มเพื่อให้คนเห็นร้านของคุณมากขึ้น" : "ลองเปิดสินค้าในร้านแล้วกดส่งข้อเสนอเพื่อเริ่มดีลแรก"}
                actions={
                  activeTab === "received"
                    ? sentOffers.length
                      ? [{ label: "ดูข้อเสนอที่ส่งไว้", onClick: () => setActiveTab("sent"), variant: "secondary" }]
                      : []
                    : receivedOffers.length
                      ? [{ label: "ดูข้อเสนอที่ได้รับ", onClick: () => setActiveTab("received"), variant: "secondary" }]
                      : []
                }
              />
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
