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
              ? "เพิ่มรายการแรกของคุณเพื่อให้คนอื่นเริ่มเห็นร้านและส่งข้อเสนอเข้ามาได้"
              : "ตอนนี้หน้าร้านของผู้ใช้นี้ยังไม่มีรายการที่เปิดขายหรือเปิดแลกอยู่"
          }
          details={
            isOwn
              ? [
                  "ใส่รูป ชื่อสินค้า และสภาพให้ครบก่อนเผยแพร่",
                  "กำหนดได้ว่าจะขาย แลก หรือเปิดรับได้ทั้งสองแบบ",
                  "สินค้าที่ลงแล้วจะไปแสดงทั้งในร้านและหน้าแนะนำ"
                ]
              : [
                  "ลองกลับมาดูใหม่ภายหลังเมื่อมีรายการใหม่เข้า",
                  "หรือเปิดดูโปรไฟล์และข้อมูลการตอบรับของร้านนี้ก่อน"
                ]
          }
          note={isOwn ? "ยิ่งใส่ข้อมูลครบตั้งแต่แรก คนอื่นจะตัดสินใจส่งข้อเสนอได้เร็วขึ้น" : undefined}
        />
      )}
    </section>
  );
}
