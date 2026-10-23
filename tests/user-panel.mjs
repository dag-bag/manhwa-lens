import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'test-output');
const fixture=await fs.readFile(path.join(root,'tests/fixtures/user-korean-panel.png'));
const server=http.createServer((req,res)=>{if(req.url==='/panel.png'){res.setHeader('Content-Type','image/png');res.end(fixture);}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><style>body{margin:0;background:#100e16;color:#eee;font-family:system-ui}header{padding:20px 32px}img{display:block;width:633px;height:auto;margin:0 32px}footer{height:1000px}</style><header>User-supplied Korean panel · regression test</header><img src="/panel.png"><footer></footer></html>');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let context;
try{
 context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,viewport:{width:1280,height:800},args:[`--disable-extensions-except=${root}/dist/manhwa-lens`,`--load-extension=${root}/dist/manhwa-lens`]});
 let sw=context.serviceWorkers()[0];
 if(!sw){
  try{sw=await context.waitForEvent('serviceworker',{timeout:8000});}
  catch{sw=context.serviceWorkers()[0];}
 }
 const id=new URL(sw.url()).host;
 const page=await context.newPage();const url=`http://127.0.0.1:${server.address().port}/`;await page.goto(url);await page.locator('img').evaluate(i=>i.decode());
 const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
 const tabId=await popup.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url).id,url);
 assert.equal((await popup.evaluate(m=>chrome.runtime.sendMessage(m),{type:'START',mode:'image',language:'kor',tabId})).ok,true);
 await page.bringToFront();await page.mouse.click(330,180);
 await page.waitForFunction(()=>{const r=document.querySelector('[data-manhwa-lens]')?.shadowRoot;return r?.querySelector('.card')||/No reliable|failed|too much/i.test(r?.querySelector('.status')?.textContent||'');},{},{timeout:120000});
 const result=await page.evaluate(()=>{const r=document.querySelector('[data-manhwa-lens]').shadowRoot;return {status:r.querySelector('.status').textContent,original:[...r.querySelectorAll('textarea')].map(e=>e.value),english:[...r.querySelectorAll('.translated')].map(e=>e.textContent),errors:[...r.querySelectorAll('.error')].map(e=>e.textContent),overlays:[...r.querySelectorAll('.overlay')].map(e=>{const rect=e.getBoundingClientRect(),img=document.querySelector('img').getBoundingClientRect();return {x:rect.x-img.x,y:rect.y-img.y,width:rect.width,height:rect.height,font:parseFloat(getComputedStyle(e.querySelector('span')).fontSize),hidden:e.hidden,overflow:e.querySelector('span').scrollHeight>rect.height-20};})};});
 await fs.writeFile(path.join(out,'user-panel-result.json'),JSON.stringify(result,null,2));await page.mouse.move(850,650);await page.screenshot({path:path.join(out,'user-panel-fixed.png')});
 console.log(JSON.stringify(result,null,2));

 assert.equal(result.original.length,1,'One coherent bubble, no background false positives');
 assert.match(result.original[0],/남자\s*전용/);assert.match(result.original[0],/사우나는/);assert.match(result.original[0],/할\s*일이\s*많구나/);
 assert.match(result.english[0],/men|male/i);assert.match(result.english[0],/sauna/i);assert.doesNotMatch(result.english[0],/Nimsa/i);
 assert.equal(result.overlays.length,1);const o=result.overlays[0];assert(o.x>=150&&o.y>=45&&o.x+o.width<=490&&o.y+o.height<=260);assert(o.font>=18);assert.equal(o.hidden,false);assert.equal(o.overflow,false);
 await page.locator('img').evaluate(img=>img.style.width='500px');await page.setViewportSize({width:1200,height:800});
 await page.waitForFunction(()=>{const r=document.querySelector('[data-manhwa-lens]').shadowRoot.querySelector('.overlay').getBoundingClientRect();return r.width<240;});
 assert(await page.locator('.overlay').isVisible());
 console.log('PASS supplied panel OCR, coherent translation, one contained readable overlay, responsive image sizing');
 await popup.evaluate(tabId=>chrome.runtime.sendMessage({type:'CLEAR',tabId}),tabId);
 await page.locator('img').evaluate(img=>img.style.width='633px');
 await popup.evaluate(tabId=>chrome.runtime.sendMessage({type:'START',mode:'region',language:'kor',tabId}),tabId);await page.bringToFront();
 const box=await page.locator('img').boundingBox();await page.mouse.move(box.x+2,box.y+2);await page.mouse.down();await page.mouse.move(box.x+box.width-2,box.y+box.height-2,{steps:10});await page.mouse.up();
 await page.locator('.card').waitFor({timeout:120000});
 assert.equal(await page.locator('.card').count(),1);assert.match(await page.locator('textarea').inputValue(),/남자\s*전용/);assert.match(await page.locator('.translated').innerText(),/men|male/i);assert.equal(await page.locator('.overlay').isVisible(),true);
 console.log('PASS supplied panel visible-region screenshot OCR and contained English overlay');
}finally{await context?.close();server.close();}
