import type { GuestSide, InviteSideMode } from '../types';
import { WEDDING_EVENTS } from '../utils/invitationLogic';

export interface DressCodeBreakdownItem {
  label: string;
  details: string;
}

export interface SideSpecificEventData {
  side: GuestSide;
  sideLabel: string;
  venueName: string;
  venueAddress: string;
  /** Desktop standard Google Maps URL. */
  directionsUrl: string;
  /** Mobile exact saved-pin maps.app.goo.gl URL. */
  mobileDirectionsUrl: string;
  videoSrc: string;
  /** Single-person description used when viewing only this side (?side=bride or ?side=groom). */
  description?: string;
}

export interface WeddingEventDetail {
  id: string;
  sortOrder: number;
  title: string;
  /** Compact single-line label used in the bottom celebration switcher tabs. */
  tabTitle: string;
  subtitle: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  startIso: string;
  durationHours: number;
  venueName: string;
  venueAddress: string;
  /** Desktop standard Google Maps URL for "Get Directions", or null when Location TBD. */
  directionsUrl: string | null;
  /** Mobile exact saved-pin maps.app.goo.gl URL, or null when Location TBD. */
  mobileDirectionsUrl: string | null;
  /** True when the event location is TBD and the directions control must be disabled. */
  directionsDisabled: boolean;
  dressCode: string;
  /** Optional structured dress code breakdown (e.g. Women / Men for Mehendi & Cocktail). */
  dressCodeBreakdown?: DressCodeBreakdownItem[];
  /** Portrait looping video URL for the event's vertical media frame. */
  videoSrc?: string;
  /** True for events whose location, directions link, and video depend on Bride's vs Groom's side. */
  sideSpecific: boolean;
  /** The side mode currently resolved for this event detail. */
  resolvedSide: InviteSideMode;
  /** Populated in generic/combined mode for side-specific events (Aiburobhat & Haldi). */
  combinedSides?: {
    bride: SideSpecificEventData;
    groom: SideSpecificEventData;
  };
}

interface WeddingEventBaseConfig {
  id: string;
  sortOrder: number;
  title: string;
  tabTitle: string;
  subtitle: string;
  description: string;
  dateLabel: string;
  timeLabel: string;
  startIso: string;
  durationHours: number;
  dressCode: string;
  dressCodeBreakdown?: DressCodeBreakdownItem[];
  shared?: {
    venueName: string;
    venueAddress: string;
    directionsUrl: string | null;
    mobileDirectionsUrl: string | null;
    directionsDisabled?: boolean;
    videoSrc?: string;
  };
  bySide?: Record<GuestSide, SideSpecificEventData>;
}

const BRIDE_HOUSE_DETAILS = {
  side: 'bride' as const,
  sideLabel: "Bride's Side",
  venueName: "Bride's Family House",
  venueAddress: 'Baranagar, Kolkata',
  directionsUrl: 'https://www.google.com/maps/search/?api=1&query=Baranagar,+Kolkata',
  mobileDirectionsUrl: 'https://maps.app.goo.gl/c3vwytokt9i6m9Pp8',
};

const GROOM_HOUSE_DETAILS = {
  side: 'groom' as const,
  sideLabel: "Groom's Side",
  venueName: 'Sudhantar (Kundu Family House)',
  venueAddress: 'Barrackpore, Kolkata',
  directionsUrl: 'https://www.google.com/maps/search/?api=1&query=Sudhantar+Barrackpore+Kolkata',
  mobileDirectionsUrl: 'https://maps.app.goo.gl/5eEXFCvmFcck8kns5',
};

const SPACE_CIRCLE_CLUB_VENUE = {
  venueName: 'Space Circle Club',
  venueAddress: 'VIP Road, Kolkata',
  directionsUrl:
    'https://www.google.com/maps/search/?api=1&query=Space+Circle+Club+Kolkata',
  mobileDirectionsUrl: 'https://maps.app.goo.gl/2idBMsrrdSpuYimE8',
};

