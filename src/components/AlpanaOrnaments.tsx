import React from 'react';

interface OrnamentProps {
  className?: string;
  prominent?: boolean;
}

/**
 * Intricate Bengali alpana mandala motif rendered in antique gold linework
 * for the royal maroon Studio header, curtain stage, and Featured Ready card.
 */
export const AlpanaMandala: React.FC<OrnamentProps> = ({
  className = '',
  prominent = false,
}) => {
  const outerPetals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const innerPetals = Array.from({ length: 12 }, (_, i) => i * 30);
  const ringStroke = prominent ? 1.45 : 1;
  const fineStroke = prominent ? 1.3 : 0.9;
  const petalFillOpacity = prominent ? 0.34 : 0.22;

  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="160" cy="160" r="146" stroke="currentColor" strokeWidth={fineStroke} strokeDasharray="3 5" />
      <circle cx="160" cy="160" r="134" stroke="currentColor" strokeWidth={ringStroke} />
      <circle cx="160" cy="160" r="100" stroke="currentColor" strokeWidth={fineStroke} />
      <circle cx="160" cy="160" r="66" stroke="currentColor" strokeWidth={ringStroke} />
      <circle cx="160" cy="160" r="24" stroke="currentColor" strokeWidth={prominent ? 1.6 : 1.2} />
      <circle cx="160" cy="160" r="9" fill="currentColor" fillOpacity={prominent ? 0.48 : 0.35} />

      {outerPetals.map((angle) => (
        <g key={`outer-${angle}`} transform={`rotate(${angle} 160 160)`}>
          <path
            d="M160 28 C168 46 170 62 160 76 C150 62 152 46 160 28 Z"
            stroke="currentColor"
            strokeWidth={ringStroke}
          />
          <circle cx="160" cy="18" r={prominent ? 2.7 : 2.2} fill="currentColor" />
          <path
            d="M160 44 C163 52 163 60 160 66 C157 60 157 52 160 44 Z"
            fill="currentColor"
            fillOpacity={petalFillOpacity}
          />
        </g>
      ))}

      {innerPetals.map((angle) => (
        <g key={`inner-${angle}`} transform={`rotate(${angle} 160 160)`}>
          <path
            d="M160 95 C168 112 167 125 160 135 C153 125 152 112 160 95 Z"
            stroke="currentColor"
            strokeWidth={ringStroke}
          />
          <circle cx="160" cy="88" r={prominent ? 2.3 : 1.8} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
};

/**
 * Delicate horizontal lotus & alpana divider used between editorial sections.
 */
export const AlpanaDivider: React.FC<OrnamentProps> = ({ className = '' }) => (
  <svg
    viewBox="0 0 280 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <line x1="0" y1="12" x2="104" y2="12" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.45" />
    <line x1="176" y1="12" x2="280" y2="12" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.45" />
    <circle cx="114" cy="12" r="2" fill="currentColor" fillOpacity="0.7" />
    <circle cx="166" cy="12" r="2" fill="currentColor" fillOpacity="0.7" />
    <path
      d="M140 3 C144 8 145 12 140 21 C135 12 136 8 140 3 Z"
      stroke="currentColor"
      strokeWidth="1.1"
    />
    <path
      d="M126 12 C131 8 135 9 140 12 C135 15 131 16 126 12 Z"
      stroke="currentColor"
      strokeWidth="1"
    />
    <path
      d="M154 12 C149 8 145 9 140 12 C145 15 149 16 154 12 Z"
      stroke="currentColor"
      strokeWidth="1"
    />
  </svg>
);
