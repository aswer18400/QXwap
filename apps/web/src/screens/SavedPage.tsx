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
  error,
  requireLogin
}: {
  user: User | null;
  items: Item[];
  onBack: () => void;
  onOpenItem: (item: Item) => void;
  loading: boolean;
  error: string;
  requireLogin: RequireLogin;
}) {
  if (!user) return <LoginCTA requireLogin={requireLogin} title="บันทึกไว้" />;

  return (
    <section className="screen">
      <PageHeader title="บันทึกไว้" onBack={onBack} />
      {loading ? <div className="empty">กำลังโหลดรายการที่บันทึกไว้...</div> : null}
      {!loading && error ? <div className="empty" role="alert">{error}</div> : null}
      {!loading && !error && !items.length ? (
        <div className="empty empty-action">
          <span>ยังไม่มีรายการที่บันทึกไว้</span>
          <button type="button" className="secondary" onClick={onBack}>
            กลับไปเลือกสินค้า
          </button>
        </div>
      ) : null}
      {!loading && !error && items.length ? (
        <div className="shop-grid">
          {items.map((item) => (
            <ProfileProductCard key={item.id} item={item} openItem={onOpenItem} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
