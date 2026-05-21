import React, { useEffect, useRef } from "react";
import { ArrowUpDown, Crosshair, SlidersHorizontal, X } from "lucide-react";
import { categories, categoryLabels } from "../lib/constants";
import type { Filters } from "../lib/constants";
import type { Item } from "../lib/types";
import { ProductGridCard } from "../components/ProductGridCard";

export function ShopPage({
  items,
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
  onLoadMore
}: {
  items: Item[];
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
  onLoadMore: () => void;
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
          <ArrowUpDown size={18} />
          <span>Sort by</span>
        </button>
        <button className="filter-button" onClick={showNearby} aria-label="แสดงสินค้าใกล้ฉัน">
          <Crosshair size={18} />
          <span>ใกล้ฉัน</span>
        </button>
        <div className={`filter-button-group ${canClearFilters ? "active" : ""}`}>
          <button
            className={`filter-button ${canClearFilters ? "active" : ""}`}
            onClick={openFilters}
            aria-label="เปิดหน้าตัวกรอง"
          >
            <SlidersHorizontal size={19} />
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
              <X size={14} />
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
      <div className="section-head">
        <h1>ช็อปสินค้า</h1>
        {!error ? <p>{items.length} รายการ</p> : null}
      </div>
      {error ? <div className="empty" role="alert">{error}</div> : null}
      {loading ? <div className="empty">กำลังโหลดสินค้า...</div> : null}
      {!error && !loading && items.length === 0 ? (
        <div className="empty">ยังไม่เจอสินค้าที่ตรงเงื่อนไข ลองล้างตัวกรองหรือค้นหาคำอื่น</div>
      ) : null}
      <div className="shop-grid">
        {items.map((item) => (
          <ProductGridCard
            key={item.id}
            item={item}
            onOpen={onOpen}
            onOffer={onOffer}
            onSave={onSave}
            onTag={onTag}
          />
        ))}
      </div>
      {!loading && hasMore ? (
        <div ref={loadMoreRef} className="shop-load-more">
          {loadingMore ? "กำลังโหลดสินค้าเพิ่ม..." : "เลื่อนลงเพื่อโหลดสินค้าเพิ่ม"}
        </div>
      ) : null}
    </section>
  );
}
