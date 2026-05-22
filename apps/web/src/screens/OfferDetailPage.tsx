import { useEffect, useMemo, useState } from "react";
import { ChatActionIcon, MapPinned, Truck } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { InboxTab, Item, OfferDetail as OfferDetailModel, Shipment, User } from "../lib/types";
import type { RequireLogin } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { InboxSkeleton } from "../components/Skeletons";
import { DealTypeBadge } from "../components/DealTypeBadge";

function offerStatusLabel(status: string) {
  return (
    {
      pending: "รอการตอบรับ",
      accepted_by_receiver: "อีกฝ่ายตอบรับแล้ว",
      accepted: "ทั้งสองฝ่ายตอบรับแล้ว",
      rejected: "ปฏิเสธข้อเสนอแล้ว",
      cancelled: "ยกเลิกข้อเสนอแล้ว",
      confirmed: "แลกสินค้าสำเร็จ"
    }[status] || status
  );
}

function shipmentStatusLabel(shipment: Shipment | null) {
  const currentStep = String(shipment?.current_step || "started");
  return (
    {
      started: "กำลังนัดรับสินค้า",
      picked_up: "รับของจากต้นทางแล้ว",
      in_transit: "กำลังจัดส่ง",
      finished: "ส่งของครบแล้ว"
    }[currentStep] || currentStep
  );
}

function nextActionCopy(detail: OfferDetailModel, currentUserId: string) {
  const { offer, shipment } = detail;
  if (offer.status === "pending") {
    return offer.to_user_id === currentUserId
      ? "เลือกยอมรับหรือปฏิเสธข้อเสนอ"
      : "รออีกฝ่ายตอบรับ";
  }
  if (offer.status === "accepted_by_receiver") {
    return offer.from_user_id === currentUserId
      ? "ยืนยันรับข้อเสนอเพื่อเปิดแชทและเริ่มนัดรับ"
      : "รออีกฝ่ายยืนยันให้ครบก่อนเปิดแชท";
  }
  if (offer.status === "accepted") {
    if (!shipment) return "เริ่มนัดรับหรือขนส่ง";
    if (shipment.current_step === "started") return "อัปเดตว่าเริ่มรับของตามนัดแล้ว";
    if (shipment.current_step === "picked_up") return "อัปเดตว่ากำลังเดินทางไปส่งของ";
    if (shipment.current_step === "in_transit") return "ปิดงานเมื่อส่งของครบตามนัดแล้ว";
    return "ยืนยันสำเร็จเพื่อปิดดีล";
  }
  if (offer.status === "confirmed") return "ดีลนี้เสร็จสมบูรณ์แล้ว";
  if (offer.status === "rejected") return `ข้อเสนอถูกปฏิเสธ${offer.rejection_reason ? `: ${offer.rejection_reason}` : ""}`;
  if (offer.status === "cancelled") return "ข้อเสนอนี้ถูกยกเลิกแล้ว";
  return "ไม่มีขั้นตอนถัดไป";
}

