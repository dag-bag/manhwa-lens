// Universal layout analyzer & bubble detector for manhwa, manga & webtoons
// Supports white bubbles, gray/pastel chat boxes, and dark/black narration panels

export function sampleSurface(pixels, width, height, bbox) {
  const x0 = Math.max(0, Math.floor(bbox.x0)), y0 = Math.max(0, Math.floor(bbox.y0));
  const x1 = Math.min(width, Math.ceil(bbox.x1)), y1 = Math.min(height, Math.ceil(bbox.y1));

  let lumSum = 0, count = 0;
  for (let x = x0; x < x1; x += 2) {
    const iTop = (y0 * width + x) * 4;
    lumSum += 0.299 * pixels[iTop] + 0.587 * pixels[iTop + 1] + 0.114 * pixels[iTop + 2];
    const yB = Math.max(y0, y1 - 1);
    const iBot = (yB * width + x) * 4;
    lumSum += 0.299 * pixels[iBot] + 0.587 * pixels[iBot + 1] + 0.114 * pixels[iBot + 2];
    count += 2;
  }
  for (let y = y0; y < y1; y += 2) {
    const iLeft = (y * width + x0) * 4;
    lumSum += 0.299 * pixels[iLeft] + 0.587 * pixels[iLeft + 1] + 0.114 * pixels[iLeft + 2];
    const xR = Math.max(x0, x1 - 1);
    const iRight = (y * width + xR) * 4;
    lumSum += 0.299 * pixels[iRight] + 0.587 * pixels[iRight + 1] + 0.114 * pixels[iRight + 2];
    count += 2;
  }
  const bgLum = count ? lumSum / count : 255;
  const isDark = bgLum < 110;
  return { bgLum, isDark };
}

export function lightFraction(pixels, width, height, bbox) {
  const x0 = Math.max(0, Math.floor(bbox.x0)), y0 = Math.max(0, Math.floor(bbox.y0));
  const x1 = Math.min(width, Math.ceil(bbox.x1)), y1 = Math.min(height, Math.ceil(bbox.y1));
  let light = 0, total = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const diff = Math.max(r, g, b) - Math.min(r, g, b);
      if ((lum >= 170 && diff < 55) || lum >= 205) light++;
      total++;
    }
  }
  return total ? light / total : 0;
}

export function isReadable(region, lang, surfaceOrLight) {
  const scripts = {
    kor: /[\uAC00-\uD7A3]/g,
    jpn: /[\u3040-\u30ff\u3400-\u9fff]/g,
    chi_sim: /[\u3400-\u9fff]/g,
    eng: /[a-zA-Z]/g
  };
  const count = (region.text.match(scripts[lang]) || []).length;
  const h = region.bbox.y1 - region.bbox.y0;
  if (h < 10) return false;

  // Real dialogue in any color (light bubbles, gray chat boxes, black narration panels):
  // 1. Multiple syllables with good confidence (dialogue lines, narration sentences)
  if (count >= 2 && region.confidence >= 42) return true;
  // 2. Single syllable requires high confidence and clean background (light >= 0.65 or solid dark panel)
  if (count === 1 && region.confidence >= 80 && (typeof surfaceOrLight === 'number' ? surfaceOrLight >= 0.65 : true)) return true;

  return false;
}

