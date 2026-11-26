import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  EventRsvpEntry,
  GuestSide,
  InvitationRecord,
  InvitationRsvp,
  WeddingEvent,
} from '../types';
import {
  BLUEPRINT_LIMITS,
  formatGuestDisplayName,
  generateUniqueSlug,
  getInvitationSortTimestamp,
  normalizeGuestNames,
  normalizeRsvpByEvent,
  resolveInvitedEvents,
} from '../utils/invitationLogic';

const STUDIO_AUTHOR_ID = 'studio-host';

function toMillis(value: unknown, fallback = Date.now()): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const fn = (value as { toMillis: () => number }).toMillis;
    if (typeof fn === 'function') return fn();
  }
  return fallback;
}

function parseFirestoreRsvp(raw: unknown): InvitationRsvp | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const rawByEvent = obj.byEvent;
  if (!rawByEvent || typeof rawByEvent !== 'object') return null;

  const byEvent = normalizeRsvpByEvent(rawByEvent as Record<string, unknown>);
  if (Object.keys(byEvent).length === 0) return null;

  return {
    byEvent,
    respondedAtMs: toMillis(obj.respondedAt, 0),
  };
}

export function subscribeInvitations(
  onData: (invitations: InvitationRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'invitations';
  return onSnapshot(
    query(collection(db, path), where('createdBy', '==', STUDIO_AUTHOR_ID)),
    (snapshot) => {
      const items: InvitationRecord[] = snapshot.docs
        .filter((d) => !Boolean(d.data().isGeneric))
        .map((d) => {
          const data = d.data();
          const guestNames = Array.isArray(data.guestNames)
            ? data.guestNames.map((n: unknown) => String(n))
            : [];
          const withFamily = Boolean(data.withFamily);
          const side: GuestSide = data.side === 'groom' ? 'groom' : 'bride';
          const eventIds = Array.isArray(data.eventIds)
            ? data.eventIds.map((e: unknown) => String(e))
            : [];
          return {
            slug: String(data.slug ?? d.id),
            isGeneric: false,
            side,
            guestNames,
            withFamily,
            displayGuestName: String(
              data.displayGuestName ?? formatGuestDisplayName(guestNames, withFamily)
            ),
            eventIds,
            rsvp: parseFirestoreRsvp(data.rsvp),
            createdBy: String(data.createdBy ?? STUDIO_AUTHOR_ID),
            createdAtMs: toMillis(data.createdAt),
            updatedAtMs: toMillis(data.updatedAt),
          };
        });
      items.sort((a, b) => {
        const diff = getInvitationSortTimestamp(b) - getInvitationSortTimestamp(a);
        return diff !== 0 ? diff : b.createdAtMs - a.createdAtMs;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function createInvitation(
  side: GuestSide,
  rawGuestNames: string[],
  withFamily: boolean,
  selectedEventIds: string[],
  existingSlugs: string[]
): Promise<InvitationRecord> {
  const guestNames = normalizeGuestNames(rawGuestNames)
    .slice(0, BLUEPRINT_LIMITS.GUEST_NAMES_MAX_ITEMS)
    .map((n) => n.slice(0, BLUEPRINT_LIMITS.GUEST_NAME_MAX));

  const displayGuestName = formatGuestDisplayName(guestNames, withFamily).slice(
    0,
    BLUEPRINT_LIMITS.DISPLAY_GUEST_NAME_MAX
  );
  const eventIds = Array.from(new Set(selectedEventIds.filter(Boolean))).slice(
    0,
    BLUEPRINT_LIMITS.EVENT_IDS_MAX_ITEMS
  );

  // Double-check against Firestore to guarantee we never overwrite an existing invitation
  const used = new Set(existingSlugs);
  let slug = generateUniqueSlug(guestNames, used, withFamily);
  let guard = 0;
  while (guard < 10) {
    const existingDoc = await getDoc(doc(db, 'invitations', slug));
    if (!existingDoc.exists()) break;
    used.add(slug);
    slug = generateUniqueSlug(guestNames, used, withFamily);
    guard += 1;
  }

  const path = `invitations/${slug}`;
  try {
    await setDoc(doc(db, 'invitations', slug), {
      slug,
      side,
      guestNames,
      withFamily,
      displayGuestName,
      eventIds,
      rsvp: null,
      createdBy: STUDIO_AUTHOR_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const now = Date.now();
    return {
      slug,
      side,
      guestNames,
      withFamily,
      displayGuestName,
      eventIds,
      rsvp: null,
      createdBy: STUDIO_AUTHOR_ID,
      createdAtMs: now,
      updatedAtMs: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Persists a nameless generic invitation in Firestore under a unique DB guestCode
 * so its link & WhatsApp share URL is cleanly /invite/<guestCode>
 * with no query parameters exposing event IDs or side.
 */
export async function createGenericInvitation(
  side: GuestSide,
  selectedEventIds: string[],
  existingSlugs: string[]
): Promise<InvitationRecord> {
  const eventIds = Array.from(new Set(selectedEventIds.filter(Boolean))).slice(
    0,
    BLUEPRINT_LIMITS.EVENT_IDS_MAX_ITEMS
  );

  const used = new Set(existingSlugs);
  let slug = generateUniqueSlug(['Our Dear Guest'], used, false);
  let guard = 0;
  while (guard < 10) {
    const existingDoc = await getDoc(doc(db, 'invitations', slug));
    if (!existingDoc.exists()) break;
    used.add(slug);
    slug = generateUniqueSlug(['Our Dear Guest'], used, false);
    guard += 1;
  }

  const path = `invitations/${slug}`;
  try {
    await setDoc(doc(db, 'invitations', slug), {
      slug,
      isGeneric: true,
      side,
      guestNames: ['Our Dear Guest'],
      withFamily: false,
      displayGuestName: 'Our Dear Guest',
      eventIds,
      rsvp: null,
      createdBy: STUDIO_AUTHOR_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const now = Date.now();
    return {
      slug,
      isGeneric: true,
      side,
      guestNames: ['Our Dear Guest'],
      withFamily: false,
      displayGuestName: 'Our Dear Guest',
      eventIds,
      rsvp: null,
      createdBy: STUDIO_AUTHOR_ID,
      createdAtMs: now,
      updatedAtMs: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInvitation(
  slug: string,
  side: GuestSide,
  rawGuestNames: string[],
  withFamily: boolean,
  selectedEventIds: string[]
): Promise<void> {
  const guestNames = normalizeGuestNames(rawGuestNames)
    .slice(0, BLUEPRINT_LIMITS.GUEST_NAMES_MAX_ITEMS)
    .map((n) => n.slice(0, BLUEPRINT_LIMITS.GUEST_NAME_MAX));

  const displayGuestName = formatGuestDisplayName(guestNames, withFamily).slice(
    0,
    BLUEPRINT_LIMITS.DISPLAY_GUEST_NAME_MAX
  );
  const eventIds = Array.from(new Set(selectedEventIds.filter(Boolean))).slice(
    0,
    BLUEPRINT_LIMITS.EVENT_IDS_MAX_ITEMS
  );

  const path = `invitations/${slug}`;
  try {
    await updateDoc(doc(db, 'invitations', slug), {
      side,
      guestNames,
      withFamily,
      displayGuestName,
      eventIds,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Records, updates, or clears per-event RSVP responses on an invitation document.
 * Strictly normalizes every event entry for Firestore isValidEventRsvpEntry rules.
 * When byEvent is empty (all events cleared), saves rsvp: null.
 */
export async function submitInvitationRsvp(
  slug: string,
  rawByEvent: Record<string, EventRsvpEntry>
): Promise<InvitationRsvp | null> {
  const sanitizedByEvent = normalizeRsvpByEvent(rawByEvent);
  const hasAnyResponse = Object.keys(sanitizedByEvent).length > 0;
  const rsvpPayload = hasAnyResponse
    ? {
        byEvent: sanitizedByEvent,
        respondedAt: serverTimestamp(),
      }
    : null;

  console.log(
    `[RSVP Submit] Normalized rsvp payload for invitations/${slug}:`,
    hasAnyResponse
      ? { byEvent: sanitizedByEvent, respondedAt: 'serverTimestamp()' }
      : null
  );

  const path = `invitations/${slug}`;
  try {
    await updateDoc(doc(db, 'invitations', slug), {
      rsvp: rsvpPayload,
      updatedAt: serverTimestamp(),
    });

    if (!hasAnyResponse) return null;

    return {
      byEvent: sanitizedByEvent,
      respondedAtMs: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInvitation(slug: string): Promise<void> {
  const path = `invitations/${slug}`;
  try {
    await deleteDoc(doc(db, 'invitations', slug));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetches a single invitation by its exact slug and resolves ONLY its invited fixed events.
 */
export async function fetchPublicInvitationWithEvents(slug: string): Promise<{
  invitation: InvitationRecord;
  events: WeddingEvent[];
} | null> {
  const invPath = `invitations/${slug}`;
  try {
    const invSnap = await getDoc(doc(db, 'invitations', slug));
    if (!invSnap.exists()) return null;

    const data = invSnap.data();
    const guestNames = Array.isArray(data.guestNames)
      ? data.guestNames.map((n: unknown) => String(n))
      : [];
    const withFamily = Boolean(data.withFamily);
    const side: GuestSide = data.side === 'groom' ? 'groom' : 'bride';
    const eventIds = Array.isArray(data.eventIds)
      ? data.eventIds.map((e: unknown) => String(e))
      : [];

    const invitation: InvitationRecord = {
      slug: String(data.slug ?? slug),
      isGeneric: Boolean(data.isGeneric),
      side,
      guestNames,
      withFamily,
      displayGuestName: String(
        data.displayGuestName ?? formatGuestDisplayName(guestNames, withFamily)
      ),
      eventIds,
      rsvp: parseFirestoreRsvp(data.rsvp),
      createdBy: String(data.createdBy ?? STUDIO_AUTHOR_ID),
      createdAtMs: toMillis(data.createdAt),
      updatedAtMs: toMillis(data.updatedAt),
    };

    const events = resolveInvitedEvents(eventIds);
    return { invitation, events };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, invPath);
  }
}
