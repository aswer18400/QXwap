import { useEffect, useMemo, useState } from "react";
import { Check, Send, X } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { canXwap } from "../lib/format";
import { useDialogA11y } from "../lib/useDialogA11y";
import type { Item, OfferTab, RequireLogin, User } from "../lib/types";

export function OfferSheet({
  item,
  user,
  myItems,
  close,
  requireLogin,
  openInbox,
  openOfferDetail
}: {
  item: Item;
  user: User | null;
  myItems: Item[];
  close: () => void;
  requireLogin: RequireLogin;
  openInbox: (tab?: OfferTab) => void;
  openOfferDetail: (offerId: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [cash, setCash] = useState("");
  const [sent, setSent] = useState(false);
  const [createdOfferId, setCreatedOfferId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<Item[]>(myItems);
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);
  const normalizedMessage = message.trim();
  const numericCash = Number(cash || 0);
  const canSubmitOffer = selected.length > 0 || normalizedMessage.length > 0 || numericCash > 0;
  const selectedItems = useMemo(
    () => availableItems.filter((entry) => selected.includes(entry.id)),
    [availableItems, selected]
  );

  useEffect(() => {
    setAvailableItems(myItems);
  }, [myItems]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    setInventoryLoading(true);
    api<{ items: Item[] }>(`/items?owner_id=${encodeURIComponent(user.id)}&limit=40`)
      .then((data) => {
        if (!live) return;
        setAvailableItems(data.items || []);
      })
      .catch(() => {
        if (!live) return;
        setAvailableItems(myItems);
      })
      .finally(() => {
        if (live) setInventoryLoading(false);
      });
    return () => {
      live = false;
    };
  }, [myItems, user]);

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
    if (!canSubmitOffer) {
      setSubmitError("ข้อเสนอต้องมีอย่างน้อย 1 อย่าง เช่น ข้อความ สินค้าที่จะแลก หรือเงินสด");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await api<{ offer_id: string }>("/offers", {
        method: "POST",
        body: JSON.stringify({
          target_item_id: item.id,
          message: normalizedMessage,
          cash_amount: numericCash,
          credit_amount: 0,
          item_ids: selected
        })
      });
      if (response.offer_id) {
        openOfferDetail(response.offer_id);
        return;
      }
      setCreatedOfferId(response.offer_id || "");
      setSent(true);
    } catch (error: any) {
      setSubmitError(error.message || "ส่งข้อเสนอไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet offer-sheet-dialog offer-sheet-dialog--reference" role="dialog" aria-modal="true" aria-labelledby="offer-title" tabIndex={-1} aria-busy={submitting}>
        <div className="sheet-head">
          <h2 id="offer-title">Xwap: {item.title}</h2>
          <button onClick={close} aria-label="ปิด Xwap">
            <X aria-hidden="true" />
          </button>
        </div>
        {sent ? (
          <>
            <div className="empty" role="status">ส่ง Xwap แล้ว ดูรายละเอียดข้อเสนอหรือเปิดอินบ็อกซ์เพื่อติดตามต่อได้ทันที</div>
            <div className="sheet-actions offer-sheet-success-actions">
              <button onClick={close}>ปิด</button>
              <button className="secondary" onClick={() => openInbox("sent")}>เปิดอินบ็อกซ์</button>
              <button className="primary" onClick={() => createdOfferId && openOfferDetail(createdOfferId)} disabled={!createdOfferId}>
                <Check size={16} /> เปิดรายละเอียดข้อเสนอ
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="offer-sheet-compare-grid">
              <section className="offer-sheet-compare-card offer-sheet-compare-target" aria-label="สินค้าของอีกฝ่าย">
                <small>สินค้าของอีกฝ่าย</small>
                <div className="offer-sheet-compare-body">
                  <img src={asset(item.media.images[0])} alt={item.title} />
                  <span>
                    <b>{item.title}</b>
                    <strong>{item.owner.name || "เจ้าของสินค้า"}</strong>
                  </span>
                </div>
              </section>
              <section className="offer-sheet-compare-card" aria-label="สินค้าของคุณ">
                <small>สินค้าของคุณ</small>
                <div className="offer-sheet-compare-body stacked">
                  {selectedItems.length ? (
                    selectedItems.slice(0, 2).map((entry) => (
                      <div key={entry.id} className="offer-sheet-mini-item">
                        <img src={asset(entry.media.images[0])} alt={entry.title} />
                        <span>{entry.title}</span>
                      </div>
                    ))
                  ) : (
                    <div className="offer-sheet-empty-choice">ยังไม่ได้เลือกสินค้า</div>
                  )}
                  {selectedItems.length > 2 ? <span className="offer-sheet-more-count">+{selectedItems.length - 2} รายการ</span> : null}
                </div>
              </section>
            </div>

            <div className="offer-items offer-selection-grid" role="list" aria-label="เลือกสินค้าของคุณเพื่อเสนอแลก">
              {availableItems.length ? (
                availableItems.map((m: Item) => {
                  const checked = selected.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`offer-selection-card${checked ? " on" : ""}`}
                      aria-pressed={checked}
                      disabled={submitting}
                      onClick={() =>
                        setSelected((current) =>
                          checked ? current.filter((id) => id !== m.id) : [...current, m.id]
                        )
                      }
                    >
                      <img src={asset(m.media.images[0])} alt={m.title} />
                      <span>
                        <b>{m.title}</b>
                        <small>{checked ? "เลือกไว้ในข้อเสนอนี้" : "แตะเพื่อเลือกสินค้า"}</small>
                      </span>
                      <i aria-hidden="true">{checked ? "เลือกแล้ว" : "เลือก"}</i>
                    </button>
                  );
                })
              ) : (
                <span>{inventoryLoading ? "กำลังโหลดสินค้าของคุณ..." : "คุณยังไม่มีสินค้า สามารถส่งข้อความหรือเงินสดแทนได้"}</span>
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
                pattern="[0-9]*"
                placeholder="เพิ่มเงินสด"
                value={cash}
                disabled={submitting}
                onChange={(e) => setCash(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            {submitError ? <p className="err" role="alert">{submitError}</p> : null}
            <button className="primary wide" disabled={submitting || !canSubmitOffer} onClick={submit}>
              <Send aria-hidden="true" /> {submitting ? "กำลังส่งข้อเสนอ..." : "ส่ง Xwap"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
