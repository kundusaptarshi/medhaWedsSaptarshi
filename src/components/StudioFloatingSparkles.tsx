import React from 'react';
import { AlpanaMandala } from './AlpanaOrnaments';

interface SparkleItem {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
}

interface FloatingPetalSpec {
  left: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
  rotate: number;
}

interface FloatingMoteSpec {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
}

interface BokehOrbSpec {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  ring?: boolean;
}

interface FloatingLotusSpec {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
}

const SPARKLE_ITEMS: SparkleItem[] = [
  { left: '4%', top: '18%', size: 20, delay: '0s', duration: '3.8s', color: '#C89D54' },
  { left: '12%', top: '52%', size: 16, delay: '1.1s', duration: '4.6s', color: '#D99B26' },
  { left: '18%', top: '80%', size: 19, delay: '2.1s', duration: '4.2s', color: '#B88435' },
  { left: '27%', top: '28%', size: 21, delay: '0.6s', duration: '4.4s', color: '#C89D54' },
  { left: '36%', top: '14%', size: 15, delay: '2.4s', duration: '4.1s', color: '#D99B26' },
  { left: '44%', top: '76%', size: 18, delay: '0.9s', duration: '5.0s', color: '#B88435' },
  { left: '53%', top: '34%', size: 14, delay: '1.8s', duration: '4.3s', color: '#C89D54' },
  { left: '62%', top: '20%', size: 20, delay: '0.4s', duration: '4.5s', color: '#D99B26' },
  { left: '70%', top: '64%', size: 16, delay: '2.9s', duration: '4.9s', color: '#C89D54' },
  { left: '78%', top: '38%', size: 19, delay: '1.5s', duration: '4.2s', color: '#B88435' },
  { left: '84%', top: '82%', size: 17, delay: '2.0s', duration: '5.1s', color: '#D99B26' },
  { left: '91%', top: '24%', size: 20, delay: '0.3s', duration: '4.4s', color: '#C89D54' },
  { left: '95%', top: '62%', size: 16, delay: '1.3s', duration: '4.0s', color: '#B88435' },
  { left: '48%', top: '90%', size: 15, delay: '2.6s', duration: '4.7s', color: '#D99B26' },
];

const STUDIO_PETALS: FloatingPetalSpec[] = [
  { left: '5%', size: 12, delay: '-1s', duration: '15s', color: '#E09F3E', rotate: 20 },
  { left: '15%', size: 10, delay: '-7s', duration: '18s', color: '#B23232', rotate: -26 },
  { left: '25%', size: 13, delay: '-4s', duration: '16s', color: '#D47B2C', rotate: 34 },
  { left: '37%', size: 11, delay: '-11s', duration: '19s', color: '#C89D54', rotate: -18 },
  { left: '49%', size: 12, delay: '-2s', duration: '17s', color: '#E09F3E', rotate: 28 },
  { left: '60%', size: 10, delay: '-9s', duration: '20s', color: '#9E2A2B', rotate: -30 },
  { left: '72%', size: 13, delay: '-5s', duration: '16s', color: '#D47B2C', rotate: 16 },
  { left: '83%', size: 11, delay: '-13s', duration: '18s', color: '#E09F3E', rotate: -22 },
  { left: '92%', size: 12, delay: '-3s', duration: '15s', color: '#B23232', rotate: 30 },
  { left: '97%', size: 10, delay: '-8s', duration: '19s', color: '#C89D54', rotate: -34 },
];

const FLOATING_MOTES: FloatingMoteSpec[] = [
  { left: '8%', top: '42%', size: 10, delay: '0.2s', duration: '7.5s' },
  { left: '21%', top: '68%', size: 9, delay: '2.0s', duration: '8.4s' },
  { left: '34%', top: '48%', size: 11, delay: '1.1s', duration: '7.8s' },
  { left: '52%', top: '62%', size: 10, delay: '3.0s', duration: '8.6s' },
  { left: '66%', top: '44%', size: 9, delay: '0.7s', duration: '8.0s' },
  { left: '79%', top: '72%', size: 11, delay: '2.4s', duration: '9.0s' },
  { left: '91%', top: '46%', size: 10, delay: '1.5s', duration: '7.9s' },
  { left: '41%', top: '26%', size: 8, delay: '3.4s', duration: '8.2s' },
];

