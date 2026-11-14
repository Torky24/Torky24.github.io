// End-to-end checks for the site (Playwright).
//   npm run build && npx vite preview --base ./      (or any static server)
//   node tests/e2e.mjs http://localhost:4173/  [path/to/dist-single/index.html]
// Needs:  npm i -D playwright && npx playwright install chromium
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const req = createRequire(import.meta.url);
let pw;
try { pw = await import('playwright'); } catch { pw = req('playwright'); }
const { chromium } = pw;

const BASE = process.argv[2] || 'http://localhost:4173/';
const SINGLE = process.argv[3] || '';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args: GL, timeout: 30000 });

async function open(url, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [], bad = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && bad.push(r.status() + ' ' + r.url()));
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__site, null, { timeout: 20000 });
  await page.evaluate(() => window.__site.ready());
  await page.waitForTimeout(500);
  return { ctx, page, errors, bad };
}
const contrast = (a, b) => {
  const lum = (c) => { const [r, g, bb] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ── desktop journey ── */
{
  const { ctx, page, errors, bad } = await open(BASE + '?fixed');
  const st = await page.evaluate(() => window.__site.state());
  check('desktop: loads with the animated world', !st.still && !st.worldFailed, JSON.stringify(st.tier));
  check('desktop: no failed requests (sub-path safe)', bad.length === 0, bad.join(', '));

  // scroll-driven transitions: wheel through the journey, the camera parameter must advance
  const us = [];
  const hashes = [];
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(700);
    us.push(await page.evaluate(() => window.__site.world.info().u));
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
    hashes.push(req('node:crypto').createHash('sha1').update(shot).digest('hex'));
  }
  check('scroll moves the camera through the world', us.every((u, i) => i === 0 || u > us[i - 1]), us.map((u) => u.toFixed(2)).join(' → '));
  check('scroll changes the rendered scene', new Set(hashes).size >= 5, `${new Set(hashes).size} distinct frames of ${hashes.length}`);

  // direct navigation
  for (const id of ['research', 'writing', 'about', 'home']) {
    await page.click(`.mainnav a[data-nav="${id}"]`);
    await page.waitForTimeout(900);
    const r = await page.evaluate((id) => {
      const el = document.getElementById(id);
      return {
        cur: document.querySelector('.mainnav a[aria-current="true"]')?.dataset.nav,
        top: Math.round(el.getBoundingClientRect().top),
        focus: document.activeElement?.id,
      };
    }, id);
    check(`nav → ${id}: jumps, highlights, focuses heading`, r.cur === id && Math.abs(r.top) < 140 && r.focus === (id === 'home' ? 'home-title' : id + '-title'), JSON.stringify(r));
  }
  // next action
  await page.click('.next-action');
  await page.waitForTimeout(900);
  check('next-action button goes to the next chapter', (await page.evaluate(() => window.__site.state().current)) === 'about');

  // overflow
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('desktop: no horizontal overflow', ov <= 0, `overflow ${ov}px`);

  // contrast of text over the world
  const c1 = await page.evaluate(() => { const t = document.querySelector('.hero-tagline'); return [getComputedStyle(t).color, 'rgb(4,5,13)']; });
  check('hero text contrast ≥ 7:1 on its panel', contrast(...c1) >= 7, contrast(...c1).toFixed(1) + ':1');

  // shared faces at every camera preset
  const pairs = await page.evaluate(() => {
    const { THREE, scene, camera } = window.__site.world.three;
    const shown = (o) => !o || (o.visible && shown(o.parent));
    const out = new Set();
    for (let k = 0; k <= 10; k++) {
      window.__site.world.renderAt(k, 3);
      const meshes = [];
      scene.traverse((o) => o.isMesh && !o.isInstancedMesh && shown(o) && o.name !== 'sky' && meshes.push(o));
      const ray = new THREE.Raycaster(), n = 48;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        ray.setFromCamera(new THREE.Vector2((2 * i + 1) / n - 1, (2 * j + 1) / n - 1), camera);
        const [a, b] = ray.intersectObjects(meshes, false);
        if (b && a.object.material !== b.object.material && b.distance - a.distance < 1e-6 * a.distance) out.add([a.object.name, b.object.name].sort().join(' = '));
      }
    }
    return [...out];
  });
  check('3D: no coplanar faces between different materials', pairs.length === 0, pairs.join('; '));

  // keyboard
  await page.goto(BASE + '?fixed', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => ({ cls: document.activeElement.className, text: document.activeElement.textContent.trim() }));
  check('keyboard: first Tab reaches the skip link', first.cls === 'skip', first.text);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  check('keyboard: skip link lands on the biography', (await page.evaluate(() => document.activeElement.id)) === 'about-title');
  await page.keyboard.press('Tab');
  const nextFocus = await page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, inAbout: !!a.closest('#about'), outline: getComputedStyle(a).outlineStyle }; });
  check('keyboard: Tab continues inside About with a visible focus ring', nextFocus.inAbout && nextFocus.outline !== 'none', JSON.stringify(nextFocus));

  // article page
  await page.goto(BASE + '?fixed#/writing/building-a-nilometer', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const art = await page.evaluate(() => {
    const p = document.querySelector('.prose p');
    const cs = getComputedStyle(p);
    const ch = parseFloat(cs.fontSize) * 0.5;
    return {
      reading: document.body.classList.contains('reading'),
      worldHidden: getComputedStyle(document.getElementById('world')).display === 'none',
      fontPx: parseFloat(cs.fontSize),
      lineH: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
      measure: Math.round(p.getBoundingClientRect().width / ch),
      color: cs.color, bg: getComputedStyle(document.body).backgroundColor,
      code: document.querySelectorAll('.code-block .hljs-keyword, .code-block .hljs-title, .code-block .hljs-built_in').length,
      fig: (() => { const i = document.querySelector('.prose figure img'); return i ? i.naturalWidth : -1; })(),
      cap: !!document.querySelector('.prose figcaption'),
      table: !!document.querySelector('.prose table'),
      title: document.activeElement?.id,
    };
  });
  check('article: calm reading mode (world hidden)', art.reading && art.worldHidden);
  check('article: body type ≥ 18px, line-height ≥ 1.5, ≤ 80 characters per line', art.fontPx >= 18 && art.lineH >= 1.5 && art.measure <= 80, `${art.fontPx}px / ${art.lineH.toFixed(2)} / ~${art.measure}ch`);
  check('article: text contrast ≥ 7:1 (AAA)', contrast(art.color, art.bg) >= 7, contrast(art.color, art.bg).toFixed(1) + ':1');
  check('article: highlighted code, figure with caption, table', art.code >= 3 && art.fig > 0 && art.cap && art.table, JSON.stringify({ code: art.code, fig: art.fig }));
  check('article: focus moves to the title', art.title === 'doc-title');
  await page.click('.doc-back a');
  await page.waitForTimeout(900);
  check('article → "All writing" returns to the Writing chapter', (await page.evaluate(() => window.__site.state())).current === 'writing');
  const marker = /\b(prototype|sample|provisional|placeholder|draft|reserved|lorem)\b|\[[^\]]+\]|—/i;
  const leaks = [];
  for (const route of ['', '#/writing/building-a-nilometer', '#/research/agent-platform', '#/research/agentic-search', '#/research/rasterix', '#/research/webis-imagearg-2023', '#/research/blast-performance-2019']) {
    await page.goto(BASE + '?fixed' + route, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const hit = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const text = [...document.querySelectorAll('main:not([hidden])')].map((m) => { const c = m.cloneNode(true); c.querySelectorAll('pre, code').forEach((x) => x.remove()); return c.textContent; }).join('\n') + '\n' + document.title;
      return text.match(re)?.[0] || (document.querySelector('mark.ph, .draft-note, .doc-notice') ? 'marker element' : '');
    }, marker.source);
    if (hit) leaks.push(`${route || '#/'}: ${hit}`);
  }
  check('no demo, draft or placeholder markers or em dashes on any page', !leaks.length, leaks.join('; ') || 'clean');
  await page.goto(BASE + '?fixed#/nope/nothing', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  check('unknown route shows a 404 page', await page.evaluate(() => /Nothing measured/.test(document.body.textContent)));

  // motion toggle persists
  await page.goto(BASE + '?fixed', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.click('.motion-toggle');
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  check('motion switch turns the journey off and is remembered', await page.evaluate(() => window.__site.state().still && document.querySelectorAll('.plate.ready').length >= 4));
  check('desktop: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ── reduced motion ── */
{
  const { ctx, page, errors } = await open(BASE, { reducedMotion: 'reduce' });
  const r = await page.evaluate(() => ({
    still: window.__site.state().still,
    canvas: getComputedStyle(document.getElementById('world')).display,
    plates: document.querySelectorAll('.plate.ready').length,
    interludes: [...document.querySelectorAll('.interlude')].every((i) => getComputedStyle(i).display === 'none'),
    world: !!window.__site.world,
  }));
  check('reduced motion: still plates instead of the animated world', r.still && r.canvas === 'none' && r.plates === 5 && r.interludes && !r.world, JSON.stringify(r));
  await page.click('.mainnav a[data-nav="writing"]');
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => Math.round(document.getElementById('writing').getBoundingClientRect().top));
  check('reduced motion: navigation jumps instantly', Math.abs(t) < 120, `top ${t}`);
  check('reduced motion: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ── phone ── */
{
  const { ctx, page, errors } = await open(BASE + '?fixed', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const bar = await page.evaluate(() => { const r = document.querySelector('.mainnav').getBoundingClientRect(); return { bottom: Math.round(r.bottom), h: innerHeight, items: document.querySelectorAll('.mainnav a').length, minTap: Math.min(...[...document.querySelectorAll('.mainnav a')].map((a) => a.getBoundingClientRect().height)) }; });
  check('phone: thumb-reach tab bar at the bottom with ≥44px targets', bar.bottom === bar.h && bar.items === 5 && bar.minTap >= 44, JSON.stringify(bar));
  check('phone: lighter world tier', (await page.evaluate(() => window.__site.world.info().tier)) === 'low');
  const cdp = await ctx.newCDPSession(page);
  const y0 = await page.evaluate(() => scrollY);
  // a real finger swipe: touchStart → moves → touchEnd
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 700 }] });
  for (let k = 1; k <= 12; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 700 - k * 45 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(900);
  const y1 = await page.evaluate(() => scrollY);
  check('phone: touch swipe scrolls the journey', y1 > y0 + 300, `${y0} → ${y1}`);
  const box = await page.locator('.mainnav a[data-nav="research"]').boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(900);
  const rs = await page.evaluate(() => ({ cur: window.__site.state().current, top: Math.round(document.getElementById('research').getBoundingClientRect().top) }));
  check('phone: tapping a tab jumps to the chapter', rs.cur === 'research' && Math.abs(rs.top) < 140, JSON.stringify(rs));
  let worst = 0;
  for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), f);
    await page.waitForTimeout(150);
    worst = Math.max(worst, await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  }
  check('phone: no horizontal overflow anywhere', worst <= 0, `max overflow ${worst}px`);
  await page.goto(BASE + '?fixed#/writing/building-a-nilometer', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const pa = await page.evaluate(() => ({ fs: parseFloat(getComputedStyle(document.querySelector('.prose p')).fontSize), ov: document.documentElement.scrollWidth - innerWidth, codeScroll: getComputedStyle(document.querySelector('.code-block pre')).overflowX }));
  check('phone: article readable (≥17px, no overflow, code scrolls in its box)', pa.fs >= 17 && pa.ov <= 0 && pa.codeScroll === 'auto', JSON.stringify(pa));
  check('phone: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ── embedded preview frame (page sized to its full height) ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 9000 }, screen: { width: 1000, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const p = await page.evaluate(() => ({ poster: window.__site.state().poster, h: document.documentElement.scrollHeight }));
  check('preview frames get a static poster layout', p.poster, JSON.stringify(p));
  await ctx.close();
}

/* ── single self-contained file opened from disk ── */
if (SINGLE) {
  const { ctx, page, errors } = await open(pathToFileURL(SINGLE).href + '?fixed');
  const s = await page.evaluate(() => window.__site.state());
  check('single file (file://): world runs offline', !s.still && !s.worldFailed);
  await page.evaluate(() => (location.hash = '#/writing/building-a-nilometer'));
  await page.waitForTimeout(500);
  check('single file: article route + embedded figure', await page.evaluate(() => document.body.classList.contains('reading') && document.querySelector('.prose figure img').naturalWidth > 0));
  check('single file: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
