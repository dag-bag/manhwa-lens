# Manhwa Lens 1.1.0 — test results

Tested on Windows on 2026-10-23 using Node.js and Playwright Chromium in isolated extension profiles. All tests below passed on the release code.

## Results

- 22/22 unit tests passed.
- 18/18 browser integration checks passed.
- Both real-panel regression scenarios passed: full-image OCR and visible-region screenshot OCR.
- No uncaught page JavaScript errors were observed by the browser suite's page-error listener. This is not a claim about every service-worker or browser-internal error.

## User-supplied Korean panel

The actual 633 × 378 uploaded original was used, rather than a redrawn approximation.

Expected/read source:

> 남자 전용 사우나는... 정말 할 일이 많구나.

Live English output:

> The men-only sauna... there really is a lot to do.

This preserves the sample's meaning: a men-only sauna and the speaker's realization that there is a lot to do. The previous “Nimsa” output was an OCR error.

Verified automatically:

- Exactly one coherent recognized speech bubble and one English overlay.
- No detected text boxes over the background lockers in this sample.
- All three Korean lines read correctly, with punctuation/whitespace normalization.
- Translation contains the men-only sauna meaning; no “Nimsa”.
- Overlay bounds relative to the 633 × 378 image: x=189, y=65.5, width=280.5, height=168 CSS pixels. These remain inside the bubble.
- Font size 28 CSS pixels, visible and without text overflow.
- Overlay follows responsive full-image resizing to 500 pixels wide.
- Selecting the visible panel as a screenshot region also yields one bubble and the correct men-only sauna text.
- The rendered screenshot was visually inspected: clean white bubble, readable centered English and uncovered artwork.

Artifacts in the source project: `test-output/user-panel-fixed.png` and `test-output/user-panel-result.json`.

## Unit coverage

Geometry/clipping, URL and text validation, OCR tile overlap and duplicate detection; source-script filtering; low-confidence/artwork rejection; multiline bubble grouping; dark-border separation; empty pixel samples; credential-free text-only translation requests; cache behavior; HTTP 429 and HTTP 500 handling; malformed payload and network errors; fallback success; quota-response rejection; ASCII and English-mode network bypass.

Translation service failures are simulated with mocked fetch responses. Actual provider-wide outages and browser-offline recovery are not end-to-end guarantees.

## Browser coverage

Popup preference persistence; genuine cross-origin canvas taint; Korean OCR and live translation with whole-bubble grouping; scroll anchoring; hide/show; edited-text retry; remove all; Escape cancellation; screenshot region capture; direct HTTP 403 image rejection followed by visible screenshot fallback; Korean region OCR; empty-input validation; successful retry after editing; Japanese, simplified Chinese and English fixture recognition; restricted-browser-page handling; uncaught page-error collection.

The general suite contains 18 result entries; machine-readable results are in `test-output/results.json` in the source project.

## Limits of this evidence

The real-panel regression covers this supplied Korean panel. Other browser checks use controlled synthetic fixtures; this does not establish universal real-site or comic accuracy. Edge was not separately automated. Dark/colored bubbles, stylized or vertical text, mixed scripts and tiny lettering can still be missed or misread. The conservative filter deliberately avoids covering uncertain artwork.

The free Google/MyMemory services can change, rate-limit or fail. Neither the 100 ms request spacing nor fallback guarantees availability. Failed translations leave source artwork visible and recognized text available in the transcript.

## Reproduce

```text
pnpm build
pnpm test
pnpm test:panel
pnpm test:browser
```

The panel and browser suites require internet for live translation. The final distribution contains the built extension, documentation and licenses; test scripts and fixture images remain in the source workspace.
