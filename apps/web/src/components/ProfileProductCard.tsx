import { asset } from "../lib/api";
import { dealLabels, wantedFallbacks } from "../lib/constants";
import { conditionPercent } from "../lib/format";
import type { Item } from "../lib/types";
import { DealTypeBadge } from "./DealTypeBadge";
import { ImageCountBadge } from "./ImageCountBadge";
import { Price } from "./Price";

export function ProfileProductCard({
  item,
  openItem
}: {
  item: Item;
  openItem: (item: Item) => void;
}) {
  const wantedSummary = item.wanted.text || (item.wanted.tags.length ? `ต้องการ ${item.wanted.tags.slice(0, 2).join(" · ")}` : "เปิดรับข้อเสนอ");

  return (
    <button className="profile-product-card" onClick={() => openItem(item)} aria-label={`เปิดรายละเอียด ${item.title}`}>
      <span className="profile-product-media">
        <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
        <ImageCountBadge count={item.media.images.length} />
        <span className="profile-product-deal">
          <DealTypeBadge type={item.deal.type} label={dealLabels[item.deal.type]} />
        </span>
      </span>
      <span className="profile-product-copy">
        <b>{item.title}</b>
        <small className="profile-product-subline">
          {item.location.label || "ยังไม่ระบุพื้นที่"} · สภาพ {conditionPercent(item)}%
        </small>
        <small className="profile-product-wanted-line">{wantedSummary}</small>
      </span>
      <span className="profile-product-price-row">
        <Price item={item} compact />
      </span>
    </button>
  );
}
