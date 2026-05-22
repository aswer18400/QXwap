import { useState } from "react";
import { Bookmark, BookmarkCheck, XwapActionIcon } from "./AppIcons";
import { DealTypeBadge } from "./DealTypeBadge";
import { ImageCountBadge } from "./ImageCountBadge";
import { Price } from "./Price";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Item, User } from "../lib/types";

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isOwnItem = Boolean(item.viewer.is_owner || (user && item.owner.id === user.id));
  const isBookmarked = Boolean(item.viewer.is_bookmarked);
  const offerDisabled = isOwnItem || Boolean(user && !canXwap(user));
  const offerLabel = isOwnItem ? "สินค้าของคุณ" : user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap";
  const actionStateClass = isOwnItem ? " own-item" : offerDisabled ? " disabled" : "";
  const fallbackImage = wantedFallbacks[item.category] || wantedFallbacks.Other;
  const displayImage = asset(item.media.images[0]) || fallbackImage;
  const visibleTags = item.wanted.tags.slice(0, 2);
  const remainingTags = item.wanted.tags.length - visibleTags.length;

  return (
    <article
      className="product-grid-card"
      data-own-item={isOwnItem}
      role="listitem"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="product-card-media">
        <button
          type="button"
          className="product-image-btn"
          onClick={() => onOpen(item)}
          aria-label={`ดูรายละเอียด ${item.title}`}
        >
          <div className={`image-wrapper${imageLoaded ? " loaded" : ""}${imageFailed ? " error" : ""}`}>
            <img
              src={displayImage}
              alt={item.title}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={(event) => {
                const target = event.currentTarget;
                if (displayImage === fallbackImage || target.dataset.fallbackApplied === "true") {
                  setImageFailed(true);
                  setImageLoaded(true);
                  return;
                }
                target.dataset.fallbackApplied = "true";
                target.src = fallbackImage;
              }}
            />
            {!imageLoaded && !imageFailed ? <span className="image-skeleton skeleton-pulse" aria-hidden="true" /> : null}
            <span className={`image-overlay${isHovered ? " visible" : ""}`} aria-hidden="true">
              <span className="view-text">ดูรายละเอียด</span>
            </span>
          </div>
        </button>

        <div className="product-badges" aria-hidden="true">
          <ImageCountBadge count={item.media.images.length} />
          {item.condition ? <span className="condition-badge">สภาพ {conditionPercent(item)}%</span> : null}
        </div>

        <button
          type="button"
          className={`product-bookmark${isBookmarked ? " active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSave(item);
          }}
          aria-label={isBookmarked ? "ยกเลิกบันทึก" : "บันทึกสินค้า"}
        >
          {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>

      <div className="product-card-content">
        <button type="button" className="product-title-btn" onClick={() => onOpen(item)}>
          <h3 className="product-title">{item.title}</h3>
        </button>

        <div className="product-meta">
          <DealTypeBadge type={item.deal.type} />
          {visibleTags.length ? (
            <div className="product-tags">
              {visibleTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="tag-chip"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTag(tag);
                  }}
                >
                  #{tag}
                </button>
              ))}
              {remainingTags > 0 ? <span className="tag-chip more">+{remainingTags}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="product-price-row">
          <Price item={item} compact />
        </div>

        {item.wanted.text ? <p className="product-wanted-text">{item.wanted.text}</p> : null}

        <div className="product-actions">
          <button
            type="button"
            className={`xwap-mini-btn${actionStateClass}`}
            onClick={() => {
              if (!offerDisabled) onOffer(item);
            }}
            disabled={offerDisabled}
          >
            <XwapActionIcon size={14} />
            <span>{offerLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
