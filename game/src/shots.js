// The screenshot scenes behind ?shot=title|play|win|fall, plus the ?test=1 self-test.
// Every scene plays the real rules forward from a fresh world, steered by a simple
// autopilot, so each frame is what a short game really looks like — and the same
// seed always gives the same frame. The self-test runs the same autopilot through
// all ten levels and reports which ones it finishes, so a broken level is caught
// here instead of by a player.

import { FIELD, STEP } from './config.js';
import { LEVELS } from './levels.js';
import { EVENT_COMPLETE, EVENT_OVER, moverPosition } from './world.js';
import { SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

/** The mover platforms at their current positions (they slide with world time). */
function currentMovers(world) {
  const t = world.time;
  return world.level.movers.map((m) => {
    const pos = moverPosition(m, t);
    return { x: pos.x, y: pos.y, w: m.w, h: m.h };
  });
}

/** Is there a floor (block, mover or stroke) under (x, feetY) within `drop` pixels? */
function groundAhead(world, x, feetY, drop) {
  const { level, state } = world;
  const solids = [...level.blocks, ...currentMovers(world)];
  for (const b of solids) {
    if (x >= b.x && x <= b.x + b.w && b.y >= feetY && b.y <= feetY + drop) return true;
  }
  for (const s of state.strokes) {
    for (const seg of s.segments) {
      const minX = Math.min(seg.x1, seg.x2);
      const maxX = Math.max(seg.x1, seg.x2);
      if (x < minX || x > maxX) continue;
      const k = maxX === minX ? 0 : (x - minX) / (maxX - minX);
      const sy = seg.y1 + (seg.y2 - seg.y1) * k;
      if (sy >= feetY && sy <= feetY + drop) return true;
    }
  }
  return false;
}

/** Is there a safe landing (floor, mover or stroke) within `drop` px below (x, feetY), and no spike in the way? */
function landingSafe(world, x, feetY) {
  const { level } = world;
  for (const s of level.spikes) {
    if (x > s.x && x < s.x + s.w && s.y >= feetY && s.y <= feetY + 140) return false;
  }
  return groundAhead(world, x, feetY, 140);
}

/**
 * Is there a stroke Pip can walk up ahead? The stroke's surface just ahead of
 * his leading edge must be near his feet (a step he can walk onto), and the
 * surface further ahead must climb above his feet — a flat bridge 54 px above
 * the floor is not walkable, but a ramp that starts at his feet is.
 */
function strokeAhead(world, x, feetY, dir) {
  let near = null;
  let far = null;
  for (const s of world.state.strokes) {
    for (const seg of s.segments) {
      const minX = Math.min(seg.x1, seg.x2);
      const maxX = Math.max(seg.x1, seg.x2);
      const syAt = (sx) => {
        if (sx < minX || sx > maxX) return null;
        const k = maxX === minX ? 0 : (sx - minX) / (maxX - minX);
        return seg.y1 + (seg.y2 - seg.y1) * k;
      };
      const n = syAt(x + dir * 12);
      if (n !== null && near === null) near = n;
      const f = syAt(x + dir * 80);
      if (f !== null && far === null) far = f;
    }
  }
  return (
    near !== null &&
    Math.abs(near - feetY) <= 16 &&
    far !== null &&
    far < feetY - 5 &&
    far > feetY - 115
  );
}

/** Steer Pip toward the nearest star, then the flag. Returns { move, jump }. */
/** The horizontal span of the surface Pip stands on, if any. */
function supportSpan(world, x, feetY) {
  const { level, state } = world;
  for (const b of [...level.blocks, ...currentMovers(world)]) {
    if (x >= b.x && x <= b.x + b.w && Math.abs(b.y - feetY) <= 10) return { x1: b.x, x2: b.x + b.w };
  }
  for (const s of state.strokes) {
    for (const seg of s.segments) {
      const minX = Math.min(seg.x1, seg.x2);
      const maxX = Math.max(seg.x1, seg.x2);
      if (x < minX || x > maxX) continue;
      const k = maxX === minX ? 0 : (x - minX) / (maxX - minX);
      const sy = seg.y1 + (seg.y2 - seg.y1) * k;
      if (Math.abs(sy - feetY) <= 10) return { x1: minX, x2: maxX };
    }
  }
  return null;
}

export function autopilot(world) {
  const p = world.state.pip;
  const level = world.level;
  let target = null;
  let best = Infinity;
  for (const s of world.state.stars) {
    if (s.taken) continue;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < best) {
      best = d;
      target = s;
    }
  }
  if (!target) target = { x: level.flag.x, y: level.flag.y - 24 };
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  let move = dx > 10 ? 1 : dx < -10 ? -1 : 0;
  let jump = false;
  // A target below us, right under our platform: walk to an edge and drop
  // off, instead of standing over it forever. Pick the edge with a safe
  // landing — a drop onto spikes is worse than a longer walk.
  if (p.grounded && dy > 40) {
    const span = supportSpan(world, p.x, p.y + 16);
    if (span && target.x >= span.x1 && target.x <= span.x2) {
      const leftSafe = landingSafe(world, span.x1 - 8, p.y + 16);
      const rightSafe = landingSafe(world, span.x2 + 8, p.y + 16);
      let dir;
      if (leftSafe && !rightSafe) dir = -1;
      else if (rightSafe && !leftSafe) dir = 1;
      else dir = p.x - span.x1 <= span.x2 - p.x ? -1 : 1;
      return { move: dir, jump: false };
    }
  }
  // Riding a ferry: stay aboard unless there is ground to step onto past its
  // edge, and only jump for a target above the ferry itself.
  if (p.grounded && p.groundMover) {
    const m = currentMovers(world).find((r) => r.x === p.groundMover.cx && r.y === p.groundMover.cy) ?? null;
    if (m) {
      const edgeX = move > 0 ? m.x + m.w : m.x;
      const beyond = groundAhead(world, edgeX + move * 30, p.y + 16, 90);
      if (move !== 0 && ((move > 0 && p.x > m.x + m.w - 30) || (move < 0 && p.x < m.x + 30)) && !beyond) {
        move = 0;
      }
      if (target.x < m.x - 60 || target.x > m.x + m.w + 60) jump = false;
    }
  }
  if (p.grounded) {
    // Jump for a target clearly above us — unless a stroke ahead can be
    // walked up instead. A jump off the lower part of a steep ramp never
    // clears the ledge above it: the jump's apex sits below the ledge top
    // and the ledge's face eats the jump and drops Pip to the floor.
    const climbable = move !== 0 && strokeAhead(world, p.x, p.y + 16, move);
    if (dy < -40 && Math.abs(dx) < 260 && !climbable) jump = true;
    // A gap ahead: jump it — unless the only way across is a moving ferry
    // that is not at the edge yet, in which case wait for it. Never jump for a
    // target below us: walking off the edge and dropping is the way down.
    if (!jump && dy < 40 && move !== 0 && !groundAhead(world, p.x + move * 56, p.y + 16, 90)) {
      if (world.level.movers.length) {
        const aheadX = p.x + move * 56;
        const near = currentMovers(world).some(
          (m) => Math.abs(m.y - p.y) < 120 && aheadX > m.x - 10 && aheadX < m.x + m.w + 10,
        );
        if (!near) return { move: 0, jump: false };
      }
      jump = true;
    }
    // Jump when pressed against a wall while trying to move.
    if (!jump && move !== 0 && Math.abs(p.vx) < 24) jump = true;
    // Walk onto a spring instead of hopping over it: the bounce is the way up.
    if (jump && move !== 0) {
      const springAhead = level.springs.some(
        (s) =>
          Math.abs(s.y - (p.y + 16)) < 30 &&
          ((move > 0 && s.x + s.w > p.x && s.x < p.x + 150) || (move < 0 && s.x < p.x && s.x + s.w > p.x - 150)),
      );
      if (springAhead) jump = false;
    }
  }
  return { move, jump };
}

