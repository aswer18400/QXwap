import type { ButtonHTMLAttributes } from "react";

export function FilterChip({
  active = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      {...props}
      type={props.type || "button"}
      className={["app-filter-chip", active ? "active" : "", className || ""].filter(Boolean).join(" ")}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
