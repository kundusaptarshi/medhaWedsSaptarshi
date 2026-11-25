import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CAROUSEL_AUTOPLAY_MS,
  formatSlideCounter,
  getStoryPhotoPath,
  resolveSwipeDirection,
  stepSlideIndex,
  STORY_CAROUSEL_SLIDES,
  wrapSlideIndex,
} from './storyCarousel';

test('DEFAULT_CAROUSEL_AUTOPLAY_MS is set to 3 seconds (3000ms)', () => {
  assert.equal(DEFAULT_CAROUSEL_AUTOPLAY_MS, 3000);
});

test('STORY_CAROUSEL_SLIDES covers 2019 through 2026 in chronological order with /photos/<Year>.jpeg paths', () => {
  assert.equal(STORY_CAROUSEL_SLIDES.length, 8);
  assert.deepEqual(
    STORY_CAROUSEL_SLIDES.map((s) => s.year),
    ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']
  );
  assert.deepEqual(
    STORY_CAROUSEL_SLIDES.map((s) => s.imageSrc),
    [
      '/photos/2019.jpeg',
      '/photos/2020.jpeg',
      '/photos/2021.jpeg',
      '/photos/2022.jpeg',
      '/photos/2023.jpeg',
      '/photos/2024.jpeg',
      '/photos/2025.jpeg',
      '/photos/2026.jpeg',
    ]
  );
  assert.equal(getStoryPhotoPath('2019'), '/photos/2019.jpeg');
  const uniqueIds = new Set(STORY_CAROUSEL_SLIDES.map((s) => s.id));
  assert.equal(uniqueIds.size, STORY_CAROUSEL_SLIDES.length);
});

test('wrapSlideIndex handles positive, negative, and zero-total boundaries', () => {
  assert.equal(wrapSlideIndex(0, 8), 0);
  assert.equal(wrapSlideIndex(8, 8), 0);
  assert.equal(wrapSlideIndex(-1, 8), 7);
  assert.equal(wrapSlideIndex(-9, 8), 7);
  assert.equal(wrapSlideIndex(3, 0), 0);
});

test('stepSlideIndex advances and wraps cleanly in both directions', () => {
  assert.equal(stepSlideIndex(0, 1, 8), 1);
  assert.equal(stepSlideIndex(7, 1, 8), 0);
  assert.equal(stepSlideIndex(0, -1, 8), 7);
  assert.equal(stepSlideIndex(4, -1, 8), 3);
});

test('formatSlideCounter returns zero-padded tabular index string', () => {
  assert.equal(formatSlideCounter(0, 8), '01 / 08');
  assert.equal(formatSlideCounter(5, 8), '06 / 08');
  assert.equal(formatSlideCounter(7, 8), '08 / 08');
  assert.equal(formatSlideCounter(0, 0), '00 / 00');
});

test('resolveSwipeDirection detects horizontal swipes and ignores vertical scroll gestures', () => {
  assert.equal(resolveSwipeDirection(-60, 10), 'next');
  assert.equal(resolveSwipeDirection(65, -15), 'prev');
  assert.equal(resolveSwipeDirection(-20, 4), null);
  assert.equal(resolveSwipeDirection(-50, 85), null);
});
