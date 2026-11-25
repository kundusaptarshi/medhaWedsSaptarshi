import type { WeddingEventDetail } from '../data/weddingEventDetails';
import type { GuestSide, InviteSideMode } from '../types';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

/**
 * Parses an explicit ?side=bride, ?side=groom, or ?side=generic query parameter,
 * returning null if absent or unrecognized.
 */
export function parseSideQueryParam(search: string): InviteSideMode | null {
  const params = new URLSearchParams(search);
  const raw = params.get('side')?.trim().toLowerCase();
  if (raw === 'bride' || raw === 'groom' || raw === 'generic') {
    return raw;
  }
  return null;
}

/**
 * Resolves the active guest invitation mode from the URL query parameter and
 * optional stored invitation side:
 * - Explicit ?side=bride | ?side=groom | ?side=generic always takes precedence.
 * - When no ?side parameter is passed, personalized invitations honor their
 *   stored side ('bride' | 'groom'), while reference/generic routes default to
 *   'generic' (combined mode showing both Bride's and Groom's details).
 */
export function resolveInviteSideMode(options: {
  search: string;
  invitationSide?: GuestSide | null;
  preferGenericWhenNoParam?: boolean;
}): InviteSideMode {
  const urlSide = parseSideQueryParam(options.search);
  if (urlSide) return urlSide;
  if (options.preferGenericWhenNoParam) return 'generic';
  if (options.invitationSide === 'bride' || options.invitationSide === 'groom') {
    return options.invitationSide;
  }
  return 'generic';
}

/**
 * Produces an updated query string with ?side=bride|groom|generic while preserving all
 * other query parameters (e.g. autostart=1, events=...).
 */
export function buildUpdatedSideSearch(
  currentSearch: string,
  side: InviteSideMode
): string {
  const params = new URLSearchParams(currentSearch);
  params.set('side', side);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

/**
 * Returns the side-aware header badge/subtitle text for side-specific events
 * (Aiburobhat & Haldi) so Bride's Side shows "Bride's Side", Groom's Side shows
 * "Groom's Side", and Generic/Combined mode shows "Bride's & Groom's Sides".
 * Returns null for shared events that are not side-specific.
 */
export function getEventSideHeaderLabel(
  event: Pick<WeddingEventDetail, 'sideSpecific' | 'resolvedSide'>
): string | null {
  if (!event.sideSpecific) return null;
  if (event.resolvedSide === 'bride') return "Bride's Side";
  if (event.resolvedSide === 'groom') return "Groom's Side";
  return "Bride's & Groom's Sides";
}

/**
 * Computes remaining days, hours, minutes, and seconds until an ISO timestamp.
 */
export function computeCountdownParts(
  targetIso: string,
  nowMs: number = Date.now()
): CountdownParts {
  const targetMs = Date.parse(targetIso);
  if (!Number.isFinite(targetMs) || targetMs <= nowMs) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const diffSeconds = Math.floor((targetMs - nowMs) / 1000);
  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  return { days, hours, minutes, seconds, isPast: false };
}

/**
 * Picks the earliest upcoming event from the guest's invited events for the countdown banner.
 * Falls back to the first event in canonical order if all events are in the past.
 */
export function pickNextCountdownEvent(
  events: WeddingEventDetail[],
  nowMs: number = Date.now()
): WeddingEventDetail | null {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.sortOrder - b.sortOrder);
  const upcoming = sorted.find((ev) => Date.parse(ev.startIso) > nowMs);
  return upcoming ?? sorted[0];
}

/**
 * Formats a UTC Date as YYYYMMDDTHHMMSSZ for RFC 5545 iCalendar files.
 */
function formatIcsUtcTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Generates an RFC 5545 .ics calendar file string for a single wedding event.
 */
