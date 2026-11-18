[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/zero-two-1836/inkbound-best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/zero-two-1836/inkbound-best-game/reward.svg)](https://make.fun/bounty/best-game-01)

# Inkbound — draw your way home

A complete, original puzzle-platformer that plays offline in a desktop browser
from static files. No build step, no network requests, no assets: every pixel
and every sound is drawn and synthesized in code.

## The game

Pip is a little ink blob who has to reach the flag at the end of each level.
Pip can run and jump — but the levels are broken, and the only way across is
the pen in your hand: **draw ink platforms with the mouse** and walk on them.

- **10 handcrafted levels**: gaps, spike alleys, springs, portals, a moving
  ferry, a deep well, a guarded flag and a final tower climb.
- **Ink is a resource**: every stroke costs ink by the pixel, and each level
  budgets a little more than its intended solution — so you have to think,
  but never pixel-perfect.
- **3 stars per level**, a timer, and a score: stars, a level bonus and a time
  bonus. Best score and stars are remembered between visits.
- **Lose a life** to spikes or the void; three lives per level, then game over.
- **Synthesized sound** (WebAudio): drawing scratches, star chimes, spring
  boings, portal warps, win fanfares. `M` mutes.
- **Screens**: animated title with an attract mode (Pip plays level 1 by
  himself), level select with stars, pause, level complete, game over and an
  all-clear screen.

## Controls

| Input | Does |
| --- | --- |
| Mouse drag | Draw an ink platform |
| Right-click / Shift-drag / `E` | Erase a stroke (ink refunded) |
| `A` / `D` or ← / → | Run |
| `Space` / `W` / ↑ | Jump |
| `R` | Restart the level |
| `Ctrl+Z` | Undo the last stroke |
| `P` / `Esc` | Pause |
| `M` | Mute |
| `1`–`9`, `0` | Jump to a level from the title screen |
| Click / `Space` | Confirm |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# out/ holds game/, screenshots/ and dossier.json
```

## Files

- `game/index.html` — the page; loads only files under `game/`.
- `game/src/main.js` — boot, the fixed-step loop, screens, input wiring.
- `game/src/world.js` — physics, ink strokes, and the level rules.
- `game/src/render.js` — all drawing: world, HUD and screens.
- `game/src/levels.js` — the ten levels and their intended solutions.
- `game/src/shots.js` — deterministic screenshot scenes and the self-test.
- `game/src/config.js`, `random.js`, `audio.js`, `input.js` — tuning,
  seeded randomness, synthesized sound, keyboard and pointer input.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-game.ts`.
- `shots.json` — the four screenshot scenes (`?shot=title|play|win|fall`).
- `screenshots/` — four real renders of the game's own code.

## Self-test

Open `http://localhost:8080/?test=1`: an autopilot draws each level's intended
solution and plays it, and the page reports PASS/FAIL per level. All ten
levels pass.

## License

MIT — see `LICENSE`.
