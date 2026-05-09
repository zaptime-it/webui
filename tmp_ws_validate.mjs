import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const shotFull = `/Users/padjuri/src/btclock_v4/photos/rev_b_webui_preview_full_${ts}.png`;
const shotPanel = `/Users/padjuri/src/btclock_v4/photos/rev_b_webui_preview_panel_${ts}.png`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
const page = await context.newPage();

const wsEvidence = {
  opened: 0,
  url: '',
  textSent: 0,
  textReceived: 0,
  binaryReceived: 0,
  lastText: '',
  firstBinaryLen: 0
};

page.on('websocket', (ws) => {
  if (!ws.url().includes('/api/preview/ws')) return;
  wsEvidence.opened += 1;
  wsEvidence.url = ws.url();
  ws.on('framesent', (ev) => {
    if (typeof ev.payload === 'string') wsEvidence.textSent += 1;
  });
  ws.on('framereceived', (ev) => {
    if (typeof ev.payload === 'string') {
      wsEvidence.textReceived += 1;
      wsEvidence.lastText = ev.payload;
    } else {
      wsEvidence.binaryReceived += 1;
      if (!wsEvidence.firstBinaryLen) wsEvidence.firstBinaryLen = ev.payload.length;
    }
  });
});

await page.goto('http://192.168.20.97/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);

const previewSection = page.locator('section.preview');
await previewSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

await previewSection.locator('button').nth(0).click(); // Connect
await page.waitForTimeout(500);
await previewSection.locator('button').nth(2).click(); // Start
await page.waitForTimeout(700);

const firstScreenButton = page.locator('[data-testid="screen-buttons"] button').first();
await firstScreenButton.click();
await page.waitForTimeout(300);

try {
  execSync('curl -s -X POST http://192.168.20.97/api/full_refresh >/dev/null');
} catch {
  // best effort
}

const statsLocator = page.locator('section.preview .text-xs.text-base-content\\/70').nth(1);
let canvasCount = 0;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(400);
  canvasCount = await page.locator('section.preview canvas').count();
  const statsText = await statsLocator.innerText().catch(() => '');
  if (wsEvidence.binaryReceived > 0 && canvasCount > 0 && /Last frame:\s*[1-9]/i.test(statsText)) {
    break;
  }
}

await page.screenshot({ path: shotFull, fullPage: true });
const firstPanel = page.locator('section.preview canvas').first();
if ((await firstPanel.count()) > 0) await firstPanel.screenshot({ path: shotPanel });

const statsText = await statsLocator.innerText().catch(() => '');
const badge = await page.locator('section.preview .badge').innerText().catch(() => '');
const gridCards = await page.locator('section.preview .grid > div').count();

console.log('CLICKED: preview Connect button');
console.log('CLICKED: preview Start button');
console.log('CLICKED: first screen button under [data-testid="screen-buttons"]');
console.log('WEBSOCKET_EVIDENCE:', JSON.stringify(wsEvidence));
console.log('UI_EVIDENCE: badge=', badge);
console.log('UI_EVIDENCE: stats=', statsText);
console.log('UI_EVIDENCE: renderedPanelCards=', gridCards, 'canvasCount=', canvasCount);
console.log('SCREENSHOT_FULL:', shotFull);
console.log('SCREENSHOT_PANEL:', shotPanel);

await browser.close();

const ok =
  wsEvidence.opened > 0 &&
  wsEvidence.binaryReceived > 0 &&
  canvasCount > 0 &&
  /Last frame:\s*[1-9]/i.test(statsText);
if (!ok) process.exit(2);
