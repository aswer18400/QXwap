import type { DealType } from "../lib/types";
import { dealLabels } from "../lib/constants";
import { StatusBadge } from "./StatusBadge";

export function DealTypeBadge({
  type,
  emphasized = false,
  label
}: {
  type: DealType;
  emphasized?: boolean;
  label?: string;
}) {
  return <StatusBadge kind="dealType" status={type} emphasized={emphasized} label={label || dealLabels[type]} className="deal-type-badge" />;
}
