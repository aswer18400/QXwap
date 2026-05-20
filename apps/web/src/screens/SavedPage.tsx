import type { Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { ProfileProductCard } from "../components/ProfileProductCard";

export function SavedPage({
  user,
  items,
  onBack,
  onOpenItem,
  loading,
  requireLogin
}: {
  user: User | null;
  items: Item[];
  onBack: () => void;
  onOpenItem: (item: Item) => void;
  loading: boolean;
  requireLogin: RequireLogin;
}) {
  if (!user) return <LoginCTA requireLogin={requireLogin} title="บันทึกไว้" />;

  return (
    <section className="screen">
      <PageHeader title="บันทึกไว้" subtitle="รายการที่คุณเก็บไว้ดูภายหลัง" onBack={onBack} />
      {loading ? <div className="empty">กำลังโหลดรายการที่บันทึกไว้...</div> : null}
      {!loading && !items.length ? <div className="empty">ยังไม่มีรายการที่บันทึกไว้</div> : null}
      {!loading && items.length ? (
        <div className="shop-grid">
          {items.map((item) => (
            <ProfileProductCard key={item.id} item={item} openItem={onOpenItem} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