export function cleanOcrText(text, lang = 'kor') {
  if (!text) return '';
  let cleaned = text.trim();
  if (lang === 'kor') {
    cleaned = cleaned
      // Strip common scan watermark noise (e.g. cat ear logo read as '뿔 는')
      .replace(/^뿔\s*(는|은)?\s*/g, '')
      // Replace OCR digit '0' when directly attached to Hangul (e.g. 일0 -> 일이, 년0 -> 년이)
      .replace(/([\uAC00-\uD7A3])0(?=[\s\uAC00-\uD7A3.,!?]|$)/g, '$1이')
      // Common Hangul OCR character misreadings in manhwa:
      .replace(/(낙자|님사|남사)(\s*)(전용|저요)/g, '남자$2전용')
      .replace(/(남자|여자|남성|여성)(\s*)저요/g, '$1$2전용')
      .replace(/변태노예념/g, '변태노예년')
      // Normalize dots / ellipses
      .replace(/\.{2,}/g, '...')
      .replace(/\.\s*\.\s*\./g, '...')
      // Remove space before punctuation
      .replace(/\s+([.,!?:;~])/g, '$1')
      // Strip boundary noise symbols
      .replace(/^[\s|_\-~=*^`'"#$<>]+/, '')
      .replace(/[\s|_\-~=*^`'"#$<>]+$/, '');
  }
  return cleaned.replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ').trim();
}

// Retain reliable page segmentation: crop confidence alone is not evidence of a
// better transcription, and a shorter crop can silently drop an entire word.
export function preferReread(initial, candidate, lang = 'kor') {
  const a = cleanOcrText(initial.text, lang), b = cleanOcrText(candidate.text, lang);
  const letters = text => (text.match(/[\p{L}\p{N}]/gu) || []).length;
  const chars = text => text.replace(/[^\p{L}\p{N}]/gu, '');
  const aa=chars(a),bb=chars(b);
  // Longest common subsequence measures retained evidence, not dictionary words.
  const row=new Uint16Array(bb.length+1);
  for(const ch of aa){let prev=0;for(let j=1;j<=bb.length;j++){const old=row[j];row[j]=ch===bb[j-1]?prev+1:Math.max(row[j],row[j-1]);prev=old;}}
  const completion=aa.length>=2&&bb.length>=aa.length*1.25&&row[bb.length]>=aa.length*.8;
  return Boolean(b && candidate.confidence >= 80 && letters(b)>=letters(a) &&
    (completion || (initial.confidence < 80 && candidate.confidence >= initial.confidence + 12)));
}

// Saturated light glows are bright in at least one channel. Projecting their
// maximum removes the halo without erasing neutral dark letter strokes.
export function projectGlowPixels(data) {
  for (let i = 0; i < data.length; i += 4) {
    const v = 255 - Math.max(data[i], data[i + 1], data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  return data;
}

// Horizontal merge for words on the same line
export function mergeSameLine(regions, pixels, width, height) {
  const rows = [];
  for (const region of [...regions].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)) {
    const b = region.bbox;
    const h = b.y1 - b.y0;
    const cy = (b.y0 + b.y1) / 2;

    const row = rows.find(r => {
      const a = r.bbox;
      const ah = a.y1 - a.y0;
      const acy = (a.y0 + a.y1) / 2;
      const overlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      const gap = Math.max(0, Math.max(b.x0 - a.x1, a.x0 - b.x1));
      const centerDiff = Math.abs(cy - acy);

      // Must share same polarity (dark line with dark line)
      if (r.isDark !== region.isDark) return false;

      // Same line: vertical overlap > 15% OR vertical center difference < 1.0x line height (handles tilted lines)
      const isAlignedY = (overlap / Math.min(h, ah) > 0.15) || (centerDiff < Math.max(h, ah) * 1.0);
      if (!isAlignedY) return false;

      // Close horizontal gap
      if (gap < Math.max(h, ah) * 2.8) return true;

      // Wider gap (e.g. censored 'xx' or spaced words) across continuous background
      if (gap < Math.max(h, ah) * 6.0 && pixels) {
        const checkX0 = Math.min(a.x1, b.x1);
        const checkX1 = Math.max(a.x0, b.x0);
        const checkY = Math.round((cy + acy) / 2);
        let pass = 0, count = 0;
        const expectDark = region.isDark;
        for (let x = checkX0; x < checkX1; x += 4) {
          const i = (checkY * width + x) * 4;
          const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          if (expectDark ? lum < 100 : lum > 165) pass++;
          count++;
        }
        if (count && pass / count > 0.40) return true;
      }

      return false;
    });

    if (!row) {
      rows.push({ ...region, bbox: { ...b } });
      continue;
    }

    row.text = b.x0 < row.bbox.x0 ? `${region.text} ${row.text}` : `${row.text} ${region.text}`;
    row.confidence = Math.min(row.confidence, region.confidence);
    row.bbox = {
      x0: Math.min(row.bbox.x0, b.x0),
      y0: Math.min(row.bbox.y0, b.y0),
      x1: Math.max(row.bbox.x1, b.x1),
      y1: Math.max(row.bbox.y1, b.y1)
    };
  }
  return rows;
}

// Groups lines in the same speech bubble, chat box, or narration panel
export function bubbleGroups(regions, pixels, width, height) {
  const lines = mergeSameLine(regions, pixels, width, height);
  const bubbles = [];

  for (const line of [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)) {
    const b = line.bbox;
    const bh = b.y1 - b.y0;
    const bcx = (b.x0 + b.x1) / 2;

    const bubble = bubbles.find(bub => {
      const a = bub.bbox;
      const ah = bub.lineHeight || (a.y1 - a.y0);
      const acx = (a.x0 + a.x1) / 2;

      // Must share same polarity (dark panel lines merge with dark panel lines)
      if (bub.isDark !== line.isDark) return false;

      // Vertical distance between lines in dialogue: normal line spacing
      const vGap = b.y0 - a.y1;
      const isStacked = vGap >= -Math.min(ah, bh) * 0.35 && vGap <= Math.max(ah, bh) * 1.10;
      if (!isStacked) return false;

      // Horizontal span overlap or center proximity
      const hOverlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const maxSpan = Math.max(a.x1 - a.x0, b.x1 - b.x0);
      const isNearX = hOverlap > -Math.max(ah, bh) * 1.5 && Math.abs(bcx - acx) < maxSpan * 0.9;
      if (!isNearX) return false;

      // Check if there is an opposite-polarity barrier between lines of different bubbles
      if (pixels && vGap > 2) {
        let hasBarrier = false;
        const checkX0 = Math.max(0, Math.min(a.x0, b.x0));
        const checkX1 = Math.min(width, Math.max(a.x1, b.x1));
        for (let y = a.y1; y < b.y0; y += 2) {
          let rowLum = 0, rowCount = 0;
          for (let x = checkX0; x < checkX1; x += 4) {
            const i = (y * width + x) * 4;
            rowLum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            rowCount++;
          }
          const avg = rowCount ? rowLum / rowCount : 128;
          // For light bubbles, dark line (< 110) is a barrier. For dark bubbles, light line (> 150) is a barrier.
          if (!bub.isDark && avg < 110) { hasBarrier = true; break; }
          if (bub.isDark && avg > 150) { hasBarrier = true; break; }
        }
        if (hasBarrier) return false;
      }

      return true;
    });

    if (bubble) {
      bubble.text += '\n' + line.text;
      bubble.confidence = Math.min(bubble.confidence, line.confidence);
      bubble.bbox = {
        x0: Math.min(bubble.bbox.x0, b.x0),
        y0: Math.min(bubble.bbox.y0, b.y0),
        x1: Math.max(bubble.bbox.x1, b.x1),
        y1: Math.max(bubble.bbox.y1, b.y1)
      };
      bubble.lineHeight = Math.min(bubble.lineHeight, bh);
    } else {
      bubbles.push({
        text: line.text,
        bbox: { ...b },
        lineHeight: bh,
        confidence: line.confidence,
        isDark: line.isDark
      });
    }
  }

  return bubbles.map(g => {
    const b = g.bbox;
    const pad = Math.min(16, Math.max(6, g.lineHeight * 0.20));
    const padded = {
      x0: Math.max(0, Math.floor(b.x0 - pad)),
      y0: Math.max(0, Math.floor(b.y0 - pad * 0.6)),
      x1: Math.min(width, Math.ceil(b.x1 + pad)),
      y1: Math.min(height, Math.ceil(b.y1 + pad * 0.6))
    };
    return { ...g, bbox: padded };
  });
}

// Prepares a padded, scaled crop with contrast enhancement for high-accuracy LSTM recognition
export function preparePaddedCrop(sourceCanvas, bbox, isDark = false, pad = 20) {
  const rawW = Math.max(1, Math.round(bbox.x1 - bbox.x0));
  const rawH = Math.max(1, Math.round(bbox.y1 - bbox.y0));
  const scale = Math.min(2.0, Math.max(1.0, 32 / (rawH / Math.max(1, (bbox.y1 - bbox.y0) > 40 ? 2 : 1))));
  const w = Math.round(rawW * scale);
  const h = Math.round(rawH * scale);

  const crop = document.createElement('canvas');
  crop.width = w + pad * 2;
  crop.height = h + pad * 2;
  const ctx = crop.getContext('2d', { willReadFrequently: true });
  // Matching background padding
  ctx.fillStyle = isDark ? '#000000' : '#FFFFFF';
  ctx.fillRect(0, 0, crop.width, crop.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, bbox.x0, bbox.y0, rawW, rawH, pad, pad, w, h);

  try {
    const imgData = ctx.getImageData(0, 0, crop.width, crop.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      let v;
      if (isDark) {
        // Dark panel: push dark background (< 75) to pure black, push white text (> 140) to pure white
        if (lum < 75) v = 0;
        else if (lum > 140) v = 255;
        else v = Math.round(lum);
      } else {
        // Light bubble: push light background (> 200) to pure white, push dark text (< 130) darker
        if (lum > 200) v = 255;
        else if (lum < 130) v = Math.max(0, Math.round(lum * 0.70));
        else v = Math.round(lum);
      }
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {}
  return crop;
}
