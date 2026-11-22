// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, busted and wasted.
// The story saves to localStorage (Q or on every mission payday) and can be continued.
//
// ?seed=N fixes the city and the traffic. ?shot=start|street|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. window.__game exposes the live state for
// playtesting: {state, screen}.
import { CITY, SAVE_KEY, STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './world.js';
import { createPlayer } from './player.js';
import { spawnParkedCars, spawnTraffic } from './vehicles.js';
import { spawnPeds } from './peds.js';
import { createMissions, setMission } from './missions.js';
import { stepGame } from './sim.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawHud } from './hud.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

function createGameState(seedValue) {
  const rng = createRandom(seedValue);
  const city = buildCity(rng);
  const state = {
    rng,
    city,
    time: 0,
    // The player starts on the west road by the Marina, never inside a building.
    player: createPlayer(CITY.road / 2, CITY.road + CITY.block / 2),
    cars: [],
    peds: [],
    cops: [],
    copCars: [],
    bullets: [],
    enemies: [],
    particles: [],
    wanted: 0,
    wantedTimer: 0,
    gunfireTimer: 0,
    missions: null,
    camera: { x: 0, y: 0, zoom: 0.85 },
    events: [],
    toast: null,
    toastTimer: 0,
    input: null,
    audio: null,
    hud: { drawHud },
  };
  state.cars = [...spawnTraffic(city, rng), ...spawnParkedCars(city, rng, 14)];
  state.peds = spawnPeds(city, rng);
  state.missions = createMissions(city);
  return state;
}

function resetGame(state) {
  const fresh = createGameState(seed);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.input = state.input; // the live input object is reattached by the caller
}

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.player.money,
      missionIndex: state.missions.index,
      health: state.player.health,
      x: state.player.x,
      y: state.player.y,
    }));
  } catch {
    // Storage can be off (private windows): the save then lasts this visit only.
  }
}

function applySave(state, save) {
  if (!save) return false;
  state.player.money = save.money || 0;
  state.player.health = save.health || 100;
  state.player.x = save.x || state.player.x;
  state.player.y = save.y || state.player.y;
  if (Number.isInteger(save.missionIndex) && save.missionIndex > 0) {
    setMission(state, save.missionIndex);
  }
  state.missions.started = true;
  return true;
}

const state = createGameState(seed);
const input = createInput(canvas);
const audio = createAudio();
state.input = input;
state.audio = audio;
const renderer = createRenderer(canvas);
const saved = readSave();

function runShot(name) {
  const scene = stageShot(name, state, () => resetGame(state));
  state.input = input;
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, saved);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function showToast(message) {
    state.toast = message;
    state.toastTimer = 2.6;
  }

  function handleEvents(events) {
    for (const event of events) {
      if (event === 'gunshot') audio.gunshot();
      else if (event === 'crash') audio.crash();
      else if (event === 'punch' || event === 'punch-hit') audio.punch();
      else if (event === 'stole-car') showToast('Car stolen! The cops are watching — +1 wanted');
      else if (event === 'hit-ped') showToast('You hit a pedestrian! +1 wanted');
      else if (event === 'wanted-down') showToast('The heat is off. You are clean — for now');
      else if (event === 'mission-complete') {
        audio.payday();
        showToast(`Job done! +$${state.player.money.toLocaleString('en-US')} in the bank`);
        writeSave(state);
        announce(`Mission complete. $${state.player.money}.`);
      } else if (event === 'busted') {
        screen = SCREEN_BUSTED;
        audio.busted();
        announce('Busted by the Solmar PD.');
      } else if (event === 'wasted') {
        screen = SCREEN_WASTED;
        audio.busted();
        announce('Wasted. Solmar County Hospital.');
      }
    }
  }

  function startGame(continueSave) {
    resetGame(state);
    state.input = input;
    state.audio = audio;
    if (continueSave && saved) applySave(state, saved);
    state.missions.started = true;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Follow the pink marker.');
  }

  function pollOneShots() {
    // Copy the queued one-shot presses onto plain fields the sim reads.
    input.enter = input.takeEnter();
    input.punch = input.takePunch();
    const savePressed = input.takeSave();
    const mutePressed = input.takeMute();
    if (savePressed && screen === SCREEN_PLAY) {
      writeSave(state);
      showToast('Story saved.');
    }
    if (mutePressed) {
      const muted = audio.toggleMute();
      showToast(muted ? 'Sound off.' : 'Sound on.');
    }
    // Mouse aim, in view space, becomes a world-space angle each frame.
    const aim = input.aim;
    if (aim) {
      const cam = state.camera;
      const wx = cam.x + (aim.sx * VIEW.width) / cam.zoom;
      const wy = cam.y + (aim.sy * VIEW.height) / cam.zoom;
      input.aimAngle = Math.atan2(wy - state.player.y, wx - state.player.x);
    } else {
      input.aimAngle = null;
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame(false);
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_BUSTED || screen === SCREEN_WASTED)) startGame(false);
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // C continues a saved story from the title screen.
    if (screen === SCREEN_TITLE && saved) {
      // (KeyC is read in the keydown listener below via a flag on the input object.)
      if (input.continuePressed) {
        input.continuePressed = false;
        startGame(true);
      }
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC' && !event.repeat) input.continuePressed = true;
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    pollOneShots();
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const events = stepGame(state, STEP);
        handleEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
      if (state.toastTimer > 0) {
        state.toastTimer -= STEP;
        if (state.toastTimer <= 0) state.toast = null;
      }
      const p = state.player;
      audio.update(p.car ? p.car.speed : p.speed, state.wanted);
    } else if (screen === SCREEN_TITLE) {
      // The city stays alive behind the title: traffic and pedestrians move.
      while (accumulator >= STEP) {
        stepGame(state, STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, saved);
  }

  // Leaving the tab pauses a running game rather than letting the cops catch up unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  window.__game = { state, get screen() { return screen; } };
  announce('Solmar City. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
