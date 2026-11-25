import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, RotateCcw, Search } from 'lucide-react';
import { formatFirestoreUserMessage } from '../firebase';
import type {
  EventRsvpDraft,
  EventRsvpEntry,
  GuestSide,
  InvitationRecord,
  RsvpAlcoholPreference,
  RsvpAttendance,
  RsvpFoodPreference,
  WeddingEvent,
} from '../types';
import {
  buildInitialEventRsvpDrafts,
  eventSupportsAlcohol,
  filterAndSortInvitations,
  formatEventAlcoholLabel,
  formatEventAttendanceLabel,
  formatEventFoodLabel,
  formatEventHeadcountLabel,
  formatSideLabel,
  formatTimestamp,
  resolveInvitedEvents,
  RSVP_HEADCOUNT_MAX,
  RSVP_HEADCOUNT_MIN,
  validateAndNormalizePerEventRsvp,
} from '../utils/invitationLogic';

interface CheckRsvpModalProps {
  isOpen: boolean;
  invitations: InvitationRecord[];
  events: WeddingEvent[];
  onClose: () => void;
  onUpdateRsvp: (
    slug: string,
    byEvent: Record<string, EventRsvpEntry>
  ) => Promise<void>;
}

const EMPTY_DRAFT: EventRsvpDraft = {
  attending: '',
  headcount: '1',
  foodPreference: '',
  alcoholPreference: '',
};

