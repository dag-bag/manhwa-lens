import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'tests/fixtures/popular-manhwa');
const files = (await fs.readdir(dir)).filter(f => f.endsWith('.png')).sort();

console.log(`Testing ${files.length} dense panels from Omniscient Reader's Viewpoint:`);

let currentFixture = null;
const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/panel.png') {
    res.setHeader('Content-Type', 'image/png');
    res.end(currentFixture);
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<html><style>body{margin:0;background:#100d17;color:#eee;font-family:system-ui}img{display:block;width:690px;height:auto;margin:24px auto}</style><img id="panel" src="/panel.png"></html>');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1600, height: 1100 },
  args: [`--disable-extensions-except=${root}/dist/manhwa-lens`, `--load-extension=${root}/dist/manhwa-lens`]
});

const report = {
  title: "Omniscient Reader's Viewpoint (전지적 독자 시점) Chapter 1",
  testedAt: new Date().toISOString(),
  totalPanels: files.length,
  results: []
};

try {
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(sw.url()).host;
  const page = await context.newPage();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);

  for (let idx = 0; idx < files.length; idx++) {
    const filename = files[idx];
    console.log(`\n[${idx + 1}/${files.length}] Processing ${filename}...`);
    currentFixture = await fs.readFile(path.join(dir, filename));
    await page.goto(url);
    await page.locator('#panel').evaluate(img => img.decode());

    const tabId = await popup.evaluate(async u => (await chrome.tabs.query({})).find(t => t.url === u).id, url);
    await popup.evaluate(m => chrome.runtime.sendMessage(m), { type: 'START', mode: 'image', language: 'kor', tabId });
    await page.bringToFront();

    // Click on image
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
          korean: c.querySelector('textarea')?.value || '',
          english: c.querySelector('.translated')?.textContent || '',
          error: c.querySelector('.error')?.textContent || '',
          confidence: c.querySelector('.confidence')?.textContent || ''
        })),
        overlays: [...r.querySelectorAll('.overlay')].map(o => {
          const b = o.getBoundingClientRect();
          const s = getComputedStyle(o);
          return {
            text: o.textContent,
            isDark: o.classList.contains('dark'),
            visible: !o.hidden && s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0,
            fontSize: s.fontSize,
            bounds: { left: b.left, top: b.top, width: b.width, height: b.height }
          };
        })
      };
    });

    const snap = `orv_snapshot_${idx + 1}.png`;
    await page.screenshot({ path: path.join(root, 'test-output', snap), fullPage: true });

    const row = {
      index: idx + 1,
      panel: filename,
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
      console.log(`    [${c.confidence}] KO: "${c.korean.slice(0, 50)}..."`);
      console.log(`          EN: "${c.english.slice(0, 60)}..."`);
    });

    report.results.push(row);

    // Clear for next panel
    await popup.evaluate(t => chrome.runtime.sendMessage({ type: 'CLEAR', tabId: t }), tabId);
    await page.waitForTimeout(400);
  }

  const totalDetections = report.results.reduce((acc, r) => acc + r.bubblesCount, 0);
  const totalVisible = report.results.reduce((acc, r) => acc + r.visibleOverlays, 0);
  console.log(`\n======================================================`);
  console.log(`ORV BATCH TEST FINISHED!`);
  console.log(`Total Panels Tested: ${files.length}`);
  console.log(`Total Text Regions Detected: ${totalDetections}`);
  console.log(`Total Visible Overlays Displayed: ${totalVisible}`);
  console.log(`Overlay Visibility Rate: ${totalVisible === totalDetections ? '100%' : (totalVisible / totalDetections * 100).toFixed(1) + '%'}`);
  console.log(`======================================================`);

  await fs.writeFile(path.join(root, 'test-output/orv-batch-report.json'), JSON.stringify(report, null, 2));

} finally {
  await context.close();
  server.close();
}
