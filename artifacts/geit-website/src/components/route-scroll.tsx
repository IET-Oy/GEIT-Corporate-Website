import { useLayoutEffect } from "react";
import { useLocation } from "wouter";

export function RouteScroll() {
  const [path] = useLocation();
  useLayoutEffect(() => {
    const scroll = () => {
      let anchor = "";
      try { anchor = decodeURIComponent(window.location.hash.slice(1)); } catch { /* Ignore malformed fragments. */ }
      const target = anchor && document.getElementById(anchor);
      if (target) {
        target.scrollIntoView({ block: "start" });
        target.focus({ preventScroll: true });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    };
    const frame = requestAnimationFrame(scroll);
    window.addEventListener("hashchange", scroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scroll);
    };
  }, [path]);
  return null;
}
