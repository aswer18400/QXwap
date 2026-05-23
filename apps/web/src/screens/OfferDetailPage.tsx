import { useEffect, useMemo, useState } from "react";
import {
  ChatActionIcon,
  CheckIcon,
  DeliveryIcon,
  LocationMetaIcon,
  MapPinned,
  PickupIcon,
  PriceCashIcon,
  ProofIcon,
  RefreshCcw,
  Truck
} from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { Item, OfferDetail as OfferDetailModel, OfferLogistics, OfferTab, Shipment, User } from "../lib/types";
import type { RequireLogin } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { DealTypeBadge } from "../components/DealTypeBadge";

type ShipmentStep = "started" | "picked_up" | "in_transit" | "finished";
type ShippingMethod = "courier" | "meetup";
type ShippingPayer = "split" | "requester" | "owner";

type ScheduleDraft = {
  shipping_method: ShippingMethod;
  shipping_payer: ShippingPayer;
  pickup_window: string;
  meetup_location: string;
  meetup_maps_url: string;
  meetup_time: string;
  meetup_note: string;
};

function offerStatusLabel(status: string) {
  return (
    {
      pending: "รอการตอบรับ",
      accepted_by_receiver: "ตอบรับฝั่งแรกแล้ว",
      accepted: "พร้อมนัดรับและส่งมอบ",
      rejected: "ปฏิเสธข้อเสนอแล้ว",
      cancelled: "ยกเลิกข้อเสนอแล้ว",
      confirmed: "แลกสินค้าสำเร็จ"
    }[status] || status
  );
}

function shipmentStatusLabel(shipment: Shipment | null, logistics: OfferLogistics | null | undefined) {
  if (!shipment) {
    return logistics?.shipping_method === "meetup" ? "รอนัดสถานที่และเวลาแลกกันเอง" : "รอตกลงวิธีขนส่ง";
  }
  return (
    {
      started: logistics?.shipping_method === "meetup" ? "กำลังนัดเวลาและสถานที่" : "กำลังตกลงการจัดส่ง",
      picked_up: logistics?.shipping_method === "meetup" ? "นัดหมายถูกสร้างแล้ว" : "เริ่มรับของจากต้นทางแล้ว",
      in_transit: logistics?.shipping_method === "meetup" ? "อยู่ระหว่างพบกันเพื่อแลกสินค้า" : "กำลังส่งมอบสินค้า",
      finished: "ส่งมอบเสร็จ รอยืนยันรับของ"
    }[String(shipment.current_step || "started")] || "กำลังอัปเดต"
  );
}

function formatCashAmount(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!amount) return "";
  return `${amount.toLocaleString("th-TH")} บาท`;
}

function shippingPayerLabel(value?: string) {
  return (
    {
      split: "หารค่าขนส่งร่วมกัน",
      requester: "ผู้ขอ Xwap เป็นคนจ่าย",
      owner: "เจ้าของสินค้าเป็นคนจ่าย"
    }[String(value || "split")] || "ยังไม่ได้ระบุผู้จ่าย"
  );
}

function shippingMethodLabel(value?: string) {
  return value === "meetup" ? "นัดรับแลกกันเอง" : "ส่งผ่านขนส่ง";
}

function readProof(logistics: OfferLogistics | null | undefined, key: string) {
  if (!logistics?.proofs || typeof logistics.proofs !== "object") return "";
  return logistics.proofs[key] || "";
}

function readConfirmations(logistics: OfferLogistics | null | undefined) {
  if (!logistics?.receipt_confirmations || typeof logistics.receipt_confirmations !== "object") return {};
  return logistics.receipt_confirmations;
}

function readScheduleConfirmations(logistics: OfferLogistics | null | undefined) {
  if (!logistics?.schedule_confirmations || typeof logistics.schedule_confirmations !== "object") return {};
  return logistics.schedule_confirmations;
}

function summarizeOfferItems(items: Item[]) {
  if (!items.length) return "ยังไม่มีสินค้าแนบ";
  if (items.length === 1) return items[0].title;
  return `${items[0].title} และอีก ${items.length - 1} ชิ้น`;
}

