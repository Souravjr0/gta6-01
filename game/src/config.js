// Every tuning number and colour in one place. The view is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** City layout: square blocks separated by roads, N blocks across. */
export const CITY = {
  blocks: 8,
  block: 230,
  road: 96,
  /** World size in pixels, derived: roads on both outer edges. */
  get size() { return this.blocks * (this.block + this.road) + this.road; },
};

export const PLAYER = {
  radius: 14,
  walkSpeed: 230,
  runSpeed: 330,
  health: 100,
  punchDamage: 25,
  punchRange: 34,
  punchCooldown: 0.45,
};

export const CAR = {
  length: 54,
  width: 26,
  accel: 420,
  brake: 700,
  reverseAccel: 240,
  maxSpeed: 560,
  maxReverse: 160,
  steer: 2.6,
  grip: 3.2,
};

export const TRAFFIC = { count: 26, speed: 150, speedJitter: 45 };
export const PEDS = { count: 42, speed: 55, speedJitter: 25 };

export const WANTED = {
  max: 5,
  decaySeconds: 26,
  copFootAt: 1,
  copCarAt: 2,
  maxCops: 6,
  maxCopCars: 4,
  bustedHoldSeconds: 1.6,
};

export const BULLET = { speed: 900, life: 0.9, damage: 34, fireCooldown: 0.22 };

export const PALETTE = {
  grass: '#5d8a4a',
  grassAlt: '#557f43',
  park: '#4c7a3e',
  sand: '#d9c08a',
  water: '#2f6f8f',
  road: '#33373f',
  roadEdge: '#4a4f59',
  lane: '#c9c46a',
  sidewalk: '#8d8f96',
  building: ['#b5654a', '#4a7a9e', '#9e8a4a', '#7a5a8a', '#5a8a6a', '#a34a5a', '#6a6a7a', '#c08a4a'],
  roof: ['#8a4a38', '#38586e', '#7a6a38', '#5a4266', '#42664e', '#7a3642', '#4e4e5c', '#8f6538'],
  player: '#ffd23f',
  playerCar: '#e63946',
  police: '#1d3557',
  policeLight: ['#ff2d2d', '#2d6bff'],
  ped: ['#e8c39e', '#c98d6b', '#8a5a3b', '#f2d5b8'],
  shirt: ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#6d6875', '#84a98c', '#ff8fa3'],
  hud: '#10141c',
  text: '#f4f6f8',
  muted: '#9aa3b2',
  gold: '#f2c94c',
  mission: '#ff5d8f',
  danger: '#e63946',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save (money, missions, best wanted escape) is kept between visits. */
export const SAVE_KEY = 'solmar-city.save.v1';

/** Mission payouts, in dollars, one per mission in story order. */
export const MISSION_PAY = [500, 800, 1200, 1500, 2500, 4000, 8000];
