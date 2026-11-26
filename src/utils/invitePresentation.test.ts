import assert from 'node:assert/strict';
import test from 'node:test';
import { FAMILY_CONTACTS, getPhoneLinkAttributes } from '../data/familyContacts';
import {
  ALL_WEDDING_EVENT_DETAILS,
  formatEventLocationLine,
  getAllWeddingEventDetails,
  resolveEventDetails,
} from '../data/weddingEventDetails';
import {
  buildEventIcsContent,
  buildGoogleMapsSearchUrl,
  buildUpdatedSideSearch,
  computeCountdownParts,
  detectMobileDevice,
  getEventDirectionsState,
  getEventMediaConfig,
  getEventSideHeaderLabel,
  hasKnowMoreContent,
  parseSideQueryParam,
  pickNextCountdownEvent,
  resolveDeviceDirectionsUrl,
  resolveInviteSideMode,
} from './invitePresentation';

test('getAllWeddingEventDetails resolves all 6 events in 2027 with Bride Haldi at Space Circle Club, strict side copy, and mobile/desktop Maps URLs', () => {
  const brideEvents = getAllWeddingEventDetails('bride');
  const groomEvents = getAllWeddingEventDetails('groom');
  const genericEvents = getAllWeddingEventDetails('generic');

  assert.equal(brideEvents.length, 6);
  assert.equal(groomEvents.length, 6);
  assert.equal(genericEvents.length, 6);
  assert.equal(ALL_WEDDING_EVENT_DETAILS.length, 6);

  assert.deepEqual(
    brideEvents.map((ev) => ev.title),
    [
      'Mehendi & Cocktail',
      'Aiburobhat',
      'Haldi (Gaye Holud)',
      'The Wedding (Biye)',
      'Boubhat',
      'Reception',
    ]
  );

  // Every event date and startIso must be in 2027
  assert.deepEqual(
    brideEvents.map((ev) => `${ev.dateLabel} | ${ev.timeLabel}`),
    [
      '07/02/2027 | 6:00 PM onwards',
      '10/02/2027 | 11:00 AM onwards',
      '11/02/2027 | 11:00 AM onwards',
      '11/02/2027 | 6:30 PM onwards',
      '13/02/2027 | 6:30 PM onwards',
      '14/02/2027 | 6:30 PM onwards',
    ]
  );

  for (const ev of brideEvents) {
    assert.ok(ev.dateLabel.endsWith('/2027'), `Expected 2027 dateLabel for ${ev.id}`);
    assert.ok(ev.startIso.startsWith('2027-'), `Expected 2027 startIso for ${ev.id}`);
    if (ev.directionsUrl) {
      assert.ok(
        ev.directionsUrl.startsWith('https://www.google.com/maps/search/?api=1&query='),
        `Expected full desktop Google Maps search URL for ${ev.id}, got ${ev.directionsUrl}`
      );
      assert.ok(!ev.directionsUrl.includes('maps.app.goo.gl'));
    }
    if (ev.mobileDirectionsUrl) {
      assert.ok(
        ev.mobileDirectionsUrl.startsWith('https://maps.app.goo.gl/'),
        `Expected exact mobile pin URL for ${ev.id}, got ${ev.mobileDirectionsUrl}`
      );
    }
  }

  // Events 1, 4, 5, 6 share exact details, locations, direction links, and videos for all modes
  for (const idx of [0, 3, 4, 5]) {
    assert.equal(brideEvents[idx].sideSpecific, false);
    assert.equal(brideEvents[idx].venueName, groomEvents[idx].venueName);
    assert.equal(brideEvents[idx].venueAddress, groomEvents[idx].venueAddress);
    assert.equal(brideEvents[idx].directionsUrl, groomEvents[idx].directionsUrl);
    assert.equal(
      brideEvents[idx].mobileDirectionsUrl,
      groomEvents[idx].mobileDirectionsUrl
    );
    assert.equal(brideEvents[idx].videoSrc, groomEvents[idx].videoSrc);
    assert.equal(genericEvents[idx].combinedSides, undefined);
  }

  // Event 1: Mehendi & Cocktail (Location TBD, disabled directions, Women & Men dress code)
  const mehendi = brideEvents[0];
  assert.equal(mehendi.venueName, 'TBD');
  assert.equal(mehendi.directionsUrl, null);
  assert.equal(mehendi.mobileDirectionsUrl, null);
  assert.equal(mehendi.directionsDisabled, true);
  assert.equal(mehendi.videoSrc, '/videos/Mehendi_Cocktail.mp4');
  assert.deepEqual(
    mehendi.dressCodeBreakdown?.map((d) => d.label),
    ['Women', 'Men']
  );

  // Event 2: Aiburobhat (Bride's Family House vs Sudhantar + strict single-person copy)
  const brideAiburo = brideEvents[1];
  const groomAiburo = groomEvents[1];
  const genericAiburo = genericEvents[1];
  assert.equal(brideAiburo.sideSpecific, true);
  assert.equal(
    formatEventLocationLine(brideAiburo),
    "Bride's Family House, Baranagar, Kolkata"
  );
  assert.equal(
    brideAiburo.directionsUrl,
    'https://www.google.com/maps/search/?api=1&query=Baranagar,+Kolkata'
  );
  assert.equal(
    brideAiburo.mobileDirectionsUrl,
    'https://maps.app.goo.gl/c3vwytokt9i6m9Pp8'
  );
  assert.equal(brideAiburo.videoSrc, '/videos/Aiburobhat_Bride.mp4');
  assert.equal(
    brideAiburo.description,
    "The ultimate Bengali bachelorette feast! Join us as the bride enjoys her 'last meal' of singlehood—a grand spread of traditional delicacies, endless pampering, and warm family blessings before she officially takes the plunge."
  );
  assert.ok(!/groom|bride\/groom/i.test(brideAiburo.description));

  assert.equal(
    formatEventLocationLine(groomAiburo),
    'Sudhantar (Kundu Family House), Barrackpore, Kolkata'
  );
  assert.equal(
    groomAiburo.directionsUrl,
    'https://www.google.com/maps/search/?api=1&query=Sudhantar+Barrackpore+Kolkata'
  );
  assert.equal(
    groomAiburo.mobileDirectionsUrl,
    'https://maps.app.goo.gl/5eEXFCvmFcck8kns5'
  );
  assert.equal(groomAiburo.videoSrc, '/videos/Aiburobhat_Groom.mp4');
  assert.equal(
    groomAiburo.description,
    "The ultimate Bengali bachelor feast! Join us as the groom enjoys his 'last meal' of singlehood—a grand spread of traditional delicacies, endless pampering, and warm family blessings before he officially takes the plunge."
  );
  assert.ok(!/bride|bride\/groom/i.test(groomAiburo.description));

  assert.ok(genericAiburo.combinedSides);
  assert.equal(genericAiburo.combinedSides.bride.videoSrc, '/videos/Aiburobhat_Bride.mp4');
  assert.equal(genericAiburo.combinedSides.groom.videoSrc, '/videos/Aiburobhat_Groom.mp4');
  assert.equal(genericAiburo.combinedSides.bride.directionsUrl, brideAiburo.directionsUrl);
  assert.equal(genericAiburo.combinedSides.groom.directionsUrl, groomAiburo.directionsUrl);
  assert.equal(
    genericAiburo.combinedSides.bride.mobileDirectionsUrl,
    'https://maps.app.goo.gl/c3vwytokt9i6m9Pp8'
  );
  assert.equal(
    genericAiburo.combinedSides.groom.mobileDirectionsUrl,
    'https://maps.app.goo.gl/5eEXFCvmFcck8kns5'
  );

  // Event 3: Haldi (Bride = Space Circle Club, Groom = Sudhantar + exact side copy)
  const brideHaldi = brideEvents[2];
  const groomHaldi = groomEvents[2];
  const genericHaldi = genericEvents[2];
  assert.equal(brideHaldi.sideSpecific, true);
  assert.equal(formatEventLocationLine(brideHaldi), 'Space Circle Club, VIP Road, Kolkata');
  assert.equal(
    brideHaldi.directionsUrl,
    'https://www.google.com/maps/search/?api=1&query=Space+Circle+Club+Kolkata'
  );
  assert.equal(
    brideHaldi.mobileDirectionsUrl,
    'https://maps.app.goo.gl/2idBMsrrdSpuYimE8'
  );
  assert.equal(brideHaldi.videoSrc, '/videos/Haldi_Bride.mp4');
  assert.equal(
    brideHaldi.description,
    'A splash of yellow, sacred turmeric, and pure joy! Join us as we drench the bride in blessed holud paste—straight from the groom’s home—to bring out that pre-wedding glow, accompanied by music, laughter, and lots of playful chaos.'
  );
  assert.ok(!/bride\/groom/i.test(brideHaldi.description));

  assert.equal(
    formatEventLocationLine(groomHaldi),
    'Sudhantar (Kundu Family House), Barrackpore, Kolkata'
  );
  assert.equal(
    groomHaldi.directionsUrl,
    'https://www.google.com/maps/search/?api=1&query=Sudhantar+Barrackpore+Kolkata'
  );
  assert.equal(
    groomHaldi.mobileDirectionsUrl,
    'https://maps.app.goo.gl/5eEXFCvmFcck8kns5'
  );
  assert.equal(groomHaldi.videoSrc, '/videos/Haldi_Groom.mp4');
  assert.equal(
    groomHaldi.description,
    'A splash of yellow, sacred turmeric, and pure joy! Join us as we drench the groom in blessed holud paste—straight from the bride’s home—to bring out that pre-wedding glow, accompanied by music, laughter, and lots of playful chaos.'
  );
  assert.ok(!/bride\/groom/i.test(groomHaldi.description));

  assert.ok(genericHaldi.combinedSides);
  assert.equal(genericHaldi.combinedSides.bride.venueName, 'Space Circle Club');
  assert.equal(
    genericHaldi.combinedSides.bride.mobileDirectionsUrl,
    'https://maps.app.goo.gl/2idBMsrrdSpuYimE8'
  );
  assert.equal(
    genericHaldi.combinedSides.groom.venueName,
    'Sudhantar (Kundu Family House)'
  );
  assert.equal(genericHaldi.combinedSides.bride.videoSrc, '/videos/Haldi_Bride.mp4');
  assert.equal(genericHaldi.combinedSides.groom.videoSrc, '/videos/Haldi_Groom.mp4');

  // Events 4, 5, 6 exact desktop + mobile Google Maps links and /videos/*.mp4 paths
  assert.equal(brideEvents[3].venueName, 'Space Circle Club');
  assert.equal(
    formatEventLocationLine(brideEvents[3]),
    'Space Circle Club, VIP Road, Kolkata'
  );
  assert.equal(
    brideEvents[3].directionsUrl,
    'https://www.google.com/maps/search/?api=1&query=Space+Circle+Club+Kolkata'
  );
  assert.equal(
    brideEvents[3].mobileDirectionsUrl,
    'https://maps.app.goo.gl/2idBMsrrdSpuYimE8'
  );
  assert.equal(brideEvents[3].videoSrc, '/videos/Wedding.mp4');

  assert.equal(
    formatEventLocationLine(brideEvents[4]),
    'Sudhantar (Kundu Family House), Barrackpore, Kolkata'
  );
  assert.equal(
    brideEvents[4].directionsUrl,
    'https://www.google.com/maps/search/?api=1&query=Sudhantar+Barrackpore+Kolkata'
  );
  assert.equal(
    brideEvents[4].mobileDirectionsUrl,
    'https://maps.app.goo.gl/5eEXFCvmFcck8kns5'
  );
  assert.equal(brideEvents[4].videoSrc, '/videos/Boubhat.mp4');

  assert.equal(
    formatEventLocationLine(brideEvents[5]),
    'HRS Bhawan, Barrackpore, Kolkata'
  );
  assert.equal(
    brideEvents[5].directionsUrl,
    'https://www.google.com/maps/search/?api=1&query=HRS+Bhawan+Barrackpore+Kolkata'
  );
  assert.equal(
    brideEvents[5].mobileDirectionsUrl,
    'https://maps.app.goo.gl/NrtzLgRoq7QMoTqm8'
  );
  assert.equal(brideEvents[5].videoSrc, '/videos/Reception.mp4');

  const subset = resolveEventDetails(['reception', 'aiburobhat'], 'groom');
  assert.deepEqual(
    subset.map((ev) => ev.id),
    ['aiburobhat', 'reception']
  );
  assert.equal(subset[0].venueName, 'Sudhantar (Kundu Family House)');
});

