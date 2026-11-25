import React, { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import type { GuestSide, InvitationRecord, WeddingEvent } from '../types';
import {
  buildBrandedDisplayPath,
  formatGuestDisplayName,
  normalizeGuestNames,
  validateInvitationDraft,
} from '../utils/invitationLogic';

interface EditInvitationModalProps {
  invitation: InvitationRecord | null;
  events: WeddingEvent[];
  saving: boolean;
  onDiscard: () => void;
  onSave: (
    slug: string,
    side: GuestSide,
    guestNames: string[],
    withFamily: boolean,
    eventIds: string[]
  ) => Promise<void>;
}

export const EditInvitationModal: React.FC<EditInvitationModalProps> = ({
  invitation,
  events,
  saving,
  onDiscard,
  onSave,
}) => {
  const [side, setSide] = useState<GuestSide>('bride');
  const [guestNames, setGuestNames] = useState<string[]>(['']);
  const [withFamily, setWithFamily] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!invitation) return;
    setSide(invitation.side);
    setGuestNames(
      invitation.guestNames.length > 0
        ? [...invitation.guestNames]
        : [invitation.displayGuestName]
    );
    setWithFamily(invitation.withFamily);
    setSelectedEventIds([...invitation.eventIds]);
    setValidationErrors([]);
  }, [invitation]);

  useEffect(() => {
    if (!invitation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onDiscard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invitation, saving, onDiscard]);

  if (!invitation) return null;

  const allSelected =
    events.length > 0 && events.every((ev) => selectedEventIds.includes(ev.id));
  const formattedPreview = formatGuestDisplayName(guestNames, withFamily);

  const handleGuestNameChange = (index: number, value: string) => {
    setGuestNames((prev) => prev.map((n, i) => (i === index ? value : n)));
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleAddGuestName = () => {
    setGuestNames((prev) => (prev.length < 20 ? [...prev, ''] : prev));
  };

  const handleRemoveGuestName = (index: number) => {
    setGuestNames((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  };

  const handleToggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleToggleSelectAll = () => {
    setSelectedEventIds(allSelected ? [] : events.map((ev) => ev.id));
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const cleanNames = normalizeGuestNames(guestNames);
    const validEventIds = selectedEventIds.filter((id) =>
      events.some((ev) => ev.id === id)
    );

    try {
      await onSave(invitation.slug, side, cleanNames, withFamily, validEventIds);
    } catch (err) {
      setValidationErrors([
        err instanceof Error ? err.message : 'Unable to save invitation changes.',
      ]);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-invitation-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231618]/65 p-4"
      onClick={() => {
        if (!saving) onDiscard();
      }}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FFF9E2] border border-[#E6D194] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-[#FFF9E2] px-6 pt-6 pb-4 border-b border-[#E6D194]">
          <div>
            <h2
              id="edit-invitation-title"
              className="font-editorial text-3xl leading-tight font-medium text-[#231618]"
            >
              Edit invitation
            </h2>
            <p className="mt-1 text-xs text-[#6B5457]">
              Update guest side, names, or celebrations. The permanent URL and QR code stay unchanged.
            </p>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            aria-label="Close edit dialog"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#E6D194] text-[#6B5457] hover:text-[#4D0A14] hover:border-[#9E2A2B]/40 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          {/* Preserved Permanent Link Notice */}
          <div className="rounded-xl bg-[#F9E8AE]/65 border border-[#DFBE7B]/60 px-3.5 py-2.5 text-xs text-[#4D0A14]">
            <span className="font-medium">Permanent link preserved:</span>{' '}
            <span className="font-mono text-[#7F1924] break-all">
              {buildBrandedDisplayPath(invitation.slug)}
            </span>
          </div>

          {/* 1. Bride Side / Groom Side */}
          <fieldset>
            <legend className="block text-sm font-semibold text-[#231618] mb-2">
              Guest side
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                  side === 'bride'
                    ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                    : 'border-[#E6D194] bg-[#FFFDF0] text-[#4C373A] hover:border-[#C89D54]'
                }`}
              >
                <input
                  type="radio"
                  name="editGuestSide"
                  value="bride"
                  checked={side === 'bride'}
                  onChange={() => setSide('bride')}
                  className="h-4 w-4 accent-[#9E2A2B] cursor-pointer shrink-0"
                />
                <span className="text-sm font-medium whitespace-nowrap">Bride Side</span>
              </label>

              <label
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors cursor-pointer select-none ${
                  side === 'groom'
                    ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                    : 'border-[#E6D194] bg-[#FFFDF0] text-[#4C373A] hover:border-[#C89D54]'
                }`}
              >
                <input
                  type="radio"
                  name="editGuestSide"
                  value="groom"
                  checked={side === 'groom'}
                  onChange={() => setSide('groom')}
                  className="h-4 w-4 accent-[#9E2A2B] cursor-pointer shrink-0"
                />
                <span className="text-sm font-medium whitespace-nowrap">Groom Side</span>
              </label>
            </div>
          </fieldset>

          {/* 2. Guest Names + Add another name + With family */}
          <div>
            <label
              htmlFor="edit-guest-name-0"
              className="block text-sm font-semibold text-[#231618] mb-2"
            >
              Guest names
            </label>
            <div className="space-y-2">
              {guestNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    id={`edit-guest-name-${idx}`}
                    type="text"
                    value={name}
                    onChange={(e) => handleGuestNameChange(idx, e.target.value)}
                    placeholder={
                      idx === 0 ? 'e.g. Mr. & Mrs. Sourav Sen' : 'e.g. Priya Sen'
                    }
                    maxLength={120}
                    aria-label={`Edit guest name ${idx + 1}`}
                    className="w-full rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3.5 py-2 text-sm text-[#231618] placeholder:text-[#9A8588] focus:outline-none focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/15 transition-colors"
                  />
                  {guestNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGuestName(idx)}
                      aria-label={`Remove edit guest name ${idx + 1}`}
                      className="p-2 rounded-lg border border-[#E6D194] text-[#7A6265] hover:text-[#9E2A2B] hover:border-[#9E2A2B]/40 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAddGuestName}
                disabled={guestNames.length >= 20}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3 py-1.5 text-xs font-medium text-[#231618] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#7F1924]" aria-hidden="true" />
                Add another name
              </button>

              <label className="inline-flex items-center gap-2 rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3 py-1.5 text-xs font-medium text-[#231618] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] transition-colors cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={withFamily}
                  onChange={(e) => setWithFamily(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#CBB79C] accent-[#9E2A2B] cursor-pointer"
                />
                <span>With family</span>
              </label>
            </div>

            {formattedPreview && (
              <p className="mt-2 text-xs text-[#7A6265] truncate">
                Displays as:{' '}
                <span className="font-medium text-[#4D0A14]">{formattedPreview}</span>
              </p>
            )}
          </div>

          {/* 3. Fixed Wedding Events */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-sm font-semibold text-[#231618]">Invited to</span>
              <span className="text-xs text-[#7A6265] tabular-nums">
                {selectedEventIds.length} of {events.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {events.map((event) => {
                const checked = selectedEventIds.includes(event.id);
                return (
                  <label
                    key={event.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 min-w-0 transition-colors cursor-pointer select-none ${
                      checked
                        ? 'border-[#9E2A2B] bg-[#F9E8AE]'
                        : 'border-[#E6D194] bg-[#FFFDF0] hover:border-[#C89D54]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleEvent(event.id)}
                      className="h-4 w-4 rounded border-[#CBB79C] accent-[#9E2A2B] focus:ring-[#9E2A2B] cursor-pointer shrink-0"
                    />
                    <span className="font-editorial text-[16.5px] leading-snug font-medium text-[#231618] whitespace-nowrap truncate">
                      {event.title}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-2.5">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-xs font-medium text-[#9E2A2B] hover:text-[#4D0A14] transition-colors cursor-pointer"
              >
                {allSelected ? 'Clear selection' : 'Select all'}
              </button>
            </div>
          </div>

          {/* Validation Feedback */}
          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="rounded-xl border border-[#9E2A2B]/35 bg-[#9E2A2B]/8 px-4 py-2.5 space-y-1"
            >
              {validationErrors.map((err, i) => (
                <p key={i} className="text-xs font-medium text-[#7F1924]">
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Save & Discard Footer */}
          <div className="pt-3 border-t border-[#E6D194] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-[#E6D194] bg-[#FFFDF0] text-xs font-medium text-[#4C373A] hover:bg-[#F9E8AE] disabled:opacity-60 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#A13030] text-xs font-semibold text-[#FAF5EC] hover:bg-[#842222] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
