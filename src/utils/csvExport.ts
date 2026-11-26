import type { InvitationRecord } from '../types';
import { buildInvitationUrl } from './invitationLogic';
import { downloadBlob } from './zipBuilder';

export const UTF8_BOM = '\uFEFF';
export const DEFAULT_INVITE_LINKS_CSV_FILENAME = 'filtered-invite-links.csv';

export type CsvInvitationLike = Pick<
  InvitationRecord,
  'slug' | 'displayGuestName' | 'guestNames'
>;

/**
 * Escapes a single CSV field per RFC 4180:
 * wraps in double quotes and doubles internal quotes whenever the value
 * contains a comma, double quote, carriage return, or newline.
 */
export function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Resolves the guest display name for CSV export, preferring the formatted
 * displayGuestName and falling back to comma-joined guestNames.
 */
export function getCsvGuestDisplayName(inv: CsvInvitationLike): string {
  const formatted = inv.displayGuestName?.trim();
  if (formatted) return formatted;
  return (inv.guestNames ?? [])
    .map((name) => name.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Builds a UTF-8 BOM-prefixed CSV string containing `Guest Name,Invite Link`
 * for the given (filtered) invitations in their current display order.
 */
export function buildFilteredInviteLinksCsv(
  invitations: ReadonlyArray<CsvInvitationLike>,
  origin?: string
): string {
  const rows: string[] = ['Guest Name,Invite Link'];

  for (const inv of invitations) {
    const guestName = getCsvGuestDisplayName(inv);
    const inviteLink = buildInvitationUrl(inv.slug, origin);
    rows.push(`${escapeCsvCell(guestName)},${escapeCsvCell(inviteLink)}`);
  }

  return `${UTF8_BOM}${rows.join('\r\n')}\r\n`;
}

/**
 * Triggers a browser CSV file download for the currently filtered invitations.
 * Returns false if there are no invitations to export.
 */
export function downloadFilteredInviteLinksCsv(
  invitations: ReadonlyArray<CsvInvitationLike>,
  filename = DEFAULT_INVITE_LINKS_CSV_FILENAME,
  origin?: string
): boolean {
  if (invitations.length === 0) return false;
  const csvContent = buildFilteredInviteLinksCsv(invitations, origin);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
  return true;
}
