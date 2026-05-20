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

export function useDialogA11y(onClose: () => void, enabled = true) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const previousFocus = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const backdrop = dialogRef.current?.parentElement || null;
    const hiddenSiblings =
      backdrop?.parentElement
        ? Array.from(backdrop.parentElement.children).filter(
            (node): node is HTMLElement => node instanceof HTMLElement && node !== backdrop
          )
        : [];
    const siblingState = hiddenSiblings.map((node) => ({
      node,
      ariaHidden: node.getAttribute("aria-hidden"),
      inert: node.inert
    }));
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    hiddenSiblings.forEach((node) => {
      node.setAttribute("aria-hidden", "true");
      node.inert = true;
    });

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
      siblingState.forEach(({ node, ariaHidden, inert }) => {
        if (ariaHidden === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", ariaHidden);
        node.inert = inert;
      });
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [enabled, onClose]);

  function onBackdropMouseDown(event: React.MouseEvent<HTMLElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return { dialogRef, onBackdropMouseDown };
}
