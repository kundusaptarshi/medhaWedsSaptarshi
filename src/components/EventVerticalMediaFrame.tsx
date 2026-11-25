import React, { useEffect, useRef, useState } from 'react';
import type { WeddingEventDetail } from '../data/weddingEventDetails';
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

/**
 * Vertical 9:16 portrait showcase frame for each celebration event.
 * - Uses container-query sizing (.media-slot-9-16 / .media-frame-9-16) so the
 *   video fills the maximum possible vertical & horizontal space inside a single
 *   100dvh viewport without clipping or vertical scrolling.
 * - Renders a seamless looping HTML5 <video> (autoplay loop muted playsinline)
 *   with zero browser controls and no mute/unmute overlay button.
 * - Keeps the royal-maroon cultural medallion backdrop underneath so the frame
 *   looks polished while loading or before user-provided /videos/*.mp4 files are dropped in.
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
  const media = getEventMediaConfig({
    videoSrc: videoSrcOverride ?? event.videoSrc,
  });
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setVideoReady(false);
  }, [media.videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media.hasVideo) return;

    video.muted = true;
    video.defaultMuted = true;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isActive, media.hasVideo, media.videoSrc]);

  const ariaLabel = sideLabel
    ? `${event.title} (${sideLabel}) celebration video`
    : `${event.title} celebration video`;

  return (
    <div className="media-slot-9-16 w-full h-full min-h-0">
      <div
        data-testid={testId ?? `event-video-frame-${event.id}`}
        data-media-mode={media.hasVideo ? 'video' : 'portrait-frame'}
        data-video-src={media.videoSrc ?? ''}
        className={`media-frame-9-16 relative shrink-0 ${
          compact ? 'rounded-[14px] p-[2.5px]' : 'rounded-[18px] p-[3.5px]'
        } bg-gradient-to-b from-[#DFBE7B]/90 via-[#C89D54]/60 to-[#DFBE7B]/90 shadow-[0_14px_34px_rgba(77,10,20,0.18)]`}
      >
        <div
          className={`relative w-full h-full ${
            compact ? 'rounded-[11.5px]' : 'rounded-[14.5px]'
          } overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#74111D_0%,#4D0A14_65%,#34060D_100%)]`}
        >
          {/* Royal Maroon Cultural Medallion Backdrop (shown while loading or if local /videos/*.mp4 is not yet placed) */}
          <div
            aria-hidden={videoReady ? 'true' : undefined}
            className={`absolute inset-0 flex items-center justify-center ${
              compact ? 'p-2.5' : 'p-4'
            } transition-opacity duration-300 ${
              videoReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
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

          {media.hasVideo && media.videoSrc && (
            <video
              key={media.videoSrc}
              ref={videoRef}
              autoPlay={media.autoPlay}
              loop={media.loop}
              muted={media.muted}
              playsInline={media.playsInline}
              controls={media.controls}
              disablePictureInPicture
              disableRemotePlayback
              preload="metadata"
              aria-label={ariaLabel}
              onLoadedData={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoReady(false)}
              className={`relative z-10 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-300 ${
                videoReady ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <source src={media.videoSrc} type="video/mp4" />
            </video>
          )}
        </div>
      </div>
    </div>
  );
};
