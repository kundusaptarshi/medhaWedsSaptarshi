import React from 'react';
import { AlpanaMandala } from './AlpanaOrnaments';
import { CornerBracket, LotusEmblem, RoyalWaxSeal } from './InviteIllustrations';
import {
  getCurtainLayerState,
  type CurtainPhase,
} from '../utils/curtainTimeline';

interface CurtainOpeningStageProps {
  addressedName: string;
  phase: CurtainPhase;
  onOpen: () => void;
}

const LEFT_CURTAIN_DRAPE_BG = [
  'linear-gradient(180deg, rgba(20, 2, 5, 0.56) 0%, rgba(20, 2, 5, 0.08) 16%, rgba(20, 2, 5, 0.04) 74%, rgba(16, 2, 4, 0.48) 100%)',
  'linear-gradient(90deg, #2B040A 0%, #570D19 9%, #34050C 19%, #691120 31%, #3A060E 43%, #6D1221 56%, #39060E 69%, #64101D 82%, #3D0710 92%, #5A0E1A 98%, #2E040A 100%)',
].join(', ');

const RIGHT_CURTAIN_DRAPE_BG = [
  'linear-gradient(180deg, rgba(20, 2, 5, 0.56) 0%, rgba(20, 2, 5, 0.08) 16%, rgba(20, 2, 5, 0.04) 74%, rgba(16, 2, 4, 0.48) 100%)',
  'linear-gradient(270deg, #2B040A 0%, #570D19 9%, #34050C 19%, #691120 31%, #3A060E 43%, #6D1221 56%, #39060E 69%, #64101D 82%, #3D0710 92%, #5A0E1A 98%, #2E040A 100%)',
].join(', ');

const CURTAIN_RIPPLE_HIGHLIGHT_BG =
  'linear-gradient(98deg, transparent 0%, rgba(240, 206, 138, 0.12) 14%, rgba(18, 2, 5, 0.24) 26%, rgba(255, 224, 168, 0.16) 40%, rgba(18, 2, 5, 0.22) 54%, rgba(235, 198, 132, 0.14) 68%, rgba(18, 2, 5, 0.24) 82%, rgba(240, 206, 138, 0.1) 92%, transparent 100%)';

/**
 * Full-viewport royal maroon velvet curtains with gentle idle fabric sway/rippling
 * and dynamic flowing gather-ripples when parted from the center seam.
 * All motion uses pure GPU compositor transforms and opacity for 60fps fluidity.
 */
