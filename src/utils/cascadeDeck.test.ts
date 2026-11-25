import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCinemaScenes,
  buildInviteCascadeSections,
  computeCelebrationsChromeState,
  computeCinemaSceneTransition,
  computeDirectScenePairTransition,
  computeMagneticSnapTarget,
  computeParallaxOffsetPx,
  computeSectionCrossfadeState,
  computeSectionParallaxInput,
  createInitialWheelGestureState,
  evaluateTouchNavigation,
  evaluateWheelNavigation,
  getEffectiveSceneScrollBoundary,
  getSceneScrollBoundary,
  pickActiveCascadeSectionFromOffsets,
  pickMostVisibleSectionId,
} from './cascadeDeck';

test('buildInviteCascadeSections returns 6 canonical chapters with Bride & Groom right before Us Through The Years', () => {
  const sections = buildInviteCascadeSections(6, true);

  assert.deepEqual(
    sections.map((s) => s.id),
    [
      'hero',
      'bride-and-groom',
      'us-through-the-years',
      'the-celebrations',
      'countdown',
      'closing',
    ]
  );

  assert.equal(sections[0].singleScreen, true);
  assert.equal(sections[1].singleScreen, true);
  assert.equal(sections[1].kind, 'couple');
  assert.equal(sections[2].singleScreen, true);
  assert.equal(sections[2].kind, 'story');
  assert.equal(sections[3].singleScreen, false);
  assert.equal(sections[4].singleScreen, true);
  assert.equal(sections[5].singleScreen, true);

  assert.equal(sections[0].theme, 'maroon');
  assert.equal(sections[1].theme, 'yellow');
  assert.equal(sections[4].theme, 'maroon');
  assert.equal(sections[5].theme, 'yellow');
});

test('buildInviteCascadeSections omits celebrations and countdown cleanly when absent', () => {
  const sections = buildInviteCascadeSections(0, false);
  assert.deepEqual(
    sections.map((s) => s.id),
    ['hero', 'bride-and-groom', 'us-through-the-years', 'closing']
  );
});

test('pickMostVisibleSectionId picks the section with highest visibility ratio and preserves fallback', () => {
  const ids = ['hero', 'us-through-the-years', 'the-celebrations'];

  assert.equal(
    pickMostVisibleSectionId(
      ids,
      { hero: 0.2, 'us-through-the-years': 0.85, 'the-celebrations': 0.0 },
      'hero'
    ),
    'us-through-the-years'
  );

  assert.equal(
    pickMostVisibleSectionId(
      ids,
      { hero: 0.0, 'us-through-the-years': 0.02, 'the-celebrations': 0.0 },
      'hero'
    ),
    'hero'
  );
});

test('pickActiveCascadeSectionFromOffsets picks the latest sticky sheet that has cascaded into view', () => {
  const ids = [
    'hero',
    'us-through-the-years',
    'the-celebrations',
    'countdown',
    'closing',
  ];

  // At top of page
  assert.equal(
    pickActiveCascadeSectionFromOffsets(
      ids,
      { hero: 0, 'us-through-the-years': 900, 'the-celebrations': 1800, countdown: 4800, closing: 5700 },
      405,
      'hero'
    ),
    'hero'
  );

  // Scrolled to Story (Hero anchor is negative, Story anchor at 0)
  assert.equal(
    pickActiveCascadeSectionFromOffsets(
      ids,
      { hero: -900, 'us-through-the-years': 0, 'the-celebrations': 900, countdown: 3900, closing: 4800 },
      405,
      'hero'
    ),
    'us-through-the-years'
  );

  // Scrolled to Closing (all anchors <= triggerY, last one wins)
  assert.equal(
    pickActiveCascadeSectionFromOffsets(
      ids,
      { hero: -5700, 'us-through-the-years': -4800, 'the-celebrations': -3900, countdown: -900, closing: 0 },
      405,
      'hero'
    ),
    'closing'
  );
});

