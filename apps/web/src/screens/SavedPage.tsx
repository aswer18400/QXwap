import type { Item, RequireLogin, User } from "../lib/types";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { ItemCard } from "../components/ItemCard";
import { PageState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { SavedIcon } from "../components/AppIcons";

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
  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="บันทึกไว้"
        subtitle="ดูรายการที่คุณบันทึกไว้"
        onBack={onBack}
      />
    );
  }

  return (
    <section className="screen saved-page">
      <PageHeader
        title="สินค้าที่บันทึก"
        subtitle={`${items.length} รายการ`}
        onBack={onBack}
        align="left"
        actions={<span className="page-header-icon"><SavedIcon size={18} /></span>}
      />
      {loading ? <PageState state="loading" summary="กำลังโหลดรายการที่บันทึกไว้..." /> : null}
      {!loading && error ? <PageState state="error" summary={error} /> : null}
      {!loading && !error && !items.length ? (
        <PageState
          state="empty"
          title="ยังไม่มีรายการที่บันทึกไว้"
          summary="กดบันทึกจากหน้าสินค้า แล้วรายการจะกลับมารวมที่นี่"
          actions={[{ label: "กลับไปดูสินค้า", onClick: onBack, variant: "secondary" }]}
        />
      ) : null}
      {!loading && !error && items.length ? (
        <div className="shop-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} variant="compact" onOpen={onOpenItem} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
