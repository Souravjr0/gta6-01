// The story: Vic Marlowe, a wheelman fresh out of Solmar County jail, owes the crew
// money and works it off job by job for Rosa at the marina. Seven missions in order;
// each has a target place, a way to finish it, and a payout. The mission state is
// {index, stage, target, timer, done, text}.
import { CITY, MISSION_PAY } from './config.js';
import { districtAt } from './world.js';
import { healPlayer } from './player.js';

const NAMES = [
  { title: 'First Wheels', giver: 'Rosa', text: 'Steal a car and bring it to Rosa at the Marina.' },
  { title: 'Delivery Run', giver: 'Rosa', text: 'Drive the package to the North Docks. 75 seconds.' },
  { title: 'Getaway', giver: 'Rosa', text: 'The cops are on you. Lose the wanted level.' },
  { title: 'Shakedown', giver: 'Big Tony', text: 'Teach the Arcade thugs a lesson. Punch all 3.' },
  { title: 'Bank Job', giver: 'Big Tony', text: 'Hold the bank for 20 seconds, then escape to the hideout.' },
  { title: 'The Exchange', giver: 'Rosa', text: 'The deal is a setup. Take out 4 rivals at the Beachfront.' },
  { title: 'Solmar King', giver: 'Rosa', text: 'Survive a 3-star wanted level for 45 seconds. End this.' },
];

/** A mission target: the street intersection by block (bx, by), so it is always on a road. */
function place(city, bx, by) {
  const step = CITY.block + CITY.road;
  return {
    x: CITY.road / 2 + bx * step,
    y: CITY.road / 2 + by * step,
  };
}

export function missionList() {
  return NAMES.map((m, i) => ({ ...m, pay: MISSION_PAY[i] }));
}

export function createMissions(city) {
  return {
    index: 0,
    stage: 'go', // go | wait | survive | done
    target: place(city, 0, 0), // the Marina
    timer: 0,
    holdTimer: 0,
    killsNeeded: 0,
    killsDone: 0,
    started: false,
    text: NAMES[0].text,
  };
}

function atTarget(state, radius) {
  const m = state.missions;
  const dx = state.player.x - m.target.x;
  const dy = state.player.y - m.target.y;
  return dx * dx + dy * dy < radius * radius;
}

function completeMission(state) {
  const m = state.missions;
  const pay = MISSION_PAY[m.index];
  state.player.money += pay;
  healPlayer(state, 40);
  state.events.push('mission-complete');
  m.index += 1;
  if (m.index >= NAMES.length) {
    m.stage = 'done';
    m.text = 'Solmar is yours. Free roam — the city never sleeps.';
    return;
  }
  const next = NAMES[m.index];
  m.text = next.text;
  m.stage = 'go';
  m.timer = 0;
  m.holdTimer = 0;
  m.killsDone = 0;
  m.killsNeeded = 0;
  // Each mission's target place, in city blocks.
  m.target = targetFor(state.city, m.index);
  if (m.index === 2) {
    // Getaway: the cops come to you.
    state.wanted = Math.max(state.wanted, 2);
    state.wantedTimer = 0;
  }
  if (m.index === 3) {
    m.killsNeeded = 3;
    spawnThugs(state, 3, m.target);
  }
  if (m.index === 5) {
    m.killsNeeded = 4;
    spawnThugs(state, 4, m.target);
  }
  if (m.index === 6) {
    state.wanted = Math.max(state.wanted, 3);
    state.wantedTimer = 0;
    m.timer = 45;
  }
}

/** Each mission's target place, in city blocks. */
function targetFor(city, index) {
  const targets = [
    place(city, 0, 0), // Marina (mission 1)
    place(city, 0, 3), // North Docks (2)
    place(city, 0, 0), // anywhere, survive (3)
    place(city, 3, 1), // Arcade, east side (4)
    place(city, 1, 1), // Downtown bank (5)
    place(city, 1, 7), // Beachfront (6)
    place(city, 1, 1), // City Hall, downtown (7)
  ];
  return targets[index];
}

