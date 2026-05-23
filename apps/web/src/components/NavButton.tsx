import React from "react";

export function NavButton({
  active,
  icon,
  label,
  onClick,
  className
}: {
  active: boolean;
  icon: React.ReactElement;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`${className || ""}${active ? `${className ? " " : ""}active` : ""}`.trim()}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {React.cloneElement(icon, { size: 21 } as any)}
      <span>{label}</span>
    </button>
  );
}