test('detectMobileDevice and getEventDirectionsState serve maps.app.goo.gl on phones & tablets and standard Google Maps URLs on desktop', () => {
  // iPhone
  assert.equal(
    detectMobileDevice({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      viewportWidth: 390,
      hasCoarsePointer: true,
      maxTouchPoints: 5,
    }),
    true
  );
  // Android phone
  assert.equal(
    detectMobileDevice({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile',
      viewportWidth: 412,
    }),
    true
  );
  // iPadOS Safari desktop-mode UA (Macintosh + multi-touch)
  assert.equal(
    detectMobileDevice({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      platform: 'MacIntel',
      viewportWidth: 1024,
      hasCoarsePointer: true,
      maxTouchPoints: 5,
    }),
    true
  );
  // Android Tablet (landscape 1180px)
  assert.equal(
    detectMobileDevice({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36',
      viewportWidth: 1180,
      hasCoarsePointer: true,
      maxTouchPoints: 5,
    }),
    true
  );
  // Touch tablet viewport without mobile UA (e.g. emulator / tablet browser at 820px)
  assert.equal(
    detectMobileDevice({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      viewportWidth: 820,
      hasCoarsePointer: true,
      maxTouchPoints: 5,
    }),
    true
  );
  // Desktop MacBook
  assert.equal(
    detectMobileDevice({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      viewportWidth: 1440,
      hasCoarsePointer: false,
      maxTouchPoints: 0,
    }),
    false
  );
  // Desktop Windows laptop (even with touchscreen at 1366px fine pointer)
  assert.equal(
    detectMobileDevice({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      platform: 'Win32',
      viewportWidth: 1366,
      hasCoarsePointer: false,
      maxTouchPoints: 10,
    }),
    false
  );

  const [mehendi, aiburobhat, haldi, wedding, boubhat, reception] =
    getAllWeddingEventDetails('bride');

  assert.deepEqual(getEventDirectionsState(mehendi, false), {
    disabled: true,
    href: null,
    label: 'Location TBD',
    tooltip: 'Location TBD',
  });
  assert.deepEqual(getEventDirectionsState(mehendi, true), {
    disabled: true,
    href: null,
    label: 'Location TBD',
    tooltip: 'Location TBD',
  });

  // Desktop mode -> exact standard Google Maps search URLs
  assert.equal(
    getEventDirectionsState(aiburobhat, false).href,
    'https://www.google.com/maps/search/?api=1&query=Baranagar,+Kolkata'
  );
  assert.equal(
    getEventDirectionsState(haldi, false).href,
    'https://www.google.com/maps/search/?api=1&query=Space+Circle+Club+Kolkata'
  );
  assert.equal(
    getEventDirectionsState(wedding, false).href,
    'https://www.google.com/maps/search/?api=1&query=Space+Circle+Club+Kolkata'
  );
  assert.equal(
    getEventDirectionsState(boubhat, false).href,
    'https://www.google.com/maps/search/?api=1&query=Sudhantar+Barrackpore+Kolkata'
  );
  assert.equal(
    getEventDirectionsState(reception, false).href,
    'https://www.google.com/maps/search/?api=1&query=HRS+Bhawan+Barrackpore+Kolkata'
  );

  // Mobile mode -> exact saved maps.app.goo.gl pins
  assert.equal(
    getEventDirectionsState(aiburobhat, true).href,
    'https://maps.app.goo.gl/c3vwytokt9i6m9Pp8'
  );
  assert.equal(
    getEventDirectionsState(haldi, true).href,
    'https://maps.app.goo.gl/2idBMsrrdSpuYimE8'
  );
  assert.equal(
    getEventDirectionsState(wedding, true).href,
    'https://maps.app.goo.gl/2idBMsrrdSpuYimE8'
  );
  assert.equal(
    getEventDirectionsState(boubhat, true).href,
    'https://maps.app.goo.gl/5eEXFCvmFcck8kns5'
  );
  assert.equal(
    getEventDirectionsState(reception, true).href,
    'https://maps.app.goo.gl/NrtzLgRoq7QMoTqm8'
  );
  assert.equal(
    resolveDeviceDirectionsUrl(
      {
        directionsUrl: 'https://www.google.com/maps/search/?api=1&query=Space+Circle+Club+Kolkata',
        mobileDirectionsUrl: 'https://maps.app.goo.gl/2idBMsrrdSpuYimE8',
      },
      true
    ),
    'https://maps.app.goo.gl/2idBMsrrdSpuYimE8'
  );
});

