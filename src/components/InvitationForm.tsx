import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import type { GuestSide, WeddingEvent } from '../types';
import {
  buildGenericWhatsAppMessage,
  buildGenericWhatsAppShareUrl,
  formatGuestDisplayName,
  formatSideLabel,
  resolveInvitedEvents,
} from '../utils/invitationLogic';
import {
  downloadFile,
  generateGenericPrintCardPngDataUrl,
  generateQrPngDataUrl,
  prepareQrForDesktopWhatsApp,
  sharePrintQrViaNativeSheet,
  supportsNativeFileShare,
} from '../utils/qrGenerator';

export interface GenericInvitationResult {
  slug: string;
  url: string;
  side: GuestSide;
  eventIds: string[];
}

interface InvitationFormProps {
  side: GuestSide;
  isGeneric: boolean;
  guestNames: string[];
  withFamily: boolean;
  selectedEventIds: string[];
  events: WeddingEvent[];
  validationErrors: string[];
  isSubmitting: boolean;
  genericResult: GenericInvitationResult | null;
  onSideChange: (side: GuestSide) => void;
  onGenericChange: (checked: boolean) => void;
  onGuestNameChange: (index: number, value: string) => void;
  onAddGuestName: () => void;
  onRemoveGuestName: (index: number) => void;
  onWithFamilyChange: (checked: boolean) => void;
  onToggleEvent: (eventId: string) => void;
  onToggleSelectAll: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onPreviewInvite?: (urlOrPath: string) => void;
  onNotify?: (message: string) => void;
}

