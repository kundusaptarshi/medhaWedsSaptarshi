import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateBackgroundPause,
  evaluateForegroundResume,
  evaluateManualMuteToggle,
} from './musicVisibility';

test('auto-pauses active music on hide/blur and auto-resumes when visible again', () => {
  const initial = { isMuted: false, isPlaying: true, wasPlayingBeforeHide: false };

  const onBlur = evaluateBackgroundPause(initial);
  assert.equal(onBlur.action, 'pause');
  assert.deepEqual(onBlur.nextState, {
    isMuted: false,
    isPlaying: false,
    wasPlayingBeforeHide: true,
  });

  // Subsequent visibilitychange/pagehide after blur must preserve wasPlayingBeforeHide
  const onHidden = evaluateBackgroundPause(onBlur.nextState);
  assert.equal(onHidden.action, 'none');
  assert.equal(onHidden.nextState.wasPlayingBeforeHide, true);

  // Returning while still hidden does not resume
  const stillHidden = evaluateForegroundResume(onHidden.nextState, true);
  assert.equal(stillHidden.action, 'none');
  assert.equal(stillHidden.nextState.wasPlayingBeforeHide, true);

  // Returning when visible resumes playback and clears pending flag
  const onVisible = evaluateForegroundResume(onHidden.nextState, false);
  assert.equal(onVisible.action, 'resume');
  assert.equal(onVisible.nextState.wasPlayingBeforeHide, false);
});

test('respects manual mute and never auto-resumes when returning to tab', () => {
  const manuallyMuted = evaluateManualMuteToggle(
    { isMuted: false, isPlaying: true, wasPlayingBeforeHide: false },
    true
  );
  assert.deepEqual(manuallyMuted, {
    isMuted: true,
    isPlaying: false,
    wasPlayingBeforeHide: false,
  });

  const onHide = evaluateBackgroundPause(manuallyMuted);
  assert.equal(onHide.action, 'none');
  assert.equal(onHide.nextState.wasPlayingBeforeHide, false);

  const onReturn = evaluateForegroundResume(onHide.nextState, false);
  assert.equal(onReturn.action, 'none');
});

test('does not start music on return if playback had never started (e.g. curtain page)', () => {
  const silent = { isMuted: false, isPlaying: false, wasPlayingBeforeHide: false };
  const onHide = evaluateBackgroundPause(silent);
  assert.equal(onHide.action, 'none');
  assert.equal(onHide.nextState.wasPlayingBeforeHide, false);

  const onReturn = evaluateForegroundResume(onHide.nextState, false);
  assert.equal(onReturn.action, 'none');
});
