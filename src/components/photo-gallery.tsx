"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { photos, type Photo } from "@/content/serena";
export default function PhotoGallery({
  onOpen,
}: {
  onOpen: (photo: Photo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const visible = expanded ? photos : photos.slice(0, 8);
  const rows = Array.from({ length: Math.ceil(visible.length / 4) }, (_, i) =>
    visible.slice(i * 4, i * 4 + 4),
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
                  <small>{String(r * 4 + i + 1).padStart(2, "0")}</small>
                  {photo.caption}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {photos.length > 8 && (
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
