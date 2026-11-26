import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Info,
  MapPinOff,
  Navigation,
  Phone,
  RotateCcw,
  Send,
} from 'lucide-react';
import { FAMILY_CONTACTS, type FamilyKey } from '../data/familyContacts';
import {
  ALL_WEDDING_EVENT_DETAILS,
  resolveEventDetails,
} from '../data/weddingEventDetails';
import { formatFirestoreUserMessage } from '../firebase';
import {
  fetchPublicInvitationWithEvents,
  submitInvitationRsvp,
} from '../services/studioStore';
import type {
  EventRsvpDraft,
  InvitationRecord,
  InviteSideMode,
  RsvpAlcoholPreference,
  RsvpAttendance,
  RsvpFoodPreference,
} from '../types';
import {
  buildInitialEventRsvpDrafts,
  eventSupportsAlcohol,
  parseGenericInviteParams,
  RSVP_HEADCOUNT_MAX,
  RSVP_HEADCOUNT_MIN,
  validateAndNormalizePerEventRsvp,
} from '../utils/invitationLogic';
import {
  collectInviteVideoUrls,
  eventVideoCache,
} from '../utils/eventVideoCache';
import {
  computeCountdownParts,
  detectBrowserMobileDevice,
  getEventDirectionsState,
  getEventSideHeaderLabel,
  pickNextCountdownEvent,
  resolveDeviceDirectionsUrl,
  resolveInviteSideMode,
} from '../utils/invitePresentation';
import {
  buildCinemaScenes,
  buildInviteCascadeSections,
  computeCelebrationsChromeState,
  computeDirectScenePairTransition,
  computeParallaxOffsetPx,
  createInitialWheelGestureState,
  evaluateTouchNavigation,
  evaluateWheelNavigation,
  getEffectiveSceneScrollBoundary,
  getSceneScrollBoundary,
  type WheelGestureState,
} from '../utils/cascadeDeck';
import {
  getCurtainLayerState,
  getCurtainSchedule,
  shouldAutostartInvite,
  type CurtainPhase,
} from '../utils/curtainTimeline';
import { AlpanaDivider, AlpanaMandala } from './AlpanaOrnaments';
import { CurtainOpeningStage } from './CurtainOpeningStage';
import { EventKnowMoreModal } from './EventKnowMoreModal';
import { EventVerticalMediaFrame } from './EventVerticalMediaFrame';
import { FamilyContactModal } from './FamilyContactModal';
import {
  FloatingMusicPlayer,
  type FloatingMusicPlayerHandle,
} from './FloatingMusicPlayer';
import {
  CornerBracket,
  CoupleSideFigure,
  ensureSealLogoDecoded,
  FallingPetals,
  FamilyPortraitFigure,
  HeroWelcomeFigure,
  LotusEmblem,
  PIHU_WELCOME_FIGURE_SRC,
  RIYAN_WELCOME_FIGURE_SRC,
  SacredYagyaBonfire,
} from './InviteIllustrations';
import { RevealFromSide } from './ScrollReveal';
import { StoryYearCarousel } from './StoryYearCarousel';
import { StudioFloatingSparkles } from './StudioFloatingSparkles';

const GROOM_PARENTAGE = (
  <>
    Son of <strong className="font-bold text-[#4D0A14]">Mrs. Piyali Kundu</strong> and{' '}
    <strong className="font-bold text-[#4D0A14]">Mr. Susanta Kundu</strong>
  </>
);
const BRIDE_PARENTAGE = (
  <>
    Daughter of <strong className="font-bold text-[#4D0A14]">Mrs. Sudipta Bhattacharya</strong> and{' '}
    <strong className="font-bold text-[#4D0A14]">Mr. Utpal Bhattacharya</strong>
  </>
);

interface GuestInviteViewProps {
  slug: string;
  searchOverride?: string;
  onBackToStudio?: () => void;
}

const EMPTY_DRAFT: EventRsvpDraft = {
  attending: '',
  headcount: '1',
  foodPreference: '',
  alcoholPreference: '',
};

/**
 * Full luxury wedding invitation experience:
 * 1. Interactive royal maroon velvet curtains with crimson wax seal ("TAP THE SEAL TO OPEN")
 * 2. Royal maroon hero with rotating gold Alpana mandala, couple lockup & 11 · 02 · 2027
 * 3. "Us Through The Years" horizontal 2019–2026 image carousel with year header flanked by Groom & Bride figures
 * 4. Alternating vertical celebration timeline ("Join us for these moments")
 *    with bespoke cultural SVG medallions, Directions & Save the Date (.ics)
 * 5. Live Royal Maroon Countdown banner with invited-event selector
 * 6. Full-width RSVP button opening a modal dialog (invited events only, conditional headcount,
 *    and alcohol choice strictly on Mehendi/Cocktail)
 * 7. Heartfelt closing blessing footer + always-floating top-right Gramophone music toggle
 */
