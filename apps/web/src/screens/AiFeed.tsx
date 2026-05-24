import { useEffect, useRef } from "react";
import { ContextEmptyState } from "../components/ContextEmptyState";
import { ProductGridCard } from "../components/ProductGridCard";
import { asset } from "../lib/api";
import { categories, categoryLabels, wantedFallbacks } from "../lib/constants";
import { formatRatingValue } from "../lib/format";
import type { Banner, Item, User } from "../lib/types";

const homeShortcutCategories = categories.slice(0, 5);

export function AiFeed({
  items,
  banners,
  people,
  selectedPersonId,
  followingIds,
  onCategory,
  onOpen,
  onSave,
  onTag,
  onBannerOpen,
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
  people: User[];
  selectedPersonId: string;
  followingIds: string[];
  onCategory: (category: string) => void;
  onOpen: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
  onBannerOpen: (banner: Banner) => void;
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
            <span className="home-hero-kicker">QXwap</span>
            <strong>แลกได้ทุกสิ่ง</strong>
            <small>ไม่มีเงินก็แลกได้</small>
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
          <div className="shop-grid home-feature-grid">
            {spotlightItems.map((item) => (
              <ProductGridCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onSave={onSave}
                onTag={onTag}
              />
            ))}
          </div>
        </section>
      ) : null}

      {peoplePreview.length ? (
        <section className="home-section">
          <div className="section-head compact">
            <div>
              <h2>ผู้ใช้งานแนะนำ</h2>
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
                onClick={() => {
                  const ownerProfile = {
                    id: person.id,
                    email: person.email,
                    display_name: person.display_name,
                    avatar_url: person.avatar_url,
                    rating: person.rating,
                    city: person.city
                  };
                  openProfile(ownerProfile);
                }}
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
                  <small>{formatRatingValue(person.rating) ? `★ ${formatRatingValue(person.rating)}` : "ดูโปรไฟล์"}</small>
                  <small>{person.city || "ทั่วไทย"}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? <div className="empty">กำลังโหลดสินค้าแนะนำ...</div> : null}
      {!loading && error ? (
        <ContextEmptyState
          title="โหลดสินค้าหน้าหลักไม่สำเร็จ"
          summary="ตอนนี้หน้าหลักยังดึงรายการแนะนำและร้านที่ควรดูต่อให้คุณไม่ได้"
          details={[
            "ระบบยังดึงรายการแนะนำและร้านแนะนำกลับมาไม่ได้ในตอนนี้",
            "คุณยังเลือกหมวดหมู่ด้านบนต่อได้ และค่อยกลับมาลองใหม่อีกครั้ง",
            "ถ้าปัญหายังอยู่ ให้ลองรีเฟรชหรือกลับไปดูหน้าร้านค้าก่อน"
          ]}
          actions={[
            { label: "ลองใหม่", onClick: onRetry },
            { label: "รีเซ็ตฟีด", onClick: () => onCategory(""), variant: "secondary" }
          ]}
        />
      ) : null}
      {!loading && !error && !hasDiscoveries ? (
        <ContextEmptyState
          title="ยังไม่มีรายการแนะนำในตอนนี้"
          summary="ตอนนี้ระบบยังไม่มีสินค้าที่ตรงกับการเลือกหรือคนที่คุณติดตามอยู่ในฟีดนี้"
          details={[
            "ลองเปิดดูสินค้าทั้งหมดเพื่อรีเซ็ตการคัดกรอง",
            "แตะหมวดหมู่ด้านบนเพื่อเปลี่ยนโหมดการค้นหา",
            "กดติดตามร้านหรือผู้ใช้งานเพิ่มเพื่อให้ฟีดเฉพาะตัวมากขึ้น"
          ]}
          actions={[{ label: "ดูสินค้าทั้งหมด", onClick: () => onCategory(""), variant: "secondary" }]}
        />
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
                onOpen={onOpen}
                onSave={onSave}
                onTag={onTag}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error && hasMore ? (
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
