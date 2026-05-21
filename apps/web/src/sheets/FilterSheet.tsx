import React, { useState } from "react";
import { Crosshair, Hash, MapPin, RefreshCw, SlidersHorizontal } from "lucide-react";
import {
  categories,
  categoryLabels,
  conditionLabels,
  conditions,
  dealLabels,
  emptyFilters
} from "../lib/constants";
import type { Filters } from "../lib/constants";
import { PageHeader } from "../components/PageHeader";

export function FilterSheet({
  filters,
  setFilters,
  onBack,
  title = "ตัวกรองสินค้า"
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onBack: () => void;
  title?: string;
}) {
  const [locating, setLocating] = useState(false);

  const set = (key: keyof Filters, value: string | boolean) =>
    setFilters((current) => ({ ...current, [key]: value }));

  function resetFilters() {
    setFilters({ ...emptyFilters });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFilters((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          sort: "nearby",
          nearby_radius_km: current.nearby_radius_km || "10"
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <section className="screen filter-page">
      <PageHeader title={title} onBack={onBack} />
      <div className="filter-page-body">
        <div className="filter-sheet-stack">
          <div className="panel filter-panel">
            <div className="section-head compact">
              <h3><SlidersHorizontal size={16} /> คำค้นและ Hashtag</h3>
            </div>
            <label className="form-stack">
              <span>คำค้น</span>
              <input value={filters.q} onChange={(event) => set("q", event.target.value)} placeholder="เช่น กล้องฟิล์ม หรือ iPad" />
            </label>
            <label className="form-stack">
              <span>Hashtag</span>
              <input value={filters.wanted_tag} onChange={(event) => set("wanted_tag", event.target.value.replace(/^#+/, ""))} placeholder="เช่น กล้อง" />
            </label>
            <label className="form-stack">
              <span>พื้นที่นัดรับ</span>
              <input value={filters.location_label} onChange={(event) => set("location_label", event.target.value)} placeholder="เช่น อารีย์ หรือ BTS สยาม" />
            </label>
          </div>

          <div className="panel filter-panel">
            <div className="section-head compact">
              <h3><MapPin size={16} /> ระยะทางและพื้นที่ใกล้เคียง</h3>
            </div>
            <button type="button" className="secondary wide" onClick={useCurrentLocation} disabled={locating}>
              <Crosshair size={16} />
              {locating ? "กำลังขอตำแหน่ง..." : "ใช้ตำแหน่งของฉัน"}
            </button>
            <label className="form-stack">
              <span>ระยะค้นหา</span>
              <select value={filters.nearby_radius_km} onChange={(event) => set("nearby_radius_km", event.target.value)}>
                <option value="">ทั้งหมด</option>
                {[3, 5, 10, 15, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>{n} กม.</option>
                ))}
              </select>
            </label>
            <label className="form-stack">
              <span>เรียงตาม</span>
              <select value={filters.sort} onChange={(event) => set("sort", event.target.value)}>
                <option value="newest">ใหม่ล่าสุด</option>
                <option value="nearby">ใกล้ที่สุด</option>
                <option value="ai">AI แนะนำ</option>
                <option value="price_asc">ราคาต่ำไปสูง</option>
                <option value="price_desc">ราคาสูงไปต่ำ</option>
                <option value="most_requested">ถูกขอมากสุด</option>
                <option value="fast_responder">ตอบไว</option>
              </select>
            </label>
          </div>

          <div className="panel filter-panel">
            <div className="section-head compact">
              <h3><Hash size={16} /> หมวดหมู่ ราคา และประเภทดีล</h3>
            </div>
            <div className="two">
              <label className="form-stack">
                <span>หมวดหมู่</span>
                <select value={filters.category} onChange={(event) => set("category", event.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{categoryLabels[category]}</option>
                  ))}
                </select>
              </label>
              <label className="form-stack">
                <span>สภาพ</span>
                <select value={filters.condition} onChange={(event) => set("condition", event.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>{conditionLabels[condition]}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="two">
              <label className="form-stack">
                <span>ราคาต่ำสุด</span>
                <input inputMode="numeric" value={filters.min_price} onChange={(event) => set("min_price", event.target.value.replace(/[^\d]/g, ""))} />
              </label>
              <label className="form-stack">
                <span>ราคาสูงสุด</span>
                <input inputMode="numeric" value={filters.max_price} onChange={(event) => set("max_price", event.target.value.replace(/[^\d]/g, ""))} />
              </label>
            </div>
            <label className="form-stack">
              <span>ประเภทดีล</span>
              <select value={filters.deal_type} onChange={(event) => set("deal_type", event.target.value)}>
                <option value="">ทั้งหมด</option>
                {Object.entries(dealLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="chips">
              <button className={filters.open_to_offers ? "on" : ""} aria-pressed={filters.open_to_offers} onClick={() => set("open_to_offers", !filters.open_to_offers)}>
                เปิดรับข้อเสนอ
              </button>
              <button className={filters.fast_responder ? "on" : ""} aria-pressed={filters.fast_responder} onClick={() => set("fast_responder", !filters.fast_responder)}>
                ตอบไว
              </button>
              <button className={filters.featured ? "on" : ""} aria-pressed={filters.featured} onClick={() => set("featured", !filters.featured)}>
                ผู้ใช้งานดีเด่น
              </button>
            </div>
          </div>
        </div>

        <div className="sheet-actions">
          <button type="button" onClick={resetFilters}>
            <RefreshCw size={16} /> ล้างตัวกรอง
          </button>
          <button type="button" className="primary" onClick={onBack}>
            ใช้ตัวกรอง
          </button>
        </div>
      </div>
    </section>
  );
}
