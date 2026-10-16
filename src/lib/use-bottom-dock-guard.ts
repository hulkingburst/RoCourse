"use client";

import * as React from "react";

/**
 * How tall the strip at the bottom of the viewport is — the space the floating
 * actions occupy plus the gap above them.
 */
const BAND_PX = 72;

/** Anything that must stay tappable marks itself with this attribute. */
export const KEEP_CLEAR_ATTR = "data-keep-clear";

/**
 * True while something marked `data-keep-clear` sits inside the bottom band of
 * the viewport.
 *
 * The floating actions live in that band, which on a phone is exactly where a
 * lesson's Continue button (and the completion screen's "next lesson") ends up
 * — the last row of the page, right in the corner the widget owns. Instead of
 * nudging either element, the widget watches this and yields: while the strip
 * holds something the learner has to tap, the floating actions fade out and
 * stop taking pointers, and they come back the moment the strip is clear.
 *
 * It deliberately knows nothing about layout: the elements opt in with the
 * attribute, the band is measured from the live viewport (so mobile browser
 * chrome appearing or a rotation moves it), and elements mounted after the
 * shell — the lesson's own action row — are picked up as they appear.
 */
export function useBottomDockGuard(): boolean {
  const [occupied, setOccupied] = React.useState(false);
  // Distance from the top of the viewport down to the band, used as a negative
  // root margin so the observer's root is the bottom BAND_PX strip alone.
  const [bandOffset, setBandOffset] = React.useState(() =>
    typeof window === "undefined" ? 0 : Math.max(0, window.innerHeight - BAND_PX)
  );

  React.useEffect(() => {
    const measure = () => setBandOffset(Math.max(0, window.innerHeight - BAND_PX));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const inBand = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inBand.set(entry.target, entry.isIntersecting);
        }
        setOccupied([...inBand.values()].some(Boolean));
      },
      { rootMargin: `-${bandOffset}px 0px 0px 0px`, threshold: 0 }
    );

    const observed = new Set<Element>();
    const scan = () => {
      for (const element of document.querySelectorAll(`[${KEEP_CLEAR_ATTR}]`)) {
        if (observed.has(element)) continue;
        observed.add(element);
        inBand.set(element, false);
        observer.observe(element);
      }
    };
    scan();

    // Lesson routes mount their action row after the shell renders, and the
    // completion screen swaps a different row in, so watch for new markers
    // rather than scanning on navigation alone.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (
            node.matches(`[${KEEP_CLEAR_ATTR}]`) ||
            node.querySelector(`[${KEEP_CLEAR_ATTR}]`)
          ) {
            scan();
            return;
          }
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [bandOffset]);

  return occupied;
}
