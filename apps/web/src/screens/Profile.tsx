import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Camera, ChevronRight, Edit3, LogOut, MapPin, Menu, Repeat2, Store, X } from "lucide-react";
import { api, asset } from "../lib/api";
import type { InboxTab, Item, RequireLogin, User } from "../lib/types";
import { useDialogA11y } from "../lib/useDialogA11y";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { ProfileShop } from "./ProfileShop";
import { ProfileSkeleton } from "../components/Skeletons";

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
  openSaved,
  openProfileEdit,
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
  openInbox: (tab?: InboxTab) => void;
  openSaved: () => void;
  openProfileEdit: () => void;
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
  const [signingOut, setSigningOut] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
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
    api<{ items: Item[] }>(`/items?owner_id=${encodeURIComponent(profile.id)}&limit=40`)
      .then((data) => live && setListingItems(data.items))
      .catch((error: any) => live && setDataError(error.message || "โหลดรายการในโปรไฟล์ไม่สำเร็จ"))
      .finally(() => live && setItemsLoading(false));
    return () => {
      live = false;
    };
  }, [profile?.id, refreshKey]);

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

  if (!user && !viewedUser) return <LoginCTA requireLogin={requireLogin} title="โปรไฟล์" />;
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
    try {
      const fd = new FormData();
      fd.append("images", file);
      const avatar_url = (await api<{ urls: string[] }>("/upload", { method: "POST", body: fd })).urls[0];
      const data = await api<{ profile: User }>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ avatar_url })
      });
      setFile(null);
      setAvatarBroken(false);
      setProfile((current) => (current ? { ...current, avatar_url: data.profile.avatar_url } : data.profile));
      setAvatarSheetOpen(false);
      setAvatarSavedNotice("บันทึกรูปโปรไฟล์แล้ว");
      onAuth(data.profile);
      onReload();
    } catch (error: any) {
      setAvatarError(error.message || "บันทึกรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      setAccountHubOpen(false);
      await onSignOut();
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

  const listingCount = listingItems.length || Number(profile?.listing_count || 0);
  const profileDetails = [
    profile?.city ? { icon: <MapPin size={18} />, label: "พื้นที่ใช้งาน", value: profile.city } : null,
    profile?.username ? { icon: <Store size={18} />, label: "ชื่อผู้ใช้", value: `@${profile.username}` } : null,
    { icon: <Repeat2 size={18} />, label: "คะแนน", value: Number(profile?.rating || 0).toFixed(1) }
  ].filter(Boolean) as Array<{ icon: ReactNode; label: string; value: string }>;

  return (
    <section className="screen profile-screen">
      {!isOwn && onBack ? <PageHeader title="โปรไฟล์" onBack={onBack} /> : null}
      <div className="profile-header-card compact">
        <div className="profile-header-row">
          <div className="profile-hero-kicker">{isOwn ? "บัญชีของฉัน" : "โปรไฟล์ผู้ใช้งาน"}</div>
          {isOwn ? (
            <button type="button" className="profile-menu-trigger" onClick={() => setAccountHubOpen(true)} aria-label="เปิดเมนูบัญชี">
              <Menu size={18} />
            </button>
          ) : null}
        </div>
        <div className="profile-identity-row compact">
          <div className="profile-avatar-frame profile-avatar-frame-plain">
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
                  <Camera size={16} />
                </button>
              </>
            ) : null}
          </div>
          <div className="profile-hero-copy">
            <h1>{profileName}</h1>
            <div className="profile-meta-row">
              {profile?.username ? <span>@{profile.username}</span> : null}
              {profile?.city ? <span>{profile.city}</span> : null}
              <span>{listingCount} รายการ</span>
            </div>
            {profile?.bio ? <p className="profile-bio-text">{profile.bio}</p> : null}
          </div>
        </div>
        {avatarSavedNotice ? <p className="profile-status-ok">{avatarSavedNotice}</p> : null}
      </div>

      <div className="profile-summary-grid compact" aria-label="สรุปข้อมูลโปรไฟล์">
        <div className="profile-summary-card">
          <span>สินค้าในร้าน</span>
          <b>{listingCount}</b>
        </div>
      </div>

      <div className="panel profile-about-card">
        <div className="section-head compact">
          <h2>รายละเอียดส่วนตัว</h2>
        </div>
        {profileDetails.length ? (
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
        ) : (
          <div className="empty">ยังไม่มีรายละเอียดเพิ่มเติม</div>
        )}
      </div>

      {dataError ? <p className="err">{dataError}</p> : null}
      {itemsLoading ? <div className="empty">กำลังโหลดรายการในโปรไฟล์...</div> : <ProfileShop items={listingItems} openItem={openItem} isOwn={isOwn} />}

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
              <h2 id="profile-account-title">เมนูบัญชี</h2>
              <button type="button" onClick={() => setAccountHubOpen(false)} aria-label="ปิดเมนูบัญชี">
                <X />
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
              <button type="button" onClick={() => setAccountHubOpen(false)}>
                <Store size={18} />
                <span>ร้านของฉัน</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openSaved(); }}>
                <Bookmark size={18} />
                <span>บันทึกไว้</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openProfileEdit(); }}>
                <Edit3 size={18} />
                <span>แก้ไขโปรไฟล์</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openInbox("offers"); }}>
                <Repeat2 size={18} />
                <span>ข้อเสนอ</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" className="danger-row" onClick={signOut} disabled={signingOut}>
                <LogOut size={18} />
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
                <X />
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
              <Camera size={18} /> {file ? "เลือกรูปอื่น" : "เลือกรูปจากเครื่อง"}
            </button>
            {avatarError ? <p className="err">{avatarError}</p> : null}
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
