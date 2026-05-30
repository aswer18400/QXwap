import type { ReactNode } from "react";
import { FilterChip } from "./FilterChip";

type QuickFilterItem = {
  key: string;
  label: ReactNode;
  active?: boolean;
  onClick: () => void;
};

export function QuickFilterList({
  items,
  className
}: {
  items: QuickFilterItem[];
  className?: string;
}) {
  return (
    <div className={["app-quick-filter-list", className || ""].filter(Boolean).join(" ")}>
      {items.map((item) => (
        <FilterChip key={item.key} active={item.active} onClick={item.onClick}>
          {item.label}
        </FilterChip>
      ))}
    </div>
  );
}
