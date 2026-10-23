import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const fixture = await fs.readFile(path.join(root, 'tests/fixtures/dark-panel.png'));
const server = http.createServer((req, res) => {
  if (req.url === '/panel.png') {
    res.setHeader('Content-Type', 'image/png');
    res.end(fixture);
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<html><style>body{margin:0;background:#050408;color:#eee;font-family:system-ui}img{display:block;width:409px;height:auto;margin:32px}</style><img src="/panel.png"></html>');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${root}/dist/manhwa-lens`, `--load-extension=${root}/dist/manhwa-lens`]
});

try {
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    try { sw = await context.waitForEvent('serviceworker', { timeout: 8000 }); }
    catch { sw = context.serviceWorkers()[0]; }
  }
  const id = new URL(sw.url()).host;
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('img').evaluate(i => i.decode());

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  const tabId = await popup.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url).id, url);

  console.log('Testing dark narration panel (image click mode)...');
  await popup.evaluate(m => chrome.runtime.sendMessage(m), { type: 'START', mode: 'image', language: 'kor', tabId });
  await page.bringToFront();
  await page.mouse.click(150, 100);

  await page.waitForFunction(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return r?.querySelector('.card') || /No reliable|failed|too much/i.test(r?.querySelector('.status')?.textContent || '');
  }, {}, { timeout: 60000 });

  const result = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]').shadowRoot;
    return {
      status: r.querySelector('.status')?.textContent,
      cards: [...r.querySelectorAll('.card')].map(c => ({
        original: c.querySelector('textarea')?.value,
        translated: c.querySelector('.translated')?.textContent,
        error: c.querySelector('.error')?.textContent
      })),
      overlays: [...r.querySelectorAll('.overlay')].map(o => ({
        text: o.querySelector('span')?.textContent,
        isDark: o.classList.contains('dark'),
        visible: !o.hidden,
        rect: { width: o.offsetWidth, height: o.offsetHeight }
      }))
    };
  });

  console.log('Result on dark-panel.png:\n', JSON.stringify(result, null, 2));

  assert.equal(result.cards.length, 1, 'Exactly 1 coherent narration panel');
  assert.match(result.cards[0].original, /맨\s*살갖에\s*스치는\s*차가운\s*바람은/);
  assert.match(result.cards[0].original, /나체로\s*야외에\s*서있다는\s*걸/);
  assert.match(result.cards[0].original, /실감시켰다/);

  assert.match(result.cards[0].translated, /cold\s*wind/i);
  assert.match(result.cards[0].translated, /bare\s*skin/i);
  assert.match(result.cards[0].translated, /naked|outdoors/i);

  assert.equal(result.overlays.length, 1, 'Exactly 1 overlay rendered');
  assert.equal(result.overlays[0].isDark, true, 'Overlay uses dark styling for black panel');
  assert.equal(result.overlays[0].visible, true, 'Overlay is visible');

  await page.mouse.move(850, 650);
  await page.screenshot({ path: path.join(root, 'test-output/dark-panel-result.png') });
  console.log('Saved screenshot to test-output/dark-panel-result.png');
  console.log('PASS dark narration panel recognized, translated, and styled adaptively');
} finally {
  await context.close();
  server.close();
}