const BOKEH_ORBS: BokehOrbSpec[] = [
  { left: '9%', top: '34%', size: 42, delay: '0s', duration: '10.5s', ring: true },
  { left: '24%', top: '74%', size: 32, delay: '2.2s', duration: '11.8s' },
  { left: '42%', top: '30%', size: 28, delay: '4.1s', duration: '9.8s', ring: true },
  { left: '58%', top: '82%', size: 38, delay: '1.4s', duration: '12.2s' },
  { left: '76%', top: '26%', size: 44, delay: '3.2s', duration: '11.0s', ring: true },
  { left: '88%', top: '68%', size: 34, delay: '0.8s', duration: '10.2s' },
  { left: '16%', top: '88%', size: 26, delay: '5.0s', duration: '10.8s', ring: true },
  { left: '68%', top: '52%', size: 30, delay: '2.8s', duration: '9.6s' },
];

const FLOATING_LOTUSES: FloatingLotusSpec[] = [
  { left: '6%', top: '74%', size: 36, delay: '0.5s', duration: '9.2s' },
  { left: '29%', top: '86%', size: 30, delay: '2.6s', duration: '10.4s' },
  { left: '73%', top: '82%', size: 34, delay: '1.3s', duration: '9.6s' },
  { left: '92%', top: '36%', size: 32, delay: '3.1s', duration: '10.0s' },
  { left: '47%', top: '18%', size: 28, delay: '1.9s', duration: '8.8s' },
];

interface StudioFloatingSparklesProps {
  contained?: boolean;
  subtle?: boolean;
}

/**
 * Shared animated celebration backdrop for the pastel light yellow canvas
 * across both the Invitation Studio and the main Wedding Website.
 * Combines breathing golden pastel auras, subtle sunbeam shimmer, rotating Bengali
 * Alpana mandalas, rising diya-light bokeh rings, drifting lotus blossoms,
 * twinkling gold stars, gliding marigold/crimson petals, and floating diamond motes.
 * Uses strictly GPU-composited transform & opacity keyframes for buttery performance.
 */
