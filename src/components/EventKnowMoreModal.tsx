import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  formatEventLocationLine,
  type WeddingEventDetail,
} from '../data/weddingEventDetails';
import { getEventSideHeaderLabel } from '../utils/invitePresentation';
import { AlpanaDivider } from './AlpanaOrnaments';

interface EventKnowMoreModalProps {
  event: WeddingEventDetail | null;
  onClose: () => void;
}

/**
 * Accessible royal Bengali editorial modal dialog revealing the selected
 * celebration's Event Description and Dress Code when the guest taps "Event/Dresscode details".
 */
export const EventKnowMoreModal: React.FC<EventKnowMoreModalProps> = ({
  event,
  onClose,
}) => {
  useEffect(() => {
    if (!event) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const sideBadgeLabel = getEventSideHeaderLabel(event);
  const locationLine = formatEventLocationLine(event);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-know-more-title"
      aria-describedby="event-know-more-description"
      data-testid="event-details-dialog"
      className="fixed inset-0 z-[72] flex items-center justify-center bg-[#231618]/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88dvh] flex flex-col rounded-2xl bg-[#FFF9E2] border border-[#DFBE7B]/85 shadow-2xl overflow-hidden text-left animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Royal Maroon Header */}
        <div className="flex items-start justify-between gap-4 bg-[#4D0A14] text-[#FAF5EC] px-6 py-5 border-b border-[#DFBE7B]/25 shrink-0">
          <div className="min-w-0">
            <p
              data-testid="event-details-meta-line"
              className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#DFBE7B]/90"
            >
              {event.dateLabel} · {event.timeLabel}
              {sideBadgeLabel && (
                <span data-testid="event-details-side-label">
                  {' '}
                  · {sideBadgeLabel}
                </span>
              )}
            </p>
            <h2
              id="event-know-more-title"
              className="mt-1 font-editorial text-3xl leading-tight font-medium text-[#FAF5EC]"
            >
              {event.title}
            </h2>
            {event.combinedSides ? (
              <div className="mt-1.5 space-y-0.5 text-xs text-[#EAD29F]/90 leading-snug">
                <p>
                  <span className="font-semibold text-[#DFBE7B]">Bride&apos;s Side:</span>{' '}
                  {formatEventLocationLine(event.combinedSides.bride)}
                </p>
                <p>
                  <span className="font-semibold text-[#DFBE7B]">Groom&apos;s Side:</span>{' '}
                  {formatEventLocationLine(event.combinedSides.groom)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-[#EAD29F]/85 leading-snug">
                {locationLine}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${event.title} details`}
            className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg border border-[#DFBE7B]/35 text-[#FAF5EC] hover:bg-[#63111D] transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Cultural Description + Dress Code */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          <div className="text-center">
            <AlpanaDivider className="w-36 mx-auto mb-3.5 text-[#C89D54]" />
            <p
              id="event-know-more-description"
              data-testid="event-know-more-description"
              className="text-sm sm:text-[15px] text-[#3E272A] leading-relaxed"
            >
              {event.description}
            </p>
          </div>

          <div
            data-testid="event-know-more-dresscode"
            className="pt-4 border-t border-[#E6D194]/85 text-left space-y-2"
          >
            <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-[#9E2A2B]">
              Dress Code
            </h3>
            {event.dressCodeBreakdown && event.dressCodeBreakdown.length > 0 ? (
              <dl className="space-y-2 text-sm text-[#3E272A] leading-relaxed">
                {event.dressCodeBreakdown.map((item) => (
                  <div key={item.label}>
                    <dt className="inline font-semibold text-[#4D0A14]">
                      {item.label}:{' '}
                    </dt>
                    <dd className="inline">{item.details}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-[#3E272A] leading-relaxed">
                {event.dressCode}
              </p>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="px-6 py-3.5 bg-[#FDF3D0] border-t border-[#E6D194] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            data-testid="event-know-more-close"
            className="min-h-[44px] rounded-lg bg-[#4D0A14] px-5 py-2 text-xs font-semibold tracking-[0.14em] uppercase text-[#FAF5EC] hover:bg-[#63111D] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
