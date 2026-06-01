import { useMemo } from "react";
import { asset } from "../lib/api";
import { categoryLabels, wantedFallbacks } from "../lib/constants";
import { formatDateTimeValue } from "../lib/format";
import type { Item, NotificationEntry, OfferDetail, Transaction, User } from "../lib/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CategoryGrid } from "../components/CategoryGrid";
import { CreditBadge } from "../components/CreditBadge";
import { ItemCard } from "../components/ItemCard";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { UserMiniCard } from "../components/UserMiniCard";

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
  if (status === "completed") return "ทั้งสองฝ่ายยืนยันรับของครบแล้ว";
  if (status === "reported") return "ดีลนี้ถูกพักไว้เพื่อจัดการปัญหาที่ถูกรายงาน";
  if (status === "rejected") return `${counterpartName} ปฏิเสธข้อเสนอนี้แล้ว`;
  if (status === "expired") return "ไม่มีการตอบกลับภายในเวลาที่กำหนด";
  if (status === "cancelled") return "หนึ่งในสองฝ่ายยกเลิกดีลนี้แล้ว";
  return "เปิดดูดีลนี้เพื่อตามขั้นตอนถัดไป";
}

export function AiFeed({
  user,
  items,
  homeItems,
  followingUsers,
  suggestedUsers,
  creditBalance,
  creditTransactions: _creditTransactions,
  deals,
  notifications,
  followBusyId,
  onOpenItem,
  onOpenWanted: _onOpenWanted,
  onOpenProfile,
  onSave,
  onTag,
  onToggleFollow,
  onStartSwap: _onStartSwap,
  onOpenDeal,
  onOpenNotification,
  onOpenNotifications,
  onOpenCredits: _onOpenCredits,
  onOpenInbox,
  onOpenExplore,
  onOpenCategory,
  onRequireLogin,
  feedError,
  feedLoading,
  feedLoadingMore: _feedLoadingMore,
  hasMore: _hasMore,
  homeLoading,
  homeError,
  creditLoading,
  creditError: _creditError,
  suggestedLoading,
  suggestedError,
  dealsLoading: _dealsLoading,
  dealsError: _dealsError,
  notificationsLoading: _notificationsLoading,
  notificationsError: _notificationsError,
  onRetryFeed,
  onRetryHome,
  onRetryCredits: _onRetryCredits,
  onRetrySuggested,
  onRetryDeals: _onRetryDeals,
  onRetryNotifications: _onRetryNotifications,
  onLoadMore: _onLoadMore
}: {
  user: User | null;
  items: Item[];
  homeItems: Item[];
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
  onOpenCategory: (category: string) => void;
  onRequireLogin: () => void;
  feedError: string;
  feedLoading: boolean;
  homeLoading: boolean;
  homeError: string;
  creditLoading: boolean;
  creditError: string;
  suggestedLoading: boolean;
  suggestedError: string;
  dealsLoading: boolean;
  dealsError: string;
  notificationsLoading: boolean;
  notificationsError: string;
  feedLoadingMore: boolean;
  hasMore: boolean;
  onRetryFeed: () => void;
  onRetryHome: () => void;
  onRetryCredits: () => void;
  onRetrySuggested: () => void;
  onRetryDeals: () => void;
  onRetryNotifications: () => void;
  onLoadMore: () => void;
}) {
  const followingIds = useMemo(() => new Set(followingUsers.map((entry) => entry.id)), [followingUsers]);
  const followedItems = useMemo(() => items.slice(0, 4), [items]);
  const forYouItems = useMemo(() => homeItems.slice(0, 4), [homeItems]);
  const recommendedItems = useMemo(() => {
    const featuredIds = new Set(forYouItems.map((item) => item.id));
    const nextItems = homeItems.filter((item) => !featuredIds.has(item.id));
    return (nextItems.length ? nextItems : homeItems).slice(0, 6);
  }, [forYouItems, homeItems]);
  const heroItem = homeItems[0] || followedItems[0] || null;
  const heroImage = asset(heroItem?.media.images[0]) || wantedFallbacks.Electronics;
  const latestDeal = deals[0] || null;
  const latestNotification = notifications[0] || null;
  const needsFollowStart = Boolean(user && followingUsers.length === 0);
  const shortcutCategories = useMemo(() => {
    const homeLabels: Record<string, string> = {
      Electronics: "มือถือ",
      Fashion: "แฟชั่น",
      Home: "ของบ้าน",
      Sports: "กีฬา",
      Books: "หนังสือ"
    };

    return ["Electronics", "Fashion", "Home", "Sports", "Books"].map((category) => {
      const cover = homeItems.find((item) => item.category === category)?.media.images[0];
      return {
        key: category,
        label: homeLabels[category] || categoryLabels[category] || category,
        imageUrl: asset(cover) || wantedFallbacks[category] || wantedFallbacks.Other,
        onClick: () => onOpenCategory(category)
      };
    });
  }, [homeItems, onOpenCategory]);

  return (
    <section className="screen ai-feed ai-feed--market-home">
      <button
        type="button"
        className="home-hero-card"
        onClick={() => {
          if (heroItem) {
            onOpenItem(heroItem);
            return;
          }
          onOpenExplore();
        }}
      >
        <img src={heroImage} alt={heroItem?.title || "หน้าแรก QXwap"} />
        <span className="home-hero-overlay" aria-hidden="true" />
        <span className="home-hero-copy">
          <span className="home-hero-kicker">QXwap</span>
          <strong>แลกได้ทุกอย่าง ไม่มีเงินก็แลกได้</strong>
          <small>ดูของล่าสุด บันทึกรายการที่สนใจ แล้วค่อยเปิดดีลต่อจากที่เดียว</small>
          <span className="home-hero-benefits" aria-hidden="true">
            <span>ของมือสอง</span>
            <span>ใกล้ตัว</span>
            <span>เปิดดีลได้ทันที</span>
          </span>
          {user && creditBalance !== null && !creditLoading ? (
            <span className="home-hero-credit">
              <CreditBadge amount={creditBalance} label="QX Credit" />
            </span>
          ) : heroItem ? (
            <span className="home-hero-pill">ดู {heroItem.title}</span>
          ) : null}
        </span>
      </button>

      <section className="home-section">
        <CategoryGrid rail items={shortcutCategories} className="home-shortcut-row" />
      </section>

      {!homeItems.length && homeLoading ? (
        <PageState state="loading" summary="กำลังเตรียมสินค้าแนะนำสำหรับหน้าแรก..." align="left" />
      ) : null}

      {!homeItems.length && homeError ? (
        <PageState
          state="error"
          title="โหลดหน้าแรกไม่สำเร็จ"
          summary="ระบบยังดึงสินค้าแนะนำขึ้นหน้าแรกไม่ได้ในตอนนี้"
          actions={[{ label: "ลองใหม่", onClick: onRetryHome }]}
          align="left"
        />
      ) : null}

      {followedItems.length ? (
        <section className="home-section">
          <SectionHeader
            title="จากร้านที่คุณติดตาม"
            action={
              <button type="button" className="home-link-button" onClick={onOpenExplore}>
                ดูทั้งหมด
              </button>
            }
          />
          {feedLoading ? (
            <PageState state="loading" summary="กำลังอัปเดตสินค้าจากร้านที่คุณติดตาม..." align="left" />
          ) : feedError ? (
            <PageState
              state="error"
              title="โหลดร้านที่คุณติดตามไม่สำเร็จ"
              summary="ตอนนี้ยังดึงสินค้าล่าสุดจากร้านที่คุณติดตามกลับมาไม่ได้"
              actions={[{ label: "ลองใหม่", onClick: onRetryFeed }]}
              align="left"
            />
          ) : (
            <div className="shop-grid home-card-grid">
              {followedItems.map((item) => (
                <ItemCard key={item.id} item={item} onOpen={onOpenItem} onSave={onSave} onTag={onTag} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {needsFollowStart ? (
        <section className="home-section">
          <SectionHeader title="เริ่มจากร้านเหล่านี้" />
          {suggestedLoading ? (
            <PageState state="loading" summary="กำลังหาร้านที่น่าเริ่มติดตาม..." align="left" />
          ) : suggestedError ? (
            <PageState
              state="error"
              title="โหลดร้านแนะนำไม่สำเร็จ"
              summary="ตอนนี้ยังหาร้านที่เหมาะให้เริ่มติดตามต่อไม่ได้"
              actions={[{ label: "ลองใหม่", onClick: onRetrySuggested }]}
              align="left"
            />
          ) : suggestedUsers.length ? (
            <div className="home-follow-grid">
              {suggestedUsers.slice(0, 4).map((profile) => {
                const isFollowing = followingIds.has(profile.id);
                return (
                  <Card key={profile.id} className="home-follow-card">
                    <UserMiniCard
                      user={profile}
                      meta={profile.city || "ดูโปรไฟล์"}
                      submeta={Number(profile.rating || 0) > 0 ? `คะแนน ${Number(profile.rating || 0).toFixed(1)}` : undefined}
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
            <PageState state="empty" summary="ยังไม่มีร้านแนะนำในตอนนี้" align="left" />
          )}
        </section>
      ) : null}

      <section className="home-section">
        <SectionHeader
          title="สำหรับคุณ"
          action={
            <button type="button" className="home-link-button" onClick={onOpenExplore}>
              ดูทั้งหมด
            </button>
          }
        />
        {forYouItems.length ? (
          <div className="shop-grid home-card-grid">
            {forYouItems.map((item) => (
              <ItemCard key={item.id} item={item} onOpen={onOpenItem} onSave={onSave} onTag={onTag} />
            ))}
          </div>
        ) : (
          <PageState
            state="empty"
            summary={user ? "กำลังเตรียมรายการสำหรับคุณ..." : "ตอนนี้ยังไม่มีสินค้าแนะนำในหน้าแรก"}
            actions={[{ label: user ? "เปิดร้านค้า" : "ดูสินค้าทั้งหมด", onClick: onOpenExplore, variant: "secondary" }]}
            align="left"
          />
        )}
      </section>

      <section className="home-section">
        <SectionHeader
          title="สินค้าแนะนำ"
          action={
            <button type="button" className="home-link-button" onClick={onOpenExplore}>
              ดูทั้งหมด
            </button>
          }
        />
        {recommendedItems.length ? (
          <div className="shop-grid home-card-grid">
            {recommendedItems.map((item) => (
              <ItemCard key={item.id} item={item} onOpen={onOpenItem} onSave={onSave} onTag={onTag} />
            ))}
          </div>
        ) : (
          <PageState
            state="empty"
            summary="ตอนนี้ยังไม่มีสินค้าแนะนำเพิ่มเติม"
            actions={[{ label: "เปิดร้านค้า", onClick: onOpenExplore, variant: "secondary" }]}
            align="left"
          />
        )}
      </section>

      {user && (latestDeal || latestNotification) ? (
        <section className="home-section">
          <SectionHeader
            title="กลับไปทำต่อ"
            action={
              <button
                type="button"
                className="home-link-button"
                onClick={latestDeal ? onOpenInbox : onOpenNotifications}
              >
                เปิดทั้งหมด
              </button>
            }
          />
          <div className="home-context-grid">
            {latestDeal ? (
              <Card className="home-context-card">
                <div className="home-context-card__head">
                  <div>
                    <small>ดีลล่าสุด</small>
                    <b>{dealHeadline(latestDeal, user.id)}</b>
                  </div>
                  <StatusBadge kind="swap" status={extractSwapStatus(latestDeal)} />
                </div>
                <p>{readableSwapSummary(latestDeal, user.id)}</p>
                <Button type="button" variant="secondary" size="sm" onClick={() => onOpenDeal(latestDeal)}>
                  เปิดดีลนี้
                </Button>
              </Card>
            ) : null}
            {latestNotification ? (
              <Card className="home-context-card">
                <div className="home-context-card__head">
                  <div>
                    <small>การแจ้งเตือน</small>
                    <b>{latestNotification.title}</b>
                  </div>
                  <StatusBadge kind="notification" status={latestNotification.read_at ? "read" : "unread"} />
                </div>
                <p>{latestNotification.body}</p>
                <div className="home-context-card__meta">
                  <small>{formatDateTimeValue(latestNotification.created_at)}</small>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => onOpenNotification(latestNotification)}>
                  เปิดรายการนี้
                </Button>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      {!user ? (
        <section className="home-section">
          <Card className="home-guest-cta">
            <div>
              <b>เข้าสู่ระบบเพื่อบันทึกของและคุยต่อจากจุดเดิม</b>
              <p>ดีล การแจ้งเตือน และรายการที่สนใจจะถูกรวมไว้ในบัญชีเดียว</p>
            </div>
            <Button type="button" onClick={onRequireLogin}>
              เข้าสู่ระบบ
            </Button>
          </Card>
        </section>
      ) : null}
    </section>
  );
}
