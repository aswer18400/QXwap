import React from "react";

export function NavButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactElement;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "active" : ""}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {React.cloneElement(icon, { size: 21 } as any)}
      <span>{label}</span>
    </button>
  );
}
