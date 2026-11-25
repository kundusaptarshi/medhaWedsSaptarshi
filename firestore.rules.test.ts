import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { BLUEPRINT_LIMITS, ID_PATTERN, SLUG_PATTERN } from './src/utils/invitationLogic';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesSource = fs.readFileSync(rulesPath, 'utf8');

test('firestore.rules includes default-deny global safety net and rules_version 2', () => {
  assert.match(rulesSource, /rules_version\s*=\s*'2'/);
  assert.match(rulesSource, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules enforces side enum, withFamily boolean, per-event RSVP with headcount, mehendi-only alcohol, and server timestamps', () => {
  assert.match(rulesSource, /data\.side is string && data\.side\.size\(\) >= 1 && data\.side\.size\(\) <= 20 && data\.side in \['bride', 'groom'\]/);
  assert.match(rulesSource, /data\.withFamily is bool/);
  assert.match(rulesSource, /function isValidEventRsvpEntry\(entry, allowAlcohol\)/);
  assert.match(rulesSource, /function isValidRsvp\(rsvp\)/);
  assert.match(rulesSource, /entry\.attending in \['coming', 'not_coming'\]/);
  assert.match(rulesSource, /entry\.headcount is int &&[\s\S]*entry\.headcount >= 1 &&[\s\S]*entry\.headcount <= 50/);
  assert.match(rulesSource, /entry\.foodPreference in \['veg', 'non_veg'\]/);
  assert.match(rulesSource, /allowAlcohol &&[\s\S]*entry\.alcoholPreference in \['alcohol', 'no_alcohol'\]/);
  assert.match(rulesSource, /isValidEventRsvpEntry\(rsvp\.byEvent\['mehendi-cocktail'\], true\)/);
  assert.match(rulesSource, /isValidEventRsvpEntry\(rsvp\.byEvent\['wedding'\], false\)/);
  assert.match(rulesSource, /rsvp\.byEvent\.keys\(\)\.hasOnly\(\[/);
  assert.match(rulesSource, /incoming\(\)\.rsvp\.respondedAt == request\.time/);
  assert.match(rulesSource, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesSource, /incoming\(\)\.updatedAt == request\.time/);
});

test('firestore.rules protects invitations against shadow fields, RSVP tampering, and slug tampering', () => {
  assert.match(rulesSource, /function isValidInvitation\(data, slug\)/);
  assert.match(rulesSource, /incoming\(\)\.slug == existing\(\)\.slug/);
  assert.match(rulesSource, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  assert.match(rulesSource, /incoming\(\)\.createdBy == existing\(\)\.createdBy/);
  assert.match(rulesSource, /function isGenericImmutable\(\)/);
  assert.match(rulesSource, /\(!\('isGeneric' in data\) \|\| data\.isGeneric is bool\)/);
  assert.match(rulesSource, /\(!\('isGeneric' in existing\(\)\) \|\| existing\(\)\.isGeneric == false\)/);
  assert.match(
    rulesSource,
    /affectedKeys\(\)\.hasOnly\(\[\s*'side', 'guestNames', 'withFamily', 'displayGuestName', 'eventIds', 'updatedAt'\s*\]\)/
  );
  assert.match(
    rulesSource,
    /affectedKeys\(\)\.hasOnly\(\['rsvp', 'updatedAt'\]\)/
  );
  const listMatches = rulesSource.match(/allow list:[^;]+;/g) ?? [];
  assert.ok(listMatches.length >= 1, 'Expected list rule for invitations');
  for (const listRule of listMatches) {
    assert.equal(listRule.includes('exists('), false, `List rule must not use exists(): ${listRule}`);
    assert.equal(listRule.includes('get('), false, `List rule must not use get(): ${listRule}`);
  }
});

test('Dirty Dozen payload constraints reject malformed slugs and oversized fields', () => {
  assert.equal(SLUG_PATTERN.test('INVALID SLUG!!'), false);
  assert.equal(SLUG_PATTERN.test('rahul-family-2'), true);
  assert.equal(ID_PATTERN.test('bad/id/with/slashes'), false);
  assert.equal('a'.repeat(200).length <= BLUEPRINT_LIMITS.SLUG_MAX, false);
});
