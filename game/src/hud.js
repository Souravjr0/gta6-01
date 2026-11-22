// The HUD and the minimap, drawn over the world each frame: money, health, wanted
// stars, the mission objective, the speedometer while driving, the location line, and
// a live minimap of the city with the player, the mission target and police on it.
import { CITY, FONT, PALETTE, VIEW } from './config.js';
import { districtAt } from './world.js';
import { missionObjective } from './missions.js';

const MAP_SIZE = 176;
const MAP_PAD = 14;

export function drawHud(ctx, state, screen) {
  const p = state.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left panel: money, health, wanted stars.
  ctx.fillStyle = 'rgba(16,20,28,0.82)';
  ctx.fillRect(14, 12, 300, 92);
  ctx.strokeStyle = 'rgba(244,246,248,0.25)';
  ctx.strokeRect(14.5, 12.5, 300, 92);
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.money.toLocaleString('en-US')}`, 28, 44);
  // Health bar.
  ctx.fillStyle = '#3a2028';
  ctx.fillRect(28, 56, 170, 14);
  ctx.fillStyle = p.health > 35 ? '#43aa5b' : '#e63946';
  ctx.fillRect(28, 56, Math.max(0, 170 * p.health / 100), 14);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('HEALTH', 206, 68);
  // Wanted stars.
  for (let i = 0; i < 5; i += 1) {
    ctx.font = '22px sans-serif';
    ctx.fillStyle = i < state.wanted ? '#ffd23f' : 'rgba(244,246,248,0.25)';
    ctx.fillText('★', 28 + i * 26, 96);
  }
  // Top-centre: the mission objective.
  const objective = missionObjective(state);
  ctx.font = `bold 17px ${FONT}`;
  const ow = ctx.measureText(objective).width;
  ctx.fillStyle = 'rgba(16,20,28,0.82)';
  ctx.fillRect((VIEW.width - ow) / 2 - 16, 12, ow + 32, 40);
  ctx.fillStyle = PALETTE.mission;
  ctx.textAlign = 'center';
  ctx.fillText(objective, VIEW.width / 2, 39);
  // Top-right: clock and place.
  const mins = Math.floor(state.time / 60);
  const clock = `${String(8 + Math.floor(mins / 60) % 12).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  ctx.fillStyle = 'rgba(16,20,28,0.82)';
  ctx.fillRect(VIEW.width - 214, 12, 200, 40);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${districtAt(state.city, p.x, p.y)}  ·  ${clock}`, VIEW.width - 28, 39);
  // Bottom-left: controls hint.
  ctx.textAlign = 'left';
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = 'rgba(244,246,248,0.75)';
  const hint = p.car
    ? 'WASD drive · E exit car · P pause · Q save · M mute'
    : 'WASD move · Shift run · E enter car · Click/Space shoot · F punch · P pause';
  ctx.fillText(hint, 16, VIEW.height - 16);
  // Speedometer while driving.
  if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.36);
    ctx.fillStyle = 'rgba(16,20,28,0.82)';
    ctx.fillRect(VIEW.width - MAP_SIZE - MAP_PAD - 110, VIEW.height - 66, 96, 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${kmh}`, VIEW.width - MAP_SIZE - MAP_PAD - 62, VIEW.height - 30);
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('km/h', VIEW.width - MAP_SIZE - MAP_PAD - 62, VIEW.height - 16);
  }
  drawMinimap(ctx, state);
  // The mission target arrow at the screen edge, pointing off-screen toward the target.
  drawTargetArrow(ctx, state);
}

function drawMinimap(ctx, state) {
  const x0 = VIEW.width - MAP_SIZE - MAP_PAD;
  const y0 = VIEW.height - MAP_SIZE - MAP_PAD;
  const scale = MAP_SIZE / state.city.size;
  ctx.fillStyle = 'rgba(16,20,28,0.85)';
  ctx.fillRect(x0 - 4, y0 - 4, MAP_SIZE + 8, MAP_SIZE + 8);
  ctx.strokeStyle = 'rgba(244,246,248,0.35)';
  ctx.strokeRect(x0 - 4.5, y0 - 4.5, MAP_SIZE + 8, MAP_SIZE + 8);
  // Water and sand at the south edge.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x0, y0 + MAP_SIZE - 8, MAP_SIZE, 8);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x0, y0 + MAP_SIZE - 12, MAP_SIZE, 4);
  // Roads.
  ctx.fillStyle = '#5a5f6a';
  for (const road of state.city.roads) {
    if (road.horizontal) ctx.fillRect(x0, y0 + road.at * scale - 2, MAP_SIZE, 4);
    else ctx.fillRect(x0 + road.at * scale - 2, y0, 4, MAP_SIZE);
  }
  // Parks.
  ctx.fillStyle = PALETTE.park;
  for (const park of state.city.parks) {
    ctx.fillRect(x0 + park.x * scale, y0 + park.y * scale, park.w * scale, park.h * scale);
  }
  // Buildings.
  ctx.fillStyle = 'rgba(244,246,248,0.5)';
  for (const b of state.city.buildings) {
    ctx.fillRect(x0 + b.x * scale, y0 + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  }
  // Mission target: a pulsing pink diamond.
  const m = state.missions;
  if (m.started && m.stage !== 'done') {
    const pulse = 3 + Math.sin(state.time * 5) * 1.5;
    ctx.fillStyle = PALETTE.mission;
    ctx.beginPath();
    ctx.arc(x0 + m.target.x * scale, y0 + m.target.y * scale, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police cars: flashing blue dots.
  ctx.fillStyle = '#2d6bff';
  for (const car of state.copCars) {
    ctx.beginPath();
    ctx.arc(x0 + car.x * scale, y0 + car.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player: a white triangle pointing where they face.
  const p = state.player;
  ctx.save();
  ctx.translate(x0 + p.x * scale, y0 + p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Viewport rectangle: the world the camera shows, in minimap pixels.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  const cam = state.camera;
  ctx.strokeRect(x0 + cam.x * scale, y0 + cam.y * scale, (VIEW.width / cam.zoom) * scale, (VIEW.height / cam.zoom) * scale);
}

function drawTargetArrow(ctx, state) {
  const m = state.missions;
  if (!m.started || m.stage === 'done') return;
  const cam = state.camera;
  const tx = (m.target.x - cam.x) * cam.zoom;
  const ty = (m.target.y - cam.y) * cam.zoom;
  if (tx > 60 && tx < VIEW.width - 60 && ty > 60 && ty < VIEW.height - 60) return; // on screen already
  const cx = VIEW.width / 2;
  const cy = VIEW.height / 2;
  const angle = Math.atan2(ty - cy, tx - cx);
  const ex = cx + Math.cos(angle) * (VIEW.width / 2 - 70);
  const ey = cy + Math.sin(angle) * (VIEW.height / 2 - 70);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(angle);
  ctx.fillStyle = PALETTE.mission;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const dist = Math.round(Math.hypot(m.target.x - state.player.x, m.target.y - state.player.y) / 50) * 50;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = PALETTE.mission;
  ctx.textAlign = 'center';
  ctx.fillText(`${dist}m`, ex, ey + 28);
}
