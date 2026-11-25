import assert from 'node:assert/strict';
import test from 'node:test';
import type { InvitationRecord } from '../types';
import {
  buildBrandedDisplayPath,
  buildGenericInvitationUrl,
  buildGenericWhatsAppMessage,
  buildGenericWhatsAppShareUrl,
  buildInitialEventRsvpDrafts,
  buildInvitationUrl,
  buildWhatsAppMessage,
  buildWhatsAppShareUrl,
  eventSupportsAlcohol,
  filterAndSortInvitations,
  formatEventAlcoholLabel,
  formatEventAttendanceLabel,
  formatEventFoodLabel,
  formatEventHeadcountLabel,
  formatGuestDisplayName,
  generateUniqueSlug,
  getCanonicalStudioTargetUrl,
  parseGenericInviteParams,
  parseInviteSlugFromPath,
  resolveInvitedEvents,
  summarizePerEventRsvps,
  validateAndNormalizePerEventRsvp,
  STUDIO_PATH,
  STUDIO_DISPLAY_PATH,
  buildStudioUrl,
  validateGenericInvitationDraft,
  validateInvitationDraft,
  WEDDING_EVENTS,
} from './invitationLogic';

const SAMPLE_INVITATIONS: InvitationRecord[] = [
  {
    slug: 'sourav-sen-and-family',
    side: 'bride',
    guestNames: ['Sourav Sen'],
    withFamily: true,
    displayGuestName: 'Sourav Sen & Family',
    eventIds: ['mehendi-cocktail', 'wedding'],
    rsvp: {
      byEvent: {
        'mehendi-cocktail': {
          attending: 'coming',
          headcount: 3,
          foodPreference: 'non_veg',
          alcoholPreference: 'alcohol',
        },
        wedding: {
          attending: 'coming',
          headcount: 4,
          foodPreference: 'veg',
          alcoholPreference: null,
        },
      },
      respondedAtMs: 1795071000000,
    },
    createdBy: 'studio-host',
    createdAtMs: 1795070400000,
    updatedAtMs: 1795070400000,
  },
  {
    slug: 'rahul-chatterjee-and-priya-chatterjee',
    side: 'groom',
    guestNames: ['Rahul Chatterjee', 'Priya Chatterjee'],
    withFamily: false,
    displayGuestName: 'Rahul Chatterjee & Priya Chatterjee',
    eventIds: ['wedding', 'reception'],
    rsvp: {
      byEvent: {
        wedding: {
          attending: 'not_coming',
          headcount: null,
          foodPreference: null,
          alcoholPreference: null,
        },
        reception: {
          attending: 'coming',
          headcount: 1,
          foodPreference: 'non_veg',
          alcoholPreference: null,
        },
      },
      respondedAtMs: 1795067000000,
    },
    createdBy: 'studio-host',
    createdAtMs: 1795066800000,
    updatedAtMs: 1795066800000,
  },
  {
    slug: 'dr-anirban-mukherjee',
    side: 'groom',
    guestNames: ['Dr. Anirban Mukherjee'],
    withFamily: false,
    displayGuestName: 'Dr. Anirban Mukherjee',
    eventIds: ['reception'],
    rsvp: null,
    createdBy: 'studio-host',
    createdAtMs: 1795063200000,
    updatedAtMs: 1795063200000,
  },
];

test('WEDDING_EVENTS contains the exact 6 events in exact requested order', () => {
  assert.deepEqual(
    WEDDING_EVENTS.map((e) => e.title),
    ['Mehendi/Cocktail', 'Aiburobhat', 'Haldi', 'Wedding', 'Boubhat', 'Reception']
  );
});

test('formatGuestDisplayName preserves exact spelling and handles withFamily cleanly', () => {
  assert.equal(formatGuestDisplayName(['Mr. & Mrs. Sourav Sen'], false), 'Mr. & Mrs. Sourav Sen');
  assert.equal(formatGuestDisplayName(['Sourav Sen'], true), 'Sourav Sen & Family');
  assert.equal(
    formatGuestDisplayName(['Rahul', 'Priya'], true),
    'Rahul, Priya & Family'
  );
  // Avoids duplicate "& Family" when already written
  assert.equal(formatGuestDisplayName(['Sen Family'], true), 'Sen Family');
});

