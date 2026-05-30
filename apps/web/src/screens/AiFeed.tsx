import { useEffect, useRef } from "react";
import { Button } from "../components/Button";
import { CategoryGrid } from "../components/CategoryGrid";
import { FeedPostCard } from "../components/FeedPostCard";
import { PageState } from "../components/PageState";
import { SectionHeader } from "../components/SectionHeader";
import { UserMiniCard } from "../components/UserMiniCard";
import { asset } from "../lib/api";
import { categories, categoryLabels, wantedFallbacks } from "../lib/constants";
import { formatRatingValue, mergeItems } from "../lib/format";
import type { Banner, Item, User } from "../lib/types";

const homeShortcutCategories = categories.slice(0, 5);

function feedSimilarityKey(item: Item) {
  return item.title
    .toLowerCase()
    .replace(/\s*·\s*.*$/u, "")
    .replace(/\b\d+\b/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function diversifyFeedItems(items: Item[]) {
  const grouped = new Map<string, Item[]>();
  const order: string[] = [];
  items.forEach((item) => {
    const key = feedSimilarityKey(item);
    if (!grouped.has(key)) {
      grouped.set(key, []);
      order.push(key);
    }
    grouped.get(key)?.push(item);
  });
  const diversified: Item[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    order.forEach((key) => {
      const nextItem = grouped.get(key)?.shift();
      if (nextItem) {
        diversified.push(nextItem);
        remaining = true;
      }
    });
  }
  return diversified;
}

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
  const filteredFeedItems = selectedPersonId ? items.filter((item) => item.owner.id === selectedPersonId) : items;
  const feedItems = mergeItems(filteredFeedItems, []);
  const recommendations = selectedPersonId
    ? feedItems
    : diversifyFeedItems(
        mergeItems(
          feedItems.filter((item) => followedSet.has(item.owner.id)),
          feedItems.filter((item) => !followedSet.has(item.owner.id))
        )
      );
  const heroBanner = banners[0] || null;
  const heroImage = asset(heroBanner?.image_url) || asset(feedItems[0]?.media.images?.[0]) || wantedFallbacks.Electronics;
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

  const heroContent = (
    <>
      <img src={heroImage} alt={heroBanner?.title || "สินค้าตัวอย่างใน QXwap"} />
      <span className="home-hero-overlay" aria-hidden="true" />
      <span className="home-hero-copy">
        <span className="home-hero-kicker">QXwap Marketplace</span>
        <strong>ขายของที่ไม่ได้ใช้ แลกของที่อยากได้</strong>
        <small>ลงรูป ใส่แท็ก แล้วให้ระบบช่วยจับคู่ดีลที่คุยต่อได้เร็วขึ้น</small>
        <span className="home-hero-benefits" aria-label="จุดเด่นของ QXwap">
          <span>ขายหรือแลกได้ในที่เดียว</span>
          <span>รูปและแท็กช่วยให้จับคู่ง่ายขึ้น</span>
        </span>
        <span className="home-hero-pill">{heroBanner ? "ดูวิธีการแลก" : "เริ่มค้นหาของที่ใช่"}</span>
      </span>
      {banners.length > 1 ? (
        <span className="home-hero-dots" aria-hidden="true">
          {banners.slice(0, 4).map((banner, index) => (
            <i key={banner.id} className={index === 0 ? "active" : ""} />
          ))}
        </span>
      ) : null}
    </>
  );

  return (
    <section className="screen ai-feed">
      {heroBanner ? (
        <button type="button" className="home-hero-card" onClick={() => onBannerOpen(heroBanner)}>
          {heroContent}
        </button>
      ) : (
        <div className="home-hero-card home-hero-card--static">
          {heroContent}
        </div>
      )}

      <div className="home-shortcut-row" aria-label="หมวดหมู่แนะนำ">
        <CategoryGrid
          className="home-shortcut-grid"
          items={homeShortcutCategories.map((category) => ({
            key: category,
            label: categoryLabels[category],
            imageUrl: resolveCategoryImage(category),
            onClick: () => onCategory(category)
          }))}
        />
      </div>

      {spotlightItems.length ? (
        <section className="home-section">
          <SectionHeader
            title={selectedPersonId ? "สินค้าจากร้านนี้" : "สำหรับคุณ"}
            compact
            action={<button type="button" className="home-link-button" onClick={() => onCategory("")}>ดูทั้งหมด</button>}
          />
          <div className="shop-grid home-feature-grid">
            {spotlightItems.map((item) => (
              <FeedPostCard key={item.id} item={item} onOpen={onOpen} onSave={onSave} onTag={onTag} />
            ))}
          </div>
        </section>
      ) : null}

      {peoplePreview.length ? (
        <section className="home-section">
          <SectionHeader
            title="ผู้ใช้งานแนะนำ"
            compact
            action={<button type="button" className="home-link-button" onClick={() => onCategory("")}>ดูทั้งหมด</button>}
          />
          <div className="home-people-row">
            {peoplePreview.map((person) => (
              <UserMiniCard
                key={person.id}
                className="home-person-card"
                active={selectedPersonId === person.id}
                user={{
                  id: person.id,
                  display_name: person.display_name,
                  avatar_url: person.avatar_url,
                  rating: person.rating,
                  city: person.city
                }}
                meta={formatRatingValue(person.rating) ? `★ ${formatRatingValue(person.rating)}` : "ดูโปรไฟล์"}
                submeta={person.city || "ทั่วไทย"}
                onClick={() =>
                  openProfile({
                    id: person.id,
                    email: person.email,
                    display_name: person.display_name,
                    avatar_url: person.avatar_url,
                    rating: person.rating,
                    city: person.city
                  })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {loading ? <PageState state="loading" summary="กำลังโหลดสินค้าแนะนำ..." /> : null}
      {!loading && error ? (
        <PageState
          state="error"
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
        <PageState
          state="empty"
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
          <SectionHeader
            title="สินค้าแนะนำ"
            compact
            action={<button type="button" className="home-link-button" onClick={() => onCategory("")}>ดูทั้งหมด</button>}
          />
          <div className="shop-grid home-discovery-grid">
            {discoveryItems.map((item) => (
              <FeedPostCard key={item.id} item={item} onOpen={onOpen} onSave={onSave} onTag={onTag} />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error && hasMore ? (
        <div ref={loadMoreRef} className="feed-load-more">
          {loadingMore ? "กำลังโหลดเพิ่ม..." : <Button type="button" variant="secondary" onClick={onLoadMore}>โหลดสินค้าเพิ่ม</Button>}
        </div>
      ) : null}
    </section>
  );
}
