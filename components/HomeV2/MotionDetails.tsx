"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native disclosure first; enhance only after hydration, without delaying open. */
export default function MotionDetails({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const setContentInert = (closed: boolean) => {
      const summary = details.querySelector(":scope > summary");
      if (closed && details.contains(document.activeElement) && document.activeElement !== summary) {
        (summary as HTMLElement | null)?.focus({ preventScroll: true });
      }
      for (const child of Array.from(details.children)) {
        if (child instanceof HTMLElement && child.tagName !== "SUMMARY") child.inert = closed;
      }
    };
    const sync = () => setContentInert(!details.open);
    const beforeToggle = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return;
      const summary = event.target.closest("summary");
      if (summary?.parentElement === details) setContentInert(details.open);
    };
    sync();
    details.dataset.motionReady = "true";
    details.addEventListener("click", beforeToggle, true);
    details.addEventListener("toggle", sync);
    // Also cover programmatic open changes and server-rendered child updates.
    const observer = new MutationObserver(sync);
    observer.observe(details, { attributes: true, attributeFilter: ["open"], childList: true });
    return () => {
      observer.disconnect();
      details.removeEventListener("click", beforeToggle, true);
      details.removeEventListener("toggle", sync);
      delete details.dataset.motionReady;
      setContentInert(false);
    };
  }, []);

  return <details ref={ref} className={`motion-details ${className}`.trim()}>{children}</details>;
}
