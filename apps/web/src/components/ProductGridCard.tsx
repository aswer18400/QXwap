import { useState } from "react";
import { Bookmark, BookmarkCheck, XwapActionIcon } from "./AppIcons";
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const offerDisabled = item.viewer.is_owner || !canXwap(user);
  const offerLabel = item.viewer.is_owner ? "สินค้าของคุณ" : user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap";
  const fallbackImage = wantedFallbacks[item.category] || wantedFallbacks.Other;
  const displayImage = asset(item.media.images[0]) || fallbackImage;
  const visibleTags = item.wanted.tags.slice(0, 2);
  const remainingTags = item.wanted.tags.length - visibleTags.length;

  return (
    <article className="product-grid-card" data-own-item={item.viewer.is_owner} role="listitem">
      <div className="product-card-media">
        <button
          type="button"
          className="product-image-btn"
          aria-label={`ดูรายละเอียด ${item.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item);
          }}
        >
          <div className={`product-image-frame${imageLoaded ? " loaded" : ""}${imageFailed ? " error" : ""}`}>
            <img
              src={displayImage}
              loading="lazy"
              alt={item.title}
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
            {!imageLoaded ? <span className="product-image-skeleton qx-skeleton-box" aria-hidden="true" /> : null}
            <span className="image-overlay" aria-hidden="true">
              <span className="view-text">ดูรายละเอียด</span>
            </span>
          </div>
        </button>
        <div className="product-badges" aria-hidden="true">
          <ImageCountBadge count={item.media.images.length} />
          <span className="condition-badge">สภาพ {conditionPercent(item)}%</span>
        </div>
        <button
          type="button"
          className={`product-bookmark${item.viewer.is_bookmarked ? " active" : ""}`}
          aria-label={item.viewer.is_bookmarked ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onSave(item);
          }}
        >
          {item.viewer.is_bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>

      <div className="product-card-content">
        <button
          type="button"
          className="product-title-btn"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item);
          }}
        >
          <h2 className="product-title">{item.title}</h2>
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
                  aria-label={`ดูสินค้า hashtag ${tag}`}
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
            className={`xwap-mini-btn${item.viewer.is_owner ? " own-item" : ""}`}
            aria-label={`Xwap ${item.title}`}
            disabled={offerDisabled}
            onClick={(event) => {
              event.stopPropagation();
              if (offerDisabled) return;
              onOffer(item);
            }}
          >
            <XwapActionIcon size={15} />
            <span>{offerLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
