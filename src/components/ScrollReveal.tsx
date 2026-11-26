import React, { useEffect, useRef, useState } from 'react';
import {
  getRevealHiddenTransform,
  isElementRectInViewport,
  REVEAL_VISIBLE_TRANSFORM,
  shouldBypassRevealMotion,
  type RevealDirection,
} from '../utils/scrollRevealLogic';

interface RevealFromSideProps {
  from: RevealDirection;
  delayMs?: number;
  durationMs?: number;
  className?: string;
  innerClassName?: string;
  forceVisible?: boolean;
  children: React.ReactNode;
}

/**
 * Silky GPU-composited multi-directional entrance choreography.
 *
 * Key reliability guarantees:
 * 1. Observes an UNTRANSFORMED outer anchor so side-slide translateX offsets
 *    never push the element outside IntersectionObserver bounds on mobile.
 * 2. Uses a double-requestAnimationFrame paint latch whenever `forceVisible`
 *    becomes true (including when a cinema scene flips from `visibility: hidden`
 *    to `visibility: visible`), ensuring CSS transform + opacity transitions
 *    reliably fire instead of snapping instantaneously.
 * 3. Waits for outgoing scene crossfade before re-arming hidden pose so leaving
 *    a scene never flashes blank, while re-entering replays the side-reveal.
 * 4. Includes synchronous viewport checks, scroll/resize listeners, reduced-motion
 *    support, and a bounded safety fallback so no element can ever stay stuck at
 *    `opacity: 0`.
 */
export const RevealFromSide: React.FC<RevealFromSideProps> = ({
  from,
  delayMs = 0,
  durationMs = 820,
  className = '',
  innerClassName = '',
  forceVisible,
  children,
}) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  // Start hidden when animation is enabled so the first reveal smoothly slides in.
  const [inView, setInView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return Boolean(forceVisible);
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) {
      return forceVisible === undefined ? true : forceVisible;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setPrefersReducedMotion(mq?.matches ?? false);
    const syncWidth = () => setIsCompactViewport(window.innerWidth < 640);
    syncMotion();
    syncWidth();
    mq?.addEventListener?.('change', syncMotion);
    window.addEventListener('resize', syncWidth, { passive: true });
    return () => {
      mq?.removeEventListener?.('change', syncMotion);
      window.removeEventListener('resize', syncWidth);
    };
  }, []);

  useEffect(() => {
    const hasIO = typeof IntersectionObserver !== 'undefined';
    const hasForce = forceVisible !== undefined;

    if (shouldBypassRevealMotion(prefersReducedMotion, hasIO, hasForce)) {
      setInView(hasForce ? Boolean(forceVisible) : true);
      return;
    }

    // Controlled mode (used by fixed-viewport cinema scenes & curtain reveal):
    // Double-rAF ensures the browser commits the hidden side-offset pose AFTER
    // any parent `visibility: hidden -> visible` flip before transitioning in.
    if (hasForce) {
      if (!forceVisible) {
        // Wait until the 440ms scene crossfade completes before silently re-arming
        // the hidden pose so outgoing scenes never pop blank mid-transition.
        const resetTimer = window.setTimeout(() => setInView(false), 460);
        return () => window.clearTimeout(resetTimer);
      }

      let raf1: number | null = null;
      let raf2: number | null = null;
      const safetyTimer = window.setTimeout(() => setInView(true), 120);

      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setInView(true);
        });
      });

      return () => {
        if (raf1 !== null) window.cancelAnimationFrame(raf1);
        if (raf2 !== null) window.cancelAnimationFrame(raf2);
        window.clearTimeout(safetyTimer);
      };
    }

    // Autonomous scroll mode (untransformed anchor observed against viewport)
    const node = anchorRef.current;
    if (!node) {
      setInView(true);
      return;
    }

    const checkRect = () => {
      const rect = node.getBoundingClientRect();
      if (
        isElementRectInViewport(
          rect,
          window.innerHeight || 900,
          window.innerWidth || 1440,
          24
        )
      ) {
        setInView(true);
        return true;
      }
      return false;
    };

    let rafId: number | null = null;
    if (checkRect()) {
      // Wait 1 paint so elements visible at initial load still glide cleanly in
      setInView(false);
      rafId = window.requestAnimationFrame(() => {
        setInView(true);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setInView(true);
          } else if (
            !entry.isIntersecting &&
            entry.boundingClientRect.top > (window.innerHeight || 900)
          ) {
            // Only reset when scrolled back well above the element so elements
            // already read above never vanish unexpectedly
            setInView(false);
          }
        }
      },
      {
        rootMargin: '0px 0px -2% 0px',
        threshold: [0, 0.01, 0.1],
      }
    );

    observer.observe(node);

    const onScrollOrResize = () => {
      checkRect();
    };
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    // Safety fallback: never leave an in-viewport element stuck at opacity 0
    const safetyFallback = window.setTimeout(() => {
      if (checkRect()) {
        setInView(true);
      }
    }, 900);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.clearTimeout(safetyFallback);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      observer.disconnect();
    };
  }, [forceVisible, prefersReducedMotion]);

  const hiddenTransform = getRevealHiddenTransform(from, isCompactViewport);
  const effectiveVisible = prefersReducedMotion
    ? forceVisible === undefined
      ? true
      : forceVisible
    : inView;

  return (
    <div
      ref={anchorRef}
      data-reveal-from={from}
      data-reveal-state={effectiveVisible ? 'visible' : 'hidden'}
      className={className}
    >
      <div
        className={innerClassName}
        style={{
          transform: effectiveVisible ? REVEAL_VISIBLE_TRANSFORM : hiddenTransform,
          opacity: effectiveVisible ? 1 : 0,
          transitionProperty: prefersReducedMotion ? 'none' : 'transform, opacity',
          transitionDuration: prefersReducedMotion
            ? '0ms'
            : effectiveVisible
              ? `${durationMs}ms`
              : '0ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay:
            !prefersReducedMotion && effectiveVisible ? `${delayMs}ms` : '0ms',
          willChange: prefersReducedMotion ? undefined : 'transform, opacity',
        }}
      >
        {children}
      </div>
    </div>
  );
};
