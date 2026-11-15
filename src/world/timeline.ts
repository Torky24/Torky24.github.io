/**
 * The camera script. Each key is a "shot"; the scroll position between two
 * keys interpolates camera and scene parameters. Key scroll positions are
 * measured from the DOM (see main.ts → measureKeys), so long biographies or
 * many posts simply stretch the matching part of the journey.
 */
export type V3 = [number, number, number];

export interface Shot {
  name: string;
  pos: V3;
  look: V3;
  fov: number;
  sun: number; // 0 = sun assembled, 1 = fractured into data
  hall: number; // 0 = columns scattered in the sky, 1 = assembled
  water: number; // Nilometer water level 0..1
  delta: number; // delta / search-tree growth 0..1
  horizon: number; // 0 = sun behind the temple, 1 = sun at the far horizon
  /** how the segment that STARTS at this key is eased */
  ease: 'inout' | 'linear';
}

export const SHOTS: Shot[] = [
  { name: 'home', pos: [0, 4, 96], look: [0, 25, -100], fov: 36, sun: 0, hall: 0, water: 0, delta: 0, horizon: 0, ease: 'inout' },
  { name: 'gate', pos: [0, 5.5, 9], look: [0, 10, -60], fov: 58, sun: 0.8, hall: 0.3, water: 0, delta: 0, horizon: 0, ease: 'inout' },
  { name: 'hallIn', pos: [1.8, 6, -14], look: [-1.5, 7.5, -70], fov: 60, sun: 1, hall: 0.8, water: 0, delta: 0, horizon: 0, ease: 'linear' },
  { name: 'hallOut', pos: [-0.5, 6.5, -64], look: [0, 1, -100], fov: 60, sun: 1, hall: 1, water: 0, delta: 0, horizon: 0, ease: 'inout' },
  { name: 'rim', pos: [0, 13, -82], look: [0, -26, -96], fov: 62, sun: 1, hall: 1, water: 0.05, delta: 0, horizon: 0, ease: 'inout' },
  { name: 'shaftTop', pos: [2.6, -3, -92.5], look: [0, -30, -96], fov: 66, sun: 1, hall: 1, water: 0.12, delta: 0, horizon: 0, ease: 'linear' },
  { name: 'shaftDeep', pos: [-2.2, -24, -97.5], look: [0.4, -44, -94], fov: 66, sun: 1, hall: 1, water: 1, delta: 0, horizon: 0, ease: 'inout' },
  { name: 'emerge', pos: [0, 4, -96], look: [0, 14, -220], fov: 62, sun: 1, hall: 1, water: 1, delta: 0.05, horizon: 0, ease: 'inout' },
  { name: 'deltaHi', pos: [0, 115, -55], look: [0, 0, -255], fov: 56, sun: 1, hall: 1, water: 1, delta: 0.3, horizon: 0, ease: 'linear' },
  { name: 'deltaLo', pos: [0, 85, -215], look: [0, 0, -400], fov: 56, sun: 1, hall: 1, water: 1, delta: 1, horizon: 0, ease: 'inout' },
  { name: 'horizon', pos: [0, 26, -470], look: [0, 38, -1100], fov: 52, sun: 0, hall: 1, water: 1, delta: 1, horizon: 1, ease: 'inout' },
];

export const SCALARS = ['fov', 'sun', 'hall', 'water', 'delta', 'horizon'] as const;

export const easeInOut = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep

/** scroll → key-space parameter u (integer part = segment, fraction = eased progress) */
export function scrollToU(scroll: number, keys: number[]): number {
  if (scroll <= keys[0]) return 0;
  for (let i = 0; i < keys.length - 1; i++) {
    if (scroll < keys[i + 1]) {
      const t = (scroll - keys[i]) / Math.max(1, keys[i + 1] - keys[i]);
      return i + (SHOTS[i].ease === 'inout' ? easeInOut(t) : t);
    }
  }
  return keys.length - 1;
}
