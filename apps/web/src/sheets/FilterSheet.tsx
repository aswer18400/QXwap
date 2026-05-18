import React from "react";
import { X } from "lucide-react";
import {
  categories,
  categoryLabels,
  conditionLabels,
  conditions,
  dealLabels,
  emptyFilters
} from "../lib/constants";
import type { Filters } from "../lib/constants";
import { useDialogA11y } from "../lib/useDialogA11y";

export function FilterSheet({
  filters,
  setFilters,
  close
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  close: () => void;
}) {
  const set = (key: keyof Filters, value: string | boolean) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);

  return (
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title" tabIndex={-1}>
        <div className="sheet-head">
          <h2 id="filter-title">ตัวกรองช็อป</h2>
          <button onClick={close} aria-label="ปิดตัวกรอง">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="two">
          <label>
            ราคาต่ำสุด
            <input
              aria-label="ราคาต่ำสุด"
              inputMode="numeric"
              value={filters.min_price}
              onChange={(e) => set("min_price", e.target.value)}
            />
          </label>
          <label>
            ราคาสูงสุด
            <input
              aria-label="ราคาสูงสุด"
              inputMode="numeric"
              value={filters.max_price}
              onChange={(e) => set("max_price", e.target.value)}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={filters.open_to_offers}
            onChange={(e) => set("open_to_offers", e.target.checked)}
          />{" "}
          รวมรายการเปิดกว้างทุกข้อเสนอ
        </label>
        <label>
          ระยะใกล้เคียง
          <select
            value={filters.nearby_radius_km}
            onChange={(e) => set("nearby_radius_km", e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {[3, 5, 10, 15, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} กม.
              </option>
            ))}
          </select>
        </label>
        <label>
          หมวดหมู่
          <select value={filters.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">ทั้งหมด</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          ประเภทดีล
          <select value={filters.deal_type} onChange={(e) => set("deal_type", e.target.value)}>
            <option value="">ทั้งหมด</option>
            {Object.entries(dealLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          สภาพ
          <select value={filters.condition} onChange={(e) => set("condition", e.target.value)}>
            <option value="">ทั้งหมด</option>
            {conditions.map((c) => (
              <option key={c} value={c}>
                {conditionLabels[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          สิ่งที่อยากได้
          <input
            aria-label="สิ่งที่อยากได้"
            value={filters.wanted_tag}
            onChange={(e) => set("wanted_tag", e.target.value)}
            placeholder="เช่น กล้องฟิล์ม"
          />
        </label>
        <div className="chips">
          <button
            className={filters.following ? "on" : ""}
            aria-pressed={filters.following}
            onClick={() => set("following", !filters.following)}
          >
            เฉพาะคนที่ติดตาม
          </button>
          <button
            className={filters.fast_responder ? "on" : ""}
            aria-pressed={filters.fast_responder}
            onClick={() => set("fast_responder", !filters.fast_responder)}
          >
            ตอบไว
          </button>
          <button
            className={filters.featured ? "on" : ""}
            aria-pressed={filters.featured}
            onClick={() => set("featured", !filters.featured)}
          >
            ผู้ใช้งานดีเด่น
          </button>
        </div>
        <label>
          เรียงตาม
          <select value={filters.sort} onChange={(e) => set("sort", e.target.value)}>
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="nearby">ใกล้ที่สุด</option>
            <option value="price_asc">ราคาต่ำไปสูง</option>
            <option value="price_desc">ราคาสูงไปต่ำ</option>
            <option value="most_requested">ถูกขอมากสุด</option>
            <option value="fast_responder">ตอบไว</option>
          </select>
        </label>
        <div className="sheet-actions">
          <button onClick={() => setFilters({ ...emptyFilters })}>ล้างตัวกรอง</button>
          <button className="primary" onClick={close}>
            ใช้ตัวกรอง
          </button>
        </div>
      </section>
    </div>
  );
}
