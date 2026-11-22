// The simulation step: every system in order, then the camera and the particles.
// Returns the events of this step (crashes, gunshots, mission completions...) so the
// caller can play sounds and show toasts without the sim knowing about either.
import { VIEW } from './config.js';
import { stepPlayer } from './player.js';
import { stepVehicles } from './vehicles.js';
import { stepPolice } from './police.js';
import { stepPeds } from './peds.js';
import { stepCombat } from './combat.js';
import { stepMissions } from './missions.js';

export function spawnParticles(state, x, y, count, color, size) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.rng.range(0, Math.PI * 2);
    const dist = state.rng.range(4, 26);
    state.particles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      life: 0.5, maxLife: 0.5, color, size: size * state.rng.range(0.6, 1.4),
    });
  }
}

function updateParticles(state, dt) {
  for (const pt of state.particles) pt.life -= dt;
  state.particles = state.particles.filter((pt) => pt.life > 0);
}

function updateCamera(state, dt) {
  const cam = state.camera;
  const p = state.player;
  const zoom = cam.zoom;
  const tx = p.x - VIEW.width / zoom / 2;
  const ty = p.y - VIEW.height / zoom / 2;
  const k = Math.min(1, dt * 4);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  cam.x = Math.max(-60, Math.min(state.city.size - VIEW.width / zoom + 60, cam.x));
  cam.y = Math.max(-60, Math.min(state.city.size - VIEW.height / zoom + 60, cam.y));
}

export function stepGame(state, dt) {
  state.time += dt;
  stepPlayer(state, dt);
  stepVehicles(state, dt);
  stepPolice(state, dt);
  stepPeds(state, dt);
  stepCombat(state, dt);
  stepMissions(state, dt);
  updateParticles(state, dt);
  updateCamera(state, dt);
  const events = state.events;
  state.events = [];
  // Side effects that belong to the world, not to sound: sparks on a crash, a flash
  // on a gunshot, cash flying on a payday.
  for (const event of events) {
    if (event === 'crash') spawnParticles(state, state.player.x, state.player.y, 10, '#ffb703', 5);
    if (event === 'gunshot') {
      const p = state.player;
      spawnParticles(state, p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24, 4, '#ffe66d', 4);
    }
    if (event === 'mission-complete') spawnParticles(state, state.player.x, state.player.y, 24, '#f2c94c', 6);
  }
  return events;
}
