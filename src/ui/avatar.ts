import { COOL, WARM, hex3 } from '../world/palette';
import { esc } from '../util';

const bayer = (x: number, y: number) => {
  const b2 = (a: number, b: number) => ((a % 2) / 2 + ((b % 2) * (b % 2) * 0.75)) % 1;
  const b4 = (a: number, b: number) => b2(Math.floor(a / 2), Math.floor(b / 2)) * 0.25 + b2(a, b);
  return b4(Math.floor(x / 2), Math.floor(y / 2)) * 0.25 + b2(x, y);
};

/** Renders a photo through the site palette (ordered dithering) into a canvas. Falls back to the plain photo. */
export function ditherInto(holder: HTMLElement, url: string, alt: string, size = 96) {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      const d = ctx.getImageData(0, 0, size, size);
      const cool = COOL.map(hex3), warm = WARM.map(hex3);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const r = d.data[i] / 255, g = d.data[i + 1] / 255, b = d.data[i + 2] / 255;
          let L = 0.3 * r + 0.55 * g + 0.15 * b;
          L = Math.min(1, Math.max(0, (L - 0.5) * 1.25 + 0.52));
          const t = bayer(x, y);
          const v = L * 5;
          const idx = Math.min(5, Math.floor(v) + (t < v - Math.floor(v) ? 1 : 0));
          const ramp = (r - b) * 3 + (t - 0.5) * 0.4 > 0 ? warm : cool;
          d.data[i] = ramp[idx][0] * 255;
          d.data[i + 1] = ramp[idx][1] * 255;
          d.data[i + 2] = ramp[idx][2] * 255;
        }
      }
      ctx.putImageData(d, 0, 0);
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', alt);
      c.className = 'avatar-px';
      holder.replaceChildren(c);
    } catch {
      holder.innerHTML = `<img class="avatar-photo" src="${esc(url)}" alt="${esc(alt)}">`;
    }
  };
  img.src = url;
}

/** Designed placeholder: a pixel sun rising between two pylons, with initials. */
export function monogramSVG(initials: string) {
  const px: string[] = [];
  const N = 16;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = x - 7.5, dy = y - 8.5;
      const inSun = dx * dx + dy * dy < 30 && y < 11;
      const pylon = y >= 6 && y < 13 && ((x >= 2 && x <= 5 - (y < 8 ? 1 : 0)) || (x <= 13 && x >= 10 + (y < 8 ? 1 : 0)));
      const ground = y >= 13;
      if (pylon) px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#0A1240"/>`);
      else if (inSun) px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${(x + y) % 2 && dx * dx + dy * dy > 18 ? '#DB5A26' : '#F2AE3A'}"/>`);
      else if (ground) px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${y === 13 && (x + y) % 2 ? '#2E5BFF' : '#0A1240'}"/>`);
    }
  return `<svg class="avatar-mono" viewBox="0 0 16 16" role="img" aria-label="Placeholder portrait. Add a photo in content/site.ts" shape-rendering="crispEdges"><rect width="16" height="16" fill="#04050D"/>${px.join('')}<text x="8" y="15.6" text-anchor="middle" font-size="2.6" fill="#FFF0CF" font-family="monospace">${esc(initials)}</text></svg>`;
}
