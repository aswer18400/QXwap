import { getLoginCtaContent } from "./LoginCTA";
import type { RequireLogin } from "../lib/types";

export function AuthNudge({
  requireLogin,
  title = "QXwap",
  withBottomNav = true
}: {
  requireLogin: RequireLogin;
  title?: string;
  withBottomNav?: boolean;
}) {
  const content = getLoginCtaContent(title);
  const dockSummary =
    title === "QXwap" ? "คุย ต่อรอง และติดตามดีลได้ต่อเนื่องหลังเข้าสู่ระบบ" : `ปลดล็อกหน้า${title} แล้วกลับมาทำต่อได้ทันที`;

  return (
    <div className={`auth-nudge${withBottomNav ? "" : " auth-nudge--no-nav"}`}>
      <div className="auth-nudge-card">
        <div className="auth-nudge-copy">
          <span className="auth-nudge-chip">{content.eyebrow}</span>
          <span>
            <b>{content.action || "เข้าสู่ระบบเพื่อใช้งานต่อ"}</b>
            <small>{dockSummary}</small>
          </span>
        </div>
        <button
          className="primary"
          onClick={() => requireLogin(content.message)}
        >
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
