# Security Specification — Medha Weds Saptarshi Invitation Studio

## 1. Data Invariants
1. **Default-Deny Baseline**: Every path outside `/invitations/{slug}` is strictly denied for read and write.
2. **Schema-Hardened No-Auth Studio**: Per explicit user architecture (no sign-in studio), `/invitations/{slug}` validates document IDs (`isValidSlug(slug)`), `createdBy == 'studio-host'`, strict field allowlists (`hasAll` + `hasOnly`), string `.size()` limits, bounded arrays (1..20), and server timestamps (`request.time`).
3. **Immutable Slug & Audit Trail**: An invitation's `slug`, `createdBy`, and `createdAt` cannot be modified after creation.
4. **Action-Based Updates**:
   - **Host Edit Action**: May ONLY mutate `['side', 'guestNames', 'withFamily', 'displayGuestName', 'eventIds', 'updatedAt']` while keeping `slug`, `createdBy`, `createdAt` immutable and setting `updatedAt == request.time`.
   - **Per-Event RSVP Submission Action**: May ONLY mutate `['rsvp', 'updatedAt']` while keeping all guest/event fields immutable. `rsvp` may be `null` (all cleared) or `{ byEvent: { [eventId]: EventRsvpEntry }, respondedAt: request.time }`, where `byEvent` keys are strictly restricted to the 6 fixed event IDs (`mehendi-cocktail`, `aiburobhat`, `haldi`, `wedding`, `boubhat`, `reception`). Each `EventRsvpEntry` enforces `attending in ['coming', 'not_coming']`, `headcount` integer `1..50` (when `coming`) or `null` (when `not_coming`), optional/clearable `foodPreference in ['veg', 'non_veg']` or `null`, and optional/clearable `alcoholPreference in ['alcohol', 'no_alcohol']` or `null`.
5. **Strict Volumetric & Schema Validation**: Every string enforces `.size()` limits matching `firebase-blueprint.json`; every array enforces `.size() >= 1 && .size() <= 20`; shadow fields are blocked via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Shadow Field Injection on Create**: Client attempts to create `/invitations/12345678` with extra ghost field `isVip: true`.
2. **Shadow Field Injection inside RSVP Map**: Client submits `rsvp` containing extra ghost field `extraNote: "hack"`.
3. **Unknown Event Key inside `rsvp.byEvent`**: Client submits `rsvp.byEvent['afterparty']`.
4. **Shadow Field Injection inside `EventRsvpEntry`**: Client submits extra field inside `rsvp.byEvent.wedding`.
5. **Invalid RSVP Attendance Enum**: Client submits `attending: "maybe"`.
6. **Out-of-Bounds or Non-Integer Headcount**: Client submits `attending: "coming"` with `headcount: 0`, `headcount: 999`, or `headcount: "3"`.
7. **Non-Null Preferences/Headcount When Not Coming**: Client submits `attending: "not_coming"` with `headcount: 2` or `foodPreference: "veg"`.
8. **Forged RSVP Timestamp**: Client submits `rsvp.respondedAt != request.time`.
9. **Mixed Action Update (RSVP + Event Tampering)**: Guest RSVP update attempts to also mutate `eventIds` or `displayGuestName` alongside `rsvp`.
10. **Slug / Audit Immutability Breach**: Update attempts to change `slug`, `createdAt`, or `createdBy`.
11. **ID Poisoning**: Create targets `/invitations/INVALID SLUG!!` or a 200-character slug violating `^[a-z0-9-]+$`.
12. **Array Overflow / Value Poisoning**: Create or update sends `eventIds: []`, 25 `guestNames`, or a 500-character `displayGuestName`.
