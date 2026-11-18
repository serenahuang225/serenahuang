"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * A little hole at the very bottom of the page. Clicking it "falls in":
 * darkness spreads out of the hole until it swallows the page, then the
 * visitor lands in the underground world.
 */
export default function FallHole() {
  const router = useRouter();
  const hole = useRef<HTMLAnchorElement>(null);
  const [fall, setFall] = useState<{ x: number; y: number } | null>(null);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // let new-tab clicks and reduced motion go straight through
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    const r = hole.current?.getBoundingClientRect();
    setFall({ x: r ? r.left + r.width / 2 : window.innerWidth / 2, y: r ? r.top + r.height / 2 : window.innerHeight });
    window.setTimeout(() => router.push("/underground"), 1050);
  };

  return (
    <div className="fall-hole-wrap">
      <Link
        ref={hole}
        href="/underground"
        className={`fall-hole ${fall ? "is-falling" : ""}`}
        onClick={onClick}
        aria-label="Fall into the hole and explore the glowing world underneath"
      >
        <span className="fall-hole-pit" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </Link>
      <span className="fall-hole-note" aria-hidden="true">
        something glows down there…
      </span>
      {fall && (
        <div
          className="fall-hole-swallow"
          style={{ "--fx": `${fall.x}px`, "--fy": `${fall.y}px` } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