export const GuestInviteView: React.FC<GuestInviteViewProps> = ({
  slug,
  searchOverride,
  onBackToStudio,
}) => {
  const normalizedSlug = slug.toLowerCase();
  const isLegacyGenericRoute = normalizedSlug === 'generic';
  const isReferencePreview =
    normalizedSlug === 'reference' || normalizedSlug === 'preview-all';

  const resolvedSearch =
    searchOverride !== undefined
      ? searchOverride
      : typeof window !== 'undefined'
        ? window.location.search
        : '';

  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>(
    'loading'
  );
  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [invitedEventIds, setInvitedEventIds] = useState<string[]>([]);
  const [activeSide, setActiveSide] = useState<InviteSideMode>(() =>
    resolveInviteSideMode({
      search: resolvedSearch,
      preferGenericWhenNoParam: true,
    })
  );
  const eventDetails = useMemo(
    () => resolveEventDetails(invitedEventIds, activeSide),
    [invitedEventIds, activeSide]
  );

  // Proactively warm all invited celebration videos into the shared RAM Blob cache
  // as soon as the invitation's events are known (while the guest is on Curtain/Hero).
  useEffect(() => {
    if (eventDetails.length === 0) return;
    const allUrls = collectInviteVideoUrls(eventDetails);
    eventVideoCache.preload(allUrls, { concurrency: 3 });
  }, [eventDetails]);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() =>
    detectBrowserMobileDevice()
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncDevice = () => setIsMobileDevice(detectBrowserMobileDevice());
    syncDevice();
    window.addEventListener('resize', syncDevice);
    const mq = window.matchMedia?.('(pointer: coarse)');
    mq?.addEventListener?.('change', syncDevice);
    return () => {
      window.removeEventListener('resize', syncDevice);
      mq?.removeEventListener?.('change', syncDevice);
    };
  }, []);
  const isGeneric = isLegacyGenericRoute || Boolean(invitation?.isGeneric);

  // Opening royal maroon velvet curtains state
  const autostart = shouldAutostartInvite(resolvedSearch);
  const [curtainPhase, setCurtainPhase] = useState<CurtainPhase>(
    autostart ? 'opened' : 'closed'
  );
  const curtainTimersRef = useRef<number[]>([]);
  const musicPlayerRef = useRef<FloatingMusicPlayerHandle | null>(null);
  const curtainLayers = getCurtainLayerState(curtainPhase);
  const heroEntered = curtainLayers.heroRevealed;
  const sealRemoved = !curtainLayers.overlayMounted;

  // Live countdown ticker & user-chosen invited event
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedCountdownEventId, setSelectedCountdownEventId] = useState<
    string | null
  >(null);

  // Per-event RSVP dialog, Event Details dialog, & Family Contact modal state
  const [rsvpDialogOpen, setRsvpDialogOpen] = useState(false);
  const [knowMoreEventId, setKnowMoreEventId] = useState<string | null>(null);
  const [activeContactFamily, setActiveContactFamily] =
    useState<FamilyKey | null>(null);
  const knowMoreEvent = useMemo(
    () => eventDetails.find((ev) => ev.id === knowMoreEventId) ?? null,
    [eventDetails, knowMoreEventId]
  );
  const [eventDrafts, setEventDrafts] = useState<Record<string, EventRsvpDraft>>({});
  const [rsvpErrors, setRsvpErrors] = useState<string[]>([]);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpSavedMessage, setRsvpSavedMessage] = useState<string | null>(null);

  // Active fixed-viewport cinema scene index + direct DOM refs for 60fps pure crossfade & per-scene page scroll
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [displayedCelebrationIndex, setDisplayedCelebrationIndex] = useState(0);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const sheetRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const celebrationsChromeRef = useRef<HTMLDivElement | null>(null);
  const celebrationsNumberlineRef = useRef<HTMLDivElement | null>(null);
  const activeSceneIndexRef = useRef(0);
  const wheelGestureStateRef = useRef<WheelGestureState>(
    createInitialWheelGestureState()
  );
  const touchLockUntilRef = useRef(0);
  const transitionFnRef = useRef<(targetIndex: number, immediate?: boolean) => void>(
    () => {}
  );

  useEffect(() => {
    setNowMs(Date.now());
    const interval = window.setInterval(() => {
      if (activeSceneIndexRef.current >= Math.max(0, eventDetails.length + 2)) {
        setNowMs(Date.now());
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [eventDetails.length]);

  useEffect(() => {
    if (activeSceneIndex >= Math.max(0, eventDetails.length + 2)) {
      setNowMs(Date.now());
    }
  }, [activeSceneIndex, eventDetails.length]);

  useEffect(() => {
    if (!rsvpDialogOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submittingRsvp) {
        setRsvpDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rsvpDialogOpen, submittingRsvp]);

  // Lock outer document scroll while the full-viewport invitation stage is active
  // so scroll intensity never causes runaway document momentum or skips views
  useEffect(() => {
    if (status !== 'ready') return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [status]);

  useEffect(() => {
    let active = true;
    setActiveSceneIndex(0);
    setDisplayedCelebrationIndex(0);
    activeSceneIndexRef.current = 0;
    wheelGestureStateRef.current = createInitialWheelGestureState();
    touchLockUntilRef.current = 0;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    curtainTimersRef.current.forEach((id) => window.clearTimeout(id));
    curtainTimersRef.current = [];
    setCurtainPhase(autostart ? 'opened' : 'closed');
    setSelectedCountdownEventId(null);
    setRsvpDialogOpen(false);
    setKnowMoreEventId(null);
    setActiveContactFamily(null);
    setRsvpErrors([]);
    setRsvpSavedMessage(null);

    const markReadyAfterSealLogo = () => {
      if (autostart) {
        if (active) setStatus('ready');
        return;
      }
      void ensureSealLogoDecoded().then(() => {
        if (active) setStatus('ready');
      });
    };

    if (isReferencePreview) {
      const resolvedMode = resolveInviteSideMode({
        search: resolvedSearch,
        preferGenericWhenNoParam: true,
      });
      const allIds = ALL_WEDDING_EVENT_DETAILS.map((ev) => ev.id);
      setActiveSide(resolvedMode);
      setInvitation({
        slug: 'reference',
        side: resolvedMode === 'groom' ? 'groom' : 'bride',
        guestNames: ['Our Dear Guest'],
        withFamily: true,
        displayGuestName: 'Our Dear Guest & Family',
        eventIds: allIds,
        rsvp: null,
        createdBy: 'studio-host',
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      });
      setInvitedEventIds(allIds);
      setEventDrafts(buildInitialEventRsvpDrafts(allIds, null));
      document.title = 'Medha Weds Saptarshi — Wedding Invitation';
      markReadyAfterSealLogo();
      return () => {
        active = false;
      };
    }

    if (isLegacyGenericRoute) {
      const { eventIds } = parseGenericInviteParams(resolvedSearch);
      const effectiveMode = resolveInviteSideMode({
        search: resolvedSearch,
        preferGenericWhenNoParam: true,
      });
      const effectiveEventIds =
        eventIds.length > 0
          ? eventIds
          : ALL_WEDDING_EVENT_DETAILS.map((ev) => ev.id);
      const resolved = resolveEventDetails(effectiveEventIds, effectiveMode);
      if (resolved.length === 0) {
        setStatus('not-found');
        return () => {
          active = false;
        };
      }
      setActiveSide(effectiveMode);
      setInvitation({
        slug: 'generic',
        isGeneric: true,
        side: effectiveMode === 'groom' ? 'groom' : 'bride',
        guestNames: [],
        withFamily: false,
        displayGuestName: '',
        eventIds: effectiveEventIds,
        rsvp: null,
        createdBy: 'studio-host',
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      });
      setInvitedEventIds(effectiveEventIds);
      setEventDrafts({});
      document.title = 'Wedding Invitation — Medha Weds Saptarshi';
      markReadyAfterSealLogo();
      return () => {
        active = false;
      };
    }

    setStatus('loading');
    Promise.all([
      fetchPublicInvitationWithEvents(slug),
      autostart ? Promise.resolve() : ensureSealLogoDecoded(),
    ])
      .then(([result]) => {
        if (!active) return;
        if (!result) {
          setStatus('not-found');
          return;
        }
        const effectiveMode = resolveInviteSideMode({
          search: resolvedSearch,
          invitationSide: result.invitation.side,
        });
        // Start warming the invited celebration videos immediately before React commits
        eventVideoCache.preload(
          collectInviteVideoUrls(
            resolveEventDetails(result.invitation.eventIds, effectiveMode)
          ),
          { concurrency: 3 }
        );
        setActiveSide(effectiveMode);
        setInvitation(result.invitation);
        setInvitedEventIds(result.invitation.eventIds);
        if (result.invitation.isGeneric) {
          setEventDrafts({});
          document.title = 'Wedding Invitation — Medha Weds Saptarshi';
        } else {
          setEventDrafts(
            buildInitialEventRsvpDrafts(
              result.invitation.eventIds,
              result.invitation.rsvp
            )
          );
          document.title = `${result.invitation.displayGuestName} — Medha Weds Saptarshi`;
        }
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [slug, isLegacyGenericRoute, isReferencePreview, resolvedSearch, autostart]);

  useEffect(() => {
    return () => {
      curtainTimersRef.current.forEach((id) => window.clearTimeout(id));
      curtainTimersRef.current = [];
    };
  }, []);

  const handleOpenSeal = () => {
    if (curtainPhase !== 'closed') return;
    curtainTimersRef.current.forEach((id) => window.clearTimeout(id));
    curtainTimersRef.current = [];

    // Start wedding music synchronously inside the seal click gesture
    void musicPlayerRef.current?.startPlayback();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const schedule = getCurtainSchedule(prefersReducedMotion);

    setCurtainPhase('unsealing');
    curtainTimersRef.current = [
      window.setTimeout(() => setCurtainPhase('parting'), schedule.partMs),
      window.setTimeout(() => setCurtainPhase('revealing'), schedule.revealMs),
      window.setTimeout(() => setCurtainPhase('opened'), schedule.completeMs),
    ];
  };

  const defaultCountdownEvent = useMemo(
    () => pickNextCountdownEvent(eventDetails, nowMs),
    [eventDetails, nowMs]
  );

  const countdownTargetEvent = useMemo(() => {
    if (selectedCountdownEventId) {
      const chosen = eventDetails.find((ev) => ev.id === selectedCountdownEventId);
      if (chosen) return chosen;
    }
    return defaultCountdownEvent;
  }, [eventDetails, selectedCountdownEventId, defaultCountdownEvent]);

  const countdown = useMemo(() => {
    if (!countdownTargetEvent) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false };
    }
    return computeCountdownParts(countdownTargetEvent.startIso, nowMs);
  }, [countdownTargetEvent, nowMs]);

  const hasCountdownScene = Boolean(countdownTargetEvent);

  const cascadeSections = useMemo(
    () => buildInviteCascadeSections(eventDetails.length, hasCountdownScene),
    [eventDetails.length, hasCountdownScene]
  );

  const eventTitlesKey = eventDetails.map((ev) => ev.title).join('\u0000');

  const cinemaScenes = useMemo(
    () =>
      buildCinemaScenes(
        eventTitlesKey ? eventTitlesKey.split('\u0000') : [],
        hasCountdownScene
      ),
    [eventTitlesKey, hasCountdownScene]
  );

  const jumpToSceneIndex = useCallback(
    (sceneIndex: number) => {
      const maxIdx = Math.max(0, cinemaScenes.length - 1);
      const clamped = Math.max(0, Math.min(maxIdx, sceneIndex));
      const now = performance.now();
      wheelGestureStateRef.current = {
        ...wheelGestureStateRef.current,
        lockedUntilMs: now + 440,
        awaitingGestureEnd: false,
      };
      touchLockUntilRef.current = now + 440;
      transitionFnRef.current(clamped, false);
    },
    [cinemaScenes.length]
  );

  const scrollToSection = useCallback(
    (chapterId: string) => {
      const idx = cinemaScenes.findIndex((s) => s.chapterId === chapterId);
      if (idx >= 0) {
        jumpToSceneIndex(idx);
      }
    },
    [cinemaScenes, jumpToSceneIndex]
  );

  // 60fps Fixed-Viewport Discrete Scene Crossfade + Per-Scene Page-Like Scroll Engine
  useEffect(() => {
    if (status !== 'ready' || cinemaScenes.length === 0) return;

    const totalScenes = cinemaScenes.length;
    const maxIdx = Math.max(0, totalScenes - 1);
    const TRANSITION_DURATION_MS = 440;
    const GESTURE_LOCK_MS = 440;

    let rafId: number | null = null;
    let fromIdx = activeSceneIndexRef.current;
    let toIdx = activeSceneIndexRef.current;
    let animStartMs = 0;
    let isAnimating = false;

    // Pre-index parallax nodes by scene id once per layout for zero per-frame DOM queries
    const parallaxByScene = new Map<
      string,
      Array<{ el: HTMLElement; speed: number; maxShift: number }>
    >();
    const allParallax = Array.from(
      stageContainerRef.current?.querySelectorAll<HTMLElement>('[data-parallax-section]') ??
        []
    );
    for (const el of allParallax) {
      const secId = el.dataset.parallaxSection ?? '';
      if (!secId) continue;
      const list = parallaxByScene.get(secId) ?? [];
      list.push({
        el,
        speed: Number(el.dataset.parallaxSpeed ?? '0'),
        maxShift: Number(el.dataset.parallaxMax ?? '110'),
      });
      parallaxByScene.set(secId, list);
    }

    const applyPairFrame = (fromIndex: number, toIndex: number, t: number) => {
      const vh = window.innerHeight || 900;
      const prefersReducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      if (progressBarRef.current) {
        const interp = fromIndex + (toIndex - fromIndex) * t;
        const ratio = maxIdx > 0 ? Math.max(0, Math.min(1, interp / maxIdx)) : 1;
        progressBarRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
      }

      const fromIsCelebration = cinemaScenes[fromIndex]?.kind === 'celebrations';
      const toIsCelebration = cinemaScenes[toIndex]?.kind === 'celebrations';
      const chromeState = computeCelebrationsChromeState(
        fromIsCelebration,
        toIsCelebration,
        t
      );
      if (celebrationsChromeRef.current) {
        celebrationsChromeRef.current.style.visibility = chromeState.visible
          ? 'visible'
          : 'hidden';
        celebrationsChromeRef.current.style.opacity = String(chromeState.opacity);
      }
      if (celebrationsNumberlineRef.current) {
        celebrationsNumberlineRef.current.style.pointerEvents = chromeState.interactive
          ? 'auto'
          : 'none';
      }

      for (let idx = 0; idx < totalScenes; idx++) {
        const scene = cinemaScenes[idx];
        const state = computeDirectScenePairTransition(
          idx,
          fromIndex,
          toIndex,
          t,
          vh
        );
        const sheet = sheetRefs.current[scene.id];
        const scroller = scrollerRefs.current[scene.id];

        if (sheet) {
          sheet.style.visibility = state.visible ? 'visible' : 'hidden';
          sheet.style.opacity = String(state.sheetOpacity);
          sheet.style.pointerEvents = state.interactive ? 'auto' : 'none';
          sheet.style.zIndex = String(10 + state.zIndexOffset);
        }

        if (scroller) {
          scroller.style.opacity = String(state.contentOpacity);
          scroller.style.transform =
            prefersReducedMotion || state.contentScale === 1
              ? ''
              : `scale(${state.contentScale})`;
        }

        if (state.visible) {
          const layers = parallaxByScene.get(scene.id);
          if (layers) {
            for (const layer of layers) {
              if (prefersReducedMotion) {
                if (layer.el.style.transform) layer.el.style.transform = '';
                continue;
              }
              const shiftY = computeParallaxOffsetPx(
                state.parallaxInputPx,
                vh,
                layer.speed,
                layer.maxShift
              );
              layer.el.style.transform =
                shiftY === 0 ? '' : `translate3d(0, ${shiftY}px, 0)`;
            }
          }
        }
      }
    };

    const resetScrollerToTop = (sceneIndex: number) => {
      const scene = cinemaScenes[sceneIndex];
      if (!scene) return;
      const scroller = scrollerRefs.current[scene.id];
      if (scroller) {
        scroller.scrollTop = 0;
      }
    };

    const startTransition = (targetIndex: number, immediate = false) => {
      const clamped = Math.max(0, Math.min(maxIdx, targetIndex));
      const current = activeSceneIndexRef.current;

      // Always land cleanly at the very top of the destination view
      resetScrollerToTop(clamped);

      const destinationScene = cinemaScenes[clamped];
      if (destinationScene?.kind === 'celebrations') {
        setDisplayedCelebrationIndex(destinationScene.eventIndex ?? 0);
      }

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }

      const prefersReducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      if (immediate || prefersReducedMotion || clamped === current) {
        fromIdx = clamped;
        toIdx = clamped;
        isAnimating = false;
        activeSceneIndexRef.current = clamped;
        setActiveSceneIndex(clamped);
        applyPairFrame(clamped, clamped, 1);
        return;
      }

      fromIdx = current;
      toIdx = clamped;
      animStartMs = performance.now();
      isAnimating = true;
      activeSceneIndexRef.current = clamped;
      setActiveSceneIndex(clamped);
      applyPairFrame(fromIdx, toIdx, 0);

      const step = (now: number) => {
        rafId = null;
        const elapsed = now - animStartMs;
        const t = Math.max(0, Math.min(1, elapsed / TRANSITION_DURATION_MS));
        applyPairFrame(fromIdx, toIdx, t);

        if (t < 1) {
          rafId = window.requestAnimationFrame(step);
        } else {
          isAnimating = false;
          fromIdx = toIdx;
          resetScrollerToTop(toIdx);
        }
      };

      rafId = window.requestAnimationFrame(step);
    };

    transitionFnRef.current = startTransition;

    // Initial paint on current scene
    resetScrollerToTop(activeSceneIndexRef.current);
    applyPairFrame(activeSceneIndexRef.current, activeSceneIndexRef.current, 1);

    const getActiveScroller = (): HTMLDivElement | null => {
      const scene = cinemaScenes[activeSceneIndexRef.current];
      return scene ? scrollerRefs.current[scene.id] ?? null : null;
    };

    const getActiveBoundary = () => {
      const scene = cinemaScenes[activeSceneIndexRef.current];
      const scroller = scene ? scrollerRefs.current[scene.id] ?? null : null;
      if (!scroller) {
        return getSceneScrollBoundary(0, window.innerHeight || 900, window.innerHeight || 900);
      }
      return getEffectiveSceneScrollBoundary(
        scene?.kind,
        window.innerWidth || 1440,
        scroller.scrollTop,
        scroller.clientHeight,
        scroller.scrollHeight
      );
    };

    const isOverlayDialogOpen =
      rsvpDialogOpen || Boolean(knowMoreEvent) || Boolean(activeContactFamily);

    const onWheel = (e: WheelEvent) => {
      if (!sealRemoved || isOverlayDialogOpen) return;

      // Ignore horizontal wheel scrolls (e.g., trackpad horizontal swipe on carousels/tabs)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const vh = window.innerHeight || 900;
      const normalizedDeltaY =
        e.deltaMode === 1
          ? e.deltaY * 32
          : e.deltaMode === 2
            ? e.deltaY * vh
            : e.deltaY;

      const now = performance.now();
      const boundary = getActiveBoundary();
      const result = evaluateWheelNavigation(wheelGestureStateRef.current, {
        deltaY: normalizedDeltaY,
        nowMs: now,
        currentIndex: activeSceneIndexRef.current,
        totalScenes,
        boundary,
        isAnimating,
        transitionLockMs: GESTURE_LOCK_MS,
      });
      wheelGestureStateRef.current = result.nextState;

      if (result.action === 'scroll-inner') {
        const scroller = getActiveScroller();
        if (scroller && !(e.target instanceof Node && scroller.contains(e.target))) {
          e.preventDefault();
          scroller.scrollTop += normalizedDeltaY;
        }
        // Let the active scene's overflow-y container perform smooth native page-like scroll
        return;
      }

      e.preventDefault();

      if (result.action === 'advance-next') {
        touchLockUntilRef.current = now + GESTURE_LOCK_MS;
        startTransition(activeSceneIndexRef.current + 1, false);
      } else if (result.action === 'advance-prev') {
        touchLockUntilRef.current = now + GESTURE_LOCK_MS;
        startTransition(activeSceneIndexRef.current - 1, false);
      }
    };

    // Touch gesture tracking for phones/tablets
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartedAtTop = true;
    let touchStartedAtBottom = true;
    let touchTracking = false;
    let touchTriggered = false;

    const onTouchStart = (e: TouchEvent) => {
      if (!sealRemoved || isOverlayDialogOpen || e.touches.length !== 1) {
        touchTracking = false;
        return;
      }
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      const boundary = getActiveBoundary();
      touchStartedAtTop = boundary.atTop;
      touchStartedAtBottom = boundary.atBottom;
      touchTracking = true;
      touchTriggered = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchTracking || !sealRemoved || isOverlayDialogOpen || e.touches.length !== 1) {
        return;
      }
      const touch = e.touches[0];
      const deltaY = touchStartY - touch.clientY; // positive = finger moving up (scroll down)
      const deltaX = touchStartX - touch.clientX;
      const now = performance.now();
      const isLocked = isAnimating || now < touchLockUntilRef.current;

      // Block overscroll bleed on incoming scene while a transition is still settling
      if (touchTriggered || (isLocked && Math.abs(deltaY) > Math.abs(deltaX))) {
        e.preventDefault();
        return;
      }

      const action = evaluateTouchNavigation({
        deltaY,
        deltaX,
        startedAtTop: touchStartedAtTop,
        startedAtBottom: touchStartedAtBottom,
        currentIndex: activeSceneIndexRef.current,
        totalScenes,
        isLocked,
      });

      if (action === 'advance-next') {
        e.preventDefault();
        touchTriggered = true;
        touchLockUntilRef.current = now + GESTURE_LOCK_MS;
        wheelGestureStateRef.current = {
          ...wheelGestureStateRef.current,
          lockedUntilMs: now + GESTURE_LOCK_MS,
          awaitingGestureEnd: false,
        };
        startTransition(activeSceneIndexRef.current + 1, false);
      } else if (action === 'advance-prev') {
        e.preventDefault();
        touchTriggered = true;
        touchLockUntilRef.current = now + GESTURE_LOCK_MS;
        wheelGestureStateRef.current = {
          ...wheelGestureStateRef.current,
          lockedUntilMs: now + GESTURE_LOCK_MS,
          awaitingGestureEnd: false,
        };
        startTransition(activeSceneIndexRef.current - 1, false);
      }
    };

    const onTouchEnd = () => {
      touchTracking = false;
      touchTriggered = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!sealRemoved || isOverlayDialogOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.closest('[data-testid="story-image-carousel"]'))
      ) {
        return;
      }

      const isDown = e.key === 'ArrowDown' || e.key === 'PageDown';
      const isUp = e.key === 'ArrowUp' || e.key === 'PageUp';
      if (!isDown && !isUp) return;

      e.preventDefault();
      const now = performance.now();
      if (isAnimating || now < touchLockUntilRef.current) return;

      const scroller = getActiveScroller();
      const boundary = getActiveBoundary();
      const stepPx =
        e.key === 'PageDown' || e.key === 'PageUp'
          ? Math.round((scroller?.clientHeight || 700) * 0.72)
          : 140;

      if (isDown) {
        if (boundary.canScrollDown && scroller) {
          scroller.scrollBy({ top: stepPx, behavior: 'smooth' });
        } else if (!e.repeat && activeSceneIndexRef.current < maxIdx) {
          touchLockUntilRef.current = now + GESTURE_LOCK_MS;
          startTransition(activeSceneIndexRef.current + 1, false);
        }
      } else if (isUp) {
        if (boundary.canScrollUp && scroller) {
          scroller.scrollBy({ top: -stepPx, behavior: 'smooth' });
        } else if (!e.repeat && activeSceneIndexRef.current > 0) {
          touchLockUntilRef.current = now + GESTURE_LOCK_MS;
          startTransition(activeSceneIndexRef.current - 1, false);
        }
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    status,
    cinemaScenes,
    sealRemoved,
    rsvpDialogOpen,
    knowMoreEvent,
    activeContactFamily,
  ]);

  const updateEventDraft = (
    eventId: string,
    updater: (current: EventRsvpDraft) => EventRsvpDraft
  ) => {
    setEventDrafts((prev) => ({
      ...prev,
      [eventId]: updater(prev[eventId] ?? { ...EMPTY_DRAFT }),
    }));
    setRsvpErrors([]);
    setRsvpSavedMessage(null);
  };

  const handleToggleAttendance = (eventId: string, option: RsvpAttendance) => {
    updateEventDraft(eventId, (cur) => {
      if (cur.attending === option) {
        return { ...EMPTY_DRAFT };
      }
      if (option === 'not_coming') {
        return {
          attending: 'not_coming',
          headcount: '1',
          foodPreference: '',
          alcoholPreference: '',
        };
      }
      return {
        ...cur,
        attending: 'coming',
        headcount: cur.headcount.trim() || '1',
      };
    });
  };

  const handleToggleFood = (eventId: string, option: RsvpFoodPreference) => {
    updateEventDraft(eventId, (cur) => ({
      ...cur,
      foodPreference: cur.foodPreference === option ? '' : option,
    }));
  };

  const handleToggleAlcohol = (eventId: string, option: RsvpAlcoholPreference) => {
    updateEventDraft(eventId, (cur) => ({
      ...cur,
      alcoholPreference: cur.alcoholPreference === option ? '' : option,
    }));
  };

  const handleClearEvent = (eventId: string) => {
    updateEventDraft(eventId, () => ({ ...EMPTY_DRAFT }));
  };

  const handleOpenRsvpDialog = () => {
    if (!invitation || isGeneric) return;
    setEventDrafts(
      buildInitialEventRsvpDrafts(invitation.eventIds, invitation.rsvp)
    );
    setRsvpErrors([]);
    setRsvpDialogOpen(true);
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || isGeneric) return;

    const validation = validateAndNormalizePerEventRsvp(
      invitation.eventIds,
      eventDrafts,
      invitation.withFamily
    );
    if (!validation.valid) {
      setRsvpErrors(validation.errors);
      return;
    }

    if (isReferencePreview) {
      const hasResponses = Object.keys(validation.byEvent).length > 0;
      setInvitation((prev) =>
        prev
          ? {
              ...prev,
              rsvp: hasResponses
                ? { byEvent: validation.byEvent, respondedAtMs: Date.now() }
                : null,
            }
          : prev
      );
      setRsvpSavedMessage(
        hasResponses
          ? 'Preview mode: your per-event RSVP selections are ready. Live saving is active on every personalized guest link.'
          : 'Preview mode: your RSVP selections have been cleared.'
      );
      setRsvpDialogOpen(false);
      return;
    }

    setRsvpErrors([]);
    setSubmittingRsvp(true);
    setRsvpSavedMessage(null);
    try {
      const savedRsvp = await submitInvitationRsvp(
        invitation.slug,
        validation.byEvent
      );
      setInvitation((prev) => (prev ? { ...prev, rsvp: savedRsvp } : prev));
      setEventDrafts(buildInitialEventRsvpDrafts(invitation.eventIds, savedRsvp));
      setRsvpSavedMessage(
        savedRsvp
          ? 'Thank you! Your RSVP has been recorded. You may update your response anytime.'
          : 'Your RSVP selections have been cleared.'
      );
      setRsvpDialogOpen(false);
    } catch (err) {
      setRsvpErrors([
        formatFirestoreUserMessage(
          err,
          'Unable to save your RSVP right now. Please try again.'
        ),
      ]);
    } finally {
      setSubmittingRsvp(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#4D0A14] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-[#DFBE7B]/30 border-t-[#DFBE7B] animate-spin" />
          <p className="font-editorial text-2xl text-[#FAF5EC]">
            Preparing your invitation…
          </p>
        </div>
      </div>
    );
  }

  if (status === 'not-found' || status === 'error' || !invitation) {
    return (
      <div className="min-h-screen bg-[#FDF3D0] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-[#FFF9E2] border border-[#E6D194] p-8 text-center">
          <p className="text-[11px] font-medium tracking-[0.26em] uppercase text-[#9E2A2B]">
            Wedding Invitation
          </p>
          <h1 className="mt-2 font-editorial text-3xl font-medium text-[#4D0A14]">
            Medha Weds Saptarshi
          </h1>
          <AlpanaDivider className="w-40 mx-auto my-4 text-[#C89D54]" />
          <p className="text-sm text-[#4C373A] leading-relaxed">
            {status === 'error'
              ? 'We could not load this invitation right now. Please refresh or try again shortly.'
              : 'This invitation link is no longer active or could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  const addressedName =
    !isGeneric && invitation.displayGuestName
      ? invitation.displayGuestName
      : 'Our Dear Guest';

  const hasSavedRsvp = Boolean(
    invitation.rsvp && Object.keys(invitation.rsvp.byEvent).length > 0
  );

  const activeSceneMeta = cinemaScenes[activeSceneIndex] ?? cinemaScenes[0];
  const activeSectionId = activeSceneMeta?.chapterId ?? 'hero';
  const isActiveMaroon = activeSceneMeta?.theme === 'maroon';
  const firstCelebrationSceneIndex = cinemaScenes.findIndex(
    (s) => s.kind === 'celebrations'
  );
  const countdownSceneIndex = cinemaScenes.findIndex((s) => s.id === 'countdown');
  const closingSceneIndex = cinemaScenes.findIndex((s) => s.id === 'closing');

  const showStoryAmbient = activeSectionId === 'us-through-the-years';
  const showCoupleAmbient = activeSectionId === 'bride-and-groom';
  const showCelebrationsAmbient = activeSectionId === 'the-celebrations';
  const showClosingAmbient = activeSectionId === 'closing';
  const heroRevealed = heroEntered;

  return (
    <div
      ref={stageContainerRef}
      data-testid="invite-cascade-stage"
      data-active-side={activeSide}
      data-active-section={activeSectionId}
      data-active-scene={activeSceneMeta?.id ?? 'hero'}
      data-active-scene-index={activeSceneIndex}
      data-total-scenes={cinemaScenes.length}
      className="relative w-full h-[100dvh] overflow-hidden bg-[#4D0A14] text-[#231618]"
    >

      {/* Whisper-Thin Top Antique-Gold Journey Hairline */}
      {sealRemoved && cinemaScenes.length > 1 && (
        <div
          aria-hidden="true"
          className="fixed top-0 inset-x-0 z-[58] h-[2px] bg-[#DFBE7B]/18 pointer-events-none"
        >
          <div
            ref={progressBarRef}
            className="h-full w-full origin-left bg-gradient-to-r from-[#C89D54] via-[#F3DA99] to-[#DFBE7B]"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
      )}

      {/* Discreet Back to Studio control when host previews from dashboard */}
      {onBackToStudio && (
        <button
          type="button"
          onClick={onBackToStudio}
          data-testid="back-to-studio-button"
          className="fixed top-4 left-4 z-[68] inline-flex items-center gap-1.5 rounded-full bg-[#3A070E]/90 border border-[#DFBE7B]/55 px-3.5 py-2 text-xs font-medium text-[#FAF5EC] shadow-lg hover:bg-[#4D0A14] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
          Back to Studio
        </button>
      )}

      {/* Floating Top-Right Gramophone Music Controller — hidden on the curtain page; starts on seal click */}
      <FloatingMusicPlayer
        ref={musicPlayerRef}
        visible={sealRemoved}
        autoStart={autostart}
      />

      {/* Discreet Right-Edge Section Progress Rail with Editorial Hover Labels */}
      {sealRemoved && cascadeSections.length > 1 && (
        <nav
          aria-label="Invitation sections"
          data-testid="cascade-progress-rail"
          className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-[55] hidden sm:flex flex-col items-end gap-2.5"
        >
          {cascadeSections.map((section) => {
            const isActive = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-label={`Go to ${section.label}`}
                aria-current={isActive ? 'step' : undefined}
                title={section.label}
                className="group relative flex items-center justify-end gap-2.5 h-6 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B] rounded-full"
              >
                <span
                  className={`pointer-events-none select-none rounded-sm px-2 py-0.5 text-[10px] font-medium tracking-[0.18em] uppercase whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ${
                    isActiveMaroon
                      ? 'bg-[#2E050A]/85 text-[#FAF5EC] border border-[#DFBE7B]/35'
                      : 'bg-[#FFF9E2]/95 text-[#4D0A14] border border-[#E6D194]'
                  }`}
                >
                  {section.label}
                </span>
                <span className="flex items-center justify-center w-4">
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      isActive
                        ? isActiveMaroon
                          ? 'w-2 h-6 bg-[#DFBE7B] shadow-[0_0_10px_rgba(223,190,123,0.65)]'
                          : 'w-2 h-6 bg-[#7F1924] shadow-[0_0_10px_rgba(127,25,36,0.3)]'
                        : isActiveMaroon
                          ? 'w-2 h-2 bg-[#DFBE7B]/40 group-hover:bg-[#DFBE7B]/85'
                          : 'w-2 h-2 bg-[#7F1924]/30 group-hover:bg-[#7F1924]/75'
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Permanent Falling Leaves & Petals Overlay across the entire website */}
      <FallingPetals variant={!sealRemoved || isActiveMaroon ? 'dark' : 'light'} />

      {/* 1. OPENING ROYAL MAROON VELVET CURTAINS WITH CRIMSON WAX SEAL */}
      {!sealRemoved && (
        <CurtainOpeningStage
          addressedName={addressedName}
          phase={curtainPhase}
          onOpen={handleOpenSeal}
        />
      )}

      {/* FIXED FULL-VIEWPORT CINEMA STAGE — ZERO PAGE SCROLLING, PURE IN-PLACE CROSSFADES */}
      <div
        data-testid="cinema-viewport-stage"
        className="fixed inset-0 z-10 w-full h-[100dvh] overflow-hidden"
      >
        {/* SCENE 0 — FULL-SCREEN ROYAL MAROON HERO */}
        <header
          id="hero"
          ref={(el) => {
            sheetRefs.current.hero = el;
          }}
          data-cinema-scene="hero"
          data-cascade-section="hero"
          data-testid="cascade-slide-hero"
          style={{ zIndex: 12, opacity: 1, visibility: 'visible' }}
          className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#74111D_0%,#4D0A14_60%,#34060D_100%)] text-[#FAF5EC] text-center"
        >
          {/* Ornate golden corner brackets (subtle background parallax plane) */}
          <div
            data-parallax-section="hero"
            data-parallax-speed="-0.14"
            data-parallax-max="44"
            className="pointer-events-none absolute inset-3 sm:inset-7 border border-[#DFBE7B]/20"
          >
            <CornerBracket position="tl" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -top-1 -left-1" />
            <CornerBracket position="tr" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -top-1 -right-1" />
            <CornerBracket position="bl" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -bottom-1 -left-1" />
            <CornerBracket position="br" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -bottom-1 -right-1" />
          </div>

          {/* Centered rotating golden Alpana mandala (deep background parallax plane) */}
          <div
            data-parallax-section="hero"
            data-parallax-speed="-0.34"
            data-parallax-max="100"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <AlpanaMandala
              className={`w-[500px] h-[500px] sm:w-[760px] sm:h-[760px] text-[#DFBE7B]/16 ${
                activeSectionId === 'hero' ? 'animate-chakra-slow' : ''
              }`}
            />
          </div>

          <div
            ref={(el) => {
              scrollerRefs.current.hero = el;
            }}
            data-scene-scroller="hero"
            className="relative z-10 w-full h-full overflow-y-auto [@media(min-width:768px)_and_(min-height:580px)]:overflow-y-hidden overflow-x-hidden overscroll-y-none"
          >
            <div
              ref={(el) => {
                stageRefs.current.hero = el;
              }}
              className="w-full max-w-6xl mx-auto min-h-full [@media(min-width:768px)_and_(min-height:580px)]:h-full overflow-x-hidden overflow-y-clip flex flex-col items-center justify-between gap-1 sm:gap-2 px-4 sm:px-8 pt-14 sm:pt-[68px] [@media(min-width:768px)_and_(max-height:720px)]:pt-6 pb-2 sm:pb-3.5"
            >
              {/* Upper/Center Editorial Lockup */}
              <div
                data-parallax-section="hero"
                data-parallax-speed="0.14"
                data-parallax-max="48"
                className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center justify-center py-0"
              >
                <RevealFromSide from="down" delayMs={40} forceVisible={heroRevealed}>
                  <LotusEmblem className="w-10 h-5 sm:w-13 sm:h-7 text-[#DFBE7B] mx-auto" />
                </RevealFromSide>

                <RevealFromSide from="left" delayMs={120} forceVisible={heroRevealed}>
                  <p className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] font-medium tracking-[0.28em] uppercase text-[#DFBE7B]/90">
                    Together with their families
                  </p>
                </RevealFromSide>

                <h2
                  data-testid="hero-couple-names"
                  className="mt-2 sm:mt-3 font-editorial font-normal text-[#FAF5EC] tracking-tight flex flex-col sm:flex-row sm:flex-nowrap items-center sm:items-baseline justify-center gap-y-0.5 sm:gap-y-0 sm:gap-x-3.5"
                >
                  <RevealFromSide
                    from="left"
                    delayMs={210}
                    forceVisible={heroRevealed}
                    className="inline-block"
                  >
                    <span className="block sm:inline text-[42px] sm:text-7xl md:text-[82px] leading-[0.96]">
                      Medha
                    </span>
                  </RevealFromSide>
                  <RevealFromSide
                    from="down"
                    delayMs={310}
                    forceVisible={heroRevealed}
                    className="inline-block"
                  >
                    <span className="block sm:inline italic text-[#DFBE7B] font-normal text-[26px] sm:text-6xl md:text-[74px] leading-none my-0.5 sm:my-0">
                      &amp;
                    </span>
                  </RevealFromSide>
                  <RevealFromSide
                    from="right"
                    delayMs={210}
                    forceVisible={heroRevealed}
                    className="inline-block"
                  >
                    <span className="block sm:inline text-[42px] sm:text-7xl md:text-[82px] leading-[0.96]">
                      Saptarshi
                    </span>
                  </RevealFromSide>
                </h2>

                <RevealFromSide
                  from="right"
                  delayMs={350}
                  forceVisible={heroRevealed}
                >
                  <p className="mt-2 sm:mt-3 text-[10px] sm:text-sm font-medium tracking-[0.22em] sm:tracking-[0.26em] uppercase text-[#EAD29F]/85 max-w-[290px] sm:max-w-none leading-relaxed">
                    Cordially invite you to celebrate their wedding
                  </p>
                </RevealFromSide>

                <RevealFromSide
                  from="up"
                  delayMs={420}
                  forceVisible={heroRevealed}
                >
                  <AlpanaDivider className="w-36 sm:w-52 my-2 sm:my-3.5 text-[#DFBE7B]" />
                </RevealFromSide>

                <RevealFromSide
                  from="up"
                  delayMs={450}
                  forceVisible={heroRevealed}
                >
                  <p
                    data-testid="hero-celebrations-prompt"
                    className="mb-1.5 sm:mb-2 font-editorial italic text-[14px] sm:text-[18px] md:text-[20px] text-[#FAF0D4]/95 leading-snug max-w-[310px] sm:max-w-lg text-balance"
                  >
                    Please grace us with your presence at the celebrations below.
                  </p>
                </RevealFromSide>

                <RevealFromSide
                  from="left"
                  delayMs={480}
                  forceVisible={heroRevealed}
                >
                  <p
                    data-testid="hero-location"
                    className="text-xs sm:text-sm font-medium tracking-[0.34em] uppercase text-[#DFBE7B]"
                  >
                    Kolkata
                  </p>
                </RevealFromSide>
              </div>

              {/* Bottom Flanking Welcoming Figures (Riyan & Pihu) with Unison Quote centered EXACTLY between them on both Mobile & Desktop */}
              <div
                data-parallax-section="hero"
                data-parallax-speed="0.24"
                data-parallax-max="70"
                className="w-full max-w-6xl mx-auto px-1.5 sm:px-8 md:px-12 py-0 shrink-0"
              >
                <div className="grid grid-cols-[minmax(100px,116px)_minmax(0,1fr)_minmax(100px,116px)] sm:grid-cols-[minmax(154px,178px)_minmax(0,1fr)_minmax(154px,178px)] md:grid-cols-[minmax(176px,204px)_minmax(0,1fr)_minmax(176px,204px)] lg:grid-cols-[minmax(198px,224px)_minmax(0,1fr)_minmax(198px,224px)] items-center gap-x-1 sm:gap-x-6 md:gap-x-8">
                  <div className="justify-self-center sm:justify-self-start">
                    <RevealFromSide
                      from="bottom-left"
                      delayMs={540}
                      forceVisible={heroRevealed}
                    >
                      <HeroWelcomeFigure
                        side="left"
                        name="Riyan"
                        roleLabel="Nitbor/Groomsman"
                        imageSrc={RIYAN_WELCOME_FIGURE_SRC}
                        animate={activeSectionId === 'hero'}
                        imageScale={1.12}
                      />
                    </RevealFromSide>
                  </div>

                  {/* Center Unison Quote placed directly between Riyan (Nitbor) & Pihu (Nitkone) on BOTH mobile and desktop */}
                  <div className="flex flex-col items-center justify-center self-center text-center px-0.5 sm:px-3 md:px-5 -mt-5 sm:-mt-8 md:-mt-10">
                    <RevealFromSide
                      from="up"
                      delayMs={580}
                      forceVisible={heroRevealed}
                    >
                      <div className="flex flex-col items-center">
                        <span
                          aria-hidden="true"
                          className="hidden sm:block w-12 md:w-16 h-px bg-gradient-to-r from-transparent via-[#DFBE7B]/65 to-transparent mb-3 md:mb-4"
                        />
                        <blockquote
                          data-testid="hero-kids-quote"
                          className="m-0 max-w-[152px] min-[390px]:max-w-[162px] sm:max-w-[360px] md:max-w-[460px] lg:max-w-[560px] text-center text-balance font-editorial italic text-[13px] min-[390px]:text-[13.5px] leading-[1.32] sm:text-[23px] md:text-[28px] lg:text-[32px] sm:leading-[1.28] text-[#FAF0D4] tracking-[0.01em] drop-shadow-[0_2px_12px_rgba(24,3,7,0.58)]"
                        >
                          &ldquo;We&rsquo;re on official wedding duty &mdash; Let&rsquo;s get Mamai and Pipi married!&rdquo;
                        </blockquote>
                        <span
                          aria-hidden="true"
                          className="hidden sm:block w-12 md:w-16 h-px bg-gradient-to-r from-transparent via-[#DFBE7B]/65 to-transparent mt-3 md:mt-4"
                        />
                      </div>
                    </RevealFromSide>
                  </div>

                  <div className="justify-self-center sm:justify-self-end">
                    <RevealFromSide
                      from="bottom-right"
                      delayMs={540}
                      forceVisible={heroRevealed}
                    >
                      <HeroWelcomeFigure
                        side="right"
                        name="Pihu"
                        roleLabel="Nitkone/Bridesmaid"
                        imageSrc={PIHU_WELCOME_FIGURE_SRC}
                        animate={activeSectionId === 'hero'}
                      />
                    </RevealFromSide>
                  </div>
                </div>

                {/* Centered Scroll Cue cleanly below the flanking characters row */}
                <div className="mt-1 sm:mt-2 pb-0.5 sm:pb-1 flex justify-center">
                  <RevealFromSide
                    from="up"
                    delayMs={640}
                    forceVisible={heroRevealed}
                  >
                    <button
                      type="button"
                      onClick={() => scrollToSection('bride-and-groom')}
                      className="inline-flex flex-col items-center gap-0.5 sm:gap-1 text-[10px] font-medium tracking-[0.26em] uppercase text-[#EAD29F]/85 hover:text-[#FAF5EC] transition-colors cursor-pointer"
                    >
                      <span>Scroll to explore</span>
                      <ChevronDown
                        className={`w-4 h-4 ${activeSectionId === 'hero' ? 'animate-bounce' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </RevealFromSide>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* SCENE 1 — BRIDE & GROOM WITH SEAL MONOGRAM CREST & SACRED YAGYA BONFIRE */}
        <section
          id="bride-and-groom"
          ref={(el) => {
            sheetRefs.current['bride-and-groom'] = el;
          }}
          data-cinema-scene="bride-and-groom"
          data-cascade-section="bride-and-groom"
          data-testid="bride-and-groom-section"
          aria-label="Bride and Groom"
          style={{ zIndex: 11, opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}
          className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#FFF8DE_0%,#FDF3D0_60%,#F7E7B8_100%)]"
        >
          {/* Delicate antique-gold hairline museum frame */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 sm:inset-6 border border-[#DFBE7B]/35"
          >
            <CornerBracket position="tl" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -top-1 -left-1" />
            <CornerBracket position="tr" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -top-1 -right-1" />
            <CornerBracket position="bl" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -bottom-1 -left-1" />
            <CornerBracket position="br" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -bottom-1 -right-1" />
          </div>

          <div
            data-parallax-section="bride-and-groom"
            data-parallax-speed="-0.28"
            data-parallax-max="84"
            className="pointer-events-none absolute inset-0"
          >
            {showCoupleAmbient && <StudioFloatingSparkles contained subtle />}
          </div>

          <div
            ref={(el) => {
              scrollerRefs.current['bride-and-groom'] = el;
            }}
            data-scene-scroller="bride-and-groom"
            className="relative z-10 w-full h-full overflow-y-auto [@media(min-width:768px)_and_(min-height:580px)]:overflow-y-hidden overflow-x-hidden overscroll-y-none"
          >
            <div
              ref={(el) => {
                stageRefs.current['bride-and-groom'] = el;
              }}
              className="w-full max-w-[1280px] mx-auto min-h-full [@media(min-width:768px)_and_(min-height:580px)]:h-full overflow-x-hidden overflow-y-clip px-3 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-6 sm:pb-8 [@media(min-width:768px)_and_(max-height:740px)]:pt-6 [@media(min-width:768px)_and_(max-height:740px)]:pb-4 flex flex-col"
            >
              <div className="my-auto w-full flex flex-col items-center">
                <div
                  data-parallax-section="bride-and-groom"
                  data-parallax-speed="0.12"
                  data-parallax-max="36"
                  className="text-center mb-5 sm:mb-7 md:mb-8 shrink-0 px-2"
                >
                  <h2
                    data-testid="bride-and-groom-heading"
                    className="font-editorial text-[30px] sm:text-5xl font-normal text-[#231618] leading-tight text-balance"
                  >
                    But first, an introduction to{' '}
                    <span className="italic text-[#7F1924]">us</span>
                  </h2>
                </div>

                {/* Desktop: Commanding Groom (LEFT), Sacred Yagya Bonfire (CENTER), Commanding Bride (RIGHT) */}
                <div className="hidden md:grid grid-cols-[minmax(240px,340px)_minmax(160px,220px)_minmax(240px,340px)] lg:grid-cols-[340px_220px_340px] xl:grid-cols-[370px_240px_370px] justify-center items-center gap-4 lg:gap-8 w-full">
                  <div
                    data-parallax-section="bride-and-groom"
                    data-parallax-speed="0.22"
                    data-parallax-max="64"
                    className="flex justify-center pt-4"
                  >
                    <CoupleSideFigure
                      side="groom"
                      name="Saptarshi"
                      parentage={GROOM_PARENTAGE}
                      animate={showCoupleAmbient}
                    />
                  </div>

                  <div
                    data-parallax-section="bride-and-groom"
                    data-parallax-speed="0.12"
                    data-parallax-max="40"
                    className="flex flex-col items-center justify-center pt-10 lg:pt-12"
                  >
                    <SacredYagyaBonfire
                      animate={showCoupleAmbient}
                      testId="desktop-yagya-bonfire"
                      className="w-[104px] lg:w-[120px] h-[142px] lg:h-[164px]"
                    />
                  </div>

                  <div
                    data-parallax-section="bride-and-groom"
                    data-parallax-speed="0.22"
                    data-parallax-max="64"
                    className="flex justify-center pt-4"
                  >
                    <CoupleSideFigure
                      side="bride"
                      name="Medha"
                      parentage={BRIDE_PARENTAGE}
                      animate={showCoupleAmbient}
                    />
                  </div>
                </div>

                {/* Mobile: Sacred Yagya Bonfire flanked by Groom & Bride below heading */}
                <div className="flex md:hidden flex-col items-center w-full max-w-[460px] mx-auto">
                  <div
                    data-parallax-section="bride-and-groom"
                    data-parallax-speed="0.18"
                    data-parallax-max="48"
                    className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-0.5 sm:gap-2 pt-2 pb-2 w-full"
                  >
                    <CoupleSideFigure
                      side="groom"
                      name="Saptarshi"
                      parentage={GROOM_PARENTAGE}
                      animate={showCoupleAmbient}
                    />

                    <div className="flex justify-center mt-[88px] sm:mt-[110px]">
                      <SacredYagyaBonfire
                        animate={showCoupleAmbient}
                        testId="mobile-yagya-bonfire"
                        className="w-[62px] sm:w-[78px] h-[98px] sm:h-[122px]"
                      />
                    </div>

                    <CoupleSideFigure
                      side="bride"
                      name="Medha"
                      parentage={BRIDE_PARENTAGE}
                      animate={showCoupleAmbient}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 2 — MEMORY LANE (DEDICATED CAROUSEL SHOWCASE) */}
        <section
          id="us-through-the-years"
          ref={(el) => {
            sheetRefs.current['us-through-the-years'] = el;
          }}
          data-cinema-scene="us-through-the-years"
          data-cascade-section="us-through-the-years"
          data-testid="us-through-the-years-section"
          aria-label="And a minor detour down the memory lane"
          style={{ zIndex: 12, opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}
          className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#FFF8DE_0%,#FDF3D0_60%,#F7E7B8_100%)]"
        >
          {/* Delicate antique-gold hairline museum frame */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 sm:inset-6 border border-[#DFBE7B]/35"
          >
            <CornerBracket position="tl" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -top-1 -left-1" />
            <CornerBracket position="tr" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -top-1 -right-1" />
            <CornerBracket position="bl" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -bottom-1 -left-1" />
            <CornerBracket position="br" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/70 absolute -bottom-1 -right-1" />
          </div>

          <div
            data-parallax-section="us-through-the-years"
            data-parallax-speed="-0.28"
            data-parallax-max="84"
            className="pointer-events-none absolute inset-0"
          >
            {showStoryAmbient && <StudioFloatingSparkles contained subtle />}
          </div>

          <div
            ref={(el) => {
              scrollerRefs.current['us-through-the-years'] = el;
            }}
            data-scene-scroller="us-through-the-years"
            className="relative z-10 w-full h-full overflow-y-auto [@media(min-width:768px)_and_(min-height:580px)]:overflow-y-hidden overflow-x-hidden overscroll-y-none"
          >
            <div
              ref={(el) => {
                stageRefs.current['us-through-the-years'] = el;
              }}
              className="w-full max-w-[920px] mx-auto min-h-full [@media(min-width:768px)_and_(min-height:580px)]:h-full overflow-x-hidden overflow-y-clip px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-6 sm:pb-6 [@media(min-width:768px)_and_(max-height:740px)]:pt-5 [@media(min-width:768px)_and_(max-height:740px)]:pb-3 flex flex-col"
            >
              <div className="my-auto w-full flex flex-col items-center">
                <div
                  data-parallax-section="us-through-the-years"
                  data-parallax-speed="0.12"
                  data-parallax-max="36"
                  className="text-center mb-3 sm:mb-4 shrink-0 px-2"
                >
                  <h2
                    data-testid="memory-lane-heading"
                    className="font-editorial text-[26px] sm:text-4xl md:text-[44px] font-normal text-[#231618] leading-tight text-balance"
                  >
                    And a minor detour down{' '}
                    <span className="italic text-[#7F1924]">the memory lane</span>
                  </h2>
                </div>

                <div
                  data-parallax-section="us-through-the-years"
                  data-parallax-speed="0.06"
                  data-parallax-max="24"
                  className="w-full flex justify-center"
                >
                  <StoryYearCarousel autoPlay={showStoryAmbient} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCENES 3..(3+K-1) — THE CELEBRATIONS: VERTICAL PORTRAIT SHOWCASE PER EVENT */}
        {eventDetails.map((ev, index) => {
          const sceneId = `celebration-${index}`;
          const sceneIdx = firstCelebrationSceneIndex + index;
          const directionsState = getEventDirectionsState(ev, isMobileDevice);
          const isThisEventActive = activeSceneIndex === sceneIdx;
          const watermarkOnLeft = index % 2 === 0;

          return (
            <section
              key={ev.id}
              id={index === 0 ? 'the-celebrations' : sceneId}
              ref={(el) => {
                sheetRefs.current[sceneId] = el;
              }}
              data-cinema-scene={sceneId}
              data-cascade-section="the-celebrations"
              data-testid={index === 0 ? 'celebrations-section' : `celebration-scene-${ev.id}`}
              aria-label={`Celebration: ${ev.title}`}
              style={{
                zIndex: 10 + sceneIdx,
                opacity: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
              }}
              className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#FFF8DE_0%,#FDF3D0_60%,#F7E7B8_100%)]"
            >
              {/* Museum hairline border & corner accents */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-3 sm:inset-6 border border-[#DFBE7B]/35"
              >
                <CornerBracket position="tl" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/75 absolute -top-1 -left-1" />
                <CornerBracket position="tr" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/75 absolute -top-1 -right-1" />
                <CornerBracket position="bl" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/75 absolute -bottom-1 -left-1" />
                <CornerBracket position="br" className="w-8 h-8 sm:w-11 sm:h-11 text-[#C89D54]/75 absolute -bottom-1 -right-1" />
              </div>

              {/* Ambient golden sparkles only while active */}
              {showCelebrationsAmbient && isThisEventActive && (
                <StudioFloatingSparkles contained subtle />
              )}

              {/* Subtle background Alpana watermark moving at deep parallax */}
              <div
                data-parallax-section={sceneId}
                data-parallax-speed="-0.32"
                data-parallax-max="100"
                aria-hidden="true"
                className={`pointer-events-none absolute top-1/2 -mt-[230px] w-[460px] h-[460px] ${
                  watermarkOnLeft ? '-left-32' : '-right-32'
                }`}
              >
                <AlpanaMandala className="w-full h-full text-[#C89D54]/14" />
              </div>

              <div
                ref={(el) => {
                  scrollerRefs.current[sceneId] = el;
                }}
                data-scene-scroller={sceneId}
                className="relative z-10 w-full h-full overflow-hidden overscroll-y-none"
              >
                <div
                  ref={(el) => {
                    stageRefs.current[sceneId] = el;
                  }}
                  className={`w-full ${
                    ev.combinedSides ? 'max-w-4xl' : 'max-w-2xl'
                  } mx-auto h-full overflow-hidden flex flex-col justify-center px-3 sm:px-8 ${
                    onBackToStudio ? 'pt-[68px] sm:pt-[44px]' : 'pt-[34px] sm:pt-[44px]'
                  } pb-[54px] sm:pb-[58px]`}
                >
                  <div
                    data-parallax-section={sceneId}
                    data-parallax-speed="0.14"
                    data-parallax-max="42"
                    className="w-full h-full min-h-0 flex items-center justify-center"
                  >
                    <article
                      data-testid={`timeline-event-${ev.id}`}
                      data-event-side={ev.resolvedSide}
                      className={`w-full h-full max-h-[780px] min-h-0 ${
                        ev.combinedSides
                          ? 'max-w-[440px] sm:max-w-[680px] lg:max-w-[740px] px-3 py-2.5 sm:px-6 sm:py-4'
                          : 'max-w-[420px] sm:max-w-[480px] px-4 py-3 sm:px-6 sm:py-4'
                      } rounded-2xl border border-[#DFBE7B]/85 bg-[#FFF9E2]/96 shadow-[0_18px_48px_rgba(127,25,36,0.10)] text-center select-text flex flex-col items-center`}
                    >
                      {/* 1. Event Title & Date/Time Header */}
                      <div className="shrink-0 w-full">
                        <h3
                          data-testid={`event-title-${ev.id}`}
                          className="font-editorial text-[24px] sm:text-[32px] lg:text-[34px] font-medium text-[#4D0A14] leading-[1.06] tracking-tight text-balance"
                        >
                          {ev.title}
                        </h3>
                        {(() => {
                          const sideBadgeLabel = getEventSideHeaderLabel(ev);
                          return (
                            <p
                              data-testid={`event-datetime-${ev.id}`}
                              className="mt-1 text-[11.5px] sm:text-[13px] text-[#4C373A] leading-snug tabular-nums"
                            >
                              <span
                                data-testid={`event-date-${ev.id}`}
                                className="font-semibold text-[#7F1924]"
                              >
                                {ev.dateLabel}
                              </span>
                              <span
                                aria-hidden="true"
                                className="mx-1.5 text-[#C89D54]"
                              >
                                |
                              </span>
                              <span className="text-[#4C373A]">{ev.timeLabel}</span>
                              {sideBadgeLabel && (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="mx-1.5 text-[#C89D54]"
                                  >
                                    |
                                  </span>
                                  <span
                                    data-testid={`event-header-side-${ev.id}`}
                                    className="font-medium text-[#7F1924]"
                                  >
                                    {sideBadgeLabel}
                                  </span>
                                </>
                              )}
                            </p>
                          );
                        })()}
                      </div>

                      {ev.combinedSides ? (
                        <>
                          {/* 2. Generic/Combined Mode: Both Bride's & Groom's Videos, Locations & Directions aligned identically across rows */}
                          <div
                            data-testid={`event-combined-sides-${ev.id}`}
                            className="mt-2 sm:mt-3 flex-1 min-h-0 w-full grid grid-cols-2 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-x-2 sm:gap-x-5"
                          >
                            {(
                              [ev.combinedSides.bride, ev.combinedSides.groom] as const
                            ).map((sideData) => (
                              <div
                                key={sideData.side}
                                data-testid={`event-side-panel-${ev.id}-${sideData.side}`}
                                className="row-span-4 grid grid-rows-subgrid items-center justify-items-center rounded-xl border border-[#E6D194]/80 bg-[#FFFDF0]/90 px-2 py-2 sm:px-3.5 sm:py-3 min-h-0"
                              >
                                <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] uppercase text-[#9E2A2B] pb-1.5">
                                  {sideData.sideLabel}
                                </p>

                                <div className="w-full h-full min-h-0">
                                  <EventVerticalMediaFrame
                                    event={ev}
                                    isActive={isThisEventActive}
                                    videoSrcOverride={sideData.videoSrc}
                                    sideLabel={sideData.sideLabel}
                                    testId={`event-video-frame-${ev.id}-${sideData.side}`}
                                    compact
                                  />
                                </div>

                                <div
                                  data-testid={`event-location-${ev.id}-${sideData.side}`}
                                  className="w-full min-h-[42px] sm:min-h-[38px] pt-1.5 sm:pt-2 flex flex-col justify-center text-center leading-tight"
                                >
                                  <p className="text-[11px] sm:text-[13px] font-semibold text-[#7F1924] leading-tight">
                                    {sideData.venueName}
                                  </p>
                                  <p className="mt-0.5 text-[10px] sm:text-xs text-[#6B5457] leading-tight">
                                    {sideData.venueAddress}
                                  </p>
                                </div>

                                <a
                                  href={
                                    resolveDeviceDirectionsUrl(
                                      sideData,
                                      isMobileDevice
                                    ) ?? sideData.directionsUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Get Directions for ${ev.title} (${sideData.sideLabel})`}
                                  data-testid={`event-directions-${ev.id}-${sideData.side}`}
                                  className="mt-1.5 sm:mt-2 w-full inline-flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[38px] rounded-md bg-[#9E2A2B] px-2 sm:px-3 py-1.5 text-[9.5px] sm:text-[11px] font-semibold tracking-[0.06em] sm:tracking-[0.12em] uppercase text-[#FAF5EC] hover:bg-[#7F1924] transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B]"
                                >
                                  <Navigation
                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                  Directions
                                </a>
                              </div>
                            ))}
                          </div>

                          {/* 3. Centered Event/Dresscode details Button */}
                          <div className="shrink-0 mt-2 sm:mt-3 w-full max-w-[300px]">
                            <button
                              type="button"
                              onClick={() => setKnowMoreEventId(ev.id)}
                              data-testid={`event-details-${ev.id}`}
                              aria-label={`Event/Dresscode details for ${ev.title}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[44px] rounded-md border border-[#DFBE7B] bg-[#FDF3D0] px-3.5 py-2 text-[10px] sm:text-[11px] font-semibold tracking-[0.06em] sm:tracking-[0.08em] uppercase text-[#4C373A] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] hover:text-[#4D0A14] transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2A2B]"
                            >
                              <Info
                                className="w-3.5 h-3.5 text-[#9E2A2B] shrink-0"
                                aria-hidden="true"
                              />
                              Event/Dresscode details
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* 2. Maximized Vertical 9:16 Video Frame (fills remaining viewport height) */}
                          <div className="mt-2 sm:mt-2.5 flex-1 min-h-0 w-full">
                            <EventVerticalMediaFrame
                              event={ev}
                              isActive={isThisEventActive}
                            />
                          </div>

                          {/* 3. Location */}
                          <div
                            data-testid={`event-location-${ev.id}`}
                            className="shrink-0 mt-2 sm:mt-2.5 pt-2 w-full border-t border-[#E6D194]/70 text-center leading-snug"
                          >
                            <p
                              data-testid={`event-venue-name-${ev.id}`}
                              className="text-[13px] sm:text-sm font-semibold text-[#7F1924]"
                            >
                              {ev.venueName}
                            </p>
                            {ev.venueAddress && (
                              <p
                                data-testid={`event-venue-address-${ev.id}`}
                                className="text-[11.5px] sm:text-xs text-[#6B5457]"
                              >
                                {ev.venueAddress}
                              </p>
                            )}
                          </div>

                          {/* 4. Get Directions (or Disabled Location TBD) + Event/Dresscode details */}
                          <div className="shrink-0 mt-2 sm:mt-2.5 w-full max-w-[400px] grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] sm:grid-cols-2 gap-2 sm:gap-2.5">
                            {directionsState.disabled ? (
                              <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title={directionsState.tooltip}
                                aria-label="Get Directions — Location TBD"
                                data-testid={`event-directions-${ev.id}`}
                                className="inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[44px] rounded-md border border-[#D4CBB3] bg-[#E8E1CC] px-2.5 sm:px-3 py-2 text-[10px] sm:text-[10.5px] font-semibold tracking-[0.06em] sm:tracking-[0.1em] uppercase text-[#8A7C72] opacity-80 cursor-not-allowed whitespace-nowrap"
                              >
                                <MapPinOff
                                  className="w-3.5 h-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                {directionsState.label}
                              </button>
                            ) : (
                              <a
                                href={directionsState.href!}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`event-directions-${ev.id}`}
                                className="inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[44px] rounded-md bg-[#9E2A2B] px-2.5 sm:px-3 py-2 text-[10px] sm:text-[10.5px] font-semibold tracking-[0.06em] sm:tracking-[0.1em] uppercase text-[#FAF5EC] hover:bg-[#7F1924] transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B]"
                              >
                                <Navigation
                                  className="w-3.5 h-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                {directionsState.label}
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setKnowMoreEventId(ev.id)}
                              data-testid={`event-details-${ev.id}`}
                              aria-label={`Event/Dresscode details for ${ev.title}`}
                              className="inline-flex items-center justify-center gap-1.5 min-h-[42px] sm:min-h-[44px] rounded-md border border-[#DFBE7B] bg-[#FDF3D0] px-2.5 sm:px-3 py-1.5 text-[9.5px] sm:text-[10.5px] font-semibold tracking-[0.04em] sm:tracking-[0.06em] leading-[1.2] uppercase text-[#4C373A] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] hover:text-[#4D0A14] transition-colors cursor-pointer text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2A2B]"
                            >
                              <Info
                                className="w-3.5 h-3.5 text-[#9E2A2B] shrink-0"
                                aria-hidden="true"
                              />
                              <span>Event/Dresscode details</span>
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* SHARED FIXED CELEBRATIONS CHROME — stays locked across all celebrations while cards change */}
        {eventDetails.length > 0 && firstCelebrationSceneIndex >= 0 && (
          <div
            ref={celebrationsChromeRef}
            data-testid="celebrations-fixed-chrome"
            style={{
              zIndex: 25,
              opacity: 0,
              visibility: 'hidden',
            }}
            className="pointer-events-none absolute inset-0 flex flex-col justify-between"
          >
            {/* Fixed Top Editorial Chapter Header */}
            <div
              data-testid="celebrations-fixed-header"
              className={`shrink-0 mx-4 sm:mx-20 pb-1 px-2 flex items-center justify-center bg-gradient-to-b from-[#FDF3D0]/95 via-[#FDF3D0]/80 to-transparent ${
                onBackToStudio ? 'pt-[46px] sm:pt-3.5' : 'pt-2.5 sm:pt-3.5'
              }`}
            >
              <h2 className="text-[11px] sm:text-xs font-semibold tracking-[0.28em] uppercase text-[#9E2A2B] whitespace-nowrap shrink-0">
                The Celebrations
              </h2>
            </div>

            {/* Fixed Bottom Centered Event Numberline / Chapter Switcher */}
            {eventDetails.length > 1 ? (
              <div className="shrink-0 flex justify-center mx-10 sm:mx-16 px-2 mb-2.5 sm:mb-3.5 pt-1 pb-0.5 bg-gradient-to-t from-[#FDF3D0]/90 via-[#FDF3D0]/65 to-transparent">
                <div
                  ref={celebrationsNumberlineRef}
                  data-testid="celebrations-fixed-numberline"
                  data-active-celebration-index={displayedCelebrationIndex}
                  style={{ pointerEvents: 'none' }}
                  className="inline-flex items-center justify-center gap-1 sm:gap-3 max-w-full"
                >
                  <button
                    type="button"
                    onClick={() =>
                      jumpToSceneIndex(
                        displayedCelebrationIndex > 0
                          ? firstCelebrationSceneIndex + displayedCelebrationIndex - 1
                          : firstCelebrationSceneIndex + eventDetails.length - 1
                      )
                    }
                    aria-label="Previous celebration"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#DFBE7B] bg-[#FFF9E2]/95 text-[#4D0A14] hover:bg-[#4D0A14] hover:text-[#FAF5EC] transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                  </button>

                  <div
                    role="tablist"
                    aria-label="Celebration schedule"
                    className="flex items-center gap-0.5 sm:gap-1.5 rounded-full border border-[#DFBE7B]/80 bg-[#FFF9E2]/95 px-1 sm:px-2 py-1 shadow-xs overflow-x-auto max-w-full"
                  >
                    {eventDetails.map((tabEv, tabIdx) => {
                      const selected = tabIdx === displayedCelebrationIndex;
                      return (
                        <button
                          key={tabEv.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() =>
                            jumpToSceneIndex(firstCelebrationSceneIndex + tabIdx)
                          }
                          className={`rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-medium tracking-[0.06em] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                            selected
                              ? 'bg-[#4D0A14] text-[#FAF5EC] shadow-xs'
                              : 'text-[#6B5457] hover:text-[#4D0A14] hover:bg-[#FDF3D0]'
                          }`}
                        >
                          <span className="hidden md:inline">{tabEv.tabTitle}</span>
                          <span className="md:hidden tabular-nums">
                            {String(tabIdx + 1).padStart(2, '0')}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      jumpToSceneIndex(
                        displayedCelebrationIndex < eventDetails.length - 1
                          ? firstCelebrationSceneIndex + displayedCelebrationIndex + 1
                          : firstCelebrationSceneIndex
                      )
                    }
                    aria-label="Next celebration"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#DFBE7B] bg-[#FFF9E2]/95 text-[#4D0A14] hover:bg-[#4D0A14] hover:text-[#FAF5EC] transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-2 shrink-0" aria-hidden="true" />
            )}
          </div>
        )}

        {/* SCENE N-2 — LIVE ROYAL MAROON COUNTDOWN */}
        {countdownTargetEvent && countdownSceneIndex >= 0 && (
          <section
            id="countdown"
            ref={(el) => {
              sheetRefs.current.countdown = el;
            }}
            data-cinema-scene="countdown"
            data-cascade-section="countdown"
            aria-label="Wedding Countdown"
            data-testid="countdown-section"
            style={{
              zIndex: 10 + countdownSceneIndex,
              opacity: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
            className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#74111D_0%,#4D0A14_65%,#34060D_100%)] text-[#FAF5EC] text-center"
          >
            {/* Delicate antique-gold inset framing */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-3 sm:inset-7 border border-[#DFBE7B]/20"
            >
              <CornerBracket position="tl" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B]/85 absolute -top-1 -left-1" />
              <CornerBracket position="tr" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B]/85 absolute -top-1 -right-1" />
              <CornerBracket position="bl" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B]/85 absolute -bottom-1 -left-1" />
              <CornerBracket position="br" className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B]/85 absolute -bottom-1 -right-1" />
            </div>

            <div
              data-parallax-section="countdown"
              data-parallax-speed="-0.34"
              data-parallax-max="100"
              className="pointer-events-none absolute -left-24 top-1/2 -mt-36"
            >
              <AlpanaMandala
                className={`w-72 h-72 text-[#DFBE7B]/14 ${
                  activeSectionId === 'countdown' ? 'animate-chakra-cw' : ''
                }`}
              />
            </div>
            <div
              data-parallax-section="countdown"
              data-parallax-speed="-0.22"
              data-parallax-max="80"
              className="pointer-events-none absolute -right-24 top-1/2 -mt-36"
            >
              <AlpanaMandala
                className={`w-72 h-72 text-[#DFBE7B]/14 ${
                  activeSectionId === 'countdown' ? 'animate-chakra-ccw' : ''
                }`}
              />
            </div>

            <div
              ref={(el) => {
                scrollerRefs.current.countdown = el;
              }}
              data-scene-scroller="countdown"
              className="relative z-10 w-full h-full overflow-y-auto [@media(min-width:768px)_and_(min-height:580px)]:overflow-y-hidden overflow-x-hidden overscroll-y-none"
            >
              <div
                ref={(el) => {
                  stageRefs.current.countdown = el;
                }}
                className="w-full max-w-3xl mx-auto min-h-full [@media(min-width:768px)_and_(min-height:580px)]:h-full overflow-x-hidden overflow-y-clip flex flex-col px-6 pt-14 pb-10 sm:pt-16 sm:pb-10 [@media(min-width:768px)_and_(max-height:720px)]:pt-8 [@media(min-width:768px)_and_(max-height:720px)]:pb-6"
              >
                <div className="my-auto w-full">
                  <div
                    data-parallax-section="countdown"
                    data-parallax-speed="0.12"
                    data-parallax-max="36"
                  >
                <p className="text-[11px] font-medium tracking-[0.28em] uppercase text-[#DFBE7B]/85">
                  Counting down to
                </p>
                <h2
                  data-testid="countdown-target-title"
                  className="mt-2 font-editorial text-4xl sm:text-5xl font-medium text-[#FAF5EC]"
                >
                  {countdownTargetEvent.title}
                </h2>
                <p
                  data-testid="countdown-target-schedule"
                  className="mt-1.5 text-xs sm:text-sm tracking-[0.16em] uppercase text-[#EAD29F]/85 tabular-nums"
                >
                  {countdownTargetEvent.dateLabel} · {countdownTargetEvent.timeLabel} (IST)
                </p>
              </div>

              <div
                data-parallax-section="countdown"
                data-parallax-speed="0.22"
                data-parallax-max="64"
                className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-xl mx-auto"
              >
                {[
                  { label: 'Days', value: String(countdown.days) },
                  { label: 'Hours', value: String(countdown.hours).padStart(2, '0') },
                  { label: 'Minutes', value: String(countdown.minutes).padStart(2, '0') },
                  { label: 'Seconds', value: String(countdown.seconds).padStart(2, '0') },
                ].map((unit) => (
                  <div
                    key={unit.label}
                    className="rounded-xl border border-[#DFBE7B]/35 bg-[#3A070E]/60 px-4 py-5 shadow-[0_12px_28px_rgba(16,2,5,0.28)]"
                  >
                    <p className="font-editorial text-4xl sm:text-5xl font-medium text-[#FAF5EC] tabular-nums leading-none">
                      {unit.value}
                    </p>
                    <p className="mt-2 text-[10px] font-medium tracking-[0.24em] uppercase text-[#DFBE7B]/85">
                      {unit.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Event Selector — strictly scoped to the events this guest is invited to */}
              {eventDetails.length > 1 && (
                <div
                  data-parallax-section="countdown"
                  data-parallax-speed="0.14"
                  data-parallax-max="42"
                  className="mt-8"
                >
                  <p className="text-[10px] font-medium tracking-[0.26em] uppercase text-[#EAD29F]/75 mb-3">
                    Choose celebration
                  </p>
                  <div
                    role="group"
                    aria-label="Choose event to count down to"
                    data-testid="countdown-event-selector"
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {eventDetails.map((ev) => {
                      const isSelected = countdownTargetEvent.id === ev.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelectedCountdownEventId(ev.id)}
                          aria-pressed={isSelected}
                          data-testid={`countdown-select-${ev.id}`}
                          className={`rounded-lg border px-3.5 py-2 text-xs font-medium tracking-wide transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#DFBE7B] bg-[#DFBE7B] text-[#3A070E] shadow-sm'
                              : 'border-[#DFBE7B]/40 bg-[#3A070E]/50 text-[#FAF5EC] hover:bg-[#63111D]/80'
                          }`}
                        >
                          {ev.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FINAL SCENE — RSVP, CLOSING BLESSING & THIN ROYAL MAROON FOOTER */}
        <div
          id="closing"
          ref={(el) => {
            sheetRefs.current.closing = el;
          }}
          data-cinema-scene="closing"
          data-cascade-section="closing"
          data-testid="closing-blessing-slide"
          aria-label="RSVP and Closing Blessing"
          style={{
            zIndex: 10 + Math.max(0, closingSceneIndex),
            opacity: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
          className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#FFF8DE_0%,#FDF3D0_60%,#F7E7B8_100%)]"
        >
          {/* Delicate antique-gold hairline museum frame */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 sm:inset-x-6 top-3 sm:top-6 bottom-16 border border-[#DFBE7B]/35"
          />

          {showClosingAmbient && <StudioFloatingSparkles contained subtle />}

          <div
            data-parallax-section="closing"
            data-parallax-speed="-0.32"
            data-parallax-max="96"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <AlpanaMandala className="w-[420px] h-[420px] sm:w-[540px] sm:h-[540px] text-[#C89D54]/14" />
          </div>

          <div
            ref={(el) => {
              scrollerRefs.current.closing = el;
            }}
            data-scene-scroller="closing"
            className="relative z-10 w-full h-full overflow-y-auto [@media(min-width:768px)_and_(min-height:580px)]:overflow-y-hidden overflow-x-hidden overscroll-y-none"
          >
            <div
              ref={(el) => {
                stageRefs.current.closing = el;
              }}
              className="w-full min-h-full [@media(min-width:768px)_and_(min-height:580px)]:h-full overflow-x-hidden overflow-y-clip flex flex-col"
            >
              <div className="flex-1 flex flex-col px-6 pt-10 pb-5 sm:pt-11 sm:pb-4 [@media(min-width:768px)_and_(max-height:720px)]:pt-5 [@media(min-width:768px)_and_(max-height:720px)]:pb-2 text-center">
                <div className="w-full max-w-2xl mx-auto my-auto">
              {/* Full-width RSVP Button */}
              {!isGeneric && eventDetails.length > 0 && (
                <div
                  data-parallax-section="closing"
                  data-parallax-speed="0.14"
                  data-parallax-max="44"
                  className="mb-4 sm:mb-5"
                >
                  <button
                    type="button"
                    onClick={handleOpenRsvpDialog}
                    data-testid="open-rsvp-dialog-button"
                    className="w-full rounded-xl bg-[#4D0A14] border border-[#DFBE7B]/75 px-6 py-3.5 sm:py-4 text-center text-[#FAF5EC] shadow-[0_14px_34px_rgba(77,10,20,0.18)] hover:bg-[#63111D] transition-colors cursor-pointer group"
                  >
                    <span className="block text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] uppercase text-[#DFBE7B]">
                      {hasSavedRsvp ? 'Response Recorded' : 'Kindly Respond'}
                    </span>
                    <span className="mt-0.5 block font-editorial text-2xl sm:text-3xl font-medium text-[#FAF5EC] tracking-wide">
                      {hasSavedRsvp ? 'Update Your RSVP' : 'RSVP'}
                    </span>
                  </button>

                  {rsvpSavedMessage && (
                    <div
                      role="status"
                      data-testid="rsvp-saved-banner"
                      className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-[#1E5E3E]/30 bg-[#1E5E3E]/10 px-4 py-2.5 text-xs font-medium text-[#1E5E3E]"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{rsvpSavedMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Heartfelt Closing Blessing */}
              <div
                data-parallax-section="closing"
                data-parallax-speed="0.22"
                data-parallax-max="60"
              >
                <LotusEmblem className="w-10 h-6 mx-auto text-[#C89D54]" />

                <p className="mt-2 font-editorial italic text-xl sm:text-[26px] text-[#4C373A] leading-snug">
                  {!isGeneric && invitation.displayGuestName && !isReferencePreview
                    ? `Your presence is the greatest blessing, dear ${invitation.displayGuestName}`
                    : 'Your presence is the greatest blessing'}
                </p>

                <AlpanaDivider className="w-40 mx-auto my-2.5 sm:my-3 text-[#C89D54]" />

                <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.28em] uppercase text-[#8E7679]">
                  With love &amp; regards
                </p>

                <FamilyPortraitFigure animate={showClosingAmbient} />

                <p
                  data-testid="closing-family-signature"
                  className="mt-2.5 font-editorial text-2xl sm:text-[30px] font-medium text-[#4D0A14] leading-snug"
                >
                  The Bhattacharya and Kundu Family
                </p>

                <p className="mt-1 text-xs font-medium tracking-[0.18em] text-[#8E7679]">
                  #MedhaWedsSaptarshi
                </p>

                {/* Side-by-Side Family Contact Buttons: Bhattacharya Family (Left) & Kundu Family (Right) */}
                <div
                  data-testid="family-contact-buttons"
                  className="mt-3.5 grid grid-cols-2 gap-2.5 sm:gap-3.5 max-w-lg mx-auto"
                >
                  <button
                    type="button"
                    onClick={() => setActiveContactFamily('bhattacharya')}
                    data-testid="contact-bhattacharya-button"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-[#DFBE7B] bg-[#FFF9E2] px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-[#4D0A14] shadow-xs hover:border-[#9E2A2B]/60 hover:bg-[#F9E8AE] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2A2B]"
                  >
                    <Phone
                      className="w-3.5 h-3.5 text-[#9E2A2B] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="leading-tight">
                      Contact Bhattacharya Family
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveContactFamily('kundu')}
                    data-testid="contact-kundu-button"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-[#DFBE7B] bg-[#FFF9E2] px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-[#4D0A14] shadow-xs hover:border-[#9E2A2B]/60 hover:bg-[#F9E8AE] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2A2B]"
                  >
                    <Phone
                      className="w-3.5 h-3.5 text-[#9E2A2B] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="leading-tight">Contact Kundu Family</span>
                  </button>
                </div>

                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => scrollToSection('hero')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E6D194] bg-[#FFF9E2]/90 px-4 py-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#6B4A23] hover:border-[#9E2A2B]/45 hover:text-[#4D0A14] transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    Back to Welcome
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Thin Royal Maroon Closing Colophon Footer */}
          <footer
            data-testid="ai-colophon-footer"
            className="relative z-20 shrink-0 w-full bg-[radial-gradient(circle_at_center,#74111D_0%,#4D0A14_60%,#34060D_100%)] border-t border-[#DFBE7B]/40 px-2.5 sm:px-5 py-1.5 sm:py-2 text-center text-[10.5px] sm:text-[11px] leading-[1.3] text-[#FAF5EC]/95"
          >
            <p className="w-full mx-auto">
              We both are engineers, yet vibecoded this entire website—even our piano cover got an AI-assisted refinement. And in case you were wondering, this footer was written by AI too. Consistency is key; laziness is a feature.
            </p>
          </footer>
            </div>
          </div>
        </div>
      </div>

      {/* RSVP MODAL DIALOG ON TOP OF SCREEN */}
      {rsvpDialogOpen && !isGeneric && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-rsvp-dialog-title"
          data-testid="guest-rsvp-dialog"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#231618]/70 p-4"
          onClick={() => {
            if (!submittingRsvp) setRsvpDialogOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FFF9E2] border border-[#DFBE7B]/80 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="bg-[#4D0A14] text-[#FAF5EC] px-6 py-5 border-b border-[#DFBE7B]/25">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-[#DFBE7B]">
                  RSVP · {addressedName}
                </p>
                <h2
                  id="guest-rsvp-dialog-title"
                  className="mt-1 font-editorial text-3xl leading-tight font-medium text-[#FAF5EC]"
                >
                  Kindly Confirm Your Presence
                </h2>
                <p className="mt-1 text-xs text-[#EAD29F]/85">
                  Please respond for each celebration below. Click any selected choice again to
                  clear it.
                </p>
              </div>
            </div>

            {/* Dialog Scrollable Form Body */}
            <form
              onSubmit={handleSubmitRsvp}
              className="flex-1 flex flex-col min-h-0"
              noValidate
            >
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 studio-scroll">
                {eventDetails.map((ev) => {
                  const draft = eventDrafts[ev.id] ?? EMPTY_DRAFT;
                  const supportsAlcohol = eventSupportsAlcohol(ev.id);
                  const hasSelection =
                    draft.attending !== '' ||
                    draft.foodPreference !== '' ||
                    (supportsAlcohol && draft.alcoholPreference !== '');

                  return (
                    <div
                      key={ev.id}
                      data-testid={`guest-rsvp-event-${ev.id}`}
                      className="rounded-xl border border-[#E6D194] bg-[#FFFDF0] p-4 sm:p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E6D194]/60">
                        <div>
                          <h3 className="font-editorial text-2xl font-medium text-[#4D0A14] leading-tight">
                            {ev.title}
                          </h3>
                          <p className="text-[11px] text-[#8E7679]">
                            {ev.dateLabel} · {ev.timeLabel}
                          </p>
                        </div>
                        {hasSelection && (
                          <button
                            type="button"
                            onClick={() => handleClearEvent(ev.id)}
                            aria-label={`Clear RSVP for ${ev.title}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#7F1924] hover:bg-[#F9E8AE] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" aria-hidden="true" />
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Attendance */}
                      <fieldset>
                        <legend className="block text-xs font-semibold text-[#4C373A] mb-2">
                          Attendance
                        </legend>
                        <div className="grid grid-cols-2 gap-2.5">
                          {(['coming', 'not_coming'] as const).map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer select-none ${
                                draft.attending === opt
                                  ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                                  : 'border-[#E6D194] bg-[#FFF9E2] text-[#4C373A] hover:border-[#C89D54]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`guestRsvpAttending-${ev.id}`}
                                value={opt}
                                checked={draft.attending === opt}
                                onChange={() => {}}
                                onClick={() => handleToggleAttendance(ev.id, opt)}
                                className="h-4 w-4 accent-[#9E2A2B] cursor-pointer"
                              />
                              <span>{opt === 'coming' ? 'Coming' : 'Not Coming'}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      {/* Conditional Headcount (only when & family) + Food + Mehendi-only Drinks */}
                      {draft.attending === 'coming' && (
                        <div className="space-y-4 pt-1">
                          {invitation.withFamily && (
                            <div>
                              <label
                                htmlFor={`guest-headcount-${ev.id}`}
                                className="block text-xs font-semibold text-[#4C373A] mb-1.5"
                              >
                                Headcount (number of guests attending)
                              </label>
                              <input
                                id={`guest-headcount-${ev.id}`}
                                type="number"
                                inputMode="numeric"
                                min={RSVP_HEADCOUNT_MIN}
                                max={RSVP_HEADCOUNT_MAX}
                                step={1}
                                value={draft.headcount}
                                onChange={(e) =>
                                  updateEventDraft(ev.id, (cur) => ({
                                    ...cur,
                                    headcount: e.target.value,
                                  }))
                                }
                                className="w-32 rounded-lg border border-[#E6D194] bg-[#FFF9E2] px-3 py-2 text-sm text-[#231618] tabular-nums focus:outline-none focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/15"
                              />
                            </div>
                          )}

                          <div
                            className={`grid grid-cols-1 ${
                              supportsAlcohol ? 'sm:grid-cols-2' : ''
                            } gap-4`}
                          >
                            <fieldset>
                              <legend className="block text-xs font-semibold text-[#4C373A] mb-2">
                                Food preference
                              </legend>
                              <div className="grid grid-cols-2 gap-2">
                                {(['veg', 'non_veg'] as const).map((opt) => (
                                  <label
                                    key={opt}
                                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer select-none ${
                                      draft.foodPreference === opt
                                        ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                                        : 'border-[#E6D194] bg-[#FFF9E2] text-[#4C373A] hover:border-[#C89D54]'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`guestRsvpFood-${ev.id}`}
                                      value={opt}
                                      checked={draft.foodPreference === opt}
                                      onChange={() => {}}
                                      onClick={() => handleToggleFood(ev.id, opt)}
                                      className="h-4 w-4 accent-[#9E2A2B] cursor-pointer"
                                    />
                                    <span>{opt === 'veg' ? 'Veg' : 'Non-Veg'}</span>
                                  </label>
                                ))}
                              </div>
                            </fieldset>

                            {supportsAlcohol && (
                              <fieldset>
                                <legend className="block text-xs font-semibold text-[#4C373A] mb-2">
                                  Drinks preference
                                </legend>
                                <div className="grid grid-cols-2 gap-2">
                                  {(['alcohol', 'no_alcohol'] as const).map((opt) => (
                                    <label
                                      key={opt}
                                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors cursor-pointer select-none ${
                                        draft.alcoholPreference === opt
                                          ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                                          : 'border-[#E6D194] bg-[#FFF9E2] text-[#4C373A] hover:border-[#C89D54]'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`guestRsvpAlcohol-${ev.id}`}
                                        value={opt}
                                        checked={draft.alcoholPreference === opt}
                                        onChange={() => {}}
                                        onClick={() => handleToggleAlcohol(ev.id, opt)}
                                        className="h-4 w-4 accent-[#9E2A2B] cursor-pointer"
                                      />
                                      <span>
                                        {opt === 'alcohol' ? 'Alcohol' : 'No Alcohol'}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </fieldset>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {rsvpErrors.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#9E2A2B]/35 bg-[#9E2A2B]/8 px-4 py-2.5 space-y-1"
                  >
                    {rsvpErrors.map((err, i) => (
                      <p key={i} className="text-xs font-medium text-[#7F1924]">
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Dialog Footer Actions: Close + Send */}
              <div className="px-5 sm:px-6 py-4 bg-[#FDF3D0] border-t border-[#E6D194] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRsvpDialogOpen(false)}
                  disabled={submittingRsvp}
                  className="rounded-xl border border-[#E6D194] bg-[#FFF9E2] px-5 py-2.5 text-sm font-medium text-[#4C373A] hover:bg-[#F9E8AE] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingRsvp}
                  data-testid="submit-rsvp-dialog-button"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4D0A14] px-6 py-2.5 text-sm font-medium text-[#FAF5EC] hover:bg-[#63111D] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#DFBE7B]" aria-hidden="true" />
                  {submittingRsvp ? 'Sending…' : 'Send RSVP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EVENT DETAILS DIALOG (DESCRIPTION + DRESS CODE) */}
      <EventKnowMoreModal
        event={knowMoreEvent}
        onClose={() => setKnowMoreEventId(null)}
      />

      {/* FAMILY CONTACT DIALOG (KUNDU / BHATTACHARYA) */}
      <FamilyContactModal
        family={activeContactFamily ? FAMILY_CONTACTS[activeContactFamily] : null}
        onClose={() => setActiveContactFamily(null)}
      />
    </div>
  );
};