const HRS_BHAWAN_VENUE = {
  venueName: 'HRS Bhawan',
  venueAddress: 'Barrackpore, Kolkata',
  directionsUrl:
    'https://www.google.com/maps/search/?api=1&query=HRS+Bhawan+Barrackpore+Kolkata',
  mobileDirectionsUrl: 'https://maps.app.goo.gl/NrtzLgRoq7QMoTqm8',
};

const WEDDING_EVENT_CONFIGS: Record<string, WeddingEventBaseConfig> = {
  'mehendi-cocktail': {
    id: 'mehendi-cocktail',
    sortOrder: 1,
    title: 'Mehendi & Cocktail',
    tabTitle: 'Mehendi & Cocktail',
    subtitle: 'Henna, clinking glasses & festive adda',
    description:
      'From delicate alpona-inspired henna to clinking glasses and adda—this is where tradition meets the party. Come get your hands painted, bring your best dance moves, and help us kick off the biye celebrations in style!',
    dateLabel: '07/02/2027',
    timeLabel: '6:00 PM onwards',
    startIso: '2027-02-07T18:00:00+05:30',
    durationHours: 4,
    dressCode:
      'Women: Indo-western outfits, party-wear sarees, lehengas, or festive salwar suits. Men: Blazers, smart-casuals, semi-formals, or casual kurtas.',
    dressCodeBreakdown: [
      {
        label: 'Women',
        details:
          'Indo-western outfits, party-wear sarees, lehengas, or festive salwar suits.',
      },
      {
        label: 'Men',
        details: 'Blazers, smart-casuals, semi-formals, or casual kurtas.',
      },
    ],
    shared: {
      venueName: 'TBD',
      venueAddress: '',
      directionsUrl: null,
      mobileDirectionsUrl: null,
      directionsDisabled: true,
      videoSrc: '/videos/Mehendi_Cocktail.mp4',
    },
  },
  aiburobhat: {
    id: 'aiburobhat',
    sortOrder: 2,
    title: 'Aiburobhat',
    tabTitle: 'Aiburobhat',
    subtitle: 'The cherished Bengali pre-wedding feast',
    description:
      "The ultimate Bengali bachelorette/bachelor feast! Join us as the bride/groom enjoys their 'last meal' of singlehood—a grand spread of traditional delicacies, endless pampering, and warm family blessings before they officially take the plunge.",
    dateLabel: '10/02/2027',
    timeLabel: '11:00 AM onwards',
    startIso: '2027-02-10T11:00:00+05:30',
    durationHours: 3,
    dressCode:
      'Comfort-first festive wear—come in whatever makes you feel relaxed, happy, and ready for a grand Bengali feast!',
    bySide: {
      bride: {
        ...BRIDE_HOUSE_DETAILS,
        videoSrc: '/videos/Aiburobhat_Bride.mp4',
        description:
          "The ultimate Bengali bachelorette feast! Join us as the bride enjoys her 'last meal' of singlehood—a grand spread of traditional delicacies, endless pampering, and warm family blessings before she officially takes the plunge.",
      },
      groom: {
        ...GROOM_HOUSE_DETAILS,
        videoSrc: '/videos/Aiburobhat_Groom.mp4',
        description:
          "The ultimate Bengali bachelor feast! Join us as the groom enjoys his 'last meal' of singlehood—a grand spread of traditional delicacies, endless pampering, and warm family blessings before he officially takes the plunge.",
      },
    },
  },
  haldi: {
    id: 'haldi',
    sortOrder: 3,
    title: 'Haldi (Gaye Holud)',
    tabTitle: 'Haldi',
    subtitle: 'Sacred turmeric blessings & sunlit joy',
    description:
      'A splash of yellow, sacred turmeric, and pure joy! Join us as we drench the bride/groom in blessed holud paste—straight from the other’s home—to bring out that pre-wedding glow, accompanied by music, laughter, and lots of playful chaos.',
    dateLabel: '11/02/2027',
    timeLabel: '11:00 AM onwards',
    startIso: '2027-02-11T11:00:00+05:30',
    durationHours: 3,
    dressCode:
      'Shades of Yellow (Traditional or casual outfits you don’t mind getting splashed with turmeric!).',
    bySide: {
      bride: {
        side: 'bride',
        sideLabel: "Bride's Side",
        ...SPACE_CIRCLE_CLUB_VENUE,
        videoSrc: '/videos/Haldi_Bride.mp4',
        description:
          'A splash of yellow, sacred turmeric, and pure joy! Join us as we drench the bride in blessed holud paste—straight from the groom’s home—to bring out that pre-wedding glow, accompanied by music, laughter, and lots of playful chaos.',
      },
      groom: {
        ...GROOM_HOUSE_DETAILS,
        videoSrc: '/videos/Haldi_Groom.mp4',
        description:
          'A splash of yellow, sacred turmeric, and pure joy! Join us as we drench the groom in blessed holud paste to bring out that pre-wedding glow, accompanied by music, laughter, and lots of playful chaos.',
      },
    },
  },
  wedding: {
    id: 'wedding',
    sortOrder: 4,
    title: 'The Wedding (Biye)',
    tabTitle: 'The Wedding',
    subtitle: 'Ulu calls, Saat Paak & Subho Drishti',
    description:
      'Ulu calls, conch shells, Saat Paak, and a Subho Drishti that seals the deal! Join us for a night of timeless Bengali rituals, vibrant topor and mukut, sacred vows around the fire, and a grand wedding feast as we officially become forever.',
    dateLabel: '11/02/2027',
    timeLabel: '6:30 PM onwards',
    startIso: '2027-02-11T18:30:00+05:30',
    durationHours: 5,
    dressCode:
      'Your finest traditional ethnic attire—silk sarees, panjabis, or whatever celebratory look brings out your festive spirit.',
    shared: {
      ...SPACE_CIRCLE_CLUB_VENUE,
      directionsDisabled: false,
      videoSrc: '/videos/Wedding.mp4',
    },
  },
  boubhat: {
    id: 'boubhat',
    sortOrder: 5,
    title: 'Boubhat',
    tabTitle: 'Boubhat',
    subtitle: 'Welcoming the newlyweds home',
    description:
      'Our first official culinary debut together! Join us for an intimate, heartwarming family gathering where the newlyweds serve their first meal together—symbolizing love, warmth, and our sweet new beginning as a family.',
    dateLabel: '13/02/2027',
    timeLabel: '6:30 PM onwards',
    startIso: '2027-02-13T18:30:00+05:30',
    durationHours: 3,
    dressCode:
      'Graceful traditional or smart-festive wear—dress effortlessly as we gather for an intimate family afternoon.',
    shared: {
      venueName: GROOM_HOUSE_DETAILS.venueName,
      venueAddress: GROOM_HOUSE_DETAILS.venueAddress,
      directionsUrl: GROOM_HOUSE_DETAILS.directionsUrl,
      mobileDirectionsUrl: GROOM_HOUSE_DETAILS.mobileDirectionsUrl,
      directionsDisabled: false,
      videoSrc: '/videos/Boubhat.mp4',
    },
  },
  reception: {
    id: 'reception',
    sortOrder: 6,
    title: 'Reception',
    tabTitle: 'Reception',
    subtitle: 'Evening glamour, music & a grand celebration',
    description:
      'Time to trade wedding rituals for glamour, music, and a grand celebration! Join us as we raise a toast to our new beginning—an evening of glitz, heartfelt blessings, endless adda, and a lavish feast to wrap up the festivities in style.',
    dateLabel: '14/02/2027',
    timeLabel: '6:30 PM onwards',
    startIso: '2027-02-14T18:30:00+05:30',
    durationHours: 4,
    dressCode:
      'Evening glamour—whether it’s a sharp suit, a statement gown, or a classic silk saree, wear whatever makes you feel red-carpet ready!',
    shared: {
      ...HRS_BHAWAN_VENUE,
      directionsDisabled: false,
      videoSrc: '/videos/Reception.mp4',
    },
  },
};

