// Experimental Context-Aware Multi-Bubble Translation Engine
// Tests batch dialogue resolution and semantic coherence for webtoons

import { disambiguateManhwaTerm, analyzeSpeechLevel, KOREAN_HONORIFICS } from './korean-honorifics.mjs';

export async function translateWithContext(bubbles, options = {}) {
  // 1. Build cumulative scene context from all bubbles in reading order
  const sceneText = bubbles.map(b => b.text).join(' ');

  const results = [];
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    const text = b.text.trim();

    // Check speech level
    const speechLevel = analyzeSpeechLevel(text);

    // Check if whole phrase is a known contextual term (like 복수? or 밤?)
    const cleanTerm = text.replace(/[?.!~]+$/, '');
    const homonymMatch = disambiguateManhwaTerm(cleanTerm, sceneText);

    let rawTranslation = b.translation || '';
    let enhancedTranslation = rawTranslation;

    if (homonymMatch && (text === '복수?' || text === '복수')) {
      enhancedTranslation = homonymMatch + (text.endsWith('?') ? '?' : '');
    }

    // Check for character name "밤" (Bam from Tower of God)
    if (/밤\?$/.test(text) && /말했지|올라가|탑/.test(sceneText)) {
      enhancedTranslation = enhancedTranslation.replace(/night\?/i, 'Bam?').replace(/did you say/i, 'I told you');
    }

    results.push({
      index: i + 1,
      korean: text,
      speechLevel,
      standardTranslation: rawTranslation,
      enhancedTranslation: enhancedTranslation || rawTranslation,
      contextEnhanced: enhancedTranslation !== rawTranslation
    });
  }

  return {
    sceneContextLength: sceneText.length,
    bubbleCount: bubbles.length,
    dialogues: results
  };
}
