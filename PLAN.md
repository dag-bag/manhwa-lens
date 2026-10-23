# Manhwa Lens implementation plan

1. Build a Chrome/Edge Manifest V3 extension with packaged Tesseract.js 7, WebAssembly and Korean, English, Japanese and simplified Chinese OCR models. No remote executable code.
2. Run OCR in an offscreen extension document. Default Korean + English. Cap image pixels, tile tall panels, retain bounding boxes and translate paragraph regions.
3. Offer image selection and visible-area capture. Fetch image bytes in the extension with host permissions; on denied/expired/hotlink URLs, capture only the visible part. Never claim to recover pixels that the browser cannot display.
4. Translate recognized text with the free, unofficial Google Translate web endpoint. Explain that text leaves the device, internet is required and quotas/availability are not guaranteed. Surface errors and preserve OCR for retry/editing.
5. Render English in removable overlays and a transcript panel. Handle escape/cancellation, scrolling, repeated injection, restricted browser pages and meaningful errors.
6. Test pure geometry/validation, actual bundled OCR and extension flows in Chromium, CORS-denied images, service failure, selection/capture and packaging. Separate controlled fixtures from real-site validation.
7. Ship a ZIP containing the unpacked extension, installation guide, licenses and exact validation results.

This is a new standalone browser-extension project; existing workspace projects are outside scope.
