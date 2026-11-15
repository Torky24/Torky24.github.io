// Generates content/writing/media/palette.svg (the figure used by the colophon post).
// Run: node scripts/make-palette-svg.mjs
import { writeFileSync } from 'node:fs';

const COOL = ['#04050D', '#0A1240', '#1630A8', '#2E5BFF', '#8DB2FF', '#EAF1FF'];
const WARM = ['#04050D', '#2A0F0C', '#8C2A17', '#DB5A26', '#F2AE3A', '#FFF0CF'];
const W = 960, H = 420, pad = 40, sw = (W - pad * 3) / 12;
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Palette ramps and Bayer matrix">`;
s += `<rect width="${W}" height="${H}" fill="#04050D"/>`;
const ramp = (cols, x0, label) => {
  cols.forEach((c, i) => (s += `<rect x="${x0 + i * sw}" y="${pad + 22}" width="${sw - 4}" height="120" fill="${c}" stroke="#2E5BFF" stroke-opacity="0.25"/>`));
  s += `<text x="${x0}" y="${pad + 8}" fill="#FFF0CF" font-family="monospace" font-size="16" letter-spacing="2">${label}</text>`;
};
ramp(COOL, pad, 'COOL · EGYPTIAN BLUE');
ramp(WARM, pad * 2 + sw * 6, 'WARM · OCHRE → LIMESTONE');
// Bayer 8x8
const b2 = (x, y) => ((x / 2 + (y * y * 0.75)) % 1 + 1) % 1;
const bay = (x, y) => {
  const f = (a, b) => b2(Math.floor(a) % 2, Math.floor(b) % 2);
  const b4 = (a, b) => f(a / 2, b / 2) * 0.25 + f(a, b);
  return b4(x / 2, y / 2) * 0.25 + f(x, y);
};
const cs = 18, bx = pad, by = 230;
s += `<text x="${bx}" y="${by - 12}" fill="#FFF0CF" font-family="monospace" font-size="16" letter-spacing="2">BAYER 8×8 THRESHOLDS</text>`;
for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
  const v = bay(x, y);
  const g = Math.round(20 + v * 220);
  s += `<rect x="${bx + x * cs}" y="${by + y * cs}" width="${cs - 2}" height="${cs - 2}" fill="rgb(${g},${Math.round(g * 0.75)},${Math.round(g * 0.45)})"/>`;
}
// dithered gradient strip using the warm ramp
const gx = bx + 8 * cs + 40, gw = W - gx - pad, cell = 12;
s += `<text x="${gx}" y="${by - 12}" fill="#FFF0CF" font-family="monospace" font-size="16" letter-spacing="2">A GRADIENT, DITHERED</text>`;
for (let y = 0; y < 144 / cell; y++) for (let x = 0; x < gw / cell; x++) {
  const L = x / (gw / cell);
  const v = L * 5, i0 = Math.floor(v), f = v - i0;
  const idx = Math.min(5, i0 + (bay(x, y) < f ? 1 : 0));
  s += `<rect x="${gx + x * cell}" y="${by + y * cell}" width="${cell}" height="${cell}" fill="${(y < 72 / cell ? COOL : WARM)[idx]}"/>`;
}
s += `</svg>`;
writeFileSync(new URL('../content/writing/media/palette.svg', import.meta.url), s);
console.log('palette.svg', s.length, 'bytes');
