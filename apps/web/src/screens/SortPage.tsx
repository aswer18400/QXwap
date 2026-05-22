import { useCallback, useMemo, useState } from "react";
import {
  CheckIcon,
  NearbyToolbarIcon,
  PriceCashIcon,
  RefreshIcon,
  SortToolbarIcon,
  SparklesIcon,
  UsersIcon
} from "../components/AppIcons";
import { PageHeader } from "../components/PageHeader";
import { emptyFilters } from "../lib/constants";
import type { Filters } from "../lib/constants";

type SortOptionValue =
  | "newest"
  | "ai"
  | "price_asc"
  | "price_desc"
  | "most_requested"
  | "fast_responder"
  | "nearby";

type SortOption = {
  value: SortOptionValue;
  label: string;
  description: string;
  badge: string;
  tone: "brand" | "violet" | "green" | "amber" | "slate";
};

const sortOptionGroups: Array<{
  id: string;
  title: string;
  description: string;
  options: SortOption[];
}> = [
  {
    id: "smart",
    title: "เลือกแบบลัด",
    description: "เหมาะเวลาที่อยากเจอดีลน่าแลกไวขึ้นโดยไม่ต้องไล่ดูเองทั้งหมด",
    options: [
      {
        value: "ai",
        label: "AI แนะนำ",
        description: "คัดจากความสนใจ รายการที่กำลังน่าแลก และร้านที่มีสัญญาณตอบกลับดี",
        badge: "คัดให้",
        tone: "violet"
      },
      {
        value: "fast_responder",
        label: "ตอบไว",
        description: "ดันรายการจากร้านที่มีแนวโน้มตอบกลับเร็วขึ้นมาให้เห็นก่อน",
        badge: "ทันใจ",
        tone: "green"
      },
      {
        value: "nearby",
        label: "ใกล้ที่สุด",
        description: "เรียงตามระยะจากตำแหน่งของคุณ เหมาะกับดีลนัดรับที่อยากปิดเร็ว",
        badge: "ใกล้ฉัน",
        tone: "amber"
      }
    ]
  },
  {
    id: "classic",
    title: "เรียงตามข้อมูลสินค้า",
    description: "ใช้เมื่อต้องการเริ่มจากของใหม่ ราคา หรือรายการที่คนสนใจมากเป็นพิเศษ",
    options: [
      {
        value: "newest",
        label: "ใหม่ล่าสุด",
        description: "เห็นรายการที่เพิ่งลงล่าสุดก่อน เหมาะกับการเช็กของใหม่ในแต่ละวัน",
        badge: "สดใหม่",
        tone: "brand"
      },
      {
        value: "price_asc",
        label: "ราคาต่ำไปสูง",
        description: "เริ่มจากงบเบา ดูของที่เข้าถึงง่ายก่อนแล้วค่อยขยับขึ้น",
        badge: "ประหยัด",
        tone: "brand"
      },
      {
        value: "price_desc",
        label: "ราคาสูงไปต่ำ",
        description: "เหมาะกับการหาไอเท็มมูลค่าสูงหรือของที่อยากได้แบบพรีเมียมก่อน",
        badge: "พรีเมียม",
        tone: "slate"
      },
      {
        value: "most_requested",
        label: "ถูกขอมากสุด",
        description: "ดันรายการที่กำลังได้รับความสนใจจากคนอื่นขึ้นมาให้อยู่ต้น ๆ",
        badge: "นิยม",
        tone: "amber"
      }
    ]
  }
];

function geolocateCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("อุปกรณ์นี้ไม่รองรับการอ่านตำแหน่ง"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000
    });
  });
}

function SortOptionIcon({ value }: { value: SortOptionValue }) {
  if (value === "ai") return <SparklesIcon size={18} />;
  if (value === "nearby") return <NearbyToolbarIcon size={18} />;
  if (value === "most_requested") return <UsersIcon size={18} />;
  if (value === "price_asc" || value === "price_desc") return <PriceCashIcon size={18} />;
  if (value === "fast_responder") return <CheckIcon size={18} />;
  return <SortToolbarIcon size={18} />;
}

