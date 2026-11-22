// Keyboard and pointer input. Held keys give movement and driving; one-shot presses
// (confirm, pause, enter car, punch, save) are queued as flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false, run: false };
  let actions = 0;
  let enter = false;
  let punch = false;
  let fire = false;
  let aimAngle = null;
  let save = false;
  let mute = false;

  function updateAim(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    // Aim in view space: the game converts it with the camera each frame.
    aimAngle = { sx, sy };
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) keys.up = true;
    else if (DOWN.has(event.code)) keys.down = true;
    else if (LEFT.has(event.code)) keys.left = true;
    else if (RIGHT.has(event.code)) keys.right = true;
    else if (RUN.has(event.code)) keys.run = true;
    else if (event.code === 'KeyE' && !event.repeat) enter = true;
    else if (event.code === 'KeyF' && !event.repeat) punch = true;
    else if (event.code === 'KeyM' && !event.repeat) mute = true;
    else if (event.code === 'KeyQ' && !event.repeat) save = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) keys.up = false;
    else if (DOWN.has(event.code)) keys.down = false;
    else if (LEFT.has(event.code)) keys.left = false;
    else if (RIGHT.has(event.code)) keys.right = false;
    else if (RUN.has(event.code)) keys.run = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.up = keys.down = keys.left = keys.right = keys.run = false;
    fire = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    fire = true;
    updateAim(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (fire) updateAim(event.clientX, event.clientY);
  });
  window.addEventListener('pointerup', () => {
    fire = false;
  });
  // Space also fires the pistol while playing (it confirms on menus).
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !event.repeat) fire = true;
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') fire = false;
  });

  return {
    get up() { return keys.up; },
    get down() { return keys.down; },
    get left() { return keys.left; },
    get right() { return keys.right; },
    get run() { return keys.run; },
    get fire() { return fire; },
    /** Movement vector on foot: -1..1 on each axis. */
    get mx() { return (keys.right ? 1 : 0) - (keys.left ? 1 : 0); },
    get my() { return (keys.down ? 1 : 0) - (keys.up ? 1 : 0); },
    /** Aim direction in view space, or null when the mouse never moved. */
    get aim() { return aimAngle; },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeEnter() {
      const v = enter;
      enter = false;
      return v;
    },
    takePunch() {
      const v = punch;
      punch = false;
      return v;
    },
    takeSave() {
      const v = save;
      save = false;
      return v;
    },
    takeMute() {
      const v = mute;
      mute = false;
      return v;
    },
    /** Aim angle in world space, computed by main.js from the camera each frame. */
    aimAngle: null,
  };
}
