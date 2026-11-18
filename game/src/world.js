// Inkbound's world: Pip's physics, the ink strokes, and the level rules. The world
// advances in fixed steps; the renderer only paints what is here. Everything the
// player can do — run, jump, draw, erase — goes through this file.

import { FIELD, INK, PIP, SCORE, STEP } from './config.js';
import { LEVELS } from './levels.js';

export const EVENT_NONE = 0;export const EVENT_STAR = 1;
export const EVENT_DEATH = 2;
export const EVENT_COMPLETE = 4;
export const EVENT_OVER = 8;
export const EVENT_SPRING = 16;
export const EVENT_PORTAL = 32;
export const EVENT_STAMP = 64;
export const EVENT_HIT = 128;

const SPIKE_H = 18;
const SPRING_BOOST = 820;
const PORTAL_R = 26;
const FLAG_R = 44;

/**
 * A mover's position at time `t`: a trapezoid wave — it dwells at each end of
 * its run (a quarter of the period each), then slides across. The dwell is
 * what makes boarding a ferry fair. Shared by the physics, the renderer and
 * the autopilot, so all three always agree where a ferry is.
 */
export function moverPosition(m, t) {
  const cyc = (((t / m.period) + m.phase / (2 * Math.PI)) % 1 + 1) % 1;
  let k;
  if (cyc < 0.25) k = 0;
  else if (cyc < 0.5) k = (cyc - 0.25) / 0.25;
  else if (cyc < 0.75) k = 1;
  else k = 1 - (cyc - 0.75) / 0.25;
  return { x: m.x + m.dx * k, y: m.y + m.dy * k };
}

function strokeLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i += 1) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return len;
}

function segmentsOf(points) {
  const segs = [];
  for (let i = 1; i < points.length; i += 1) {
    segs.push({ x1: points[i - 1][0], y1: points[i - 1][1], x2: points[i][0], y2: points[i][1] });
  }
  return segs;
}

