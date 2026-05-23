import {
  Bookmark,
  BookmarkCheck,
  Sparkles,
  XwapActionIcon
} from "../components/AppIcons";
import { useEffect, useRef } from "react";
import { asset } from "../lib/api";
import { dealLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Banner, Item, RequireLogin, User } from "../lib/types";
import { DealTypeBadge } from "../components/DealTypeBadge";
import { ImageCountBadge } from "../components/ImageCountBadge";
import { Price } from "../components/Price";

export function AiFeed({
  items,
  banners,
  user,
  people,
  selectedPersonId,
  followingIds,
  onPerson,
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

  return (
    <section className="screen ai-feed">
      <div className="panel ai-feed-header">
        <div className="ai-feed-header-copy">
          <span className="section-kicker">Curated Feed</span>
          <div className="ai-feed-title-row">
            <h1>ดีลน่าแลกตอนนี้</h1>
            <Sparkles size={20} />
          </div>
          <p>คัดจากของที่กำลังน่าคุยต่อ น่าแลกต่อ และเปิดบทสนทนาได้เร็ว</p>
        </div>
      </div>
      {banners.length ? (
        <div className="banner-rail" aria-label="แบนเนอร์โปรโมชัน">
          {banners.map((banner) => (
            <button key={banner.id} type="button" className="banner-card" onClick={() => onBannerOpen(banner)}>
              <span className="banner-media">
                <img src={asset(banner.image_url) || wantedFallbacks.Other} alt={banner.title} />
                <span className="banner-overlay" aria-hidden="true" />
                <span className="banner-content">
                  <span className="banner-badge">โปรโมชัน</span>
                  <span className="banner-title">{banner.title}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
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
      {!loading && !error && recommendations.length === 0 && (
        <div className="empty">ยังไม่มีรายการแนะนำในตอนนี้</div>
      )}

      <div className="feed-market-list">
        {recommendations.map((item) => {
          const ownerProfile = people.find((p) => p.id === item.owner.id) ?? {
            id: item.owner.id,
            email: "",
            display_name: item.owner.name,
            avatar_url: item.owner.avatar_url
          };
          const isOwnItem = Boolean(user && item.owner.id === user.id);
          const xwapDisabled = Boolean(user) && (!canXwap(user) || isOwnItem);

          return (
            <article className="feed-market-card" key={item.id}>
              <div className="feed-market-head">
                <button className="feed-market-owner" onClick={() => openProfile(ownerProfile)}>
                  {item.owner.avatar_url ? (
                    <img src={asset(item.owner.avatar_url)} alt={item.owner.name || "เจ้าของสินค้า"} />
                  ) : (
                    <span aria-hidden="true">{(item.owner.name || "Q").slice(0, 1)}</span>
                  )}
                  <span>
                    <b>{item.owner.name || "QXwap user"}</b>
                    <small>{item.location.label || "QXwap marketplace"}</small>
                  </span>
                </button>
                <div className="feed-market-head-actions">
                  <button
                    className="feed-market-save"
                    onClick={() => onSave(item)}
                    aria-label={item.viewer.is_bookmarked ? "ยกเลิกบันทึก" : "บันทึก"}
                  >
                    {item.viewer.is_bookmarked ? <BookmarkCheck size={21} /> : <Bookmark size={21} />}
                  </button>
                  <button
                    className="feed-market-xwap"
                    onClick={() => (!user ? onOffer(item) : !xwapDisabled ? onOffer(item) : undefined)}
                    disabled={xwapDisabled}
                    aria-label={`Xwap ${item.title}`}
                    aria-haspopup="dialog"
                  >
                    <XwapActionIcon size={18} />
                    <span>{user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap"}</span>
                  </button>
                </div>
              </div>

              <button className="feed-market-main" onClick={() => onOpen(item)} aria-label={`เปิดรายละเอียด ${item.title}`}>
                <span className="feed-market-photo">
                  <img src={asset(item.media.images[0]) || wantedFallbacks.Other} loading="lazy" alt={item.title} />
                  <ImageCountBadge count={item.media.images.length} />
                  <em>สภาพ {conditionPercent(item)}%</em>
                </span>
                <span className="feed-market-content">
                  <span className="feed-market-title">{item.title}</span>
                  <span className="feed-market-summary-row">
                    <DealTypeBadge type={item.deal.type} />
                    {item.wanted.tags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="feed-market-top-tag"
                        onClick={(event) => {
                          event.stopPropagation();
                          onTag(tag);
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </span>
                  <Price item={item} compact />
                  {item.wanted.text ? <span className="feed-market-wanted">{item.wanted.text}</span> : null}
                </span>
              </button>
            </article>
          );
        })}
      </div>
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
