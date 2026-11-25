import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { InvitationRecord } from '../types';
import { buildBrandedDisplayPath } from '../utils/invitationLogic';

interface ConfirmDeleteModalProps {
  invitation: InvitationRecord | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  invitation,
  deleting,
  onCancel,
  onConfirm,
}) => {
  if (!invitation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#231618]/65 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#FFF9E2] border border-[#E6D194] p-6 shadow-2xl">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#9E2A2B]/12 text-[#9E2A2B] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              id="delete-dialog-title"
              className="font-editorial text-2xl font-medium text-[#231618]"
            >
              Delete invitation?
            </h2>
            <p className="mt-1.5 text-sm text-[#4C373A] leading-relaxed">
              This will permanently remove the invitation for{' '}
              <span className="font-semibold text-[#231618]">
                {invitation.displayGuestName}
              </span>{' '}
              and invalidate its URL and QR code immediately.
            </p>
            <p className="mt-2 font-mono text-xs text-[#7F1924] break-all">
              {buildBrandedDisplayPath(invitation.slug)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border border-[#E6D194] text-xs font-medium text-[#4C373A] hover:bg-[#F9E8AE] transition-colors cursor-pointer"
          >
            Keep invitation
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-[#9E2A2B] text-[#FAF5EC] text-xs font-semibold hover:bg-[#7F1924] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {deleting ? 'Deleting…' : 'Yes, delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};
