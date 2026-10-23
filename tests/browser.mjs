import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'test-output');await fs.mkdir(output,{recursive:true});
let image;
const requests=[];
const server=http.createServer((req,res)=>{
 requests.push({url:req.url,dest:req.headers['sec-fetch-dest']});res.setHeader('Cache-Control','no-store');
 if(req.url.startsWith('/image')){res.setHeader('Content-Type','image/png');res.end(image);return;}
 if(req.url.startsWith('/blocked')){if(req.headers['sec-fetch-dest']!=='image'){res.writeHead(403);res.end('Hotlink denied');return;}res.setHeader('Content-Type','image/png');res.end(image);return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><title>Manhwa Lens controlled test chapter</title><style>body{margin:0;background:#15121c;color:#eee;font-family:system-ui}header{padding:20px 32px}h1{font-size:22px;margin:0}p{color:#beb0cc}img{display:block;width:700px;height:400px;margin:10px 32px}footer{height:1200px}</style><header><h1>Manhwa Lens · Test chapter</h1><p>Original synthetic speech bubble · local test fixture</p></header><img id="panel" src="http://localhost:${server.address().port}/${req.url.includes('blocked')?'blocked':'image'}.png"><footer></footer></html>`);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
const reports=[],errors=[];
const passed=(test,details)=>{reports.push({test,pass:true,details});console.log('PASS '+test);};
let context,page;
try{
 context=await chromium.launchPersistentContext(path.join(output,'browser-profile'),{channel:'chromium',headless:true,viewport:{width:1280,height:850},args:[`--disable-extensions-except=${path.join(root,'dist/manhwa-lens')}`,`--load-extension=${path.join(root,'dist/manhwa-lens')}`]});
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const sw=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:30000});
 const id=new URL(sw.url()).host;
 page=await context.newPage();await page.goto('about:blank');
 async function fixture(lines,font='Malgun Gothic'){
  const data=await page.evaluate(({lines,font})=>{const c=document.createElement('canvas');c.width=1400;c.height=800;const x=c.getContext('2d');x.fillStyle='#ece5f5';x.fillRect(0,0,1400,800);x.fillStyle='white';x.beginPath();x.ellipse(700,400,630,320,0,0,2*Math.PI);x.fill();x.strokeStyle='#241936';x.lineWidth=8;x.stroke();x.fillStyle='#16111d';x.font=`64px "${font}", sans-serif`;x.textAlign='center';lines.forEach((line,i)=>x.fillText(line,700,350+i*120));return c.toDataURL('image/png');},{lines,font});
  image=Buffer.from(data.split(',')[1],'base64');return image;
 }
 await fixture(['안녕하세요','오늘 날씨가 좋습니다']);await fs.writeFile(path.join(output,'korean-fixture.png'),image);
 await page.goto(url);await page.locator('#panel').evaluate(img=>img.decode());
 const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
 await popup.screenshot({path:path.join(output,'popup.png')});
 await popup.locator('#language').selectOption('jpn');await popup.reload();assert.equal(await popup.locator('#language').inputValue(),'jpn');passed('Popup language persistence');
 const tabId=await popup.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url+'/').id,url);
 async function send(message){return popup.evaluate(m=>chrome.runtime.sendMessage(m),message);}
 async function start(mode='image',language='kor'){
  const response=await send({type:'START',mode,language,tabId});assert.equal(response.ok,true,JSON.stringify(response));await page.bringToFront();await page.locator('.selection').waitFor();
 }
 async function waitResult(){await page.waitForFunction(()=>{const root=document.querySelector('[data-manhwa-lens]')?.shadowRoot;return root?.querySelector('.card')||/required|failed|No readable|Invalid|did not|changed|already|too large|moved|not respond/i.test(root?.querySelector('.status')?.textContent||'');},{},{timeout:120000});if(!await page.locator('.card').count())throw new Error(await page.locator('.status').innerText());return page.locator('.translated').allTextContents();}
 async function clear(){assert.equal((await send({type:'CLEAR',tabId})).ok,true);}
 async function imageRun(language='kor'){await start('image',language);await page.mouse.click(232,300);return waitResult();}
 async function regionRun(){await start('region');await page.mouse.move(70,200);await page.mouse.down();await page.mouse.move(700,495,{steps:10});await page.mouse.up();return waitResult();}
 assert.equal(await page.locator('#panel').evaluate(img=>{const c=document.createElement('canvas');c.width=20;c.height=20;const x=c.getContext('2d');x.drawImage(img,0,0);try{c.toDataURL();return false;}catch{return true;}}),true);
 passed('Fixture is genuinely cross-origin and taints page canvas');
 const translations=await imageRun();assert.match(translations.join(' '),/hello/i);assert.match(translations.join(' '),/weather/i);assert.equal(translations.length,1);passed('Korean bundled OCR + live English translation + whole-bubble grouping',translations);
 await page.screenshot({path:path.join(output,'translation.png')});
 const top=await page.locator('.overlay').first().evaluate(e=>e.getBoundingClientRect().top);await page.evaluate(()=>scrollTo(0,100));await page.waitForFunction(top=>Math.abs(document.querySelector('[data-manhwa-lens]').shadowRoot.querySelector('.overlay').getBoundingClientRect().top-(top-100))<2,top);passed('Overlay stays aligned on scroll');await page.evaluate(()=>scrollTo(0,0));
 await page.getByRole('button',{name:'Hide translations',exact:true}).click();assert.equal(await page.locator('.overlay').first().isVisible(),false);await page.getByRole('button',{name:'Show translations',exact:true}).click();assert.equal(await page.locator('.overlay').first().isVisible(),true);passed('Hide/show translation controls');
 await page.locator('textarea').first().fill('감사합니다');await page.getByRole('button',{name:'Translate edited text'}).first().click();await page.waitForFunction(()=>/thank/i.test(document.querySelector('[data-manhwa-lens]').shadowRoot.querySelector('.translated').textContent));passed('Edited OCR retry with live translation');
 await clear();assert.equal(await page.locator('[data-manhwa-lens]').count(),0);passed('Remove all clears overlay and transcript');
 await start('region');await page.keyboard.press('Escape');assert.equal(await page.locator('.selection').count(),0);assert.match(await page.locator('.status').innerText(),/cancelled/);passed('Escape cancels region selection');await clear();
 const captured=await regionRun();assert.match(captured.join(' '),/hello/i);passed('Visible-region screenshot OCR + English translation',captured);await clear();
 await page.goto(url+'/chapter?blocked');await page.locator('#panel').evaluate(img=>img.decode());
 const fallback=await imageRun();assert.match(fallback.join(' '),/hello/i);assert.match(await page.locator('.status').innerText(),/visible portion/i);assert(requests.some(r=>r.url==='/blocked.png'&&r.dest!=='image'));passed('HTTP 403 hotlink failure automatically uses screenshot fallback');await page.screenshot({path:path.join(output,'blocked-fallback.png')});await clear();
 await fixture(['새로운 시작']);await page.goto(url+'/chapter?offline');await page.locator('#panel').evaluate(img=>img.decode());
 await regionRun();assert.match(await page.locator('textarea').first().inputValue(),/.+/);passed('Region OCR on Korean fixture');
 await page.locator('textarea').first().fill('');await page.getByRole('button',{name:'Translate edited text'}).first().click();await page.waitForFunction(()=>/Enter recognized text/i.test(document.querySelector('[data-manhwa-lens]').shadowRoot.querySelector('.error').textContent));passed('Empty text validation error displayed actionably in transcript');await page.locator('textarea').first().fill('새로운 시작');await page.getByRole('button',{name:'Translate edited text'}).first().click();await page.waitForFunction(()=>{const r=document.querySelector('[data-manhwa-lens]').shadowRoot;return r.querySelector('.error').textContent===''&&!/No translation/.test(r.querySelector('.translated').textContent);});passed('Translation recovers after user corrects text and retries');await clear();
 for(const sample of [{lang:'jpn',font:'Yu Gothic',lines:['こんにちは','ありがとうございます'],expected:/hello|thank/i},{lang:'chi_sim',font:'Microsoft YaHei',lines:['你好','谢谢你'],expected:/hello|thank/i},{lang:'eng',font:'Arial',lines:['Hello world','A new chapter'],expected:/Hello world/i}]){
  await fixture(sample.lines,sample.font);await page.goto(url+'/chapter?lang='+sample.lang);await page.locator('#panel').evaluate(img=>img.decode());const result=await imageRun(sample.lang);assert.match(result.join(' '),sample.expected);passed(`${sample.lang} bundled model initializes and recognizes fixture`,result);await clear();
 }
 const beforeIds=await popup.evaluate(async()=>(await chrome.tabs.query({})).map(t=>t.id));
 const restricted=await context.newPage();await restricted.goto('chrome://version');
 const restrictedId=await popup.evaluate(async ids=>(await chrome.tabs.query({})).find(t=>!ids.includes(t.id))?.id,beforeIds);
 const denied=await send({type:'START',mode:'region',language:'kor',tabId:restrictedId});assert.equal(denied.ok,false);assert.match(denied.error,/normal HTTP/);passed('Restricted browser pages receive a clear error');
 assert.equal(errors.length,0,errors.join('\n'));passed('No uncaught page JavaScript errors');
} catch(error){
 reports.push({test:'Integration suite',pass:false,error:error.stack});
 if(page){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});await fs.writeFile(path.join(output,'debug-dom.txt'),await page.evaluate(()=>document.documentElement.outerHTML+'\nSHADOWS\n'+[...document.querySelectorAll('*')].filter(x=>x.shadowRoot).map(x=>x.shadowRoot.innerHTML).join('\n')).catch(()=>''));}
 throw error;
}finally{await fs.writeFile(path.join(output,'results.json'),JSON.stringify({testedAt:new Date().toISOString(),browser:'Chromium 145 (Playwright, headless extension profile)',reports,errors},null,2));await context?.close();server.close();}
