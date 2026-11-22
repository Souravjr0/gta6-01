// The screenshot scenes behind ?shot=start|street|chase|mission. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame.
import { CITY, STEP } from './config.js';
import { stepGame } from './sim.js';
import { createCar } from './vehicles.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

/** A plain input object the autopilot steers, standing in for the keyboard. */
function fakeInput() {
  return {
    up: false, down: false, left: false, right: false, run: false,
    mx: 0, my: 0, enter: false, punch: false, fire: false, aimAngle: null,
  };
}

function runSteps(state, seconds, steer) {
  const input = fakeInput();
  const real = state.input;
  state.input = input;
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    if (steer) steer(state, input);
    stepGame(state, SAMPLE);
  }
  state.input = real;
}

/** Chase driving: steer toward the next intersection waypoint, reverse if stuck. */
function chaseAutopilot(state, input) {
  const car = state.player.car;
  if (!car) return;
  const size = state.city.size;
  const step = CITY.block + CITY.road;
  if (!input._wp || Math.hypot(input._wp.x - car.x, input._wp.y - car.y) < 130) {
    const dirs = [[step, 0], [-step, 0], [0, step], [0, -step]];
    const d = state.rng.pick(dirs);
    input._wp = {
      x: Math.max(120, Math.min(size - 120, car.x + d[0])),
      y: Math.max(120, Math.min(size - 120, car.y + d[1])),
    };
  }
  const want = Math.atan2(input._wp.y - car.y, input._wp.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  input.left = diff < -0.15;
  input.right = diff > 0.15;
  input.up = true;
  input.down = false;
  if (car.speed < 40) {
    // Pinned against something: back up and turn away.
    input.up = false;
    input.down = true;
    input.left = true;
  }
}

/** Walk toward the nearest parked car. */
function walkToCar(state, input) {
  const p = state.player;
  let best = null;
  let bestD = Infinity;
  for (const car of state.cars) {
    if (car.driver !== 'parked') continue;
    const d = (car.x - p.x) ** 2 + (car.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  if (!best) return;
  const dx = best.x - p.x;
  const dy = best.y - p.y;
  input.mx = Math.abs(dx) > 12 ? Math.sign(dx) : 0;
  input.my = Math.abs(dy) > 12 ? Math.sign(dy) : 0;
}

/** Aim at the nearest living enemy and shoot. */
function shootAutopilot(state, input) {
  const p = state.player;
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  if (!best) {
    input.fire = false;
    input.mx = 0;
    input.my = 0;
    return;
  }
  input.aimAngle = Math.atan2(best.y - p.y, best.x - p.x);
  p.angle = input.aimAngle;
  input.fire = true;
  // Stand and shoot: strafing would walk the camera away from the fight.
  input.mx = 0;
  input.my = 0;
}

/**
 * Set `state` to the named scene (start, street, chase or mission; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, state, reset) {
  reset();
  if (name === 'street') {
    state.missions.started = true;
    runSteps(state, 7, walkToCar);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    state.missions.started = true;
    // Start mid-city at a downtown intersection, heading east, with three police
    // cars on the player's tail — a chase in progress, not a parked car.
    const step = CITY.block + CITY.road;
    const cx = CITY.road / 2 + 3 * step;
    const cy = CITY.road / 2 + 3 * step;
    let car = null;
    for (const c of state.cars) {
      if (c.kind === 'sport' && c.driver === 'parked') {
        car = c;
        break;
      }
    }
    if (!car) car = state.cars[0];
    car.x = cx;
    car.y = cy;
    car.angle = 0;
    state.player.x = cx;
    state.player.y = cy;
    state.player.angle = 0;
    state.player.car = car;
    car.driver = 'player';
    car.speed = 320;
    state.wanted = 3;
    state.wantedTimer = 0;
    for (let i = 0; i < 3; i += 1) {
      const copCar = createCar(cx - 260 - i * 70, cy + (i - 1) * 40, 0, '#1d3557', 'police', 'police');
      copCar.speed = 380;
      state.cars.push(copCar);
      state.copCars.push(copCar);
    }
    runSteps(state, 8, chaseAutopilot);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // The Exchange: the beachfront shootout, mid-fight.
    state.missions.started = true;
    state.missions.index = 5;
    state.missions.killsNeeded = 4;
    state.missions.text = 'The deal is a setup. Take out 4 rivals at the Beachfront.';
    state.missions.target = { x: state.city.size / 2, y: state.city.size - 260 };
    // Stand clear of the target circle (160px): the mission must not complete
    // mid-scene just because the thugs are down.
    state.player.x = state.city.size / 2 - 300;
    state.player.y = state.city.size - 260;
    for (let i = 0; i < 4; i += 1) {
      state.enemies.push({
        x: state.city.size / 2 + state.rng.range(-40, 140),
        y: state.city.size - 260 + state.rng.range(-60, 60),
        // Tough rivals: the fight is still going when the shutter falls.
        angle: Math.PI, health: 120, fireCooldown: 1,
      });
    }
    // Short enough that one or two rivals are still standing when the shutter falls.
    runSteps(state, 2.5, shootAutopilot);
    return { screen: SCREEN_PLAY };
  }
  // start: the title over a living city.
  runSteps(state, 5, null);
  return { screen: SCREEN_TITLE };
}