test('parseSideQueryParam, resolveInviteSideMode, and buildUpdatedSideSearch handle bride, groom, generic, and default modes', () => {
  assert.equal(parseSideQueryParam('?side=bride'), 'bride');
  assert.equal(parseSideQueryParam('?side=groom'), 'groom');
  assert.equal(parseSideQueryParam('?side=generic'), 'generic');
  assert.equal(parseSideQueryParam('?autostart=1&side=GROOM'), 'groom');
  assert.equal(parseSideQueryParam('?side=invalid'), null);
  assert.equal(parseSideQueryParam(''), null);

  // Explicit URL query parameter always wins
  assert.equal(
    resolveInviteSideMode({ search: '?side=groom', invitationSide: 'bride' }),
    'groom'
  );
  assert.equal(
    resolveInviteSideMode({ search: '?side=generic', invitationSide: 'bride' }),
    'generic'
  );
  // Default when no query param on reference/generic routes is generic combined mode
  assert.equal(
    resolveInviteSideMode({ search: '', preferGenericWhenNoParam: true }),
    'generic'
  );
  assert.equal(resolveInviteSideMode({ search: '' }), 'generic');
  // Stored invitation side is honored for personalized invites when no ?side param is passed
  assert.equal(
    resolveInviteSideMode({ search: '', invitationSide: 'groom' }),
    'groom'
  );

  assert.equal(
    buildUpdatedSideSearch('?autostart=1&side=bride', 'groom'),
    '?autostart=1&side=groom'
  );
  assert.equal(buildUpdatedSideSearch('', 'generic'), '?side=generic');

  // Side-aware event header/details badges
  const brideAiburo = getAllWeddingEventDetails('bride')[1];
  const groomAiburo = getAllWeddingEventDetails('groom')[1];
  const genericAiburo = getAllWeddingEventDetails('generic')[1];
  const weddingEvent = getAllWeddingEventDetails('bride')[3];
  assert.equal(getEventSideHeaderLabel(brideAiburo), "Bride's Side");
  assert.equal(getEventSideHeaderLabel(groomAiburo), "Groom's Side");
  assert.equal(getEventSideHeaderLabel(genericAiburo), "Bride's & Groom's Sides");
  assert.equal(getEventSideHeaderLabel(weddingEvent), null);
});

