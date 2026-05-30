import { useEffect, useMemo, useState } from "react";
import {
  FilterToolbarIcon,
  NotificationsNavIcon,
  SearchNavIcon
} from "../components/AppIcons";
import { PageState } from "../components/PageState";
import { PageHeader } from "../components/PageHeader";
import { QuickFilterList } from "../components/QuickFilterList";
import { SearchFilterBar } from "../components/SearchFilterBar";
import { SectionHeader } from "../components/SectionHeader";
import { UserMiniCard } from "../components/UserMiniCard";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { formatLocaleNumber, formatRatingValue } from "../lib/format";
import type { HashtagStat, Item, User } from "../lib/types";
import { itemService, profileService } from "../services";

function formatPrice(item: Item) {
  const price = formatLocaleNumber(item.deal.price_cash, "", { maximumFractionDigits: 0 });
  return price ? `฿${price}` : "เปิดรับข้อเสนอ";
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
      itemService.listTrendingHashtags(10).catch(() => [] as HashtagStat[]),
      itemService.listItems({ limit: 6, sort: "ai" }).catch(() => ({ items: [] as Item[] }))
    ])
      .then(([tagData, itemData]) => {
        if (!active) return;
        setHashtags(tagData || []);
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
      profileService.listProfiles({ q: trimmedQuery })
        .then((data) => {
          setProfiles(data || []);
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
          <SearchFilterBar
            className="searchbox--reference"
            value={query}
            autoFocus
            onChange={setQuery}
            onSubmit={submitSearch}
            placeholder={mode === "products" ? "ค้นหาอะไรที่ใช่..." : "ค้นหาชื่อผู้ใช้หรือร้านค้า"}
            leading={<SearchNavIcon size={18} />}
            trailing={<FilterToolbarIcon size={16} />}
          />
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
              <SectionHeader
                title="กำลังเป็นที่นิยม"
                compact
                action={<button type="button" className="secondary search-inline-link" onClick={() => setQuery("")}>ดูทั้งหมด</button>}
              />
              {loadingTags ? <PageState state="loading" summary="กำลังโหลดคำค้นยอดนิยม..." /> : null}
              {!loadingTags && hashtags.length ? (
                <QuickFilterList
                  className="hashtag-grid hashtag-grid--soft"
                  items={hashtags.map((tag) => ({
                    key: tag.tag,
                    label: `#${tag.label}`,
                    onClick: () => searchHashtag(tag.tag)
                  }))}
                />
              ) : null}
            </div>

            <div className="panel search-spotlight-panel">
              <SectionHeader
                title="แนะนำสำหรับคุณ"
                compact
                action={<button type="button" className="secondary search-inline-link" onClick={() => searchProducts("")}>ดูทั้งหมด</button>}
              />
              {loadingProducts ? <PageState state="loading" summary="กำลังโหลดสินค้าแนะนำ..." /> : null}
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
              <SectionHeader
                title="ผู้ใช้งานแนะนำ"
                compact
                action={<button type="button" className="secondary search-inline-link" onClick={() => setMode("profiles")}>ดูทั้งหมด</button>}
              />
              <div className="search-owner-row">
                {suggestedOwners.map((owner) => (
                  <UserMiniCard
                    key={owner.id}
                    className="search-owner-tile"
                    user={{ id: owner.id, display_name: owner.name, avatar_url: owner.avatar_url, rating: owner.rating }}
                    meta={formatRatingValue(owner.rating) || "ใหม่"}
                    onClick={() => openProfile({ id: owner.id, email: "", display_name: owner.name, avatar_url: owner.avatar_url, rating: owner.rating })}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-results list" id="search-panel-profiles" role="tabpanel" aria-labelledby="search-tab-profiles">
            {!trimmedQuery ? (
              <div className="panel search-owner-list-panel">
                <SectionHeader title="ร้านและผู้ใช้งานแนะนำ" subtitle="เริ่มจากรายชื่อที่มีการตอบรับดีลบ่อย" compact />
                <div className="search-profile-list">
                  {suggestedOwners.map((owner) => (
                    <UserMiniCard
                      key={owner.id}
                      className="profile-result search-profile-row"
                      user={{ id: owner.id, display_name: owner.name, avatar_url: owner.avatar_url, rating: owner.rating }}
                      meta={`QXwap · ${formatRatingValue(owner.rating) || "0.0"} ดาว`}
                      onClick={() => openProfile({ id: owner.id, email: "", display_name: owner.name, avatar_url: owner.avatar_url, rating: owner.rating })}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {loadingProfiles ? <PageState state="loading" summary="กำลังค้นหาโปรไฟล์..." /> : null}
            {!loadingProfiles &&
              profiles.map((profile) => (
                <UserMiniCard
                  key={profile.id}
                  className="profile-result search-profile-row"
                  user={{
                    id: profile.id,
                    display_name: profile.display_name || profile.username,
                    avatar_url: profile.avatar_url,
                    city: profile.city
                  }}
                  meta={`${profile.city || "QXwap"} · ${profile.listing_count || 0} รายการ`}
                  onClick={() => openProfile(profile)}
                />
              ))}
            {!loadingProfiles && !profiles.length && hasSearchedProfiles ? (
              <PageState
                state="empty"
                title="ไม่พบโปรไฟล์ที่ตรงกับคำค้นนี้"
                summary="ลองค้นด้วยชื่อร้าน ชื่อผู้ใช้ หรือพื้นที่แบบสั้นลง แล้วระบบจะหาโปรไฟล์ที่เกี่ยวข้องให้กว้างขึ้น"
                details={[
                  "ถ้ากำลังหาสินค้าเฉพาะอย่าง ลองกลับไปค้นในแท็บสินค้าแทน",
                  "ชื่อร้านหรือชื่อผู้ใช้ที่สั้นลงมักช่วยให้เจอผลลัพธ์ได้มากกว่า"
                ]}
                actions={[{ label: "กลับไปดูร้านแนะนำ", onClick: () => setQuery(""), variant: "secondary" }]}
                align="left"
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
