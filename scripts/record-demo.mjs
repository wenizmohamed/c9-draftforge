import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { createServer } from './dev-server.mjs';

function resolveChromiumExe() {
  const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  if (!fsSync.existsSync(base)) return undefined;
  const dirs = fsSync.readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) {
    const exe = path.join(base, d, 'chrome-win64', 'chrome.exe');
    if (fsSync.existsSync(exe)) return exe;
  }
  return undefined;
}

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const VIDEO_DIR = path.join(ROOT, 'video_work');
const OUT_MP4 = path.join(VIDEO_DIR, 'c9_draftforge_live_demo.mp4');

async function installCursorOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('c9-demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #c9-demo-cursor {
        position: fixed;
        top: 0; left: 0;
        width: 24px; height: 24px;
        border-radius: 50%;
        background: rgba(181, 129, 43, 0.28);
        border: 2.5px solid #b5812b;
        box-shadow: 0 0 0 4px rgba(17, 33, 27, 0.18);
        pointer-events: none;
        z-index: 999999;
        transform: translate(-50%, -50%);
        transition: width 0.14s ease, height 0.14s ease, background 0.14s ease;
      }
      #c9-demo-cursor.clicking {
        width: 34px; height: 34px;
        background: rgba(28, 131, 87, 0.42);
        border-color: #1c8357;
      }
    `;
    document.head.appendChild(style);
    const dot = document.createElement('div');
    dot.id = 'c9-demo-cursor';
    dot.style.left = '960px';
    dot.style.top = '540px';
    document.body.appendChild(dot);
    window.__moveDemoCursor = (x, y) => {
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
    };
    window.__clickDemoCursor = () => {
      dot.classList.add('clicking');
      setTimeout(() => dot.classList.remove('clicking'), 240);
    };
  });
}

let curX = 960;
let curY = 540;

async function smoothMove(page, targetX, targetY, steps = 24, delayMs = 16) {
  const startX = curX;
  const startY = curY;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const nx = startX + (targetX - startX) * ease;
    const ny = startY + (targetY - startY) * ease;
    await page.mouse.move(nx, ny);
    await page.evaluate(([x, y]) => window.__moveDemoCursor?.(x, y), [nx, ny]);
    await page.waitForTimeout(delayMs);
  }
  curX = targetX;
  curY = targetY;
}

async function smoothClickSelector(page, selector, pauseAfter = 900) {
  const loc = page.locator(selector).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(260);
  const box = await loc.boundingBox();
  if (!box) return;
  const tx = box.x + box.width / 2;
  const ty = box.y + box.height / 2;
  await smoothMove(page, tx, ty);
  await page.evaluate(() => window.__clickDemoCursor?.());
  await loc.click();
  await page.waitForTimeout(pauseAfter);
}

async function smoothScrollTo(page, yTarget, durationMs = 1200) {
  await page.evaluate(
    async ({ y, dur }) => {
      const start = window.scrollY;
      const startTime = performance.now();
      await new Promise((resolve) => {
        function frame(now) {
          const t = Math.min(1, (now - startTime) / dur);
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          window.scrollTo(0, start + (y - start) * ease);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    },
    { y: yTarget, dur: durationMs }
  );
}

async function main() {
  await fs.mkdir(VIDEO_DIR, { recursive: true });
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const BASE_URL = `http://127.0.0.1:${port}`;

  const executablePath = resolveChromiumExe();
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  let webmPath = null;

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } },
      acceptDownloads: true
    });
    const page = await context.newPage();

    // 1. Landing Hero Masthead (0-8s)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await installCursorOverlay(page);
    await page.waitForTimeout(2600);
    await smoothMove(page, 1380, 260, 28, 22);
    await page.waitForTimeout(1800);

    // 2. Scroll to Fearless Draft Desk & interactive Game 1 draft (8-25s)
    await smoothScrollTo(page, 460, 1400);
    await page.waitForTimeout(1600);

    await smoothClickSelector(page, '.role-tab[data-role="MID"]', 1100);
    await smoothClickSelector(page, '.role-tab[data-role="ALL"]', 900);
    await smoothClickSelector(page, '#rec-list .rec-item', 1200);
    await smoothClickSelector(page, '#rec-list .rec-item', 1200);
    await smoothClickSelector(page, '#btn-autofill', 2400);

    // 3. Advance to Game 2 -> Showcase 10 LOCKED G1 Fearless Stamps + Junie Pool-Squeeze (25-44s)
    await smoothClickSelector(page, '#btn-next-game', 2800);
    // Sweep across the red LOCKED G1 stamps on the portrait grid
    await smoothMove(page, 780, 740, 26, 22);
    await page.waitForTimeout(1200);
    await smoothMove(page, 1080, 740, 24, 22);
    await page.waitForTimeout(1200);

    // Scroll slightly down to showcase Real-Time Counter-Pick Coach & Junie Pool-Squeeze Target Bans
    await smoothScrollTo(page, 1040, 1300);
    await page.waitForTimeout(1800);
    await smoothClickSelector(page, '#squeeze-list .rec-item', 1300);
    await smoothClickSelector(page, '#squeeze-list .rec-item', 1300);
    await smoothClickSelector(page, '#rec-list .rec-item', 1300);
    await smoothClickSelector(page, '#rec-list .rec-item', 1500);

    // 4. GRID LoL Macro Scouting & Calibrated Summoner's Rift Map (44-62s)
    const macroY = await page.locator('#macro-scouting').evaluate((n) => n.getBoundingClientRect().top + window.scrollY - 80);
    await smoothScrollTo(page, macroY, 1500);
    await page.waitForTimeout(2400);

    // Hover over calibrated Summoner's Rift pins
    const pins = page.locator('.rift-pin');
    const pinCount = Math.min(3, await pins.count());
    for (let i = 0; i < pinCount; i++) {
      const box = await pins.nth(i).boundingBox();
      if (box) {
        await smoothMove(page, box.x + box.width / 2, box.y + box.height / 2, 20, 20);
        await page.waitForTimeout(900);
      }
    }

    // Switch Scouting Preset to C9 vs FlyQuest then C9 vs G2 Esports
    await smoothScrollTo(page, 0, 1100);
    await page.waitForTimeout(700);
    await page.selectOption('#preset-select', 'c9-fly-fearless');
    await page.waitForTimeout(1700);
    await page.selectOption('#preset-select', 'c9-g2-msi-scrim');
    await page.waitForTimeout(1700);
    await smoothScrollTo(page, macroY, 1200);
    await page.waitForTimeout(2200);

    // 5. Opponent Pool Fatigue Cards + 1-Click Coach Dossier Export (62-72s)
    const fatigueY = await page.locator('#pool-fatigue').evaluate((n) => n.getBoundingClientRect().top + window.scrollY - 120);
    await smoothScrollTo(page, fatigueY, 1200);
    await page.waitForTimeout(2600);

    const downloadPromise = page.waitForEvent('download').catch(() => null);
    await smoothClickSelector(page, '#btn-export-md', 2200);
    await downloadPromise;

    // 6. Navigate to /workflow.html (JetBrains WebStorm + Junie CLI Proof) (72-84s)
    await page.goto(`${BASE_URL}/workflow.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await installCursorOverlay(page);
    await page.waitForTimeout(2800);
    await smoothScrollTo(page, 620, 1800);
    await page.waitForTimeout(3200);
    await smoothScrollTo(page, 1260, 1800);
    await page.waitForTimeout(2600);

    webmPath = await page.video().path();
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  if (!webmPath) throw new Error('Playwright did not produce a recorded video.');

  // Convert .webm -> crisp 1080p H.264 MP4 via ffmpeg
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', webmPath,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUT_MP4
  ]);

  // Remove intermediate webm so video_work stays tidy
  await fs.unlink(webmPath).catch(() => {});

  const stat = await fs.stat(OUT_MP4);
  console.log(`Recorded 1080p interactive walkthrough: ${OUT_MP4} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