export function SortPage({
  filters,
  onApply,
  onBack
}: {
  filters: Filters;
  onApply: (nextFilters: Filters) => void;
  onBack: () => void;
}) {
  const [locating, setLocating] = useState<SortOptionValue | null>(null);
  const [inlineMessage, setInlineMessage] = useState("");
  const selectedValue = (filters.sort || "newest") as SortOptionValue;

  const selectedOption = useMemo(
    () =>
      sortOptionGroups
        .flatMap((group) => group.options)
        .find((option) => option.value === selectedValue) || sortOptionGroups[1].options[0],
    [selectedValue]
  );

  const applySort = useCallback(
    async (value: SortOptionValue) => {
      setInlineMessage("");

      if (value !== "nearby") {
        onApply({
          ...emptyFilters,
          ...filters,
          sort: value,
          latitude: "",
          longitude: "",
          nearby_radius_km: ""
        });
        return;
      }

      if (filters.latitude && filters.longitude) {
        onApply({
          ...emptyFilters,
          ...filters,
          sort: value,
          nearby_radius_km: filters.nearby_radius_km || "10"
        });
        return;
      }

      try {
        setLocating(value);
        const position = await geolocateCurrentPosition();
        onApply({
          ...emptyFilters,
          ...filters,
          sort: value,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          nearby_radius_km: filters.nearby_radius_km || "10"
        });
      } catch (error) {
        setInlineMessage(
          error instanceof Error && error.message
            ? error.message
            : "ไม่สามารถอ่านตำแหน่งปัจจุบันได้"
        );
      } finally {
        setLocating(null);
      }
    },
    [filters, onApply]
  );

  return (
    <section className="screen sort-page" aria-label="หน้าจัดเรียงสินค้า">
      <PageHeader
        title="เรียงลำดับ"
        onBack={onBack}
        actions={
          selectedValue !== "newest" ? (
            <button
              type="button"
              className="sort-reset-icon"
              onClick={() => void applySort("newest")}
              aria-label="กลับไปใช้การเรียงค่าเริ่มต้น"
            >
              <RefreshIcon size={18} />
            </button>
          ) : undefined
        }
      />

      <div className="sort-page-body">
        <section className="sort-hero-card">
          <div className="sort-hero-pill">
            <SortToolbarIcon size={16} />
            เลือกครั้งเดียว ใช้ได้ทันที
          </div>

          <div className="sort-hero-copy">
            <h2>เริ่มดูช็อปจากมุมที่ตรงกับสิ่งที่คุณหา</h2>
            <p>
              แตะตัวเลือกที่ต้องการ แล้วระบบจะพากลับไปหน้าช็อปพร้อมใช้การเรียงนี้ทันที
            </p>
          </div>

          <div className="sort-current-card">
            <span className="sort-current-label">กำลังใช้อยู่</span>
            <strong>{selectedOption.label}</strong>
            <p>{selectedOption.description}</p>
          </div>
        </section>

        {inlineMessage ? (
          <div className="sort-inline-alert" role="alert">
            {inlineMessage}
          </div>
        ) : (
          <div className="sort-inline-note" aria-live="polite">
            ถ้าเลือก <b>ใกล้ที่สุด</b> ระบบจะขอใช้ตำแหน่งเพื่อคำนวณระยะทางให้ทันที
          </div>
        )}

        {sortOptionGroups.map((group) => (
          <section key={group.id} className="sort-section-block" aria-labelledby={`sort-group-${group.id}`}>
            <div className="sort-section-head">
              <h3 id={`sort-group-${group.id}`}>{group.title}</h3>
              <p>{group.description}</p>
            </div>

            <div className="sort-choice-list">
              {group.options.map((option) => {
                const selected = selectedValue === option.value;
                const isLocating = locating === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`sort-choice-card tone-${option.tone}${selected ? " selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => void applySort(option.value)}
                    disabled={Boolean(locating)}
                  >
                    <span className={`sort-choice-icon tone-${option.tone}`} aria-hidden="true">
                      <SortOptionIcon value={option.value} />
                    </span>

                    <span className="sort-choice-copy">
                      <span className="sort-choice-title-row">
                        <strong>{option.label}</strong>
                        <em>{option.badge}</em>
                      </span>
                      <span>{option.description}</span>
                    </span>

                    <span className="sort-choice-tail">
                      {isLocating ? (
                        <span className="sort-choice-status">กำลังใช้ตำแหน่ง...</span>
                      ) : selected ? (
                        <span className="sort-choice-check" aria-hidden="true">
                          <CheckIcon size={16} />
                        </span>
                      ) : (
                        <span className="sort-choice-action">เลือก</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
