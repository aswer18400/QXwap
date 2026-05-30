import React, { useEffect, useState } from "react";
import {
  CheckIcon,
  NearbyToolbarIcon,
  SortToolbarIcon,
} from "../components/AppIcons";
import { InputField } from "../components/FormFields";
import {
  categories,
  categoryLabels,
  dealLabels,
  emptyFilters
} from "../lib/constants";
import type { Filters } from "../lib/constants";
import { PageHeader } from "../components/PageHeader";

const conditionMood = [
  { value: "", label: "ทั้งหมด", note: "ทุกสภาพ", emoji: "✓" },
  { value: "New", label: "ใหม่", note: "ยังแทบไม่ได้ใช้งาน", emoji: "☺" },
  { value: "Like new", label: "เหมือนใหม่", note: "สภาพดีมาก", emoji: "◔" },
  { value: "Good", label: "สภาพดี", note: "มีร่องรอยเล็กน้อย", emoji: "◡" },
  { value: "Used", label: "ผ่านการใช้งาน", note: "เหมาะกับสายคุ้มค่า", emoji: "◌" }
] as const;

export function FilterSheet({
  filters,
  onApply,
  onBack,
  title = "ตัวกรอง",
  mode = "filter"
}: {
  filters: Filters;
  onApply: (nextFilters: Filters) => void;
  onBack: () => void;
  title?: string;
  mode?: "filter" | "sort";
}) {
  const [locating, setLocating] = useState(false);
  const isSortMode = mode === "sort";
  const [draftFilters, setDraftFilters] = useState<Filters>({ ...emptyFilters, ...filters });

  useEffect(() => {
    setDraftFilters({ ...emptyFilters, ...filters });
  }, [filters]);

  const radiusValue = Number(draftFilters.nearby_radius_km || 10);
  const set = (key: keyof Filters, value: string | boolean) =>
    setDraftFilters((current) => ({ ...current, [key]: value as never }));

  const sortOptions = [
    { value: "ai", label: "AI แนะนำ", meta: "ดีที่สุดจากความสนใจของคุณ", icon: "⚡" },
    { value: "newest", label: "ล่าสุด", meta: "แสดงสินค้าที่โพสต์ล่าสุด", icon: "🕘" },
    { value: "nearby", label: "ใกล้ฉัน", meta: "แสดงสินค้าที่ใกล้คุณที่สุด", icon: "📍" },
    { value: "price_asc", label: "ราคาต่ำ → สูง", meta: "เรียงจากราคาต่ำไปสูง", icon: "🏷" },
    { value: "price_desc", label: "ราคาสูง → ต่ำ", meta: "เรียงจากราคาสูงไปต่ำ", icon: "💎" },
    { value: "most_requested", label: "สินค้ายอดนิยม", meta: "สินค้าที่มีคนสนใจมากที่สุด", icon: "🔥" },
    { value: "fast_responder", label: "คะแนนร้านสูง", meta: "จากคะแนนรีวิวของร้านค้า", icon: "★" }
  ] as const;

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraftFilters((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          nearby_radius_km: current.nearby_radius_km || "10"
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <section className={`screen filter-page${isSortMode ? " filter-page--sort" : ""}`}>
      <PageHeader
        title={title}
        subtitle={isSortMode ? "เลือกได้ครั้งละ 1 แบบ" : "ระยะทาง ราคา ประเภทดีล และสภาพสินค้า"}
        onBack={onBack}
        actions={
          isSortMode ? (
            <span className="page-header-icon"><SortToolbarIcon size={18} /></span>
          ) : (
            <button type="button" className="page-header-text-action" onClick={() => setDraftFilters({ ...emptyFilters })}>
              ล้างทั้งหมด
            </button>
          )
        }
      />
      <div className="filter-page-body filter-page-body--reference">
        {isSortMode ? (
          <div className="sort-reference-list">
            {sortOptions.map((option) => {
              const selected = (draftFilters.sort || "newest") === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`sort-reference-card${selected ? " selected" : ""}`}
                  onClick={() => onApply({ ...emptyFilters, ...draftFilters, sort: option.value as Filters["sort"] })}
                >
                  <span className="sort-reference-icon" aria-hidden="true">{option.icon}</span>
                  <span className="sort-reference-copy">
                    <b>{option.label}</b>
                    <small>{option.meta}</small>
                  </span>
                  {selected ? <CheckIcon size={18} /> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="panel filter-reference-panel">
              <div className="filter-reference-block">
                <InputField
                  label="พื้นที่นัดรับ"
                  placeholder="เช่น สยาม, ลาดพร้าว, บางนา"
                  value={draftFilters.location_label}
                  onChange={(event) => set("location_label", event.target.value)}
                />
              </div>
            </div>

            <div className="panel filter-reference-panel">
              <div className="filter-reference-block">
                <div className="filter-reference-label">
                  <b>ระยะทางจากฉัน</b>
                  <small>{draftFilters.location_label || "ยังไม่ได้ใช้ตำแหน่งของคุณ"}</small>
                </div>
                <div className="filter-range-shell">
                  <div className="filter-range-bubble">{radiusValue} กม.</div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={radiusValue}
                    onChange={(event) => set("nearby_radius_km", event.target.value)}
                    aria-label="ระยะทางจากฉัน"
                  />
                  <div className="filter-range-scale">
                    <span>0 กม.</span>
                    <span>30 กม.</span>
                  </div>
                </div>
                <button type="button" className="secondary wide" onClick={useCurrentLocation} disabled={locating}>
                  <NearbyToolbarIcon size={16} />
                  {locating ? "กำลังขอตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน"}
                </button>
              </div>
            </div>

            <div className="panel filter-reference-panel">
              <div className="filter-reference-block">
                <div className="filter-reference-label">
                  <b>ช่วงราคา (บาท)</b>
                </div>
                <div className="two filter-reference-price">
                  <label className="form-stack">
                    <span>ขั้นต่ำ</span>
                    <input inputMode="numeric" value={draftFilters.min_price} onChange={(event) => set("min_price", event.target.value.replace(/[^\d]/g, ""))} />
                  </label>
                  <label className="form-stack">
                    <span>สูงสุด</span>
                    <input inputMode="numeric" value={draftFilters.max_price} onChange={(event) => set("max_price", event.target.value.replace(/[^\d]/g, ""))} />
                  </label>
                </div>
              </div>
            </div>

            <div className="panel filter-reference-panel">
              <div className="filter-reference-label">
                <b>ประเภทดีล</b>
              </div>
              <div className="filter-reference-deal-grid">
                {Object.entries(dealLabels).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={draftFilters.deal_type === value ? "on" : ""}
                    onClick={() => set("deal_type", draftFilters.deal_type === value ? "" : value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel filter-reference-panel">
              <div className="filter-reference-label">
                <b>สภาพสินค้า</b>
              </div>
              <div className="filter-condition-grid">
                {conditionMood.map((entry) => (
                  <button
                    key={entry.label}
                    type="button"
                    className={`filter-condition-card${draftFilters.condition === entry.value ? " on" : ""}`}
                    onClick={() => set("condition", entry.value)}
                  >
                    <span className="filter-condition-emoji">{entry.emoji}</span>
                    <b>{entry.label}</b>
                    <small>{entry.note}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel filter-reference-panel">
              <div className="filter-reference-row">
                <div>
                  <b>หมวดหมู่</b>
                  <small>{draftFilters.category ? categoryLabels[draftFilters.category] : "เลือกหมวดหมู่"}</small>
                </div>
                <select value={draftFilters.category} onChange={(event) => set("category", event.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-reference-toggle">
                <div>
                  <b>เฉพาะของเด่น</b>
                  <small>แสดงของที่ระบบจัดให้น่าสนใจก่อน</small>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={Boolean(draftFilters.featured)} onChange={(event) => set("featured", event.target.checked)} />
                  <span />
                </label>
              </div>
            </div>

            <div className="filter-reference-actions">
              <button type="button" className="primary wide" onClick={() => onApply({ ...emptyFilters, ...draftFilters })}>
                ดูผลลัพธ์
              </button>
              <button type="button" className="secondary wide" onClick={() => setDraftFilters({ ...emptyFilters })}>
                บันทึกตัวกรอง
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
