import './fonts';
import './styles/base.css';
import './styles/journey.css';
import './styles/reading.css';
import { site, mediaUrl, plateUrl } from './content';
import { shellHTML, journeyHTML, NAV } from './ui/journey';
import { docHTML, notFoundHTML } from './ui/reader';
import { ditherInto, monogramSVG } from './ui/avatar';
import { parse, onRoute, type Route, type Section } from './router';
import { scrollToU, SHOTS } from './world/timeline';
import type { World } from './world/world';
import { $, $$ } from './util';

/* ── boot ───────────────────────────────────────────────────────── */
const q = new URLSearchParams(location.search);
document.documentElement.lang = site.meta.lang;
document.title = site.meta.title;
document.querySelector('meta[name="description"]')?.setAttribute('content', site.meta.description);
const app = document.getElementById('app')!;
app.innerHTML = shellHTML();
const journey = $('#journey')!, reader = $('#reader')!;
journey.innerHTML = journeyHTML();
const canvas = $<HTMLCanvasElement>('#world')!;
const toggle = $<HTMLButtonElement>('.motion-toggle')!;
const nextBtn = $<HTMLAnchorElement>('.next-action')!;
const announce = $('#announce')!;

// avatar: dithered photo, plain photo, or the designed placeholder
for (const holder of $$('.avatar')) {
  const file = holder.dataset.avatar || '';
  const url = mediaUrl(file);
  const initials = site.person.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w) && w.length > 2).map((w) => w[0]).join('').slice(0, 2);
  if (!url) holder.innerHTML = monogramSVG(initials || 'IT');
  else if (holder.dataset.style === 'dither') ditherInto(holder, url, site.person.avatar.alt, 96);
  else holder.innerHTML = `<img class="avatar-photo" src="${url}" alt="${site.person.avatar.alt}">`;
}

/* ── mode: motion journey vs. still plates ──────────────────────── */
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get: () => { try { return localStorage.getItem('it-motion'); } catch { return null; } },
  set: (v: string) => { try { localStorage.setItem('it-motion', v); } catch { /* private mode */ } },
};
let motion = q.has('still') ? false : store.get() ? store.get() === 'on' : !reduceMQ.matches;
let poster = false;
let world: World | null = null;
let worldFailed = false;
let worldLoading: Promise<void> | null = null;
let reading = false;
let keys: number[] = [];
let starts: { id: string; y: number }[] = [];
let current = 'home';
let journeyScroll = 0;

const isStill = () => !motion || poster || worldFailed;
// Embedded preview frames size the page to its full height: there is no viewport to scroll through.
const framed = () => innerHeight > Math.max(screen.height * 1.3, 1800);
const tier = (): 'high' | 'low' =>
  (q.get('tier') as 'high' | 'low') ||
  (Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4 || matchMedia('(pointer: coarse)').matches ? 'low' : 'high');

function ensureWorld(): Promise<void> {
  if (world || worldFailed) return Promise.resolve();
  if (!worldLoading)
    worldLoading = import('./world/world')
      .then(({ createWorld }) => {
        world = createWorld(canvas, tier(), !q.has('fixed'));
        if (!world) {
          worldFailed = true;
          applyMode();
          return;
        }
        (window as any).THREE = world.three.THREE;
        measure();
        onScroll();
        world.snap();
        if (!isStill() && !reading) world.start();
      })
      .catch((e) => {
        console.warn('[site] world failed to load', e);
        worldFailed = true;
        applyMode();
      });
  return worldLoading;
}

let platesLoaded = false;
function loadPlates() {
  if (platesLoaded) return;
  platesLoaded = true;
  for (const img of $$<HTMLImageElement>('.plate img')) {
    const url = plateUrl(img.dataset.src || '');
    if (!url) continue;
    img.onload = () => img.parentElement?.classList.add('ready');
    img.src = url;
  }
}

