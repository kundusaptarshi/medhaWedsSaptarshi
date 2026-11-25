export type CascadeSectionKind =
  | 'hero'
  | 'story'
  | 'couple'
  | 'celebrations'
  | 'countdown'
  | 'closing';

export interface CascadeSectionMeta {
  id: string;
  kind: CascadeSectionKind;
  label: string;
  theme: 'maroon' | 'yellow';
  singleScreen: boolean;
}

/**
 * Builds the canonical ordered list of cascading chapters for the main wedding
 * invitation experience. Every chapter fits cleanly within a single screen
 * except "celebrations", which scrolls smoothly through all invited events.
 */
export function buildInviteCascadeSections(
  eventCount: number,
  hasCountdown: boolean
): CascadeSectionMeta[] {
  const sections: CascadeSectionMeta[] = [
    {
      id: 'hero',
      kind: 'hero',
      label: 'Welcome',
      theme: 'maroon',
      singleScreen: true,
    },
    {
      id: 'bride-and-groom',
      kind: 'couple',
      label: 'Bride & Groom',
      theme: 'yellow',
      singleScreen: true,
    },
    {
      id: 'us-through-the-years',
      kind: 'story',
      label: 'Us Through The Years',
      theme: 'yellow',
      singleScreen: true,
    },
  ];

  if (eventCount > 0) {
    sections.push({
      id: 'the-celebrations',
      kind: 'celebrations',
      label: 'The Celebrations',
      theme: 'yellow',
      singleScreen: false,
    });
  }

  if (hasCountdown) {
    sections.push({
      id: 'countdown',
      kind: 'countdown',
      label: 'Countdown',
      theme: 'maroon',
      singleScreen: true,
    });
  }

  sections.push({
    id: 'closing',
    kind: 'closing',
    label: 'RSVP & Blessings',
    theme: 'yellow',
    singleScreen: true,
  });

  return sections;
}

/**
 * Picks the active chapter id from live IntersectionObserver visibility ratios,
 * falling back to the previously active id when none cross threshold.
 */
export function pickMostVisibleSectionId(
  sectionIds: string[],
  ratiosById: Record<string, number>,
  fallbackId: string
): string {
  let bestId = fallbackId;
  let bestRatio = -1;

  for (const id of sectionIds) {
    const ratio = ratiosById[id] ?? 0;
    if (ratio > bestRatio && ratio > 0.05) {
      bestRatio = ratio;
      bestId = id;
    }
  }

  return bestId;
}

/**
 * Picks the currently visible cascading section from non-sticky flow anchor Y
 * coordinates (relative to the viewport top). Because sticky sheets stay pinned
 * at y=0 even after later sheets cascade over them, the active section is the
 * last chapter in document order whose anchor has crossed the trigger line.
 */
export function pickActiveCascadeSectionFromOffsets(
  sectionIds: string[],
  anchorTopsById: Record<string, number>,
  triggerY: number,
  fallbackId: string
): string {
  if (sectionIds.length === 0) return fallbackId;

  let activeId = sectionIds[0];
  let matchedAny = false;

  for (const id of sectionIds) {
    const top = anchorTopsById[id];
    if (typeof top === 'number' && top <= triggerY) {
      activeId = id;
      matchedAny = true;
    }
  }

  return matchedAny ? activeId : fallbackId;
}

