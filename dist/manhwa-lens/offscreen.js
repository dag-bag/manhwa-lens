import {LANGUAGES,language,translationText,parseTranslation,tiles,isDuplicate} from './core.mjs';
import {sampleSurface,isReadable,bubbleGroups,cleanOcrText,preparePaddedCrop,preferReread,projectGlowPixels} from './ocr-layout.mjs';
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
    const scale=Math.min(1,2200/sw,Math.sqrt(24000000/(sw*sh)));
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
    // Native sampling preserves thin Hangul strokes; enlargement is complementary,
    // not a replacement. The glow projection is useful only for Korean currently.
    const enlarged=Math.min(2,2200/tile.width,Math.sqrt(12000000/(tile.width*tile.height)));
    const passes=[{scale:1,glow:false}];
    if(enlarged>1.1)passes.push({scale:enlarged,glow:false});
    if(request.language==='kor')passes.push({scale:1,glow:true});
    for(const pass of passes){
      const part=document.createElement('canvas');part.width=Math.round(tile.width*pass.scale);part.height=Math.round(tile.height*pass.scale);
      const ctx=part.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(canvas,0,tile.y,tile.width,tile.height,0,0,part.width,part.height);
      if(pass.glow){const image=ctx.getImageData(0,0,part.width,part.height);projectGlowPixels(image.data);ctx.putImageData(image,0,0);}
      const {data}=await engine.recognize(part,{}, {blocks:true,text:true});
      for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[]){
        const text=(paragraph.text||paragraph.lines?.map(l=>l.text).join('\n')||'').trim();
        if(!text || !/[\p{L}\p{N}]/u.test(text))continue;
        const bbox=paragraph.bbox,sx=part.width/tile.width,sy=part.height/tile.height;
        const region={text,confidence:paragraph.confidence??block.confidence??0,bbox:{x0:Math.floor(bbox.x0/sx),y0:Math.floor(bbox.y0/sy)+tile.y,x1:Math.ceil(bbox.x1/sx),y1:Math.ceil(bbox.y1/sy)+tile.y}};
        // A clipped line cannot provide a complete transcription. Alternate color
        // passes need strong evidence because they also expose texture in artwork.
        if(bbox.y0<=1||bbox.y1>=part.height-1)continue;
        if(pass.glow&&region.confidence<80)continue;
        if(!isReadable(region,request.language,1))continue;
        const duplicate=regions.findIndex(r=>isDuplicate(r,region));
        if(duplicate<0)regions.push(region);
        else{
          const old=regions[duplicate];
          const letters=t=>(t.match(/[\p{L}\p{N}]/gu)||[]).length;
          if((region.confidence>=80&&letters(region.text)>letters(old.text)*1.2)||preferReread(old,region,request.language))regions[duplicate]=region;
        }
      }
      part.width=part.height=0;
    }
  }
  if(!regions.length)throw new Error('No readable text found. Select a tighter speech bubble, zoom in, or choose the correct source language.');
  if(regions.length>100)throw new Error('Too much text at once. Select a smaller area (up to 100 text regions).');
  const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
  const readable=[];
  for(const r of regions){
    const surface=sampleSurface(pixels,canvas.width,canvas.height,r.bbox);
    if(isReadable(r,request.language,surface)){
      readable.push({...r,isDark:surface.isDark});
    }
  }
  if(!readable.length)throw new Error('No reliable speech-bubble or narration text found. Choose the correct language and select a tighter area around the text. Artwork and uncertain fragments were left unchanged.');
  const merged=bubbleGroups(readable,pixels,canvas.width,canvas.height);
  await engine.setParameters({tessedit_pageseg_mode:'6'});
  try{
    for(const region of merged){
      region.text=cleanOcrText(region.text||'',request.language);
      const b=region.bbox;
      const crop=preparePaddedCrop(canvas,b,region.isDark,24);
      const {data}=await engine.recognize(crop,{}, {text:true,blocks:false});
      const cleaned=cleanOcrText(data.text||'',request.language);
      const initial=cleanOcrText(region.text||'',request.language);
      if(preferReread(region,{text:cleaned,confidence:data.confidence},request.language)){
        region.text=cleaned;region.confidence=data.confidence;
      }else if(initial){
        region.text=initial;
      }
      crop.width=crop.height=0;
    }
  }finally{await engine.setParameters({tessedit_pageseg_mode:'11'});}
  // Natural comic reading order: top-to-bottom, left-to-right
  merged.sort((a,b)=>{
    const dy = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(dy) < 35) return a.bbox.x0 - b.bbox.x0;
    return dy;
  });
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
