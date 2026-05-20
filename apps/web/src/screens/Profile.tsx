import { type ReactNode, useEffect, useMemo, useState } from "react";
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
  const [menu, setMenu] = useState<"shop" | "offers" | "settings" | "saved" | "credits" | "shipping">("shop");
  const [productTab, setProductTab] = useState<"have" | "want">("have");

  useEffect(() => setProfile(viewedUser || user), [viewedUser, user]);
  useEffect(() => {
    setMenu("shop");
    setFile(null);
    setMenuOpen(false);
    setAvatarBroken(false);
    setSaveError("");
  }, [viewedUser?.id]);

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
      const data = await api<{ profile: User }>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ ...profile, avatar_url })
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
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  const mine = items.filter((item: Item) => item.owner.id === profile?.id);
  const level = profileLevel(profile);
  const savedItems = items.filter((item) => item.viewer.is_bookmarked);
  const profileIntro =
    profile?.bio?.trim() ||
    (isOwn
      ? "อัปเดตรูปโปรไฟล์ จัดการข้อมูลร้าน และติดตามความเคลื่อนไหวของบัญชีจากหน้านี้"
      : "ยังไม่มีคำแนะนำตัวในบัญชีนี้");
  const listingCount = mine.length || Number(profile?.listing_count || 0);
  const ratingValue = Number(profile?.rating || 0).toFixed(1);
  const hasPendingAvatar = Boolean(file);
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

  return (
    <section className="screen profile-screen">
      <div className="profile-header-card">
        <div className="profile-header-row">
          <div className="profile-hero-kicker">{isOwn ? "โปรไฟล์ของฉัน" : "หน้าร้านผู้ใช้งาน"}</div>
          {isOwn ? (
            <button
              type="button"
              className="profile-menu-trigger"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? "ปิดเมนูโปรไฟล์" : "เปิดเมนูโปรไฟล์"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          ) : null}
        </div>

        <div className="profile-identity-row">
          <div className="profile-avatar-stack compact">
            <div className="profile-avatar-frame profile-avatar-frame-plain">
              <img src={resolvedAvatarSrc} alt={profileName} onError={() => setAvatarBroken(true)} />
              {isOwn ? (
                <label className="profile-avatar-fab" aria-label="เปลี่ยนรูปโปรไฟล์">
                  <Camera size={16} />
                  <input
                    aria-label="เปลี่ยนรูปโปรไฟล์"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
              ) : null}
            </div>
            {isOwn ? (
              <div className="profile-avatar-help">
                {hasPendingAvatar ? `เลือกรูปใหม่แล้ว: ${file?.name}` : "แตะไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์"}
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
              <span>กดบันทึกเพื่ออัปเดตรูปในบัญชีทันที</span>
            </div>
            <div className="profile-pending-actions">
              <button className="primary" onClick={save} disabled={saving}>
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
          <div className="profile-hamburger-menu" role="menu" aria-label="เมนูโปรไฟล์">
            <div className="profile-hamburger-group">
              <span>หน้าภายในโปรไฟล์</span>
              <button type="button" role="menuitem" onClick={() => selectMenu("shop")}>
                <Store size={16} /> ร้านของฉัน
              </button>
              <button type="button" role="menuitem" onClick={() => selectMenu("saved")}>
                <BookmarkCheck size={16} /> บันทึกไว้
              </button>
              <button type="button" role="menuitem" onClick={() => selectMenu("settings")}>
                <Edit3 size={16} /> แก้ไขโปรไฟล์
              </button>
            </div>
            <div className="profile-hamburger-group">
              <span>ทางลัด</span>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openInbox("offers"); }}>
                <Sparkles size={16} /> ข้อเสนอ
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openWallet(); }}>
                <WalletCards size={16} /> กระเป๋าเครดิต
              </button>
              <button type="button" role="menuitem" onClick={signOut} disabled={signingOut}>
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
          <small>{isOwn ? "สินค้าที่เปิดอยู่ในร้านตอนนี้" : "รายการที่เปิดให้ดูได้ตอนนี้"}</small>
        </div>
        <div className="profile-summary-card">
          <span>คะแนนความน่าเชื่อถือ</span>
          <b>{ratingValue}</b>
          <small>อัปเดตจากกิจกรรมการใช้งานในระบบ</small>
        </div>
        <div className={`profile-summary-card ${level.key}`}>
          <span>ระดับบัญชี</span>
          <b>{level.label}</b>
          <small>{level.note}</small>
        </div>
      </div>

      {menu === "shop" ? (
        <>
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
          </div>

          <ProfileShop
            items={mine}
            productTab={productTab}
            setProductTab={setProductTab}
            openItem={openItem}
            isOwn={isOwn}
          />
        </>
      ) : null}

      {menu === "settings" && isOwn ? (
        <div className="profile-settings-shell">
          <div className="panel profile-settings-card">
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
              <button className="primary" onClick={save} disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
            {saveError ? <p className="err">{saveError}</p> : null}
          </div>

          <div className="profile-settings-side">
            <div className="panel profile-wallet-redirect">
              <div className="section-head compact">
                <h2>กระเป๋าเครดิต</h2>
              </div>
              <p>เปิดหน้ากระเป๋าเพื่อเติมเครดิตและดูรายการเคลื่อนไหวล่าสุด</p>
              <button className="primary" onClick={openWallet}>
                <WalletCards size={16} /> เปิดกระเป๋าเครดิต
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {menu === "saved" && isOwn ? (
        <div className="shop-grid">
          {savedItems.length ? (
            savedItems.map((item) => <ProfileProductCard key={item.id} item={item} openItem={openItem} />)
          ) : (
            <div className="empty">ยังไม่มีรายการที่บันทึกไว้</div>
          )}
        </div>
      ) : null}

      {menu === "shipping" ? (
        <div className="panel">
          <div className="section-head compact">
            <h2>การจัดส่งและนัดรับ</h2>
          </div>
          <p>จัดการข้อมูลนัดรับ สถานะจัดส่ง และหลักฐานการรับส่งสินค้าได้จากหน้าดีลเมื่อมีการยืนยันข้อเสนอแล้ว</p>
          {isOwn ? (
            <button className="secondary" onClick={() => openInbox("offers")}>
              เปิดหน้าข้อเสนอ
            </button>
          ) : null}
        </div>
      ) : null}

      {menu === "credits" && isOwn ? (
        <div className="panel profile-wallet-redirect">
          <div className="section-head compact">
            <h2>กระเป๋าเครดิต</h2>
          </div>
          <p>เปิดหน้ากระเป๋าเพื่อเติมเครดิตและดูรายการเคลื่อนไหวล่าสุด</p>
          <button className="primary" onClick={openWallet}>
            <WalletCards size={16} /> เปิดกระเป๋าเครดิต
          </button>
        </div>
      ) : null}
    </section>
  );
}
