import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { api, asset } from "../lib/api";
import { profileLevel } from "../lib/format";
import { useDialogA11y } from "../lib/useDialogA11y";
import type { User } from "../lib/types";

export function SearchSheet({
  viewerLoggedIn,
  close,
  openProfile,
  searchProducts
}: {
  viewerLoggedIn: boolean;
  close: () => void;
  openProfile: (p: User) => void;
  searchProducts: (q: string) => void;
}) {
  const [mode, setMode] = useState<"products" | "profiles">("products");
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<User[]>([]);
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(close);

  useEffect(() => {
    if (mode !== "profiles") return;
    const t = window.setTimeout(() => {
      api<{ profiles: User[] }>(`/profiles?q=${encodeURIComponent(query)}`)
        .then((d) => setProfiles(d.profiles))
        .catch(() => setProfiles([]));
    }, 180);
    return () => window.clearTimeout(t);
  }, [mode, query]);

  return (
    <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
      <section ref={dialogRef} className="sheet search-sheet" role="dialog" aria-modal="true" aria-labelledby="search-title" tabIndex={-1}>
        <div className="sheet-head">
          <h2 id="search-title">ค้นหา</h2>
          <button onClick={close} aria-label="ปิดการค้นหา">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="segmented" role="tablist" aria-label="ประเภทการค้นหา">
          <button
            className={mode === "products" ? "on" : ""}
            onClick={() => setMode("products")}
            role="tab"
            aria-selected={mode === "products"}
          >
            สินค้า
          </button>
          <button
            className={mode === "profiles" ? "on" : ""}
            onClick={() => setMode("profiles")}
            role="tab"
            aria-selected={mode === "profiles"}
          >
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
            placeholder={mode === "products" ? "ค้นหาสินค้า" : "ค้นหาร้านค้าหรือผู้ใช้"}
          />
        </label>
        {mode === "products" ? (
          <button className="primary wide" onClick={() => searchProducts(query)}>
            ค้นหาในช็อป
          </button>
        ) : (
          <div className="profile-results">
            {profiles.map((p) => {
              const level = profileLevel(p);
              return (
                <button
                  key={p.id}
                  className="profile-result"
                  onClick={() => openProfile(p)}
                >
                  <img src={asset(p.avatar_url)} alt={p.display_name || p.username || "โปรไฟล์"} />
                  <span>
                    <b>{p.display_name || p.username}</b>
                    <small>
                      {p.city || "QXwap"} · {p.listing_count || 0} รายการ
                    </small>
                  </span>
                  {viewerLoggedIn ? (
                    <em className={`profile-level ${level.key}`}>
                      {level.label} · {level.title}
                    </em>
                  ) : null}
                </button>
              );
            })}
            {!profiles.length ? <div className="empty">ไม่พบโปรไฟล์</div> : null}
          </div>
        )}
      </section>
    </div>
  );
}
