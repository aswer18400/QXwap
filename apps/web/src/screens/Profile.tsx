import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, BookmarkCheck, Camera, ChevronRight, Edit3, LogOut, MapPin, Menu, Save, Sparkles, Store, UserRound, WalletCards, X } from "lucide-react";
import { api, asset } from "../lib/api";
import { profileLevel } from "../lib/format";
import type { InboxTab, Item, RequireLogin, User } from "../lib/types";
import { useDialogA11y } from "../lib/useDialogA11y";
import { LoginCTA } from "../components/LoginCTA";
import { ProfileProductCard } from "../components/ProfileProductCard";
import { ProfileSkeleton } from "../components/Skeletons";
import { ProfileShop } from "./ProfileShop";

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
  openWallet
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
  openWallet: () => void;
}) {
  const isOwn = !viewedUser || viewedUser.id === user?.id;
  const [profile, setProfile] = useState<User | null>(viewedUser || user);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accountHubOpen, setAccountHubOpen] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarSavedNotice, setAvatarSavedNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [dataError, setDataError] = useState("");
  const [menu, setMenu] = useState<"shop" | "settings" | "saved">("shop");
  const [productTab, setProductTab] = useState<"have" | "want">("have");
  const [listingItems, setListingItems] = useState<Item[]>([]);
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
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
    setMenu("shop");
    setFile(null);
    setAccountHubOpen(false);
    setAvatarSheetOpen(false);
    setAvatarBroken(false);
    setSaveError("");
    setAvatarError("");
    setAvatarSavedNotice("");
    setDataError("");
  }, [viewedUser?.id]);

  useEffect(() => {
    let live = true;
    if (!profile?.id) return;
    setItemsLoading(true);
    setDataError("");
    const tasks: Promise<void>[] = [
      api<{ items: Item[] }>(`/items?owner_id=${encodeURIComponent(profile.id)}&limit=40`)
        .then((data) => {
          if (live) setListingItems(data.items);
        })
        .catch((error: any) => {
          if (live) setDataError(error.message || "โหลดรายการในโปรไฟล์ไม่สำเร็จ");
        })
    ];
    if (isOwn) {
      tasks.push(
        api<{ items: Item[] }>("/bookmarks?limit=40")
          .then((data) => {
            if (live) setSavedItems(data.items);
          })
          .catch((error: any) => {
            if (live) setDataError(error.message || "โหลดรายการที่บันทึกไว้ไม่สำเร็จ");
          })
      );
    } else {
      setSavedItems([]);
    }
    void Promise.all(tasks).finally(() => {
      if (live) setItemsLoading(false);
    });
    return () => {
      live = false;
    };
  }, [profile?.id, isOwn, refreshKey]);

  useEffect(() => {
    if (!avatarSavedNotice) return;
    const timer = window.setTimeout(() => setAvatarSavedNotice(""), 3200);
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
  const avatarPreviewSrc = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return avatarSrc;
  }, [avatarSrc, file]);

  useEffect(() => {
    if (!file || !avatarPreviewSrc.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(avatarPreviewSrc);
  }, [avatarPreviewSrc, file]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarSrc, avatarPreviewSrc]);

  if (!user && !viewedUser) return <LoginCTA requireLogin={requireLogin} title="บัญชีผู้ใช้" />;
  if (!profile) {
    return (
      <section className="screen profile-screen">
        <ProfileSkeleton />
      </section>
    );
  }

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      let avatar_url = profile?.avatar_url;
      if (file) {
        const fd = new FormData();
        fd.append("images", file);
        avatar_url = (await api<{ urls: string[] }>("/upload", { method: "POST", body: fd })).urls[0];
      }
      const payload = {
        display_name: profile?.display_name || "",
        username: profile?.username || "",
        city: profile?.city || "",
        bio: profile?.bio || "",
        avatar_url
      };
      const data = await api<{ profile: User }>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setFile(null);
      setProfile(data.profile);
      setAvatarBroken(false);
      setMenu("shop");
      onAuth(data.profile);
      onReload();
    } catch (error: any) {
      setSaveError(error.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
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
    if (!avatarSaving) setFile(null);
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
      setAvatarSavedNotice("บันทึกรูปโปรไฟล์เรียบร้อยแล้ว");
      onAuth(data.profile);
      onReload();
    } catch (error: any) {
      setAvatarError(error.message || "บันทึกรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setAvatarSaving(false);
    }
  }

  const mine = listingItems;
  const level = profileLevel(profile);
  const profileIntro =
    profile?.bio?.trim() ||
    (isOwn
      ? "อัปเดตรูปโปรไฟล์ จัดการข้อมูลร้าน และติดตามความเคลื่อนไหวของบัญชีจากหน้านี้"
      : "ยังไม่มีคำแนะนำตัวในบัญชีนี้");
  const listingCount = mine.length || Number(profile?.listing_count || 0);
  const ratingValue = Number(profile?.rating || 0).toFixed(1);
  const hasPendingAvatar = Boolean(file);
  const hasProfileBio = Boolean(profile?.bio?.trim());
  const profileDetails = [
    profile?.city ? { icon: <MapPin size={18} />, label: "พื้นที่ใช้งาน", value: profile.city } : null,
    profile?.username ? { icon: <UserRound size={18} />, label: "ชื่อผู้ใช้", value: `@${profile.username}` } : null,
    { icon: <Store size={18} />, label: "รายการที่เปิดอยู่", value: `${listingCount} รายการ` },
    { icon: <BadgeCheck size={18} />, label: "ระดับบัญชี", value: `${level.label} · ${level.title}` }
  ].filter(Boolean) as Array<{ icon: ReactNode; label: string; value: string }>;
  const resolvedAvatarSrc = avatarBroken ? fallbackAvatar : avatarSrc;

  function selectMenu(nextMenu: typeof menu) {
    setMenu(nextMenu);
    setAccountHubOpen(false);
  }

  function pickAvatar() {
    setAvatarError("");
    setAvatarSheetOpen(true);
  }

  function openAvatarFileDialog() {
    avatarInputRef.current?.click();
  }

  return (
    <section className="screen profile-screen">
      <div className="profile-header-card">
        <div className="profile-header-row">
          <div className="profile-hero-kicker">{isOwn ? "โปรไฟล์ของฉัน" : "หน้าร้านผู้ใช้งาน"}</div>
          {isOwn ? (
            <button
              type="button"
              className="profile-menu-trigger"
              onClick={() => setAccountHubOpen(true)}
              aria-label="เปิดเมนูบัญชี"
              aria-expanded={accountHubOpen}
              aria-controls="profile-actions-panel"
            >
              <Menu size={18} />
            </button>
          ) : null}
        </div>

        <div className="profile-identity-row">
          <div className="profile-avatar-stack compact">
            <div className="profile-avatar-frame profile-avatar-frame-plain">
              <img src={resolvedAvatarSrc} alt={profileName} onError={() => setAvatarBroken(true)} />
              <input
                ref={avatarInputRef}
                className="profile-avatar-input"
                aria-label="เลือกไฟล์รูปโปรไฟล์"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setAvatarError("");
                  setFile(event.target.files?.[0] || null);
                  event.currentTarget.value = "";
                }}
              />
              {isOwn ? (
                <button type="button" className="profile-avatar-fab" aria-label="เปลี่ยนรูปโปรไฟล์" onClick={pickAvatar}>
                  <Camera size={16} />
                </button>
              ) : null}
            </div>
            {isOwn ? (
              <div className="profile-avatar-help">
                แตะไอคอนกล้องเพื่อเปิดหน้าต่างเปลี่ยนรูปโปรไฟล์
              </div>
            ) : null}
          </div>

          <div className="profile-hero-copy">
            <h1>{profileName}</h1>
            <p>{profileIntro}</p>
            <div className="profile-meta-row">
              {profile?.username ? <span>@{profile.username}</span> : null}
              {listingCount ? <span>{listingCount} รายการ</span> : null}
              {profile?.city ? <span>{profile.city}</span> : null}
              {profile?.is_fast_responder ? <span>ตอบไว</span> : null}
            </div>
            {user ? (
              <div className={`level-card ${level.key}`}>
                <span>{level.label}</span>
                <b>{level.title}</b>
                <small>{level.note}</small>
              </div>
            ) : null}
          </div>
        </div>

        {avatarSavedNotice ? <p className="profile-status-ok" role="status">{avatarSavedNotice}</p> : null}
        {saveError ? <p className="err" role="alert">{saveError}</p> : null}
      </div>

      <div className="profile-summary-grid" aria-label="สรุปข้อมูลโปรไฟล์">
        <div className="profile-summary-card">
          <span>รายการที่ลง</span>
          <b>{listingCount}</b>
        </div>
        <div className="profile-summary-card">
          <span>คะแนนความน่าเชื่อถือ</span>
          <b>{ratingValue}</b>
        </div>
        <div className={`profile-summary-card ${level.key}`}>
          <span>ระดับบัญชี</span>
          <b>{level.label}</b>
        </div>
      </div>

      {menu === "shop" ? (
        <>
          {dataError ? <p className="err" role="alert">{dataError}</p> : null}
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
              <div className="empty">ยังไม่มีรายละเอียดเพิ่มเติมในโปรไฟล์นี้</div>
            )}
            {hasProfileBio ? (
              <div className="profile-bio-block">
                <small>แนะนำตัว</small>
                <p>{profile.bio}</p>
              </div>
            ) : null}
          </div>

          {itemsLoading ? (
            <div className="empty">กำลังโหลดรายการในโปรไฟล์...</div>
          ) : (
            <ProfileShop
              items={mine}
              productTab={productTab}
              setProductTab={setProductTab}
              openItem={openItem}
              isOwn={isOwn}
            />
          )}
        </>
      ) : null}

      {menu === "settings" && isOwn ? (
        <div className="profile-settings-shell">
          <form
            className="panel profile-settings-card form"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="section-head compact">
              <button type="button" className="ghost profile-inline-back" onClick={() => setMenu("shop")}>
                <ArrowLeft size={15} /> กลับไปหน้าร้าน
              </button>
              <h2>ข้อมูลร้านและบัญชี</h2>
            </div>
            <div className="profile-settings-grid">
              <label>
                ชื่อที่แสดง
                <input
                  aria-label="ชื่อที่แสดง"
                  placeholder="ชื่อร้านหรือชื่อที่ใช้ในระบบ"
                  value={profile?.display_name || ""}
                  onChange={(event) => setProfile({ ...profile!, display_name: event.target.value })}
                />
              </label>
              <label>
                ชื่อผู้ใช้
                <input
                  aria-label="ชื่อผู้ใช้"
                  placeholder="username สำหรับให้คนอื่นค้นหา"
                  value={profile?.username || ""}
                  onChange={(event) => setProfile({ ...profile!, username: event.target.value })}
                />
              </label>
              <label>
                เมืองหรือจุดนัดรับ
                <input
                  aria-label="เมืองหรือจุดนัดรับ"
                  placeholder="เช่น ลาดพร้าว, พัทยาเหนือ"
                  value={profile?.city || ""}
                  onChange={(event) => setProfile({ ...profile!, city: event.target.value })}
                />
              </label>
              <label className="profile-field-wide">
                แนะนำตัว
                <textarea
                  aria-label="แนะนำตัว"
                  placeholder="บอกสั้น ๆ ว่าคุณชอบแลกของแนวไหน หรือนัดรับสะดวกแบบใด"
                  value={profile?.bio || ""}
                  onChange={(event) => setProfile({ ...profile!, bio: event.target.value })}
                />
              </label>
            </div>
            <div className="profile-settings-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
            {saveError ? <p className="err">{saveError}</p> : null}
          </form>
        </div>
      ) : null}

      {menu === "saved" && isOwn ? (
        <div className="shop-grid">
          <div className="section-head compact profile-subpage-head">
            <button type="button" className="ghost profile-inline-back" onClick={() => setMenu("shop")}>
              <ArrowLeft size={15} /> กลับไปหน้าร้าน
            </button>
            <h2>บันทึกไว้</h2>
          </div>
          {dataError ? <p className="err" role="alert">{dataError}</p> : null}
          {itemsLoading ? (
            <div className="empty">กำลังโหลดรายการที่บันทึกไว้...</div>
          ) : savedItems.length ? (
            savedItems.map((item) => <ProfileProductCard key={item.id} item={item} openItem={openItem} />)
          ) : (
            <div className="empty">ยังไม่มีรายการที่บันทึกไว้</div>
          )}
        </div>
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
              <h2 id="profile-account-title">เมนูบัญชี</h2>
              <button type="button" onClick={() => setAccountHubOpen(false)} aria-label="ปิดเมนูบัญชี">
                <X />
              </button>
            </div>
            <div className="profile-account-summary">
              <img src={resolvedAvatarSrc} alt={profileName} />
              <div>
                <b>{profileName}</b>
                <span>{profile?.username ? `@${profile.username}` : "บัญชี QXwap"}</span>
                {profile?.city ? <small>{profile.city}</small> : null}
              </div>
            </div>
            <div className="profile-account-list">
              <button type="button" onClick={() => selectMenu("shop")}>
                <Store size={18} />
                <span>ร้านของฉัน</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => selectMenu("saved")}>
                <BookmarkCheck size={18} />
                <span>บันทึกไว้</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => selectMenu("settings")}>
                <Edit3 size={18} />
                <span>แก้ไขโปรไฟล์</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openInbox("offers"); }}>
                <Sparkles size={18} />
                <span>ข้อเสนอ</span>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => { setAccountHubOpen(false); openWallet(); }}>
                <WalletCards size={18} />
                <span>กระเป๋าเครดิต</span>
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
          <section
            ref={avatarSheetRef}
            className="sheet profile-avatar-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-sheet-title"
            tabIndex={-1}
          >
            <div className="sheet-head">
              <h2 id="avatar-sheet-title">เปลี่ยนรูปโปรไฟล์</h2>
              <button type="button" onClick={closeAvatarSheet} aria-label="ปิดหน้าต่างเปลี่ยนรูปโปรไฟล์">
                <X />
              </button>
            </div>
            <p className="profile-avatar-sheet-copy">เลือกรูปใหม่ แล้วกดบันทึกเพื่ออัปเดตรูปในบัญชีทันที</p>
            <div className="profile-avatar-sheet-preview">
              <img src={file ? avatarPreviewSrc : resolvedAvatarSrc} alt={profileName} onError={() => setAvatarBroken(true)} />
              <div>
                <b>{hasPendingAvatar ? "พร้อมอัปเดตรูปใหม่" : "รูปโปรไฟล์ปัจจุบัน"}</b>
                <span>{hasPendingAvatar ? file?.name || "ไฟล์ที่เลือก" : "ยังไม่ได้เลือกรูปใหม่"}</span>
              </div>
            </div>
            <button type="button" className="secondary wide profile-avatar-sheet-trigger" onClick={openAvatarFileDialog}>
              <Camera size={18} />
              {hasPendingAvatar ? "เลือกรูปอื่น" : "เลือกรูปจากเครื่อง"}
            </button>
            {avatarError ? <p className="err" role="alert">{avatarError}</p> : null}
            <div className="sheet-actions profile-avatar-sheet-actions">
              <button type="button" className="secondary" onClick={closeAvatarSheet} disabled={avatarSaving}>
                ยกเลิก
              </button>
              <button type="button" className="primary" onClick={() => void saveAvatar()} disabled={!hasPendingAvatar || avatarSaving}>
                <Save size={16} /> {avatarSaving ? "กำลังบันทึกรูป..." : "บันทึกรูปโปรไฟล์"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
