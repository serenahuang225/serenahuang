"use client";
import { useEffect, useRef } from "react";
/**
 * A custom cursor for mice: a dot that follows exactly and a ring that trails
 * behind, growing (with a label like "View") over things you can click.
 * Setting html[data-cursor="silver"] hides the normal cursor (see globals.css).
 * Never used for touch, keyboard use, text fields, or with motion off.
 */
export default function SilverCursor({ still }: { still: boolean }) {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = matchMedia("(pointer: fine) and (hover: hover)");
    if (still || !media.matches) return;
    // the mouse (x, y) and the trailing ring (rx, ry)
    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let frame = 0;
    const hide = () => {
      document.documentElement.removeAttribute("data-cursor");
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== "mouse") {
        hide();
        return;
      }
      const first = !document.documentElement.hasAttribute("data-cursor");
      x = event.clientX;
      y = event.clientY;
      if (first) {
        rx = x;
        ry = y;
      }
      document.documentElement.dataset.cursor = "silver";
      const target = event.target as Element;
      const interactive = target.closest("a,button,summary");
      const editing = target.closest("input,textarea,[contenteditable=true]");
      if (editing) {
        hide();
        return;
      }
      if (ring.current) {
        // the ring's label: an explicit data-cursor-label, else a sensible default
        ring.current.dataset.interactive = String(!!interactive);
        ring.current.textContent =
          interactive?.getAttribute("data-cursor-label") ||
          (interactive?.classList.contains("project")
            ? "View"
            : interactive?.tagName === "SUMMARY"
              ? "Read"
              : "");
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    // ease the ring toward the mouse; stop animating once it has caught up
    const draw = () => {
      rx += (x - rx) * 0.24;
      ry += (y - ry) * 0.24;
      if (ring.current)
        ring.current.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      if (dot.current)
        dot.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      frame =
        Math.abs(x - rx) + Math.abs(y - ry) > 0.2
          ? requestAnimationFrame(draw)
          : 0;
    };
    const change = () => {
      if (!media.matches) hide();
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    document.addEventListener("keydown", hide);
    media.addEventListener("change", change);
    return () => {
      hide();
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      document.removeEventListener("keydown", hide);
      media.removeEventListener("change", change);
    };
  }, [still]);
  return (
    <>
      <div ref={ring} className="silver-cursor-ring" aria-hidden="true" />
      <div ref={dot} className="silver-cursor-dot" aria-hidden="true" />
    </>
  );
}