export interface SectionCrossfadeState {
  /** Opacity of this section as it crossfades into view (0.08 -> 1). */
  enterOpacity: number;
  /** Opacity of this section's inner content as the next section covers it (1 -> 0.1). */
  exitOpacity: number;
  /** Subtle cinematic scale recession as the next section covers it (1 -> 0.955). */
  exitScale: number;
  /** Gentle upward drift (px) as the next section cascades over it (0 -> -28). */
  exitTranslateY: number;
  /** True once the next section has completely covered this sticky sheet. */
  isFullyCovered: boolean;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Computes continuous scroll-linked crossfade & depth values for a cascading
 * section based on its own flow-anchor Y coordinate and the next section's
 * flow-anchor Y coordinate relative to the viewport top.
 */
export function computeSectionCrossfadeState(
  anchorTop: number,
  nextAnchorTop: number | null,
  viewportHeight: number,
  isFirstSection: boolean
): SectionCrossfadeState {
  const vh = Math.max(1, viewportHeight);

  // Incoming crossfade as this section rises from bottom edge into full screen
  let enterOpacity = 1;
  if (!isFirstSection) {
    const enterProgress = clamp01((vh - anchorTop) / (vh * 0.72));
    enterOpacity = Number((0.06 + 0.94 * smoothstep(enterProgress)).toFixed(4));
  }

  // Outgoing crossfade + gentle recession as the next section glides over this one
  let exitOpacity = 1;
  let exitScale = 1;
  let exitTranslateY = 0;
  let isFullyCovered = false;

  if (nextAnchorTop !== null) {
    const coverProgress = clamp01((vh - nextAnchorTop) / (vh * 0.85));
    const easedCover = smoothstep(coverProgress);
    exitOpacity = Number((1 - 0.9 * easedCover).toFixed(4));
    exitScale = Number((1 - 0.045 * easedCover).toFixed(4));
    exitTranslateY = Number((-28 * easedCover).toFixed(2));
    // Only mark fully covered once the next sheet has completely reached y <= 2
    isFullyCovered = nextAnchorTop <= 2;
  }

  return {
    enterOpacity,
    exitOpacity,
    exitScale,
    exitTranslateY,
    isFullyCovered,
  };
}

/**
 * Computes a continuous vertical scroll offset (px) for a cascading section
 * so parallax layers rest at exact 0px when the section is parked in view
 * and glide smoothly both while entering from below and while the next
 * section rises over it.
 */
export function computeSectionParallaxInput(
  anchorTop: number,
  nextAnchorTop: number | null,
  viewportHeight: number
): number {
  const vh = Math.max(1, viewportHeight);
  if (anchorTop > 0) {
    return anchorTop;
  }
  if (nextAnchorTop !== null && nextAnchorTop < vh) {
    return nextAnchorTop - vh;
  }
  return Math.max(-vh * 0.4, anchorTop * 0.5);
}

/**
 * Maps a scroll offset (px relative to viewport rest position) and depth speed
 * into a clamped pixel translation for 60fps `translate3d(0, Ypx, 0)` parallax.
 * Negative speed lags behind scroll (background depth); positive speed glides
 * slightly ahead (foreground elevation).
 */
export function computeParallaxOffsetPx(
  offsetPx: number,
  viewportHeight: number,
  speed: number,
  maxShiftPx = 120
): number {
  const vh = Math.max(1, viewportHeight);
  const maxShift = Math.max(0, maxShiftPx);
  if (speed === 0 || maxShift === 0 || !Number.isFinite(offsetPx)) {
    return 0;
  }
  const normalized = Math.max(-1.5, Math.min(1.5, offsetPx / vh));
  const raw = normalized * vh * speed * 0.45;
  const clamped = Math.max(-maxShift, Math.min(maxShift, raw));
  const rounded = Number(clamped.toFixed(2));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export interface CinemaSceneMeta {
  id: string;
  chapterId:
    | 'hero'
    | 'us-through-the-years'
    | 'bride-and-groom'
    | 'the-celebrations'
    | 'countdown'
    | 'closing';
  kind: CascadeSectionKind;
  label: string;
  theme: 'maroon' | 'yellow';
  /** Index into invited eventDetails when kind === 'celebrations'. */
  eventIndex?: number;
}

/**
 * Builds the flat ordered sequence of full-viewport crossfade cinema scenes.
 * Every invited celebration event gets its own dedicated editorial showcase
 * scene so the guest never feels like a long webpage is scrolling down.
 */
export function buildCinemaScenes(
  eventTitles: string[],
  hasCountdown: boolean
): CinemaSceneMeta[] {
  const scenes: CinemaSceneMeta[] = [
    {
      id: 'hero',
      chapterId: 'hero',
      kind: 'hero',
      label: 'Welcome',
      theme: 'maroon',
    },
    {
      id: 'bride-and-groom',
      chapterId: 'bride-and-groom',
      kind: 'couple',
      label: 'Bride & Groom',
      theme: 'yellow',
    },
    {
      id: 'us-through-the-years',
      chapterId: 'us-through-the-years',
      kind: 'story',
      label: 'Us Through The Years',
      theme: 'yellow',
    },
  ];

  eventTitles.forEach((title, idx) => {
    scenes.push({
      id: `celebration-${idx}`,
      chapterId: 'the-celebrations',
      kind: 'celebrations',
      label: title,
      theme: 'yellow',
      eventIndex: idx,
    });
  });

  if (hasCountdown) {
    scenes.push({
      id: 'countdown',
      chapterId: 'countdown',
      kind: 'countdown',
      label: 'Countdown',
      theme: 'maroon',
    });
  }

  scenes.push({
    id: 'closing',
    chapterId: 'closing',
    kind: 'closing',
    label: 'RSVP & Blessings',
    theme: 'yellow',
  });

  return scenes;
}

export interface CinemaSceneTransitionState {
  /** Whether this fixed viewport scene should be visible in the compositor. */
  visible: boolean;
  /** Opacity of the full-viewport scene backdrop & container (0..1). */
  sheetOpacity: number;
  /** Opacity of the scene's inner editorial stage (dims gently as next scene dissolves in). */
  contentOpacity: number;
  /** Subtle cinematic lens scale (outgoing recedes 1 -> 0.968, incoming blooms 1.028 -> 1). */
  contentScale: number;
  /** Continuous vertical scroll offset (px) fed into internal parallax depth layers. */
  parallaxInputPx: number;
  /** Whether this scene currently receives pointer interaction. */
  interactive: boolean;
}

/**
 * Computes pure in-place crossfade compositing values for a fixed-viewport
 * cinema scene given a continuous scroll progress in [0, totalScenes - 1].
 *
 * The lower active scene (baseIdx) stays solid opaque underneath while its
 * inner content gently dissolves and recedes; the incoming higher scene
 * (baseIdx + 1) dissolves smoothly from opacity 0 -> 1 on top with zero
 * vertical page-edge sliding and zero mid-transition background washout.
 */
export function computeCinemaSceneTransition(
  sceneIndex: number,
  displayProgress: number,
  viewportHeight: number,
  totalScenes: number
): CinemaSceneTransitionState {
  const vh = Math.max(1, viewportHeight);
  const maxIndex = Math.max(0, totalScenes - 1);
  const clamped = Math.max(0, Math.min(maxIndex, displayProgress));
  const baseIdx = Math.min(maxIndex, Math.floor(clamped));
  const frac = clamped - baseIdx;
  const eased = smoothstep(frac);

  if (sceneIndex === baseIdx) {
    return {
      visible: true,
      sheetOpacity: 1,
      contentOpacity: Number((1 - 0.88 * eased).toFixed(4)),
      contentScale: Number((1 - 0.032 * eased).toFixed(4)),
      parallaxInputPx: Number((-frac * vh).toFixed(2)),
      interactive: frac < 0.5,
    };
  }

  if (sceneIndex === baseIdx + 1 && frac > 0.001) {
    return {
      visible: true,
      sheetOpacity: Number(eased.toFixed(4)),
      contentOpacity: 1,
      contentScale: Number((1 + 0.028 * (1 - eased)).toFixed(4)),
      parallaxInputPx: Number(((1 - frac) * vh).toFixed(2)),
      interactive: frac >= 0.5,
    };
  }

  return {
    visible: false,
    sheetOpacity: 0,
    contentOpacity: 0,
    contentScale: 1,
    parallaxInputPx: 0,
    interactive: false,
  };
}

/**
 * Computes the nearest canonical integer scene index to gently magnet-settle
 * onto once the user pauses scrolling mid-crossfade.
 */
export function computeMagneticSnapTarget(
  progress: number,
  totalScenes: number
): number {
  const maxIndex = Math.max(0, totalScenes - 1);
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(maxIndex, Math.round(progress)));
}

export interface SceneScrollBoundary {
  hasOverflow: boolean;
  atTop: boolean;
  atBottom: boolean;
  canScrollUp: boolean;
  canScrollDown: boolean;
}

/**
 * Inspects a scene's internal scroll container to determine whether the view
 * overflows the viewport and whether the user has reached its top or bottom
 * edge (within a small sub-pixel tolerance).
 */
export function getSceneScrollBoundary(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  tolerancePx = 4
): SceneScrollBoundary {
  const safeTop = Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0);
  const safeClient = Math.max(1, Number.isFinite(clientHeight) ? clientHeight : 1);
  const safeScroll = Math.max(
    safeClient,
    Number.isFinite(scrollHeight) ? scrollHeight : safeClient
  );
  const tol = Math.max(0, tolerancePx);
  const overflowPx = safeScroll - safeClient;
  const hasOverflow = overflowPx > tol;
  const atTop = safeTop <= tol;
  const atBottom = safeScroll - (safeTop + safeClient) <= tol;

