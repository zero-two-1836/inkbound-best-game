# Inkbound — build log (transcript summary)

Game built for the make.fun bounty **"Make the best game"** (`best-game-01`,
$1,000, free entry, ends Thu 19 Nov 2026 01:00 WIB), for account **@zero-two**
(GitHub **zero-two-1836**). Built in one Muse session on 2026-11-18 by writing
every source file with the agent's own write/edit calls — the session files are
the transcript evidence for the bounty gate; this file is only a summary log,
not the transcript itself.

## What it is

**Inkbound — draw your way home.** An original puzzle-platformer: Pip, a little
ink blob, runs and jumps; the player draws ink platforms with the mouse (limited
ink per level, strokes are one-way platforms). 10 handcrafted levels, 3 stars
per level, 3 lives per level, springs, portals, a moving ferry, spikes and the
void. Title screen with attract mode, level select, pause, level complete,
game over and all-clear screens. All art drawn in code, all sound synthesized
with WebAudio, no assets, no network requests, deterministic (`?seed=N`).

- Controls: mouse draw, right-click / Shift / E erase, A/D or arrows move,
  Space / W / ↑ jump, R restart, Ctrl+Z undo, P / Esc pause, M mute,
  1–9 level select.
- Score: star 150 + level 400 + time bonus up to 600. Best score and stars in
  localStorage.
- Fixed 1/60 s step, 1280×720 logical field. `?shot=title|play|win|fall`
  stages deterministic scenes; `?test=1` runs an autopilot self-test through
  all ten levels.

## How it was verified

- `?test=1` (headless Chrome, `--virtual-time-budget=30000`):
  **10/10 PASS, every level 3/3 stars.** Final run 2026-11-18 ~12:50 WIB:
  L1 4.5s, L2 3.8s, L3 4.1s, L4 5.7s, L5 4.5s, L6 3.9s, L7 6.7s, L8 4.3s,
  L9 3.3s, L10 3.7s, 3 lives kept on every level.
- Screenshots are real renders of the game's own code
  (`?shot=title|play|win|fall&seed=1`, headless Chrome 1280×800), converted to
  JPEG quality 82, each 28–48 KB (cap 256 KiB): `screenshots/1-title.jpg`,
  `2-play.jpg`, `3-win.jpg`, `4-fall.jpg`. All four were visually inspected.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` builds cleanly: `out/` holds `game/`,
  `screenshots/` and `dossier.json` (schema `makefun/dossier/v1`, cover
  `1-title.jpg`). Game is 74,919 bytes, 10 source files — far under the
  48 MiB / 993-file caps.

## Bugs found and fixed during the build (all via the autopilot + a Node probe)

1. **L2 ramp corner ate every jump.** Each ramp ended below the next ledge's
   overhanging corner; a jump from the ramp smacked the corner and was
   cancelled. Fix: every ramp now ends exactly at the next ledge's top corner,
   so Pip walks straight up onto it.
2. **L2 platform face ate the last jump.** A jump off the lower part of steep
   ramp 4 peaked below platform 4's top, so the platform's left face zeroed
   Pip's speed and dropped him to the floor, where he jumped in place forever
   (target directly above). Fix: the autopilot no longer jumps when a stroke
   ahead can be walked up (surface near his feet at 12 px ahead, climbing
   5–115 px at 80 px ahead); a flat bridge 54 px above the floor is not
   walkable, so Spike Alley still jumps onto its bridges.
3. **L7 descent dropped Pip onto spikes.** The drop-off logic walked to the
   nearer edge, which was above the floor spikes — Pip died, respawned, and
   looped. Fix: the descent now picks the edge with a safe landing (no spike
   and ground within 140 px below).
4. **L9 stars unreachable.** Star 2 sat above the portal that teleports Pip
   away, and star 3 sat past the flag's 44 px pickup radius. Fix: star 2
   moved to (680,436), star 3 to (1080,256), flag moved to (1100,320).
5. **Headless screenshots came out blank.** `?shot` mode painted twice and
   went idle, so the compositor never presented a frame. Fix: `runShot`
   repaints the staged scene in a rAF loop and sets `window.__shotReady`
   after 10 paints.

## Repo layout

- `main.ts` — repo-root program (Node 22), copies `game/` + `screenshots/`
  to the output dir and writes `dossier.json` via `vendor/makefun-game.ts`
  (kit copy, unchanged).
- `game/index.html`, `game/src/{config,levels,random,audio,input,world,render,shots,main}.js`
- `serve.ts` — local dev server (`node serve.ts --port 8080`).
- `shots.json` — the four staged scenes. `LICENSE` — MIT (kit copy).
- `screenshots/` — the four JPEGs above.

## Still to do (parent / browser task, not this session)

- Create the **public** GitHub repo under **zero-two-1836** (gh is not logged
  in here, no live browser in this session) and push this repo's contents.
- Submit via the kit CLI (`node cli/makefun.mjs ...`) using the real Muse
  session files with the `bundle` tool, so the transcript gate is satisfied
  (a hand-written transcript file would rank but take no paid place).
- No entry fee was paid; the wallet holds 0 SOL (free bounty, no fee needed).
