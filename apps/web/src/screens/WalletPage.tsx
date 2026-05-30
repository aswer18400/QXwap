import { useEffect, useState } from "react";
import { CircleDollarSign, WalletCards } from "../components/AppIcons";
import { Button } from "../components/Button";
import { CreditBadge } from "../components/CreditBadge";
import { CreditHistoryItem } from "../components/CreditHistoryItem";
import { InputField } from "../components/FormFields";
import { formatIntegerValue } from "../lib/format";
import type { RequireLogin, Transaction, User, Wallet } from "../lib/types";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { PageState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { WalletSkeleton } from "../components/Skeletons";
import { creditService } from "../services";

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
      creditService.getWallet(),
      creditService.getTransactions()
    ])
      .then(([walletData, transactionData]) => {
        setWallet(walletData);
        setTransactions(transactionData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const parsedAmount = Number(amount || 0);
  const canDeposit = Number.isInteger(parsedAmount) && parsedAmount >= 50 && parsedAmount <= 50000;
  const transactionRows = transactions.slice(0, 8);

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="เครดิต"
        subtitle="กระเป๋าเครดิต ประวัติการใช้งาน และสิทธิ์ที่ผูกกับบัญชีจะพร้อมหลังเข้าสู่ระบบ"
        onBack={onBack}
      />
    );
  }
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
      const walletData = await creditService.depositCredits(nextAmount);
      const transactionData = await creditService.getTransactions();
      setWallet(walletData);
      setTransactions(transactionData);
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
            <WalletCards /> {formatIntegerValue(wallet?.credit_balance || 0)} เครดิต
          </h1>
          <p>เครดิตใช้เพิ่มข้อเสนอและรางวัลการแลก ยังไม่รองรับการถอนเป็นเงินสด</p>
        </div>
        <div className="wallet-rule">
          <CreditBadge amount={wallet?.credit_balance || 0} label="ใช้ในระบบเท่านั้น" />
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
        <InputField
          label="จำนวนเครดิต"
          inputMode="numeric"
          min={50}
          max={50000}
          placeholder="เช่น 250"
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
        />
        {error ? <p className="err">{error}</p> : null}
        <Button wide disabled={!canDeposit || saving} onClick={() => depositCredits()}>
          {saving ? "กำลังอัปเดตยอดเครดิต..." : `เติม ${parsedAmount || 0} เครดิต`}
        </Button>
      </div>

      <div className="panel">
        <div className="section-head compact">
          <h2>รายการเคลื่อนไหวล่าสุด</h2>
        </div>
        {transactionRows.length ? (
          <div className="wallet-transactions">
            {transactionRows.map((transaction) => (
              <CreditHistoryItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <PageState
            state="empty"
            title="ยังไม่มีรายการเครดิตในบัญชีนี้"
            summary="เมื่อคุณเติมเครดิตหรือมีรายการที่เกี่ยวกับดีลเข้ามา ประวัติจะเริ่มแสดงในหน้านี้"
            details={[
              "ใช้ส่วนเติมเครดิตด้านบนเพื่อเริ่มสร้างรายการแรก",
              "ระบบจะบันทึกทั้งยอดเข้า ยอดออก และเวลาที่เกิดรายการให้ดูย้อนหลังได้"
            ]}
            align="left"
          />
        )}
      </div>
    </section>
  );
}
