import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { WeddingEventDetail } from '../data/weddingEventDetails';
import {
  eventVideoCache,
  isVideoElementReady,
} from '../utils/eventVideoCache';
import { getEventMediaConfig } from '../utils/invitePresentation';
import { CornerBracket, EventMedallionIllustration } from './InviteIllustrations';

interface EventVerticalMediaFrameProps {
  event: WeddingEventDetail;
  isActive: boolean;
  /** Optional video source override (used for Bride's & Groom's frames in combined mode). */
  videoSrcOverride?: string;
  /** Optional custom aria-label suffix (e.g. "Bride's Side"). */
  sideLabel?: string;
  /** Optional custom data-testid override. */
  testId?: string;
  /** Use slightly tighter frame bezel in dual-column generic mode. */
  compact?: boolean;
}

const ACTIVE_BLOB_FALLBACK_TIMEOUT_MS = 900;
const MAX_DIRECT_RETRY_ATTEMPTS = 3;

/**
 * Vertical 9:16 portrait showcase frame for each celebration event.
 * - Uses container-query sizing (.media-slot-9-16 / .media-frame-9-16) so the
 *   video fills the maximum possible vertical & horizontal space inside a single
 *   100dvh viewport without clipping or vertical scrolling.
 * - Loads videos through the shared in-memory Blob cache (eventVideoCache) so
 *   newly created & previewed invitations render instantaneously from RAM with
 *   zero Chromium HTTP 206 cache-lock contention, falling back cleanly to direct
 *   fast-start streaming with automatic error recovery if needed.
 * - Renders a seamless looping HTML5 <video> (muted playsinline loop) with zero
 *   browser controls and keeps the royal-maroon medallion backdrop underneath.
 */
