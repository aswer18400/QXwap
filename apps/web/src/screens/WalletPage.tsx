import { useEffect, useMemo, useState } from "react";
import { WalletCards } from "../components/AppIcons";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreditBadge } from "../components/CreditBadge";
import { CreditHistoryItem } from "../components/CreditHistoryItem";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { PageState } from "../components/PageState";
import { StatusBadge } from "../components/StatusBadge";
import { WalletSkeleton } from "../components/Skeletons";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { formatDateTimeValue, formatIntegerValue } from "../lib/format";
import type { RequireLogin, RewardItem, RewardRedemption, Transaction, User, Wallet } from "../lib/types";
import { creditService, rewardService } from "../services";

type RewardActionState = {
  redeeming: boolean;
  error: string;
  success: string;
};

const emptyRewardState: RewardActionState = {
  redeeming: false,
  error: "",
  success: ""
};

function rewardStatusForBadge(reward: RewardItem) {
  if (reward.viewer_redeemed) return { status: "redeemed", label: "เคยแลกแล้ว" };
  if (reward.availability_status === "out_of_stock") return { status: "out_of_stock", label: "ของหมด" };
  if (reward.availability_status === "inactive") return { status: "inactive", label: "ยังไม่เปิดให้แลก" };
  return { status: "available", label: "แลกได้" };
}

function transactionLabel(transaction: Transaction) {
  if (transaction.type === "earn_swap_completed") return "เครดิตจากดีลสำเร็จ";
  if (transaction.type === "earn_review_completed") return "เครดิตจากการรีวิวหลังแลก";
  if (transaction.type === "redeem_reward") return "ใช้แลกของจากระบบ";
  if (transaction.type === "refund_reward") return "คืนเครดิตจากของรางวัล";
  if (transaction.type === "adjustment_system") return "ระบบปรับยอดเครดิต";
  return "เครดิตกิจกรรม";
}

function transactionStatus(transaction: Transaction) {
  return transaction.amount >= 0 ? "earned" : "spent";
}

