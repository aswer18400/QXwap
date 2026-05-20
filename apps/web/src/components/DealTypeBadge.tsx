import type { ComponentType } from "react";
import { BadgePlus, Handshake, ShoppingCart, Tag } from "lucide-react";
import type { DealType } from "../lib/types";
import { dealLabels } from "../lib/constants";

const iconByDealType = {
  swap: Handshake,
  sell: Tag,
  buy: ShoppingCart,
  both: BadgePlus
} satisfies Record<DealType, ComponentType<{ size?: number }>>;

export function DealTypeBadge({ type, emphasized = false }: { type: DealType; emphasized?: boolean }) {
  const Icon = iconByDealType[type];
  return (
    <span className={`deal-type-badge${emphasized ? " emphasized" : ""}`}>
      <Icon size={16} />
      {dealLabels[type]}
    </span>
  );
}
