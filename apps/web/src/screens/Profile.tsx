import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccountMenuIcon,
  BackIcon,
  ChangeAvatarIcon,
  ChevronRight,
  CloseIcon,
  EditProfileIcon,
  FollowingIcon,
  MyShopIcon,
  NotificationsNavIcon,
  OfferActionIcon,
  SavedNavIcon,
  SignOutIcon,
  TrustScoreIcon,
  WalletIcon
} from "../components/AppIcons";
import { asset } from "../lib/api";
import { formatDateTimeValue, formatIntegerValue, formatRatingValue, profileLevel, toFiniteNumber } from "../lib/format";
import type { Item, OfferSummary, OfferTab, RequireLogin, Review, User, WantedItem } from "../lib/types";
import { useDialogA11y } from "../lib/useDialogA11y";
import { ContextEmptyState } from "../components/ContextEmptyState";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { WantedItemCard } from "../components/WantedItemCard";
import { ProfileShop } from "./ProfileShop";
import { ProfileSkeleton } from "../components/Skeletons";
import {
  creditService,
  followService,
  itemService,
  mediaService,
  profileService,
  reviewService,
  savedItemService,
  swapService,
  wantedItemService
} from "../services";

function offerHasTwoPartyConfirmation(record: Record<string, string> | null | undefined, offer: OfferSummary) {
  if (!record || typeof record !== "object") return false;
  return Boolean(record[offer.from_user_id] && record[offer.to_user_id]);
}

function buildActivityEntry(offer: OfferSummary, viewerId: string | undefined) {
  const createdAt = offer.updated_at || offer.created_at || "";
  if (!createdAt) return null;
  const isRequester = offer.from_user_id === viewerId;
  const counterpartName = isRequester ? offer.to_name || "อีกฝ่าย" : offer.from_name || "อีกฝ่าย";
  const targetTitle = offer.target_title || "ดีลนี้";
  const scheduleReady = offerHasTwoPartyConfirmation(offer.logistics?.schedule_confirmations, offer);
  const receiptReady = offerHasTwoPartyConfirmation(offer.logistics?.receipt_confirmations, offer);
  let title = "อัปเดตดีลล่าสุด";
  let summary = `${counterpartName} เกี่ยวข้องกับ ${targetTitle}`;

  switch (offer.status) {
    case "pending":
      title = isRequester ? "รออีกฝ่ายตอบ" : "ต้องตอบดีลนี้";
      summary = isRequester
        ? `คุณส่งข้อเสนอหา ${counterpartName} สำหรับ ${targetTitle} แล้ว`
        : `${counterpartName} ส่งข้อเสนอเข้ามาสำหรับ ${targetTitle}`;
      break;
    case "countered":
      title = isRequester ? "มีข้อเสนอโต้กลับ" : "รออีกฝ่ายตัดสินใจ";
      summary = isRequester
        ? `${counterpartName} ปรับเงื่อนไขของ ${targetTitle} แล้ว`
        : `คุณส่งข้อเสนอโต้กลับของ ${targetTitle} ไปแล้ว`;
      break;
    case "accepted":
      title = scheduleReady ? "เตรียมส่งมอบต่อ" : "รอยืนยันนัดรับ";
      summary = scheduleReady
        ? `${targetTitle} ตอบรับแล้ว และทั้งสองฝ่ายกำลังเตรียมขั้นส่งมอบ`
        : `${targetTitle} ตอบรับแล้ว เหลือยืนยันเวลาและวิธีส่งมอบ`;
      break;
    case "scheduled":
      title = "นัดรับพร้อมแล้ว";
      summary = `${targetTitle} ยืนยันเวลานัดครบแล้ว พร้อมขยับไปขั้นรับของ`;
      break;
    case "handover_pending":
      title = receiptReady ? "รอยืนยันรับของ" : "กำลังส่งมอบ";
      summary = receiptReady
        ? `${targetTitle} ส่งมอบเสร็จแล้ว เหลือยืนยันรับของให้ครบ`
        : `${targetTitle} อยู่ระหว่างรับของหรือส่งมอบจริง`;
      break;
    case "completed":
      title = "แลกสำเร็จแล้ว";
      summary = `${targetTitle} ปิดดีลเรียบร้อยแล้ว พร้อมรีวิวและสะสมความน่าเชื่อถือ`;
      break;
    case "rejected":
      title = isRequester ? "ดีลถูกปฏิเสธ" : "ปฏิเสธดีลแล้ว";
      summary = isRequester
        ? `${counterpartName} ปฏิเสธข้อเสนอของ ${targetTitle}`
        : `คุณปฏิเสธข้อเสนอที่เข้ามาสำหรับ ${targetTitle}`;
      break;
    case "expired":
      title = "ดีลหมดเวลา";
      summary = `${targetTitle} ไม่มีการตอบกลับภายในเวลาที่กำหนด`;
      break;
    case "cancelled":
      title = "ยกเลิกดีลแล้ว";
      summary = isRequester
        ? `คุณยกเลิกข้อเสนอของ ${targetTitle}`
        : `${counterpartName} ยกเลิกดีลของ ${targetTitle}`;
      break;
    case "reported":
      title = "มีการรายงานปัญหา";
      summary = `${targetTitle} ถูกหยุดไว้ชั่วคราวเพื่อรอตรวจสอบ`;
      break;
    default:
      break;
  }

  return {
    id: offer.id,
    title,
    summary,
    status: offer.status,
    tab: isRequester ? "sent" : "received" as OfferTab,
    createdAt,
    timestamp: formatDateTimeValue(createdAt, "ล่าสุด", { dateStyle: "medium" })
  };
}

