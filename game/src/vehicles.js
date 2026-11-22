// Cars: traffic that follows the roads, parked cars to steal, and the arcade driving
// model for the player's car. A car is {x, y, angle, speed, color, kind, driver}.
import { CAR, CITY, PALETTE, TRAFFIC } from './config.js';
import { hitBuilding, nearestRoadPoint, onRoad, randomRoadPoint } from './world.js';

const CAR_COLORS = ['#c1121f', '#2a9d8f', '#e9c46a', '#457b9d', '#6d6875', '#f4a261', '#84a98c', '#adb5bd', '#e07a5f', '#8ab17d'];

export function createCar(x, y, angle, color, kind, driver) {
  return { x, y, angle, speed: 0, color, kind, driver, occupant: driver === 'player', turnCooldown: 0, honk: 0 };
}

export function spawnTraffic(city, random) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const p = randomRoadPoint(city, random);
    const horizontal = Math.abs(p.y % (CITY.block + CITY.road)) < 1 || random.chance(0.5);
    const angle = horizontal ? (random.chance(0.5) ? 0 : Math.PI) : (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = createCar(p.x, p.y, angle, random.pick(CAR_COLORS), random.chance(0.12) ? 'taxi' : 'sedan', 'traffic');
    car.speed = TRAFFIC.speed + random.range(-TRAFFIC.speedJitter, TRAFFIC.speedJitter);
    cars.push(car);
  }
  return cars;
}

export function spawnParkedCars(city, random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(city, random);
    const lane = (CITY.road / 2 - 14) * (random.chance(0.5) ? 1 : -1);
    const horizontal = random.chance(0.5);
    const x = horizontal ? p.x : p.x + lane;
    const y = horizontal ? p.y + lane : p.y;
    const angle = horizontal ? (random.chance(0.5) ? 0 : Math.PI) : (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    cars.push(createCar(x, y, angle, random.pick(CAR_COLORS), random.chance(0.15) ? 'sport' : 'sedan', 'parked'));
  }
  return cars;
}

/** The nearest car with a free seat within maxDist of (x, y), or null. */
export function nearestCar(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of state.cars) {
    if (car.driver === 'police') continue;
    const dx = car.x - x;
    const dy = car.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function carBlockedAhead(state, car, lookAhead) {
  const fx = car.x + Math.cos(car.angle) * lookAhead;
  const fy = car.y + Math.sin(car.angle) * lookAhead;
  if (hitBuilding(state.city, fx, fy, 20)) return true;
  for (const other of state.cars) {
    if (other === car) continue;
    const dx = other.x - fx;
    const dy = other.y - fy;
    if (dx * dx + dy * dy < 42 * 42) return true;
  }
  const p = state.player;
  if (!p.car) {
    const dx = p.x - fx;
    const dy = p.y - fy;
    if (dx * dx + dy * dy < 30 * 30) return true;
  }
  return false;
}

/** One traffic car follows its road; at an intersection it sometimes turns. */
function stepTrafficCar(state, car, dt) {
  if (car.turnCooldown > 0) car.turnCooldown -= dt;
  const step = CITY.block + CITY.road;
  const half = CITY.road / 2;
  // Snap back onto the road centreline if it drifted.
  const road = nearestRoadPoint(state.city, car.x, car.y);
  const onH = Math.abs(car.y - road.y) < 2;
  const onV = Math.abs(car.x - road.x) < 2;
  if (carBlockedAhead(state, car, 60)) {
    car.speed = Math.max(0, car.speed - 300 * dt);
  } else {
    car.speed += (TRAFFIC.speed - car.speed) * Math.min(1, dt * 1.5);
  }
  // At an intersection centre, possibly turn onto the cross street.
  const nearIntX = Math.abs(((car.x - half) % step + step) % step) < 26;
  const nearIntY = Math.abs(((car.y - half) % step + step) % step) < 26;
  if (car.turnCooldown <= 0 && nearIntX && nearIntY && state.rng.chance(0.25)) {
    const horizontal = Math.abs(Math.sin(car.angle)) < 0.5;
    car.angle = horizontal
      ? (state.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2)
      : (state.rng.chance(0.5) ? 0 : Math.PI);
    car.turnCooldown = 2;
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!hitBuilding(state.city, nx, ny, 22)) {
    car.x = nx;
    car.y = ny;
  } else {
    car.angle += Math.PI / 2; // blocked: turn away
  }
  car.x = Math.max(20, Math.min(state.city.size - 20, car.x));
  car.y = Math.max(20, Math.min(state.city.size - 20, car.y));
  if (!onRoad(state.city, car.x, car.y)) {
    // Drifted off the road (a turn gone wrong): steer back to the nearest street.
    const r = nearestRoadPoint(state.city, car.x, car.y);
    car.angle = Math.atan2(r.y - car.y, r.x - car.x);
  }
}

/** Arcade driving for the player's car: accelerate, steer, brake, reverse. */
function stepPlayerCar(state, car, dt) {
  const input = state.input;
  const forward = Math.cos(car.angle);
  const right = Math.sin(car.angle);
  if (input.up) car.speed += CAR.accel * dt;
  else if (input.down) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt;
  else {
    // Rolling drag.
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 180 * dt);
  }
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steer = input.left ? -1 : input.right ? 1 : 0;
  const steerAmount = steer * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 120) * (car.speed < 0 ? -1 : 1);
  car.angle += steerAmount;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Two-point collision (front and rear) so cars cannot clip building corners.
  const fx = nx + Math.cos(car.angle) * 20;
  const fy = ny + Math.sin(car.angle) * 20;
  const bx = nx - Math.cos(car.angle) * 20;
  const by = ny - Math.sin(car.angle) * 20;
  if (!hitBuilding(state.city, fx, fy, 14) && !hitBuilding(state.city, bx, by, 14)) {
    car.x = nx;
    car.y = ny;
  } else {
    car.speed *= -0.3; // bounce off the wall
    state.events.push('crash');
  }
  car.x = Math.max(20, Math.min(state.city.size - 20, car.x));
  car.y = Math.max(20, Math.min(state.city.size - 20, car.y));
  // Running over a pedestrian at speed is a crime.
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - car.x;
    const dy = ped.y - car.y;
    if (dx * dx + dy * dy < 26 * 26 && Math.abs(car.speed) > 120) {
      ped.state = 'down';
      ped.downTimer = 6;
      state.wanted = Math.min(5, state.wanted + 1);
      state.wantedTimer = 0;
      state.events.push('hit-ped');
    }
  }
  // E: step out of the car.
  if (input.enter) {
    input.enter = false;
    const p = state.player;
    p.car = null;
    car.driver = 'parked';
    car.speed = 0;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    p.angle = car.angle;
    state.events.push('exited-car');
  }
}

export function stepVehicles(state, dt) {
  for (const car of state.cars) {
    if (car.driver === 'traffic' || car.driver === 'parked') {
      if (car.driver === 'traffic') stepTrafficCar(state, car, dt);
    } else if (car.driver === 'player') {
      stepPlayerCar(state, car, dt);
    }
    // Police cars are stepped by police.js.
  }
  // Keep the player's position glued to their car.
  const p = state.player;
  if (p.car) {
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    p.speed = p.car.speed;
  }
}