export const StudioFloatingSparkles: React.FC<StudioFloatingSparklesProps> = ({
  contained = false,
  subtle = false,
}) => {
  const bokehList = subtle ? BOKEH_ORBS.slice(0, 4) : BOKEH_ORBS;
  const sparkleList = subtle ? SPARKLE_ITEMS.slice(0, 6) : SPARKLE_ITEMS;

  return (
    <div
      aria-hidden="true"
      data-testid="yellow-ambient-animations"
      className={`pointer-events-none ${
        contained ? 'absolute' : 'fixed'
      } inset-0 overflow-hidden z-0`}
    >
      {/* 1. Soft breathing golden pastel auras (pure radial gradients, zero heavy blur filters) */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[860px] h-[660px] rounded-full bg-[radial-gradient(circle,rgba(255,250,220,0.94)_0%,rgba(253,234,162,0.48)_42%,transparent_72%)] animate-pastel-aura" />
      <div className="absolute -bottom-24 right-[-80px] w-[660px] h-[660px] rounded-full bg-[radial-gradient(circle,rgba(246,214,124,0.46)_0%,rgba(253,243,208,0.2)_48%,transparent_72%)] animate-pastel-aura-alt" />
      {!subtle && (
        <div className="absolute top-[40%] left-[-140px] w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(255,244,192,0.62)_0%,transparent_70%)] animate-pastel-aura-alt" />
      )}

      {/* 2. Subtle warm diagonal sunbeam shimmer gliding across the yellow backdrop */}
      {!subtle && (
        <div className="absolute top-0 left-0 h-[100dvh] max-h-[920px] w-[34vw] bg-[linear-gradient(90deg,transparent_0%,rgba(255,252,235,0.48)_50%,transparent_100%)] animate-sunbeam-glide" />
      )}

      {/* 3. Rotating Bengali Alpana Mandalas (Chakras) */}
      <AlpanaMandala className="absolute -left-36 top-36 w-[430px] h-[430px] text-[#C89D54]/20 animate-chakra-slow" />
      <AlpanaMandala className="absolute -right-40 bottom-[-120px] w-[500px] h-[500px] text-[#7F1924]/12 animate-chakra-ccw" />
      {!subtle && (
        <>
          <AlpanaMandala className="absolute left-1/2 -translate-x-1/2 top-[56%] w-[340px] h-[340px] text-[#C89D54]/14 animate-chakra-cw" />
          <AlpanaMandala className="absolute right-[10%] top-[12%] w-[210px] h-[210px] text-[#C89D54]/14 animate-chakra-cw" />
          <AlpanaMandala className="absolute left-[14%] bottom-[8%] w-[230px] h-[230px] text-[#7F1924]/10 animate-chakra-ccw" />
        </>
      )}

      {/* 4. Rising warm golden bokeh orbs & luminous diya rings */}
      {bokehList.map((orb, idx) => (
        <span
          key={`bokeh-${idx}`}
          className="absolute block rounded-full animate-bokeh-rise"
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            animationDelay: orb.delay,
            animationDuration: orb.duration,
            background: orb.ring
              ? 'radial-gradient(circle, rgba(255,251,232,0.16) 45%, rgba(217,164,65,0.34) 76%, transparent 100%)'
              : 'radial-gradient(circle, rgba(255,250,224,0.78) 0%, rgba(236,196,98,0.32) 58%, transparent 100%)',
            border: orb.ring ? '1px solid rgba(200,157,84,0.28)' : undefined,
          }}
        />
      ))}

      {/* 5. Gently swaying antique-gold Bengali lotus outlines */}
      {!subtle &&
        FLOATING_LOTUSES.map((lotus, idx) => (
          <span
            key={`lotus-${idx}`}
            className="absolute block animate-lotus-drift"
            style={{
              left: lotus.left,
              top: lotus.top,
              width: lotus.size,
              height: Math.round(lotus.size * 0.62),
              animationDelay: lotus.delay,
              animationDuration: lotus.duration,
            }}
          >
            <svg viewBox="0 0 64 36" fill="none" className="w-full h-full">
              <path
                d="M32 4C35 12 36 20 32 28C28 20 29 12 32 4Z"
                fill="#C89D54"
                fillOpacity="0.16"
                stroke="#C89D54"
                strokeWidth="1.2"
              />
              <path
                d="M32 28C23 24 19 16 21 9C26 12 30 19 32 28Z"
                fill="#DFBE7B"
                fillOpacity="0.14"
                stroke="#C89D54"
                strokeWidth="1.1"
              />
              <path
                d="M32 28C41 24 45 16 43 9C38 12 34 19 32 28Z"
                fill="#DFBE7B"
                fillOpacity="0.14"
                stroke="#C89D54"
                strokeWidth="1.1"
              />
              <path
                d="M32 28C20 29 12 24 10 17C17 17 24 21 32 28Z"
                stroke="#C89D54"
                strokeWidth="1"
                strokeOpacity="0.7"
              />
              <path
                d="M32 28C44 29 52 24 54 17C47 17 40 21 32 28Z"
                stroke="#C89D54"
                strokeWidth="1"
                strokeOpacity="0.7"
              />
            </svg>
          </span>
        ))}

      {/* 6. Twinkling antique-gold celebration stars */}
      {sparkleList.map((item, idx) => (
        <span
          key={`star-${idx}`}
          className="absolute block animate-sparkle-twinkle"
          style={{
            left: item.left,
            top: item.top,
            width: item.size,
            height: item.size,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 2L13.8 8.8L20 12L13.8 15.2L12 22L10.2 15.2L4 12L10.2 8.8L12 2Z"
              fill={item.color}
              fillOpacity="0.58"
            />
          </svg>
        </span>
      ))}

      {/* 7. Gently gliding marigold, crimson & gold petals (Studio only; main invite uses site-wide FallingPetals overlay) */}
      {!subtle &&
        STUDIO_PETALS.map((petal, idx) => (
          <span
            key={`petal-${idx}`}
            className="animate-studio-petal absolute -top-6 block"
            style={{
              left: petal.left,
              animationDelay: petal.delay,
              animationDuration: petal.duration,
            }}
          >
            <svg
              width={petal.size}
              height={Math.round(petal.size * 1.45)}
              viewBox="0 0 14 20"
              fill="none"
              style={{ transform: `rotate(${petal.rotate}deg)` }}
            >
              <path
                d="M7 1C11 5.5 13 11 7 19C1 11 3 5.5 7 1Z"
                fill={petal.color}
                fillOpacity="0.65"
              />
              <path
                d="M7 3C8.5 7 9 11 7 16"
                stroke="#FFFDF9"
                strokeWidth="0.6"
                strokeOpacity="0.35"
              />
            </svg>
          </span>
        ))}

      {/* 8. Rising warm golden diamond motes */}
      {!subtle &&
        FLOATING_MOTES.map((mote, idx) => (
          <span
            key={`mote-${idx}`}
            className="absolute block animate-studio-mote"
            style={{
              left: mote.left,
              top: mote.top,
              width: mote.size,
              height: mote.size,
              animationDelay: mote.delay,
              animationDuration: mote.duration,
            }}
          >
            <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
              <path
                d="M6 0.5L11.5 6L6 11.5L0.5 6L6 0.5Z"
                fill="#C89D54"
                fillOpacity="0.45"
              />
            </svg>
          </span>
        ))}
    </div>
  );
};
