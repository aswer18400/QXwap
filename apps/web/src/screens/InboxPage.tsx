import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { inboxTabs } from "../design-system";
import type { InboxTab, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";

export function InboxPage({
  user,
  requireLogin,
  items,
  openItem,
  openProfile,
  initialTab
}: {
  user: User | null;
  requireLogin: RequireLogin;
  items: Item[];
  openItem: (item: Item) => void;
  openProfile: (p: User) => void;
  initialTab: InboxTab;
}) {
  const [offers, setOffers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Record<string, any>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<InboxTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
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

  async function reloadOffers() {
    setLoadError("");
    const data = await api<{ offers: any[] }>("/offers");
    setOffers(data.offers);
    await loadShipments(data.offers);
  }

  async function act(id: string, action: string, body: Record<string, string> = {}) {
    setLoadingAction(`${id}:${action}`);
    setLoadError("");
    try {
      await api(`/offers/${id}/${action}`, { method: "POST", body: JSON.stringify(body) });
      await reloadOffers();
    } catch (error: any) {
      setLoadError(error.message || "อัปเดตข้อเสนอไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function startShipment(offerId: string) {
    setLoadingAction(`${offerId}:shipment-start`);
    setLoadError("");
    try {
      await api(`/shipments/${offerId}/start`, {
        method: "POST",
        body: JSON.stringify({ tracking_number: `QX-${offerId.slice(0, 8).toUpperCase()}` })
      });
      await reloadOffers();
    } catch (error: any) {
      setLoadError(error.message || "เริ่มขนส่งไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function updateShipment(shipmentId: string, step: string) {
    setLoadingAction(`${shipmentId}:${step}`);
    setLoadError("");
    try {
      await api(`/shipments/${shipmentId}/update-step`, {
        method: "POST",
        body: JSON.stringify({
          current_step: step,
          pickup_photo_url: step === "picked_up" ? "/uploads/courier-pickup-proof.jpg" : undefined
        })
      });
      await reloadOffers();
    } catch (error: any) {
      setLoadError(error.message || "อัปเดตสถานะขนส่งไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
  }

  async function finishShipment(shipmentId: string) {
    setLoadingAction(`${shipmentId}:finish`);
    setLoadError("");
    try {
      await api(`/shipments/${shipmentId}/finish`, {
        method: "POST",
        body: JSON.stringify({ dropoff_photo_url: "/uploads/courier-dropoff-proof.jpg" })
      });
      await reloadOffers();
    } catch (error: any) {
      setLoadError(error.message || "ปิดงานขนส่งไม่สำเร็จ");
    } finally {
      setLoadingAction("");
    }
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
    if (shipment.current_step === "finished" && offer.status !== "confirmed") return "ยืนยันสำเร็จเพื่อรับเครดิตรางวัลและปิดดีล";
    return "ดีลนี้พร้อมติดตามผลต่อจากรายการด้านบน";
  }

  function renderPrimaryAction(offer: any, shipment: any) {
    if (offer.status === "pending") {
      if (offer.to_user_id === currentUser.id) {
        return (
          <>
            <button disabled={loadingAction === `${offer.id}:accept`} onClick={() => act(offer.id, "accept")}>
              {loadingAction === `${offer.id}:accept` ? "กำลังยอมรับ..." : "ยอมรับ"}
            </button>
            <button
              disabled={loadingAction === `${offer.id}:reject`}
              onClick={() =>
                act(offer.id, "reject", {
                  rejection_reason: reasons[offer.id] || "item_condition"
                })
              }
            >
              {loadingAction === `${offer.id}:reject` ? "กำลังปฏิเสธ..." : "ปฏิเสธ"}
            </button>
          </>
        );
      }
      return (
        <button disabled={loadingAction === `${offer.id}:cancel`} onClick={() => act(offer.id, "cancel")}>
          {loadingAction === `${offer.id}:cancel` ? "กำลังยกเลิก..." : "ยกเลิกข้อเสนอ"}
        </button>
      );
    }
    if (!(offer.status === "accepted" || offer.status === "confirmed")) return null;
    if (!shipment) {
      return (
        <button className="primary" disabled={loadingAction === `${offer.id}:shipment-start`} onClick={() => startShipment(offer.id)}>
          {loadingAction === `${offer.id}:shipment-start` ? "กำลังเริ่มขนส่ง..." : "เริ่มขนส่ง"}
        </button>
      );
    }
    if (shipment.current_step === "started") {
      return (
        <button disabled={loadingAction === `${shipment.id}:picked_up`} onClick={() => updateShipment(shipment.id, "picked_up")}>
          {loadingAction === `${shipment.id}:picked_up` ? "กำลังอัปเดต..." : "รับของแล้ว"}
        </button>
      );
    }
    if (shipment.current_step === "picked_up") {
      return (
        <button disabled={loadingAction === `${shipment.id}:in_transit`} onClick={() => updateShipment(shipment.id, "in_transit")}>
          {loadingAction === `${shipment.id}:in_transit` ? "กำลังอัปเดต..." : "กำลังส่ง"}
        </button>
      );
    }
    if (shipment.current_step === "in_transit") {
      return (
        <button disabled={loadingAction === `${shipment.id}:finish`} onClick={() => finishShipment(shipment.id)}>
          {loadingAction === `${shipment.id}:finish` ? "กำลังปิดงาน..." : "ส่งของแล้ว"}
        </button>
      );
    }
    if (shipment.current_step === "finished" && offer.status !== "confirmed") {
      return (
        <button disabled={loadingAction === `${offer.id}:confirm`} onClick={() => act(offer.id, "confirm")}>
          {loadingAction === `${offer.id}:confirm` ? "กำลังยืนยัน..." : "ยืนยันสำเร็จ"}
        </button>
      );
    }
    return null;
  }

  return (
    <section className="screen">
      <h1>อินบ็อกซ์</h1>
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
      {loading ? <div className="empty">กำลังโหลดข้อเสนอและสถานะล่าสุด...</div> : null}
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
              <div className="panel offer-panel" key={o.id}>
                <div className="offer-top">
                  <button onClick={() => openProfile(sender)} aria-label={`เปิดโปรไฟล์ ${senderName}`}>
                    <img src={asset(senderAvatar)} alt={senderName} />
                    <span>{senderName}</span>
                  </button>
                  <button onClick={() => openProfile(owner)} aria-label={`เปิดโปรไฟล์ ${ownerName}`}>
                    <img src={asset(ownerAvatar)} alt={ownerName} />
                    <span>{ownerName}</span>
                  </button>
                </div>
                <button
                  className="offer-item"
                  onClick={() => (item ? openItem(item) : undefined)}
                  aria-label={`เปิดรายละเอียด ${o.target_title || "สินค้า"}`}
                >
                  <img src={asset(o.target_image) || wantedFallbacks.Other} alt={o.target_title || "สินค้า"} />
                  <span>
                    <b>{o.target_title || "สินค้า"}</b>
                    <small>สถานะ: {offerStatusLabel(o.status)}</small>
                  </span>
                </button>
                <p>{o.message || "ไม่มีข้อความ"}</p>
                <p>
                  เงินสด {o.cash_amount} · เครดิต {o.credit_amount}
                </p>
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
                {o.status === "pending" && o.to_user_id === user.id ? (
                  <label>
                    เหตุผลถ้าปฏิเสธ
                    <select
                      value={reasons[o.id] || "item_condition"}
                      onChange={(e) => setReasons({ ...reasons, [o.id]: e.target.value })}
                    >
                      <option value="item_condition">สภาพสินค้าไม่ตรง</option>
                      <option value="distance">ระยะทางหรือขนส่งไม่สะดวก</option>
                      <option value="offer_value">มูลค่าข้อเสนอไม่เหมาะสม</option>
                      <option value="changed_mind">เปลี่ยนใจ</option>
                    </select>
                  </label>
                ) : null}
                <div className="action-row">{renderPrimaryAction(o, shipment)}</div>
              </div>
            );
          })
        ) : (
          <div className="empty">ยังไม่มี Xwap</div>
        )
      ) : !loading && notifications.length ? (
        notifications.map((n) => (
          <div className="panel" key={n.id}>
            <b>{n.title}</b>
            <p>{n.body}</p>
          </div>
        ))
      ) : (
        <div className="empty">ยังไม่มีโนติฟิเคชัน</div>
      )}
    </section>
  );
}
