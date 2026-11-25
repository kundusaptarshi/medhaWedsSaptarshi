import React, { useEffect } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import {
  getPhoneLinkAttributes,
  type FamilyContactGroup,
} from '../data/familyContacts';

interface FamilyContactModalProps {
  family: FamilyContactGroup | null;
  onClose: () => void;
}

export const FamilyContactModal: React.FC<FamilyContactModalProps> = ({
  family,
  onClose,
}) => {
  const phoneLinkAttrs = getPhoneLinkAttributes();

  useEffect(() => {
    if (!family) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [family, onClose]);

  if (!family) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-contact-modal-title"
      data-testid={`family-contact-modal-${family.key}`}
      className="fixed inset-0 z-[74] flex items-center justify-center bg-[#231618]/70 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-2xl bg-[#FFF9E2] border border-[#DFBE7B]/85 shadow-2xl overflow-hidden text-left animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Royal Maroon Header */}
        <div className="bg-[#4D0A14] text-[#FAF5EC] px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#DFBE7B]/25 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.2em] uppercase text-[#DFBE7B]/90">
              {family.subtitle}
            </p>
            <h2
              id="family-contact-modal-title"
              className="mt-0.5 font-editorial text-2xl sm:text-3xl leading-tight font-medium text-[#FAF5EC]"
            >
              {family.title}
            </h2>
          </div>
        </div>

        {/* Contacts List — compact so all 3 fit on phone screens without scrolling */}
        <div
          data-testid="family-contact-list-container"
          className="px-4 sm:px-5 py-3 sm:py-4 overflow-y-auto"
        >
          <ul className="space-y-2" aria-label={`${family.title} phone contacts`}>
            {family.contacts.map((person) => (
              <li
                key={person.phone}
                data-testid={`family-contact-row-${person.name.toLowerCase()}`}
                className="rounded-xl border border-[#E6D194] bg-[#FFFDF0] px-3.5 py-2.5 space-y-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-editorial text-lg sm:text-xl font-semibold text-[#4D0A14] leading-tight">
                    {person.name}
                  </p>
                  <p className="text-xs font-mono text-[#6B5457] tabular-nums shrink-0">
                    +91 {person.phone}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={person.telHref}
                    {...phoneLinkAttrs}
                    aria-label={`Call ${person.name}`}
                    data-testid={`contact-call-${person.name.toLowerCase()}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] rounded-lg bg-[#9E2A2B] px-3 py-1.5 text-xs font-semibold text-[#FAF5EC] hover:bg-[#7F1924] transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B]"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Call
                  </a>

                  <a
                    href={person.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp ${person.name}`}
                    data-testid={`contact-whatsapp-${person.name.toLowerCase()}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] rounded-lg border border-[#1E6B43]/35 bg-[#E9F6EE] px-3 py-1.5 text-xs font-semibold text-[#175434] hover:bg-[#D7EEDF] transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B43]"
                  >
                    <MessageCircle
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    WhatsApp
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#FDF3D0] border-t border-[#E6D194] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            data-testid="family-contact-modal-close"
            className="min-h-[38px] rounded-lg bg-[#4D0A14] px-5 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase text-[#FAF5EC] hover:bg-[#63111D] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