test('computeSectionCrossfadeState computes smooth enter/exit crossfade and covered culling', () => {
  const vh = 900;

  // First section resting at top with next section still below viewport
  const heroAtRest = computeSectionCrossfadeState(0, 900, vh, true);
  assert.equal(heroAtRest.enterOpacity, 1);
  assert.equal(heroAtRest.exitOpacity, 1);
  assert.equal(heroAtRest.exitScale, 1);
  assert.equal(heroAtRest.isFullyCovered, false);

  // Mid-transition: Story halfway up over Hero
  const heroMidExit = computeSectionCrossfadeState(0, 450, vh, true);
  assert.ok(heroMidExit.exitOpacity > 0.2 && heroMidExit.exitOpacity < 0.8);
  assert.ok(heroMidExit.exitScale < 1 && heroMidExit.exitScale > 0.95);
  assert.equal(heroMidExit.isFullyCovered, false);

  const storyMidEnter = computeSectionCrossfadeState(450, 1350, vh, false);
  assert.ok(storyMidEnter.enterOpacity > 0.4 && storyMidEnter.enterOpacity < 1);
  assert.equal(storyMidEnter.exitOpacity, 1);

  // Fully covered: Story has reached y = 0, Hero is now hidden behind it
  const heroCovered = computeSectionCrossfadeState(-900, 0, vh, true);
  assert.equal(heroCovered.isFullyCovered, true);
  assert.equal(heroCovered.exitOpacity, 0.1);
});

test('tall hero on short mobile screen stays fully visible and active until scrolled to its bottom edge', () => {
  const vh = 600;
  // Hero is 820px tall; user has scrolled 180px down toward the bottom of hero (next anchor still at 640px > 600px)
  const midHeroScroll = computeSectionCrossfadeState(-180, 640, vh, true);
  assert.equal(midHeroScroll.enterOpacity, 1);
  assert.equal(midHeroScroll.exitOpacity, 1);
  assert.equal(midHeroScroll.exitScale, 1);
  assert.equal(midHeroScroll.exitTranslateY, 0);
  assert.equal(midHeroScroll.isFullyCovered, false);

  // Active section stays 'hero' while scrolling to the end of hero
  const activeBeforeEnd = pickActiveCascadeSectionFromOffsets(
    ['hero', 'us-through-the-years'],
    { hero: -180, 'us-through-the-years': 640 },
    vh * 0.48,
    'hero'
  );
  assert.equal(activeBeforeEnd, 'hero');

  // Once user scrolls past the end of hero and Story crosses the trigger line, Story activates
  const activeAfterEnd = pickActiveCascadeSectionFromOffsets(
    ['hero', 'us-through-the-years'],
    { hero: -620, 'us-through-the-years': 200 },
    vh * 0.48,
    'hero'
  );
  assert.equal(activeAfterEnd, 'us-through-the-years');
});

test('computeSectionParallaxInput rests at 0 in-place and transitions smoothly entering and exiting', () => {
  const vh = 900;

  // Entering from bottom of viewport
  assert.equal(computeSectionParallaxInput(450, 1350, vh), 450);

  // Parked cleanly at top of viewport (rest position = 0)
  assert.equal(computeSectionParallaxInput(0, 900, vh), 0);

  // Next section rising halfway over this section -> negative exit offset
  assert.equal(computeSectionParallaxInput(0, 450, vh), -450);

  // Next section completely covering this section
  assert.equal(computeSectionParallaxInput(0, 0, vh), -900);

  // Tall mobile section scrolled 200px before next section enters viewport
  assert.equal(computeSectionParallaxInput(-200, 1050, vh), -100);
});

test('computeParallaxOffsetPx differentiates background lag vs foreground lift and respects clamp', () => {
  const vh = 900;

  // At rest (0 offset), parallax shift is exact 0
  assert.equal(computeParallaxOffsetPx(0, vh, -0.36, 120), 0);
  assert.equal(computeParallaxOffsetPx(0, vh, 0.24, 80), 0);

  // Entering from below (+450px): background lags downward/opposite to foreground lift
  const bgEnter = computeParallaxOffsetPx(450, vh, -0.36, 120);
  const fgEnter = computeParallaxOffsetPx(450, vh, 0.24, 80);
  assert.ok(bgEnter < 0, `expected negative background shift, got ${bgEnter}`);
  assert.ok(fgEnter > 0, `expected positive foreground shift, got ${fgEnter}`);

  // Exiting upward (-450px): signs invert cleanly
  const bgExit = computeParallaxOffsetPx(-450, vh, -0.36, 120);
  const fgExit = computeParallaxOffsetPx(-450, vh, 0.24, 80);
  assert.equal(bgExit, -bgEnter);
  assert.equal(fgExit, -fgEnter);

  // Extreme scroll distances clamp cleanly to maxShiftPx
  assert.equal(computeParallaxOffsetPx(5000, vh, 0.8, 60), 60);
  assert.equal(computeParallaxOffsetPx(-5000, vh, 0.8, 60), -60);
});

