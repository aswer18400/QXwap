import { Bookmark, BookmarkCheck, HeartHandshake } from "lucide-react";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { conditionPercent, wantedImage } from "../lib/format";
import type { Item } from "../lib/types";
import { Price } from "./Price";

export function ProductGridCard({
  item,
  onOpen,
  onOffer,
  onSave,
  onTag
}: {
  item: Item;
  onOpen: (i: Item) => void;
  onOffer: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
}) {
  const tag = item.wanted.tags[0] || "ข้อเสนอ";
  return (
    <article className="shop-card" onClick={() => onOpen(item)}>
      <div className="shop-photo">
        <button
          className="shop-photo-open"
          aria-label={`เปิดรายละเอียด ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(item);
          }}
        >
          <img src={asset(item.media.images[0]) || wantedFallbacks.Other} loading="lazy" alt={item.title} />
        </button>
        <button
          className="save"
          aria-label={item.viewer.is_bookmarked ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
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
            onClick={(e) => {
              e.stopPropagation();
              onOpen(item);
            }}
          >
            {item.title}
          </button>
        </h2>
        <div className="wanted-product">
          <img src={wantedImage(item)} alt={`ตัวอย่างสิ่งที่อยากได้ ${tag}`} />
          <span>อยากแลกกับ {tag}</span>
        </div>
        <div className="shop-foot">
          <Price item={item} compact />
          <button
            aria-label={`Xwap ${item.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onOffer(item);
            }}
          >
            <HeartHandshake size={16} /> Xwap
          </button>
        </div>
        <div className="tags mini">
          {item.wanted.tags.slice(0, 2).map((t) => (
            <button
              key={t}
              aria-label={`ค้นหา ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                onTag(t);
              }}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
