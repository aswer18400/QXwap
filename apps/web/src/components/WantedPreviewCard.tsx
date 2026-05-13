import { wantedImage } from "../lib/format";
import type { Item } from "../lib/types";

export function WantedPreviewCard({ item }: { item: Item }) {
  const title = item.wanted.tags[0] || "เปิดรับข้อเสนอ";
  return (
    <div className="profile-product-card wanted">
      <img src={wantedImage(item)} alt={`ตัวอย่างสิ่งที่อยากได้ ${title}`} />
      <b>{title}</b>
      <small>{item.wanted.text || "พร้อมรับข้อเสนอใกล้เคียง"}</small>
    </div>
  );
}
