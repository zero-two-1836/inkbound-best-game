// Inkbound's renderer: everything the player sees. Canvas 2D, one logical 1280x720
// field scaled to the window. All art is drawn in code — no images, no fonts
// loaded over the network — and every screen (title, select, play, paused,
// complete, game over, all clear) is painted here.

import { FIELD, FONT, FONT_DISPLAY, PALETTE, PIP } from './config.js';
import { createRandom } from './random.js';
import { moverPosition } from './world.js';

// The night sky is fixed, not random per run: the same seed always paints the
// same stars and motes, so a staged screenshot is the same frame every time.
const SKY_RANDOM = createRandom(20261118);
const SKY_STARS = [];
for (let i = 0; i < 90; i += 1) {
  SKY_STARS.push({
    x: 30 + SKY_RANDOM() * 1220,
    y: 64 + SKY_RANDOM() * 480,
    r: 0.8 + SKY_RANDOM() * 1.5,
    a: 0.35 + SKY_RANDOM() * 0.55,
    p: SKY_RANDOM() * Math.PI * 2,
  });
}
const SKY_MOTES = [];
for (let i = 0; i < 14; i += 1) {
  SKY_MOTES.push({
    x: 60 + SKY_RANDOM() * 1160,
    y: 120 + SKY_RANDOM() * 480,
    r: 2 + SKY_RANDOM() * 2.5,
    c: ['#4de3ff', '#c86bff', '#ffd84d'][i % 3],
    a: 0.1 + SKY_RANDOM() * 0.08,
    p: SKY_RANDOM() * Math.PI * 2,
  });
}

