export type CurtainPhase =
  | 'closed'
  | 'unsealing'
  | 'parting'
  | 'revealing'
  | 'opened';

export interface CurtainSchedule {
  partMs: number;
  revealMs: number;
  completeMs: number;
}

export interface CurtainLayerState {
  isInteractive: boolean;
  sealUnsealing: boolean;
  curtainsParting: boolean;
  heroRevealed: boolean;
  overlayMounted: boolean;
}

export const CURTAIN_STANDARD_SCHEDULE: CurtainSchedule = {
  partMs: 220,
  revealMs: 480,
  completeMs: 1480,
};

export const CURTAIN_REDUCED_MOTION_SCHEDULE: CurtainSchedule = {
  partMs: 40,
  revealMs: 120,
  completeMs: 360,
};

/**
 * Returns deterministic curtain opening timestamps tailored to user motion preferences.
 */
export function getCurtainSchedule(
  prefersReducedMotion: boolean
): CurtainSchedule {
  return prefersReducedMotion
    ? CURTAIN_REDUCED_MOTION_SCHEDULE
    : CURTAIN_STANDARD_SCHEDULE;
}

/**
 * Derives every visual layer's state from the current royal curtain phase.
 */
export function getCurtainLayerState(phase: CurtainPhase): CurtainLayerState {
  switch (phase) {
    case 'closed':
      return {
        isInteractive: true,
        sealUnsealing: false,
        curtainsParting: false,
        heroRevealed: false,
        overlayMounted: true,
      };
    case 'unsealing':
      return {
        isInteractive: false,
        sealUnsealing: true,
        curtainsParting: false,
        heroRevealed: false,
        overlayMounted: true,
      };
    case 'parting':
      return {
        isInteractive: false,
        sealUnsealing: true,
        curtainsParting: true,
        heroRevealed: false,
        overlayMounted: true,
      };
    case 'revealing':
      return {
        isInteractive: false,
        sealUnsealing: true,
        curtainsParting: true,
        heroRevealed: true,
        overlayMounted: true,
      };
    case 'opened':
      return {
        isInteractive: false,
        sealUnsealing: true,
        curtainsParting: true,
        heroRevealed: true,
        overlayMounted: false,
      };
  }
}

/**
 * Checks whether ?autostart=1 is present to skip directly to the opened invitation.
 */
export function shouldAutostartInvite(search: string): boolean {
  if (!search) return false;
  try {
    const params = new URLSearchParams(
      search.startsWith('?') ? search.slice(1) : search
    );
    const val = params.get('autostart');
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}
