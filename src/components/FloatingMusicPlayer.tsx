import React, { useEffect, useRef, useState } from 'react';
import { GramophoneIcon } from './InviteIllustrations';

/**
 * Drop the uploaded wedding soundtrack path here (e.g., '/assets/wedding-music.mp3')
 * once provided. While null, a gentle ambient acoustic chord progression plays via
 * Web Audio API so autoplay, mute, and unmute work seamlessly with zero 404 requests.
 */
const WEDDING_MUSIC_SRC: string | null =
  '/assets/aistudio/Website__1__7a6f43ef.mp3';

interface AmbientEngine {
  start: () => Promise<boolean>;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
}

function createAmbientAudioEngine(): AmbientEngine | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let timerId: number | null = null;
  let step = 0;
  let isMuted = false;

  // Soft warm acoustic arpeggio chords (Cadd9 -> Fmaj7 -> Am7 -> G6)
  const chords = [
    [261.63, 329.63, 392.0, 587.33],
    [174.61, 261.63, 329.63, 440.0],
    [220.0, 261.63, 329.63, 392.0],
    [196.0, 293.66, 329.63, 392.0],
  ];

  const scheduleChord = () => {
    if (!ctx || !masterGain || ctx.state !== 'running') return;
    const notes = chords[step % chords.length];
    step += 1;
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!ctx || !masterGain) return;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      const startAt = now + idx * 0.16;
      env.gain.setValueAtTime(0.0001, startAt);
      env.gain.linearRampToValueAtTime(0.032 / (idx * 0.35 + 1), startAt + 0.45);
      env.gain.exponentialRampToValueAtTime(0.0001, startAt + 3.4);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(startAt);
      osc.stop(startAt + 3.5);
    });
  };

  const ensureContext = () => {
    if (ctx) return;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = isMuted ? 0 : 0.7;
    masterGain.connect(ctx.destination);
  };

  return {
    async start() {
      try {
        ensureContext();
        if (!ctx) return false;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        if (ctx.state !== 'running') return false;

        if (timerId === null) {
          scheduleChord();
          timerId = window.setInterval(scheduleChord, 3400);
        }
        return true;
      } catch {
        return false;
      }
    },
    setMuted(muted: boolean) {
      isMuted = muted;
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.08);
      }
    },
    dispose() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
      if (ctx) {
        void ctx.close().catch(() => {});
        ctx = null;
        masterGain = null;
      }
    },
  };
}

export interface FloatingMusicPlayerHandle {
  startPlayback: () => Promise<boolean>;
}

interface FloatingMusicPlayerProps {
  /** Whether to display the floating Gramophone mute/unmute button (hidden on the curtain page). */
  visible?: boolean;
  /** Only attempt autoplay on mount when the curtain is bypassed (e.g., ?autostart=1). */
  autoStart?: boolean;
}

/**
 * Background wedding music controller with a floating vintage Gramophone button.
 * Music stays silent on the curtain stage and begins cleanly when startPlayback()
 * is invoked upon clicking the wax seal.
 */
export const FloatingMusicPlayer = React.forwardRef<
  FloatingMusicPlayerHandle,
  FloatingMusicPlayerProps
>(({ visible = true, autoStart = false }, ref) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTriggered, setPlaybackTriggered] = useState(false);
  const mutedRef = useRef(false);
  const disposedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<AmbientEngine | null>(null);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  const startPlaybackInternal = React.useCallback(async (): Promise<boolean> => {
    if (disposedRef.current || mutedRef.current) return false;
    setPlaybackTriggered(true);

    if (WEDDING_MUSIC_SRC && audioRef.current) {
      try {
        audioRef.current.muted = false;
        await audioRef.current.play();
        if (!disposedRef.current) setIsPlaying(true);
        return true;
      } catch {
        return false;
      }
    }

    if (!engineRef.current) {
      engineRef.current = createAmbientAudioEngine();
    }
    const started = await engineRef.current?.start();
    if (started && !disposedRef.current) {
      setIsPlaying(true);
      return true;
    }
    return false;
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      startPlayback: () => startPlaybackInternal(),
    }),
    [startPlaybackInternal]
  );

  useEffect(() => {
    disposedRef.current = false;

    if (!autoStart) {
      return () => {
        disposedRef.current = true;
        if (audioRef.current) {
          audioRef.current.pause();
        }
        engineRef.current?.dispose();
        engineRef.current = null;
      };
    }

    void startPlaybackInternal();

    const handleFirstGesture = () => {
      if (mutedRef.current) return;
      void startPlaybackInternal().then((started) => {
        if (started) {
          window.removeEventListener('pointerdown', handleFirstGesture);
          window.removeEventListener('keydown', handleFirstGesture);
        }
      });
    };

    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      disposedRef.current = true;
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [autoStart, startPlaybackInternal]);

  const handleToggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    mutedRef.current = nextMuted;

    if (WEDDING_MUSIC_SRC && audioRef.current) {
      audioRef.current.muted = nextMuted;
      if (nextMuted) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
      return;
    }

    if (!engineRef.current) {
      engineRef.current = createAmbientAudioEngine();
    }
    engineRef.current?.setMuted(nextMuted);

    if (nextMuted) {
      setIsPlaying(false);
    } else {
      const started = await engineRef.current?.start();
      setIsPlaying(Boolean(started));
    }
  };

  return (
    <>
      {WEDDING_MUSIC_SRC && (
        <audio
          ref={audioRef}
          data-testid="wedding-music-audio"
          data-playing={isPlaying ? 'true' : 'false'}
          data-playback-triggered={playbackTriggered ? 'true' : 'false'}
          src={WEDDING_MUSIC_SRC}
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      )}

      {visible && (
        <button
          type="button"
          onClick={() => void handleToggleMute()}
          data-testid="music-toggle-button"
          data-muted={isMuted ? 'true' : 'false'}
          aria-label={isMuted ? 'Unmute wedding music' : 'Mute wedding music'}
          aria-pressed={!isMuted}
          title={isMuted ? 'Unmute music' : 'Mute music'}
          className="fixed top-7 right-7 sm:top-[52px] sm:right-[52px] z-[75] group inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#63111D] border-[1.5px] border-[#DFBE7B] text-[#F4D99B] hover:bg-[#4D0A14] hover:border-[#F5DFAA] shadow-[0_8px_22px_rgba(35,6,11,0.36)] hover:scale-105 active:scale-95 transition-transform transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF5EC] animate-studio-enter"
        >
          {!isMuted && isPlaying && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-[#DFBE7B]/50 invite-seal-pulse"
            />
          )}
          <GramophoneIcon muted={isMuted} className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] relative z-10" />
        </button>
      )}
    </>
  );
});

FloatingMusicPlayer.displayName = 'FloatingMusicPlayer';