test('computeCountdownParts computes exact days, hours, minutes, seconds and handles past timestamps', () => {
  const target = '2027-02-11T11:00:00+05:30';
  const targetMs = Date.parse(target);
  const twoDaysThreeHoursFiveMinNineSecBefore =
    targetMs - (2 * 86400 + 3 * 3600 + 5 * 60 + 9) * 1000;

  assert.deepEqual(
    computeCountdownParts(target, twoDaysThreeHoursFiveMinNineSecBefore),
    {
      days: 2,
      hours: 3,
      minutes: 5,
      seconds: 9,
      isPast: false,
    }
  );

  assert.deepEqual(computeCountdownParts(target, targetMs + 1000), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: true,
  });
});

test('pickNextCountdownEvent returns earliest upcoming invited event', () => {
  const subset = resolveEventDetails(['aiburobhat', 'haldi'], 'bride');
  const beforeAll = Date.parse('2026-11-20T12:00:00+05:30');
  assert.equal(pickNextCountdownEvent(subset, beforeAll)?.id, 'aiburobhat');

  const afterAiburobhat = Date.parse('2027-02-10T15:00:00+05:30');
  assert.equal(pickNextCountdownEvent(subset, afterAiburobhat)?.id, 'haldi');
});

test('buildEventIcsContent emits valid RFC 5545 VCALENDAR with escaped fields', () => {
  const ev = resolveEventDetails(['wedding'], 'bride')[0];
  const ics = buildEventIcsContent(
    ev,
    'Sourav Sen & Family',
    new Date('2026-11-20T10:00:00Z')
  );
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('SUMMARY:Medha & Saptarshi — The Wedding (Biye)'));
  assert.ok(ics.includes('Invited Guest: Sourav Sen & Family'));
  assert.ok(ics.endsWith('END:VCALENDAR'));
});

