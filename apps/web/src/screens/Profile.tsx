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
  TrustScoreIcon,
  WalletIcon
} from "../components/AppIcons";
import { asset } from "../lib/api";
import { formatDateTimeValue, formatIntegerValue, formatRatingValue, profileLevel, toFiniteNumber } from "../lib/format";
import type { Item, OfferSummary, OfferTab, RequireLogin, Review, User, WantedItem } from "../lib/types";
import { useDialogA11y } from "../lib/useDialogA11y";
import { ContextEmptyState } from "../components/ContextEmptyState";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { StatusBadge } from "../components/StatusBadge";
import { TrustPillList } from "../components/TrustPillList";
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const shopSectionRef = useRef<HTMLElement | null>(null);
  const wantedSectionRef = useRef<HTMLElement | null>(null);
  const socialSectionRef = useRef<HTMLElement | null>(null);
  const reviewSectionRef = useRef<HTMLElement | null>(null);
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
        hideDefaultDetails
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

  function scrollToWanted() {
    window.requestAnimationFrame(() => {
      wantedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function scrollToReviews() {
    window.requestAnimationFrame(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const listingCount = listingItems.length || toFiniteNumber(profile?.listing_count, 0);
  const wantedCount = wantedItems.length || toFiniteNumber(profile?.wanted_count, 0);
  const reviewCount = reviews.length || toFiniteNumber(profile?.review_count, 0);
  const followerCount = followers.length || toFiniteNumber(profile?.follower_count, 0);
  const followingCount = followingProfiles.length || toFiniteNumber(profile?.following_count, 0);
  const activeOfferCount = listingItems.reduce((count, listing) => count + toFiniteNumber(listing.stats.requests, 0), 0);
  const tradedCount = listingItems.reduce((count, listing) => count + toFiniteNumber(listing.trade?.count, 0), 0);
  const meetupVerifiedCount = swapHistory.filter(
    (offer) => offer.logistics?.shipping_method === "meetup" && offerHasTwoPartyConfirmation(offer.logistics?.schedule_confirmations, offer)
  ).length;
  const receiptVerifiedCount = swapHistory.filter(
    (offer) => offer.status === "completed" || offerHasTwoPartyConfirmation(offer.logistics?.receipt_confirmations, offer)
  ).length;
  const totalViews = listingItems.reduce((count, listing) => count + toFiniteNumber(listing.stats.views, 0), 0);
  const statItems = [
    { value: listingCount, label: "ประกาศ" },
    { value: wantedCount, label: "Wanted" },
    { value: followerCount, label: "ผู้ติดตาม" },
    { value: followingCount, label: "กำลังติดตาม" },
    { value: reviewCount, label: "รีวิว" }
  ];
  const visibleStatItems = statItems.filter((item) => item.value > 0);
  const hasMeaningfulStats = visibleStatItems.length > 0;
  const level = profileLevel(profile);
  const isFollowingProfile = !isOwn && Boolean(user) && followingUsers.some((entry) => entry.id === profile.id);
  const followActionBusy = followBusyId === profile.id;
  const reputationScore = Math.max(
    24,
    Math.min(
      98,
      Math.round(
        toFiniteNumber(profile?.rating, 0) * 9 +
          (level.key === "admin" ? 30 : level.key === "power_user" ? 24 : level.key === "trusted_user" ? 18 : 10) +
          Math.min(20, listingCount * 3) +
          Math.min(18, tradedCount * 6) +
          (profile?.is_fast_responder ? 8 : 0) +
          (profile?.is_featured ? 6 : 0) +
          Math.min(12, reviewCount * 3) +
          Math.min(10, followerCount * 2)
      )
    )
  );
  const trustIndicators = [
    { label: level.title, tone: level.key },
    profile?.is_fast_responder ? { label: "ตอบไว", tone: "positive" } : null,
    profile?.is_featured ? { label: "ยืนยันโปรไฟล์", tone: "positive" } : null,
    meetupVerifiedCount > 0 ? { label: `นัดรับยืนยันแล้ว ${formatIntegerValue(meetupVerifiedCount)}`, tone: "positive" } : null,
    receiptVerifiedCount > 0 ? { label: `รับของยืนยันครบ ${formatIntegerValue(receiptVerifiedCount)}`, tone: "positive" } : null,
    listingCount > 0 ? { label: `มีประกาศ ${formatIntegerValue(listingCount)}`, tone: "neutral" } : null,
    wantedCount > 0 ? { label: `Wanted ${formatIntegerValue(wantedCount)}`, tone: "neutral" } : null,
    tradedCount > 0 ? { label: `ปิดดีล ${formatIntegerValue(tradedCount)}`, tone: "positive" } : null,
    reviewCount > 0 ? { label: `รีวิว ${formatIntegerValue(reviewCount)}`, tone: "positive" } : null,
    followerCount > 0 ? { label: `ผู้ติดตาม ${formatIntegerValue(followerCount)}`, tone: "neutral" } : null,
    profile?.city ? { label: `นัดรับ ${profile.city}`, tone: "neutral" } : null
  ]
    .filter(Boolean)
    .filter((indicator, index, entries) => entries.findIndex((entry) => entry?.label === indicator?.label) === index) as Array<{
      label: string;
      tone: string;
    }>;
  const activityEntries = swapHistory
    .map((offer) => buildActivityEntry(offer, user?.id))
    .filter((entry): entry is ProfileActivityEntry => Boolean(entry))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
  const profileDetails = [
    profile?.city ? { icon: <LocationMetaIcon size={18} />, label: "พื้นที่ใช้งาน", value: profile.city } : null,
    profile?.username ? { icon: <ProfileNavIcon size={18} />, label: "ชื่อผู้ใช้", value: `@${profile.username}` } : null,
    { icon: <TrustScoreIcon size={18} />, label: "คะแนน", value: formatRatingValue(profile?.rating) || "0.0" },
    followerCount ? { icon: <FollowingIcon size={18} />, label: "ผู้ติดตาม", value: formatIntegerValue(followerCount) } : null
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
            <b>{isOwn ? "เริ่มลงประกาศแรก" : "ร้านนี้ยังไม่มีสถิติ"}</b>
          </div>
        )}
      </div>

      <div className="panel profile-reputation-shell profile-section-card">
        <div className="section-head compact">
          <h2>ความน่าเชื่อถือ</h2>
        </div>
        <div className="profile-reputation-grid">
          <div className="profile-reputation-card profile-reputation-card--score">
            <small>คะแนนความน่าเชื่อถือ</small>
            <b>{reputationScore}/100</b>
            {formatRatingValue(profile?.rating) ? <span>★ {formatRatingValue(profile?.rating)}</span> : null}
          </div>
          <div className={`profile-reputation-card ${level.key}`}>
            <small>ระดับบัญชี</small>
            <b>{level.label}</b>
          </div>
          <div className="profile-reputation-card">
            <small>{isOwn ? "ดีลที่กำลังดูแล" : "กิจกรรมล่าสุด"}</small>
            <b>{formatIntegerValue(isOwn ? activeOfferCount : tradedCount || listingCount)}</b>
            {tradedCount ? <span>ปิดดีล {formatIntegerValue(tradedCount)} ครั้ง</span> : null}
          </div>
        </div>
        <TrustPillList
          pills={trustIndicators}
          ariaLabel="สัญญาณความน่าเชื่อถือ"
          rowClassName="profile-trust-pill-row"
          pillClassName="profile-trust-pill"
        />
      </div>

      {avatarSavedNotice ? <p className="profile-status-ok" role="status">{avatarSavedNotice}</p> : null}

      <div className="panel profile-shortcuts-shell profile-section-card">
        <div className="section-head compact">
          <h2>{isOwn ? "ทางลัดของคุณ" : "ทางลัดร้าน"}</h2>
        </div>
        <div className="profile-shortcut-grid">
          {isOwn ? (
            <button type="button" className="profile-shortcut-card" onClick={openSaved}>
              <SavedNavIcon size={18} />
              <span>บันทึกไว้</span>
            </button>
          ) : null}
          {isOwn ? (
            <button type="button" className="profile-shortcut-card" onClick={openCredits}>
              <WalletIcon size={18} />
              <span>QX Credit</span>
            </button>
          ) : null}
          <button type="button" className="profile-shortcut-card" onClick={scrollToOwnShop}>
            <MyShopIcon size={18} />
            <span>สินค้าในร้าน</span>
          </button>
          <button type="button" className="profile-shortcut-card" onClick={scrollToWanted}>
            <OfferActionIcon size={18} />
            <span>สิ่งที่กำลังหา</span>
          </button>
          {isOwn ? (
            <>
              <button type="button" className="profile-shortcut-card" onClick={() => openInbox("received")}>
                <OfferActionIcon size={18} />
                <span>ข้อเสนอ</span>
              </button>
              <button type="button" className="profile-shortcut-card" onClick={() => openConnections("following")}>
                <FollowingIcon size={18} />
                <span>กำลังติดตาม</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" className="profile-shortcut-card" onClick={() => openConnections("followers", profile)}>
                <FollowingIcon size={18} />
                <span>ผู้ติดตาม</span>
              </button>
              <button type="button" className="profile-shortcut-card" onClick={scrollToReviews}>
                <TrustScoreIcon size={18} />
                <span>รีวิว</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profile-tab-rail profile-section-card">
        <button type="button" className="on">ทั้งหมด</button>
        <button type="button" onClick={scrollToOwnShop}>สินค้า</button>
        <button type="button" onClick={scrollToWanted}>Wanted</button>
        <button type="button" onClick={scrollToReviews}>รีวิว</button>
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

      {isOwn ? (
        <section className="panel profile-private-shell profile-section-card">
          <div className="section-head compact">
            <h2>พื้นที่ของคุณ</h2>
          </div>
          {ownerPanelsLoading ? (
            <div className="empty">กำลังโหลดข้อมูลส่วนตัว...</div>
          ) : ownerPanelsError ? (
            <div className="profile-inline-state">
              <b>โหลดพื้นที่ส่วนตัวไม่สำเร็จ</b>
              <span>{ownerPanelsError}</span>
              <button type="button" className="secondary" onClick={onReload}>ลองใหม่</button>
            </div>
          ) : (
            <>
              <div className="profile-private-grid">
                <button type="button" className="profile-private-card" onClick={openCredits}>
                  <small>QX Credit</small>
                  <b>{formatIntegerValue(creditBalancePreview || 0)}</b>
                  <span>ใช้แลกของระบบ</span>
                </button>
                <button type="button" className="profile-private-card" onClick={openSaved}>
                  <small>รายการที่บันทึกไว้</small>
                  <b>{formatIntegerValue(savedPreview.length)}</b>
                  {savedPreview.length ? <span>เปิดดูต่อ</span> : null}
                </button>
                <button type="button" className="profile-private-card" onClick={() => openInbox("received")}>
                  <small>ดีลและข้อเสนอ</small>
                  <b>{formatIntegerValue(swapHistory.length)}</b>
                  {swapHistory.length ? <span>เปิดดูต่อ</span> : null}
                </button>
              </div>
              <div className="profile-mini-list">
                <div className="section-head compact">
                  <h2>บันทึกไว้ล่าสุด</h2>
                </div>
                {savedPreview.length ? (
                  <div className="profile-mini-list-grid">
                    {savedPreview.slice(0, 3).map((item) => (
                      <button type="button" key={item.id} className="profile-mini-list-item" onClick={() => openItem(item)}>
                        <b>{item.title}</b>
                        <span>{item.location.label || item.category}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <ContextEmptyState
                    title="ยังไม่มีรายการที่บันทึกไว้"
                    details={[]}
                  />
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      {isOwn ? (
        <div className="panel profile-activity-shell profile-section-card">
          <div className="section-head compact">
            <h2>กิจกรรมล่าสุด</h2>
          </div>
          {ownerPanelsLoading ? (
            <div className="empty">กำลังโหลดประวัติดีล...</div>
          ) : ownerPanelsError ? (
            <div className="profile-inline-state">
              <b>โหลดประวัติดีลไม่สำเร็จ</b>
              <span>{ownerPanelsError}</span>
              <button type="button" className="secondary" onClick={onReload}>ลองใหม่</button>
            </div>
          ) : activityEntries.length ? (
            <div className="profile-activity-feed">
              {activityEntries.map((entry) => (
                <button type="button" className="profile-activity-item" key={entry.id} onClick={() => openInbox(entry.tab)}>
                  <span className="profile-activity-dot" aria-hidden="true" />
                  <div className="profile-activity-copy">
                    <b>{entry.title}</b>
                    <p>{entry.summary}</p>
                  </div>
                  <div className="profile-activity-meta">
                    <StatusBadge kind="swap" status={entry.status} />
                    <span>{entry.timestamp}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-activity-empty">
              <b>ยังไม่มีดีล</b>
            </div>
          )}
        </div>
      ) : null}

      <section ref={socialSectionRef} className="panel profile-social-shell profile-section-card">
        <div className="section-head compact">
          <h2>ผู้ติดตามและการติดตาม</h2>
        </div>
        {socialLoading ? (
          <div className="empty">กำลังโหลดผู้ติดตามและการติดตาม...</div>
        ) : socialError ? (
          <div className="profile-inline-state">
            <b>โหลดผู้ติดตามและรีวิวไม่สำเร็จ</b>
            <span>{socialError}</span>
            <button type="button" className="secondary" onClick={onReload}>ลองใหม่</button>
          </div>
        ) : (
          <div className="profile-social-grid">
            <div className="profile-social-card">
              <small>ผู้ติดตาม</small>
              <b>{formatIntegerValue(followerCount)}</b>
              {followers.length ? (
                <div className="profile-person-chip-row">
                  {followers.slice(0, 4).map((entry) => (
                    <span key={entry.id} className="profile-person-chip">
                      @{entry.username || entry.display_name || "user"}
                    </span>
                  ))}
                </div>
              ) : (
                <span>ยังไม่มีผู้ติดตาม</span>
              )}
              <button type="button" className="profile-social-link" onClick={() => openConnections("followers", profile)}>
                ดูทั้งหมด
              </button>
            </div>
            <div className="profile-social-card">
              <small>กำลังติดตาม</small>
              <b>{formatIntegerValue(followingCount)}</b>
              {followingProfiles.length ? (
                <div className="profile-person-chip-row">
                  {followingProfiles.slice(0, 4).map((entry) => (
                    <span key={entry.id} className="profile-person-chip">
                      @{entry.username || entry.display_name || "user"}
                    </span>
                  ))}
                </div>
              ) : (
                <span>ยังไม่ได้ติดตามใคร</span>
              )}
              <button type="button" className="profile-social-link" onClick={() => openConnections("following", profile)}>
                ดูทั้งหมด
              </button>
            </div>
          </div>
        )}
      </section>

      <section ref={reviewSectionRef} className="panel profile-review-shell profile-section-card">
        <div className="section-head compact">
          <h2>รีวิว</h2>
        </div>
        {socialLoading ? (
          <div className="empty">กำลังโหลดรีวิว...</div>
        ) : socialError ? (
          <div className="profile-inline-state">
            <b>โหลดรีวิวไม่สำเร็จ</b>
            <span>{socialError}</span>
            <button type="button" className="secondary" onClick={onReload}>ลองใหม่</button>
          </div>
        ) : reviews.length ? (
          <div className="profile-review-list">
            {reviews.slice(0, 6).map((review) => (
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
          <ContextEmptyState
            title={isOwn ? "ยังไม่มีรีวิวสำหรับบัญชีนี้" : "โปรไฟล์นี้ยังไม่มีรีวิวสาธารณะ"}
            details={[]}
          />
        )}
      </section>

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
        <section ref={wantedSectionRef} className="profile-products-section profile-section-card">
          <div className="profile-shop-shell">
            <div className="section-head compact">
              <h2>{isOwn ? "สิ่งที่คุณกำลังตามหา" : "สิ่งที่ร้านนี้กำลังตามหา"}</h2>
              <span className="profile-shop-count">{formatIntegerValue(wantedCount)} รายการ</span>
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
              <button type="button" onClick={() => { setAccountHubOpen(false); openCredits(); }}>
                <WalletIcon size={18} />
                <span>QX Credit</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openConnections("following"); }}>
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