/** Draw the level's intended solution strokes into the world. */
function drawSolution(world) {
  for (const stroke of world.level.solution) {
    const pts = stroke.points;
    world.beginStroke(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) world.addPoint(pts[i][0], pts[i][1]);
    world.endStroke();
  }
}

/** Run the autopilot for up to `seconds`, returns the events seen. */
function runFor(world, seconds) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const { move, jump } = autopilot(world);
    events |= world.step(STEP, move, jump);
    if (world.state.status !== 'play') break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it plus the
 * extras the view needs (stars, times, scores).
 */
export function stageShot(name, world) {
  if (name === 'play') {
    world.reset(8);
    drawSolution(world);
    runFor(world, 9);
    return { screen: SCREEN_PLAY, best: 0, hintUntil: 0, now: 0, eraseMode: false };
  }
  if (name === 'win') {
    world.reset(0);
    drawSolution(world);
    const events = runFor(world, 60);
    return {
      screen: events & EVENT_COMPLETE ? SCREEN_COMPLETE : SCREEN_PLAY,
      best: 0,
      hintUntil: 0,
      now: 0,
      eraseMode: false,
      starsGot: world.state.starsGot,
      levelTime: world.state.time,
      gained: world.state.score,
      score: world.state.score,
      lastLevel: false,
    };
  }
  if (name === 'fall') {
    world.reset(0);
    // No solution: Pip walks into the gap, falls, and runs out of lives.
    runFor(world, 90);
    return { screen: world.state.status === 'gameover' ? SCREEN_OVER : SCREEN_PLAY, best: 0, hintUntil: 0, now: 0, eraseMode: false };
  }
  // title (and anything else): an attract mode on level 1, mid-flight.
  world.reset(0);
  drawSolution(world);
  runFor(world, 5);
  return { screen: SCREEN_TITLE, best: 0, hintUntil: 0, now: 0, eraseMode: false };
}

