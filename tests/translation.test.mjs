import test,{after} from 'node:test';
import assert from 'node:assert/strict';
let listener;
const originalFetch=globalThis.fetch;
globalThis.chrome={runtime:{id:'test-extension',onMessage:{addListener(fn){listener=fn;}},sendMessage:async()=>{}}};
await import('../extension/offscreen.js');
after(()=>{globalThis.fetch=originalFetch;delete globalThis.chrome;});
const translate=(text,language='kor')=>new Promise(resolve=>listener({target:'offscreen',type:'TRANSLATE',text,language},{id:'test-extension'},resolve));
test('provider receives only text query and no credentials; success is cached',async()=>{
 let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.equal(url.origin,'https://translate.googleapis.com');assert.equal(url.searchParams.get('tl'),'en');assert.equal(url.searchParams.get('q'),'테스트');assert.equal(options.credentials,'omit');return Response.json([[['test']]]);};
 assert.deepEqual(await translate('테스트'),{ok:true,text:'test'});assert.deepEqual(await translate('테스트'),{ok:true,text:'test'});assert.equal(calls,1);
});
test('HTTP 429 surfaces a retryable quota error without caching failure',async()=>{
 globalThis.fetch=async()=>new Response('limit',{status:429});const failed=await translate('한국어 quota');assert.equal(failed.ok,false);assert.match(failed.error,/temporarily busy/);
 globalThis.fetch=async()=>Response.json([[['recovered']]]);assert.deepEqual(await translate('한국어 quota'),{ok:true,text:'recovered'});
});
test('malformed provider payload produces error',async()=>{globalThis.fetch=async()=>Response.json({bad:true});const result=await translate('한국어 bad');assert.equal(result.ok,false);assert.match(result.error,/temporarily busy/);});
test('network failure is actionable and preserves caller text',async()=>{globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};const result=await translate('한국어 network');assert.equal(result.ok,false);assert.match(result.error,/temporarily busy/);});
test('pure ASCII and numbers bypass network entirely',async()=>{globalThis.fetch=async()=>{throw new Error('Unexpected network access');};assert.deepEqual(await translate('19'),{ok:true,text:'19'});assert.deepEqual(await translate('ARR'),{ok:true,text:'ARR'});});
test('HTTP 500 falls back without caching the failed primary response',async()=>{
 let calls=0;globalThis.fetch=async()=>++calls===1?new Response('server error',{status:500}):Response.json([[['A recovered translation']]]);
 assert.deepEqual(await translate('오류 복구'),{ok:true,text:'A recovered translation'});assert.equal(calls,2);
});
test('community fallback accepts only successful translated responses',async()=>{
 globalThis.fetch=async url=>url.hostname==='api.mymemory.translated.net'?Response.json({responseStatus:200,responseData:{translatedText:'Community result'}}):new Response('busy',{status:500});
 assert.deepEqual(await translate('대체 번역'),{ok:true,text:'Community result'});
});
test('community quota error is never displayed as an English translation',async()=>{
 globalThis.fetch=async url=>url.hostname==='api.mymemory.translated.net'?Response.json({responseStatus:429,quotaFinished:true,responseData:{translatedText:'Daily limit exceeded'}}):new Response('busy',{status:500});
 assert.equal((await translate('할당량 오류')).ok,false);
});
test('English OCR mode avoids any translation network request',async()=>{globalThis.fetch=async()=>{throw new Error('Unexpected network access');};assert.deepEqual(await translate('Hello','eng'),{ok:true,text:'Hello'});});
