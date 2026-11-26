import React from 'react';
import sealLogoInlineSrc from '../assets/wedding_logo_seal.webp?inline';

// Retain a module-level pre-decoded Image instance so the inline WebP logo is
// guaranteed ready in browser image memory before the wax seal's very first paint.
let preloadedSealLogoImg: HTMLImageElement | null = null;
let sealLogoDecodePromise: Promise<void> | null = null;

if (typeof window !== 'undefined') {
  const img = new window.Image();
  img.decoding = 'sync';
  img.src = sealLogoInlineSrc;
  preloadedSealLogoImg = img;
  sealLogoDecodePromise =
    typeof img.decode === 'function'
      ? img.decode().catch(() => {})
      : new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
}

/**
 * Resolves once the inline wax seal monogram bitmap has finished decoding
 * (bounded by a short safety timeout so initial render can never stall).
 */
export function ensureSealLogoDecoded(maxWaitMs = 80): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !sealLogoDecodePromise ||
    (preloadedSealLogoImg?.complete && preloadedSealLogoImg.naturalWidth > 0)
  ) {
    return Promise.resolve();
  }
  return Promise.race([
    sealLogoDecodePromise,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, maxWaitMs);
    }),
  ]);
}


interface CornerBracketProps {
  position: 'tl' | 'tr' | 'bl' | 'br';
  className?: string;
}

/**
 * Ornate gold corner filigree bracket used to frame the royal seal curtain,
 * maroon hero, and ivory invitation card.
 */
export const CornerBracket: React.FC<CornerBracketProps> = ({
  position,
  className = '',
}) => {
  const rotation =
    position === 'tl'
      ? ''
      : position === 'tr'
        ? 'scale-x-[-1]'
        : position === 'bl'
          ? 'scale-y-[-1]'
          : 'scale-x-[-1] scale-y-[-1]';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`${rotation} ${className}`}
    >
      <path
        d="M4 60V16C4 9.373 9.373 4 16 4H60"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.85"
      />
      <path
        d="M10 54V18C10 13.582 13.582 10 18 10H54"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeOpacity="0.55"
      />
      <path
        d="M16 16C20 12 25 12 28 16C25 20 20 20 16 16Z"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.75"
      />
      <path
        d="M16 16C12 20 12 25 16 28C20 25 20 20 16 16Z"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeOpacity="0.75"
      />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" fillOpacity="0.85" />
    </svg>
  );
};

/**
 * Small symmetrical Bengali lotus emblem placed atop editorial cards and closing blessings.
 */
export const LotusEmblem: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M32 4C35 12 36 20 32 28C28 20 29 12 32 4Z"
      fill="currentColor"
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth="1.1"
    />
    <path
      d="M32 28C23 24 19 16 21 9C26 12 30 19 32 28Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.05"
    />
    <path
      d="M32 28C41 24 45 16 43 9C38 12 34 19 32 28Z"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.05"
    />
    <path
      d="M32 28C20 29 12 24 10 17C17 17 24 21 32 28Z"
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity="0.75"
    />
    <path
      d="M32 28C44 29 52 24 54 17C47 17 40 21 32 28Z"
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity="0.75"
    />
    <circle cx="32" cy="31.5" r="2" fill="currentColor" />
  </svg>
);

interface PetalSpec {
  left: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
  accent: string;
  rotate: number;
  kind: 'leaf' | 'petal';
}

const PETAL_SPECS: PetalSpec[] = [
  { left: '4%', size: 15, delay: '-1s', duration: '15s', color: '#D48C2E', accent: '#F6DCA2', rotate: 18, kind: 'leaf' },
  { left: '11%', size: 12, delay: '-6s', duration: '19s', color: '#B23232', accent: '#F4C6C6', rotate: -28, kind: 'petal' },
  { left: '18%', size: 16, delay: '-11s', duration: '17s', color: '#C89D54', accent: '#FFF3CF', rotate: 34, kind: 'leaf' },
  { left: '25%', size: 13, delay: '-3s', duration: '21s', color: '#D9822B', accent: '#FCE4B8', rotate: -16, kind: 'petal' },
  { left: '33%', size: 15, delay: '-9s', duration: '16s', color: '#9E2A2B', accent: '#EFC2C2', rotate: 24, kind: 'leaf' },
  { left: '41%', size: 11, delay: '-14s', duration: '20s', color: '#DFBE7B', accent: '#FFFDF5', rotate: -34, kind: 'petal' },
  { left: '49%', size: 16, delay: '-4s', duration: '18s', color: '#C9892C', accent: '#F8E1AC', rotate: 20, kind: 'leaf' },
  { left: '57%', size: 12, delay: '-12s', duration: '17s', color: '#A9282D', accent: '#F2C0C0', rotate: -22, kind: 'petal' },
  { left: '65%', size: 15, delay: '-2s', duration: '21s', color: '#B88435', accent: '#F7E5B7', rotate: 30, kind: 'leaf' },
  { left: '73%', size: 13, delay: '-8s', duration: '16s', color: '#E09F3E', accent: '#FFF1CC', rotate: -18, kind: 'petal' },
  { left: '81%', size: 16, delay: '-13s', duration: '19s', color: '#9E2A2B', accent: '#ECC0C0', rotate: 26, kind: 'leaf' },
  { left: '88%', size: 12, delay: '-5s', duration: '18s', color: '#D47B2C', accent: '#FBE0B4', rotate: -32, kind: 'petal' },
  { left: '95%', size: 15, delay: '-10s', duration: '15.5s', color: '#C89D54', accent: '#FFF6D8', rotate: 16, kind: 'leaf' },
  { left: '29%', size: 11, delay: '-16s', duration: '22s', color: '#B23232', accent: '#F2C6C6', rotate: 40, kind: 'petal' },
  { left: '61%', size: 14, delay: '-7.5s', duration: '20.5s', color: '#D48C2E', accent: '#F8DFAA', rotate: -25, kind: 'leaf' },
  { left: '77%', size: 11, delay: '-15s', duration: '18.5s', color: '#DFBE7B', accent: '#FFFDF5', rotate: 22, kind: 'petal' },
];

