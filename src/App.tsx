import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, ExternalLink } from 'lucide-react';
import { AlpanaMandala } from './components/AlpanaOrnaments';
import { CheckRsvpModal } from './components/CheckRsvpModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { EditInvitationModal } from './components/EditInvitationModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeaturedReadyCard } from './components/FeaturedReadyCard';
import { GuestInviteView } from './components/GuestInviteView';
import {
  InvitationForm,
  type GenericInvitationResult,
} from './components/InvitationForm';
import { InvitationListPanel } from './components/InvitationListPanel';
import { StudioFloatingSparkles } from './components/StudioFloatingSparkles';
import { formatFirestoreUserMessage } from './firebase';
import {
  createGenericInvitation,
  createInvitation,
  deleteInvitation,
  submitInvitationRsvp,
  subscribeInvitations,
  updateInvitation,
} from './services/studioStore';
import type {
  EventRsvpEntry,
  GuestSide,
  InvitationRecord,
} from './types';
import {
  buildInvitationUrl,
  filterAndSortInvitations,
  formatGuestDisplayName,
  getCanonicalStudioTargetUrl,
  normalizeGuestNames,
  parseInviteSlugFromPath,
  STUDIO_PATH,
  STUDIO_DISPLAY_PATH,
  validateGenericInvitationDraft,
  validateInvitationDraft,
  WEDDING_EVENTS,
} from './utils/invitationLogic';
import { ALL_WEDDING_EVENT_DETAILS } from './data/weddingEventDetails';
import {
  collectInviteVideoUrls,
  eventVideoCache,
} from './utils/eventVideoCache';
import { parseSideQueryParam } from './utils/invitePresentation';

interface StudioDashboardProps {
  onPreviewInvite: (urlOrPath: string) => void;
}

