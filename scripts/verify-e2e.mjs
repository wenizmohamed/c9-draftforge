import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from './dev-server.mjs';

function resolveChromiumExe() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) {
    const exe = path.join(base, d, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const ROOT = path.resolve(import.meta.dirname, '..');

async function assertCleanPage(page, label) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  assert.ok(
    overflow.scrollWidth <= overflow.innerWidth,
    `[${label}] Horizontal overflow detected: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`
  );

  const imgCheck = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    return imgs.map((img) => ({
      src: img.getAttribute('src'),
      complete: img.complete,
      naturalWidth: img.naturalWidth
    }));
  });
  const broken = imgCheck.filter((i) => !i.complete || i.naturalWidth === 0);
  assert.equal(broken.length, 0, `[${label}] Broken images detected: ${JSON.stringify(broken)}`);
  return { imgCount: imgCheck.length, overflow };
}

async function main() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const BASE_URL = `http://127.0.0.1:${port}`;

  const consoleErrors = [];
  const pageErrors = [];

  const executablePath = resolveChromiumExe();
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    // 1. Desktop 1440x900 verification & screenshots
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const homeCheck = await assertCleanPage(page, 'Desktop / initial');
    console.log(`Desktop / initial verified: ${homeCheck.imgCount} Riot/UI images loaded, 0px overflow.`);

    // Capture crisp 1280x720 thumbnail first at top hero + draft preview
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(ROOT, 'assets', 'thumbnail.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);

    // Exercise Fearless Draft G1 -> G2 cross-game lockouts!
    await page.click('#btn-autofill');
    await page.waitForTimeout(200);
    await page.click('#btn-next-game');
    await page.waitForTimeout(250);

    const lockedCount = await page.locator('.champ-tile.locked[disabled]').count();
    assert.equal(lockedCount, 10, `Expected exactly 10 Fearless LOCKED G1 tiles in Game 2, got ${lockedCount}`);
    console.log(`Fearless G1->G2 lockout verified: ${lockedCount} disabled LOCKED G1 tiles.`);

    // Click 5 live picks/bans in Game 2 (via top recommendation button) so Game 2 board looks rich
    for (let i = 0; i < 8; i++) {
      await page.locator('#rec-list .rec-item').first().click();
      await page.waitForTimeout(80);
    }

    // Scroll precisely to Fearless Draft Desk (below sticky topbar) and capture screen_1_fearless_draft.png
    await page.evaluate(() => {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('show');
      const sec = document.getElementById('fearless-desk');
      window.scrollTo(0, sec.getBoundingClientRect().top + window.scrollY - 72);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ROOT, 'assets', 'screen_1_fearless_draft.png') });
    console.log('Captured assets/screen_1_fearless_draft.png');

    // Switch preset to verify dynamic GRID telemetry updates, then back to C9 vs TL for macro screenshot
    await page.selectOption('#preset-select', 'c9-fly-fearless');
    await page.waitForTimeout(200);
    const flyText = await page.locator('#series-matchup-pill').textContent();
    assert.ok(flyText.includes('FlyQuest'), `Expected FlyQuest preset to load, got ${flyText}`);

    await page.selectOption('#preset-select', 'c9-tl-lcs-finals');
    await page.waitForTimeout(200);

    // Scroll precisely to Macro Scouting & Summoner's Rift Command Map and capture screen_2_macro_scouting.png
    await page.evaluate(() => {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('show');
      const sec = document.getElementById('macro-scouting');
      window.scrollTo(0, sec.getBoundingClientRect().top + window.scrollY - 72);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ROOT, 'assets', 'screen_2_macro_scouting.png') });
    console.log('Captured assets/screen_2_macro_scouting.png');

    // 2. Desktop /workflow.html verification & screenshot
    await page.goto(`${BASE_URL}/workflow.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const wfCheck = await assertCleanPage(page, 'Desktop /workflow.html');
    console.log(`Desktop /workflow.html verified: ${wfCheck.imgCount} images loaded, 0px overflow.`);
    await page.screenshot({ path: path.join(ROOT, 'assets', 'screen_3_ai_workflow.png') });
    console.log('Captured assets/screen_3_ai_workflow.png');

    // 3. Mobile 390x844 verification on both / and /workflow.html
    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const mobilePage = await mobileCtx.newPage();
    mobilePage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[mobile] ${msg.text()}`);
    });
    mobilePage.on('pageerror', (err) => pageErrors.push(`[mobile] ${String(err)}`));

    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await assertCleanPage(mobilePage, 'Mobile 390px /');
    console.log('Mobile 390px / verified: 0px horizontal overflow.');

    await mobilePage.goto(`${BASE_URL}/workflow.html`, { waitUntil: 'networkidle' });
    await assertCleanPage(mobilePage, 'Mobile 390px /workflow.html');
    console.log('Mobile 390px /workflow.html verified: 0px horizontal overflow.');

    assert.equal(consoleErrors.length, 0, `Console errors found: ${JSON.stringify(consoleErrors)}`);
    assert.equal(pageErrors.length, 0, `Page errors found: ${JSON.stringify(pageErrors)}`);
    console.log('ALL E2E ASSERTIONS PASSED (0 console errors, 0 page errors, 0px overflow).');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
