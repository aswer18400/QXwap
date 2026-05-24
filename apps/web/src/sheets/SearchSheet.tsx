import { useEffect, useMemo, useState } from "react";
import {
  FilterToolbarIcon,
  NotificationsNavIcon,
  SearchNavIcon
} from "../components/AppIcons";
import { PageHeader } from "../components/PageHeader";
import { api, asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import type { HashtagStat, Item, User } from "../lib/types";

function formatPrice(item: Item) {
  const price = Number(item.deal.price_cash || 0);
  return price ? `฿${price.toLocaleString("th-TH")}` : "เปิดรับข้อเสนอ";
}

function uniqueOwners(items: Item[]) {
  const seen = new Set<string>();
  return items
    .map((item) => item.owner)
    .filter((owner) => {
      if (!owner?.id || seen.has(owner.id)) return false;
      seen.add(owner.id);
      return true;
    })
    .slice(0, 4);
}

export function SearchSheet({
  onBack,
  openProfile,
  openItemById,
  searchProducts,
  searchHashtag
}: {
  onBack: () => void;
  openProfile: (p: User) => void;
  openItemById: (itemId: string, fallbackItem?: Item | null) => void | Promise<void>;
  searchProducts: (q: string) => void;
  searchHashtag: (tag: string) => void;
}) {
  const [mode, setMode] = useState<"products" | "profiles">("products");
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<User[]>([]);
  const [hashtags, setHashtags] = useState<HashtagStat[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<Item[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [hasSearchedProfiles, setHasSearchedProfiles] = useState(false);
  const trimmedQuery = query.trim();
  const suggestedOwners = useMemo(() => uniqueOwners(suggestedItems), [suggestedItems]);

  useEffect(() => {
    let active = true;
    setLoadingTags(true);
    setLoadingProducts(true);
    Promise.all([
      api<{ hashtags: HashtagStat[] }>("/hashtags/trending?limit=10").catch(() => ({ hashtags: [] })),
      api<{ items: Item[] }>("/items?limit=6&sort=ai").catch(() => ({ items: [] }))
    ])
      .then(([tagData, itemData]) => {
        if (!active) return;
        setHashtags(tagData.hashtags || []);
        setSuggestedItems(itemData.items || []);
      })
      .finally(() => {
        if (!active) return;
        setLoadingTags(false);
        setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "profiles") return;
    if (trimmedQuery.length < 2) {
      setProfiles([]);
      setHasSearchedProfiles(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoadingProfiles(true);
      api<{ profiles: User[] }>(`/profiles?q=${encodeURIComponent(trimmedQuery)}`)
        .then((data) => {
          setProfiles(data.profiles || []);
          setHasSearchedProfiles(true);
        })
        .catch(() => {
          setProfiles([]);
          setHasSearchedProfiles(true);
        })
        .finally(() => setLoadingProfiles(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [mode, trimmedQuery]);

  function submitSearch() {
    if (!trimmedQuery) return;
    if (trimmedQuery.startsWith("#")) {
      searchHashtag(trimmedQuery.replace(/^#+/, ""));
      return;
    }
    searchProducts(trimmedQuery);
  }

  return (
    <section className="screen search-page">
      <PageHeader
        title="ค้นหา"
        subtitle="ค้นหาสินค้า ร้านค้า หรือผู้ใช้งาน"
        onBack={onBack}
        align="left"
        actions={<span className="page-header-icon"><NotificationsNavIcon size={18} /></span>}
      />
      <div className="search-page-body search-page-body--reference">
        <div className="search-shell-card panel">
          <label className="searchbox searchbox--reference">
            <SearchNavIcon size={18} />
            <input
              aria-label={mode === "products" ? "ค้นหาสินค้า" : "ค้นหาโปรไฟล์"}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === "products" ? "ค้นหาอะไรที่ใช่..." : "ค้นหาชื่อผู้ใช้หรือร้านค้า"}
            />
            <button type="button" className="searchbox-trailing" onClick={submitSearch} aria-label="ค้นหา">
              <FilterToolbarIcon size={16} />
            </button>
          </label>
          <div className="segmented segmented--search" role="tablist" aria-label="ประเภทการค้นหา">
            <button
              id="search-tab-products"
              className={mode === "products" ? "on" : ""}
              onClick={() => setMode("products")}
              role="tab"
              aria-selected={mode === "products"}
              aria-controls="search-panel-products"
            >
              สินค้า
            </button>
            <button
              id="search-tab-profiles"
              className={mode === "profiles" ? "on" : ""}
              onClick={() => setMode("profiles")}
              role="tab"
              aria-selected={mode === "profiles"}
              aria-controls="search-panel-profiles"
            >
              ผู้ใช้งาน / ร้านค้า
            </button>
          </div>
        </div>

        {mode === "products" ? (
          <div className="search-sheet-body stack" id="search-panel-products" role="tabpanel" aria-labelledby="search-tab-products">
            {trimmedQuery ? (
              <div className="panel search-submit-card">
                <div>
                  <b>พร้อมค้นหา “{trimmedQuery}”</b>
                  <p>กดเพื่อเปิดผลลัพธ์ในหน้าร้านค้าทันที</p>
                </div>
                <button type="button" className="primary wide" onClick={submitSearch}>
                  ค้นหาในร้านค้า
                </button>
              </div>
            ) : null}

            <div className="panel search-chip-panel">
              <div className="section-head compact">
                <div>
                  <h2>กำลังเป็นที่นิยม</h2>
                </div>
                <button type="button" className="secondary search-inline-link" onClick={() => setQuery("")}>
                  ดูทั้งหมด
                </button>
              </div>
              {loadingTags ? <div className="empty">กำลังโหลดคำค้นยอดนิยม...</div> : null}
              {!loadingTags && hashtags.length ? (
                <div className="hashtag-grid hashtag-grid--soft">
                  {hashtags.map((tag) => (
                    <button key={tag.tag} type="button" onClick={() => searchHashtag(tag.tag)}>
                      #{tag.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="panel search-spotlight-panel">
              <div className="section-head compact">
                <div>
                  <h2>แนะนำสำหรับคุณ</h2>
                </div>
                <button type="button" className="secondary search-inline-link" onClick={() => searchProducts("")}>
                  ดูทั้งหมด
                </button>
              </div>
              {loadingProducts ? <div className="empty">กำลังโหลดสินค้าแนะนำ...</div> : null}
              {!loadingProducts && suggestedItems.length ? (
                <div className="search-spotlight-grid">
                  {suggestedItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="search-spotlight-card"
                      onClick={() => void openItemById(item.id, item)}
                    >
                      <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
                      <span>{item.title}</span>
                      <b>{formatPrice(item)}</b>
                      <small>{item.location.label || "QXwap"}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="panel search-owners-panel">
              <div className="section-head compact">
                <div>
                  <h2>ผู้ใช้งานแนะนำ</h2>
                </div>
                <button type="button" className="secondary search-inline-link" onClick={() => setMode("profiles")}>
                  ดูทั้งหมด
                </button>
              </div>
              <div className="search-owner-row">
                {suggestedOwners.map((owner) => (
                  <button
                    key={owner.id}
                    type="button"
                    className="search-owner-tile"
                    onClick={() => openProfile({ id: owner.id, email: "", display_name: owner.name, avatar_url: owner.avatar_url, rating: owner.rating })}
                  >
                    <img src={asset(owner.avatar_url) || wantedFallbacks.Other} alt={owner.name || "โปรไฟล์"} />
                    <b>{owner.name}</b>
                    <small>{owner.rating.toFixed(1)}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-results list" id="search-panel-profiles" role="tabpanel" aria-labelledby="search-tab-profiles">
            {!trimmedQuery ? (
              <div className="panel search-owner-list-panel">
                <div className="section-head compact">
                  <div>
                    <h2>ร้านและผู้ใช้งานแนะนำ</h2>
                    <p>เริ่มจากรายชื่อที่มีการตอบรับดีลบ่อย</p>
                  </div>
                </div>
                <div className="search-profile-list">
                  {suggestedOwners.map((owner) => (
                    <button
                      key={owner.id}
                      className="profile-result search-profile-row"
                      onClick={() => openProfile({ id: owner.id, email: "", display_name: owner.name, avatar_url: owner.avatar_url, rating: owner.rating })}
                    >
                      <img src={asset(owner.avatar_url) || wantedFallbacks.Other} alt={owner.name || "โปรไฟล์"} />
                      <span>
                        <b>{owner.name}</b>
                        <small>QXwap · {owner.rating.toFixed(1)} ดาว</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {loadingProfiles ? <div className="empty">กำลังค้นหาโปรไฟล์...</div> : null}
            {!loadingProfiles &&
              profiles.map((profile) => (
                <button key={profile.id} className="profile-result search-profile-row" onClick={() => openProfile(profile)}>
                  <img src={asset(profile.avatar_url) || wantedFallbacks.Other} alt={profile.display_name || profile.username || "โปรไฟล์"} />
                  <span>
                    <b>{profile.display_name || profile.username}</b>
                    <small>{profile.city || "QXwap"} · {profile.listing_count || 0} รายการ</small>
                  </span>
                </button>
              ))}
            {!loadingProfiles && !profiles.length && hasSearchedProfiles ? <div className="empty">ไม่พบโปรไฟล์</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}