export const SCREEN_TITLE = 'title';
export const SCREEN_SELECT = 'select';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_COMPLETE = 'complete';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  let t = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.7 + Math.random() * 0.5, max: 1.2, color, size: 2 + Math.random() * 3.5 });
    }
  }

  function drawMoon() {
    ctx.save();
    ctx.shadowColor = 'rgba(242,237,224,0.55)';
    ctx.shadowBlur = 46;
    ctx.fillStyle = '#f2ede0';
    ctx.beginPath();
    ctx.arc(168, 118, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(180,172,140,0.5)';
    ctx.beginPath();
    ctx.arc(154, 106, 8, 0, Math.PI * 2);
    ctx.arc(182, 130, 6, 0, Math.PI * 2);
    ctx.arc(172, 96, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStarfield() {
    for (const s of SKY_STARS) {
      const tw = 0.75 + 0.25 * Math.sin(t * 2 + s.p);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#dfe6ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawDistantHills() {
    const ridge = (base, h, a1, f1, p1, a2, f2, p2, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, FIELD.height);
      for (let x = 0; x <= FIELD.width; x += 16) {
        const y = base - (h + a1 * Math.sin(x * f1 + p1) + a2 * Math.sin(x * f2 + p2));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(FIELD.width, FIELD.height);
      ctx.closePath();
      ctx.fill();
    };
    // Far ridge, lower and lighter; near ridge, taller and darker, in front.
    ridge(700, 30, 18, 0.004, 1.7, 12, 0.011, 0.4, '#131838');
    ridge(720, 55, 30, 0.006, 4.2, 20, 0.017, 2.0, '#0e1230');
  }

  function drawInkMotes() {
    for (const m of SKY_MOTES) {
      const dx = Math.sin(t * 0.15 + m.p) * 10;
      const dy = Math.cos(t * 0.11 + m.p) * 8;
      ctx.globalAlpha = m.a;
      ctx.fillStyle = m.c;
      ctx.beginPath();
      ctx.arc(m.x + dx, m.y + dy, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBackground(dt) {
    t += dt;
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.paper);
    g.addColorStop(1, PALETTE.paperDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawMoon();
    drawStarfield();
    drawDistantHills();
    // Soft nebula blobs, slowly drifting.
    const blobs = [
      [220, 150, 260, 'rgba(77,227,255,0.05)'],
      [1060, 120, 300, 'rgba(200,107,255,0.05)'],
      [640, 620, 340, 'rgba(255,216,77,0.04)'],
    ];
    for (const [x, y, r, c] of blobs) {
      const bg = ctx.createRadialGradient(x + Math.sin(t * 0.11 + x) * 12, y, 0, x, y, r);
      bg.addColorStop(0, c);
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Dot grid.
    ctx.fillStyle = PALETTE.grid;
    for (let x = 40; x < FIELD.width; x += 80) {
      for (let y = 40; y < FIELD.height; y += 80) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    drawInkMotes();
  }

  function drawBlock(b) {
    ctx.fillStyle = PALETTE.block;
    rr(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.blockTop;
    ctx.fillRect(b.x + 4, b.y, b.w - 8, 6);
    ctx.strokeStyle = PALETTE.blockEdge;
    ctx.lineWidth = 1.5;
    rr(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.stroke();
  }

  function drawSpikes(s) {
    ctx.fillStyle = PALETTE.spike;
    const n = Math.max(1, Math.round(s.w / 24));
    const w = s.w / n;
    for (let i = 0; i < n; i += 1) {
      const x = s.x + i * w;
      ctx.beginPath();
      ctx.moveTo(x, s.y);
      ctx.lineTo(x + w / 2, s.y - 18);
      ctx.lineTo(x + w, s.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSpring(s, time) {
    const bob = Math.sin(time * 6) * 1.5;
    ctx.fillStyle = PALETTE.springBase;
    ctx.fillRect(s.x - 2, s.y - 4, s.w + 4, 10);
    ctx.fillStyle = PALETTE.spring;
    rr(ctx, s.x, s.y - 12 + bob, s.w, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#fff2cf';
    ctx.fillRect(s.x + 6, s.y - 10 + bob, s.w - 12, 3);
  }

  function drawPortal(p, color, time) {
    const pulse = 1 + Math.sin(time * 4 + p.x) * 0.06;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.rotate(time * 1.5);
    for (let i = 0; i < 3; i += 1) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.arc(0, -14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStar(x, y, taken, time) {
    if (taken) return;
    const bob = Math.sin(time * 2.4 + x * 0.01) * 4;
    const glow = 0.7 + Math.sin(time * 3 + y) * 0.3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.shadowColor = PALETTE.star;
    ctx.shadowBlur = 18 * glow;
    ctx.fillStyle = PALETTE.star;
    starPath(ctx, 0, 0, 15, time * 0.4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.starGlow;
    starPath(ctx, 0, 0, 7, time * 0.4);
    ctx.fill();
    ctx.restore();
  }

  function drawFlag(flag, time) {
    const { x, y } = flag;
    ctx.strokeStyle = PALETTE.flagPole;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 84);
    ctx.stroke();
    ctx.fillStyle = PALETTE.flagPole;
    ctx.beginPath();
    ctx.arc(x, y - 86, 5, 0, Math.PI * 2);
    ctx.fill();
    const wave = Math.sin(time * 5) * 6;
    ctx.fillStyle = PALETTE.flag;
    ctx.beginPath();
    ctx.moveTo(x, y - 84);
    ctx.quadraticCurveTo(x + 24, y - 84 + wave, x + 46, y - 74 + wave);
    ctx.quadraticCurveTo(x + 24, y - 66 + wave, x, y - 58);
    ctx.closePath();
    ctx.fill();
    // Glow ring marking the goal.
    ctx.strokeStyle = 'rgba(255,107,107,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(x, y - 24, 44 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawStroke(stroke, live) {
    const pts = stroke.points;
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = PALETTE.ink;
    ctx.shadowBlur = live ? 14 : 8;
    ctx.strokeStyle = live ? PALETTE.ink : PALETTE.inkDry;
    ctx.lineWidth = INK_WIDTH;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i += 1) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
    ctx.restore();
  }
  const INK_WIDTH = 12;

  function drawPip(p, time) {
    const squash = p.grounded ? 1 : 1 + Math.min(0.18, Math.abs(p.vy) / 4000);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(2 - squash > 1.15 ? 1.15 : 2 - squash, squash);
    const g = ctx.createRadialGradient(-6, -8, 4, 0, 0, PIP.radius + 6);
    g.addColorStop(0, '#8ff1ff');
    g.addColorStop(0.55, PALETTE.pip);
    g.addColorStop(1, PALETTE.pipDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, PIP.radius, 0, Math.PI * 2);
    ctx.fill();
    // Eyes look where Pip faces.
    const ex = p.face * 4;
    ctx.fillStyle = PALETTE.pipEye;
    ctx.beginPath();
    ctx.arc(-5 + ex, -4, 3.4, 0, Math.PI * 2);
    ctx.arc(6 + ex, -4, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4 + ex, -5.5, 1.2, 0, Math.PI * 2);
    ctx.arc(7 + ex, -5.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Smile.
    ctx.strokeStyle = PALETTE.pipEye;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(ex, 3, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
    // Soft shadow on the ground below.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + PIP.radius + 10, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const pt = particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 300 * dt;
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function text(str, x, y, size, color, align, weight, font) {
    ctx.font = `${weight || 700} ${size}px ${font || FONT_DISPLAY}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(13,16,38,0.82)';
    rr(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 18);
    ctx.stroke();
  }

  function drawHud(world, view) {
    const { state, level } = world;
    // Top bar.
    ctx.fillStyle = 'rgba(13,16,38,0.72)';
    ctx.fillRect(0, 0, FIELD.width, 52);
    text(`Level ${state.levelIndex + 1} — ${level.name}`, 24, 27, 20, PALETTE.text, 'left', 800);
    // Stars.
    for (let i = 0; i < 3; i += 1) {
      const sx = 620 + i * 34;
      ctx.save();
      ctx.translate(sx, 26);
      ctx.fillStyle = state.stars[i] && state.stars[i].taken ? PALETTE.star : 'rgba(255,216,77,0.25)';
      starPath(ctx, 0, 0, 11, 0);
      ctx.fill();
      ctx.restore();
    }
    // Ink meter.
    const inkFrac = Math.max(0, state.inkLeft / level.ink);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, 740, 16, 180, 20, 10);
    ctx.fill();
    ctx.fillStyle = inkFrac > 0.25 ? PALETTE.ink : PALETTE.danger;
    if (inkFrac > 0) {
      rr(ctx, 740, 16, Math.max(20, 180 * inkFrac), 20, 10);
      ctx.fill();
    }
    text('INK', 932, 27, 13, PALETTE.muted, 'left', 800);
    text(`♥`.repeat(state.lives) + `♡`.repeat(Math.max(0, 3 - state.lives)), 1000, 27, 18, PALETTE.danger, 'left', 700);
    text(`${fmtTime(state.time)}   ★ ${state.score}`, 1256, 27, 18, PALETTE.text, 'right', 800);
    if (view.hintUntil > view.now) {
      ctx.globalAlpha = Math.max(0, (view.hintUntil - view.now) / 0.5);
      text(level.hint, FIELD.width / 2, 84, 19, PALETTE.muted, 'center', 600, FONT);
      ctx.globalAlpha = 1;
    }
    if (view.eraseMode) text('ERASE MODE — click a stroke to remove it (E to exit)', FIELD.width / 2, 690, 16, PALETTE.danger, 'center', 700, FONT);
    else if (state.inkLeft <= 0) text('Out of ink — press E to erase, or R to restart', FIELD.width / 2, 690, 16, PALETTE.gold, 'center', 700, FONT);
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function drawWorld(world, view, time) {
    const { state, level } = world;
    for (const b of level.blocks) drawBlock(b);
    for (const m of level.movers) {
      const pos = moverPosition(m, time);
      drawBlock({ x: pos.x, y: pos.y, w: m.w, h: m.h });
    }
    for (const s of level.spikes) drawSpikes(s);
    for (const s of level.springs) drawSpring(s, time);
    for (const p of level.portals) {
      drawPortal(p, p.link === 0 && level.portals.indexOf(p) === 0 ? PALETTE.portalA : PALETTE.portalB, time);
    }
    for (const s of state.stars) drawStar(s.x, s.y, s.taken, time);
    drawFlag(level.flag, time);
    for (const s of state.strokes) drawStroke(s, false);
    const live = world.liveStroke();
    if (live && live.points.length >= 2) drawStroke(live, true);
    drawPip(state.pip, time);
    drawParticles(1 / 60);
  }

  function drawTitle(world, view, time) {
    drawWorld(world, view, time);
    ctx.fillStyle = 'rgba(9,11,28,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('INKBOUND', FIELD.width / 2, 190, 92, PALETTE.text, 'center', 900);
    text('draw your way home', FIELD.width / 2, 258, 30, PALETTE.ink, 'center', 600, FONT);
    // Decorative strokes under the title.
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawStroke({ points: [[430, 320], [560, 300], [700, 322], [850, 302]] }, true);
    ctx.restore();
    panel(FIELD.width / 2 - 230, 360, 460, 84);
    text('Click or press Space to play', FIELD.width / 2, 388, 22, PALETTE.text, 'center', 700);
    text('Draw platforms · Collect 3 stars · Reach the flag', FIELD.width / 2, 420, 16, PALETTE.muted, 'center', 600, FONT);
    text('Mouse draw · Right-click erase · Space jump · A/D move · R restart · M mute', FIELD.width / 2, 500, 15, PALETTE.muted, 'center', 600, FONT);
    text(`Best score ${view.best}   ·   ${view.totalStars}/30 stars`, FIELD.width / 2, 540, 16, PALETTE.gold, 'center', 700, FONT);
    text('10 hand-drawn levels · springs, portals & moving ferries', FIELD.width / 2, 580, 15, PALETTE.muted, 'center', 600, FONT);
  }

  function drawSelect(world, view) {
    drawBackground(0);
    text('Choose a level', FIELD.width / 2, 90, 44, PALETTE.text, 'center', 900);
    text('Click a level, or press its number', FIELD.width / 2, 140, 18, PALETTE.muted, 'center', 600, FONT);
    const cell = 150;
    const gap = 24;
    const cols = 5;
    const startX = FIELD.width / 2 - (cols * cell + (cols - 1) * gap) / 2;
    for (let i = 0; i < 10; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cell + gap);
      const y = 190 + row * (cell + gap);
      const sel = view.selected === i;
      ctx.fillStyle = sel ? '#232a55' : PALETTE.panel;
      rr(ctx, x, y, cell, cell, 16);
      ctx.fill();
      ctx.strokeStyle = sel ? PALETTE.ink : PALETTE.panelEdge;
      ctx.lineWidth = sel ? 3 : 2;
      rr(ctx, x, y, cell, cell, 16);
      ctx.stroke();
      text(String(i + 1), x + cell / 2, y + 44, 40, PALETTE.text, 'center', 900);
      text(view.levelNames[i], x + cell / 2, y + 88, 14, PALETTE.muted, 'center', 700, FONT);
      for (let s = 0; s < 3; s += 1) {
        ctx.save();
        ctx.translate(x + cell / 2 - 28 + s * 28, y + 122);
        ctx.fillStyle = view.starsPerLevel[i] > s ? PALETTE.star : 'rgba(255,216,77,0.22)';
        starPath(ctx, 0, 0, 10, 0);
        ctx.fill();
        ctx.restore();
      }
    }
    text('Esc back to title', FIELD.width / 2, 590, 16, PALETTE.muted, 'center', 600, FONT);
  }

  function drawComplete(world, view) {
    drawWorld(world, view, view.time);
    ctx.fillStyle = 'rgba(9,11,28,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 260, 190, 520, 300);
    text('Level complete!', FIELD.width / 2, 240, 40, PALETTE.ok, 'center', 900);
    for (let s = 0; s < 3; s += 1) {
      ctx.save();
      ctx.translate(FIELD.width / 2 - 56 + s * 56, 310);
      ctx.shadowColor = PALETTE.star;
      ctx.shadowBlur = view.starsGot > s ? 16 : 0;
      ctx.fillStyle = view.starsGot > s ? PALETTE.star : 'rgba(255,216,77,0.22)';
      starPath(ctx, 0, 0, 22, 0);
      ctx.fill();
      ctx.restore();
    }
    text(`Time ${fmtTime(view.levelTime)}   ·   Score +${view.gained}`, FIELD.width / 2, 372, 20, PALETTE.text, 'center', 700, FONT);
    text(`Total score ${view.score}`, FIELD.width / 2, 408, 18, PALETTE.muted, 'center', 700, FONT);
    text(view.lastLevel ? 'That was the last level — press Space!' : 'Press Space for the next level', FIELD.width / 2, 452, 18, PALETTE.ink, 'center', 700, FONT);
  }

  function drawOver(world, view) {
    drawWorld(world, view, view.time);
    ctx.fillStyle = 'rgba(9,11,28,0.65)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 260, 210, 520, 260);
    text('Out of lives!', FIELD.width / 2, 260, 40, PALETTE.danger, 'center', 900);
    text('Pip ran out of lives on this level.', FIELD.width / 2, 316, 19, PALETTE.text, 'center', 600, FONT);
    text('Your ink stays — try a kinder bridge.', FIELD.width / 2, 346, 16, PALETTE.muted, 'center', 600, FONT);
    text('Press Space to retry the level', FIELD.width / 2, 410, 20, PALETTE.ink, 'center', 700, FONT);
    text('Esc for the title screen', FIELD.width / 2, 442, 16, PALETTE.muted, 'center', 600, FONT);
  }

  function drawWin(world, view) {
    drawBackground(0);
    text('You did it!', FIELD.width / 2, 180, 64, PALETTE.gold, 'center', 900);
    text('Every flag reached. Every bridge drawn by you.', FIELD.width / 2, 250, 22, PALETTE.text, 'center', 600, FONT);
    for (let s = 0; s < 3; s += 1) {
      ctx.save();
      ctx.translate(FIELD.width / 2 - 56 + s * 56, 330);
      ctx.shadowColor = PALETTE.star;
      ctx.shadowBlur = 16;
      ctx.fillStyle = PALETTE.star;
      starPath(ctx, 0, 0, 24, 0);
      ctx.fill();
      ctx.restore();
    }
    text(`${view.totalStars}/30 stars   ·   Final score ${view.score}`, FIELD.width / 2, 400, 24, PALETTE.text, 'center', 800);
    text('Press Space to play again from level 1', FIELD.width / 2, 470, 19, PALETTE.ink, 'center', 700, FONT);
  }

  function drawPaused(world, view) {
    drawWorld(world, view, view.time);
    ctx.fillStyle = 'rgba(9,11,28,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 200, 250, 400, 180);
    text('Paused', FIELD.width / 2, 300, 40, PALETTE.text, 'center', 900);
    text('Esc / P to resume · R to restart the level', FIELD.width / 2, 352, 17, PALETTE.muted, 'center', 600, FONT);
    text(view.muted ? 'Sound: off (M)' : 'Sound: on (M)', FIELD.width / 2, 388, 17, PALETTE.muted, 'center', 600, FONT);
  }

  return {
    draw(world, view, dt) {
      const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
      ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
      const shake = world.state.shake;
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake * 10, (Math.random() - 0.5) * shake * 10);
      }
      drawBackground(dt);
      if (view.screen === SCREEN_TITLE) drawTitle(world, view, view.time);
      else if (view.screen === SCREEN_SELECT) drawSelect(world, view);
      else if (view.screen === SCREEN_PLAY) {
        drawWorld(world, view, view.time);
        drawHud(world, view);
      } else if (view.screen === SCREEN_PAUSED) {
        drawPaused(world, view);
        drawHud(world, view);
      } else if (view.screen === SCREEN_COMPLETE) drawComplete(world, view);
      else if (view.screen === SCREEN_OVER) drawOver(world, view);
      else if (view.screen === SCREEN_WIN) drawWin(world, view);
      if (world.state.flash > 0) {
        ctx.fillStyle = `rgba(255,93,115,${world.state.flash * 0.25})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    burst(x, y, color, n, speed) {
      burst(x, y, color, n, speed);
    },
  };
}
