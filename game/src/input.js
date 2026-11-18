// Keyboard and pointer input. The canvas reports logical 1280x720 coordinates, so the
// game never depends on the window size. Actions are edge-triggered and consumed once.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_UNDO = 16;
export const ACTION_ERASE_MODE = 32;

export function createInput(canvas) {
  let actions = 0;
  let move = 0;
  let jumpQueued = false;
  let pointerDown = false;
  let pointerErase = false;
  let pointerX = 0;
  let pointerY = 0;
  let pointerMoved = false;
  const keys = new Set();

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function recomputeMove() {
    move = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    canvas.focus?.();
    const p = toLogical(event);
    pointerX = p.x;
    pointerY = p.y;
    pointerDown = true;
    pointerErase = event.button === 2 || event.shiftKey;
    pointerMoved = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    pointerX = p.x;
    pointerY = p.y;
    pointerMoved = true;
  });

  function pointerUp(event) {
    if (event) {
      const p = toLogical(event);
      pointerX = p.x;
      pointerY = p.y;
    }
    pointerDown = false;
    pointerErase = false;
  }
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('pointerleave', pointerUp);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
      return;
    }
    keys.add(event.code);
    recomputeMove();
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') jumpQueued = true;
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyZ' && (event.ctrlKey || event.metaKey)) actions |= ACTION_UNDO;
    if (event.code === 'KeyE') actions |= ACTION_ERASE_MODE;
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    recomputeMove();
  });

  window.addEventListener('blur', () => {
    keys.clear();
    move = 0;
    pointerDown = false;
  });

  return {
    /** -1, 0 or 1 from the held movement keys. */
    direction() {
      return move;
    },
    /** True once per jump key press; consumed by the caller. */
    takeJump() {
      const j = jumpQueued;
      jumpQueued = false;
      return j;
    },
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    pointer() {
      return { down: pointerDown, erase: pointerErase, x: pointerX, y: pointerY, moved: pointerMoved };
    },
    clearPointerMoved() {
      pointerMoved = false;
    },
  };
}
