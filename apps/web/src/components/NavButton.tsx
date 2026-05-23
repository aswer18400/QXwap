import React from "react";

export function NavButton({
  active,
  icon,
  label,
  iconSize = 21,
  onClick,
  className
}: {
  active: boolean;
  icon: React.ReactElement;
  label: string;
  iconSize?: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={`${className || ""}${active ? `${className ? " " : ""}active` : ""}`.trim()}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {React.cloneElement(icon, { size: iconSize } as any)}
      <span>{label}</span>
    </button>
  );
}
