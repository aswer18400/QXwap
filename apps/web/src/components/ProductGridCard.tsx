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
  const offerDisabled = item.viewer.is_owner || !canXwap(user);
  const offerLabel = item.viewer.is_owner ? "สินค้าของคุณ" : user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap";
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
          <DealTypeBadge type={item.deal.type} />
          {item.wanted.tags[0] ? (
            <button
              className="shop-card-tag"
              type="button"
              aria-label={`ค้นหา ${item.wanted.tags[0]}`}
              onClick={(event) => {
                event.stopPropagation();
                onTag(item.wanted.tags[0]);
              }}
            >
              #{item.wanted.tags[0]}
            </button>
          ) : null}
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
        {item.wanted.tags.length > 1 ? (
          <div className="tags mini">
            {item.wanted.tags.slice(1, 3).map((tag) => (
              <button
                key={tag}
                aria-label={`ค้นหา ${tag}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onTag(tag);
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
