import type { ReactNode } from "react";

export function SearchFilterBar({
  value,
  placeholder,
  onChange,
  onSubmit,
  leading,
  trailing,
  autoFocus = false,
  className
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <label className={["searchbox", className || ""].filter(Boolean).join(" ")}>
      {leading}
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <button type="button" className="searchbox-trailing" onClick={onSubmit} aria-label="ค้นหา">
        {trailing}
      </button>
    </label>
  );
}
