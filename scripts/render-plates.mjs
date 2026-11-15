// Re-renders the still "plates" used for reduced motion, no-WebGL devices and embedded previews.
// 1) npm run dev        (in another terminal)
// 2) npm run plates     (needs Playwright:  npm i -D playwright && npx playwright install chromium)
// Writes src/assets/plates/{home,about,research,writing,horizon}.png
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const url = process.argv[2] || 'http://localhost:5173/';
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    console.error('Playwright is not installed. Run:  npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }
}
const out = new URL('../src/assets/plates/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url + '?tier=high&fixed', { waitUntil: 'load' });
await page.waitForFunction(() => window.__site, null, { timeout: 20000 });
await page.evaluate(() => window.__site.ready());
const plates = await page.evaluate(() => window.__site.plates(480, 270));
if (!plates) throw new Error('World did not start — is WebGL available?');
for (const [name, dataUrl] of Object.entries(plates)) {
  const file = new URL(`${name}.png`, out);
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', file.pathname);
}
await browser.close();