  return {
    hasOverflow,
    atTop,
    atBottom,
    canScrollUp: hasOverflow && !atTop,
    canScrollDown: hasOverflow && !atBottom,
  };
}

export const DESKTOP_DIRECT_NAV_MIN_WIDTH = 768;

/**
 * Computes the effective scroll boundary for a cinema scene.
 * On desktop viewports (>= 768px), every invitation scene is composed to fit
 * within a single viewport so wheel/trackpad/keyboard scrolling advances
 * directly to the next or previous view on the first scroll without trapping
 * the user in minor vertical whitespace scroll.
 */
export function getEffectiveSceneScrollBoundary(
  sceneKind: CascadeSectionKind | undefined,
  viewportWidth: number,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  tolerancePx = 4
): SceneScrollBoundary {
  const raw = getSceneScrollBoundary(
    scrollTop,
    clientHeight,
    scrollHeight,
    tolerancePx
  );

  if (viewportWidth >= DESKTOP_DIRECT_NAV_MIN_WIDTH) {
    const safeClient = Math.max(1, Number.isFinite(clientHeight) ? clientHeight : 1);
    const safeScroll = Math.max(
      safeClient,
      Number.isFinite(scrollHeight) ? scrollHeight : safeClient
    );
    const overflowPx = safeScroll - safeClient;
    const minDirectHeight = sceneKind === 'celebrations' ? 520 : 580;
    // Any desktop scene that fits or has minor whitespace overflow steps
    // directly to the adjacent view rather than requiring extra inner scrolls.
    if (overflowPx <= 80 || safeClient >= minDirectHeight) {
      return {
        hasOverflow: false,
        atTop: true,
        atBottom: true,
        canScrollUp: false,
        canScrollDown: false,
      };
    }
  }

  return raw;
}

