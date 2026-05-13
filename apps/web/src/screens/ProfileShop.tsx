import { profileProductTabs } from "../design-system";
import type { Item } from "../lib/types";
import { ProfileProductCard } from "../components/ProfileProductCard";
import { WantedPreviewCard } from "../components/WantedPreviewCard";

export function ProfileShop({
  items,
  productTab,
  setProductTab,
  openItem,
  isOwn
}: {
  items: Item[];
  productTab: "have" | "want";
  setProductTab: (tab: "have" | "want") => void;
  openItem: (item: Item) => void;
  isOwn: boolean;
}) {
  return (
    <section>
      <div className="profile-product-tabs" role="tablist" aria-label="รายการในโปรไฟล์">
        {profileProductTabs.map((tab) => (
          <button
            key={tab.id}
            className={productTab === tab.id ? "on" : ""}
            role="tab"
            aria-selected={productTab === tab.id}
            onClick={() => setProductTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="shop-grid">
          {items.map((item) =>
            productTab === "have" ? (
              <ProfileProductCard key={item.id} item={item} openItem={openItem} />
            ) : (
              <WantedPreviewCard key={item.id} item={item} />
            )
          )}
        </div>
      ) : (
        <div className="empty">{isOwn ? "ยังไม่มีสินค้าในร้าน" : "ผู้ใช้นี้ยังไม่มีสินค้า"}</div>
      )}
    </section>
  );
}
