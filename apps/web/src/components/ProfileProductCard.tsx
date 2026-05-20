import { asset } from "../lib/api";
import { dealLabels, wantedFallbacks } from "../lib/constants";
import { conditionPercent } from "../lib/format";
import type { Item } from "../lib/types";
import { ImageCountBadge } from "./ImageCountBadge";

export function ProfileProductCard({
  item,
  openItem
}: {
  item: Item;
  openItem: (item: Item) => void;
}) {
  return (
    <button className="profile-product-card" onClick={() => openItem(item)} aria-label={`เปิดรายละเอียด ${item.title}`}>
      <span className="profile-product-media">
        <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
        <ImageCountBadge count={item.media.images.length} />
      </span>
      <b>{item.title}</b>
      <small>
        {dealLabels[item.deal.type]} · สภาพ {conditionPercent(item)}%
      </small>
    </button>
  );
}
