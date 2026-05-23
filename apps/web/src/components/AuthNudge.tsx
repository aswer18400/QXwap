import type { RequireLogin } from "../lib/types";

export function AuthNudge({ requireLogin }: { requireLogin: RequireLogin }) {
  return (
    <div className="auth-nudge">
      <div className="auth-nudge-card">
        <span>
          <b>เข้าสู่ระบบเพื่อเริ่ม Xwap</b>
          <small>คุย ต่อรอง และส่ง Xwap ได้ทันที</small>
        </span>
        <button
          className="primary"
          onClick={() => requireLogin("กรุณาเข้าสู่ระบบก่อนเพื่อใช้งานฟีเจอร์ Xwap")}
        >
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
