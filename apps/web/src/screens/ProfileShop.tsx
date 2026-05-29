import type { Item } from "../lib/types";
import { ContextEmptyState } from "../components/ContextEmptyState";
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
    <section className="profile-shop-shell">
      <div className="section-head compact">
        <h2>{isOwn ? "สินค้าของคุณ" : "สินค้าในร้าน"}</h2>
        <span className="profile-shop-count">{items.length} รายการ</span>
      </div>
      {items.length ? (
        <div className="shop-grid">
          {items.map((item) => (
            <ProfileProductCard key={item.id} item={item} openItem={openItem} />
          ))}
        </div>
      ) : (
        <ContextEmptyState
          title={isOwn ? "ยังไม่มีสินค้าในร้าน" : "ผู้ใช้นี้ยังไม่มีสินค้า"}
          summary={
            isOwn
              ? "ลงประกาศแรกของคุณเพื่อเริ่มรับข้อเสนอ"
              : "ตอนนี้หน้าร้านของผู้ใช้นี้ยังไม่มีรายการที่เปิดขายหรือเปิดแลกอยู่"
          }
          details={isOwn ? [] : ["ลองกลับมาดูใหม่ภายหลังเมื่อมีรายการใหม่เข้า"]}
        />
      )}
    </section>
  );
}
