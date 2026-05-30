import type { KeyboardEvent } from "react";
import { Bookmark, BookmarkCheck, DistanceIcon, LocationMetaIcon, SparklesIcon, TrustScoreIcon } from "./AppIcons";
import { asset } from "../lib/api";
import { categoryLabels, wantedFallbacks } from "../lib/constants";
import { conditionBadgeLabel, formatDistanceKmValue, formatRatingValue } from "../lib/format";
import type { Item } from "../lib/types";
import { StatusBadge } from "./StatusBadge";
import { ImageCountBadge } from "./ImageCountBadge";
import { Price } from "./Price";
import { ImageCarousel } from "./ImageCarousel";
import { Avatar } from "./Avatar";

export function ItemCard({
  item,
  variant = "grid",
  onOpen,
  onSave,
  onTag
}: {
  item: Item;
  variant?: "grid" | "compact";
  onOpen: (item: Item) => void;
  onSave?: (item: Item) => void;
  onTag?: (tag: string) => void;
}) {
  const locationLabel = item.location.label || "ยังไม่ระบุพื้นที่";
  const distanceLabel = formatDistanceKmValue(item.location.distance_km);
  const wantedSummary = item.wanted.tags.length
    ? item.wanted.tags.slice(0, 2).join(" · ")
    : item.wanted.text || "คุยรายละเอียดเพิ่มเติมได้";
  const primaryWantedTag = item.wanted.tags[0];
  const subtitleLine = categoryLabels[item.category] || item.category;
  const ownerMetaLine = formatRatingValue(item.owner.rating) ? `★ ${formatRatingValue(item.owner.rating)}` : "ดูโปรไฟล์";
  const tradeInfoLabel = item.stats.requests ? `${item.stats.requests} ข้อเสนอ` : item.is_fast_responder ? "ตอบไว" : item.is_featured ? "แนะนำ" : "พร้อมคุย";
  const wantedPrefix = item.deal.type === "buy" ? "กำลังหา" : "อยากได้";
  const openCompactCard = () => onOpen(item);
  const handleCompactCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openCompactCard();
  };

  if (variant === "compact") {
    return (
      <div
        className="profile-product-card app-item-card app-item-card--compact"
        role="button"
        tabIndex={0}
        onClick={openCompactCard}
        onKeyDown={handleCompactCardKeyDown}
        aria-label={`เปิดรายละเอียด ${item.title}`}
      >
        <span className="profile-product-media">
          <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
          <ImageCountBadge count={item.media.images.length} />
          <span className="profile-product-deal">
            <StatusBadge kind="dealType" status={item.deal.type} />
          </span>
        </span>
        <span className="profile-product-copy">
          <b>{item.title}</b>
          <small className="profile-product-subline">{locationLabel} · {conditionBadgeLabel(item)}</small>
          <small className="profile-product-wanted-line">{item.wanted.text || (item.wanted.tags.length ? `ต้องการ ${item.wanted.tags.slice(0, 2).join(" · ")}` : "เปิดรับข้อเสนอ")}</small>
        </span>
        <span className="profile-product-price-row">
          <Price item={item} compact />
        </span>
      </div>
    );
  }

  return (
    <article className="shop-card app-item-card">
      <div className="shop-photo">
        <div
          className="shop-photo-open"
          role="button"
          tabIndex={0}
          aria-label={`เปิดรายละเอียด ${item.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            onOpen(item);
          }}
        >
          <ImageCarousel
            images={item.media.images}
            alt={item.title}
            fallback={wantedFallbacks.Other}
            countBadge={<ImageCountBadge count={item.media.images.length} />}
          />
        </div>
        {onSave ? (
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
        ) : null}
        <div className="shop-photo-badges">
          <span
            className="condition-pill"
            title="คะแนนสภาพโดยประมาณจากข้อมูลที่เจ้าของระบุ"
            aria-label={`คะแนนสภาพโดยประมาณ ${conditionBadgeLabel(item)}`}
          >
            {conditionBadgeLabel(item)}
          </span>
        </div>
      </div>
      <div className="shop-card-body">
        <div className="shop-card-meta-row">
          <StatusBadge kind="dealType" status={item.deal.type} />
          {primaryWantedTag && onTag ? (
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
            <span title={locationLabel}>
              <LocationMetaIcon size={13} />
              {locationLabel}
            </span>
            {distanceLabel ? (
              <span className="shop-card-distance" title="ระยะโดยประมาณจากตำแหน่งที่ใช้ค้นหา">
                <DistanceIcon size={13} />
                {distanceLabel}
              </span>
            ) : null}
          </div>
          <div className="shop-card-wanted" title={item.wanted.text || wantedSummary}>
            <span>
              <b>{wantedPrefix}</b> {wantedSummary}
            </span>
          </div>
        </div>
        <div className="shop-card-owner-row">
          <div className="shop-card-owner">
            <Avatar src={item.owner.avatar_url} name={item.owner.name} size={34} />
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