function formatCashAmount(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!amount) return "";
  return `${amount.toLocaleString("th-TH")} บาท`;
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
  onOpenInbox: (tab?: InboxTab) => void;
  openChat: (offerId: string) => void;
}) {
  const [detail, setDetail] = useState<OfferDetailModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [loadError, setLoadError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("item_condition");
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [pickupWindow, setPickupWindow] = useState("");
  const [shippingPayer, setShippingPayer] = useState("split");

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
    setPickupWindow(detail?.offer.logistics?.pickup_window || "");
    setShippingPayer(detail?.offer.logistics?.shipping_payer || "split");
  }, [detail?.offer.id, detail?.offer.logistics?.pickup_window, detail?.offer.logistics?.shipping_payer]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="ข้อเสนอแลกสินค้า" />;
  const viewerId = user.id;

  const isRequester = detail?.offer.from_user_id === viewerId;
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
  const mySectionTitle = "สินค้าของคุณ";
  const otherSectionTitle = isRequester ? "สินค้าที่คุณอยากได้" : "สินค้าที่อีกฝ่ายเสนอมา";

  async function reloadDetail() {
    const data = await api<OfferDetailModel>(`/offers/${offerId}/detail`);
    setDetail(data);
  }

  async function act(action: "accept" | "approve" | "reject" | "cancel" | "confirm", body: Record<string, string> = {}) {
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

  async function startShipment() {
    setLoadingAction("shipment-start");
    setLoadError("");
    try {
      await api(`/shipments/${offerId}/start`, {
        method: "POST",
        body: JSON.stringify({
          tracking_number: `QX-${offerId.slice(0, 8).toUpperCase()}`,
          pickup_window: pickupWindow.trim(),
          shipping_payer: shippingPayer
        })
      });
      await reloadDetail();
    } catch (error: any) {
      setLoadError(error.message || "เริ่มขนส่งไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function updateShipment(step: string) {
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
      setLoadError(error.message || "อัปเดตขนส่งไม่สำเร็จ");
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
      setLoadError(error.message || "ปิดงานขนส่งไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  function renderPrimaryAction() {
    if (!detail) return null;
    const { offer, shipment } = detail;
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
              {loadingAction === "approve" ? "กำลังยืนยัน..." : "ยืนยันรับข้อเสนอ"}
            </button>
            <button className="secondary" disabled={loadingAction === "cancel"} onClick={() => void act("cancel")}>
              {loadingAction === "cancel" ? "กำลังยกเลิก..." : "ยกเลิกข้อเสนอนี้"}
            </button>
          </div>
        );
      }
      return (
        <div className="action-row">
          <button className="secondary" disabled>
            รออีกฝ่ายยืนยัน
          </button>
        </div>
      );
    }
    if (!(offer.status === "accepted" || offer.status === "confirmed")) return null;
    if (!shipment) {
      return (
        <div className="offer-schedule-box">
          <div className="offer-schedule-copy">
            <small>เมื่อตกลงกันแล้ว ค่อยนัดเวลาและผู้รับผิดชอบค่าเดินทางตรงนี้</small>
          </div>
          <label className="form-stack">
            <span>ช่วงเวลานัดรับสินค้า</span>
            <input
              value={pickupWindow}
              onChange={(event) => setPickupWindow(event.target.value)}
              placeholder="เช่น เสาร์ 18:00-20:00 ที่ BTS อารีย์"
            />
          </label>
          <label className="form-stack">
            <span>ใครรับผิดชอบค่าเดินทาง</span>
            <select value={shippingPayer} onChange={(event) => setShippingPayer(event.target.value)}>
              <option value="split">หารร่วมกัน</option>
              <option value="requester">ผู้ขอ Xwap</option>
              <option value="owner">เจ้าของสินค้า</option>
            </select>
          </label>
          <div className="action-row offer-detail-sticky-actions">
            <button
              className="primary wide"
              disabled={loadingAction === "shipment-start" || !pickupWindow.trim()}
              onClick={() => void startShipment()}
            >
              {loadingAction === "shipment-start" ? "กำลังเริ่ม..." : "ยืนยันเวลานัดรับ"}
            </button>
          </div>
        </div>
      );
    }
    if (shipment.current_step === "started") {
      return (
        <div className="action-row">
          <button className="primary wide" disabled={loadingAction === "picked_up"} onClick={() => void updateShipment("picked_up")}>
            {loadingAction === "picked_up" ? "กำลังอัปเดต..." : "รับของแล้ว"}
          </button>
        </div>
      );
    }
    if (shipment.current_step === "picked_up") {
      return (
        <div className="action-row">
          <button className="primary wide" disabled={loadingAction === "in_transit"} onClick={() => void updateShipment("in_transit")}>
            {loadingAction === "in_transit" ? "กำลังอัปเดต..." : "กำลังจัดส่ง"}
          </button>
        </div>
      );
    }
    if (shipment.current_step === "in_transit") {
      return (
        <div className="action-row">
          <button className="primary wide" disabled={loadingAction === "finish"} onClick={() => void finishShipment()}>
            {loadingAction === "finish" ? "กำลังปิดงาน..." : "ส่งของแล้ว"}
          </button>
        </div>
      );
    }
    if (shipment.current_step === "finished" && offer.status !== "confirmed") {
      return (
        <div className="action-row">
          <button className="primary wide" disabled={loadingAction === "confirm"} onClick={() => void act("confirm")}>
            {loadingAction === "confirm" ? "กำลังยืนยัน..." : "ยืนยันว่าแลกสำเร็จแล้ว"}
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <section className="screen">
      <PageHeader title="ข้อเสนอแลกสินค้า" onBack={onBack} />
      {loadError ? <p className="err" role="alert">{loadError}</p> : null}
      {loading ? <InboxSkeleton /> : null}
      {!loading && !detail ? <div className="empty">ไม่พบข้อเสนอ</div> : null}
      {!loading && detail ? (
        <>
          <div className="panel offer-detail-panel offer-detail-hero">
            <div className="offer-detail-status-line">
              <b className="offer-status-pill">{offerStatusLabel(detail.offer.status)}</b>
              <span>{nextActionCopy(detail, viewerId)}</span>
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
          </div>

          <div className="panel offer-detail-panel offer-status-panel">
            <div className="section-head compact offer-compare-head">
              <h2>สถานะและขั้นตอนถัดไป</h2>
            </div>
            <div className="offer-detail-chat-inline">
              {!detail.chat_enabled ? (
                <div className="empty-inline">แชทจะเปิดเมื่อทั้งสองฝ่ายตอบรับข้อเสนอครบแล้ว</div>
              ) : (
                <button type="button" className="primary wide offer-chat-entry" onClick={() => openChat(detail.offer.id)}>
                  <ChatActionIcon size={16} /> พูดคุย
                </button>
              )}
              {detail.offer.status === "confirmed" && tradeOnwardItems.length ? (
                <div className="offer-detail-items">
                  {tradeOnwardItems.map((item) => (
                    <button key={`trade-onward-${item.id}`} type="button" className="offer-item primary-offer-action" onClick={() => onTradeOnward(item)}>
                      <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
                      <span>
                        <b>แลกต่อ {item.title}</b>
                        <small>แก้ข้อมูลสินค้าชิ้นเดิมแล้วเปิดดีลต่อได้ทันที</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="offer-detail-copy offer-detail-facts">
              <div>
                <small>สถานะปัจจุบัน</small>
                <b>{offerStatusLabel(detail.offer.status)}</b>
              </div>
              {cashAmountLabel ? (
                <div>
                  <small>เงินสดที่เสนอเพิ่ม</small>
                  <b>{cashAmountLabel}</b>
                </div>
              ) : null}
              {detail.offer.message ? (
                <div className="offer-detail-message">
                  <small>ข้อความจากผู้เสนอ</small>
                  <b>{detail.offer.message}</b>
                </div>
              ) : null}
              {detail.offer.logistics?.pickup_window || detail.offer.logistics?.shipping_payer ? (
                <div>
                  <small>การนัดรับ</small>
                  <b>{detail.offer.logistics?.pickup_window || "รอนัดเวลา"}</b>
                  <p className="logistics-line">
                    <Truck size={15} aria-hidden="true" /> {detail.offer.logistics?.shipping_payer || "หารร่วมกัน"}
                  </p>
                </div>
              ) : null}
              {(detail.offer.status === "accepted" || detail.offer.status === "confirmed") && detail.target_item?.location.label ? (
                <div>
                  <small>พื้นที่นัดรับ</small>
                  <b>{detail.target_item.location.label}</b>
                  {detail.shipment ? <p>{shipmentStatusLabel(detail.shipment)}{detail.shipment?.tracking_number ? ` · ${detail.shipment.tracking_number}` : ""}</p> : null}
                </div>
              ) : null}
            </div>
            {(detail.offer.status === "accepted" || detail.offer.status === "confirmed") && detail.target_item?.location.maps_url ? (
              <a className="secondary wide detail-map-link" href={detail.target_item.location.maps_url} target="_blank" rel="noreferrer">
                <MapPinned size={16} /> เปิดใน Google Maps
              </a>
            ) : null}
          </div>
        </>
      ) : null}
      {showAcceptConfirm ? (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAcceptConfirm(false)}>
          <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="accept-offer-title">
            <div className="sheet-head">
              <h2 id="accept-offer-title">ยืนยันการตอบรับข้อเสนอ</h2>
            </div>
            <p>ถ้าตอบรับตอนนี้ ระบบจะรอให้อีกฝ่ายยืนยันครบก่อนเปิดแชทและเริ่มนัดรับสินค้า</p>
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
            <p>ถ้าปฏิเสธตอนนี้ แชทและขั้นตอนนัดรับจะยังไม่เปิดสำหรับข้อเสนอนี้</p>
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
