import {LANGUAGES,language,translationText,parseTranslation,tiles,isDuplicate} from './core.mjs';
import {lightFraction,isReadable,bubbleGroups} from './ocr-layout.mjs';
const cache=new Map();
let chain=Promise.resolve(),worker,workerLanguage;
const progress=(tabId,message)=>chrome.runtime.sendMessage({type:'OCR_PROGRESS',tabId,message}).catch(()=>{});

async function translate(text,lang) {
  text=translationText(text);language(lang);
  if(lang==='eng')return text;
  if(/^[\s\d\p{P}\p{S}a-zA-Z]+$/u.test(text))return text;
  const key=`${lang}:${text}`;if(cache.has(key))return cache.get(key);
  const sl=LANGUAGES[lang]||'auto';
  let translated;

  // Tier 1: Google Translate gtx
  try {
    const url=new URL('https://translate.googleapis.com/translate_a/single');
    url.search=new URLSearchParams({client:'gtx',sl,tl:'en',dt:'t',q:text}).toString();
    const res=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(8000)});
    if(res.ok)translated=parseTranslation(await res.json());
  }catch{}

  // Tier 2: Google Translate dict-chrome-ex with auto-detect
  if(!translated){
    try {
      const url=new URL('https://translate.googleapis.com/translate_a/single');
      url.search=new URLSearchParams({client:'dict-chrome-ex',sl:'auto',tl:'en',dt:'t',q:text}).toString();
      const res=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(8000)});
      if(res.ok)translated=parseTranslation(await res.json());
    }catch{}
  }

  // Tier 3: MyMemory free community translation API
  if(!translated){
    try {
      const pair=(sl==='auto'?'ja':sl)+'|en';
      const url=new URL('https://api.mymemory.translated.net/get');
      url.search=new URLSearchParams({q:text,langpair:pair}).toString();
      const res=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(8000)});
      if(res.ok){
        const data=await res.json();
        const out=data.responseData?.translatedText?.trim();
        if(Number(data.responseStatus)===200&&!data.quotaFinished&&out&&!/MYMEMORY WARNING|QUERY LENGTH LIMIT EXCEEDED|INVALID LANGUAGE PAIR/i.test(out))translated=out;
      }
    }catch{}
  }

  if(!translated)throw new Error('Translation service temporarily busy. Click "Translate edited text" to retry.');
  if(cache.size>=250)cache.delete(cache.keys().next().value);
  cache.set(key,translated);return translated;
}

async function getWorker(lang,tabId) {
  if(worker&&workerLanguage!==lang){await worker.terminate();worker=null;}
  if(!worker){
    await progress(tabId,'Loading local OCR model…');
    worker=await Tesseract.createWorker(lang,1,{
      workerPath:chrome.runtime.getURL('vendor/worker.min.js'),
      corePath:chrome.runtime.getURL('vendor/core'),
      langPath:chrome.runtime.getURL('vendor/lang'),
      workerBlobURL:false,gzip:true,
      logger:m=>{if(m.status==='recognizing text')progress(tabId,`Reading text locally… ${Math.round(m.progress*100)}%`);}
    });workerLanguage=lang;
    await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
  }
  return worker;
}

async function decode(dataUrl,crop) {
  const blob=await (await fetch(dataUrl)).blob();
  const bitmap=await createImageBitmap(blob);
  try {
    let sx=0,sy=0,sw=bitmap.width,sh=bitmap.height;
    if(crop){const {rect,viewport}=crop;sx=Math.round(rect.x*bitmap.width/viewport.width);sy=Math.round(rect.y*bitmap.height/viewport.height);sw=Math.round(rect.width*bitmap.width/viewport.width);sh=Math.round(rect.height*bitmap.height/viewport.height);}
    if(sw<1||sh<1||sw*sh>40000000)throw new Error('Image is too large. Select a smaller visible area.');
    const scale=Math.min(2,2200/sw,Math.sqrt(24000000/(sw*sh)));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,canvas.width,canvas.height);return canvas;
  } finally {bitmap.close();}
}