/**
 * Continuous silk overlay of gently fluttering autumn-gold leaves and crimson/marigold
 * petals drifting across every section of the invitation website.
 */
export const FallingPetals: React.FC<{ variant?: 'dark' | 'light' }> = ({
  variant = 'light',
}) => (
  <div
    aria-hidden="true"
    data-testid="falling-leaves-overlay"
    className="pointer-events-none fixed inset-0 z-[45] overflow-hidden"
  >
    {PETAL_SPECS.map((petal, idx) => (
      <span
        key={idx}
        className="invite-petal absolute -top-8 block"
        style={{
          left: petal.left,
          animationDelay: petal.delay,
          animationDuration: petal.duration,
          opacity: variant === 'dark' ? 0.68 : 0.72,
        }}
      >
        {petal.kind === 'leaf' ? (
          <svg
            width={petal.size}
            height={Math.round(petal.size * 1.55)}
            viewBox="0 0 18 28"
            fill="none"
            style={{ transform: `rotate(${petal.rotate}deg)` }}
          >
            {/* Delicate botanical leaf silhouette with midrib & side veins */}
            <path
              d="M9 1.5C14.5 6.2 16.8 13.4 9 24.2C1.2 13.4 3.5 6.2 9 1.5Z"
              fill={petal.color}
              fillOpacity="0.88"
            />
            <path
              d="M9 2.8V26.5"
              stroke={petal.accent}
              strokeWidth="0.85"
              strokeLinecap="round"
              strokeOpacity="0.7"
            />
            <path
              d="M9 10L13 7.5M9 14.5L5 11.8M9 18L12.6 15.6"
              stroke={petal.accent}
              strokeWidth="0.65"
              strokeLinecap="round"
              strokeOpacity="0.55"
            />
          </svg>
        ) : (
          <svg
            width={petal.size}
            height={Math.round(petal.size * 1.45)}
            viewBox="0 0 14 20"
            fill="none"
            style={{ transform: `rotate(${petal.rotate}deg)` }}
          >
            <path
              d="M7 1C11.2 5.4 13.2 11 7 19C0.8 11 2.8 5.4 7 1Z"
              fill={petal.color}
              fillOpacity="0.85"
            />
            <path
              d="M7 3C8.5 7 9 11 7 16"
              stroke={petal.accent}
              strokeWidth="0.7"
              strokeOpacity="0.55"
            />
          </svg>
        )}
      </span>
    ))}
  </div>
);

/**
 * Interactive crimson & antique-gold scalloped wax seal embossed with the couple's monogram wreath.
 * Uses an inline pre-decoded WebP logo so it appears instantaneously with zero network latency.
 */
