// Inkbound: every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PIP = {
  radius: 16,
  gravity: 1500,
  maxFall: 920,
  runAccel: 2600,
  airAccel: 1700,
  maxRun: 265,
  jumpSpeed: 560,
  coyote: 0.1,
  jumpBuffer: 0.12,
  bounce: 0.0,
};

export const INK = {
  /** Ink is spent by length: one unit of ink per pixel of stroke. */
  costPerPixel: 1,
  /** A stroke must be at least this long to count (avoids accidental dots). */
  minLength: 14,
  /** A stroke longer than this is cut off (the pen runs dry mid-stroke). */
  maxLength: 460,
  /** Collision radius of a stroke, in pixels. */
  radius: 6,
  /** How close two stroke endpoints must be to join into one stroke. */
  joinGap: 26,
};

export const LIVES_PER_LEVEL = 3;

/** Score: a star, a level finished, and a second left on the clock. */
export const SCORE = { star: 150, level: 400, timeBonusPerSecond: 8, maxTimeBonus: 600 };

export const PALETTE = {
  paper: '#0d1026',
  paperDeep: '#090b1c',
  grid: '#1a1f45',
  block: '#232a55',
  blockTop: '#2e3766',
  blockEdge: '#3d4782',
  spike: '#ff5d73',
  spring: '#ffb347',
  springBase: '#8a5a1d',
  portalA: '#37e0c8',
  portalB: '#c86bff',
  star: '#ffd84d',
  starGlow: '#ffe9a3',
  flag: '#ff6b6b',
  flagPole: '#e8e4d8',
  ink: '#4de3ff',
  inkDry: '#2a9db8',
  pip: '#4de3ff',
  pipDark: '#1d7f9e',
  pipEye: '#0d1026',
  text: '#f2ede0',
  muted: '#9aa3c7',
  gold: '#ffd84d',
  panel: '#171c3d',
  panelEdge: '#2c3468',
  danger: '#ff5d73',
  ok: '#7dff9e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best stars and best score are kept between visits (this browser only). */
export const BEST_KEY = 'inkbound.best';
export const STARS_KEY = 'inkbound.stars';

export const GAME_NAME = 'Inkbound';
export const GAME_TAGLINE = 'draw your way home';
