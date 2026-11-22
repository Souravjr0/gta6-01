// The city of Solmar: a grid of blocks separated by roads, with buildings, parks, a
// marina on the west edge and a beach on the south edge. Pure data and geometry — no
// drawing, no browser — plus the collision and road helpers the other systems use.
import { CITY, PALETTE } from './config.js';

/** A street centreline: horizontal (y fixed) or vertical (x fixed). */
function roadLines() {
  const step = CITY.block + CITY.road;
  const lines = [];
  for (let i = 0; i <= CITY.blocks; i += 1) {
    const c = CITY.road / 2 + i * step;
    lines.push({ horizontal: true, at: c });
    lines.push({ horizontal: false, at: c });
  }
  return lines;
}

/** True when the point is on a road (within half a road width of a street centreline). */
export function onRoad(city, x, y) {
  const half = CITY.road / 2;
  for (const line of city.roads) {
    if (line.horizontal && Math.abs(y - line.at) < half) return true;
    if (!line.horizontal && Math.abs(x - line.at) < half) return true;
  }
  return false;
}

/** The nearest street centreline point to (x, y): where traffic lanes run. */
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const line of city.roads) {
    const d = line.horizontal ? Math.abs(y - line.at) : Math.abs(x - line.at);
    if (d < bestD) {
      bestD = d;
      best = line.horizontal ? { x, y: line.at } : { x: line.at, y };
    }
  }
  return best;
}

/** Circle-vs-building collision: returns the building hit, or null. */
export function hitBuilding(city, x, y, radius) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return b;
  }
  return null;
}

export function buildCity(random) {
  const size = CITY.size;
  const roads = roadLines();
  const buildings = [];
  const parks = [];
  const step = CITY.block + CITY.road;
  // Named districts, one per part of town, so missions and the HUD can name places.
  const districts = [
    { name: 'Marina', x: 0, y: 0 },
    { name: 'Old Town', x: 0, y: 1 },
    { name: 'The Strip', x: 1, y: 0 },
    { name: 'Downtown', x: 1, y: 1 },
    { name: 'North Docks', x: 0, y: 2 },
    { name: 'Little Havana', x: 2, y: 0 },
    { name: 'University', x: 2, y: 2 },
    { name: 'Beachfront', x: 1, y: 2 },
  ];
  for (let by = 0; by < CITY.blocks; by += 1) {
    for (let bx = 0; bx < CITY.blocks; bx += 1) {
      const ox = CITY.road + bx * step;
      const oy = CITY.road + by * step;
      // The south row is the beach; a few blocks are parks.
      if (by === CITY.blocks - 1) continue;
      if (random.chance(0.16)) {
        parks.push({ x: ox, y: oy, w: CITY.block, h: CITY.block, trees: random.int(5, 9) });
        continue;
      }
      const n = random.int(1, 2);
      for (let k = 0; k < n; k += 1) {
        const w = random.range(70, 130);
        const h = random.range(70, 130);
        const x = ox + random.range(8, CITY.block - w - 8);
        const y = oy + random.range(8, CITY.block - h - 8);
        const ci = random.int(0, PALETTE.building.length - 1);
        buildings.push({ x, y, w, h, color: PALETTE.building[ci], roof: PALETTE.roof[ci], height: random.int(1, 3) });
      }
    }
  }
  // The marina: docks jutting into the water on the west edge.
  const marina = { x: 0, y: CITY.road + step, w: 120, h: 260 };
  // The beach: sand strip + water along the whole south edge.
  const beach = { x: 0, y: size - CITY.road - 60, w: size, h: 60 };
  const water = { x: 0, y: size - CITY.road, w: size, h: CITY.road };
  return { size, roads, buildings, parks, marina, beach, water, districts };
}

/** A random point on a road, for spawning traffic and pedestrians. */
export function randomRoadPoint(city, random) {
  const line = random.pick(city.roads);
  const t = random.range(CITY.road, city.size - CITY.road);
  return line.horizontal ? { x: t, y: line.at } : { x: line.at, y: t };
}

/** A random sidewalk point (just off a road), for pedestrians. */
export function randomSidewalkPoint(city, random) {
  const p = randomRoadPoint(city, random);
  const off = (CITY.road / 2 + 8) * (random.chance(0.5) ? 1 : -1);
  return { x: p.x + off, y: p.y + off };
}

/** The named place nearest to (x, y), for the HUD's location line. */
export function districtAt(city, x, y) {
  const step = CITY.block + CITY.road;
  const bx = Math.max(0, Math.min(CITY.blocks - 1, Math.floor((x - CITY.road) / step)));
  const by = Math.max(0, Math.min(CITY.blocks - 1, Math.floor((y - CITY.road) / step)));
  if (by === CITY.blocks - 1) return 'Beachfront';
  if (bx === 0 && by === 0) return 'Marina';
  if (bx === 0 && by === 1) return 'Old Town';
  if (bx === 1 && by === 0) return 'The Strip';
  if (bx === 1 && by === 1) return 'Downtown';
  if (bx === 0) return 'North Docks';
  if (by === 0) return 'Little Havana';
  if (by === 2) return 'University';
  return 'Solmar';
}
