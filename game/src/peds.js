// Pedestrians: they stroll the sidewalks, cross at corners, and run screaming when
// shots are fired or a car bears down on them.
import { CITY, PALETTE, PEDS } from './config.js';
import { hitBuilding, randomSidewalkPoint } from './world.js';

export function spawnPeds(city, random) {
  const peds = [];
  for (let i = 0; i < PEDS.count; i += 1) {
    const p = randomSidewalkPoint(city, random);
    peds.push({
      x: p.x, y: p.y,
      angle: random.range(0, Math.PI * 2),
      speed: PEDS.speed + random.range(-PEDS.speedJitter, PEDS.speedJitter),
      skin: random.pick(PALETTE.ped),
      shirt: random.pick(PALETTE.shirt),
      state: 'walk', downTimer: 0, fleeTimer: 0,
    });
  }
  return peds;
}

function wander(ped, dt, city, random) {
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  // Bounce off buildings and the city edge; sometimes turn at a corner.
  if (hitBuilding(city, ped.x, ped.y, 10) || ped.x < 16 || ped.y < 16 || ped.x > city.size - 16 || ped.y > city.size - 16) {
    ped.angle += Math.PI / 2 + random.range(-0.6, 0.6);
    ped.x = Math.max(16, Math.min(city.size - 16, ped.x));
    ped.y = Math.max(16, Math.min(city.size - 16, ped.y));
  } else if (random.chance(dt * 0.25)) {
    ped.angle += random.range(-1.2, 1.2);
  }
}

export function stepPeds(state, dt) {
  const p = state.player;
  for (const ped of state.peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) ped.state = 'walk';
      continue;
    }
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    const scared = state.gunfireTimer > 0 && d < 320;
    if (scared || ped.fleeTimer > 0) {
      // Run away from the player, twice as fast as a stroll.
      ped.state = 'flee';
      ped.fleeTimer = scared ? 1.5 : ped.fleeTimer - dt;
      ped.angle = Math.atan2(dy, dx);
      ped.x += Math.cos(ped.angle) * ped.speed * 2.1 * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * 2.1 * dt;
      ped.x = Math.max(16, Math.min(state.city.size - 16, ped.x));
      ped.y = Math.max(16, Math.min(state.city.size - 16, ped.y));
    } else {
      ped.state = 'walk';
      wander(ped, dt, state.city, state.rng);
    }
  }
}
