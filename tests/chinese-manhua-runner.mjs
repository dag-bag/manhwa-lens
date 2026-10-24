import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const fixturePath = path.join(root, 'tests/fixtures/chinese-manhua/manhua_page.png');
const fixtureBytes = await fs.readFile(fixturePath);

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/manhua.png') {
    res.setHeader('Content-Type', 'image/png');
    res.end(fixtureBytes);
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<html><style>body{margin:0;background:#100d17;display:flex;justify-content:center;padding:24px}img{display:block;width:800px;height:auto}</style><img id="manhua" src="/manhua.png"></html>');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1600, height: 1200 },
  args: [
    `--disable-extensions-except=${root}/dist/manhwa-lens`,
    `--load-extension=${root}/dist/manhwa-lens`
  ]
});

try {
  console.log('--- TESTING CHINESE MANHUA MODE (chi_sim model + overlays) ---');
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(sw.url()).host;
  const page = await context.newPage();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);

  await page.goto(url);
  await page.locator('#manhua').evaluate(img => img.decode());

  const tabId = await popup.evaluate(async u => (await chrome.tabs.query({})).find(t => t.url === u).id, url);

  // Set language to chi_sim
  await popup.locator('#language').selectOption('chi_sim');
  await popup.evaluate(m => chrome.runtime.sendMessage(m), { type: 'START', mode: 'image', language: 'chi_sim', tabId });

  await page.bringToFront();
  // Click on manhua image
  await page.mouse.click(600, 300);

  // Wait for processing
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return (r?.querySelectorAll('.card').length || 0) >= 2;
  }, {}, { timeout: 60000 });

  const result = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return {
      status: r.querySelector('.status')?.textContent || '',
      cards: [...r.querySelectorAll('.card')].map((c, i) => ({
        index: i + 1,
        chinese: c.querySelector('textarea')?.value || '',
        english: c.querySelector('.translated')?.textContent || '',
        confidence: c.querySelector('.confidence')?.textContent || ''
      })),
      overlays: [...r.querySelectorAll('.overlay')].map(o => {
        const b = o.getBoundingClientRect();
        return {
          text: o.textContent,
          visible: !o.hidden && b.width > 0 && b.height > 0,
          bounds: { x: b.left, y: b.top, width: b.width, height: b.height }
        };
      })
    };
  });

  const outSnap = path.join(root, 'test-output/chinese-manhua-result.png');
  await page.screenshot({ path: outSnap, fullPage: true });

  console.log('\n=== CHINESE MANHUA TEST RESULTS ===');
  console.log(`Status: "${result.status}"`);
  console.log(`Speech bubbles detected: ${result.cards.length}`);
  console.log(`Visible overlays displayed: ${result.overlays.filter(o => o.visible).length}`);

  result.cards.forEach(c => {
    console.log(`\nCard ${c.index} [${c.confidence}]:`);
    console.log(`  CN: "${c.chinese.replace(/\n+/g, ' ')}"`);
    console.log(`  EN: "${c.english.replace(/\n+/g, ' ')}"`);
  });

  assert(result.cards.length >= 2, `Expected at least 2 Chinese speech bubbles, got ${result.cards.length}`);
  assert(result.overlays.filter(o => o.visible).length >= 2, 'Overlays should be visible');

  console.log('\nPASS: Chinese Manhua Mode verified with local chi_sim OCR and English overlays!');
  console.log(`Saved screenshot to ${outSnap}`);

} finally {
  await context.close();
  server.close();
}
