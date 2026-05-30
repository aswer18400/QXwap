import { useEffect, useMemo, useRef } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreditBadge } from "../components/CreditBadge";
import { CreditHistoryItem } from "../components/CreditHistoryItem";
import { FeedPostCard } from "../components/FeedPostCard";
import { NotificationItem } from "../components/NotificationItem";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { UserMiniCard } from "../components/UserMiniCard";
import { formatDateTimeValue } from "../lib/format";
import type { Item, NotificationEntry, OfferDetail, Transaction, User } from "../lib/types";

function extractSwapStatus(detail: OfferDetail) {
  return detail.offer.status || "pending";
}

function dealHeadline(detail: OfferDetail, currentUserId?: string | null) {
  const status = extractSwapStatus(detail);
  const isTargetOwner = detail.offer.to_user_id === currentUserId;
  if (status === "pending") return isTargetOwner ? "ต้องตอบดีลนี้" : "รออีกฝ่ายตอบ";
  if (status === "countered") return detail.offer.from_user_id === currentUserId ? "ต้องตอบข้อเสนอโต้กลับ" : "รออีกฝ่ายตอบข้อเสนอโต้กลับ";
  if (status === "accepted") return "รอยืนยันแผนนัดรับ";
  if (status === "scheduled") return "นัดรับพร้อมแล้ว";
  if (status === "handover_pending") return detail.shipment?.current_step === "finished" ? "รอยืนยันรับของ" : "กำลังส่งมอบ";
  if (status === "completed") return "แลกสำเร็จแล้ว";
  if (status === "reported") return "ดีลนี้มีการรายงานปัญหา";
  if (status === "rejected") return "ดีลนี้ถูกปฏิเสธ";
  if (status === "expired") return "ดีลนี้หมดเวลาแล้ว";
  if (status === "cancelled") return "ดีลนี้ถูกยกเลิก";
  return "ดีลนี้กำลังอัปเดต";
}

function readableSwapSummary(detail: OfferDetail, currentUserId?: string | null) {
  const status = extractSwapStatus(detail);
  const counterpartName =
    detail.offer.from_user_id === currentUserId
      ? detail.offer.to_name || "อีกฝ่าย"
      : detail.offer.from_name || "อีกฝ่าย";
  if (status === "pending") return detail.offer.to_user_id === currentUserId ? `ข้อเสนอจาก ${counterpartName} กำลังรอการตัดสินใจของคุณ` : `คุณส่งข้อเสนอไปหา ${counterpartName} แล้ว กำลังรอคำตอบ`;
  if (status === "countered") return `${counterpartName} ปรับเงื่อนไขกลับมาแล้ว เปิดดูดีลนี้เพื่อตอบกลับต่อ`;
  if (status === "accepted") return "ทั้งสองฝ่ายเริ่มคุยขั้นนัดรับหรือวิธีส่งมอบได้แล้ว";
  if (status === "scheduled") return "แผนนัดรับหรือวิธีส่งมอบถูกยืนยันครบทั้งสองฝั่งแล้ว";
  if (status === "handover_pending") return detail.shipment?.current_step === "finished" ? "ของถูกส่งมอบแล้ว เหลือแค่ยืนยันรับของให้ครบ" : "ดีลนี้อยู่ระหว่างส่งมอบจริงแล้ว";
  if (status === "completed") return "ทั้งสองฝ่ายยืนยันรับของครบแล้ว และเครดิตกิจกรรมควรถูกบันทึกแล้ว";
  if (status === "reported") return "ดีลนี้ถูกพักไว้เพื่อจัดการปัญหาที่ถูกรายงาน";
  if (status === "rejected") return `${counterpartName} ปฏิเสธข้อเสนอนี้แล้ว ลองเปิดดูสินค้าหรือ wanted อื่นต่อได้`;
  if (status === "expired") return "ไม่มีการตอบกลับภายในเวลาที่กำหนด ดีลนี้จึงหมดอายุ";
  if (status === "cancelled") return "หนึ่งในสองฝ่ายยกเลิกดีลนี้แล้ว";
  return "เปิดดูดีลนี้เพื่อตามขั้นตอนถัดไป";
}

