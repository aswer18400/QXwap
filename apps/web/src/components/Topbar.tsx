import { Bell, Bookmark, Search } from "lucide-react";
import { BrandWordmark } from "./BrandMark";

export function Topbar({
  noticeCount,
  onHome,
  onSearch,
  onSaved,
  onNotifications
}: {
  noticeCount: number;
  onHome: () => void;
  onSearch: () => void;
  onSaved: () => void;
  onNotifications: () => void;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="กลับหน้าแนะนำ">
        <BrandWordmark />
      </button>
      <div className="top-actions">
        <button className="icon-btn" onClick={onSearch} aria-label="ค้นหา">
          <Search size={20} />
        </button>
        <button className="icon-btn" onClick={onSaved} aria-label="บันทึกไว้">
          <Bookmark size={20} />
        </button>
        <button className="icon-btn" onClick={onNotifications} aria-label="ข้อเสนอและโนติฟิเคชัน">
          <Bell size={20} />
          {noticeCount ? <b aria-label={`${noticeCount} รายการใหม่`}>{noticeCount}</b> : null}
        </button>
      </div>
    </header>
  );
}
