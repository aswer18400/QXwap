import type { ComponentType } from "react";
import { BadgePlus, ShoppingCart, SwapDealIcon, Tag } from "./AppIcons";
import type { DealType } from "../lib/types";
import { dealLabels } from "../lib/constants";

const iconByDealType = {
  swap: SwapDealIcon,
  sell: Tag,
  buy: ShoppingCart,
  both: BadgePlus
} satisfies Record<DealType, ComponentType<{ size?: number }>>;

export function DealTypeBadge({
  type,
  emphasized = false,
  label
}: {
  type: DealType;
  emphasized?: boolean;
  label?: string;
}) {
  const Icon = iconByDealType[type];
  return (
    <span className={`deal-type-badge${emphasized ? " emphasized" : ""}`}>
      <Icon size={16} />
      {label || dealLabels[type]}
    </span>
  );
}
