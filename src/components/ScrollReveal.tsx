import React, { useEffect, useRef, useState } from 'react';

interface RevealFromSideProps {
  from: 'left' | 'right' | 'up' | 'down' | 'bottom-left' | 'bottom-right';
  delayMs?: number;
  className?: string;
  forceVisible?: boolean;
  children: React.ReactNode;
}

/**
 * Silky GPU-composited multi-directional entrance choreography.
 * Slides elements smoothly into place from the left, right, top, bottom, or
 * diagonal corners whenever their section enters the viewport, and resets
 * cleanly when scrolled well out of view so revisiting sections replays the
 * graceful entrance.
 */
export const RevealFromSide: React.FC<RevealFromSideProps> = ({
  from,
  delayMs = 0,
  className = '',
  forceVisible,
  children,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(Boolean(forceVisible));

  useEffect(() => {
    if (forceVisible !== undefined) {
      setInView(forceVisible);
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.14) {
            setInView(true);
          } else if (!entry.isIntersecting && entry.intersectionRatio === 0) {
            setInView(false);
          }
        }
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: [0, 0.14, 0.28],
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [forceVisible]);

  const hiddenTransform =
    from === 'left'
      ? '-translate-x-28 sm:-translate-x-44 opacity-0'
      : from === 'right'
        ? 'translate-x-28 sm:translate-x-44 opacity-0'
        : from === 'down'
          ? '-translate-y-12 scale-[0.96] opacity-0'
          : from === 'bottom-left'
            ? '-translate-x-24 sm:-translate-x-44 translate-y-12 scale-[0.95] opacity-0'
            : from === 'bottom-right'
              ? 'translate-x-24 sm:translate-x-44 translate-y-12 scale-[0.95] opacity-0'
              : 'translate-y-10 scale-[0.96] opacity-0';

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delayMs}ms` : '0ms' }}
      className={`transition-[transform,opacity] duration-[950ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        inView
          ? 'translate-x-0 translate-y-0 scale-100 opacity-100'
          : hiddenTransform
      } ${className}`}
    >
      {children}
    </div>
  );
};
