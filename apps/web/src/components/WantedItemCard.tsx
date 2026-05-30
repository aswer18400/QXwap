import type { KeyboardEvent } from "react";
import { asset } from "../lib/api";
import type { Item, WantedItem } from "../lib/types";
import { wantedFallbacks } from "../lib/constants";

export function WantedItemCard({
  item,
  wantedItem,
  variant = "preview",
  onOpen
}: {
  item?: Item | null;
  wantedItem?: WantedItem | null;
  variant?: "preview" | "feed";
  onOpen?: () => void;
}) {
  const title = wantedItem?.title || item?.wanted.tags[0] || "เปิดรับข้อเสนอ";
  const description = wantedItem?.wanted_text || item?.wanted.text || "พร้อมรับข้อเสนอใกล้เคียง";
  const image = wantedItem?.reference_images?.[0] || item?.media.images?.[0] || wantedFallbacks.Other;
  const visibleTags = (wantedItem?.wanted_tags || item?.wanted.tags || []).filter(Boolean).slice(0, 2);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onOpen || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onOpen();
  };
  const content = (
    <>
      <img src={asset(image) || wantedFallbacks.Other} alt={`ตัวอย่างสิ่งที่อยากได้ ${title}`} />
      <div className="app-wanted-item-card__copy">
        <b>{title}</b>
        <small>{description}</small>
        {visibleTags.length ? (
          <span className="app-wanted-item-card__tags">
            {visibleTags.map((tag) => (
              <span key={tag} className="shop-card-tag">#{tag}</span>
            ))}
          </span>
        ) : null}
      </div>
    </>
  );

  if (onOpen) {
    return (
      <div
        className={`profile-product-card wanted app-wanted-item-card app-wanted-item-card--${variant} app-wanted-item-card--interactive`}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`เปิดบริบทสิ่งที่อยากได้ ${title}`}
      >
        {content}
      </div>
    );
  }

  return <div className={`profile-product-card wanted app-wanted-item-card app-wanted-item-card--${variant}`}>{content}</div>;
}
