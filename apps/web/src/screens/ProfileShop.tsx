import type { Item } from "../lib/types";
import { ContextEmptyState } from "../components/ContextEmptyState";
import { ItemCard } from "../components/ItemCard";

export function ProfileShop({
  items,
  openItem,
  isOwn,
  onEdit,
  onToggleAvailability,
  onDelete
}: {
  items: Item[];
  openItem: (item: Item) => void;
  isOwn: boolean;
  onEdit?: (item: Item) => void;
  onToggleAvailability?: (item: Item) => void;
  onDelete?: (item: Item) => void;
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
            <div key={item.id} className="profile-listing-shell">
              <ItemCard item={item} variant="compact" onOpen={openItem} />
              {isOwn && (onEdit || onToggleAvailability || onDelete) ? (
                <div className="action-row profile-listing-actions">
                  {onEdit ? (
                    <button type="button" className="secondary" onClick={() => onEdit(item)}>
                      แก้ไข
                    </button>
                  ) : null}
                  {onToggleAvailability ? (
                    <button type="button" className="secondary" onClick={() => onToggleAvailability(item)}>
                      {item.status === "inactive" ? "เปิดประกาศอีกครั้ง" : "ปิดประกาศ"}
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button type="button" className="danger" onClick={() => onDelete(item)}>
                      ลบ
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
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