test('buildCinemaScenes creates dedicated full-viewport scenes with Bride & Groom before Us Through The Years', () => {
  const scenes = buildCinemaScenes(['Mehendi/Cocktail', 'Haldi', 'Wedding'], true);
  assert.deepEqual(
    scenes.map((s) => s.id),
    [
      'hero',
      'bride-and-groom',
      'us-through-the-years',
      'celebration-0',
      'celebration-1',
      'celebration-2',
      'countdown',
      'closing',
    ]
  );
  assert.equal(scenes[1].chapterId, 'bride-and-groom');
  assert.equal(scenes[1].kind, 'couple');
  assert.equal(scenes[2].chapterId, 'us-through-the-years');
  assert.equal(scenes[2].kind, 'story');
  assert.equal(scenes[3].chapterId, 'the-celebrations');
  assert.equal(scenes[3].eventIndex, 0);
  assert.equal(scenes[5].label, 'Wedding');
  assert.equal(scenes[6].theme, 'maroon');
  assert.equal(scenes[7].theme, 'yellow');
});

test('computeCinemaSceneTransition dissolves scenes in-place with zero flash and opposing parallax', () => {
  const vh = 900;
  const total = 5;

  // At rest on Scene 1 (Us Through The Years)
  const rest0 = computeCinemaSceneTransition(0, 1, vh, total);
  const rest1 = computeCinemaSceneTransition(1, 1, vh, total);
  const rest2 = computeCinemaSceneTransition(2, 1, vh, total);
  assert.equal(rest0.visible, false);
  assert.equal(rest1.visible, true);
  assert.equal(rest1.sheetOpacity, 1);
  assert.equal(rest1.contentOpacity, 1);
  assert.equal(rest1.contentScale, 1);
  assert.equal(rest1.parallaxInputPx, 0);
  assert.equal(rest1.interactive, true);
  assert.equal(rest2.visible, false);

  // Mid-crossfade (progress = 1.5 between Scene 1 and Scene 2)
  const out1 = computeCinemaSceneTransition(1, 1.5, vh, total);
  const in2 = computeCinemaSceneTransition(2, 1.5, vh, total);
  assert.equal(out1.visible, true);
  assert.equal(out1.sheetOpacity, 1); // stays solid opaque underneath so no background bleed
  assert.ok(out1.contentOpacity < 0.7 && out1.contentOpacity > 0.3);
  assert.ok(out1.contentScale < 1);
  assert.equal(out1.parallaxInputPx, -450);
  assert.equal(out1.interactive, false);

  assert.equal(in2.visible, true);
  assert.equal(in2.sheetOpacity, 0.5);
  assert.ok(in2.contentScale > 1);
  assert.equal(in2.parallaxInputPx, 450);
  assert.equal(in2.interactive, true);
});

test('computeMagneticSnapTarget snaps and clamps cleanly to valid scene indices', () => {
  assert.equal(computeMagneticSnapTarget(0.2, 6), 0);
  assert.equal(computeMagneticSnapTarget(0.62, 6), 1);
  assert.equal(computeMagneticSnapTarget(4.8, 6), 5);
  assert.equal(computeMagneticSnapTarget(99, 6), 5);
  assert.equal(computeMagneticSnapTarget(-3, 6), 0);
});

test('getSceneScrollBoundary detects fitting vs overflowing views and top/bottom edges accurately', () => {
  // Fits completely in viewport (no overflow)
  const fits = getSceneScrollBoundary(0, 844, 844);
  assert.equal(fits.hasOverflow, false);
  assert.equal(fits.atTop, true);
  assert.equal(fits.atBottom, true);
  assert.equal(fits.canScrollUp, false);
  assert.equal(fits.canScrollDown, false);

  // Overflows vertically, parked at top
  const top = getSceneScrollBoundary(0, 640, 980);
  assert.equal(top.hasOverflow, true);
  assert.equal(top.atTop, true);
  assert.equal(top.atBottom, false);
  assert.equal(top.canScrollDown, true);
  assert.equal(top.canScrollUp, false);

  // Overflows vertically, mid-scroll
  const mid = getSceneScrollBoundary(180, 640, 980);
  assert.equal(mid.atTop, false);
  assert.equal(mid.atBottom, false);
  assert.equal(mid.canScrollDown, true);
  assert.equal(mid.canScrollUp, true);

  // Overflows vertically, reached bottom within 2px tolerance
  const bottom = getSceneScrollBoundary(339, 640, 980);
  assert.equal(bottom.atTop, false);
  assert.equal(bottom.atBottom, true);
  assert.equal(bottom.canScrollDown, false);
  assert.equal(bottom.canScrollUp, true);
});