function materializeEventDetail(
  config: WeddingEventBaseConfig,
  sideMode: InviteSideMode
): WeddingEventDetail {
  const sideSpecific = Boolean(config.bySide);
  if (config.bySide) {
    if (sideMode === 'generic') {
      const brideData = config.bySide.bride;
      const groomData = config.bySide.groom;
      return {
        id: config.id,
        sortOrder: config.sortOrder,
        title: config.title,
        tabTitle: config.tabTitle,
        subtitle: config.subtitle,
        description: config.description,
        dateLabel: config.dateLabel,
        timeLabel: config.timeLabel,
        startIso: config.startIso,
        durationHours: config.durationHours,
        venueName: `${brideData.venueName} / ${groomData.venueName}`,
        venueAddress: `${brideData.venueAddress} · ${groomData.venueAddress}`,
        directionsUrl: brideData.directionsUrl,
        mobileDirectionsUrl: brideData.mobileDirectionsUrl,
        directionsDisabled: false,
        dressCode: config.dressCode,
        dressCodeBreakdown: config.dressCodeBreakdown,
        videoSrc: brideData.videoSrc,
        sideSpecific,
        resolvedSide: 'generic',
        combinedSides: {
          bride: brideData,
          groom: groomData,
        },
      };
    }

    const sideData = config.bySide[sideMode];
    return {
      id: config.id,
      sortOrder: config.sortOrder,
      title: config.title,
      tabTitle: config.tabTitle,
      subtitle: config.subtitle,
      description: sideData.description ?? config.description,
      dateLabel: config.dateLabel,
      timeLabel: config.timeLabel,
      startIso: config.startIso,
      durationHours: config.durationHours,
      venueName: sideData.venueName,
      venueAddress: sideData.venueAddress,
      directionsUrl: sideData.directionsUrl,
      mobileDirectionsUrl: sideData.mobileDirectionsUrl,
      directionsDisabled: false,
      dressCode: config.dressCode,
      dressCodeBreakdown: config.dressCodeBreakdown,
      videoSrc: sideData.videoSrc,
      sideSpecific,
      resolvedSide: sideMode,
    };
  }

  const shared = config.shared!;
  return {
    id: config.id,
    sortOrder: config.sortOrder,
    title: config.title,
    tabTitle: config.tabTitle,
    subtitle: config.subtitle,
    description: config.description,
    dateLabel: config.dateLabel,
    timeLabel: config.timeLabel,
    startIso: config.startIso,
    durationHours: config.durationHours,
    venueName: shared.venueName,
    venueAddress: shared.venueAddress,
    directionsUrl: shared.directionsUrl,
    mobileDirectionsUrl: shared.mobileDirectionsUrl,
    directionsDisabled: Boolean(shared.directionsDisabled || !shared.directionsUrl),
    dressCode: config.dressCode,
    dressCodeBreakdown: config.dressCodeBreakdown,
    videoSrc: shared.videoSrc,
    sideSpecific,
    resolvedSide: sideMode,
  };
}

