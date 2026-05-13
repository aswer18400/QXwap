import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";
import { api } from "../lib/api";
import type { RequireLogin, User, Wallet } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";

export function WalletPage({
  user,
  requireLogin
}: {
  user: User | null;
  requireLogin: RequireLogin;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    if (user) api<{ wallet: Wallet }>("/wallet").then((d) => setWallet(d.wallet));
  }, [user]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="เครดิต" />;

  return (
    <section className="screen">
      <h1>
        <WalletCards /> เครดิต
      </h1>
      <div className="panel big">{wallet?.credit_balance || 0} เครดิต</div>
      <button
        className="primary"
        onClick={async () =>
          setWallet(
            (
              await api<{ wallet: Wallet }>("/wallet/deposit", {
                method: "POST",
                body: JSON.stringify({ amount: 100 })
              })
            ).wallet
          )
        }
      >
        เติม 100 เครดิต
      </button>
    </section>
  );
}
