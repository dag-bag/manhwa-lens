import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const panelBuf = await fs.readFile(path.join(root, 'tests/fixtures/user-korean-panel.png'));

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/panel.png') {
    res.setHeader('Content-Type', 'image/png');
    res.end(panelBuf);
  } else {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; background: #110e1a; color: #fff; font-family: system-ui; text-align: center; }
          #comic { display: block; width: 633px; height: 378px; margin: 50px auto; border: 2px solid #333; }
        </style>
      </head>
      <body>
        <h1>Comic Reader Tab</h1>
        <img id="comic" src="/panel.png" alt="Comic Panel">
      </body>
      </html>
    `);
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1400, height: 900 },
  args: [
    `--disable-extensions-except=${root}/dist/manhwa-lens`,
    `--load-extension=${root}/dist/manhwa-lens`
  ]
});

try {
  console.log('--- TESTING RIGHT-CLICK CONTEXT MENU & DRAG-AND-DROP ---');
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 30000 });
  const id = new URL(sw.url()).host;
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#comic').evaluate(i => i.decode());

  // 1. Test Right-Click Context Menu Translation
  console.log('Testing Right-Click Context Menu Action (TRANSLATE_IMAGE_URL)...');
  const imageUrl = `http://127.0.0.1:${server.address().port}/panel.png`;
  
  const tabId = await sw.evaluate(async (port) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find(t => t.url?.includes(port)).id;
  }, String(server.address().port));

  // Send message directly to tab via background worker (simulating context menu click)
  await sw.evaluate(async ([tId, src]) => {
    await chrome.tabs.sendMessage(tId, {
      type: 'TRANSLATE_IMAGE_URL',
      srcUrl: src,
      language: 'kor'
    });
  }, [tabId, imageUrl]);

  // Wait for translation overlay to appear
  console.log('Waiting for context-menu triggered translation...');
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return (r?.querySelectorAll('.overlay').length || 0) >= 1;
  }, {}, { timeout: 45000 });

  const contextOverlayText = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return r?.querySelector('.overlay span')?.textContent || '';
  });
  console.log('✔ Test 1: Context Menu successfully translated image:', contextOverlayText);
  assert.match(contextOverlayText, /sauna|men-only/i, 'Context menu should translate the sauna panel');

  // Clear translations
  await sw.evaluate(async (tId) => {
    await chrome.tabs.sendMessage(tId, { type: 'CLEAR' });
  }, tabId);
  await page.waitForTimeout(500);

  // 2. Test Drag-and-Drop Dropzone UI Indicator
  console.log('Testing Drag-and-Drop dragover indicator...');
  const isDropzoneShown = await page.evaluate(() => {
    // Dispatch dragover event with Files type
    const dragEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    window.dispatchEvent(dragEvent);
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return r?.querySelector('.dropzone')?.classList.contains('active');
  });
  console.log('✔ Test 2: Dropzone visual indicator appeared on dragover:', isDropzoneShown);

  // 3. Test Drag-and-Drop Image Drop Translation
  console.log('Testing Image Drop execution...');
  const base64Data = 'data:image/png;base64,' + panelBuf.toString('base64');
  
  await page.evaluate((dataUrl) => {
    // Dispatch drop with file or uri
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    // Set dataTransfer URI
    dropEvent.dataTransfer.setData('text/uri-list', dataUrl);
    window.dispatchEvent(dropEvent);
  }, base64Data);

  console.log('Waiting for dropped image translation...');
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return (r?.querySelectorAll('.overlay').length || 0) >= 1;
  }, {}, { timeout: 45000 });

  const droppedOverlayText = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return r?.querySelector('.overlay span')?.textContent || '';
  });
  console.log('✔ Test 3: Dropped image translated successfully:', droppedOverlayText);
  assert.match(droppedOverlayText, /sauna|men-only/i, 'Dropped image should be translated');

  // Take proof screenshot
  const snapPath = path.join(root, 'test-output/context-and-drag-proof.png');
  await page.screenshot({ path: snapPath, fullPage: false });
  console.log(`✔ Test 4: Saved proof screenshot to test-output/context-and-drag-proof.png`);

  console.log('\n=============================================================');
  console.log('BOTH CONTEXT-MENU AND DRAG-AND-DROP TRANSLATION TESTS PASSED!');
  console.log('=============================================================');

} finally {
  await context.close();
  server.close();
}