export const InvitationForm: React.FC<InvitationFormProps> = ({
  side,
  isGeneric,
  guestNames,
  withFamily,
  selectedEventIds,
  events,
  validationErrors,
  isSubmitting,
  genericResult,
  onSideChange,
  onGenericChange,
  onGuestNameChange,
  onAddGuestName,
  onRemoveGuestName,
  onWithFamilyChange,
  onToggleEvent,
  onToggleSelectAll,
  onSubmit,
  onPreviewInvite,
  onNotify,
}) => {
  const [genericQrPreview, setGenericQrPreview] = useState<string>('');
  const [copiedGeneric, setCopiedGeneric] = useState(false);
  const [downloadingGenericQr, setDownloadingGenericQr] = useState(false);
  const [sharingGenericWhatsApp, setSharingGenericWhatsApp] = useState(false);

  const allSelected =
    events.length > 0 && events.every((ev) => selectedEventIds.includes(ev.id));
  const formattedPreview = !isGeneric
    ? formatGuestDisplayName(guestNames, withFamily)
    : '';

  useEffect(() => {
    if (!genericResult) {
      setGenericQrPreview('');
      return;
    }
    let active = true;
    generateQrPngDataUrl(genericResult.url, 440)
      .then((dataUrl) => {
        if (active) setGenericQrPreview(dataUrl);
      })
      .catch(() => {
        if (active) setGenericQrPreview('');
      });
    return () => {
      active = false;
    };
  }, [genericResult]);

  const handleCopyGenericLink = async () => {
    if (!genericResult) return;
    try {
      await navigator.clipboard.writeText(genericResult.url);
    } catch {
      const el = document.createElement('textarea');
      el.value = genericResult.url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedGeneric(true);
    setTimeout(() => setCopiedGeneric(false), 1800);
  };

  const handleDownloadGenericQr = async () => {
    if (!genericResult) return;
    setDownloadingGenericQr(true);
    try {
      const pngDataUrl = await generateGenericPrintCardPngDataUrl(genericResult.url);
      downloadFile(pngDataUrl, 'MedhaWedsSaptarshi-generic-qr.png');
    } finally {
      setDownloadingGenericQr(false);
    }
  };

  const genericWhatsAppMessage = genericResult
    ? buildGenericWhatsAppMessage(genericResult.url)
    : '';
  const genericWhatsAppUrl = genericResult
    ? buildGenericWhatsAppShareUrl(genericResult.url)
    : '';

  const handleShareGenericOnWhatsApp = async (
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    if (!genericResult) return;

    if (supportsNativeFileShare()) {
      e.preventDefault();
      setSharingGenericWhatsApp(true);
      try {
        const result = await sharePrintQrViaNativeSheet({
          url: genericResult.url,
          slug: genericResult.slug,
          message: genericWhatsAppMessage,
          isGeneric: true,
        });
        if (result === 'shared') {
          onNotify?.('Shared generic invitation link and QR code.');
          return;
        }
        if (result === 'cancelled') {
          return;
        }
      } finally {
        setSharingGenericWhatsApp(false);
      }

      const link = document.createElement('a');
      link.href = genericWhatsAppUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    prepareQrForDesktopWhatsApp({
      url: genericResult.url,
      slug: genericResult.slug,
      isGeneric: true,
    })
      .then((outcome) => {
        if (outcome === 'copied') {
          onNotify?.(
            'WhatsApp opened with link — generic QR copied to clipboard (paste with Ctrl/Cmd+V).'
          );
        } else {
          onNotify?.('WhatsApp opened with link — generic QR PNG downloaded to attach.');
        }
      })
      .catch(() => {
        onNotify?.('WhatsApp opened with generic invitation link.');
      });
  };

  const genericInvitedEvents = genericResult
    ? resolveInvitedEvents(genericResult.eventIds, events)
    : [];

  return (
    <section
      aria-label="New invitation"
      className="bg-[#FFF9E2]/95 border border-[#E6D194] shadow-[0_12px_32px_rgba(180,136,56,0.12)] rounded-2xl p-5 sm:p-6 transition-shadow duration-200 hover:shadow-[0_16px_38px_rgba(180,136,56,0.16)]"
    >
      <div>
        <h2 className="font-editorial text-[30px] leading-tight font-medium text-[#231618]">
          New invitation
        </h2>
        <p className="mt-0.5 text-sm text-[#6B5457]">
          Add everyone this invitation is addressed to.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5" noValidate>
        {/* 1. Bride Side / Groom Side Radio Selection (First, before Guest Names) */}
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
                name="guestSide"
                value="bride"
                checked={side === 'bride'}
                onChange={() => onSideChange('bride')}
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
                name="guestSide"
                value="groom"
                checked={side === 'groom'}
                onChange={() => onSideChange('groom')}
                className="h-4 w-4 accent-[#9E2A2B] cursor-pointer shrink-0"
              />
              <span className="text-sm font-medium whitespace-nowrap">Groom Side</span>
            </label>
          </div>
        </fieldset>

        {/* 2. Generic Checkbox (Above Guest Names) */}
        <div>
          <label
            className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer select-none ${
              isGeneric
                ? 'border-[#9E2A2B] bg-[#F9E8AE] text-[#4D0A14]'
                : 'border-[#E6D194] bg-[#FFFDF0] text-[#231618] hover:border-[#C89D54]'
            }`}
          >
            <input
              type="checkbox"
              checked={isGeneric}
              onChange={(e) => onGenericChange(e.target.checked)}
              className="h-4 w-4 rounded border-[#CBB79C] accent-[#9E2A2B] cursor-pointer shrink-0"
            />
            <span>Generic</span>
          </label>
        </div>

        {/* 3. Guest Names Input List + Add another name + With family (disabled when Generic) */}
        <div
          aria-disabled={isGeneric}
          className={isGeneric ? 'opacity-50 select-none' : undefined}
        >
          <label
            htmlFor="guest-name-0"
            className="block text-sm font-semibold text-[#231618] mb-2"
          >
            Guest names
          </label>
          <div className="space-y-2">
            {guestNames.map((name, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  id={`guest-name-${idx}`}
                  type="text"
                  value={name}
                  disabled={isGeneric}
                  onChange={(e) => onGuestNameChange(idx, e.target.value)}
                  placeholder={
                    idx === 0
                      ? 'e.g. Mr. & Mrs. Sourav Sen'
                      : 'e.g. Priya Sen'
                  }
                  maxLength={120}
                  aria-label={`Guest name ${idx + 1}`}
                  className="w-full rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3.5 py-2 text-sm text-[#231618] placeholder:text-[#9A8588] focus:outline-none focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/15 disabled:bg-[#FAF4DF] disabled:cursor-not-allowed transition-colors"
                />
                {guestNames.length > 1 && (
                  <button
                    type="button"
                    disabled={isGeneric}
                    onClick={() => onRemoveGuestName(idx)}
                    aria-label={`Remove guest name ${idx + 1}`}
                    className="p-2 rounded-lg border border-[#E6D194] text-[#7A6265] hover:text-[#9E2A2B] hover:border-[#9E2A2B]/40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
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
              onClick={onAddGuestName}
              disabled={isGeneric || guestNames.length >= 20}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3 py-1.5 text-xs font-medium text-[#231618] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-[#7F1924]" aria-hidden="true" />
              Add another name
            </button>

            <label
              className={`inline-flex items-center gap-2 rounded-lg border border-[#E6D194] bg-[#FFFDF0] px-3 py-1.5 text-xs font-medium text-[#231618] transition-colors select-none whitespace-nowrap ${
                isGeneric ? 'cursor-not-allowed' : 'hover:border-[#9E2A2B]/50 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={withFamily}
                disabled={isGeneric}
                onChange={(e) => onWithFamilyChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[#CBB79C] accent-[#9E2A2B] cursor-pointer disabled:cursor-not-allowed"
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

        {/* 4. Fixed Ordered Wedding Events (Names Only) */}
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
                    onChange={() => onToggleEvent(event.id)}
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
              onClick={onToggleSelectAll}
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

        {/* Primary Action */}
        <div className="pt-0.5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#A13030] px-5 py-3 text-sm font-medium text-[#FAF5EC] hover:bg-[#842222] disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {isSubmitting ? 'Generating invitation…' : 'Generate invitation page'}
          </button>
        </div>
      </form>

      {/* Temporary Generic Invitation Link & Nameless QR Code (Disappears on Reload) */}
      {genericResult && (
        <div
          data-testid="generic-invitation-result"
          className="mt-5 rounded-xl bg-[#4D0A14] text-[#FAF5EC] p-4 sm:p-5 border border-[#DFBE7B]/30 space-y-4"
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#DFBE7B]">
              Generic Invitation Ready
            </p>
            <p className="mt-1 text-xs text-[#EAD29F]/90 leading-relaxed">
              <span className="font-semibold text-[#DFBE7B]">
                {formatSideLabel(genericResult.side)}
              </span>
              {genericInvitedEvents.length > 0 && (
                <>
                  {' · '}
                  {genericInvitedEvents.map((ev) => ev.title).join(' · ')}
                </>
              )}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-[#EAD29F]/75 mb-1.5">Generic link</p>
            <div className="rounded-lg border border-[#DFBE7B]/30 bg-[#3A070E]/75 px-3 py-2 font-mono text-[11px] text-[#FAF5EC] break-all select-all">
              {genericResult.url}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyGenericLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#DFBE7B] px-3 py-1.5 text-xs font-semibold text-[#3A070E] hover:bg-[#EAD29F] transition-colors cursor-pointer whitespace-nowrap"
              >
                {copiedGeneric ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Link copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copy Link
                  </>
                )}
              </button>

              <a
                href={genericWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleShareGenericOnWhatsApp}
                aria-label="Share generic invitation on WhatsApp"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFBE7B]/45 bg-[#63111D]/65 px-3 py-1.5 text-xs font-medium text-[#FAF5EC] hover:bg-[#63111D] transition-colors whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
                {sharingGenericWhatsApp ? 'Preparing…' : 'Share on WhatsApp'}
              </a>

              <a
                href={genericResult.url}
                onClick={(e) => {
                  if (onPreviewInvite) {
                    e.preventDefault();
                    onPreviewInvite(genericResult.url);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFBE7B]/35 px-3 py-1.5 text-xs font-medium text-[#FAF5EC] hover:bg-[#63111D] transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
                Preview invitation
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DFBE7B]/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Nameless Static QR Preview */}
            <div className="rounded-xl bg-[#FDFBF7] p-2.5 w-32 shrink-0 border border-[#DFBE7B]/35">
              {genericQrPreview ? (
                <img
                  src={genericQrPreview}
                  alt="Generic static QR code"
                  className="w-full aspect-square object-contain"
                />
              ) : (
                <div className="w-full aspect-square bg-[#F2E9DA] animate-pulse rounded" />
              )}
            </div>

            <div className="space-y-2.5 flex-1">
              <p className="text-xs text-[#EAD29F]/85 leading-relaxed">
                Nameless generic QR code &amp; permanent guest code link. Preview card clears on page reload.
              </p>
              <button
                type="button"
                onClick={handleDownloadGenericQr}
                disabled={downloadingGenericQr}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FAF5EC] px-3.5 py-2 text-xs font-semibold text-[#4D0A14] hover:bg-[#EAD29F] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {downloadingGenericQr ? 'Downloading…' : 'Download QR (PNG)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
