export interface MusicVisibilityState {
  isMuted: boolean;
  isPlaying: boolean;
  wasPlayingBeforeHide: boolean;
}

export interface MusicVisibilityAction {
  action: 'pause' | 'resume' | 'none';
  nextState: MusicVisibilityState;
}

/**
 * Pure state transition when the browser tab becomes hidden, pagehide fires,
 * or the window loses focus (tab switch, minimize, mobile lock/app switch).
 * Preserves wasPlayingBeforeHide across repeated hide/blur events so a second
 * event never erases the intent to resume on return.
 */
export function evaluateBackgroundPause(
  state: MusicVisibilityState
): MusicVisibilityAction {
  const shouldRememberResume =
    state.wasPlayingBeforeHide || (state.isPlaying && !state.isMuted);

  if (!state.isPlaying) {
    return {
      action: 'none',
      nextState: {
        ...state,
        wasPlayingBeforeHide: shouldRememberResume,
      },
    };
  }

  return {
    action: 'pause',
    nextState: {
      ...state,
      isPlaying: false,
      wasPlayingBeforeHide: shouldRememberResume,
    },
  };
}

/**
 * Pure state transition when the user returns to the tab/window
 * (visibilitychange -> visible, pageshow, or focus).
 * Resumes ONLY if the music was actively playing before leaving and the user
 * has not manually muted/paused it.
 */
export function evaluateForegroundResume(
  state: MusicVisibilityState,
  isDocumentHidden: boolean
): MusicVisibilityAction {
  if (isDocumentHidden || state.isMuted || !state.wasPlayingBeforeHide) {
    return {
      action: 'none',
      nextState: state,
    };
  }

  return {
    action: 'resume',
    nextState: {
      ...state,
      wasPlayingBeforeHide: false,
    },
  };
}

/**
 * Pure state transition when the user manually toggles mute/pause via the button.
 * Always clears any pending background auto-resume flag.
 */
export function evaluateManualMuteToggle(
  state: MusicVisibilityState,
  nextMuted: boolean
): MusicVisibilityState {
  return {
    isMuted: nextMuted,
    isPlaying: nextMuted ? false : state.isPlaying,
    wasPlayingBeforeHide: false,
  };
}