test('generateUniqueSlug creates guaranteed-unique numerical IDs and never overwrites duplicates', () => {
  const used: string[] = [];
  const first = generateUniqueSlug(['Rahul Sen'], used, true);
  assert.match(first, /^\d{8,}$/);
  used.push(first);

  const second = generateUniqueSlug(['Rahul Sen'], used, true);
  assert.match(second, /^\d{8,}$/);
  assert.notEqual(second, first);
  used.push(second);

  const accentedName = generateUniqueSlug(['José & Renée'], used, false);
  assert.match(accentedName, /^\d{8,}$/);
  assert.ok(!used.includes(accentedName));
});

test('buildInvitationUrl, buildBrandedDisplayPath, and parseInviteSlugFromPath use /MedhaWedsSaptarshi/invite/<guestCode> with legacy /invite fallback', () => {
  const url = buildInvitationUrl('48291736', 'https://example.com');
  assert.equal(url, 'https://example.com/MedhaWedsSaptarshi/invite/48291736');
  assert.equal(
    buildBrandedDisplayPath('48291736'),
    '/MedhaWedsSaptarshi/invite/48291736'
  );

  assert.equal(parseInviteSlugFromPath('/MedhaWedsSaptarshi/invite/48291736'), '48291736');
  assert.equal(parseInviteSlugFromPath('/MedhaWedsSaptarshi/invite/48291736/'), '48291736');
  assert.equal(parseInviteSlugFromPath('/invite/48291736'), '48291736');
  assert.equal(parseInviteSlugFromPath('/invite/rahul-family'), 'rahul-family');
  assert.equal(parseInviteSlugFromPath('/invite/90218475/'), '90218475');
  assert.equal(parseInviteSlugFromPath('/'), null);
  assert.equal(parseInviteSlugFromPath('/studio'), null);
  assert.equal(parseInviteSlugFromPath('/MedhaWedsSaptarshi/studio'), null);
});

test('STUDIO_PATH, STUDIO_DISPLAY_PATH, buildStudioUrl, and getCanonicalStudioTargetUrl enforce /studio without stray hashes', () => {
  assert.equal(STUDIO_PATH, '/studio');
  assert.equal(STUDIO_DISPLAY_PATH, '/studio');
  assert.equal(
    buildStudioUrl('https://example.com'),
    'https://example.com/studio'
  );
  // Root, legacy studio path, and stray hashes normalize cleanly to /studio
  assert.equal(getCanonicalStudioTargetUrl('/', '', ''), '/studio');
  assert.equal(
    getCanonicalStudioTargetUrl('/MedhaWedsSaptarshi/studio', '', ''),
    '/studio'
  );
  assert.equal(
    getCanonicalStudioTargetUrl('/', '#us-through-the-years', ''),
    '/studio'
  );
  assert.equal(
    getCanonicalStudioTargetUrl('/studio', '#us-through-the-years', ''),
    '/studio'
  );
  assert.equal(
    getCanonicalStudioTargetUrl('/studio/', '', '?foo=1'),
    '/studio?foo=1'
  );
  // Already canonical returns null (prevents redundant replaceState loops)
  assert.equal(getCanonicalStudioTargetUrl('/studio', '', ''), null);
  assert.equal(getCanonicalStudioTargetUrl('/studio', '', '?foo=1'), null);
  // Invite routes are never rewritten to studio
  assert.equal(
    getCanonicalStudioTargetUrl(
      '/MedhaWedsSaptarshi/invite/reference',
      '#us-through-the-years',
      ''
    ),
    null
  );
  assert.equal(
    getCanonicalStudioTargetUrl('/MedhaWedsSaptarshi/invite/48291736', '', ''),
    null
  );
  assert.equal(
    getCanonicalStudioTargetUrl('/invite/reference', '#us-through-the-years', ''),
    null
  );
  assert.equal(
    getCanonicalStudioTargetUrl('/invite/48291736', '', ''),
    null
  );
});

