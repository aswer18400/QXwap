import { useEffect, useState } from "react";
import { CircleDollarSign, WalletCards } from "lucide-react";
import { api } from "../lib/api";
import type { RequireLogin, Transaction, User, Wallet } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { WalletSkeleton } from "../components/Skeletons";

const depositPresets = [100, 250, 500, 1000];

export function WalletPage({
  user,
  requireLogin,
  onBack
}: {
  user: User | null;
  requireLogin: RequireLogin;
  onBack?: () => void;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("250");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api<{ wallet: Wallet }>("/wallet"),
      api<{ transactions: Transaction[] }>("/transactions")
    ])
      .then(([walletData, transactionData]) => {
        setWallet(walletData.wallet);
        setTransactions(transactionData.transactions);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const parsedAmount = Number(amount || 0);
  const canDeposit = Number.isInteger(parsedAmount) && parsedAmount >= 50 && parsedAmount <= 50000;
  const transactionRows = transactions.slice(0, 8);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="เครดิต" />;
  if (loading) {
    return (
      <section className="screen wallet-screen">
        <WalletSkeleton />
      </section>
    );
  }

  async function depositCredits(nextAmount = parsedAmount) {
    setSaving(true);
    setError("");
    try {
      const walletData = await api<{ wallet: Wallet }>("/wallet/deposit", {
        method: "POST",
        body: JSON.stringify({ amount: nextAmount })
      });
      const transactionData = await api<{ transactions: Transaction[] }>("/transactions");
      setWallet(walletData.wallet);
      setTransactions(transactionData.transactions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen wallet-screen">
      {onBack ? <PageHeader title="กระเป๋าเครดิต" onBack={onBack} /> : null}
      <div className="wallet-hero panel">
        <div>
          <span className="wallet-kicker">กระเป๋าเครดิต</span>
          <h1>
            <WalletCards /> {(wallet?.credit_balance || 0).toLocaleString()} เครดิต
          </h1>
          <p>เครดิตใช้เพิ่มข้อเสนอและรางวัลการแลก ยังไม่รองรับการถอนเป็นเงินสด</p>
        </div>
        <div className="wallet-rule">
          <CircleDollarSign size={18} />
          เติมขั้นต่ำ 50 เครดิตต่อครั้ง
        </div>
      </div>

      <div className="panel wallet-deposit-panel">
        <div className="section-head compact">
          <h2>เติมเครดิต</h2>
        </div>
        <div className="wallet-preset-row" role="list" aria-label="จำนวนเครดิตแนะนำ">
          {depositPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={parsedAmount === preset ? "picked" : ""}
              onClick={() => setAmount(String(preset))}
            >
              +{preset}
            </button>
          ))}
        </div>
        <label className="wallet-input-label">
          จำนวนเครดิต
          <input
            inputMode="numeric"
            min={50}
            max={50000}
            placeholder="เช่น 250"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
        {error ? <p className="err">{error}</p> : null}
        <button className="primary wide" disabled={!canDeposit || saving} onClick={() => depositCredits()}>
          {saving ? "กำลังอัปเดตยอดเครดิต..." : `เติม ${parsedAmount || 0} เครดิต`}
        </button>
      </div>

      <div className="panel">
        <div className="section-head compact">
          <h2>รายการเคลื่อนไหวล่าสุด</h2>
        </div>
        {transactionRows.length ? (
          <div className="wallet-transactions">
            {transactionRows.map((transaction) => (
              <div className="wallet-transaction-row" key={transaction.id}>
                <div>
                  <b>{transaction.description || "รายการเครดิต"}</b>
                  <span>{new Date(transaction.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                <strong className={transaction.amount >= 0 ? "plus" : "minus"}>
                  {transaction.amount >= 0 ? "+" : ""}
                  {transaction.amount.toLocaleString()}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">ยังไม่มีรายการเครดิตในบัญชีนี้</div>
        )}
      </div>
    </section>
  );
}
