"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { photos, type Photo } from "@/content/serena";
import { pad2 } from "@/lib/format";

/** Photos per ribbon (row), and how many show before "Explore all". */
const PER_ROW = 4;
const FIRST_SHOWN = 8;

/**
 * "Through my eyes": rows of photos. With a mouse, hovering one makes its row
 * taller and that photo wider. Clicking opens it full size (onOpen).
 */
export default function PhotoGallery({
  onOpen,
}: {
  onOpen: (photo: Photo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // the photo being hovered (by its src), which the CSS enlarges
  const [active, setActive] = useState<string | null>(null);
  const visible = expanded ? photos : photos.slice(0, FIRST_SHOWN);
  const rows = Array.from({ length: Math.ceil(visible.length / PER_ROW) }, (_, i) =>
    visible.slice(i * PER_ROW, (i + 1) * PER_ROW),
  );
  return (
    <>
      <div className="photo-ribbons">
        {rows.map((row, r) => (
          <div
            className={`photo-ribbon ${row.some((p) => p.src === active) ? "ribbon-active" : ""}`}
            key={r}
            onPointerLeave={() => setActive(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setActive(null);
            }}
          >
            {row.map((photo, i) => (
              <button
                className={`photo-preview ${active === photo.src ? "photo-preview-active" : ""}`}
                key={photo.src}
                data-cursor-label="View"
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setActive(photo.src);
                }}
                onFocus={() => {
                  if (matchMedia("(hover: hover)").matches)
                    setActive(photo.src);
                }}
                onClick={() => onOpen(photo)}
              >
                <img src={photo.src} alt={photo.alt} loading="lazy" />
                <span>
                  <small>{pad2(r * PER_ROW + i + 1)}</small>
                  {photo.caption}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {photos.length > FIRST_SHOWN && (
        <button
          className="gallery-toggle"
          onClick={() => {
            setExpanded(!expanded);
            setActive(null);
          }}
          aria-expanded={expanded}
        >
          {expanded
            ? "Show fewer photographs"
            : `Explore all ${photos.length} photographs`}
          <Plus size={16} />
        </button>
      )}
    </>
  );
}