test('evaluateWheelNavigation advances strictly by 1 scene regardless of hard scroll intensity, multi-notch wheel spins, or jittery trackpad inertia', () => {
  const fitsBoundary = getSceneScrollBoundary(0, 900, 900);
  let state = createInitialWheelGestureState();
  let currentIndex = 0;

  // Hard trackpad burst with realistic frame-batch spikes over 1.3s
  const burstEvents = [
    { t: 1000, dy: 420 },
    { t: 1020, dy: 380 },
    { t: 1050, dy: 310 },
    { t: 1120, dy: 240 },
    { t: 1250, dy: 180 },
    { t: 1400, dy: 120 },
    { t: 1550, dy: 80 },
    { t: 1650, dy: 95 }, // past 560ms lock + batched frame spike -> STILL same scroll!
    { t: 1710, dy: 32 },
    { t: 1770, dy: 48 }, // jitter upward -> STILL same scroll!
    { t: 1820, dy: 16 },
    { t: 1880, dy: 6 },
    { t: 1930, dy: 2 }, // sub-threshold tail does not extend idle clock
  ];

  let advances = 0;
  for (const ev of burstEvents) {
    const res = evaluateWheelNavigation(state, {
      deltaY: ev.dy,
      nowMs: ev.t,
      currentIndex,
      totalScenes: 10,
      boundary: fitsBoundary,
    });
    state = res.nextState;
    if (res.action === 'advance-next') {
      advances += 1;
      currentIndex += 1;
    }
  }

  assert.equal(advances, 1);
  assert.equal(currentIndex, 1);

  // After gesture settles (quiet gap >= 220ms after last >=3px event at t=1880), the next scroll advances immediately to scene 2
  const nextRes = evaluateWheelNavigation(state, {
    deltaY: 90,
    nowMs: 2120,
    currentIndex,
    totalScenes: 10,
    boundary: fitsBoundary,
  });
  assert.equal(nextRes.action, 'advance-next');
});

test('evaluateWheelNavigation treats a hard multi-notch desktop mouse-wheel spin as a single view step and accepts deliberate reversals or subsequent scrolls', () => {
  const fitsBoundary = getSceneScrollBoundary(0, 800, 800);
  let state = createInitialWheelGestureState();
  let currentIndex = 0;

  // Single hard spin of a desktop mouse wheel emitting 10 notches of dy=120 over 760ms
  const hardWheelSpinTimes = [1000, 1055, 1115, 1185, 1265, 1355, 1455, 1565, 1685, 1815];
  let advances = 0;
  for (const t of hardWheelSpinTimes) {
    const res = evaluateWheelNavigation(state, {
      deltaY: 120,
      nowMs: t,
      currentIndex,
      totalScenes: 10,
      boundary: fitsBoundary,
    });
    state = res.nextState;
    if (res.action === 'advance-next') {
      advances += 1;
      currentIndex += 1;
    }
  }

  assert.equal(advances, 1);
  assert.equal(currentIndex, 1);

  // Immediately reversing direction after the lock expires (even within 220ms) steps back cleanly by -1
  const reverseStep = evaluateWheelNavigation(state, {
    deltaY: -120,
    nowMs: 1920,
    currentIndex,
    totalScenes: 10,
    boundary: fitsBoundary,
  });
  assert.equal(reverseStep.action, 'advance-prev');
  state = reverseStep.nextState;
  currentIndex -= 1;
  assert.equal(currentIndex, 0);

  // Two deliberate single-notch wheel clicks spaced 600ms apart advance 1 view each
  const click1 = evaluateWheelNavigation(state, {
    deltaY: 100,
    nowMs: 2600,
    currentIndex,
    totalScenes: 10,
    boundary: fitsBoundary,
  });
  assert.equal(click1.action, 'advance-next');
  state = click1.nextState;
  currentIndex += 1;

  const click2 = evaluateWheelNavigation(state, {
    deltaY: 100,
    nowMs: 3200,
    currentIndex,
    totalScenes: 10,
    boundary: fitsBoundary,
  });
  assert.equal(click2.action, 'advance-next');
});

