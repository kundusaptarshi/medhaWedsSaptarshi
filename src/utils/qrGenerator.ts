import QRCode from 'qrcode';

const MAROON_DARK = '#4D0A14';
const IVORY_LIGHT = '#FDFBF7';
const GOLD_ACCENT = '#C89D54';
const INK_TEXT = '#2B1418';

/**
 * Generates a static, permanent, non-expiring PNG Data URL QR code
 * directly encoding the invitation URL with High error correction.
 */
export async function generateQrPngDataUrl(url: string, width = 1200): Promise<string> {
  return QRCode.toDataURL(url, {
    width,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: MAROON_DARK,
      light: IVORY_LIGHT,
    },
  });
}

/**
 * Generates a static, permanent vector SVG string of the QR code alone.
 */
export async function generateQrSvgString(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: MAROON_DARK,
      light: IVORY_LIGHT,
    },
  });
}

/**
 * Wraps long guest names cleanly across multiple lines for print-ready cards.
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export interface PrintCardLayout {
  width: number;
  height: number;
  qrSize: number;
  qrY: number;
  frameBottom: number;
  nameStartY: number;
  nameLineHeight: number;
  promptY: number;
}

/**
 * Computes tight, optically balanced vertical positions for the print-ready QR card
 * so the guest name and scan prompt sit cohesively right beneath the QR frame.
 */
export function computePrintCardLayout(nameLineCount: number): PrintCardLayout {
  const safeLines = Math.max(1, Math.min(3, nameLineCount));
  const width = 1200;
  const qrSize = 780;
  const qrY = 276;
  const framePadding = 24;
  const frameBottom = qrY + qrSize + framePadding; // 1080
  const nameStartY = frameBottom + 64; // 1144
  const nameLineHeight = 56;
  const lastNameY = nameStartY + (safeLines - 1) * nameLineHeight;
  const promptY = lastNameY + 46;
  const height = promptY + 104;

  return {
    width,
    height,
    qrSize,
    qrY,
    frameBottom,
    nameStartY,
    nameLineHeight,
    promptY,
  };
}

export interface GenericPrintCardLayout {
  width: number;
  height: number;
  qrSize: number;
  qrY: number;
  frameBottom: number;
  promptY: number;
}

/**
 * Computes tight, optically balanced vertical positions for a generic (nameless)
 * print-ready QR card PNG with zero guest name text in the picture.
 */
export function computeGenericPrintCardLayout(): GenericPrintCardLayout {
  const width = 1200;
  const qrSize = 780;
  const qrY = 276;
  const framePadding = 24;
  const frameBottom = qrY + qrSize + framePadding; // 1080
  const promptY = frameBottom + 56; // 1136
  const height = promptY + 104; // 1240

  return {
    width,
    height,
    qrSize,
    qrY,
    frameBottom,
    promptY,
  };
}

/**
 * Renders a high-resolution print-ready generic luxury QR card PNG
 * featuring Medha Weds Saptarshi branding and maroon QR code with NO guest name in the picture.
 */
export async function generateGenericPrintCardPngDataUrl(url: string): Promise<string> {
  const { width, height, qrSize, qrY, promptY } = computeGenericPrintCardLayout();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return generateQrPngDataUrl(url, 1200);
  }

  // Warm ivory handmade-paper background
  ctx.fillStyle = IVORY_LIGHT;
  ctx.fillRect(0, 0, width, height);

  // Outer maroon & inner antique-gold hairline border
  ctx.strokeStyle = MAROON_DARK;
  ctx.lineWidth = 6;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  ctx.strokeStyle = GOLD_ACCENT;
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, width - 124, height - 124);

  // Decorative corner accents
  const cornerSize = 24;
  const corners: [number, number][] = [
    [62, 62],
    [width - 62, 62],
    [62, height - 62],
    [width - 62, height - 62],
  ];
  ctx.fillStyle = GOLD_ACCENT;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      cx === 62 ? cx + cornerSize : cx - cornerSize,
      cy === 62 ? cy + cornerSize : cy - cornerSize,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Top Header
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_ACCENT;
  ctx.font = '500 28px Georgia, serif';
  ctx.fillText('SHUBHO BIBAHO', width / 2, 134);

  ctx.fillStyle = MAROON_DARK;
  ctx.font = '600 58px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Medha Weds Saptarshi', width / 2, 206);

  // Subtle gold hairline rule
  ctx.strokeStyle = GOLD_ACCENT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 140, 236);
  ctx.lineTo(width / 2 + 140, 236);
  ctx.stroke();

  // Draw crisp static QR code
  const qrDataUrl = await generateQrPngDataUrl(url, qrSize);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const qrX = (width - qrSize) / 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
      ctx.strokeStyle = 'rgba(200, 157, 84, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      resolve();
    };
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  // Footer scan prompt placed snugly below QR frame (no guest name in picture)
  ctx.fillStyle = '#7A6265';
  ctx.font = '400 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Scan to open your wedding invitation', width / 2, promptY);

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Renders a high-resolution print-ready luxury QR card PNG
 * featuring Medha Weds Saptarshi branding, maroon QR code, and guest name(s) underneath.
 */
