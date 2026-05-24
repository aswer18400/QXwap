import type { Item } from "../lib/types";
import { ProfileProductCard } from "../components/ProfileProductCard";

export function ProfileShop({
  items,
  openItem,
  isOwn
}: {
  items: Item[];
  openItem: (item: Item) => void;
  isOwn: boolean;
}) {
  return (
    <section>
      <div className="section-head compact">
        <h2>{isOwn ? "สินค้าของคุณ" : "สินค้าในร้าน"}</h2>
      </div>
      {items.length ? (
        <div className="shop-grid">
          {items.map((item) => (
            <ProfileProductCard key={item.id} item={item} openItem={openItem} />
          ))}
        </div>
      ) : (
        <div className="empty">{isOwn ? "ยังไม่มีสินค้าในร้าน" : "ผู้ใช้นี้ยังไม่มีสินค้า"}</div>
      )}
    </section>
  );
}