test('evaluateWheelNavigation supports page-like inner scroll on overflowing views and advances to next view once at bottom', () => {
  let state = createInitialWheelGestureState();

  // At top of an overflowing view -> scrolls inside the view first
  const innerRes1 = evaluateWheelNavigation(state, {
    deltaY: 160,
    nowMs: 1000,
    currentIndex: 1,
    totalScenes: 10,
    boundary: getSceneScrollBoundary(0, 640, 1020),
  });
  assert.equal(innerRes1.action, 'scroll-inner');
  state = innerRes1.nextState;

  // Immediate momentum hit right at bottom (40ms later) is absorbed so user sees bottom of view
  const spilloverRes = evaluateWheelNavigation(state, {
    deltaY: 90,
    nowMs: 1040,
    currentIndex: 1,
    totalScenes: 10,
    boundary: getSceneScrollBoundary(380, 640, 1020),
  });
  assert.equal(spilloverRes.action, 'consume');
  state = spilloverRes.nextState;

  // Next scroll after reaching the bottom (even with massive intensity) lands cleanly on next view
  const advanceRes = evaluateWheelNavigation(state, {
    deltaY: 650,
    nowMs: 1320,
    currentIndex: 1,
    totalScenes: 10,
    boundary: getSceneScrollBoundary(380, 640, 1020),
  });
  assert.equal(advanceRes.action, 'advance-next');
});

test('evaluateTouchNavigation distinguishes vertical edge swipes, inner scroll, and horizontal carousel swipes', () => {
  // Swiping horizontally in the Story carousel is ignored
  assert.equal(
    evaluateTouchNavigation({
      deltaY: 20,
      deltaX: 90,
      startedAtTop: true,
      startedAtBottom: true,
      currentIndex: 1,
      totalScenes: 8,
      isLocked: false,
    }),
    'ignore'
  );

  // Swiping up while NOT at bottom of overflowing view allows native page-like inner scroll
  assert.equal(
    evaluateTouchNavigation({
      deltaY: 140,
      deltaX: 8,
      startedAtTop: true,
      startedAtBottom: false,
      currentIndex: 1,
      totalScenes: 8,
      isLocked: false,
    }),
    'scroll-inner'
  );

  // Swiping up when already at bottom advances strictly by +1 regardless of intensity
  assert.equal(
    evaluateTouchNavigation({
      deltaY: 420,
      deltaX: 12,
      startedAtTop: false,
      startedAtBottom: true,
      currentIndex: 1,
      totalScenes: 8,
      isLocked: false,
    }),
    'advance-next'
  );

  // Swiping down when already at top goes back by -1
  assert.equal(
    evaluateTouchNavigation({
      deltaY: -180,
      deltaX: 5,
      startedAtTop: true,
      startedAtBottom: false,
      currentIndex: 2,
      totalScenes: 8,
      isLocked: false,
    }),
    'advance-prev'
  );
});

test('computeDirectScenePairTransition crossfades directly between fromIndex and toIndex without flashing intermediate scenes', () => {
  const vh = 900;

  // Mid-jump from Scene 0 to Scene 4: only Scene 0 and Scene 4 are visible
  const s0 = computeDirectScenePairTransition(0, 0, 4, 0.5, vh);
  const s2 = computeDirectScenePairTransition(2, 0, 4, 0.5, vh);
  const s4 = computeDirectScenePairTransition(4, 0, 4, 0.5, vh);

  assert.equal(s0.visible, true);
  assert.equal(s0.sheetOpacity, 1);
  assert.equal(s0.zIndexOffset, 1);

  assert.equal(s2.visible, false);
  assert.equal(s2.sheetOpacity, 0);

  assert.equal(s4.visible, true);
  assert.equal(s4.sheetOpacity, 0.5);
  assert.equal(s4.zIndexOffset, 2);

  // Settled at t = 1: only destination Scene 4 is visible and interactive
  const done0 = computeDirectScenePairTransition(0, 0, 4, 1, vh);
  const done4 = computeDirectScenePairTransition(4, 0, 4, 1, vh);
  assert.equal(done0.visible, false);
  assert.equal(done4.visible, true);
  assert.equal(done4.sheetOpacity, 1);
  assert.equal(done4.interactive, true);
});

