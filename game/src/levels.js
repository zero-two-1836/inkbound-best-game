// Inkbound's ten handcrafted levels. Every level is data: blocks to stand on, spikes to
// avoid, springs, portals, a moving platform, three stars and a flag — plus the
// intended solution strokes, which the screenshot autopilot and the self-test use
// to prove the level can be finished. Ink budgets sit a little above the solution's
// length, so the player must think but never pixel-perfect.
//
// Coordinates are in the 1280x720 logical field. A jump rises ~104 px and carries
// ~200 px, so anything higher or wider than that needs ink. A block is {x, y, w, h}
// with y at its top. Spikes sit on a block's top: {x, y, w} with y the surface.
// A spring is {x, y, w} on a surface. A mover is a block that slides between
// (x, y) and (x + dx, y + dy) over `period` seconds. Portals pair by `link`.
// A solution stroke is { points: [[x, y], ...] }.

export const LEVELS = [
  {
    name: 'First Steps',
    hint: 'Draw a bridge over the gap. Drag with the mouse.',
    ink: 260,
    spawn: { x: 80, y: 620 },
    flag: { x: 1180, y: 660 },
    stars: [
      { x: 640, y: 566 },
      { x: 900, y: 576 },
      { x: 1150, y: 600 },
    ],
    blocks: [
      { x: 0, y: 660, w: 560, h: 60 },
      { x: 720, y: 660, w: 560, h: 60 },
      { x: 880, y: 580, w: 120, h: 20 },
    ],
    spikes: [],
    springs: [],
    movers: [],
    portals: [],
    solution: [{ points: [[540, 636], [744, 636]] }],
  },
  {
    name: 'Upstairs',
    hint: 'The ledges are too high to jump. Draw ramps.',
    ink: 720,
    spawn: { x: 70, y: 620 },
    flag: { x: 1010, y: 140 },
    stars: [
      { x: 315, y: 472 },
      { x: 545, y: 342 },
      { x: 775, y: 212 },
    ],
    // The stairs: four ramps, each one ending exactly at the next ledge's top
    // corner, so Pip walks straight up onto it — a ramp that ends below a
    // ledge's overhanging corner would eat every jump with the corner.
    blocks: [
      { x: 0, y: 660, w: 1280, h: 60 },
      { x: 290, y: 530, w: 200, h: 22 },
      { x: 470, y: 400, w: 200, h: 22 },
      { x: 700, y: 270, w: 200, h: 22 },
      { x: 930, y: 140, w: 220, h: 22 },
    ],
    spikes: [],
    springs: [],
    movers: [],
    portals: [],
    solution: [
      { points: [[170, 652], [290, 530]] },
      { points: [[370, 522], [470, 400]] },
      { points: [[600, 392], [700, 270]] },
      { points: [[830, 262], [930, 140]] },
    ],
  },
  {
    name: 'Spike Alley',
    hint: 'Spikes bite. Bridge over them, do not touch them.',
    ink: 520,
    spawn: { x: 70, y: 620 },
    flag: { x: 1190, y: 660 },
    stars: [
      { x: 500, y: 556 },
      { x: 780, y: 556 },
      { x: 1100, y: 556 },
    ],
    blocks: [{ x: 0, y: 660, w: 1280, h: 60 }],
    spikes: [
      { x: 420, y: 660, w: 160 },
      { x: 700, y: 660, w: 160 },
    ],
    springs: [],
    movers: [],
    portals: [],
    solution: [
      { points: [[400, 606], [600, 606]] },
      { points: [[680, 606], [880, 606]] },
    ],
  },
  {
    name: 'Springboard',
    hint: 'Bounce on the spring, then draw your landing.',
    ink: 620,
    spawn: { x: 70, y: 620 },
    flag: { x: 890, y: 290 },
    stars: [
      { x: 520, y: 470 },
      { x: 575, y: 380 },
      { x: 1180, y: 236 },
    ],
    blocks: [
      { x: 0, y: 660, w: 1280, h: 60 },
      { x: 500, y: 440, w: 150, h: 22 },
      { x: 800, y: 290, w: 200, h: 22 },
    ],
    spikes: [],
    springs: [{ x: 400, y: 660, w: 70 }],
    movers: [],
    portals: [],
    solution: [
      { points: [[630, 432], [780, 315]] },
      { points: [[1000, 266], [1180, 236]] },
    ],
  },
  {
    name: 'Twin Gates',
    hint: 'Walk into the teal gate. It drops you out the violet one.',
    ink: 720,
    spawn: { x: 200, y: 620 },
    flag: { x: 1150, y: 660 },
    stars: [
      { x: 640, y: 296 },
      { x: 760, y: 556 },
      { x: 1100, y: 586 },
    ],
    blocks: [
      { x: 0, y: 660, w: 560, h: 60 },
      { x: 680, y: 660, w: 600, h: 60 },
      { x: 600, y: 380, w: 140, h: 280 },
      { x: 40, y: 600, w: 100, h: 60 },
    ],
    spikes: [],
    springs: [],
    movers: [],
    portals: [
      { x: 90, y: 560, link: 0 },
      { x: 900, y: 622, link: 0 },
    ],
    solution: [
      { points: [[300, 652], [585, 400]] },
      { points: [[600, 356], [700, 356]] },
    ],
  },
  {
    name: 'Moving Day',
    hint: 'Ride the ferry across the void. Mind the gap.',
    ink: 320,
    spawn: { x: 70, y: 620 },
    flag: { x: 1150, y: 660 },
    stars: [
      { x: 520, y: 536 },
      { x: 640, y: 476 },
      { x: 1000, y: 576 },
    ],
    blocks: [
      { x: 0, y: 660, w: 420, h: 60 },
      { x: 860, y: 660, w: 420, h: 60 },
    ],
    spikes: [],
    springs: [],
    movers: [{ x: 420, y: 600, w: 160, h: 18, dx: 280, dy: 0, period: 6, phase: 0 }],
    portals: [],
    solution: [{ points: [[580, 536], [720, 536]] }],
  },
  {
    name: 'The Well',
    hint: 'Drop down gently: ink a zigzag staircase.',
    ink: 720,
    spawn: { x: 60, y: 260 },
    flag: { x: 500, y: 660 },
    stars: [
      { x: 400, y: 340 },
      { x: 600, y: 440 },
      { x: 520, y: 540 },
    ],
    blocks: [
      { x: 0, y: 300, w: 300, h: 22 },
      { x: 300, y: 660, w: 980, h: 60 },
    ],
    spikes: [
      { x: 330, y: 660, w: 90 },
      { x: 900, y: 660, w: 90 },
    ],
    springs: [],
    movers: [],
    portals: [],
    solution: [
      { points: [[300, 376], [480, 376]] },
      { points: [[480, 476], [680, 476]] },
      { points: [[400, 576], [620, 576]] },
    ],
  },
  {
    name: 'Star Chamber',
    hint: 'A wall guards the flag. Go over it, not through it.',
    ink: 620,
    spawn: { x: 70, y: 620 },
    flag: { x: 1150, y: 660 },
    stars: [
      { x: 320, y: 556 },
      { x: 670, y: 360 },
      { x: 1000, y: 556 },
    ],
    blocks: [
      { x: 0, y: 660, w: 1280, h: 60 },
      { x: 640, y: 420, w: 140, h: 240 },
    ],
    spikes: [],
    springs: [],
    movers: [],
    portals: [],
    solution: [
      { points: [[420, 652], [620, 440]] },
      { points: [[700, 420], [820, 420]] },
    ],
  },
  {
    name: 'Gauntlet',
    hint: 'Spikes, a spring and a gate — use everything you know.',
    ink: 620,
    spawn: { x: 70, y: 620 },
    flag: { x: 1100, y: 320 },
    stars: [
      { x: 450, y: 556 },
      { x: 680, y: 436 },
      { x: 1080, y: 256 },
    ],
    blocks: [
      { x: 0, y: 660, w: 300, h: 60 },
      { x: 300, y: 660, w: 340, h: 60 },
      { x: 640, y: 500, w: 140, h: 22 },
      { x: 900, y: 320, w: 220, h: 22 },
    ],
    spikes: [{ x: 320, y: 660, w: 260 }],
    springs: [{ x: 680, y: 500, w: 60 }],
    movers: [],
    portals: [
      { x: 710, y: 456, link: 0 },
      { x: 950, y: 276, link: 0 },
    ],
    solution: [{ points: [[260, 656], [625, 535]] }],
  },
  {
    name: 'Ink Master',
    hint: 'Three towers, little ink. Make every stroke count.',
    ink: 820,
    spawn: { x: 60, y: 620 },
    flag: { x: 1010, y: 280 },
    stars: [
      { x: 560, y: 460 },
      { x: 780, y: 340 },
      { x: 900, y: 196 },
    ],
    blocks: [
      { x: 0, y: 660, w: 400, h: 60 },
      { x: 500, y: 520, w: 160, h: 200 },
      { x: 720, y: 400, w: 160, h: 320 },
      { x: 940, y: 280, w: 180, h: 440 },
    ],
    spikes: [],
    springs: [],
    movers: [],
    portals: [],
    solution: [
      { points: [[380, 652], [485, 540]] },
      { points: [[600, 512], [705, 420]] },
      { points: [[820, 392], [925, 300]] },
    ],
  },
];
