"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";

/** How close to the end (in px) still counts as "reading the latest message". */
const PINNED_THRESHOLD_PX = 80;
/** Share of the remaining distance covered each frame: eases out without restarting on every streamed token. */
const EASING_FACTOR = 0.2;
const SETTLED_DISTANCE_PX = 1;

interface FollowBottom {
  /** Follow the conversation again, e.g. after the volunteer sends a message. */
  pin: () => void;
}

/**
 * Keeps the end of the conversation visible above the sticky composer while replies stream in.
 * Scrolling up releases it; scrolling back down to the end picks it up again.
 */
export function useFollowBottom(
  contentRef: RefObject<HTMLElement | null>,
  composerRef: RefObject<HTMLElement | null>,
  active: boolean,
): FollowBottom {
  const pinnedRef = useRef(true);
  const frameRef = useRef<number | null>(null);

  const distanceToEnd = useCallback((): number => {
    const content = contentRef.current;
    const composer = composerRef.current;
    if (!content || !composer) return 0;
    return content.getBoundingClientRect().bottom - composer.getBoundingClientRect().top;
  }, [contentRef, composerRef]);

  const follow = useCallback((): void => {
    if (frameRef.current !== null) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const step = (): void => {
      const distance = distanceToEnd();
      if (!pinnedRef.current || distance <= SETTLED_DISTANCE_PX) {
        frameRef.current = null;
        return;
      }
      window.scrollBy({ top: reduceMotion ? distance : Math.max(distance * EASING_FACTOR, SETTLED_DISTANCE_PX), behavior: "instant" });
      frameRef.current = window.requestAnimationFrame(step);
    };
    frameRef.current = window.requestAnimationFrame(step);
  }, [distanceToEnd]);

  const pin = useCallback((): void => {
    pinnedRef.current = true;
    follow();
  }, [follow]);

  useEffect(() => {
    const content = contentRef.current;
    const composer = composerRef.current;
    if (!active || !content || !composer) return;

    let lastScrollY = window.scrollY;
    const onScroll = (): void => {
      const scrolledUp = window.scrollY < lastScrollY;
      lastScrollY = window.scrollY;
      // Our own easing only ever scrolls down, so moving up is always the volunteer reading back.
      if (scrolledUp) pinnedRef.current = false;
      else if (distanceToEnd() <= PINNED_THRESHOLD_PX) pinnedRef.current = true;
    };

    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) follow();
    });
    observer.observe(content);
    observer.observe(composer);
    window.addEventListener("scroll", onScroll, { passive: true });
    follow();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [active, contentRef, composerRef, distanceToEnd, follow]);

  return { pin };
}