function applyMode() {
  const still = isStill();
  document.body.classList.toggle('still', still);
  document.body.classList.toggle('poster', poster);
  toggle.setAttribute('aria-pressed', String(!still));
  toggle.querySelector('.mt-v')!.textContent = still ? 'off' : 'on';
  toggle.hidden = poster || worldFailed;
  if (still) {
    world?.stop();
    loadPlates();
  } else {
    void ensureWorld();
    if (!reading) world?.start();
  }
  requestAnimationFrame(() => {
    measure();
    onScroll();
    world?.snap();
  });
}

toggle.addEventListener('click', () => {
  motion = isStill();
  store.set(motion ? 'on' : 'off');
  applyMode();
  announce.textContent = motion ? 'Animated journey on' : 'Animated journey off, showing still plates';
});
reduceMQ.addEventListener?.('change', () => {
  if (!store.get()) {
    motion = !reduceMQ.matches;
    applyMode();
  }
});

/* ── measuring the journey ──────────────────────────────────────── */
const absTop = (id: string) => {
  const el = document.getElementById(id);
  if (!el || el.hidden) return null;
  return el.getBoundingClientRect().top + scrollY;
};
const hgt = (id: string) => document.getElementById(id)?.offsetHeight ?? 0;

function measure() {
  if (reading) return;
  const V = innerHeight;
  const docH = document.documentElement.scrollHeight;
  // chapter starts: an interlude belongs to the chapter it leads into
  starts = ['home', 'about', 'research', 'writing', 'contact']
    .map((id) => {
      const il = !isStill() ? absTop('i-' + id) : null;
      const t = il ?? absTop(id);
      return t === null ? null : { id, y: id === 'home' ? 0 : t };
    })
    .filter(Boolean) as { id: string; y: number }[];

  if (!isStill()) {
    const T = (id: string, fallback: number) => absTop(id) ?? fallback;
    const iA = T('i-about', V), A = T('about', iA), iR = T('i-research', A + hgt('about')), R = T('research', iR);
    const iW = T('i-writing', R + hgt('research')), Wr = T('writing', iW);
    const k = [
      0,
      iA + hgt('i-about') * 0.45 - V * 0.5,
      A - V * 0.25,
      A + hgt('about') - V * 0.8,
      iR + hgt('i-research') * 0.5 - V * 0.5,
      R - V * 0.25,
      R + hgt('research') - V * 0.8,
      iW + hgt('i-writing') * 0.5 - V * 0.5,
      Wr - V * 0.25,
      Wr + hgt('writing') - V * 0.8,
      docH - V,
    ];
    for (let i = 1; i < k.length; i++) k[i] = Math.max(k[i], k[i - 1] + 1);
    keys = k;
  }
  // gauge labels
  const span = Math.max(1, docH - V);
  for (const s of starts) {
    const a = $<HTMLElement>(`.gauge a[data-gauge="${s.id}"]`);
    if (a) a.style.top = `${Math.min(100, (s.y / span) * 100)}%`;
  }
}

/* ── scroll → world + navigation state ──────────────────────────── */
function onScroll() {
  if (reading) return;
  const y = scrollY;
  if (world && keys.length && !isStill()) world.setTarget(scrollToU(y, keys));
  const V = innerHeight;
  let cur = 'home';
  for (const s of starts) if (s.y <= y + V * 0.5) cur = s.id;
  if (y + V >= document.documentElement.scrollHeight - 4) cur = 'contact';
  setCurrent(cur);
  const fill = $<HTMLElement>('.gauge-fill');
  if (fill) fill.style.height = `${Math.min(100, (y / Math.max(1, document.documentElement.scrollHeight - V)) * 100)}%`;
}

