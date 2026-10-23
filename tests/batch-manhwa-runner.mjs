import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const root=path.resolve(import.meta.dirname,'..');
const base=path.join(root,'tests/fixtures/real-manhwa');
const audit=JSON.parse(await fs.readFile(path.join(base,'audit.json'),'utf8'));
const normalize=s=>s.replace(/[^\p{L}\p{N}]/gu,'');
const files=[];
for(const dir of ['chapter-1','chapter-2'])for(const f of (await fs.readdir(path.join(base,dir))).sort())if(f.endsWith('.png'))files.push(`${dir}/${f}`);
const out=path.join(root,'test-output');await fs.mkdir(out,{recursive:true});
let fixture;
const server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');if(req.url==='/panel.png'){res.setHeader('Content-Type','image/png');res.end(fixture);}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><style>body{margin:0;background:#100d17;color:#eee;font-family:system-ui}img{display:block;width:690px;height:auto;margin:24px auto}</style><img id="panel" src="/panel.png"></html>');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`;
const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,viewport:{width:1600,height:1100},args:[`--disable-extensions-except=${root}/dist/manhwa-lens`,`--load-extension=${root}/dist/manhwa-lens`]});
const report={testedAt:new Date().toISOString(),totalPanels:files.length,note:'Detection counts are not accuracy scores. Zero detections do not prove absence of text. Images are fixed crops, not complete chapters.',results:[]};
try{
 const sw=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:20000});
 const popup=await context.newPage();await popup.goto(`chrome-extension://${new URL(sw.url()).host}/popup.html`);
 const page=await context.newPage();
 for(const [index,panel] of files.entries()){
  fixture=await fs.readFile(path.join(base,panel));await page.goto(url);await page.locator('#panel').evaluate(i=>i.decode());
  const tabId=await popup.evaluate(async u=>(await chrome.tabs.query({})).find(t=>t.url===u).id,url);
  const start=Date.now();let failure=null;
  try{
   const reply=await popup.evaluate(m=>chrome.runtime.sendMessage(m),{type:'START',mode:'image',language:'kor',tabId});
   if(reply?.ok===false)throw new Error(reply.error);
   await page.bringToFront();
   await page.mouse.click(500, 300);
   await page.waitForFunction(()=>{const r=document.querySelector('[data-manhwa-lens]')?.shadowRoot;return /text regions|No readable|No reliable|failed|too much|too large|error/i.test(r?.querySelector('.status')?.textContent||'');},{},{timeout:60000});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  }catch(e){failure=e.message;}
  const data=await page.evaluate(()=>{
   const r=document.querySelector('[data-manhwa-lens]')?.shadowRoot;
   if(!r)return {status:'UI not injected',cards:[],overlays:[]};
   return {status:r.querySelector('.status')?.textContent||'',cards:[...r.querySelectorAll('.card')].map((c,i)=>({index:i+1,korean:c.querySelector('textarea')?.value||'',english:c.querySelector('.translated')?.textContent||'',error:c.querySelector('.error')?.textContent||'',confidence:c.querySelector('.confidence')?.textContent||''})),overlays:[...r.querySelectorAll('.overlay')].map(o=>{const b=o.getBoundingClientRect(),s=getComputedStyle(o);return {text:o.textContent,isDark:o.classList.contains('dark'),visible:!o.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0,fontSize:s.fontSize,bounds:{left:b.left,top:b.top,width:b.width,height:b.height},scrollWidth:o.scrollWidth,clientWidth:o.clientWidth};})};
  });
  const snapshot=`batch_snapshot_${index+1}.png`;await page.screenshot({path:path.join(out,snapshot),fullPage:true});
  const truth=audit.panels[panel];
  const recognized=normalize(data.cards.map(c=>c.korean).join(' '));
  const expected=(truth?.text||[]);
  const assessment={kind:truth?.kind,expected,matched:expected.filter(t=>recognized.includes(normalize(t))),missing:expected.filter(t=>!recognized.includes(normalize(t))),clippedText:truth?.clippedText,note:'Substring coverage is not a translation accuracy score; repeated SFX require visual review.'};
  const result={index:index+1,panel,elapsedMs:Date.now()-start,failure,assessment,...data,bubblesCount:data.cards.length,overlaysCount:data.overlays.length,visibleOverlays:data.overlays.filter(o=>o.visible).length,snapshot};
  report.results.push(result);
  await fs.writeFile(path.join(out,'batch-test-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(result));
  await popup.evaluate(t => chrome.runtime.sendMessage({ type: 'CLEAR', tabId: t }), tabId);
  await page.waitForTimeout(500);
 }
 report.summary={panelsProcessed:report.results.length,panelsWithDetections:report.results.filter(r=>r.cards.length).length,panelsWithoutDetections:report.results.filter(r=>!r.cards.length).length,recognizedRegions:report.results.reduce((n,r)=>n+r.cards.length,0),visibleOverlays:report.results.reduce((n,r)=>n+r.visibleOverlays,0),failures:report.results.filter(r=>r.failure).length};
 await fs.writeFile(path.join(out,'batch-test-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
 if(report.summary.failures)process.exitCode=1;
}finally{await context.close();server.close();}
