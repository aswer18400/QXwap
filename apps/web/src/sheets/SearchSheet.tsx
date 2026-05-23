import { useEffect, useState } from "react";
import { HashtagMetaIcon, SearchNavIcon } from "../components/AppIcons";
import { api, asset } from "../lib/api";
import type { HashtagStat, User } from "../lib/types";
import { PageHeader } from "../components/PageHeader";

export function SearchSheet({
  onBack,
  openProfile,
  searchProducts,
  searchHashtag
}: {
  onBack: () => void;
  openProfile: (p: User) => void;
  searchProducts: (q: string) => void;
  searchHashtag: (tag: string) => void;
}) {
  const [mode, setMode] = useState<"products" | "profiles">("products");
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<User[]>([]);
  const [hashtags, setHashtags] = useState<HashtagStat[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [hasSearchedProfiles, setHasSearchedProfiles] = useState(false);
  const trimmedQuery = query.trim();

  useEffect(() => {
    setLoadingTags(true);
    api<{ hashtags: HashtagStat[] }>("/hashtags/trending?limit=10")
      .then((data) => setHashtags(data.hashtags))
      .catch(() => setHashtags([]))
      .finally(() => setLoadingTags(false));
  }, []);

  useEffect(() => {
    if (mode !== "profiles") return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProfiles([]);
      setHasSearchedProfiles(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoadingProfiles(true);
      api<{ profiles: User[] }>(`/profiles?q=${encodeURIComponent(trimmed)}`)
        .then((data) => {
          setProfiles(data.profiles);
          setHasSearchedProfiles(true);
        })
        .catch(() => {
          setProfiles([]);
          setHasSearchedProfiles(true);
        })
        .finally(() => setLoadingProfiles(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [mode, query]);

  return (
    <section className="screen search-page">
      <PageHeader title="ค้นหา" onBack={onBack} />
      <div className="search-page-body">
        <div className="panel search-hero-panel">
          <div>
            <span className="section-kicker">ค้นหาได้จากหน้าเดียว</span>
            <h1>{mode === "products" ? "หาของให้เจอเร็วขึ้น" : "หาโปรไฟล์ที่อยากติดตาม"}</h1>
            <p>{mode === "products" ? "ค้นจากสินค้า พื้นที่ หรือแท็กได้ใน flow เดียว" : "ค้นหาร้าน ชื่อเล่น หรือบัญชีที่คุณเคยคุยไว้"}</p>
          </div>
          <div className="search-hero-stats">
            <span><b>{mode === "products" ? hashtags.length : profiles.length}</b> {mode === "products" ? "แท็กเด่น" : "ผลลัพธ์"}</span>
          </div>
        </div>
        <div className="segmented" role="tablist" aria-label="ประเภทการค้นหา">
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
            โปรไฟล์
          </button>
        </div>
        <label className="searchbox">
          <SearchNavIcon size={18} />
          <input
            aria-label={mode === "products" ? "ค้นหาสินค้า" : "ค้นหาโปรไฟล์"}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "products" ? "ชื่อสินค้า พื้นที่ หรือ #hashtag" : "ชื่อร้าน หรือชื่อผู้ใช้"}
          />
        </label>

        {mode === "products" ? (
          <div className="search-sheet-body" id="search-panel-products" role="tabpanel" aria-labelledby="search-tab-products">
            <button type="button" className="primary wide" disabled={!trimmedQuery} onClick={() => searchProducts(trimmedQuery)}>
              ค้นหาในช็อป
            </button>
            {!trimmedQuery ? <div className="inline-help">พิมพ์คำค้นก่อนเริ่มค้นหา</div> : null}
            <div className="panel search-hashtag-panel">
              <div className="section-head compact">
                <h3>Hashtag ยอดนิยมวันนี้</h3>
              </div>
              {loadingTags ? <div className="empty">กำลังโหลด Hashtag...</div> : null}
              {!loadingTags && hashtags.length ? (
                <div className="tags large hashtag-grid">
                  {hashtags.map((tag) => (
                    <button key={tag.tag} type="button" onClick={() => searchHashtag(tag.tag)}>
                      <HashtagMetaIcon size={14} /> {tag.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {!loadingTags && !hashtags.length ? <div className="empty">ยังไม่มี Hashtag ยอดนิยมสำหรับวันนี้</div> : null}
            </div>
          </div>
        ) : (
          <div className="profile-results" id="search-panel-profiles" role="tabpanel" aria-labelledby="search-tab-profiles">
            {!query.trim() ? <div className="empty">พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหาโปรไฟล์</div> : null}
            {loadingProfiles ? <div className="empty">กำลังค้นหาโปรไฟล์...</div> : null}
            {!loadingProfiles &&
              profiles.map((p) => (
                <button key={p.id} className="profile-result" onClick={() => openProfile(p)}>
                  <img src={asset(p.avatar_url)} alt={p.display_name || p.username || "โปรไฟล์"} />
                  <span>
                    <b>{p.display_name || p.username}</b>
                    <small>{p.city || "QXwap"} · {p.listing_count || 0} รายการ</small>
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
