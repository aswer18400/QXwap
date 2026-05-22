import React, { useEffect, useState } from "react";
import {
  CheckIcon,
  ConditionIcon,
  DistanceIcon,
  FilterToolbarIcon,
  NearbyToolbarIcon,
  PriceCashIcon,
  SortToolbarIcon,
  SwapDealIcon
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
  const [locationError, setLocationError] = useState("");
  const isSortMode = mode === "sort";
  const [draftFilters, setDraftFilters] = useState<Filters>({ ...emptyFilters, ...filters });
  const hasLocationContext = Boolean(draftFilters.latitude && draftFilters.longitude);
  const nearbyRadius = draftFilters.nearby_radius_km || "10";

  useEffect(() => {
    setDraftFilters({ ...emptyFilters, ...filters });
    setLocationError("");
  }, [filters]);

  const set = (key: keyof Filters, value: string | boolean) =>
    setDraftFilters((current) => ({ ...current, [key]: value as never }));
  const sortOptions = [
    { value: "newest", label: "ใหม่ล่าสุด", description: "โชว์รายการที่เพิ่งลงก่อน" },
    { value: "ai", label: "AI แนะนำ", description: "จัดลำดับจากความน่าแลกและความเกี่ยวข้อง" },
    { value: "price_asc", label: "ราคาต่ำไปสูง", description: "เรียงจากงบน้อยไปมาก" },
    { value: "price_desc", label: "ราคาสูงไปต่ำ", description: "เรียงจากราคาสูงก่อน" },
    { value: "most_requested", label: "ถูกขอมากสุด", description: "เน้นสินค้าที่มีคนสนใจเยอะ" },
    { value: "fast_responder", label: "ตอบไว", description: "ร้านที่ตอบกลับเร็วขึ้นก่อน" },
    { value: "nearby", label: "ใกล้ที่สุด", description: "ใช้ตำแหน่งของคุณเพื่อเรียงตามระยะทาง" }
  ] as const;

  function locationErrorMessage(error?: GeolocationPositionError) {
    if (!navigator.geolocation) return "อุปกรณ์นี้ไม่รองรับการอ่านตำแหน่ง";
    if (!error) return "ไม่สามารถอ่านตำแหน่งปัจจุบันได้ ลองใหม่อีกครั้ง";
    if (error.code === error.PERMISSION_DENIED) {
      return "ยังไม่ได้อนุญาตการเข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ Location แล้วลองอีกครั้ง";
    }
    if (error.code === error.TIMEOUT) {
      return "หมดเวลาในการอ่านตำแหน่ง ลองใหม่ในพื้นที่ที่สัญญาณชัดขึ้น";
    }
    return "ไม่สามารถอ่านตำแหน่งปัจจุบันได้ ลองใหม่อีกครั้ง";
  }

  function useCurrentLocation(afterLocate?: (nextFilters: Filters) => void) {
    if (!navigator.geolocation) {
      setLocationError(locationErrorMessage());
      return;
    }
    setLocationError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextFilters = {
          ...emptyFilters,
          ...draftFilters,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          nearby_radius_km: draftFilters.nearby_radius_km || "10"
        };
        setDraftFilters(nextFilters);
        setLocating(false);
        afterLocate?.(nextFilters);
      },
      (error) => {
        setLocating(false);
        setLocationError(locationErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  }

  function applySort(nextSort: Filters["sort"]) {
    const nextFilters = { ...emptyFilters, ...draftFilters, sort: nextSort };
    if (nextSort !== "nearby") {
      onApply(nextFilters);
      return;
    }
    if (hasLocationContext) {
      onApply({ ...nextFilters, nearby_radius_km: draftFilters.nearby_radius_km || "10" });
      return;
    }
    useCurrentLocation((locatedFilters) =>
      onApply({ ...emptyFilters, ...locatedFilters, sort: "nearby" })
    );
  }

  return (
    <section className="screen filter-page" data-mode={mode}>
      <PageHeader title={title} onBack={onBack} />
      <div className="filter-page-body">
        <div className="panel filter-overview-panel">
          <div className="filter-overview-icon">
            {isSortMode ? <SortToolbarIcon size={18} /> : <FilterToolbarIcon size={18} />}
          </div>
          <div className="filter-overview-copy">
            <b>{isSortMode ? "เลือกวิธีเรียงลำดับสินค้า" : "ปรับตัวกรองให้เจอสินค้าที่ใกล้เคียงที่สุด"}</b>
            <p>{isSortMode ? "กดเลือกได้ทันที ระบบจะใช้ตัวเลือกนี้กับรายการสินค้าเดี๋ยวนี้" : "ตั้งระยะทาง ราคา ประเภทดีล และคุณภาพสินค้าให้ตรงกับสิ่งที่คุณกำลังหา"}</p>
          </div>
        </div>
        <div className="filter-sheet-stack">
          {isSortMode ? (
            <>
              <div className="panel filter-panel sort-panel">
                <div className="filter-section-head">
                  <span className="filter-section-icon"><SortToolbarIcon size={16} /></span>
                  <div>
                    <h3>เรียงลำดับสินค้า</h3>
                    <p>เลือกได้ครั้งละ 1 แบบ</p>
                  </div>
                </div>
                <div className="sort-option-list" role="listbox" aria-label="เรียงลำดับสินค้า">
                {sortOptions.map((option) => {
                  const selected = (draftFilters.sort || "newest") === option.value;
                  const isNearbyOption = option.value === "nearby";
                    const description = isNearbyOption
                      ? locating
                        ? "กำลังอ่านตำแหน่งปัจจุบัน..."
                        : hasLocationContext
                          ? `พร้อมเรียงจากตำแหน่งของคุณในรัศมี ${nearbyRadius} กม.`
                          : option.description
                      : option.description;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`sort-option${selected ? " selected" : ""}${isNearbyOption ? " nearby" : ""}`}
                        aria-selected={selected}
                        onClick={() => applySort(option.value as Filters["sort"])}
                        disabled={locating && isNearbyOption}
                      >
                        <span className="sort-option-copy">
                          <span className="sort-option-label">{option.label}</span>
                          <span className="sort-option-desc">{description}</span>
                        </span>
                        <span className="sort-option-meta">
                          {isNearbyOption && hasLocationContext ? (
                            <span className="sort-option-tag">{nearbyRadius} กม.</span>
                          ) : null}
                          {selected ? <CheckIcon size={16} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {locationError ? <p className="sort-inline-error" role="alert">{locationError}</p> : null}
              </div>
            </>
          ) : (
            <div className="panel filter-panel">
              <div className="filter-section-head">
                <span className="filter-section-icon"><DistanceIcon size={16} /></span>
                <div>
                  <h3>ระยะทาง</h3>
                  <p>ใช้ตำแหน่งปัจจุบันและเลือกรัศมีค้นหา</p>
                </div>
              </div>
              <button type="button" className="secondary wide" onClick={() => useCurrentLocation()} disabled={locating}>
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
              <div className="filter-section-head">
                <span className="filter-section-icon"><PriceCashIcon size={16} /></span>
                <div>
                  <h3>ราคา</h3>
                  <p>กำหนดช่วงงบประมาณที่ยอมรับได้</p>
                </div>
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
              <div className="filter-section-head">
                <span className="filter-section-icon"><SwapDealIcon size={16} /></span>
                <div>
                  <h3>ประเภทดีล</h3>
                  <p>ระบุว่าต้องการแลก ขาย ซื้อ หรือเปิดได้ทั้งคู่</p>
                </div>
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
              <div className="filter-section-head">
                <span className="filter-section-icon"><ConditionIcon size={16} /></span>
                <div>
                  <h3>คุณภาพสินค้า</h3>
                  <p>คัดเฉพาะระดับสภาพที่คุณรับได้</p>
                </div>
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
