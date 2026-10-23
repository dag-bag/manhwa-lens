import test from 'node:test';
import assert from 'node:assert/strict';
import {lightFraction,isReadable,bubbleGroups,cleanOcrText} from '../extension/ocr-layout.mjs';
const pixels=new Uint8ClampedArray(400*300*4).fill(255);
const r=(text,x,y,w=120,h=30,confidence=90)=>({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+h},confidence});
test('rejects ASCII art noise in Korean OCR despite high confidence',()=>{assert.equal(isReadable(r('ARR',10,10),'kor',1),false);assert.equal(isReadable(r('19',10,10),'kor',1),false);assert.equal(isReadable(r('남자 전용',10,10),'kor',.85),true);});
test('rejects background art and low confidence without trusting OCR percentage',()=>{assert.equal(isReadable(r('배',10,10,20,30,37),'kor',.2),false);assert.equal(isReadable(r('일',10,10,30,60,90),'kor',.3),false);});
test('merges nearby speech lines but not separated speech bubbles',()=>{const groups=bubbleGroups([r('남자 전용',100,30),r('사우나는 정말',70,75,170),r('할 일이 많구나',70,120,170),r('다른 말',70,245,170)],pixels,400,300);assert.equal(groups.length,2);assert.match(groups[0].text,/남자 전용\n사우나는 정말\n할 일이 많구나/);});
test('dark border prevents separate bubbles merging',()=>{const copy=pixels.slice();for(let y=65;y<76;y++)for(let x=0;x<400;x++){const i=(y*400+x)*4;copy[i]=copy[i+1]=copy[i+2]=0;}const groups=bubbleGroups([r('첫 말',70,30),r('둘 말',70,80)],copy,400,300);assert.equal(groups.length,2);});
test('empty or out-of-bounds background sample is not treated as white',()=>assert.equal(lightFraction(pixels,400,300,{x0:450,y0:0,x1:500,y1:20}),0));
test('cleanOcrText repairs common Hangul OCR misrecognitions and normalizes punctuation',()=>{
  assert.equal(cleanOcrText('낙자 저요','kor'),'남자 전용');
  assert.equal(cleanOcrText('할 일0 많구나.','kor'),'할 일이 많구나.');
  assert.equal(cleanOcrText('사우나는 . . . 정말','kor'),'사우나는... 정말');
  assert.equal(cleanOcrText('| 남자 전용 사우나는... -- |','kor'),'남자 전용 사우나는...');
  assert.equal(cleanOcrText('뿔 는 또 이딴거 처올렸네 변태노예념이','kor'),'또 이딴거 처올렸네 변태노예년이');
});
test('accepts off-white / light-gray chat boxes and square narrative bubbles',()=>{
  const grayPixels = new Uint8ClampedArray(400*300*4);
  // Fill with typical manhwa chat-bubble gray RGB(218, 210, 216)
  for (let i = 0; i < grayPixels.length; i += 4) {
    grayPixels[i] = 218; grayPixels[i+1] = 210; grayPixels[i+2] = 216; grayPixels[i+3] = 255;
  }
  const light = lightFraction(grayPixels, 400, 300, { x0: 50, y0: 50, x1: 250, y1: 150 });
  assert(light >= 0.8, `Expected light fraction >= 0.8 on gray chat bubble, got ${light}`);
  assert.equal(isReadable(r('또 이딴거 처올렸네', 50, 50, 200, 30), 'kor', light), true);
});
