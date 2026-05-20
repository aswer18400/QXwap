import { useEffect, useMemo, useState } from "react";
import { Camera, LogOut, WalletCards } from "lucide-react";
import { api, asset } from "../lib/api";
import { profileMenus, publicProfileMenus } from "../design-system";
import { profileLevel } from "../lib/format";
import type { InboxTab, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { ProfileProductCard } from "../components/ProfileProductCard";
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
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [menu, setMenu] = useState<"shop" | "offers" | "settings" | "saved" | "credits" | "shipping">("shop");
  const [productTab, setProductTab] = useState<"have" | "want">("have");

  useEffect(() => setProfile(viewedUser || user), [viewedUser, user]);
  useEffect(() => {
    setMenu("shop");
    setFile(null);
  }, [viewedUser?.id]);

  const avatarSrc = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return asset(profile?.avatar_url) || "";
  }, [file, profile?.avatar_url]);

  useEffect(() => {
    if (!file || !avatarSrc.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(avatarSrc);
  }, [avatarSrc, file]);

  if (!user && !viewedUser) return <LoginCTA requireLogin={requireLogin} title="บัญชีผู้ใช้" />;

  async function save() {
    setSaving(true);
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
      onAuth(data.profile);
      onReload();
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

  async function deleteAccount() {
    const first = window.confirm("ลบบัญชีนี้ถาวร? รายการสินค้า รูปโปรไฟล์ และประวัติที่เกี่ยวข้องจะถูกลบทั้งหมด");
    if (!first) return;
    const second = window.confirm("ยืนยันอีกครั้งว่าต้องการลบบัญชีนี้แบบถาวร");
    if (!second) return;
    setDeletingAccount(true);
    try {
      await api("/auth/account", { method: "DELETE" });
      await onAccountDeleted();
    } finally {
      setDeletingAccount(false);
    }
  }

  const mine = items.filter((item: Item) => item.owner.id === profile?.id);
  const level = profileLevel(profile);
  const menuItems = isOwn ? profileMenus : publicProfileMenus;
  const savedItems = items.filter((item) => item.viewer.is_bookmarked);
  const profileName = profile?.display_name || profile?.username || (isOwn ? "บัญชีของฉัน" : "ผู้ใช้งาน QXwap");
  const profileIntro =
    profile?.bio?.trim() ||
    (isOwn
      ? "อัปเดตรูปโปรไฟล์ จัดการข้อมูลร้าน และติดตามความเคลื่อนไหวของบัญชีจากหน้านี้"
      : "ยังไม่มีคำแนะนำตัวในบัญชีนี้");
  const listingCount = mine.length || Number(profile?.listing_count || 0);

  return (
    <section className="screen profile-screen">
      <div className="profile-hero-card">
        <div className="profile-avatar-stack">
          <img src={avatarSrc || asset(profile?.avatar_url)} alt={profileName} />
          {isOwn ? (
            <label className="profile-avatar-action">
              <Camera size={16} />
              เปลี่ยนรูป
              <input
                aria-label="เปลี่ยนรูปโปรไฟล์"
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
          ) : null}
        </div>

        <div className="profile-hero-copy">
          <div className="profile-hero-kicker">{isOwn ? "บัญชีของฉัน" : "หน้าร้านผู้ใช้งาน"}</div>
          <h1>{profileName}</h1>
          <p>{profileIntro}</p>
          <div className="profile-meta-row">
            {profile?.username ? <span>@{profile.username}</span> : null}
            {listingCount ? <span>{listingCount} รายการ</span> : null}
            {profile?.city ? <span>{profile.city}</span> : null}
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

      <div className="profile-menu" role="tablist" aria-label="เมนูโปรไฟล์">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={menu === item.id ? "on" : ""}
            role="tab"
            aria-selected={menu === item.id}
            onClick={() => {
              if (item.id === "offers") return openInbox("offers");
              if (item.id === "credits") return openWallet();
              setMenu(item.id as typeof menu);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {menu === "shop" ? (
        <ProfileShop
          items={mine}
          productTab={productTab}
          setProductTab={setProductTab}
          openItem={openItem}
          isOwn={isOwn}
        />
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
              <button className="secondary" onClick={signOut} disabled={signingOut || saving}>
                <LogOut size={16} /> {signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
              </button>
            </div>
          </div>

          <div className="panel profile-danger-zone">
            <div className="section-head compact">
              <h2>โซนอันตราย</h2>
            </div>
            <p>ใช้เมื่อคุณต้องการลบบัญชีนี้พร้อมข้อมูลที่เชื่อมโยงทั้งหมด</p>
            <button className="danger wide" onClick={deleteAccount} disabled={deletingAccount}>
              {deletingAccount ? "กำลังลบบัญชี..." : "ลบบัญชีถาวร"}
            </button>
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