test('filterAndSortInvitations sorts newest first and filters by guest name, event, and bride/groom side', () => {
  const sorted = filterAndSortInvitations(SAMPLE_INVITATIONS, '', 'all', 'all');
  assert.equal(sorted.length, 3);
  assert.ok(sorted[0].createdAtMs >= sorted[1].createdAtMs);

  const brideOnly = filterAndSortInvitations(SAMPLE_INVITATIONS, '', 'all', 'bride');
  assert.equal(brideOnly.length, 1);
  assert.equal(brideOnly[0].slug, 'sourav-sen-and-family');

  const groomOnly = filterAndSortInvitations(SAMPLE_INVITATIONS, '', 'all', 'groom');
  assert.equal(groomOnly.length, 2);

  const groomWedding = filterAndSortInvitations(SAMPLE_INVITATIONS, '', 'wedding', 'groom');
  assert.equal(groomWedding.length, 1);
  assert.equal(groomWedding[0].slug, 'rahul-chatterjee-and-priya-chatterjee');

  const byName = filterAndSortInvitations(SAMPLE_INVITATIONS, 'anirban', 'all', 'groom');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].slug, 'dr-anirban-mukherjee');
});

test('resolveInvitedEvents includes ONLY selected events in canonical order', () => {
  const subset = resolveInvitedEvents(['reception', 'mehendi-cocktail', 'wedding']);
  assert.deepEqual(
    subset.map((e) => e.title),
    ['Mehendi/Cocktail', 'Wedding', 'Reception']
  );
});

test('validateInvitationDraft enforces side, guest names, and selected events', () => {
  assert.equal(validateInvitationDraft('bride', [''], false, ['wedding']).valid, false);
  assert.equal(validateInvitationDraft('groom', ['Sourav Sen'], true, []).valid, false);
  assert.equal(validateInvitationDraft('groom', ['Sourav Sen'], true, ['wedding']).valid, true);
  assert.equal(validateInvitationDraft('bride', ['A'.repeat(121)], false, ['wedding']).valid, false);
});

test('buildWhatsAppMessage and buildWhatsAppShareUrl match exact final copy with invitation-specific URL', () => {
  const inviteUrl = 'https://example.com/MedhaWedsSaptarshi/invite/48291736';
  const expected = `❤️ *A WEDDING INVITATION* ❤️

Some of life's most beautiful moments become even more special when shared with the people we hold dear.

As we begin a beautiful new chapter together, we are delighted to invite you to be a part of our wedding celebrations. Your presence, love, and blessings would make this occasion truly unforgettable.

We have created a wedding website with all the details of our celebrations and our invitation.

✨ *OUR WEDDING INVITATION* 🔗 ${inviteUrl}

You can also scan the QR code attached to this message to access our invitation.

We sincerely hope you will join us as we celebrate love, togetherness, and the beginning of our forever!

With Love, 
_*Medha & Saptarshi*_ ❤️`;

  const msg = buildWhatsAppMessage('Sourav Sen & Family', inviteUrl);
  assert.equal(msg, expected);

  const waUrl = buildWhatsAppShareUrl('Sourav Sen & Family', inviteUrl);
  assert.ok(waUrl.startsWith('https://wa.me/?text='));
  assert.equal(decodeURIComponent(waUrl.replace('https://wa.me/?text=', '')), expected);
});

test('filterAndSortInvitations prioritizes updatedAtMs over createdAtMs so edited invitations move to top', () => {
  const editedOldest: InvitationRecord = {
    ...SAMPLE_INVITATIONS[2], // oldest createdAtMs: 1795063200000
    updatedAtMs: 1795090000000, // edited after SAMPLE_INVITATIONS[0] (1795070400000)
  };
  const sorted = filterAndSortInvitations(
    [SAMPLE_INVITATIONS[0], SAMPLE_INVITATIONS[1], editedOldest],
    '',
    'all',
    'all'
  );
  assert.deepEqual(
    sorted.map((i) => i.slug),
    [
      'dr-anirban-mukherjee',
      'sourav-sen-and-family',
      'rahul-chatterjee-and-priya-chatterjee',
    ]
  );
});

