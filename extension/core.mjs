export const LANGUAGES = {kor:'ko',jpn:'ja',chi_sim:'zh-CN',eng:'en'};
export const TARGET_LANGUAGES = {en:'English',es:'Spanish · Español',fr:'French · Français',id:'Indonesian · Bahasa Indonesia',pt:'Portuguese · Português',de:'German · Deutsch',hi:'Hindi · हिन्दी'};
export function targetLanguage(value = 'en') { return Object.hasOwn(TARGET_LANGUAGES, value) ? value : 'en'; }
export function language(value) { if (!Object.hasOwn(LANGUAGES,value)) throw new Error('Choose a supported OCR language.'); return value; }
export function cropRect(rect, viewport) {
  if (!rect || !viewport || ![rect.x,rect.y,rect.width,rect.height,viewport.width,viewport.height].every(Number.isFinite)) throw new Error('Invalid capture rectangle.');
  if (viewport.width <= 0 || viewport.height <= 0) throw new Error('Invalid viewport.');
  const x=Math.max(0,rect.x), y=Math.max(0,rect.y);
  const width=Math.min(viewport.width,rect.x+rect.width)-x, height=Math.min(viewport.height,rect.y+rect.height)-y;
  if (width<8 || height<8) throw new Error('Select a visible area at least 8 × 8 pixels.');
  return {x,y,width,height};
}
export function imageUrl(value) {
  const u=new URL(value);
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password) throw new Error('This image needs screen capture.');
  return u.href;
}
export function translationText(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('No text to translate.');
  if (value.length>3000) throw new Error('Select a smaller speech bubble (maximum 3,000 text characters).');
  return value.trim();
}
export function parseTranslation(data) {
  if (!Array.isArray(data?.[0])) throw new Error('Translation service returned an unexpected response.');
  const text=data[0].map(x=>typeof x?.[0]==='string'?x[0]:'').join('').trim();
  if (!text) throw new Error('Translation service returned no text.');
  return text;
}
export function tiles(width,height,maxHeight=1800,overlap=120) {
  const out=[]; for(let y=0;y<height;) { const h=Math.min(maxHeight,height-y);out.push({x:0,y,width,height:h}); if(y+h>=height)break;y+=h-overlap; } return out;
}
export function mergeLines(regions) {
  const rows=[];
  for(const region of [...regions].sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0)) {
    const b=region.bbox,h=b.y1-b.y0;
    const row=rows.find(r=>{
      const a=r.bbox,ah=a.y1-a.y0;
      const overlap=Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0);
      const gap=Math.max(b.x0-a.x1,a.x0-b.x1,0);
      return overlap/Math.min(h,ah)>0.65 && gap<Math.max(h,ah)*1.4;
    });
    if(!row){rows.push({...region,bbox:{...b}});continue;}
    row.text=b.x0<row.bbox.x0?`${region.text} ${row.text}`:`${row.text} ${region.text}`;
    row.confidence=Math.min(row.confidence,region.confidence);
    row.bbox={x0:Math.min(row.bbox.x0,b.x0),y0:Math.min(row.bbox.y0,b.y0),x1:Math.max(row.bbox.x1,b.x1),y1:Math.max(row.bbox.y1,b.y1)};
  }
  return rows;
}
export function isDuplicate(a,b) {
  const overlapX=Math.max(0,Math.min(a.bbox.x1,b.bbox.x1)-Math.max(a.bbox.x0,b.bbox.x0));
  const overlapY=Math.max(0,Math.min(a.bbox.y1,b.bbox.y1)-Math.max(a.bbox.y0,b.bbox.y0));
  const area=Math.min((a.bbox.x1-a.bbox.x0)*(a.bbox.y1-a.bbox.y0),(b.bbox.x1-b.bbox.x0)*(b.bbox.y1-b.bbox.y0));
  return area>0 && overlapX*overlapY/area>0.6;
}
