type CategoryGridItem = {
  key: string;
  label: string;
  imageUrl?: string;
  active?: boolean;
  onClick: () => void;
};

export function CategoryGrid({
  items,
  rail = false,
  className
}: {
  items: CategoryGridItem[];
  rail?: boolean;
  className?: string;
}) {
  return (
    <div className={[rail ? "category-rail app-category-grid app-category-grid--rail" : "app-category-grid", className || ""].filter(Boolean).join(" ")}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.active ? "selected" : ""}
          aria-pressed={item.active}
          onClick={item.onClick}
        >
          {item.imageUrl ? <img src={item.imageUrl} alt="" aria-hidden="true" /> : null}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
