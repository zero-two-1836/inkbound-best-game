// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// seven screens: title, level select, play, paused, level complete, game over and
// all clear.
//
// ?seed=N fixes the ambient randomness. ?shot=title|play|win|fall (with &seed=N)
// stages that scene instead of running the loop, paints it and sets
// window.__shotReady for a screenshot. ?test=1 runs the autopilot through all ten
// levels and writes PASS/FAIL lines into #status and document.title.
import { BEST_KEY, STEP, STARS_KEY } from './config.js';
import { LEVELS } from './levels.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_COMPLETE, EVENT_DEATH, EVENT_OVER, EVENT_PORTAL, EVENT_SPRING, EVENT_STAMP, EVENT_STAR } from './world.js';
import { ACTION_CONFIRM, ACTION_ERASE_MODE, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_UNDO, createInput } from './input.js';
import { createRenderer, SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SELECT, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { autopilot, selfTest, stageShot, traceLevel } from './shots.js';

const MAX_FRAME = 0.25;
const PALETTE_STAR = '#ffd84d';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const testMode = params.get('test') === '1';
const traceMode = params.get('trace') === '1';
const traceLevelIndex = Math.max(0, Math.min(9, (Number.parseInt(params.get('level') ?? '1', 10) || 1) - 1));
const traceSeconds = Math.max(1, Number.parseInt(params.get('seconds') ?? '20', 10) || 20);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function readStars() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STARS_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveStars(stars) {
  try {
    window.localStorage.setItem(STARS_KEY, JSON.stringify(stars));
  } catch {
    // See saveBest.
  }
}

const view = {
  screen: SCREEN_TITLE,
  best: readBest(),
  totalStars: 0,
  starsPerLevel: readStars(),
  selected: 0,
  levelNames: LEVELS.map((l) => l.name),
  muted: false,
  eraseMode: false,
  hintUntil: 0,
  now: 0,
  time: 0,
  starsGot: 0,
  levelTime: 0,
  gained: 0,
  score: 0,
  lastLevel: false,
};

function refreshTotals() {
  view.totalStars = view.starsPerLevel.reduce((a, b) => a + (b || 0), 0);
}
refreshTotals();

function runShot(name) {
  const scene = stageShot(name, world);
  Object.assign(view, scene);
  view.best = readBest();
  refreshTotals();
  view.time = world.state.time;
  // Keep repainting the staged scene: a headless screenshot only captures a
  // frame the compositor actually presented, and a page that paints twice
  // and then goes idle can be captured before its first presented frame.
  let painted = 0;
  function paint() {
    renderer.draw(world, view, 0);
    painted += 1;
    if (painted === 10) window.__shotReady = true;
    requestAnimationFrame(paint);
  }
  requestAnimationFrame(paint);
}

function runTest() {
  const lines = selfTest(world);
  const text = lines.join(' | ');
  status.textContent = text;
  document.title = `Inkbound self-test: ${lines.filter((l) => l.includes('PASS')).length}/10 passed`;
  const pre = document.createElement('pre');
  pre.id = 'test-results';
  pre.textContent = lines.join('\n');
  document.body.appendChild(pre);
  window.__testDone = true;
  renderer.draw(world, view, 0);
}

function runTrace() {
  const lines = traceLevel(world, traceLevelIndex, traceSeconds);
  status.textContent = lines.join(' | ');
  document.title = `Inkbound trace level ${traceLevelIndex + 1}`;
  const pre = document.createElement('pre');
  pre.id = 'test-results';
  pre.textContent = lines.join('\n');
  document.body.appendChild(pre);
  window.__testDone = true;
  renderer.draw(world, view, 0);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let clock = 0;
  let scoreBeforeLevel = 0;
  let levelEntryScore = 0;
  let levelStartClock = 0;
  let lastDrawSound = 0;
  let attractSeeded = false;

  function announce(message) {
    status.textContent = message;
  }

  function startLevel(index, isRetry) {
    if (isRetry) {
      // A retry replays the level from the score it started with: points earned
      // in the failed attempt do not carry over.
      world.state.score = levelEntryScore;
    } else {
      levelEntryScore = world.state.score;
    }
    world.reset(index);
    scoreBeforeLevel = world.state.score;
    levelStartClock = clock;
    view.hintUntil = clock + 6;
    view.eraseMode = false;
    screen = SCREEN_PLAY;
    audio.levelStart();
    announce(`Level ${index + 1}: ${LEVELS[index].name}. ${LEVELS[index].hint}`);
  }

  function toSelect() {
    attractSeeded = false;
    screen = SCREEN_SELECT;
    announce('Choose a level.');
  }

  function toTitle() {
    attractSeeded = false;
    screen = SCREEN_TITLE;
    announce('Inkbound. Press Space or click to play.');
  }

  function finishLevel() {
    const gained = world.state.score - scoreBeforeLevel;
    const stars = world.state.starsGot;
    const prev = view.starsPerLevel[world.state.levelIndex] || 0;
    if (stars > prev) {
      view.starsPerLevel[world.state.levelIndex] = stars;
      saveStars(view.starsPerLevel);
    }
    refreshTotals();
    view.starsGot = stars;
    view.levelTime = world.state.time;
    view.gained = gained;
    view.score = world.state.score;
    view.lastLevel = world.state.levelIndex === LEVELS.length - 1;
    if (world.state.score > view.best) {
      view.best = world.state.score;
      saveBest(view.best);
    }
    if (view.lastLevel) screen = SCREEN_WIN;
    else screen = SCREEN_COMPLETE;
    announce(`Level complete! ${stars} stars, score ${world.state.score}.`);
  }

  function retryLevel() {
    startLevel(world.state.levelIndex, true);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      view.muted = audio.toggleMute();
      announce(view.muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) toSelect();
      return;
    }
    if (screen === SCREEN_SELECT) {
      if (actions & ACTION_CONFIRM) startLevel(view.selected);
      else if (actions & ACTION_PAUSE) toTitle();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (actions & ACTION_RESTART) {
        retryLevel();
      } else if (actions & ACTION_UNDO) {
        if (world.undoStroke()) audio.erase();
      } else if (actions & ACTION_ERASE_MODE) {
        view.eraseMode = !view.eraseMode;
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (actions & ACTION_RESTART) {
        retryLevel();
      }
      return;
    }
    if (screen === SCREEN_COMPLETE) {
      if (actions & ACTION_CONFIRM) startLevel(world.state.levelIndex + 1);
      else if (actions & ACTION_PAUSE) toTitle();
      return;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) retryLevel();
      else if (actions & ACTION_PAUSE) toTitle();
      return;
    }
    if (screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) {
        world.state.score = 0;
        startLevel(0);
      } else if (actions & ACTION_PAUSE) toTitle();
    }
  }

  function handleNumberKeys(event) {
    if (screen !== SCREEN_SELECT && screen !== SCREEN_TITLE) return;
    const n = Number.parseInt(event.key, 10);
    if (n >= 1 && n <= LEVELS.length) {
      if (screen === SCREEN_TITLE) toSelect();
      view.selected = n - 1;
      startLevel(n - 1);
    }
  }
  window.addEventListener('keydown', handleNumberKeys);

  function handlePointer() {
    const ptr = input.pointer();
    if (screen === SCREEN_TITLE) {
      if (ptr.down) {
        audio.unlock();
        audio.click();
        toSelect();
        input.clearPointerMoved();
      }
      return;
    }
    if (screen === SCREEN_SELECT) {
      if (ptr.down) {
        const rect = canvas.getBoundingClientRect();
        void rect;
        const cell = 150;
        const gap = 24;
        const cols = 5;
        const startX = 640 - (cols * cell + (cols - 1) * gap) / 2;
        const col = Math.floor((ptr.x - startX) / (cell + gap));
        const row = Math.floor((ptr.y - 190) / (cell + gap));
        if (col >= 0 && col < cols && row >= 0 && row < 2) {
          const idx = row * cols + col;
          const withinX = ptr.x - startX - col * (cell + gap) <= cell;
          const withinY = ptr.y - 190 - row * (cell + gap) <= cell;
          if (idx < LEVELS.length && withinX && withinY) {
            view.selected = idx;
            audio.unlock();
            audio.click();
            startLevel(idx);
          }
        }
        input.clearPointerMoved();
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (ptr.down) {
      audio.unlock();
      if (ptr.erase || view.eraseMode) {
        if (world.eraseAt(ptr.x, ptr.y)) audio.erase();
        return;
      }
      if (!world.liveStroke()) {
        if (world.beginStroke(ptr.x, ptr.y)) {
          lastDrawSound = clock;
          audio.draw();
        }
      } else if (ptr.moved) {
        world.addPoint(ptr.x, ptr.y);
        if (clock - lastDrawSound > 0.09) {
          lastDrawSound = clock;
          audio.draw();
        }
      }
    } else if (world.liveStroke()) {
      const ev = world.endStroke();
      if (ev & EVENT_STAMP) {
        audio.stamp();
        renderer.burst(ptr.x, ptr.y, PALETTE_STAR, 6, 90);
      }
    }
    input.clearPointerMoved();
  }

  function handleEvents(events) {
    const p = world.state.pip;
    if (events & EVENT_STAR) {
      audio.star();
      renderer.burst(p.x, p.y - 10, PALETTE_STAR, 16, 190);
      announce(`Star! ${world.state.starsGot} of 3.`);
    }
    if (events & EVENT_SPRING) {
      audio.spring();
      renderer.burst(p.x, p.y + 14, '#ffb347', 10, 140);
    }
    if (events & EVENT_PORTAL) {
      audio.portal();
      renderer.burst(p.x, p.y, '#c86bff', 14, 170);
    }
    if (events & EVENT_DEATH) {
      audio.death();
      renderer.burst(p.x, p.y, '#ff5d73', 22, 240);
      announce(world.state.lives > 0 ? `Pip popped! ${world.state.lives} ${world.state.lives === 1 ? 'life' : 'lives'} left.` : 'Out of lives!');
    }
    if (events & EVENT_COMPLETE) {
      audio.win();
      renderer.burst(world.level.flag.x, world.level.flag.y - 40, PALETTE_STAR, 30, 260);
      finishLevel();
    } else if (events & EVENT_OVER) {
      announce('Game over. Press Space to retry.');
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, input.direction(), input.takeJump());
    if (events) handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    clock += dt;
    view.now = clock;
    view.screen = screen;
    view.time = screen === SCREEN_TITLE || screen === SCREEN_SELECT || screen === SCREEN_WIN ? clock : world.state.time;
    view.score = world.state.score;
    handleActions();
    handlePointer();
    if (screen === SCREEN_TITLE) {
      // Attract mode: Pip plays level 1 by himself behind the title.
      if (!attractSeeded) {
        attractSeeded = true;
        world.reset(0);
        for (const stroke of world.level.solution) {
          const pts = stroke.points;
          world.beginStroke(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i += 1) world.addPoint(pts[i][0], pts[i][1]);
          world.endStroke();
        }
      }
      accumulator += dt;
      while (accumulator >= STEP) {
        const { move, jump } = autopilot(world);
        world.step(STEP, move, jump);
        accumulator -= STEP;
        if (world.state.status !== 'play') {
          attractSeeded = false;
          accumulator = 0;
          break;
        }
      }
    } else if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, view, dt);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Inkbound. Press Space or click to play.');
  requestAnimationFrame(frame);
}

if (traceMode) runTrace();
else if (testMode) runTest();
else if (shot) runShot(shot);
else runGame();
