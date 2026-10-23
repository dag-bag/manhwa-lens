import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const report=JSON.parse(await fs.readFile(new URL('../test-output/batch-test-report.json',import.meta.url),'utf8'));
assert.equal(report.results.length,14,'all 14 original crops must be processed');
for(const row of report.results){
 assert.equal(row.failure,null,`${row.panel}: runner failed`);
 const successful=row.cards.filter(c=>c.english&&c.english!=='No translation available.'&&!c.error).length;
 assert.equal(row.visibleOverlays,successful,`${row.panel}: translated regions must have visible overlays`);
}
for(const [panel,phrase] of [['chapter-1/ch1_panel_01.png','돈과 재물'],['chapter-1/ch1_panel_02.png','명예와 긍지'],['chapter-1/ch1_panel_03.png','복수'],['chapter-1/ch1_panel_04.png','그 모든 것을 초월한 어떤 것'],['chapter-1/ch1_panel_05.png','그 것은 이 곳에 있다']]){
 const row=report.results.find(r=>r.panel===panel);
 assert.ok(row.cards.some(c=>c.korean.includes(phrase)),`${panel}: missing independently transcribed narration '${phrase}'`);
}
assert.equal(report.results.find(r=>r.panel==='chapter-2/ch2_panel_01.png').cards.length,0,'visually text-free canyon should not yield hallucinated text');
console.log('PASS 14-image batch integrity, visible translations, five narration fixtures and blank-art control. This does not assert sound-effect or translation accuracy.');