export async function generatePrintCardPngDataUrl(
  url: string,
  guestDisplayName: string
): Promise<string> {
  const width = 1200;
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) {
    return generateQrPngDataUrl(url, 1200);
  }

  measureCtx.font = '600 50px "Cormorant Garamond", Georgia, serif';
  const lines = wrapTextLines(measureCtx, guestDisplayName, width - 200, 3);
  const layout = computePrintCardLayout(lines.length);
  const { height, qrSize, qrY, nameStartY, nameLineHeight, promptY } = layout;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return generateQrPngDataUrl(url, 1200);
  }

  // Warm ivory handmade-paper background
  ctx.fillStyle = IVORY_LIGHT;
  ctx.fillRect(0, 0, width, height);

  // Outer maroon & inner antique-gold hairline border
  ctx.strokeStyle = MAROON_DARK;
  ctx.lineWidth = 6;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  ctx.strokeStyle = GOLD_ACCENT;
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, width - 124, height - 124);

  // Decorative corner accents
  const cornerSize = 24;
  const corners: [number, number][] = [
    [62, 62],
    [width - 62, 62],
    [62, height - 62],
    [width - 62, height - 62],
  ];
  ctx.fillStyle = GOLD_ACCENT;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      cx === 62 ? cx + cornerSize : cx - cornerSize,
      cy === 62 ? cy + cornerSize : cy - cornerSize,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Top Header
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_ACCENT;
  ctx.font = '500 28px Georgia, serif';
  ctx.fillText('SHUBHO BIBAHO', width / 2, 134);

  ctx.fillStyle = MAROON_DARK;
  ctx.font = '600 58px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Medha Weds Saptarshi', width / 2, 206);

  // Subtle gold hairline rule
  ctx.strokeStyle = GOLD_ACCENT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 140, 236);
  ctx.lineTo(width / 2 + 140, 236);
  ctx.stroke();

  // Draw crisp static QR code
  const qrDataUrl = await generateQrPngDataUrl(url, qrSize);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const qrX = (width - qrSize) / 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
      ctx.strokeStyle = 'rgba(200, 157, 84, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      resolve();
    };
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  // Guest name(s) tightly centered underneath QR code
  ctx.fillStyle = INK_TEXT;
  ctx.font = '600 50px "Cormorant Garamond", Georgia, serif';
  lines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, nameStartY + idx * nameLineHeight);
  });

  // Footer scan prompt placed snugly below guest name(s)
  ctx.fillStyle = '#7A6265';
  ctx.font = '400 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Scan to open your personal wedding invitation', width / 2, promptY);

  return canvas.toDataURL('image/png', 1.0);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function splitSvgLines(text: string, maxChars = 28): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

/**
 * Generates a print-ready vector SVG card with maroon/gold framing,
 * embedded static QR matrix, and guest name(s) printed underneath.
 */
