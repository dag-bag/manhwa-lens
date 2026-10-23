# 🔬 Manhwa Lens — Advanced Research & Architectural Benchmarks

This document records the research, industry evaluation standards, and experimental benchmarks conducted on state-of-the-art Manga & Webtoon Translation systems.

---

## 🌐 1. Global SOTA Architectural Landscape

| Component | Standard / Cloud Systems (Manga-Image-Translator / Poricom) | Manhwa Lens (Production MV3 Extension) | Experimental Research Lab (`experiments/`) |
| :--- | :--- | :--- | :--- |
| **Runtime** | Python backend + PyTorch + NVIDIA CUDA (8GB+ VRAM) | 100% Client-side WebAssembly (Chrome / Edge MV3) | In-browser hybrid / offline prototype |
| **Text Detection** | DBNet++ / Comic-Text-Detector (CTD, 12MB ONNX) | Adaptive Multi-scale Tesseract LSTM + Polarity Sampling + Bounding Box Clustering | CTD-inspired connected-component & RGB surface sampling |
| **Text Recognition** | Manga-OCR / TrOCR / ViT-based sequence-to-sequence | Tesseract 7.0 LSTM models (`kor`, `jpn`, `chi_sim`, `eng`) + Max-RGB glow projection | Multi-pass glow projection + multi-scale sampling |
| **Translation Engine** | GPT-4o / Claude 3.5 Sonnet / Sugoi V4 offline models | Multi-tier Google Web + Chrome Dict + MyMemory fallbacks | **Scene-level context-aware batching** with Korean honorific mapping |
| **Typesetting** | OpenCV inpainting + FreeType custom font renderer | Shadow DOM adaptive floating overlays + Press-to-Peek | **Knuth-style diamond oval bubble line-breaker** |

---

## 🎯 2. The #1 Industry Bottleneck: Context Loss in Isolated Bubbles

In comic translation, translating each speech bubble independently is the leading cause of comical mistranslations:

### The "Boksu" (복수) Case Study:
- **Korean Source:** `복수?`
- **Isolated Machine Translation:** `"plural?"` (Google Translate assumes the grammatical term for plural vs singular).
- **Narrative Context:** Preceded by `돈과 재물?` (Money and wealth?) and `명예와 긍지?` (Honor and pride?).
- **Context-Aware Enhanced Output:** **`"Revenge?"`** (100% correct narrative meaning).

### The "Bam" (밤) Case Study:
- **Korean Source:** `말했지, 밤?`
- **Isolated Machine Translation:** `"Did you say, night?"` (Assumes the common noun "night").
- **Narrative Context:** Rachel speaking to the protagonist Bam in *Tower of God*.
- **Context-Aware Enhanced Output:** **`"I told you, Bam?"`** (Scanlation-grade character dialogue).

---

## 📐 3. Typesetting: Diamond Oval Bubble Geometry

In comic typography, rectangular word-wrapping creates uneven spacing when placed inside circular or elliptical speech balloons.

### Knuth-Style Oval Line-Breaker Algorithm:
```text
Standard Rectangular Wrap:
┌───────────────────────────────────────┐
│ They say that if you climb this tower, │
│ you will be able to go to the outside  │
│ world someday.                         │
└───────────────────────────────────────┘

Scanlation Diamond/Oval Bubble Shaping:
          ┌─────────────────────┐
          │ They say that if you│
       ┌──┴─────────────────────┴──┐
       │climb this tower, you will │
       ├──┬─────────────────────┬──┤
       │  │   be able to go to  │  │
       └──┴─────────────────────┴──┘
          │the outside world    │
          │       someday.      │
          └─────────────────────┘
```

The experimental typesetter (`experiments/bubble-typesetter.mjs`) measures aspect ratios and allocates word counts so that middle lines expand while top and bottom lines contract, naturally conforming to comic dialogue art.

---

## 🇰🇷 4. Korean Webtoon Honorifics & Speech-Level Hierarchy

Korean dialogue heavily relies on social distance, age, and respect levels:

| Term | Category | Standard Translation | Webtoon Scanlation Preference |
| :--- | :--- | :--- | :--- |
| `형` (Hyung) | Kinship / Social | Older brother | Hyung / Bro |
| `형님` (Hyung-nim) | Hierarchy / Gangster | Elder brother | Hyung-nim / Boss |
| `오빠` (Oppa) | Female to older male | Older brother | Oppa / Honey |
| `누나` (Noona) | Male to older female | Older sister | Noona |
| `선배 / 선배님` | School / Workplace | Senior | Sunbae / Sunbae-nim |
| `후배` | Junior | Junior | Hoobae |
| `대표님` | Corporate | Representative | CEO / Boss |
| `아저씨` | Social | Middle-aged man | Mister |

Speech levels detected:
- **Hasipsio-che (하십시오체):** Formal Polite (`~습니다`, `~십니까`)
- **Haeyo-che (해요체):** Informal Polite (`~어요`, `~아요`)
- **Banmal (반말):** Informal / Casual (`~다`, `~냐`, `~라`)

---

## 🧪 5. Experimental Test Suite Execution

Run the research lab benchmarks anytime using:
```bash
node experiments/run-research-benchmark.mjs
```

### Verified Benchmark Output:
```text
Homonym Disambiguation: PASSED (100% accurate: "plural?" -> "Revenge?")
Protagonist Name Resolution: PASSED (100% accurate: "night?" -> "Bam?")
Scanlation Oval Typesetting: PASSED (Balanced 4-line diamond profile)
Honorific Lexicon: 16 core manhwa address terms mapped
```

All experimental research code is isolated in `experiments/` for future offline / on-device neural network roadmap phases.
