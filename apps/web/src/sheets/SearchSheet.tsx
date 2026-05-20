import { useEffect, useState } from "react";
import { Hash, Search, X } from "lucide-react";
import { api, asset } from "../lib/api";
import { useDialogA11y } from "../lib/useDialogA11y";
import type { HashtagStat, User } from "../lib/types";

export function SearchSheet({
  close,
  openProfile,
  searchProducts,
  searchHashtag
}: {
  close: () => void;
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
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);

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
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet search-sheet" role="dialog" aria-modal="true" aria-labelledby="search-title" tabIndex={-1}>
        <div className="sheet-head">
          <h2 id="search-title">ค้นหา</h2>
          <button type="button" onClick={close} aria-label="ปิดการค้นหา">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="segmented" role="tablist" aria-label="ประเภทการค้นหา">
          <button className={mode === "products" ? "on" : ""} onClick={() => setMode("products")} role="tab" aria-selected={mode === "products"}>
            สินค้า
          </button>
          <button className={mode === "profiles" ? "on" : ""} onClick={() => setMode("profiles")} role="tab" aria-selected={mode === "profiles"}>
            โปรไฟล์
          </button>
        </div>
        <label className="searchbox">
          <Search size={18} />
          <input
            aria-label={mode === "products" ? "ค้นหาสินค้า" : "ค้นหาโปรไฟล์"}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "products" ? "ค้นหาสินค้า พื้นที่ หรือ #hashtag" : "ค้นหาร้านค้าหรือชื่อผู้ใช้"}
          />
        </label>

        {mode === "products" ? (
          <div className="search-sheet-body">
            <button type="button" className="primary wide" onClick={() => searchProducts(query)}>
              ค้นหาในช็อป
            </button>
            <div className="panel search-hashtag-panel">
              <div className="section-head compact">
                <h3>Hashtag ยอดนิยมวันนี้</h3>
              </div>
              {loadingTags ? <div className="empty">กำลังโหลด Hashtag...</div> : null}
              {!loadingTags && hashtags.length ? (
                <div className="tags large hashtag-grid">
                  {hashtags.map((tag) => (
                    <button key={tag.tag} type="button" onClick={() => searchHashtag(tag.tag)}>
                      <Hash size={14} /> {tag.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {!loadingTags && !hashtags.length ? <div className="empty">ยังไม่มี Hashtag ยอดนิยมสำหรับวันนี้</div> : null}
            </div>
          </div>
        ) : (
          <div className="profile-results">
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
      </section>
    </div>
  );
}
