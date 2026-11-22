// Combat: the player's pistol, enemy gunmen, punches and bullets. Bullets are simple
// points with a velocity; a hit on an enemy or a cop hurts them, a hit on the player
// hurts the player. Kills raise the wanted level.
import { BULLET, PLAYER } from './config.js';
import { addWanted } from './police.js';
import { damagePlayer } from './player.js';

export function fireBullet(state, x, y, angle, from) {
  state.bullets.push({
    x, y,
    vx: Math.cos(angle) * BULLET.speed,
    vy: Math.sin(angle) * BULLET.speed,
    life: BULLET.life,
    from,
  });
  state.gunfireTimer = 1.2;
  state.events.push('gunshot');
}

function bulletHitsCircle(b, x, y, r) {
  const dx = b.x - x;
  const dy = b.y - y;
  return dx * dx + dy * dy < r * r;
}

export function stepCombat(state, dt) {
  const p = state.player;
  if (state.gunfireTimer > 0) state.gunfireTimer -= dt;
  if (p.fireCooldown > 0) p.fireCooldown -= dt;
  // Player fires toward the mouse (or facing, if the mouse never moved).
  if (state.input.fire && p.fireCooldown <= 0 && !p.car) {
    p.fireCooldown = BULLET.fireCooldown;
    const aim = state.input.aimAngle !== null ? state.input.aimAngle : p.angle;
    fireBullet(state, p.x + Math.cos(aim) * 20, p.y + Math.sin(aim) * 20, aim, 'player');
  }
  // A punch lands on the nearest enemy or cop in reach.
  if (state.events.includes('punch')) {
    const reach = PLAYER.punchRange + 14;
    for (const e of state.enemies) {
      if (e.health <= 0) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < reach * reach) {
        e.health -= PLAYER.punchDamage;
        state.events.push('punch-hit');
        if (e.health <= 0) {
          state.events.push('enemy-down');
          addWanted(state, 1);
        }
        break;
      }
    }
    for (const cop of state.cops) {
      if (cop.health <= 0) continue;
      const dx = cop.x - p.x;
      const dy = cop.y - p.y;
      if (dx * dx + dy * dy < reach * reach) {
        cop.health -= PLAYER.punchDamage;
        state.events.push('punch-hit');
        if (cop.health <= 0) addWanted(state, 2);
        break;
      }
    }
  }
  // Bullets fly and hit things.
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (b.from === 'player') {
      for (const e of state.enemies) {
        if (e.health > 0 && bulletHitsCircle(b, e.x, e.y, 16)) {
          e.health -= BULLET.damage;
          b.life = 0;
          state.events.push('hit-enemy');
          if (e.health <= 0) {
            state.events.push('enemy-down');
            addWanted(state, 1);
          }
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const cop of state.cops) {
        if (cop.health > 0 && bulletHitsCircle(b, cop.x, cop.y, 16)) {
          cop.health -= BULLET.damage;
          b.life = 0;
          state.events.push('hit-cop');
          if (cop.health <= 0) addWanted(state, 2);
          break;
        }
      }
    } else {
      // Enemy bullets only threaten the player on foot.
      if (!p.car && p.health > 0 && bulletHitsCircle(b, p.x, p.y, 16)) {
        damagePlayer(state, BULLET.damage * 0.6);
        b.life = 0;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.enemies = state.enemies.filter((e) => e.health > 0);
  // Enemies shoot back when close and in line of sight.
  for (const e of state.enemies) {
    e.fireCooldown -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 380 && e.fireCooldown <= 0 && !p.car) {
      e.fireCooldown = 1.1 + state.rng.range(0, 0.6);
      const aim = Math.atan2(dy, dx) + state.rng.range(-0.12, 0.12);
      fireBullet(state, e.x + Math.cos(aim) * 20, e.y + Math.sin(aim) * 20, aim, 'enemy');
    }
    // Enemies close in when the player is far.
    if (d > 200) {
      e.angle = Math.atan2(dy, dx);
      e.x += Math.cos(e.angle) * 90 * dt;
      e.y += Math.sin(e.angle) * 90 * dt;
    }
  }
}
