import {mergeLines} from './core.mjs';

// Conservative speech-bubble mode. Never use confidence alone to cover artwork.
export function lightFraction(pixels,width,height,bbox) {
  const x0=Math.max(0,Math.floor(bbox.x0)),y0=Math.max(0,Math.floor(bbox.y0));
  const x1=Math.min(width,Math.ceil(bbox.x1)),y1=Math.min(height,Math.ceil(bbox.y1));
  let light=0,total=0;
  for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){const i=(y*width+x)*4;const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(Math.min(r,g,b)>=235&&Math.max(r,g,b)-Math.min(r,g,b)<24)light++;total++;}
  return total?light/total:0;
}
export function isReadable(region,lang,light) {
  const scripts={kor:/[\uAC00-\uD7A3]/g,jpn:/[\u3040-\u30ff\u3400-\u9fff]/g,chi_sim:/[\u3400-\u9fff]/g,eng:/[a-zA-Z]/g};
  const count=(region.text.match(scripts[lang])||[]).length;
  const h=region.bbox.y1-region.bbox.y0;
  return h>=10&&light>=0.50&&region.confidence>=45&&(count>=2||(count===1&&region.confidence>=85&&light>=0.75));
}
export function bubbleGroups(regions,pixels,width,height) {
  const rows=mergeLines(regions),groups=[];
  for(const row of rows.sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0)){
    const b=row.bbox,bh=b.y1-b.y0;
    const group=groups.find(g=>{
      const a=g.bbox,ah=g.lineHeight,gap=b.y0-a.y1;
      const overlap=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0);
      const between={x0:Math.max(a.x0,b.x0),x1:Math.min(a.x1,b.x1),y0:Math.min(a.y1,b.y0),y1:Math.max(a.y1,b.y0)+1};
      return gap>=-Math.min(ah,bh)*0.45&&gap<=Math.max(ah,bh)*1.1&&overlap/Math.min(a.x1-a.x0,b.x1-b.x0)>0.45&&lightFraction(pixels,width,height,between)>0.8;
    });
    if(!group){groups.push({...row,bbox:{...b},lineHeight:bh});continue;}
    group.text+='\n'+row.text;group.confidence=Math.min(group.confidence,row.confidence);
    group.bbox={x0:Math.min(group.bbox.x0,b.x0),y0:Math.min(group.bbox.y0,b.y0),x1:Math.max(group.bbox.x1,b.x1),y1:Math.max(group.bbox.y1,b.y1)};
    group.lineHeight=Math.min(group.lineHeight,bh);
  }
  return groups.map(g=>{
    const b=g.bbox,pad=Math.min(16,Math.max(6,g.lineHeight*.18));
    const padded={x0:Math.max(0,Math.floor(b.x0-pad)),y0:Math.max(0,Math.floor(b.y0-pad)),x1:Math.min(width,Math.ceil(b.x1+pad)),y1:Math.min(height,Math.ceil(b.y1+pad))};
    return {...g,bbox:lightFraction(pixels,width,height,padded)>=.65?padded:b};
  });
}
