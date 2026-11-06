// Verifies the PWA works offline and the save survives closing the app.
// Usage: node scripts/offline-check.mjs <baseUrl>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require('node:child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const base = process.argv[2] ?? 'http://localhost:4173/Gacha/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
let page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base);
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await page.reload(); // now controlled by the SW
await page.waitForFunction(() => !!navigator.serviceWorker.controller);
// make progress: one 10-pull
await page.goto(base + '#/summon');
await page.getByRole('button', { name: /Summon ×10/ }).click();
await page.waitForTimeout(500);
await page.mouse.click(195, 500); // skip animation
await page.waitForTimeout(400);
await page.mouse.click(195, 500); // close results
const crystalsBefore = await page.getByTestId('crystals').textContent();
await page.close(); // "close the app" (flushes the save on pagehide)

await ctx.setOffline(true);
page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
const resp = await page.goto(base + '#/home');
await page.waitForSelector('text=RIFTBORN');
const crystalsAfter = await page.getByTestId('crystals').textContent();
for (const r of ['gates', 'roster', 'summon', 'quests', 'settings']) {
  await page.goto(base + '#/' + r);
  await page.waitForTimeout(200);
}
await page.goto(base + '#/gates');
await page.getByRole('button', { name: /E-1/ }).first().click();
await page.getByRole('button', { name: /Enter Gate/ }).click();
await page.waitForSelector('[aria-label="Turn order"]');
const ok = resp && crystalsBefore === crystalsAfter && errors.length === 0;
console.log({ offlineStatus: resp?.status(), fromSW: resp?.fromServiceWorker(), crystalsBefore, crystalsAfter, errors });
console.log(ok ? 'OFFLINE OK' : 'OFFLINE FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