test('generic invitation URL builder, parser, validation, and WhatsApp share work without guest names', () => {
  assert.equal(validateGenericInvitationDraft('groom', []).valid, false);
  assert.equal(validateGenericInvitationDraft('groom', ['wedding', 'reception']).valid, true);

  const url = buildGenericInvitationUrl(
    'groom',
    ['reception', 'mehendi-cocktail', 'wedding'],
    'https://example.com'
  );
  assert.equal(
    url,
    'https://example.com/MedhaWedsSaptarshi/invite/generic?side=groom&events=mehendi-cocktail%2Cwedding%2Creception'
  );

  const parsed = parseGenericInviteParams(new URL(url).search);
  assert.equal(parsed.side, 'groom');
  assert.deepEqual(parsed.eventIds, ['mehendi-cocktail', 'wedding', 'reception']);

  const dbGenericUrl = buildInvitationUrl('51928374', 'https://example.com');
  assert.equal(
    dbGenericUrl,
    'https://example.com/MedhaWedsSaptarshi/invite/51928374'
  );

  const msg = buildGenericWhatsAppMessage(dbGenericUrl);
  assert.ok(msg.includes(`✨ *OUR WEDDING INVITATION* 🔗 ${dbGenericUrl}`));
  assert.ok(!msg.includes('generic?side='));
  assert.ok(msg.includes('_*Medha & Saptarshi*_ ❤️'));

  const waUrl = buildGenericWhatsAppShareUrl(dbGenericUrl);
  assert.ok(waUrl.startsWith('https://wa.me/?text='));
  assert.equal(decodeURIComponent(waUrl.replace('https://wa.me/?text=', '')), msg);
});

test('buildInitialEventRsvpDrafts and validateAndNormalizePerEventRsvp scope to applicable events, validate headcount, and allow clearing radios', () => {
  const drafts = buildInitialEventRsvpDrafts(
    SAMPLE_INVITATIONS[0].eventIds,
    SAMPLE_INVITATIONS[0].rsvp
  );
  assert.deepEqual(Object.keys(drafts), ['mehendi-cocktail', 'wedding']);
  assert.equal(drafts['mehendi-cocktail'].headcount, '3');
  assert.equal(drafts.wedding.foodPreference, 'veg');

  // Invalid headcount (0 or decimal) is rejected
  const invalidCount = validateAndNormalizePerEventRsvp(['mehendi-cocktail'], {
    'mehendi-cocktail': {
      attending: 'coming',
      headcount: '0',
      foodPreference: 'veg',
      alcoholPreference: 'no_alcohol',
    },
  });
  assert.equal(invalidCount.valid, false);

  // Clearing food/alcohol radios while keeping coming + clearing an event completely
  const partiallyCleared = validateAndNormalizePerEventRsvp(
    ['mehendi-cocktail', 'wedding'],
    {
      'mehendi-cocktail': {
        attending: 'coming',
        headcount: '3',
        foodPreference: 'non_veg',
        alcoholPreference: '',
      },
      wedding: {
        attending: '',
        headcount: '1',
        foodPreference: '',
        alcoholPreference: '',
      },
      // Non-applicable event must be ignored
      reception: {
        attending: 'coming',
        headcount: '5',
        foodPreference: 'veg',
        alcoholPreference: 'alcohol',
      },
    }
  );
  assert.equal(partiallyCleared.valid, true);
  assert.deepEqual(partiallyCleared.byEvent, {
    'mehendi-cocktail': {
      attending: 'coming',
      headcount: 3,
      foodPreference: 'non_veg',
      alcoholPreference: null,
    },
  });

  // Clearing all events yields an empty byEvent map (saved as rsvp: null)
  const allCleared = validateAndNormalizePerEventRsvp(['wedding'], {
    wedding: {
      attending: '',
      headcount: '1',
      foodPreference: '',
      alcoholPreference: '',
    },
  });
  assert.equal(allCleared.valid, true);
  assert.deepEqual(allCleared.byEvent, {});
  // Non-family invitations (allowHeadcount=false) always force headcount to 1,
  // and alcoholPreference is strictly stripped for every event except mehendi-cocktail.
  assert.equal(eventSupportsAlcohol('mehendi-cocktail'), true);
  assert.equal(eventSupportsAlcohol('wedding'), false);
  assert.equal(eventSupportsAlcohol('reception'), false);

  const nonFamilyNormalized = validateAndNormalizePerEventRsvp(
    ['mehendi-cocktail', 'wedding'],
    {
      'mehendi-cocktail': {
        attending: 'coming',
        headcount: '9',
        foodPreference: 'veg',
        alcoholPreference: 'alcohol',
      },
      wedding: {
        attending: 'coming',
        headcount: '5',
        foodPreference: 'non_veg',
        alcoholPreference: 'alcohol',
      },
    },
    false
  );
  assert.equal(nonFamilyNormalized.valid, true);
  assert.deepEqual(nonFamilyNormalized.byEvent, {
    'mehendi-cocktail': {
      attending: 'coming',
      headcount: 1,
      foodPreference: 'veg',
      alcoholPreference: 'alcohol',
    },
    wedding: {
      attending: 'coming',
      headcount: 1,
      foodPreference: 'non_veg',
      alcoholPreference: null,
    },
  });
});