export const RoyalWaxSeal: React.FC<{
  onOpen: () => void;
  disabled?: boolean;
  sizeClassName?: string;
  ringOffsetClassName?: string;
}> = ({
  onOpen,
  disabled = false,
  sizeClassName = 'w-36 h-36 sm:w-40 sm:h-40',
  ringOffsetClassName = 'focus-visible:ring-offset-[#4D0A14]',
}) => {
  const notches = Array.from({ length: 24 }, (_, i) => i * 15);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      data-testid="open-seal-button"
      aria-label="Tap the seal to open wedding invitation"
      className={`group relative flex items-center justify-center ${sizeClassName} rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DFBE7B] focus-visible:ring-offset-4 ${ringOffsetClassName} cursor-pointer transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.06] active:scale-95 disabled:cursor-default`}
    >
      {/* Subtle outer antique-gold breathing halo */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 rounded-full border-[1.5px] border-[#EED49B]/70 invite-seal-pulse"
      />
      {/* Soft warm gold back-rim glow separating the wax seal cleanly from the dark velvet curtain */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 rounded-full shadow-[0_0_32px_rgba(232,202,136,0.32)]"
      />
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full h-full drop-shadow-[0_14px_28px_rgba(14,1,4,0.78)] group-hover:drop-shadow-[0_18px_34px_rgba(14,1,4,0.88)] transition-[filter] duration-300"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="waxSealGrad" cx="36%" cy="28%" r="74%">
            <stop offset="0%" stopColor="#D63B42" />
            <stop offset="45%" stopColor="#A31C28" />
            <stop offset="84%" stopColor="#6E0F1B" />
            <stop offset="100%" stopColor="#4B0710" />
          </radialGradient>
          <radialGradient id="waxSealInnerWell" cx="50%" cy="46%" r="56%">
            <stop offset="0%" stopColor="#991A27" />
            <stop offset="74%" stopColor="#75111C" />
            <stop offset="100%" stopColor="#520912" />
          </radialGradient>
          <linearGradient id="waxSealSheen" x1="16%" y1="10%" x2="80%" y2="88%">
            <stop offset="0%" stopColor="#FFF0C8" stopOpacity="0.34" />
            <stop offset="38%" stopColor="#FFE6B8" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#1B0205" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Scalloped outer pressed-wax rim */}
        {notches.map((deg) => (
          <circle
            key={deg}
            cx="80"
            cy="12"
            r="6.4"
            fill="#8A1622"
            stroke="#EED49B"
            strokeWidth="0.9"
            strokeOpacity="0.88"
            transform={`rotate(${deg} 80 80)`}
          />
        ))}

        {/* Main raised wax body */}
        <circle
          cx="80"
          cy="80"
          r="66"
          fill="url(#waxSealGrad)"
          stroke="#EED49B"
          strokeWidth="2.2"
        />
        {/* Recessed stamped wax inner well */}
        <circle
          cx="80"
          cy="80"
          r="56"
          fill="url(#waxSealInnerWell)"
          stroke="#EED49B"
          strokeWidth="1.2"
          strokeOpacity="0.86"
        />
        {/* Subtle specular highlight across wax */}
        <circle cx="80" cy="80" r="65" fill="url(#waxSealSheen)" />
        <circle
          cx="80"
          cy="80"
          r="60.5"
          stroke="#F3DDA8"
          strokeWidth="1.05"
          strokeDasharray="2.6 3.4"
          strokeOpacity="0.86"
        />
      </svg>

      {/* Couple monogram & botanical wreath logo — inline pre-decoded WebP for instant 0ms paint */}
      <span className="absolute inset-0 flex items-center justify-center p-[16%] select-none pointer-events-none">
        <img
          src={sealLogoInlineSrc}
          alt="Medha & Saptarshi Logo"
          width={340}
          height={340}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(20,2,5,0.65)] brightness-[1.22] contrast-[1.08]"
        />
      </span>
    </button>
  );
};

/**
 * Same botanical monogram wreath emblem used on the royal invitation wax seal,
 * rendered cleanly on warm ivory/gold parchment directly above the Sacred Yagya Bonfire.
 */
export const SealMonogramCrest: React.FC<{
  className?: string;
  animate?: boolean;
  testId?: string;
}> = ({
  className = 'w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-52 lg:h-52',
  animate = true,
  testId = 'bonfire-seal-monogram',
}) => (
  <div
    data-testid={testId}
    className={`relative flex items-center justify-center select-none shrink-0 ${className}`}
  >
    {/* Subtle warm radial parchment halo elevating the embossed antique-gold wreath */}
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -inset-2 rounded-full ${
        animate ? 'animate-hero-aura' : ''
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 50%, rgba(255, 250, 228, 0.85) 0%, rgba(223, 190, 123, 0.22) 54%, transparent 76%)',
      }}
    />
    <img
      src={sealLogoInlineSrc}
      alt="Medha & Saptarshi Monogram Crest"
      width={340}
      height={340}
      loading="eager"
      decoding="sync"
      draggable={false}
      className="relative z-10 w-full h-full object-contain brightness-[0.80] contrast-[1.18] saturate-[1.12] drop-shadow-[0_3px_10px_rgba(77,10,20,0.14)]"
    />
  </div>
);

/**
 * Bespoke Bengali cultural SVG medallion illustrations for each of the 6 wedding events,
 * displayed opposite each event card along the vertical celebration timeline.
 */
