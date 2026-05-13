import { Gift } from "lucide-react";
import type { RequireLogin, User, Wallet } from "../lib/types";

export function CreditCard({
  wallet,
  user,
  requireLogin
}: {
  wallet: Wallet | null;
  user: User | null;
  requireLogin: RequireLogin;
}) {
  return (
    <section className="credit-card">
      <div>
        <span>เครดิต QXwap / Manu Credit</span>
        <strong>
          {user ? `${(wallet?.credit_balance || 0).toLocaleString()} เครดิต` : "เริ่มสะสมเครดิต"}
        </strong>
      </div>
      <button onClick={user ? undefined : () => requireLogin("กรุณาเข้าสู่ระบบก่อนเพื่อสะสมเครดิต")}>
        <Gift size={20} />
        {user ? "ของรางวัล" : "เริ่มสะสม"}
      </button>
    </section>
  );
}
