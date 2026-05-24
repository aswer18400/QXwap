import { useEffect, useRef } from "react";
import { Bookmark, BookmarkCheck, XwapActionIcon } from "../components/AppIcons";
import { ProductGridCard } from "../components/ProductGridCard";
import { DealTypeBadge } from "../components/DealTypeBadge";
import { Price } from "../components/Price";
import { asset } from "../lib/api";
import { categories, categoryLabels, wantedFallbacks } from "../lib/constants";
import { canXwap } from "../lib/format";
import type { Banner, Item, RequireLogin, User } from "../lib/types";

const homeShortcutCategories = categories.slice(0, 5);

export function AiFeed({
  items,
  banners,
  user,
  people,
  selectedPersonId,
  followingIds,
  onPerson,
  onCategory,
  onOpen,
  onOffer,
  onSave,
  onTag,
  onBannerOpen,
  requireLogin,
  openProfile,
  error,
  loading,
  loadingMore,
  hasMore,
  onRetry,
  onLoadMore
}: {
  items: Item[];
  banners: Banner[];
  myItems: Item[];
  user: User | null;
  people: User[];
  selectedPersonId: string;
  followingIds: string[];
  onPerson: (id: string) => void;
  onCategory: (category: string) => void;
  onOpen: (i: Item) => void;
  onOffer: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
  onBannerOpen: (banner: Banner) => void;
  requireLogin: RequireLogin;
  openProfile: (p: User) => void;
  error: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const followedSet = new Set(followingIds);
  const feedItems = selectedPersonId
    ? items.filter((item) => item.owner.id === selectedPersonId)
    : items;
  const recommendations = selectedPersonId
    ? feedItems
    : [
        ...feedItems.filter((item) => followedSet.has(item.owner.id)),
        ...feedItems.filter((item) => !followedSet.has(item.owner.id))
      ];
  const heroBanner = banners[0] || null;
  const spotlightItems = recommendations.slice(0, 4);
  const discoveryItems = recommendations.slice(4);
  const peoplePreview = people.slice(0, 4);
  const hasDiscoveries = spotlightItems.length || discoveryItems.length;

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore, recommendations.length]);

  function resolveCategoryImage(category: string) {
    const matchedItem = feedItems.find((item) => item.category === category);
    return asset(matchedItem?.media.images?.[0]) || wantedFallbacks[category] || wantedFallbacks.Other;
  }

  return (
    <section className="screen ai-feed">
      {heroBanner ? (
        <button type="button" className="home-hero-card" onClick={() => onBannerOpen(heroBanner)}>
          <img src={asset(heroBanner.image_url) || wantedFallbacks.Other} alt={heroBanner.title} />
          <span className="home-hero-overlay" aria-hidden="true" />
          <span className="home-hero-copy">
            <span className="home-hero-kicker">QXwap picks</span>
            <strong>{heroBanner.title}</strong>
            <small>จับคู่ของที่อยากได้ แล้วเริ่มคุยแลกได้ทันที</small>
            <span className="home-hero-pill">ดูวิธีการแลก</span>
          </span>
          {banners.length > 1 ? (
            <span className="home-hero-dots" aria-hidden="true">
              {banners.slice(0, 4).map((banner, index) => (
                <i key={banner.id} className={index === 0 ? "active" : ""} />
              ))}
            </span>
          ) : null}
        </button>
      ) : null}

      <div className="home-shortcut-row" aria-label="หมวดหมู่แนะนำ">
        {homeShortcutCategories.map((category) => (
          <button
            key={category}
            type="button"
            className="home-shortcut-card"
            onClick={() => onCategory(category)}
            aria-label={`เปิดหมวด ${categoryLabels[category]}`}
          >
            <span className="home-shortcut-icon">
              <img src={resolveCategoryImage(category)} alt="" aria-hidden="true" />
            </span>
            <span>{categoryLabels[category]}</span>
          </button>
        ))}
      </div>

      {peoplePreview.length ? (
        <section className="home-section">
          <div className="section-head compact">
            <div>
              <h2>ร้านแนะนำ</h2>
            </div>
            <button type="button" className="home-link-button" onClick={() => onCategory("")}>
              ดูทั้งหมด
            </button>
          </div>
          <div className="home-people-row">
            {peoplePreview.map((person) => (
              <button
                key={person.id}
                type="button"
                className={`home-person-card${selectedPersonId === person.id ? " active" : ""}`}
                onClick={() => (selectedPersonId === person.id ? onPerson("") : onPerson(person.id))}
              >
                <span className="home-person-avatar">
                  {person.avatar_url ? (
                    <img src={asset(person.avatar_url)} alt={person.display_name || "ร้านค้า"} />
                  ) : (
                    <span>{(person.display_name || "Q").slice(0, 1)}</span>
                  )}
                </span>
                <span className="home-person-copy">
                  <b>{person.display_name || "QXwap user"}</b>
                  <small>
                    {person.rating ? `★ ${person.rating.toFixed(1)}` : "ดูโปรไฟล์"} · {person.city || "ทั่วไทย"}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {spotlightItems.length ? (
        <section className="home-section">
          <div className="section-head compact">
            <div>
              <h2>{selectedPersonId ? "สินค้าจากร้านนี้" : "สำหรับคุณ"}</h2>
            </div>
            <button type="button" className="home-link-button" onClick={() => onCategory("")}>
              ดูทั้งหมด
            </button>
          </div>
          <div className="home-spotlight-rail">
            {spotlightItems.map((item) => {
              const ownerProfile = people.find((p) => p.id === item.owner.id) ?? {
                id: item.owner.id,
                email: "",
                display_name: item.owner.name,
                avatar_url: item.owner.avatar_url
              };
              const canOffer = !item.viewer.is_owner && (!user || canXwap(user));
              const actionLabel =
                item.viewer.is_owner ? "สินค้าของคุณ" : user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap";
              return (
                <article className="home-spotlight-card" key={item.id}>
                  <button
                    type="button"
                    className="home-spotlight-save"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSave(item);
                    }}
                    aria-label={item.viewer.is_bookmarked ? "ยกเลิกบันทึก" : "บันทึกสินค้า"}
                  >
                    {item.viewer.is_bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                  </button>
                  <button type="button" className="home-spotlight-media" onClick={() => onOpen(item)}>
                    <img src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
                    <span className="home-spotlight-deal">
                      <DealTypeBadge type={item.deal.type} label={item.deal.type === "swap" ? "แลกได้" : undefined} />
                    </span>
                  </button>
                  <div className="home-spotlight-body">
                    <div className="home-spotlight-copy">
                      <button type="button" className="home-spotlight-title" onClick={() => onOpen(item)}>
                        {item.title}
                      </button>
                      <Price item={item} compact />
                      <p>{item.wanted.text || `ต้องการ ${item.wanted.tags.slice(0, 2).join(" / ") || "ของที่ใกล้เคียง"}`}</p>
                    </div>
                    <div className="home-spotlight-foot">
                      <button type="button" className="home-spotlight-owner" onClick={() => openProfile(ownerProfile)}>
                        {item.owner.avatar_url ? (
                          <img src={asset(item.owner.avatar_url)} alt={item.owner.name || "เจ้าของสินค้า"} />
                        ) : (
                          <span>{(item.owner.name || "Q").slice(0, 1)}</span>
                        )}
                        <span>
                          <b>{item.owner.name || "QXwap user"}</b>
                          <small>{item.location.label || "พร้อมนัดรับ"}</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="home-spotlight-action"
                        onClick={() => (!user ? requireLogin("เข้าสู่ระบบก่อนเพื่อเริ่มคุยแลก") : canOffer ? onOffer(item) : undefined)}
                        disabled={!canOffer}
                      >
                        <XwapActionIcon size={15} />
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {loading ? <div className="empty">กำลังโหลดสินค้าแนะนำ...</div> : null}
      {!loading && error ? (
        <div className="empty empty-action" role="alert">
          <span>{error}</span>
          <button type="button" className="secondary" onClick={onRetry}>
            ลองใหม่
          </button>
        </div>
      ) : null}
      {!loading && !error && !hasDiscoveries ? (
        <div className="empty">ยังไม่มีรายการแนะนำในตอนนี้</div>
      ) : null}

      {discoveryItems.length ? (
        <section className="home-section">
          <div className="section-head compact">
            <div>
              <h2>สินค้าแนะนำ</h2>
            </div>
            <button type="button" className="home-link-button" onClick={() => onCategory("")}>
              ดูทั้งหมด
            </button>
          </div>
          <div className="shop-grid home-discovery-grid">
            {discoveryItems.map((item) => (
              <ProductGridCard
                key={item.id}
                item={item}
                user={user}
                onOpen={onOpen}
                onSave={onSave}
                onTag={onTag}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && hasMore ? (
        <div ref={loadMoreRef} className="feed-load-more">
          {loadingMore ? (
            "กำลังโหลดเพิ่ม..."
          ) : (
            <button type="button" className="secondary" onClick={onLoadMore}>
              โหลดสินค้าเพิ่ม
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
