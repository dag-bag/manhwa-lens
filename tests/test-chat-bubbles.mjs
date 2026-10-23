import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve(import.meta.dirname, '..');
const fixture = await fs.readFile(path.join(root, 'tests/fixtures/chat-bubbles.png'));
const server = http.createServer((req, res) => {
  if (req.url === '/panel.png') {
    res.setHeader('Content-Type', 'image/png');
    res.end(fixture);
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<html><style>body{margin:0;background:#100e16;color:#eee;font-family:system-ui}img{display:block;width:532px;height:auto;margin:32px}</style><img src="/panel.png"></html>');
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
  let sw=context.serviceWorkers()[0];
  if(!sw){
    try{sw=await context.waitForEvent('serviceworker',{timeout:8000});}
    catch{sw=context.serviceWorkers()[0];}
  }
  const id=new URL(sw.url()).host;
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('img').evaluate(i => i.decode());

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  const tabId = await popup.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url).id, url);

  console.log('Sending START on chat-bubbles fixture...');
  await popup.evaluate(m => chrome.runtime.sendMessage(m), { type: 'START', mode: 'image', language: 'kor', tabId });
  await page.bringToFront();
  await page.mouse.click(200, 200);

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
      overlaysCount: r.querySelectorAll('.overlay').length
    };
  });

  await page.mouse.move(850, 650);
  await page.screenshot({ path: path.join(root, 'test-output/chat-bubbles-result.png') });
  console.log('Saved screenshot to test-output/chat-bubbles-result.png');
} finally {
  await context.close();
  server.close();
}
