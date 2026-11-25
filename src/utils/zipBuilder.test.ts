import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildZipBytes,
  computeCrc32,
  dataUrlToUint8Array,
  sanitizeUniqueZipFilename,
} from './zipBuilder';

test('computeCrc32 matches standard IEEE 802.3 test vector', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(computeCrc32(bytes), 0xcbf43926);
});

test('sanitizeUniqueZipFilename strips unsafe characters and deduplicates collisions', () => {
  const used = new Set<string>();
  assert.equal(
    sanitizeUniqueZipFilename('Sourav Sen / Family', used, '.png'),
    'Sourav-Sen-Family.png'
  );
  assert.equal(
    sanitizeUniqueZipFilename('Sourav Sen / Family', used, '.png'),
    'Sourav-Sen-Family-2.png'
  );
  assert.equal(
    sanitizeUniqueZipFilename('   ', used, '.png'),
    'invitation-qr.png'
  );
});

test('dataUrlToUint8Array decodes base64 Data URLs cleanly', () => {
  const payload = 'Hello QR PNG';
  const b64 = Buffer.from(payload, 'utf8').toString('base64');
  const decoded = dataUrlToUint8Array(`data:image/png;base64,${b64}`);
  assert.equal(new TextDecoder().decode(decoded), payload);
});

test('buildZipBytes emits valid PKZIP structure with matching local headers, central directory, and EOCD', () => {
  const fileA = new TextEncoder().encode('PNG-CONTENT-A');
  const fileB = new TextEncoder().encode('PNG-CONTENT-B-LONGER');

  const zip = buildZipBytes(
    [
      { filename: 'guest-a-print-qr.png', data: fileA },
      { filename: 'guest-b-print-qr.png', data: fileB },
    ],
    new Date(2026, 10, 20, 12, 0, 0)
  );

  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  // Local file header #1 signature
  assert.equal(view.getUint32(0, true), 0x04034b50);
  // Check uncompressed size of entry #1
  assert.equal(view.getUint32(22, true), fileA.length);
  // Check CRC-32 of entry #1
  assert.equal(view.getUint32(14, true), computeCrc32(fileA));

  // EOCD record is the last 22 bytes (no comment)
  const eocdOffset = zip.length - 22;
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  assert.equal(view.getUint16(eocdOffset + 8, true), 2); // entries on disk
  assert.equal(view.getUint16(eocdOffset + 10, true), 2); // total entries

  // Verify central directory signature at offset stored in EOCD
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  assert.equal(view.getUint32(cdOffset, true), 0x02014b50);
});
