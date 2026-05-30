import { NotificationsNavIcon, SavedNavIcon, SearchNavIcon } from "./AppIcons";
import { BrandWordmark } from "./BrandMark";
import type { View } from "../lib/types";
import { AppHeader } from "./AppHeader";

export function Topbar({
  view,
  noticeCount,
  onHome,
  onSearch,
  onSaved,
  onNotifications
}: {
  view: View;
  noticeCount: number;
  onHome: () => void;
  onSearch: () => void;
  onSaved: () => void;
  onNotifications: () => void;
}) {
  const isShop = view === "shop" || view === "following";
  const isProfile = view === "profile";
  const title = isShop ? (view === "following" ? "ร้านที่ติดตาม" : "ร้านค้า") : isProfile ? "โปรไฟล์" : null;

  return (
    <AppHeader
      layout="topbar"
      title={title}
      brand={<BrandWordmark />}
      onPrimaryClick={onHome}
      actions={
        <>
          <button className="icon-btn" onClick={onSearch} aria-label="ค้นหา">
            <SearchNavIcon size={20} />
          </button>
          {isShop ? (
            <button className="icon-btn" onClick={onSaved} aria-label="บันทึกไว้">
              <SavedNavIcon size={20} />
            </button>
          ) : (
            <button className="icon-btn" onClick={onNotifications} aria-label="โนติฟิเคชัน">
              <NotificationsNavIcon size={20} />
              {noticeCount ? <b aria-label={`${noticeCount} รายการใหม่`}>{noticeCount}</b> : null}
            </button>
          )}
        </>
      }
    />
  );
}
