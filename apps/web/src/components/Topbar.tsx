import { Bell, Search, User as UserIcon } from "lucide-react";
import { asset } from "../lib/api";
import type { RequireLogin, User } from "../lib/types";

export function Topbar({
  user,
  noticeCount,
  onHome,
  onSearch,
  onNotifications,
  onProfile,
  requireLogin
}: {
  user: User | null;
  noticeCount: number;
  onHome: () => void;
  onSearch: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  requireLogin: RequireLogin;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="กลับหน้าแนะนำ">
        Q<span>X</span>wap
      </button>
      <div className="top-actions">
        <button className="icon-btn" onClick={onSearch} aria-label="ค้นหา">
          <Search size={20} />
        </button>
        <button className="icon-btn" onClick={onNotifications} aria-label="ข้อเสนอและโนติฟิเคชัน">
          <Bell size={20} />
          {noticeCount ? <b aria-label={`${noticeCount} รายการใหม่`}>{noticeCount}</b> : null}
        </button>
        <button
          className="avatar-btn"
          onClick={() => (user ? onProfile() : requireLogin())}
          aria-label={user ? "เปิดโปรไฟล์" : "เข้าสู่ระบบ"}
        >
          {user?.avatar_url ? (
            <img src={asset(user.avatar_url)} alt={user.display_name || user.username || "โปรไฟล์"} />
          ) : (
            <UserIcon size={20} />
          )}
        </button>
      </div>
    </header>
  );
}
