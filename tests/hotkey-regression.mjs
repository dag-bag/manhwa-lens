import {chromium} from 'playwright';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!DOCTYPE html><html><body><h1>Comic Tab</h1><img id="comic" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" width="400" height="400"></body></html>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 800 },
  args: [
    `--disable-extensions-except=${root}/dist/manhwa-lens`,
    `--load-extension=${root}/dist/manhwa-lens`
  ]
});

try {
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForTimeout(500); // Wait for document_idle

  // Test 1: Alt+x activates selection crosshair
  await page.keyboard.press('Alt+x');
  await page.waitForTimeout(200);
  let hasSelection = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return Boolean(r?.querySelector('.selection'));
  });
  assert.equal(hasSelection, true, 'Alt+x must activate selection crosshair');

  // Test 2: Escape cancels selection
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  hasSelection = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return Boolean(r?.querySelector('.selection'));
  });
  assert.equal(hasSelection, false, 'Escape must cancel selection crosshair');

  // Test 3: Ctrl+Shift+X also activates selection crosshair (alternate shortcut)
  await page.keyboard.press('Control+Shift+KeyX');
  await page.waitForTimeout(200);
  hasSelection = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return Boolean(r?.querySelector('.selection'));
  });
  assert.equal(hasSelection, true, 'Control+Shift+KeyX must also activate selection crosshair');

  // Cancel selection
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Test 4: Typing in input field does NOT trigger shortcut
  await page.evaluate(() => {
    const inp = document.createElement('input');
    inp.id = 'test-input';
    document.body.appendChild(inp);
    inp.focus();
  });
  await page.keyboard.press('Alt+x');
  await page.waitForTimeout(200);
  hasSelection = await page.evaluate(() => {
    const r = document.querySelector('[data-manhwa-lens]')?.shadowRoot;
    return Boolean(r?.querySelector('.selection'));
  });
  assert.equal(hasSelection, false, 'Alt+x inside input element must NOT trigger selection');

  console.log('PASS: All keyboard shortcut regressions verified (Alt+X, Escape, Ctrl+Shift+X, and Input isolation)!');

} finally {
  await context.close();
  server.close();
}
