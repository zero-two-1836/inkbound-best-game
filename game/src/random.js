// A small seeded random generator (mulberry32): the same seed always deals the same
// world, so a screenshot staged from a seed is the same frame every time.

export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** A random integer in [min, max]. */
export function rangeInt(random, min, max) {
  return Math.floor(range(random, min, max + 1));
}

/** Pick one element of an array. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}
