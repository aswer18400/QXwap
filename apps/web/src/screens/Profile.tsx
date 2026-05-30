import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AccountMenuIcon,
  BackIcon,
  ChangeAvatarIcon,
  ChevronRight,
  CloseIcon,
  EditProfileIcon,
  FollowingIcon,
  LocationMetaIcon,
  MyShopIcon,
  NotificationsNavIcon,
  OfferActionIcon,
  ProfileNavIcon,
  SavedNavIcon,
  SignOutIcon,
  TrustScoreIcon
} from "../components/AppIcons";
import { asset } from "../lib/api";
import { formatDateTimeValue, formatIntegerValue, formatRatingValue, profileLevel, toFiniteNumber } from "../lib/format";
import type { Item, OfferTab, RequireLogin, User, WantedItem } from "../lib/types";
import { useDialogA11y } from "../lib/useDialogA11y";
import { ContextEmptyState } from "../components/ContextEmptyState";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { WantedItemCard } from "../components/WantedItemCard";
import { ProfileShop } from "./ProfileShop";
import { ProfileSkeleton } from "../components/Skeletons";
import { itemService, mediaService, profileService, wantedItemService } from "../services";

export function Profile({
  user,
  viewedUser,
  requireLogin,
  onAuth,
  onSignOut,
  onReload,
  refreshKey,
  openItem,
  openInbox,
  openFollowing,
  openSaved,
  openAdd,
  openItemEdit,
  toggleItemAvailability,
  deleteItem,
  openWantedItem,
  openWantedEdit,
  toggleWantedAvailability,
  deleteWantedItem,
  openProfileEdit,
  openNotifications,
  onBack
}: {
  user: User | null;
  viewedUser?: User | null;
  requireLogin: RequireLogin;
  onAuth: (user: User) => void;
  onSignOut: () => void | Promise<void>;
  onReload: () => void;
  refreshKey: number;
  openItem: (item: Item) => void;
  openInbox: (tab?: OfferTab) => void;
  openFollowing: () => void;
  openSaved: () => void;
  openAdd: () => void;
  openItemEdit: (item: Item) => void;
  toggleItemAvailability: (item: Item) => void;
  deleteItem: (item: Item) => void;
  openWantedItem: (wantedItem: WantedItem) => void;
  openWantedEdit: (wantedItem: WantedItem) => void;
  toggleWantedAvailability: (wantedItem: WantedItem) => void;
  deleteWantedItem: (wantedItem: WantedItem) => void;
  openProfileEdit: () => void;
  openNotifications: () => void;
  onBack?: () => void;
}) {
  const isOwn = !viewedUser || viewedUser.id === user?.id;
  const [profile, setProfile] = useState<User | null>(viewedUser || user);
  const [file, setFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [accountHubOpen, setAccountHubOpen] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarSavedNotice, setAvatarSavedNotice] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [dataError, setDataError] = useState("");
  const [itemsLoading, setItemsLoading] = useState(false);
  const [listingItems, setListingItems] = useState<Item[]>([]);
  const [wantedItems, setWantedItems] = useState<WantedItem[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const shopSectionRef = useRef<HTMLElement | null>(null);
  const { dialogRef: accountHubRef, onBackdropMouseDown: onAccountHubBackdropMouseDown } = useDialogA11y(
    () => setAccountHubOpen(false),
    accountHubOpen
  );
  const { dialogRef: avatarSheetRef, onBackdropMouseDown: onAvatarBackdropMouseDown } = useDialogA11y(
    () => closeAvatarSheet(),
    avatarSheetOpen
  );

  useEffect(() => setProfile(viewedUser || user), [viewedUser, user]);

  useEffect(() => {
    let live = true;
    if (!profile?.id) return;
    setItemsLoading(true);
    setDataError("");
    Promise.all([
      itemService.listItems({ owner_id: profile.id, include_inactive: isOwn ? true : undefined, limit: 40 }),
      wantedItemService.listWantedItems({ owner_id: profile.id, include_inactive: isOwn ? true : undefined, limit: 40 })
    ])
      .then(([itemPage, wanted]) => {
        if (!live) return;
        setListingItems(itemPage.items);
        setWantedItems(wanted);
      })
      .catch((error: any) => live && setDataError(error.message || "โหลดรายการในโปรไฟล์ไม่สำเร็จ"))
      .finally(() => live && setItemsLoading(false));
    return () => {
      live = false;
    };
  }, [isOwn, profile?.id, refreshKey]);

  useEffect(() => {
    if (!avatarSavedNotice) return;
    const timer = window.setTimeout(() => setAvatarSavedNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [avatarSavedNotice]);

  const profileName = profile?.display_name || profile?.username || (isOwn ? "บัญชีของฉัน" : "ผู้ใช้งาน QXwap");
  const fallbackAvatar = useMemo(() => {
    const initial = (profileName || "Q").trim().slice(0, 1).toUpperCase();
    return `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#176bff"/>
            <stop offset="100%" stop-color="#53a7ff"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="32" fill="url(#g)"/>
        <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${initial}</text>
      </svg>`
    )}`;
  }, [profileName]);

  const avatarSrc = asset(profile?.avatar_url) || fallbackAvatar;
  const avatarPreviewSrc = useMemo(() => (file ? URL.createObjectURL(file) : avatarSrc), [avatarSrc, file]);

  useEffect(() => {
    if (!file || !avatarPreviewSrc.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(avatarPreviewSrc);
  }, [avatarPreviewSrc, file]);

  if (!user && !viewedUser) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title="โปรไฟล์"
        subtitle="ดูโปรไฟล์ ร้าน และประวัติดีลของคุณในที่เดียวหลังเข้าสู่ระบบ"
      />
    );
  }
  if (!profile) {
    return (
      <section className="screen profile-screen">
        <ProfileSkeleton />
      </section>
    );
  }

  async function saveAvatar() {
    if (!file) return;
    setAvatarSaving(true);
    setAvatarError("");
    let uploadedAvatarUrl = "";
    try {
      uploadedAvatarUrl = (await mediaService.uploadImages([file]))[0];
      const profileData = await profileService.updateCurrentProfile({ avatar_url: uploadedAvatarUrl });
      setFile(null);
      setAvatarBroken(false);
      setProfile((current) => (current ? { ...current, avatar_url: profileData.avatar_url } : profileData));
      setAvatarSheetOpen(false);
      setAvatarSavedNotice("บันทึกรูปโปรไฟล์แล้ว");
      onAuth(profileData);
      onReload();
    } catch (error: any) {
      if (uploadedAvatarUrl) {
        void mediaService.cleanupUploads([uploadedAvatarUrl]).catch(() => undefined);
      }
      setAvatarError(error.message || "บันทึกรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await onSignOut();
      setAccountHubOpen(false);
    } finally {
      setSigningOut(false);
    }
  }

  function closeAvatarSheet() {
    if (avatarSaving) return;
    setAvatarSheetOpen(false);
    setAvatarError("");
    setFile(null);
  }

  function scrollToOwnShop() {
    setAccountHubOpen(false);
    window.requestAnimationFrame(() => {
      shopSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const listingCount = listingItems.length || toFiniteNumber(profile?.listing_count, 0);
  const activeOfferCount = listingItems.reduce((count, listing) => count + toFiniteNumber(listing.stats.requests, 0), 0);
  const tradedCount = listingItems.reduce((count, listing) => count + toFiniteNumber(listing.trade?.count, 0), 0);
  const totalViews = listingItems.reduce((count, listing) => count + toFiniteNumber(listing.stats.views, 0), 0);
  const statItems = [
    { value: listingCount, label: "ประกาศ" },
    { value: activeOfferCount, label: "ข้อเสนอ" },
    { value: tradedCount, label: "ดีลสำเร็จ" },
    { value: totalViews, label: "เข้าชม" }
  ];
  const visibleStatItems = statItems.filter((item) => item.value > 0);
  const hasMeaningfulStats = visibleStatItems.length > 0;
  const level = profileLevel(profile);
  const reputationScore = Math.max(
    24,
    Math.min(
      98,
      Math.round(
        toFiniteNumber(profile?.rating, 0) * 9 +
          Number(profile?.account_level ?? 0) * 14 +
          Math.min(20, listingCount * 3) +
          Math.min(18, tradedCount * 6) +
          (profile?.is_fast_responder ? 8 : 0) +
          (profile?.is_featured ? 6 : 0)
      )
    )
  );
  const trustIndicators = [
    { label: level.title, tone: level.key },
    profile?.is_fast_responder ? { label: "ตอบไว", tone: "positive" } : null,
    profile?.is_featured ? { label: "โปรไฟล์น่าเชื่อถือ", tone: "positive" } : null,
    listingCount > 0 ? { label: `มีประกาศ ${formatIntegerValue(listingCount)}`, tone: "neutral" } : null,
    tradedCount > 0 ? { label: `ปิดดีล ${formatIntegerValue(tradedCount)}`, tone: "positive" } : null,
    profile?.city ? { label: `นัดรับ ${profile.city}`, tone: "neutral" } : null
  ].filter(Boolean) as Array<{ label: string; tone: string }>;
  const activityEntries = listingItems
    .flatMap((item) =>
      (item.trade?.history || []).map((entry) => {
        const counterpartLead = entry.counterpart_items[0]?.title || "ดีลที่เกี่ยวข้อง";
        const counterpartSuffix = entry.counterpart_items.length > 1 ? ` และอีก ${entry.counterpart_items.length - 1} ชิ้น` : "";
        return {
          id: entry.id,
          title: entry.status === "confirmed" ? `ปิดดีล ${item.title}` : `อัปเดตดีล ${item.title}`,
          summary: `จับคู่กับ ${counterpartLead}${counterpartSuffix}`,
          status:
            entry.status === "confirmed"
              ? "แลกสำเร็จ"
              : entry.status === "cancelled"
                ? "ยกเลิกดีล"
                : "อัปเดตสถานะ",
          createdAt: entry.created_at,
          timestamp: formatDateTimeValue(entry.created_at, "ล่าสุด", { dateStyle: "medium" })
        };
      })
    )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 4);
  const profileDetails = [
    profile?.city ? { icon: <LocationMetaIcon size={18} />, label: "พื้นที่ใช้งาน", value: profile.city } : null,
    profile?.username ? { icon: <ProfileNavIcon size={18} />, label: "ชื่อผู้ใช้", value: `@${profile.username}` } : null,
    { icon: <TrustScoreIcon size={18} />, label: "คะแนน", value: formatRatingValue(profile?.rating) || "0.0" }
  ].filter(Boolean) as Array<{ icon: ReactNode; label: string; value: string }>;

  return (
    <section className="screen profile-screen">
      <div className="profile-hero-shell">
        <div className="profile-hero-topbar">
          {onBack ? (
            <button type="button" className="profile-hero-icon" onClick={onBack} aria-label="ย้อนกลับ">
              <BackIcon size={18} />
            </button>
          ) : (
            <span className="profile-hero-spacer" />
          )}
          <div className="profile-hero-actions">
            {isOwn ? (
              <button type="button" className="profile-hero-icon" onClick={openNotifications} aria-label="เปิดการแจ้งเตือน">
                <NotificationsNavIcon size={18} />
              </button>
            ) : null}
            {isOwn ? (
              <button type="button" className="profile-hero-icon" onClick={() => setAccountHubOpen(true)} aria-label="เปิดเมนูโปรไฟล์">
                <AccountMenuIcon size={18} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="profile-hero-main">
          <div className="profile-avatar-frame profile-avatar-frame-plain profile-avatar-frame-dark">
            <img src={avatarBroken ? fallbackAvatar : avatarSrc} alt={profileName} onError={() => setAvatarBroken(true)} />
            {isOwn ? (
              <>
                <input
                  ref={avatarInputRef}
                  className="profile-avatar-input"
                  aria-label="เลือกไฟล์รูปโปรไฟล์"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setAvatarError("");
                    setFile(event.target.files?.[0] || null);
                    setAvatarSheetOpen(Boolean(event.target.files?.[0]));
                    event.currentTarget.value = "";
                  }}
                />
                <button type="button" className="profile-avatar-fab" aria-label="เปลี่ยนรูปโปรไฟล์" onClick={() => avatarInputRef.current?.click()}>
                  <ChangeAvatarIcon size={16} />
                </button>
              </>
            ) : null}
          </div>
          <div className="profile-hero-copy profile-hero-copy-dark">
            <h1>{profileName}</h1>
            <p>{profile?.username ? `@${profile.username}` : isOwn ? "ดูโปรไฟล์" : "โปรไฟล์ร้านค้า"}</p>
            <div className="profile-hero-rating">
              <TrustScoreIcon size={16} />
              <span>★ {formatRatingValue(profile?.rating) || "0.0"}</span>
              {profile?.city ? <small>{profile.city}</small> : null}
            </div>
            {profile?.bio ? <p className="profile-bio-text profile-bio-text-dark">{profile.bio}</p> : null}
            {isOwn ? (
              <div className="profile-hero-actions compact">
                <button type="button" className="primary" onClick={openAdd}>ลงประกาศสินค้า</button>
              </div>
            ) : null}
          </div>
        </div>

        {hasMeaningfulStats ? (
          <div className="profile-stat-grid">
            {visibleStatItems.map((item) => (
              <div className="profile-stat-card" key={item.label}>
                <b>{formatIntegerValue(item.value)}</b>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="profile-zero-summary">
            <b>เริ่มลงสินค้าชิ้นแรกเพื่อให้คนอื่นเห็นร้านของคุณ</b>
            <span>ตอนนี้ยังไม่มีประกาศ ข้อเสนอ หรือยอดเข้าชม</span>
          </div>
        )}
      </div>

      <div className="panel profile-reputation-shell profile-section-card">
        <div className="section-head compact">
          <h2>ความน่าเชื่อถือ</h2>
          <span className="profile-section-note">สิ่งที่คนอื่นเห็นก่อนส่งข้อเสนอ</span>
        </div>
        <div className="profile-reputation-grid">
          <div className="profile-reputation-card profile-reputation-card--score">
            <small>Reputation</small>
            <b>{reputationScore}/100</b>
            <span>{formatRatingValue(profile?.rating) ? `คะแนนผู้ใช้ ★ ${formatRatingValue(profile?.rating)}` : "เริ่มสะสมความน่าเชื่อถือได้จากดีลแรก"}</span>
          </div>
          <div className={`profile-reputation-card ${level.key}`}>
            <small>สถานะบัญชี</small>
            <b>{level.label}</b>
            <span>{level.note}</span>
          </div>
          <div className="profile-reputation-card">
            <small>ดีลที่ดูแลอยู่</small>
            <b>{formatIntegerValue(activeOfferCount)}</b>
            <span>{tradedCount ? `ปิดดีลแล้ว ${formatIntegerValue(tradedCount)} ครั้ง` : "พร้อมเริ่มคุยดีลใหม่"}</span>
          </div>
        </div>
        <div className="profile-trust-pill-row" aria-label="สัญญาณความน่าเชื่อถือ">
          {trustIndicators.map((indicator) => (
            <span key={indicator.label} className={`profile-trust-pill profile-trust-pill--${indicator.tone}`}>
              {indicator.label}
            </span>
          ))}
        </div>
      </div>

      <div className="panel profile-activity-shell profile-section-card">
        <div className="section-head compact">
          <h2>กิจกรรมล่าสุด</h2>
          <span className="profile-section-note">ติดตามการเคลื่อนไหวของร้าน</span>
        </div>
        {activityEntries.length ? (
          <div className="profile-activity-feed">
            {activityEntries.map((entry) => (
              <div className="profile-activity-item" key={entry.id}>
                <span className="profile-activity-dot" aria-hidden="true" />
                <div className="profile-activity-copy">
                  <b>{entry.title}</b>
                  <p>{entry.summary}</p>
                </div>
                <div className="profile-activity-meta">
                  <small>{entry.status}</small>
                  <span>{entry.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="profile-activity-empty">
            <b>ยังไม่มีกิจกรรมล่าสุด</b>
            <span>เมื่อมีการปิดดีลหรืออัปเดตสถานะ จะขึ้นที่นี่</span>
          </div>
        )}
      </div>

      {avatarSavedNotice ? <p className="profile-status-ok" role="status">{avatarSavedNotice}</p> : null}

      <div className="panel profile-shortcuts-shell profile-section-card">
        <div className="section-head compact">
          <h2>{isOwn ? "ทางลัดของคุณ" : "ทางลัดร้าน"}</h2>
          <span className="profile-section-note">{isOwn ? "จัดการรายการสำคัญได้จากตรงนี้" : "ดูร้านและติดตามดีลได้จากตรงนี้"}</span>
        </div>
        <div className="profile-shortcut-grid">
          <button type="button" className="profile-shortcut-card" onClick={openSaved}>
            <SavedNavIcon size={18} />
            <span>บันทึกไว้</span>
          </button>
          <button type="button" className="profile-shortcut-card" onClick={scrollToOwnShop}>
            <MyShopIcon size={18} />
            <span>สินค้าในร้าน</span>
          </button>
          <button type="button" className="profile-shortcut-card" onClick={() => openInbox(isOwn ? "received" : "sent")}>
            <OfferActionIcon size={18} />
            <span>ข้อเสนอ</span>
          </button>
          <button type="button" className="profile-shortcut-card" onClick={openFollowing}>
            <FollowingIcon size={18} />
            <span>ติดตาม</span>
          </button>
        </div>
      </div>

      <div className="profile-tab-rail profile-section-card">
        <button type="button" className="on">ทั้งหมด</button>
        <button type="button" onClick={scrollToOwnShop}>สินค้า</button>
        <button type="button" onClick={() => openInbox(isOwn ? "received" : "sent")}>ข้อเสนอ</button>
        <button type="button" onClick={openNotifications}>แจ้งเตือน</button>
      </div>

      {profileDetails.length ? (
        <div className="panel profile-about-card profile-section-card">
          <div className="profile-about-list">
            {profileDetails.map((detail) => (
              <div className="profile-about-row" key={`${detail.label}-${detail.value}`}>
                <span className="profile-about-icon" aria-hidden="true">{detail.icon}</span>
                <span>
                  <small>{detail.label}</small>
                  <b>{detail.value}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {dataError ? <p className="err" role="alert">{dataError}</p> : null}
      {itemsLoading ? (
        <div className="empty">กำลังโหลดรายการในโปรไฟล์...</div>
      ) : (
        <section ref={shopSectionRef} className="profile-products-section profile-section-card">
          <ProfileShop
            items={listingItems}
            openItem={openItem}
            isOwn={isOwn}
            onEdit={isOwn ? openItemEdit : undefined}
            onToggleAvailability={isOwn ? toggleItemAvailability : undefined}
            onDelete={isOwn ? deleteItem : undefined}
          />
        </section>
      )}

      {!itemsLoading ? (
        <section className="profile-products-section profile-section-card">
          <div className="profile-shop-shell">
            <div className="section-head compact">
              <h2>{isOwn ? "สิ่งที่คุณกำลังตามหา" : "สิ่งที่ร้านนี้กำลังตามหา"}</h2>
              <span className="profile-shop-count">{wantedItems.length} รายการ</span>
            </div>
            {wantedItems.length ? (
              <div className="shop-grid">
                {wantedItems.map((wantedItem) => (
                  <div key={wantedItem.id} className="profile-listing-shell">
                    <WantedItemCard wantedItem={wantedItem} onOpen={() => openWantedItem(wantedItem)} />
                    {isOwn ? (
                      <div className="action-row profile-listing-actions">
                        <button type="button" className="secondary" onClick={() => openWantedEdit(wantedItem)}>
                          แก้ไข
                        </button>
                        <button type="button" className="secondary" onClick={() => toggleWantedAvailability(wantedItem)}>
                          {wantedItem.status === "inactive" ? "เปิดประกาศอีกครั้ง" : "ปิดประกาศ"}
                        </button>
                        <button type="button" className="danger" onClick={() => deleteWantedItem(wantedItem)}>
                          ลบ
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <ContextEmptyState
                title={isOwn ? "ยังไม่มีประกาศตามหาของ" : "ยังไม่มีรายการที่ร้านนี้กำลังตามหา"}
                summary={
                  isOwn
                    ? "สร้าง wanted item เพื่อบอกให้คนอื่นเห็นว่าคุณกำลังตามหาอะไร"
                    : "ตอนนี้ร้านนี้ยังไม่ได้ลงสิ่งที่กำลังตามหาไว้"
                }
                details={[]}
              />
            )}
          </div>
        </section>
      ) : null}

      {isOwn && accountHubOpen ? (
        <div className="sheet-backdrop" onMouseDown={onAccountHubBackdropMouseDown}>
          <section
            id="profile-actions-panel"
            ref={accountHubRef}
            className="sheet profile-account-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-account-title"
            tabIndex={-1}
          >
            <div className="sheet-head">
              <h2 id="profile-account-title">ตั้งค่า</h2>
              <button type="button" onClick={() => setAccountHubOpen(false)} aria-label="ปิดเมนูบัญชี">
                <CloseIcon />
              </button>
            </div>
            <div className="profile-account-summary">
              <img src={avatarBroken ? fallbackAvatar : avatarSrc} alt={profileName} />
              <div>
                <b>{profileName}</b>
                <span>{profile?.username ? `@${profile.username}` : "บัญชี QXwap"}</span>
                {profile?.city ? <small>{profile.city}</small> : null}
              </div>
            </div>
            <div className="profile-account-list">
              <button type="button" onClick={scrollToOwnShop}>
                <MyShopIcon size={18} />
                <span>ร้านของฉัน</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openSaved(); }}>
                <SavedNavIcon size={18} />
                <span>บันทึกไว้</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openFollowing(); }}>
                <FollowingIcon size={18} />
                <span>รายการที่ติดตาม</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openProfileEdit(); }}>
                <EditProfileIcon size={18} />
                <span>แก้ไขโปรไฟล์</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openInbox("received"); }}>
                <OfferActionIcon size={18} />
                <span>ข้อเสนอ</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" className="danger-row" onClick={signOut} disabled={signingOut}>
                <SignOutIcon size={18} />
                <span>{signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isOwn && avatarSheetOpen ? (
        <div className="sheet-backdrop" onMouseDown={onAvatarBackdropMouseDown}>
          <section ref={avatarSheetRef} className="sheet profile-avatar-sheet" role="dialog" aria-modal="true" aria-labelledby="avatar-sheet-title" tabIndex={-1}>
            <div className="sheet-head">
              <h2 id="avatar-sheet-title">เปลี่ยนรูปโปรไฟล์</h2>
              <button type="button" onClick={closeAvatarSheet} aria-label="ปิดหน้าต่างเปลี่ยนรูปโปรไฟล์">
                <CloseIcon />
              </button>
            </div>
            <div className="profile-avatar-sheet-preview">
              <img src={file ? avatarPreviewSrc : avatarSrc} alt={profileName} onError={() => setAvatarBroken(true)} />
              <div>
                <b>{file ? "พร้อมบันทึกรูปใหม่" : "เลือกรูปใหม่"}</b>
                <span>{file?.name || "ยังไม่ได้เลือกรูป"}</span>
              </div>
            </div>
            <button type="button" className="secondary wide profile-avatar-sheet-trigger" onClick={() => avatarInputRef.current?.click()}>
              <ChangeAvatarIcon size={18} /> {file ? "เลือกรูปอื่น" : "เลือกรูปจากเครื่อง"}
            </button>
            {avatarError ? <p className="err" role="alert">{avatarError}</p> : null}
            <div className="sheet-actions profile-avatar-sheet-actions">
              <button type="button" className="secondary" onClick={closeAvatarSheet} disabled={avatarSaving}>ยกเลิก</button>
              <button type="button" className="primary" onClick={() => void saveAvatar()} disabled={!file || avatarSaving}>
                {avatarSaving ? "กำลังบันทึก..." : "บันทึกรูปโปรไฟล์"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
