import { asset } from "../lib/api";

export function ImageCarousel({
  images,
  alt,
  fallback,
  countBadge
}: {
  images: string[];
  alt: string;
  fallback: string;
  countBadge?: React.ReactNode;
}) {
  const list = images.length ? images : [fallback];
  const active = asset(list[0]) || fallback;

  return (
    <div className="app-image-carousel">
      <img src={active} alt={alt} />
      {countBadge}
    </div>
  );
}
