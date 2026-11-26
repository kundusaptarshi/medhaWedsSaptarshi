export type RevealDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'bottom-left'
  | 'bottom-right';

export interface SimpleRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/**
 * Returns the GPU-composited hidden CSS transform for a given reveal direction.
 * Offsets are kept crisp and expressive without pushing narrow mobile elements
 * completely outside small viewports.
 */
export function getRevealHiddenTransform(
  from: RevealDirection,
  isCompactViewport = false
): string {
  const x = isCompactViewport ? 48 : 88;
  const y = isCompactViewport ? 28 : 40;

  switch (from) {
    case 'left':
      return `translate3d(-${x}px, 0, 0)`;
    case 'right':
      return `translate3d(${x}px, 0, 0)`;
    case 'down':
      return `translate3d(0, -${y}px, 0) scale(0.97)`;
    case 'bottom-left':
      return `translate3d(-${x}px, ${y}px, 0) scale(0.96)`;
    case 'bottom-right':
      return `translate3d(${x}px, ${y}px, 0) scale(0.96)`;
    case 'up':
    default:
      return `translate3d(0, ${y}px, 0) scale(0.97)`;
  }
}

export const REVEAL_VISIBLE_TRANSFORM = 'translate3d(0, 0, 0) scale(1)';

/**
 * Checks whether an untransformed wrapper rect overlaps the visible viewport
 * (or has already scrolled past the top edge) so reveal elements never remain
 * stuck at opacity 0 on tall blocks or rapid scrolls.
 */
export function isElementRectInViewport(
  rect: SimpleRect,
  viewportHeight: number,
  viewportWidth: number,
  marginPx = 16
): boolean {
  if (viewportHeight <= 0 || viewportWidth <= 0) return true;
  if (rect.width === 0 && rect.height === 0) return false;
  const verticallyVisible =
    rect.bottom >= -marginPx && rect.top <= viewportHeight + marginPx;
  const horizontallyVisible =
    rect.right >= -marginPx && rect.left <= viewportWidth + marginPx;
  return verticallyVisible && horizontallyVisible;
}

/**
 * Determines whether a reveal wrapper should bypass initial hidden state
 * (e.g. prefers-reduced-motion or environments without IntersectionObserver).
 */
export function shouldBypassRevealMotion(
  prefersReducedMotion: boolean,
  hasIntersectionObserver: boolean,
  hasExplicitForceVisible: boolean
): boolean {
  if (prefersReducedMotion) return true;
  if (!hasExplicitForceVisible && !hasIntersectionObserver) return true;
  return false;
}
