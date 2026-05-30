import { asset } from "../lib/api";

export function Avatar({
  src,
  alt,
  name,
  size = 40,
  className
}: {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const fallback = (name || alt || "Q").trim().slice(0, 1).toUpperCase() || "Q";
  const resolvedSrc = asset(src || "");
  return (
    <span
      className={["app-avatar", className || ""].filter(Boolean).join(" ")}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden={!alt}
    >
      {resolvedSrc ? <img src={resolvedSrc} alt={alt || name || "avatar"} /> : <span>{fallback}</span>}
    </span>
  );
}