function setCurrent(id: string) {
  if (id === current && nextBtn.dataset.for === id) return;
  current = id;
  for (const a of $$('[data-nav]')) a.dataset.nav === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  for (const a of $$('[data-gauge]')) a.classList.toggle('on', a.dataset.gauge === id);
  const order = [...NAV.map((n) => n.id), 'contact'];
  const i = order.indexOf(id);
  const nxt = order[i + 1];
  nextBtn.dataset.for = id;
  if (nxt) {
    const label = nxt === 'contact' ? site.chapters.horizon.label : NAV.find((n) => n.id === nxt)!.label;
    nextBtn.href = `#/${nxt}`;
    nextBtn.querySelector('.na-k')!.textContent = 'Next';
    nextBtn.querySelector('.na-l')!.textContent = label;
    nextBtn.querySelector('.na-a')!.textContent = '↓';
    nextBtn.setAttribute('aria-label', `Next: ${label}`);
  } else {
    nextBtn.href = '#/';
    nextBtn.querySelector('.na-k')!.textContent = 'Back to';
    nextBtn.querySelector('.na-l')!.textContent = 'the top';
    nextBtn.querySelector('.na-a')!.textContent = '↑';
    nextBtn.setAttribute('aria-label', 'Back to the top');
  }
}

let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    onScroll();
  });
}, { passive: true });

let rt = 0;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = window.setTimeout(() => {
    if (!poster && framed()) {
      poster = true;
      applyMode();
      return;
    }
    world?.resize();
    measure();
    onScroll();
  }, 120);
});

addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !world) return;
  world.setPointer((e.clientX / innerWidth - 0.5) * 2, -(e.clientY / innerHeight - 0.5) * 2);
}, { passive: true });

/* ── the pixel wipe used for direct jumps ───────────────────────── */
const wipeCanvas = $<HTMLCanvasElement>('#wipe')!;
function wipe(mid: () => void) {
  if (isStill() || reading) return mid();
  const ctx = wipeCanvas.getContext('2d');
  if (!ctx) return mid();
  const cell = 28;
  const cw = Math.ceil(innerWidth / cell), ch = Math.ceil(innerHeight / cell);
  wipeCanvas.width = cw;
  wipeCanvas.height = ch;
  wipeCanvas.style.display = 'block';
  const b2 = (x: number, y: number) => ((x % 2) * 2 + (y % 2) * 3) % 4;
  const thr = (x: number, y: number) => (b2(x, y) * 4 + b2(x >> 1, y >> 1)) / 16;
  const dur = 240;
  const run = (from: number, to: number, done: () => void) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const p = from + (to - from) * t;
      ctx.clearRect(0, 0, cw, ch);
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          const v = thr(x & 3, y & 3) + ((x * 7 + y * 13) % 5) * 0.012;
          if (v < p) {
            ctx.fillStyle = (x + y) % 9 === 0 ? '#1630a8' : '#04050d';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  };
  run(0, 1.06, () => {
    mid();
    run(1.06, 0, () => (wipeCanvas.style.display = 'none'));
  });
}

function focusHeading(id: string) {
  const h = id === 'home' ? $('#home-title') : $(`#${id}-title`);
  if (h) {
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    (h as HTMLElement).focus({ preventScroll: true });
  }
}

function jumpTo(id: Section, animate = true) {
  measure();
  const el = document.getElementById(id);
  const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 60;
  const y = id === 'home' || !el ? 0 : el.getBoundingClientRect().top + scrollY - (isStill() ? bar : 0);
  const go = () => {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    onScroll();
    world?.snap();
    focusHeading(id);
  };
  animate ? wipe(go) : go();
}

/* ── reader (calm article layout) ───────────────────────────────── */
function openDoc(kind: 'writing' | 'research', slug: string) {
  if (!reading) journeyScroll = scrollY;
  reading = true;
  const d = docHTML(kind, slug);
  // Articles that moved from Research to Writing keep working at their old address.
  if (!d && kind === 'research' && docHTML('writing', slug)) return void location.replace(`#/writing/${slug}`);
  document.body.classList.add('reading');
  journey.hidden = true;
  reader.hidden = false;
  reader.innerHTML = d ? d.html : notFoundHTML(`${kind}/${slug}`);
  world?.stop();
  document.title = `${(d?.title ?? 'Not found').replace(/[[\]]/g, '')} | ${site.person.name}`;
  for (const a of $$('[data-nav]')) a.dataset.nav === kind ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  for (const b of $$<HTMLButtonElement>('.toc button')) {
    b.addEventListener('click', () => {
      const t = document.getElementById(b.dataset.goto!);
      if (!t) return;
      t.scrollIntoView({ behavior: isStill() || reduceMQ.matches ? 'auto' : 'smooth', block: 'start' });
      t.focus({ preventScroll: true });
    });
  }
  $('#doc-title')?.focus({ preventScroll: true });
}

