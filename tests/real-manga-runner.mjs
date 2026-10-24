import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'tests/fixtures/real-manga');
const testFiles = ['11.jpg', '01.jpg', 'cc-100.jpg'];

console.log('Testing authentic Japanese manga fixtures:');
testFiles.forEach(f => console.log(' - ' + f));

let currentFixture = null;
let currentMime = 'image/jpeg';
const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/manga.jpg') {
    res.setHeader('Content-Type', currentMime);
    res.end(currentFixture);
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<html><style>body{margin:0;background:#100d17;display:flex;justify-content:center;padding:24px}img{display:block;max-width:900px;height:auto}</style><img id="target" src="/manga.jpg"></html>');
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

const report = {
  testedAt: new Date().toISOString(),
  language: 'jpn',
  results: []
};

try {
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(sw.url()).host;
  const page = await context.newPage();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);

  for (let idx = 0; idx < testFiles.length; idx++) {
    const filename = testFiles[idx];
    console.log(`\n[${idx + 1}/${testFiles.length}] Testing ${filename}...`);

    currentFixture = await fs.readFile(path.join(dir, filename));
    await page.goto(url);
    await page.locator('#target').evaluate(img => img.decode());

    const tabId = await popup.evaluate(async u => (await chrome.tabs.query({})).find(t => t.url === u).id, url);

    // Set popup language to Japanese
    await popup.locator('#language').selectOption('jpn');

    // Trigger image mode
    await popup.evaluate(m => chrome.runtime.sendMessage(m), { type: 'START', mode: 'image', language: 'jpn', tabId });
    await page.bringToFront();

    // Click on target manga image
    await page.mouse.click(500, 300);

    const start = Date.now();
    let failure = null;
    try {
      await page.waitForFunction(() => {
        const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
        return /text regions|No readable|No reliable|failed|too much|too large|error/i.test(r?.querySelector('.status')?.textContent || '');
      }, {}, { timeout: 60000 });
    } catch (e) {
      failure = e.message;
    }

    const data = await page.evaluate(() => {
      const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
      if (!r) return { status: 'UI not injected', cards: [], overlays: [] };
      return {
        status: r.querySelector('.status')?.textContent || '',
        cards: [...r.querySelectorAll('.card')].map((c, i) => ({
          index: i + 1,
          japanese: c.querySelector('textarea')?.value || '',
          english: c.querySelector('.translated')?.textContent || '',
          confidence: c.querySelector('.confidence')?.textContent || ''
        })),
        overlays: [...r.querySelectorAll('.overlay')].map(o => {
          const b = o.getBoundingClientRect();
          return {
            text: o.textContent,
            isDark: o.classList.contains('dark'),
            visible: !o.hidden && b.width > 0 && b.height > 0,
            bounds: { left: b.left, top: b.top, width: b.width, height: b.height }
          };
        })
      };
    });

    const snap = `real_manga_result_${idx + 1}.png`;
    await page.screenshot({ path: path.join(root, 'test-output', snap), fullPage: true });

    const row = {
      index: idx + 1,
      filename,
      elapsedMs: Date.now() - start,
      failure,
      ...data,
      bubblesCount: data.cards.length,
      overlaysCount: data.overlays.length,
      visibleOverlays: data.overlays.filter(o => o.visible).length,
      snapshot: snap
    };

    console.log(` -> Status: "${data.status}" (${data.cards.length} regions, ${row.visibleOverlays} visible overlays, ${row.elapsedMs}ms)`);
    data.cards.forEach(c => {
      console.log(`    [${c.confidence}] JP: "${c.japanese.replace(/\n+/g, ' ')}"`);
      console.log(`          EN: "${c.english.replace(/\n+/g, ' ')}"`);
    });

    report.results.push(row);

    // Clear for next
    await popup.evaluate(t => chrome.runtime.sendMessage({ type: 'CLEAR', tabId: t }), tabId);
    await page.waitForTimeout(400);
  }

  await fs.writeFile(path.join(root, 'test-output/real-manga-report.json'), JSON.stringify(report, null, 2));
  console.log('\nSaved full report to test-output/real-manga-report.json');

} finally {
  await context.close();
  server.close();
}