type ProfileActivityEntry = NonNullable<ReturnType<typeof buildActivityEntry>>;
type AccountHubPanel = "menu" | "wanted" | "reviews" | "activity";
type ListingRail = "all" | "active" | "inactive";

export function Profile({
  user,
  viewedUser,
  requireLogin,
  onAuth,
  onSignOut,
  onReload,
  refreshKey,
  followingUsers,
  followBusyId,
  openItem,
  openInbox,
  openConnections,
  openSaved,
  openAdd,
  openCredits,
  openItemEdit,
  toggleItemAvailability,
  deleteItem,
  openWantedItem,
  openWantedEdit,
  toggleWantedAvailability,
  deleteWantedItem,
  onToggleFollow,
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
  followingUsers: User[];
  followBusyId: string | null;
  openItem: (item: Item) => void;
  openInbox: (tab?: OfferTab) => void;
  openConnections: (tab: "followers" | "following", profile?: User | null) => void;
  openSaved: () => void;
  openAdd: () => void;
  openCredits: () => void;
  openItemEdit: (item: Item) => void;
  toggleItemAvailability: (item: Item) => void;
  deleteItem: (item: Item) => void;
  openWantedItem: (wantedItem: WantedItem) => void;
  openWantedEdit: (wantedItem: WantedItem) => void;
  toggleWantedAvailability: (wantedItem: WantedItem) => void;
  deleteWantedItem: (wantedItem: WantedItem) => void;
  onToggleFollow: (profile: User) => void | Promise<void>;
  openProfileEdit: () => void;
  openNotifications: () => void;
  onBack?: () => void;
}) {
  const isOwn = !viewedUser || viewedUser.id === user?.id;
  const [profile, setProfile] = useState<User | null>(viewedUser || user);
  const [file, setFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [accountHubOpen, setAccountHubOpen] = useState(false);
  const [accountHubPanel, setAccountHubPanel] = useState<AccountHubPanel>("menu");
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarSavedNotice, setAvatarSavedNotice] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [dataError, setDataError] = useState("");
  const [socialError, setSocialError] = useState("");
  const [ownerPanelsError, setOwnerPanelsError] = useState("");
  const [itemsLoading, setItemsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [ownerPanelsLoading, setOwnerPanelsLoading] = useState(false);
  const [listingItems, setListingItems] = useState<Item[]>([]);
  const [wantedItems, setWantedItems] = useState<WantedItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<User[]>([]);
  const [savedPreview, setSavedPreview] = useState<Item[]>([]);
  const [swapHistory, setSwapHistory] = useState<OfferSummary[]>([]);
  const [creditBalancePreview, setCreditBalancePreview] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [listingRail, setListingRail] = useState<ListingRail>("all");
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
    let live = true;
    if (!profile?.id) return;
    setSocialLoading(true);
    setSocialError("");
    Promise.all([
      reviewService.listReviews({ reviewee_user_id: profile.id }),
      followService.listFollowers(profile.id),
      followService.listFollowingByUser(profile.id)
    ])
      .then(([nextReviews, nextFollowers, nextFollowing]) => {
        if (!live) return;
        setReviews(nextReviews);
        setFollowers(nextFollowers);
        setFollowingProfiles(nextFollowing);
      })
      .catch((error: any) => live && setSocialError(error.message || "โหลดข้อมูลผู้ติดตามและรีวิวไม่สำเร็จ"))
      .finally(() => live && setSocialLoading(false));
    return () => {
      live = false;
    };
  }, [profile?.id, refreshKey]);

  useEffect(() => {
    let live = true;
    if (!isOwn || !user) {
      setSavedPreview([]);
      setSwapHistory([]);
      setCreditBalancePreview(null);
      setOwnerPanelsError("");
      setOwnerPanelsLoading(false);
      return;
    }
    setOwnerPanelsLoading(true);
    setOwnerPanelsError("");
    Promise.all([
      savedItemService.listSavedItems({ limit: 4 }),
      swapService.listOffers(),
      creditService.getWallet()
    ])
      .then(([savedPage, offers, wallet]) => {
        if (!live) return;
        setSavedPreview(savedPage.items || []);
        setSwapHistory((offers || []).slice(0, 5));
        setCreditBalancePreview(Number(wallet?.credit_balance || 0));
      })
      .catch((error: any) => live && setOwnerPanelsError(error.message || "โหลดข้อมูลส่วนตัวในโปรไฟล์ไม่สำเร็จ"))
      .finally(() => live && setOwnerPanelsLoading(false));
    return () => {
      live = false;
    };
  }, [isOwn, user?.id, refreshKey]);

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
        subtitle="เข้าสู่ระบบเพื่อดูโปรไฟล์"
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
      setAccountHubPanel("menu");
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
    setAccountHubPanel("menu");
    window.requestAnimationFrame(() => {
      shopSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const listingCount = listingItems.length || toFiniteNumber(profile?.listing_count, 0);
  const wantedCount = wantedItems.length || toFiniteNumber(profile?.wanted_count, 0);
  const reviewCount = reviews.length || toFiniteNumber(profile?.review_count, 0);
  const followerCount = followers.length || toFiniteNumber(profile?.follower_count, 0);
  const followingCount = followingProfiles.length || toFiniteNumber(profile?.following_count, 0);
  const level = profileLevel(profile);
  const isFollowingProfile = !isOwn && Boolean(user) && followingUsers.some((entry) => entry.id === profile.id);
  const followActionBusy = followBusyId === profile.id;
  const activityEntries = swapHistory
    .map((offer) => buildActivityEntry(offer, user?.id))
    .filter((entry): entry is ProfileActivityEntry => Boolean(entry))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const heroSummary = isOwn
    ? `${formatIntegerValue(listingCount)} รายการในร้านของคุณ`
    : `${formatIntegerValue(listingCount)} รายการจากร้านนี้`;
  const activeDealsCount = swapHistory.filter((offer) =>
    ["pending", "countered", "accepted", "scheduled", "handover_pending"].includes(offer.status)
  ).length;
  const completedDealsCount = swapHistory.filter((offer) => offer.status === "completed").length;
  const visibleListingItems = useMemo(() => {
    const pool = isOwn ? listingItems : listingItems.filter((item) => item.status === "active");
    if (!isOwn) return pool;
    if (listingRail === "active") return pool.filter((item) => item.status === "active");
    if (listingRail === "inactive") return pool.filter((item) => item.status === "inactive");
    return pool;
  }, [isOwn, listingItems, listingRail]);
  const statCards = [
    { label: "ประกาศ", value: formatIntegerValue(listingCount) },
    { label: "กำลังแลก", value: formatIntegerValue(activeDealsCount) },
    { label: "สำเร็จแล้ว", value: formatIntegerValue(completedDealsCount) },
    { label: "รีวิว", value: formatIntegerValue(reviewCount) }
  ];
  const listingRailItems: { id: ListingRail; label: string }[] = [
    { id: "all", label: "ทั้งหมด" },
    { id: "active", label: "ที่เปิดอยู่" },
    { id: "inactive", label: "ปิดประกาศ" }
  ];
  const accountHubTitle = {
    menu: "เมนูโปรไฟล์",
    wanted: isOwn ? "สิ่งที่คุณกำลังหา" : "สิ่งที่ร้านนี้กำลังหา",
    reviews: "รีวิว",
    activity: "กิจกรรมล่าสุด"
  }[accountHubPanel];

  function openAccountHub() {
    setAccountHubPanel("menu");
    setAccountHubOpen(true);
  }

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
              <button type="button" className="profile-hero-icon" onClick={openAccountHub} aria-label="เปิดเมนูโปรไฟล์">
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
            <p>{profile?.username ? `@${profile.username}` : isOwn ? "บัญชี QXwap" : "โปรไฟล์ร้านค้า"}</p>
            <div className="profile-hero-rating">
              <TrustScoreIcon size={16} />
              <span>★ {formatRatingValue(profile?.rating) || "0.0"}</span>
              {reviewCount ? <small>{formatIntegerValue(reviewCount)} รีวิว</small> : null}
              <mark className={`profile-hero-level profile-hero-level--${level.key}`}>{level.label}</mark>
            </div>
            <div className="profile-hero-actions compact">
              {isOwn ? (
                <>
                  <button type="button" className="primary" onClick={openAdd}>ลงประกาศสินค้า</button>
                  <button type="button" className="secondary" onClick={openProfileEdit}>แก้ไขโปรไฟล์</button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={isFollowingProfile ? "secondary" : "primary"}
                    onClick={() => void onToggleFollow(profile)}
                    disabled={followActionBusy}
                  >
                    {followActionBusy ? "กำลังอัปเดต..." : isFollowingProfile ? "เลิกติดตาม" : "ติดตามร้านนี้"}
                  </button>
                  <button type="button" className="secondary" onClick={scrollToOwnShop}>ดูประกาศของร้าน</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="profile-stat-grid profile-stat-grid--hero" aria-label="สรุปบัญชี">
          {statCards.map((card) => (
            <div key={card.label} className="profile-stat-card profile-stat-card--hero">
              <b>{card.value}</b>
              <span>{card.label}</span>
            </div>
          ))}
        </div>
      </div>

      {avatarSavedNotice ? <p className="profile-status-ok" role="status">{avatarSavedNotice}</p> : null}

      {dataError ? <p className="err" role="alert">{dataError}</p> : null}
      {itemsLoading ? (
        <div className="empty">กำลังโหลดรายการในโปรไฟล์...</div>
      ) : (
        <section ref={shopSectionRef} className="profile-products-section profile-section-card">
          <div className="profile-products-shell-head">
            <div className="profile-products-title">
              <h2>{isOwn ? "สินค้าของคุณ" : "สินค้าในร้าน"}</h2>
              <span>{formatIntegerValue(visibleListingItems.length)} รายการ</span>
            </div>
            {isOwn ? (
              <button type="button" className="secondary profile-products-head-action" onClick={openAdd}>
                ลงประกาศ
              </button>
            ) : null}
          </div>
          {isOwn ? (
            <div className="profile-listing-rail" role="tablist" aria-label="ตัวกรองสินค้า">
              {listingRailItems.map((rail) => (
                <button
                  key={rail.id}
                  type="button"
                  className={listingRail === rail.id ? "on" : ""}
                  onClick={() => setListingRail(rail.id)}
                >
                  {rail.label}
                </button>
              ))}
            </div>
          ) : null}
          <ProfileShop
            items={visibleListingItems}
            openItem={openItem}
            isOwn={isOwn}
            showHeader={false}
            emptySummary={isOwn ? "เริ่มลงประกาศจากปุ่มด้านบน" : ""}
            onEdit={isOwn ? openItemEdit : undefined}
            onToggleAvailability={isOwn ? toggleItemAvailability : undefined}
            onDelete={isOwn ? deleteItem : undefined}
          />
        </section>
      )}

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
              <div className="profile-account-headline">
                {accountHubPanel !== "menu" ? (
                  <button type="button" className="profile-account-back" onClick={() => setAccountHubPanel("menu")} aria-label="ย้อนกลับไปเมนู">
                    <BackIcon size={16} />
                  </button>
                ) : null}
                <h2 id="profile-account-title">{accountHubTitle}</h2>
              </div>
              <button type="button" onClick={() => setAccountHubOpen(false)} aria-label="ปิดเมนูบัญชี">
                <CloseIcon />
              </button>
            </div>
            {accountHubPanel === "menu" ? (
              <>
                <div className="profile-account-summary">
                  <img src={avatarBroken ? fallbackAvatar : avatarSrc} alt={profileName} />
                  <div>
                    <b>{profileName}</b>
                    <span>{profile?.username ? `@${profile.username}` : "บัญชี QXwap"}</span>
                    <small>{heroSummary}</small>
                  </div>
                </div>
                <div className="profile-account-list">
                  <button type="button" onClick={scrollToOwnShop}>
                    <MyShopIcon size={18} />
                    <span>สินค้าที่ลงไว้</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => setAccountHubPanel("wanted")}>
                    <OfferActionIcon size={18} />
                    <span>สิ่งที่กำลังหา {wantedCount ? `(${formatIntegerValue(wantedCount)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => setAccountHubPanel("activity")}>
                    <OfferActionIcon size={18} />
                    <span>กิจกรรมล่าสุด {activityEntries.length ? `(${formatIntegerValue(activityEntries.length)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => setAccountHubPanel("reviews")}>
                    <TrustScoreIcon size={18} />
                    <span>รีวิว {reviewCount ? `(${formatIntegerValue(reviewCount)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => { setAccountHubOpen(false); openConnections("followers"); }}>
                    <FollowingIcon size={18} />
                    <span>ผู้ติดตาม {followerCount ? `(${formatIntegerValue(followerCount)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => { setAccountHubOpen(false); openConnections("following"); }}>
                    <FollowingIcon size={18} />
                    <span>กำลังติดตาม {followingCount ? `(${formatIntegerValue(followingCount)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => { setAccountHubOpen(false); openSaved(); }}>
                    <SavedNavIcon size={18} />
                    <span>บันทึกไว้ {savedPreview.length ? `(${formatIntegerValue(savedPreview.length)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => { setAccountHubOpen(false); openCredits(); }}>
                    <WalletIcon size={18} />
                    <span>QX Credit {creditBalancePreview != null ? `(${formatIntegerValue(creditBalancePreview)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => { setAccountHubOpen(false); openInbox("received"); }}>
                    <OfferActionIcon size={18} />
                    <span>ข้อเสนอและดีล {swapHistory.length ? `(${formatIntegerValue(swapHistory.length)})` : ""}</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => { setAccountHubOpen(false); openProfileEdit(); }}>
                    <EditProfileIcon size={18} />
                    <span>แก้ไขโปรไฟล์</span>
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" className="danger-row" onClick={signOut} disabled={signingOut}>
                    <SignOutIcon size={18} />
                    <span>{signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : null}

            {accountHubPanel === "wanted" ? (
              <div className="profile-account-panel-body">
                {wantedItems.length ? (
                  <div className="shop-grid">
                    {wantedItems.map((wantedItem) => (
                      <div key={wantedItem.id} className="profile-listing-shell">
                        <WantedItemCard wantedItem={wantedItem} onOpen={() => openWantedItem(wantedItem)} />
                        <div className="action-row profile-listing-actions">
                          <button type="button" className="secondary" onClick={() => openWantedEdit(wantedItem)}>
                            แก้ไข
                          </button>
                          <button type="button" className="secondary" onClick={() => toggleWantedAvailability(wantedItem)}>
                            {wantedItem.status === "inactive" ? "เปิดอีกครั้ง" : "ปิดประกาศ"}
                          </button>
                          <button type="button" className="danger" onClick={() => deleteWantedItem(wantedItem)}>
                            ลบ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ContextEmptyState title="ยังไม่มีรายการที่กำลังหา" details={[]} />
                )}
              </div>
            ) : null}

            {accountHubPanel === "reviews" ? (
              <div className="profile-account-panel-body">
                {socialLoading ? (
                  <div className="profile-inline-state">
                    <b>กำลังโหลดรีวิว</b>
                  </div>
                ) : socialError ? (
                  <div className="profile-inline-state">
                    <b>โหลดรีวิวไม่สำเร็จ</b>
                    <span>{socialError}</span>
                    <button type="button" className="secondary" onClick={onReload}>ลองใหม่</button>
                  </div>
                ) : reviews.length ? (
                  <div className="profile-review-list">
                    {reviews.map((review) => (
                      <article key={review.id} className="profile-review-item">
                        <div className="profile-review-head">
                          <b>{review.reviewer_name || review.reviewer_username || "ผู้ใช้ QXwap"}</b>
                          <span>★ {formatIntegerValue(review.rating)}</span>
                        </div>
                        {review.comment ? <p>{review.comment}</p> : null}
                        <small>{formatDateTimeValue(review.created_at, "ล่าสุด", { dateStyle: "medium" })}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <ContextEmptyState title="ยังไม่มีรีวิว" details={[]} />
                )}
              </div>
            ) : null}

            {accountHubPanel === "activity" ? (
              <div className="profile-account-panel-body">
                {ownerPanelsLoading ? (
                  <div className="profile-inline-state">
                    <b>กำลังโหลดกิจกรรม</b>
                  </div>
                ) : ownerPanelsError ? (
                  <div className="profile-inline-state">
                    <b>โหลดกิจกรรมไม่สำเร็จ</b>
                    <span>{ownerPanelsError}</span>
                    <button type="button" className="secondary" onClick={onReload}>ลองใหม่</button>
                  </div>
                ) : activityEntries.length ? (
                  <div className="profile-activity-feed">
                    {activityEntries.map((entry) => (
                      <button
                        type="button"
                        className="profile-activity-item"
                        key={entry.id}
                        onClick={() => {
                          setAccountHubOpen(false);
                          openInbox(entry.tab);
                        }}
                      >
                        <span className="profile-activity-dot" aria-hidden="true" />
                        <div className="profile-activity-copy">
                          <b>{entry.title}</b>
                          <p>{entry.summary}</p>
                        </div>
                        <div className="profile-activity-meta">
                          <span>{entry.timestamp}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <ContextEmptyState title="ยังไม่มีกิจกรรมล่าสุด" details={[]} />
                )}
              </div>
            ) : null}
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
