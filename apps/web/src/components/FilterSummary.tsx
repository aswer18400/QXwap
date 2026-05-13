import type { Filters } from "../lib/constants";
import { activeFilterLabels } from "../lib/format";

export function FilterSummary({
  filters,
  openFilters
}: {
  filters: Filters;
  openFilters: () => void;
}) {
  const labels = activeFilterLabels(filters);
  if (!labels.length) return null;
  return (
    <div className="filter-summary active">
      <span>
        กำลังคัดกรอง: {labels.slice(0, 3).join(" · ")}
        {labels.length > 3 ? ` +${labels.length - 3}` : ""}
      </span>
      <button onClick={openFilters}>แก้ตัวกรอง</button>
    </div>
  );
}