test('buildGoogleMapsSearchUrl encodes venue and address safely', () => {
  const url = buildGoogleMapsSearchUrl('HRS Bhawan', 'Barrackpore, Kolkata');
  assert.equal(
    url,
    'https://www.google.com/maps/search/?api=1&query=HRS%20Bhawan%2C%20Barrackpore%2C%20Kolkata'
  );
});

test('getEventMediaConfig enforces looping muted autoplay without controls and detects attached video URLs', () => {
  const withoutVideo = getEventMediaConfig({});
  assert.deepEqual(withoutVideo, {
    hasVideo: false,
    videoSrc: null,
    autoPlay: true,
    loop: true,
    muted: true,
    playsInline: true,
    controls: false,
  });

  const whitespaceVideo = getEventMediaConfig({ videoSrc: '   ' });
  assert.equal(whitespaceVideo.hasVideo, false);
  assert.equal(whitespaceVideo.videoSrc, null);

  const withVideo = getEventMediaConfig({
    videoSrc: ' /videos/Haldi_Bride.mp4 ',
  });
  assert.deepEqual(withVideo, {
    hasVideo: true,
    videoSrc: '/videos/Haldi_Bride.mp4',
    autoPlay: true,
    loop: true,
    muted: true,
    playsInline: true,
    controls: false,
  });
});

