import { asset } from "../lib/api";
import type { Item, WantedItem } from "../lib/types";
import { wantedFallbacks } from "../lib/constants";
import { StatusBadge } from "./StatusBadge";

export function WantedItemCard({
  item,
  wantedItem,
  variant = "preview"
}: {
  item?: Item | null;
  wantedItem?: WantedItem | null;
  variant?: "preview" | "feed";
}) {
  const title = wantedItem?.title || item?.wanted.tags[0] || "เปิดรับข้อเสนอ";
  const description = wantedItem?.wanted_text || item?.wanted.text || "พร้อมรับข้อเสนอใกล้เคียง";
  const image = item?.media.images?.[0] || wantedFallbacks.Other;

  return (
    <div className={`profile-product-card wanted app-wanted-item-card app-wanted-item-card--${variant}`}>
      <img src={asset(image) || wantedFallbacks.Other} alt={`ตัวอย่างสิ่งที่อยากได้ ${title}`} />
      <div className="app-wanted-item-card__copy">
        <b>{title}</b>
        <small>{description}</small>
        {wantedItem?.deal_type || item?.deal.type ? (
          <span className="app-wanted-item-card__badge">
            <StatusBadge kind="dealType" status={wantedItem?.deal_type || item?.deal.type || "swap"} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
