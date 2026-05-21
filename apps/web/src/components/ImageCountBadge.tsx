import { Images } from "./AppIcons";

export function ImageCountBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span className="image-count-badge" aria-label={`สินค้านี้มี ${count} รูป`}>
      <Images size={12} />
      {count}
    </span>
  );
}