export const EventVerticalMediaFrame: React.FC<EventVerticalMediaFrameProps> = ({
  event,
  isActive,
  videoSrcOverride,
  sideLabel,
  testId,
  compact = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const media = getEventMediaConfig({
    videoSrc: videoSrcOverride ?? event.videoSrc,
  });
  const canonicalSrc = media.videoSrc;

  // Synchronously read from the in-memory Blob cache on first render for 0ms display
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() =>
    canonicalSrc ? eventVideoCache.getCachedUrl(canonicalSrc) : null
  );
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const readySrcRef = useRef<string | null>(readySrc);
  readySrcRef.current = readySrc;
  const resolvedSrcRef = useRef<string | null>(resolvedSrc);
  resolvedSrcRef.current = resolvedSrc;

  const isVideoReady = Boolean(resolvedSrc && readySrc === resolvedSrc);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isActiveRef.current) return;
    video.muted = true;
    video.defaultMuted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Autoplay may temporarily reject while decoding; readiness events & watchdog retry
      });
    }
  }, []);

  // Resolve canonicalSrc to an instant in-memory Blob URL (or progressive direct fallback)
  useEffect(() => {
    setRetryAttempt(0);

    if (!canonicalSrc) {
      setResolvedSrc(null);
      setReadySrc(null);
      return;
    }

    const cached = eventVideoCache.getCachedUrl(canonicalSrc);
    if (cached) {
      setResolvedSrc(cached);
      return;
    }

    let cancelled = false;
    let fallbackTimer: number | null = null;

    // If the user is already viewing this slide on a slow network, begin progressive
    // fast-start streaming after a brief grace window instead of waiting for full download.
    if (isActive) {
      fallbackTimer = window.setTimeout(() => {
        if (cancelled) return;
        setResolvedSrc((current) => current ?? canonicalSrc);
      }, ACTIVE_BLOB_FALLBACK_TIMEOUT_MS);
    }

    void eventVideoCache
      .ensureLoaded(canonicalSrc, { highPriority: isActive })
      .then((blobUrl) => {
        if (cancelled) return;
        if (fallbackTimer !== null) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        if (blobUrl) {
          setResolvedSrc((current) => {
            // Avoid interrupting an already-playing direct fallback stream mid-view
            if (
              current &&
              current === readySrcRef.current &&
              isActiveRef.current &&
              !current.startsWith('blob:')
            ) {
              return current;
            }
            return blobUrl;
          });
        } else {
          setResolvedSrc((current) => current ?? canonicalSrc);
        }
      });

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
    };
  }, [canonicalSrc, isActive]);

  // Synchronize src, muted/playsinline attributes, cached readyState, active playback, and tab resume
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedSrc) return;

    // Restore src if React StrictMode's simulated unmount cleared it on the same DOM node
    if (video.getAttribute('src') !== resolvedSrc) {
      video.src = resolvedSrc;
      video.load();
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    if (isVideoElementReady(video.readyState)) {
      setReadySrc(resolvedSrc);
    }

    if (isActive) {
      if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        video.load();
      }
      attemptPlay();
    } else {
      video.pause();
    }

    // Gentle watchdog in case play() resolved/rejected right as decoding finished
    let watchdogTimer: number | null = null;
    if (isActive) {
      watchdogTimer = window.setTimeout(() => {
        const currentVideo = videoRef.current;
        if (!currentVideo || !isActiveRef.current) return;
        if (isVideoElementReady(currentVideo.readyState)) {
          setReadySrc(resolvedSrcRef.current);
        }
        if (currentVideo.paused) {
          attemptPlay();
        }
      }, 260);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActiveRef.current) {
        const currentVideo = videoRef.current;
        if (currentVideo && currentVideo.paused) {
          attemptPlay();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (watchdogTimer !== null) {
        window.clearTimeout(watchdogTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, resolvedSrc, attemptPlay]);

  // Explicitly release the browser media decoder/pipeline on unmount so navigating
  // Studio <-> Preview never leaks decoders or locks Chrome's media cache
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (!video) return;
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        // Ignore cleanup errors on detached nodes
      }
    };
  }, []);

  const markVideoReady = useCallback(() => {
    const current = resolvedSrcRef.current;
    if (current) {
      setReadySrc(current);
    }
    if (isActiveRef.current) {
      attemptPlay();
    }
  }, [attemptPlay]);

  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.getAttribute('src')) return;
    const current = resolvedSrcRef.current;
    if (!canonicalSrc) return;

    // If a cached blob: URL was reclaimed by the browser, evict and switch to direct URL
    if (current && current.startsWith('blob:')) {
      eventVideoCache.evict(canonicalSrc);
      setReadySrc(null);
      setResolvedSrc(canonicalSrc);
      return;
    }

    // Retry transient direct network hiccups with brief backoff
    setReadySrc(null);
    setRetryAttempt((prev) => {
      if (prev >= MAX_DIRECT_RETRY_ATTEMPTS) return prev;
      const next = prev + 1;
      const separator = canonicalSrc.includes('?') ? '&' : '?';
      window.setTimeout(() => {
        setResolvedSrc(`${canonicalSrc}${separator}vretry=${next}`);
      }, 350 * next);
      return next;
    });
  }, [canonicalSrc]);

  const handleVideoEnded = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isActiveRef.current) return;
    video.currentTime = 0;
    attemptPlay();
  }, [attemptPlay]);

  const ariaLabel = sideLabel
    ? `${event.title} (${sideLabel}) celebration video`
    : `${event.title} celebration video`;

  return (
    <div className="media-slot-9-16 w-full h-full min-h-0">
      <div
        data-testid={testId ?? `event-video-frame-${event.id}`}
        data-media-mode={media.hasVideo ? 'video' : 'portrait-frame'}
        data-video-src={canonicalSrc ?? ''}
        data-video-ready={isVideoReady ? 'true' : 'false'}
        data-video-source-kind={
          resolvedSrc?.startsWith('blob:')
            ? 'blob'
            : resolvedSrc
              ? 'direct'
              : 'pending'
        }
        data-video-retries={retryAttempt}
        className={`media-frame-9-16 relative shrink-0 ${
          compact ? 'rounded-[14px] p-[2.5px]' : 'rounded-[18px] p-[3.5px]'
        } bg-gradient-to-b from-[#DFBE7B]/90 via-[#C89D54]/60 to-[#DFBE7B]/90 shadow-[0_14px_34px_rgba(77,10,20,0.18)]`}
      >
        <div
          className={`relative w-full h-full ${
            compact ? 'rounded-[11.5px]' : 'rounded-[14.5px]'
          } overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#74111D_0%,#4D0A14_65%,#34060D_100%)]`}
        >
          {/* Royal Maroon Cultural Medallion Backdrop (shown only if video is unavailable or still decoding) */}
          <div
            aria-hidden={isVideoReady ? 'true' : undefined}
            className={`absolute inset-0 flex items-center justify-center ${
              compact ? 'p-2.5' : 'p-4'
            } transition-opacity duration-200 ${
              isVideoReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute ${
                compact ? 'inset-1.5 rounded-[8px]' : 'inset-2.5 rounded-[10px]'
              } border border-[#DFBE7B]/35`}
            >
              <CornerBracket
                position="tl"
                className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-[#DFBE7B]/80 absolute -top-0.5 -left-0.5`}
              />
              <CornerBracket
                position="tr"
                className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-[#DFBE7B]/80 absolute -top-0.5 -right-0.5`}
              />
              <CornerBracket
                position="bl"
                className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-[#DFBE7B]/80 absolute -bottom-0.5 -left-0.5`}
              />
              <CornerBracket
                position="br"
                className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-[#DFBE7B]/80 absolute -bottom-0.5 -right-0.5`}
              />
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(253,243,208,0.22)_0%,rgba(223,190,123,0.08)_52%,transparent_74%)]"
            />

            <div
              className={`relative z-10 ${
                compact ? 'w-[76%] max-w-[108px]' : 'w-[78%] max-w-[152px]'
              } aspect-square flex items-center justify-center`}
            >
              <EventMedallionIllustration
                eventId={event.id}
                className="w-full h-full"
              />
            </div>
          </div>

          {media.hasVideo && canonicalSrc && (
            <video
              ref={videoRef}
              src={resolvedSrc ?? undefined}
              autoPlay={isActive && media.autoPlay}
              loop={media.loop}
              muted={media.muted}
              playsInline={media.playsInline}
              controls={media.controls}
              disablePictureInPicture
              disableRemotePlayback
              preload="auto"
              aria-label={ariaLabel}
              onLoadedData={markVideoReady}
              onCanPlay={markVideoReady}
              onCanPlayThrough={markVideoReady}
              onPlaying={markVideoReady}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              className={`relative z-10 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-200 ${
                isVideoReady ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