function closeDoc() {
  reading = false;
  document.body.classList.remove('reading');
  reader.hidden = true;
  reader.innerHTML = '';
  journey.hidden = false;
  document.title = site.meta.title;
  current = '';
  if (!isStill()) world?.start();
  measure();
}

function route(r: Route, same: boolean, first = false) {
  if (r.view === 'doc') return openDoc(r.kind, r.slug);
  if (r.view === 'notfound') {
    if (!reading) journeyScroll = scrollY;
    reading = true;
    document.body.classList.add('reading');
    journey.hidden = true;
    reader.hidden = false;
    reader.innerHTML = notFoundHTML(r.path);
    world?.stop();
    window.scrollTo(0, 0);
    return;
  }
  const wasReading = reading;
  if (reading) closeDoc();
  if (r.section) {
    requestAnimationFrame(() => jumpTo(r.section!, !first && !wasReading));
  } else if (wasReading) {
    requestAnimationFrame(() => {
      measure();
      window.scrollTo({ top: journeyScroll, behavior: 'instant' as ScrollBehavior });
      onScroll();
      world?.snap();
    });
  } else if (same || !first) {
    jumpTo('home', !first);
  }
}

onRoute((r, same) => route(r, same));

/* ── world reacts to the writing list ───────────────────────────── */
for (const li of $$('.post')) {
  const on = () => world?.highlight(Number(li.dataset.branch) % Math.max(1, world.majorBranches));
  const off = () => world?.highlight(-1);
  li.addEventListener('mouseenter', on);
  li.addEventListener('focusin', on);
  li.addEventListener('mouseleave', off);
  li.addEventListener('focusout', off);
}

/* ── stepped reveal of panels (motion mode only) ────────────────── */
if ('IntersectionObserver' in window && !isStill()) {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
    { rootMargin: '0px 0px -12% 0px' },
  );
  for (const p of $$('.panel')) {
    p.classList.add('pre');
    io.observe(p);
  }
  // never leave content clipped: reveal everything after a short grace period if the observer is silent
  setTimeout(() => $$('.panel.pre').forEach((p) => p.getBoundingClientRect().top < innerHeight && p.classList.add('in')), 1500);
}

/* ── start ──────────────────────────────────────────────────────── */
poster = framed();
applyMode();
route(parse(location.hash), false, true);
if ('fonts' in document) document.fonts.ready.then(() => { measure(); onScroll(); });
addEventListener('load', () => { measure(); onScroll(); });

// Hooks for tests, captures and plate rendering (harmless in production)
(window as any).__site = {
  get world() { return world; },
  keys: () => keys,
  shots: SHOTS.map((s) => s.name),
  state: () => ({ still: isStill(), poster, reading, current, motion, worldFailed, tier: world?.info() }),
  jump: jumpTo,
  ready: () => (isStill() ? Promise.resolve() : ensureWorld()),
  frameAt(y: number, t = 3) {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    onScroll();
    if (world && keys.length) world.renderAt(scrollToU(y, keys), t);
  },
  plates(w = 640, h = 360) {
    if (!world) return null;
    const at: Record<string, number> = { home: 0, about: 2.45, research: 5.3, writing: 8.75, horizon: 10 };
    return Object.fromEntries(Object.entries(at).map(([k, u]) => [k, world!.still(u, w, h)]));
  },
};