/** Run every level with the autopilot and return one result line per level. */
export function selfTest(world) {
  const lines = [];
  for (let i = 0; i < LEVELS.length; i += 1) {
    world.reset(i);
    drawSolution(world);
    const events = runFor(world, 75);
    const done = (events & EVENT_COMPLETE) !== 0 || world.state.status === 'complete';
    const pos = `pos (${Math.round(world.state.pip.x)},${Math.round(world.state.pip.y)})`;
    lines.push(
      `level ${i + 1} ${LEVELS[i].name}: ${done ? 'PASS' : 'FAIL'} ` +
        `stars ${world.state.starsGot}/3 lives ${world.state.lives} ` +
        `time ${world.state.time.toFixed(1)}s score ${world.state.score} ${pos}`,
    );
  }
  return lines;
}

/** Trace one level: run the autopilot and log Pip's state every half second. */
export function traceLevel(world, levelIndex, seconds) {
  world.reset(levelIndex);
  drawSolution(world);
  const lines = [`trace level ${levelIndex + 1} ${LEVELS[levelIndex].name}`];
  const steps = Math.floor(seconds / STEP);
  const every = Math.floor(0.5 / STEP);
  for (let i = 0; i < steps; i += 1) {
    const { move, jump } = autopilot(world);
    const events = world.step(STEP, move, jump);
    if (i % every === 0 || world.state.status !== 'play') {
      const p = world.state.pip;
      lines.push(
        `t=${world.state.time.toFixed(1)} x=${Math.round(p.x)} y=${Math.round(p.y)} ` +
          `vx=${Math.round(p.vx)} vy=${Math.round(p.vy)} g=${p.grounded ? 1 : 0} ` +
          `mv=${move} j=${jump ? 1 : 0} st=${world.state.starsGot} lv=${world.state.lives} ` +
          `status=${world.state.status} ev=${events}`,
      );
    }
    if (world.state.status !== 'play') break;
  }
  return lines;
}