export const CheckRsvpModal: React.FC<CheckRsvpModalProps> = ({
  isOpen,
  invitations,
  events,
  onClose,
  onUpdateRsvp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sideFilter, setSideFilter] = useState<'all' | GuestSide>('all');
  const [eventFilterId, setEventFilterId] = useState('all');

  // Inline host per-event RSVP editing state
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draftByEvent, setDraftByEvent] = useState<Record<string, EventRsvpDraft>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEditingSlug(null);
    setDraftByEvent({});
    setSaveError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingSlug) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, savingSlug, onClose]);

  const filteredInvitations = useMemo(
    () =>
      filterAndSortInvitations(invitations, searchQuery, eventFilterId, sideFilter),
    [invitations, searchQuery, eventFilterId, sideFilter]
  );

  const selectedEventTitle = useMemo(
    () => events.find((ev) => ev.id === eventFilterId)?.title ?? null,
    [events, eventFilterId]
  );

  if (!isOpen) return null;

  const hasActiveFilters =
    Boolean(searchQuery) || sideFilter !== 'all' || eventFilterId !== 'all';

  const startInlineEdit = (inv: InvitationRecord) => {
    setEditingSlug(inv.slug);
    setDraftByEvent(buildInitialEventRsvpDrafts(inv.eventIds, inv.rsvp));
    setSaveError(null);
  };

  const updateDraft = (
    eventId: string,
    updater: (cur: EventRsvpDraft) => EventRsvpDraft
  ) => {
    setDraftByEvent((prev) => ({
      ...prev,
      [eventId]: updater(prev[eventId] ?? { ...EMPTY_DRAFT }),
    }));
    setSaveError(null);
  };

  const handleToggleAttendance = (eventId: string, option: RsvpAttendance) => {
    updateDraft(eventId, (cur) => {
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
    updateDraft(eventId, (cur) => ({
      ...cur,
      foodPreference: cur.foodPreference === option ? '' : option,
    }));
  };

  const handleToggleAlcohol = (eventId: string, option: RsvpAlcoholPreference) => {
    updateDraft(eventId, (cur) => ({
      ...cur,
      alcoholPreference: cur.alcoholPreference === option ? '' : option,
    }));
  };

  const handleClearSingleEvent = (eventId: string) => {
    updateDraft(eventId, () => ({ ...EMPTY_DRAFT }));
  };

  const handleClearAllEvents = (invitedEvents: WeddingEvent[]) => {
    const cleared: Record<string, EventRsvpDraft> = {};
    for (const ev of invitedEvents) {
      cleared[ev.id] = { ...EMPTY_DRAFT };
    }
    setDraftByEvent(cleared);
    setSaveError(null);
  };

  const handleSaveInlineRsvp = async (inv: InvitationRecord) => {
    const validation = validateAndNormalizePerEventRsvp(
      inv.eventIds,
      draftByEvent,
      inv.withFamily
    );
    if (!validation.valid) {
      setSaveError(validation.errors[0]);
      return;
    }

    setSavingSlug(inv.slug);
    setSaveError(null);
    try {
      await onUpdateRsvp(inv.slug, validation.byEvent);
      setEditingSlug(null);
      setDraftByEvent({});
    } catch (err) {
      setSaveError(
        formatFirestoreUserMessage(err, 'Unable to save RSVP right now.')
      );
    } finally {
      setSavingSlug(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="check-rsvp-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231618]/65 p-4"
      onClick={() => {
        if (!savingSlug) onClose();
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#FFF9E2] border border-[#E6D194] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#4D0A14] text-[#FAF5EC] px-6 py-5 border-b border-[#DFBE7B]/25">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#DFBE7B]">
              Per-Event Guest Responses
            </p>
            <h2
              id="check-rsvp-title"
              className="mt-1 font-editorial text-3xl leading-tight font-medium text-[#FAF5EC]"
            >
              RSVP Overview
            </h2>
            <p className="mt-1 text-xs text-[#EAD29F]/85 tabular-nums">
              Showing {filteredInvitations.length} of {invitations.length} invitations
              {selectedEventTitle ? ` · Filtered to ${selectedEventTitle}` : ''}
            </p>
          </div>
        </div>

        {/* Search + Side Filter + Event Filter */}
        <div className="px-6 py-4 border-b border-[#E6D194] bg-[#FFF9E2] grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-5">
            <Search
              className="w-4 h-4 text-[#8E7679] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest name…"
              aria-label="Search RSVPs by guest name"
              className="w-full rounded-lg border border-[#E6D194] bg-[#FFFDF0] pl-9 pr-3 py-2 text-sm text-[#231618] placeholder:text-[#9A8588] focus:outline-none focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/15"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={sideFilter}
              onChange={(e) =>
                setSideFilter(e.target.value as 'all' | GuestSide)
              }
              aria-label="Filter RSVPs by bride side or groom side"
              className="w-full rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3 py-2 text-sm text-[#231618] focus:outline-none focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/15 cursor-pointer"
            >
              <option value="all">All sides</option>
              <option value="bride">Bride Side</option>
              <option value="groom">Groom Side</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <select
              value={eventFilterId}
              onChange={(e) => setEventFilterId(e.target.value)}
              aria-label="Filter RSVPs by wedding event"
              className="w-full rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3 py-2 text-sm text-[#231618] focus:outline-none focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/15 cursor-pointer"
            >
              <option value="all">All events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Invitation + Per-Event RSVP List */}
        <div
          data-testid="rsvp-overview-list"
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3 studio-scroll"
        >
          {filteredInvitations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DECDB6] py-12 px-6 text-center">
              <p className="font-editorial text-2xl text-[#4D0A14]">
                {invitations.length === 0
                  ? 'No invitations generated yet'
                  : 'No matching invitations'}
              </p>
              <p className="mt-1.5 text-xs text-[#7A6265] max-w-sm mx-auto">
                {invitations.length === 0
                  ? 'Generate invitations first to track guest RSVPs here.'
                  : 'Try clearing your search term or changing the side and event filters.'}
              </p>
              {invitations.length > 0 && hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSideFilter('all');
                    setEventFilterId('all');
                  }}
                  className="mt-4 px-3.5 py-1.5 rounded-lg border border-[#DECDB6] text-xs font-medium text-[#7F1924] hover:bg-[#FAF1E4] transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            filteredInvitations.map((inv) => {
              const invitedEvents = resolveInvitedEvents(inv.eventIds, events);
              const displayedEvents =
                eventFilterId === 'all'
                  ? invitedEvents
                  : invitedEvents.filter((ev) => ev.id === eventFilterId);
              const isEditing = editingSlug === inv.slug;

              return (
                <div
                  key={inv.slug}
                  data-testid="rsvp-row"
                  className="rounded-xl border border-[#E6D194] bg-[#FFFDF0] overflow-hidden"
                >
                  {/* Guest Header */}
                  <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#FFF9E2] border-b border-[#E6D194]/60">
                    <div className="min-w-0">
                      <p className="font-editorial text-2xl font-medium text-[#231618] leading-snug">
                        {inv.displayGuestName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7A6265]">
                        <span className="font-semibold text-[#4D0A14]">
                          {formatSideLabel(inv.side)}
                        </span>
                        {' · '}
                        <span className="tabular-nums">
                          {invitedEvents.length}{' '}
                          {invitedEvents.length === 1 ? 'event' : 'events'}
                        </span>
                        {inv.rsvp?.respondedAtMs ? (
                          <span className="tabular-nums">
                            {' · '}Updated {formatTimestamp(inv.rsvp.respondedAtMs)}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        isEditing ? setEditingSlug(null) : startInlineEdit(inv)
                      }
                      aria-label={`Update RSVP for ${inv.displayGuestName}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6D194] bg-[#FFF9E2] px-3 py-1.5 text-xs font-medium text-[#4C373A] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] hover:text-[#4D0A14] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      {isEditing ? 'Close' : 'Update RSVP'}
                    </button>
                  </div>

                  {/* Per-Event RSVP Table (Applicable Events Only) */}
                  {!isEditing && (
                    <div className="divide-y divide-[#F4EBDD]">
                      {displayedEvents.map((ev) => {
                        const entry = inv.rsvp?.byEvent?.[ev.id];
                        const supportsAlcohol = eventSupportsAlcohol(ev.id);
                        const statusLabel = formatEventAttendanceLabel(entry);
                        const headcountLabel = formatEventHeadcountLabel(
                          entry,
                          inv.withFamily
                        );
                        const foodLabel = formatEventFoodLabel(entry);
                        const alcoholLabel = supportsAlcohol
                          ? formatEventAlcoholLabel(entry, ev.id)
                          : '';

                        const statusColorClass = !entry
                          ? 'text-[#6B5457]'
                          : entry.attending === 'coming'
                            ? 'text-[#1E5E3E] font-semibold'
                            : 'text-[#9E2A2B] font-semibold';

                        return (
                          <div
                            key={ev.id}
                            data-testid={`rsvp-event-row-${ev.id}`}
                            className="px-4 py-2.5 grid grid-cols-2 sm:grid-cols-12 items-center gap-2 text-xs"
                          >
                            <div className="col-span-2 sm:col-span-4 font-semibold text-[#4D0A14]">
                              {ev.title}
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[10px] uppercase tracking-wider text-[#8E7679] block sm:hidden">
                                RSVP
                              </span>
                              <span className={statusColorClass}>{statusLabel}</span>
                            </div>
                            <div className="sm:col-span-2 tabular-nums">
                              <span className="text-[10px] uppercase tracking-wider text-[#8E7679] block sm:hidden">
                                Headcount
                              </span>
                              <span className="text-[#7A6265] hidden sm:inline">
                                Guests:{' '}
                              </span>
                              <span className="font-medium text-[#231618]">
                                {headcountLabel}
                              </span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[10px] uppercase tracking-wider text-[#8E7679] block sm:hidden">
                                Food
                              </span>
                              <span className="font-medium text-[#231618]">
                                {foodLabel}
                              </span>
                            </div>
                            <div
                              className={`sm:col-span-2 sm:text-right ${
                                supportsAlcohol ? '' : 'hidden sm:block'
                              }`}
                            >
                              {supportsAlcohol && (
                                <>
                                  <span className="text-[10px] uppercase tracking-wider text-[#8E7679] block sm:hidden">
                                    Drinks
                                  </span>
                                  <span className="font-medium text-[#231618]">
                                    {alcoholLabel}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Host Per-Event RSVP Editor (Applicable Events Only, Clearable Radios) */}
                  {isEditing && (
                    <div
                      data-testid="rsvp-inline-editor"
                      className="p-4 space-y-3 bg-[#FFF9E2]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-[#7A6265]">
                          Click any selected radio option again to clear it.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleClearAllEvents(invitedEvents)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#E6D194] bg-[#FFFDF0] px-2.5 py-1 text-[11px] font-medium text-[#7F1924] hover:bg-[#F9E8AE] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          Clear all
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {invitedEvents.map((ev) => {
                          const draft = draftByEvent[ev.id] ?? EMPTY_DRAFT;
                          const supportsAlcohol = eventSupportsAlcohol(ev.id);
                          const hasAnyValue =
                            draft.attending !== '' ||
                            draft.foodPreference !== '' ||
                            (supportsAlcohol && draft.alcoholPreference !== '');

                          return (
                            <div
                              key={ev.id}
                              data-testid={`rsvp-edit-event-${ev.id}`}
                              className="rounded-lg border border-[#E6D194] bg-[#FFFDF0] p-3 space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-[#4D0A14]">
                                  {ev.title}
                                </p>
                                {hasAnyValue && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearSingleEvent(ev.id)}
                                    aria-label={`Clear ${ev.title} RSVP`}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7F1924] hover:underline cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                    Clear
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                                {/* Attendance */}
                                <fieldset className="md:col-span-4">
                                  <legend className="text-[11px] font-semibold text-[#4C373A] mb-1">
                                    Attendance
                                  </legend>
                                  <div className="flex gap-1.5">
                                    {(['coming', 'not_coming'] as const).map((opt) => (
                                      <label
                                        key={opt}
                                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium cursor-pointer select-none ${
                                          draft.attending === opt
                                            ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                                            : 'border-[#E6D194] bg-[#FFF9E2] text-[#4C373A]'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`rsvp-attending-${inv.slug}-${ev.id}`}
                                          value={opt}
                                          checked={draft.attending === opt}
                                          onChange={() => {}}
                                          onClick={() =>
                                            handleToggleAttendance(ev.id, opt)
                                          }
                                          className="accent-[#9E2A2B]"
                                        />
                                        <span>
                                          {opt === 'coming' ? 'Coming' : 'Not Coming'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </fieldset>

                                {/* Conditional Headcount (& family only) + Food + Mehendi-only Drinks */}
                                {draft.attending === 'coming' && (
                                  <>
                                    {inv.withFamily && (
                                      <div className="md:col-span-2">
                                        <label
                                          htmlFor={`edit-headcount-${inv.slug}-${ev.id}`}
                                          className="block text-[11px] font-semibold text-[#4C373A] mb-1"
                                        >
                                          Headcount
                                        </label>
                                        <input
                                          id={`edit-headcount-${inv.slug}-${ev.id}`}
                                          type="number"
                                          inputMode="numeric"
                                          min={RSVP_HEADCOUNT_MIN}
                                          max={RSVP_HEADCOUNT_MAX}
                                          step={1}
                                          value={draft.headcount}
                                          onChange={(e) =>
                                            updateDraft(ev.id, (cur) => ({
                                              ...cur,
                                              headcount: e.target.value,
                                            }))
                                          }
                                          className="w-full rounded-lg border border-[#E6D194] bg-[#FFF9E2] px-2.5 py-1.5 text-xs text-[#231618] tabular-nums focus:outline-none focus:border-[#9E2A2B]"
                                        />
                                      </div>
                                    )}

                                    <fieldset
                                      className={
                                        supportsAlcohol
                                          ? 'md:col-span-3'
                                          : 'md:col-span-4'
                                      }
                                    >
                                      <legend className="text-[11px] font-semibold text-[#4C373A] mb-1">
                                        Food
                                      </legend>
                                      <div className="flex gap-1.5">
                                        {(['veg', 'non_veg'] as const).map((opt) => (
                                          <label
                                            key={opt}
                                            className={`flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium cursor-pointer select-none ${
                                              draft.foodPreference === opt
                                                ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                                                : 'border-[#E6D194] bg-[#FFF9E2] text-[#4C373A]'
                                            }`}
                                          >
                                            <input
                                              type="radio"
                                              name={`rsvp-food-${inv.slug}-${ev.id}`}
                                              value={opt}
                                              checked={draft.foodPreference === opt}
                                              onChange={() => {}}
                                              onClick={() => handleToggleFood(ev.id, opt)}
                                              className="accent-[#9E2A2B]"
                                            />
                                            <span>{opt === 'veg' ? 'Veg' : 'Non-Veg'}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </fieldset>

                                    {supportsAlcohol && (
                                      <fieldset className="md:col-span-3">
                                        <legend className="text-[11px] font-semibold text-[#4C373A] mb-1">
                                          Drinks
                                        </legend>
                                        <div className="flex gap-1.5">
                                          {(['alcohol', 'no_alcohol'] as const).map(
                                            (opt) => (
                                              <label
                                                key={opt}
                                                className={`flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium cursor-pointer select-none ${
                                                  draft.alcoholPreference === opt
                                                    ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                                                    : 'border-[#E6D194] bg-[#FFF9E2] text-[#4C373A]'
                                                }`}
                                              >
                                                <input
                                                  type="radio"
                                                  name={`rsvp-alcohol-${inv.slug}-${ev.id}`}
                                                  value={opt}
                                                  checked={draft.alcoholPreference === opt}
                                                  onChange={() => {}}
                                                  onClick={() =>
                                                    handleToggleAlcohol(ev.id, opt)
                                                  }
                                                  className="accent-[#9E2A2B]"
                                                />
                                                <span>
                                                  {opt === 'alcohol'
                                                    ? 'Alcohol'
                                                    : 'No Alcohol'}
                                                </span>
                                              </label>
                                            )
                                          )}
                                        </div>
                                      </fieldset>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {saveError && (
                        <p role="alert" className="text-xs font-medium text-[#9E2A2B]">
                          {saveError}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSlug(null);
                            setDraftByEvent({});
                          }}
                          disabled={savingSlug === inv.slug}
                          className="px-3 py-1.5 rounded-lg border border-[#E6D194] text-xs font-medium text-[#4C373A] hover:bg-[#F9E8AE] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineRsvp(inv)}
                          disabled={savingSlug === inv.slug}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#A13030] text-xs font-semibold text-[#FAF5EC] hover:bg-[#842222] disabled:opacity-60 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          {savingSlug === inv.slug ? 'Saving…' : 'Save RSVP'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {/* Footer Action */}
        <div className="px-6 py-3.5 bg-[#FDF3D0] border-t border-[#E6D194] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(savingSlug)}
            data-testid="check-rsvp-modal-close"
            className="min-h-[40px] rounded-lg bg-[#4D0A14] px-5 py-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#FAF5EC] hover:bg-[#63111D] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
