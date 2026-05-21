import { useId } from "react";

export function BrandMark({ size = 28 }: { size?: number }) {
  const gradientId = useId();
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="brand-mark"
    >
      <rect x="2" y="2" width="28" height="28" rx="10" fill={`url(#${gradientId})`} />
      <path
        d="M8.95 12.4c1.16-1.25 3.2-1.25 4.36 0l1 1.08 1.05-1.08c1.16-1.25 3.18-1.25 4.34 0 1.19 1.29 1.19 3.34 0 4.62l-2.56 2.76a2.84 2.84 0 0 1-4.14 0l-2.62-2.82c-1.19-1.28-1.19-3.31 0-4.56Z"
        fill="white"
        fillOpacity="0.96"
      />
      <path
        d="m11.15 15.03 2 2.1a1.74 1.74 0 0 0 2.54 0l1.96-2.05"
        stroke="#6154FF"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 10.4h2.5m1.3 0h2.42"
        stroke="#6154FF"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id={gradientId} x1="4.5" y1="4.5" x2="27.5" y2="27.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#176BFF" />
          <stop offset="1" stopColor="#6154FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandWordmark() {
  return <span className="brand-wordmark">QXwap</span>;
}
