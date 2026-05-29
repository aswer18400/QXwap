import { useId } from "react";

export function BrandMark({ size = 28 }: { size?: number }) {
  const gradientId = useId();
  const orbitId = useId();
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
      <rect x="2" y="2" width="28" height="28" rx="11" fill={`url(#${gradientId})`} />
      <circle cx="16" cy="16" r="10.5" stroke={`url(#${orbitId})`} strokeWidth="1.2" opacity="0.68" />
      <path
        d="M10.25 12.35a2.25 2.25 0 0 1 3.18 0l1.02 1.02 1.14-1.02a2.24 2.24 0 0 1 3.14 0 2.2 2.2 0 0 1 0 3.16l-1.2 1.14h2.05a1.1 1.1 0 1 1 0 2.2H15.1a1.1 1.1 0 0 1-.79-1.87l2.87-2.8a.68.68 0 0 0 0-.98.68.68 0 0 0-.98 0l-1.95 1.8a1.1 1.1 0 0 1-1.5-.02l-1.82-1.82a.7.7 0 0 0-1 0 .68.68 0 0 0 0 .98l1.93 1.9a1.1 1.1 0 0 1-.77 1.88H8.45a1.1 1.1 0 1 1 0-2.2h1.62l-1.1-1.1a2.2 2.2 0 0 1 0-3.16Z"
        fill="rgba(255,255,255,0.98)"
      />
      <path
        d="M11.1 21.5c2.2 1.36 5.1 1.48 7.45.23"
        stroke="#a9efe8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.4 8.1 23.2 9.85 25 10.65 23.2 11.45 22.4 13.2 21.58 11.45 19.8 10.65 21.58 9.85Z"
        fill="#d7f8f2"
      />
      <defs>
        <linearGradient id={gradientId} x1="4.5" y1="4.5" x2="27.5" y2="27.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#18a39b" />
          <stop offset="1" stopColor="#0f5f59" />
        </linearGradient>
        <linearGradient id={orbitId} x1="7.5" y1="9.5" x2="24.5" y2="24.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#8fe4dd" stopOpacity="0.65" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandWordmark() {
  return (
    <span className="brand-wordmark" aria-label="QXwap">
      <BrandMark size={28} />
      <span className="brand-wordmark-text">
        <span className="brand-wordmark-qx">QX</span>
        <span className="brand-wordmark-wap">wap</span>
      </span>
    </span>
  );
}