test('every celebration event provides valid Details cultural description and dress code', () => {
  for (const ev of getAllWeddingEventDetails('generic')) {
    assert.equal(
      hasKnowMoreContent(ev),
      true,
      `Expected Details description and dress code for ${ev.id}`
    );
  }
  assert.equal(
    hasKnowMoreContent({ title: 'Haldi', description: '   ', dressCode: 'Yellow' }),
    false
  );
  assert.equal(
    hasKnowMoreContent({ title: 'Haldi', description: 'Turmeric!', dressCode: '' }),
    false
  );
});

test('FAMILY_CONTACTS contains exact Kundu and Bhattacharya family phone and WhatsApp links', () => {
  assert.deepEqual(
    FAMILY_CONTACTS.kundu.contacts.map((c) => ({
      name: c.name,
      telHref: c.telHref,
      whatsappHref: c.whatsappHref,
    })),
    [
      {
        name: 'Susanta',
        telHref: 'tel:+919831391153',
        whatsappHref: 'https://wa.me/919831391153',
      },
      {
        name: 'Piyali',
        telHref: 'tel:+917980577725',
        whatsappHref: 'https://wa.me/917980577725',
      },
      {
        name: 'Saptarshi',
        telHref: 'tel:+919163245324',
        whatsappHref: 'https://wa.me/919163245324',
      },
    ]
  );

  assert.deepEqual(
    FAMILY_CONTACTS.bhattacharya.contacts.map((c) => ({
      name: c.name,
      telHref: c.telHref,
      whatsappHref: c.whatsappHref,
    })),
    [
      {
        name: 'Utpal',
        telHref: 'tel:+919830139367',
        whatsappHref: 'https://wa.me/919830139367',
      },
      {
        name: 'Sudipta',
        telHref: 'tel:+919836359573',
        whatsappHref: 'https://wa.me/919836359573',
      },
      {
        name: 'Medha',
        telHref: 'tel:+919804020706',
        whatsappHref: 'https://wa.me/919804020706',
      },
    ]
  );

  assert.deepEqual(getPhoneLinkAttributes(), {
    target: '_blank',
    rel: 'noopener noreferrer',
  });
});
