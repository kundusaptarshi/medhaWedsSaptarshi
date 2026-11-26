import type {
  EventRsvpDraft,
  EventRsvpEntry,
  GuestSide,
  InvitationRecord,
  InvitationRsvp,
  RsvpAlcoholPreference,
  RsvpFoodPreference,
  ValidationResult,
  WeddingEvent,
} from '../types';

export const BRAND_PREFIX = 'MedhaWedsSaptarshi';

export const BLUEPRINT_LIMITS = {
  SLUG_MIN: 2,
  SLUG_MAX: 100,
  GUEST_NAME_MAX: 120,
  GUEST_NAMES_MAX_ITEMS: 20,
  DISPLAY_GUEST_NAME_MAX: 300,
  EVENT_IDS_MAX_ITEMS: 20,
} as const;

export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Fixed ordered list of wedding celebrations (names only, non-editable).
 */
export const WEDDING_EVENTS: WeddingEvent[] = [
  { id: 'mehendi-cocktail', title: 'Mehendi/Cocktail', sortOrder: 1 },
  { id: 'aiburobhat', title: 'Aiburobhat', sortOrder: 2 },
  { id: 'haldi', title: 'Haldi', sortOrder: 3 },
  { id: 'wedding', title: 'Wedding', sortOrder: 4 },
  { id: 'boubhat', title: 'Boubhat', sortOrder: 5 },
  { id: 'reception', title: 'Reception', sortOrder: 6 },
];

export function formatSideLabel(side: GuestSide): string {
  return side === 'groom' ? 'Groom Side' : 'Bride Side';
}

/**
 * Cleans an array of entered guest name strings while preserving exact spelling & capitalization.
 */
export function normalizeGuestNames(rawNames: string[]): string[] {
  return rawNames.map((name) => name.trim()).filter((name) => name.length > 0);
}

/**
 * Formats one or multiple invitee names into an elegant natural display string,
 * preserving exact spelling and appending "& Family" cleanly when withFamily is checked.
 */
export function formatGuestDisplayName(
  rawNames: string[],
  withFamily = false
): string {
  const names = normalizeGuestNames(rawNames);
  if (names.length === 0) return '';

  const alreadyHasFamily = /\bfamily\b/i.test(names[names.length - 1]);
  const parts = withFamily && !alreadyHasFamily ? [...names, 'Family'] : names;

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

/**
 * Converts text into a safe lowercase URL slug matching ^[a-z0-9-]+$.
 */
export function slugifyText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateRandomNumericCode(digits = 8): string {
  const min = Math.pow(10, digits - 1);
  const range = 9 * min;

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const value = min + (arr[0] % range);
    return String(value);
  }

  const value = min + Math.floor(Math.random() * range);
  return String(value);
}

/**
 * Generates a guaranteed-unique numerical invitation ID (e.g. "48291736").
 * Never overwrites an existing ID even when the same guest name is entered again.
 */
