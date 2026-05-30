import { useEffect, useMemo, useState } from "react";
import {
  ChatActionIcon,
  MenuIcon,
  OfferActionIcon,
  SearchNavIcon,
  SwapDealIcon
} from "../components/AppIcons";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { formatCashAmountValue, formatDateTimeValue, formatDistanceKmValue, formatIntegerValue, formatRatingValue } from "../lib/format";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { PageState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { SwapRequestCard } from "../components/SwapRequestCard";
import { swapService } from "../services";

type InboxViewTab = "active" | "history";
type OfferDirection = "received" | "sent";
type OfferEntry = { offer: OfferCardModel; direction: OfferDirection };

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
  openAdd,
  openShop,
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
  openAdd: () => void;
  openShop: () => void;
  onBack?: () => void;
}) {
  const [sentOffers, setSentOffers] = useState<OfferCardModel[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<OfferCardModel[]>([]);
  const [shipments, setShipments] = useState<Record<string, any>>({});
  const [offerDetails, setOfferDetails] = useState<Record<string, OfferDetail>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<InboxViewTab>("active");

  useEffect(() => {
    setActiveTab("active");
  }, [initialTab]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      Promise.all([
        swapService.listSentOffers(),
        swapService.listReceivedOffers()
      ]).then(([sent, received]) => ({ sent: sent || [], received: received || [] }))
    ])
      .then(async ([offerResponse]) => {
        if (!live) return;
        setSentOffers(offerResponse.sent);
        setReceivedOffers(offerResponse.received);

        const allOffers = [...offerResponse.received, ...offerResponse.sent];
        const detailPairs = await Promise.all(
          allOffers.map((offer) =>
            swapService.getOfferDetail(offer.id)
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
              swapService.getShipment(offer.id)
                .then((data) => [offer.id, data] as const)
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
        title="ดีลของฉัน"
        subtitle="ติดตามข้อเสนอที่ต้องตอบ ดีลที่กำลังคุย และประวัติไว้ในหน้าเดียว"
        onBack={onBack}
      />
    );
  }
  const currentUserId = user.id;

  const activeStatuses = new Set(["pending", "accepted_by_receiver", "accepted"]);
  const historyStatuses = new Set(["confirmed", "rejected", "cancelled"]);

  const groupedOffers = useMemo(() => {
    const receivedEntries: OfferEntry[] = receivedOffers.map((offer) => ({ offer, direction: "received" }));
    const sentEntries: OfferEntry[] = sentOffers.map((offer) => ({ offer, direction: "sent" }));
    const allEntries = [...receivedEntries, ...sentEntries].sort((left, right) => {
      const leftTime = new Date(offerDetails[left.offer.id]?.offer.created_at || 0).getTime();
      const rightTime = new Date(offerDetails[right.offer.id]?.offer.created_at || 0).getTime();
      return rightTime - leftTime;
    });
    const needsAction = allEntries.filter(({ offer, direction }) => {
      const detail = offerDetails[offer.id];
      const shipment = shipments[offer.id];
      if (offer.status === "pending") return direction === "received";
      if (offer.status === "accepted_by_receiver") return direction === "sent";
      if (offer.status === "accepted") return shipment?.current_step === "finished";
      return false;
    });
    const active = allEntries.filter(({ offer }) => activeStatuses.has(offer.status));
    const activeIds = new Set(needsAction.map(({ offer }) => offer.id));
    const inProgress = active.filter(({ offer }) => !activeIds.has(offer.id));
    const history = allEntries.filter(({ offer }) => historyStatuses.has(offer.status));
    const completed = history.filter(({ offer }) => offer.status === "confirmed");
    const closed = history.filter(({ offer }) => offer.status !== "confirmed");
    return { needsAction, inProgress, completed, closed, active, history };
  }, [offerDetails, receivedOffers, sentOffers, shipments]);

  const heroStats = [
    { label: "ต้องตอบ", value: groupedOffers.needsAction.length, urgent: groupedOffers.needsAction.length > 0, icon: <OfferActionIcon size={14} /> },
    { label: "กำลังแลก", value: groupedOffers.active.length, icon: <ChatActionIcon size={14} /> },
    { label: "ประวัติ", value: groupedOffers.history.length, icon: <SwapDealIcon size={14} /> }
  ];

  function renderOfferGroup(title: string, rows: OfferEntry[]) {
    if (!rows.length) return null;
    return (
      <section className="offer-group-block" key={title}>
        <div className="offer-group-head">
          <b>{title}</b>
          <span>{rows.length} รายการ</span>
        </div>
        <div className="offer-section list">
          {rows.map(({ offer, direction }) => renderOfferCard(offer, direction))}
        </div>
      </section>
    );
  }

  const tabSections = activeTab === "active"
    ? [
        renderOfferGroup("ต้องทำต่อ", groupedOffers.needsAction),
        renderOfferGroup("กำลังแลก", groupedOffers.inProgress)
      ]
    : [
        renderOfferGroup("แลกสำเร็จแล้ว", groupedOffers.completed),
        renderOfferGroup("ปิดดีลแล้ว", groupedOffers.closed)
      ];

  const hasVisibleRows = tabSections.some(Boolean);

  function renderOfferCard(offer: OfferCardModel, direction: OfferDirection) {
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
    const primaryLabel = primaryActionLabel(detail, currentUserId);
    const secondaryLabel = direction === "received" && offer.status === "pending"
      ? "ปฏิเสธ"
      : canChat
        ? "เปิดแชท"
        : "ดูรายละเอียด";

    return (
      <SwapRequestCard
        offerId={offer.id}
        status={offer.status}
        otherPartyName={otherPartyName}
        otherPartyId={direction === "received" ? offer.from_user_id : offer.to_user_id}
        otherPartyAvatar={counterpartAvatar}
        otherPartyMeta={`⭐ ${formatRatingValue(counterpartRating) || "0.0"} (${formatIntegerValue(counterpartReviews)}) · ${counterpartCity}`}
        createdAt={createdAt}
        thumbnails={(offeredItems.length ? offeredItems : targetItem ? [targetItem] : []).map((item) => ({
          id: item.id,
          title: item.title,
          image: item.media.images[0],
          onOpen: () => void openItemById(item.id, item)
        }))}
        title={summaryLine}
        summary={messagePreview}
        targetLabel={targetLabel}
        targetTitle={targetItem?.title || offer.target_title || "สินค้าเป้าหมาย"}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        dangerSecondary={direction === "received" && offer.status === "pending"}
        onOpenProfile={() =>
          openProfile({
            id: direction === "received" ? offer.from_user_id : offer.to_user_id,
            email: "",
            display_name: otherPartyName,
            avatar_url: counterpartAvatar
          })
        }
        onOpenPrimary={() => openOfferDetail(offer.id, direction)}
        onOpenSecondary={() => (canChat && direction !== "received" ? openChat(offer.id, direction) : openOfferDetail(offer.id, direction))}
      />
    );
  }

  return (
    <section className="screen inbox-page">
      {onBack ? (
        <PageHeader
          title="ดีลของฉัน"
          subtitle="จัดการข้อเสนอที่ต้องตอบ ดีลที่กำลังคุย และประวัติในหน้าเดียว"
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
        <h1>ดีลของฉัน</h1>
      )}
      {!loading ? (
        <div className="panel offer-hub-hero">
          <div className="offer-hub-copy">
            <small>Deal Management Center</small>
            <b>ทุกดีลของคุณอยู่ที่นี่</b>
            <p>ดูดีลที่ต้องตอบ ดีลที่กำลังคุย และประวัติแบบไม่ต้องไล่หาในแชท</p>
          </div>
          <div className="offer-hub-stats">
            {heroStats.map((stat) => (
              <span key={stat.label} className={stat.urgent ? "urgent" : ""}>
                {stat.icon}
                {stat.label} <b>{stat.value}</b>
              </span>
            ))}
          </div>
          <div className="offer-hub-cta-row">
            <button type="button" className="primary" onClick={openAdd}>ลงประกาศสินค้า</button>
            <button type="button" className="secondary" onClick={openShop}>ไปร้านค้า</button>
          </div>
        </div>
      ) : null}
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading ? (
        <>
          <div className="segmented segmented--message" role="tablist" aria-label="ประเภทข้อเสนอ">
            <button
              type="button"
              className={activeTab === "active" ? "on" : ""}
              onClick={() => setActiveTab("active")}
              role="tab"
              aria-selected={activeTab === "active"}
            >
              กำลังแลก {groupedOffers.active.length ? <b>{groupedOffers.active.length}</b> : null}
            </button>
            <button
              type="button"
              className={activeTab === "history" ? "on" : ""}
              onClick={() => setActiveTab("history")}
              role="tab"
              aria-selected={activeTab === "history"}
            >
              ประวัติ {groupedOffers.history.length ? <b>{groupedOffers.history.length}</b> : null}
            </button>
          </div>
          {hasVisibleRows ? (
            <div>{tabSections}</div>
          ) : (
            <div className="offer-section list">
              <PageState
                state="empty"
                title={activeTab === "active" ? "ยังไม่มีดีลที่ต้องตาม" : "ยังไม่มีประวัติดีล"}
                summary={
                  activeTab === "active"
                    ? "ลงประกาศหรือส่งข้อเสนอ แล้วดีลที่กำลังคุยจะกลับมารวมที่นี่"
                    : "เมื่อดีลเสร็จหรือปิดไปแล้ว จะย้ายมารวมในแท็บนี้"
                }
                actions={
                  activeTab === "active"
                    ? []
                    : [{ label: "ดูกำลังแลก", onClick: () => setActiveTab("active"), variant: "secondary" }]
                }
              />
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
