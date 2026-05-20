import { useState } from "react";
import { Camera, Send, Truck, X } from "lucide-react";
import { api } from "../lib/api";
import { canXwap } from "../lib/format";
import { useDialogA11y } from "../lib/useDialogA11y";
import type { Item, RequireLogin, User } from "../lib/types";

export function OfferSheet({
  item,
  user,
  myItems,
  close,
  requireLogin,
  openInbox
}: {
  item: Item;
  user: User | null;
  myItems: Item[];
  close: () => void;
  requireLogin: RequireLogin;
  openInbox: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [cash, setCash] = useState("");
  const [credit, setCredit] = useState("");
  const [instantSwap, setInstantSwap] = useState(true);
  const [shippingPayer, setShippingPayer] = useState("split");
  const [pickupWindow, setPickupWindow] = useState("วันนี้ 18:00-20:00");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);

  if (!user) {
    return (
      <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
        <section ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="offer-login-title" aria-describedby="offer-login-message" tabIndex={-1}>
          <div className="empty">
            <b id="offer-login-title">Xwap</b>
            <p id="offer-login-message">กรุณาเข้าสู่ระบบก่อนเพื่อใช้งานต่อ</p>
            <button className="primary" onClick={() => requireLogin("เข้าสู่ระบบเพื่อส่งข้อเสนอ Xwap ต่อจากสินค้าชิ้นนี้")}>
              เข้าสู่ระบบ
            </button>
          </div>
          <button onClick={close}>ปิด</button>
        </section>
      </div>
    );
  }
  if (!canXwap(user)) {
    return (
      <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
        <section ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="offer-restricted-title" tabIndex={-1}>
          <h2 id="offer-restricted-title">Xwap</h2>
          <p>บัญชีนี้ถูกจำกัดสิทธิ์ สามารถดูได้เท่านั้น</p>
          <button onClick={close}>ปิด</button>
        </section>
      </div>
    );
  }
  if (item.owner.id === user.id) {
    return (
      <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
        <section ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="offer-own-title" tabIndex={-1}>
          <h2 id="offer-own-title">Xwap</h2>
          <p>ไม่สามารถขอแลกสินค้าของตัวเอง</p>
          <button onClick={close}>ปิด</button>
        </section>
      </div>
    );
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await api("/offers", {
        method: "POST",
        body: JSON.stringify({
          target_item_id: item.id,
          message,
          cash_amount: Number(cash || 0),
          credit_amount: Number(credit || 0),
          item_ids: selected,
          instant_swap: instantSwap,
          shipping_payer: shippingPayer,
          pickup_window: pickupWindow
        })
      });
      setSent(true);
    } catch (error: any) {
      setSubmitError(error.message || "ส่งข้อเสนอไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="offer-title" tabIndex={-1} aria-busy={submitting}>
        <div className="sheet-head">
          <h2 id="offer-title">Xwap: {item.title}</h2>
          <button onClick={close} aria-label="ปิด Xwap">
            <X aria-hidden="true" />
          </button>
        </div>
        {sent ? (
          <>
            <div className="empty" role="status">ส่ง Xwap แล้ว เปิดอินบ็อกซ์เพื่อติดตามสถานะต่อได้ทันที</div>
            <div className="sheet-actions">
              <button onClick={close}>ปิด</button>
              <button className="primary" onClick={openInbox}>เปิดอินบ็อกซ์</button>
            </div>
          </>
        ) : (
          <>
            <div className="offer-items">
              {myItems.length ? (
                myItems.map((m: Item) => (
                  <label key={m.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  disabled={submitting}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                            ? [...selected, m.id]
                            : selected.filter((x) => x !== m.id)
                        )
                      }
                    />
                    {m.title}
                  </label>
                ))
              ) : (
                <span>คุณยังไม่มีสินค้า สามารถส่งข้อความ เงินสด หรือเครดิตแทนได้</span>
              )}
            </div>
            <textarea
              aria-label="ข้อความถึงเจ้าของสินค้า"
              placeholder="ข้อความถึงเจ้าของสินค้า"
              value={message}
              disabled={submitting}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="two">
              <input
                aria-label="เพิ่มเงินสด"
                inputMode="numeric"
                placeholder="เพิ่มเงินสด"
                value={cash}
                disabled={submitting}
                onChange={(e) => setCash(e.target.value.replace(/[^\d]/g, ""))}
              />
              <input
                aria-label="เพิ่ม Manu Credit"
                inputMode="numeric"
                placeholder="เพิ่ม Manu Credit"
                value={credit}
                disabled={submitting}
                onChange={(e) => setCredit(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="instant-box">
              <label className="check">
                <input
                  type="checkbox"
                  checked={instantSwap}
                  disabled={submitting}
                  onChange={(e) => setInstantSwap(e.target.checked)}
                />{" "}
                แลกทันทีถ้าของอยู่ใกล้กัน
              </label>
              <div className="instant-grid">
                <span>
                  <Truck size={16} /> ขนส่งนัดรับของ
                </span>
                <span>
                  <Camera size={16} /> ถ่ายรูปตอนรับ/ส่ง
                </span>
              </div>
              <label>
                ใครรับผิดชอบค่าขนส่งหรือค่าเข้ารับ
                <select value={shippingPayer} disabled={submitting} onChange={(e) => setShippingPayer(e.target.value)}>
                  <option value="split">หารร่วมกัน</option>
                  <option value="requester">ผู้ขอ Xwap</option>
                  <option value="owner">เจ้าของสินค้า</option>
                </select>
              </label>
              <label>
                ช่วงเวลานัดรับ
                <input
                  value={pickupWindow}
                  disabled={submitting}
                  onChange={(e) => setPickupWindow(e.target.value)}
                />
              </label>
            </div>
            {submitError ? <p className="err" role="alert">{submitError}</p> : null}
            <button className="primary wide" disabled={submitting} onClick={submit}>
              <Send aria-hidden="true" /> {submitting ? "กำลังส่งข้อเสนอ..." : "ส่ง Xwap"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