function StudioDashboard({ onPreviewInvite }: StudioDashboardProps) {
  // Live Firestore Invitations
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // New Invitation Generator Form State
  const [side, setSide] = useState<GuestSide>(() => {
    if (typeof window === 'undefined') return 'bride';
    const parsed = parseSideQueryParam(window.location.search);
    return parsed === 'groom' ? 'groom' : 'bride';
  });
  const [isGeneric, setIsGeneric] = useState(false);
  const [guestNames, setGuestNames] = useState<string[]>(['']);
  const [withFamily, setWithFamily] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genericResult, setGenericResult] =
    useState<GenericInvitationResult | null>(null);

  // Right-side Management Panel State
  // Only set right after generating a new invitation (never on reload)
  const [newlyGeneratedInvitation, setNewlyGeneratedInvitation] =
    useState<InvitationRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilterId, setEventFilterId] = useState('all');
  const [sideFilter, setSideFilter] = useState<'all' | GuestSide>('all');

  // Edit Dialog, Check RSVP Modal, Delete Confirmation & Toast
  const [editTarget, setEditTarget] = useState<InvitationRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [checkRsvpOpen, setCheckRsvpOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvitationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Live Firestore subscription on mount (no authentication required)
  useEffect(() => {
    const unsubscribe = subscribeInvitations(
      (nextInvites) => {
        setInvitations(nextInvites);
        setLoadingData(false);
      },
      (err) => setRuntimeError(err)
    );
    return unsubscribe;
  }, []);

  // Gently warm all celebration videos into the shared RAM Blob cache while in Studio
  // so clicking "Preview invitation" after creating a new invite renders videos in 0ms.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      eventVideoCache.preload(
        collectInviteVideoUrls(ALL_WEDDING_EVENT_DETAILS),
        { concurrency: 2 }
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  if (runtimeError) {
    throw runtimeError;
  }

  const filteredInvitations = useMemo(
    () =>
      filterAndSortInvitations(
        invitations,
        searchQuery,
        eventFilterId,
        sideFilter
      ),
    [invitations, searchQuery, eventFilterId, sideFilter]
  );

  // Only show the Invitation Ready card right after an invitation is newly generated
  const featuredInvitation = useMemo(() => {
    if (!newlyGeneratedInvitation) return null;
    return (
      invitations.find((i) => i.slug === newlyGeneratedInvitation.slug) ??
      newlyGeneratedInvitation
    );
  }, [invitations, newlyGeneratedInvitation]);

  // Form Handlers
  const handleGuestNameChange = (index: number, value: string) => {
    setGuestNames((prev) => prev.map((n, i) => (i === index ? value : n)));
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleAddGuestName = () => {
    setGuestNames((prev) => (prev.length < 20 ? [...prev, ''] : prev));
  };

  const handleRemoveGuestName = (index: number) => {
    setGuestNames((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleToggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleToggleSelectAll = () => {
    const allSelected = WEDDING_EVENTS.every((ev) => selectedEventIds.includes(ev.id));
    setSelectedEventIds(allSelected ? [] : WEDDING_EVENTS.map((ev) => ev.id));
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const resetForm = () => {
    setSide('bride');
    setGuestNames(['']);
    setWithFamily(false);
    setSelectedEventIds([]);
    setValidationErrors([]);
  };

  const handleGenericChange = (checked: boolean) => {
    setIsGeneric(checked);
    setValidationErrors([]);
    if (!checked) {
      setGenericResult(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isGeneric) {
      const validation = validateGenericInvitationDraft(side, selectedEventIds);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }
      setValidationErrors([]);
      setIsSubmitting(true);
      try {
        const validEventIds = selectedEventIds.filter((id) =>
          WEDDING_EVENTS.some((ev) => ev.id === id)
        );
        const created = await createGenericInvitation(
          side,
          validEventIds,
          invitations.map((i) => i.slug)
        );
        const genericUrl = buildInvitationUrl(created.slug);
        setGenericResult({
          slug: created.slug,
          url: genericUrl,
          side: created.side,
          eventIds: created.eventIds,
        });
        showToast('Generic invitation link and QR generated');
      } catch (err) {
        setValidationErrors([
          formatFirestoreUserMessage(err, 'Unable to generate generic invitation.'),
        ]);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const validation = validateInvitationDraft(
      side,
      guestNames,
      withFamily,
      selectedEventIds
    );
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    setGenericResult(null);
    setIsSubmitting(true);
    try {
      const cleanNames = normalizeGuestNames(guestNames);
      const displayGuestName = formatGuestDisplayName(cleanNames, withFamily);
      const validEventIds = selectedEventIds.filter((id) =>
        WEDDING_EVENTS.some((ev) => ev.id === id)
      );

      const created = await createInvitation(
        side,
        cleanNames,
        withFamily,
        validEventIds,
        invitations.map((i) => i.slug)
      );
      setNewlyGeneratedInvitation(created);
      showToast(`Invitation generated for ${displayGuestName}`);
      resetForm();
    } catch (err) {
      setValidationErrors([
        formatFirestoreUserMessage(err, 'Unable to save invitation.'),
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (inv: InvitationRecord) => {
    setEditTarget(inv);
  };

  const handleSaveEdit = async (
    slug: string,
    nextSide: GuestSide,
    cleanNames: string[],
    nextWithFamily: boolean,
    validEventIds: string[]
  ) => {
    setSavingEdit(true);
    try {
      await updateInvitation(
        slug,
        nextSide,
        cleanNames,
        nextWithFamily,
        validEventIds
      );
      const displayGuestName = formatGuestDisplayName(cleanNames, nextWithFamily);
      setEditTarget(null);
      showToast(`Updated invitation for ${displayGuestName} (URL unchanged)`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleUpdateRsvp = async (
    slug: string,
    byEvent: Record<string, EventRsvpEntry>
  ) => {
    await submitInvitationRsvp(slug, byEvent);
    showToast(
      Object.keys(byEvent).length > 0 ? 'RSVP updated' : 'RSVP cleared'
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const slugToRemove = deleteTarget.slug;
      const guestLabel = deleteTarget.displayGuestName;
      await deleteInvitation(slugToRemove);
      if (editTarget?.slug === slugToRemove) {
        setEditTarget(null);
      }
      if (newlyGeneratedInvitation?.slug === slugToRemove) {
        setNewlyGeneratedInvitation(null);
      }
      setDeleteTarget(null);
      showToast(`Deleted invitation for ${guestLabel}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FDF3D0] text-[#231618] flex flex-col overflow-x-clip">
      {/* Live Animated Pastel-Yellow Ambient Background (shared with main website) */}
      <StudioFloatingSparkles />

      {/* Royal Bengali Maroon Header Banner with Live Rotating Chakras & Subtle Gold Shimmer */}
      <header className="relative z-10 overflow-hidden bg-[#4D0A14] text-[#FAF5EC] border-b border-[#DFBE7B]/30">
        <AlpanaMandala className="pointer-events-none absolute -left-24 -bottom-24 w-72 h-72 text-[#DFBE7B]/20 animate-chakra-cw" />
        <AlpanaMandala className="pointer-events-none absolute -right-16 -top-24 w-80 h-80 text-[#DFBE7B]/22 animate-chakra-ccw" />
        <AlpanaMandala className="pointer-events-none absolute right-56 -bottom-32 w-48 h-48 text-[#DFBE7B]/10 animate-chakra-slow" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
        >
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#EAD29F]/80 to-transparent animate-gold-shimmer" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-9 sm:py-11 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <p className="text-[11px] font-medium tracking-[0.26em] uppercase text-[#DFBE7B]">
                Medha &amp; Saptarshi
              </p>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-[#DFBE7B]/35 bg-[#3A070E]/70 text-[#EAD29F]/90 select-all">
                {STUDIO_DISPLAY_PATH}
              </span>
            </div>
            <h1 className="font-editorial text-4xl sm:text-[52px] leading-[1.06] font-medium tracking-tight text-[#FAF5EC]">
              Invitation{' '}
              <span className="italic font-normal text-[#DFBE7B]">Studio</span>
            </h1>
            <p className="mt-3 text-sm sm:text-[15px] text-[#EAD29F]/85 leading-relaxed">
              Create a personal invitation page for each guest of Medha &amp; Saptarshi’s wedding.
              Every page is identical in design — only the names and the celebrations you choose change.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2.5">
            <a
              href="/invite/reference"
              onClick={(e) => {
                e.preventDefault();
                onPreviewInvite('/invite/reference');
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DFBE7B]/50 bg-[#3A070E]/60 px-4 py-2.5 text-sm font-medium text-[#FAF5EC] hover:bg-[#63111D] transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4 text-[#DFBE7B]" aria-hidden="true" />
              Preview Full Invite
            </a>
            <button
              type="button"
              onClick={() => setCheckRsvpOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#DFBE7B] px-4 py-2.5 text-sm font-semibold text-[#3A070E] hover:bg-[#EAD29F] transition-colors cursor-pointer whitespace-nowrap shadow-sm"
            >
              <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
              Check RSVP
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Studio Workspace */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-10 animate-studio-enter">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column: New Invitation Generator Form */}
          <div className="lg:col-span-5 lg:sticky lg:top-6">
            <InvitationForm
              side={side}
              isGeneric={isGeneric}
              guestNames={guestNames}
              withFamily={withFamily}
              selectedEventIds={selectedEventIds}
              events={WEDDING_EVENTS}
              validationErrors={validationErrors}
              isSubmitting={isSubmitting}
              genericResult={genericResult}
              onSideChange={setSide}
              onGenericChange={handleGenericChange}
              onGuestNameChange={handleGuestNameChange}
              onAddGuestName={handleAddGuestName}
              onRemoveGuestName={handleRemoveGuestName}
              onWithFamilyChange={setWithFamily}
              onToggleEvent={handleToggleEvent}
              onToggleSelectAll={handleToggleSelectAll}
              onSubmit={handleFormSubmit}
              onPreviewInvite={onPreviewInvite}
              onNotify={showToast}
            />
          </div>

          {/* Right Column: Newly Generated Invitation Ready Card (only right after generating) + Generated Invitations */}
          <div className="lg:col-span-7 space-y-6">
            {featuredInvitation && (
              <FeaturedReadyCard
                invitation={featuredInvitation}
                events={WEDDING_EVENTS}
                onPreviewInvite={onPreviewInvite}
                onNotify={showToast}
              />
            )}

            <InvitationListPanel
              invitations={filteredInvitations}
              totalCount={invitations.length}
              events={WEDDING_EVENTS}
              searchQuery={searchQuery}
              eventFilterId={eventFilterId}
              sideFilter={sideFilter}
              selectedSlug={featuredInvitation?.slug ?? null}
              editingSlug={editTarget?.slug ?? null}
              loading={loadingData}
              onSearchChange={setSearchQuery}
              onEventFilterChange={setEventFilterId}
              onSideFilterChange={setSideFilter}
              onEdit={handleStartEdit}
              onRequestDelete={(inv) => setDeleteTarget(inv)}
              onPreviewInvite={onPreviewInvite}
              onNotify={showToast}
            />
          </div>
        </div>
      </main>

      {/* Edit Invitation Dialog */}
      <EditInvitationModal
        invitation={editTarget}
        events={WEDDING_EVENTS}
        saving={savingEdit}
        onDiscard={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      {/* Check RSVP Overview Modal */}
      <CheckRsvpModal
        isOpen={checkRsvpOpen}
        invitations={invitations}
        events={WEDDING_EVENTS}
        onClose={() => setCheckRsvpOpen(false)}
        onUpdateRsvp={handleUpdateRsvp}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        invitation={deleteTarget}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Quiet Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-xl bg-[#3A070E] text-[#FAF5EC] border border-[#DFBE7B]/40 px-4 py-3 text-xs font-medium shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-[#DFBE7B] shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function readCurrentLocation(): { pathname: string; search: string } {
  if (typeof window === 'undefined') return { pathname: STUDIO_PATH, search: '' };
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

export default function App() {
  const [route, setRoute] = useState(readCurrentLocation);
  const [openedFromStudio, setOpenedFromStudio] = useState(false);

  useEffect(() => {
    const syncStudioCanonicalUrl = () => {
      const targetUrl = getCanonicalStudioTargetUrl(
        window.location.pathname,
        window.location.hash,
        window.location.search
      );
      if (targetUrl) {
        try {
          window.history.replaceState({ studio: true }, '', targetUrl);
        } catch {
          // Ignore history API restrictions in sandboxed iframes
        }
        setRoute({ pathname: STUDIO_PATH, search: window.location.search });
        return true;
      }
      return false;
    };

    const handlePopState = () => {
      if (!syncStudioCanonicalUrl()) {
        setRoute(readCurrentLocation());
      }
    };

    const handleHashChange = () => {
      if (parseInviteSlugFromPath(window.location.pathname) === null) {
        syncStudioCanonicalUrl();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const inviteSlug = useMemo(
    () => parseInviteSlugFromPath(route.pathname),
    [route.pathname]
  );

  // When viewing studio, ensure browser address bar is canonical /studio (never /#us-through-the-years)
  useEffect(() => {
    if (!inviteSlug && typeof window !== 'undefined') {
      const targetUrl = getCanonicalStudioTargetUrl(
        window.location.pathname,
        window.location.hash,
        window.location.search
      );
      if (targetUrl) {
        try {
          window.history.replaceState({ studio: true }, '', targetUrl);
        } catch {
          // Ignore history API restrictions in sandboxed iframes
        }
        setRoute((prev) =>
          prev.pathname === STUDIO_PATH && prev.search === window.location.search
            ? prev
            : { pathname: STUDIO_PATH, search: window.location.search }
        );
      }
    }
  }, [inviteSlug]);

  const handlePreviewInvite = (urlOrPath: string) => {
    let nextPathname = urlOrPath;
    let nextSearch = '';
    try {
      const parsed = new URL(urlOrPath, window.location.origin);
      nextPathname = parsed.pathname;
      nextSearch = parsed.search;
    } catch {
      const [pathPart, searchPart] = urlOrPath.split('?');
      nextPathname = pathPart || STUDIO_PATH;
      nextSearch = searchPart ? `?${searchPart}` : '';
    }

    try {
      window.history.pushState(
        { fromStudio: true },
        '',
        `${nextPathname}${nextSearch}`
      );
    } catch {
      // Fall back to pure state routing if iframe restricts history API
    }

    setOpenedFromStudio(true);
    setRoute({ pathname: nextPathname, search: nextSearch });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleReturnToStudio = () => {
    try {
      window.history.pushState({ studio: true }, '', STUDIO_PATH);
    } catch {
      // Ignore history restrictions in sandboxed iframes
    }
    setOpenedFromStudio(false);
    setRoute({ pathname: STUDIO_PATH, search: '' });
    document.title = 'Medha Weds Saptarshi — Wedding Invitation Studio';
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const showBackToStudio =
    openedFromStudio ||
    inviteSlug === 'reference' ||
    inviteSlug === 'preview-all';

  return (
    <ErrorBoundary>
      {inviteSlug ? (
        <GuestInviteView
          key={inviteSlug}
          slug={inviteSlug}
          searchOverride={route.search}
          onBackToStudio={showBackToStudio ? handleReturnToStudio : undefined}
        />
      ) : (
        <StudioDashboard onPreviewInvite={handlePreviewInvite} />
      )}
    </ErrorBoundary>
  );
}