export function getEventDetailForSide(
  eventId: string,
  sideMode: InviteSideMode = 'generic'
): WeddingEventDetail | undefined {
  const config = WEDDING_EVENT_CONFIGS[eventId];
  return config ? materializeEventDetail(config, sideMode) : undefined;
}

export function getAllWeddingEventDetails(
  sideMode: InviteSideMode = 'generic'
): WeddingEventDetail[] {
  return WEDDING_EVENTS.map((ev) => getEventDetailForSide(ev.id, sideMode)).filter(
    (item): item is WeddingEventDetail => Boolean(item)
  );
}

export const ALL_WEDDING_EVENT_DETAILS: WeddingEventDetail[] =
  getAllWeddingEventDetails('generic');

export function resolveEventDetails(
  eventIds: string[],
  sideMode: InviteSideMode = 'generic'
): WeddingEventDetail[] {
  const idSet = new Set(eventIds);
  return getAllWeddingEventDetails(sideMode)
    .filter((ev) => idSet.has(ev.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function formatEventLocationLine(
  event: Pick<WeddingEventDetail, 'venueName' | 'venueAddress'>
): string {
  const name = event.venueName.trim();
  const addr = event.venueAddress.trim();
  if (!addr) return name;
  return `${name}, ${addr}`;
}
