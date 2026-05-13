import type { RequireLogin } from "../lib/types";

export function LoginCTA({
  requireLogin,
  title = "QXwap"
}: {
  requireLogin: RequireLogin;
  text?: string;
  title?: string;
  action?: string;
}) {
  return (
    <div className="empty value-empty">
      <b>{title}</b>
      <button className="primary" onClick={() => requireLogin()}>
        เข้าสู่ระบบ
      </button>
    </div>
  );
}
