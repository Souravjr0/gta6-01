// The wanted system: stars rise with crimes and decay when the player lies low.
// Foot cops chase on foot at 1 star; police cars join at 2 stars and ram the player.
// A cop that stays touching the player on foot arrests them (busted).
import { CAR, CITY, WANTED } from './config.js';
import { createCar } from './vehicles.js';
import { damagePlayer } from './player.js';
import { hitBuilding, randomRoadPoint } from './world.js';

export function addWanted(state, stars) {
  state.wanted = Math.min(WANTED.max, state.wanted + stars);
  state.wantedTimer = 0;
}

function spawnCop(state) {
  const p = state.player;
  const angle = state.rng.range(0, Math.PI * 2);
  const dist = 420;
  const x = Math.max(30, Math.min(state.city.size - 30, p.x + Math.cos(angle) * dist));
  const y = Math.max(30, Math.min(state.city.size - 30, p.y + Math.sin(angle) * dist));
  state.cops.push({ x, y, angle: 0, health: 50, holdTimer: 0, speed: 250 });
}

function spawnCopCar(state) {
  const p = state.player;
  const spot = randomRoadPoint(state.city, state.rng);
  const car = createCar(spot.x, spot.y, 0, '#1d3557', 'police', 'police');
  car.speed = 300;
  state.cars.push(car);
  state.copCars.push(car);
}

function stepCop(state, cop, dt) {
  const p = state.player;
  const dx = p.x - cop.x;
  const dy = p.y - cop.y;
  const d = Math.hypot(dx, dy) || 1;
  cop.angle = Math.atan2(dy, dx);
  const speed = cop.speed * dt;
  const nx = cop.x + (dx / d) * speed;
  const ny = cop.y + (dy / d) * speed;
  if (!hitBuilding(state.city, nx, ny, 14)) {
    cop.x = nx;
    cop.y = ny;
  }
  // Touching the player on foot holds them: long enough and they are busted.
  if (!p.car && d < 30) {
    cop.holdTimer += dt;
    if (cop.holdTimer > WANTED.bustedHoldSeconds) state.events.push('busted');
  } else {
    cop.holdTimer = 0;
  }
  // A cop that catches a stopped car drags the driver out and beats them down;
  // a moving car is out of a foot cop's reach.
  if (p.car && p.car.speed < 120 && d < 34) {
    damagePlayer(state, 12 * dt);
    state.events.push('rammed');
  }
}

function stepCopCar(state, car, dt) {
  const p = state.player;
  const dx = p.x - car.x;
  const dy = p.y - car.y;
  const d = Math.hypot(dx, dy) || 1;
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  const targetSpeed = d > 260 ? 520 : 380;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!hitBuilding(state.city, nx, ny, 20)) {
    car.x = nx;
    car.y = ny;
  } else {
    car.speed *= 0.4;
    car.angle += 0.6;
  }
  // Ramming the player's car damages the player and slows them.
  if (p.car && d < 46) {
    p.car.speed *= 0.94;
    damagePlayer(state, 6 * dt);
    state.events.push('rammed');
  }
}

export function stepPolice(state, dt) {
  // Decay: lie low and the heat fades, one star at a time.
  if (state.wanted > 0) {
    state.wantedTimer += dt;
    if (state.wantedTimer > WANTED.decaySeconds) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      state.events.push('wanted-down');
    }
  }
  // Reinforcements arrive until the street matches the wanted level.
  const wantCops = state.wanted >= WANTED.copFootAt ? Math.min(WANTED.maxCops, state.wanted * 2) : 0;
  const wantCars = state.wanted >= WANTED.copCarAt ? Math.min(WANTED.maxCopCars, state.wanted - 1) : 0;
  if (state.cops.length < wantCops && state.rng.chance(dt * 1.5)) spawnCop(state);
  if (state.copCars.length < wantCars && state.rng.chance(dt * 1.2)) spawnCopCar(state);
  // The heat is off: cops give up and walk away.
  if (state.wanted === 0) {
    state.cops.length = 0;
    for (const car of state.copCars) {
      car.driver = 'parked';
      car.speed = 0;
    }
    state.copCars.length = 0;
  }
  for (const cop of state.cops) stepCop(state, cop, dt);
  for (const car of state.copCars) stepCopCar(state, car, dt);
  // Dead cops are removed by combat.js; drop any with no health here too.
  state.cops = state.cops.filter((cop) => cop.health > 0);
}
