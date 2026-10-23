<div align="center">

# 📖 Manhwa Lens

**Translate Korean Manhwa, Japanese Manga, and Chinese Manhua into English in real time.**  
*Free, open-source Chrome/Edge extension with 100% local WASM OCR, universal bubble/box detection across all colors, and zero API keys.*

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![OCR: Tesseract.js v7](https://img.shields.io/badge/OCR-Tesseract.js%20v7-purple.svg?style=flat-square)](https://github.com/naptha/tesseract.js)
[![Tested with Playwright](https://img.shields.io/badge/Tested%20with-Playwright-45ba4b.svg?style=flat-square)](https://playwright.dev/)
[![Offline Local Models](https://img.shields.io/badge/Models-Bundled%20WASM-orange.svg?style=flat-square)](#-privacy--security)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

<br/>

<!-- ============================================================== -->
<!-- CLICKABLE DEMO BANNER: Replace the link below with your video/demo URL -->
<!-- Example: [![Watch Demo](assets/showcase-banner.png)](https://youtu.be/YOUR_DEMO_ID) -->
<!-- ============================================================== -->
<a href="#demo-video-placeholder">
  <img src="assets/showcase-banner.png" alt="Manhwa Lens All-Style Universal Translation" width="920" style="border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.4);"/>
</a>

<p align="center">
  <i>👆 Click the showcase banner above to watch the walkthrough demo (link placeholder: replace <code>#demo-video-placeholder</code> with your video/YouTube link).</i>
</p>

</div>

---

## ⚡ Overview

**Manhwa Lens** is an unpacked browser extension built for comic and webtoon readers. Whether you're catching up on Korean raws or reading untranslated chapters on Webtoons, Naver, Kakao, or manga aggregator sites, Manhwa Lens overlays readable, natural English text directly over dialogue boxes without altering the artwork.

### 🎨 Universal Support Across Every Comic Style & Color:
1. **Classic Speech Bubbles:** White oval and circular bubbles with scanlation-grade typography.
2. **Modern Chat & SMS Boxes:** Off-white, light gray, and pastel messaging bubbles (KakaoTalk, iMessage, Discord). Handles tilted text lines and censored dialogue (`xx`).
3. **Cinematic Dark Narration Panels:** White text on pure black panels and dark flashback boxes, with automatic polarity-adaptive dark overlays (`#0e0b12` backdrop with crisp white font).

All character recognition runs **100% locally on your device** via WebAssembly. Your comic panels and screenshots **never** touch an external image server.

---

## ✨ Tested Manhwa Scenarios

| 1. Classic Speech Bubble | 2. Modern Chat / SMS Boxes | 3. Cinematic Dark Narration |
| :---: | :---: | :---: |
| <img src="assets/hero-demo.png" width="300" alt="Classic Speech Bubble"/> | <img src="assets/chat-bubbles-demo.png" width="300" alt="Chat SMS Boxes"/> | <img src="assets/dark-panel-demo.png" width="300" alt="Dark Narration Panel"/> |
| *Oval white bubble with locker background* | *Square chat boxes with tilted lines* | *White text on pure black background* |

---

## 🚀 Key Features

- 🧠 **100% Local WASM OCR:** Bundled Tesseract.js 7.0 with offline trained LSTM models (`kor`, `jpn`, `chi_sim`, `eng`). No external cloud OCR APIs or Python servers required.
- 🎨 **Adaptive Polarity & Color Sensing:** Automatically samples the perimeter background luminance of every text region. Intelligently renders white overlays on light bubbles and sleek dark overlays on black narration panels.
- 🛡️ **Artwork Noise Rejection:** Layout analyzer (`ocr-layout.mjs`) filters out background textures, lockers, screentones, and panel frames while preserving genuine dialogue.
- 💬 **Sentence Grouping & Line Merging:** Multi-line speech and chat text merge into continuous, coherent sentences before translating, avoiding choppy word fragments.
- 🔤 **Scanlation-Grade Typography:** Dynamically scales font size (11px – 28px) with subtle ambient shadow, rounded corners (`12px`), and centered dialogue alignment.
- ⚡ **Multi-Tier Translation Engine:** Uses an unofficial Google web endpoint with automatic Chrome Dictionary and MyMemory community fallbacks. Includes rate-limit protection and request throttling.
- 🛡️ **Protected & CORS Image Fallback:** If a site blocks direct image downloads (`403 Forbidden`, hotlink protection, canvas tainting), Manhwa Lens automatically falls back to an instant visible-region screenshot capture.
- ✏️ **Interactive Sidebar Transcript:** View recognized original text alongside English translations and confidence scores. Easily edit stylized characters and click *"Translate edited text"* for an instant re-fetch.
- ⌨️ **Keyboard Friendly:** Press `Escape` anytime to cancel area selection. Toggle translations on and off with a single click.

---

## 📸 Interface Preview

<div align="center">
  <table>
    <tr>
      <td align="center"><b>Toolbar Popup</b></td>
      <td align="center"><b>Hotlink / CORS Screenshot Fallback</b></td>
    </tr>
    <tr>
      <td><img src="assets/extension-popup.png" width="380" alt="Toolbar Popup UI"/></td>
      <td><img src="assets/smart-fallback.png" width="450" alt="Automatic Fallback Mode"/></td>
    </tr>
  </table>
</div>

---

## 📥 Installation

Manhwa Lens is distributed as an unpacked Manifest V3 extension. You can install it on **Google Chrome**, **Microsoft Edge**, **Brave**, **Arc**, or **Opera** in under 60 seconds.

### Quick Install (Pre-built Release)

1. **Download** the latest release [`Manhwa-Lens-1.1.0.zip`](Manhwa-Lens-1.1.0.zip) from this repository.
2. **Extract** the ZIP into a permanent folder on your computer (e.g. `Documents/Manhwa-Lens`).
3. Open your browser's extension page:
   - **Chrome / Brave / Arc:** `chrome://extensions`
   - **Microsoft Edge:** `edge://extensions`
4. Toggle **Developer mode** (top-right corner).
5. Click **Load unpacked** (top-left button).
6. Select the extracted `manhwa-lens` folder (the one containing `manifest.json`).
7. Click the **Puzzle icon** (🧩) on your browser toolbar and **Pin** 📌 **Manhwa Lens**.

---

## 🎮 How to Use

1. Navigate to any chapter page on a comic or manhwa website.
2. Click the **Manhwa Lens icon** (ML) in your browser toolbar.
3. Select your **Original Language**:
   - `Korean · 한국어` *(default)*
   - `Japanese · 日本語`
   - `Simplified Chinese · 简体中文`
   - `English`
4. Choose your capture mode:
   - **Select a region:** Click and drag a box around a speech bubble, chat box, or narration panel. *(Best for canvas, background images, or tight speech bubbles).*
   - **Select an image:** Click directly on an `<img>` tag in the reader.
5. Watch the English translation overlay appear inside the speech bubble!
6. Click **Hide translations** to peek at the original art, or click **Remove all** when you are done reading.

---

## 🛠️ Architecture & Under the Hood

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Tab                           │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │     Webpage DOM       │       │    Manhwa Lens UI     │  │
│  │   (Comic Panels)      │       │ (Adaptive Overlays)   │  │
│  └───────────▲───────────┘       └───────────▲───────────┘  │
└──────────────┼───────────────────────────────┼──────────────┘
               │ Content Script (content.js)   │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Background Service Worker (background.js)       │
│    - Tab capture (chrome.tabs.captureVisibleTab)            │
│    - Bounded image fetching & 403 fallback orchestration    │
│    - Offscreen lifecycle management                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ chrome.runtime.sendMessage
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Offscreen Document (offscreen.js)           │
│  ┌─────────────────────────┐     ┌───────────────────────┐  │
│  │   Local Tesseract WASM  │     │  Multi-Tier Translate │  │
│  │   - LSTM Engine         │     │  - Google Web Client  │  │
│  │   - Polarity Analyzer   │     │  - Dict API Fallback  │  │
│  │   - ocr-layout Analyzer │     │  - MyMemory Fallback  │  │
│  └─────────────────────────┘     └───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

1. **`background.js` (Service Worker):** Handles message dispatch, captures visible tabs when needed, and controls the offscreen worker.
2. **`content.js` (Injected UI):** Runs in an isolated Shadow DOM (`#manhwa-lens-root`) so comic site styles never clash with the extension. Renders polarity-adaptive overlays (`.overlay` vs `.overlay.dark`) and tracks window scrolling/resizing.
3. **`ocr-layout.mjs` (Layout & Polarity Engine):** Evaluates perimeter luminance (`sampleSurface`), merges multi-line dialogue (`mergeSameLine`, `bubbleGroups`), cleans Hangul OCR artifacts (`cleanOcrText`), and prepares padded crops with contrast enhancement (`preparePaddedCrop`).
4. **`offscreen.js` (OCR & Translation):** Hosts the heavy WebAssembly runtime outside the active tab, decoding images and executing multi-tier translation calls with memory caching.

---

## 🔒 Privacy & Permissions

Manhwa Lens is designed with privacy as a first principle:

| Permission | Why It's Needed |
| :--- | :--- |
| `activeTab` & `scripting` | Enables the region-selection crosshair and renders overlays only on the tab you explicitly activate. |
| `offscreen` | Required in Manifest V3 to execute WebAssembly OCR and Canvas image decoding without freezing the UI. |
| `storage` | Remembers your selected language preference across sessions. |
| `<all_urls>` | Allows fetching comic images across diverse CDNs/subdomains without CORS failures, and enables viewport capture on reader sites. |

- ❌ **No Analytics or Trackers:** Zero telemetry, logging, or third-party tracking scripts.
- ❌ **No Cloud Image Uploads:** Images stay entirely inside your browser's local memory.
- 🌐 **Translation Text Only:** Only the extracted text string is sent to the free translation endpoints.

---

## 💻 Development & Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v9+
- Python 3.10+ (for icon generation and packaging scripts)

### Setup & Build

```bash
# 1. Clone the repository
git clone https://github.com/dag-bag/manhwa-lens.git
cd manhwa-lens

# 2. Install dependencies (skipping postinstall scripts)
pnpm install --ignore-scripts

# 3. Build the extension package
pnpm build

# 4. Install Playwright browser dependencies (for testing)
pnpm exec playwright install chromium
```

The compiled unpacked extension will be generated in `dist/manhwa-lens`.

### Running Tests

```bash
# Run unit tests (geometry, layout, caching, translation mocks)
pnpm test

# Run regression test on the real Korean panel fixture
pnpm test:panel

# Run full Playwright headless browser integration test suite
pnpm test:browser
```

---

## 📁 Repository Structure

```text
manhwa-lens/
├── assets/                    # Showcase screenshots, demo banner & previews
├── dist/                      # Ready-to-load unpacked extension build
│   └── manhwa-lens/           # Built extension (manifest.json, wasm, models)
├── extension/                 # Source code for the extension
│   ├── background.js          # Service worker coordinator
│   ├── content.js             # Shadow DOM UI & selection overlay
│   ├── core.mjs               # Geometry, clipping & parsing utilities
│   ├── ocr-layout.mjs         # Bubble detection, polarity & artwork filtering
│   ├── offscreen.html/js      # Offscreen worker for local Tesseract WASM
│   ├── popup.html/css/js      # Toolbar popup interface
│   └── manifest.json          # Manifest V3 specification
├── scripts/                   # Build and packaging automation
│   ├── build.mjs              # Asset bundler & model checksum verifier
│   ├── icons.py               # PIL icon generator
│   ├── make-showcase-banner.py# Banner compositor script
│   └── package.py             # Verified ZIP release packager
├── tests/                     # Automated test suites
│   ├── fixtures/              # Real-world manhwa panels (white, chat, dark)
│   ├── browser.mjs            # End-to-end Playwright browser suite
│   ├── core.test.mjs          # Unit tests for geometry & validation
│   ├── ocr-layout.test.mjs    # Unit tests for bubble grouping & polarity
│   ├── test-chat-bubbles.mjs  # Regression test for chat/square boxes
│   ├── test-dark-panel.mjs    # Regression test for dark narration panels
│   ├── translation.test.mjs   # Unit tests for translation fallbacks
│   └── user-panel.mjs         # Real-world manhwa panel regression test
├── LICENSE                    # MIT License
├── package.json               # Scripts & dependencies
├── README.md                  # Project documentation
└── TEST-RESULTS.md            # Detailed automated test report
```

---

## 🤝 Contributing

Contributions are warmly welcome! Whether it's adding support for new languages, improving speech-bubble segmentation heuristics, or optimizing translation latency:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Run the test suites (`pnpm test && pnpm test:panel`)
5. Push to the Branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

Third-party libraries and model weights:
- [Tesseract.js](https://github.com/naptha/tesseract.js) (Apache 2.0)
- [Tesseract Core](https://github.com/naptha/tesseract.js-core) (Apache 2.0)
- [Tesseract Traineddata](https://github.com/tesseract-ocr/tessdata) (Apache 2.0)

---

<div align="center">
  <sub>Made with 💜 for comic and manhwa enthusiasts worldwide.</sub>
</div>
