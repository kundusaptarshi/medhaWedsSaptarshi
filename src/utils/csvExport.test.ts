import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFilteredInviteLinksCsv,
  escapeCsvCell,
  getCsvGuestDisplayName,
  UTF8_BOM,
} from './csvExport';

test('escapeCsvCell properly escapes commas, quotes, and newlines per RFC 4180', () => {
  assert.equal(escapeCsvCell('Sourav Sen & Family'), 'Sourav Sen & Family');
  assert.equal(escapeCsvCell('Sen, Sourav'), '"Sen, Sourav"');
  assert.equal(escapeCsvCell('Dr. "Raju" Bose'), '"Dr. ""Raju"" Bose"');
  assert.equal(escapeCsvCell('Line 1\nLine 2'), '"Line 1\nLine 2"');
  assert.equal(escapeCsvCell('Line 1\r\nLine 2'), '"Line 1\r\nLine 2"');
  assert.equal(escapeCsvCell(''), '');
});

test('getCsvGuestDisplayName prefers displayGuestName and falls back to joined guestNames', () => {
  assert.equal(
    getCsvGuestDisplayName({
      slug: '12345678',
      displayGuestName: 'Sourav Sen & Family',
      guestNames: ['Sourav Sen'],
    }),
    'Sourav Sen & Family'
  );
  assert.equal(
    getCsvGuestDisplayName({
      slug: '87654321',
      displayGuestName: '   ',
      guestNames: ['Rahul Chatterjee', 'Priya Chatterjee'],
    }),
    'Rahul Chatterjee, Priya Chatterjee'
  );
});

test('buildFilteredInviteLinksCsv prepends UTF-8 BOM, includes header, formats clean links, and escapes special characters', () => {
  const csv = buildFilteredInviteLinksCsv(
    [
      {
        slug: '48291736',
        displayGuestName: 'Sourav Sen & Family',
        guestNames: ['Sourav Sen'],
      },
      {
        slug: '91827364',
        displayGuestName: 'Mr. A. Roy, Mrs. B. "Mitu" Roy',
        guestNames: ['Mr. A. Roy', 'Mrs. B. "Mitu" Roy'],
      },
      {
        slug: '11223344',
        displayGuestName: '',
        guestNames: ['Ananya Das', 'Rohan Das'],
      },
    ],
    'https://medhawedssaptarshi.com'
  );

  assert.ok(csv.startsWith(UTF8_BOM), 'CSV must start with UTF-8 BOM for Excel');
  const withoutBom = csv.slice(1);
  assert.equal(
    withoutBom,
    [
      'Guest Name,Invite Link',
      'Sourav Sen & Family,https://medhawedssaptarshi.com/invite/48291736',
      '"Mr. A. Roy, Mrs. B. ""Mitu"" Roy",https://medhawedssaptarshi.com/invite/91827364',
      '"Ananya Das, Rohan Das",https://medhawedssaptarshi.com/invite/11223344',
      '',
    ].join('\r\n')
  );
});

test('buildFilteredInviteLinksCsv handles empty filtered results cleanly', () => {
  const csv = buildFilteredInviteLinksCsv([], 'https://medhawedssaptarshi.com');
  assert.equal(csv, `${UTF8_BOM}Guest Name,Invite Link\r\n`);
});