export const EventMedallionIllustration: React.FC<{
  eventId: string;
  className?: string;
}> = ({ eventId, className = 'w-44 h-44 sm:w-52 sm:h-52' }) => {
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center mx-auto ${className}`}
    >
      {/* Concentric dashed antique-gold decorative rings */}
      <svg
        viewBox="0 0 220 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle
          cx="110"
          cy="110"
          r="102"
          stroke="#DFBE7B"
          strokeWidth="0.9"
          strokeDasharray="3 5"
          strokeOpacity="0.6"
        />
        <circle
          cx="110"
          cy="110"
          r="84"
          fill="#FFF9E2"
          fillOpacity="0.85"
          stroke="#DFBE7B"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        <circle
          cx="110"
          cy="110"
          r="66"
          stroke="#C89D54"
          strokeWidth="0.75"
          strokeOpacity="0.4"
        />

        {eventId === 'mehendi-cocktail' && (
          <g>
            {/* Ornate Henna Paisley & Coupe Glass Celebration Motif */}
            <path
              d="M90 132 C76 116 78 90 96 76 C106 68 118 72 118 82 C118 90 110 92 106 88 C100 96 104 114 118 122 C110 132 98 138 90 132 Z"
              fill="#9E2A2B"
              fillOpacity="0.16"
              stroke="#7F1924"
              strokeWidth="1.6"
            />
            <circle cx="96" cy="96" r="4.5" stroke="#C89D54" strokeWidth="1.2" />
            <circle cx="96" cy="96" r="1.5" fill="#9E2A2B" />
            {/* Cocktail coupe */}
            <path
              d="M114 96 H144 L132 112 H126 Z"
              fill="#DFBE7B"
              fillOpacity="0.45"
              stroke="#7F1924"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="129" y1="112" x2="129" y2="136" stroke="#7F1924" strokeWidth="1.6" />
            <line x1="119" y1="136" x2="139" y2="136" stroke="#7F1924" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="137" cy="88" r="3" fill="#C89D54" />
            <circle cx="122" cy="84" r="2" fill="#9E2A2B" fillOpacity="0.7" />
          </g>
        )}

        {eventId === 'aiburobhat' && (
          <g>
            {/* Traditional Bengali Silver Kansha Thala with Bowls & Rice */}
            <ellipse
              cx="110"
              cy="122"
              rx="46"
              ry="24"
              fill="#FFFFFF"
              stroke="#C89D54"
              strokeWidth="1.8"
            />
            <ellipse
              cx="110"
              cy="122"
              rx="38"
              ry="18"
              stroke="#DFBE7B"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            {/* Steaming rice mound */}
            <path
              d="M95 124 C95 111 125 111 125 124 Z"
              fill="#FAF5EC"
              stroke="#9E2A2B"
              strokeWidth="1.4"
            />
            {/* Side katoris (bowls of shukto, payesh, dal) */}
            <ellipse cx="86" cy="112" rx="9" ry="5" fill="#E09F3E" fillOpacity="0.65" stroke="#7F1924" strokeWidth="1.2" />
            <ellipse cx="134" cy="112" rx="9" ry="5" fill="#9E2A2B" fillOpacity="0.45" stroke="#7F1924" strokeWidth="1.2" />
            <ellipse cx="110" cy="100" rx="10" ry="5.5" fill="#DFBE7B" fillOpacity="0.6" stroke="#7F1924" strokeWidth="1.2" />
            {/* Subtle steam curls */}
            <path d="M104 88 C102 83 106 80 104 75" stroke="#C89D54" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M116 88 C114 83 118 80 116 75" stroke="#C89D54" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        )}

        {eventId === 'haldi' && (
          <g>
            {/* Brass Turmeric Bowl & Marigold Blossoms */}
            <path
              d="M78 114 H142 C140 134 126 144 110 144 C94 144 80 134 78 114 Z"
              fill="#C89D54"
              fillOpacity="0.28"
              stroke="#7F1924"
              strokeWidth="1.6"
            />
            <ellipse
              cx="110"
              cy="114"
              rx="32"
              ry="9"
              fill="#E7A726"
              fillOpacity="0.85"
              stroke="#7F1924"
              strokeWidth="1.4"
            />
            {/* Mango leaves */}
            <path d="M84 106 C74 96 76 84 86 82 C92 88 92 98 84 106 Z" fill="#4D7C4D" fillOpacity="0.5" stroke="#365936" strokeWidth="1.1" />
            <path d="M136 106 C146 96 144 84 134 82 C128 88 128 98 136 106 Z" fill="#4D7C4D" fillOpacity="0.5" stroke="#365936" strokeWidth="1.1" />
            {/* Marigold flower */}
            <circle cx="110" cy="88" r="13" fill="#E7A726" fillOpacity="0.8" stroke="#9E2A2B" strokeWidth="1.2" />
            <circle cx="110" cy="88" r="6" fill="#FAF5EC" stroke="#9E2A2B" strokeWidth="1" />
            <circle cx="94" cy="96" r="6" fill="#E09F3E" fillOpacity="0.7" />
            <circle cx="126" cy="96" r="6" fill="#E09F3E" fillOpacity="0.7" />
          </g>
        )}

        {eventId === 'wedding' && (
          <g>
            {/* Bengali Topor (Groom) & Mukut (Bride) with Sacred Lotus */}
            {/* Topor spire */}
            <path
              d="M84 128 L96 78 L108 128 Z"
              fill="#FFFDF9"
              stroke="#7F1924"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M80 128 Q96 120 112 128"
              stroke="#C89D54"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="96" cy="74" r="3" fill="#C89D54" />
            {/* Mukut tiara */}
            <path
              d="M112 126 C114 106 122 96 128 92 C134 96 142 106 144 126 Z"
              fill="#FAF1E4"
              stroke="#9E2A2B"
              strokeWidth="1.5"
            />
            <path d="M116 118 Q128 110 140 118" stroke="#C89D54" strokeWidth="1.4" />
            <circle cx="128" cy="105" r="3.5" fill="#9E2A2B" />
            {/* Sacred union knot beneath */}
            <path d="M90 138 Q110 148 130 138" stroke="#9E2A2B" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="110" cy="143" r="3" fill="#C89D54" />
          </g>
        )}

        {eventId === 'boubhat' && (
          <g>
            {/* Traditional Paan Leaf, Shankha-Pola & Welcome Diya */}
            {/* Betel leaf (Paan) */}
            <path
              d="M110 74 C132 86 138 112 110 136 C82 112 88 86 110 74 Z"
              fill="#4D7C4D"
              fillOpacity="0.24"
              stroke="#365936"
              strokeWidth="1.5"
            />
            <line x1="110" y1="76" x2="110" y2="134" stroke="#365936" strokeWidth="1" strokeOpacity="0.7" />
            {/* Shankha (white) & Pola (red) bangles */}
            <circle cx="99" cy="116" r="14" stroke="#FFFDF9" strokeWidth="4" />
            <circle cx="99" cy="116" r="14" stroke="#C89D54" strokeWidth="1.2" />
            <circle cx="121" cy="116" r="14" stroke="#9E2A2B" strokeWidth="3.5" />
            {/* Auspicious sindoor dots */}
            <circle cx="110" cy="96" r="3.5" fill="#9E2A2B" />
            <circle cx="102" cy="101" r="2" fill="#C89D54" />
            <circle cx="118" cy="101" r="2" fill="#C89D54" />
          </g>
        )}

        {eventId === 'reception' && (
          <g>
            {/* Festive Shehnai, Floral Arch & Evening Lantern Glow */}
            <path
              d="M78 134 V104 C78 86 92 74 110 74 C128 74 142 86 142 104 V134"
              stroke="#C89D54"
              strokeWidth="1.6"
              strokeDasharray="3 3"
            />
            {/* Hanging celebratory chandelier / lamp */}
            <line x1="110" y1="74" x2="110" y2="96" stroke="#7F1924" strokeWidth="1.4" />
            <path
              d="M98 106 C98 96 122 96 122 106 L116 120 H104 Z"
              fill="#DFBE7B"
              fillOpacity="0.55"
              stroke="#7F1924"
              strokeWidth="1.5"
            />
            <circle cx="110" cy="110" r="4" fill="#9E2A2B" />
            {/* Twin celebratory flutes / stars */}
            <path d="M90 132 L130 132" stroke="#7F1924" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="90" cy="108" r="2.5" fill="#C89D54" />
            <circle cx="130" cy="108" r="2.5" fill="#C89D54" />
            <circle cx="110" cy="132" r="3.5" fill="#DFBE7B" stroke="#7F1924" strokeWidth="1.2" />
          </g>
        )}
      </svg>
    </div>
  );
};

const DEFAULT_GROOM_FIGURE_SRC = '/assets/aistudio/IMG_5337_69da38d3.png';
const DEFAULT_BRIDE_FIGURE_SRC = '/assets/aistudio/IMG_5338_ef8e9903.png';

interface CoupleSideFigureProps {
  side: 'groom' | 'bride';
  name: string;
  parentage?: React.ReactNode;
  imageSrc?: string;
  animate?: boolean;
  imageScale?: number;
}

/**
 * Custom illustrated Bengali Groom (Saptarshi) & Bride (Medha) standing figures
 * flanking the "Us Through The Years" horizontal image carousel, with lifelike grounded
 * standing idle animations (gentle breathing, poised sway, and synchronized shadow).
 */
export const CoupleSideFigure: React.FC<CoupleSideFigureProps> = ({
  side,
  name,
  parentage,
  imageSrc,
  animate = true,
  imageScale,
}) => {
  const isGroom = side === 'groom';
  const resolvedSrc =
    imageSrc ?? (isGroom ? DEFAULT_GROOM_FIGURE_SRC : DEFAULT_BRIDE_FIGURE_SRC);
  const resolvedScale = imageScale ?? 1;

  return (
    <div
      data-testid={`couple-figure-${side}`}
      className="group flex flex-col items-center select-none w-full min-w-0"
    >
      <div className="relative h-[clamp(210px,min(44dvh,94vw),385px)] sm:h-[clamp(255px,48dvh,435px)] md:h-[clamp(265px,53dvh,495px)] lg:h-[clamp(285px,56.5dvh,545px)] xl:h-[clamp(305px,58.5dvh,560px)] w-full flex items-end justify-center">
        {/* Soft warm golden halo behind the standing figure */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-[clamp(118px,24dvh,275px)] top-[10%] bottom-[8%] rounded-full opacity-75"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(255, 246, 200, 0.72) 0%, rgba(235, 194, 96, 0.18) 52%, transparent 74%)',
          }}
        />

        {/* Delicate floating gold accent sparkles near crown & garland */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`pointer-events-none absolute top-[10%] left-[18%] w-3.5 h-3.5 text-[#C89D54] ${
            animate ? 'animate-sparkle-twinkle' : ''
          }`}
          style={{ animationDelay: isGroom ? '-0.6s' : '-2.1s' }}
        >
          <path
            d="M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8L12 1.5Z"
            fill="currentColor"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`pointer-events-none absolute top-[24%] right-[16%] w-2.5 h-2.5 text-[#D89B34] ${
            animate ? 'animate-sparkle-twinkle' : ''
          }`}
          style={{ animationDelay: isGroom ? '-2.4s' : '-0.9s' }}
        >
          <path
            d="M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8L12 1.5Z"
            fill="currentColor"
          />
        </svg>

        {/* Grounded breathing foot shadow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 w-[clamp(84px,16dvh,190px)] h-4 rounded-full ${
            animate
              ? isGroom
                ? 'animate-figure-shadow-groom'
                : 'animate-figure-shadow-bride'
              : ''
          }`}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(110, 24, 34, 0.24) 0%, rgba(160, 108, 38, 0.12) 48%, transparent 74%)',
          }}
        />

        {/* Animated standing figure anchored at the feet */}
        <div
          className={`relative z-10 w-full h-full flex items-end justify-center ${
            animate
              ? isGroom
                ? 'animate-figure-stand-groom'
                : 'animate-figure-stand-bride'
              : ''
          }`}
        >
          <div
            className="w-full h-full flex items-end justify-center origin-bottom"
            style={resolvedScale !== 1 ? { transform: `scale(${resolvedScale})` } : undefined}
          >
            <img
              src={resolvedSrc}
              alt={`${name} (${isGroom ? 'The Groom' : 'The Bride'})`}
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              draggable={false}
              className={`${
                isGroom ? 'h-full' : 'h-[91%]'
              } w-auto max-w-none object-contain object-bottom origin-bottom transition-transform duration-500 ease-out group-hover:scale-[1.03]`}
            />
          </div>
        </div>
      </div>

      <p className="mt-1.5 sm:mt-2 shrink-0 font-editorial text-[22px] sm:text-[28px] lg:text-[32px] font-medium text-[#4D0A14] leading-tight">
        {name}
      </p>
      <p className="mt-0.5 shrink-0 text-[9.5px] sm:text-[10.5px] font-medium tracking-[0.24em] uppercase text-[#8E7679]">
        {isGroom ? 'The Groom' : 'The Bride'}
      </p>
      {parentage && (
        <p
          data-testid={`couple-parentage-${side}`}
          className="mt-1 sm:mt-1.5 shrink-0 max-w-[144px] sm:max-w-[235px] lg:max-w-[260px] text-center text-[10.5px] sm:text-xs font-normal leading-snug text-[#4D0A14]"
        >
          {parentage}
        </p>
      )}
    </div>
  );
};