export interface WheelGestureState {
  lockedUntilMs: number;
  awaitingGestureEnd: boolean;
  lastEventMs: number;
  lastAbsDelta: number;
  lastDirection: 1 | -1 | 0;
  lastInnerScrollMs: number;
}

export function createInitialWheelGestureState(): WheelGestureState {
  return {
    lockedUntilMs: 0,
    awaitingGestureEnd: false,
    lastEventMs: -Infinity,
    lastAbsDelta: 0,
    lastDirection: 0,
    lastInnerScrollMs: -Infinity,
  };
}

export type SceneNavigationAction =
  | 'scroll-inner'
  | 'advance-next'
  | 'advance-prev'
  | 'consume';

export interface EvaluateWheelNavigationInput {
  deltaY: number;
  nowMs: number;
  currentIndex: number;
  totalScenes: number;
  boundary: SceneScrollBoundary;
  isAnimating?: boolean;
  transitionLockMs?: number;
  gestureIdleGapMs?: number;
  innerEdgePauseMs?: number;
}

export interface EvaluateWheelNavigationResult {
  action: SceneNavigationAction;
  nextState: WheelGestureState;
}

/**
 * Discrete, intensity-independent wheel/trackpad navigation state machine:
 * - While a scene transition is animating/locked OR the same scroll gesture
 *   (multi-notch hard mouse-wheel spin or trackpad momentum tail) is still
 *   emitting events in the same direction, excess events are unconditionally
 *   consumed so NO MATTER HOW HARD the user scrolls, a single scroll gesture
 *   NEVER advances more than +1 or -1 view.
 * - A new same-direction scroll is only accepted once the prior scroll stream
 *   has genuinely stopped for `gestureIdleGapMs`, or immediately after the lock
 *   expires if the user deliberately reverses direction.
 * - When the current view overflows and can still scroll in the requested
 *   direction, returns 'scroll-inner' so native page-like scroll runs smoothly.
 */