export async function generatePrintCardSvgString(
  url: string,
  guestDisplayName: string
): Promise<string> {
  const rawQrSvg = await generateQrSvgString(url);
  const viewBoxMatch = rawQrSvg.match(/viewBox="([^"]+)"/);
  const qrViewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 41 41';
  const innerContent = rawQrSvg
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');

  const nameLines = splitSvgLines(guestDisplayName, 30);
  const { width, height, qrSize, qrY, nameStartY, nameLineHeight, promptY } =
    computePrintCardLayout(nameLines.length);
  const qrX = (width - qrSize) / 2;

  const nameMarkup = nameLines
    .map(
      (line, idx) =>
        `<text x="600" y="${nameStartY + idx * nameLineHeight}" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-weight="600" fill="${INK_TEXT}">${escapeXml(line)}</text>`
    )
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${IVORY_LIGHT}" />
  <rect x="44" y="44" width="${width - 88}" height="${height - 88}" fill="none" stroke="${MAROON_DARK}" stroke-width="6" />
  <rect x="62" y="62" width="${width - 124}" height="${height - 124}" fill="none" stroke="${GOLD_ACCENT}" stroke-width="2" />
  <text x="600" y="134" text-anchor="middle" font-family="Georgia, serif" font-size="26" letter-spacing="4" fill="${GOLD_ACCENT}">SHUBHO BIBAHO</text>
  <text x="600" y="206" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="600" fill="${MAROON_DARK}">Medha Weds Saptarshi</text>
  <line x1="460" y1="236" x2="740" y2="236" stroke="${GOLD_ACCENT}" stroke-width="1.5" />
  <rect x="${qrX - 24}" y="${qrY - 24}" width="${qrSize + 48}" height="${qrSize + 48}" fill="#FFFFFF" stroke="${GOLD_ACCENT}" stroke-opacity="0.45" stroke-width="2" />
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}">
    ${innerContent}
  </svg>
  ${nameMarkup}
  <text x="600" y="${promptY}" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#7A6265">Scan to open your personal wedding invitation</text>
</svg>`;
}

/**
 * Triggers a browser file download from either a Data URL or raw text content (SVG).
 */
export function downloadFile(content: string, filename: string, mimeType?: string): void {
  const link = document.createElement('a');
  let revokeUrl: string | null = null;

  if (content.startsWith('data:')) {
    link.href = content;
  } else {
    const blob = new Blob([content], { type: mimeType ?? 'image/svg+xml;charset=utf-8' });
    revokeUrl = URL.createObjectURL(blob);
    link.href = revokeUrl;
  }

  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (revokeUrl) {
    setTimeout(() => URL.revokeObjectURL(revokeUrl), 2000);
  }
}

/**
 * Synchronously checks whether the current browser supports Web Share API with PNG files
 * (e.g., iOS Safari, Android Chrome — lets WhatsApp receive both QR image and message+link together).
 */
export function supportsNativeFileShare(): boolean {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function' ||
    typeof File === 'undefined'
  ) {
    return false;
  }
  try {
    const probe = new File([new Uint8Array([1])], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

async function dataUrlToPngBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Generates the guest's print-ready QR PNG (or nameless generic QR PNG) and shares it
 * along with the WhatsApp message & link through the OS share sheet (mobile/supported browsers).
 */
export async function sharePrintQrViaNativeSheet(params: {
  url: string;
  slug: string;
  displayGuestName?: string;
  message: string;
  isGeneric?: boolean;
}): Promise<'shared' | 'cancelled' | 'unsupported'> {
  const { url, slug, displayGuestName, message, isGeneric } = params;
  const dataUrl = isGeneric
    ? await generateGenericPrintCardPngDataUrl(url)
    : await generatePrintCardPngDataUrl(url, displayGuestName ?? '');
  const blob = await dataUrlToPngBlob(dataUrl);
  const filename = isGeneric
    ? 'MedhaWedsSaptarshi-generic-qr.png'
    : `${slug}-print-qr.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
    return 'unsupported';
  }

  try {
    await navigator.share({
      title: isGeneric
        ? 'Medha Weds Saptarshi — Wedding Invitation'
        : `${displayGuestName} — Medha Weds Saptarshi`,
      text: message,
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

/**
 * Prepares the print-ready QR PNG (or nameless generic QR PNG) alongside opening WhatsApp's
 * contact picker on desktop: copies the PNG directly to the clipboard so Ctrl/Cmd+V attaches it
 * inside the chosen WhatsApp chat, or falls back to downloading the PNG if clipboard write is unavailable.
 */
export async function prepareQrForDesktopWhatsApp(params: {
  url: string;
  slug: string;
  displayGuestName?: string;
  isGeneric?: boolean;
}): Promise<'copied' | 'downloaded'> {
  const { url, slug, displayGuestName, isGeneric } = params;
  const dataUrl = isGeneric
    ? await generateGenericPrintCardPngDataUrl(url)
    : await generatePrintCardPngDataUrl(url, displayGuestName ?? '');
  const filename = isGeneric
    ? 'MedhaWedsSaptarshi-generic-qr.png'
    : `${slug}-print-qr.png`;

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function' &&
      typeof ClipboardItem !== 'undefined'
    ) {
      const blob = await dataUrlToPngBlob(dataUrl);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 'copied';
    }
  } catch {
    // Fall through to PNG download if clipboard image write is blocked
  }

  downloadFile(dataUrl, filename);
  return 'downloaded';
}
