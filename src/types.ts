export type GuestSide = 'bride' | 'groom';
export type InviteSideMode = GuestSide | 'generic';

export type RsvpAttendance = 'coming' | 'not_coming';
export type RsvpFoodPreference = 'veg' | 'non_veg';
export type RsvpAlcoholPreference = 'alcohol' | 'no_alcohol';

export interface EventRsvpEntry {
  attending: RsvpAttendance;
  headcount: number | null;
  foodPreference: RsvpFoodPreference | null;
  alcoholPreference: RsvpAlcoholPreference | null;
}

export interface EventRsvpDraft {
  attending: RsvpAttendance | '';
  headcount: string;
  foodPreference: RsvpFoodPreference | '';
  alcoholPreference: RsvpAlcoholPreference | '';
}

export interface InvitationRsvp {
  byEvent: Record<string, EventRsvpEntry>;
  respondedAtMs: number;
}

export interface WeddingEvent {
  id: string;
  title: string;
  sortOrder: number;
}

export interface InvitationRecord {
  slug: string;
  isGeneric?: boolean;
  side: GuestSide;
  guestNames: string[];
  withFamily: boolean;
  displayGuestName: string;
  eventIds: string[];
  rsvp: InvitationRsvp | null;
  createdBy: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