/**
 * Aesthetic animated Bengali wedding Yagya (Homagni) sacred fire altar placed
 * between Saptarshi and Medha (below the carousel on desktop and between the
 * characters on mobile).
 */
export const SacredYagyaBonfire: React.FC<{
  animate?: boolean;
  className?: string;
  testId?: string;
}> = ({
  animate = true,
  className = 'w-[72px] sm:w-[88px] h-[112px] sm:h-[128px]',
  testId = 'mobile-yagya-bonfire',
}) => {
  const uid = React.useId().replace(/:/g, '');
  const outerFlameId = `yagyaOuterFlame-${uid}`;
  const midFlameId = `yagyaMidFlame-${uid}`;
  const coreFlameId = `yagyaCoreFlame-${uid}`;
  const kundBodyId = `kundBodyGrad-${uid}`;
  const kundRimId = `kundGoldRim-${uid}`;

  return (
  <div
    data-testid={testId}
    aria-hidden="true"
    className={`relative flex flex-col items-center justify-end select-none shrink-0 ${className}`}
  >
    {/* Warm radiating golden-saffron firelight glow */}
    <div
      className={`pointer-events-none absolute inset-x-[-14px] top-1 bottom-3 rounded-full ${
        animate ? 'animate-yagya-glow' : ''
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 54%, rgba(251, 146, 60, 0.42) 0%, rgba(245, 158, 11, 0.2) 44%, transparent 72%)',
      }}
    />

    <svg
      viewBox="0 0 110 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="relative z-10 w-full h-full overflow-visible"
    >
      <defs>
        <linearGradient id={outerFlameId} x1="55" y1="22" x2="55" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="48%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id={midFlameId} x1="55" y1="36" x2="55" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="52%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id={coreFlameId} x1="55" y1="56" x2="55" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="60%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id={kundBodyId} x1="18" y1="96" x2="92" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9E2A2B" />
          <stop offset="55%" stopColor="#7A1821" />
          <stop offset="100%" stopColor="#4D0A14" />
        </linearGradient>
        <linearGradient id={kundRimId} x1="16" y1="94" x2="94" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C89D54" />
          <stop offset="50%" stopColor="#F3DA99" />
          <stop offset="100%" stopColor="#B78338" />
        </linearGradient>
      </defs>

      {/* Whisper-soft sacred incense/yagya smoke curls */}
      <g className={animate ? 'animate-yagya-smoke' : ''}>
        <path
          d="M52 34 C46 24 58 18 53 7"
          stroke="#C89D54"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeOpacity="0.45"
        />
      </g>
      <g
        className={animate ? 'animate-yagya-smoke' : ''}
        style={{ animationDelay: '-1.8s' }}
      >
        <path
          d="M61 38 C67 28 56 20 63 10"
          stroke="#DFBE7B"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />
      </g>

      {/* Rising golden embers */}
      <circle
        cx="46"
        cy="60"
        r="1.9"
        fill="#FDE047"
        className={animate ? 'animate-yagya-ember' : ''}
        style={{ animationDelay: '-0.2s' }}
      />
      <circle
        cx="64"
        cy="54"
        r="1.6"
        fill="#FDBA74"
        className={animate ? 'animate-yagya-ember' : ''}
        style={{ animationDelay: '-1.1s' }}
      />
      <circle
        cx="55"
        cy="48"
        r="2.1"
        fill="#FEF08A"
        className={animate ? 'animate-yagya-ember' : ''}
        style={{ animationDelay: '-1.9s' }}
      />
      <circle
        cx="39"
        cy="70"
        r="1.4"
        fill="#FB923C"
        className={animate ? 'animate-yagya-ember' : ''}
        style={{ animationDelay: '-0.7s' }}
      />
      <circle
        cx="70"
        cy="66"
        r="1.5"
        fill="#FDE047"
        className={animate ? 'animate-yagya-ember' : ''}
        style={{ animationDelay: '-1.5s' }}
      />

      {/* Multi-layered dancing sacred fire flames */}
      <g className={animate ? 'animate-yagya-flame-outer' : ''}>
        {/* Left & right side lick tongues */}
        <path
          d="M41 94 C31 82 32 68 41 59 C39 68 44 74 49 78 Z"
          fill="#EA580C"
          fillOpacity="0.92"
        />
        <path
          d="M69 94 C79 81 78 66 68 57 C70 66 66 74 61 78 Z"
          fill="#EA580C"
          fillOpacity="0.92"
        />
        {/* Primary outer flame */}
        <path
          d="M55 24 C67 42 78 58 75 78 C73 89 65 96 55 96 C45 96 37 89 35 78 C32 58 43 42 55 24 Z"
          fill={`url(#${outerFlameId})`}
        />
      </g>

      <g className={animate ? 'animate-yagya-flame-mid' : ''}>
        <path
          d="M55 38 C64 52 70 64 68 79 C66 89 61 95 55 95 C49 95 44 89 42 79 C40 64 46 52 55 38 Z"
          fill={`url(#${midFlameId})`}
        />
      </g>

      <g className={animate ? 'animate-yagya-flame-inner' : ''}>
        <path
          d="M55 56 C61 66 63 76 61 85 C60 91 58 95 55 95 C52 95 50 91 49 85 C47 76 49 66 55 56 Z"
          fill={`url(#${coreFlameId})`}
        />
      </g>

      {/* Criss-crossed sacred sandalwood logs nestled in the kund */}
      <g>
        <path
          d="M30 95 L79 88 L81 94 L32 101 Z"
          fill="#5C2816"
          stroke="#3E180B"
          strokeWidth="1"
        />
        <path
          d="M31 88 L80 96 L78 102 L29 94 Z"
          fill="#78351C"
          stroke="#3E180B"
          strokeWidth="1"
        />
        {/* Glowing ember highlights on the logs */}
        <ellipse cx="55" cy="94" rx="14" ry="3.5" fill="#F97316" fillOpacity="0.65" />
      </g>

      {/* Grounded shadow under the Yagya Kund */}
      <ellipse cx="55" cy="140" rx="42" ry="6" fill="#4D0A14" fillOpacity="0.22" />

      {/* Traditional 3-tier stepped Bengali Yagya Kund (Homakund) */}
      <g>
        {/* Top brass-trimmed basin rim */}
        <path
          d="M17 95 H93 L88 103 H22 Z"
          fill={`url(#${kundRimId})`}
          stroke="#6E4514"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Upper stepped crimson brick tier */}
        <path
          d="M22 103 H88 L84 115 H26 Z"
          fill={`url(#${kundBodyId})`}
          stroke="#DFBE7B"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {/* Middle stepped tier */}
        <path
          d="M19 115 H91 L87 127 H23 Z"
          fill={`url(#${kundBodyId})`}
          stroke="#DFBE7B"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {/* Lower ceremonial plinth */}
        <path
          d="M14 127 H96 L93 138 H17 Z"
          fill="#4D0A14"
          stroke="#DFBE7B"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Subtle golden Alpana lotus & diamond motif on front of kund */}
        <path
          d="M55 106 L58.5 109.5 L55 113 L51.5 109.5 Z"
          fill="#DFBE7B"
          fillOpacity="0.9"
        />
        <circle cx="40" cy="109.5" r="1.6" fill="#EAD29F" fillOpacity="0.8" />
        <circle cx="70" cy="109.5" r="1.6" fill="#EAD29F" fillOpacity="0.8" />

        <path
          d="M55 118 C57.5 120 58 122.5 55 124.5 C52 122.5 52.5 120 55 118 Z"
          fill="#F3DA99"
        />
        <path d="M35 121 H47 M63 121 H75" stroke="#DFBE7B" strokeWidth="0.9" strokeOpacity="0.7" strokeLinecap="round" />

        {/* Small auspicious marigold blossoms & mango leaves at plinth corners */}
        <ellipse cx="16" cy="135" rx="4.5" ry="2.2" transform="rotate(-24 16 135)" fill="#4D7C4D" />
        <ellipse cx="94" cy="135" rx="4.5" ry="2.2" transform="rotate(24 94 135)" fill="#4D7C4D" />
        <circle cx="22" cy="136" r="4.2" fill="#E7A726" stroke="#9E2A2B" strokeWidth="0.8" />
        <circle cx="22" cy="136" r="1.6" fill="#FEF08A" />
        <circle cx="88" cy="136" r="4.2" fill="#E7A726" stroke="#9E2A2B" strokeWidth="0.8" />
        <circle cx="88" cy="136" r="1.6" fill="#FEF08A" />
      </g>
    </svg>
  </div>
  );
};

