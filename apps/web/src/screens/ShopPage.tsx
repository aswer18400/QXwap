import React, { useEffect, useRef } from "react";
import {
  CloseIcon,
  FilterToolbarIcon,
  NearbyToolbarIcon,
  SearchNavIcon,
  SortToolbarIcon
} from "../components/AppIcons";
import { Button } from "../components/Button";
import { CategoryGrid } from "../components/CategoryGrid";
import { ItemCard } from "../components/ItemCard";
import { PageState } from "../components/PageState";
import { SearchFilterBar } from "../components/SearchFilterBar";
import { categories, categoryLabels, conditionLabels, dealLabels } from "../lib/constants";
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
  onSearch,
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
  onSearch: (query: string) => void;
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
  const [searchDraft, setSearchDraft] = React.useState(filters.q || "");
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
  const activeSummary = [
    filters.q ? `ค้นหา “${filters.q}”` : "",
    filters.wanted_tag ? `แฮชแท็ก #${filters.wanted_tag}` : "",
    filters.category ? `หมวด ${categoryLabels[filters.category] || filters.category}` : "",
    filters.condition ? `สภาพ ${conditionLabels[filters.condition] || filters.condition}` : "",
    filters.deal_type ? `ดีล ${dealLabels[filters.deal_type as keyof typeof dealLabels] || filters.deal_type}` : "",
    filters.location_label ? `พื้นที่ ${filters.location_label}` : "",
    nearbyActive && filters.nearby_radius_km ? `ใกล้ฉัน ${filters.nearby_radius_km} กม.` : "",
    sortActive ? sortLabel : "",
    isFollowingView ? "เฉพาะคนที่ติดตาม" : ""
  ]
    .filter(Boolean)
    .join(" · ");
  const showInlineSkeleton = loading && !error && items.length === 0;

  useEffect(() => {
    setSearchDraft(filters.q || "");
  }, [filters.q]);

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
        <SearchFilterBar
          className="shop-search-bar"
          value={searchDraft}
          onChange={setSearchDraft}
          onSubmit={() => onSearch(searchDraft.trim())}
          placeholder="ค้นหาสินค้าที่อยากแลกหรืออยากได้"
          leading={<SearchNavIcon size={18} />}
          trailing={<SearchNavIcon size={16} />}
        />
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
        {activeSummary ? (
          <div className="shop-active-query">
            <span>{activeSummary}</span>
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
          title="โหลดหน้า Explore ไม่สำเร็จ"
          summary="ตอนนี้ผลการค้นหายังไม่ตอบกลับ ลองรีโหลดอีกครั้งหรือปรับตัวกรองให้กว้างขึ้น"
          details={[
            "รายการสินค้ายังไม่ตอบกลับจาก service",
            "ลองกดรีโหลดก่อนหนึ่งครั้ง แล้วค่อยล้างเงื่อนไขค้นหา",
            "ถ้ายังไม่หาย ให้เปลี่ยนคำค้นหรือกลับมาลองใหม่อีกครั้ง"
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
          title="ยังไม่เจอสินค้าที่ตรงกับการค้นหานี้"
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
