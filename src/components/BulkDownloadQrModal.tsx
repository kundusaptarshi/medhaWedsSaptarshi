import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import type { InvitationRecord, WeddingEvent } from '../types';
import {
  buildInvitationUrl,
  formatSideLabel,
  resolveInvitedEvents,
} from '../utils/invitationLogic';
import { generatePrintCardPngDataUrl } from '../utils/qrGenerator';
import {
  buildZipBytes,
  dataUrlToUint8Array,
  downloadBlob,
  sanitizeUniqueZipFilename,
  type ZipEntryInput,
} from '../utils/zipBuilder';

interface BulkDownloadQrModalProps {
  isOpen: boolean;
  invitations: InvitationRecord[];
  events: WeddingEvent[];
  onClose: () => void;
  onDownloaded?: (count: number) => void;
}

export const BulkDownloadQrModal: React.FC<BulkDownloadQrModalProps> = ({
  isOpen,
  invitations,
  events,
  onClose,
  onDownloaded,
}) => {
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset checkboxes to all checked whenever the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setSelectedSlugs(new Set(invitations.map((inv) => inv.slug)));
    setErrorMessage(null);
    setProgressText('');
  }, [isOpen, invitations]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !downloading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, downloading, onClose]);

  if (!isOpen) return null;

  const selectedInvitations = invitations.filter((inv) =>
    selectedSlugs.has(inv.slug)
  );
  const allChecked =
    invitations.length > 0 && selectedInvitations.length === invitations.length;

  const handleToggleSlug = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
    if (errorMessage) setErrorMessage(null);
  };

  const handleToggleAll = () => {
    if (allChecked) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(invitations.map((inv) => inv.slug)));
    }
    if (errorMessage) setErrorMessage(null);
  };

  const handleDownloadZip = async () => {
    if (selectedInvitations.length === 0) return;

    setDownloading(true);
    setErrorMessage(null);

    try {
      const entries: ZipEntryInput[] = [];
      const usedFilenames = new Set<string>();

      for (let i = 0; i < selectedInvitations.length; i++) {
        const inv = selectedInvitations[i];
        setProgressText(
          `Preparing QR ${i + 1} of ${selectedInvitations.length}…`
        );
        const fullUrl = buildInvitationUrl(inv.slug);
        const pngDataUrl = await generatePrintCardPngDataUrl(
          fullUrl,
          inv.displayGuestName
        );
        const pngBytes = dataUrlToUint8Array(pngDataUrl);
        const filename = sanitizeUniqueZipFilename(
          `${inv.displayGuestName}-qr`,
          usedFilenames,
          '.png'
        );
        entries.push({ filename, data: pngBytes });
      }

      setProgressText('Packaging ZIP archive…');
      const zipBytes = buildZipBytes(entries);
      const zipBlob = new Blob([zipBytes.buffer as ArrayBuffer], {
        type: 'application/zip',
      });
      downloadBlob(zipBlob, 'MedhaWedsSaptarshi-QRs.zip');

      const downloadedCount = entries.length;
      setDownloading(false);
      setProgressText('');
      onClose();
      onDownloaded?.(downloadedCount);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to generate ZIP file. Please try again.'
      );
      setDownloading(false);
      setProgressText('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-qr-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231618]/65 p-4"
      onClick={() => {
        if (!downloading) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-[#FFF9E2] border border-[#E6D194] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#FFF9E2] px-6 pt-5 pb-4 border-b border-[#E6D194]">
          <div>
            <h2
              id="bulk-qr-dialog-title"
              className="font-editorial text-3xl leading-tight font-medium text-[#231618]"
            >
              Download All QRs
            </h2>
            <p className="mt-1 text-xs text-[#6B5457]">
              Uncheck any invitations you want to skip, then download all selected QRs as a ZIP file.
            </p>
          </div>
        </div>

        {/* Selection Summary Bar */}
        <div className="px-6 py-2.5 bg-[#FDF3D0] border-b border-[#E6D194] flex items-center justify-between gap-2 text-xs">
          <span className="text-[#4C373A] font-medium tabular-nums">
            {selectedInvitations.length} of {invitations.length} selected
          </span>
          <button
            type="button"
            onClick={handleToggleAll}
            disabled={downloading || invitations.length === 0}
            className="font-medium text-[#9E2A2B] hover:text-[#4D0A14] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {allChecked ? 'Unselect all' : 'Select all'}
          </button>
        </div>

        {/* Invitation Checklist (Strictly the Current Filtered List) */}
        <div
          data-testid="bulk-qr-list"
          className="flex-1 overflow-y-auto px-6 py-4 space-y-2 studio-scroll"
        >
          {invitations.map((inv) => {
            const checked = selectedSlugs.has(inv.slug);
            const invitedEvents = resolveInvitedEvents(inv.eventIds, events);
            return (
              <label
                key={inv.slug}
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors cursor-pointer select-none ${
                  checked
                    ? 'border-[#9E2A2B] bg-[#F9E8AE]'
                    : 'border-[#E6D194] bg-[#FFFDF0] hover:border-[#C89D54]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={downloading}
                  onChange={() => handleToggleSlug(inv.slug)}
                  aria-label={`Include QR for ${inv.displayGuestName}`}
                  className="mt-0.5 h-4 w-4 rounded border-[#CBB79C] accent-[#9E2A2B] cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-editorial text-xl font-medium text-[#231618] leading-snug truncate">
                    {inv.displayGuestName}
                  </p>
                  <p className="mt-0.5 text-xs text-[#7F1924] truncate">
                    <span className="font-semibold text-[#4D0A14]">
                      {formatSideLabel(inv.side)}
                    </span>
                    {invitedEvents.length > 0 && (
                      <>
                        {' · '}
                        {invitedEvents.map((ev) => ev.title).join(' · ')}
                      </>
                    )}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div
            role="alert"
            className="mx-6 mb-3 rounded-xl border border-[#9E2A2B]/35 bg-[#9E2A2B]/8 px-4 py-2.5 text-xs font-medium text-[#7F1924]"
          >
            {errorMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#FFF9E2] border-t border-[#E6D194] flex items-center justify-between gap-3">
          <span className="text-xs text-[#7A6265] truncate">
            {downloading ? progressText : 'High-resolution Print QR PNGs (.zip)'}
          </span>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={downloading}
              className="px-4 py-2 rounded-xl border border-[#E6D194] bg-[#FFFDF0] text-xs font-medium text-[#4C373A] hover:bg-[#F9E8AE] disabled:opacity-60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloading || selectedInvitations.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#A13030] text-xs font-semibold text-[#FAF5EC] hover:bg-[#842222] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {downloading
                ? 'Downloading…'
                : `Download (${selectedInvitations.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