export function OfferDetailPage({
  offerId,
  user,
  requireLogin,
  onBack,
  openItemById,
  onTradeOnward,
  openProfile,
  onOpenInbox,
  openChat
}: {
  offerId: string;
  user: User | null;
  requireLogin: RequireLogin;
  onBack: () => void;
  openItemById: (itemId: string, fallbackItem?: Item | null) => void | Promise<void>;
  onTradeOnward: (item: Item) => void;
  openProfile: (user: User) => void;
  onOpenInbox: (tab?: OfferTab) => void;
  openChat: (offerId: string, tab?: OfferTab) => void;
}) {
  const [detail, setDetail] = useState<OfferDetailModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [loadError, setLoadError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("item_condition");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    shipping_method: "courier",
    shipping_payer: "split",
    pickup_window: "",
    meetup_location: "",
    meetup_maps_url: "",
    meetup_time: "",
    meetup_note: ""
  });

  useEffect(() => {
    if (!user) return;
    let live = true;
    setLoading(true);
    setLoadError("");
    api<OfferDetailModel>(`/offers/${offerId}/detail`)
      .then((data) => {
        if (!live) return;
        setDetail(data);
      })
      .catch((error: Error) => live && setLoadError(error.message || "โหลดรายละเอียดข้อเสนอไม่สำเร็จ"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [offerId, user]);

  useEffect(() => {
    if (!user || !detail || detail.offer.status === "confirmed" || detail.offer.status === "rejected" || detail.offer.status === "cancelled") {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void api<OfferDetailModel>(`/offers/${offerId}/detail`)
        .then((data) => {
          setDetail(data);
          setLoadError("");
        })
        .catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [detail, offerId, user]);

  useEffect(() => {
    const logistics = detail?.offer.logistics;
    setScheduleDraft({
      shipping_method: logistics?.shipping_method === "meetup" ? "meetup" : "courier",
      shipping_payer: logistics?.shipping_payer === "requester" || logistics?.shipping_payer === "owner" ? logistics.shipping_payer : "split",
      pickup_window: logistics?.pickup_window || "",
      meetup_location: logistics?.meetup_location || detail?.target_item?.location.label || "",
      meetup_maps_url: logistics?.meetup_maps_url || detail?.target_item?.location.maps_url || "",
      meetup_time: logistics?.meetup_time || "",
      meetup_note: logistics?.meetup_note || ""
    });
  }, [detail?.offer.id, detail?.offer.logistics, detail?.target_item?.location.label, detail?.target_item?.location.maps_url]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="ข้อเสนอแลกสินค้า" />;

  const viewerId = user.id;
  const isRequester = detail?.offer.from_user_id === viewerId;
  const viewerRole = isRequester ? "requester" : "owner";
  const counterpartRole = isRequester ? "owner" : "requester";
  const logistics = detail?.offer.logistics || null;
  const confirmations = readConfirmations(logistics);
  const scheduleConfirmations = readScheduleConfirmations(logistics);
  const myItems = useMemo(() => {
    if (!detail) return [];
    return isRequester ? detail.offered_items : detail.target_item ? [detail.target_item] : [];
  }, [detail, isRequester]);
  const otherItems = useMemo(() => {
    if (!detail) return [];
    return isRequester ? (detail.target_item ? [detail.target_item] : []) : detail.offered_items;
  }, [detail, isRequester]);
  const tradeOnwardItems = useMemo(() => {
    if (!detail || detail.offer.status !== "confirmed") return [];
    return isRequester ? (detail.target_item ? [detail.target_item] : []) : detail.offered_items;
  }, [detail, isRequester]);
  const cashAmountLabel = detail ? formatCashAmount(detail.offer.cash_amount) : "";
  const mySectionTitle = "สินค้าฝั่งคุณ";
  const otherSectionTitle = isRequester ? "สินค้าที่คุณอยากได้" : "สินค้าที่อีกฝ่ายเสนอมา";
  const scheduleFieldsReady = Boolean(
    logistics?.pickup_window &&
    (logistics?.shipping_method !== "meetup" || (logistics?.meetup_location && logistics?.meetup_time))
  );
  const myScheduleConfirmed = Boolean(scheduleConfirmations[viewerId]);
  const counterpartUserId = detail ? (isRequester ? detail.offer.to_user_id : detail.offer.from_user_id) : "";
  const counterpartScheduleConfirmed = Boolean(counterpartUserId && scheduleConfirmations[counterpartUserId]);
  const totalScheduleConfirmations = [viewerId, counterpartUserId].filter((id, index, arr) => id && scheduleConfirmations[id] && arr.indexOf(id) === index).length;
  const scheduleFullyConfirmed = Boolean(
    detail &&
    detail.offer.from_user_id &&
    detail.offer.to_user_id &&
    scheduleConfirmations[detail.offer.from_user_id] &&
    scheduleConfirmations[detail.offer.to_user_id]
  );
  const canManageFulfillment = detail?.offer.status === "accepted" || detail?.offer.status === "confirmed";
  const myPickupProof = readProof(logistics, `${viewerRole}_pickup`);
  const myDropoffProof = readProof(logistics, `${viewerRole}_dropoff`);
  const counterpartPickupProof = readProof(logistics, `${counterpartRole}_pickup`);
  const counterpartDropoffProof = readProof(logistics, `${counterpartRole}_dropoff`);
  const myReceiptConfirmed = Boolean(confirmations[viewerId]);
  const totalReceiptConfirmations = Object.keys(confirmations).length;
  const returnRequestedByMe = detail?.offer.logistics?.return_requested_by === viewerId;
  const returnRequestedByOther = Boolean(detail?.offer.logistics?.return_requested_by) && !returnRequestedByMe;
  const canAdvanceToPickedUp = Boolean(myPickupProof);
  const canAdvanceToFinished = Boolean(myDropoffProof);
  const scheduleHint = scheduleDraft.shipping_method === "meetup"
    ? "ระบุสถานที่และเวลาให้ครบ แล้วทั้งสองฝ่ายกดยืนยันนัด"
    : "กำหนดช่วงเวลาและผู้จ่ายค่าขนส่ง ก่อนอีกฝ่ายกดยืนยันนัด";
  const detailSubtitle = detail?.offer.created_at
    ? `${isRequester ? detail.offer.to_name || "คู่ดีล" : detail.offer.from_name || "คู่ดีล"} · ${new Date(detail.offer.created_at).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    })}`
    : "รายละเอียดข้อเสนอ";

  async function reloadDetail() {
    const data = await api<OfferDetailModel>(`/offers/${offerId}/detail`);
    setDetail(data);
  }

  async function act(action: "accept" | "approve" | "reject" | "cancel", body: Record<string, string> = {}) {
    setLoadingAction(action);
    setLoadError("");
    try {
      await api(`/offers/${offerId}/${action}`, { method: "POST", body: JSON.stringify(body) });
      await reloadDetail();
    } catch (error: any) {
      setLoadError(error.message || "อัปเดตข้อเสนอไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function saveSchedule() {
    setLoadingAction("shipment-start");
    setLoadError("");
    try {
      await api(`/shipments/${offerId}/start`, {
        method: "POST",
        body: JSON.stringify({
          tracking_number: `QX-${offerId.slice(0, 8).toUpperCase()}`,
          pickup_window: scheduleDraft.pickup_window.trim(),
          shipping_payer: scheduleDraft.shipping_payer,
          shipping_method: scheduleDraft.shipping_method,
          meetup_location: scheduleDraft.meetup_location.trim(),
          meetup_maps_url: scheduleDraft.meetup_maps_url.trim(),
          meetup_time: scheduleDraft.meetup_time.trim(),
          meetup_note: scheduleDraft.meetup_note.trim()
        })
      });
      await reloadDetail();
    } catch (error: any) {
      setLoadError(error.message || "บันทึกแผนนัดรับไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function patchLogistics(nextLogistics: Partial<OfferLogistics>) {
    await api(`/offers/${offerId}/logistics`, {
      method: "PATCH",
      body: JSON.stringify({ logistics: nextLogistics })
    });
    await reloadDetail();
  }

  async function confirmSchedule() {
    if (!detail) return;
    setLoadingAction("confirm-schedule");
    setLoadError("");
    try {
      await patchLogistics({
        schedule_confirmations: {
          ...(logistics?.schedule_confirmations && typeof logistics.schedule_confirmations === "object"
            ? logistics.schedule_confirmations
            : {}),
          [viewerId]: new Date().toISOString()
        }
      });
    } catch (error: any) {
      setLoadError(error.message || "ยืนยันเวลานัดไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function uploadProof(kind: "pickup" | "dropoff", file?: File | null) {
    if (!file || !detail) return;
    setLoadingAction(`${kind}-proof`);
    setLoadError("");
    try {
      const fd = new FormData();
      fd.append("images", file);
      const uploaded = await api<{ urls: string[] }>("/upload", { method: "POST", body: fd });
      const url = uploaded.urls?.[0];
      if (!url) throw new Error("อัปโหลดหลักฐานไม่สำเร็จ");
      const currentProofs = logistics?.proofs && typeof logistics.proofs === "object" ? logistics.proofs : {};
      await patchLogistics({
        proofs: {
          ...currentProofs,
          [`${viewerRole}_${kind}`]: url
        }
      });
    } catch (error: any) {
      setLoadError(error.message || "อัปโหลดหลักฐานไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function updateShipment(step: ShipmentStep) {
    if (!detail?.shipment) return;
    setLoadingAction(step);
    setLoadError("");
    try {
      await api(`/shipments/${detail.shipment.id}/update-step`, {
        method: "POST",
        body: JSON.stringify({ current_step: step })
      });
      await reloadDetail();
    } catch (error: any) {
      setLoadError(error.message || "อัปเดตสถานะส่งมอบไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function finishShipment() {
    if (!detail?.shipment) return;
    setLoadingAction("finish");
    setLoadError("");
    try {
      await api(`/shipments/${detail.shipment.id}/finish`, { method: "POST", body: JSON.stringify({}) });
      await reloadDetail();
    } catch (error: any) {
      setLoadError(error.message || "ปิดขั้นตอนส่งมอบไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function confirmReceipt() {
    setLoadingAction("confirm-receipt");
    setLoadError("");
    try {
      await api(`/offers/${offerId}/confirm-receipt`, { method: "POST", body: JSON.stringify({}) });
      await reloadDetail();
    } catch (error: any) {
      setLoadError(error.message || "ยืนยันรับของไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function requestReturn() {
    const reason = window.prompt("ระบุเหตุผลการคืนสินค้า", detail?.offer.logistics?.return_reason || "ต้องการคืนสินค้า") || "";
    if (!reason.trim()) return;
    setLoadingAction("request-return");
    setLoadError("");
    try {
      await api(`/offers/${offerId}/request-return`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() })
      });
      await reloadDetail();
    } catch (error: any) {
      setLoadError(error.message || "ส่งคำขอคืนสินค้าไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  const steps = [
    {
      id: "accept",
      title: "1. ยืนยันข้อเสนอ",
      description: "เจ้าของสินค้าตอบรับก่อน แล้วผู้เสนอจึงยืนยันขั้นสุดท้ายเพื่อให้ดีลนี้เข้าสู่ขั้นนัดรับจริง",
      complete: Boolean(detail && detail.offer.status !== "pending" && detail.offer.status !== "rejected" && detail.offer.status !== "cancelled"),
      current: Boolean(detail && (detail.offer.status === "pending" || detail.offer.status === "accepted_by_receiver"))
    },
    {
      id: "schedule",
      title: "2. นัดเวลาและวิธีส่งมอบ",
      description: "เลือกว่าจะส่งขนส่งหรือเจอกันเอง ระบุคนจ่าย เวลา สถานที่ และให้ทั้งสองฝ่ายกดยืนยันนัด",
      complete: scheduleFieldsReady && scheduleFullyConfirmed,
      current: Boolean(detail && detail.offer.status === "accepted" && !scheduleFullyConfirmed)
    },
    {
      id: "proof",
      title: "3. ส่งมอบและแนบหลักฐาน",
      description: "แต่ละฝ่ายอัปโหลดหลักฐานก่อนและหลังส่งมอบไว้ในระบบ แล้วอัปเดตสถานะการจัดส่งตามลำดับ",
      complete: Boolean(detail?.shipment?.current_step === "finished"),
      current: Boolean(detail && detail.offer.status === "accepted" && detail.shipment && detail.shipment.current_step !== "finished")
    },
    {
      id: "confirm",
      title: "4. ยืนยันรับของหรือขอคืนสินค้า",
      description: "ทั้งสองฝ่ายต้องกดยืนยันรับของครบ ระบบจึงเปลี่ยนเป็นสำเร็จ หากมีปัญหาสามารถยื่นขอคืนสินค้าได้ก่อนปิดดีล",
      complete: detail?.offer.status === "confirmed",
      current: Boolean(detail && detail.offer.status === "accepted" && detail.shipment?.current_step === "finished")
    }
  ];

  function renderPrimaryAction() {
    if (!detail) return null;
    const { offer } = detail;
    if (offer.status === "pending") {
      if (offer.to_user_id === viewerId) {
        return (
          <div className="action-row">
            <button className="primary" disabled={loadingAction === "accept"} onClick={() => setShowAcceptConfirm(true)}>
              {loadingAction === "accept" ? "กำลังตอบรับ..." : "ตอบรับข้อเสนอ"}
            </button>
            <button className="danger" disabled={loadingAction === "reject"} onClick={() => setShowRejectConfirm(true)}>
              {loadingAction === "reject" ? "กำลังปฏิเสธ..." : "ปฏิเสธข้อเสนอ"}
            </button>
          </div>
        );
      }
      return (
        <div className="action-row">
          <button className="secondary" disabled={loadingAction === "cancel"} onClick={() => void act("cancel")}>
            {loadingAction === "cancel" ? "กำลังยกเลิก..." : "ยกเลิกข้อเสนอ"}
          </button>
        </div>
      );
    }
    if (offer.status === "accepted_by_receiver") {
      if (offer.from_user_id === viewerId) {
        return (
          <div className="action-row">
            <button className="primary" disabled={loadingAction === "approve"} onClick={() => void act("approve")}>
              {loadingAction === "approve" ? "กำลังยืนยัน..." : "ยืนยันข้อเสนอ"}
            </button>
            <button className="secondary" disabled={loadingAction === "cancel"} onClick={() => void act("cancel")}>
              {loadingAction === "cancel" ? "กำลังยกเลิก..." : "ยกเลิกข้อเสนอนี้"}
            </button>
          </div>
        );
      }
      return <div className="empty-inline">รอผู้เสนอคนแรกยืนยันข้อเสนอขั้นสุดท้าย</div>;
    }
    return null;
  }

  return (
    <section className="screen">
      <PageHeader title="รายละเอียดข้อเสนอ" subtitle={detailSubtitle} onBack={onBack} />
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && !detail ? <div className="empty">ไม่พบข้อเสนอ</div> : null}
      {!loading && detail ? (
        <>
          <div className="panel offer-detail-panel offer-detail-hero">
            <div className="offer-detail-status-line">
              <b className={`offer-status-pill offer-status-pill--${detail.offer.status}`}>{offerStatusLabel(detail.offer.status)}</b>
              <span>{shipmentStatusLabel(detail.shipment, logistics)}</span>
            </div>
            <div className="offer-party-line">
              <button
                type="button"
                className="offer-party-link"
                onClick={() => openProfile({ id: detail.offer.from_user_id, email: "", display_name: detail.offer.from_name, avatar_url: detail.offer.from_avatar })}
              >
                ผู้เสนอ: {detail.offer.from_name || "ผู้ขอข้อเสนอ"}
              </button>
              <button
                type="button"
                className="offer-party-link"
                onClick={() => openProfile({ id: detail.offer.to_user_id, email: "", display_name: detail.offer.to_name, avatar_url: detail.offer.to_avatar })}
              >
                เจ้าของสินค้า: {detail.offer.to_name || "เจ้าของสินค้า"}
              </button>
            </div>
            <div className="offer-hero-actions">
              <button type="button" className="secondary" onClick={() => onOpenInbox(isRequester ? "sent" : "received")}>กลับไปหน้าข้อเสนอ</button>
              {detail.conversation_id ? (
                <button type="button" className="primary offer-chat-entry" onClick={() => openChat(detail.offer.id, isRequester ? "sent" : "received")}>
                  <ChatActionIcon size={16} /> เปิดแชทคุยรายละเอียดดีลนี้
                </button>
              ) : (
                <div className="empty-inline">ยังไม่พบห้องแชทของข้อเสนอนี้</div>
              )}
            </div>
            {detail.offer.rejection_reason ? <p className="offer-note">เหตุผลปฏิเสธ: {detail.offer.rejection_reason}</p> : null}
            {renderPrimaryAction()}
          </div>

          <div className="panel offer-detail-panel offer-compare-shell">
            <div className="section-head compact offer-compare-head">
              <h2>กำลังแลกอะไรกับอะไร</h2>
            </div>
            <div className="offer-detail-columns">
              <div className="offer-compare-card">
                <b className="offer-compare-label">{mySectionTitle}</b>
                <p className="offer-compare-caption">{summarizeOfferItems(myItems)}</p>
                <div className="offer-detail-items">
                  {myItems.length ? myItems.map((item) => (
                    <button key={item.id} type="button" className="offer-visual-card" onClick={() => void openItemById(item.id, item)}>
                      <div className="offer-visual-card-photo">
                        <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
                      </div>
                      <div className="offer-visual-card-body">
                        <b>{item.title}</b>
                        <div className="offer-visual-card-meta">
                          <DealTypeBadge type={item.deal.type} />
                        </div>
                        <small>{item.location.label || "ยังไม่ระบุพื้นที่นัดรับ"}</small>
                      </div>
                    </button>
                  )) : <div className="empty-inline">ยังไม่มีสินค้าแนบ</div>}
                </div>
              </div>

              <div className="offer-compare-card">
                <b className="offer-compare-label">{otherSectionTitle}</b>
                <p className="offer-compare-caption">{summarizeOfferItems(otherItems)}</p>
                <div className="offer-detail-items">
                  {otherItems.length ? otherItems.map((item) => (
                    <button key={item.id} type="button" className="offer-visual-card" onClick={() => void openItemById(item.id, item)}>
                      <div className="offer-visual-card-photo">
                        <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
                      </div>
                      <div className="offer-visual-card-body">
                        <b>{item.title}</b>
                        <div className="offer-visual-card-meta">
                          <DealTypeBadge type={item.deal.type} />
                        </div>
                        <small>{item.location.label || "ยังไม่ระบุพื้นที่นัดรับ"}</small>
                      </div>
                    </button>
                  )) : <div className="empty-inline">ไม่มีรายการสินค้าฝั่งตรงข้าม</div>}
                </div>
              </div>
            </div>
            <div className="offer-detail-facts offer-detail-facts--summary">
              <div>
                <small>จำนวนสินค้าที่เสนอ</small>
                <b>{detail.offered_items.length || 0} ชิ้น</b>
                <p>{summarizeOfferItems(detail.offered_items)}</p>
              </div>
              {cashAmountLabel ? (
                <div>
                  <small>เงินสดที่เสนอเพิ่ม</small>
                  <b><PriceCashIcon size={14} /> {cashAmountLabel}</b>
                  <p>รวมอยู่ในดีลนี้พร้อมสินค้าที่แนบมา</p>
                </div>
              ) : null}
              {detail.offer.message ? (
                <div className="offer-detail-message">
                  <small>หมายเหตุจากผู้เสนอ</small>
                  <b>{detail.offer.message}</b>
                  <p>ข้อความนี้ถูกแนบมากับข้อเสนอเดิม</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel offer-detail-panel offer-status-panel">
            <div className="section-head compact offer-compare-head">
              <h2>ขั้นตอนดีลนี้</h2>
            </div>
            <div className="offer-steps">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`offer-step-row${step.complete ? " complete" : ""}${step.current ? " current" : ""}`}
                >
                  <span className="offer-step-dot">{step.complete ? <CheckIcon size={14} /> : null}</span>
                  <div className="offer-step-copy">
                    <b>{step.title}</b>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canManageFulfillment ? (
            <>
              <div className="panel offer-detail-panel offer-schedule-panel">
                <div className="section-head compact offer-compare-head">
                  <h2>2. นัดเวลาและกำหนดการส่งมอบ</h2>
                </div>
                <div className="offer-stage-banner">
                  <div>
                    <small>สิ่งที่ต้องทำในขั้นนี้</small>
                    <b>{scheduleHint}</b>
                  </div>
                  <span className={`offer-inline-state${scheduleFullyConfirmed ? " done" : ""}`}>
                    {scheduleFullyConfirmed ? "ยืนยันครบ 2 ฝ่าย" : `ยืนยันแล้ว ${totalScheduleConfirmations}/2 ฝ่าย`}
                  </span>
                </div>
                <div className="offer-detail-facts">
                  <div>
                    <small>รูปแบบการส่งมอบ</small>
                    <div className="offer-method-switch">
                      <button
                        type="button"
                        className={scheduleDraft.shipping_method === "courier" ? "on" : ""}
                        onClick={() => setScheduleDraft((current) => ({ ...current, shipping_method: "courier" }))}
                      >
                        ส่งขนส่ง
                      </button>
                      <button
                        type="button"
                        className={scheduleDraft.shipping_method === "meetup" ? "on" : ""}
                        onClick={() => setScheduleDraft((current) => ({ ...current, shipping_method: "meetup" }))}
                      >
                        นัดรับแลกกันเอง
                      </button>
                    </div>
                  </div>
                  <div>
                    <small>ใครจ่ายค่าขนส่ง</small>
                    <select
                      value={scheduleDraft.shipping_payer}
                      onChange={(event) => setScheduleDraft((current) => ({ ...current, shipping_payer: event.target.value as ShippingPayer }))}
                    >
                      <option value="split">หารร่วมกัน</option>
                      <option value="requester">ผู้ขอ Xwap</option>
                      <option value="owner">เจ้าของสินค้า</option>
                    </select>
                  </div>
                  <div>
                    <small>{scheduleDraft.shipping_method === "meetup" ? "เวลานัดพบ" : "ช่วงเวลานัดรับหรือวันส่ง"}</small>
                    <input
                      value={scheduleDraft.pickup_window}
                      onChange={(event) => setScheduleDraft((current) => ({ ...current, pickup_window: event.target.value }))}
                      placeholder={scheduleDraft.shipping_method === "meetup" ? "เช่น เสาร์ 25 พ.ค. 18:30" : "เช่น ส่งพรุ่งนี้ช่วงบ่าย / รับของเสาร์ 18:00"}
                    />
                  </div>
                  {scheduleDraft.shipping_method === "meetup" ? (
                    <>
                      <div>
                        <small>เวลานัดพบ</small>
                        <input
                          value={scheduleDraft.meetup_time}
                          onChange={(event) => setScheduleDraft((current) => ({ ...current, meetup_time: event.target.value }))}
                          placeholder="เช่น เสาร์ 25 พ.ค. 18:30"
                        />
                      </div>
                      <div>
                        <small>สถานที่นัดรับ</small>
                        <input
                          value={scheduleDraft.meetup_location}
                          onChange={(event) => setScheduleDraft((current) => ({ ...current, meetup_location: event.target.value }))}
                          placeholder="เช่น BTS อารีย์ ทางออก 3"
                        />
                      </div>
                      <div>
                        <small>ลิงก์แผนที่</small>
                        <input
                          value={scheduleDraft.meetup_maps_url}
                          onChange={(event) => setScheduleDraft((current) => ({ ...current, meetup_maps_url: event.target.value }))}
                          placeholder="https://maps.google.com/..."
                        />
                      </div>
                      <div>
                        <small>หมายเหตุหน้างาน</small>
                        <input
                          value={scheduleDraft.meetup_note}
                          onChange={(event) => setScheduleDraft((current) => ({ ...current, meetup_note: event.target.value }))}
                          placeholder="เช่น เจอกันหน้าร้านกาแฟ / ตรวจสภาพก่อนแลก"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="offer-detail-facts offer-detail-facts--schedule">
                  <div>
                    <small>สรุปวิธีส่งมอบ</small>
                    <b>{shippingMethodLabel(scheduleDraft.shipping_method)}</b>
                    <p>{shippingPayerLabel(scheduleDraft.shipping_payer)}</p>
                  </div>
                  <div>
                    <small>สถานะการยืนยันนัด</small>
                    <b>{myScheduleConfirmed ? "คุณยืนยันนัดแล้ว" : "ยังรอคุณกดยืนยันนัด"}</b>
                    <p>{counterpartScheduleConfirmed ? "อีกฝ่ายยืนยันแล้ว" : "อีกฝ่ายยังไม่ยืนยันนัด"}</p>
                  </div>
                  {scheduleDraft.shipping_method === "meetup" ? (
                    <div>
                      <small>สถานที่และเวลานัด</small>
                      <b>{scheduleDraft.meetup_location || "ยังไม่ระบุสถานที่"}</b>
                      <p>{scheduleDraft.meetup_time || scheduleDraft.pickup_window || "ยังไม่ระบุเวลา"}</p>
                    </div>
                  ) : (
                    <div>
                      <small>ช่วงเวลานัดรับหรือส่ง</small>
                      <b>{scheduleDraft.pickup_window || "ยังไม่ระบุเวลา"}</b>
                      <p>แก้ไขได้เสมอ หากเปลี่ยนเวลา ระบบจะให้ยืนยันนัดใหม่อีกครั้ง</p>
                    </div>
                  )}
                </div>
                <div className="action-row offer-detail-sticky-actions">
                  <button
                    className="primary wide"
                    disabled={
                      loadingAction === "shipment-start" ||
                      !scheduleDraft.pickup_window.trim() ||
                      (scheduleDraft.shipping_method === "meetup" && (!scheduleDraft.meetup_location.trim() || !scheduleDraft.meetup_time.trim()))
                    }
                    onClick={() => void saveSchedule()}
                  >
                    {loadingAction === "shipment-start" ? "กำลังบันทึก..." : detail.shipment ? "บันทึกและรีเซ็ตการยืนยันนัด" : "บันทึกแผนนัดรับ"}
                  </button>
                  <button
                    className="secondary wide"
                    disabled={loadingAction === "confirm-schedule" || !scheduleFieldsReady || myScheduleConfirmed}
                    onClick={() => void confirmSchedule()}
                  >
                    {loadingAction === "confirm-schedule" ? "กำลังยืนยันนัด..." : myScheduleConfirmed ? "คุณยืนยันนัดแล้ว" : "ยืนยันเวลานัดฝั่งคุณ"}
                  </button>
                </div>
              </div>

              <div className="panel offer-detail-panel offer-status-panel">
                <div className="section-head compact offer-compare-head">
                  <h2>3. สถานะส่งมอบ</h2>
                </div>
                <div className="offer-detail-facts">
                  <div>
                    <small>สถานะปัจจุบัน</small>
                    <b>{shipmentStatusLabel(detail.shipment, logistics)}</b>
                  </div>
                  <div>
                    <small>วิธีส่งมอบ</small>
                    <b>{shippingMethodLabel(logistics?.shipping_method)}</b>
                    <p>{shippingPayerLabel(logistics?.shipping_payer)}</p>
                  </div>
                  <div>
                    <small>การยืนยันนัดเวลา</small>
                    <b>{scheduleFullyConfirmed ? "ครบทั้งสองฝ่ายแล้ว" : `ยืนยันแล้ว ${totalScheduleConfirmations}/2 ฝ่าย`}</b>
                    <p>{myScheduleConfirmed ? "คุณกดยืนยันนัดแล้ว" : "ยังรอคุณกดยืนยันนัด"}</p>
                  </div>
                  {logistics?.meetup_location ? (
                    <div>
                      <small>สถานที่นัดรับ</small>
                      <b><LocationMetaIcon size={14} /> {logistics.meetup_location}</b>
                      {logistics.meetup_time ? <p>{logistics.meetup_time}</p> : null}
                    </div>
                  ) : null}
                  {detail.target_item?.location.maps_url ? (
                    <div>
                      <small>แผนที่</small>
                      <a className="secondary wide detail-map-link" href={logistics?.meetup_maps_url || detail.target_item.location.maps_url} target="_blank" rel="noreferrer">
                        <MapPinned size={16} /> เปิดแผนที่
                      </a>
                    </div>
                  ) : null}
                </div>
                {detail.shipment ? (
                  <div className="action-row">
                    {detail.shipment.current_step === "started" ? (
                      <button
                        className="primary wide"
                        disabled={loadingAction === "picked_up" || !canAdvanceToPickedUp || !scheduleFullyConfirmed}
                        onClick={() => void updateShipment("picked_up")}
                      >
                        {loadingAction === "picked_up" ? "กำลังอัปเดต..." : "ยืนยันว่าเริ่มรับของแล้ว"}
                      </button>
                    ) : null}
                    {detail.shipment.current_step === "picked_up" ? (
                      <button className="primary wide" disabled={loadingAction === "in_transit"} onClick={() => void updateShipment("in_transit")}>
                        {loadingAction === "in_transit" ? "กำลังอัปเดต..." : "ยืนยันว่าอยู่ระหว่างส่งมอบ"}
                      </button>
                    ) : null}
                    {detail.shipment.current_step === "in_transit" ? (
                      <button
                        className="primary wide"
                        disabled={loadingAction === "finish" || !canAdvanceToFinished}
                        onClick={() => void finishShipment()}
                      >
                        {loadingAction === "finish" ? "กำลังอัปเดต..." : "ยืนยันว่าจบการส่งมอบแล้ว"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {detail.shipment?.current_step === "started" && !canAdvanceToPickedUp ? (
                  <div className="empty-inline">อัปโหลดหลักฐานก่อนส่งมอบของคุณก่อน แล้วค่อยขยับไปขั้นรับของ</div>
                ) : null}
                {detail.shipment?.current_step === "started" && !scheduleFullyConfirmed ? (
                  <div className="empty-inline">ต้องให้ทั้งสองฝ่ายยืนยันเวลานัดครบก่อน จึงจะเริ่มขั้นตอนรับของได้</div>
                ) : null}
                {detail.shipment?.current_step === "in_transit" && !canAdvanceToFinished ? (
                  <div className="empty-inline">อัปโหลดหลักฐานหลังส่งมอบของคุณก่อน แล้วค่อยปิดขั้นตอนนี้</div>
                ) : null}
              </div>

              <div className="panel offer-detail-panel offer-status-panel">
                <div className="section-head compact offer-compare-head">
                  <h2>3.1 หลักฐานก่อนและหลังส่งมอบ</h2>
                </div>
                <div className="offer-proof-grid">
                  <label className="offer-proof-card">
                    <input type="file" accept="image/*" onChange={(event) => void uploadProof("pickup", event.target.files?.[0] || null)} />
                    <span className="offer-proof-icon"><PickupIcon size={16} /></span>
                    <b>หลักฐานก่อนส่งมอบของคุณ</b>
                    <p>{myPickupProof ? "อัปโหลดแล้ว" : "อัปโหลดรูปสภาพสินค้าหรือจุดนัดรับ"}</p>
                  </label>
                  <div className={`offer-proof-card${counterpartPickupProof ? " complete" : ""}`}>
                    <span className="offer-proof-icon"><ProofIcon size={16} /></span>
                    <b>หลักฐานก่อนส่งมอบของอีกฝ่าย</b>
                    <p>{counterpartPickupProof ? "อีกฝ่ายอัปโหลดแล้ว" : "รออีกฝ่ายอัปโหลด"}</p>
                  </div>
                  <label className="offer-proof-card">
                    <input type="file" accept="image/*" onChange={(event) => void uploadProof("dropoff", event.target.files?.[0] || null)} />
                    <span className="offer-proof-icon"><DeliveryIcon size={16} /></span>
                    <b>หลักฐานหลังส่งมอบของคุณ</b>
                    <p>{myDropoffProof ? "อัปโหลดแล้ว" : "อัปโหลดรูปหลังรับหรือส่งมอบเสร็จ"}</p>
                  </label>
                  <div className={`offer-proof-card${counterpartDropoffProof ? " complete" : ""}`}>
                    <span className="offer-proof-icon"><ProofIcon size={16} /></span>
                    <b>หลักฐานหลังส่งมอบของอีกฝ่าย</b>
                    <p>{counterpartDropoffProof ? "อีกฝ่ายอัปโหลดแล้ว" : "รออีกฝ่ายอัปโหลด"}</p>
                  </div>
                </div>
                {loadingAction === "pickup-proof" || loadingAction === "dropoff-proof" ? (
                  <p className="offer-upload-hint">กำลังอัปโหลดหลักฐาน...</p>
                ) : null}
              </div>

              <div className="panel offer-detail-panel offer-status-panel">
                <div className="section-head compact offer-compare-head">
                  <h2>4. ยืนยันรับของหรือขอคืนสินค้า</h2>
                </div>
                <div className="offer-detail-facts">
                  <div>
                    <small>สถานะการยืนยันรับของ</small>
                    <b>{totalReceiptConfirmations}/2 ฝ่ายยืนยันแล้ว</b>
                    <p>{myReceiptConfirmed ? "คุณยืนยันรับของแล้ว" : "ยังรอการยืนยันจากคุณ"}</p>
                  </div>
                  {returnRequestedByMe || returnRequestedByOther ? (
                    <div className="offer-return-box">
                      <small>สถานะการคืนสินค้า</small>
                      <b>{returnRequestedByMe ? "คุณส่งคำขอคืนสินค้าแล้ว" : "อีกฝ่ายร้องขอคืนสินค้า"}</b>
                      {detail.offer.logistics?.return_reason ? <p>{detail.offer.logistics.return_reason}</p> : null}
                    </div>
                  ) : null}
                </div>
                {detail.shipment?.current_step === "finished" && detail.offer.status !== "confirmed" ? (
                  <div className="action-row">
                    <button className="primary" disabled={loadingAction === "confirm-receipt" || myReceiptConfirmed} onClick={() => void confirmReceipt()}>
                      {loadingAction === "confirm-receipt" ? "กำลังยืนยัน..." : myReceiptConfirmed ? "คุณยืนยันแล้ว" : "ยืนยันรับของเรียบร้อย"}
                    </button>
                    <button className="secondary" disabled={loadingAction === "request-return"} onClick={() => void requestReturn()}>
                      {loadingAction === "request-return" ? "กำลังส่งคำขอ..." : "ขอคืนสินค้า"}
                    </button>
                  </div>
                ) : (
                  <div className="empty-inline">ปุ่มยืนยันรับของจะเปิดหลังขั้นตอนส่งมอบเสร็จแล้ว</div>
                )}
              </div>
            </>
          ) : null}

          {detail.offer.status === "confirmed" && tradeOnwardItems.length ? (
            <div className="panel offer-detail-panel offer-status-panel">
              <div className="section-head compact offer-compare-head">
                <h2>แลกต่อจากดีลนี้</h2>
              </div>
              <div className="offer-detail-items">
                {tradeOnwardItems.map((item) => (
                  <button key={`trade-onward-${item.id}`} type="button" className="offer-item primary-offer-action" onClick={() => onTradeOnward(item)}>
                    <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
                    <span>
                      <b><RefreshCcw size={14} /> แลกต่อ {item.title}</b>
                      <small>ใช้สินค้าที่ได้จากดีลนี้ไปเปิดข้อเสนอใหม่ต่อได้ทันที</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {showAcceptConfirm ? (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAcceptConfirm(false)}>
          <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="accept-offer-title">
            <div className="sheet-head">
              <h2 id="accept-offer-title">ยืนยันการตอบรับข้อเสนอ</h2>
            </div>
            <p>ถ้าตอบรับตอนนี้ ระบบจะรออีกฝ่ายยืนยันให้ครบก่อนเปิดแชทและเริ่มขั้นตอนนัดรับสินค้า</p>
            <div className="sheet-actions">
              <button type="button" className="secondary" onClick={() => setShowAcceptConfirm(false)}>
                กลับไปดูก่อน
              </button>
              <button
                type="button"
                className="primary"
                disabled={loadingAction === "accept"}
                onClick={() => {
                  setShowAcceptConfirm(false);
                  void act("accept");
                }}
              >
                {loadingAction === "accept" ? "กำลังตอบรับ..." : "ยืนยันการตอบรับ"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showRejectConfirm ? (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowRejectConfirm(false)}>
          <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="reject-offer-title">
            <div className="sheet-head">
              <h2 id="reject-offer-title">ยืนยันการปฏิเสธข้อเสนอ</h2>
            </div>
            <p>ถ้าปฏิเสธตอนนี้ ระบบจะยังไม่เปิดแชทและไม่เริ่มขั้นตอนจัดส่งสำหรับข้อเสนอนี้</p>
            <label className="form-stack">
              <span>เหตุผลถ้าปฏิเสธ</span>
              <select value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)}>
                <option value="item_condition">สภาพสินค้าไม่ตรง</option>
                <option value="distance">ระยะทางหรือขนส่งไม่สะดวก</option>
                <option value="offer_value">มูลค่าข้อเสนอไม่เหมาะสม</option>
                <option value="changed_mind">เปลี่ยนใจ</option>
              </select>
            </label>
            <div className="sheet-actions">
              <button type="button" className="secondary" onClick={() => setShowRejectConfirm(false)}>
                กลับไปตรวจอีกครั้ง
              </button>
              <button
                type="button"
                className="danger"
                disabled={loadingAction === "reject"}
                onClick={() => {
                  setShowRejectConfirm(false);
                  void act("reject", { rejection_reason: rejectionReason });
                }}
              >
                {loadingAction === "reject" ? "กำลังปฏิเสธ..." : "ยืนยันปฏิเสธ"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
