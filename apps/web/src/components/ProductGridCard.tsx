import {
  Bookmark,
  BookmarkCheck,
  DistanceIcon,
  LocationMetaIcon,
  SwapDealIcon,
  TrustScoreIcon,
  SparklesIcon
} from "./AppIcons";
import { asset } from "../lib/api";
import { categoryLabels, wantedFallbacks } from "../lib/constants";
import { conditionPercent } from "../lib/format";
import type { Item } from "../lib/types";
import { DealTypeBadge } from "./DealTypeBadge";
import { ImageCountBadge } from "./ImageCountBadge";
import { Price } from "./Price";

export function ProductGridCard({
  item,
  onOpen,
  onSave,
  onTag
}: {
  item: Item;
  onOpen: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
}) {
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
  const subtitleLine = `${categoryLabels[item.category] || item.category} · ${item.location.label || "ทั่วไทย"}`;
  const ownerMetaLine = [
    item.owner.rating > 0 ? `★ ${item.owner.rating.toFixed(1)}` : null,
    locationLabel || null
  ].filter(Boolean).join(" · ");
  const tradeInfoLabel = item.stats.requests ? `${item.stats.requests} ข้อเสนอ` : item.is_fast_responder ? "ตอบไว" : item.is_featured ? "แนะนำ" : "พร้อมคุย";

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
        <div className="shop-photo-badges">
          <span className="condition-pill">{conditionPercent(item)}%</span>
        </div>
      </div>
      <div className="shop-card-body">
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
        <div className="shop-card-summary-line">{subtitleLine}</div>
        <div className="shop-card-price-row">
          <Price item={item} compact />
        </div>
        <div className="shop-card-supporting">
          <div className="shop-card-location">
            <span>
              <LocationMetaIcon size={13} />
              {locationLabel}
            </span>
            {distanceLabel ? (
              <span className="shop-card-distance">
                <DistanceIcon size={13} />
                {distanceLabel}
              </span>
            ) : null}
          </div>
          <div className="shop-card-wanted">
            <SwapDealIcon size={13} />
            <span>
              <b>ต้องการ:</b> {wantedSummary}
            </span>
          </div>
        </div>
        <div className="shop-card-owner-row">
          <div className="shop-card-owner">
            {item.owner.avatar_url ? (
              <img src={asset(item.owner.avatar_url)} alt={item.owner.name || "เจ้าของสินค้า"} />
            ) : (
              <span>{(item.owner.name || "Q").slice(0, 1)}</span>
            )}
            <span>
              <b>{item.owner.name || "QXwap user"}</b>
              <small>{ownerMetaLine || "พร้อมคุยแลก"}</small>
            </span>
          </div>
          <span className="shop-card-request-count">
            {item.stats.requests ? <SparklesIcon size={12} /> : <TrustScoreIcon size={12} />}
            {tradeInfoLabel}
          </span>
        </div>
      </div>
    </article>
  );
}
