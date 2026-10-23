(() => {
  'use strict';
  if (window.__manhwaLensInstalled) return;
  window.__manhwaLensInstalled = true;
  const MAX_REGIONS = 100, MAX_TEXT = 3000;
  const state = {host:null, root:null, panel:null, status:null, list:null, overlays:null, selector:null, cleanup:null, generation:0, busy:false, visible:true, items:[], language:'kor', focus:null};
  const text = value => String(value ?? '').slice(0, 12000);
  function el(tag, value, className) { const node=document.createElement(tag); if(value!==undefined)node.textContent=text(value);if(className)node.className=className;return node; }
  function button(label, action) {const node=el('button',label);node.type='button';node.addEventListener('click',action);return node;}
  function ensureUI() {
    if(state.host?.isConnected)return;
    const host=el('div');host.setAttribute('data-manhwa-lens','');host.style.cssText='all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
    const root=host.attachShadow({mode:'open'});const style=el('style');style.textContent=`
:host{color-scheme:dark}*{box-sizing:border-box}[hidden]{display:none!important}button,textarea{font:inherit}button{background:#30213f;border:1px solid #695080;border-radius:8px;padding:8px 10px;color:#f4ecff;cursor:pointer}button:hover{background:#49315e}button:disabled{opacity:.55;cursor:wait}button:focus-visible,textarea:focus-visible{outline:2px solid #d8b5ff;outline-offset:3px}.panel{position:fixed;right:16px;top:16px;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:#191222;color:#eee6f8;border:1px solid #70508d;border-radius:16px;box-shadow:0 12px 50px #0008;pointer-events:auto;font:13px/1.5 system-ui,sans-serif;overflow:hidden}.head{padding:17px 18px 12px;background:linear-gradient(125deg,#362046,#20152e)}h2{font-size:17px;margin:0 0 4px}p{margin:5px 0}.sub{color:#baa6cc;font-size:11px}.actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.status{padding:12px 18px;margin:0;color:#d8c1ed;border-bottom:1px solid #3a294a;white-space:pre-wrap;overflow-wrap:anywhere}.list{overflow:auto;padding:0 16px 16px;overscroll-behavior:contain}.card{padding:14px 0;border-bottom:1px solid #3a294a}.card label{display:block;color:#bca1d0;font-size:11px;margin:4px 0}.card textarea{display:block;width:100%;min-height:72px;max-height:220px;resize:vertical;background:#100d17;color:#eee5f7;border:1px solid #59426b;border-radius:7px;padding:9px}.translated{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;color:#faf4ff}.error{color:#ffb6c6;white-space:pre-wrap;overflow-wrap:anywhere}.row{display:flex;gap:8px;align-items:center;margin-top:8px}.confidence{color:#ac98be;font-size:10px}.overlay{position:fixed;pointer-events:auto;background:#faf5ff;color:#241331;border:1px solid #8e64af;border-radius:7px;padding:6px 20px 6px 8px;box-shadow:0 2px 9px #0004;font:600 14px/1.35 system-ui,sans-serif;text-align:center;white-space:pre-wrap;overflow:auto;overflow-wrap:anywhere;max-height:260px;min-width:28px}.overlay button{position:absolute;right:0;top:0;border:0;border-radius:0 6px 0 5px;padding:0 4px;background:#e6d5f0;color:#503568;font:13px/18px system-ui}.selection{position:fixed;inset:0;pointer-events:auto;cursor:crosshair;touch-action:none;background:#130b201c}.selection.image{background:transparent}.box{position:fixed;border:2px solid #d4a1ff;background:#a473d326;pointer-events:none;box-shadow:0 0 0 9999px #08040c66}.hint{position:fixed;top:20px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);width:max-content;background:#221530;color:#f5edff;border:1px solid #a37ac3;border-radius:12px;padding:12px 16px;box-shadow:0 5px 25px #0006;font:13px/1.5 system-ui;pointer-events:auto}.hint button{margin-left:12px}`;
    style.textContent+=`.overlay{background:#fff;color:#18131d;border:0;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.12);padding:8px 12px;display:flex;align-items:center;justify-content:center;overflow:hidden;max-height:none;min-width:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-weight:600;line-height:1.28;letter-spacing:-0.01em;transition:opacity 0.15s ease,box-shadow 0.15s ease;cursor:pointer;-webkit-font-smoothing:antialiased}.overlay:active{opacity:0.2!important;box-shadow:none!important}.overlay.dark{background:rgba(14,11,18,0.96);color:#f8f6fc;box-shadow:0 4px 18px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2)}.overlay.dark button{background:#2e223c;color:#eee5f7}.overlay.dark:hover{outline:1px solid #c3a1f2}.overlay span{display:block;width:100%;min-width:0;flex-shrink:0;text-align:center;white-space:normal;overflow-wrap:anywhere;word-break:normal;pointer-events:none}.overlay:hover{outline:1px solid #a783db}.overlay button{opacity:0;background:#ede2fa;cursor:pointer}.overlay:hover button,.overlay:focus-within button{opacity:1}`;
    root.append(style);state.overlays=el('div');root.append(state.overlays);
    const panel=el('aside',undefined,'panel');panel.setAttribute('aria-label','Manhwa Lens transcript');const head=el('div',undefined,'head');head.append(el('h2','Manhwa Lens'),el('p','ENGLISH TRANSLATION · LOCAL OCR','sub'));const actions=el('div',undefined,'actions');
    const toggle=button('Hide translations',()=>{state.visible=!state.visible;state.overlays.hidden=!state.visible;if(state.visible)state.items.forEach(position);toggle.textContent=state.visible?'Hide translations':'Show translations';toggle.setAttribute('aria-pressed',String(!state.visible));});toggle.setAttribute('aria-pressed','false');
    actions.append(toggle,button('Remove all',clear),button('Close',clear));head.append(actions);state.status=el('p','Ready.','status');state.status.setAttribute('role','status');state.status.setAttribute('aria-live','polite');state.list=el('div',undefined,'list');panel.append(head,state.status,state.list);root.append(panel);state.panel=panel;state.host=host;state.root=root;document.documentElement.append(host);
  }
  function restoreFocus(){if(state.focus?.isConnected&&typeof state.focus.focus==='function')state.focus.focus({preventScroll:true});state.focus=null;}
  function cancelSelection(){state.cleanup?.();state.cleanup=null;state.selector?.remove();state.selector=null;if(state.panel)state.panel.hidden=false;if(state.overlays)state.overlays.hidden=!state.visible;}
  function clear(){state.generation++;state.busy=false;cancelSelection();state.host?.remove();state.host=null;state.items=[];state.visible=true;restoreFocus();}
  function say(message){ensureUI();state.status.textContent=text(message);}
  function plainRect(rect){return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};}
  function selection(mode,language){
    if(state.busy){say('A translation is still running. Please wait for it to finish.');return;}
    ensureUI();cancelSelection();state.language=['kor','jpn','chi_sim','eng'].includes(language)?language:'kor';state.focus=document.activeElement;state.panel.hidden=true;state.overlays.hidden=true;
    const surface=el('div',undefined,'selection'+(mode==='image'?' image':''));surface.tabIndex=0;surface.setAttribute('role','dialog');surface.setAttribute('aria-label',mode==='image'?'Choose a comic image':'Select a screen region');const hint=el('div',undefined,'hint');const hintText=el('span',mode==='image'?'Click a comic image. For backgrounds or canvas, use Select a region.':'Drag around a panel or speech bubble. Escape cancels.');hint.append(hintText,button('Cancel',()=>{cancelSelection();say('Selection cancelled.');restoreFocus();}));surface.append(hint);state.root.append(surface);state.selector=surface;surface.focus();
    let start=null;let box=null;let pointer=null;
    const key=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelSelection();say('Selection cancelled.');restoreFocus();}else if(['PageDown','PageUp','Home','End','ArrowDown','ArrowUp',' '].includes(event.key))event.preventDefault();};
    window.addEventListener('keydown',key,true);
    const stopScroll=event=>event.preventDefault();surface.addEventListener('wheel',stopScroll,{passive:false});
    const clampPoint=event=>({x:Math.max(0,Math.min(innerWidth,event.clientX)),y:Math.max(0,Math.min(innerHeight,event.clientY))});
    const region=point=>({x:Math.min(start.x,point.x),y:Math.min(start.y,point.y),width:Math.abs(point.x-start.x),height:Math.abs(point.y-start.y)});
    surface.addEventListener('pointerdown',event=>{if(event.button!==0||event.composedPath().includes(hint))return;event.preventDefault();event.stopPropagation();if(mode==='image')return;start=clampPoint(event);pointer=event.pointerId;surface.setPointerCapture(pointer);box?.remove();box=el('div',undefined,'box');surface.append(box);});
    surface.addEventListener('pointermove',event=>{if(!start||event.pointerId!==pointer)return;const rect=region(clampPoint(event));Object.assign(box.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});});
    surface.addEventListener('pointerup',event=>{if(mode!=='region'||!start||event.pointerId!==pointer)return;event.preventDefault();event.stopPropagation();const rect=region(clampPoint(event));start=null;if(rect.width<8||rect.height<8){box?.remove();hintText.textContent='That area is too small. Drag a larger rectangle around the text.';return;}state.targetImage=null;process({mode:'region',rect});});
    surface.addEventListener('pointercancel',()=>{start=null;box?.remove();});
    surface.addEventListener('click',event=>{if(event.composedPath().includes(hint))return;event.preventDefault();event.stopPropagation();if(mode!=='image')return;surface.style.display='none';let target=document.elementFromPoint(event.clientX,event.clientY);while(target?.shadowRoot){const next=target.shadowRoot.elementFromPoint?.(event.clientX,event.clientY);if(!next||next===target)break;target=next;}surface.style.display='';const img=target?.closest?.('img');if(!img||!(img.currentSrc||img.src)){hintText.textContent='No image found there. Try the comic itself, or cancel and use Select a region for backgrounds and canvas.';return;}const rect=plainRect(img.getBoundingClientRect());if(rect.width<=0||rect.height<=0){hintText.textContent='This image has no visible size. Use Select a region instead.';return;}state.targetImage=img;process({mode:'image',url:img.currentSrc||img.src,rect});});
    state.cleanup=()=>window.removeEventListener('keydown',key,true);
  }
  async function process(payload){
    const generation=++state.generation;state.busy=true;cancelSelection();say('Preparing image…');const language=state.language;const message={type:'PROCESS',...payload,viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},language};
    state.host.style.setProperty('display','none','important');
    try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(generation!==state.generation)return;const response=await chrome.runtime.sendMessage(message);if(generation!==state.generation)return;state.host.style.removeProperty('display');if(!response?.ok)throw new Error(response?.error||'No result was returned. Please try again.');render(response,language);}
    catch(error){if(generation===state.generation){state.host?.style.removeProperty('display');say(error.message||String(error));}}
    finally{if(generation===state.generation)state.busy=false;}
  }
  function position(item){
    const {bbox,width,height}=item;
    const rect=item.imageElement?.isConnected?item.imageElement.getBoundingClientRect():null;
    const anchor=rect?{x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height}:item.anchor;
    const sx=anchor.width/width,sy=anchor.height/height;
    const w=(bbox.x1-bbox.x0)*sx,h=(bbox.y1-bbox.y0)*sy;
    Object.assign(item.overlay.style,{left:(anchor.x+bbox.x0*sx-scrollX)+'px',top:(anchor.y+bbox.y0*sy-scrollY)+'px',width:w+'px',height:h+'px',minHeight:'0',maxHeight:'none',overflow:'hidden',alignItems:'center'});
    item.overlay.hidden=false;
    // Hidden containers have no layout. Showing translations runs position again.
    if(state.overlays.hidden)return;
    const css=getComputedStyle(item.overlay);
    const paddingX=parseFloat(css.paddingLeft)+parseFloat(css.paddingRight);
    const paddingY=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom);
    const fits=()=>item.copy.scrollHeight<=item.overlay.clientHeight-paddingY+1&&item.copy.scrollWidth<=item.overlay.clientWidth-paddingX+1;
    const minFont=14;
    let size=Math.max(minFont,Math.floor(Math.min(28,Math.max(16,Math.sqrt(w*h/Math.max(1,item.copy.textContent.length))*1.35))));
    item.copy.style.fontSize=size+'px';
    while(size>minFont&&!fits()){size--;item.copy.style.fontSize=size+'px';}
    // OCR boxes describe source glyphs, not the space required by English.
    // Preserve readable text by growing the box; cap very long copies with a
    // scrollable, top-aligned surface instead of hiding or clipping the text.
    if(!fits()){
      const maxHeight=Math.max(64,innerHeight-32);
      Object.assign(item.overlay.style,{width:Math.max(w,96)+'px',height:'auto',minHeight:Math.min(h,maxHeight)+'px',maxHeight:maxHeight+'px',overflow:'auto',alignItems:'flex-start'});
      item.overlay.tabIndex=0;
    }else item.overlay.removeAttribute('tabindex');
  }
  function render(response,language){
    const {result,anchor}=response;if(!result||!Array.isArray(result.regions)||![result.width,result.height,anchor?.x,anchor?.y,anchor?.width,anchor?.height].every(Number.isFinite)||result.width<=0||result.height<=0||anchor.width<=0||anchor.height<=0)throw new Error('The OCR result has invalid dimensions.');
    state.items=[];state.overlays.replaceChildren();state.list.replaceChildren();const regions=result.regions.slice(0,MAX_REGIONS);say([regions.length?`${regions.length} text regions. Edit recognized text below to improve a translation.`:'No text found. Try a closer crop or a different source language.',text(response.warning)].filter(Boolean).join('\n'));
    regions.forEach((region,index)=>{
      const card=el('section',undefined,'card');const label=el('label',`Recognized text · ${index+1}`);const input=el('textarea');input.value=text(region.text);input.maxLength=MAX_TEXT;input.id='ml-ocr-'+index;label.htmlFor=input.id;const translated=el('p',region.translation||'No translation available.','translated');const error=el('p',region.error||'','error');error.setAttribute('role','status');const row=el('div',undefined,'row');let item=null;
      const bbox=region.bbox;if(region.translation&&bbox&&[bbox.x0,bbox.y0,bbox.x1,bbox.y1].every(Number.isFinite)&&bbox.x1>bbox.x0&&bbox.y1>bbox.y0){const clipped={x0:Math.max(0,Math.min(result.width,bbox.x0)),y0:Math.max(0,Math.min(result.height,bbox.y0)),x1:Math.max(0,Math.min(result.width,bbox.x1)),y1:Math.max(0,Math.min(result.height,bbox.y1))};const overlay=el('div',undefined,'overlay'+(region.isDark?' dark':''));overlay.title='Press and hold to peek at original art';if(!region.isDark&&Number.isFinite(region.bgR)&&(region.bgR<242||region.bgG<242||region.bgB<242)){overlay.style.backgroundColor=`rgb(${region.bgR},${region.bgG},${region.bgB})`;}const copy=el('span',region.translation||region.text||'No text');overlay.append(copy,button('×',()=>{overlay.remove();state.items=state.items.filter(entry=>entry!==item);}));overlay.lastChild.setAttribute('aria-label',`Remove translation ${index+1}`);overlay.setAttribute('aria-label',`Translation ${index+1}`);state.overlays.append(overlay);item={overlay,copy,anchor,bbox:clipped,width:result.width,height:result.height,imageElement:response.warning?null:state.targetImage};state.items.push(item);position(item);}
      const retry=button('Translate edited text',async()=>{const source=input.value.trim();if(!source){error.textContent='Enter recognized text first.';input.focus();return;}const generation=state.generation;retry.disabled=true;error.textContent='Translating…';try{const response=await chrome.runtime.sendMessage({type:'TRANSLATE',text:source,language});if(generation!==state.generation)return;if(!response?.ok)throw new Error(response?.error||'Translation unavailable.');translated.textContent=text(response.text);if(item){item.copy.textContent=text(response.text);position(item);}error.textContent='';}catch(err){if(generation===state.generation)error.textContent=text(err.message||err);}finally{retry.disabled=false;}});const copyBtn=button('Copy',async()=>{try{await navigator.clipboard.writeText(region.translation||input.value);copyBtn.textContent='Copied!';setTimeout(()=>copyBtn.textContent='Copy',1500);}catch{}});row.append(retry,copyBtn);if(Number.isFinite(region.confidence))row.append(el('span',`${Math.round(region.confidence)}% OCR`,'confidence'));card.append(label,input,translated,error,row);state.list.append(card);
    });state.overlays.hidden=!state.visible;
  }
  let frame=0;function reposition(){if(frame||!state.items.length)return;frame=requestAnimationFrame(()=>{frame=0;state.items.forEach(position);});}window.addEventListener('scroll',reposition,{passive:true,capture:true});window.addEventListener('resize',reposition,{passive:true});
  chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
    if(message?.type==='SELECT'){selection(message.mode==='image'?'image':'region',message.language);sendResponse({ok:true});}
    else if(message?.type==='CLEAR'){clear();sendResponse({ok:true});}
    else if(message?.type==='TOGGLE'){state.visible=!state.visible;state.overlays.hidden=!state.visible;if(state.visible)state.items.forEach(position);sendResponse({ok:true});}
    else if(message?.type==='PROGRESS'&&state.busy&&state.host){state.host.style.removeProperty('display');say(message.message||'Working…');sendResponse({ok:true});}
  });
  window.addEventListener('keydown',e=>{
    const a=document.activeElement;if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable))return;
    const isX=e.key==='x'||e.key==='X'||e.code==='KeyX';
    const isZ=e.key==='z'||e.key==='Z'||e.code==='KeyZ';
    const isC=e.key==='c'||e.key==='C'||e.code==='KeyC';
    if((e.altKey&&isX)||(e.ctrlKey&&e.shiftKey&&isX)){
      e.preventDefault();e.stopPropagation();selection('region',state.language);
    }else if(e.altKey&&isZ){
      e.preventDefault();e.stopPropagation();state.visible=!state.visible;state.overlays.hidden=!state.visible;if(state.visible)state.items.forEach(position);
    }else if(e.altKey&&isC){
      e.preventDefault();e.stopPropagation();clear();
    }
  },true);
})();