function redemptionStatusLabel(redemption: RewardRedemption) {
  return redemption.status === "completed" ? "แลกสำเร็จ" : redemption.status;
}

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
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(true);
  const [rewardLoading, setRewardLoading] = useState(true);
  const [redemptionLoading, setRedemptionLoading] = useState(true);
  const [walletError, setWalletError] = useState("");
  const [transactionError, setTransactionError] = useState("");
  const [rewardError, setRewardError] = useState("");
  const [redemptionError, setRedemptionError] = useState("");
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [confirmReward, setConfirmReward] = useState<RewardItem | null>(null);
  const [rewardAction, setRewardAction] = useState<RewardActionState>(emptyRewardState);

  const currentBalance = Number(wallet?.credit_balance || 0);
  const rewardLookup = useMemo(() => new Map(rewards.map((reward) => [reward.id, reward])), [rewards]);

  async function reloadWalletData() {
    setWalletLoading(true);
    setTransactionLoading(true);
    setWalletError("");
    setTransactionError("");
    const [walletResult, transactionResult] = await Promise.allSettled([
      creditService.getWallet(),
      creditService.getTransactions()
    ]);
    if (walletResult.status === "fulfilled") {
      setWallet(walletResult.value);
    } else {
      setWallet(null);
      setWalletError(walletResult.reason?.message || "โหลดยอด QX Credit ไม่สำเร็จ");
    }
    if (transactionResult.status === "fulfilled") {
      setTransactions(transactionResult.value || []);
    } else {
      setTransactions([]);
      setTransactionError(transactionResult.reason?.message || "โหลดประวัติเครดิตไม่สำเร็จ");
    }
    setWalletLoading(false);
    setTransactionLoading(false);
  }

  async function reloadRewardData() {
    setRewardLoading(true);
    setRedemptionLoading(true);
    setRewardError("");
    setRedemptionError("");
    const [rewardResult, redemptionResult] = await Promise.allSettled([
      rewardService.listRewards({ includeInactive: true }),
      rewardService.listRedemptions()
    ]);
    if (rewardResult.status === "fulfilled") {
      setRewards(rewardResult.value || []);
    } else {
      setRewards([]);
      setRewardError(rewardResult.reason?.message || "โหลดแคตตาล็อกของรางวัลไม่สำเร็จ");
    }
    if (redemptionResult.status === "fulfilled") {
      setRedemptions(redemptionResult.value || []);
    } else {
      setRedemptions([]);
      setRedemptionError(redemptionResult.reason?.message || "โหลดประวัติการแลกของรางวัลไม่สำเร็จ");
    }
    setRewardLoading(false);
    setRedemptionLoading(false);
  }

  async function reloadAll() {
    await Promise.all([reloadWalletData(), reloadRewardData()]);
  }

  useEffect(() => {
    if (!user) return;
    void reloadAll();
  }, [user]);

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="QX Credit"
        subtitle="ดูเครดิตกิจกรรม ประวัติการใช้งาน และของรางวัลจากระบบได้หลังเข้าสู่ระบบ"
        onBack={onBack}
      />
    );
  }

  const selectedRewardRecord = selectedReward ? rewardLookup.get(selectedReward.id) || selectedReward : null;
  const confirmRewardRecord = confirmReward ? rewardLookup.get(confirmReward.id) || confirmReward : null;
  const canRedeemSelected =
    Boolean(selectedRewardRecord) &&
    selectedRewardRecord?.availability_status === "available" &&
    currentBalance >= Number(selectedRewardRecord?.credit_cost || 0) &&
    !rewardAction.redeeming;
  const canRedeemConfirm =
    Boolean(confirmRewardRecord) &&
    confirmRewardRecord?.availability_status === "available" &&
    currentBalance >= Number(confirmRewardRecord?.credit_cost || 0) &&
    !rewardAction.redeeming;

  async function redeemSelectedReward() {
    if (!confirmRewardRecord) return;
    setRewardAction({ redeeming: true, error: "", success: "" });
    try {
      const result = await rewardService.redeemReward(confirmRewardRecord.id);
      setWallet(result.wallet);
      setSelectedReward(result.reward || confirmRewardRecord);
      setConfirmReward(null);
      setRewardAction({
        redeeming: false,
        error: "",
        success: `แลก ${confirmRewardRecord.title} สำเร็จแล้ว เครดิตถูกหักและบันทึกไว้ในประวัติเรียบร้อย`
      });
      await Promise.all([reloadWalletData(), reloadRewardData()]);
    } catch (error: any) {
      setRewardAction({
        redeeming: false,
        error: error.message || "แลกของรางวัลไม่สำเร็จ",
        success: ""
      });
    }
  }

  return (
    <section className="screen wallet-screen">
      <PageHeader
        title="QX Credit"
        subtitle="เครดิตกิจกรรมใช้แลกของจากระบบเท่านั้น ไม่ใช่เงินสด โอนไม่ได้ และถอนไม่ได้"
        onBack={onBack ?? (() => window.history.back())}
        align="left"
      />

      {walletLoading ? (
        <WalletSkeleton />
      ) : (
        <>
          <Card className="wallet-hero">
            <div className="wallet-hero__copy">
              <span className="wallet-kicker">เครดิตกิจกรรมของคุณ</span>
              <h1>
                <WalletCards /> {formatIntegerValue(currentBalance)} QX Credit
              </h1>
              <p>ทุกยอด QX Credit เกิดจากกิจกรรมในแอป เช่น แลกสำเร็จ รีวิวหลังดีล และโบนัสกิจกรรมที่ระบบกำหนดเท่านั้น</p>
            </div>
            <div className="wallet-hero__badges">
              <CreditBadge amount={currentBalance} label="ใช้แลกของระบบเท่านั้น" />
              <StatusBadge kind="credit" status="active" label="ไม่ใช่เงินจริง" />
            </div>
          </Card>

          <Card className="wallet-ruleboard">
            <div className="section-head compact">
              <h2>กติกา QX Credit</h2>
              <span>สะสมจากกิจกรรมและใช้แลกของจากระบบเท่านั้น</span>
            </div>
            <div className="wallet-ruleboard__grid">
              <div className="wallet-ruleboard__item">
                <b>ได้จากดีลสำเร็จ</b>
                <span>เมื่อดีลแลกปิดครบขั้นตอน ระบบจะเพิ่มเครดิตกิจกรรมให้อัตโนมัติ</span>
              </div>
              <div className="wallet-ruleboard__item">
                <b>ได้จากการรีวิว</b>
                <span>รีวิวหลังจบดีลแล้วรับเครดิตเพิ่มตามกติกาที่ระบบกำหนด</span>
              </div>
              <div className="wallet-ruleboard__item">
                <b>ได้จากโบนัสกิจกรรม</b>
                <span>บางกิจกรรม เช่น สมัครบัญชีหรือกรอกโปรไฟล์ครบ จะได้รับเครดิตเพิ่ม</span>
              </div>
              <div className="wallet-ruleboard__item">
                <b>ใช้แลกของระบบเท่านั้น</b>
                <span>QX Credit ไม่สามารถโอนให้ผู้ใช้อื่น ถอน หรือแลกเป็นเงินสดได้</span>
              </div>
            </div>
          </Card>

          <Card className="wallet-section-card">
            <div className="section-head compact">
              <h2>แคตตาล็อกของรางวัล</h2>
              <span>เลือกของจากระบบที่อยากแลกด้วย QX Credit ของคุณ</span>
            </div>
            {rewardError ? (
              <PageState
                state="error"
                title="โหลดของรางวัลไม่สำเร็จ"
                summary="ระบบยังดึงแคตตาล็อกของรางวัลกลับมาไม่ได้ในตอนนี้"
                actions={[{ label: "ลองใหม่", onClick: () => void reloadRewardData() }]}
                align="left"
              />
            ) : rewardLoading ? (
              <PageState state="loading" summary="กำลังโหลดของรางวัลจากระบบ..." align="left" />
            ) : rewards.length ? (
              <div className="wallet-reward-grid">
                {rewards.map((reward) => {
                  const badge = rewardStatusForBadge(reward);
                  return (
                    <button
                      key={reward.id}
                      type="button"
                      className="wallet-reward-card"
                      onClick={() => {
                        setRewardAction((current) => ({ ...current, error: "", success: "" }));
                        setSelectedReward(reward);
                      }}
                    >
                      <img src={asset(reward.image_url || undefined) || wantedFallbacks.Other} alt={reward.title} />
                      <div className="wallet-reward-card__copy">
                        <div className="wallet-reward-card__top">
                          <b>{reward.title}</b>
                          <StatusBadge kind="reward" status={badge.status} label={badge.label} />
                        </div>
                        <p>{reward.description || "ของรางวัลจากระบบ QXwap"}</p>
                        <div className="wallet-reward-card__meta">
                          <CreditBadge amount={reward.credit_cost} label="QX Credit" />
                          <small>
                            {reward.availability_status === "inactive"
                              ? "ยังไม่เปิดให้แลก"
                              : reward.availability_status === "out_of_stock"
                                ? "ของหมดชั่วคราว"
                                : `คงเหลือ ${formatIntegerValue(reward.inventory_count)} ชิ้น`}
                          </small>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <PageState
                state="empty"
                title="ยังไม่มีของรางวัลในแคตตาล็อก"
                summary="เมื่อระบบเปิดของรางวัลสำหรับแลกด้วย QX Credit รายการจะขึ้นในส่วนนี้"
                actions={[{ label: "รีเฟรชรายการ", onClick: () => void reloadRewardData(), variant: "secondary" }]}
                align="left"
              />
            )}
          </Card>

          <Card className="wallet-section-card">
            <div className="section-head compact">
              <h2>ประวัติ QX Credit</h2>
              <span>ทุกการได้และใช้เครดิตจะถูกบันทึกเป็นรายการตรวจสอบย้อนหลังได้</span>
            </div>
            {transactionError ? (
              <PageState
                state="error"
                title="โหลดประวัติเครดิตไม่สำเร็จ"
                summary="ระบบยังดึง credit_transactions กลับมาไม่ได้"
                actions={[{ label: "ลองใหม่", onClick: () => void reloadWalletData() }]}
                align="left"
              />
            ) : transactionLoading ? (
              <PageState state="loading" summary="กำลังโหลดรายการเครดิต..." align="left" />
            ) : transactions.length ? (
              <div className="wallet-transactions">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="wallet-history-row">
                    <CreditHistoryItem transaction={transaction} />
                    <StatusBadge kind="credit" status={transactionStatus(transaction)} label={transactionLabel(transaction)} />
                  </div>
                ))}
              </div>
            ) : (
              <PageState
                state="empty"
                title="ยังไม่มีรายการเครดิต"
                summary="เมื่อคุณได้ QX Credit จากกิจกรรมหรือใช้เครดิตแลกของจากระบบ ประวัติจะขึ้นในส่วนนี้"
                align="left"
              />
            )}
          </Card>

          <Card className="wallet-section-card">
            <div className="section-head compact">
              <h2>ประวัติการแลกของรางวัล</h2>
              <span>รายการนี้ช่วยให้ย้อนดูได้ว่าคุณใช้เครดิตแลกของจากระบบอะไรไปแล้วบ้าง</span>
            </div>
            {redemptionError ? (
              <PageState
                state="error"
                title="โหลดประวัติการแลกไม่สำเร็จ"
                summary="ยังดึง reward redemption history กลับมาไม่ได้"
                actions={[{ label: "ลองใหม่", onClick: () => void reloadRewardData() }]}
                align="left"
              />
            ) : redemptionLoading ? (
              <PageState state="loading" summary="กำลังโหลดประวัติการแลกของรางวัล..." align="left" />
            ) : redemptions.length ? (
              <div className="wallet-redemption-list">
                {redemptions.map((redemption) => (
                  <div key={redemption.id} className="wallet-redemption-row">
                    <div>
                      <b>{redemption.reward?.title || "ของรางวัลจากระบบ"}</b>
                      <span>{formatDateTimeValue(redemption.created_at)}</span>
                    </div>
                    <div className="wallet-redemption-row__meta">
                      <StatusBadge kind="reward" status="redeemed" label={redemptionStatusLabel(redemption)} />
                      <CreditBadge amount={redemption.credit_amount} label="ใช้ไป" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <PageState
                state="empty"
                title="ยังไม่เคยแลกของรางวัล"
                summary="เมื่อคุณใช้ QX Credit แลกของจากระบบ ประวัติจะถูกบันทึกไว้ในส่วนนี้ทันที"
                align="left"
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={Boolean(selectedRewardRecord)}
        title={selectedRewardRecord?.title || "รายละเอียดของรางวัล"}
        onClose={() => {
          if (rewardAction.redeeming) return;
          setSelectedReward(null);
        }}
      >
        {selectedRewardRecord ? (
          <div className="wallet-reward-detail">
            <img src={asset(selectedRewardRecord.image_url || undefined) || wantedFallbacks.Other} alt={selectedRewardRecord.title} />
            <div className="wallet-reward-detail__copy">
              <div className="wallet-reward-detail__meta">
                <StatusBadge
                  kind="reward"
                  status={rewardStatusForBadge(selectedRewardRecord).status}
                  label={rewardStatusForBadge(selectedRewardRecord).label}
                />
                <CreditBadge amount={selectedRewardRecord.credit_cost} label="QX Credit" />
              </div>
              <p>{selectedRewardRecord.description || "ของรางวัลจากระบบสำหรับใช้กับกิจกรรมใน QXwap"}</p>
              <ul className="wallet-reward-detail__facts">
                <li>ใช้เครดิตแลกของจากระบบเท่านั้น</li>
                <li>ไม่สามารถโอนให้ผู้ใช้อื่นหรือแลกเป็นเงินสดได้</li>
                <li>คงเหลือ {formatIntegerValue(selectedRewardRecord.inventory_count)} ชิ้นในระบบ</li>
              </ul>
            </div>
            {rewardAction.success ? <p className="wallet-status-ok" role="status">{rewardAction.success}</p> : null}
            {rewardAction.error ? <p className="err" role="alert">{rewardAction.error}</p> : null}
            <div className="wallet-reward-detail__actions">
              <Button type="button" variant="secondary" onClick={() => setSelectedReward(null)}>
                ปิด
              </Button>
              <Button
                type="button"
                disabled={!canRedeemSelected}
                onClick={() => {
                  setConfirmReward(selectedRewardRecord);
                  setRewardAction((current) => ({ ...current, error: "", success: "" }));
                }}
              >
                {selectedRewardRecord.availability_status === "inactive"
                  ? "ยังไม่เปิดให้แลก"
                  : selectedRewardRecord.availability_status === "out_of_stock"
                    ? "ของหมดชั่วคราว"
                    : currentBalance < selectedRewardRecord.credit_cost
                      ? "เครดิตไม่พอ"
                      : "แลกของรางวัลนี้"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirmRewardRecord)}
        title="ยืนยันการแลกของรางวัล"
        onClose={() => {
          if (rewardAction.redeeming) return;
          setConfirmReward(null);
        }}
      >
        {confirmRewardRecord ? (
          <div className="wallet-redeem-confirm">
            <p>
              คุณกำลังใช้ <b>{formatIntegerValue(confirmRewardRecord.credit_cost)} QX Credit</b> เพื่อแลก
              {" "}
              <b>{confirmRewardRecord.title}</b>
            </p>
            <p className="wallet-redeem-confirm__note">
              หลังยืนยัน ระบบจะหักเครดิตจริง บันทึก transaction และเพิ่มรายการในประวัติการแลกของรางวัลทันที
            </p>
            {currentBalance < confirmRewardRecord.credit_cost ? (
              <PageState
                state="error"
                title="เครดิตไม่เพียงพอ"
                summary="ยอด QX Credit ของคุณยังไม่พอสำหรับของรางวัลนี้"
                align="left"
              />
            ) : null}
            {rewardAction.error ? <p className="err" role="alert">{rewardAction.error}</p> : null}
            <div className="wallet-redeem-confirm__actions">
              <Button type="button" variant="secondary" disabled={rewardAction.redeeming} onClick={() => setConfirmReward(null)}>
                ย้อนกลับ
              </Button>
              <Button type="button" disabled={!canRedeemConfirm} onClick={() => void redeemSelectedReward()}>
                {rewardAction.redeeming ? "กำลังยืนยัน..." : "ยืนยันการแลก"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
