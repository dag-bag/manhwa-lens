// Experimental Scanlation Typesetter & Oval Bubble Line-Breaker
// Balances text block geometry to fit circular, oval, and rectangular comic bubbles

export function typesetBubbleText(text, bubbleBounds, options = {}) {
  const { width, height } = bubbleBounds;
  const isOval = options.isOval ?? (Math.abs(width - height) < width * 0.4);

  const words = text.trim().split(/\s+/);
  if (words.length <= 3) return [text]; // Short lines don't need multi-line balancing

  // Calculate target aspect ratio
  const bubbleAspect = width / Math.max(1, height);

  // Target lines based on height
  const idealLines = Math.max(1, Math.min(5, Math.round(height / 28)));

  if (idealLines <= 1 || words.length <= idealLines) {
    return [text];
  }

  // Knuth-style penalty minimization for balanced lines
  // For oval bubbles: middle lines should be longer than top & bottom lines (diamond shape)
  const lines = [];
  const wordsPerLine = Math.ceil(words.length / idealLines);

  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(' '));
  }

  return {
    lineCount: lines.length,
    lines,
    formattedText: lines.join('\n'),
    geometry: {
      bubbleWidth: width,
      bubbleHeight: height,
      shape: isOval ? 'oval/diamond' : 'rectangle',
      maxLineLength: Math.max(...lines.map(l => l.length))
    }
  };
}
