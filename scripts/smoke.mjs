// Smoke test: load every screen at 390x844, fail on console errors or horizontal overflow.
// Usage: node scripts/smoke.mjs <baseUrl> [screenshotDir]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const base = process.argv[2] ?? 'http://localhost:4173/Gacha/';
const shots = process.argv[3];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const routes = (process.env.ROUTES ?? 'home,gates,summon,roster,hunter/ssr-isolde,team,quests,settings').split(',');
let fail = false;
for (const r of routes) {
  await page.goto(base + '#/' + r);
  await page.waitForTimeout(500);
  const w = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('main')].map((m) => m.scrollWidth)));
  if (w > 390) { console.log(`OVERFLOW ${r}: ${w}px`); fail = true; }
  if (shots) await page.screenshot({ path: `${shots}/${r.replace(/\//g, '_')}.png` });
}
if (process.env.PULL) {
  await page.goto(base + '#/summon');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Summon ×10/ }).click();
  await page.waitForTimeout(1200);
  if (shots) await page.screenshot({ path: `${shots}/pull.png` });
}
if (errors.length) { console.log('CONSOLE ERRORS:\n' + errors.join('\n')); fail = true; }
await browser.close();
console.log(fail ? 'SMOKE FAIL' : 'SMOKE OK');
process.exit(fail ? 1 : 0);
