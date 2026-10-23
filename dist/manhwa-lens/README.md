# Manhwa Lens 1.1.0

Free unpacked Chrome/Edge extension with local OCR and removable English translations. Korean, Japanese, simplified Chinese and English are supported. No API key, account, Python installation or local server is needed to use the built extension.

## Install or update

1. Extract `Manhwa-Lens-1.1.0.zip` into a permanent folder.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable Developer mode and choose Load unpacked.
4. Select the extracted `manhwa-lens` folder containing `manifest.json`.
5. Pin Manhwa Lens. Open an ordinary HTTP(S) comic page and wait for the image to load.

If you already loaded this project's `dist/manhwa-lens` folder, click Reload on the extension card and refresh the comic tab. Confirm the card says **1.1.0**. If you installed a separately extracted older ZIP, replace that folder's files with this release, then reload. Do not run two copies simultaneously. The folder must remain on disk.

## Use

Choose the source language. Select a region to drag around a speech bubble, or select an image to process a full comic image. Press Escape to cancel selection. Keep the tab active and still while capturing.

Version 1.1.0 detects text conservatively on light speech-bubble backgrounds. It rejects many artwork detections, groups nearby lines, then reads each group again as a complete text block. This helps preserve sentence context. The supplied Korean panel now produces one coherent translation instead of multiple line fragments and boxes over lockers.

English appears in a white overlay bounded by the detected text area. Type is fitted to that area. If the translation cannot fit legibly, the overlay is hidden and the full text remains in the transcript. Failed translations leave the original image visible. Hide translations reveals the source; Remove all or Close clears the display. Edit recognized text and click Translate edited text to retry.

Full-image overlays follow image resizing and scrolling. After page reflow or zoom, reselect screenshot-based regions. Closing the result does not cancel an OCR job already running.

## Privacy and free service limits

OCR runs locally using bundled Tesseract.js 7 and WebAssembly. Models and executable code are packaged. Images and screenshots are not sent to translation services.

Recognized non-English text is sent to Google's unofficial endpoint at `translate.googleapis.com`. If Google fails, the extension can send the text to the free MyMemory service at `api.mymemory.translated.net`. These services require internet and can fail, rate-limit or change. The short pause between requests does not guarantee avoidance of limits. There is no paid API or unlimited-service guarantee. English mode and ASCII-only snippets skip translation requests.

Up to 250 successful snippets are cached in memory until the offscreen document is unloaded. Only the language preference is stored in extension settings. Tesseract may cache models in extension-origin IndexedDB. There is no reading-history database or analytics. Website scripts can observe page overlays.

## Permissions and capture fallback

Broad `<all_urls>` access supports comic images hosted on other domains and Chrome's screenshot permission requirements. The selection script is injected only when you start the extension. Image requests omit credentials and cookies. `activeTab`, `scripting`, `storage` and `offscreen` provide user-triggered capture, selection, preferences and local OCR.

If direct image fetching fails, the extension can read the currently visible part using a screenshot. It cannot recover an unloaded image, offscreen pixels, or bypass login, bot checks or server authentication. Use region mode for canvas/background images and iframe pixels. Image mode selects top-frame HTML images.

## Accuracy and limits

- OCR confidence is an engine estimate, not a verified accuracy percentage.
- Select the actual source language. Translation auto-detection cannot repair incorrect OCR.
- Filtering deliberately favors light speech bubbles. Dark or colored bubbles, artwork captions and mixed-language text can be missed; this release is not a universal manga text detector.
- Stylized fonts, low resolution and vertical Japanese remain difficult. A tighter crop or larger source image can help. No inpainting or human-quality translation guarantee is provided.
- Overlays do not permanently edit/export the artwork or automatically crawl chapters.
- Browser settings, extension stores and local file URLs are unsupported. Use normal HTTP(S) pages.
- Limits: 20 MB image download, 40 million decoded pixels, 24 million processing pixels, 24 OCR tiles, 100 candidate regions and 3,000 characters per translation.
- If the extension was reloaded, refresh the comic page before starting again.

## Build and test

Node.js 22+ and pnpm:

```text
pnpm install --ignore-scripts
pnpm build
pnpm exec playwright install chromium
pnpm test
pnpm test:panel
pnpm test:browser
```

The built directory is `dist/manhwa-lens`. Build downloads pinned model assets and includes third-party license notices and hashes. Browser tests use isolated profiles and temporary loopback fixture servers, require internet for live translation, and do not modify your everyday browser profile.

Tests include the user's actual Korean screenshot plus controlled multilingual fixtures. See `TEST-RESULTS.md` for coverage and limits. Chromium was automated; Edge was not separately driven. The code uses Chromium extension APIs compatible with Edge, but universal real-site compatibility is not established.
