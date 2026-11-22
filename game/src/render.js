// Drawing only: the city, its cars and people, and the screens, painted through a
// camera that follows the player. The 1280x720 logical view is scaled to fit the
// window and centred, the margin filled with the backdrop colour.
import { CITY, FONT, PALETTE, VIEW } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(value, x, y);
  }

  function drawCity(state) {
    const city = state.city;
    const cam = state.camera;
    const zoom = cam.zoom;
    // Visible world rect, so off-screen blocks are skipped.
    const vx0 = cam.x - 80;
    const vy0 = cam.y - 80;
    const vx1 = cam.x + VIEW.width / zoom + 80;
    const vy1 = cam.y + VIEW.height / zoom + 80;
    // Grass base.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    // Water and sand along the south edge.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(vx0, city.water.y, vx1 - vx0, city.water.h);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(vx0, city.beach.y, vx1 - vx0, city.beach.h);
    // Marina docks on the west edge.
    ctx.fillStyle = '#6a5a3a';
    ctx.fillRect(city.marina.x, city.marina.y, city.marina.w, city.marina.h);
    ctx.fillStyle = PALETTE.water;
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(city.marina.x + 8, city.marina.y + 12 + i * 62, 96, 34);
    }
    // Parks.
    for (const park of city.parks) {
      if (park.x > vx1 || park.x + park.w < vx0 || park.y > vy1 || park.y + park.h < vy0) continue;
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      ctx.fillStyle = '#3a6b32';
      for (let i = 0; i < park.trees; i += 1) {
        const tx = park.x + 20 + ((i * 53) % (park.w - 40));
        const ty = park.y + 20 + ((i * 37) % (park.h - 40));
        ctx.beginPath();
        ctx.arc(tx, ty, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Roads: asphalt, then sidewalk edging, then centre dashes.
    for (const road of city.roads) {
      if (road.horizontal) {
        ctx.fillStyle = PALETTE.road;
        ctx.fillRect(vx0, road.at - CITY.road / 2, vx1 - vx0, CITY.road);
        ctx.fillStyle = PALETTE.sidewalk;
        ctx.fillRect(vx0, road.at - CITY.road / 2, vx1 - vx0, 8);
        ctx.fillRect(vx0, road.at + CITY.road / 2 - 8, vx1 - vx0, 8);
        ctx.fillStyle = PALETTE.lane;
        for (let x = Math.floor(vx0 / 44) * 44; x < vx1; x += 44) {
          ctx.fillRect(x, road.at - 2, 22, 4);
        }
      } else {
        ctx.fillStyle = PALETTE.road;
        ctx.fillRect(road.at - CITY.road / 2, vy0, CITY.road, vy1 - vy0);
        ctx.fillStyle = PALETTE.sidewalk;
        ctx.fillRect(road.at - CITY.road / 2, vy0, 8, vy1 - vy0);
        ctx.fillRect(road.at + CITY.road / 2 - 8, vy0, 8, vy1 - vy0);
        ctx.fillStyle = PALETTE.lane;
        for (let y = Math.floor(vy0 / 44) * 44; y < vy1; y += 44) {
          ctx.fillRect(road.at - 2, y, 4, 22);
        }
      }
    }
    // Buildings: a drop shadow, the walls, and a lighter roof with a height edge.
    for (const b of city.buildings) {
      if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
      const h = 6 * b.height;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + h, b.y + h, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
    }
  }

  function drawCar(car, state) {
    const flashing = car.kind === 'police' && Math.floor(state.time * 4) % 2 === 0;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-28, -12, 56, 28);
    ctx.fillStyle = car.color;
    ctx.fillRect(-27, -13, 54, 26);
    // Windshield and rear window.
    ctx.fillStyle = '#1b2a3a';
    ctx.fillRect(6, -10, 12, 20);
    ctx.fillRect(-20, -10, 8, 20);
    if (car.kind === 'taxi') {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-8, -14, 16, 4);
      ctx.fillStyle = '#111';
      ctx.fillRect(-4, -15, 8, 6);
    }
    if (car.kind === 'police') {
      ctx.fillStyle = '#f4f6f8';
      ctx.fillRect(-27, -13, 54, 26);
      ctx.fillStyle = '#1d3557';
      ctx.fillRect(-27, -13, 54, 10);
      ctx.fillStyle = flashing ? '#ff2d2d' : '#2d6bff';
      ctx.fillRect(-6, -16, 12, 6);
    }
    if (car.driver === 'player') {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.strokeRect(-30, -16, 60, 32);
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, skin, shirt, down) {
    ctx.save();
    ctx.translate(x, y);
    if (down) {
      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 7, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(angle);
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(5, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(state) {
    const p = state.player;
    if (p.car) return;
    if (p.hurtFlash > 0 && Math.floor(p.hurtFlash * 12) % 2 === 0) return; // blink while hurt
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b2a3a';
    ctx.beginPath();
    ctx.arc(5, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    // Gun in hand when firing.
    if (state.input.fire) {
      ctx.fillStyle = '#222';
      ctx.fillRect(10, -2, 12, 4);
    }
    ctx.restore();
  }

  function drawMarker(state) {
    const m = state.missions;
    if (!m.started || m.stage === 'done') return;
    const pulse = 1 + Math.sin(state.time * 5) * 0.25;
    const r = 26 * pulse;
    ctx.save();
    ctx.translate(m.target.x, m.target.y);
    ctx.fillStyle = 'rgba(255,93,143,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r + 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.mission;
    ctx.fillRect(-r / 2, -r / 2, r, r);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-r / 4, -r / 4, r / 2, r / 2);
    ctx.restore();
  }

  function drawWorld(state) {
    drawCity(state);
    drawMarker(state);
    // Skid and explosion particles under everything else.
    for (const pt of state.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const ped of state.peds) {
      drawPerson(ped.x, ped.y, ped.angle, ped.skin, ped.shirt, ped.state === 'down');
    }
    for (const car of state.cars) drawCar(car, state);
    for (const e of state.enemies) {
      drawPerson(e.x, e.y, e.angle, '#c98d6b', '#a4133c', false);
      ctx.fillStyle = '#222';
      ctx.fillRect(e.x + Math.cos(e.angle) * 10 - 2, e.y + Math.sin(e.angle) * 10 - 2, 12, 4);
    }
    for (const cop of state.cops) {
      drawPerson(cop.x, cop.y, cop.angle, '#e8c39e', '#1d3557', false);
    }
    // Bullets: short bright streaks.
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 3;
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.stroke();
    }
    drawPlayer(state);
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 32 + 70;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    ctx.fillStyle = 'rgba(16,20,28,0.92)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = accent || PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
    ctx.textBaseline = 'alphabetic';
    text(title, VIEW.width / 2, y + 72, 46, PALETTE.text, 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW.width / 2, y + 124 + i * 32, 20, PALETTE.muted, 'center');
    }
    text(prompt, VIEW.width / 2, y + height - 34, 22, PALETTE.gold, 'center', true);
  }

  /** Paint one frame: the world through the camera, then the HUD or a panel. */
  function draw(state, screen, save) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = state.camera;
    ctx.setTransform(view.scale * cam.zoom, 0, 0, view.scale * cam.zoom, view.x - cam.x * view.scale * cam.zoom, view.y - cam.y * view.scale * cam.zoom);
    drawWorld(state);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const { drawHud } = state.hud;
    if (screen === SCREEN_TITLE) {
      drawHud(ctx, state, screen);
      const lines = [
        'Solmar City. Sun, sea, and seven jobs that pay.',
        'Steal cars, dodge the Solmar PD, run missions for Rosa.',
        'WASD move & drive · E enter car · Click shoot · F punch · Q save',
      ];
      if (save) lines.push('A saved story was found — press C to continue it.');
      drawPanel('SOLMAR CITY', lines, 'Press Enter to start', PALETTE.gold);
      return;
    }
    drawHud(ctx, state, screen);
    if (state.toast) {
      ctx.font = `bold 24px ${FONT}`;
      const w = ctx.measureText(state.toast).width;
      ctx.fillStyle = 'rgba(16,20,28,0.85)';
      ctx.fillRect((VIEW.width - w) / 2 - 18, 66, w + 36, 44);
      ctx.fillStyle = PALETTE.gold;
      ctx.textAlign = 'center';
      ctx.fillText(state.toast, VIEW.width / 2, 96);
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The city waits for you.'], 'Press P to resume · Q to save', PALETTE.muted);
    } else if (screen === SCREEN_BUSTED) {
      drawPanel('BUSTED', ['The Solmar PD caught up with you.', `You kept $${state.player.money.toLocaleString('en-US')} — the crew is not happy.`], 'Press Enter to try again', '#2d6bff');
    } else if (screen === SCREEN_WASTED) {
      drawPanel('WASTED', ['Solmar County Hospital. Again.', `You kept $${state.player.money.toLocaleString('en-US')} — the crew is not happy.`], 'Press Enter to try again', PALETTE.danger);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
