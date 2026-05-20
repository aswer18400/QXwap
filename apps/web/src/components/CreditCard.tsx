import { Gift } from "lucide-react";
import type { RequireLogin, User, Wallet } from "../lib/types";

export function CreditCard({
  wallet,
  user,
  requireLogin,
  openWallet
}: {
  wallet: Wallet | null;
  user: User | null;
  requireLogin: RequireLogin;
  openWallet: () => void;
}) {
  return (
    <section className="credit-card">
      <div>
        <span>กระเป๋าเครดิต</span>
        <strong>
          {user ? `${(wallet?.credit_balance || 0).toLocaleString()} เครดิต` : "เข้าสู่ระบบเพื่อดูยอดเครดิต"}
        </strong>
      </div>
      <button onClick={user ? openWallet : () => requireLogin("เข้าสู่ระบบก่อนเพื่อเปิดกระเป๋าเครดิต")}>
        <Gift size={20} />
        {user ? "เปิดกระเป๋า" : "เข้าสู่ระบบ"}
      </button>
    </section>
  );
}
