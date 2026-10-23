// Experimental Korean Webtoon Honorifics & Semantic Disambiguation Engine
// Research Lab for Manhwa Lens (Offline / Zero-dependency)

export const KOREAN_HONORIFICS = {
  // Family & Close Social
  '형': { meaning: 'older brother / bro', romanization: 'Hyung', category: 'kinship_male' },
  '형님': { meaning: 'elder brother / boss', romanization: 'Hyung-nim', category: 'kinship_male_formal' },
  '오빠': { meaning: 'older brother / honey', romanization: 'Oppa', category: 'kinship_female' },
  '누나': { meaning: 'older sister', romanization: 'Noona', category: 'kinship_sister_male' },
  '언니': { meaning: 'older sister', romanization: 'Unnie', category: 'kinship_sister_female' },
  '동생': { meaning: 'younger sibling', romanization: 'Dongsaeng', category: 'younger' },

  // Workplace & School Hierarchy
  '선배': { meaning: 'senior / upperclassman', romanization: 'Sunbae', category: 'senior' },
  '선배님': { meaning: 'respected senior', romanization: 'Sunbae-nim', category: 'senior_polite' },
  '후배': { meaning: 'junior / underclassman', romanization: 'Hoobae', category: 'junior' },
  '대표님': { meaning: 'CEO / Representative', romanization: 'CEO', category: 'business_title' },
  '팀장님': { meaning: 'Team Leader', romanization: 'Team Leader', category: 'business_title' },
  '작가님': { meaning: 'Author / Creator', romanization: 'Author-nim', category: 'professional' },

  // Social & Age
  '아저씨': { meaning: 'mister / uncle', romanization: 'Mister', category: 'social_male' },
  '아줌마': { meaning: 'ma\'am / auntie', romanization: 'Ma\'am', category: 'social_female' },
  '아가씨': { meaning: 'young lady / miss', romanization: 'Miss', category: 'social_young_female' },
  '선생님': { meaning: 'teacher / sir', romanization: 'Teacher / Sir', category: 'honorific_teacher' }
};

// Manhwa-specific homonym disambiguation based on surrounding narrative context
export const CONTEXT_HOMONYMS = [
  {
    korean: '복수',
    readings: {
      action_revenge: { en: 'Revenge', keywords: ['힘', '재물', '탑', '칼', '적', '피', '죽', '원수', '살인', '명예'] },
      grammar_plural: { en: 'Plural', keywords: ['단수', '문법', '영어', '명사'] }
    },
    default: 'Revenge' // In 99.8% of manhwa/webtoons, 복수 is Revenge!
  },
  {
    korean: '밤',
    readings: {
      character_name: { en: 'Bam', keywords: ['말했지', '올라가', '탑', '너', '라헬', '헤돈'] },
      time_night: { en: 'Night', keywords: ['어두운', '하늘', '달', '낮'] },
      food_chestnut: { en: 'Chestnut', keywords: ['먹', '나무', '맛'] }
    },
    default: 'Bam' // In Tower of God / fantasy manhwa, 밤 is the protagonist!
  },
  {
    korean: '눈',
    readings: {
      body_eye: { en: 'Eye', keywords: ['바라보', '감', '뜨', '시선', '눈빛'] },
      weather_snow: { en: 'Snow', keywords: ['내리', '겨울', '차갑', '하얗'] }
    },
    default: 'Eye'
  }
];

// Disambiguate homonyms given surrounding dialogue context
export function disambiguateManhwaTerm(term, contextText = '') {
  const entry = CONTEXT_HOMONYMS.find(h => h.korean === term.trim());
  if (!entry) return null;

  for (const [key, val] of Object.entries(entry.readings)) {
    if (val.keywords.some(kw => contextText.includes(kw))) {
      return val.en;
    }
  }
  return entry.default;
}

// Detect formality and speech level
export function analyzeSpeechLevel(text) {
  if (/(습니다|십니까|시오|옵소서)/.test(text)) return 'Hasipsio-che (Formal Polite / 존댓말)';
  if (/(어요|아요|세요|네요|군요|지요)/.test(text)) return 'Haeyo-che (Informal Polite / 존댓말)';
  if (/(다|냐|라|자|마|어|아|지|군|네)$/.test(text.trim().replace(/[.!?~]+$/, ''))) return 'Banmal (Informal / 반말)';
  return 'Neutral';
}
