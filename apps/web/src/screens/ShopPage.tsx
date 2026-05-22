import React, { useEffect, useRef, useState } from "react";
import {
  CloseIcon,
  FilterToolbarIcon,
  FollowingIcon,
  ForwardIcon,
  NearbyToolbarIcon,
  PackageIcon,
  PrevIcon,
  RefreshIcon,
  SortToolbarIcon
} from "../components/AppIcons";
import { ShopSkeleton } from "../components/Skeletons";
import { ProductGridCard } from "../components/ProductGridCard";
import { categories, categoryLabels } from "../lib/constants";
import type { Filters } from "../lib/constants";
import type { Item, User } from "../lib/types";

function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="shop-empty-state" role="status">
      <div className="shop-empty-state-icon" aria-hidden="true">
        {icon || <PackageIcon size={26} />}
      </div>
      <div className="shop-empty-state-copy">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="shop-empty-state-action">{action}</div> : null}
    </div>
  );
}

function CategoryRail({
  activeCategory,
  onCategoryChange
}: {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const rail = scrollRef.current;
    if (!rail) return;

    const syncScrollState = () => {
      setCanScrollLeft(rail.scrollLeft > 4);
      setCanScrollRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
    };

    syncScrollState();
    rail.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      rail.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [activeCategory]);

  const scrollRail = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -176 : 176,
      behavior: "smooth"
    });
  };

  return (
    <div className="shop-category-shell">
      {canScrollLeft ? (
        <button
          type="button"
          className="shop-category-scroll shop-category-scroll-left"
          onClick={() => scrollRail("left")}
          aria-label="เลื่อนหมวดหมู่ไปทางซ้าย"
        >
          <PrevIcon size={16} />
        </button>
      ) : null}
      <div className="category-rail" ref={scrollRef} role="tablist" aria-label="หมวดหมู่สินค้า">
        <button
          type="button"
          className={`category-pill${!activeCategory ? " selected" : ""}`}
          aria-pressed={!activeCategory}
          aria-selected={!activeCategory}
          role="tab"
          onClick={() => onCategoryChange("")}
        >
          ทั้งหมด
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={`category-pill${activeCategory === category ? " selected" : ""}`}
            aria-pressed={activeCategory === category}
            aria-selected={activeCategory === category}
            role="tab"
            onClick={() => onCategoryChange(category)}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>
      {canScrollRight ? (
        <button
          type="button"
          className="shop-category-scroll shop-category-scroll-right"
          onClick={() => scrollRail("right")}
          aria-label="เลื่อนหมวดหมู่ไปทางขวา"
        >
          <ForwardIcon size={16} />
        </button>
      ) : null}
    </div>
  );
}

