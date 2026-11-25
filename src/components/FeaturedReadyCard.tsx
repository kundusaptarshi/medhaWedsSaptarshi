import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Printer, Share2 } from 'lucide-react';
import type { InvitationRecord, WeddingEvent } from '../types';
import {
  buildInvitationUrl,
  buildWhatsAppMessage,
  buildWhatsAppShareUrl,
  formatSideLabel,
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
import { AlpanaMandala } from './AlpanaOrnaments';

interface FeaturedReadyCardProps {
  invitation: InvitationRecord;
  events: WeddingEvent[];
  onPreviewInvite?: (urlOrPath: string) => void;
  onNotify?: (message: string) => void;
}

export const FeaturedReadyCard: React.FC<FeaturedReadyCardProps> = ({
  invitation,
  events,
  onPreviewInvite,
  onNotify,
}) => {
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

  const fullUrl = buildInvitationUrl(invitation.slug);
  const invitedEvents = resolveInvitedEvents(invitation.eventIds, events);
  const whatsappMessage = buildWhatsAppMessage(invitation.displayGuestName, fullUrl);
  const whatsappUrl = buildWhatsAppShareUrl(invitation.displayGuestName, fullUrl);

  useEffect(() => {
    let active = true;
    generateQrPngDataUrl(fullUrl, 480)
      .then((dataUrl) => {
        if (active) setQrPreviewUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrPreviewUrl('');
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
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPrintQrPng = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generatePrintCardPngDataUrl(
        fullUrl,
        invitation.displayGuestName
      );
      downloadFile(dataUrl, `${invitation.slug}-print-qr.png`);
    } finally {
      setDownloading(false);
    }
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
      // Fallback to WhatsApp contact picker link if native share rejected files
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Desktop / non-file-share path: let the anchor open WhatsApp contacts screen immediately
    // and prepare the QR PNG (clipboard copy or PNG download) so it can be attached right away.
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
    <section
      aria-label="Active invitation ready"
      className="relative overflow-hidden rounded-2xl bg-[#4D0A14] text-[#FAF5EC] p-6 sm:p-8"
    >
      <AlpanaMandala className="pointer-events-none absolute -right-14 -top-14 w-64 h-64 text-[#DFBE7B]/18 animate-chakra-ccw" />

      <div className="relative z-10">
        {/* Kicker */}
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.2em] uppercase text-[#DFBE7B]">
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          Invitation Ready
        </p>

        {/* Guest Name in Italic Editorial Serif */}
        <h3 className="mt-2 font-editorial italic text-3xl sm:text-4xl font-normal text-[#FAF5EC] leading-tight">
          {invitation.displayGuestName}
        </h3>

        {/* Clean Unboxed Side + Invited Events Metadata */}
        <p className="mt-2.5 text-xs text-[#EAD29F]/90 leading-relaxed">
          <span className="font-semibold text-[#DFBE7B]">
            {formatSideLabel(invitation.side)}
          </span>
          {invitedEvents.length > 0 && (
            <>
              {'  ·  '}
              {invitedEvents.map((ev) => ev.title).join('  ·  ')}
            </>
          )}
        </p>

        {/* Personal Link Box */}
        <div className="mt-6">
          <p className="text-xs text-[#EAD29F]/75 mb-2">Personal link</p>
          <div className="rounded-lg border border-[#DFBE7B]/30 bg-[#3A070E]/70 px-3.5 py-2.5 font-mono text-xs text-[#FAF5EC] break-all select-all">
            {fullUrl}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#DFBE7B] px-4 py-2 text-xs font-semibold text-[#3A070E] hover:bg-[#EAD29F] transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? (
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
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleShareOnWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFBE7B]/35 px-3.5 py-2 text-xs font-medium text-[#FAF5EC] hover:bg-[#63111D] transition-colors whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
            {sharingWhatsApp ? 'Preparing WhatsApp…' : 'Share on WhatsApp'}
          </a>

          <a
            href={fullUrl}
            onClick={(e) => {
              if (onPreviewInvite) {
                e.preventDefault();
                onPreviewInvite(fullUrl);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFBE7B]/35 px-3.5 py-2 text-xs font-medium text-[#FAF5EC] hover:bg-[#63111D] transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#DFBE7B]" aria-hidden="true" />
            Preview invitation
          </a>
        </div>

        <hr className="my-6 border-[#DFBE7B]/20" />

        {/* Static Permanent QR Code Block */}
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#EAD29F]/80 mb-3.5">
          Static QR Code
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Crisp Print-Preview QR Card */}
          <div className="rounded-xl bg-[#FFF9E2] p-3.5 text-center w-44 shrink-0 border border-[#DFBE7B]/40">
            {qrPreviewUrl ? (
              <img
                src={qrPreviewUrl}
                alt={`Static QR code for ${invitation.displayGuestName}`}
                className="w-full aspect-square object-contain"
              />
            ) : (
              <div className="w-full aspect-square bg-[#F2E9DA] animate-pulse rounded" />
            )}
            <p className="mt-2 font-editorial text-sm font-semibold text-[#4D0A14] leading-snug break-words">
              {invitation.displayGuestName}
            </p>
          </div>

          {/* Single Print QR (PNG) Option */}
          <div className="space-y-3 flex-1">
            <p className="text-xs text-[#EAD29F]/85 leading-relaxed max-w-sm">
              Permanent static QR code — never expires, unlimited scans, directly encodes this guest’s invitation URL with their name underneath for printing.
            </p>
            <button
              type="button"
              onClick={handleDownloadPrintQrPng}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFF9E2] px-4 py-2.5 text-xs font-semibold text-[#4D0A14] hover:bg-[#FAF0C8] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {downloading ? 'Preparing PNG…' : 'Print QR (PNG)'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
