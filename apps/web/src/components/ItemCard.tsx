import type { KeyboardEvent } from "react";
import { Bookmark, BookmarkCheck, LocationMetaIcon } from "./AppIcons";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { Item } from "../lib/types";
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
  const visibleTags = item.wanted.tags.filter(Boolean).slice(0, 3);
  const ownerName = item.owner.name || "QXwap user";
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
        </span>
        <span className="profile-product-copy">
          <b>{item.title}</b>
          <small className="profile-product-subline">{locationLabel}</small>
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
        <div className="shop-card-price-row">
          <Price item={item} compact />
        </div>
        <div className="shop-card-location">
          <span title={locationLabel}>
            <LocationMetaIcon size={13} />
            {locationLabel}
          </span>
        </div>
        {visibleTags.length ? (
          <div className="shop-card-tag-row" aria-label="แท็กที่เกี่ยวข้อง">
            {visibleTags.map((tag) =>
              onTag ? (
                <button
                  key={tag}
                  className="shop-card-tag"
                  type="button"
                  aria-label={`ค้นหา ${tag}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTag(tag);
                  }}
                >
                  #{tag}
                </button>
              ) : (
                <span key={tag} className="shop-card-tag">
                  #{tag}
                </span>
              )
            )}
          </div>
        ) : null}
        <div className="shop-card-owner-row">
          <div className="shop-card-owner">
            <Avatar src={item.owner.avatar_url} name={item.owner.name} size={34} />
            <span>
              <b>{ownerName}</b>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
