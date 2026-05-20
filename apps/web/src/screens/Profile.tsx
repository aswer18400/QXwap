import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, BookmarkCheck, Camera, Edit3, LogOut, MapPin, Menu, Save, Sparkles, Store, UserRound, WalletCards, X } from "lucide-react";
import { api, asset } from "../lib/api";
import { profileLevel } from "../lib/format";
import type { InboxTab, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { ProfileProductCard } from "../components/ProfileProductCard";
import { ProfileSkeleton } from "../components/Skeletons";
import { ProfileShop } from "./ProfileShop";

export function Profile({
  user,
  viewedUser,
  requireLogin,
  onAuth,
  onAccountDeleted,
  onSignOut,
  onReload,
  items,
  openItem,
  openInbox,
  openWallet
}: {
  user: User | null;
  viewedUser?: User | null;
  requireLogin: RequireLogin;
  onAuth: (user: User) => void;
  onAccountDeleted: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onReload: () => void;
  items: Item[];
  openItem: (item: Item) => void;
  openInbox: (tab?: InboxTab) => void;
  openWallet: () => void;
}) {
  const isOwn = !viewedUser || viewedUser.id === user?.id;
  const [profile, setProfile] = useState<User | null>(viewedUser || user);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dataError, setDataError] = useState("");
  const [menu, setMenu] = useState<"shop" | "settings" | "saved">("shop");
  const [productTab, setProductTab] = useState<"have" | "want">("have");
  const [listingItems, setListingItems] = useState<Item[]>([]);
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setProfile(viewedUser || user), [viewedUser, user]);
  useEffect(() => {
    setMenu("shop");
    setFile(null);
    setMenuOpen(false);
    setAvatarBroken(false);
    setSaveError("");
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
  }, [profile?.id, isOwn, items]);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

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

  const avatarSrc = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return asset(profile?.avatar_url) || fallbackAvatar;
  }, [fallbackAvatar, file, profile?.avatar_url]);

  useEffect(() => {
    if (!file || !avatarSrc.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(avatarSrc);
  }, [avatarSrc, file]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarSrc]);

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
      setMenuOpen(false);
      await onSignOut();
    } finally {
      setSigningOut(false);
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
    setMenuOpen(false);
  }

  function pickAvatar() {
    avatarInputRef.current?.click();
  }

  return (
    <section className="screen profile-screen">
      <div ref={menuRef} className="profile-header-card">
        <div className="profile-header-row">
          <div className="profile-hero-kicker">{isOwn ? "โปรไฟล์ของฉัน" : "หน้าร้านผู้ใช้งาน"}</div>
          {isOwn ? (
            <button
              type="button"
              className="profile-menu-trigger"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? "ปิดเมนูโปรไฟล์" : "เปิดเมนูโปรไฟล์"}
              aria-expanded={menuOpen}
              aria-controls="profile-actions-panel"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
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
                    setSaveError("");
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
                {hasPendingAvatar ? "เลือกรูปใหม่แล้ว พร้อมบันทึก" : "แตะไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์"}
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

        {isOwn && hasPendingAvatar ? (
          <div className="profile-pending-save">
            <div className="profile-pending-copy">
              <b>พร้อมบันทึกรูปโปรไฟล์ใหม่</b>
              <span>{file?.name || "กดบันทึกเพื่ออัปเดตรูปในบัญชีทันที"}</span>
            </div>
            <div className="profile-pending-actions">
              <button type="button" className="primary" onClick={save} disabled={saving}>
                <Save size={16} /> {saving ? "กำลังบันทึกรูป..." : "บันทึกรูปโปรไฟล์"}
              </button>
              <button type="button" className="secondary" onClick={() => setFile(null)} disabled={saving}>
                <X size={16} /> ยกเลิก
              </button>
            </div>
          </div>
        ) : null}

        {saveError ? <p className="err" role="alert">{saveError}</p> : null}

        {isOwn && menuOpen ? (
          <div id="profile-actions-panel" className="profile-hamburger-menu" aria-label="เมนูโปรไฟล์">
            <div className="profile-hamburger-group">
              <span>หน้าภายในโปรไฟล์</span>
              <button type="button" onClick={() => selectMenu("shop")}>
                <Store size={16} /> ร้านของฉัน
              </button>
              <button type="button" onClick={() => selectMenu("saved")}>
                <BookmarkCheck size={16} /> บันทึกไว้
              </button>
              <button type="button" onClick={() => selectMenu("settings")}>
                <Edit3 size={16} /> แก้ไขโปรไฟล์
              </button>
            </div>
            <div className="profile-hamburger-group">
              <span>ทางลัด</span>
              <button type="button" onClick={() => { setMenuOpen(false); openInbox("offers"); }}>
                <Sparkles size={16} /> ข้อเสนอ
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); openWallet(); }}>
                <WalletCards size={16} /> กระเป๋าเครดิต
              </button>
              <button type="button" onClick={signOut} disabled={signingOut}>
                <LogOut size={16} /> {signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
              </button>
            </div>
          </div>
        ) : null}
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
              {isOwn ? (
                <button type="button" className="ghost profile-section-edit" onClick={() => setMenu("settings")}>
                  <Edit3 size={15} /> แก้ไข
                </button>
              ) : null}
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
    </section>
  );
}
