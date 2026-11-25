import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURTAIN_REDUCED_MOTION_SCHEDULE,
  CURTAIN_STANDARD_SCHEDULE,
  getCurtainLayerState,
  getCurtainSchedule,
  shouldAutostartInvite,
  type CurtainPhase,
} from './curtainTimeline';

test('getCurtainSchedule returns strictly ascending timestamps for standard and reduced motion', () => {
  const std = getCurtainSchedule(false);
  assert.deepEqual(std, CURTAIN_STANDARD_SCHEDULE);
  assert.ok(std.partMs > 0);
  assert.ok(std.partMs < std.revealMs);
  assert.ok(std.revealMs < std.completeMs);

  const reduced = getCurtainSchedule(true);
  assert.deepEqual(reduced, CURTAIN_REDUCED_MOTION_SCHEDULE);
  assert.ok(reduced.completeMs < std.completeMs);
  assert.ok(reduced.partMs < reduced.revealMs);
  assert.ok(reduced.revealMs < reduced.completeMs);
});

test('getCurtainLayerState orchestrates seal break, smooth curtain parting, hero reveal, and unmount', () => {
  const closed = getCurtainLayerState('closed');
  assert.equal(closed.isInteractive, true);
  assert.equal(closed.sealUnsealing, false);
  assert.equal(closed.curtainsParting, false);
  assert.equal(closed.heroRevealed, false);
  assert.equal(closed.overlayMounted, true);

  const unsealing = getCurtainLayerState('unsealing');
  assert.equal(unsealing.isInteractive, false);
  assert.equal(unsealing.sealUnsealing, true);
  assert.equal(unsealing.curtainsParting, false);
  assert.equal(unsealing.heroRevealed, false);
  assert.equal(unsealing.overlayMounted, true);

  const parting = getCurtainLayerState('parting');
  assert.equal(parting.isInteractive, false);
  assert.equal(parting.sealUnsealing, true);
  assert.equal(parting.curtainsParting, true);
  assert.equal(parting.heroRevealed, false);
  assert.equal(parting.overlayMounted, true);

  const revealing = getCurtainLayerState('revealing');
  assert.equal(revealing.curtainsParting, true);
  assert.equal(revealing.heroRevealed, true);
  assert.equal(revealing.overlayMounted, true);

  const opened = getCurtainLayerState('opened');
  assert.equal(opened.curtainsParting, true);
  assert.equal(opened.heroRevealed, true);
  assert.equal(opened.overlayMounted, false);

  const allPhases: CurtainPhase[] = [
    'closed',
    'unsealing',
    'parting',
    'revealing',
    'opened',
  ];
  for (const phase of allPhases) {
    const state = getCurtainLayerState(phase);
    assert.equal(typeof state.overlayMounted, 'boolean');
  }
});

test('shouldAutostartInvite detects ?autostart=1 and ignores normal invitation URLs', () => {
  assert.equal(shouldAutostartInvite('?autostart=1'), true);
  assert.equal(shouldAutostartInvite('?side=bride&autostart=true'), true);
  assert.equal(shouldAutostartInvite('?autostart=0'), false);
  assert.equal(shouldAutostartInvite('?side=groom&events=haldi'), false);
  assert.equal(shouldAutostartInvite(''), false);
});
