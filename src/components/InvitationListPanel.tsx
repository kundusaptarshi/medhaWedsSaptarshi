import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Printer,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import type { GuestSide, InvitationRecord, WeddingEvent } from '../types';
import { BulkDownloadQrModal } from './BulkDownloadQrModal';
import {
  buildBrandedDisplayPath,
  buildInvitationUrl,
  buildWhatsAppMessage,
  buildWhatsAppShareUrl,
  formatSideLabel,
  formatTimestamp,
  resolveInvitedEvents,
} from '../utils/invitationLogic';
import {
  downloadFile,
  generatePrintCardPngDataUrl,
  generateQrPngDataUrl,
  prepareQrForDesktopWhatsApp,
  sharePrintQrViaNativeSheet,
  supportsNativeFileShare,
} from '../utils/qrGenerator';

interface InvitationCardItemProps {
  invitation: InvitationRecord;
  events: WeddingEvent[];
  isSelected: boolean;
  isEditing: boolean;
  onEdit: (inv: InvitationRecord) => void;
  onRequestDelete: (inv: InvitationRecord) => void;
  onPreviewInvite?: (urlOrPath: string) => void;
  onNotify?: (message: string) => void;
}

const InvitationCardItem: React.FC<InvitationCardItemProps> = ({
  invitation,
  events,
  isSelected,
  isEditing,
  onEdit,
  onRequestDelete,
  onPreviewInvite,
  onNotify,
}) => {
  const [qrThumb, setQrThumb] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const fullUrl = buildInvitationUrl(invitation.slug);
  const displayPath = buildBrandedDisplayPath(invitation.slug);
  const invitedEvents = resolveInvitedEvents(invitation.eventIds, events);
  const whatsappMessage = buildWhatsAppMessage(invitation.displayGuestName, fullUrl);
  const whatsappUrl = buildWhatsAppShareUrl(invitation.displayGuestName, fullUrl);

  useEffect(() => {
    let active = true;
    generateQrPngDataUrl(fullUrl, 220)
      .then((url) => {
        if (active) setQrThumb(url);
      })
      .catch(() => {
        if (active) setQrThumb('');
      });
    return () => {
      active = false;
    };
  }, [fullUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = fullUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadPrintQrPng = async () => {
    const dataUrl = await generatePrintCardPngDataUrl(
      fullUrl,
      invitation.displayGuestName
    );
    downloadFile(dataUrl, `${invitation.slug}-print-qr.png`);
  };

  const handleShareOnWhatsApp = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (supportsNativeFileShare()) {
      e.preventDefault();
      setSharingWhatsApp(true);
      try {
        const result = await sharePrintQrViaNativeSheet({
          url: fullUrl,
          slug: invitation.slug,
          displayGuestName: invitation.displayGuestName,
          message: whatsappMessage,
        });
        if (result === 'shared') {
          onNotify?.('Shared invitation link and QR code.');
          return;
        }
        if (result === 'cancelled') {
          return;
        }
      } finally {
        setSharingWhatsApp(false);
      }
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    prepareQrForDesktopWhatsApp({
      url: fullUrl,
      slug: invitation.slug,
      displayGuestName: invitation.displayGuestName,
    })
      .then((outcome) => {
        if (outcome === 'copied') {
          onNotify?.(
            'WhatsApp opened with link — QR image copied to clipboard (paste with Ctrl/Cmd+V).'
          );
        } else {
          onNotify?.('WhatsApp opened with link — QR PNG downloaded to attach.');
        }
      })
      .catch(() => {
        onNotify?.('WhatsApp opened with invitation link.');
      });
  };

  return (
    <article
      className={`rounded-xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(180,136,56,0.12)] ${
        isEditing
          ? 'border-[#9E2A2B] bg-[#F9E8AE]'
          : isSelected
            ? 'border-[#C89D54] bg-[#FDF3D0]'
            : 'border-[#E6D194] bg-[#FFFDF0] hover:border-[#C89D54]'
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Left Info Column */}
        <div className="min-w-0 flex-1">
          <h4 className="font-editorial text-2xl font-medium text-[#231618] leading-snug">
            {invitation.displayGuestName}
          </h4>

          {/* Unboxed Metadata: Bride/Groom Side · Events */}
          <p className="mt-1 text-xs text-[#7F1924] font-medium">
            <span className="text-[#4D0A14] font-semibold">
              {formatSideLabel(invitation.side)}
            </span>
            {invitedEvents.length > 0 && (
              <>
                {' · '}
                {invitedEvents.map((e) => e.title).join(' · ')}
              </>
            )}
          </p>

          <p className="mt-1.5 font-mono text-[11px] text-[#6B5457] break-all">
            {displayPath}
          </p>

          <p className="mt-1 text-[11px] text-[#8E7679] tabular-nums">
            Generated {formatTimestamp(invitation.createdAtMs)}
            {invitation.updatedAtMs > invitation.createdAtMs + 2000 && (
              <> · Edited {formatTimestamp(invitation.updatedAtMs)}</>
            )}
          </p>

          {/* Primary Share, Preview & Print QR Actions */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy Link for ${invitation.displayGuestName}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4D0A14] px-3 py-1.5 text-xs font-medium text-[#FAF5EC] hover:bg-[#63111D] transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
                  Copy Link
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleShareOnWhatsApp}
              aria-label={`Share on WhatsApp for ${invitation.displayGuestName}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6D194] bg-[#FFF9E2] px-2.5 py-1.5 text-xs font-medium text-[#231618] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] hover:text-[#7F1924] transition-colors whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 text-[#7F1924]" aria-hidden="true" />
              {sharingWhatsApp ? 'Preparing…' : 'Share on WhatsApp'}
            </a>

            <a
              href={fullUrl}
              onClick={(e) => {
                if (onPreviewInvite) {
                  e.preventDefault();
                  onPreviewInvite(fullUrl);
                }
              }}
              aria-label={`Preview invitation for ${invitation.displayGuestName}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6D194] bg-[#FFF9E2] px-2.5 py-1.5 text-xs font-medium text-[#231618] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] hover:text-[#7F1924] transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#7F1924]" aria-hidden="true" />
              Preview invitation
            </a>

            <button
              type="button"
              onClick={handleDownloadPrintQrPng}
              aria-label={`Print QR (PNG) for ${invitation.displayGuestName}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6D194] bg-[#FFF9E2] px-2.5 py-1.5 text-xs font-medium text-[#231618] hover:border-[#9E2A2B]/50 hover:bg-[#F9E8AE] hover:text-[#7F1924] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-[#7F1924]" aria-hidden="true" />
              Print QR (PNG)
            </button>
          </div>

          {/* Secondary Management Row */}
          <div className="mt-3 pt-2.5 border-t border-[#E6D194]/60 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <button
              type="button"
              onClick={() => onEdit(invitation)}
              aria-label={`Edit invitation for ${invitation.displayGuestName}`}
              className="inline-flex items-center gap-1 font-medium text-[#6B5457] hover:text-[#4D0A14] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
              Edit
            </button>

            <button
              type="button"
              onClick={() => onRequestDelete(invitation)}
              aria-label={`Delete invitation for ${invitation.displayGuestName}`}
              className="inline-flex items-center gap-1 font-medium text-[#9E2A2B] hover:text-[#63111D] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>

        {/* Non-clickable Compact Static QR Preview with Guest Name Underneath */}
        <div
          data-testid="history-qr-card"
          className="self-start sm:self-center shrink-0 w-24 rounded-lg border border-[#E6D194] bg-[#FFF9E2] p-2 text-center select-none"
        >
          {qrThumb ? (
            <img
              src={qrThumb}
              alt={`QR preview for ${invitation.displayGuestName}`}
              className="w-full aspect-square object-contain pointer-events-none"
            />
          ) : (
            <div className="w-full aspect-square bg-[#F2E9DA] rounded animate-pulse" />
          )}
          <span className="mt-1 block font-editorial text-[11px] font-semibold text-[#4D0A14] leading-tight line-clamp-2">
            {invitation.displayGuestName}
          </span>
        </div>
      </div>
    </article>
  );
};

interface InvitationListPanelProps {
  invitations: InvitationRecord[];
  totalCount: number;
  events: WeddingEvent[];
  searchQuery: string;
  eventFilterId: string;
  sideFilter: 'all' | GuestSide;
  selectedSlug: string | null;
  editingSlug: string | null;
  loading: boolean;
  onSearchChange: (val: string) => void;
  onEventFilterChange: (val: string) => void;
  onSideFilterChange: (val: 'all' | GuestSide) => void;
  onEdit: (inv: InvitationRecord) => void;
  onRequestDelete: (inv: InvitationRecord) => void;
  onPreviewInvite?: (urlOrPath: string) => void;
  onNotify?: (message: string) => void;
}

export const InvitationListPanel: React.FC<InvitationListPanelProps> = ({
  invitations,
  totalCount,
  events,
  searchQuery,
  eventFilterId,
  sideFilter,
  selectedSlug,
  editingSlug,
  loading,
  onSearchChange,
  onEventFilterChange,
  onSideFilterChange,
  onEdit,
  onRequestDelete,
  onPreviewInvite,
  onNotify,
}) => {
  const [bulkQrModalOpen, setBulkQrModalOpen] = useState(false);

  const hasActiveFilters =
    Boolean(searchQuery) || eventFilterId !== 'all' || sideFilter !== 'all';

  return (
    <section
      aria-label="Generated invitations"
      className="bg-[#FFF9E2] border border-[#E6D194] shadow-[0_10px_28px_rgba(200,157,84,0.08)] rounded-2xl p-5 sm:p-6 flex flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6D194]">
        <div>
          <h3 className="font-editorial text-2xl font-medium text-[#231618]">
            Generated Invitations
          </h3>
          <p className="text-xs text-[#7A6265] mt-0.5 tabular-nums">
            Showing {invitations.length} of {totalCount} invitations · Newest first
          </p>
        </div>

        <button
          type="button"
          onClick={() => setBulkQrModalOpen(true)}
          disabled={loading || invitations.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#4D0A14] px-3.5 py-2 text-xs font-medium text-[#FAF5EC] hover:bg-[#63111D] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
          Download All QRs
        </button>
      </div>

      {/* Search + Side Filter + Event Filter */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="relative sm:col-span-5">
          <Search
            className="w-4 h-4 text-[#8E7679] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search guest name…"
            aria-label="Search generated invitations by guest name"
            className="w-full rounded-lg border border-[#E6D194] bg-[#FFFDF0] pl-9 pr-3 py-2 text-sm text-[#231618] placeholder:text-[#9A8588] focus:outline-none focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/15"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={sideFilter}
            onChange={(e) =>
              onSideFilterChange(e.target.value as 'all' | GuestSide)
            }
            aria-label="Filter invitations by bride side or groom side"
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
            onChange={(e) => onEventFilterChange(e.target.value)}
            aria-label="Filter invitations by wedding event"
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

      {/* Independently Scrollable List Container */}
      <div
        data-testid="invitation-list"
        className="mt-4 space-y-3 max-h-[620px] overflow-y-auto pr-1 studio-scroll"
      >
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-32 rounded-xl border border-[#E6D194] bg-[#FFFDF0] animate-pulse"
              />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E6D194] py-12 px-6 text-center">
            <p className="font-editorial text-2xl text-[#4D0A14]">
              {totalCount === 0
                ? 'No invitations generated yet'
                : 'No matching invitations'}
            </p>
            <p className="mt-1.5 text-xs text-[#7A6265] max-w-sm mx-auto">
              {totalCount === 0
                ? 'Select Bride or Groom side, enter guest names, and choose their celebrations on the left to generate your first invitation.'
                : 'Try clearing your search term or resetting the side and event filters.'}
            </p>
            {totalCount > 0 && hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onSideFilterChange('all');
                  onEventFilterChange('all');
                }}
                className="mt-4 px-3.5 py-1.5 rounded-lg border border-[#E6D194] text-xs font-medium text-[#7F1924] hover:bg-[#F9E8AE] transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          invitations.map((inv) => (
            <InvitationCardItem
              key={inv.slug}
              invitation={inv}
              events={events}
              isSelected={selectedSlug === inv.slug}
              isEditing={editingSlug === inv.slug}
              onEdit={onEdit}
              onRequestDelete={onRequestDelete}
              onPreviewInvite={onPreviewInvite}
              onNotify={onNotify}
            />
          ))
        )}
      </div>

      {/* Bulk Download All QRs Dialog (only currently shown filtered/unfiltered invitations) */}
      <BulkDownloadQrModal
        isOpen={bulkQrModalOpen}
        invitations={invitations}
        events={events}
        onClose={() => setBulkQrModalOpen(false)}
        onDownloaded={(count) =>
          onNotify?.(
            `Downloaded ${count} QR ${count === 1 ? 'code' : 'codes'} as ZIP.`
          )
        }
      />
    </section>
  );
};
