import React, { useEffect, useState } from "react";
import {
  CheckIcon,
  FilterToolbarIcon,
  HashtagMetaIcon,
  LocationMetaIcon,
  NearbyToolbarIcon,
  SortToolbarIcon
} from "../components/AppIcons";
import {
  conditionLabels,
  conditions,
  dealLabels,
  emptyFilters
} from "../lib/constants";
import type { Filters } from "../lib/constants";
import { PageHeader } from "../components/PageHeader";

export function FilterSheet({
  filters,
  onApply,
  onBack,
  title = "ตัวกอง",
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

  const set = (key: keyof Filters, value: string | boolean) =>
    setDraftFilters((current) => ({ ...current, [key]: value as never }));
  const sortOptions = [
    { value: "newest", label: "ใหม่ล่าสุด" },
    { value: "ai", label: "AI แนะนำ" },
    { value: "price_asc", label: "ราคาต่ำไปสูง" },
    { value: "price_desc", label: "ราคาสูงไปต่ำ" },
    { value: "most_requested", label: "ถูกขอมากสุด" },
    { value: "fast_responder", label: "ตอบไว" },
    { value: "nearby", label: "ใกล้ที่สุด" }
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
    <section className="screen filter-page">
      <PageHeader title={title} onBack={onBack} />
      <div className="filter-page-body">
        <div className="filter-sheet-stack">
          {isSortMode ? (
            <div className="panel filter-panel">
              <div className="section-head compact">
                <h3><SortToolbarIcon size={16} /> เรียงลำดับสินค้า</h3>
              </div>
              <div className="sort-option-list" role="listbox" aria-label="เรียงลำดับสินค้า">
                {sortOptions.map((option) => {
                  const selected = (draftFilters.sort || "newest") === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`sort-option${selected ? " selected" : ""}`}
                      aria-selected={selected}
                      onClick={() => onApply({ ...emptyFilters, ...draftFilters, sort: option.value as Filters["sort"] })}
                    >
                      <span>{option.label}</span>
                      {selected ? <CheckIcon size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="panel filter-panel">
              <div className="section-head compact">
                <h3><LocationMetaIcon size={16} /> ระยะทาง</h3>
              </div>
              <button type="button" className="secondary wide" onClick={useCurrentLocation} disabled={locating}>
                <NearbyToolbarIcon size={16} />
                {locating ? "กำลังขอตำแหน่ง..." : "ใช้ตำแหน่งของฉัน"}
              </button>
              <label className="form-stack">
                <span>ระยะค้นหา</span>
                <select value={draftFilters.nearby_radius_km} onChange={(event) => set("nearby_radius_km", event.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {[3, 5, 10, 15, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>{n} กม.</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {!isSortMode ? (
            <div className="panel filter-panel">
              <div className="section-head compact">
                <h3><HashtagMetaIcon size={16} /> ราคา</h3>
              </div>
              <div className="two">
                <label className="form-stack">
                  <span>ราคาต่ำสุด</span>
                  <input inputMode="numeric" value={draftFilters.min_price} onChange={(event) => set("min_price", event.target.value.replace(/[^\d]/g, ""))} />
                </label>
                <label className="form-stack">
                  <span>ราคาสูงสุด</span>
                  <input inputMode="numeric" value={draftFilters.max_price} onChange={(event) => set("max_price", event.target.value.replace(/[^\d]/g, ""))} />
                </label>
              </div>
            </div>
          ) : null}

          {!isSortMode ? (
            <div className="panel filter-panel">
              <div className="section-head compact">
                <h3><FilterToolbarIcon size={16} /> ประเภทดีล</h3>
              </div>
              <div className="chips filter-choice-grid">
                {Object.entries(dealLabels).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={draftFilters.deal_type === value ? "on" : ""}
                    aria-pressed={draftFilters.deal_type === value}
                    onClick={() => set("deal_type", draftFilters.deal_type === value ? "" : value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!isSortMode ? (
            <div className="panel filter-panel">
              <div className="section-head compact">
                <h3><FilterToolbarIcon size={16} /> คุณภาพสินค้า</h3>
              </div>
              <label className="form-stack">
                <span>เปอร์เซ็นต์สภาพสินค้า</span>
                <select value={draftFilters.condition} onChange={(event) => set("condition", event.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {conditionLabels[condition]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>

        {!isSortMode ? (
          <div className="sheet-actions">
            <button type="button" onClick={() => setDraftFilters({ ...emptyFilters })}>
              ล้างตัวกรอง
            </button>
            <button type="button" className="primary" onClick={() => onApply({ ...emptyFilters, ...draftFilters })}>
              ใช้ตัวกรอง
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
