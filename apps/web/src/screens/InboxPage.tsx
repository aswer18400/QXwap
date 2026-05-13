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

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api<{ offers: any[] }>("/offers"),
      api<{ notifications: any[] }>("/notifications").catch(() => ({ notifications: [] }))
    ]).then(([o, n]) => {
      setOffers(o.offers);
      setNotifications(n.notifications);
      loadShipments(o.offers);
    });
  }, [user]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="ข้อเสนอ" />;

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
    const data = await api<{ offers: any[] }>("/offers");
    setOffers(data.offers);
    await loadShipments(data.offers);
  }

  async function act(id: string, action: string, body: Record<string, string> = {}) {
    await api(`/offers/${id}/${action}`, { method: "POST", body: JSON.stringify(body) });
    await reloadOffers();
  }

  async function startShipment(offerId: string) {
    await api(`/shipments/${offerId}/start`, {
      method: "POST",
      body: JSON.stringify({ tracking_number: `QX-${offerId.slice(0, 8).toUpperCase()}` })
    });
    await reloadOffers();
  }

  async function updateShipment(shipmentId: string, step: string) {
    await api(`/shipments/${shipmentId}/update-step`, {
      method: "POST",
      body: JSON.stringify({
        current_step: step,
        pickup_photo_url: step === "picked_up" ? "/uploads/courier-pickup-proof.jpg" : undefined
      })
    });
    await reloadOffers();
  }

  async function finishShipment(shipmentId: string) {
    await api(`/shipments/${shipmentId}/finish`, {
      method: "POST",
      body: JSON.stringify({ dropoff_photo_url: "/uploads/courier-dropoff-proof.jpg" })
    });
    await reloadOffers();
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
      {tab === "offers" ? (
        offers.length ? (
          offers.map((o) => {
            const item = items.find((x) => x.id === o.target_item_id);
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
                    <small>สถานะ: {o.status}</small>
                  </span>
                </button>
                <p>{o.message || "ไม่มีข้อความ"}</p>
                <p>
                  เงินสด {o.cash_amount} · เครดิต {o.credit_amount}
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
                    {shipments[o.id] ? (
                      <>
                        <p>
                          สถานะ {shipments[o.id].status} · ขั้นตอน {shipments[o.id].current_step || "started"} ·{" "}
                          {shipments[o.id].tracking_number || "ยังไม่มีเลขติดตาม"}
                        </p>
                        <div className="action-row">
                          <button onClick={() => updateShipment(shipments[o.id].id, "picked_up")}>
                            รับของแล้ว
                          </button>
                          <button onClick={() => updateShipment(shipments[o.id].id, "in_transit")}>
                            กำลังส่ง
                          </button>
                          <button onClick={() => finishShipment(shipments[o.id].id)}>
                            ส่งของแล้ว
                          </button>
                        </div>
                      </>
                    ) : (
                      <button className="primary" onClick={() => startShipment(o.id)}>
                        เริ่มขนส่ง
                      </button>
                    )}
                  </div>
                ) : null}
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
                <div className="action-row">
                  <button onClick={() => act(o.id, "accept")}>ยอมรับ</button>
                  <button
                    onClick={() =>
                      act(o.id, "reject", {
                        rejection_reason: reasons[o.id] || "item_condition"
                      })
                    }
                  >
                    ปฏิเสธ
                  </button>
                  <button onClick={() => act(o.id, "cancel")}>ยกเลิก</button>
                  <button onClick={() => act(o.id, "confirm")}>ยืนยันสำเร็จ</button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">ยังไม่มี Xwap</div>
        )
      ) : notifications.length ? (
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
