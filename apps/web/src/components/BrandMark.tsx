export function BrandMark({ size = 28 }: { size?: number }) {
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
      <rect x="2" y="2" width="28" height="28" rx="10" fill="url(#qxwap-brand-gradient)" />
      <path
        d="M10.25 12.2c1.4-1.47 3.87-1.47 5.27 0l.48.5.5-.5c1.4-1.47 3.85-1.47 5.25 0 1.44 1.5 1.44 3.92 0 5.41l-3.66 3.8a2.5 2.5 0 0 1-3.62 0l-3.72-3.86c-1.44-1.5-1.44-3.92 0-5.35Z"
        fill="white"
        fillOpacity="0.96"
      />
      <path
        d="m12.62 15.36 1.8 1.88c.9.94 2.38.94 3.28 0l1.74-1.82"
        stroke="#6154FF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="qxwap-brand-gradient" x1="4.5" y1="4.5" x2="27.5" y2="27.5" gradientUnits="userSpaceOnUse">
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
