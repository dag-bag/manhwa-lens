import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const dest=path.join(root,'dist','manhwa-lens');
await fs.mkdir(dest,{recursive:true});
await fs.cp(path.join(root,'extension'),dest,{recursive:true});
const vendor=path.join(dest,'vendor');await fs.mkdir(path.join(vendor,'core'),{recursive:true});await fs.mkdir(path.join(vendor,'lang'),{recursive:true});
const tess=path.dirname(require.resolve('tesseract.js/package.json'));
const core=path.dirname(createRequire(path.join(tess,'package.json')).resolve('tesseract.js-core/package.json'));
for(const file of ['tesseract.min.js','worker.min.js'])await fs.copyFile(path.join(tess,'dist',file),path.join(vendor,file));
for(const file of await fs.readdir(core))if(/\.wasm(\.js)?$/.test(file))await fs.copyFile(path.join(core,file),path.join(vendor,'core',file));
for(const [dir,name] of [[tess,'TESSERACT-JS'],[core,'TESSERACT-CORE']]) {
  const license=(await fs.readdir(dir)).find(x=>/^license/i.test(x));if(license)await fs.copyFile(path.join(dir,license),path.join(vendor,`${name}-LICENSE`));
}
const hashes=[];
for(const lang of ['kor','eng','jpn','chi_sim']){
  const file=path.join(vendor,'lang',`${lang}.traineddata.gz`);
  try{await fs.access(file);}catch{
    const url=`https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}@1.0.0/4.0.0_best_int/${lang}.traineddata.gz`;
    const response=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error(`Model download failed: ${response.status} ${url}`);
    const buffer=Buffer.from(await response.arrayBuffer());if(buffer[0]!==31||buffer[1]!==139)throw new Error('Invalid model gzip');await fs.writeFile(file,buffer);
  }
  hashes.push({file:`vendor/lang/${lang}.traineddata.gz`,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});
}
await fs.writeFile(path.join(dest,'MODEL-HASHES.json'),JSON.stringify(hashes,null,2));
await fs.writeFile(path.join(dest,'THIRD-PARTY-NOTICES.txt'),'Tesseract.js 7.0.0 and Tesseract.js-core 7.0.0: Apache-2.0.\nhttps://github.com/naptha/tesseract.js\nhttps://github.com/naptha/tesseract.js-core\nOCR model data: @tesseract.js-data/{kor,eng,jpn,chi_sim}@1.0.0, 4.0.0_best_int. Apache-2.0 (Tesseract tessdata).\nhttps://github.com/naptha/tessdata\nhttps://github.com/tesseract-ocr/tessdata_best\nGoogle Translate free web endpoint is an external service, not affiliated with this extension.\n');
for(const name of ['README.md','TEST-RESULTS.md','LICENSE']){try{await fs.copyFile(path.join(root,name),path.join(dest,name));}catch{}}
console.log(`Built ${dest}`);