test('computeCelebrationsChromeState stays fixed at opacity 1 between celebrations and fades only on chapter entry/exit', () => {
  // Celebration -> Celebration: fixed at exact opacity 1 across entire transition
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const state = computeCelebrationsChromeState(true, true, t);
    assert.equal(state.visible, true);
    assert.equal(state.opacity, 1);
    assert.equal(state.interactive, true);
  }

  // Story -> First Celebration: fades smoothly in
  const enterMid = computeCelebrationsChromeState(false, true, 0.5);
  assert.equal(enterMid.visible, true);
  assert.equal(enterMid.opacity, 0.5);
  assert.equal(enterMid.interactive, true);

  // Last Celebration -> Countdown: fades smoothly out
  const exitMid = computeCelebrationsChromeState(true, false, 0.5);
  assert.equal(exitMid.visible, true);
  assert.equal(exitMid.opacity, 0.5);
  assert.equal(exitMid.interactive, false);

  const exitDone = computeCelebrationsChromeState(true, false, 1);
  assert.equal(exitDone.visible, false);
  assert.equal(exitDone.opacity, 0);

  // Non-celebration -> Non-celebration: stays hidden
  const hidden = computeCelebrationsChromeState(false, false, 0.5);
  assert.equal(hidden.visible, false);
  assert.equal(hidden.opacity, 0);
});

test('getEffectiveSceneScrollBoundary guarantees direct single-scroll navigation on ALL desktop scenes while keeping mobile and ultra-short window inner scroll', () => {
  // Desktop laptop height (620px–680px) with minor whitespace overflow -> no inner scroll, advances directly on first scroll
  for (const kind of ['hero', 'story', 'celebrations', 'countdown', 'closing'] as const) {
    const desktopBoundary = getEffectiveSceneScrollBoundary(kind, 1280, 0, 620, 650);
    assert.equal(desktopBoundary.hasOverflow, false, `${kind} should not trap desktop scroll`);
    assert.equal(desktopBoundary.canScrollDown, false);
    assert.equal(desktopBoundary.canScrollUp, false);
    assert.equal(desktopBoundary.atTop, true);
    assert.equal(desktopBoundary.atBottom, true);

    const step = evaluateWheelNavigation(createInitialWheelGestureState(), {
      deltaY: 100,
      nowMs: 1000,
      currentIndex: 1,
      totalScenes: 10,
      boundary: desktopBoundary,
    });
    assert.equal(step.action, 'advance-next', `${kind} should advance on first desktop scroll`);
  }

  // Mobile (390px) with overflowing scene still scrolls inner content first
  const mobileStory = getEffectiveSceneScrollBoundary('story', 390, 0, 600, 740);
  assert.equal(mobileStory.hasOverflow, true);
  assert.equal(mobileStory.canScrollDown, true);

  // Ultra-short desktop window (< 520px tall with heavy > 80px overflow) preserves accessibility scroll
  const tinyDesktop = getEffectiveSceneScrollBoundary('celebrations', 1280, 0, 420, 600);
  assert.equal(tinyDesktop.hasOverflow, true);
  assert.equal(tinyDesktop.canScrollDown, true);
});

test('evaluateWheelNavigation accepts a fresh desktop wheel scroll right after the 440ms transition finishes', () => {
  const fits = getSceneScrollBoundary(0, 800, 800);
  let state = createInitialWheelGestureState();

  const first = evaluateWheelNavigation(state, {
    deltaY: 100,
    nowMs: 1000,
    currentIndex: 0,
    totalScenes: 10,
    boundary: fits,
  });
  assert.equal(first.action, 'advance-next');
  state = first.nextState;

  // Fresh single-notch scroll at t = 1480ms (40ms after 440ms transition completes) advances immediately
  const second = evaluateWheelNavigation(state, {
    deltaY: 100,
    nowMs: 1480,
    currentIndex: 1,
    totalScenes: 10,
    boundary: fits,
  });
  assert.equal(second.action, 'advance-next');
});
