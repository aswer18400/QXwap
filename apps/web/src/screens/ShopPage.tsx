import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { categories, categoryLabels } from "../lib/constants";
import type { Filters } from "../lib/constants";
import type { Item } from "../lib/types";
import { FilterSummary } from "../components/FilterSummary";
import { ProductGridCard } from "../components/ProductGridCard";

export function ShopPage({
  items,
  filters,
  setFilters,
  activeFilterCount,
  openFilters,
  onOpen,
  onOffer,
  onSave,
  onTag
}: {
  items: Item[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  activeFilterCount: number;
  openFilters: () => void;
  onOpen: (i: Item) => void;
  onOffer: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
}) {
  return (
    <section className="screen shop-screen">
      <div className="shop-search-row">
        <label className="searchbox">
          <Search size={18} />
          <input
            aria-label="ค้นหาสินค้า"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="ค้นหาของที่อยากแลกหรือซื้อ"
          />
        </label>
        <button
          className={`filter-button ${activeFilterCount ? "active" : ""}`}
          onClick={openFilters}
          aria-label="เปิดตัวกรอง"
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={19} />
          <span>{activeFilterCount ? `ตัวกรอง ${activeFilterCount}` : "ตัวกรอง"}</span>
        </button>
      </div>
      <div className="category-rail">
        <button
          className={!filters.category ? "selected" : ""}
          aria-pressed={!filters.category}
          onClick={() => setFilters({ ...filters, category: "" })}
        >
          {!filters.category ? "✓ " : ""}ทั้งหมด
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={filters.category === category ? "selected" : ""}
            aria-pressed={filters.category === category}
            onClick={() => setFilters({ ...filters, category })}
          >
            {filters.category === category ? "✓ " : ""}
            {categoryLabels[category]}
          </button>
        ))}
      </div>
      <FilterSummary filters={filters} openFilters={openFilters} />
      <div className="section-head">
        <h1>ช็อปสินค้า</h1>
        <p>{items.length} รายการ</p>
      </div>
      {items.length === 0 ? (
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
    </section>
  );
}