function closestOnSegment(px, py, s) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - s.x1) * dx + (py - s.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: s.x1 + dx * t, y: s.y1 + dy * t };
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    pip: { x: 0, y: 0, vx: 0, vy: 0, grounded: false, face: 1, coyote: 0, buffer: 0, angle: 0 },
    strokes: [],
    inkLeft: 0,
    inkUsed: 0,
    stars: [],
    starsGot: 0,
    score: 0,
    lives: 3,
    time: 0,
    status: 'play',
    portalCooldown: 0,
    shake: 0,
    flash: 0,
  };
  let level = LEVELS[0];
  let drawing = null;
  let movers = [];
  let time = 0;

  function resetMovers() {
    movers = level.movers.map((m) => ({ ...m, cx: m.x, cy: m.y, px: m.x, py: m.y }));
  }

  function reset(levelIndex) {
    state.levelIndex = levelIndex;
    level = LEVELS[levelIndex];
    state.pip.x = level.spawn.x;
    state.pip.y = level.spawn.y;
    state.pip.vx = 0;
    state.pip.vy = 0;
    state.pip.grounded = false;
    state.pip.groundMover = null;
    state.pip.angle = 0;
    state.strokes = [];
    state.inkLeft = level.ink;
    state.inkUsed = 0;
    state.stars = level.stars.map((s) => ({ ...s, taken: false }));
    state.starsGot = 0;
    state.lives = 3;
    state.time = 0;
    state.status = 'play';
    state.portalCooldown = 0;
    state.shake = 0;
    state.flash = 0;
    drawing = null;
    time = 0;
    resetMovers();
  }

  function moverPos(m, t) {
    return moverPosition(m, t);
  }

  function currentMovers() {
    return movers.map((m) => {
      const p = moverPos(m, time);
      return { x: p.x, y: p.y, w: m.w, h: m.h, mover: m };
    });
  }

  // --- drawing -------------------------------------------------------------
  function beginStroke(x, y) {
    if (state.status !== 'play' || state.inkLeft <= 0) return false;
    drawing = { points: [[x, y]], cost: 0 };
    return true;
  }

  function addPoint(x, y) {
    if (!drawing) return;
    const last = drawing.points[drawing.points.length - 1];
    if (Math.hypot(x - last[0], y - last[1]) < 5) return;
    const extra = Math.hypot(x - last[0], y - last[1]);
    const room = Math.min(INK.maxLength - drawing.cost, state.inkLeft - drawing.cost);
    if (extra > room) {
      // Clip the point to what the ink allows, then finish the stroke.
      const k = room / extra;
      drawing.points.push([last[0] + (x - last[0]) * k, last[1] + (y - last[1]) * k]);
      drawing.cost += room;
      endStroke();
      return;
    }
    drawing.points.push([x, y]);
    drawing.cost += extra;
  }

  function endStroke() {
    if (!drawing) return EVENT_NONE;
    const points = drawing.points;
    const cost = strokeLength(points);
    drawing = null;
    if (cost < INK.minLength) return EVENT_NONE;
    state.strokes.push({ points: points.slice(), segments: segmentsOf(points), cost });
    state.inkLeft -= cost;
    state.inkUsed += cost;
    return EVENT_STAMP;
  }

  function cancelStroke() {
    drawing = null;
  }

  function eraseAt(x, y) {
    for (let i = state.strokes.length - 1; i >= 0; i -= 1) {
      const s = state.strokes[i];
      for (const seg of s.segments) {
        const c = closestOnSegment(x, y, seg);
        if (Math.hypot(x - c.x, y - c.y) < 20) {
          state.strokes.splice(i, 1);
          state.inkLeft += s.cost;
          state.inkUsed -= s.cost;
          return true;
        }
      }
    }
    return false;
  }

  function undoStroke() {
    const s = state.strokes.pop();
    if (!s) return false;
    state.inkLeft += s.cost;
    state.inkUsed -= s.cost;
    return true;
  }

  // --- physics -------------------------------------------------------------
  function collideCircleRect(p, r, rect) {
    const cx = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return null;
    if (d2 === 0) return { nx: 0, ny: -1, depth: r };
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, depth: r - d };
  }

  function collideCircleSegment(p, r, seg, radius) {
    const c = closestOnSegment(p.x, p.y, seg);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d2 = dx * dx + dy * dy;
    const rr = r + radius;
    if (d2 >= rr * rr) return null;
    if (d2 === 0) return { nx: 0, ny: -1, depth: rr };
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, depth: rr - d };
  }

  function step(dt, move, jump) {
    if (state.status !== 'play') return EVENT_NONE;
    let events = EVENT_NONE;
    time += dt;
    state.time += dt;
    if (state.portalCooldown > 0) state.portalCooldown -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2);

    const p = state.pip;
    // Horizontal control.
    const accel = p.grounded ? PIP.runAccel : PIP.airAccel;
    p.vx += move * accel * dt;
    if (move === 0) {
      const f = p.grounded ? 2200 : 300;
      p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), f * dt);
    }
    p.vx = Math.max(-PIP.maxRun, Math.min(PIP.maxRun, p.vx));
    if (move !== 0) p.face = move;

    // Jump with coyote time and a short buffer.
    if (p.grounded) p.coyote = PIP.coyote;
    else p.coyote = Math.max(0, p.coyote - dt);
    if (jump) p.buffer = PIP.jumpBuffer;
    else p.buffer = Math.max(0, p.buffer - dt);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -PIP.jumpSpeed;
      p.grounded = false;
      p.coyote = 0;
      p.buffer = 0;
      events |= EVENT_HIT;
    }

    // Gravity.
    p.vy = Math.min(PIP.maxFall, p.vy + PIP.gravity * dt);

    // Move the platforms first; carry Pip if he stands on one.
    const standsOn = p.groundMover ?? null;
    for (const m of movers) {
      const pos = moverPos(m, time);
      m.dxStep = pos.x - m.cx;
      m.dyStep = pos.y - m.cy;
      m.cx = pos.x;
      m.cy = pos.y;
    }
    if (standsOn) {
      p.x += standsOn.dxStep ?? 0;
      p.y += standsOn.dyStep ?? 0;
    }
    p.groundMover = null;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(PIP.radius, Math.min(FIELD.width - PIP.radius, p.x));
    p.angle += (p.vx / PIP.radius) * dt;

    // Collide: blocks, movers, ink strokes. Resolve deepest first, twice.
    const solids = [...level.blocks.map((b) => ({ ...b, mover: null })), ...currentMovers()];
    let grounded = false;
    for (let pass = 0; pass < 2; pass += 1) {
      for (const rect of solids) {
        const hit = collideCircleRect(p, PIP.radius, rect);
        if (!hit) continue;
        p.x += hit.nx * hit.depth;
        p.y += hit.ny * hit.depth;
        if (hit.ny < -0.5) {
          grounded = true;
          if (p.vy > 0) p.vy = 0;
          p.groundMover = rect.mover;
        } else if (hit.ny > 0.5) {
          if (p.vy < 0) p.vy = 0;
        } else {
          p.vx = 0;
        }
      }
      for (const s of state.strokes) {
        for (const seg of s.segments) {
          // Ink is a one-way platform: Pip jumps up through it and lands on top.
          // Only collide while falling and while Pip's feet are above the surface.
          if (p.vy < 0) continue;
          const near = closestOnSegment(p.x, p.y, seg);
          if (p.y + PIP.radius > near.y + 8) continue;
          const hit = collideCircleSegment(p, PIP.radius, seg, INK.radius);
          if (!hit) continue;
          p.x += hit.nx * hit.depth;
          p.y += hit.ny * hit.depth;
          if (hit.ny < -0.5) {
            grounded = true;
            if (p.vy > 0) p.vy = 0;
          } else if (hit.ny > 0.5) {
            if (p.vy < 0) p.vy = 0;
          } else {
            p.vx = 0;
          }
        }
      }
    }
    const wasGrounded = p.grounded;
    p.grounded = grounded;
    if (grounded && !wasGrounded && p.vy === 0 && state.time > 0.2) events |= EVENT_HIT;

    // Springs.
    for (const s of level.springs) {
      if (p.vy >= 0 && p.x + PIP.radius > s.x && p.x - PIP.radius < s.x + s.w && p.y + PIP.radius > s.y - 6 && p.y + PIP.radius < s.y + 14) {
        p.vy = -SPRING_BOOST;
        p.grounded = false;
        events |= EVENT_SPRING;
      }
    }

    // Spikes.
    for (const s of level.spikes) {
      if (p.x + PIP.radius * 0.7 > s.x && p.x - PIP.radius * 0.7 < s.x + s.w && p.y + PIP.radius > s.y - SPIKE_H && p.y - PIP.radius < s.y) {
        return die(events);
      }
    }

    // Portals.
    if (state.portalCooldown <= 0 && level.portals.length >= 2) {
      for (const portal of level.portals) {
        if (Math.hypot(p.x - portal.x, p.y - portal.y) < PORTAL_R + PIP.radius * 0.8) {
          const other = level.portals.find((q) => q !== portal && q.link === portal.link);
          if (other) {
            // Step out standing still: keeping the entry speed would fling Pip
            // off whatever the exit overlooks.
            p.x = other.x;
            p.y = other.y;
            p.vx = 0;
            p.vy = 0;
            state.portalCooldown = 0.6;
            events |= EVENT_PORTAL;
            break;
          }
        }
      }
    }

    // Stars.
    for (const star of state.stars) {
      if (!star.taken && Math.hypot(p.x - star.x, p.y - star.y) < PIP.radius + 34) {
        star.taken = true;
        state.starsGot += 1;
        state.score += SCORE.star;
        events |= EVENT_STAR;
      }
    }

    // Flag.
    if (Math.hypot(p.x - level.flag.x, p.y - (level.flag.y - 24)) < FLAG_R) {
      const bonus = Math.max(0, SCORE.maxTimeBonus - Math.floor(state.time) * SCORE.timeBonusPerSecond);
      state.score += SCORE.level + bonus;
      state.status = 'complete';
      events |= EVENT_COMPLETE;
      return events;
    }

    // The void.
    if (p.y - PIP.radius > FIELD.height + 40) return die(events);

    return events;
  }

  function die(events) {
    state.lives -= 1;
    state.shake = 1;
    state.flash = 1;
    events |= EVENT_DEATH;
    if (state.lives <= 0) {
      state.status = 'gameover';
      events |= EVENT_OVER;
      return events;
    }
    state.pip.x = level.spawn.x;
    state.pip.y = level.spawn.y;
    state.pip.vx = 0;
    state.pip.vy = 0;
    state.pip.groundMover = null;
    state.portalCooldown = 0;
    return events;
  }

  /** The live stroke being drawn, for the renderer. */
  function liveStroke() {
    return drawing;
  }

  /** Total stars across all levels, from localStorage (set by main.js). */
  function totalStars() {
    return state.starsGot;
  }

  reset(0);

  return {
    state,
    get level() {
      return level;
    },
    get time() {
      return time;
    },
    reset,
    step,
    beginStroke,
    addPoint,
    endStroke,
    cancelStroke,
    eraseAt,
    undoStroke,
    liveStroke,
    totalStars,
    levelCount: LEVELS.length,
  };
}
