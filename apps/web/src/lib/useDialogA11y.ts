import { useEffect, useRef } from "react";
import type React from "react";

export function useDialogA11y(onClose: () => void) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  function onBackdropMouseDown(event: React.MouseEvent<HTMLElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return { dialogRef, onBackdropMouseDown };
}
