import { useEffect, useState } from "react";
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
  onReload,
  items,
  openItem,
  openInbox
}: {
  user: User | null;
  viewedUser?: User | null;
  requireLogin: RequireLogin;
  onAuth: (user: User) => void;
  onReload: () => void;
  items: Item[];
  openItem: (item: Item) => void;
  openInbox: (tab?: InboxTab) => void;
}) {
  const isOwn = !viewedUser || viewedUser.id === user?.id;
  const [profile, setProfile] = useState<User | null>(viewedUser || user);
  const [file, setFile] = useState<File | null>(null);
  const [menu, setMenu] = useState<"shop" | "offers" | "settings" | "saved" | "credits" | "shipping">("shop");
  const [productTab, setProductTab] = useState<"have" | "want">("have");

  useEffect(() => setProfile(viewedUser || user), [viewedUser, user]);
  useEffect(() => setMenu("shop"), [viewedUser?.id]);

  if (!user && !viewedUser) return <LoginCTA requireLogin={requireLogin} title="โปรไฟล์" />;

  async function save() {
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
    setProfile(data.profile);
    onAuth(data.profile);
    onReload();
  }

  const mine = items.filter((i: Item) => i.owner.id === profile?.id);
  const level = profileLevel(profile);
  const menuItems = isOwn ? profileMenus : publicProfileMenus;
  const savedItems = items.filter((i) => i.viewer.is_bookmarked);

  return (
    <section className="screen profile-screen">
      <h1>โปรไฟล์</h1>
      <div className="profile-card shop-profile">
        <img src={asset(profile?.avatar_url)} alt={profile?.display_name || profile?.username || "โปรไฟล์"} />
        <div className="shop-profile-head">
          <b>{profile?.display_name || profile?.username}</b>
          <span>{profile?.city || "QXwap"}</span>
          {user ? (
            <div className={`level-card ${level.key}`}>
              <span>{level.label}</span>
              <b>{level.title}</b>
              <small>{level.note}</small>
            </div>
          ) : null}
        </div>
        {!isOwn ? <p>{profile?.bio}</p> : null}
      </div>
      <div className="profile-menu" role="tablist" aria-label="เมนูโปรไฟล์">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={menu === item.id ? "on" : ""}
            role="tab"
            aria-selected={menu === item.id}
            onClick={() =>
              item.id === "offers" ? openInbox("offers") : setMenu(item.id as typeof menu)
            }
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
        <div className="profile-card">
          <input aria-label="อัปโหลดรูปโปรไฟล์" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input
            aria-label="ชื่อที่แสดง"
            placeholder="ชื่อที่แสดง"
            value={profile?.display_name || ""}
            onChange={(e) => setProfile({ ...profile!, display_name: e.target.value })}
          />
          <input
            aria-label="ชื่อผู้ใช้"
            placeholder="ชื่อผู้ใช้"
            value={profile?.username || ""}
            onChange={(e) => setProfile({ ...profile!, username: e.target.value })}
          />
          <input
            aria-label="เมือง"
            placeholder="เมือง"
            value={profile?.city || ""}
            onChange={(e) => setProfile({ ...profile!, city: e.target.value })}
          />
          <textarea
            aria-label="แนะนำตัว"
            placeholder="แนะนำตัวสั้น ๆ"
            value={profile?.bio || ""}
            onChange={(e) => setProfile({ ...profile!, bio: e.target.value })}
          />
          <button className="primary" onClick={save}>
            บันทึกโปรไฟล์
          </button>
        </div>
      ) : null}
      {menu === "saved" && isOwn ? (
        <div className="shop-grid">
          {savedItems.length ? (
            savedItems.map((i) => <ProfileProductCard key={i.id} item={i} openItem={openItem} />)
          ) : (
            <div className="empty">ยังไม่มีรายการที่บันทึกไว้</div>
          )}
        </div>
      ) : null}
      {menu === "credits" && isOwn ? (
        <div className="panel">
          <b>เครดิต</b>
          <p>จัดการเครดิตและการชำระเงิน</p>
        </div>
      ) : null}
      {menu === "shipping" ? (
        <div className="panel">
          <b>การจัดส่ง</b>
          <p>ที่อยู่ นัดรับ และสถานะขนส่งสำหรับ Instant Swap</p>
        </div>
      ) : null}
    </section>
  );
}