test('summarizePerEventRsvps and per-event formatters compute accurate headcount totals and enforce mehendi-only alcohol & non-family headcount=1', () => {
  const allSummary = summarizePerEventRsvps(SAMPLE_INVITATIONS, 'all');
  assert.deepEqual(allSummary, {
    totalSlots: 5,
    coming: 3,
    totalHeadcount: 8, // 3 (mehendi) + 4 (wedding) + 1 (reception, withFamily=false)
    notComing: 1,
    pending: 1,
    veg: 4, // 4 (wedding)
    nonVeg: 4, // 3 (mehendi) + 1 (reception)
    alcohol: 3, // 3 (mehendi)
    noAlcohol: 0,
  });

  const receptionSummary = summarizePerEventRsvps(SAMPLE_INVITATIONS, 'reception');
  assert.deepEqual(receptionSummary, {
    totalSlots: 2,
    coming: 1,
    totalHeadcount: 1,
    notComing: 0,
    pending: 1,
    veg: 0,
    nonVeg: 1,
    alcohol: 0,
    noAlcohol: 0,
  });

  const comingEntry = SAMPLE_INVITATIONS[0].rsvp?.byEvent['mehendi-cocktail'];
  assert.equal(formatEventAttendanceLabel(comingEntry), 'Coming');
  assert.equal(formatEventHeadcountLabel(comingEntry, true), '3');
  assert.equal(formatEventHeadcountLabel(comingEntry, false), '1');
  assert.equal(formatEventFoodLabel(comingEntry), 'Non-Veg');
  assert.equal(formatEventAlcoholLabel(comingEntry, 'mehendi-cocktail'), 'Alcohol');
  assert.equal(formatEventAlcoholLabel(comingEntry, 'wedding'), '—');

  const notComingEntry = SAMPLE_INVITATIONS[1].rsvp?.byEvent.wedding;
  assert.equal(formatEventAttendanceLabel(notComingEntry), 'Not Coming');
  assert.equal(formatEventHeadcountLabel(notComingEntry, false), '—');
  assert.equal(formatEventFoodLabel(notComingEntry), '—');
  assert.equal(formatEventAlcoholLabel(notComingEntry, 'wedding'), '—');

  assert.equal(formatEventAttendanceLabel(undefined), 'Pending');
  assert.equal(formatEventHeadcountLabel(undefined, false), '—');
  assert.equal(formatEventFoodLabel(undefined), '—');
  assert.equal(formatEventAlcoholLabel(undefined, 'mehendi-cocktail'), '—');
});
