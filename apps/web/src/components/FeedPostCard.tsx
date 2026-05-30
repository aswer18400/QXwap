import type { Item } from "../lib/types";
import type { ReactNode } from "react";
import { Card } from "./Card";
import { ItemCard } from "./ItemCard";
import { WantedItemCard } from "./WantedItemCard";
import { SectionHeader } from "./SectionHeader";

export function FeedPostCard({
  item,
  onOpen,
  onSave,
  onTag,
  onOpenWanted,
  subtitle,
  footer
}: {
  item: Item;
  onOpen: (item: Item) => void;
  onSave: (item: Item) => void;
  onTag: (tag: string) => void;
  onOpenWanted?: (item: Item) => void;
  subtitle?: string;
  footer?: ReactNode;
}) {
  return (
    <Card className="app-feed-post-card">
      <SectionHeader title={item.owner.name || "QXwap user"} subtitle={subtitle || "มีอะไร / อยากได้อะไร"} compact />
      <div className="app-feed-post-card__grid">
        <div className="app-feed-post-card__pane">
          <small>ของที่มี</small>
          <ItemCard item={item} onOpen={onOpen} onSave={onSave} onTag={onTag} />
        </div>
        <div className="app-feed-post-card__pane">
          <small>ของที่อยากได้</small>
          <WantedItemCard item={item} variant="feed" onOpen={onOpenWanted ? () => onOpenWanted(item) : undefined} />
        </div>
      </div>
      {footer ? <div className="app-feed-post-card__footer">{footer}</div> : null}
    </Card>
  );
}
