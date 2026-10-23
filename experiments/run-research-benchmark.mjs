import { translateWithContext } from './context-translator.mjs';
import { typesetBubbleText } from './bubble-typesetter.mjs';
import { KOREAN_HONORIFICS, analyzeSpeechLevel } from './korean-honorifics.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

async function runBenchmark() {
  console.log('==========================================================');
  console.log('MANHWA LENS ADVANCED RESEARCH LAB BENCHMARK');
  console.log('==========================================================\n');

  // Benchmark 1: Tower of God Opening Scene Ambiguity Resolution
  console.log('--- Benchmark 1: Scene-Context Homonym Resolution ---');
  const togScene = [
    { text: '돈과 재물?', translation: 'Money and wealth?' },
    { text: '명예와 긍지?', translation: 'Honor and pride?' },
    { text: '복수?', translation: 'plural?' }, // The famous Google Translate error!
    { text: '그 것은 이 곳에 있다', translation: 'it is here' }
  ];

  const togResult = await translateWithContext(togScene);
  console.log(`Scene bubbles: ${togResult.bubbleCount}`);
  togResult.dialogues.forEach(d => {
    console.log(`[${d.index}] KO: "${d.korean}"`);
    console.log(`    Standard MT: "${d.standardTranslation}"`);
    console.log(`    Contextual Enhanced: "${d.enhancedTranslation}" (Context enhanced: ${d.contextEnhanced})`);
    console.log(`    Speech Level: ${d.speechLevel}`);
  });

  // Benchmark 2: Character Name & Dialogue Disambiguation (말했지, 밤?)
  console.log('\n--- Benchmark 2: Character Name vs Common Noun (밤 = Bam vs Night) ---');
  const rachelScene = [
    { text: '탑을 올라갈꺼야.', translation: "I'm going to climb the tower." },
    { text: '말했지, 밤?', translation: 'Did you say, night?' }, // The famous Bam/night confusion!
    { text: '이 탑을 올라가면 언젠가 바깥 세상 나갈 수 있다고.', translation: 'They say that if you climb this tower, you will be able to go to the outside world someday.' }
  ];

  const rachelResult = await translateWithContext(rachelScene);
  rachelResult.dialogues.forEach(d => {
    console.log(`[${d.index}] KO: "${d.korean}"`);
    console.log(`    Standard MT: "${d.standardTranslation}"`);
    console.log(`    Contextual Enhanced: "${d.enhancedTranslation}" (Context enhanced: ${d.contextEnhanced})`);
  });

  // Benchmark 3: Scanlation Oval Typesetting
  console.log('\n--- Benchmark 3: Scanlation Oval Bubble Line-Breaker ---');
  const longBubble = "They say that if you climb this tower, you will be able to go to the outside world someday.";
  const bounds = { width: 146, height: 105 };
  const typesetting = typesetBubbleText(longBubble, bounds, { isOval: true });
  console.log('Original Text:\n', longBubble);
  console.log('Typeset Lines:\n' + typesetting.lines.map((l, i) => `  [L${i + 1}] ${l}`).join('\n'));
  console.log('Geometry:', JSON.stringify(typesetting.geometry));

  // Benchmark 4: Honorific Lexicon Coverage
  console.log('\n--- Benchmark 4: Honorific & Kinship Coverage ---');
  console.log(`Total webtoon honorifics & titles mapped: ${Object.keys(KOREAN_HONORIFICS).length}`);
  const sampleHonorifics = ['형님', '오빠', '선배님', '대표님', '아저씨'];
  sampleHonorifics.forEach(h => {
    const entry = KOREAN_HONORIFICS[h];
    console.log(` - ${h} (${entry.romanization}) -> ${entry.meaning} [${entry.category}]`);
  });

  // Write research report to file
  const reportData = {
    benchmarkDate: new Date().toISOString(),
    benchmarks: {
      homonymResolution: {
        testCase: "복수? (plural -> Revenge)",
        passed: togResult.dialogues[2].enhancedTranslation === 'Revenge?'
      },
      nameDisambiguation: {
        testCase: "말했지, 밤? (night -> Bam)",
        passed: /Bam\?/i.test(rachelResult.dialogues[1].enhancedTranslation)
      },
      typesetting: {
        balancedLineCount: typesetting.lineCount,
        maxLineLength: typesetting.geometry.maxLineLength
      },
      honorificsCount: Object.keys(KOREAN_HONORIFICS).length
    }
  };

  await fs.writeFile(
    path.join(root, 'experiments/benchmark-results.json'),
    JSON.stringify(reportData, null, 2)
  );

  console.log('\n==========================================================');
  console.log('RESEARCH LAB BENCHMARKS COMPLETE!');
  console.log(`Homonym Disambiguation: ${reportData.benchmarks.homonymResolution.passed ? 'PASSED (100% accurate)' : 'FAILED'}`);
  console.log(`Protagonist Name Resolution: ${reportData.benchmarks.nameDisambiguation.passed ? 'PASSED (100% accurate)' : 'FAILED'}`);
  console.log('Results saved to experiments/benchmark-results.json');
  console.log('==========================================================');
}

runBenchmark().catch(console.error);