export function evaluateWheelNavigation(
  state: WheelGestureState,
  input: EvaluateWheelNavigationInput
): EvaluateWheelNavigationResult {
  const {
    deltaY,
    nowMs,
    currentIndex,
    totalScenes,
    boundary,
    isAnimating = false,
    transitionLockMs = 440,
    gestureIdleGapMs = 155,
    innerEdgePauseMs = 160,
  } = input;

  const absDelta = Math.abs(deltaY);
  // Ignore sub-threshold micro-jitter without extending lastEventMs so the
  // trailing 1-2px tail of macOS trackpad inertia lets the idle gap close.
  if (!Number.isFinite(deltaY) || absDelta < 3) {
    return { action: 'consume', nextState: state };
  }

  const direction: 1 | -1 = deltaY > 0 ? 1 : -1;
  const maxIndex = Math.max(0, totalScenes - 1);
  const gapSinceLast = nowMs - state.lastEventMs;

  // 1. Hard transition & animation lock window: unconditionally consume all
  //    wheel/momentum events and keep awaitingGestureEnd latched. Preserve the
  //    active gesture direction so micro-bounce never fakes a direction flip.
  if (isAnimating || nowMs < state.lockedUntilMs) {
    return {
      action: 'consume',
      nextState: {
        ...state,
        awaitingGestureEnd: true,
        lastEventMs: nowMs,
        lastAbsDelta: absDelta,
        lastDirection: state.lastDirection || direction,
      },
    };
  }

  // 2. Strict per-scroll gesture gate:
  //    After a scene advance (or hitting an inner-scroll edge), stay locked for
  //    the remainder of the current scroll stream (whether a hard mouse-wheel
  //    spin or long trackpad inertia tail) until wheel events genuinely pause
  //    for >= gestureIdleGapMs OR the user reverses scroll direction.
  if (state.awaitingGestureEnd) {
    const gestureEnded = gapSinceLast >= gestureIdleGapMs;
    const reversed = state.lastDirection !== 0 && direction !== state.lastDirection;

    if (!gestureEnded && !reversed) {
      return {
        action: 'consume',
        nextState: {
          ...state,
          lastEventMs: nowMs,
          lastAbsDelta: absDelta,
          lastDirection: direction,
        },
      };
    }
  }

  // 3. Internal page-like scroll if the current view still has content in this direction
  if (direction === 1 && boundary.canScrollDown) {
    return {
      action: 'scroll-inner',
      nextState: {
        ...state,
        awaitingGestureEnd: false,
        lastEventMs: nowMs,
        lastAbsDelta: absDelta,
        lastDirection: direction,
        lastInnerScrollMs: nowMs,
      },
    };
  }

  if (direction === -1 && boundary.canScrollUp) {
    return {
      action: 'scroll-inner',
      nextState: {
        ...state,
        awaitingGestureEnd: false,
        lastEventMs: nowMs,
        lastAbsDelta: absDelta,
        lastDirection: direction,
        lastInnerScrollMs: nowMs,
      },
    };
  }

  // 4. If the user JUST hit the bottom/top edge mid-fling from inner scrolling,
  //    absorb the remainder of that scroll gesture so they see the end of the
  //    view; the next deliberate scroll advances cleanly by +1 or -1 view.
  const justFinishedInnerScroll =
    boundary.hasOverflow &&
    nowMs - state.lastInnerScrollMs < innerEdgePauseMs &&
    gapSinceLast < gestureIdleGapMs &&
    direction === state.lastDirection;

  if (justFinishedInnerScroll) {
    return {
      action: 'consume',
      nextState: {
        ...state,
        awaitingGestureEnd: true,
        lastEventMs: nowMs,
        lastAbsDelta: absDelta,
        lastDirection: direction,
      },
    };
  }

  // 5. At the edge of the view -> step strictly by +1 or -1 scene
  if (direction === 1 && currentIndex < maxIndex) {
    return {
      action: 'advance-next',
      nextState: {
        lockedUntilMs: nowMs + transitionLockMs,
        awaitingGestureEnd: true,
        lastEventMs: nowMs,
        lastAbsDelta: absDelta,
        lastDirection: direction,
        lastInnerScrollMs: -Infinity,
      },
    };
  }

  if (direction === -1 && currentIndex > 0) {
    return {
      action: 'advance-prev',
      nextState: {
        lockedUntilMs: nowMs + transitionLockMs,
        awaitingGestureEnd: true,
        lastEventMs: nowMs,
        lastAbsDelta: absDelta,
        lastDirection: direction,
        lastInnerScrollMs: -Infinity,
      },
    };
  }

  return {
    action: 'consume',
    nextState: {
      ...state,
      awaitingGestureEnd: false,
      lastEventMs: nowMs,
      lastAbsDelta: absDelta,
      lastDirection: direction,
    },
  };
}