export function generateUniqueSlug(
  _guestNames: string[],
  existingSlugs: Iterable<string>,
  _withFamily = false
): string {
  const used = new Set<string>();
  for (const s of existingSlugs) {
    used.add(s.toLowerCase());
  }

  for (let attempt = 0; attempt < 1000; attempt++) {
    const candidate = generateRandomNumericCode(8);
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  // Deterministic numeric fallback guaranteed not to collide
  let fallback = Date.now();
  while (used.has(String(fallback))) {
    fallback += 1;
  }
  return String(fallback);
}

export const STUDIO_PATH = '/studio';
export const STUDIO_DISPLAY_PATH = '/studio';

/**
 * Builds the canonical invitation URL for a guest code (/invite/<guestCode>).
 */
export function buildInvitationUrl(slug: string, origin?: string): string {
  const resolvedOrigin =
    origin !== undefined
      ? origin.replace(/\/+$/, '')
      : typeof window !== 'undefined'
        ? window.location.origin
        : 'https://medhawedssaptarshi.pages.dev';
  return `${resolvedOrigin}/invite/${slug}`;
}

/**
 * Builds the canonical URL for the Invitation Studio (/studio).
 */
export function buildStudioUrl(origin?: string): string {
  const resolvedOrigin =
    origin !== undefined
      ? origin.replace(/\/+$/, '')
      : typeof window !== 'undefined'
        ? window.location.origin
        : 'https://medhawedssaptarshi.pages.dev';
  return `${resolvedOrigin}${STUDIO_PATH}`;
}

/**
 * Returns the canonical studio URL (pathname + preserved search, no hash) when
 * the current studio location needs normalization (e.g. "/" or "/#us-through-the-years"),
 * or null if the address bar is already exactly canonical.
 */
export function getCanonicalStudioTargetUrl(
  pathname: string,
  hash = '',
  search = ''
): string | null {
  if (parseInviteSlugFromPath(pathname) !== null) {
    return null;
  }
  const normalizedPath = pathname.replace(/\/+$/, '');
  const hasTrailingSlash = pathname !== STUDIO_PATH && normalizedPath === STUDIO_PATH;
  const hasHash = hash.length > 0;
  if (normalizedPath !== STUDIO_PATH || hasTrailingSlash || hasHash) {
    return `${STUDIO_PATH}${search}`;
  }
  return null;
}

/**
 * Short display path shown in compact cards (/invite/<guestCode>).
 */
export function buildBrandedDisplayPath(slug: string): string {
  return `/invite/${slug}`;
}

/**
 * Extracts a valid invitation slug from /invite/:slug.
 */
export function parseInviteSlugFromPath(pathname: string): string | null {
  const cleaned = pathname.replace(/\/+$/, '');
  const match = cleaned.match(/^\/invite\/([a-z0-9-]+)$/i);
  if (match) return match[1].toLowerCase();

  return null;
}

/**
 * Builds a permanent self-contained URL for a generic (nameless) invitation
 * encoding the selected guest side and canonical event IDs.
 */
export function buildGenericInvitationUrl(
  side: GuestSide,
  eventIds: string[],
  origin?: string
): string {
  const baseUrl = buildInvitationUrl('generic', origin);
  const canonicalIds = resolveInvitedEvents(eventIds).map((ev) => ev.id);
  const params = new URLSearchParams();
  params.set('side', side);
  if (canonicalIds.length > 0) {
    params.set('events', canonicalIds.join(','));
  }
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parses side and valid canonical event IDs from a generic invitation URL query string.
 */
export function parseGenericInviteParams(search: string): {
  side: GuestSide;
  eventIds: string[];
} {
  const params = new URLSearchParams(search);
  const rawSide = params.get('side');
  const side: GuestSide = rawSide === 'groom' ? 'groom' : 'bride';
  const rawEvents = (params.get('events') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const validEventIds = resolveInvitedEvents(rawEvents).map((ev) => ev.id);
  return { side, eventIds: validEventIds };
}

/**
 * Validates generic invitation draft inputs (requires side and at least one event, no guest name).
 */
export function validateGenericInvitationDraft(
  side: GuestSide,
  selectedEventIds: string[]
): ValidationResult {
  const errors: string[] = [];
  if (side !== 'bride' && side !== 'groom') {
    errors.push('Please select Bride Side or Groom Side.');
  }
  const uniqueEvents = Array.from(new Set(selectedEventIds.filter(Boolean)));
  if (uniqueEvents.length === 0) {
    errors.push('Please select at least one wedding event for this invitation.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Builds the exact WhatsApp wedding invitation message with the invitation-specific URL.
 */
export function buildWhatsAppMessage(_displayGuestName: string, inviteUrl: string): string {
  return [
    '❤️ *A WEDDING INVITATION* ❤️',
    '',
    "Some of life's most beautiful moments become even more special when shared with the people we hold dear.",
    '',
    'As we begin a beautiful new chapter together, we are delighted to invite you to be a part of our wedding celebrations. Your presence, love, and blessings would make this occasion truly unforgettable.',
    '',
    'We have created a wedding website with all the details of our celebrations and our invitation.',
    '',
    `✨ *OUR WEDDING INVITATION* 🔗 ${inviteUrl}`,
    '',
    'You can also scan the QR code attached to this message to access our invitation.',
    '',
    'We sincerely hope you will join us as we celebrate love, togetherness, and the beginning of our forever!',
    '',
    'With Love, ',
    '_*Medha & Saptarshi*_ ❤️',
  ].join('\n');
}

/**
 * Builds a pre-filled WhatsApp share URL that opens WhatsApp's contacts picker
 * with the exact invitation message and invitation-specific link.
 */
export function buildWhatsAppShareUrl(displayGuestName: string, inviteUrl: string): string {
  const message = buildWhatsAppMessage(displayGuestName, inviteUrl);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Builds the exact WhatsApp message for a generic (nameless) invitation link.
 */
export function buildGenericWhatsAppMessage(inviteUrl: string): string {
  return buildWhatsAppMessage('', inviteUrl);
}

/**
 * Builds a pre-filled WhatsApp share URL for a generic (nameless) invitation
 * that opens WhatsApp's contacts picker with the exact invitation message and link.
 */
export function buildGenericWhatsAppShareUrl(inviteUrl: string): string {
  const message = buildGenericWhatsAppMessage(inviteUrl);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Validates invitation form inputs against firebase-blueprint.json boundaries.
 */
export function validateInvitationDraft(
  side: GuestSide,
  rawGuestNames: string[],
  withFamily: boolean,
  selectedEventIds: string[]
): ValidationResult {
  const errors: string[] = [];
  const names = normalizeGuestNames(rawGuestNames);

  if (side !== 'bride' && side !== 'groom') {
    errors.push('Please select Bride Side or Groom Side.');
  }

  if (names.length === 0) {
    errors.push('Please enter at least one guest name.');
  } else if (names.length > BLUEPRINT_LIMITS.GUEST_NAMES_MAX_ITEMS) {
    errors.push(`You can add up to ${BLUEPRINT_LIMITS.GUEST_NAMES_MAX_ITEMS} guest names per invitation.`);
  }

  for (const name of names) {
    if (name.length > BLUEPRINT_LIMITS.GUEST_NAME_MAX) {
      errors.push(`Guest name "${name.slice(0, 24)}..." exceeds ${BLUEPRINT_LIMITS.GUEST_NAME_MAX} characters.`);
    }
  }

  const displayGuestName = formatGuestDisplayName(names, withFamily);
  if (displayGuestName.length > BLUEPRINT_LIMITS.DISPLAY_GUEST_NAME_MAX) {
    errors.push(`Combined guest names must stay under ${BLUEPRINT_LIMITS.DISPLAY_GUEST_NAME_MAX} characters.`);
  }

  const uniqueEvents = Array.from(new Set(selectedEventIds.filter(Boolean)));
  if (uniqueEvents.length === 0) {
    errors.push('Please select at least one wedding event for this guest.');
  } else if (uniqueEvents.length > BLUEPRINT_LIMITS.EVENT_IDS_MAX_ITEMS) {
    errors.push(`A maximum of ${BLUEPRINT_LIMITS.EVENT_IDS_MAX_ITEMS} events can be selected.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Returns the effective recency timestamp for sorting newest first,
 * prioritizing updatedAtMs (edits) over createdAtMs.
 */
export function getInvitationSortTimestamp(
  inv: Pick<InvitationRecord, 'createdAtMs' | 'updatedAtMs'>
): number {
  const updated = Number.isFinite(inv.updatedAtMs) ? inv.updatedAtMs : 0;
  const created = Number.isFinite(inv.createdAtMs) ? inv.createdAtMs : 0;
  return updated > 0 ? Math.max(updated, created) : created;
}

/**
 * Filters invitations by guest name query, optional event ID, and optional side ('all' | 'bride' | 'groom'),
 * always sorted strictly newest first (prioritizing updatedAtMs over createdAtMs).
 */
export function filterAndSortInvitations(
  invitations: InvitationRecord[],
  searchQuery: string,
  eventFilterId: string,
  sideFilter: 'all' | GuestSide = 'all'
): InvitationRecord[] {
  const q = searchQuery.trim().toLowerCase();

  return invitations
    .filter((inv) => {
      if (sideFilter !== 'all' && inv.side !== sideFilter) {
        return false;
      }
      if (eventFilterId && eventFilterId !== 'all' && !inv.eventIds.includes(eventFilterId)) {
        return false;
      }
      if (!q) return true;
      if (inv.displayGuestName.toLowerCase().includes(q)) return true;
      if (inv.slug.toLowerCase().includes(q)) return true;
      return inv.guestNames.some((name) => name.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const diff = getInvitationSortTimestamp(b) - getInvitationSortTimestamp(a);
      return diff !== 0 ? diff : b.createdAtMs - a.createdAtMs;
    });
}

/**
 * Returns only the fixed WeddingEvent objects selected for an invitation, in canonical order.
 */
export function resolveInvitedEvents(
  eventIds: string[],
  allEvents: WeddingEvent[] = WEDDING_EVENTS
): WeddingEvent[] {
  const selectedSet = new Set(eventIds);
  return allEvents
    .filter((ev) => selectedSet.has(ev.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Formats an epoch timestamp for tabular display in invitation cards.
 */
export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export const RSVP_HEADCOUNT_MIN = 1;
export const RSVP_HEADCOUNT_MAX = 50;
export const ALCOHOL_ENABLED_EVENT_ID = 'mehendi-cocktail';

export const VALID_RSVP_EVENT_IDS = [
  'mehendi-cocktail',
  'aiburobhat',
  'haldi',
  'wedding',
  'boubhat',
  'reception',
] as const;

export const VALID_EVENT_ID_SET = new Set<string>(VALID_RSVP_EVENT_IDS);

/**
 * Alcohol / No Alcohol selection applies strictly to Mehendi/Cocktail.
 */
export function eventSupportsAlcohol(eventId: string): boolean {
  return eventId === ALCOHOL_ENABLED_EVENT_ID;
}

/**
 * Parses a headcount input with Number.parseInt(value, 10) and clamps it to an
 * integer in [1, 50], defaulting to 1 if empty or invalid.
 */
export function normalizeHeadcount(value: unknown): number {
  if (value === null || value === undefined) {
    return RSVP_HEADCOUNT_MIN;
  }
  const rawStr = typeof value === 'string' ? value.trim() : String(value).trim();
  if (rawStr === '') {
    return RSVP_HEADCOUNT_MIN;
  }
  const parsed = Number.parseInt(rawStr, 10);
  if (!Number.isInteger(parsed)) {
    return RSVP_HEADCOUNT_MIN;
  }
  return Math.max(RSVP_HEADCOUNT_MIN, Math.min(RSVP_HEADCOUNT_MAX, parsed));
}

/**
 * Strictly normalizes a single per-event RSVP entry to satisfy Firestore
 * isValidEventRsvpEntry rules:
 * - Always returns the exact 4 keys: attending, headcount, foodPreference, alcoholPreference.
 * - For 'coming': integer headcount in [1, 50] (default 1), foodPreference in 'veg' | 'non_veg' | null,
 *   and alcoholPreference in 'alcohol' | 'no_alcohol' | null ONLY for 'mehendi-cocktail' (always null otherwise).
 * - For 'not_coming': headcount, foodPreference, and alcoholPreference are always null.
 * - Returns null for unanswered or invalid entries so callers omit them from byEvent.
 */
export function normalizeEventRsvpEntry(
  eventId: string,
  raw: unknown
): EventRsvpEntry | null {
  if (!VALID_EVENT_ID_SET.has(eventId)) return null;
  if (!raw || typeof raw !== 'object') return null;

  const entry = raw as Record<string, unknown>;
  const attending = entry.attending;

  if (attending === 'not_coming') {
    return {
      attending: 'not_coming',
      headcount: null,
      foodPreference: null,
      alcoholPreference: null,
    };
  }

  if (attending === 'coming') {
    const headcount = normalizeHeadcount(entry.headcount);
    const foodPreference: RsvpFoodPreference | null =
      entry.foodPreference === 'veg' || entry.foodPreference === 'non_veg'
        ? entry.foodPreference
        : null;
    const alcoholPreference: RsvpAlcoholPreference | null =
      eventSupportsAlcohol(eventId) &&
      (entry.alcoholPreference === 'alcohol' ||
        entry.alcoholPreference === 'no_alcohol')
        ? entry.alcoholPreference
        : null;

    return {
      attending: 'coming',
      headcount,
      foodPreference,
      alcoholPreference,
    };
  }

  return null;
}

/**
 * Strictly normalizes a complete rsvp.byEvent map before saving to or reading from Firestore.
 * Only includes valid wedding event IDs that have an answered 'coming' or 'not_coming' entry.
 */
export function normalizeRsvpByEvent(
  rawByEvent: Record<string, unknown> | null | undefined
): Record<string, EventRsvpEntry> {
  const normalized: Record<string, EventRsvpEntry> = {};
  if (!rawByEvent || typeof rawByEvent !== 'object') {
    return normalized;
  }

  for (const eventId of VALID_RSVP_EVENT_IDS) {
    if (!Object.prototype.hasOwnProperty.call(rawByEvent, eventId)) {
      continue;
    }
    const normalizedEntry = normalizeEventRsvpEntry(eventId, rawByEvent[eventId]);
    if (normalizedEntry) {
      normalized[eventId] = normalizedEntry;
    }
  }

  return normalized;
}

export interface RsvpSummaryCounts {
  totalSlots: number;
  coming: number;
  totalHeadcount: number;
  notComing: number;
  pending: number;
  veg: number;
  nonVeg: number;
  alcohol: number;
  noAlcohol: number;
}

/**
 * Builds initial per-event RSVP form drafts STRICTLY for the invited events of an invitation.
 */
export function buildInitialEventRsvpDrafts(
  invitedEventIds: string[],
  existingRsvp: InvitationRsvp | null
): Record<string, EventRsvpDraft> {
  const drafts: Record<string, EventRsvpDraft> = {};
  const resolved = resolveInvitedEvents(invitedEventIds);
  for (const ev of resolved) {
    const entry = existingRsvp?.byEvent?.[ev.id];
    if (!entry) {
      drafts[ev.id] = {
        attending: '',
        headcount: '1',
        foodPreference: '',
        alcoholPreference: '',
      };
    } else {
      drafts[ev.id] = {
        attending: entry.attending,
        headcount:
          entry.attending === 'coming' && entry.headcount != null
            ? String(entry.headcount)
            : '1',
        foodPreference: entry.attending === 'coming' ? entry.foodPreference ?? '' : '',
        alcoholPreference:
          entry.attending === 'coming' && eventSupportsAlcohol(ev.id)
            ? entry.alcoholPreference ?? ''
            : '',
      };
    }
  }
  return drafts;
}

/**
 * Validates and normalizes per-event RSVP drafts strictly for the invitation's applicable events.
 * - Headcount is editable ONLY when allowHeadcount is true (i.e. withFamily invitations); otherwise defaults to 1.
 * - Alcohol / No Alcohol applies ONLY to Mehendi/Cocktail (always null for all other events).
 * - Supports clearing any radio group; events with cleared attendance are omitted from byEvent.
 */
export function validateAndNormalizePerEventRsvp(
  invitedEventIds: string[],
  drafts: Record<string, EventRsvpDraft>,
  allowHeadcount = true
): { valid: boolean; errors: string[]; byEvent: Record<string, EventRsvpEntry> } {
  const errors: string[] = [];
  const rawByEvent: Record<string, EventRsvpEntry> = {};
  const resolved = resolveInvitedEvents(invitedEventIds);

  for (const ev of resolved) {
    const draft = drafts[ev.id];
    if (!draft || draft.attending === '') {
      continue;
    }

    if (draft.attending === 'not_coming') {
      const normalizedEntry = normalizeEventRsvpEntry(ev.id, {
        attending: 'not_coming',
        headcount: null,
        foodPreference: null,
        alcoholPreference: null,
      });
      if (normalizedEntry) {
        rawByEvent[ev.id] = normalizedEntry;
      }
      continue;
    }

    if (draft.attending === 'coming') {
      let resolvedHeadcount = RSVP_HEADCOUNT_MIN;
      if (allowHeadcount) {
        const trimmedCount = draft.headcount.trim();
        if (trimmedCount !== '') {
          const isWholeNumber = /^\d+$/.test(trimmedCount);
          const parsedCount = Number.parseInt(trimmedCount, 10);
          if (
            !isWholeNumber ||
            !Number.isInteger(parsedCount) ||
            parsedCount < RSVP_HEADCOUNT_MIN ||
            parsedCount > RSVP_HEADCOUNT_MAX
          ) {
            errors.push(
              `${ev.title}: Please enter a whole-number headcount between ${RSVP_HEADCOUNT_MIN} and ${RSVP_HEADCOUNT_MAX}.`
            );
            continue;
          }
          resolvedHeadcount = parsedCount;
        }
      }

      const normalizedEntry = normalizeEventRsvpEntry(ev.id, {
        attending: 'coming',
        headcount: resolvedHeadcount,
        foodPreference: draft.foodPreference,
        alcoholPreference: draft.alcoholPreference,
      });
      if (normalizedEntry) {
        rawByEvent[ev.id] = normalizedEntry;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    byEvent: normalizeRsvpByEvent(rawByEvent),
  };
}

/**
 * Computes per-event RSVP attendance, total headcount, and catering/bar counts
 * strictly for applicable events (scoped to eventFilterId when a specific event is selected).
 */
export function summarizePerEventRsvps(
  invitations: InvitationRecord[],
  eventFilterId = 'all'
): RsvpSummaryCounts {
  const summary: RsvpSummaryCounts = {
    totalSlots: 0,
    coming: 0,
    totalHeadcount: 0,
    notComing: 0,
    pending: 0,
    veg: 0,
    nonVeg: 0,
    alcohol: 0,
    noAlcohol: 0,
  };

  for (const inv of invitations) {
    const applicableEvents = resolveInvitedEvents(inv.eventIds).filter(
      (ev) => eventFilterId === 'all' || ev.id === eventFilterId
    );
    for (const ev of applicableEvents) {
      summary.totalSlots += 1;
      const entry = inv.rsvp?.byEvent?.[ev.id];
      if (!entry) {
        summary.pending += 1;
        continue;
      }
      if (entry.attending === 'coming') {
        const count =
          inv.withFamily && typeof entry.headcount === 'number' && entry.headcount >= 1
            ? entry.headcount
            : 1;
        summary.coming += 1;
        summary.totalHeadcount += count;
        if (entry.foodPreference === 'veg') summary.veg += count;
        else if (entry.foodPreference === 'non_veg') summary.nonVeg += count;

        if (eventSupportsAlcohol(ev.id)) {
          if (entry.alcoholPreference === 'alcohol') summary.alcohol += count;
          else if (entry.alcoholPreference === 'no_alcohol') summary.noAlcohol += count;
        }
      } else if (entry.attending === 'not_coming') {
        summary.notComing += 1;
      } else {
        summary.pending += 1;
      }
    }
  }

  return summary;
}

export function formatEventAttendanceLabel(entry?: EventRsvpEntry): string {
  if (!entry) return 'Pending';
  return entry.attending === 'coming' ? 'Coming' : 'Not Coming';
}

export function formatEventHeadcountLabel(
  entry?: EventRsvpEntry,
  withFamily = true
): string {
  if (!entry || entry.attending !== 'coming') return '—';
  if (!withFamily) return '1';
  return entry.headcount != null ? String(entry.headcount) : '1';
}

export function formatEventFoodLabel(entry?: EventRsvpEntry): string {
  if (!entry || entry.attending !== 'coming' || !entry.foodPreference) return '—';
  return entry.foodPreference === 'veg' ? 'Veg' : 'Non-Veg';
}

export function formatEventAlcoholLabel(
  entry?: EventRsvpEntry,
  eventId: string = ALCOHOL_ENABLED_EVENT_ID
): string {
  if (!eventSupportsAlcohol(eventId)) return '—';
  if (!entry || entry.attending !== 'coming' || !entry.alcoholPreference) return '—';
  return entry.alcoholPreference === 'alcohol' ? 'Alcohol' : 'No Alcohol';
}
