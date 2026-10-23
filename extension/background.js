import {language,cropRect,imageUrl,translationText} from './core.mjs';
let creating;
const busy=new Set();
async function offscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (!creating) creating=chrome.offscreen.createDocument({url:'offscreen.html',reasons:['WORKERS'],justification:'Run local OCR using bundled WebAssembly and canvas image preprocessing.'}).finally(()=>creating=null);
  await creating;
}
async function progress(tabId,message) { await chrome.tabs.sendMessage(tabId,{type:'PROGRESS',message}).catch(()=>{}); }
async function capture(tabId, request) {
  const tab=await chrome.tabs.get(tabId);
  const [active]=await chrome.tabs.query({active:true,windowId:tab.windowId});
  if(active?.id!==tabId) throw new Error('Keep the manhwa tab active while capturing.');
  const rect=cropRect(request.rect,request.viewport);
  const [{result:position}]=await chrome.scripting.executeScript({target:{tabId},func:()=>({x:scrollX,y:scrollY,width:innerWidth,height:innerHeight})});
  if(Math.abs(position.x-request.scroll.x)>1||Math.abs(position.y-request.scroll.y)>1||position.width!==request.viewport.width||position.height!==request.viewport.height)throw new Error('The page moved or resized. Select the area again and keep the page still during capture.');
  const dataUrl=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});
  const [stillActive]=await chrome.tabs.query({active:true,windowId:tab.windowId});
  if(stillActive?.id!==tabId) throw new Error('The active tab changed. Please select the area again.');
  return {dataUrl,crop:{rect,viewport:request.viewport},anchor:{x:rect.x+request.scroll.x,y:rect.y+request.scroll.y,width:rect.width,height:rect.height}};
}
async function fetchImage(url) {
  const response=await fetch(imageUrl(url),{credentials:'omit',signal:AbortSignal.timeout(15000),referrerPolicy:'no-referrer'});
  if(!response.ok) throw new Error(`Image server returned HTTP ${response.status}.`);
  if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Image server did not return an image.');
  if(Number(response.headers.get('content-length'))>20*1024*1024)throw new Error('Image exceeds 20 MB.');
  const reader=response.body.getReader();let size=0;const chunks=[];
  try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20*1024*1024)throw new Error('Image exceeds 20 MB.');chunks.push(value);} }finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return `data:${response.headers.get('content-type').split(';')[0]};base64,${btoa(binary)}`;
}
async function processImage(request,sender) {
  const tabId=sender.tab?.id;if(!Number.isInteger(tabId))throw new Error('Open a webpage to translate.');
  language(request.language);
  if(!request.scroll || ![request.scroll.x,request.scroll.y].every(Number.isFinite))throw new Error('Invalid page position.');
  if(busy.has(tabId))throw new Error('A translation is already running in this tab.');
  busy.add(tabId);
  try {
    let input,warning;
    if(request.mode==='image') {
      try { input={dataUrl:await fetchImage(request.url),anchor:{x:request.rect.x+request.scroll.x,y:request.rect.y+request.scroll.y,width:request.rect.width,height:request.rect.height}}; }
      catch(e){input=await capture(tabId,request);warning=`Direct image access failed. Translated only the visible portion instead. ${e.message}`;}
    } else if(request.mode==='region') input=await capture(tabId,request);
    else throw new Error('Unknown capture mode.');
    await offscreen();
    const response=await chrome.runtime.sendMessage({target:'offscreen',type:'OCR',dataUrl:input.dataUrl,crop:input.crop,language:request.language,tabId});
    if(!response?.ok)throw new Error(response?.error||'OCR did not respond. Please try again.');
    return {ok:true,result:response.result,anchor:input.anchor,warning};
  } finally {busy.delete(tabId);}
}
chrome.runtime.onMessage.addListener((request,sender,reply)=>{
  if(sender.id!==chrome.runtime.id || request.target==='offscreen')return;
  if(request.type==='OCR_PROGRESS') {if(sender.tab)return;progress(request.tabId,request.message);return;}
  const run=async()=>{
    if(request.type==='PROCESS')return processImage(request,sender);
    if(request.type==='TRANSLATE') {
      translationText(request.text);language(request.language);await offscreen();
      return chrome.runtime.sendMessage({target:'offscreen',type:'TRANSLATE',text:request.text,language:request.language});
    }
    if(request.type==='START'||request.type==='CLEAR') {
      if(sender.url!==chrome.runtime.getURL('popup.html'))throw new Error('Start translation from the extension toolbar.');
      const tab=await chrome.tabs.get(request.tabId);
      if(!/^https?:/.test(tab.url||''))throw new Error('Open a normal HTTP(S) webpage. Browser settings, stores and PDF viewers may block extensions.');
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
      await chrome.tabs.sendMessage(tab.id,request.type==='CLEAR'?{type:'CLEAR'}:{type:'SELECT',mode:request.mode,language:language(request.language)});
      return {ok:true};
    }
    return {ok:false,error:'Unknown request.'};
  };
  run().then(reply).catch(e=>reply({ok:false,error:e.message||String(e)}));return true;
});