async function recognize(request) {
  language(request.language);
  const canvas=await decode(request.dataUrl,request.crop);
  const engine=await getWorker(request.language,request.tabId);
  const regions=[];
  const chunks=tiles(canvas.width,canvas.height);
  if(chunks.length>24)throw new Error('This strip is too long. Select a smaller visible area.');
  for(const [index,tile] of chunks.entries()){
    await progress(request.tabId,`Reading panel ${index+1}/${chunks.length}…`);
    const part=document.createElement('canvas');part.width=tile.width;part.height=tile.height;
    part.getContext('2d').drawImage(canvas,0,tile.y,tile.width,tile.height,0,0,tile.width,tile.height);
    const {data}=await engine.recognize(part,{}, {blocks:true,text:true});
    for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[]){
      const text=(paragraph.text||paragraph.lines?.map(l=>l.text).join('\n')||'').trim();
      if(!text || !/[\p{L}\p{N}]/u.test(text))continue;
      const bbox=paragraph.bbox;
      const region={text,confidence:paragraph.confidence??block.confidence??0,bbox:{x0:bbox.x0,y0:bbox.y0+tile.y,x1:bbox.x1,y1:bbox.y1+tile.y}};
      const duplicate=regions.findIndex(r=>isDuplicate(r,region));
      if(duplicate<0)regions.push(region);else if(region.text.length>regions[duplicate].text.length)regions[duplicate]=region;
    }
    part.width=part.height=0;
  }
  if(!regions.length)throw new Error('No readable text found. Select a tighter speech bubble, zoom in, or choose the correct source language.');
  if(regions.length>100)throw new Error('Too much text at once. Select a smaller area (up to 100 text regions).');
  const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  const readable=regions.filter(r=>isReadable(r,request.language,lightFraction(pixels,canvas.width,canvas.height,r.bbox)));
  if(!readable.length)throw new Error('No reliable speech-bubble text found. Choose the correct language and select a tighter area around a light speech bubble. Artwork and uncertain fragments were left unchanged.');
  const merged=bubbleGroups(readable,pixels,canvas.width,canvas.height);
  await engine.setParameters({tessedit_pageseg_mode:'6'});
  try{
    for(const region of merged){
      const b=region.bbox;
      const crop=document.createElement('canvas');crop.width=b.x1-b.x0;crop.height=b.y1-b.y0;
      crop.getContext('2d').drawImage(canvas,b.x0,b.y0,crop.width,crop.height,0,0,crop.width,crop.height);
      const {data}=await engine.recognize(crop,{}, {text:true,blocks:false});
      const text=data.text.trim().replace(/\s*\n\s*/g,' ').replace(/ {2,}/g,' ');
      if(text&&data.confidence>=45){region.text=text;region.confidence=data.confidence;}
      crop.width=crop.height=0;
    }
  }finally{await engine.setParameters({tessedit_pageseg_mode:'11'});}
  for(const [i,region] of merged.entries()){
    await progress(request.tabId,`Translating ${i+1}/${merged.length}…`);
    try{
      region.translation=await translate(region.text,request.language);
    }catch(e){
      region.error=e.message;
    }
    if(i<merged.length-1&&!/^[\s\d\p{P}\p{S}a-zA-Z]+$/u.test(region.text)){
      await new Promise(r=>setTimeout(r,100));
    }
  }
  return {regions:merged,width:canvas.width,height:canvas.height};
}

chrome.runtime.onMessage.addListener((request,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||request.target!=='offscreen')return;
  const task=async()=>{
    try{
      if(request.type==='TRANSLATE')return {ok:true,text:await translate(request.text,request.language)};
      if(request.type==='OCR')return {ok:true,result:await recognize(request)};
      throw new Error('Unknown OCR request.');
    }catch(e){return {ok:false,error:e.message||String(e)};}
  };
  chain=chain.then(task,task);chain.then(reply);return true;
});
