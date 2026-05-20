import { useEffect, useRef } from "react";
import type React from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function useDialogA11y(onClose: () => void) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (node) => !node.hasAttribute("hidden") && node.tabIndex !== -1
      );
      if (!focusables.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>("[autofocus], button, input, select, textarea");
      preferred?.focus();
      if (!preferred) dialogRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose]);

  function onBackdropMouseDown(event: React.MouseEvent<HTMLElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return { dialogRef, onBackdropMouseDown };
}
