export interface ZipEntryInput {
  filename: string;
  data: Uint8Array;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/**
 * Computes standard IEEE 802.3 CRC-32 checksum used by PKZIP headers.
 */
export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Decodes a base64 Data URL (e.g. canvas PNG output) into raw bytes.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Invalid Data URL provided for ZIP entry.');
  }
  const base64 = dataUrl.slice(commaIdx + 1);
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

/**
 * Ensures every entry filename inside a ZIP archive is sanitized and unique.
 */
export function sanitizeUniqueZipFilename(
  rawName: string,
  usedLowerNames: Set<string>,
  extension = '.png'
): string {
  const cleanedBase = rawName
    .replace(/&/g, ' and ')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const base = cleanedBase || 'invitation-qr';
  let candidate = `${base}${extension}`;
  let counter = 2;
  while (usedLowerNames.has(candidate.toLowerCase())) {
    candidate = `${base}-${counter}${extension}`;
    counter += 1;
  }
  usedLowerNames.add(candidate.toLowerCase());
  return candidate;
}

function toDosTimeDate(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

/**
 * Builds a standard PKZIP archive (Store method 0 — ideal for already-compressed PNGs)
 * with UTF-8 filenames, valid CRC-32 checksums, Central Directory, and EOCD record.
 */
export function buildZipBytes(
  entries: ZipEntryInput[],
  timestamp: Date = new Date()
): Uint8Array {
  const encoder = new TextEncoder();
  const { dosTime, dosDate } = toDosTimeDate(timestamp);

  interface PreparedEntry {
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    offset: number;
  }

  const prepared: PreparedEntry[] = [];
  let localSectionLength = 0;
  let centralDirLength = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.filename);
    const crc = computeCrc32(entry.data);
    prepared.push({
      nameBytes,
      data: entry.data,
      crc,
      offset: localSectionLength,
    });
    localSectionLength += 30 + nameBytes.length + entry.data.length;
    centralDirLength += 46 + nameBytes.length;
  }

  const totalLength = localSectionLength + centralDirLength + 22;
  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // 1. Write Local File Headers + File Data
  let cursor = 0;
  for (const item of prepared) {
    view.setUint32(cursor, 0x04034b50, true); // Local file header signature
    view.setUint16(cursor + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(cursor + 6, 0x0800, true); // General purpose flag (UTF-8)
    view.setUint16(cursor + 8, 0, true); // Compression method: 0 (Store)
    view.setUint16(cursor + 10, dosTime, true);
    view.setUint16(cursor + 12, dosDate, true);
    view.setUint32(cursor + 14, item.crc, true);
    view.setUint32(cursor + 18, item.data.length, true); // Compressed size
    view.setUint32(cursor + 22, item.data.length, true); // Uncompressed size
    view.setUint16(cursor + 26, item.nameBytes.length, true);
    view.setUint16(cursor + 28, 0, true); // Extra field length
    buffer.set(item.nameBytes, cursor + 30);
    cursor += 30 + item.nameBytes.length;

    buffer.set(item.data, cursor);
    cursor += item.data.length;
  }

  // 2. Write Central Directory Headers
  const centralDirOffset = cursor;
  for (const item of prepared) {
    view.setUint32(cursor, 0x02014b50, true); // Central directory signature
    view.setUint16(cursor + 4, 20, true); // Version made by
    view.setUint16(cursor + 6, 20, true); // Version needed to extract
    view.setUint16(cursor + 8, 0x0800, true); // UTF-8 filename flag
    view.setUint16(cursor + 10, 0, true); // Compression method: 0 (Store)
    view.setUint16(cursor + 12, dosTime, true);
    view.setUint16(cursor + 14, dosDate, true);
    view.setUint32(cursor + 16, item.crc, true);
    view.setUint32(cursor + 20, item.data.length, true);
    view.setUint32(cursor + 24, item.data.length, true);
    view.setUint16(cursor + 28, item.nameBytes.length, true);
    view.setUint16(cursor + 30, 0, true); // Extra length
    view.setUint16(cursor + 32, 0, true); // Comment length
    view.setUint16(cursor + 34, 0, true); // Disk number start
    view.setUint16(cursor + 36, 0, true); // Internal file attributes
    view.setUint32(cursor + 38, 0, true); // External file attributes
    view.setUint32(cursor + 42, item.offset, true); // Relative offset of local header
    buffer.set(item.nameBytes, cursor + 46);
    cursor += 46 + item.nameBytes.length;
  }

  // 3. Write End of Central Directory (EOCD)
  view.setUint32(cursor, 0x06054b50, true); // EOCD signature
  view.setUint16(cursor + 4, 0, true); // Disk number
  view.setUint16(cursor + 6, 0, true); // Disk with central directory
  view.setUint16(cursor + 8, prepared.length, true); // Entries on this disk
  view.setUint16(cursor + 10, prepared.length, true); // Total entries
  view.setUint32(cursor + 12, centralDirLength, true);
  view.setUint32(cursor + 16, centralDirOffset, true);
  view.setUint16(cursor + 20, 0, true); // Comment length

  return buffer;
}

/**
 * Triggers a browser download for a binary Blob (e.g. application/zip).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