export function buildEventIcsContent(
  event: WeddingEventDetail,
  guestDisplayName?: string,
  nowDate: Date = new Date()
): string {
  const startDate = new Date(event.startIso);
  const endDate = new Date(startDate.getTime() + event.durationHours * 3600 * 1000);
  const summary = `Medha & Saptarshi — ${event.title}`;
  const location = event.venueAddress.trim()
    ? `${event.venueName}, ${event.venueAddress}`
    : event.venueName;
  const descriptionParts = [
    guestDisplayName ? `Invited Guest: ${guestDisplayName}` : null,
    event.description,
    `Dress Code: ${event.dressCode}`,
  ].filter(Boolean);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedhaWedsSaptarshi//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}-medhawedssaptarshi@invite`,
    `DTSTAMP:${formatIcsUtcTimestamp(nowDate)}`,
    `DTSTART:${formatIcsUtcTimestamp(startDate)}`,
    `DTEND:${formatIcsUtcTimestamp(endDate)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join(' | '))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a browser download of an .ics calendar file for a wedding event.
 */
export function downloadEventIcsFile(
  event: WeddingEventDetail,
  guestDisplayName?: string
): void {
  const ics = buildEventIcsContent(event, guestDisplayName);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Medha-Weds-Saptarshi-${event.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Builds a clean Google Maps directions search URL for a venue.
 */
export function buildGoogleMapsSearchUrl(
  venueName: string,
  venueAddress: string
): string {
  const query = venueAddress.trim()
    ? `${venueName}, ${venueAddress}`
    : venueName;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface DeviceSignals {
  userAgent?: string;
  platform?: string;
  viewportWidth?: number;
  hasCoarsePointer?: boolean;
  maxTouchPoints?: number;
}

/**
 * Pure helper determining whether the current browsing context is a Phone or Tablet
 * (iOS/iPadOS/Android UA, iPadOS desktop-mode Safari, coarse touch pointer up to
 * tablet widths, or mobile/tablet touch viewport) versus a Desktop/Laptop computer.
 */
export function detectMobileDevice(signals: DeviceSignals): boolean {
  const ua = signals.userAgent ?? '';
  const platform = signals.platform ?? '';
  const touchPoints = signals.maxTouchPoints ?? 0;

  // 1. Explicit Phone / Tablet user agents (iPhone, iPad, iPod, Android, Kindle/Silk, etc.)
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|PlayBook/i.test(
      ua
    )
  ) {
    return true;
  }

  // 2. iPadOS 13+ Safari reports a desktop Macintosh UA / MacIntel platform with multi-touch
  if ((/Macintosh/i.test(ua) || /MacIntel/i.test(platform)) && touchPoints > 1) {
    return true;
  }

  const width = signals.viewportWidth;

  // 3. Touch-primary devices (phones and tablets up through landscape iPad Pro 1366px)
  if (signals.hasCoarsePointer) {
    if (typeof width !== 'number' || width <= 0 || width <= 1366) {
      return true;
    }
  }

  // 4. Touch-capable mobile & tablet viewports (<= 1024px)
  if (typeof width === 'number' && width > 0 && width <= 1024 && touchPoints > 0) {
    return true;
  }

  // 5. Compact phone viewport fallback
  if (typeof width === 'number' && width > 0 && width <= 640) {
    return true;
  }

  return false;
}

/**
 * Reads live browser signals to determine whether to serve Phone/Tablet native-app
 * `maps.app.goo.gl` links or Desktop/Laptop standard Google Maps search URLs.
 */
export function detectBrowserMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return detectMobileDevice({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    viewportWidth: window.innerWidth,
    hasCoarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });
}

/**
 * Selects the exact saved-pin `maps.app.goo.gl` link on mobile/phone devices and
 * the standard `https://www.google.com/maps/search/?api=1&query=...` URL on desktop.
 */
export function resolveDeviceDirectionsUrl(
  target: {
    directionsUrl: string | null;
    mobileDirectionsUrl?: string | null;
  },
  isMobile: boolean
): string | null {
  const mobileUrl =
    typeof target.mobileDirectionsUrl === 'string'
      ? target.mobileDirectionsUrl.trim()
      : '';
  const desktopUrl =
    typeof target.directionsUrl === 'string' ? target.directionsUrl.trim() : '';
  if (isMobile && mobileUrl.length > 0) {
    return mobileUrl;
  }
  return desktopUrl.length > 0 ? desktopUrl : null;
}

export interface EventDirectionsState {
  disabled: boolean;
  href: string | null;
  label: string;
  tooltip?: string;
}

/**
 * Resolves the Directions button state for a celebration event:
 * - Events with Location TBD (such as Mehendi & Cocktail) are visibly disabled with no href.
 * - Active events open the exact `maps.app.goo.gl` pin on mobile devices and the
 *   standard desktop Google Maps URL on desktop browsers.
 */
export function getEventDirectionsState(
  event: Pick<
    WeddingEventDetail,
    'directionsUrl' | 'mobileDirectionsUrl' | 'directionsDisabled'
  >,
  isMobile = false
): EventDirectionsState {
  const url = resolveDeviceDirectionsUrl(event, isMobile);
  if (event.directionsDisabled || !url) {
    return {
      disabled: true,
      href: null,
      label: 'Location TBD',
      tooltip: 'Location TBD',
    };
  }
  return {
    disabled: false,
    href: url,
    label: 'Get Directions',
  };
}

export interface EventMediaConfig {
  hasVideo: boolean;
  videoSrc: string | null;
  autoPlay: boolean;
  loop: boolean;
  muted: boolean;
  playsInline: boolean;
  controls: boolean;
}

/**
 * Returns normalized playback attributes for an event's vertical media frame.
 * Looping celebration videos autoplay muted by default (with an interactive sound toggle)
 * and zero browser playback controls chrome.
 */
export function getEventMediaConfig(
  event: Pick<WeddingEventDetail, 'videoSrc'>
): EventMediaConfig {
  const trimmed = typeof event.videoSrc === 'string' ? event.videoSrc.trim() : '';
  return {
    hasVideo: trimmed.length > 0,
    videoSrc: trimmed.length > 0 ? trimmed : null,
    autoPlay: true,
    loop: true,
    muted: true,
    playsInline: true,
    controls: false,
  };
}

/**
 * Checks whether an event provides meaningful content (cultural description + dress code)
 * for its "Know More" dialog box.
 */
export function hasKnowMoreContent(
  event: Pick<WeddingEventDetail, 'title' | 'description' | 'dressCode'>
): boolean {
  return (
    event.title.trim().length > 0 &&
    event.description.trim().length > 0 &&
    event.dressCode.trim().length > 0
  );
}
