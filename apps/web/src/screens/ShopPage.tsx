import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
import { ProductGridCard } from "../components/ProductGridCard";
import { ShopSkeleton } from "../components/Skeletons";
import { categories, categoryLabels } from "../lib/constants";
import type { Filters } from "../lib/constants";
import type { Item, User } from "../lib/types";

function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="empty-state-title">{title}</h2>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}

function CategoryRail({
  filters,
  onCategoryChange
}: {
  filters: Filters;
  onCategoryChange: (category: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const rail = scrollRef.current;
    if (!rail) return;
    setCanScrollLeft(rail.scrollLeft > 0);
    setCanScrollRight(rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 10);
  }, []);

  useEffect(() => {
    const rail = scrollRef.current;
    if (!rail) return;
    rail.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    checkScroll();
    return () => {
      rail.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollRail = (direction: "left" | "right") => {
    const rail = scrollRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth"
    });
  };

  return (
    <div className="category-rail-wrapper">
      {canScrollLeft ? (
        <button
          type="button"
          className="scroll-btn scroll-left"
          onClick={() => scrollRail("left")}
          aria-label="เลื่อนไปทางซ้าย"
        >
          <PrevIcon size={16} />
        </button>
      ) : null}
      <div className="category-rail" ref={scrollRef} role="tablist" aria-label="เลือกหมวดหมู่สินค้า">
        <button
          type="button"
          className={`category-pill${!filters.category ? " selected" : ""}`}
          aria-pressed={!filters.category}
          aria-selected={!filters.category}
          role="tab"
          onClick={() => onCategoryChange("")}
        >
          ทั้งหมด
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={`category-pill${filters.category === category ? " selected" : ""}`}
            aria-pressed={filters.category === category}
            aria-selected={filters.category === category}
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
          className="scroll-btn scroll-right"
          onClick={() => scrollRail("right")}
          aria-label="เลื่อนไปทางขวา"
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
  const filterLabel = activeFilterCount ? `ตัวกรอง (${activeFilterCount})` : "ตัวกรอง";

  return (
    <div className="shop-toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn${sortActive ? " active" : ""}`}
          onClick={openSort}
          aria-label="เปิดหน้าเรียงลำดับ"
        >
          <SortToolbarIcon size={16} />
          <span>{sortLabel}</span>
          <span className="toolbar-chevron" aria-hidden="true">
            <ForwardIcon size={14} />
          </span>
        </button>

        <button
          type="button"
          className={`toolbar-btn${nearbyActive ? " active" : ""}`}
          onClick={showNearby}
          aria-label="แสดงสินค้าใกล้ฉัน"
        >
          <NearbyToolbarIcon size={16} />
          <span>{nearbyLabel}</span>
        </button>
      </div>

      <div className={`toolbar-btn-group${canClearFilters ? " has-clear" : ""}`}>
        <button
          type="button"
          className={`toolbar-btn${canClearFilters ? " active" : ""}`}
          onClick={openFilters}
          aria-label="เปิดหน้าตัวกรอง"
        >
          <FilterToolbarIcon size={16} />
          <span>{filterLabel}</span>
          {activeFilterCount > 0 ? <span className="filter-badge">{activeFilterCount}</span> : null}
        </button>
        {canClearFilters ? (
          <button
            type="button"
            className="toolbar-clear-btn"
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

function FollowingBadge() {
  return (
    <div className="shop-destination-state">
      <div className="shop-destination-pill">
        <FollowingIcon size={16} />
        <span>กำลังดูร้านที่ติดตาม</span>
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
  const pageTitle = isFollowingView ? "ร้านที่คุณติดตาม" : "";
  const resultsCount = items.length;
  const emptyMessage = isFollowingView
    ? "ยังไม่เจอสินค้าจากร้านที่คุณติดตาม ลองเปิดดูสินค้าทั้งหมดหรือกลับมาดูใหม่อีกครั้ง"
    : "ยังไม่เจอสินค้าที่ตรงเงื่อนไข ลองล้างตัวกรองหรือค้นหาคำอื่น";

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
  }, [hasMore, loading, loadingMore, onLoadMore, items.length]);

  return (
    <section className="screen shop-screen" aria-label="หน้าร้านค้า">
      <header className={`shop-header${isFollowingView ? " has-following" : ""}`}>
        {pageTitle ? (
          <div className="shop-page-head">
            <h1>{pageTitle}</h1>
            <span className="results-count">{resultsCount} รายการ</span>
          </div>
        ) : null}

        {isFollowingView ? <FollowingBadge /> : null}

        <CategoryRail filters={filters} onCategoryChange={onCategoryChange} />
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

      <main className="shop-content">
        {loading ? <ShopSkeleton cards={8} /> : null}

        {!loading && error ? (
          <EmptyState
            icon={<RefreshIcon size={48} />}
            title="ไม่สามารถโหลดข้อมูลได้"
            description={error}
            action={
              <button type="button" className="btn-primary" onClick={onRetry}>
                <RefreshIcon size={16} />
                ลองใหม่
              </button>
            }
          />
        ) : null}

        {!error && !loading && items.length === 0 ? (
          <EmptyState
            icon={<PackageIcon size={48} />}
            title={isFollowingView ? "ยังไม่มีสินค้าจากร้านที่ติดตาม" : "ไม่พบสินค้า"}
            description={emptyMessage}
            action={
              canClearFilters ? (
                <button type="button" className="btn-secondary" onClick={clearFilters}>
                  <CloseIcon size={16} />
                  ล้างตัวกรอง
                </button>
              ) : undefined
            }
          />
        ) : null}

        {!error && !loading && items.length > 0 ? (
          <>
            <div className="shop-grid" role="list">
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
                  <div className="loading-more" aria-live="polite">
                    <RefreshIcon size={20} className="spin" />
                    <span>กำลังโหลดสินค้าเพิ่ม...</span>
                  </div>
                ) : (
                  <button type="button" className="btn-load-more" onClick={onLoadMore}>
                    โหลดสินค้าเพิ่มเติม
                  </button>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </section>
  );
}
