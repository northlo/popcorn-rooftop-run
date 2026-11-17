// Keyboard and pointer input for Popcorn: Rooftop Run.
// Produces one input object per frame. Jump presses are edge-triggered
// (the simulation reads jumpPressed once per step), so a held key never
// fires twice. Right-click is the pounce; the context menu is suppressed.

export function createInput() {
  return {
    jumpHeld: false,
    jumpPressed: false,
    pouncePressed: false,
    confirm: false,
    pause: false,
    restart: false,
    mute: false,
  };
}

// Attach listeners to the window; returns the shared input object.
// `onFirstGesture` runs once on the first key or pointer press (to start
// the audio context, which browsers only allow after a gesture).
export function attachInput(input, onFirstGesture) {
  let gestureDone = false;
  const gesture = () => {
    if (!gestureDone) {
      gestureDone = true;
      if (onFirstGesture) onFirstGesture();
    }
  };
  const jumpKeys = new Set(['Space', 'KeyW', 'ArrowUp']);
  const pounceKeys = new Set(['ShiftLeft', 'ShiftRight', 'KeyS', 'ArrowDown']);

  window.addEventListener('keydown', (e) => {
    gesture();
    if (e.repeat) return;
    if (jumpKeys.has(e.code)) {
      e.preventDefault();
      input.jumpHeld = true;
      input.jumpPressed = true;
      input.confirm = true;
    } else if (pounceKeys.has(e.code)) {
      e.preventDefault();
      input.pouncePressed = true;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      input.pause = true;
    } else if (e.code === 'KeyR') {
      input.restart = true;
    } else if (e.code === 'KeyM') {
      input.mute = true;
    } else if (e.code === 'Enter') {
      input.confirm = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (jumpKeys.has(e.code)) input.jumpHeld = false;
  });
  window.addEventListener('pointerdown', (e) => {
    gesture();
    if (e.button === 0) {
      input.jumpHeld = true;
      input.jumpPressed = true;
      input.confirm = true;
    } else if (e.button === 2) {
      input.pouncePressed = true;
    }
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button === 0) input.jumpHeld = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    input.jumpHeld = false;
  });
  return input;
}

// Clear the edge-triggered flags after the simulation consumed them.
export function clearEdges(input) {
  input.jumpPressed = false;
  input.pouncePressed = false;
  input.confirm = false;
  input.pause = false;
  input.restart = false;
  input.mute = false;
}
