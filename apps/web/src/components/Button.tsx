import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export function Button({
  children,
  variant = "primary",
  size = "md",
  wide = false,
  active = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  wide?: boolean;
  active?: boolean;
}) {
  const classes = [
    variant,
    wide ? "wide" : "",
    active ? "active" : "",
    size === "sm" ? "xwap-btn--sm" : "",
    className || ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button {...props} className={classes}>
      {children}
    </button>
  );
}
