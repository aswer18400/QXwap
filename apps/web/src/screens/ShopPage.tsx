import React, { useEffect, useRef } from "react";
import {
  CloseIcon,
  FilterToolbarIcon,
  NearbyToolbarIcon,
  SortToolbarIcon
} from "../components/AppIcons";
import { Button } from "../components/Button";
import { CategoryGrid } from "../components/CategoryGrid";
import { ItemCard } from "../components/ItemCard";
import { PageState } from "../components/PageState";
import { categories, categoryLabels } from "../lib/constants";
import type { Filters } from "../lib/constants";
import type { Item } from "../lib/types";
import { ShopSkeleton } from "../components/Skeletons";

export function ShopPage({
  items,
  filters,
  activeFilterCount,
  canClearFilters,
  canResetResults,
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
  onSave,
  onTag,
  loading,
  loadingMore,
  hasMore,
  onRetry,
  onLoadMore
}: {
  items: Item[];
  filters: Filters;
  activeFilterCount: number;
  canClearFilters: boolean;
  canResetResults: boolean;
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
    ? "ยังไม่เจอสินค้าจากร้านที่คุณติดตาม ลองเปิดดูสินค้าทั้งหมดหรือกลับมาดูใหม่อีกครั้ง"
    : nearbyActive
      ? "ยังไม่เจอสินค้าในระยะนี้ ลองขยายระยะหรือดูสินค้าทั้งหมด"
      : filters.q || filters.wanted_tag
        ? "ยังไม่เจอสินค้าที่ตรงคำค้นนี้ ลองค้นหาคำอื่นหรือเปิดดูสินค้าทั้งหมด"
        : "ยังไม่เจอสินค้าที่ตรงเงื่อนไข ลองล้างตัวกรองหรือค้นหาคำอื่น";
  const nearbyButtonLabel = nearbyActive && filters.nearby_radius_km ? `ในระยะ ${filters.nearby_radius_km} กม.` : "ใกล้ฉัน";
  const filterButtonLabel = activeFilterCount ? `ตัวกรอง ${activeFilterCount}` : "ตัวกรอง";
  const activeDiscoveryLabel = filters.q
    ? `ค้นหา: ${filters.q}`
    : filters.wanted_tag
      ? `แฮชแท็ก: #${filters.wanted_tag}`
      : isFollowingView
        ? "กำลังดูจากร้านที่ติดตาม"
        : "";
  const showInlineSkeleton = loading && !error && items.length === 0;

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
      <div className="shop-sticky-shell">
        <CategoryGrid
          rail
          items={[
            { key: "all", label: "ทั้งหมด", active: !filters.category, onClick: () => onCategoryChange("") },
            ...categories.map((category) => ({
              key: category,
              label: categoryLabels[category],
              active: filters.category === category,
              onClick: () => onCategoryChange(category)
            }))
          ]}
        />
        {activeDiscoveryLabel ? (
          <div className="shop-active-query">
            <span>{activeDiscoveryLabel}</span>
            <button type="button" className="shop-inline-clear" onClick={clearFilters}>
              ล้างทั้งหมด
            </button>
          </div>
        ) : null}
        <div className="shop-toolbar">
          <button className={`filter-button ${sortActive ? "active" : ""}`} onClick={openSort} aria-label="เปิดหน้าเรียงลำดับ" title={sortLabel}>
            <SortToolbarIcon size={18} />
            <span>{sortLabel}</span>
          </button>
          <button className={`filter-button ${nearbyActive ? "active" : ""}`} onClick={showNearby} aria-label="แสดงสินค้าใกล้ฉัน" title={nearbyLabel}>
            <NearbyToolbarIcon size={18} />
            <span>{nearbyButtonLabel}</span>
          </button>
          <div className={`filter-button-group ${canClearFilters ? "active" : ""}`}>
            <button
              className={`filter-button ${canClearFilters ? "active" : ""}`}
              onClick={openFilters}
              aria-label="เปิดหน้าตัวกรอง"
              title={activeFilterCount ? `มีตัวกรอง ${activeFilterCount}` : "เปิดหน้าตัวกรอง"}
            >
              <FilterToolbarIcon size={19} />
              <span>{filterButtonLabel}</span>
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
      </div>
      {error ? (
        <PageState
          state="error"
          title="โหลดสินค้าร้านค้าไม่สำเร็จ"
          summary="ตอนนี้รายการสินค้าในร้านค้ายังไม่ตอบกลับ แต่หมวดหมู่และตัวกรองยังพร้อมให้คุณใช้ต่อ"
          details={[
            "ตอนนี้รายการสินค้ายังไม่ตอบกลับ แต่หมวดหมู่และตัวกรองยังพร้อมใช้งาน",
            "ลองกดรีโหลดก่อนหนึ่งครั้ง แล้วค่อยล้างเงื่อนไขค้นหาออกถ้ายังไม่ขึ้น",
            "ถ้ายังไม่หาย ให้เปิดดูหมวดอื่นหรือกลับมาลองใหม่อีกครั้ง"
          ]}
          actions={[
            { label: "ลองใหม่", onClick: onRetry },
            ...(canResetResults ? [{ label: "ดูสินค้าทั้งหมด", onClick: clearFilters, variant: "secondary" as const }] : [])
          ]}
        />
      ) : null}
      {showInlineSkeleton ? <ShopSkeleton cards={6} /> : null}
      {!error && !loading && items.length === 0 ? (
        <PageState
          state="empty"
          summary={emptyMessage}
          actions={canResetResults ? [{ label: "ดูสินค้าทั้งหมด", onClick: clearFilters, variant: "secondary" }] : []}
        />
      ) : null}
      <div className="shop-grid">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onOpen={onOpen} onSave={onSave} onTag={onTag} />
        ))}
      </div>
      {!loading && !error && hasMore ? (
        <div ref={loadMoreRef} className="shop-load-more">
          {loadingMore ? "กำลังโหลดสินค้าเพิ่ม..." : <Button type="button" variant="secondary" onClick={onLoadMore}>โหลดสินค้าเพิ่ม</Button>}
        </div>
      ) : null}
    </section>
  );
}
