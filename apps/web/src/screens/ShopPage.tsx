import React, { useEffect, useRef } from "react";
import { CloseIcon, FilterToolbarIcon, NearbyToolbarIcon, SortToolbarIcon } from "../components/AppIcons";
import { categories, categoryLabels } from "../lib/constants";
import type { Filters } from "../lib/constants";
import type { Item, User } from "../lib/types";
import { ProductGridCard } from "../components/ProductGridCard";

export function ShopPage({
  items,
  user,
  filters,
  activeFilterCount,
  canClearFilters,
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
  const pageTitle = isFollowingView ? "รายการที่ติดตาม" : "ช็อปสินค้า";
  const emptyMessage = isFollowingView
    ? "ยังไม่เจอสินค้าจากร้านที่คุณติดตาม ลองล้างตัวกรองหรือกลับมาดูใหม่อีกครั้ง"
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
    <section className="screen shop-screen">
      <div className="shop-toolbar">
        <button className="filter-button" onClick={openSort} aria-label="เปิดหน้าเรียงลำดับ">
          <SortToolbarIcon size={18} />
          <span>เรียงลำดับ</span>
        </button>
        <button className="filter-button" onClick={showNearby} aria-label="แสดงสินค้าใกล้ฉัน">
          <NearbyToolbarIcon size={18} />
          <span>ใกล้ฉัน</span>
        </button>
        <div className={`filter-button-group ${canClearFilters ? "active" : ""}`}>
          <button
            className={`filter-button ${canClearFilters ? "active" : ""}`}
            onClick={openFilters}
            aria-label="เปิดหน้าตัวกรอง"
          >
            <FilterToolbarIcon size={19} />
            <span>{activeFilterCount ? `ตัวกรอง ${activeFilterCount}` : "ตัวกรอง"}</span>
          </button>
          {canClearFilters ? (
            <button
              type="button"
              className="filter-clear-button"
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
      <div className="category-rail">
        <button
          className={!filters.category ? "selected" : ""}
          aria-pressed={!filters.category}
          onClick={() => onCategoryChange("")}
        >
          ทั้งหมด
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={filters.category === category ? "selected" : ""}
            aria-pressed={filters.category === category}
            onClick={() => onCategoryChange(category)}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>
      <div className="section-head section-head-centered">
        <h1>{pageTitle}</h1>
      </div>
      {error ? (
        <div className="empty empty-action" role="alert">
          <span>{error}</span>
          <button type="button" className="secondary" onClick={onRetry}>
            ลองใหม่
          </button>
        </div>
      ) : null}
      {loading ? <div className="empty">กำลังโหลดสินค้า...</div> : null}
      {!error && !loading && items.length === 0 ? (
        <div className="empty">{emptyMessage}</div>
      ) : null}
      <div className="shop-grid">
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
      {!loading && hasMore ? (
        <div ref={loadMoreRef} className="shop-load-more">
          {loadingMore ? (
            "กำลังโหลดสินค้าเพิ่ม..."
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
