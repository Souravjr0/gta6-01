// The player on foot: walking and running, building collision, punching, and getting
// in and out of cars. Driving itself lives in vehicles.js.
import { CAR, PLAYER } from './config.js';
import { hitBuilding } from './world.js';
import { nearestCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, health: PLAYER.health, money: 0,
    car: null, speed: 0, punchCooldown: 0, fireCooldown: 0, hurtFlash: 0, bustedTimer: 0,
  };
}

/** Move on foot with axis-separated building collision, so walls slide instead of stick. */
function moveOnFoot(state, dt, mx, my) {
  const p = state.player;
  const speed = state.input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(mx, my);
  if (len === 0) {
    p.speed = 0;
    return;
  }
  const nx = mx / len;
  const ny = my / len;
  p.angle = Math.atan2(ny, nx);
  p.speed = speed;
  const stepX = nx * speed * dt;
  const stepY = ny * speed * dt;
  if (!hitBuilding(state.city, p.x + stepX, p.y, PLAYER.radius)) p.x += stepX;
  if (!hitBuilding(state.city, p.x, p.y + stepY, PLAYER.radius)) p.y += stepY;
  p.x = Math.max(PLAYER.radius, Math.min(state.city.size - PLAYER.radius, p.x));
  p.y = Math.max(PLAYER.radius, Math.min(state.city.size - PLAYER.radius, p.y));
}

export function stepPlayer(state, dt) {
  const p = state.player;
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.hurtFlash > 0) p.hurtFlash -= dt;
  if (p.car) return; // driving is handled by vehicles.js
  moveOnFoot(state, dt, state.input.mx, state.input.my);
  // E: get into the nearest car (steal it if it is not already ours).
  if (state.input.enter) {
    state.input.enter = false;
    const car = nearestCar(state, p.x, p.y, 70);
    if (car) {
      p.car = car;
      car.driver = 'player';
      car.occupant = true;
      if (car.kind !== 'player') {
        state.wanted = Math.min(5, state.wanted + 1);
        state.wantedTimer = 0;
        state.events.push('stole-car');
      }
      state.events.push('entered-car');
    }
  }
  // F: punch the nearest enemy or pedestrian in reach.
  if (state.input.punch && p.punchCooldown <= 0) {
    state.input.punch = false;
    p.punchCooldown = PLAYER.punchCooldown;
    state.events.push('punch');
  }
}

export function damagePlayer(state, amount) {
  const p = state.player;
  if (p.health <= 0) return;
  p.health -= amount;
  p.hurtFlash = 0.25;
  if (p.health <= 0) {
    p.health = 0;
    state.events.push('wasted');
  }
}

export function healPlayer(state, amount) {
  state.player.health = Math.min(PLAYER.health, state.player.health + amount);
}