/** Jump the story to mission `index` (0-based), used when continuing a saved game. */
export function setMission(state, index) {
  const m = state.missions;
  m.index = Math.max(0, Math.min(index, NAMES.length - 1));
  m.target = targetFor(state.city, m.index);
  m.text = NAMES[m.index].text;
  m.stage = 'go';
  m.timer = 0;
  m.holdTimer = 0;
  m.killsDone = 0;
  m.killsNeeded = 0;
  if (m.index === 3) {
    m.killsNeeded = 3;
    spawnThugs(state, 3, m.target);
  }
  if (m.index === 5) {
    m.killsNeeded = 4;
    spawnThugs(state, 4, m.target);
  }
  if (m.index === 6) m.timer = 45;
}

function spawnThugs(state, count, at) {
  for (let i = 0; i < count; i += 1) {
    state.enemies.push({
      x: at.x + state.rng.range(-90, 90),
      y: at.y + state.rng.range(-90, 90),
      angle: 0, health: 60, fireCooldown: 1,
    });
  }
}

export function stepMissions(state, dt) {
  const m = state.missions;
  if (m.stage === 'done' || !m.started) return;
  const idx = m.index;
  if (idx === 0) {
    // First Wheels: reach the Marina in a stolen car.
    if (state.player.car && atTarget(state, 130)) completeMission(state);
  } else if (idx === 1) {
    // Delivery Run: reach the docks before the timer runs out.
    m.timer += dt;
    if (atTarget(state, 130)) completeMission(state);
    else if (m.timer > 75) {
      m.timer = 0;
      m.text = 'Too slow. The package is cold — drive to the North Docks again.';
      m.target = place(state.city, 0, 3);
    }
  } else if (idx === 2) {
    // Getaway: wanted level back to zero.
    if (state.wanted === 0) completeMission(state);
  } else if (idx === 3 || idx === 5) {
    // Shakedown / The Exchange: down the thugs, then return to the target.
    if (state.events.includes('enemy-down')) m.killsDone += 1;
    if (m.killsDone >= m.killsNeeded && atTarget(state, 160)) completeMission(state);
    else if (m.killsDone >= m.killsNeeded) {
      m.text = idx === 3
        ? 'They got the message. Get back to the Arcade.'
        : 'The case is yours. Get back to the Beachfront exchange.';
    }
  } else if (idx === 4) {
    // Bank Job: stand in the bank circle while the alarm runs, then reach the hideout.
    if (m.stage === 'go') {
      if (atTarget(state, 130)) {
        m.stage = 'wait';
        m.holdTimer = 0;
        state.wanted = Math.max(state.wanted, 3);
        state.wantedTimer = 0;
        m.text = 'Hold the bank! 20 seconds while the alarm screams.';
      }
    } else if (m.stage === 'wait') {
      m.holdTimer += dt;
      if (!atTarget(state, 150)) {
        m.stage = 'go';
        m.text = 'You left the bank too soon. Get back in there.';
      } else if (m.holdTimer >= 20) {
        m.stage = 'escape';
        m.target = place(state.city, 4, 4);
        m.text = 'Got it! Escape to the hideout in the east blocks.';
      }
    } else if (m.stage === 'escape' && atTarget(state, 130)) {
      completeMission(state);
    }
  } else if (idx === 6) {
    // Solmar King: survive 45 seconds at 3 stars.
    m.timer -= dt;
    if (state.wanted < 3) state.wanted = 3;
    if (m.timer <= 0) completeMission(state);
  }
}

/** The one-line objective the HUD shows, with a live countdown where one applies. */
export function missionObjective(state) {
  const m = state.missions;
  if (!m.started) return 'Press Enter to start the story';
  if (m.stage === 'done') return m.text;
  const where = districtAt(state.city, m.target.x, m.target.y);
  let suffix = ` — ${where}`;
  if (m.index === 1) suffix += ` (${Math.max(0, Math.ceil(75 - m.timer))}s)`;
  if (m.index === 4 && m.stage === 'wait') suffix += ` (${Math.max(0, Math.ceil(20 - m.holdTimer))}s)`;
  if (m.index === 6) suffix += ` (${Math.max(0, Math.ceil(m.timer))}s)`;
  if ((m.index === 3 || m.index === 5) && m.killsNeeded > 0) suffix += ` (${m.killsDone}/${m.killsNeeded} down)`;
  return `${m.index + 1}. ${NAMES[m.index].title}: ${m.text}${suffix}`;
}
