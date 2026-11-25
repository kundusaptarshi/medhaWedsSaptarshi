import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DEFAULT_CAROUSEL_AUTOPLAY_MS,
  resolveSwipeDirection,
  stepSlideIndex,
  STORY_CAROUSEL_SLIDES,
  type StoryCarouselSlide,
  wrapSlideIndex,
} from '../utils/storyCarousel';
import { CornerBracket, LotusEmblem } from './InviteIllustrations';

interface StoryYearCarouselProps {
  slides?: StoryCarouselSlide[];
  /** Auto-advance gently while the section is actively in view (pauses on interaction/hover). */
  autoPlay?: boolean;
  autoPlayIntervalMs?: number;
}

/**
 * Horizontal landscape image carousel for "Us Through The Years" (2019–2026),
 * with previous/next navigation, keyboard & touch-swipe support, and an interactive
 * years timeline at the bottom.
 */
export const StoryYearCarousel: React.FC<StoryYearCarouselProps> = ({
  slides = STORY_CAROUSEL_SLIDES,
  autoPlay = false,
  autoPlayIntervalMs = DEFAULT_CAROUSEL_AUTOPLAY_MS,
}) => {
  const total = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const safeIndex = wrapSlideIndex(activeIndex, total);
  const activeSlide = slides[safeIndex];

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => stepSlideIndex(prev, 1, total));
  }, [total]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => stepSlideIndex(prev, -1, total));
  }, [total]);

  const handleSelectIndex = useCallback(
    (index: number) => {
      setActiveIndex(wrapSlideIndex(index, total));
    },
    [total]
  );

  // Optional gentle auto-advance that respects reduced motion and pauses on interaction
  useEffect(() => {
    if (!autoPlay || isPaused || total <= 1) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => stepSlideIndex(prev, 1, total));
    }, autoPlayIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoPlay, isPaused, total, autoPlayIntervalMs]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch) return;
    const direction = resolveSwipeDirection(
      touch.clientX - start.x,
      touch.clientY - start.y
    );
    if (direction === 'next') handleNext();
    if (direction === 'prev') handlePrev();
  };

  if (total === 0 || !activeSlide) {
    return null;
  }

  return (
    <div
      data-testid="story-image-carousel"
      data-active-year={activeSlide.year}
      role="region"
      aria-roledescription="carousel"
      aria-label="Us Through The Years photo carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      className="relative w-full max-w-[640px] [@media(min-width:768px)_and_(max-height:760px)]:max-w-[520px] [@media(min-width:768px)_and_(max-height:660px)]:max-w-[440px] rounded-xl bg-[#FFF9E2]/95 border border-[#E6D194] shadow-[0_18px_46px_rgba(180,136,56,0.16)] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F1924] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF3D0]"
    >
      <span className="sr-only" aria-live="polite">
        Showing year {activeSlide.year}
      </span>

      {/* Native iPhone 4:3 Photo Frame (fits 4:3 landscape edge-to-edge & 3:4 portrait uncropped) */}
      <div className="p-2.5 sm:p-3 bg-[#FFF9E2]">
        <div
          data-testid="story-carousel-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative aspect-[4/3] w-full border border-[#DFBE7B]/80 bg-[#FDF3D0]/85 overflow-hidden select-none"
        >
          {/* Sliding Horizontal Track */}
          <div
            className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translate3d(-${safeIndex * 100}%, 0, 0)` }}
          >
            {slides.map((slide, idx) => {
              const showPhoto =
                Boolean(slide.imageSrc) && !failedImages[slide.id];
              return (
                <div
                  key={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${total}: ${slide.year}`}
                  aria-hidden={idx !== safeIndex}
                  className="relative w-full h-full shrink-0 flex items-center justify-center overflow-hidden"
                >
                  {showPhoto && slide.imageSrc ? (
                    <>
                      {/* Soft blurred ambient matte so portrait (3:4) iPhone photos show edge-to-edge warmth without cropping */}
                      <img
                        src={slide.imageSrc}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        className="pointer-events-none absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45"
                      />
                      <img
                        src={slide.imageSrc}
                        alt={slide.alt}
                        referrerPolicy="no-referrer"
                        draggable={false}
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [slide.id]: true,
                          }))
                        }
                        className="relative z-10 w-full h-full object-contain"
                      />
                      {slide.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#231618]/80 via-[#231618]/35 to-transparent px-4 py-3 text-left">
                          <p className="text-xs sm:text-sm text-[#FAF5EC] leading-snug">
                            {slide.caption}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Serene heirloom blank mount ready for the couple's photo for this year */
                    <div
                      className="relative w-full h-full flex flex-col items-center justify-center text-center px-12"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 48%, rgba(255, 250, 228, 0.92) 0%, rgba(253, 243, 208, 0.85) 68%, rgba(244, 228, 178, 0.72) 100%)',
                      }}
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-3 border border-[#DFBE7B]/45"
                      />
                      <CornerBracket
                        position="tl"
                        className="w-7 h-7 sm:w-8 sm:h-8 text-[#C89D54] absolute top-1.5 left-1.5 pointer-events-none"
                      />
                      <CornerBracket
                        position="tr"
                        className="w-7 h-7 sm:w-8 sm:h-8 text-[#C89D54] absolute top-1.5 right-1.5 pointer-events-none"
                      />
                      <CornerBracket
                        position="bl"
                        className="w-7 h-7 sm:w-8 sm:h-8 text-[#C89D54] absolute bottom-1.5 left-1.5 pointer-events-none"
                      />
                      <CornerBracket
                        position="br"
                        className="w-7 h-7 sm:w-8 sm:h-8 text-[#C89D54] absolute bottom-1.5 right-1.5 pointer-events-none"
                      />

                      <LotusEmblem className="w-11 h-6 sm:w-12 sm:h-7 text-[#C89D54]/80" />
                      <p className="mt-2.5 font-editorial italic text-xl sm:text-2xl text-[#63111D]/85">
                        Moments from {slide.year}
                      </p>
                      <span className="sr-only">
                        Horizontal photo frame reserved for Medha and Saptarshi memories from {slide.year}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Left / Right Carousel Navigation Controls */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous year"
                data-testid="story-carousel-prev"
                className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFF9E2]/92 border border-[#DFBE7B]/85 text-[#4D0A14] shadow-[0_4px_14px_rgba(77,10,20,0.16)] hover:bg-[#4D0A14] hover:text-[#FAF5EC] hover:border-[#DFBE7B] transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4D0A14]"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next year"
                data-testid="story-carousel-next"
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFF9E2]/92 border border-[#DFBE7B]/85 text-[#4D0A14] shadow-[0_4px_14px_rgba(77,10,20,0.16)] hover:bg-[#4D0A14] hover:text-[#FAF5EC] hover:border-[#DFBE7B] transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4D0A14]"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive Year Selector Strip — cleanly inset at all desktop & mobile widths */}
      <div
        role="tablist"
        aria-label="Choose a year"
        data-testid="story-year-tablist"
        className="grid grid-cols-8 items-center gap-1 sm:gap-1.5 border-t border-[#E6D194]/80 bg-[#FFF9E2] px-3 sm:px-5 py-2.5"
      >
        {slides.map((slide, idx) => {
          const isSelected = idx === safeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`Show year ${slide.year}`}
              onClick={() => handleSelectIndex(idx)}
              className={`w-full min-w-0 px-0.5 sm:px-1.5 py-1.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium tracking-[0.02em] sm:tracking-[0.05em] lining-nums tabular-nums whitespace-nowrap text-center transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F1924] ${
                isSelected
                  ? 'bg-[#4D0A14] text-[#FAF5EC] shadow-xs'
                  : 'text-[#6B5457] hover:text-[#4D0A14] hover:bg-[#FDF3D0]'
              }`}
            >
              {slide.year}
            </button>
          );
        })}
      </div>
    </div>
  );
};
