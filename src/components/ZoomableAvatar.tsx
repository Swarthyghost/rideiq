"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Wraps Avatar so clicking it grows the exact same image, in place, into a
 * large centered circle (a FLIP animation from the thumbnail's own
 * bounding rect), then shrinks back into that same corner on cancel --
 * never a new tab, never a differently-cropped image.
 */
export function ZoomableAvatar({
  name,
  photoUrl,
  size = 42,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const thumbRef = useRef<HTMLButtonElement>(null);
  const [rendered, setRendered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [startRect, setStartRect] = useState<Rect | null>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openZoom() {
    const el = thumbRef.current;
    if (!el) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);

    const box = el.getBoundingClientRect();
    const bigSize = Math.min(280, window.innerWidth - 80, window.innerHeight - 220);
    const centerLeft = (window.innerWidth - bigSize) / 2;
    const centerTop = (window.innerHeight - bigSize) / 2 - 24;

    setStartRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    setTargetRect({ top: centerTop, left: centerLeft, width: bigSize, height: bigSize });
    setRendered(true);
    setExpanded(false);

    // Double rAF: let the overlay paint at the thumbnail's exact rect first,
    // then flip the style so the transition actually animates.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setExpanded(true));
    });
  }

  function closeZoom() {
    setExpanded(false);
    closeTimer.current = setTimeout(() => setRendered(false), 300);
  }

  useEffect(() => {
    if (!rendered) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeZoom();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rendered]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const rect = expanded ? targetRect : startRect;

  return (
    <>
      <button
        ref={thumbRef}
        type="button"
        onClick={openZoom}
        className="rounded-full cursor-pointer flex-shrink-0"
        aria-label={`View ${name}'s photo`}
      >
        <Avatar name={name} photoUrl={photoUrl} size={size} />
      </button>

      {rendered && rect && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/50"
            style={{ opacity: expanded ? 1 : 0, transition: "opacity 280ms ease" }}
            onClick={closeZoom}
          />

          <div
            className="fixed rounded-full overflow-hidden shadow-2xl ring-4 ring-white"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              transition: "top 280ms ease, left 280ms ease, width 280ms ease, height 280ms ease",
            }}
          >
            <Avatar name={name} photoUrl={photoUrl} size={Math.max(rect.width, rect.height)} />
          </div>

          {targetRect && (
            <button
              type="button"
              onClick={closeZoom}
              className="fixed bg-white text-[#3a3630] font-bold text-[13.5px] rounded-full px-5 py-2.5 shadow-lg cursor-pointer hover:bg-panel"
              style={{
                top: targetRect.top + targetRect.height + 20,
                left: targetRect.left + targetRect.width / 2,
                transform: "translateX(-50%)",
                opacity: expanded ? 1 : 0,
                pointerEvents: expanded ? "auto" : "none",
                transition: "opacity 200ms ease",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </>
  );
}