function ShopToolbar({
  sortActive,
  sortLabel,
  nearbyActive,
  nearbyLabel,
  activeFilterCount,
  canClearFilters,
  openSort,
  showNearby,
  openFilters,
  clearFilters
}: {
  sortActive: boolean;
  sortLabel: string;
  nearbyActive: boolean;
  nearbyLabel: string;
  activeFilterCount: number;
  canClearFilters: boolean;
  openSort: () => void;
  showNearby: () => void;
  openFilters: () => void;
  clearFilters: () => void;
}) {
  return (
    <div className="shop-toolbar">
      <div className="shop-toolbar-main">
        <button
          type="button"
          className={`shop-toolbar-button${sortActive ? " active" : ""}`}
          onClick={openSort}
          aria-label="เปิดหน้าเรียงลำดับ"
        >
          <SortToolbarIcon size={17} />
          <span>{sortLabel}</span>
        </button>
        <button
          type="button"
          className={`shop-toolbar-button${nearbyActive ? " active" : ""}`}
          onClick={showNearby}
          aria-label="แสดงสินค้าใกล้ฉัน"
        >
          <NearbyToolbarIcon size={17} />
          <span>{nearbyLabel}</span>
        </button>
      </div>
      <div className={`shop-toolbar-filter${canClearFilters ? " has-clear" : ""}`}>
        <button
          type="button"
          className={`shop-toolbar-button${canClearFilters ? " active" : ""}`}
          onClick={openFilters}
          aria-label="เปิดหน้าตัวกรอง"
        >
          <FilterToolbarIcon size={18} />
          <span>ตัวกรอง</span>
          {activeFilterCount ? <b>{activeFilterCount}</b> : null}
        </button>
        {canClearFilters ? (
          <button
            type="button"
            className="shop-toolbar-clear"
            onClick={(event) => {
              event.stopPropagation();
              clearFilters();
            }}
            aria-label="ล้างตัวกรอง"
          >
            <CloseIcon size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ShopPage({
  items,
  user,
  filters,
  activeFilterCount,
  canClearFilters,
  sortActive,
  sortLabel,
  nearbyActive,
  nearbyLabel,
  openSort,
  showNearby,
  openFilters,
  clearFilters,
  error,
  onCategoryChange,
  onOpen,
  onOffer,
  onSave,
  onTag,
  loading,
  loadingMore,
  hasMore,
  onRetry,
  onLoadMore
}: {
  items: Item[];
  user: User | null;
  filters: Filters;
  activeFilterCount: number;
  canClearFilters: boolean;
  sortActive: boolean;
  sortLabel: string;
  nearbyActive: boolean;
  nearbyLabel: string;
  openSort: () => void;
  showNearby: () => void;
  openFilters: () => void;
  clearFilters: () => void;
  error: string;
  onCategoryChange: (category: string) => void;
  onOpen: (i: Item) => void;
  onOffer: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFollowingView = Boolean(filters.following);
  const emptyMessage = isFollowingView
    ? "ยังไม่เจอสินค้าจากร้านที่คุณติดตาม ลองกลับมาดูใหม่ หรือปิดโหมดติดตามเพื่อดูสินค้าทั้งหมด"
    : "ยังไม่เจอสินค้าที่ตรงเงื่อนไข ลองล้างตัวกรองหรือเปลี่ยนหมวดหมู่ที่กำลังดูอยู่";

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
  }, [hasMore, loading, loadingMore, onLoadMore, items.length]);

  return (
    <section className="screen shop-screen" aria-label="หน้าช็อปสินค้า">
      <header className={`shop-header${isFollowingView ? " has-following" : ""}`}>
        {isFollowingView ? (
          <div className="shop-page-head">
            <div className="shop-page-head-copy">
              <h1>ร้านที่คุณติดตาม</h1>
              <p>รวมดีลล่าสุดจากร้านที่คุณติดตามไว้ในที่เดียว</p>
            </div>
            <span className="shop-results-count">{items.length} รายการ</span>
          </div>
        ) : null}
        {isFollowingView ? (
          <div className="shop-destination-pill">
            <FollowingIcon size={16} />
            <span>กำลังดูร้านที่ติดตาม</span>
          </div>
        ) : null}
        <CategoryRail activeCategory={filters.category} onCategoryChange={onCategoryChange} />
        <ShopToolbar
          sortActive={sortActive}
          sortLabel={sortLabel}
          nearbyActive={nearbyActive}
          nearbyLabel={nearbyLabel}
          activeFilterCount={activeFilterCount}
          canClearFilters={canClearFilters}
          openSort={openSort}
          showNearby={showNearby}
          openFilters={openFilters}
          clearFilters={clearFilters}
        />
      </header>

      <div className="shop-content">
        {loading ? <ShopSkeleton cards={6} /> : null}

        {!loading && error ? (
          <EmptyState
            title="โหลดหน้าช็อปไม่สำเร็จ"
            description={error}
            icon={<RefreshIcon size={24} />}
            action={
              <button type="button" className="shop-button shop-button-primary" onClick={onRetry}>
                <RefreshIcon size={16} />
                ลองใหม่
              </button>
            }
          />
        ) : null}

        {!loading && !error && !items.length ? (
          <EmptyState
            title={isFollowingView ? "ยังไม่มีสินค้าจากร้านที่ติดตาม" : "ไม่พบสินค้าที่ตรงกับตอนนี้"}
            description={emptyMessage}
            action={
              canClearFilters ? (
                <button type="button" className="shop-button shop-button-secondary" onClick={clearFilters}>
                  <CloseIcon size={16} />
                  ล้างตัวกรอง
                </button>
              ) : undefined
            }
          />
        ) : null}

        {!loading && !error && items.length ? (
          <>
            <div className="shop-grid" role="list" aria-label="รายการสินค้าในช็อป">
              {items.map((item) => (
                <ProductGridCard
                  key={item.id}
                  item={item}
                  user={user}
                  onOpen={onOpen}
                  onOffer={onOffer}
                  onSave={onSave}
                  onTag={onTag}
                />
              ))}
            </div>
            {hasMore ? (
              <div ref={loadMoreRef} className="shop-load-more">
                {loadingMore ? (
                  <div className="shop-loading-more" aria-live="polite">
                    <RefreshIcon size={17} className="shop-spin" />
                    <span>กำลังโหลดสินค้าเพิ่ม...</span>
                  </div>
                ) : (
                  <button type="button" className="shop-button shop-button-secondary" onClick={onLoadMore}>
                    โหลดสินค้าเพิ่มเติม
                  </button>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
