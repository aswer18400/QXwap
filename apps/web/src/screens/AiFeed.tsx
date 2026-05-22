import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  LocationMetaIcon,
  PackageIcon,
  RefreshIcon,
  SavedActionIcon,
  SaveActionIcon,
  SearchIcon,
  UsersIcon,
  XwapActionIcon
} from "../components/AppIcons";
import { DealTypeBadge } from "../components/DealTypeBadge";
import { ImageCountBadge } from "../components/ImageCountBadge";
import { Price } from "../components/Price";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Banner, Item, RequireLogin, User } from "../lib/types";

type AiFeedProps = {
  items: Item[];
  banners: Banner[];
  user: User | null;
  people: User[];
  selectedPersonId: string;
  followingIds: string[];
  onPerson: (id: string) => void;
  onOpen: (item: Item) => void;
  onOffer: (item: Item) => void;
  onSave: (item: Item) => void;
  onTag: (tag: string) => void;
  onBannerOpen: (banner: Banner) => void;
  requireLogin: RequireLogin;
  openProfile: (profile: User) => void;
  error: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
};

type FeedCardProps = {
  item: Item;
  user: User | null;
  people: User[];
  onOpen: (item: Item) => void;
  onOffer: (item: Item) => void;
  onSave: (item: Item) => void;
  onTag: (tag: string) => void;
  requireLogin: RequireLogin;
  openProfile: (profile: User) => void;
};

type FeedEmptyStateProps = {
  icon: "error" | "empty";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "error";
};

type FeedCardImageProps = {
  item: Item;
  onOpen: (item: Item) => void;
};

function feedImageFallback(item: Item) {
  return wantedFallbacks[item.category] || wantedFallbacks.Other;
}

const FeedCardImage = memo(function FeedCardImage({ item, onOpen }: FeedCardImageProps) {
  const fallbackSrc = feedImageFallback(item);
  const primarySrc = asset(item.media.images[0]) || fallbackSrc;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState(primarySrc);
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(primarySrc ? "loading" : "error");

  useEffect(() => {
    setImageSrc(primarySrc);
    setImageState(primarySrc ? "loading" : "error");
  }, [primarySrc]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !imageSrc || !image.complete) return;
    setImageState(image.naturalWidth > 0 ? "loaded" : "error");
  }, [imageSrc]);

  return (
    <button
      type="button"
      className="feed-card-media"
      onClick={() => onOpen(item)}
      aria-label={`ดูรายละเอียด ${item.title}`}
    >
      <span className={`image-wrapper ${imageState}`}>
        {imageState !== "loaded" ? <span className="image-skeleton" aria-hidden="true" /> : null}
        <img
          ref={imageRef}
          src={imageSrc}
          alt={item.title}
          loading="lazy"
          onLoad={() => setImageState("loaded")}
          onError={() => {
            if (imageSrc !== fallbackSrc) {
              setImageSrc(fallbackSrc);
              setImageState("loading");
              return;
            }
            setImageState("error");
          }}
        />
      </span>
      <ImageCountBadge count={item.media.images.length} />
      <span className="condition-badge">สภาพ {conditionPercent(item)}%</span>
      <span className="media-overlay" aria-hidden="true">
        <span className="view-details">
          <SearchIcon size={16} />
          ดูรายละเอียด
        </span>
      </span>
    </button>
  );
});

const FeedEmptyState = memo(function FeedEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "default"
}: FeedEmptyStateProps) {
  const Icon = icon === "error" ? PackageIcon : UsersIcon;
  return (
    <section className={`empty-state${tone === "error" ? " is-error" : ""}`} role={tone === "error" ? "alert" : undefined}>
      <Icon size={34} className="empty-state-icon" />
      <div className="empty-state-copy">
        <h2 className="empty-state-title">{title}</h2>
        <p className="empty-state-desc">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          className={`${tone === "error" ? "btn-primary" : "btn-secondary"} empty-state-action`}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
});

