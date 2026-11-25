export interface StoryCarouselSlide {
  id: string;
  year: string;
  /**
   * Path or URL to the photo for this year (e.g. '/photos/2019.jpeg').
   * Falls back cleanly to the heirloom mount if the file has not been added yet.
   */
  imageSrc: string | null;
  alt: string;
  caption?: string;
}

/** Default delay (in milliseconds) between automatic year transitions. */
export const DEFAULT_CAROUSEL_AUTOPLAY_MS = 3000;

/** Canonical public folder path for each year's JPEG photo (`public/photos/<Year>.jpeg`). */
export function getStoryPhotoPath(year: string): string {
  return `/photos/${year}.jpeg`;
}

/**
 * Chronological 2019–2026 slides for the "Us Through The Years" photo carousel.
 * Drop iPhone JPEG photos into `public/photos/` named `2019.jpeg` through `2026.jpeg`.
 */
export const STORY_CAROUSEL_SLIDES: StoryCarouselSlide[] = [
  {
    id: 'year-2019',
    year: '2019',
    imageSrc: getStoryPhotoPath('2019'),
    alt: 'Medha and Saptarshi — 2019',
  },
  {
    id: 'year-2020',
    year: '2020',
    imageSrc: getStoryPhotoPath('2020'),
    alt: 'Medha and Saptarshi — 2020',
  },
  {
    id: 'year-2021',
    year: '2021',
    imageSrc: getStoryPhotoPath('2021'),
    alt: 'Medha and Saptarshi — 2021',
  },
  {
    id: 'year-2022',
    year: '2022',
    imageSrc: getStoryPhotoPath('2022'),
    alt: 'Medha and Saptarshi — 2022',
  },
  {
    id: 'year-2023',
    year: '2023',
    imageSrc: getStoryPhotoPath('2023'),
    alt: 'Medha and Saptarshi — 2023',
  },
  {
    id: 'year-2024',
    year: '2024',
    imageSrc: getStoryPhotoPath('2024'),
    alt: 'Medha and Saptarshi — 2024',
  },
  {
    id: 'year-2025',
    year: '2025',
    imageSrc: getStoryPhotoPath('2025'),
    alt: 'Medha and Saptarshi — 2025',
  },
  {
    id: 'year-2026',
    year: '2026',
    imageSrc: getStoryPhotoPath('2026'),
    alt: 'Medha and Saptarshi — 2026',
  },
];

/**
 * Wraps any slide index into [0, total - 1]. Returns 0 when total <= 0.
 */
export function wrapSlideIndex(index: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const safeTotal = Math.floor(total);
  const safeIndex = Math.trunc(index);
  return ((safeIndex % safeTotal) + safeTotal) % safeTotal;
}

/**
 * Steps the active carousel index forward (+1) or backward (-1) with wrap-around.
 */
export function stepSlideIndex(
  currentIndex: number,
  delta: -1 | 1,
  total: number
): number {
  return wrapSlideIndex(currentIndex + delta, total);
}

/**
 * Formats the zero-padded slide counter label (e.g. "01 / 08").
 */
export function formatSlideCounter(currentIndex: number, total: number): string {
  if (!Number.isFinite(total) || total <= 0) return '00 / 00';
  const safeTotal = Math.floor(total);
  const active = wrapSlideIndex(currentIndex, safeTotal) + 1;
  return `${String(active).padStart(2, '0')} / ${String(safeTotal).padStart(2, '0')}`;
}

/**
 * Determines whether a horizontal touch swipe should advance or rewind the carousel.
 * Ignores primarily vertical gestures so page scrolling is never hijacked.
 */
export function resolveSwipeDirection(
  deltaX: number,
  deltaY: number,
  thresholdPx = 42
): 'next' | 'prev' | null {
  if (Math.abs(deltaX) < thresholdPx) return null;
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return null;
  return deltaX < 0 ? 'next' : 'prev';
}
