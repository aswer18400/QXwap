import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  interactive = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      {...props}
      className={["card-panel", interactive ? "app-card--interactive" : "", className || ""].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
