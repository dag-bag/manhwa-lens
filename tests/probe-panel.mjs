import {createWorker} from 'tesseract.js';
import path from 'node:path';
const worker=await createWorker('kor',1,{langPath:path.resolve('dist/manhwa-lens/vendor/lang'),gzip:true});
for(const psm of [11,6]){await worker.setParameters({tessedit_pageseg_mode:String(psm)});const {data}=await worker.recognize('tests/fixtures/user-korean-panel.png',{}, {blocks:true});console.log(JSON.stringify({psm,text:data.text,blocks:data.blocks?.map(b=>({text:b.text,confidence:b.confidence,bbox:b.bbox,paragraphs:b.paragraphs?.map(p=>({text:p.text,confidence:p.confidence,bbox:p.bbox}))}))},null,2));}
await worker.terminate();