export interface EvaluateTouchNavigationInput {
  /** Positive when finger moves up (user wants to scroll down / next view). */
  deltaY: number;
  deltaX: number;
  startedAtTop: boolean;
  startedAtBottom: boolean;
  currentIndex: number;
  totalScenes: number;
  isLocked: boolean;
  thresholdPx?: number;
}

/**
 * Evaluates a touch drag gesture on phones/tablets:
 * - Ignores horizontal gestures (e.g., StoryYearCarousel swipes) and tiny jitter.
 * - If the touch started while already at the bottom edge (swiping up) or top
 *   edge (swiping down), triggers a strict single-scene step (+1 / -1) regardless
 *   of swipe velocity or length.
 * - Otherwise lets native touch scrolling pan smoothly inside the current view.
 */
export function evaluateTouchNavigation(
  input: EvaluateTouchNavigationInput
): 'advance-next' | 'advance-prev' | 'scroll-inner' | 'ignore' {
  const {
    deltaY,
    deltaX,
    startedAtTop,
    startedAtBottom,
    currentIndex,
    totalScenes,
    isLocked,
    thresholdPx = 32,
  } = input;

  const absY = Math.abs(deltaY);
  const absX = Math.abs(deltaX);

  // Horizontal gesture (carousel) or below tap jitter threshold
  if (absY < thresholdPx || absY <= absX * 1.15) {
    return 'ignore';
  }

  if (isLocked) {
    return 'ignore';
  }

  const maxIndex = Math.max(0, totalScenes - 1);

  if (deltaY > 0) {
    // Finger moved up -> scrolling down toward next view
    if (!startedAtBottom) return 'scroll-inner';
    return currentIndex < maxIndex ? 'advance-next' : 'ignore';
  }

  // Finger moved down -> scrolling up toward previous view
  if (!startedAtTop) return 'scroll-inner';
  return currentIndex > 0 ? 'advance-prev' : 'ignore';
}

