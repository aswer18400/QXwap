import type { Item } from "../lib/types";
import { Card } from "./Card";
import { ItemCard } from "./ItemCard";
import { WantedItemCard } from "./WantedItemCard";
import { SectionHeader } from "./SectionHeader";

export function FeedPostCard({
  item,
  onOpen,
  onSave,
  onTag
}: {
  item: Item;
  onOpen: (item: Item) => void;
  onSave: (item: Item) => void;
  onTag: (tag: string) => void;
}) {
  return (
    <Card className="app-feed-post-card">
      <SectionHeader title={item.title} subtitle={item.owner.name || "QXwap user"} compact />
      <div className="app-feed-post-card__grid">
        <div className="app-feed-post-card__pane">
          <small>ของที่มี</small>
          <ItemCard item={item} onOpen={onOpen} onSave={onSave} onTag={onTag} />
        </div>
        <div className="app-feed-post-card__pane">
          <small>ของที่อยากได้</small>
          <WantedItemCard item={item} variant="feed" />
        </div>
      </div>
    </Card>
  );
}
