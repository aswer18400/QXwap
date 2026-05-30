import type { Item } from "../lib/types";
import { ItemCard } from "./ItemCard";

export function ProductGridCard({
  item,
  onOpen,
  onSave,
  onTag
}: {
  item: Item;
  onOpen: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
}) {
  return <ItemCard item={item} onOpen={onOpen} onSave={onSave} onTag={onTag} />;
}