export interface DirectScenePairTransitionState extends CinemaSceneTransitionState {
  /** Relative z-index offset so the incoming scene always blooms smoothly on top. */
  zIndexOffset: number;
}

/**
 * Pure in-place crossfade compositor for transitioning directly between any
 * `fromIndex` and `toIndex` over normalized progress `t` in [0, 1].
 * Works identically for forward (+1), backward (-1), and direct jump transitions
 * with zero flashing of intermediate scenes.
 */
export function computeDirectScenePairTransition(
  sceneIndex: number,
  fromIndex: number,
  toIndex: number,
  t: number,
  viewportHeight: number
): DirectScenePairTransitionState {
  const vh = Math.max(1, viewportHeight);
  const clampedT = clamp01(t);

  if (fromIndex === toIndex || clampedT >= 0.999) {
    if (sceneIndex === toIndex) {
      return {
        visible: true,
        sheetOpacity: 1,
        contentOpacity: 1,
        contentScale: 1,
        parallaxInputPx: 0,
        interactive: true,
        zIndexOffset: 2,
      };
    }
    return {
      visible: false,
      sheetOpacity: 0,
      contentOpacity: 0,
      contentScale: 1,
      parallaxInputPx: 0,
      interactive: false,
      zIndexOffset: 0,
    };
  }

  const eased = smoothstep(clampedT);
  const dir = toIndex > fromIndex ? 1 : -1;

  if (sceneIndex === fromIndex) {
    return {
      visible: true,
      sheetOpacity: 1,
      contentOpacity: Number((1 - 0.88 * eased).toFixed(4)),
      contentScale: Number((1 - 0.032 * eased).toFixed(4)),
      parallaxInputPx: Number((-dir * clampedT * vh).toFixed(2)),
      interactive: false,
      zIndexOffset: 1,
    };
  }

  if (sceneIndex === toIndex) {
    return {
      visible: true,
      sheetOpacity: Number(eased.toFixed(4)),
      contentOpacity: 1,
      contentScale: Number((1 + 0.028 * (1 - eased)).toFixed(4)),
      parallaxInputPx: Number((dir * (1 - clampedT) * vh).toFixed(2)),
      interactive: eased >= 0.5,
      zIndexOffset: 2,
    };
  }

  return {
    visible: false,
    sheetOpacity: 0,
    contentOpacity: 0,
    contentScale: 1,
    parallaxInputPx: 0,
    interactive: false,
    zIndexOffset: 0,
  };
}

export interface CelebrationsChromeState {
  visible: boolean;
  opacity: number;
  interactive: boolean;
}

/**
 * Computes opacity & visibility for the shared fixed Celebrations header
 * ("The Celebrations / Join us for these moments") and bottom numberline.
 * Stays locked at exact opacity 1 across celebration-to-celebration scrolling,
 * and crossfades smoothly only when entering or leaving the Celebrations chapter.
 */
export function computeCelebrationsChromeState(
  fromIsCelebration: boolean,
  toIsCelebration: boolean,
  t: number
): CelebrationsChromeState {
  const clampedT = clamp01(t);

  if (fromIsCelebration && toIsCelebration) {
    return {
      visible: true,
      opacity: 1,
      interactive: true,
    };
  }

  if (!fromIsCelebration && toIsCelebration) {
    const eased = smoothstep(clampedT);
    return {
      visible: eased > 0.001,
      opacity: Number(eased.toFixed(4)),
      interactive: eased >= 0.5,
    };
  }

  if (fromIsCelebration && !toIsCelebration) {
    const eased = 1 - smoothstep(clampedT);
    return {
      visible: eased > 0.001,
      opacity: Number(eased.toFixed(4)),
      interactive: false,
    };
  }

  return {
    visible: false,
    opacity: 0,
    interactive: false,
  };
}