const FeedCard = memo(function FeedCard({
  item,
  user,
  people,
  onOpen,
  onOffer,
  onSave,
  onTag,
  requireLogin,
  openProfile
}: FeedCardProps) {
  const ownerProfile = people.find((profile) => profile.id === item.owner.id) ?? {
    id: item.owner.id,
    email: "",
    display_name: item.owner.name,
    avatar_url: item.owner.avatar_url,
    account_level: item.owner.account_level
  };
  const isOwnItem = Boolean(user && item.owner.id === user.id);
  const userCanXwap = canXwap(user);
  const ctaDisabled = Boolean(user) && (!userCanXwap || isOwnItem);
  const ctaLabel = !user
    ? "เข้าสู่ระบบเพื่อ Xwap"
    : isOwnItem
      ? "สินค้าของคุณ"
      : !userCanXwap
        ? "ดูได้เท่านั้น"
        : "Xwap สินค้านี้";

  function handleOffer() {
    if (!user) {
      requireLogin("เข้าสู่ระบบเพื่อส่งข้อเสนอ Xwap");
      return;
    }
    if (ctaDisabled) return;
    onOffer(item);
  }

  return (
    <article className="feed-market-card" data-own-item={isOwnItem ? "true" : "false"} role="listitem">
      <header className="feed-card-header">
        <button
          type="button"
          className="feed-card-owner"
          onClick={() => openProfile(ownerProfile)}
          aria-label={`เปิดโปรไฟล์ร้าน ${item.owner.name || "ผู้ใช้ QXwap"}`}
        >
          <span className="owner-avatar-shell" aria-hidden="true">
            {item.owner.avatar_url ? (
              <img className="owner-avatar-img" src={asset(item.owner.avatar_url)} alt="" />
            ) : (
              <span className="owner-avatar-fallback">{(item.owner.name || "Q").slice(0, 1)}</span>
            )}
          </span>
          <span className="feed-card-owner-info">
            <span className="feed-card-owner-name">{item.owner.name || "QXwap user"}</span>
            <span className="feed-card-owner-location">
              <LocationMetaIcon size={12} />
              {item.location.label || "QXwap marketplace"}
            </span>
          </span>
        </button>
        <div className="feed-card-actions">
          <button
            type="button"
            className={`xwap-btn compact${isOwnItem ? " own-item" : ""}${ctaDisabled && !isOwnItem ? " disabled" : ""}`}
            onClick={handleOffer}
            disabled={Boolean(user) && ctaDisabled}
            aria-label={`${ctaLabel}: ${item.title}`}
          >
            <XwapActionIcon size={16} />
            <span>{!user ? "Xwap" : ctaLabel === "Xwap สินค้านี้" ? "Xwap" : ctaLabel}</span>
          </button>
          <button
            type="button"
            className={`action-btn bookmark-btn${item.viewer.is_bookmarked ? " active" : ""}`}
            onClick={() => onSave(item)}
            aria-label={item.viewer.is_bookmarked ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
          >
            {item.viewer.is_bookmarked ? <SavedActionIcon size={18} /> : <SaveActionIcon size={18} />}
          </button>
        </div>
      </header>

      <FeedCardImage item={item} onOpen={onOpen} />

      <div className="feed-card-body">
        <button type="button" className="feed-card-title-btn" onClick={() => onOpen(item)} aria-label={`เปิดรายละเอียด ${item.title}`}>
          <h2 className="feed-card-title">{item.title}</h2>
        </button>
        <div className="feed-card-meta">
          <DealTypeBadge type={item.deal.type} />
          <div className="feed-card-tags" aria-label="แฮชแท็กที่เกี่ยวข้อง">
            {item.wanted.tags.slice(0, 2).map((tag) => (
              <button key={tag} type="button" className="tag-pill" onClick={() => onTag(tag)}>
                #{tag}
              </button>
            ))}
            {item.wanted.tags.length > 2 ? <span className="tag-pill more">+{item.wanted.tags.length - 2}</span> : null}
          </div>
        </div>
        <div className="feed-card-price-row">
          <Price item={item} compact />
        </div>
        {item.wanted.text ? <p className="feed-card-wanted">{item.wanted.text}</p> : null}
      </div>
    </article>
  );
});

function FeedLoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="feed-market-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="feed-market-card" key={`feed-loading-${index}`}>
          <div className="skeleton-head">
            <span className="skeleton-pulse skeleton-avatar" />
            <div className="skeleton-meta">
              <span className="skeleton-pulse skeleton-text short" />
              <span className="skeleton-pulse skeleton-text medium tiny" />
            </div>
          </div>
          <span className="skeleton-pulse feed-card-media-skeleton" />
          <div className="skeleton-content">
            <span className="skeleton-pulse skeleton-text long" />
            <span className="skeleton-pulse skeleton-text medium" />
            <span className="skeleton-pulse skeleton-text short" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
}: AiFeedProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const recommendations = useMemo(() => {
    const filtered = selectedPersonId
      ? items.filter((item) => item.owner.id === selectedPersonId)
      : items;
    if (selectedPersonId) return filtered;
    const followedSet = new Set(followingIds);
    return [
      ...filtered.filter((item) => followedSet.has(item.owner.id)),
      ...filtered.filter((item) => !followedSet.has(item.owner.id))
    ];
  }, [followingIds, items, selectedPersonId]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore, recommendations.length]);

  const emptyState = !loading && !error && recommendations.length === 0
    ? (
        <FeedEmptyState
          icon="empty"
          title={selectedPersonId ? "ยังไม่มีสินค้าจากร้านนี้" : "ยังไม่มีรายการแนะนำ"}
          description={
            selectedPersonId
              ? "ลองล้างตัวกรองร้านเพื่อกลับไปดูรายการแนะนำทั้งหมด"
              : "ลองติดตามร้านเพิ่มหรือกลับมาใหม่อีกครั้งเมื่อมีรายการใหม่ในระบบ"
          }
          actionLabel={selectedPersonId ? "ล้างตัวกรองร้าน" : undefined}
          onAction={selectedPersonId ? () => onPerson("") : undefined}
        />
      )
    : null;

  return (
    <section className="screen ai-feed">
      {banners.length ? (
        <div className="banner-rail" aria-label="แบนเนอร์โปรโมชัน">
          {banners.map((banner) => (
            <button
              key={banner.id}
              type="button"
              className="banner-card"
              onClick={() => onBannerOpen(banner)}
              aria-label={`เปิดโปรโมชัน ${banner.title}`}
            >
              <span className="banner-media">
                <img src={asset(banner.image_url) || wantedFallbacks.Other} alt={banner.title} loading="lazy" />
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

      {loading ? <FeedLoadingCards /> : null}

      {!loading && error ? (
        <FeedEmptyState
          icon="error"
          tone="error"
          title="โหลดรายการแนะนำไม่สำเร็จ"
          description={error}
          actionLabel="ลองใหม่"
          onAction={onRetry}
        />
      ) : null}

      {emptyState}

      {!loading && !error && recommendations.length ? (
        <div className="feed-market-list" role="list">
          {recommendations.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              user={user}
              people={people}
              onOpen={onOpen}
              onOffer={onOffer}
              onSave={onSave}
              onTag={onTag}
              requireLogin={requireLogin}
              openProfile={openProfile}
            />
          ))}
        </div>
      ) : null}

      {!loading && hasMore ? (
        <div ref={loadMoreRef} className="feed-load-more">
          {loadingMore ? (
            <div className="loading-more-indicator" role="status" aria-live="polite">
              <RefreshIcon size={16} className="spin" />
              กำลังโหลดรายการเพิ่ม
            </div>
          ) : (
            <button type="button" className="btn-secondary load-more-btn" onClick={onLoadMore}>
              โหลดสินค้าเพิ่ม
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
