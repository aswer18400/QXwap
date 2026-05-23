import { Bookmark, BookmarkCheck, DistanceIcon, LocationMetaIcon, SwapDealIcon, XwapActionIcon } from "./AppIcons";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Item, User } from "../lib/types";
import { DealTypeBadge } from "./DealTypeBadge";
import { ImageCountBadge } from "./ImageCountBadge";
import { Price } from "./Price";

export function ProductGridCard({
  item,
  user,
  onOpen,
  onOffer,
  onSave,
  onTag
}: {
  item: Item;
  user: User | null;
  onOpen: (i: Item) => void;
  onOffer: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
}) {
  const offerDisabled = item.viewer.is_owner || !canXwap(user);
  const offerLabel = item.viewer.is_owner ? "สินค้าของคุณ" : user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap";
  const locationLabel = item.location.label || "ยังไม่ระบุพื้นที่";
  const distanceLabel =
    item.location.distance_km == null
      ? ""
      : item.location.distance_km < 1
        ? "< 1 กม."
        : item.location.distance_km < 10
        ? `${item.location.distance_km.toFixed(1)} กม.`
        : `${Math.round(item.location.distance_km)} กม.`;
  const wantedSummary = item.wanted.text || (item.wanted.tags.length ? `ต้องการแลก ${item.wanted.tags.slice(0, 2).join(" · ")}` : "เปิดรับข้อเสนอ");
  const primaryWantedTag = item.wanted.tags[0];
  const dealTypeLabel =
    item.deal.type === "swap"
      ? "แลกเท่านั้น"
      : item.deal.type === "both"
        ? "ขายหรือแลก"
        : item.deal.type === "sell"
          ? "ขาย"
          : "ต้องการซื้อ";

  return (
    <article className="shop-card">
      <div className="shop-photo">
        <button
          className="shop-photo-open"
          aria-label={`เปิดรายละเอียด ${item.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item);
          }}
        >
          <img src={asset(item.media.images[0]) || wantedFallbacks.Other} loading="lazy" alt={item.title} />
        </button>
        <ImageCountBadge count={item.media.images.length} />
        <button
          className="save"
          aria-label={item.viewer.is_bookmarked ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onSave(item);
          }}
        >
          {item.viewer.is_bookmarked ? <BookmarkCheck /> : <Bookmark />}
        </button>
        <span className="condition-pill">สภาพ {conditionPercent(item)}%</span>
      </div>
      <div className="shop-card-body">
        <h2>
          <button
            className="card-title-button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(item);
            }}
          >
            {item.title}
          </button>
        </h2>
        <div className="shop-card-meta-row">
          <DealTypeBadge type={item.deal.type} label={dealTypeLabel} />
          {primaryWantedTag ? (
            <button
              className="shop-card-tag shop-card-tag--inline"
              type="button"
              aria-label={`ค้นหา ${primaryWantedTag}`}
              onClick={(event) => {
                event.stopPropagation();
                onTag(primaryWantedTag);
              }}
            >
              #{primaryWantedTag}
            </button>
          ) : null}
        </div>
        <div className="shop-card-supporting">
          <div className="shop-card-location">
            <span>
              <LocationMetaIcon size={14} />
              {locationLabel}
            </span>
            {distanceLabel ? (
              <span className="shop-card-distance">
                <DistanceIcon size={14} />
                {distanceLabel}
              </span>
            ) : null}
          </div>
          <div className="shop-card-wanted">
            <SwapDealIcon size={14} />
            <span>{wantedSummary}</span>
          </div>
        </div>
        <div className="shop-foot">
          <Price item={item} compact />
          <button
            aria-label={`Xwap ${item.title}`}
            disabled={offerDisabled}
            onClick={(event) => {
              event.stopPropagation();
              if (offerDisabled) return;
              onOffer(item);
            }}
          >
            <XwapActionIcon size={16} /> {offerLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
