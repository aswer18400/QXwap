import { useEffect, useState } from "react";
import { ChatActionIcon, OfferActionIcon, Truck } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";

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
    const offeredSummary = offeredItems.length
      ? offeredItems.map((entry) => entry.title).join(", ")
      : "ยังไม่มีสินค้าแนบ";
    const createdAt = detail?.offer.created_at
      ? new Date(detail.offer.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
      : "ล่าสุด";
    const targetLabel = direction === "received" ? "เขาขอสินค้าชิ้นนี้" : "สินค้าที่คุณต้องการ";
    const offeredLabel = direction === "received" ? "สิ่งที่อีกฝ่ายเสนอ" : "สิ่งที่คุณเสนอ";

    return (
      <article
        className={`offer-row${direction === "received" && offer.status === "pending" ? " unread" : ""}`}
        key={offer.id}
        onClick={() => openOfferDetail(offer.id, direction)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openOfferDetail(offer.id, direction);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="section-head compact">
          <div>
            <h3>{targetItem?.title || offer.target_title || "สินค้า"}</h3>
            <p>{otherPartyName} · {createdAt}</p>
          </div>
          <span className={`offer-status-pill offer-status-pill--${offer.status}`}>{offerStatusLabel(offer.status)}</span>
        </div>

        <div className="split-card">
          <div className="mini-item">
            <strong>{targetItem?.title || offer.target_title || "สินค้า"}</strong>
            <span>{targetLabel}</span>
          </div>
          <div className="pill">⇄</div>
          <div className="mini-item">
            <strong>{offeredSummary}</strong>
            <span>{offeredLabel}{cashText ? ` · + ${cashText}` : ""}</span>
          </div>
        </div>

        <div className="item-copy">
          {shipment ? shipmentStatusLabel(shipment.current_step) : nextActionCopy(detail, currentUserId)}
          {message ? ` · หมายเหตุ: ${message}` : ""}
        </div>

        <div className="offer-actions offer-row-actions">
          <button type="button" className="secondary" onClick={(event) => {
            event.stopPropagation();
            openChat(offer.id, direction);
          }}>
            <ChatActionIcon size={14} /> แชต
          </button>
          <button type="button" className="primary" onClick={(event) => {
            event.stopPropagation();
            openOfferDetail(offer.id, direction);
          }}>
            <OfferActionIcon size={14} /> {primaryActionLabel(detail, currentUserId)}
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