function isCreditActivity(transaction: Transaction) {
  return transaction.type === "earn_swap_completed" ||
    transaction.type === "earn_review_completed" ||
    transaction.type === "earn_activity_bonus" ||
    transaction.type === "redeem_reward" ||
    transaction.type === "refund_reward" ||
    transaction.source_kind === "reward_redemption";
}

function isRewardRedeemed(transaction: Transaction) {
  return transaction.type === "redeem_reward" || transaction.source_kind === "reward_redemption";
}

export function AiFeed({
  user,
  items,
  followingUsers,
  suggestedUsers,
  creditBalance,
  creditTransactions,
  deals,
  notifications,
  followBusyId,
  onOpenItem,
  onOpenWanted,
  onOpenProfile,
  onSave,
  onTag,
  onToggleFollow,
  onStartSwap,
  onOpenDeal,
  onOpenNotification,
  onOpenNotifications,
  onOpenCredits,
  onOpenInbox,
  onOpenExplore,
  onRequireLogin,
  feedError,
  feedLoading,
  feedLoadingMore,
  hasMore,
  creditLoading,
  creditError,
  suggestedLoading,
  suggestedError,
  dealsLoading,
  dealsError,
  notificationsLoading,
  notificationsError,
  onRetryFeed,
  onRetryCredits,
  onRetrySuggested,
  onRetryDeals,
  onRetryNotifications,
  onLoadMore
}: {
  user: User | null;
  items: Item[];
  followingUsers: User[];
  suggestedUsers: User[];
  creditBalance: number | null;
  creditTransactions: Transaction[];
  deals: OfferDetail[];
  notifications: NotificationEntry[];
  followBusyId: string | null;
  onOpenItem: (item: Item) => void;
  onOpenWanted: (item: Item) => void;
  onOpenProfile: (user: User) => void;
  onSave: (item: Item) => void;
  onTag: (tag: string) => void;
  onToggleFollow: (profile: User) => void;
  onStartSwap: (item: Item) => void;
  onOpenDeal: (offer: OfferDetail) => void;
  onOpenNotification: (entry: NotificationEntry) => void;
  onOpenNotifications: () => void;
  onOpenCredits: () => void;
  onOpenInbox: () => void;
  onOpenExplore: () => void;
  onRequireLogin: () => void;
  feedError: string;
  feedLoading: boolean;
  feedLoadingMore: boolean;
  hasMore: boolean;
  creditLoading: boolean;
  creditError: string;
  suggestedLoading: boolean;
  suggestedError: string;
  dealsLoading: boolean;
  dealsError: string;
  notificationsLoading: boolean;
  notificationsError: string;
  onRetryFeed: () => void;
  onRetryCredits: () => void;
  onRetrySuggested: () => void;
  onRetryDeals: () => void;
  onRetryNotifications: () => void;
  onLoadMore: () => void;
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const followingIds = useMemo(() => new Set(followingUsers.map((entry) => entry.id)), [followingUsers]);
  const creditActivity = useMemo(
    () => creditTransactions.filter(isCreditActivity).slice(0, 4),
    [creditTransactions]
  );
  const notificationPreview = useMemo(() => notifications.slice(0, 3), [notifications]);
  const relationshipUsers = followingUsers.length ? followingUsers.slice(0, 4) : suggestedUsers.slice(0, 4);
  const noFollowingYet = user && followingUsers.length === 0;
  const feedSummaryTitle = noFollowingYet ? "เริ่มติดตามร้านเพื่อสร้างฟีดของคุณ" : "ฟีดนี้แสดงเฉพาะคนที่คุณติดตาม";
  const feedSummaryBody = noFollowingYet
    ? "เมื่อคุณติดตามร้านหรือผู้ใช้คนอื่น โพสต์ใหม่จะขึ้นที่นี่ทันที"
    : "แต่ละโพสต์จะแยกชัดว่าเจ้าของมีอะไร และกำลังอยากได้อะไรกลับมา";

  useEffect(() => {
    if (!hasMore || feedLoading || feedLoadingMore || !items.length) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [feedLoading, feedLoadingMore, hasMore, items.length, onLoadMore]);

  return (
    <section className="screen ai-feed ai-feed--market-feed">
      <section className="home-section">
        <SectionHeader
          title="ฟีดจากคนที่คุณติดตาม"
          subtitle="โพสต์ใหม่จะโชว์เฉพาะร้านและผู้ใช้ที่คุณเลือกติดตาม"
          action={
            <button type="button" className="home-link-button" onClick={onOpenNotifications}>
              ดูการแจ้งเตือน
            </button>
          }
        />
        <Card className="home-feed-summary-card">
          <div className="home-feed-summary-card__copy">
            <b>{feedSummaryTitle}</b>
            <p>{feedSummaryBody}</p>
          </div>
          <div className="home-feed-summary-card__meta">
            <span>
              <strong>{followingUsers.length}</strong>
              <small>กำลังติดตาม</small>
            </span>
            <span>
              <strong>{items.length}</strong>
              <small>โพสต์ล่าสุด</small>
            </span>
          </div>
        </Card>
        {feedLoading ? (
          <PageState state="loading" summary="กำลังดึงโพสต์ล่าสุดจากคนที่คุณติดตาม..." align="left" />
        ) : feedError ? (
          <PageState
            state="error"
            title="โหลดฟีดไม่สำเร็จ"
            summary="ระบบยังดึงโพสต์จากคนที่คุณติดตามกลับมาไม่ได้ในตอนนี้"
            actions={[{ label: "ลองใหม่", onClick: onRetryFeed }]}
            align="left"
          />
        ) : items.length ? (
          <div className="home-feed-list">
            {items.map((item) => (
              <FeedPostCard
                key={item.id}
                item={item}
                subtitle={item.owner.name ? `โพสต์จาก ${item.owner.name}` : "โพสต์แลกเปลี่ยนล่าสุด"}
                onOpen={onOpenItem}
                onOpenWanted={onOpenWanted}
                onSave={onSave}
                onTag={onTag}
                footer={
                  <>
                    <Button type="button" variant="secondary" onClick={() => onOpenWanted(item)}>
                      ดูของที่อยากได้
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onStartSwap(item)}
                      disabled={item.viewer.is_owner}
                    >
                      {item.viewer.is_owner ? "โพสต์ของคุณ" : "เริ่มแลกเปลี่ยน"}
                    </Button>
                  </>
                }
              />
            ))}
            {feedLoadingMore ? <PageState state="loading" summary="กำลังดึงโพสต์เพิ่ม..." align="left" /> : null}
            {hasMore ? <div ref={loadMoreRef} className="feed-load-more" aria-hidden="true" /> : null}
          </div>
        ) : (
          <PageState
            state="empty"
            title={user ? "ฟีดของคุณยังว่างอยู่" : "เข้าสู่ระบบเพื่อดูฟีดที่ติดตาม"}
            summary={
              user
                ? followingUsers.length
                  ? "ตอนนี้ยังไม่มีโพสต์ active จากคนที่คุณติดตาม ลองเปิดดูร้านอื่นหรือรอการอัปเดตรอบถัดไป"
                  : "คุณยังไม่ได้ติดตามใครเลย ลองเริ่มจากรายชื่อแนะนำด้านล่างเพื่อให้ฟีดนี้มีชีวิต"
                : "ฟีดหน้านี้จะรวมโพสต์จากร้านที่คุณติดตามไว้ในที่เดียว"
            }
            actions={
              user
                ? [
                    { label: followingUsers.length ? "ไปหน้าค้นหา" : "ดูร้านแนะนำ", onClick: onOpenExplore, variant: "secondary" }
                  ]
                : [
                    { label: "เข้าสู่ระบบ", onClick: onRequireLogin },
                    { label: "ดูสินค้าทั้งหมด", onClick: onOpenExplore, variant: "secondary" }
                  ]
            }
            align="left"
          />
        )}
      </section>

      <section className="home-section">
        <SectionHeader
          title={followingUsers.length ? "คนที่คุณติดตาม" : "แนะนำให้ติดตาม"}
          subtitle={
            followingUsers.length
              ? "จัดการรายชื่อที่ฟีดนี้อ้างอิงอยู่ตอนนี้"
              : "เริ่มจากร้านเหล่านี้เพื่อให้หน้าแรกกลายเป็นฟีดที่ตรงกับสิ่งที่คุณสนใจ"
          }
          action={
            <button type="button" className="home-link-button" onClick={onOpenExplore}>
              ไปหน้าค้นหา
            </button>
          }
        />
        {suggestedLoading ? (
          <PageState state="loading" summary="กำลังเตรียมรายชื่อร้านที่ควรดูต่อ..." align="left" />
        ) : suggestedError ? (
          <PageState
            state="error"
            title="โหลดรายชื่อแนะนำไม่สำเร็จ"
            summary="ตอนนี้ยังดึงรายชื่อร้านหรือผู้ใช้ที่ควรติดตามต่อให้คุณไม่ได้"
            actions={[{ label: "ลองใหม่", onClick: onRetrySuggested }]}
            align="left"
          />
        ) : relationshipUsers.length ? (
          <div className="home-follow-grid">
            {relationshipUsers.map((profile) => {
              const isFollowing = followingIds.has(profile.id);
              return (
                <Card key={profile.id} className="home-follow-card">
                  <UserMiniCard
                    user={profile}
                    meta={profile.city || "QXwap user"}
                    submeta={Number(profile.rating || 0) > 0 ? `คะแนน ${Number(profile.rating || 0).toFixed(1)}` : "ดูโปรไฟล์และรายการ"}
                    onClick={() => onOpenProfile(profile)}
                  />
                  <Button
                    type="button"
                    variant={isFollowing ? "secondary" : "primary"}
                    size="sm"
                    disabled={followBusyId === profile.id}
                    onClick={() => onToggleFollow(profile)}
                  >
                    {followBusyId === profile.id ? "กำลังอัปเดต..." : isFollowing ? "เลิกติดตาม" : "ติดตาม"}
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <PageState
            state="empty"
            summary="ยังไม่มีรายชื่อร้านแนะนำในตอนนี้"
            actions={[{ label: "ไปหน้าค้นหา", onClick: onOpenExplore, variant: "secondary" }]}
            align="left"
          />
        )}
      </section>

      <section className="home-section">
        <SectionHeader
          title="เครดิตกิจกรรม"
          subtitle="QX Credit ใช้แลกของระบบและกิจกรรมใน QXwap เท่านั้น ไม่ใช่เงินสด"
          action={
            user ? (
              <button type="button" className="home-link-button" onClick={onOpenCredits}>
                เปิดเครดิต
              </button>
            ) : null
          }
        />
        {user ? (
          creditLoading ? (
            <PageState state="loading" summary="กำลังอัปเดตประวัติ QX Credit..." align="left" />
          ) : creditError ? (
            <PageState
              state="error"
              title="โหลดเครดิตกิจกรรมไม่สำเร็จ"
              summary="ยังดึงยอดคงเหลือและกิจกรรมเครดิตล่าสุดกลับมาไม่ได้"
              actions={[{ label: "ลองใหม่", onClick: onRetryCredits }]}
              align="left"
            />
          ) : (
            <Card className="home-credit-card">
              <div className="home-credit-card__head">
                <div>
                  <small>ยอดล่าสุดของคุณ</small>
                  <b>QX Credit พร้อมใช้</b>
                </div>
                <CreditBadge amount={creditBalance || 0} label="QX Credit" />
              </div>
              {creditActivity.length ? (
                <div className="home-credit-card__list">
                  {creditActivity.map((transaction) => (
                    <div key={transaction.id} className="home-credit-card__entry">
                      <CreditHistoryItem transaction={transaction} />
                      <StatusBadge
                        kind="credit"
                        status={isRewardRedeemed(transaction) ? "spent" : transaction.amount >= 0 ? "earned" : "spent"}
                        label={isRewardRedeemed(transaction) ? "ใช้กับของระบบ" : "เครดิตกิจกรรม"}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <PageState
                  state="empty"
                  summary="เมื่อดีลสำเร็จหรือคุณทำกิจกรรมที่ได้เครดิต รายการจะขึ้นในส่วนนี้"
                  align="left"
                />
              )}
            </Card>
          )
        ) : (
          <PageState
            state="empty"
            summary="เข้าสู่ระบบเพื่อดูยอด QX Credit และกิจกรรมที่เกี่ยวกับเครดิตของคุณ"
            actions={[{ label: "เข้าสู่ระบบ", onClick: onRequireLogin }]}
            align="left"
          />
        )}
      </section>

      <section className="home-section">
        <SectionHeader
          title="สถานะดีลตอนนี้"
          subtitle="ดูว่าแต่ละดีลกำลังรออะไรอยู่โดยไม่ต้องไล่เข้าแชตทีละรายการ"
          action={
            <button type="button" className="home-link-button" onClick={onOpenInbox}>
              เปิดแชตทั้งหมด
            </button>
          }
        />
        {user ? (
          dealsLoading ? (
            <PageState state="loading" summary="กำลังดึงสถานะดีลล่าสุด..." align="left" />
          ) : dealsError ? (
            <PageState
              state="error"
              title="โหลดสถานะดีลไม่สำเร็จ"
              summary="ตอนนี้ยังดึงสถานะข้อเสนอและดีลล่าสุดกลับมาไม่ได้"
              actions={[{ label: "ลองใหม่", onClick: onRetryDeals }]}
              align="left"
            />
          ) : deals.length ? (
            <div className="home-swap-status-list">
              {deals.map((detail) => (
                <Card key={detail.offer.id} className="home-swap-status-card">
                  <div className="home-swap-status-card__head">
                    <div>
                      <b>{dealHeadline(detail, user.id)}</b>
                      <small>{formatDateTimeValue(detail.offer.updated_at || detail.offer.created_at)}</small>
                    </div>
                    <StatusBadge kind="swap" status={extractSwapStatus(detail)} />
                  </div>
                  <p>{readableSwapSummary(detail, user.id)}</p>
                  <div className="home-swap-status-card__actions">
                    <Button type="button" variant="secondary" size="sm" onClick={() => onOpenDeal(detail)}>
                      เปิดดีลนี้
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <PageState
              state="empty"
              summary="ตอนนี้ยังไม่มีดีลที่กำลังรอการตอบ ยืนยัน นัดรับ หรือปิดดีล"
              align="left"
            />
          )
        ) : (
          <PageState
            state="empty"
            summary="เข้าสู่ระบบเพื่อดูดีลที่กำลังคุยอยู่และสถานะล่าสุดของแต่ละรายการ"
            actions={[{ label: "เข้าสู่ระบบ", onClick: onRequireLogin }]}
            align="left"
          />
        )}
      </section>

      <section className="home-section">
        <SectionHeader
          title="แจ้งเตือนล่าสุด"
          subtitle="รวมรายการใหม่ที่ควรกลับไปดูต่อทันที"
          action={
            <button type="button" className="home-link-button" onClick={onOpenNotifications}>
              ดูทั้งหมด
            </button>
          }
        />
        {user ? (
          notificationsLoading ? (
            <PageState state="loading" summary="กำลังเตรียมการแจ้งเตือนล่าสุด..." align="left" />
          ) : notificationsError ? (
            <PageState
              state="error"
              title="โหลดการแจ้งเตือนไม่สำเร็จ"
              summary="ตอนนี้ยังดึงการแจ้งเตือนล่าสุดกลับมาไม่ได้"
              actions={[{ label: "ลองใหม่", onClick: onRetryNotifications }]}
              align="left"
            />
          ) : notificationPreview.length ? (
            <div className="home-notification-preview">
              {notificationPreview.map((entry) => (
                <NotificationItem
                  key={entry.id}
                  title={entry.title}
                  body={entry.body}
                  read={Boolean(entry.read_at)}
                  timestamp={formatDateTimeValue(entry.created_at)}
                  statusLabel={entry.read_at ? "อ่านแล้ว" : "ใหม่"}
                  onOpen={() => onOpenNotification(entry)}
                />
              ))}
            </div>
          ) : (
            <PageState
              state="empty"
              summary="ตอนนี้ยังไม่มีการแจ้งเตือนใหม่"
              align="left"
            />
          )
        ) : (
          <PageState
            state="empty"
            summary="เข้าสู่ระบบเพื่อให้ระบบรวมการแจ้งเตือนใหม่ไว้ในหน้าแรก"
            actions={[{ label: "เข้าสู่ระบบ", onClick: onRequireLogin }]}
            align="left"
          />
        )}
      </section>
    </section>
  );
}
