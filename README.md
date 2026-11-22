# Solmar City — an open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Souravjr0/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Souravjr0/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar City is a complete open-world crime game in the browser, built for make.fun's
[GTA 6 bounty](https://make.fun/bounty/gta6-01) ($1,666 in USDC). It is entirely
original: its own city, characters, vehicles, names and story — nothing from
Rockstar's Grand Theft Auto or any other commercial game.

## The game

You are Vic Marlowe, a wheelman fresh out of Solmar County jail, working off a debt
to the crew job by job for Rosa at the marina. Seven story missions take you from
stealing your first car to the final showdown at City Hall, with free roam in
between.

- **A city to explore** — 8×8 blocks of streets, buildings, parks, a marina and a
  beachfront, on foot and by car, with a camera that follows you.
- **Traffic and pedestrians** — cars drive the roads and turn at intersections;
  pedestrians stroll the sidewalks and run when shots are fired.
- **Cars to steal and drive** — walk up to any parked car and press E to take it.
  Stealing raises your wanted level.
- **A wanted level and police who respond** — 1 to 5 stars; foot cops chase you at
  1 star, police cars ram you from 2 stars. Lie low and the heat fades.
- **Missions and a story** — seven jobs with targets, timers, holdouts and
  shootouts, each paying out in dollars, tracked by a pink marker and a HUD
  objective line.
- **Combat** — a pistol (click or Space to shoot, mouse to aim) and punches (F).
- **HUD with a minimap** — money, health, wanted stars, the mission objective, a
  speedometer while driving, and a live minimap with the player, the mission
  target and police on it.
- **Start screen and saving** — press Q to save your money and mission progress;
  continue it later with C on the title screen.
- **Sound, all synthesized** — engine hum, police sirens, gunshots and a bass
  loop, made with WebAudio. M mutes.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot · drive when in a car |
| Shift | Run |
| E | Enter / exit a car |
| Click / Space | Shoot (mouse aims) |
| F | Punch |
| P / Esc | Pause |
| Q | Save the story |
| M | Mute |

## Play it

Serve `game/` with any static server and open `game/index.html`, or run
`node serve.ts` and open http://localhost:8080. No network requests, no build
step: every file the game loads lives under `game/`.

## Files

- `game/index.html` — the page; `game/src/main.js` boots the loop.
- `game/src/config.js` — every tuning number and colour.
- `game/src/world.js` — the city: blocks, roads, buildings, parks, marina, beach.
- `game/src/player.js` — the player on foot: movement, collision, punching, cars.
- `game/src/vehicles.js` — traffic AI, parked cars, and the driving model.
- `game/src/police.js` — the wanted system: foot cops, police cars, busted.
- `game/src/peds.js` — pedestrians: strolls, corners, and fleeing.
- `game/src/combat.js` — the pistol, enemy gunmen, punches and bullets.
- `game/src/missions.js` — the seven-mission story and its objectives.
- `game/src/audio.js` — WebAudio sound: engine, sirens, gunshots, music.
- `game/src/hud.js` — the HUD and the minimap.
- `game/src/render.js` — the camera and all drawing.
- `game/src/sim.js` — one fixed step of every system, in order.
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=…`).
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=efvebqp4&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