export const CurtainOpeningStage: React.FC<CurtainOpeningStageProps> = ({
  addressedName,
  phase,
  onOpen,
}) => {
  const layer = getCurtainLayerState(phase);

  return (
    <div
      data-testid="seal-curtain"
      data-curtain-phase={phase}
      data-seal-opened={layer.isInteractive ? 'false' : 'true'}
      className={`fixed inset-0 z-[65] overflow-hidden text-[#FAF5EC] ${
        layer.isInteractive ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* LEFT ROYAL MAROON VELVET CURTAIN PANEL */}
      <div
        data-testid="curtain-panel-left"
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-[calc(50%+1px)] overflow-hidden bg-[#38060E] shadow-[14px_0_42px_rgba(14,1,4,0.62)] ${
          layer.curtainsParting ? 'animate-curtain-open-left' : ''
        }`}
      >
        {/* Oversized flowing velvet pleat layer — sways & ripples gently in idle and gathers while parting */}
        <div
          className={`pointer-events-none absolute inset-y-0 -left-8 -right-8 ${
            layer.curtainsParting
              ? 'animate-curtain-parting-folds-left'
              : 'animate-curtain-idle-left'
          }`}
          style={{ backgroundImage: LEFT_CURTAIN_DRAPE_BG }}
        />

        {/* Traveling velvet silk-sheen ripple wave across the vertical folds */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/3 -right-1/3 animate-curtain-ripple-left"
          style={{
            backgroundImage: CURTAIN_RIPPLE_HIGHLIGHT_BG,
            animationDuration: layer.curtainsParting ? '1.35s' : undefined,
          }}
        />

        {/* Subtle vertical velvet sheen across left folds */}
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            background:
              'radial-gradient(ellipse at 85% 48%, rgba(223, 190, 123, 0.16) 0%, transparent 62%)',
          }}
        />

        {/* Heirloom outer-left & top/bottom gold hairline frame that parts with the left curtain */}
        <div className="pointer-events-none absolute top-3 bottom-3 left-3 right-0 sm:top-7 sm:bottom-7 sm:left-7 border-y border-l border-[#DFBE7B]/28">
          <CornerBracket
            position="tl"
            className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -top-1 -left-1"
          />
          <CornerBracket
            position="bl"
            className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -bottom-1 -left-1"
          />
        </div>

        {/* Refined antique-gold heirloom leading-edge trim & velvet crease shadow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[#140104]/55 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-[#9E7735]/20 via-[#E7C988]/70 to-[#9E7735]/20" />
        <div className="pointer-events-none absolute inset-y-3 sm:inset-y-7 right-[7px] w-px bg-gradient-to-b from-transparent via-[#DFBE7B]/25 to-transparent" />
      </div>

      {/* RIGHT ROYAL MAROON VELVET CURTAIN PANEL */}
      <div
        data-testid="curtain-panel-right"
        aria-hidden="true"
        className={`absolute inset-y-0 right-0 w-1/2 overflow-hidden bg-[#38060E] shadow-[-14px_0_42px_rgba(14,1,4,0.62)] ${
          layer.curtainsParting ? 'animate-curtain-open-right' : ''
        }`}
      >
        {/* Oversized flowing velvet pleat layer — sways & ripples gently in idle and gathers while parting */}
        <div
          className={`pointer-events-none absolute inset-y-0 -left-8 -right-8 ${
            layer.curtainsParting
              ? 'animate-curtain-parting-folds-right'
              : 'animate-curtain-idle-right'
          }`}
          style={{ backgroundImage: RIGHT_CURTAIN_DRAPE_BG }}
        />

        {/* Traveling velvet silk-sheen ripple wave across the vertical folds */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/3 -right-1/3 animate-curtain-ripple-right"
          style={{
            backgroundImage: CURTAIN_RIPPLE_HIGHLIGHT_BG,
            animationDuration: layer.curtainsParting ? '1.35s' : undefined,
          }}
        />

        {/* Subtle vertical velvet sheen across right folds */}
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            background:
              'radial-gradient(ellipse at 15% 48%, rgba(223, 190, 123, 0.16) 0%, transparent 62%)',
          }}
        />

        {/* Heirloom outer-right & top/bottom gold hairline frame that parts with the right curtain */}
        <div className="pointer-events-none absolute top-3 bottom-3 right-3 left-0 sm:top-7 sm:bottom-7 sm:right-7 border-y border-r border-[#DFBE7B]/28">
          <CornerBracket
            position="tr"
            className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -top-1 -right-1"
          />
          <CornerBracket
            position="br"
            className="w-10 h-10 sm:w-14 sm:h-14 text-[#DFBE7B] absolute -bottom-1 -right-1"
          />
        </div>

        {/* Refined antique-gold heirloom leading-edge trim & velvet crease shadow */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#140104]/55 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-[#9E7735]/20 via-[#E7C988]/70 to-[#9E7735]/20" />
        <div className="pointer-events-none absolute inset-y-3 sm:inset-y-7 left-[7px] w-px bg-gradient-to-b from-transparent via-[#DFBE7B]/25 to-transparent" />
      </div>

      {/* Center Editorial Lockup & Royal Crimson Wax Seal */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6 py-8 sm:py-10 text-center">
        {/* Personalized Guest Addressing */}
        <div
          className={`relative z-20 flex flex-col items-center max-w-xl transition-all duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
            layer.sealUnsealing
              ? 'opacity-0 -translate-y-4 scale-[0.96]'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          <LotusEmblem className="w-11 h-6 sm:w-14 sm:h-7 text-[#DFBE7B] drop-shadow-[0_2px_8px_rgba(16,1,4,0.75)]" />
          <p className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] font-medium tracking-[0.28em] uppercase text-[#EAD29F] drop-shadow-[0_2px_8px_rgba(16,1,4,0.92)]">
            An Invitation For
          </p>
          <h1
            data-testid="curtain-guest-name"
            className="mt-2 font-editorial text-3xl sm:text-5xl md:text-[54px] leading-[1.08] font-medium text-[#FAF5EC] tracking-wide drop-shadow-[0_3px_16px_rgba(16,1,4,0.92)]"
          >
            {addressedName}
          </h1>
        </div>

        {/* Interactive Royal Wax Seal with Chakra & Candlelight Aura anchored strictly to the seal center */}
        <div
          data-testid="welcome-wax-seal-wrapper"
          className="relative z-10 my-7 sm:my-9 flex items-center justify-center"
        >
          {/* Warm candlelight aura centered directly behind the wax seal for luminous separation */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 transition-opacity duration-500 ease-out ${
              layer.curtainsParting ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div
              className="w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] rounded-full animate-curtain-aura-zoom-in"
              style={{
                background:
                  'radial-gradient(circle, rgba(246,216,148,0.34) 0%, rgba(223,190,123,0.18) 32%, rgba(169,40,46,0.10) 56%, transparent 74%)',
              }}
            />
          </div>

          {/* Prominent rotating golden Alpana mandala chakra centered strictly with respect to the seal */}
          <div
            data-testid="curtain-chakra"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
          >
            <div
              className={`shrink-0 w-[400px] h-[400px] sm:w-[520px] sm:h-[520px] text-[#F5DC9B]/46 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                layer.sealUnsealing ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
              }`}
            >
              <div
                data-testid="curtain-chakra-zoom"
                className="w-full h-full animate-curtain-chakra-zoom-in"
              >
                <AlpanaMandala prominent className="w-full h-full animate-chakra-slow" />
              </div>
            </div>
          </div>

          {/* Single-shot golden shimmer ring burst when seal breaks */}
          {layer.sealUnsealing && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-10 w-[148px] h-[148px] sm:w-44 sm:h-44 rounded-full border-2 border-[#EED49B]/90 animate-curtain-seal-burst"
            />
          )}

          <div
            className={`relative z-10 transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
              layer.sealUnsealing
                ? 'opacity-0 scale-110 pointer-events-none'
                : 'opacity-100 scale-100'
            }`}
          >
            <RoyalWaxSeal
              onOpen={onOpen}
              disabled={!layer.isInteractive}
              sizeClassName="w-[148px] h-[148px] sm:w-44 sm:h-44"
              ringOffsetClassName="focus-visible:ring-offset-[#4D0A14]"
            />
          </div>
        </div>

        {/* Quiet Editorial Tap Prompt */}
        <p
          className={`relative z-20 text-[11px] font-medium tracking-[0.3em] uppercase text-[#F0D8A6] drop-shadow-[0_2px_8px_rgba(16,1,4,0.92)] transition-all duration-[300ms] ease-out ${
            layer.sealUnsealing
              ? 'opacity-0 translate-y-3'
              : 'opacity-100 translate-y-0'
          }`}
        >
          Tap the seal to open
        </p>
      </div>
    </div>
  );
};
