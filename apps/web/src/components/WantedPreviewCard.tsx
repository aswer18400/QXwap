import type { Item } from "../lib/types";
import { WantedItemCard } from "./WantedItemCard";

export function WantedPreviewCard({ item }: { item: Item }) {
  return <WantedItemCard item={item} variant="preview" />;
}
