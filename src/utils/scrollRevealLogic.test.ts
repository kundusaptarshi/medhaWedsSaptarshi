import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRevealHiddenTransform,
  isElementRectInViewport,
  REVEAL_VISIBLE_TRANSFORM,
  shouldBypassRevealMotion,
} from './scrollRevealLogic';

test('getRevealHiddenTransform produces GPU-composited directional offsets for desktop and mobile', () => {
  assert.equal(getRevealHiddenTransform('left', false), 'translate3d(-88px, 0, 0)');
  assert.equal(getRevealHiddenTransform('right', false), 'translate3d(88px, 0, 0)');
  assert.equal(getRevealHiddenTransform('left', true), 'translate3d(-48px, 0, 0)');
  assert.equal(getRevealHiddenTransform('right', true), 'translate3d(48px, 0, 0)');
  assert.equal(
    getRevealHiddenTransform('up', false),
    'translate3d(0, 40px, 0) scale(0.97)'
  );
  assert.equal(
    getRevealHiddenTransform('down', false),
    'translate3d(0, -40px, 0) scale(0.97)'
  );
  assert.equal(
    getRevealHiddenTransform('bottom-left', true),
    'translate3d(-48px, 28px, 0) scale(0.96)'
  );
  assert.equal(
    getRevealHiddenTransform('bottom-right', true),
    'translate3d(48px, 28px, 0) scale(0.96)'
  );
  assert.equal(REVEAL_VISIBLE_TRANSFORM, 'translate3d(0, 0, 0) scale(1)');
});

test('isElementRectInViewport detects visible elements on desktop and mobile and ignores offscreen or zero-sized rects', () => {
  // Centered element on 1440x900 desktop
  assert.equal(
    isElementRectInViewport(
      { top: 120, bottom: 400, left: 200, right: 1200, width: 1000, height: 280 },
      900,
      1440
    ),
    true
  );

  // Tall element spanning beyond 390x844 mobile viewport height
  assert.equal(
    isElementRectInViewport(
      { top: -120, bottom: 960, left: 16, right: 374, width: 358, height: 1080 },
      844,
      390
    ),
    true
  );

  // Completely below the viewport
  assert.equal(
    isElementRectInViewport(
      { top: 1200, bottom: 1400, left: 0, right: 390, width: 390, height: 200 },
      844,
      390
    ),
    false
  );

  // Zero-sized unmounted/collapsed node
  assert.equal(
    isElementRectInViewport(
      { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 },
      900,
      1440
    ),
    false
  );
});

test('shouldBypassRevealMotion respects reduced motion and missing IntersectionObserver fallback', () => {
  assert.equal(shouldBypassRevealMotion(true, true, true), true);
  assert.equal(shouldBypassRevealMotion(true, true, false), true);
  assert.equal(shouldBypassRevealMotion(false, false, false), true);
  assert.equal(shouldBypassRevealMotion(false, false, true), false);
  assert.equal(shouldBypassRevealMotion(false, true, false), false);
});
