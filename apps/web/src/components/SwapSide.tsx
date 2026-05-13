import { asset } from "../lib/api";
import { conditionPercent } from "../lib/format";
import type { Item } from "../lib/types";

export function SwapSide({
  label,
  item,
  fallbackTitle,
  fallbackImage,
  onOpen,
  right,
  tags = []
}: {
  label: string;
  item: Item | null;
  fallbackTitle: string;
  fallbackImage: string;
  onOpen: (i: Item) => void;
  right?: boolean;
  tags?: string[];
}) {
  return (
    <button
      className={`swap-side ${right ? "right" : ""} ${item ? "" : "placeholder"}`}
      onClick={() => item && onOpen(item)}
      aria-label={item ? `เปิดรายละเอียด ${item.title}` : fallbackTitle}
    >
      <img src={item ? asset(item.media.images[0]) : fallbackImage} alt={item?.title || fallbackTitle} />
      {label ? <span>{label}</span> : null}
      {item || fallbackTitle ? (
        <div className="swap-side-copy">
          <b>{item?.title || fallbackTitle}</b>
          {item ? (
            <small>
              @{item.owner.name || "qxwap"} · สภาพ {conditionPercent(item)}%
            </small>
          ) : null}
        </div>
      ) : null}
      {tags.length ? (
        <div className="swap-side-tags" aria-label={right ? "แท็กของที่อยากได้" : "แท็กของที่มี"}>
          {tags.slice(0, 3).map((tag) => (
            <em key={tag}>#{tag}</em>
          ))}
        </div>
      ) : null}
    </button>
  );
}
