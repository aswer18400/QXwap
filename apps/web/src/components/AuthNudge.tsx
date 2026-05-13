import type { RequireLogin } from "../lib/types";

export function AuthNudge({ requireLogin }: { requireLogin: RequireLogin }) {
  return (
    <div className="auth-nudge">
      <div className="auth-nudge-card">
        <span>
          <b>เข้าสู่ระบบเพื่อใช้งาน QXwap</b>
          <small>Xwap และสะสมเครดิต</small>
        </span>
        <button
          className="primary"
          onClick={() => requireLogin("กรุณาเข้าสู่ระบบก่อนเพื่อใช้งานฟีเจอร์ Xwap และสะสมเครดิต")}
        >
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
