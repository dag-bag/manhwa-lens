import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';

// Real browser layout against source: no OCR, network, build, or output files.
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:1400,height:900}});
  await page.setContent('<style>body{margin:0;min-height:2000px}</style>');
  await page.evaluate(() => {
    window.fixture = {ok:true,anchor:{x:355,y:24,width:690,height:800},result:{width:690,height:800,regions:[
      {text:'탑을 올라갈꺼야.',translation:"I'm going to climb the tower.",bbox:{x0:260.5,y0:474.5,x1:421,y1:497.5}},
      {text:'이 탑을 올라가면 언젠가 바깥 세상 나갈 수 있다고.',translation:'They say that if you climb this tower, you will be able to go to the outside world someday.',bbox:{x0:83.5,y0:706.5,x1:224.5,y1:770.5}},
      {text:'Long token',translation:'AnExceptionallyLongUnbrokenTranslationToken'.repeat(3),isDark:true,bbox:{x0:10,y0:200,x1:55,y1:220}},
      {text:'Fits',translation:'Hello!',bbox:{x0:20,y0:30,x1:220,y1:110}}
    ]}};
    window.chrome={runtime:{onMessage:{addListener(listener){window.receive=listener;}},async sendMessage(m){return m.type==='TRANSLATE'?{ok:true,text:window.retryText}:window.fixture;}}};
  });
  await page.addScriptTag({path:path.resolve('extension/content.js')});
  await page.evaluate(()=>window.receive({type:'SELECT',mode:'region',language:'kor'},{},()=>{}));
  await page.mouse.move(350,20);await page.mouse.down();await page.mouse.move(900,820);await page.mouse.up();
  await page.locator('.card').first().waitFor();
  async function metrics(index) {
    return page.locator('.overlay').nth(index).evaluate(o=>{
      const s=o.querySelector('span'),r=o.getBoundingClientRect(),sr=s.getBoundingClientRect(),css=getComputedStyle(o);
      return {hidden:o.hidden,display:css.display,font:parseFloat(getComputedStyle(s).fontSize),width:r.width,height:r.height,top:r.top,
        textHeight:sr.height,scrollWidth:s.scrollWidth,contentWidth:o.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),
        overflow:css.overflowY,scrollHeight:o.scrollHeight,clientHeight:o.clientHeight};
    });
  }
  for(let i=0;i<4;i++) {
    const m=await metrics(i);
    assert.equal(m.hidden,false,`translation ${i+1} must not silently disappear`);
    assert.notEqual(m.display,'none');assert(m.font>=14,`translation ${i+1} must remain legible`);
    assert(m.scrollWidth<=m.contentWidth+1,`translation ${i+1} must wrap within overlay`);
    assert(m.textHeight<=m.height||m.overflow==='auto','overflowing copy must be accessible');
  }
  assert((await metrics(0)).height>23);assert((await metrics(1)).height>64);
  assert.equal((await metrics(3)).width,200);assert.equal((await metrics(3)).height,80);
  const top=(await metrics(0)).top;
  await page.evaluate(()=>scrollTo(0,100));
  await page.waitForFunction(expected=>Math.abs(document.querySelector('[data-manhwa-lens]').shadowRoot.querySelector('.overlay').getBoundingClientRect().top-expected)<1,top-100);
  await page.getByRole('button',{name:'Hide translations',exact:true}).click();
  assert.equal(await page.locator('.overlay').first().isVisible(),false);
  await page.getByRole('button',{name:'Show translations',exact:true}).click();
  assert.equal(await page.locator('.overlay').first().isVisible(),true);
  await page.evaluate(()=>{window.retryText='Expanded translation '.repeat(200);});
  await page.getByRole('button',{name:'Translate edited text'}).first().click();
  await page.waitForFunction(()=>document.querySelector('[data-manhwa-lens]').shadowRoot.querySelector('.overlay span').textContent.startsWith('Expanded'));
  const long=await metrics(0);
  assert.equal(long.hidden,false);assert(long.font>=14);assert.equal(long.overflow,'auto');assert(long.scrollHeight>long.clientHeight);
  await page.evaluate(()=>{window.retryText='Hi';});
  await page.getByRole('button',{name:'Translate edited text'}).first().click();
  await page.waitForFunction(()=>document.querySelector('[data-manhwa-lens]').shadowRoot.querySelector('.overlay span').textContent==='Hi');
  assert((await metrics(0)).height<long.height);
  await page.getByRole('button',{name:'Remove translation 1',exact:true}).click({force:true});
  assert.equal(await page.locator('.overlay').count(),3);
  await page.setViewportSize({width:800,height:600});
  await page.getByRole('button',{name:'Hide translations',exact:true}).click();
  await page.getByRole('button',{name:'Show translations',exact:true}).click();
  assert.equal((await metrics(0)).hidden,false);
  console.log('PASS overlay regression: panel07 dimensions, long tokens/dark theme, fitting box, scroll, hide/show, retry, resize, removal');
} finally {await browser.close();}
