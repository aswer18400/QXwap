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
        subtitle="เก็บสินค้าที่สนใจไว้ก่อน แล้วค่อยกลับมาเทียบหรือเปิดดีลภายหลัง"
        onBack={onBack}
      />
    );
  }

  return (
    <section className="screen saved-page">
      <PageHeader
        title="สินค้าที่บันทึก"
        subtitle={`${items.length} รายการที่คุณเก็บไว้ดูทีหลัง`}
        onBack={onBack}
        align="left"
        actions={<span className="page-header-icon"><SavedIcon size={18} /></span>}
      />
      <div className="panel saved-page-hero">
        <div>
          <small>คอลเลกชันของคุณ</small>
          <b>รวมสินค้าที่อยากกลับมาดูต่อในภายหลัง</b>
        </div>
        <span className="saved-page-count">{items.length} รายการ</span>
      </div>
      {loading ? <PageState state="loading" summary="กำลังโหลดรายการที่บันทึกไว้..." /> : null}
      {!loading && error ? <PageState state="error" summary={error} /> : null}
      {!loading && !error && !items.length ? (
        <PageState
          state="empty"
          title="ยังไม่มีรายการที่บันทึกไว้"
          summary="ถ้ายังไม่อยากตัดสินใจทันที คุณสามารถกดบันทึกสินค้าที่สนใจไว้ก่อน แล้วกลับมาเทียบทีหลังได้"
          details={[
            "กดหัวใจจากหน้า Home, Shop หรือหน้ารายละเอียดสินค้า",
            "รวมรายการที่สนใจไว้ในหน้าเดียวเพื่อกลับมาดูต่อ",
            "ใช้เปรียบเทียบก่อนเริ่มส่งข้อเสนอหรือเปิดแชท"
          ]}
          note="เริ่มจากบันทึกสินค้าที่คุณอยากกลับมาดูต่อภายหลัง"
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
