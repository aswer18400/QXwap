import type { Item } from "../lib/types";
import { ItemCard } from "./ItemCard";

export function ProfileProductCard({
  item,
  openItem
}: {
  item: Item;
  openItem: (item: Item) => void;
}) {
  return <ItemCard item={item} variant="compact" onOpen={openItem} />;
}
