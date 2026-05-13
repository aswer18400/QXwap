import { asset } from "../lib/api";
import { dealLabels, wantedFallbacks } from "../lib/constants";
import { conditionPercent } from "../lib/format";
import type { Item } from "../lib/types";

export function ProfileProductCard({
  item,
  openItem
}: {
  item: Item;
  openItem: (item: Item) => void;
}) {
  return (
    <button className="profile-product-card" onClick={() => openItem(item)} aria-label={`เปิดรายละเอียด ${item.title}`}>
      <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
      <b>{item.title}</b>
      <small>
        {dealLabels[item.deal.type]} · สภาพ {conditionPercent(item)}%
      </small>
    </button>
  );
}