export const RIYAN_WELCOME_FIGURE_SRC = '/assets/aistudio/IMG_5349_a1c8a53a.png';
export const PIHU_WELCOME_FIGURE_SRC = '/assets/aistudio/IMG_5348_37621313.png';

interface HeroWelcomeFigureProps {
  side: 'left' | 'right';
  name: string;
  roleLabel: string;
  imageSrc: string;
  animate?: boolean;
  imageScale?: number;
}

/**
 * Animated welcoming Nitbor (Riyan) & Nitkone (Pihu) figures in Namastey pose
 * flanking the bottom of the royal maroon Hero section.
 */
export const HeroWelcomeFigure: React.FC<HeroWelcomeFigureProps> = ({
  side,
  name,
  roleLabel,
  imageSrc,
  animate = true,
  imageScale = 1,
}) => {
  const isLeft = side === 'left';

  return (
    <figure
      data-testid={`hero-welcome-figure-${side}`}
      className="group flex flex-col items-center select-none m-0"
    >
      <div className="relative w-[min(100px,17dvh)] min-[380px]:w-[min(108px,18.5dvh)] sm:w-[min(154px,21dvh)] md:w-[min(176px,22dvh)] lg:w-[min(198px,23dvh)] max-w-full aspect-[3/4] flex items-end justify-center">
        {/* Soft luminous champagne-gold aura behind the figure on royal maroon */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-2 top-[12%] bottom-[8%] rounded-full ${
            animate ? 'animate-hero-aura' : ''
          }`}
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(255, 238, 192, 0.34) 0%, rgba(223, 190, 123, 0.14) 50%, transparent 74%)',
          }}
        />

        {/* Subtle golden accent sparkles flanking the welcoming namastey hands */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`pointer-events-none absolute top-[18%] ${
            isLeft ? 'left-[8%]' : 'right-[8%]'
          } w-3 h-3 text-[#EAD29F] ${animate ? 'animate-sparkle-twinkle' : ''}`}
          style={{ animationDelay: isLeft ? '-0.4s' : '-1.9s' }}
        >
          <path
            d="M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8L12 1.5Z"
            fill="currentColor"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`pointer-events-none absolute top-[34%] ${
            isLeft ? 'right-[6%]' : 'left-[6%]'
          } w-2.5 h-2.5 text-[#DFBE7B] ${animate ? 'animate-sparkle-twinkle' : ''}`}
          style={{ animationDelay: isLeft ? '-2.2s' : '-0.8s' }}
        >
          <path
            d="M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8L12 1.5Z"
            fill="currentColor"
          />
        </svg>

        {/* Grounded warm foot shadow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1 w-[58%] h-3.5 rounded-full ${
            animate
              ? isLeft
                ? 'animate-figure-shadow-groom'
                : 'animate-figure-shadow-bride'
              : ''
          }`}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(16, 2, 5, 0.55) 0%, rgba(223, 190, 123, 0.14) 55%, transparent 76%)',
          }}
        />

        {/* Animated figure in welcoming Namastey pose */}
        <div
          className={`relative z-10 w-full h-full flex items-end justify-center ${
            animate
              ? isLeft
                ? 'animate-hero-namastey-left'
                : 'animate-hero-namastey-right'
              : ''
          }`}
        >
          <div
            className="w-full h-full flex items-end justify-center origin-bottom"
            style={imageScale !== 1 ? { transform: `scale(${imageScale})` } : undefined}
          >
            <img
              src={imageSrc}
              alt={`${name} (${roleLabel}) welcoming guests with namastey`}
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              draggable={false}
              className="w-full h-full object-contain object-bottom origin-bottom drop-shadow-[0_10px_18px_rgba(24,3,7,0.45)] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          </div>
        </div>
      </div>

      <figcaption className="mt-1 sm:mt-1.5 text-center leading-tight">
        <span className="block font-editorial text-[18px] sm:text-2xl md:text-[26px] font-medium text-[#FAF5EC] tracking-wide">
          {name}
        </span>
        <span className="block mt-0.5 font-editorial italic text-[11px] min-[390px]:text-[12px] sm:text-[15px] text-[#EAD29F] tracking-wide whitespace-nowrap">
          ({roleLabel})
        </span>
      </figcaption>
    </figure>
  );
};

export const FAMILY_PORTRAIT_SRC = '/assets/aistudio/IMG_5377_ddd1c773.png';

/**
 * Illustrated family portrait of the Bhattacharya and Kundu families,
 * seated flush on a delicate antique-gold hairline with minimal breathing motion.
 */
export const FamilyPortraitFigure: React.FC<{ animate?: boolean }> = ({
  animate = true,
}) => (
  <div
    data-testid="closing-family-portrait"
    className="group relative mx-auto mt-1.5 sm:mt-2.5 [@media(max-height:740px)]:mt-1.5 w-full max-w-[280px] sm:max-w-[380px] md:max-w-[440px] flex flex-col items-center select-none"
  >
    {/* Subtle warm champagne-gold radial halo behind the family */}
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-4 top-[10%] bottom-1 rounded-full ${
        animate ? 'animate-hero-aura' : ''
      }`}
      style={{
        background:
          'radial-gradient(ellipse at 50% 62%, rgba(255, 248, 220, 0.88) 0%, rgba(223, 190, 123, 0.24) 52%, transparent 76%)',
      }}
    />

    {/* Delicate minimal gold sparkles framing the portrait */}
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`pointer-events-none absolute top-[8%] left-[4%] w-3 h-3 text-[#C89D54]/80 ${
        animate ? 'animate-sparkle-twinkle' : ''
      }`}
      style={{ animationDelay: '-0.6s' }}
    >
      <path
        d="M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8L12 1.5Z"
        fill="currentColor"
      />
    </svg>
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`pointer-events-none absolute top-[12%] right-[4%] w-2.5 h-2.5 text-[#DFBE7B] ${
        animate ? 'animate-sparkle-twinkle' : ''
      }`}
      style={{ animationDelay: '-2.1s' }}
    >
      <path
        d="M12 1.5L14.2 9.8L22.5 12L14.2 14.2L12 22.5L9.8 14.2L1.5 12L9.8 9.8L12 1.5Z"
        fill="currentColor"
      />
    </svg>

    {/* Family illustration anchored cleanly at its bottom edge */}
    <div
      className={`relative z-10 w-full flex justify-center overflow-visible ${
        animate ? 'animate-family-portrait-breathe' : ''
      }`}
    >
      <img
        src={FAMILY_PORTRAIT_SRC}
        alt="The Bhattacharya and Kundu Family"
        loading="eager"
        decoding="async"
        draggable={false}
        className="w-auto max-w-full max-h-[184px] sm:max-h-[210px] [@media(max-height:700px)]:max-h-[140px] h-[clamp(92px,18vh,184px)] sm:h-[clamp(108px,21vh,210px)] [@media(max-height:700px)]:h-[clamp(76px,15.5vh,140px)] object-contain object-bottom drop-shadow-[0_10px_18px_rgba(77,10,20,0.14)] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
      />
    </div>

    {/* Delicate tapered antique-gold baseline anchoring the waist-up cutout */}
    <span
      aria-hidden="true"
      className="relative z-10 block w-[92%] h-px bg-gradient-to-r from-transparent via-[#C89D54]/75 to-transparent"
    />
  </div>
);

/**
 * Vintage antique-gold Gramophone icon for the floating background music controller.
 */
export const GramophoneIcon: React.FC<{ muted?: boolean; className?: string }> = ({
  muted = false,
  className = 'w-6 h-6',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    {/* Wooden gramophone base */}
    <rect
      x="6"
      y="21"
      width="18"
      height="6"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    {/* Vinyl turntable platter & spindle */}
    <line x1="8" y1="19" x2="21" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14.5" y1="17" x2="14.5" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Tonearm support & curved brass horn */}
    <path
      d="M21 21 V15.5 C21 13.5 19.8 12.5 18 12 L12.5 10.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Flared gramophone horn bell */}
    <path
      d="M19.5 13 C16.5 9.5 14 6.5 9.5 5.5 C7.5 8.5 7.5 12.5 10 15 C13.8 14.5 16.8 14 19.5 13 Z"
      fill="currentColor"
      fillOpacity="0.24"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Gentle sound arcs when playing, or crisp mute slash when muted */}
    {!muted ? (
      <>
        <path
          d="M5.5 7.5 C4.2 9.2 4.2 11.4 5.5 13.1"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M3.2 5.8 C1.4 8.4 1.4 12.2 3.2 14.8"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
      </>
    ) : (
      <line
        x1="5"
        y1="5"
        x2="27"
        y2="27"
        stroke="#FAF5EC"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    )}
  </svg>
);

